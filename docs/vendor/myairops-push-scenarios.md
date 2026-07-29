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
| 2 | Crew vacation + payback stop → myairops schedule | **Blocked — no endpoint exists** | ASK 5 (Schedule API spec) |
| 3 | Passenger travel-form data → CRM | **Possible today** | ASK 11 (**no erasure path**) |
| 3a | Retention purge after N years | **Blocked — no hard delete** | ASK 11 |
| 3b | Booking flow: form currency, chase-ups | **Possible today** — mostly our logic | — |
| 4 | myairops documents (trip sheet, EAPIS) → ForeFlight | **Blocked — no document endpoints** | ASK 5 (Attachments API spec) |
| 5 | Booking portal: hide VIP trips, show aircraft booked | **Must be ours** — vendor cannot enforce it | ASK 12 |
| 6 | Passenger self-service view + shareable trip sheet | **Partly** — build the PDF ourselves | ASK 5 |
| 7 | Alert on passenger-info change, then review | **Partly** — poll, no push | ASK 3 (webhooks) |

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

## 2. Crew vacation and payback stop — **blocked, and this is the biggest gap**

There is **no crew, duty, roster, vacation, leave, or absence endpoint in any of the
three captured APIs.** Not restricted — absent.

Crew exist as *people*: CRM has a `CrewMember` model (`crewSubType`, `isCrewAppRegistered`,
`crewAppUsername`, `hasMedicalRestriction`) and `ContactModel.isCrew`. So myairops knows
who the crew are. There is no documented way to tell it when one is unavailable.

`TripLegViewModel` has `crew` and `cabinCrew` — but those are *counts of seats consumed*,
not assignments. They cannot express "Jane is on vacation 12–19 August".

This capability lives or dies on the **Schedule API**, which we have no spec for. It is the
single most valuable unknown in the whole integration: it likely also answers leg-level
availability search for the booking portal (ASK 2).

> **Recommendation: make the Schedule API spec the first thing we ask for.** Two of the
> capabilities on this list are entirely gated on it, and a third may be redesigned by it.
> It costs one email and could save a quarter of misdirected work.

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

## 4. myairops documents → ForeFlight — **blocked on the Attachments API**

There are **no document, attachment, file, or report endpoints in Booking, CRM, or MX.**
Zero. The only EAPIS-related field anywhere is `AccountModel.eapisAircraftOperatorCode` —
an operator code, not a filing or a document.

So trip sheets and EAPIS documents are not reachable through any API we hold. They are
presumably in the **Attachments API**, which we have no spec for.

The ForeFlight half is a separate integration (we already have `src/scheduling/foreflight/`).
The dependency order is: get the Attachments spec → confirm documents are fetchable and
carry a version/timestamp → then build the sync. The "if the info changes, update the
document" requirement needs a change signal, which loops back to ASK 3.

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

One caveat worth being clear-eyed about:

> ### ASK 12 — confidentiality in myairops' own portal
> Our masking only protects **our** portal. Anyone using the myairops portal or holding an
> API key sees everything. Does myairops support trip-level confidentiality or per-user
> visibility rules natively? If not, the requirement holds only for people who use our
> portal, and we should decide deliberately whether that is acceptable — it may mean
> restricting direct myairops access for some roles.

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
2. **Attachments API spec** (ASK 5) — gates the ForeFlight document sync entirely.
3. **Erasure and retention** (ASK 11) — blocks pushing any passenger PII. Must be answered
   *before* item 3, not after.
4. **Scoped API keys** (ASK 1) — the push list above spans Booking, CRM and MX, so without
   scoping we hand every service full control of all three.
5. **Confidentiality model** (ASK 12) — determines whether the VIP-hiding requirement can
   hold at all outside our own portal.
6. **Change notification** (ASK 3), **booking concurrency** (ASK 4), **MX create semantics**
   (ASK 9, 10), then the smaller items.
