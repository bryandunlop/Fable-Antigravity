# Booking mechanics at scale — Design Spec

- **Date:** 2026-08-05
- **Status:** PROPOSED — decision [[D77]], row LG-188. Spec only; no code in this pass.
- **Author:** Claude + Bryan Dunlop (fork chosen live 2026-08-05)
- **Supersedes in part:** `booking-portal-framework-design.md` §7 (the 8-state lifecycle) and §9
  (the flat request list). Its P1–P4, P6, P7 stand unchanged.
- **Branch:** `feat/booking-mechanics-spec`
- **Nature of deliverable:** design spec. The framework rails on
  `feat/booking-portal-framework` are not yet merged; this spec redirects them before they land.

---

## 1. Background & problem

Bryan, 2026-08-05: *"the booking is okay but we need to work on the mechanics of how things work.
Particularly that the admins request flights far out. They manage the passengers closer in. The
schedulers manage all these trips, and it's hundreds over a long time horizon. It seems like it's
good for a couple of flights but there can be 10-20 in a week easily."*

Three symptoms, one structural fact.

**The structural fact.** The framework models a request as *a form that gets approved*. The real
object is *a trip that gets progressively completed over months*. Approval is a brief early
episode. The current lifecycle spends six of its eight states on that episode
(`submitted · in_review · needs_info · approved · declined` plus `draft`) and zero states on the
months of completion work that follow.

**Symptom 1 — two clocks, one form.** An admin files months out with what they know then: route,
dates, rough pax count, purpose. The manifest — names, travel documents, catering, ground — is only
knowable weeks or days out. `TripRequest.passengerNames: string[]` demands it at request time.

**Symptom 2 — the `booked` cliff.** `booked` is terminal, and the framework's P2 says the trip is
the source of truth afterwards — *the request never mirrors it*. P2 is right. But nothing was built
on the far side of it, so the admin's heaviest workload lands where the product has no surface at
all.

**Symptom 3 — volume.** `RequestList.tsx` sorts a flat list by `createdAtUtc` descending. At 15
flights/week over an 18-month booking horizon that is roughly **1,200 trips**. Sorting the wrong
key is the smaller problem; the larger one is that a list answers "what exists" when both personas
are asking "what needs me".

## 2. Goal

Make the booking mechanics hold at 1,200 trips and across the whole life of a trip, by

1. collapsing the request lifecycle from eight states to four, and re-expressing the approval
   episode as **work items** rather than states;
2. giving every deliverable an **owner and a due date**, so "manage passengers closer in" is a
   scheduled task rather than a stage of a form;
3. making the admin's and scheduler's primary surface **action-first, not chronological**, with
   chronology as the secondary view.

### Non-goals

- Approval *policy* — who may authorize what. That is spec question Q-A, still unanswered.
- SIFL / tax classification of trip purpose (Q-C). Genuinely regulated; needs tax counsel via Bryan.
- Any myairops write path. P7 stands: pull-only, no demand pushed toward MAO.
- Retiring the three legacy islands (`BookingProfile`, `TripBuilder`, `ItineraryBuilderV2`). Still
  superseded-on-build per the framework's P6; not this pass.
- Production identity for EAs and execs (Q-D). See §11 — it is this design's hinge.

## 3. The chosen fork (D77)

Four options were put to Bryan on 2026-08-05. He chose **B with C's central idea grafted in**.

| Option | Shape | Verdict |
|---|---|---|
| A | Request survives booking, gains a manifest phase | Rejected — breaks P2, creates a second home for passenger data |
| B | Request converts at booking; admin works the canonical trip | **Chosen** |
| C | Delete `TripRequest`; demand *is* a trip in `requested` status | Rejected whole — junk records from declines pollute every existing trip selector |
| — | **C's idea, kept:** approval is a task, not a state | **Grafted into B** |

### 3.1 Decisions

| # | Fork | Decision |
|---|---|---|
| P8 | Lifecycle size | Four states: `draft → open → booked → closed`. `closed` carries a reason (`declined`/`withdrawn`/`expired`). |
| P9 | Approval | Not a state. A **work item** on the request, owned by scheduling or the named authorizer, with a due date derived from the first ETD. |
| P10 | `needs_info` | Not a state. A work item owned by the **requestor**, carrying the question. The request stays `open` throughout. |
| P11 | Work-item shape | **One shape, three scopes.** `TaskInstance` gains a nullable `requestId`, joining the existing nullable `tripId` (trip-scoped) and `runDate` (recurring). No parallel task engine. |
| P12 | Post-booking work | Manifest, documents, catering, ground become **task definitions on the per-trip checklist template**, `ownerRole: 'admin-assistant'`, due rules in `daysBeforeEtd` / `monthsBeforeEtd`. |
| P13 | Primary surface | **Action-first.** Both personas default to a due-ordered work list. The chronological trip list is the secondary tab. This deliberately inverts the pilot Slice-3 precedent — see §7.1. |
| P14 | Conversion | At booking the request becomes immutable **provenance** (who asked, why, what was asked for, what was decided). It is never edited again and never mirrors trip status. P2 preserved. |

