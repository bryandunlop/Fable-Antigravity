# myairops APIs — developer review sheet

**Purpose:** we have mapped every myairops operation and decided which ones our plan needs.
This sheet lists everything we are **not** currently planning to use, so someone closer to
the build can say "you'll want that" before we finalise the request to myairops.

**What we need from you:** go through sections 1–3 and mark each item **NEED / MAYBE / NO**.
Section 4 is the specific questions where a second opinion would help most. There is no
obligation to justify a NO — the default is that we leave it out.

**Why it matters now:** myairops issue a single unscoped API key today, so we are asking them
to build scoped credentials. Whatever we ask to be in scope is easier to include now than to
reopen in six months. Conversely, anything we include is a permission we hold whether or not
we use it — so it is a real choice, not a free one.

**Background (skip unless you want the detail):**
- `myairops-capability-matrix.md` — every operation, classified read vs write
- `myairops-push-scenarios.md` — the nine capabilities we plan and whether each is possible
- `myairops-ask-list.md` — the short list we intend to send myairops
- `myairops-write-scope-request.md` — the same list with reasoning

---

## The shape of what exists

Five published APIs. We hold OpenAPI specs for three; **two are undocumented to us**.

| API | Operations | Read | Write | Our status |
| --- | ---: | ---: | ---: | --- |
| Booking | 68 | 34 | 34 | Assessed; using part of it |
| CRM | 71 | 28 | 43 | Assessed; using part of it |
| MX (Maintenance) | 37 | 14 | 23 | Assessed; using part of it |
| **Schedule** | ? | ? | ? | **No spec — requesting** |
| **Attachments** | ? | ? | ? | **No spec — requesting** |

Worth knowing: **100 of the 176 operations we can see are writes.** The common assumption
that myairops is mostly read-only is wrong. The constraint is the credential model and two
missing domains, not missing endpoints.

---

## 1. The two APIs we cannot assess

We have asked myairops for both specs. **Before they arrive, is there anything you would
expect to need from either?** Knowing in advance shapes what we ask for.

### 1a. Schedule API — `schedule-api.pandg.flight.myairops.com`

What we know: it holds **crew duties**, and that endpoint is **read-only**. We are asking for
write access so approved vacation, payback stops and meetings flow from myGFO onto the
myairops schedule.

**Questions:**
- [ ] Beyond crew duties, what else would you expect a Schedule API to expose that we should
      ask about? (Aircraft availability? Roster/assignment? Duty-time limits? Trip templates?)
- [ ] Should we ask for **leg-level availability search** here rather than on the Booking
      API? (See section 4.1 — it may be the natural home.)
- [ ] Anything about crew scheduling you know we will need that is not "put a vacation on
      the calendar"?

### 1b. Attachments API — `attachment-api.pandg.flight.myairops.com`

What we know: nothing. There are **zero** document/file/attachment endpoints in Booking, CRM
or MX, so this is presumably where documents live.

**Current plan without it:** scheduling downloads documents manually and uploads them to
myGFO, which becomes the document store and drives the ForeFlight sync. So this API is a
**convenience**, not a blocker.

**Questions:**
- [ ] Is a manual download/upload step acceptable long-term, or should we push harder for
      programmatic access up front?
- [ ] Would we ever need to **write** documents *into* myairops (attach our own trip sheet to
      their trip), or is read-only enough?

---

## 2. Areas of the three known APIs we are NOT planning to use

Everything below is documented and available. We left it out because nothing in the current
plan needs it. **Mark anything you think we will want.**

### Booking API — unused areas

| Area | Ops | What it is | Why we skipped it |
| --- | ---: | --- | --- |
| **Aircraft** | 2 read | `GET /api/Aircraft`, `/{id}` — registration, `numberOfSeats`, type, operator, fleet | We get seat counts from the leg's `bookedAircraft`. A fleet list may still be useful reference data. |
| **Airports** | 3 read | `GET /api/Airports`, `/{id}`, `/{id}/fbos` | We already have our own airport data layer (FAA-derived, with a company layer). Possible duplication. |
| **FBOs** | 3 read | `GET /api/Fbos`, `/{id}`, `/{id}/contacts` | Not in the current plan at all. Handling/FBO coordination may want it. |
| **Cancellation types** | 2 read | `GET /api/CancellationTypes` | We *will* use the cancellation endpoints; this is the reference list of reason codes. Probably needed for the dropdown. |
| **Trip/leg types** | 2 read | `GET /api/TripLegTypes` — includes `regulationType` (Part 91 vs air-carrier) | Our adapter currently *derives* trip type with a heuristic. This is the authoritative source. **Likely should be used.** |
| **Contacts (booking-side)** | 2 read | `GET /api/Contacts`, `/{id}` | We plan to use the CRM API for contacts instead. Is the booking-side view different in a way that matters? |
| **Flight times** | 1 | `POST /api/FlightTimes/calculate` — computes flight time for a route; persists nothing | Could be useful for the booking portal to estimate a requested trip before it exists. |
| **Quotations** | 1 read | `GET /api/Trips/{id}/quotations` | We are not doing billing. Does anyone need cost visibility in the portal? |
| **Clients** | 8 (4 write) | Full CRUD on clients | We use `POST /api/Clients/{id}/passengers` only. Do we ever create or edit a client? |

