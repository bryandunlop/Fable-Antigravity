# myairops: what we have, what we need

Status: draft for the myairops conversation. Companion to the generated
[capability matrix](./myairops-capability-matrix.md), which is the per-operation evidence
behind everything asserted here.

Two questions drove this: **which APIs are read-only, and which do we need to take to
myairops to be able to push to?** The short answer is that the read/write split is not the
constraint people expect it to be — and the real blockers are elsewhere.

---

## 1. The headline: nothing is read-only, and that is the problem

Of the five published APIs we hold specs for three. Across those three, **100 of 176
operations mutate myairops state**:

| API | Operations | Non-mutating | Mutating |
| --- | ---: | ---: | ---: |
| Booking | 68 | 34 | **34** |
| CRM | 71 | 28 | **43** |
| MX (Maintenance) | 37 | 14 | **23** |
| Attachments | ? | ? | ? |
| Schedule | ? | ? | ? |

We do not need to ask myairops to build us a write path for the booking portal. The write
surface we need already exists and is documented:

- `POST /api/TripLegs/{id}/passengerbookings` — book a passenger onto a leg (the seat sale)
- `POST /api/Trips` / `POST /api/Trips/{id}/legs` — create a trip and its legs
- `POST /api/Trips/{id}/markasbooked` and the rest of the status ladder
- `POST /api/PassengerBookings/{id}/cancellation` — release a seat with a reason
- `POST /api/Clients/{id}/passengers`, `POST /api/Trips/{id}/passengers/crm` — passenger onboarding

**The problem is the opposite of the one we expected.** Every API authenticates with a
single `x-api-key` header:

```jsonc
// identical in all three specs
"securitySchemes": { "ApiKey": { "type": "apiKey", "name": "x-api-key", "in": "header" } }
```

There are no scopes, no roles, no per-operation permissions. A key that can read trips is
the same key that can `DELETE /api/Trips/{id}`. So today we cannot honour our own
pull-only posture with a credential — only with discipline, which is why that discipline is
now enforced in code (`src/integration/myairops/capability.ts`).

> ### ASK 1 — scoped or read-only API keys (highest priority)
> Can myairops issue **read-only keys**, or keys scoped to a named set of operations?
> Concretely we want: one read-only key for the mirror/sync service, and a separate
> narrowly-scoped key for the booking portal that can create passenger bookings but
> **cannot** delete trips, delete passengers, or touch CRM or MX at all.
>
> If scoped keys are not on the roadmap, we need to know that now — it pushes all
> enforcement to our side and changes how we isolate the portal's credential.

---

## 2. Blockers for the booking portal's empty-seat search

The empty-seat primitive exists and is server-computed, which is genuinely good news:

```
TripLegViewModel.bookedAircraft = { id, registration, numberOfSeats, remainingSeats }
```

`remainingSeats` is exactly what an "find me a flight with a spare seat" query needs. But
**it cannot be queried.** Three documented constraints stack up:

**a) `remainingSeats` lives on the leg, and legs are not in trip search.**
`GET /api/Trips` returns `TripViewModel[]` — trip-level only, no legs. Getting seat
availability for a date window is `GET /api/Trips` followed by `GET /api/Trips/{id}/legs`
for every trip returned. An interactive search is therefore 1 + N vendor calls.

**b) `GET /api/Trips` filters on `fromDate`, `toDate`, `clientId`, `skip`, `limit` — and
nothing else.** No route filter, no aircraft filter, no seat filter, no status filter. The
same constraint already documented in `scheduleSource.ts` for tail matching.

**c) There is no change feed.** No `modifiedSince`, `updatedAfter`, `version`, or ETag-based
delta parameter exists on any GET across any of the three specs, and no webhook is
documented. Keeping a local mirror current means periodically re-scanning the whole
forward-looking date window and diffing.

Consequence: an empty-seat portal cannot query myairops live. It must maintain a local
mirror and search that. We can build it that way — see
[the booking portal architecture note](../booking-portal/architecture.md) — but the freshness
of every seat count we display is bounded by our poll interval, and a seat we show as
available may have been sold seconds ago.

> ### ASK 2 — leg-level search
> A `GET /api/TripLegs` search taking (at minimum) `fromDate`, `toDate`, and optionally
> departure/arrival airport and `minRemainingSeats`, returning `TripLegViewModel` with
> `bookedAircraft` populated. This collapses 1 + N calls into one and is the difference
> between a live search and a mirror.