**Reversibility:** all two-way. Nothing here freezes a ledger schema, touches a signed record, or
makes a regulatory claim. `TaskInstance` is ordinary orchestration data (framework constraint 3),
not an append-only ledger table — see assumption A3.

## 4. The collapsed lifecycle

```
  draft ──submit──> open ──book──> booked ──> (provenance; never edited)
    │                 │
    └──────┬──────────┘
           ▼
        closed  (reason: declined | withdrawn | expired)
```

Four states. What the old states become:

| Old state | Becomes |
|---|---|
| `submitted` | `open`, plus a `review the ask` work item owned by scheduling |
| `in_review` | that work item's `status: 'in_progress'` |
| `needs_info` | a work item owned by the requestor carrying the question; request stays `open` |
| `approved` | that work item's `status: 'done'`; request still `open` |
| `declined` | `closed`, reason `declined` |
| `withdrawn` | `closed`, reason `withdrawn` |

Two things this buys beyond arithmetic:

1. **Concurrency.** The eight-state machine could not express "the authorizer has signed off but
   scheduling is still checking feasibility". Two work items in parallel express it natively.
2. **Ageing.** A state has no due date, so nothing could ever say a request was *late*. A work item
   has `dueAtUtc`, so a request rotting in review is now visible on the same board as everything
   else, in the same overdue band.

`applyAction` in `engine/lifecycle.ts` keeps its shape — pure, role-guarded, verdict-returning,
audit-comment-appending. It shrinks: four states and three transitions instead of eight and eight.

## 5. One work-item shape, three scopes

`TaskInstance` already carries exactly the fields this problem needs
(`src/scheduling/engine/types.ts`):

- `ownerRole` — free-text; `admin-assistant` needs no code change to become an owner
- `dueRule` → `dueAtUtc`, with `monthsBeforeEtd`, `daysBeforeEtd`, `businessDaysBeforeEtd` already
  defined — the long horizon was anticipated
- `condition` — international trips can demand documents earlier, or at all
- `reTriggerOn` — a completed manifest **re-opens itself** when pax count changes
- `escalation` — an unfilled manifest at T-minus notifies scheduling without anyone watching
- `handoffTarget` — role/dept/person, inbox channel

`tripId` is already `string | null` in both the type and `drizzle-schema.ts`; recurring office tasks
already ride that null. Adding a nullable `requestId` gives a third scope:

| Scope | `tripId` | `requestId` | `runDate` | Example |
|---|---|---|---|---|
| trip | set | null | null | collect passenger manifest, T-14d |
| request | null | set | null | review the ask; authorizer sign-off |
| recurring | null | null | set | daily office checks (exists today) |

### 5.0 The provisional ETD (a hole found while writing this, and its fix)

`*BeforeEtd` due rules anchor to `DueContext.etdUtc`, and `dueDates.ts:40` **throws** when it is
absent. A request has no ETD by design — `RequestLeg` carries `dateLocal` plus an optional
`timeLocal`, and `types.ts` states plainly that UTC conversion happens at booking, when a real
departure time exists. So a request-scoped item with a `daysBeforeEtd` rule would throw at
instantiation.

**Fix:** a request-scoped item derives a **provisional ETD** from its earliest leg —
`timeLocal` when `timing === 'fixed'`, otherwise 12:00 office-local on `dateLocal` — and passes it
as `ctx.etdUtc`. No engine change; one pure helper, `provisionalEtd(request)`.

This is sound because the precision genuinely does not matter here: "review this ask ~30 days before
travel" needs the right day, not the right minute, and the whole point of a request is that the
minute is not yet known.

**Hard constraint:** the provisional ETD is confined to due computation. It is never written to a
leg, never stored on the request, and never displayed as a departure time. A derived guess that
escapes into a surface implying a real ETD is a correctness bug, not a cosmetic one — and the
existing `RequestLeg` comment exists precisely to stop that.

**Why this matters more than it looks.** It means the admin's board renders identically either side
of the booking boundary. A request-scoped `authorizer sign-off` and a trip-scoped
`collect manifest` are the same kind of row, in the same list, sorted by the same due date. The
cliff in §1 disappears not because the request survives booking, but because *the work items never
noticed the boundary*. P2 stays intact and the user never feels it.

### 5.1 The admin task definitions (P12)

Authored on the per-trip checklist template — data, not code. Indicative, to be corrected by a real
EA before building (Q-B):