### CRM API — unused areas

| Area | Ops | What it is | Why we skipped it |
| --- | ---: | --- | --- |
| **Organisation** | 5 (2 write) | `GET`/`POST`/`PUT /api/Organisation`, plus its linked accounts | We have not modelled organisations at all. Is there a P&G entity structure that needs this? |
| **Account** (most of it) | 24 (15 write) | Accounts, their addresses, contact methods, notes, soft-delete/restore | We use only `POST /api/Account/{id}/AccountContact`. Accounts appear to be the billing/organisational unit — do we need more? |

### MX API — unused areas

| Area | Ops | What it is | Why we skipped it |
| --- | ---: | --- | --- |
| **Reference** | 2 read | `GET /api/Airports/handlingAgents`, `/maintenanceProviders` — who can work on an aircraft at an airport | Not in the plan, but plausibly useful when an aircraft goes down away from base. **Worth a look.** |
| **Maintenance Logs** | part of 10 | `GET`/`POST /api/MaintenanceEntries/{id}/logs` | We included the POST. Do we need to read theirs back? |

---

## 3. Things we are deliberately excluding — please challenge

These are **write** operations we chose to leave out of the scope request. Each has a safer
alternative that records a reason. Excluding them is easily reversed; an unintended delete on
a live operational trip is not.

| Excluded | Safer alternative we requested instead |
| --- | --- |
| `DELETE /api/Trips/{id}` | `POST /api/Trips/{id}/cancellation` |
| `DELETE /api/TripLegs/{id}` | `PUT` the trip's legs, or cancel the trip |
| `DELETE /api/PassengerBookings/{id}` | `POST /api/PassengerBookings/{id}/cancellation` |
| `DELETE /api/TripPassengers/{id}` | `POST /api/TripPassengers/{id}/cancellation` |
| `DELETE /api/Passengers/{id}`, `DELETE /api/Clients/{id}` | Soft-delete; hard removal is a human decision |
| `POST /api/Account/{id}/softdelete`, `/restore` | Account lifecycle is not ours to drive |

- [ ] Any of these you think we genuinely need?

---

## 4. Specific questions where a second opinion helps most

### 4.1 Empty-seat search: mirror or push myairops for a search endpoint?

`remainingSeats` is computed by myairops per leg — but it cannot be queried. `GET /api/Trips`
returns trips **without** legs and filters only on date and client, so finding legs with spare
seats means enumerating trips then fetching each trip's legs. No delta parameter or webhook
exists anywhere.

Our plan: **mirror trips and legs locally and search the mirror.** We are also asking myairops
for a leg-level search endpoint as a later improvement.

- [ ] Is a local mirror the right call, or should a search endpoint be a hard requirement
      before we build?
- [ ] How stale can a displayed seat count be before it is a problem?

### 4.2 Booking concurrency — is our workaround good enough?

`POST /api/TripLegs/{id}/passengerbookings` takes **no `If-Match`**, unlike the PUT
operations. Nothing documented stops two people booking the last seat at once.

Our plan: hold the multi-stage approval in myGFO, allocate seats in our own store, re-read the
leg immediately before writing, and treat the vendor write as the point of truth. The broadcast
promises an *offer*, not a seat.

- [ ] Sound? Or should we block the empty-seat feature until myairops clarify the semantics?

### 4.3 CRM: read-through façade rather than a mirror

We plan to render our own UI over CRM but **read through** to it live, storing no passenger
data locally — as opposed to trips, which we mirror. Reasoning: during the interim both
myairops' portal and ours will be writing to CRM, and with no change feed a mirror would drift
undetectably. `GET /api/Contact/{id}` returns the whole profile (addresses, contact methods,
ID documents with visas, EA links) in **one call**, so read-through is cheap.

- [ ] Agree? The main cost is availability coupling — if CRM is down, our passenger views are
      down.
- [ ] Would you cache? If so, what TTL, and for which fields?

### 4.4 Passenger identity — `externalReference` over email

Email is what users type, but it is mutable and is not a first-class field on the booking-side
passenger model (only a `contactMethods` array). `externalReference` is documented as the
"third party identifier" field.

Our plan: **myGFO mints the passenger id and writes it to `externalReference`**; email is a
matching hint on first link only.

- [ ] Agree? Any reason to prefer `employeeId` (which does not cover family or guests)?

### 4.5 Deferred defects → myairops: worth doing?

Not originally in scope. `DeferredDefectModel` maps onto our eTechLog MEL deferral almost
field-for-field — extension history, placard tracking, separate operations/maintenance
completion, and an `opsBoardRemark` that surfaces the restriction on their ops board. Same for
`CriticalDueModel` and coming-dues. Both carry `externalReference` and
`externalReferenceLastModifiedDate`, which suggests myairops expects an external system to own
this data.

The value: a deferral that restricts altitude, route or payload reaches whoever is planning the
flight, instead of a phone call.

- [ ] Worth adding to the scope request, or scope creep?

### 4.6 Anything we have not thought of

- [ ] Given what you know about how the operation actually runs day to day, what will we
      wish we had asked for?

---

## Notes / other comments

_(space for your developer)_
