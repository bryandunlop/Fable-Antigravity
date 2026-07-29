# Booking portal & passenger app — integration architecture

Status: design note, no implementation yet. Written to make the *next* pieces of myairops
work fit a shape that survives the booking portal, rather than being retrofitted into it.

Grounding: [capability matrix](../vendor/myairops-capability-matrix.md) (generated) and
[the asks list](../vendor/myairops-integration-asks.md). Vendor constraints cited below are
from the captured OpenAPI documents, not assumption.

---

## The one decision that shapes everything else

**Empty-seat search cannot run against myairops live.** Three documented facts force this:

1. `remainingSeats` lives on `TripLegViewModel.bookedAircraft`, not on the trip.
2. `GET /api/Trips` returns trips without legs, and filters only on
   `fromDate` / `toDate` / `clientId` / `skip` / `limit`.
3. There is no delta parameter or webhook on any captured spec.

So "show me flights from KTEB with a spare seat next Tuesday" is, against the vendor API,
a full date-window trip enumeration plus one leg call per trip, re-run per query. That is
not an interactive search.

**Therefore: myGFO maintains a local mirror of trips and legs, and the portal searches the
mirror.** This is not a workaround bolted on later — it is the architecture, and the
existing `scheduleSource.ts` / `legResolver.ts` already work this way for tail resolution.
The booking portal extends that mirror rather than introducing a second path.

If ASK 2 or ASK 5 lands (a leg-level search endpoint, or a Schedule API that exposes
availability), the mirror becomes an optimisation rather than a necessity — but the seam
stays the same, which is the point of putting it here.

```
myairops Booking API ──poll──▶ trip/leg mirror ──index──▶ seat availability search
                                     │                            │
                                     │                    booking portal UI
                                     ▼                            │
                              myGFO scheduling                    ▼
                                                    write-back ──▶ POST /api/TripLegs/{id}/passengerbookings
                                                    (gated — see below)
```

## Freshness is a product decision, not just a technical one

A mirrored seat count is stale by up to one poll interval. The portal must not present a
mirrored `remainingSeats` as a guarantee. Two rules:

- **Search results are candidates, not inventory.** Availability shown in a result list is
  advisory and should be labelled with its as-of time.
- **Confirm against the vendor at the moment of booking.** Before taking a booking, re-read
  the specific leg (`GET /api/TripLegs/{id}`) and check `remainingSeats` fresh. This does not
  eliminate the race (see ASK 4 — the booking POST has no precondition) but it narrows it
  from "one poll interval" to "one request".

Until ASK 4 is answered we cannot promise a seat at checkout. Design the flow so that
"requested — pending confirmation" is a first-class state, and tighten it to instant
confirmation if myairops confirms overbooking is rejected server-side. Building the
optimistic flow first and discovering it overbooks is the expensive order to do this in.

## The empty-seat pipeline

The agreed flow (Bryan), and the thing that makes it tractable:

```
all mirrored legs
  └─ filter: remainingSeats > 0
      └─ filter: exclude trips/passengers not eligible to be offered
          └─ scheduling approves the offer
              └─ EA or passenger approves
                  └─ broadcast to the eligible-traveller roster
                      └─ claimed → if never flown, auto-send the passenger form
                          └─ on final approval, write the booking to myairops
```

**The eligibility filter and the VIP-confidentiality projection are the same mechanism.**
"Trips we would not offer seats on" and "trips this person may not see" are one rule
evaluated for different audiences — build it once, as a projection over the mirror, and both
the portal view and the offer pipeline consume it. Two separate filters would drift, and the
one that drifts silently is the one that leaks a trip.

**Multi-stage approval largely defuses the last-seat race.** Because every stage before the
final write lives in myGFO, seats can be *allocated in our own store* and only written to
myairops once. This matters more here than in ordinary booking: a broadcast puts one seat in
front of many people at once, so contention is the normal case rather than the edge case.

Two residual races remain, and both need handling regardless:

- **Ops-desk bookings.** Someone books the same leg directly in myairops. Our mirror will not
  know until the next poll, so **re-read the leg at write time** (`GET /api/TripLegs/{id}`)
  and treat our allocation as provisional until the vendor write succeeds.
- **The write itself is unguarded.** `POST /api/TripLegs/{id}/passengerbookings` takes no
  `If-Match` (ASK 4). Re-reading narrows the window; it does not close it.

So the broadcast must promise an *offer*, not a seat, and the claim flow must be able to
fail gracefully at the final write. Design that state in from the start.

## CRM: façade over read-through, not a mirror

**Context:** myairops has its own booking portal. The plan is to use it in the interim while
their APIs mature, then replace it with ours. That interim — **both portals live at once** —
is what decides the CRM strategy.

