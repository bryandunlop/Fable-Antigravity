# Pilot trip-prep visibility — Design Spec (Slice 1 of the pilot trip-view redesign)

- **Date:** 2026-07-06
- **Status:** Approved for planning (brainstorm complete)
- **Author:** Bryan Dunlop + Claude
- **Slice:** Slice 1 of the pilot trip-view redesign (the "trip-prep" half of the future Prep phase). Slice 2 — the two-phase (Prep / Day-of) reorganization of `FlightHub` — is a separate spec.
- **Branch:** `feat/watchlist-scheduling-board` (Fable-Antigravity)
- **Nature of deliverable:** Prototype / reference implementation to hand off. Optimize for a clear, demonstrable weave on the existing scheduling + pilot-workspace data spine — not production hardening.

---

## 1. Background & problem

Today the only way a scheduling checklist item reaches a pilot is a **must-acknowledge** brief. A scheduler task must carry a hidden `handoffTarget: { role: 'pilot' }`; on completion, `applyAction` fires a `SchedulingEvent` (`service.ts:56`), and the pilot's `TripBriefPanel` (`src/components/pilot-workspace/panels/TripBriefPanel.tsx`) renders each event with an **Acknowledge** button (`TripBriefPanel.tsx:47`). Three problems:

- **Visibility and "must-ack" are welded together.** The only lever for "does the pilot see this" is `handoffTarget`, which also forces an acknowledgement. There is no read-only "here's what's been done" mode.
- **Which items reach the pilot is not controllable by the operator.** `handoffTarget` lives in hardcoded templates (`src/scheduling/store/seed.ts`); changing it is a code edit, and there is no UI.
- **Pilots don't need to ack prep items.** They want to *see* what scheduling has completed for the trip, not sign off on it.

## 2. Goal

Give pilots a **read-only "Trip prep" view** listing the scheduling checklist items that are **completed**, limited to the items the operator chooses to expose — and give scheduling/admin an **in-app toggle** to control that per-item visibility, applied **live to every trip** (including in-flight ones). Retire the pilot acknowledgement step.

### Non-goals (explicitly out of scope for this slice)
- The two-phase (Prep / Day-of) reorganization of `FlightHub` — **Slice 2**.
- Pulling the airport-DB / FRAT / maintenance-acceptance rich UI inline, or any change to fuel, FRAT, airport review, scheduling overview, or the maintenance handoff.
- A general template editor (D9). This slice edits only *visibility*, not the checklist content.
- Any change to acknowledgement for **non-pilot** targets (e.g. dept handoffs, escalations) — those keep the existing `SchedulingEvent` ack model.

## 3. Resolved decisions (forks closed during brainstorming)

1. **Pilot view shows completed items only** — a read-only "what's been done" list. No pending items, no ack.
2. **Control = an in-app toggle** for scheduler/admin, per checklist item (task definition), applied **live to all trips**.
3. **Replace the pilot acknowledgement entirely** — pilots never ack scheduling items. (Non-pilot event acks are untouched.)
4. **Visibility lives in a separate, live config keyed by task-definition id — not on the template or the instance.** Trip checklists are frozen at instantiation (`instantiate.ts` pins `templateVersion`), so a flag on the template/instance would not reach in-flight trips without a re-instantiation path that does not exist. A decoupled config read at render time makes a toggle apply everywhere instantly.
5. **Default seeded from today's `handoffTarget: pilot` items**, so the demo is non-empty out of the box; fully editable after.

## 4. Design

### 4.1 Data — the pilot-visibility config
A single updatable structure in the scheduling store: the **set of task-definition ids that are pilot-visible** (`Set<taskDefId>` / a `pilotVisibility` record). It is:
- **Editable** — the toggle panel writes it.
- **Read live** — the pilot view reads the *current* config every render; never pinned into an instance.
- **Seeded** at first run from the task definitions in published per-trip templates whose `handoffTarget` targets the pilot role.