| Task | Owner | Due rule | Condition |
|---|---|---|---|
| Confirm passenger names | `admin-assistant` | `daysBeforeEtd: 14` | always |
| Collect travel documents | `admin-assistant` | `daysBeforeEtd: 30` | `tripType == international` |
| Confirm catering | `admin-assistant` | `daysBeforeEtd: 3` | always |
| Confirm ground transport | `admin-assistant` | `daysBeforeEtd: 3` | always |
| Final manifest | `admin-assistant` | `hoursBeforeEtd: 24` | always |

`reTriggerOn` a pax-count change re-opens the manifest tasks. `escalation` on the final manifest
notifies scheduling. Both are engine features already built and tested.

## 6. Conversion at booking (P14)

`toTripRecord(request, input)` already exists and is unit-tested. It gains one responsibility:
after creating the trip via `SchedulingService.createTripMirror`, the request is stamped
`status: 'booked'`, `tripId`, `bookedAtUtc` — and thereafter treated as **write-once provenance**.

What provenance preserves, and why it is worth keeping a separate object for: who asked, on whose
behalf, for what stated purpose, against which cost centre, what they originally asked for, what
was decided and by whom, and the full comment thread. None of that belongs on a `TripRecord`, and
all of it is the first thing anyone asks six months later.

Any request-scoped work items still open at booking are closed as `n_a` with an audit entry. Open
items cannot silently vanish.

## 7. The surfaces at scale

### 7.1 Action-first, inverting the pilot precedent

`pilot-my-flights-at-scale-design.md` (Slice 3) solved a structurally identical problem: time-banded
sections, in-progress pinned, filter chips, a "needs prep only" toggle. It is the right pattern and
this design reuses it — with one deliberate inversion.

Slice 3 made **chronology primary** and the needs-prep filter a toggle. That is correct for a pilot
holding ~2 months and a few dozen trips: they can see the whole list, so ordering it by time is a
navigation aid.

An admin or scheduler holds ~1,200 trips across 18 months. The whole list is not seeable at any
zoom. Chronology stops being navigation and becomes scrolling. So for these two personas the
default is **the due-ordered work list**, and the chronological trip list is the second tab.

This is the one place this design knowingly diverges from a shipped house pattern; it diverges
because the input scale differs by an order of magnitude, not because the pattern was wrong.

### 7.2 Admin — `My trips`

- **Default tab, "Needs me":** open work items where `ownerRole == 'admin-assistant'` and the
  actor is the requestor, grouped `overdue · due today · next 7 days · next 30 days`. Each row
  names its trip and links to it.
- **Second tab, "All my trips":** the chronological list, bands `this week · next 2 weeks ·
  this month · next 3 months · later`. Note the extended tail — Slice 3's `next month` band would
  hold ~1,000 rows at this horizon.
- **Filters:** domestic / international / DASSP chips, reusing `matchesTripTypeFilter`.
- A trip with no open admin work does not appear in tab one. That is the entire point.

### 7.3 Scheduler — extend the run board, do not rebuild it

`buildRunBoard` in `scheduling-command/runBoardSelectors.ts` is **already** a cross-trip task inbox:
it groups real `TaskInstance`s by engine-computed `dueAtUtc` into `blocked · overdue · due-today ·
next-48`, folds in tasks with no trip context, and caps at a `horizonDays` window.

What it needs is small: an optional owner-role filter, a `requestId` join so request-scoped items
appear, and a wider band set for the longer horizon. Verify this read before building — it is
based on the selector's contract and header comment, not on a full audit of its callers.

### 7.4 Why the load is bounded

The reason a task-centric board survives 1,200 trips and a trip-centric one does not:

Far-out trips are **shells** — they carry almost no open work, because every due rule is anchored to
ETD. Work materialises as departure approaches. So the open-task pool is bounded by **cadence**
(flights per week × tasks per trip × days of look-ahead), not by **horizon**. At 15 flights/week,
~10 admin-and-scheduling tasks per trip and a 30-day window, that is a few hundred items, filtered
by owner and by open-status, banded by due date — and it stays that size whether the book holds 200
trips or 2,000.

A trip list grows with the horizon. A task list grows with the cadence. Only one of those is
bounded.

## 8. What changes in code (for the later build)