**Recommendation: put our skin on top of CRM and read through. Do not mirror passenger data.**
This is the opposite of the trips/legs decision, and the difference is not inconsistency:
the two have genuinely different constraints.

| | CRM (passengers, contacts, documents) | Booking (trips, legs, seats) |
| --- | --- | --- |
| Strategy | **Read-through façade** | **Mirror** |
| Why | Two portals write concurrently; no change feed to reconcile a mirror | Empty-seat search is impossible live (1+N per query, no filters) |
| Cost of a full read | **One call** — see below | Trip enumeration + one call per trip |
| PII retention exposure | None on our side | N/A |

### Read-through is cheap here — one call gets everything

`GET /api/Contact/{id}` returns `ContactModel`, which **embeds** `addresses`,
`contactMethods`, `idDocuments` (each with its `visas`), `executiveAssistants`,
`executives`, `contactNotes`, `passengerNotes`, `crew` and `passenger`. A complete passenger
profile — including travel documents — is a single request, not the four-plus-N I first
assumed.

The gap is batching: `GET /api/Contact` takes only `searchString` / `skip` / `limit`, so a
12-passenger manifest is 12 parallel calls rather than one. Small N, tolerable, but it is why
rate limits (ASK 6) matter more in this design.

### Why a mirror would be actively wrong during the interim

While both portals are live, **both write to CRM**. A mirror would have two writers and — with
no webhook and no `modifiedSince` filter (ASK 3) — no way to reconcile drift except a full
re-scan and diff. Read-through cannot drift: whatever their portal did, ours sees on the next
request. The dual-portal period is precisely when mirroring is most dangerous.

It also makes cutover free. When we retire their portal we stop pointing people at it —
there is no data migration and no divergent mirror to reconcile.

### Façade, not proxy — three jobs it must do

A thin pass-through would be the failure mode: it puts the vendor's data model straight into
our UI and builds nothing reusable. Our layer must:

1. **Apply the confidentiality projection server-side.** Never expose a generic CRM
   pass-through endpoint — someone will call it directly and bypass the masking that ASK 12
   made entirely our responsibility.
2. **Hold our workflow state locally.** Form submission, scheduling approval, rejection
   reasons, currency status and expiry flags have no home in myairops. The clean split:
   **we own process state, myairops owns record state.** Key our workflow rows by
   `externalReference`, not by a copy of the passenger.
3. **Enforce our validation before writing through** — form currency, the expiry block/flag
   rules, lockout windows.

### Risks accepted

- **Availability coupling.** CRM down means our passenger views are down. Acceptable for a
  booking portal; reconsider for a day-of-travel passenger app, which may justify a
  short-TTL cache of just the documents for that trip — a cache, explicitly not a mirror,
  and never authoritative.
- **Our server holds an unscoped full-write CRM key** and now stands between a portal user
  and `DELETE /api/Contact/...`. The capability guard matters *more* in this design, not
  less, and **ASK 1 (scoped keys) becomes more urgent, not less.**

### Bonus: their role model may already cover what we planned to build by hand

`ContactModel` carries flags that map onto the manual role assignment described below:

```
isTripApprover, isTripRequestor, isBillingContact, isPassenger, isEmployee, isCrew,
enabledForPersonalUse, securityConsideration, controlEmployee, subjectToSEA1934,
externalReference, employeeId, defaultCostCentre
```

Three worth noting. `securityConsideration` is a per-contact VIP flag — a candidate input to
the confidentiality projection, though **not** a substitute for it, since it does not hide
anything on the vendor side. `enabledForPersonalUse` alongside `controlEmployee` and
`subjectToSEA1934` suggests myairops already models the personal-use and securities-law
dimension that the empty-seat `deadheadTax*` fields imply — worth understanding before we
invent our own.

> **Before building a parallel role model, check these.** Reusing vendor fields keeps the
> source-of-truth rule intact and avoids two role systems disagreeing about who may approve
> a trip.

## Passenger identity and the EA relationship

**Decided:** eligibility is a manual process owned by scheduling. A passenger is attached as
lead passenger with roles, EAs are attached to that passenger with differing levels, and
scheduling can override directly in myairops for edge cases. `leadPassenger` already exists
on `TripPassengerBookingViewModel`, so that concept maps cleanly.

### You do not need to build the EA↔executive relationship — CRM already has it

```
POST   /api/Contact/{id}/Assistant/{assistantId}     GET /api/Contact/{id}/Assistants
POST   /api/Contact/{id}/Executive/{executiveId}     GET /api/Contact/{id}/Executives
DELETE both
```

