# GFO Pilots Phase 2 — Scope Reduction Request

**Re:** Quote PG-CD-0726-516, dated 07/10/2026, revised 07/27/2026
**To:** Robert Feltner, Mike Sliper — Creative Elements Group
**From:** Bryan Dunlop, P&G Global Flight Operations

---

## Summary

We'd like to proceed with Phase 2 at a reduced scope. The full quote (1,142 hrs / $97,070)
is beyond the funding available this cycle. This document proposes a **513-hour scope at
$43,605**, keeps the Tech Log as the single major module, and defers the remaining 629 hours
to a later phase.

There are also a small number of items in the quote we'd like clarified or corrected before
this goes to a PO. Those are listed in the last two sections.

---

## Proposed Phase 2 scope — 513 hrs / $43,605

| # | Item | Hrs |
|---|---|---|
| 1 | Tech Log | 160 |
| 2 | Inventory V2 | 120 |
| 3 | Pilot handoff slice (carved from Pilot Preflight Workflow) | 40 |
| 4 | Push Notifications | 40 |
| 5 | Passenger Profile — myAirOps integration | 32 |
| 6 | Procedural Bulletins | 32 |
| 7 | Currency dashboard enhancements | 12 |
| 8 | Crew Workload enhancements | 12 |
| 9 | Vacation request for scheduling role | 12 |
| 10 | Airport code → destination (+ LUK filter, auto-scroll, due-soon/overdue) | 10 |
| 11 | Back button | 8 |
| 12 | Turndown form (attach photo, show yesterday's FOB) | 8 |
| 13 | Recall or edit a waiver request, with audit trail | 8 |
| 14 | GRAT — "My GRAT" submissions page | 6 |
| 15 | Passengers on lead dashboard (VP role) | 6 |
| 16 | Adjust which codes trigger the STOP payback | 2 |
| 17 | Lead Team → Line Managers | 2 |
| 18 | Record Aircraft Fueling — tail number dropdown + "other" | 2 |
| 19 | Submit new waiver — airport should not be required | 1 |
| | **Total** | **513** |

**513 hrs × $85/hr = $43,605**

### Note on item 3 — the pilot handoff slice

This is the one addition to the original line items, and we think it's structurally required
rather than optional.

The Tech Log's aircraft handoff is a two-sided workflow: maintenance releases the aircraft,
and the pilot reviews open deferrals and accepts responsibility. In the prototype, the
pilot-facing half of that loop lives in the pilot workspace — the handover card, the
deferral-acknowledgment step, and the accept-dispatch gate. The Tech Log module and the pilot
workspace also share a persistence layer.

If Pilot Preflight Workflow is deferred in full, the Tech Log ships with maintenance able to
release an aircraft and no pilot-side path to accept it. We've carved roughly 40 hours out of
the quoted 145 to close that loop:

- Aircraft handover card in the pilot view
- Pilot acknowledgment of open deferrals prior to acceptance
- Accept-dispatch action and its gating conditions
- Pilot-side squawk/nuisance-item entry

Please confirm 40 hrs is the right size for that carve-out, or propose the number that is.
The remaining ~105 hrs of Pilot Preflight (full pilot dashboard, personalized role views,
configurable checklist requirements, deeper scheduling integration) is deferred.

---

## Deferred to a later phase — 629 hrs

| Item | Hrs |
|---|---|
| Scheduling Calendar / Command Center | 160 |
| Pilot Preflight Workflow — remainder | 105 |
| Calendar Sync | 60 |
| Sign Offs | 40 |
| Flight Calendar | 36 |
| Flight Attendant Upcoming Flights Dashboard | 32 |
| Message Thread in Hazard Reports | 32 |
| Tribal knowledge section | 32 |
| Flight Operations Bulletins | 24 |
| Schedule — airport's own local time | 20 |
| Images and comments for passenger cards | 20 |
| Stacked bar chart crew tracking | 20 |
| myAirOps edge case — deleted trip legs | 16 |
| Edit the document when saved as /safety/compliance | 12 |
| Cars In Hangar | 6 |
| Batch of Tweaks | 6 |
| Fleet Status | 4 |
| Daily operations view — crew button | 4 |
| Tracking and Data | TBD |
| **Total** | **629** |

Two of these we'd like to handle differently rather than simply defer — see items 5 and 6
in the next section.

---

## Items to clarify or correct before PO

### 1. Rate confirmation at reduced volume

The quote prices 1,142 hours at a discounted $85/hr against a standard rate of $90. This
proposal is under half that volume. **Please confirm $85/hr still applies at ~513 hours.**

This materially changes the decision: at $90/hr, 513 hours is $46,170, which is outside the
budget and would require cutting further. We'd rather know now than after scope is locked.

### 2. Tech Log — request for a sub-line breakdown

Tech Log is the one major module we're keeping, and at 160 hrs it's the largest single line.
Before we commit, we'd like to see it broken into sub-items — specifically, how the following
are covered. These are behaviors present in the prototype that don't surface as screens, so
they're easy to miss in a walkthrough-based estimate:

1. **Storage model.** Are signed records — journey log, defects, deferrals, maintenance
   releases, signatures, audit trail — append-only and immutable, with corrections handled as
   superseding inserts? Or are they updatable rows?

2. **Signature integrity.** What produces the bytes that get hashed? We need RFC 8785 (JCS)
   canonicalization plus SHA-256, with the content hash recomputed server-side at commit and
   the server timestamp treated as authoritative over the client's.

3. **MEL clock.** Categories A/B/C/D per PL-25 — day of discovery excluded, clock starts at
   midnight following. B and C extendable once with justification; A and D never. Plus
   point-in-time MMEL revision capture, so a deferral signed under revision N still reads
   correctly after revision N+1 ships.

4. **Sign-off gates.** A Certificate of Release to Service must be blocked if the signer has
   no A&P certificate number on file. On RII-required sign-offs, the same person cannot be
   both performer and inspector.

5. **Offline signing.** Can a pilot or mechanic sign with no connectivity, and does the signed
   record persist to durable local storage before any sync is attempted? What is the
   idempotency and conflict model on reconnect?

6. **Test coverage.** The prototype carries roughly 480 test cases across the Tech Log logic
   modules, most of them on the rules above. Is comparable coverage included in the 160?

We'd also like to know which Tech Log screens are in scope and roughly how the hours
distribute across them. The prototype's Tech Log module has 27 pages.

To be clear about why we're asking: this module is the aircraft's maintenance record under
14 CFR 91.417, and the immutability and signature rules can't be retrofitted after records
have been signed. If the answer is that 160 hrs covers all of the above, we're satisfied. If
some of it sits outside the estimate, we'd rather increase this line and cut elsewhere than
discover the gap mid-build.

### 3. Correct the hour totals

The itemized rows sum to **1,142**, not the 1,150 shown. Separately, the "Estimated Total Dev
HRs 985" figure appears to be a subtotal from the 07/10 version that wasn't updated in the
07/27 revision. Please reissue with corrected arithmetic.

### 4. Remove "Tracking and Data (TBD)"

The scope narrative commits to an "Operational Data Tracking & Analytics Framework," but the
line item is unpriced. An unpriced deliverable inside a fixed bid isn't something we can put
on a PO. Please either price it or remove it from scope — we're assuming removed.

### 5. myAirOps deleted trip legs (16 hrs) — warranty or new scope?

The note reads "we're working on a solution to handle these removals correctly." If this is a
defect in the system already in production, we'd expect it under warranty or the support
agreement rather than as new Phase 2 scope. Please confirm which.

Substantively this is our highest-priority correctness issue — deleted legs remaining visible
means crew and catering get planned against flights that don't exist. We want it fixed
promptly regardless of which bucket it lands in.

### 6. "Batch of Tweaks" (6 hrs)

We can't accept an unnamed line item on a PO — there's no way to define completion. Please
either itemize what's in it, or drop it and let those changes flow through the monthly support
bucket, which is the right home for undefined work.

### 7. CAMP integration hours

The scope narrative commits to connecting CAMP, but no line item carries CAMP hours. If the
existing CAMP integration is untouched by Phase 2, please state that explicitly in the SOW so
it can't resurface as a change request. If Phase 2 does touch it, it needs an estimate.

### 8. Flight Attendant dashboard vs. Flight Calendar

Not in this phase's scope, but relevant to how the deferred items get priced later. The quote
lists these as two items — "FA Upcoming Flights Dashboard" (32 hrs, noted against
`/catering-tracker`) and "Flight Calendar" (36 hrs, noted against `/upcoming-flights`).

In the prototype these are the same route and the same component, rendered with a different
label and column set per role — "Upcoming Trips" for flight attendants, "Flight Calendar" for
pilots. If that's also the plan for the production build, the pair should cost less together
than 68 hrs. Worth reconciling before the next phase is quoted.

### 9. Vacation request — one item or two?

We may have two separate needs here: fixes to the existing vacation request flow, and adding
vacation request capability for the scheduling role. The quote carries one line at 12 hrs for
the scheduling role. If fixes to the existing flow are also needed, please price them
separately.

### 10. Payment milestones

The payment terms reference "completion of work deliverables within specified deliverable
section above," but the SOW doesn't contain a deliverables or milestone section. Please add a
milestone schedule with acceptance criteria that monthly invoicing can key against.

---

## Contract items (handled separately with P&G Purchases)

These aren't scope questions and don't need a response in the revised quote — our purchasing
and legal group will work them through the standard PO process. Listing them here so nothing
is a surprise:

1. **Intellectual property.** The SOW doesn't contain a work-for-hire or IP assignment clause.
   Combined with the Integration clause ("supersedes all previous understandings and
   agreements"), it isn't clear who owns the delivered code. This needs to be explicit.

2. **Order of precedence.** The SOW specifies Ohio law, Cincinnati venue, and AAA arbitration,
   and also states twice that it is governed by the P&G PO Terms and Conditions. Those will
   conflict. We need a precedence clause.

3. **Warranty period typo.** Section 1(a) reads "a period of thirty (90) days" — the words and
   the numeral disagree. Since this is the sole-and-exclusive-remedy clause, it needs to be
   unambiguous. We'd also like the period to run from production go-live rather than delivery
   of services.

4. **Data protection.** The application handles passenger information including dietary and
   allergy data, service notes, photographs, and executive travel patterns. A data protection
   addendum should accompany the PO.

---

## Assumptions

- Pricing assumes $85/hr holds at reduced volume (see item 1). All figures above use $85.
- The prototype repository continues to serve as the functional reference for the production
  build.
- Timeline: we'd expect a shorter schedule than the 10–12 weeks quoted for full scope, but we
  recognize project coordination, governance support, and UAT don't scale down proportionally.
  Please propose a revised timeline alongside the revised quote, and show fixed project
  overhead as a separate line rather than distributed across feature items.
- Training, ongoing support, hosting, and cloud consumption remain excluded per the original
  quote. We'll address support separately — Option 1 (flat monthly) is our likely preference.

---

## Requested next step

A revised quote reflecting the 513-hour scope, with the Tech Log broken into sub-items per
section 2 and the rate confirmed per section 1. Happy to get on a call to walk through any of
this if that's faster.
