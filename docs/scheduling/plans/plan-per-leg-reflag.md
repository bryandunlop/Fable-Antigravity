# Per-leg Triggers + Re-flag on Change — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Support per-leg / exact-airport checklist tasks and re-flag (re-open + badge) any completed task when the trip changes underneath it, via a full reconcile.

**Architecture:** Extend the pure engine (`src/scheduling/engine/`) with per-airport instantiation, a trip `diffTrip`, and a pure `reconcileTrip`; drive re-open through `applyTaskAction`; add a thin `SchedulingService.updateTrip` caller; add targeted inline edit actions in the UI. Design spec: `docs/scheduling/2026-07-07-per-leg-reflag-design.md`.

**Tech Stack:** TypeScript, Vitest, React, Vite, drizzle (Postgres) + in-memory store.

## Global Constraints

- All new `TaskDefinition` / `TaskInstance` / `TripContext` fields are **optional** — existing tasks, the Phase 1 seed, and existing tests must stay green.
- Pure engine stays pure (no I/O, no `Date.now()`); the service owns the clock and store. Deterministic `idFactory`.
- Instance id seed for per-airport tasks MUST include `:legId:endpoint`.
- Reconcile uses the desired instance set as **keys/shape/timing only**; a surviving instance is never persisted from a freshly-built one (would reset status/ack/audit).
- `computeDueAtUtc` keeps the fixed `-240` office offset (documented limitation; not fixed here).
- Tests first for all correctness-critical logic (matching, diff, reconcile, reopen).
- Commit after each task. Run `npx vitest run src/scheduling src/components/scheduling-workspace` green before moving on.

---

## File Structure

- `src/scheduling/engine/types.ts` — MODIFY: add `AirportEndpoint`, `AirportMatch`, `AppliesTo`, `ReTrigger`, `LegContext`; extend `TaskDefinition`, `TripContext`, `TaskInstance`, `TaskStatus`; add `reopen` to `TaskAction`.
- `src/scheduling/engine/airports.ts` — CREATE: `matchAirport`, `expandEndpoints`.
- `src/scheduling/engine/instantiate.ts` — MODIFY: per-airport second pass + per-endpoint due anchor + extended id seed.
- `src/scheduling/engine/diff.ts` — CREATE: `diffTrip`, `TripDiff`, `LegChange`.
- `src/scheduling/engine/reconcile.ts` — CREATE: `reconcileTrip`, `ReconcilePlan`, `instanceKey`.
- `src/scheduling/engine/tasks.ts` — MODIFY: `applyTaskAction` `reopen` case + `complete` clears `reflag`.
- `src/scheduling/engine/readiness.ts` — MODIFY: exclude `cancelled` from completion.
- `src/scheduling/engine/index.ts` — MODIFY: re-export new modules/types.
- `src/scheduling/store/mapping.ts` — MODIFY: populate `TripContext.legs`.
- `src/scheduling/store/types.ts` — MODIFY: add `removeEvent` to `SchedulingStore`.
- `src/scheduling/store/memory.ts` / `postgres.ts` — MODIFY: implement `removeEvent`; instance columns.
- `src/scheduling/store/drizzle-schema.ts` — MODIFY: `legId`, `airportIcao`, `airportRole`, `reflag` columns.
- `src/scheduling/store/service.ts` — MODIFY: `updateTrip`, reopen side-effects.
- `src/scheduling/store/validate.ts` — MODIFY: parse `appliesTo`, `reTriggerOn`.
- `src/scheduling/store/seed.ts` — MODIFY: seed the deferred per-airport + Pax Forms tasks.
- `src/scheduling/store/seedTrips.ts` — MODIFY: demo routes that hit the per-airport tasks.
- `src/components/scheduling-workspace/taskRowHelpers.tsx` — MODIFY: leg label + reflag/cancelled badges.
- `src/components/scheduling-workspace/TripsPanel.tsx` — MODIFY: targeted inline edit actions.
- `src/components/scheduling-workspace/templateEditor.ts` + `TemplateEditorDialog.tsx` — MODIFY: `appliesTo` + `reTriggerOn` editors.

---

## Task 1: Engine types + validator

**Files:** Modify `engine/types.ts`, `store/validate.ts`, `engine/index.ts`; Test `store/validate.test.ts`.

