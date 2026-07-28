# GFO Pilots Phase 2 — Scope Reduction Request

**Re:** Quote PG-CD-0726-516, dated 07/10/2026, revised 07/27/2026
**To:** Robert Feltner, Mike Sliper — Creative Elements Group
**From:** Bryan Dunlop, P&G Global Flight Operations

---

## Summary

We'd like to proceed with Phase 2 at a reduced scope. The full quote (1,142 hrs / $97,070) is
beyond the funding available this cycle. This document proposes a **513-hour scope at $43,605**,
keeps the Tech Log as the single major module, and defers the remaining 629 hours to a later
phase.

For the Tech Log specifically, we're proposing a change in approach: rather than rebuilding from
the prototype as a wireframe, **we'll hand over the working module — front end, rule engines, and
test suite — for CEG to port and build production infrastructure underneath.** Section 2 sets out
exactly what we're providing and what remains to be built. Section 3 covers the acceptance
artifacts — three of which are complete and attached to this document.

There are also a number of items in the quote we'd like clarified or corrected before this goes
to a PO. Those are in sections 4 and 5.

---

## 1. Proposed Phase 2 scope — 513 hrs / $43,605

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

The Tech Log's aircraft handoff is a two-sided workflow: maintenance releases the aircraft, and
the pilot reviews open deferrals and accepts responsibility. In the code we're providing, the
pilot-facing half of that loop lives in the pilot workspace — the handover card, the
deferral-acknowledgment step, and the accept-dispatch gate. The Tech Log module and the pilot
workspace also share a persistence layer.

If Pilot Preflight Workflow is deferred in full, the Tech Log ships with maintenance able to
release an aircraft and no pilot-side path to accept it. We've carved roughly 40 hours out of the
quoted 145 to close that loop:

- Aircraft handover card in the pilot view
- Pilot acknowledgment of open deferrals prior to acceptance
- Accept-dispatch action and its gating conditions
- Pilot-side squawk / nuisance-item entry

Please confirm 40 hrs is the right size for that carve-out, or propose the number that is. The
remaining ~105 hrs of Pilot Preflight (full pilot dashboard, personalized role views, configurable
checklist requirements, deeper scheduling integration) is deferred.

---

## 2. Tech Log — what we're providing, and what needs building

Tech Log is the one major module we're keeping and the largest single line. We want to be precise
about the handover, because the estimate should price the right work.

### 2.1 What we're handing over — working and tested

| Component | Scale |
|---|---|
| Front end — pages and panels | 27 pages, ~6,100 lines |
| Rule engines — pure functions, no React or framework coupling | 36 modules, ~2,960 lines |
| Test suite | 503 cases, ~4,700 lines |
| CAMP integration layer — session lifecycle, discrepancy taxonomy, push mapping, reconciliation | 6 modules, all with tests |
| myAirOps client contract | with tests |

The rule engines are the substantive part. They encode and test the regulatory logic: PL-25
clock math (DST-aware, zone-anchored), deferral expiry and extension, RII separation, superseding
records, custody and handover, dispatch gating, briefing disclosure, and approvals. Of the 503
test cases, roughly 81 cover the compliance rules directly.

These modules are plain TypeScript with explicit inputs and outputs — no React, no context, no
mocking in the tests. They should port with minimal change and are straightforward to re-verify.

### 2.2 What is still mock — and must be replaced

The handover is a design and behavior reference. Below the rule engines it runs on mock data and
placeholder infrastructure. These are **not** production-ready and are the substance of what Phase 2
needs to build:

| # | Component | Current state in the code we're providing |
|---|---|---|
| 1 | **Record storage** | `persistence.ts` — a debounced whole-blob write to browser storage. Not a ledger |
| 2 | **All data** | 9 mock-data files, ~17,900 lines of fixtures. No backend, no API |
| 3 | **CAMP transport** | `integration/campClient.ts` — mock. The mapping, session and reconciliation contract are specified and tested; no SOAP client is installed |
| 4 | **Offline storage** | Not present. No Capacitor, no native SQLite, no sync |
| 5 | **Server-side enforcement** | Every airworthiness rule is enforced client-side only, because there is no server to enforce it at |

### 2.2a One item moved out of that table while preparing this

Signature hashing **was** mock — a non-cryptographic digest and a `mockSha256()` that derived hex
from a description string, both labelled as such in the source but rendered in the UI as though
they were real.

