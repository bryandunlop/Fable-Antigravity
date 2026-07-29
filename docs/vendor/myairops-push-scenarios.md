# What we want to push to myairops, and whether we can

Each capability we intend to build over the next year, mapped against the captured vendor
specs. Verdicts are evidence-based: every "possible" names the operation, every "blocked"
names what is missing.

Grounding: [capability matrix](./myairops-capability-matrix.md) (generated),
[asks list](./myairops-integration-asks.md). Analysis covers the three APIs we hold specs
for — Booking, CRM, MX. The Attachments and Schedule APIs are unspecced, and two scenarios
below depend entirely on them.

> **Correcting a common assumption:** it is not true that most myairops APIs are read-only.
> Across the three captured specs, **100 of 176 operations mutate vendor state**. The
> constraint on pushing is almost never "no endpoint exists" — it is (a) whole *domains*
> that are missing from the APIs we hold, and (b) the credential model. See the matrix.

---

## Summary

| # | Capability | Verdict | Gating item |
| --- | --- | --- | --- |
| 1 | Aircraft down / scheduled maintenance → myairops | **Possible today** | ASK 9 (`id` on create), ASK 10 (type matching) |
| 2 | Activity codes (VAC, PBST, MEET) → crew duties | **Blocked — crew duties are GET-only** | ASK 14 (write access) |
| 3 | Passenger travel-form data → CRM | **Possible today** | ASK 11 (**no erasure path**) |
| 3a | Retention purge after N years | **Blocked — no hard delete** | ASK 11 |
| 3b | Booking flow: form currency, chase-ups | **Possible today** — mostly our logic | — |
| 4 | Documents → ForeFlight | **Not blocked** — myGFO is the document store | — |
| 5 | Booking portal: hide VIP trips, show aircraft booked | **Must be ours** — **decided**, ASK 12 closed | — |
| 6 | Passenger self-service view + shareable trip sheet | **Partly** — build the PDF ourselves | ASK 5 |
| 7 | Alert on passenger-info change, then review | **Partly** — poll, no push | ASK 3 (webhooks) |

---

## Decisions (Bryan, this session)

Recorded here so they are not re-litigated in code review. Where one has a consequence the
build must honour, it is stated.

| Decision | Consequence |
| --- | --- |
| **myairops is the source of truth wherever it can be**; myGFO stores what myairops cannot hold. Duplicating in myGFO as well is acceptable. | **Collides with the retention problem — see below.** |
| **Aircraft requests stay in myGFO until approved**, with a shared message board between scheduling and the EAs. Only on approval does anything move into myairops. | The write surface is narrow and event-driven: nothing hits myairops until a human approves. Speculative requests never pollute the vendor schedule. |
| **EAs always modulate passengers in myGFO**, never in myairops. | myGFO owns the passenger-manifest workflow; myairops receives the outcome. |
| **Passenger changes lock out X hours before departure**, with different windows for domestic and international. | Configurable per trip type, not a constant. See the architecture note. |
| **Form-currency window is configurable** — 24 months was illustrative, not decided. | Never hard-code the period. |
| **Scheduling owns records retention** and will supply the period. | ASK 11's *period* goes to scheduling; ASK 11's *erasure capability* goes to myairops. |
| **A conflict rule for two-way maintenance edits is in scope.** | Build it; do not assume myGFO is the only writer of MX entries. |
| **Passenger app will likely be externally hosted, connecting via API.** | Not designed yet. Deliberately deferred. |

### ⚠ The source-of-truth decision collides with the erasure gap

"myairops is the source of truth wherever possible" and "there is no hard delete in CRM"
(item 3a) cannot both hold for passenger travel documents. If myairops is authoritative for
passports and visas, we must push them there — and once pushed, **we have no API-level way
to delete them**, so scheduling cannot execute the retention purge they now own.

Three ways out, in order of preference:

1. **myairops provides an erasure path** (ASK 11). Preserves the source-of-truth rule
   intact. Ask first.
2. **Travel documents are the documented exception**: myGFO is authoritative for passenger
   PII, and myairops receives the minimum projection needed to operate a trip, refreshed
   just-in-time. The source-of-truth rule holds everywhere else. This is the fallback if
   ASK 11 comes back negative, and it is the only option that lets a purge actually run.
3. Accept that pushed PII is permanent. **Not recommended** — it makes the retention policy
   unexecutable by design, and it is scheduling's policy to answer for.

**Until ASK 11 is answered, do not push travel-document data.** Everything else in item 3
(the booking flow, form currency, chase-ups) can be built meanwhile, because it is our logic.

---

## 1. Maintenance status — **possible today**