**Interfaces — Produces:**
```ts
type AirportEndpoint = 'departure' | 'arrival' | 'both';
type AirportMatch = { kind:'exact'; icao:string } | { kind:'prefix'; prefix:string; except?:string[] };
interface AppliesTo { endpoint: AirportEndpoint; airport: AirportMatch }
type ReTrigger = 'legScheduleChange' | 'aircraftChange' | 'passengerChange';
interface LegContext { legId:string; sequence:number; departureIcao:string; arrivalIcao:string; departureTimeUtc:string; arrivalTimeUtc?:string; paxCount:number }
// TaskDefinition += appliesTo?: AppliesTo; reTriggerOn?: ReTrigger[]
// TripContext += legs: LegContext[]
// TaskStatus += 'cancelled'
// TaskInstance += legId?, airportIcao?, airportRole?:'departure'|'arrival', reflag?:{ change: ReTrigger }
// TaskAction += { kind:'reopen'; change: ReTrigger; detail?: string; newEtdUtc?: string; newDueAtUtc?: string }
```

- [ ] **Step 1: Write failing validator tests** in `store/validate.test.ts`: (a) a taskDef with valid `appliesTo` (prefix+except) and `reTriggerOn` parses; (b) invalid `appliesTo.endpoint` throws; (c) invalid `reTriggerOn` value throws; (d) a taskDef with neither field still parses (back-compat).
- [ ] **Step 2:** Run `npx vitest run src/scheduling/store/validate.test.ts` — expect FAIL.
- [ ] **Step 3:** Add the type declarations to `types.ts` (above). Add to `validate.ts` `parseTaskDef`: parse `appliesTo` (endpoint ∈ {departure,arrival,both}; airport union exact|prefix with optional string[] `except`) and `reTriggerOn` (array of the 3 enum values). Export new types from `engine/index.ts`.
- [ ] **Step 4:** Run the test — expect PASS. Run full `npx vitest run src/scheduling` — green.
- [ ] **Step 5:** Commit `feat(scheduling): per-leg/re-trigger types + validation`.

---

## Task 2: Airport matching + per-airport instantiation

**Files:** Create `engine/airports.ts`; Modify `engine/instantiate.ts`, `store/mapping.ts`, `engine/index.ts`; Test `engine/airports.test.ts`, `engine/instantiate.test.ts`.

**Interfaces — Consumes:** Task 1 types. **Produces:** `matchAirport(icao, m): boolean`; `expandEndpoints(e): ('departure'|'arrival')[]`; per-airport instances stamped with `legId/airportIcao/airportRole`.

- [ ] **Step 1: `airports.ts` tests** — `matchAirport('KBOS',{kind:'exact',icao:'KBOS'})===true`; `matchAirport('KTEB',{kind:'prefix',prefix:'K',except:['KLUK']})===true`; `matchAirport('KLUK',{kind:'prefix',prefix:'K',except:['KLUK']})===false`; `matchAirport('EGLL',{kind:'prefix',prefix:'K'})===false`; `expandEndpoints('both')` deep-equals `['departure','arrival']`.
- [ ] **Step 2:** Run — FAIL.
- [ ] **Step 3:** Implement `airports.ts`:
```ts
export function matchAirport(icao: string, m: AirportMatch): boolean {
  const up = icao.toUpperCase();
  if (m.kind === 'exact') return up === m.icao.toUpperCase();
  return up.startsWith(m.prefix.toUpperCase()) && !(m.except ?? []).map(x=>x.toUpperCase()).includes(up);
}
export function expandEndpoints(e: AirportEndpoint): ('departure'|'arrival')[] {
  return e === 'both' ? ['departure','arrival'] : [e];
}
```
- [ ] **Step 4:** Run — PASS.
- [ ] **Step 5: `instantiate.test.ts` tests** — build a `TripContext` with `legs` (KLUK→KBOS then KBOS→KLGA). For a `perAirport` FBO def (both, prefix K except KLUK): expect instances for KBOS(arr,leg1), KBOS(dep,leg2), KLGA(arr,leg2) — NOT KLUK. Assert **distinct ids** and `airportRole`/`legId` set. For a KBOS-arrival exact def: exactly one instance, `dueAtUtc` computed off leg1 `arrivalTimeUtc` (assert it differs from a departure-anchored value).
- [ ] **Step 6:** Run — FAIL.
- [ ] **Step 7:** `mapping.ts`: populate `TripContext.legs` from `TripRecord.legs` (map fields, `legId=leg.id`). `instantiate.ts`: after the trip-level map, add a second pass over `perAirport` defs (that also pass any `condition`): for each leg × `expandEndpoints`, pick the endpoint ICAO, `matchAirport` → `buildInstance` with `etdUtc = departure?leg.departureTimeUtc:(leg.arrivalTimeUtc ?? leg.departureTimeUtc)` and extra fields `{legId, airportIcao, airportRole}`; extend `buildInstance` seed to append `:${legId}:${endpoint}` and set the new instance fields. Sort combined output by `order`.
- [ ] **Step 8:** Run instantiate + full `src/scheduling` — PASS/green.
- [ ] **Step 9:** Commit `feat(scheduling): per-airport instantiation with per-endpoint due dates`.

