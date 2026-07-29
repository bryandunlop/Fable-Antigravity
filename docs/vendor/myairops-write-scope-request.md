# Write access we need from myairops

The consolidated list to take to myairops. Companion to the
[capability matrix](./myairops-capability-matrix.md) (per-operation evidence) and the
[push scenarios](./myairops-push-scenarios.md) (why each is needed).

Deliberately **generous**: it includes operations we may need rather than only those we are
certain of, on the principle that it is cheaper to hold an unused grant than to reopen the
conversation in six months. Where something is excluded, that is a decision with a reason,
not an oversight.

---

## The asks are three different kinds — do not conflate them

| Kind | What we are asking for | Cost to over-ask |
| --- | --- | --- |
| **A. Scope** | Operations that **already exist**. We need our credential permitted to call them. | **Real** — see below |
| **B. Build** | Operations that **do not exist** and myairops must create. | None. Ask freely. |
| **C. Spec** | APIs we hold **no documentation** for, so we cannot assess them. | None. Ask freely. |

**Be generous on B and C, precise on A.** Asking myairops to build a capability costs
nothing if we never use it. Asking for a *credential* with broad write scope is different:
today a single unscoped `x-api-key` grants full read **and** write per API (ASK 1), so every
operation in scope is one bug or one compromised key away from being executed. A credential
that can delete trips is a liability even when no code calls delete.

So the scope lists below are what we want **once scoped keys exist**. Until then we already
have everything by default, and the guard in `src/integration/myairops/capability.ts` is
what actually constrains us.

---

## A. Scope requests — operations that already exist

### Booking API

| Operation | Why |
| --- | --- |
| `POST /api/TripLegs/{id}/passengerbookings` | **The seat booking.** Core of the booking portal and empty-seat product. |
| `POST /api/TripLegs/{id}/passengerbookings/{tripPassengerId}` | Book an existing trip passenger onto a leg. |
| `PUT /api/PassengerBookings/{id}` | Amend a booking (requires `If-Match`). |
| `POST /api/PassengerBookings/{id}/cancellation` | Release a seat **with a reason** — preferred over the bare DELETE. |
| `POST /api/Trips` | Create an approved trip from a myGFO request. |
| `POST /api/Trips/{id}/legs` | Add legs to that trip. |
| `PUT /api/Trips/{id}` | Amend trip (requires `If-Match`). |
| `PUT /api/TripLegs/{id}` | Amend leg — times, pax counts, `deadheadTax*` fields. |
| `POST /api/Trips/{id}/cancellation` | Cancel a trip with a reason. |
| `POST /api/Trips/{id}/markasnew`, `markashold`, `markascheckfeasibility`, `markasbooked`, `markinprogress`, `markascompleted` | Reflect the myGFO approval workflow onto the trip status ladder. |
| `POST /api/Trips/{id}/passengers` | Add a passenger to a trip. |
| `POST /api/Trips/{id}/passengers/crm` | Add a CRM passenger using defaults — the common path. |
| `PUT /api/TripPassengers/{id}` | Update a trip passenger. |
| `POST /api/TripPassengers/{id}/cancellation` | Remove from manifest **with a reason**. |
| `POST /api/Clients/{id}/passengers` | Onboard a new passenger against a client. |
| `PUT /api/Passengers/{id}` | Update passenger (requires `If-Match`). |
| `POST /api/Passengers/{id}/link/{clientId}` | Link passenger to client. |

*Lower confidence, include anyway:* `POST /api/Trips/{id}/booking`,
`POST /api/Trips/{id}/markasinvoiced`, `markaspaid` — billing-side transitions we may not
own, but cheap to hold.

### CRM API