`POST /api/MaintenanceEntries` accepts what an aircraft-down event needs:

```
aircraft, maintenanceType, scheduledStartUtc/EndUtc, actualStartUtc/EndUtc,
airport, vendor, vendorContactInfo, woNumber, description, action,
partsShippingInfo, cancelled, released, engineeringStart/EndDateTime
```

Required on create: `aircraft`, `id`, `maintenanceType`, `scheduledStartUtc`,
`scheduledEndUtc`. `PUT /api/MaintenanceEntries/{id}` updates it, and
`POST /{id}/release` + `/{id}/cancelRelease` mirror our maintenance-release concept
closely enough to keep the two systems' states aligned.

The model also carries `createdBy` / `modifiedBy` / `lastModifiedDate`, so a two-way
reconciliation can tell our writes from someone editing in the myairops UI.

**Two problems to resolve before building:**

> ### ASK 9 — `id` is required on create
> `POST /api/MaintenanceEntries` lists `id` in its required set. On a create that is
> either ignored, client-supplied, or a mistake in the spec. Which? If it is
> client-supplied we need to know the allocation rule; if ignored we need to know that
> too, because sending a wrong one may silently overwrite an existing entry.

> ### ASK 10 — `maintenanceType` is a string, matched how?
> `maintenanceType` and `aircraft` are plain strings. This is the CAMP exact-tail-match
> failure mode again (see `CLAUDE.md`): a near-miss silently creates the wrong thing or
> fails opaquely. Confirm whether these match on code or name, whether matching is
> case-sensitive, and what happens on no match. We should reconcile against
> `GET /api/MaintenanceTypes` at startup rather than trusting our own strings.

**1a. Trips on the maintenance planner calendar** is a pull, not a push — already
served by the existing trip mirror.

---

## 2. Activity codes (VAC, PBST, MEET) — **blocked: crew duties are GET-only**

**Confirmed (Bryan):** these are **crew duties on the Schedule API**, not aircraft events,
and that endpoint is **read-only today**. This is the clearest, most concrete ask on the
whole list, because it names an existing endpoint and the exact thing missing from it:

> ### ASK 14 — write access to crew duties on the Schedule API *(supersedes ASK 13)*
> The Schedule API exposes crew duties as **GET only**. We need to **create, update and
> delete** them so an approved vacation, payback stop or meeting in myGFO lands on the
> myairops schedule automatically. Specifically:
> - `POST` / `PUT` / `DELETE` on crew duties, keyed by crew member and datetime range.
> - Which **activity codes** are valid (`VAC`, `PBST`, `MEET`, …), whether the set is
>   operator-configurable, and whether we can define our own.
> - How a crew member is identified on a duty — the CRM contact id, a crew id, or a code?
> - Does a duty block that crew member from being rostered, or is it display-only?
>
> Until this exists, approved vacation lives in myGFO only and schedulers must read it
> there — the sync simply cannot be built.

### Rejected alternative: overloading MX maintenance types

Worth recording so it is not re-proposed. The MX API *does* have an activity-code-shaped
mechanism — `MaintenanceTypeModel` carries `name`, `category`, `defaultDuration`,
`requiresLocation` and an `opsBoardConfiguration` of `blockColour`, `badge`,
`showInContextMenu`, and `POST /api/MaintenanceTypes` declares no required fields. It would
render as a coloured, badged block on the ops board.

**We are not using it**, for two reasons:

1. **Wrong scope.** `MaintenanceEntryModel` requires `aircraft`. These are crew events. The
   only way through is a placeholder aircraft, which would put false blocks on real aircraft
   schedules — corrupting the board it is meant to inform.
2. **Wrong semantics.** `MaintenanceEntry` carries `released` / `cancelRelease`, which are
   airworthiness-release concepts. A vacation is not released to service.

### Where crew data does exist

CRM knows *who* the crew are — `CrewMember` (`crewSubType`, `isCrewAppRegistered`,
`crewAppUsername`, `hasMedicalRestriction`) and `ContactModel.isCrew` — but nothing in
Booking, CRM or MX expresses **when one is unavailable**. `TripLegViewModel.crew` /
`.cabinCrew` are counts of seats consumed, not assignments.

> **The Schedule API spec is still the highest-value ask** — we now know it holds crew
> duties, and it may also answer leg-level availability search for the booking portal
> (ASK 2). Ask for the spec and the write capability in the same conversation.

---

## 3. Passenger travel forms → CRM — **possible today, but do not push yet**

The write path is a clean fit. `POST /api/Contact/{id}/iddocuments` takes exactly what a
travel form collects:

```
idDocumentType, firstName/middleName/lastName, number, placeOfBirth,
issueDate, expiryDate, issuingCountry, residenceCountry, citizenshipCountry, nationality
```