---

## Task 3: diffTrip

**Files:** Create `engine/diff.ts`; Modify `engine/index.ts`; Test `engine/diff.test.ts`.

**Interfaces — Produces:** `diffTrip(oldT: TripRecord, newT: TripRecord): TripDiff` where `TripDiff = { aircraftChanged: boolean; legChanges: Record<string, {rescheduled:boolean; paxDelta:number}> }` (keyed by leg id, over legs present in both).

- [ ] **Step 1: tests** — aircraft swap → `aircraftChanged`; a leg dep-time change → `legChanges[id].rescheduled`; pax +2 on a leg → `paxDelta===2`; **reordering legs (same ids, swapped sequence) → no rescheduled, no paxDelta**; a leg only in old (removed) or only in new (added) does NOT appear in `legChanges`.
- [ ] **Step 2:** Run — FAIL.
- [ ] **Step 3:** Implement `diffTrip`: `aircraftChanged = old.tail!==new.tail || old.aircraftType!==new.aircraftType`. Build `legChanges` by intersecting leg ids: `rescheduled = o.departureTimeUtc!==n.departureTimeUtc || o.arrivalTimeUtc!==n.arrivalTimeUtc`; `paxDelta = n.paxCount - o.paxCount`. (Note: `TripDiff` imports `TripRecord` from `../store/types`; if that creates a cycle, define diff over a minimal `{tail,aircraftType,legs:{id,departureTimeUtc,arrivalTimeUtc,paxCount}[]}` shape instead.)
- [ ] **Step 4:** Run — PASS.
- [ ] **Step 5:** Commit `feat(scheduling): diffTrip (leg-id keyed change set)`.

---

## Task 4: reopen action

**Files:** Modify `engine/tasks.ts`; Test `engine/tasks.test.ts`.

**Interfaces — Consumes:** `TaskAction` `reopen` (Task 1). **Produces:** `applyTaskAction(inst, {kind:'reopen',...}, actor, nowUtc)` returns a reopened instance; `complete` clears `reflag`.

- [ ] **Step 1: tests** — reopen a `done`+`acked` requiresAck instance: status→`open`, ackState→`pending`, `ackedBy/ackedAtUtc/completedBy/completedAtUtc` cleared, `reflag.change` set, audit gains `reopened:<change>`, `etdUtc/dueAtUtc` replaced when `newEtdUtc/newDueAtUtc` given. Then `complete` it: `reflag` becomes `undefined`.
- [ ] **Step 2:** Run — FAIL.
- [ ] **Step 3:** Add the `reopen` case (per spec §7) and set `reflag: undefined` in the `complete` case.
- [ ] **Step 4:** Run — PASS.
- [ ] **Step 5:** Commit `feat(scheduling): applyTaskAction reopen + complete clears reflag`.

---

## Task 5: reconcileTrip

**Files:** Create `engine/reconcile.ts`; Modify `engine/index.ts`; Test `engine/reconcile.test.ts`.

**Interfaces — Consumes:** Tasks 1–4. **Produces:** `instanceKey(i): string`; `reconcileTrip(existing, desired, diff, actor, nowUtc): { toCreate: TaskInstance[]; toUpdate: TaskInstance[] }` (pure — computes reopen/cancel/re-due via `applyTaskAction` and field updates; does no I/O).

- [ ] **Step 1: tests** (build `existing` = live instances incl. a completed pax task + a completed KBOS-arrival task; `desired` = re-instantiated set; `diff` variants):
  - pax +1, pax task in `reTriggerOn` → that completed task in `toUpdate`, status `open`, `reflag.change==='passengerChange'`, audit appended. **Catering (no reTrigger) stays absent from toUpdate.**
  - leg reschedule → the leg's completed KBOS task reopened AND its `dueAtUtc` = the desired instance's dueAtUtc.
  - **survivor preservation:** an unchanged completed+acked survivor is NOT in `toUpdate` (byte-identical live row preserved).
  - added leg (new key in desired) → in `toCreate`, status `open`.
  - removed leg (key in existing, not desired) → in `toUpdate`, status `cancelled`, audit `no longer applies`; completion fields preserved.
