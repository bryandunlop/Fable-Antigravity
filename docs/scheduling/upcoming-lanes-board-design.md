# Upcoming — forward triage lanes for the scheduling board — Design Spec

- **Date:** 2026-07-06
- **Status:** Approved for planning (brainstorm complete)
- **Author:** Bryan Dunlop + Claude
- **Slice:** Enhancement to the Scheduling Command Center (`/scheduling-command`), branch `feat/watchlist-scheduling-board`
- **Nature of deliverable:** A prototype / reference implementation to hand off to a developer. Optimize for a clear, demonstrable weave on the existing scheduling data spine — not production hardening.

---

## 1. Background & problem

The Scheduling Command Center (`src/components/scheduling-command/SchedulingCommandCenter.tsx`) already gives schedulers a Schedule surface (Plan Board / Calendar / List) and an Action Center (`RunBoard.tsx`) that buckets tasks by urgency. Trip status is derived live (`tripStatus.ts`), not stored, and per-trip checklists are instantiated from versioned templates. The spine is sound.

The problem schedulers report is **seeing what is coming up without drowning in it**:

- **"Due soon" collapses into "due eventually."** The Action Center's near-term bucket is labelled "Next 48" but is actually wired to the whole 14–90 day horizon (`runBoardSelectors.ts:75` uses `horizonEndMs`). So a task due in 2 hours and a task due in 3 months land in the same pile. There is no clean "coming up but not yet overdue" signal.
- **Clutter scales with the trip count.** With many trips, the schedule surfaces get dense fast, and a scheduler cannot tell at a glance *which trip has an action item coming up* — the per-trip open-task count exists in the adapter but is never surfaced on a row; you must open each trip's drawer.
- **No trip-type filter.** `TripType = 'domestic' | 'international' | 'dca_dassp'` is modelled end-to-end (`src/scheduling/engine/types.ts`, `store/types.ts`) and `adapter.ts` already derives `isInternational`, but `FilterBar.tsx` offers no way to filter by it.

**Framing steer from the product owner (drives the whole design):** schedulers work *ahead* — most trips get finished before anything is due, and they think **outward in time**. So the board must optimise for **upcoming work**, not firefighting. Overdue is the exception, not the organising principle.

## 2. Goal

Add a new **Upcoming** view to `/scheduling-command` that answers, at a glance and without clutter: *which trips have work coming up, and how soon* — organised as forward time-band lanes, with overdue demoted to a small exception signal, and a trip-type filter that works across all views.

### Non-goals (explicitly out of scope for this slice)
- Pilot-side checklist visibility / "show completed items without ack" (separate workstream B).
- Deferral → work-card creation (separate workstream C — a tech-log / airworthiness concern governed by the project NEVER-rules; must not be folded in here).
- Changing the task/template engine, due-date math, or the instantiation model. The Upcoming view is a **read-only projection** over existing task instances.
- Real-time push. Status stays fresh-on-sync, consistent with the rest of the board.

## 3. Resolved decisions (forks closed during brainstorming)

1. **Layout = forward triage lanes (a blend of the kanban and the timeline).** Columns are time bands; within a lane, cards sort soonest-first. Schedulers keep their outward-in-time mental model while getting glanceable triage.
2. **Lanes are keyed by *when the work is due*, not when the trip departs.** A trip that departs in three weeks but has a long-lead action (e.g. an overflight permit) due this week surfaces in **This week**. This is the decision that makes the view about *upcoming work*, not the flight calendar. The card still shows the departure date for context.
3. **Overdue is a slim top strip, only rendered when non-empty.** It is not a lane. "Overdue isn't the primary trigger."
4. **Tiers:** `This week` (≤ 7 days) · `Next week` (8–14 days) · `Later this month` (15–30 days, bounded by the active horizon). Due-today folds into the front of This week (soonest-first sort).
5. **Trip-type filter = three-way, multi-select** (Domestic / International / DASSP), combinable like the existing tail chips. DASSP is kept distinct rather than folded into International, so DCA security trips can be isolated. The filter is **global** — it applies to every view (Plan Board, Calendar, List, Action Center, Upcoming).
6. **Placement = a new view, added alongside** Plan Board / Calendar / List / Action Center. The existing Action Center is retained.
7. **"↓ N more" overflow prompt per lane** so important items scrolled below the fold are always signalled, never silently hidden.
8. **Calm palette; red reserved for the overdue strip.** Scheduling-urgency colours are kept deliberately distinct from the aircraft RED / AMBER / GREEN serviceability RAG (see `docs/scheduling` conventions and the tech-log serviceability projection) so the two colour languages never blur.

