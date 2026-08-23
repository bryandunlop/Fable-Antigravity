# myairops — the ask list

The short version, ordered by priority. Detail and justification for every item is in
[myairops-write-scope-request.md](./myairops-write-scope-request.md).

---

## 1. Send us two API specs

| API | What we need |
| --- | --- |
| **Schedule API** | Full OpenAPI/Swagger document. **Highest priority** — it holds crew duties and may also hold aircraft availability and leg-level search. |
| **Attachments API** | Full OpenAPI/Swagger document. Lower priority; useful, but nothing depends on it. |

Plus: is the auth model for both the same `x-api-key`, or the Bearer/OAuth2 model used by
`Flight.SaltashApi`?

## 2. Build: write access to crew duties (Schedule API)

Crew duties are **GET-only**. We need `POST` / `PUT` / `DELETE` so approved vacation, payback
stops and meetings land on the myairops schedule automatically.

Also tell us:
- Which activity codes are valid (`VAC`, `PBST`, `MEET`, …), and whether we can define our own
- How a crew member is identified on a duty
- Whether a duty blocks that crew member from being rostered, or is display-only

## 3. Build: an erasure path for passenger PII (CRM)

There is **no hard delete** for a contact, ID document or visa — only soft-delete, and every
affected GET takes `includeHidden` to bring them back. We cannot run a retention purge on
data we push you.

- Is there a hard-delete or purge path, by API or by request?
- What is your own retention policy for passenger PII, and where is it stored?
- Does soft-delete remove data from backups, exports and reporting?
- Can you support a data-subject erasure request, and how?

**We will not push travel-document data until this is answered.**

## 4. Build: scoped API keys

Today one `x-api-key` grants full read **and** write per API — the key that reads trips can
delete them. We want separate credentials: **read-only** for our sync service, and a **narrow
write** credential per integration.

## 5. Scope: write access on operations that already exist

Once scoped keys exist, these are the operations we need permitted. (Today they are all
reachable by default — this list defines what we *want* to be able to call.)

**Booking API**
```
POST   /api/TripLegs/{id}/passengerbookings
POST   /api/TripLegs/{id}/passengerbookings/{tripPassengerId}
PUT    /api/PassengerBookings/{id}
POST   /api/PassengerBookings/{id}/cancellation
POST   /api/Trips
POST   /api/Trips/{id}/legs
PUT    /api/Trips/{id}
PUT    /api/TripLegs/{id}
POST   /api/Trips/{id}/cancellation
POST   /api/Trips/{id}/markasnew | markashold | markascheckfeasibility
       | markasbooked | markinprogress | markascompleted
POST   /api/Trips/{id}/passengers
POST   /api/Trips/{id}/passengers/crm
PUT    /api/TripPassengers/{id}
POST   /api/TripPassengers/{id}/cancellation
POST   /api/Clients/{id}/passengers
PUT    /api/Passengers/{id}
POST   /api/Passengers/{id}/link/{clientId}
```

**CRM API**
```
POST   /api/Contact
PUT    /api/Contact/{id}
POST   /api/Contact/{id}/iddocuments                          PUT .../{idDocumentId}
POST   /api/Contact/{id}/iddocuments/{id}/visas               PUT .../{visaId}
POST   /api/Contact/{id}/addresses                            PUT .../{addressId}
POST   /api/Contact/{id}/contactMethods                       PUT .../{contactMethodId}
POST   /api/Contact/{id}/contactnote                          PUT .../{contactNoteId}
PUT    /api/Contact/{id}/passengernotes/{noteId}
POST   /api/Contact/{id}/Assistant/{assistantId}              DELETE same
POST   /api/Contact/{id}/Executive/{executiveId}              DELETE same
POST   /api/Account/{id}/AccountContact
POST   /api/Contact/{id}/softdelete                           /restore
POST   /api/Contact/{id}/iddocuments/{id}/softdelete          /restore
```

**MX API**
```
POST   /api/MaintenanceEntries                                PUT /{id}
POST   /api/MaintenanceEntries/{id}/release                   /cancelRelease
POST   /api/MaintenanceEntries/{id}/logs
POST   /api/MaintenanceEntries/{id}/softdelete                /restore
POST   /api/MaintenanceTypes                                  PUT /{id}
POST   /api/DeferredDefects                                   PUT /{id}
POST   /api/DeferredDefectRestrictions                        PUT /{id}
POST   /api/CriticalDues                                      PUT /{id}
```

**Not requested, deliberately:** the bare `DELETE`s on trips, legs, passenger bookings, trip
passengers, passengers and clients. Each has a `cancellation` or `softdelete` variant that
records *why*, which the deletes discard.

## 6. Answer four questions about existing behaviour

1. **`POST /api/MaintenanceEntries` requires `id` on create.** Is it ignored,
   client-supplied, or a spec error? If we send the wrong one, does it overwrite an
   existing entry?
2. **`maintenanceType` and `aircraft` are free strings.** Matched on code or name? Case
   sensitive? What happens on no match?
3. **Booking concurrency.** `POST /api/TripLegs/{id}/passengerbookings` takes no `If-Match`.
   What happens on a POST to a leg with `remainingSeats: 0`, or two concurrent POSTs on
   `remainingSeats: 1`? Is there a seat-hold or reservation concept?
4. **Passenger `externalReference`.** Is it enforced unique, and can we look a passenger up
   by it? Trips have `GET /api/Trips/externalref/{ref}`; passengers appear not to.

Plus: **rate limits and the maximum `limit` on paged collections.**

## 7. Lower priority — improves designs that can ship without them

- **Leg-level availability search:** `GET /api/TripLegs` filtered by date, airports and
  `minRemainingSeats`, returning legs with `bookedAircraft`. Today `remainingSeats` exists
  but needs a trip enumeration plus a call per trip to reach.
- **Change notification:** webhooks on trip / leg / passenger-booking / contact change, or a
  `modifiedSince` filter on collection GETs. Without either, detecting a change means
  re-scanning a date window and diffing.
- **A sandbox / UAT tenant.** We will not develop write paths against production data.
