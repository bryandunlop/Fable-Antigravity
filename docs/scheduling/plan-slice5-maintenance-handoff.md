# Slice 5 — Maintenance Handoff (close the loop) — Design + Plan

**Context:** Slice 2's bridge already projects a scheduling trip into tech-log, where it flows through tech-log's EXISTING lifecycle: preflight → briefing/acceptance → in-service → postflight → squawks gathered into the maintenance work queue (`PostflightPanel` → `gatheredDefectIds` → `buildWorkQueue`). So the maintenance handoff mechanism already exists. Slice 5 (narrowed — trip-model reconciliation was absorbed by Slice 2) just **closes the visibility loop**: surface tech-log's downstream/maintenance status back on the scheduling trip.

**Goal:** From a released scheduling trip, show a "Downstream / maintenance" summary read from tech-log — so scheduling sees a trip flow all the way to maintenance (the user's "tie into the maintenance handoff").

## Task 1 (single task): bridge lifecycle summary + scheduling display
**Files:** `src/components/tech-log/bridge.ts` (+ `bridge.test.ts`); `src/components/scheduling-workspace/TripsPanel.tsx`.

- **`summarizeTripLifecycle(state: TechLogState, tripNumber: string): TripLifecycleSummary | null`** (PURE, TDD):
  - find trip by tripNumber; null if absent. aircraft = state.aircraft by trip.aircraftId.
  - `tripStatus`: trip.status ('OPEN'|'CLOSED'); `flown`: `trip.flightLogIds.length > 0`.
  - `openSquawks`: count `state.defects` where `aircraftId === aircraft.id && status === 'OPEN'`.
  - `groundingSquawks`: of those, count where `airworthinessAffecting !== false` (null or true ⇒ grounding).
  - `postflightDone`: any `state.postflights` with `aircraftId === aircraft.id && performedAtUtc >= trip.createdAtUtc` (proxy: aircraft returned to maintenance after this trip started).
  - return `{ aircraftTail, tripStatus, flown, openSquawks, groundingSquawks, postflightDone }`.
- **`readTripLifecycleSummary(tripNumber)`**: thin localStorage wrapper (same loadState as the other wrappers).
- **TripsPanel:** when a trip is released (preflight summary non-null), also render a compact **"Downstream / maintenance"** line from `readTripLifecycleSummary(trip.tripNumber)` on `tick`: e.g. `Trip: {tripStatus} · Flown: {yes/no} · {openSquawks} open squawks ({groundingSquawks} grounding) · Postflight: {done/pending}`, using `.status-*` tokens (status-error if grounding squawks, status-warning if open squawks, status-success if none + postflight done). Muted "no maintenance activity yet" when all zero.

**Tests (TDD, pure fn):** summarize returns null for unknown trip; counts open squawks for the aircraft (excludes CLOSED/other aircraft); groundingSquawks counts null + true airworthinessAffecting; postflightDone true only for a postflight at/after trip.createdAtUtc. Build fixtures from getDefaultState() + inject a trip/defects/postflight.

**Verify:** `npm test -- src/components/tech-log/bridge src/scheduling` green; build + tsc clean.
Commit: `feat(scheduling): Slice 5 — surface tech-log downstream/maintenance status on the scheduling trip`.