That is now built and ships with the handover: RFC 8785 (JCS) canonicalization plus true SHA-256,
in `engine/contentHash.ts`, with 11 golden vectors and 25 tests. So the signature chain is no
longer something to build — it is something to **integrate**, and the remaining work on it is
server-side recompute-and-reject at commit, not the algorithm.

One honest caveat: `attachmentSha256()` now uses a real SHA-256, but over a
`name|size|lastModified` descriptor rather than the file's bytes, because the prototype has no file
storage. Production must hash the actual bytes — same function, real input. It's flagged in the
source.

### 2.3 What the Tech Log estimate should therefore cover

Because the front end and the rule engines are provided, we'd expect very little of the estimate
to go toward screens. Please break the 160 hrs into sub-items against the following, and tell us
if the number needs to change:

1. **Append-only ledger storage.** Signed records — journey log, defects, deferrals, maintenance
   releases, signatures, audit trail — stored immutably, with corrections handled as superseding
   inserts rather than updates. The schema contract in section 3 specifies this. Ledger migrations
   are forward-only, so it must be agreed before the tables are created.

2. **Backend and API.** Replacing 2.2 items 1–2 — real persistence behind the provided front end.

3. **Durable and offline persistence.** Replacing 2.2 item 4. Signed records must persist to
   durable storage the moment they are signed, before any sync is attempted. This includes the
   idempotency and conflict model for reconnect, and it is the requirement most likely to be
   underestimated — retrofitting offline onto an online-only build is a rewrite, not a change.

4. **Signature commit path.** The hashing itself is provided and tested. What remains is
   server-side: recompute the content hash at commit and **reject** a mismatch — never re-hash and
   accept — and stamp the authoritative server timestamp. The golden vectors in section 3 are the
   acceptance test.

5. **CAMP transport.** Replacing 2.2 item 3 — the live SOAP client behind the provided mapping,
   session, and reconciliation layer, with the documented error taxonomy handled explicitly.

6. **Server-side enforcement of every airworthiness rule.** The rules are specified and tested in
   the code we're providing, but they currently run client-side only. At minimum: CRS blocked
   without an A&P certificate on file; performer/inspector separation on RII sign-offs; no deferral
   against a `DRAFT` or `PENDING_FSDO` MEL item (409/422); extension limits by MEL category. The
   negative-path checklist in section 3 enumerates all 33 cases.

7. **Test coverage.** Confirmation that the provided suite runs green against the production
   build, plus coverage for the new infrastructure.

### 2.4 One point we want to be explicit about

The module we're handing over renders signature blocks and hash values, but those hashes are
placeholders. If it is ported and connected without replacing items 1–4 above, the result would
look like a compliant technical log while not being one — and that failure would not be visible
to a user.

This module is the aircraft's maintenance record under 14 CFR 91.417. Immutability and signature
integrity cannot be retrofitted after records have been signed. We'd rather increase this line
and cut elsewhere than discover a gap mid-build, so please tell us plainly if 160 hrs does not
cover the seven items above.

### 2.5 Are you porting the rule engines, or rewriting them?

One question we'd like answered explicitly, because it changes what both sides need to produce.

The 36 rule engines are plain TypeScript — pure functions, no React, no framework coupling — and
they carry 503 tests that travel with them. If you port them as TypeScript, that coverage comes for
free and you inherit the regulatory logic already verified.

If you rewrite them in another stack, the tests don't come along. In that case we'll produce the
compliance conformance pack described in section 3 so the rules stay verifiable against your
implementation. We'd rather build it than have the logic reimplemented against prose.

---

## 3. Acceptance artifacts

To make the port cleaner and give both sides an objective definition of "correct," we've prepared
the following. **Three are complete and attached.** They're our deliverables, at our cost, and we'd
like them referenced as acceptance criteria in the SOW.

| # | Artifact | Status |
|---|---|---|
| 1 | **Golden signing vectors** — 11 cases | **Complete — attached** |
| 2 | **Ledger schema contract** | **Complete — attached.** Must be agreed before any table is created |
| 3 | **Negative-path checklist** — 33 assertions | **Complete — attached** |
| 4 | Compliance conformance pack | Conditional — see 2.5 |
| 5 | CAMP fixture pack | To follow |