- [ ] **Step 2:** Run — FAIL.
- [ ] **Step 3:** Implement per spec §6: `instanceKey = taskDefId|legId|airportRole`. Index both sets. NEW→push desired. REMOVED→`{...live, status:'cancelled', auditTrail:[...,{...,'cancelled','no longer applies'}]}`. SURVIVING→ determine `fired` from the live instance's def `reTriggerOn` vs `diff` (per-leg keyed by `legId`, trip-level = any leg); if fired && (done||acked) → `applyTaskAction(live,{kind:'reopen',change,newEtdUtc:desired.etdUtc,newDueAtUtc:desired.dueAtUtc,detail},'system',nowUtc)`; else if per-leg legMoved → `{...live, etdUtc:desired.etdUtc, dueAtUtc:desired.dueAtUtc}`; else omit. (reconcile needs each desired instance's def; pass a `defsById` lookup or read `reTriggerOn` from a map built by the caller — thread a `Map<taskDefId, TaskDefinition>` param.)
- [ ] **Step 4:** Run — PASS. Full `src/scheduling` green.
- [ ] **Step 5:** Commit `feat(scheduling): reconcileTrip (add/cancel/re-flag/re-due, survivor-preserving)`.

---

## Task 6: SchedulingService.updateTrip + store.removeEvent

**Files:** Modify `store/service.ts`, `store/types.ts`, `store/memory.ts`, `store/postgres.ts`; Test `store/service.test.ts`.

**Interfaces — Produces:** `SchedulingService.updateTrip(updatedTrip, nowUtc): Promise<{trip; created; updated}>`; `SchedulingStore.removeEvent(id): Promise<void>`.

- [ ] **Step 1: tests** — create a trip, complete a pax task, `updateTrip` with +1 pax → the task reads `open`+`reflag` in the store; a completed handoff task that reopens produces a fresh handoff event; a prior escalation event for a reopened task is removed so `runEscalations` can re-fire.
- [ ] **Step 2:** Run — FAIL.
- [ ] **Step 3:** Add `removeEvent` to the store interface + both adapters (memory: `events.delete(id)`; postgres: `delete where id`). Implement `updateTrip`: `old=getTrip`; `saveTrip`; build `desired` via `instantiatePerTrip` + a `defsById` map from published templates; `existing=listInstancesForTrip`; `plan=reconcileTrip(...)`; `saveInstances(plan.toCreate)`; `for u of plan.toUpdate: updateInstance(u)`; for each reopened instance with `handoffTarget` save a fresh handoff event and `removeEvent` its prior escalation event (look up via `listEventsForTarget`/entityRef).
- [ ] **Step 4:** Run — PASS.
- [ ] **Step 5:** Commit `feat(scheduling): service.updateTrip reconcile + event re-fire`.

---

## Task 7: Readiness excludes cancelled + pilot-visibility regression

**Files:** Modify `engine/readiness.ts`; Test `engine/readiness.test.ts`, `store/pilotVisibility.test.ts`.

- [ ] **Step 1: tests** — a `cancelled` instance is excluded from the completion denominator; a reopened (`open`) instance counts as incomplete. Pilot-visibility: two per-airport instances sharing one `taskDefId` both resolve visibility correctly.
- [ ] **Step 2:** Run — FAIL.
- [ ] **Step 3:** Add `'cancelled'` to the excluded-status set in `deriveSchedulingReadiness` (wherever `n_a` is excluded).
- [ ] **Step 4:** Run — PASS.
- [ ] **Step 5:** Commit `feat(scheduling): readiness excludes cancelled`.

---

## Task 8: Seed the deferred tasks + demo routes

**Files:** Modify `store/seed.ts`, `store/seedTrips.ts`; Test `store/seed.test.ts`, `store/seedTrips.test.ts`.