There is a dedicated `ContactExecutiveAssistantModel`. myairops models the
executive/assistant link natively and in both directions, so the *relationship* should live
there rather than being reinvented in myGFO. What does **not** exist is the notion of
differing EA **permission levels** — that is ours, keyed off the vendor relationship.

### Use `externalReference` as the join key, not email

Email is the right *human-facing* identifier — it is what an EA types, where an invite goes,
and how `GET /api/Passengers?searchString=` finds someone ("by name or email"). It is the
wrong thing to *store as the key*:

1. **It is mutable.** People change names and domains migrate. A join key that changes
   silently either orphans the record or re-points it at the wrong person — and this key
   guards passport data.
2. **It is not first-class on the Booking passenger.** `PassengerViewModel` has no `email`
   field at all; it has a `contactMethods` array. Only CRM has `primaryEmail`. Joining on it
   means reaching into a collection and picking one.
3. **`searchString` is search, not lookup.** It returns matches, with no uniqueness
   guarantee. Two contacts can match one address.
4. **`externalReference` exists for exactly this** — the vendor documents it as "third party
   identifier" on both trips and passengers. It is the field designed to hold our id.

So: **myGFO mints the passenger id and writes it to `externalReference`**; email is a
matching hint on first link only, then never load-bearing again. `employeeId` is a good
secondary check for staff, but does not cover family or guests.

> ### ASK 15 — is `externalReference` unique and queryable on passengers?
> Trips have `GET /api/Trips/externalref/{externalReference}`. Passengers appear to have no
> equivalent lookup. Confirm whether passenger `externalReference` is enforced unique and
> whether it can be queried directly — if not, every join costs a search plus a client-side
> uniqueness check, and we need to know that before designing the sync.

## Travel-document expiry

**Decided:** flag, don't block, when a document is close to expiry; block only when travel
occurs after expiry.

```
document expires AFTER last travel date, > 6 months out   → no action
document expires AFTER last travel date, within 6 months   → FLAG, still bookable
document expires BEFORE or DURING travel                   → BLOCK, state the reason
```

Evaluate against the **travel dates**, not today — a form filled last week on a passport
expiring next month must still fail for a trip in two months.

> **Worth checking before building the 6-month figure as a pure flag:** many countries
> require a passport to remain valid for six months *beyond* the date of entry, and a
> traveller who does not meet that is refused boarding. If that is the origin of the
> six-month instinct, then for those destinations it is a **block**, not a flag — a warning
> would let someone travel to a denied-boarding. Suggest confirming the destination rules
> with scheduling and making the six-month threshold a per-country block/flag decision
> rather than one global flag.

## Aircraft-date holds ("standby for the fleet")

**New requirement (Bryan):** when the whole fleet is committed, an EA should be able to
register a hold on dates and be notified if something frees up, then submit a request.

This is the same shape as the empty-seat waitlist one level up — a watch on *fleet
availability* rather than on a seat. Build the two on one notion of "watch this
availability, tell me when it changes" rather than as two features; the trigger differs
(a trip cancels vs a seat frees) but the register/notify/claim mechanics are identical.

Leaning on seat contention: **waitlist/standby with scheduling clearing people**, rather
than first-claim-wins. Not decided.

## Passenger-change lockout

Passenger modulation locks X hours before departure, with **different windows for domestic
and international** — configurable per trip type, never a constant.

For international, the window should be anchored to whatever the actual filing deadline is
rather than picked for convenience: once APIS data is filed, a passenger change means a
refile, so the lockout exists to protect a regulatory submission and not merely to tidy the
manifest. Get the real deadline from scheduling and store it as configuration alongside the
domestic window.

## Direction is now a typed property of every call

`src/integration/myairops/capability.ts` classifies every operation by its effect on vendor
state and refuses mutating calls unless a policy grant permits them. It ships with
`PULL_ONLY_POLICY` — zero grants.

This exists because the booking portal breaks the assumption the integration layer was
built on. The working agreement says myGFO never writes to myairops; a seat booking is a
write. Rather than let that rule quietly decay into "we mostly don't write", the rule is now
checkable:

```ts
assertMyairopsCallAllowed('booking', 'POST', '/api/TripLegs/{id}/passengerbookings');
// throws MyairopsWriteRefused — no grant
```

Grants are narrow by construction (surface **and** effect), so enabling seat booking cannot
also enable trip deletion. When the portal is ready to write, the diff that adds a grant is
the record of that decision.

**Where the check goes:** in the transport layer, one chokepoint above the HTTP client — not
at each call site, where it can be forgotten. There is no HTTP transport yet (the demo runs
on fixtures); when it is written, `assertMyairopsCallAllowed` is its first statement.