and `POST /api/Contact/{id}/iddocuments/{id}/visas` takes `number`, `visaType`,
`issuingCountry`, `issue`/`expiryDate`, `residentSince`, `immigrantVisaCaseNumber`.

**But there is a serious problem with 3a (retention), and it constrains 3.**

### 3a. Retention purge — **blocked: there is no erasure path**

CRM offers `softdelete` + `restore` for contacts, addresses, ID documents and visas. It
offers **no hard `DELETE`** for any of them. The only hard deletes in the entire CRM API
are for contact *methods* and *link* rows — never for a person, a passport, or a visa.

And `isHidden`/soft-delete is explicitly **not** erasure: every affected GET takes an
`includeHidden` parameter that brings the records straight back.

So: **once we push a passport number into myairops CRM, we have no API-level way to delete
it.** A retention policy we cannot execute on the downstream copy is not a retention policy.

> ### ASK 11 — erasure and retention (blocks pushing any PII)
> - Is there a hard-delete or purge path for a Contact, ID document, or visa — by API or
>   by request to myairops?
> - What is myairops' own retention policy for passenger PII, and where is it stored?
> - Does soft-delete remove data from backups, exports, or their own reporting?
> - Can they support a data-subject erasure request, and through what process?

**On the retention period itself:** I would not build to "6 years" on my own reading —
the applicable period depends on which regime governs each field (travel-document data
collected for border control is not the same as trip records), and it is a records-management
and legal determination, not an engineering one. Get the number from whoever owns records
retention, and build the period as configuration rather than a constant. The
`docs/booking-portal/architecture.md` default stands until then: **read through, mirror
nothing**, and do not push PII into myairops until ASK 11 is answered.

### 3b. Booking flow with form currency — **possible, and mostly ours**

The 24-month currency rule, the "fill it or send a link" branch, and the 7-day chase-up
notification are all our logic — no vendor capability needed. The myairops side is
`POST /api/Trips/{id}/passengers/crm` (add a CRM passenger using defaults) and
`POST /api/TripLegs/{id}/passengerbookings`. Both exist.

Useful detail: `TripPassengerBookingViewModel` already carries `idChecked` and
`verificationTimeUtc`. If those mean what they appear to, our form-currency status can
round-trip into myairops rather than living only in myGFO — worth confirming their
semantics before we invent a parallel field.

This is a good first build: high value, our own logic, and the only vendor calls are two
well-documented creates. It is gated on ASK 11 only because it pushes travel-document data.

---

## 4. Documents → ForeFlight — **not blocked; myGFO becomes the document store**

**Revised (Bryan):** EAPIS was an example of a document, not a committed use case, and the
working assumption is that we probably *cannot* pull files from myairops. The fallback:
**scheduling downloads documents and uploads them to myGFO**, which tracks them and drives
the ForeFlight sync.

That is a better position than the one this section previously described, and it removes two
blockers at once:

1. **The Attachments API stops being a dependency.** It becomes an optimisation — if it
   turns out we *can* fetch documents, we automate the download step and nothing else about
   the design changes. Build against the manual upload first.
2. **The change signal problem disappears.** "If the info changes, update the document in
   ForeFlight" needed a myairops change feed (ASK 3) when myairops held the document. With
   scheduling uploading, **the upload itself is the trigger** — a new version lands, we push
   it to ForeFlight. No webhook required.

**Consequence: myGFO is the source of truth for documents**, a second documented exception
to the source-of-truth rule alongside passenger travel data. That is consistent rather than
awkward — myGFO owns what myairops cannot hold or cannot expose.

What this needs is a document store with versioning (so "the trip sheet changed" is a real
event), the ForeFlight push on new version, and an audit trail of who uploaded what. All
myGFO-side, none of it gated on the vendor.

### What the specs actually confirm

There are **no document, attachment, file, or report endpoints in Booking, CRM, or MX** —
zero. The only EAPIS-related field anywhere is `AccountModel.eapisAircraftOperatorCode`, an
operator code rather than a filing or a document. So the assumption that files are not
reachable through the APIs we hold is correct as far as those three go; only the Attachments
API could change it.

> ASK 5's Attachments half is therefore **downgraded from blocker to nice-to-have**. Still
> worth requesting — automating a manual download is real value — but it no longer gates
> anything.

---

## 5. Booking portal visibility — **myairops cannot enforce this; it has to be ours**

This is the most important architectural finding on the list.

**The Booking API has no confidentiality, privacy, or visibility field of any kind.** No
`isConfidential`, no `isPrivate`, no restriction on `TripViewModel` or `TripLegViewModel`.

