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

## Open questions this note does not resolve

Carried into `CLAUDE.md` where they gate dependent work:

- Passenger identity model and PII residency (step 3 above).
- Whether the portal can confirm a seat or only request one (depends on ASK 4).
- Whether empty-seat search is live or mirrored (depends on ASK 2 / ASK 5).
