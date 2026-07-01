# Slice 2 — Preflight Weave — Implementation Plan

> Execute subagent-driven. Bridge logic is TDD'd (Vitest); UI is demonstrated in the browser. Spec: `docs/scheduling/slice-2-preflight-weave-design.md`.

**Goal:** "Release to preflight" on a scheduling trip projects it into tech-log so the crew's existing per-leg FRAT/airport/fuel runs on the same trip; the scheduling trip shows a preflight-readiness summary + an "Open preflight" deep-link.

## Global Constraints
- Prototype/dev-handoff; no DB. Deterministic (injected/explicit now + ids).
- One-way projection scheduling → tech-log. The coupling to tech-log's state shape lives ONLY in `src/components/tech-log/bridge.ts`.
- Exact-tail-match for aircraft; auto-create a placeholder Aircraft only if the tail is absent, and flag it (`createdAircraft`).
- Idempotent by `tripNumber` (re-release = no duplicate).
- Deep-link via react-router client navigation (NOT hard reload).
- Tests: Vitest co-located; `npm test -- src/scheduling src/components/tech-log/bridge`.

---

## Task 1: tech-log bridge module (pure projection + read summary + localStorage wrappers)

**Files:** Create `src/components/tech-log/bridge.ts` + `bridge.test.ts`. Modify `src/components/tech-log/TechLogContext.tsx` to `export` its `STORAGE_KEY`, `VERSION_KEY`, `DATA_VERSION` constants (single source of truth for the bridge).

**Interfaces produced:**
```ts
export interface PreflightTripInput {
  tripNumber: string; name: string; tail: string; aircraftType: string;
  createdByOid: string; nowUtc: string;
  legs: { sequence: number; departureIcao: string; arrivalIcao: string; departureTimeUtc: string; arrivalTimeUtc?: string }[];
}
export interface PreflightLegStatus { sequence: number; departureIcao: string; arrivalIcao: string; fratStatus: 'NOT_STARTED'|'IN_PROGRESS'|'COMPLETED'; fratScore?: number; airportReviewed: boolean; fuelSubmitted: boolean; }
export interface PreflightSummary { techLogTripId: string; overall: 'READY'|'NOT_READY'; legs: PreflightLegStatus[]; }

// PURE — testable without localStorage:
export function projectTripIntoTechLogState(state: TechLogState, input: PreflightTripInput, newId: (p: string) => string): { state: TechLogState; techLogTripId: string; createdAircraft: boolean };
export function summarizePreflight(state: TechLogState, tripNumber: string): PreflightSummary | null;

// THIN localStorage wrappers (the only untested seam):
export function releaseSchedulingTripToPreflight(input: PreflightTripInput): { techLogTripId: string; createdAircraft: boolean };
export function readPreflightSummary(tripNumber: string): PreflightSummary | null;
```

**`projectTripIntoTechLogState` rules:**
- If `state.trips` already has a trip with `tripNumber` → return `{ state (unchanged), techLogTripId: existing.id, createdAircraft: false }` (idempotent).
- Aircraft: find `state.aircraft` by `tailNumber === input.tail`. If missing, append `{ id: newId('ac'), tailNumber: input.tail, type: (['G650ER','G500','G800'].includes(input.aircraftType) ? input.aircraftType : 'G650ER'), serialNumber: 'UNSPEC-'+input.tail, status: 'ACTIVE', isProvisional: false, homeBase: input.legs[0]?.departureIcao ?? 'KLUK', airframeTotalHours: 0, airframeTotalCycles: 0 }` → `createdAircraft: true`.
- Build `Trip`: `{ id: newId('trip'), tripNumber, aircraftId, name, status: 'OPEN', flightLogIds: [], legs: mapped, createdByOid, createdAtUtc: nowUtc }`.
- Map each input leg → `TripLeg`: `{ id: newId('leg'), sequence, departureIcao, arrivalIcao, departureTimeUtc, arrivalTimeUtc: leg.arrivalTimeUtc ?? leg.departureTimeUtc, fratStatus: 'NOT_STARTED', airportReviewed: false }` (no fuelRequestId).
- Append the trip (+ optional `AuditEntry` `TRIP_CREATED`-style if trivial; else skip audit to stay minimal). Return next state + new id.

**`summarizePreflight`:** find trip by `tripNumber`; if none return null. Per leg → `PreflightLegStatus` (`fuelSubmitted = !!leg.fuelRequestId`). `overall = 'READY'` iff every leg `fratStatus === 'COMPLETED' && airportReviewed` else `'NOT_READY'`. (Fuel is home-base-conditional; the FULL readiness incl. serviceability lives inside tech-log — this summary is a lightweight coordination view.)

**Tests (TDD, pure functions only):** project creates trip+legs (fratStatus NOT_STARTED, airportReviewed false); idempotent by tripNumber (second call no dup); aircraft matched when present (no createdAircraft), placeholder created when absent (createdAircraft true, valid type fallback); summarizePreflight returns per-leg status + overall NOT_READY initially, READY when all legs marked complete+reviewed; null for unknown tripNumber. Use `getDefaultState()` from `./mockData/scenarios` for fixtures.

Commit: `feat(scheduling): add tech-log preflight bridge (project scheduling trip + read summary)`.

---

## Task 2: scheduling-side "Release to preflight" + summary + deep-link (TripsPanel)

**Files:** Modify `src/components/scheduling-workspace/TripsPanel.tsx`; possibly `SchedulingWorkspaceContext.tsx` (a `newId` helper if needed).

- Track release state per trip. Simplest: keep a component-local `Map<tripNumber, { techLogTripId, releasedAt }>` derived by calling `readPreflightSummary(trip.tripNumber)` (non-null ⇒ already released) — no scheduling-store schema change needed (the tech-log side is the source of truth for "released").
- In the trip detail: 
  - If `readPreflightSummary(trip.tripNumber)` is null → **"Release to preflight"** button → `releaseSchedulingTripToPreflight({ tripNumber, name: trip.tripNumber, tail, aircraftType, createdByOid: userRole, nowUtc: nowUtc(), legs: trip.legs.map(...) })`; if `createdAircraft`, `toast.warning('No fleet aircraft for <tail> — created a placeholder for the demo')`; else `toast.success('Released to preflight')`; `bump()`.
  - If released → a **preflight-readiness summary** card (per-leg FRAT/airport/fuel chips using the `.status-*` tokens + overall READY/NOT_READY) from `readPreflightSummary`, and an **"Open preflight ↗"** button → `navigate('/tech-log/trips/' + techLogTripId)` (react-router `useNavigate`). 
  - Composite readiness header: show the existing coordination readiness (from `service.tripReadiness`) AND the preflight overall side-by-side ("Coordination: … · Preflight: …").
- Reuse `.status-*` tokens (status-success/-warning/-error) and lucide icons; match existing panel styling.

Verify (browser): create a domestic trip → Release to preflight (toast) → summary card + Open preflight appears → Open preflight deep-links into tech-log's Trip Workspace showing the trip+legs → complete a FRAT in tech-log → back in scheduling, summary reflects it.

Commit: `feat(scheduling-ui): Release to preflight + preflight summary + deep-link (Trips panel)`.

---

## Task 3: verify + polish
- `npm test -- src/scheduling src/components/tech-log/bridge` green; `npm run build` clean; `npx tsc --noEmit | grep -E "scheduling|tech-log/bridge"` clean.
- Browser walkthrough of the full weave (scheduling → release → preflight in tech-log → back).
