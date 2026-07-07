# Phase 2 — Per-leg / exact-airport triggers + re-flag on change

**Status:** design approved, pre-implementation
**Date:** 2026-07-07
**Module:** `src/scheduling/` (engine + store) and `src/components/scheduling-workspace/`
**Depends on:** Phase 1 seed (commit `84a513d`, on `main`)

---

## 1. Goal

Two capabilities the current per-trip checklist engine cannot express, both from the department's Portal trip-checklist Excel:

- **(A) Per-leg / exact-airport tasks** — a task that instantiates once per matching leg-endpoint:
  - *Arrange FBO handling* and *Hangar needed* — each leg's departure **and** arrival, for every airport starting with `K` **except** `KLUK`.
  - *Fuel load* — `KLUK` **departures** only.
  - *KBOS PPR* — each **arrival** to `KBOS`.
  - *KLGA ARO slot* — each **arrival or departure** at `KLGA`.
- **(B) Re-flag on change** *(headline requirement)* — when a trip changes after its tasks exist, a **completed** task whose trigger fired is re-opened and badged, and the per-leg task set is reconciled to the new itinerary. Example: a passenger is added → *Confirm PAX forms* re-opens; a leg's time moves → that leg's *FBO handling* / *PPR* re-opens and its due date shifts.
- **(C) Trip-edit surface** — none exists today (`createTripMirror` runs once at creation); we add the minimal surface that produces a change.

## 2. Confirmed decisions