Stored via the `SchedulingStore` interface (new `getPilotVisibility()` / `setPilotVisible(taskDefId, visible)` methods) with an in-memory implementation (the demo's `InMemorySchedulingStore`) and a Postgres table in `drizzle-schema.ts` for parity (schema-only, consistent with the rest of the store).

### 4.2 Surface 1 — scheduler/admin visibility toggle
A new panel in the scheduling hub (a utility tab alongside Templates / Inbox / ForeFlight in `SchedulingCommandCenter.tsx`, or a section in the scheduling workspace), role-gated to `scheduling`/`admin`. It lists the **per-trip** checklist task definitions (deduped by `taskDefId` across published per-trip templates — domestic / international / dca_dassp), each with its title, category, and a **"show to pilot" switch**. Toggling writes the config. Recurring office tasks are excluded (not trip prep). Copy is sentence case.

### 4.3 Surface 2 — pilot "Trip prep" view (reworks `TripBriefPanel`)
Replaces the ackable brief with a read-only projection:
- Reads the open trip's task instances (`store.listInstancesForTrip(trip.id)`).
- Keeps instances that are **completed** (`status === 'done'`) **and** whose `taskDefId` is in the live pilot-visibility config.
- Renders a read-only checked list: item title · a "done" check · optional relative completion time (from `completedAtUtc`). **No acknowledge button.** The scheduler's name is not shown (pilots don't need it).
- Empty state: "No trip prep completed yet." (distinct from "nothing is visible").

The panel stays in its current `FlightHub` position for this slice; Slice 2 relocates it into the Prep phase.

### 4.4 What's retired
The pilot acknowledgement UI and its event dependence. The pilot view is now a **projection over completed instances**, so it needs no `SchedulingEvent`s. The handoff-event firing in `applyAction` (`service.ts:56`) remains only meaningful for **non-pilot** targets; the pilot no longer consumes or acks those events. (Whether to stop firing pilot-targeted handoff events entirely, or leave them as harmless dead output, is a small implementation call for the plan — the pilot view ignores them either way.)

## 5. Integration points
- `src/components/pilot-workspace/panels/TripBriefPanel.tsx` — rework into the read-only completed projection.
- `src/scheduling/store/types.ts` — `SchedulingStore` gains `getPilotVisibility` / `setPilotVisible`; add the config type.
- `src/scheduling/store/memory.ts` — in-memory config storage + seeding.
- `src/scheduling/store/drizzle-schema.ts` — a `pilotVisibility` table (schema parity).
- `src/scheduling/store/seed.ts` — source of the default (task defs with `handoffTarget: pilot`).
- New pure selector (e.g. `src/components/pilot-workspace/tripPrep.ts`) — `completedVisibleItems(instances, visibleSet)` → the projection; unit-tested.
- Scheduling hub — the new toggle panel (new `*Panel.tsx` + a tab in `SchedulingCommandCenter.tsx` or the scheduling workspace).
- `SchedulingWorkspaceContext` — exposes the config read/write to both surfaces (both already consume the shared store).

## 6. Testing
- **Projection selector** (`completedVisibleItems`): includes only `status==='done'` ∩ visible; excludes open/blocked/n_a; excludes completed-but-not-visible; empty when nothing visible; stable ordering (by `order` or completion time).
- **Config read/write**: toggling a taskDefId adds/removes it; default seed contains the `handoffTarget: pilot` defs.
- **Live reconfiguration**: given a trip with a completed item, flipping its visibility off then on changes the projection output for that same trip **without re-instantiation** (the core requirement).
- Follow the existing pure-logic Vitest pattern (`selectors.test.ts` in pilot-workspace, `*.test.ts` in the store).

## 7. Assumptions (confirm at plan review)
- **A1** Default visibility is seeded from `handoffTarget: pilot` task defs (vs. all-hidden). Chosen so the demo isn't empty.
- **A2** The pilot view shows title + done + relative completion time; no actor name.
- **A3** Toggle panel lives as a scheduling-hub utility tab (vs. a section inside the Templates panel).
- **A4** Visibility is keyed by `taskDefId` (per checklist-item definition, shared across trips) — not per category and not per trip.

## 8. Out of scope — Slice 2 (recorded, not built here)
The two-phase pilot trip view: reorganize `FlightHub` into **Prep** (this trip-prep view + fuel requests) and **Day-of** (airport DB review + FRAT + scheduling overview + maintenance handoff), and decide (a) what defines "day-of" (ETD-relative gate vs. simple grouping), and (b) whether to pull the airport/FRAT/handoff rich UI inline vs. keep today's link-outs to tech-log pages. Separate spec after Slice 1 ships.