- [ ] **Step 1: tests** — instantiating a trip through KLUK→KBOS→KLGA yields the FBO/hangar per-airport instances (K except KLUK), a KBOS PPR arrival instance, a KLGA ARO instance, a KLUK fuel departure instance, and the trip-level Pax Forms task. Update the two count-fragile Phase-1 assertions (`.length).toBe(2)` / "first two done") to the new counts.
- [ ] **Step 2:** Run — FAIL.
- [ ] **Step 3:** Add the per-airport + Pax Forms task defs to `seed.ts` (spec §9; shared across per-trip templates like `ALL_TRIPS_TASKS`, unique ids, orders 60+). Add/adjust a `seedTrips.ts` demo trip whose route hits KBOS(arr)/KLGA/a K-airport/KLUK(dep) and pre-completes one per-airport or pax task so a subsequent inline edit visibly re-flags it.
- [ ] **Step 4:** Run — PASS. Full suite green.
- [ ] **Step 5:** Commit `feat(scheduling): seed per-airport + pax-forms tasks and demo routes`.

---

## Task 9: UI — targeted inline edit actions + render path

**Files:** Modify `components/scheduling-workspace/TripsPanel.tsx`, `taskRowHelpers.tsx`, `RunBoardPanel.tsx`.

- [ ] **Step 1:** In `taskRowHelpers.tsx`, add a per-airport suffix (`— {airportIcao} ({airportRole}, leg {n})`) when `legId` is set, a **re-flag badge** when `reflag` is set (label from `reflag.change`), and a `cancelled` badge treatment. (Pure render helpers — add a small render test if the file has one; otherwise verify via preview.)
- [ ] **Step 2:** In `TripsPanel.tsx` trip-detail Legs list, add per-leg controls wired to `service.updateTrip(mutated, nowUtc())` then `bump()`: **Add passenger** (paxCount+1), **Reschedule leg** (`datetime-local`), **Swap aircraft** (reuse the aircraft `Select`), **Add/Remove leg** (reuse `emptyLeg`/`addLeg`/`removeLeg`).
- [ ] **Step 3:** `npx tsc --noEmit` for the touched files (baseline error count unchanged); `npx vite build` clean.
- [ ] **Step 4:** Verify in preview: create/open the seeded demo trip, add a passenger, confirm the completed pax task flips to re-flagged on the board.
- [ ] **Step 5:** Commit `feat(scheduling): inline trip-edit actions + per-airport/reflag render`.

---

## Task 10: No-code editor fields

**Files:** Modify `components/scheduling-workspace/templateEditor.ts`, `TemplateEditorDialog.tsx`; Test `templateEditor.test.ts`.

- [ ] **Step 1: tests** — round-trip a taskDef with `appliesTo` + `reTriggerOn` through the editor's to/from-builder helpers unchanged.
- [ ] **Step 2:** Run — FAIL.
- [ ] **Step 3:** Add an `appliesTo` builder (endpoint select + airport match: exact icao / prefix + except list) and `reTriggerOn` checkboxes to the editor model + dialog; ensure publish payload carries them through `parseTemplate`.
- [ ] **Step 4:** Run — PASS; `vite build` clean.
- [ ] **Step 5:** Commit `feat(scheduling): no-code editor for appliesTo + reTriggerOn`.

---

## Task 11: Postgres/drizzle parity

**Files:** Modify `store/drizzle-schema.ts`, `store/postgres.ts`; add a drizzle migration.

- [ ] **Step 1:** Add nullable columns `leg_id`, `airport_icao`, `airport_role` (text) and `reflag` (jsonb) to the task-instances table; map them in `postgres.ts` row⇄instance. `status` is text so `cancelled` needs no migration.
- [ ] **Step 2:** `npx drizzle-kit generate` (forward-only migration; new columns nullable).
- [ ] **Step 3:** `npx vitest run src/scheduling` green (postgres adapter tests, if mocked, still pass).
- [ ] **Step 4:** Commit `feat(scheduling): postgres columns for per-airport + reflag`.

---

## Self-Review (completed before handoff)

- **Spec coverage:** §3 data model→T1; §4 instantiation→T2; §5 diff→T3; §6 reconcile→T5; §7 reopen→T4; §8 UI→T9; §9 seed/validator/editor/persistence→T1/T8/T10/T11; §10 readiness/visibility→T7. All covered.
- **Type consistency:** `AppliesTo/AirportMatch/ReTrigger/LegContext`, `reflag:{change}`, `instanceKey=taskDefId|legId|airportRole`, `TripDiff.legChanges` used consistently across tasks.
- **Placeholders:** none — each task carries concrete tests/signatures; hard algorithms (matchAirport, reconcile, reopen) shown in code.
- **Note:** `diff.ts` type-import cycle risk flagged in T3 with a fallback (minimal shape).