CRM has `ContactModel.securityConsideration` and `isHidden` — but `isHidden` is a *list
filter*, not a security boundary: `includeHidden=true` returns the records. It will not
hide Shailesh's trips from anyone.

**Consequence: "show the aircraft as booked, hide who and where" cannot be expressed in
myairops. It can only be enforced by us, on our side, over our mirror** — by projecting a
redacted leg (tail, times, "booked") and withholding passengers, route and purpose by role.

This is a second, independent argument for the mirror architecture — the empty-seat
constraint was the first. It also means the trip sheet in item 6 should be **ours**, because
the redaction rules that govern who sees what have to be applied at document generation too.

### DECIDED — the confidentiality boundary is myGFO, and that is accepted

**Resolved (Bryan, this session):** EAs are given the myGFO platform and *not* myairops
portal access, so they never see the unmasked myairops schedule. Masking is entirely our
logic. ASK 12 is closed — we do not need a vendor-side confidentiality feature.

Three consequences that follow from that decision, and that the build has to honour:

1. **The boundary moved inside myGFO.** Our sync service still ingests unmasked data with a
   full-access key. So the confidentiality control is now our role model, and it has to hold
   across *every* surface that touches the mirror — not just the portal page, but exports,
   printed documents, search results, notifications, and any debug or admin view. This is
   the argument for default-deny projection over filter-after-fetch: a filter you forget to
   apply on a new surface leaks; a projection that never loads the field cannot.
2. **Anyone with a myairops login still sees everything.** That is fine for operational
   staff, and it is now an access-administration matter — the guarantee holds exactly as
   long as the "EAs don't get myairops accounts" rule does. Worth writing down as policy
   rather than leaving as a deployment accident.
3. **myGFO has to be good enough to replace the portal for EAs.** If they have no myairops
   access, everything they currently do there has to exist in ours. That is a scope
   implication of the privacy decision, not a separate project.

---

## 6. Passenger self-service and the shareable trip sheet — **partly**

`GET /api/Passengers/{id}/bookings` exists, but returns a thin
`PassengerBookingSummaryModel` (`tripId`, `tripLegIds`, `bookedPassengerIds`) — ids only,
so a useful "my upcoming trips" view is N follow-up calls. Against our own mirror it is one
query.

On the trip-sheet PDF the vendor pushed back on: **build our own.** Three reasons beyond
their reluctance — it is not gated on their roadmap; the EAs' actual need is a shareable
artefact for passengers with no portal access; and per item 5, the redaction rules are ours,
so the document that leaves the building must be generated where those rules live.

---

## 7. "Alert me when passenger info changed" — **poll, not push**

Better than first assessed. `GET /api/Trips/{id}/passengerchangelog` returns a real audit
feed: `changeDateTime`, `changeType`, `changeUser`, `changeText`, `passengerName`,
`crmPassengerId`, `tripId`, `tripLegId`. That covers the review workflow for trip-level
passenger changes, and because it is per-trip it is bounded by *active* trips — a
tractable polling set, unlike scanning all of CRM.

Two gaps:

- **CRM-level edits have no changelog.** A passenger renewing a passport outside the context
  of a trip produces no entry. `ContactModel.lastModifiedDate` is in the payload, so a
  full scan + diff detects it — with no server-side filter to narrow the scan.
- **Nothing is pushed to us.** Every alert is something we discovered by polling, so
  "alert on change" really means "alert within one poll interval".

Workable, and it satisfies the requirement that a change is *reviewed* rather than silently
accepted. ASK 3 (webhooks / `modifiedSince`) would turn it from adequate into good.

---

## Revised priority for the myairops conversation

1. **Schedule API spec** (ASK 5) — gates crew vacation entirely, may redesign the booking
   portal. Highest value per unit of effort.
2. **Attachments API spec** (ASK 5) — no longer a blocker (see item 4), but automating
   scheduling's manual download is real value.
3. **Erasure and retention** (ASK 11) — blocks pushing any passenger PII. Must be answered
   *before* item 3, not after.
4. **Scoped API keys** (ASK 1) — the push list above spans Booking, CRM and MX, so without
   scoping we hand every service full control of all three.
5. **Write access to crew duties** (ASK 14) — an existing GET-only endpoint that needs
   POST/PUT/DELETE. The most concrete ask on the list; pair it with the spec request in 1.
6. **Change notification** (ASK 3), **booking concurrency** (ASK 4), **MX create semantics**
   (ASK 9, 10), then the smaller items.

*(ASK 12, vendor-side confidentiality, is closed — see item 5. ASK 13 is superseded by
ASK 14: activity codes are crew duties on the Schedule API, not MX types.)*