| Operation | Why |
| --- | --- |
| `POST /api/Contact` | Create a passenger who does not exist yet. |
| `PUT /api/Contact/{id}` | Update passenger details after an approved travel form. |
| `POST` / `PUT /api/Contact/{id}/iddocuments[/{id}]` | **Travel documents** — the passenger-form push. |
| `POST` / `PUT /api/Contact/{id}/iddocuments/{id}/visas[/{visaId}]` | Visas. |
| `POST` / `PUT /api/Contact/{id}/addresses[/{addressId}]` | APIS addresses. |
| `POST` / `PUT /api/Contact/{id}/contactMethods[/{id}]` | Email/phone maintenance. |
| `POST /api/Contact/{id}/contactnote`, `PUT .../contactnote/{id}` | Notes from the review loop. |
| `PUT /api/Contact/{id}/passengernotes/{noteId}` | Passenger preferences. |
| `POST` / `DELETE /api/Contact/{id}/Assistant/{assistantId}` | **EA↔executive links** — myairops already models this; we maintain it. |
| `POST` / `DELETE /api/Contact/{id}/Executive/{executiveId}` | The reverse direction. |
| `POST /api/Account/{id}/AccountContact` | Link a contact to an account. |
| `POST /api/Contact/{id}/softdelete` and `/restore` | Lifecycle. **Note: not erasure** — see B3. |
| `POST /api/Contact/{id}/iddocuments/{id}/softdelete` and `/restore` | Retire a superseded passport. |

### MX API

| Operation | Why |
| --- | --- |
| `POST /api/MaintenanceEntries` | **Aircraft down / scheduled maintenance** from the tech log. |
| `PUT /api/MaintenanceEntries/{id}` | Update as the event progresses. |
| `POST /api/MaintenanceEntries/{id}/release` and `/cancelRelease` | Mirror our maintenance release. |
| `POST /api/MaintenanceEntries/{id}/logs` | Work performed. |
| `POST /api/MaintenanceEntries/{id}/softdelete` / `/restore` | Correct a mistaken entry. |
| `POST` / `PUT /api/MaintenanceTypes[/{id}]` | Define our own activity/maintenance types — subject to ASK 13. |
| **`POST` / `PUT /api/DeferredDefects[/{id}]`** | **See below — probably wanted, not yet discussed.** |
| `POST` / `PUT /api/DeferredDefectRestrictions[/{id}]` | The restriction codes deferrals reference. |
| `POST` / `PUT /api/CriticalDues[/{id}]` | Coming-due items visible to schedulers. |

#### ⭐ Deferred defects — a push target worth adding to the plan

Not on the original list, but `DeferredDefectModel` maps onto the eTechLog's MEL deferral
almost field-for-field:

```
aircraft, restrictionCode, description, reportedDate, dueDate, reportedBy,
extendedBy, extendedDate, deferredDefectExtensionHistory,
placardCompleted/By, operationsCompleted/By, maintenanceCompleted/By,
approvedBy, approvedOn, opsBoardRemark,
externalReference, externalReferenceLastModifiedDate
```