## Build order, and what each step must not do

**1. Extend the mirror to carry seat data.**
`bookingAdapter.ts` currently maps trips into `TripRecord` and drops `bookedAircraft`.
Add `numberOfSeats` / `remainingSeats` to the leg mirror. Unit discipline is unchanged —
myairops leg durations are integer minutes and convert in `units.ts` at the boundary,
nowhere inland.

*Must not:* invent a seat count when `bookedAircraft` is absent. The adapter's existing rule
— park a record it cannot map rather than fabricate a value — applies exactly as much to
seats as it does to unpinned departure times. A fabricated seat count sells a seat that
doesn't exist.

**2. Build the availability index and search over the mirror.**
Pure functions over mirrored legs: filter by date window, route, and `remainingSeats > n`.
No vendor calls in this layer — it is testable with fixtures, and it is where the empty-seat
product logic lives.

*Must not:* leak vendor shapes past the adapter. The index consumes myGFO domain records.

**3. Passenger identity — decide the CRM boundary before writing any of it.**
The passenger app needs a passenger to authenticate as. myairops CRM holds contacts,
passengers, ID documents, and visas — including passport and visa data. Two questions to
settle *first*, because they are expensive to reverse:

- Is myGFO the identity provider for passengers (Entra, as with crew), with CRM linked by
  reference — or is CRM the source of truth?
- Does passenger PII (passport numbers, visa records, `knownTravellerNumber`,
  `usRedressNumber`, `hasAllergy`) get mirrored into myGFO at all, or read through on demand?

The working agreement's logging rule already forbids logging PII; mirroring passport data
raises retention and residency questions that belong in a decision record, not in an
adapter. **Default until decided: read through, mirror nothing.** `hasAllergy` in particular
is health data.

**4. Write-back, gated.**
Only after ASK 1 (scoped keys), ASK 4 (concurrency semantics), and ASK 8 (sandbox) are
answered. The first write path is the narrowest useful one: create a passenger booking on a
leg. Not trip creation, not cancellation, not CRM edits.

*Must not:* be developed against the production tenant. Same discipline as CAMP — see the
Sandbox rule in `CLAUDE.md`.

## What the Schedule API might change

`schedule-api.pandg.flight.myairops.com` is unspecced (ASK 5). If it exposes aircraft/crew
availability or leg-level search, steps 1–2 above may be better served by it than by
enumerating Booking-API trips. **Get that spec before building the availability index** —
it is the cheapest thing that could invalidate this design, and it costs one email.

## Decided since this note was written

- **myairops is the source of truth wherever it can be**; myGFO holds what it cannot.
  Exception pending: passenger travel documents, because CRM has no erasure path — see the
  source-of-truth collision in `../vendor/myairops-push-scenarios.md`.
- **Requests stay in myGFO until approved**, with a scheduling/EA message board. Only
  approved output reaches myairops, so the vendor write surface stays narrow.
- **EAs modulate passengers in myGFO**, not in the vendor portal.
- **Confidentiality is enforced by us** — EAs get myGFO and no myairops portal access.
- **Form-currency window is configurable.** 24 months was illustrative.
- **Travel-form approval is a review loop.** The EA or passenger submits to scheduling;
  scheduling approves, or rejects with a reason and requests resubmission. Only an approved
  form is pushed to myairops — so rejection reasons and resubmissions are myGFO-side state
  the vendor never sees.
- **After lockout, changes go through scheduling** rather than being hard-blocked. That
  escape hatch needs an audit trail: who asked, who approved, when.
- **The scheduling↔EA message board is per-request**, with everything kept against that
  trip. Reconstructing why a trip changed should not require reading a global channel.
- **Maintenance conflict rule:** myGFO wins on anything airworthiness-related (the tech log
  is authoritative there); myairops wins on scheduling fields such as timing and location.
- **Eligibility is manual, owned by scheduling**, with direct myairops override available
  for edge cases.

## Open questions this note does not resolve

Carried into `CLAUDE.md` where they gate dependent work:

- Passenger identity model and PII residency — sharpened by the source-of-truth collision;
  the passenger app will likely be externally hosted and API-connected, not yet designed.
- Whether the portal can confirm a seat or only request one (depends on ASK 4).
- Whether empty-seat search is live or mirrored (depends on ASK 2 / ASK 5).
- The real domestic and international lockout windows (scheduling owns these).
- Seat contention: waitlist/standby (leaning) versus first-claim-wins.
- Whether the "do not offer seats" rule is per-trip, per-passenger, or per-principal
  ("anything with X aboard"). These are different rules and the model must express whichever
  is chosen.
- Whether claiming an empty seat must capture business/personal purpose — see below.