**1. Golden signing vectors.** Representative signed payloads with their RFC 8785 canonical form
and true SHA-256. Any correct implementation, in any language, reproduces the digests exactly. This
makes client/server hash agreement testable rather than reviewable — the single hardest property to
confirm by code review, and one that fails invisibly until someone tries to verify an old
signature. The fixture is generated by one implementation and verified by a second, so a green run
demonstrates exactly the agreement your build needs between iPad and server.

**2. Ledger schema contract.** Table-by-table: append-only versus updatable, the superseding-insert
pattern, column nullability, and the platform constraints that are expensive to discover late —
ledger is unsupported on elastic pools, and digests need immutable-tier GRS or ZRS storage. It
closes with four open decisions that need an owner. **This one has a real deadline:** ledger
migrations are forward-only, so it must be agreed before the first table exists.

**3. Negative-path checklist.** 33 assertions that must *fail* when exercised — the paths where a
wrong result is silent rather than visible. Each records the layer the control must live at, and
whether the logic ports from the handover. Supplied as markdown and as JSON suitable for driving an
automated suite.

**4. Compliance conformance pack.** The ~81 compliance cases as language-neutral fixtures. Only
necessary if the engines are rewritten rather than ported — see 2.5.

**5. CAMP fixture pack.** Error taxonomy with required handling per code, unit-conversion cases
(CAMP stores hours as minutes; utilization is increase-only), and tail/serial exact-match
validation. Much of this already exists in the module's `campTaxonomy`; we'll complete it once the
CAMP scope in 5.6 is settled.

We'd propose that artifacts 1, 2 and 3 form the objective portion of UAT for the Tech Log module.

### What the checklist tells us about the estimate

Scoring each of the 33 assertions for whether its logic ports from the handover produces a split
worth putting in front of you directly:

| Group | Ports from the handover |
|---|---|
| Sign-off authority, signature integrity, point-in-time MEL | **15 of 18** |
| Immutability, concurrent supersede, idempotent offline sync | **3 of 15** |

The regulatory **rules** are largely solved and travel with the code. The **enforcement layer** —
immutable storage, safe concurrent corrections, idempotent offline sync — is new construction.

This is the whole reason we're asking for the 160 to be broken down. An estimate built by walking
the module sees the first group, because that group has screens and tests to look at. The second
group has nothing to look at, and it's where the work is.

One item moved between those columns while we were preparing this. The rule blocking a deferral
against a `DRAFT` or `PENDING_FSDO` MEL item existed only as a filter on the MEL picker, with no
guard behind it — a payload arriving by any other path was unchecked. We've since added
`validateMelDeferrable()` to the rule engines with tests, so it now ports. It still has to be
enforced at your API with a 409/422; a client-side guard is a better error message, not a control.

---

## 4. Deferred to a later phase — 629 hrs

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

Two of these we'd like to handle differently rather than simply defer — see items 5.4 and 5.5.

---

## 5. Items to clarify or correct before PO

### 5.1 Rate confirmation at reduced volume

The quote prices 1,142 hours at a discounted $85/hr against a standard rate of $90. This proposal
is under half that volume. **Please confirm $85/hr still applies at ~513 hours.**

This materially changes the decision: at $90/hr, 513 hours is $46,170, which is outside the
budget and would require cutting further. We'd rather know now than after scope is locked.

### 5.2 Correct the hour totals

The itemized rows sum to **1,142**, not the 1,150 shown. Separately, the "Estimated Total Dev HRs
985" figure appears to be a subtotal from the 07/10 version that wasn't updated in the 07/27
revision. Please reissue with corrected arithmetic.

### 5.3 Remove "Tracking and Data (TBD)"

The scope narrative commits to an "Operational Data Tracking & Analytics Framework," but the line
item is unpriced. An unpriced deliverable inside a fixed bid isn't something we can put on a PO.
Please either price it or remove it from scope — we're assuming removed.

### 5.4 myAirOps deleted trip legs (16 hrs) — warranty or new scope?

The note reads "we're working on a solution to handle these removals correctly." If this is a
defect in the system already in production, we'd expect it under warranty or the support
agreement rather than as new Phase 2 scope. Please confirm which.

Substantively this is our highest-priority correctness issue — deleted legs remaining visible
means crew and catering get planned against flights that don't exist. We want it fixed promptly
regardless of which bucket it lands in.

### 5.5 "Batch of Tweaks" (6 hrs)

We can't accept an unnamed line item on a PO — there's no way to define completion. Please either
itemize what's in it, or drop it and let those changes flow through the monthly support bucket,
which is the right home for undefined work.

### 5.6 CAMP integration hours