> ### ASK 3 — change notification or a delta parameter
> Either webhooks on trip/leg/passenger-booking change, or a `modifiedSince` filter on
> `GET /api/Trips`. Without one of these, mirror freshness costs a full re-scan and we
> cannot tell a deleted trip from one that fell outside the window.

---

## 3. The last-seat race

`PUT` operations require `If-Match` (documented as required on `PUT /api/Trips/{id}`,
`/api/TripLegs/{id}`, `/api/PassengerBookings/{id}`, `/api/Passengers/{id}`,
`/api/TripPassengers/{id}`, `/api/Clients/{id}`), so optimistic concurrency exists for edits.

But the seat booking itself — `POST /api/TripLegs/{id}/passengerbookings` — takes no
`If-Match` and no precondition of any kind. Two portal users booking the last seat on the
same leg concurrently have nothing documented standing between them.

> ### ASK 4 — booking concurrency semantics
> What happens when a passenger booking is POSTed to a leg with `remainingSeats: 0`, or
> when two land concurrently on `remainingSeats: 1`? Specifically:
> - Does myairops reject an overbooking, or accept it and let `remainingSeats` go negative?
> - Is there a precondition/`If-Match` form of the booking POST we should be sending?
> - Is there any seat-hold or reservation concept (book-with-expiry) we can use for a
>   checkout flow, or must the portal implement its own hold in our mirror?
>
> This determines whether the portal can promise a seat at checkout or only request one.

---

## 4. The two APIs we cannot assess

We hold no spec for these, so they are absent from the matrix. **Absent means unknown, not
read-only.**

| API | Documented at | Why we need it |
| --- | --- | --- |
| Attachments | `attachment-api.pandg.flight.myairops.com/swagger/index.html` | Passenger app: itinerary documents, briefing packs, catering sheets. Likely also the transport for passenger ID/visa document images that CRM references by metadata only. |
| Schedule | `schedule-api.pandg.flight.myairops.com/docs/index.html` | Aircraft and crew availability — the "can this trip actually fly" half of the booking portal, which the Booking API does not answer. |

> ### ASK 5 — specs and access for Attachments and Schedule
> The OpenAPI/Swagger JSON for both, plus confirmation of the auth model (is it the same
> `x-api-key`, or the Bearer/OAuth2 model used by the vendor-internal `Flight.SaltashApi`?).
> The Schedule API in particular may already answer ASK 2 — if it exposes leg-level
> availability search, the booking portal should be built against it rather than against
> Booking-API trip enumeration.

---

## 5. Smaller open items

> ### ASK 6 — rate limits and pagination ceilings
> `skip`/`limit` are documented on every collection; the maximum `limit` and any request
> rate limit are not. A mirror re-scan's shape depends entirely on both. Also: is there a
> quota difference between a read-only key and a write-capable one?

> ### ASK 7 — `source` field semantics
> `TripViewModel.source` is documented as "defaults to Integration if not supplied. Can only
> be set on \[create]". We need to know which values are legal and whether trips created by
> our portal should carry a distinguishing source so operations can tell portal-originated
> bookings from ops-desk ones.

> ### ASK 8 — sandbox tenant
> Is there a myairops sandbox/UAT tenant? Everything above is analysis of published specs
> against a production hostname. We will not develop a write path against production data,
> and CAMP-equivalent sandbox discipline should apply here (see `CLAUDE.md`).

---

## 6. Where this leaves us

**We do not need myairops to grant us a new write capability for the booking portal —
the endpoints exist.** What we need from them, in priority order:

1. **Scoped keys** (ASK 1) — without these, the portal's credential is a full-control
   credential on the operational booking system.
2. **Specs for Schedule and Attachments** (ASK 5) — Schedule may reshape the whole design.
3. **Booking concurrency semantics** (ASK 4) — determines what the portal can promise a user.
4. **Leg-level search and/or a change feed** (ASK 2, 3) — determines whether empty-seat
   search is live or mirrored. We can ship on a mirror; live would be materially better.
5. Rate limits, `source` semantics, sandbox (ASK 6–8).

Until ASK 1 and ASK 8 are answered, the code stays pull-only and the write guard in
`src/integration/myairops/capability.ts` ships with zero grants.