| File | Change |
|---|---|
| `booking-portal/types.ts` | `TripRequestStatus` → 4 states; add `closedReason`; drop `passengerNames` from the request (moves to the trip's manifest task) |
| `booking-portal/engine/lifecycle.ts` | Collapse to 3 transitions; verdicts follow |
| `booking-portal/engine/toTripRecord.ts` | Unchanged mapping; add the provenance stamp + close open request items |
| `scheduling/engine/types.ts` | `TaskInstance.requestId?: string` |
| `scheduling/store/drizzle-schema.ts` | nullable `request_id` column + forward migration |
| `scheduling/store/seed.ts` | the five `admin-assistant` task definitions (§5.1) |
| `scheduling-command/runBoardSelectors.ts` | optional owner filter; wider bands |
| `booking-portal/pages/RequestList.tsx` | replaced by the two-tab `My trips` surface (§7.2) |

## 9. Testing strategy

Pure logic TDD'd; UI browser-verified, per house rule.

- **Lifecycle:** every legal transition; every illegal one refused with a reason; `closed` carries a
  reason; role guards hold; an audit comment is appended per action; `booked` rejects all edits.
- **Work-item scope:** an instance carries exactly one of `tripId` / `requestId` / `runDate` — the
  three-scope invariant, asserted as a type-level and runtime check.
- **Due derivation:** `monthsBeforeEtd` and `daysBeforeEtd` against a fixed `NOW`, including the
  DST boundary the engine's existing tests already cover.
- **Provisional ETD:** a `fixed`-timing request resolves to its `timeLocal`; a `flexible` one to
  12:00 office-local; a request with no legs raises rather than guessing; and the provisional value
  never appears on a leg or in a rendered departure time (§5.0's hard constraint, asserted).
- **Re-trigger:** a completed manifest task re-opens when pax count changes; a completed catering
  task does not.
- **Boards:** owner filter; band boundaries; an item with no open work never appears in "Needs me";
  the bounded-load property (a 1,200-trip fixture yields a bounded near-band).
- **Conversion:** open request items are closed `n_a` at booking, never dropped.

## 10. Open questions

Carried forward unanswered from the framework spec, now load-bearing rather than academic:

- **Q-A — who authorizes?** Named exec per request, standing departmental authority, or a
  chief-pilot gate? P9 makes approval a work item but cannot say whose. Needs Bryan → the DOM or
  Chief Pilot.
- **Q-B — what must a request actually capture?** §5.1's due offsets (14d, 30d, 3d, 24h) are
  invented placeholders. A real EA and a real scheduler must correct them before they are built.
- **Q-C — purpose / SIFL depth.** Untouched, genuinely regulated, drives tax treatment. Tax counsel
  via Bryan.
- **Q-D — identity in production.** **This design's hinge — see §11.**
- **Q-E — demand into myairops.** Unchanged: no. Reopening it is LG-21's conversation.

## 11. Hinge assumption

**If GFO's admins are external requestors who must be walled off from operational data, this design
is wrong and option A becomes right.**

Everything above rests on the admin being a platform user with a role, able to hold a task on a
canonical trip and see a trip-scoped surface. That is spec question Q-D, unanswered. If admins turn
out to be outside the tenant, they cannot own a `TaskInstance`, the shared work-item shape
collapses, and the manifest genuinely does have to live on a request-side object that syncs across
a boundary — which is option A, with all its divergence risk, chosen for a real reason rather than
for convenience.

Q-D is therefore no longer a build-time detail. It should be routed before this spec is
implemented.

## 12. Assumptions (confirm at plan review)

- **A1** The booking horizon is ~18 months and cadence ~10–20 flights/week. Bryan's figures,
  restated; the bounded-load argument in §7.4 depends on the ratio, not the exact numbers.
- **A2** Far-out trips carry few open tasks because due rules anchor to ETD. True of the engine as
  built; would break if someone authored a task with a fixed calendar due date far from ETD.
- **A3** `TaskInstance` and `TripRecord` are ordinary mutable orchestration data, not ledger tables
  — so a nullable column addition is a normal forward migration. Consistent with the framework's
  constraint 3 and with `CLAUDE.md`'s ledger list, which names neither. Worth one explicit
  confirmation before the migration is written.
- **A4** `admin-assistant` becomes loginable per the framework's §9. Unchanged dependency.
- **A5** §7.3's read of `buildRunBoard` is from its contract, header comment and first 60 lines —
  not an audit of its callers. If a caller assumes the group set is exactly the current four,
  widening the bands breaks it. Verify before extending.
- **A6** A day-precision provisional ETD (§5.0) is good enough for request-scoped due dates. True
  for the review/authorization items proposed here; it would not be true for anything needing
  hour precision, and no such request-scoped item is proposed.

## 13. Evidence posture

No gated claim is made here. Nothing in this spec cites a regulation, a CAMP endpoint, or an
external API shape. The competitor behaviour cited in the framework spec
(`ref-cfd-trip-request-portals`, class `observed`) informs nothing in this design; the reused
patterns are our own shipped pilot slices, which are internal precedent — good reason for *how*,
never for *whether*. The one genuinely regulated thread, SIFL classification, is deliberately
untouched and routed as Q-C.