## 4. The Upcoming view

### 4.1 Lanes and windows
Three forward lanes, left→right: **This week** (soonest-action due in `[now, now+7d]`), **Next week** (`(now+7d, now+14d]`), **Later this month** (`(now+14d, min(now+30d, horizonEnd)]`). Window boundaries are named constants, easy to tune. The active horizon preset (14 / 30 / 60 / 90d) caps the far edge of the last lane; lanes beyond the horizon are not shown.

Within a lane, cards sort by soonest-action-due ascending. A trip appears in exactly one lane — the lane of its **soonest open, non-overdue action**.

### 4.2 Trip card + action badge
Each card is one trip, identified by the existing `TripIdentity` convention (tail + route + date + type badge). It carries:
- **Headline action badge:** the soonest open action's short label + its relative due ("Overflight permit · 2d").
- **Count:** number of that trip's open actions due within the lane's window ("· 2 items"). The trip drawer shows the full breakdown.
- **Quiet state:** a trip with no open action due inside the horizon renders as a muted "on track" / "nothing due yet" card (see 4.5 for placement) rather than a loud badge.

### 4.3 Overdue strip
When any in-scope trip has an open action with `dueAtUtc < now`, a single slim strip renders above the lanes summarising the count and the offending trips ("1 needs attention now · N2PG KDCA→KPBI · DASSP waiver 1d overdue"), with a link into the trip. It is the only red element on the board by default.

### 4.4 Overflow "↓ N more"
Each lane renders up to N cards (constant, ~4–6). If more trips fall in the lane, a dashed footer button ("↓ 3 more this week") reveals the rest. The count is always shown so nothing hides.

### 4.5 Quiet trips (no upcoming work)
A trip within the horizon with no open action due inside the horizon still appears (schedulers want the whole forward picture), placed in the lane matching its **departure week**, rendered as a muted "on track" card, and sorted to the end of its lane so it never crowds out loud cards. It is included in the "N more" overflow first. *(Assumption — see §8; confirm whether quiet trips should show at all in Upcoming or be left to the Plan Board / Calendar / List.)*

## 5. Trip-type filter

`FilterBar.tsx` gains a multi-select segment: `Domestic` · `International` · `DASSP`. Selection semantics mirror the tail chips — none selected = show all; any selected = show only those types. A new `tripTypeFilter: Set<TripType>` joins the existing filter state in `SchedulingCommandCenter.tsx` (`tailFilter`, `actionRequiredOnly`, `searchTerm`, `horizonDays`) and the predicate is applied wherever trips are listed, so every view honours it.

## 6. Derivation model & integration points

The Upcoming view is a **derived projection** — no new stored state, no schema change.

**New:** `upcomingLanesSelectors.ts` (sibling of `runBoardSelectors.ts`). Given the in-scope trips, their `TaskInstance[]`, and `nowUtc`, it produces an `UpcomingModel`:
- Per trip: partition open per-trip task instances (`status ∈ {open, in_progress, blocked}`) by `dueAtUtc` into `overdue` / `thisWeek` / `nextWeek` / `later` relative to `nowUtc` and the window constants.
- `soonestDueMs` = min non-overdue `dueAtUtc`; assigns the trip's lane.
- `overdueTrips` feed the strip; loud trips feed lanes by `soonestDueMs`; quiet trips feed lanes by departure (per §4.5).
- Pure and fully unit-testable, matching the existing `*Selectors.ts` + `*.test.ts` pattern.