| Decision | Choice |
|---|---|
| Re-flag semantics | **Re-open** the task (no bespoke "stale" lifecycle state) + a **badge** driven by a small render flag |
| Re-trigger config | **Per-task, declarative** (`reTriggerOn` on the TaskDefinition), matching the Excel's Re-Trigger column |
| On-edit behavior | **Full reconcile** — add tasks for new legs, cancel tasks for removed legs, re-flag changed-completed tasks |
| Airport matcher | A **purpose-built `appliesTo` field** (not folded into the `Condition` union — `Condition` is a boolean gate; `appliesTo` drives per-leg *fan-out*) |
| Removed-leg tasks | A distinct **`cancelled`** status (not `n_a`, which means "not applicable" and would inflate readiness %) |
| Reconcile location | A **pure `reconcile.ts` engine module**; `SchedulingService.updateTrip` is a thin caller |
| Reopen mechanics | Routed through a new `applyTaskAction` **`reopen`** action (so it can't clobber state and auto-handles ack reset / event re-fire) |
| Edit surface | **Targeted inline actions** on trip-detail (Add passenger / Reschedule leg / Swap aircraft / Add-Remove leg) — not a full edit form |

## 3. Data model (`engine/types.ts`)

All additions to `TaskDefinition` and `TaskInstance` are **optional** so existing tasks, the Phase 1 seed, and existing tests are untouched.

```ts
export type AirportEndpoint = 'departure' | 'arrival' | 'both';

export type AirportMatch =
  | { kind: 'exact'; icao: string }                       // KBOS, KLGA, KLUK
  | { kind: 'prefix'; prefix: string; except?: string[] }; // "K" except ["KLUK"]

export interface AppliesTo {
  endpoint: AirportEndpoint;
  airport: AirportMatch;
}

export type ReTrigger = 'legScheduleChange' | 'aircraftChange' | 'passengerChange';

export interface TaskDefinition {
  // ...existing...
  appliesTo?: AppliesTo;      // undefined => trip-level (today's behavior)
  reTriggerOn?: ReTrigger[];  // undefined/empty => never re-flags
}

export interface LegContext {
  legId: string;
  sequence: number;
  departureIcao: string;
  arrivalIcao: string;
  departureTimeUtc: string;
  arrivalTimeUtc?: string;
  paxCount: number;
}

export interface TripContext {
  // ...existing scalars stay (etdUtc, routeIcaos, maxPaxCount, ...)...
  legs: LegContext[];          // NEW — toTripContext stops discarding TripRecord.legs
}

export type TaskStatus =
  | 'open' | 'in_progress' | 'blocked' | 'done' | 'n_a'
  | 'cancelled';               // NEW — task no longer applies (leg/airport removed)

export interface TaskInstance {
  // ...existing...
  legId?: string;              // NEW — the leg this per-airport instance belongs to
  airportIcao?: string;        // NEW — the matched airport
  airportRole?: 'departure' | 'arrival'; // NEW — which endpoint matched
  reflag?: { change: ReTrigger };         // NEW — render flag; cleared on completion
}
```

**Why `reflag` is a minimal flag, not `{reason, atUtc, change}`:** the durable record is the append-only `auditTrail` entry (`reopened:<change>`, `detail:"passenger count increased"`). `reflag` exists only so the pure badge/tooltip renderers — which read instance *fields*, not audit logs (`taskRowHelpers` `StatusBadge`/`AckBadge`) — can render deterministically. Cleared to `undefined` on `complete`.

## 4. Per-airport instantiation (`engine/instantiate.ts`)

`instantiatePerTrip` gains a second pass after the trip-level pass. For each published per-trip task with `appliesTo`:

```
for each leg in trip.legs:
  for each endpoint in expand(appliesTo.endpoint):   // 'both' => [departure, arrival]
    icao = endpoint === 'departure' ? leg.departureIcao : leg.arrivalIcao
    if matchAirport(icao, appliesTo.airport):
      anchorEtd = endpoint === 'departure' ? leg.departureTimeUtc
                                           : (leg.arrivalTimeUtc ?? leg.departureTimeUtc)
      emit buildInstance(def, template, {...ctx, etdUtc: anchorEtd},
                         tripId, null, idFactory,
                         { legId: leg.legId, airportIcao: icao, airportRole: endpoint })
```

- `matchAirport(icao, m)`: `exact` → `icao === m.icao`; `prefix` → `icao.startsWith(m.prefix) && !(m.except ?? []).includes(icao)`. (Uppercased; `except` is net-new — `routeTouchesIcaoPrefix` has no exclusion.)
- **Instance id seed MUST include leg + endpoint:** `${template.id}:${version}:${def.id}:${tripId}:${legId}:${endpoint}`. Without this, an out-and-back (KBOS as leg-1 arrival and leg-2 departure) or a repeated tech-stop collides to one id and the store silently drops a task. Trip-level tasks keep the current seed.
- **Due dates anchor to the endpoint's own time:** arrival obligations (KBOS PPR, KLGA slot) anchor `hoursBeforeEtd`/`businessDaysBeforeEtd` to the leg's **arrival** time, not its departure. Threaded via `DueContext.etdUtc` per instance — no change to `dueDates.ts`.
- `condition` and `appliesTo` **compose**: a `perAirport` task may still carry a trip-level `condition` gate (evaluated once); if it fails, the task fans out to zero instances.

## 5. Trip diff (`engine/diff.ts`)

Pure `diffTrip(oldTrip, newTrip): TripDiff`, keyed by **leg id** (never sequence — reordering legs must not read as reschedule/remove+add):

```ts
export interface LegChange { rescheduled: boolean; paxDelta: number }
export interface TripDiff {
  aircraftChanged: boolean;                 // tail OR aircraftType changed
  legChanges: Record<string, LegChange>;    // by legId, for legs present in BOTH
}
```

`rescheduled` = departure or arrival time changed. `paxDelta` = new − old pax for that leg. **Added/removed legs are not enumerated here** — they fall out of the desired-vs-existing instance-set comparison in reconcile (§6). This keeps `diffTrip` shaped to exactly what reconcile consumes.

## 6. Reconcile (`engine/reconcile.ts`) — the heart

Pure `reconcileTrip(existing, desired, diff, nowUtc, off): ReconcilePlan` returning `{ toCreate: TaskInstance[]; toUpdate: TaskInstance[] }`. The **desired set is a key/shape source only** — freshly-built instances are `status:'open'` with a one-entry audit trail and collide on id with live ones, so a survivor must **never** be persisted from the fresh build (that would reset a done/acked task and truncate its audit — destroying exactly what re-flag protects).

Instance key: `taskDefId + '|' + (legId ?? '') + '|' + (airportRole ?? '')`.

```
existingByKey, desiredByKey = index both

NEW      (key in desired, not existing):
           push the freshly-built (open) desired instance -> toCreate

REMOVED   (key in existing, not desired — a per-airport instance whose leg/airport is gone,
           OR a conditional trip-level task whose `condition` flipped false, e.g. the China
           arrival card after the China leg is dropped. Tasks that still apply are in desired,
           so they never land here):
           load LIVE instance -> status 'cancelled' + audit 'cancelled: no longer applies'
           -> toUpdate (never deleted; completion fields + audit preserved)

SURVIVING (key in both): start from the LIVE existing instance.
   fired = def.reTriggerOn matches a change affecting THIS instance:
     'aircraftChange'    -> diff.aircraftChanged
     'legScheduleChange' -> diff.legChanges[legId]?.rescheduled   (per-leg)
                            OR any leg rescheduled                (trip-level task)
     'passengerChange'   -> diff.legChanges[legId]?.paxDelta > 0  (per-leg)
                            OR any leg paxDelta > 0               (trip-level task)
   legMoved = per-leg instance whose leg rescheduled

   if fired AND instance is completed ('done') or acked:
        reopen via applyTaskAction('reopen', {change, newEtdUtc, newDueAtUtc, detail}) -> toUpdate
   else if legMoved:
        refresh etdUtc + dueAtUtc to the new leg time (open task's due tracks) -> toUpdate
   else:
        leave the live instance untouched (NOT in toUpdate)

// newEtdUtc / newDueAtUtc always come from the MATCHING desired instance (which was built
// against the new leg time), never recomputed ad hoc — the desired set is the source of truth
// for shape and timing; the live instance is the source of truth for state.
```

`SchedulingService.updateTrip(updatedTrip, nowUtc)`:
1. `old = getTrip(id)`; `saveTrip(updatedTrip)`.
2. `desired = instantiatePerTrip(templates, toTripContext(updatedTrip), ctx)`.
3. `existing = listInstancesForTrip(id)`.
4. `plan = reconcileTrip(existing, desired, diffTrip(old, updatedTrip), nowUtc, off)`.
5. `saveInstances(plan.toCreate)`; `for u of plan.toUpdate: updateInstance(u)`.
6. **Side effects for each reopened instance:** if it has a `handoffTarget`, save a fresh handoff `SchedulingEvent` (the pilot's inbox re-surfaces the un-done item); and clear any prior **escalation** event for that task id so a reopened critical task (e.g. DASSP TSA screening) can re-escalate (see §7).

## 7. Reopen action (`engine/tasks.ts` — `applyTaskAction`)

New action kind `reopen`:

```ts
case 'reopen':
  return {
    ...inst,
    status: 'open',
    ackState: inst.requiresAck ? 'pending' : 'n_a',   // re-arms computeEscalations
    ackedBy: undefined, ackedAtUtc: undefined,
    completedBy: undefined, completedAtUtc: undefined,
    etdUtc:   action.newEtdUtc  ?? inst.etdUtc,        // escalation deadline reads etdUtc
    dueAtUtc: action.newDueAtUtc ?? inst.dueAtUtc,
    reflag: { change: action.change },
    auditTrail: [...inst.auditTrail,
      { atUtc: nowUtc, actor, action: `reopened:${action.change}`, detail: action.detail }],
  };
```

`complete` additionally sets `reflag: undefined` (clears the badge).

**Escalation re-arm:** `computeEscalations` gates on `ackState === 'pending'` and reads the deadline off `etdUtc` — both handled by the reopen above. But `runEscalations` dedups escalation **events** by task id forever, so the stale event must be cleared on reopen. Add `SchedulingStore.removeEvent(id)` (or mark the prior escalation event superseded) and call it from `updateTrip` step 6. Small, but required for a reopened critical task to actually re-alert.

## 8. Trip-edit UI (`TripsPanel.tsx` + helpers)

Targeted inline actions on the trip-detail Legs list (which already maps `selectedTrip.legs`), each wiring one mutated `TripRecord` to `service.updateTrip(mutated, nowUtc())` then `bump()`:

1. **Add passenger** — `paxCount + 1` on a leg → `passengerChange`.
2. **Reschedule leg** — a `datetime-local` on the leg row → `legScheduleChange` (also re-dues that leg's per-airport tasks).
3. **Swap aircraft** — reuse the existing 3-item aircraft `Select` → `aircraftChange`.
4. **Add / Remove leg** — reuse existing `emptyLeg`/`addLeg`/`removeLeg` helpers → exercises the reconcile NEW / REMOVED branches.

**Render path (`RunBoardPanel` / `TripsPanel` / `taskRowHelpers`):** today rows render title + status only. Add (a) a leg/airport suffix for per-airport instances (`FBO handling — KTEB (arrival, leg 2)`) from `airportIcao`/`airportRole`/leg sequence, and (b) a **re-flag badge** ("Re-opened: passenger added") when `reflag` is set, plus a `cancelled` badge treatment.

## 9. Seed + no-code editor + persistence

- **Seed the deferred tasks** (`store/seed.ts`) with the new fields, shared across per-trip templates like `ALL_TRIPS_TASKS`:
  - FBO handling, Hangar — `appliesTo:{endpoint:'both', airport:{kind:'prefix', prefix:'K', except:['KLUK']}}`, `reTriggerOn:['legScheduleChange','aircraftChange']`.
  - KLUK Fuel — `{endpoint:'departure', airport:{kind:'exact', icao:'KLUK'}}`.
  - KBOS PPR — `{endpoint:'arrival', airport:{kind:'exact', icao:'KBOS'}}`, `reTriggerOn:['legScheduleChange','aircraftChange']`.
  - KLGA ARO — `{endpoint:'both', airport:{kind:'exact', icao:'KLGA'}}`, `reTriggerOn:['legScheduleChange','aircraftChange']`.
  - Pax Forms — trip-level, `reTriggerOn:['passengerChange']`, deadline `businessDaysBeforeEtd:1` (Excel left it blank — **flagged assumption**).
- **Seed demo routes** (`store/seedTrips.ts`) that actually hit these — a trip through `KBOS` (arrival), `KLGA`, a non-LUK `K` airport, and a `KLUK` departure — otherwise the headline feature is invisible in the demo. Include one trip with a **completed** per-airport/pax task so a follow-up inline edit visibly re-flags it.
- **Validator** (`store/validate.ts`) — `parseTaskDef` parses `appliesTo` (endpoint enum + airport match union) and `reTriggerOn` (enum array). Same gate for seed and UI-published templates.
- **No-code editor** (`templateEditor.ts` + `TemplateEditorDialog.tsx`) — an `appliesTo` builder (endpoint select + airport match) and `reTriggerOn` checkboxes so per-airport/re-trigger tasks stay department-editable.
- **Persistence** — `appliesTo`/`reTriggerOn` ride the existing template `jsonb` blob → **no template migration**. The new `TaskInstance` fields need `drizzle-schema.ts` + `postgres.ts` columns (`legId`, `airportIcao`, `airportRole` text; `reflag` jsonb) and `cancelled` in the status column (text — no enum migration). The live demo uses the **in-memory** store, so Postgres parity is for completeness, not the demo runtime.

## 10. Readiness / pilot-visibility

- `deriveSchedulingReadiness` must **exclude `cancelled`** from the completion denominator (as `n_a` is), and treat a reopened (now `open`) task as incomplete — which it already is once status flips to `open`.
- Pilot-visibility keys by `taskDefId`; a per-airport task shares one `taskDefId` across many instances — verified this already behaves correctly (visibility is a set membership test, not a 1:1). No change; add one regression test.

## 11. Known limitations (documented, not fixed)

- **Timezones/DST** — `computeDueAtUtc` uses a fixed −240 office offset throughout the engine. Per-leg due dates inherit this. DST-correct, per-airport-local timezones are a separate cross-cutting change, out of scope for this phase.
- **Passenger identity** — the store models pax as a **count** per leg, not named passengers. `passengerChange` = a count increase; it will **not** fire on a same-count passenger *swap* (which changes passport/visa needs) or on a destination-country change. Acceptable for the demo; called out because the re-flag feature is partly sold on passport/visa currency.

## 12. Test plan

Correctness-critical, per the module's test-first convention:

- **matchAirport / instantiate:** prefix-with-exclusion (K except KLUK), exact (KBOS arrival, KLGA both endpoints), departure-only (KLUK), per-leg due date anchored to the right endpoint time, **out-and-back same-airport distinct ids**, repeated tech-stop distinct ids.
- **diffTrip:** each change type; leg reorder does **not** register as reschedule/remove.
- **reconcile:** re-flag on pax-add (completed pax task → open + `reflag` + audit); reschedule re-flags **and** re-dues that leg's per-airport task; aircraft change re-flags aircraft-sensitive tasks; a **non-triggering** change leaves a completed task done (add a passenger → catering stays done); new leg spawns per-airport tasks; removed leg → `cancelled` (never deleted). **Survivor-preservation regression:** an unchanged completed+acked survivor keeps `status`/`ackState`/`completedBy`/`auditTrail` byte-identical after reconcile.
- **applyTaskAction:** `reopen` resets ack + clears completion + sets `reflag`; `complete` clears `reflag`.
- **service.updateTrip:** reopened handoff task re-fires its event; reopened ack task can re-escalate (stale escalation event cleared).
- **readiness:** `cancelled` excluded from completion %.
- Extend the two count-fragile seed tests only; other existing tests stay green via optional fields.

## 13. Build order

1. Types + validator + `matchAirport` + per-airport instantiation (with per-endpoint due anchor) + tests.
2. `diffTrip` + `reconcile` (pure) + `applyTaskAction('reopen')` + tests (incl. survivor-preservation).
3. `service.updateTrip` + handoff re-fire + escalation clear (`removeEvent`) + tests.
4. UI: targeted inline actions + per-airport/re-flag render path.
5. Seed the deferred tasks + demo routes; extend the two count-fragile tests.
6. No-code editor fields (`appliesTo` + `reTriggerOn`).

Re-flag (steps 1–4) lands before the seed/editor surface, so the headline behavior is demonstrable early.