It has **extension history** (matching PL-25's extend-once rule), **placard tracking**,
separate operations/maintenance completion, and an `opsBoardRemark` that surfaces the
restriction on the ops board. `CriticalDueModel` is the same story for coming-due items,
with next-due date/hours/cycles/landings.

Both carry `externalReference` **and** `externalReferenceLastModifiedDate` — fields that
only make sense if myairops expects an external system to own this data and sync it in.
That is exactly our position: CAMP is the airworthiness system of record and the eTechLog
holds the deferral.

**The operational value:** a deferred defect with a restriction (an inoperative item that
limits altitude, route or payload) matters to whoever is planning the flight. Pushing
deferrals and coming-dues means schedulers see restrictions on the ops board instead of
finding out from a phone call. Worth asking for the scope now even if we build it later.

---

## B. Build requests — capabilities that do not exist

> ### B1. Write access to crew duties (Schedule API) — **highest priority**
> Crew duties are **GET-only**. We need `POST` / `PUT` / `DELETE` so approved vacation,
> payback stops and meetings in myGFO land on the myairops schedule. Also need: which
> activity codes are valid (`VAC`, `PBST`, `MEET`…), whether the set is operator-configurable,
> how a crew member is identified on a duty, and whether a duty blocks rostering or is
> display-only.

> ### B2. Leg-level availability search (Booking API)
> A `GET /api/TripLegs` search taking `fromDate` / `toDate`, optionally departure and
> arrival airport and `minRemainingSeats`, returning legs with `bookedAircraft` populated.
> Today `remainingSeats` exists but is unreachable without enumerating every trip and then
> fetching its legs.

> ### B3. An erasure path for passenger PII (CRM) — **blocks the travel-form push**
> There is **no hard delete** for a contact, ID document or visa — only soft-delete, and
> every affected GET takes `includeHidden` to bring them back. We cannot execute a retention
> purge on data we push. Need either a hard-delete/purge endpoint or a documented
> data-subject erasure process.

> ### B4. Change notification (all APIs)
> Webhooks on trip / leg / passenger-booking / contact change, **or** a `modifiedSince`
> filter on the collection GETs. Without either, detecting a change means re-scanning a full
> date window and diffing.

> ### B5. Booking concurrency control (Booking API)
> `POST /api/TripLegs/{id}/passengerbookings` takes no `If-Match`, unlike the PUTs. We need
> to know whether an overbooking is rejected server-side, and ideally a precondition or
> seat-hold so a checkout flow can promise a seat rather than request one.

> ### B6. Scoped API keys — **the one that makes all of the above safe**
> Today one `x-api-key` grants full read and write per API. We want separate credentials:
> read-only for the sync service, and a narrow write credential per integration.

---

## C. Spec requests — APIs we cannot assess

> ### C1. Schedule API — full OpenAPI/Swagger document
> Gates B1 outright and may answer B2. It is the most valuable unknown: it may also hold
> aircraft availability and a first-class activity concept that changes where several
> capabilities should live.

> ### C2. Attachments API — full OpenAPI/Swagger document
> Gates the ForeFlight document sync entirely. There are **zero** document endpoints in
> Booking, CRM or MX, so trip sheets and EAPIS documents are unreachable today. Need **read**
> (fetch generated documents) and probably **write** (attach our own documents to a trip).

> ### C3. Auth model for both
> Same `x-api-key`, or the Bearer/OAuth2 model used by the vendor-internal
> `Flight.SaltashApi`?

---

## Deliberately excluded — and why

These are the operations we are **not** asking to have in scope. Excluding them is
reversible; a scope can be widened later in minutes. The damage from a wrong delete is not
reversible, and every one of these has a safer alternative that records a reason.

| Excluded | Safer alternative |
| --- | --- |
| `DELETE /api/Trips/{id}` | `POST /api/Trips/{id}/cancellation` |
| `DELETE /api/TripLegs/{id}` | `PUT` the trip's legs, or cancel the trip |
| `DELETE /api/PassengerBookings/{id}` | `POST /api/PassengerBookings/{id}/cancellation` |
| `DELETE /api/TripPassengers/{id}` | `POST /api/TripPassengers/{id}/cancellation` |
| `DELETE /api/Passengers/{id}`, `DELETE /api/Clients/{id}` | Soft-delete; hard removal is a human decision |
| `POST /api/Account/{id}/softdelete`, `/restore` | Account lifecycle is not ours to drive |
| CRM `DELETE` on contact methods / addresses | Soft-delete where available |

The cancellation variants are strictly better regardless of risk: they capture *why*, which
the bare deletes discard.

---

## Priority order for the conversation

1. **C1 — Schedule API spec.** Gates crew duties and may reshape the booking portal.
2. **B1 — crew duties write.** The most concrete ask; an existing endpoint missing verbs.
3. **B3 — erasure.** Blocks pushing any passenger PII, and scheduling owns the retention
   policy they currently cannot execute.
4. **C2 — Attachments spec.** Gates the ForeFlight document sync entirely.
5. **B6 — scoped keys.** Makes every grant above safe to hold.
6. **A — scope on existing operations.** Mostly a permissions conversation, not a build.
7. **B5, B4, B2** — concurrency, change feed, leg search. Each improves a design that can
   ship without it.