**Reuse:**
- `src/scheduling/engine/triggers.ts` — `evaluateTriggers()` already computes `{overdue, dueSoon, upcoming}`; generalise its window logic (or factor a shared `bucketByDueWindow` helper) rather than duplicating date math.
- `adapter.ts` — `BoardTrip` already exposes `readinessScore`, `criticalBlocker`, `isInternational`; extend the adapter (or the new selector) to expose `soonestDueMs`, per-window counts, and `overdueCount`.
- `TripIdentity.tsx` — reuse `TripIdentityLine` for card identity and the existing INTL / DCA badges.
- `tripStatus.ts` — reuse for the quiet "on track" card treatment.
- `fleet.ts` `KNOWN_FLEET` — unchanged.

**Wire-in:**
- `SchedulingCommandCenter.tsx` — register the new **Upcoming** view in the view toggle; add `tripTypeFilter` to filter state; feed filtered trips to `upcomingLanesSelectors`.
- `FilterBar.tsx` — add the three-way multi-select trip-type segment.
- New component `UpcomingLanes.tsx` (+ `LaneColumn`, `TripActionCard`, `OverdueStrip` as needed) renders the `UpcomingModel`.

**Retire / fix:** the mislabelled "Next 48" behaviour (`runBoardSelectors.ts:75`) is superseded by explicit windows here. Decide during planning whether to also correct the Action Center's bucket label or leave it untouched since Upcoming now owns the near-term view.

## 7. Edge cases
- **Boundary exactness:** a task due at exactly `now+7d` belongs to This week (inclusive upper bound); `now+14d` to Next week; `now+30d` to Later. Cover in tests.
- **Blocked tasks with a due date** still count as open work (they contribute to counts and lane assignment); a blocked-and-overdue task appears in the overdue strip.
- **All-done / `n_a` tasks** never appear as upcoming work.
- **No legs / missing `dueAtUtc`** on a task: exclude from window bucketing; do not crash. A trip whose only open tasks lack due dates is treated as quiet.
- **Horizon interaction:** shrinking the horizon (e.g. to 14d) drops the Later lane entirely; the overdue strip is horizon-independent (overdue is always shown for in-scope trips).
- **Empty state:** no upcoming or overdue work across all lanes → a friendly "nothing coming up in the next 30 days" rather than three empty columns.

## 8. Assumptions & open questions
- **A1 — quiet-trip placement (§4.5).** Assumed: show quiet trips muted, laned by departure. Confirm vs. omitting them from Upcoming entirely.
- **A2 — count semantics (§4.2).** Assumed: badge count = open actions due within the lane's window (not lifetime backlog). Confirm.
- **A3 — window boundaries (§4.1).** Assumed 7 / 14 / 30 days. These are the product owner's "Today + this week" tiering extended outward; confirm the exact day counts.
- **A4 — recurring scheduler tasks.** The Upcoming view is trip-centric; recurring daily/monthly/quarterly ticklers (not trip-scoped) are assumed to remain in the Action Center, not the Upcoming lanes. Confirm.

## 9. Testing (per project convention — bucketing/clock logic gets tests)
- `upcomingLanesSelectors.test.ts`: window boundary exactness; overdue exclusion from lanes; soonest-due lane assignment; per-window counts; quiet-trip-by-departure placement; horizon capping.
- Filter predicate: three-way multi-select combinations; none-selected = all; interaction with tail + search filters.
- Overflow: "N more" count accuracy.
- Determinism against a fixed `nowUtc` (the store already supplies a `nowUtc` callback).

## 10. Out of scope — sibling workstreams (recorded, not built here)
- **B — Pilot-side checklist visibility.** Add an explicit visibility model (e.g. `pilotVisible` / `requiresPilotAck` on `TaskDefinition`) so completed items can be shown to pilots read-only, reconfigurable as templates evolve. Blocked on the template-versioning / re-instantiation question (templates are pinned at instantiation).
- **C — Deferral → work-card.** Structural gap: nothing auto-creates a work card on `PENDING_PLACARD` or gating-release sign; `ADD_WORK_CARD` has no uniqueness guard (duplicate-on-retry risk); rectification creates a work card but deferral (M)-discharge does not. Airworthiness-sensitive — handle as its own debugging + design track under the tech-log NEVER-rules.