The scope narrative commits to connecting CAMP, but no line item carries CAMP hours, and section
2.3 above identifies live CAMP transport as part of the Tech Log build. Please make the CAMP
scope and its hours explicit rather than implicit.

Separately: is the CAMP utilization-push operation confirmed? Our reference notes it as
undocumented. If it's settled in the current integration, we'd like to record that; if not, it
should stay out of scope until it is.

### 5.7 Crew Workload enhancements (12 hrs)

"Enhancements" isn't defined anywhere in the quote. Please specify what's included so we can
confirm the estimate.

### 5.8 Passenger Profile — myAirOps field mapping

The 32 hrs appears reasonable for the interface work. It assumes the myAirOps entity and field
mapping for allergies, preferences, and service notes is already known. If that mapping still
needs to be established, please price the discovery separately.

### 5.9 Flight Attendant dashboard vs. Flight Calendar

Not in this phase's scope, but relevant to how the deferred items get priced later. The quote
lists these as two items — "FA Upcoming Flights Dashboard" (32 hrs, noted against
`/catering-tracker`) and "Flight Calendar" (36 hrs, noted against `/upcoming-flights`).

In the build we're providing, these are the same route and the same component, rendered with a
different label and column set per role — "Upcoming Trips" for flight attendants, "Flight
Calendar" for pilots. If that's also the plan for the production build, the pair should cost less
together than 68 hrs. Worth reconciling before the next phase is quoted.

### 5.10 Vacation request — one item or two?

We may have two separate needs here: fixes to the existing vacation request flow, and adding
vacation request capability for the scheduling role. The quote carries one line at 12 hrs for the
scheduling role. If fixes to the existing flow are also needed, please price them separately.

### 5.11 Payment milestones

The payment terms reference "completion of work deliverables within specified deliverable section
above," but the SOW doesn't contain a deliverables or milestone section. Please add a milestone
schedule with acceptance criteria that monthly invoicing can key against.

---

## 6. Contract items (handled separately with P&G Purchases)

These aren't scope questions and don't need a response in the revised quote — our purchasing and
legal group will work them through the standard PO process. Listing them here so nothing is a
surprise:

1. **Intellectual property.** The SOW doesn't contain a work-for-hire or IP assignment clause.
   Combined with the Integration clause ("supersedes all previous understandings and
   agreements"), it isn't clear who owns the delivered code. Because we're contributing a
   substantial existing codebase into this build, ownership of the combined result needs to be
   explicit **before** the handover, not at PO close.

2. **Order of precedence.** The SOW specifies Ohio law, Cincinnati venue, and AAA arbitration,
   and also states twice that it is governed by the P&G PO Terms and Conditions. Those will
   conflict. We need a precedence clause.

3. **Warranty period typo.** Section 1(a) reads "a period of thirty (90) days" — the words and
   the numeral disagree. Since this is the sole-and-exclusive-remedy clause, it needs to be
   unambiguous. We'd also like the period to run from production go-live rather than delivery of
   services.

4. **Data protection.** The application handles passenger information including dietary and
   allergy data, service notes, photographs, and executive travel patterns. A data protection
   addendum should accompany the PO.

---

## 7. Assumptions

- Pricing assumes $85/hr holds at reduced volume (see 5.1). All figures above use $85.
- The Tech Log module, its rule engines, and its test suite are provided by us as the starting
  point for the production build. Acceptance artifacts 1–3 in section 3 are complete and attached;
  4 and 5 follow once 2.5 and 5.6 are settled.
- Timeline: we'd expect a shorter schedule than the 10–12 weeks quoted for full scope, but we
  recognize project coordination, governance support, and UAT don't scale down proportionally.
  Please propose a revised timeline alongside the revised quote, and show fixed project overhead
  as a separate line rather than distributed across feature items.
- Training, ongoing support, hosting, and cloud consumption remain excluded per the original
  quote. We'll address support separately — Option 1 (flat monthly) is our likely preference.

---

## 8. Requested next step

A revised quote reflecting the 513-hour scope, with the Tech Log broken into sub-items per
section 2.3 and the rate confirmed per section 5.1.

The two answers that block everything else are **5.1** (does $85/hr hold at ~513 hours) and **2.3**
(what the Tech Log 160 covers). The rest can follow.

Happy to get on a call to walk through the handover and the acceptance artifacts if that's faster —
the three attached documents are easier to talk through than to read cold.
