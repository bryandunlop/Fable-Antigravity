# Pilot Workspace ("Flight Hub") Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a new pilot-role front door at `/pilot-workspace` that unifies the scheduling brief, the tech-log preflight (FRAT/airport/fuel), and the maintenance handoff into one trip-centric hub — fresh pilot UI over the *same* scheduling + tech-log state and rules.

**Architecture:** A new `src/components/pilot-workspace/` shell (master → detail: *My Flights* list → *Flight Hub* for a selected trip), mounted inside BOTH the existing `SchedulingWorkspaceProvider` (canonical trips, task instances, events, scheduling readiness) and the existing `TechLogProvider` (preflight state + reducer + derivations). Pilot preflight writes dispatch the **same** `EDIT_TRIP`/`ADD_AUDIT` actions the tech-log uses; the FRAT form, readiness/serviceability/custody derivations, and the e-signature acceptance ceremony are **reused, not reimplemented**. No new store, no forked regulatory logic.

**Tech Stack:** React + TypeScript, Vite, Tailwind, react-router, Vitest (Node env — pure-function tests only; components are browser-verified via the preview tools).

## Global Constraints

- **One canonical Trip, not a sixth island.** The pilot workspace reads the existing scheduling store + tech-log state; it MUST NOT create a parallel trip store or a second copy of preflight state.
- **Shared rules, fresh UI only.** FRAT scoring (`StandaloneFRATForm`), readiness (`deriveTripReadiness`, `deriveSchedulingReadiness`), serviceability (`deriveServiceability`), custody (`deriveCustody`), and the briefing e-signature ceremony are reused. `pilot-workspace/` owns layout/interaction only.
- **Append-only / signatures untouched.** Preflight leg fields (`fratStatus`/`fratScore`/`airportReviewed`/`fuelRequestId`) are mutable orchestration state and are written via the existing `EDIT_TRIP` + `ADD_AUDIT` actions. The signature-bearing **aircraft acceptance** (`FlightBriefing` acknowledge) is NOT re-skinned — it deep-links to the existing tech-log acceptance ceremony (safety-driven exception to "embed inline"; see Task 6).
- **Prototype / dev role-switch.** No real Entra/crew identity. `userRole` state (`'pilot' | 'chief-pilot' | 'admin'`) gates the route. "My flights" = all trips in the preflight window (the dev pilot is the crew).
- **Tests are Node/Vitest, no jsdom.** Only pure functions are unit-tested (`src/**/*.test.ts`). Panels/shell are verified in the browser preview and by `tsc`.
- **Exact role strings:** `'pilot'`, `'chief-pilot'`, `'admin'` (kebab-case, case-sensitive).
- **Deterministic time:** derivations take an explicit `asOfUtc`/`nowUtc` (`new Date().toISOString()` at the call site) — never call `Date.now()` inside a pure function.

---

## File Structure

**Create:**
- `src/components/pilot-workspace/selectors.ts` — PURE: `selectPilotFlights`, `composePilotReadiness` (unit-tested).
- `src/components/pilot-workspace/selectors.test.ts` — Vitest.
- `src/components/tech-log/preflightActions.ts` — PURE-ish shared leg-write helpers (single-sources the FRAT/airport/fuel dispatch that today lives inline in `LegDetail`).
- `src/components/tech-log/preflightActions.test.ts` — Vitest (fuel lock guard).
- `src/components/pilot-workspace/PilotWorkspace.tsx` — shell (My Flights ↔ Flight Hub).
- `src/components/pilot-workspace/MyFlightsPanel.tsx` — trip cards + composite readiness.
- `src/components/pilot-workspace/FlightHub.tsx` — single-pane trip view (readiness bar + 4 panels).
- `src/components/pilot-workspace/ReadinessBar.tsx` — renders composite readiness.
- `src/components/pilot-workspace/panels/TripBriefPanel.tsx` — scheduling handoff + ACK.
- `src/components/pilot-workspace/panels/AircraftAcceptancePanel.tsx` — serviceability/custody/MEL + accept (deep-link).
- `src/components/pilot-workspace/panels/PreflightLegsPanel.tsx` — per-leg FRAT/airport/fuel.
- `src/components/pilot-workspace/panels/MessagesPanel.tsx` — pilot-targeted events.

**Modify:**
- `src/components/tech-log/pages/LegDetail.tsx` — refactor its inline `completeFrat`/`markAirportReviewed`/`submitFuel` to call `preflightActions.ts` (so there is one implementation).
- `src/App.tsx` — add the `/pilot-workspace` route (wrapped in both providers) + make `'pilot'` land there.
- `src/components/Navigation.tsx` — add the "Pilot Workspace" nav item.

---

## Task 1: Pure selectors — `selectPilotFlights` + `composePilotReadiness`

**Files:**
- Create: `src/components/pilot-workspace/selectors.ts`
- Test: `src/components/pilot-workspace/selectors.test.ts`

**Interfaces:**
- Consumes: `TripRecord` from `../../scheduling/store/types`; `Readiness` from `../../scheduling/engine/readiness`; `TripReadinessResult` from `../tech-log/engine/readiness`.
- Produces:
  - `selectPilotFlights(trips: TripRecord[], nowUtc: string): TripRecord[]` — trips in the preflight window, soonest-first.
  - `composePilotReadiness(scheduling: Readiness, preflight: TripReadinessResult | null): PilotReadiness` where `PilotReadiness = { state: 'READY'|'NOT_READY'|'BLOCKED'; blocker?: string; scheduling: Readiness; preflight: TripReadinessResult | null }`.

- [ ] **Step 1: Write the failing test**

```ts
// src/components/pilot-workspace/selectors.test.ts
import { describe, it, expect } from 'vitest';
import { selectPilotFlights, composePilotReadiness } from './selectors';
import type { TripRecord } from '../../scheduling/store/types';
import type { Readiness } from '../../scheduling/engine/readiness';
import type { TripReadinessResult } from '../tech-log/engine/readiness';

const NOW = '2026-07-01T12:00:00.000Z';

function trip(over: Partial<TripRecord>): TripRecord {
  return {
    id: `trip-${over.tripNumber ?? 'X'}`,
    tripNumber: over.tripNumber ?? 'X',
    sourceSystem: 'manual',
    sourceTripRef: null,
    tail: 'N5PG',
    aircraftType: 'G650ER',
    tripType: 'domestic',
    priority: 'standard',
    status: over.status ?? 'confirmed',
    startDate: over.startDate ?? '2026-07-01',
    endDate: over.endDate ?? '2026-07-02',
    legs: over.legs ?? [
      { id: 'l1', sequence: 1, departureIcao: 'KLUK', arrivalIcao: 'KTEB',
        departureTimeUtc: '2026-07-01T18:00:00.000Z', paxCount: 3 },
    ],
    createdBy: 'seed', createdAtUtc: NOW,
    ...over,
  } as TripRecord;
}

describe('selectPilotFlights', () => {
  it('keeps planning/confirmed/in_progress trips and drops completed/cancelled', () => {
    const trips = [
      trip({ tripNumber: 'A', status: 'confirmed' }),
      trip({ tripNumber: 'B', status: 'completed' }),
      trip({ tripNumber: 'C', status: 'cancelled' }),
      trip({ tripNumber: 'D', status: 'in_progress' }),
    ];
    const got = selectPilotFlights(trips, NOW).map((t) => t.tripNumber);
    expect(got).toEqual(['A', 'D']);
  });

  it('sorts by earliest leg departure, soonest first', () => {
    const late = trip({ tripNumber: 'LATE', legs: [
      { id: 'l', sequence: 1, departureIcao: 'KLUK', arrivalIcao: 'KTEB',
        departureTimeUtc: '2026-07-03T10:00:00.000Z', paxCount: 1 }] });
    const soon = trip({ tripNumber: 'SOON', legs: [
      { id: 'l', sequence: 1, departureIcao: 'KLUK', arrivalIcao: 'KTEB',
        departureTimeUtc: '2026-07-01T15:00:00.000Z', paxCount: 1 }] });
    const got = selectPilotFlights([late, soon], NOW).map((t) => t.tripNumber);
    expect(got).toEqual(['SOON', 'LATE']);
  });
});

describe('composePilotReadiness', () => {
  const sched = (state: Readiness['state']): Readiness => ({ state, completion: state === 'READY' ? 1 : 0.5 });
  const pf = (state: TripReadinessResult['state'], blocker?: string): TripReadinessResult =>
    ({ state, blocker, computedAtUtc: NOW });

  it('is NOT_READY when the trip has not been released to preflight', () => {
    expect(composePilotReadiness(sched('READY'), null).state).toBe('NOT_READY');
    expect(composePilotReadiness(sched('READY'), null).blocker).toMatch(/not released/i);
  });

  it('is BLOCKED when the aircraft is unserviceable (preflight RED)', () => {
    const r = composePilotReadiness(sched('READY'), pf('RED', 'N5PG grounded: open airworthiness defect'));
    expect(r.state).toBe('BLOCKED');
    expect(r.blocker).toMatch(/grounded/i);
  });

  it('is BLOCKED when a coordination task is blocked', () => {
    expect(composePilotReadiness({ state: 'BLOCKED', blocker: 'permit', completion: 0.5 }, pf('READY')).state).toBe('BLOCKED');
  });

  it('is NOT_READY when preflight is incomplete', () => {
    expect(composePilotReadiness(sched('READY'), pf('NOT_READY', 'Leg 1 FRAT not started')).state).toBe('NOT_READY');
  });

  it('is READY only when scheduling READY and preflight READY', () => {
    expect(composePilotReadiness(sched('READY'), pf('READY')).state).toBe('READY');
    expect(composePilotReadiness(sched('NOT_READY'), pf('READY')).state).toBe('NOT_READY');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/pilot-workspace/selectors.test.ts`
Expected: FAIL — `Cannot find module './selectors'`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/components/pilot-workspace/selectors.ts
import type { TripRecord } from '../../scheduling/store/types';
import type { Readiness } from '../../scheduling/engine/readiness';
import type { TripReadinessResult } from '../tech-log/engine/readiness';

export interface PilotReadiness {
  state: 'READY' | 'NOT_READY' | 'BLOCKED';
  blocker?: string;
  scheduling: Readiness;
  preflight: TripReadinessResult | null;
}

const ACTIVE_STATUSES: ReadonlySet<TripRecord['status']> = new Set(['planning', 'confirmed', 'in_progress']);

function firstDeparture(t: TripRecord): number {
  const times = (t.legs ?? []).map((l) => new Date(l.departureTimeUtc).getTime()).filter(Number.isFinite);
  return times.length ? Math.min(...times) : Number.MAX_SAFE_INTEGER;
}

/** Trips a pilot should see in their hub: active status, soonest departure first. */
export function selectPilotFlights(trips: TripRecord[], _nowUtc: string): TripRecord[] {
  return trips
    .filter((t) => ACTIVE_STATUSES.has(t.status))
    .sort((a, b) => firstDeparture(a) - firstDeparture(b));
}

/** One pilot verdict from the scheduling checklist + the richer tech-log preflight readiness. */
export function composePilotReadiness(
  scheduling: Readiness,
  preflight: TripReadinessResult | null,
): PilotReadiness {
  const base = { scheduling, preflight };
  if (!preflight) return { state: 'NOT_READY', blocker: 'Not released to preflight', ...base };
  if (preflight.state === 'RED') return { state: 'BLOCKED', blocker: preflight.blocker ?? 'Aircraft unserviceable', ...base };
  if (scheduling.state === 'BLOCKED') return { state: 'BLOCKED', blocker: scheduling.blocker ?? 'Coordination blocked', ...base };
  if (preflight.state === 'NOT_READY') return { state: 'NOT_READY', blocker: preflight.blocker ?? 'Preflight incomplete', ...base };
  if (scheduling.state === 'NOT_READY') return { state: 'NOT_READY', blocker: scheduling.blocker ?? 'Coordination incomplete', ...base };
  return { state: 'READY', ...base };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/pilot-workspace/selectors.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/pilot-workspace/selectors.ts src/components/pilot-workspace/selectors.test.ts
git commit -m "feat(pilot-workspace): pure my-flights + composite-readiness selectors"
```

---

## Task 2: Shared preflight-write helpers (`preflightActions.ts`) + refactor `LegDetail`

Single-sources the leg-write dispatch so the new pilot panel and the existing `LegDetail` share one implementation (the anti-island rule).

**Files:**
- Create: `src/components/tech-log/preflightActions.ts`
- Test: `src/components/tech-log/preflightActions.test.ts`
- Modify: `src/components/tech-log/pages/LegDetail.tsx`

**Interfaces:**
- Consumes: `Trip`, `TripLeg`, `TechLogAction` from `./types`; a `dispatch: (a: TechLogAction) => void` and a `newId: (prefix: string) => string` injected by the caller.
- Produces:
  - `completeFratOnLeg(args): void`
  - `markAirportReviewedOnLeg(args): void`
  - `submitFuelOnLeg(args): { ok: true } | { ok: false; error: string }`
  where `args` carries `{ dispatch, newId, trip, leg, actorOid }` plus action-specific fields. Fuel enforces the 4-hour lock and positive quantity.

- [ ] **Step 1: Write the failing test**

```ts
// src/components/tech-log/preflightActions.test.ts
import { describe, it, expect } from 'vitest';
import { completeFratOnLeg, markAirportReviewedOnLeg, submitFuelOnLeg } from './preflightActions';
import type { Trip, TripLeg, TechLogAction } from './types';

const leg: TripLeg = {
  id: 'leg-1', sequence: 1, departureIcao: 'KLUK', arrivalIcao: 'KTEB',
  departureTimeUtc: '2026-07-10T18:00:00.000Z', fratStatus: 'NOT_STARTED', airportReviewed: false,
};
const trip: Trip = {
  id: 'trip-1', tripNumber: 'GFO-100', aircraftId: 'ac-1', name: 'Demo', status: 'OPEN',
  legs: [leg], flightLogIds: [], createdByOid: 'oid-sys', createdAtUtc: '2026-07-01T00:00:00.000Z',
} as Trip;

function collect() {
  const actions: TechLogAction[] = [];
  return { dispatch: (a: TechLogAction) => actions.push(a), actions };
}

describe('completeFratOnLeg', () => {
  it('dispatches EDIT_TRIP with the leg FRAT completed + an audit entry', () => {
    const { dispatch, actions } = collect();
    completeFratOnLeg({ dispatch, newId: (p) => `${p}-1`, trip, leg, actorOid: 'oid-pic', totalScore: 12 });
    const edit = actions.find((a) => a.type === 'EDIT_TRIP') as Extract<TechLogAction, { type: 'EDIT_TRIP' }>;
    const patched = edit.payload.legs!.find((l) => l.id === 'leg-1')!;
    expect(patched.fratStatus).toBe('COMPLETED');
    expect(patched.fratScore).toBe(12);
    expect(actions.some((a) => a.type === 'ADD_AUDIT')).toBe(true);
  });
});

describe('markAirportReviewedOnLeg', () => {
  it('sets airportReviewed true via EDIT_TRIP', () => {
    const { dispatch, actions } = collect();
    markAirportReviewedOnLeg({ dispatch, newId: (p) => `${p}-1`, trip, leg, actorOid: 'oid-pic' });
    const edit = actions.find((a) => a.type === 'EDIT_TRIP') as Extract<TechLogAction, { type: 'EDIT_TRIP' }>;
    expect(edit.payload.legs!.find((l) => l.id === 'leg-1')!.airportReviewed).toBe(true);
  });
});

describe('submitFuelOnLeg', () => {
  it('rejects when less than 4 hours to departure', () => {
    const near: TripLeg = { ...leg, departureTimeUtc: '2026-07-10T20:00:00.000Z' };
    const { dispatch } = collect();
    const r = submitFuelOnLeg({ dispatch, newId: (p) => `${p}-1`, trip: { ...trip, legs: [near] }, leg: near, actorOid: 'oid-pic', lbs: 5000, nowMs: Date.parse('2026-07-10T17:00:00.000Z') });
    expect(r).toEqual({ ok: false, error: expect.stringMatching(/4 hours/i) });
  });

  it('rejects a non-positive quantity', () => {
    const { dispatch } = collect();
    const r = submitFuelOnLeg({ dispatch, newId: (p) => `${p}-1`, trip, leg, actorOid: 'oid-pic', lbs: 0, nowMs: Date.parse('2026-07-09T00:00:00.000Z') });
    expect(r.ok).toBe(false);
  });

  it('accepts a valid request and stamps a fuelRequestId', () => {
    const { dispatch, actions } = collect();
    const r = submitFuelOnLeg({ dispatch, newId: (p) => `${p}-1`, trip, leg, actorOid: 'oid-pic', lbs: 5000, nowMs: Date.parse('2026-07-09T00:00:00.000Z') });
    expect(r.ok).toBe(true);
    const edit = actions.find((a) => a.type === 'EDIT_TRIP') as Extract<TechLogAction, { type: 'EDIT_TRIP' }>;
    expect(edit.payload.legs!.find((l) => l.id === 'leg-1')!.fuelRequestId).toBe('fr-1');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/tech-log/preflightActions.test.ts`
Expected: FAIL — `Cannot find module './preflightActions'`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/components/tech-log/preflightActions.ts
import type { Trip, TripLeg, TechLogAction } from './types';

interface Base {
  dispatch: (a: TechLogAction) => void;
  newId: (prefix: string) => string;
  trip: Trip;
  leg: TripLeg;
  actorOid: string;
}

function patchLeg(
  { dispatch, newId, trip, leg, actorOid }: Base,
  patch: Partial<TripLeg>,
  action: string,
  summary: string,
): void {
  const updated: Trip = { ...trip, legs: (trip.legs ?? []).map((l) => (l.id === leg.id ? { ...l, ...patch } : l)) };
  dispatch({ type: 'EDIT_TRIP', payload: updated });
  dispatch({ type: 'ADD_AUDIT', payload: {
    id: newId('aud'), actorOid, action, entityType: 'TripLeg', entityId: leg.id,
    atUtc: new Date().toISOString(), summary,
  } });
}

export function completeFratOnLeg(args: Base & { totalScore?: number }): void {
  patchLeg(args, { fratStatus: 'COMPLETED', fratScore: args.totalScore }, 'LEG_FRAT_COMPLETED',
    `${args.trip.tripNumber} leg ${args.leg.sequence} FRAT score ${args.totalScore ?? '—'}`);
}

export function markAirportReviewedOnLeg(args: Base): void {
  patchLeg(args, { airportReviewed: true }, 'LEG_AIRPORT_REVIEWED',
    `${args.trip.tripNumber} leg ${args.leg.sequence} (${args.leg.departureIcao}→${args.leg.arrivalIcao}) airport reviewed`);
}

export function submitFuelOnLeg(args: Base & { lbs: number; nowMs: number }): { ok: true } | { ok: false; error: string } {
  const hoursUntil = (new Date(args.leg.departureTimeUtc).getTime() - args.nowMs) / 3_600_000;
  if (hoursUntil <= 4) return { ok: false, error: 'Locked — less than 4 hours to departure' };
  if (!Number.isFinite(args.lbs) || args.lbs <= 0) return { ok: false, error: 'Enter a valid fuel quantity' };
  const id = args.newId('fr');
  patchLeg(args, { fuelRequestId: id }, 'LEG_FUEL_SUBMITTED',
    `${args.trip.tripNumber} leg ${args.leg.sequence} fuel ${args.lbs} lb submitted to ${args.leg.departureIcao} fuel farm`);
  return { ok: true };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/tech-log/preflightActions.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Refactor `LegDetail.tsx` to use the shared helpers**

In `src/components/tech-log/pages/LegDetail.tsx`, replace the inline `completeFrat` / `markAirportReviewed` / `submitFuel` bodies with calls to the new helpers, keeping the existing `newId`, `user`, `toast`, and `fuelLbs` wiring. Example replacements (keep the surrounding component intact):

```tsx
import { completeFratOnLeg, markAirportReviewedOnLeg, submitFuelOnLeg } from '../preflightActions';

const completeFrat = (data: { totalScore?: number }) => {
  completeFratOnLeg({ dispatch, newId, trip, leg, actorOid: user.oid, totalScore: data.totalScore });
  setFratOpen(false);
};

const markAirportReviewed = () =>
  markAirportReviewedOnLeg({ dispatch, newId, trip, leg, actorOid: user.oid });

const submitFuel = () => {
  const res = submitFuelOnLeg({ dispatch, newId, trip, leg, actorOid: user.oid, lbs: Number(fuelLbs), nowMs: Date.now() });
  if (!res.ok) { toast.error(res.error); return; }
  toast.success(`Fuel submitted to ${leg.departureIcao} fuel farm`);
};
```

- [ ] **Step 6: Verify tech-log LegDetail still behaves (tsc + browser)**

Run: `npx tsc --noEmit -p tsconfig.json` → Expected: no new errors.
Browser (preview): open `/tech-log`, pick a trip → a leg → complete FRAT, mark airport reviewed, submit fuel → confirm the chips/readiness update exactly as before.

- [ ] **Step 7: Commit**

```bash
git add src/components/tech-log/preflightActions.ts src/components/tech-log/preflightActions.test.ts src/components/tech-log/pages/LegDetail.tsx
git commit -m "refactor(tech-log): extract shared preflight leg-write helpers; LegDetail uses them"
```

---

## Task 3: Shell + My Flights list + route/nav/landing

Gets the workspace reachable and showing the pilot's flights with composite readiness.

**Files:**
- Create: `src/components/pilot-workspace/PilotWorkspace.tsx`, `src/components/pilot-workspace/MyFlightsPanel.tsx`, `src/components/pilot-workspace/ReadinessBar.tsx`
- Modify: `src/App.tsx`, `src/components/Navigation.tsx`

**Interfaces:**
- Consumes: `useSchedulingWorkspace()` → `{ service, store, tick, nowUtc, ready }`; `useTechLog()` → `{ state }`; `selectPilotFlights`, `composePilotReadiness` (Task 1); `deriveTripReadiness` (`../tech-log/engine/readiness`); `deriveSchedulingReadiness` (`../../scheduling/engine/readiness`).
- Produces: default-exported `PilotWorkspace({ userRole, additionalRoles }: { userRole: string; additionalRoles?: string[] })`; `ReadinessBar({ readiness }: { readiness: PilotReadiness })`.

- [ ] **Step 1: ReadinessBar (presentational)**

```tsx
// src/components/pilot-workspace/ReadinessBar.tsx
import React from 'react';
import type { PilotReadiness } from './selectors';

const TONE: Record<PilotReadiness['state'], string> = {
  READY: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  NOT_READY: 'bg-amber-100 text-amber-800 border-amber-300',
  BLOCKED: 'bg-red-100 text-red-800 border-red-300',
};

export default function ReadinessBar({ readiness }: { readiness: PilotReadiness }) {
  return (
    <div className={`flex items-center justify-between rounded-lg border px-4 py-2 ${TONE[readiness.state]}`}>
      <span className="font-semibold">{readiness.state.replace('_', ' ')}</span>
      {readiness.blocker && <span className="text-sm">{readiness.blocker}</span>}
    </div>
  );
}
```

- [ ] **Step 2: MyFlightsPanel — list trips with composite readiness**

```tsx
// src/components/pilot-workspace/MyFlightsPanel.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { useSchedulingWorkspace } from '../scheduling-workspace/SchedulingWorkspaceContext';
import { useTechLog } from '../tech-log/TechLogContext';
import { deriveTripReadiness } from '../tech-log/engine/readiness';
import { deriveSchedulingReadiness } from '../../scheduling/engine/readiness';
import { selectPilotFlights, composePilotReadiness, type PilotReadiness } from './selectors';
import type { TripRecord } from '../../scheduling/store/types';

export default function MyFlightsPanel({ onOpen }: { onOpen: (trip: TripRecord) => void }) {
  const { store, tick, nowUtc } = useSchedulingWorkspace();
  const { state } = useTechLog();
  const [trips, setTrips] = useState<TripRecord[]>([]);
  const [readiness, setReadiness] = useState<Record<string, PilotReadiness>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const all = await store.listTrips();
      const mine = selectPilotFlights(all, nowUtc());
      if (cancelled) return;
      setTrips(mine);
      const now = nowUtc();
      const entries = await Promise.all(mine.map(async (t) => {
        const sched = deriveSchedulingReadiness(await store.listInstancesForTrip(t.id));
        const tlTrip = state.trips.find((x) => x.tripNumber === t.tripNumber) ?? null;
        const pf = tlTrip ? deriveTripReadiness(tlTrip, state, now) : null;
        return [t.id, composePilotReadiness(sched, pf)] as const;
      }));
      if (!cancelled) setReadiness(Object.fromEntries(entries));
    })();
    return () => { cancelled = true; };
  }, [store, tick, state, nowUtc]);

  const empty = useMemo(() => trips.length === 0, [trips]);

  return (
    <div className="space-y-3">
      {empty && <p className="text-muted-foreground text-sm">No flights in your window.</p>}
      {trips.map((t) => {
        const r = readiness[t.id];
        const dep = t.legs?.[0];
        return (
          <button key={t.id} onClick={() => onOpen(t)}
            className="w-full text-left rounded-lg border p-4 hover:bg-accent transition-colors">
            <div className="flex items-center justify-between">
              <span className="font-semibold">{t.tripNumber} · {t.tail}</span>
              {r && <span className="text-xs uppercase tracking-wide">{r.state.replace('_', ' ')}</span>}
            </div>
            <div className="text-sm text-muted-foreground">
              {dep ? `${dep.departureIcao} → ${t.legs[t.legs.length - 1].arrivalIcao} · ${dep.departureTimeUtc.slice(0, 16).replace('T', ' ')}Z` : 'No legs'}
            </div>
            {r?.blocker && <div className="text-xs mt-1">{r.blocker}</div>}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 3: PilotWorkspace shell (master → detail)**

```tsx
// src/components/pilot-workspace/PilotWorkspace.tsx
import React, { useState } from 'react';
import { AltimeterSpinner } from '../ui/LoadingSpinners';
import { useSchedulingWorkspace } from '../scheduling-workspace/SchedulingWorkspaceContext';
import MyFlightsPanel from './MyFlightsPanel';
import FlightHub from './FlightHub';
import type { TripRecord } from '../../scheduling/store/types';

export default function PilotWorkspace({ userRole }: { userRole: string; additionalRoles?: string[] }) {
  const { ready } = useSchedulingWorkspace();
  const [selected, setSelected] = useState<TripRecord | null>(null);

  if (!ready) {
    return (
      <div className="p-6 flex flex-col items-center justify-center h-64 gap-3">
        <AltimeterSpinner size={32} />
        <p className="text-muted-foreground text-sm">Loading pilot workspace...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Flight Hub</h1>
        <p className="text-muted-foreground">Your brief, your aircraft, your preflight — one place, linked back to every role.</p>
      </div>
      {selected ? (
        <div className="space-y-4">
          <button onClick={() => setSelected(null)} className="text-sm text-primary hover:underline">← My Flights</button>
          <FlightHub trip={selected} userRole={userRole} />
        </div>
      ) : (
        <MyFlightsPanel onOpen={setSelected} />
      )}
    </div>
  );
}
```

- [ ] **Step 4: FlightHub placeholder (filled in Tasks 4–8)**

```tsx
// src/components/pilot-workspace/FlightHub.tsx
import React from 'react';
import type { TripRecord } from '../../scheduling/store/types';

export default function FlightHub({ trip }: { trip: TripRecord; userRole: string }) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border p-4">
        <div className="font-semibold">{trip.tripNumber} · {trip.tail} · {trip.aircraftType}</div>
        <div className="text-sm text-muted-foreground">{trip.tripType} · {trip.legs?.length ?? 0} legs</div>
      </div>
      {/* ReadinessBar + panels added in Tasks 4–8 */}
    </div>
  );
}
```

- [ ] **Step 5: Wire the route in `src/App.tsx`**

Add near the `/scheduling-workspace` route (import `PilotWorkspace`, `SchedulingWorkspaceProvider` already imported, and `TechLogProvider` from `./components/tech-log/TechLogContext`):

```tsx
<Route
  path="/pilot-workspace"
  element={
    <ProtectedRoute userRole={userRole} additionalRoles={additionalRoles} allowedRoles={['pilot', 'chief-pilot', 'admin']}>
      <SchedulingWorkspaceProvider>
        <TechLogProvider userRole={userRole}>
          <PilotWorkspace userRole={userRole} additionalRoles={additionalRoles} />
        </TechLogProvider>
      </SchedulingWorkspaceProvider>
    </ProtectedRoute>
  }
/>
```

Then make `'pilot'` land there — update the index route (currently App.tsx:213):

```tsx
<Route path="/" element={
  userRole === 'maintenance-workflow' ? <Navigate to="/maintenance-workflow" replace />
    : userRole === 'pilot' ? <Navigate to="/pilot-workspace" replace />
    : <Dashboard userRole={userRole} />
} />
```

- [ ] **Step 6: Add the nav item in `src/components/Navigation.tsx`**

In the "Flight Operations" group, add as the first item:

```tsx
{ name: 'Pilot Workspace', href: '/pilot-workspace', icon: CalendarCheck, roles: ['pilot', 'chief-pilot', 'admin'] },
```

(`CalendarCheck` is already imported for the scheduling entry; reuse it.)

- [ ] **Step 7: Verify (tsc + browser)**

Run: `npx tsc --noEmit -p tsconfig.json` → Expected: no new errors.
Browser (preview): role-switch to `pilot` → app lands on `/pilot-workspace` → My Flights shows the seeded demo trips, each with a readiness chip → clicking one opens the FlightHub header and the "← My Flights" back link.

- [ ] **Step 8: Commit**

```bash
git add src/components/pilot-workspace/ src/App.tsx src/components/Navigation.tsx
git commit -m "feat(pilot-workspace): shell, my-flights list, route, nav, pilot landing"
```

---

## Task 4: Flight Hub readiness bar + panel layout

**Files:** Modify `src/components/pilot-workspace/FlightHub.tsx`

**Interfaces:** Consumes the same readiness inputs as `MyFlightsPanel` (scheduling + tech-log derivations) for the selected trip; renders `ReadinessBar` + placeholders for the four panels (filled next).

- [ ] **Step 1: Compute the composite for the selected trip and render the bar + panel slots**

```tsx
// src/components/pilot-workspace/FlightHub.tsx
import React, { useEffect, useState } from 'react';
import { useSchedulingWorkspace } from '../scheduling-workspace/SchedulingWorkspaceContext';
import { useTechLog } from '../tech-log/TechLogContext';
import { deriveTripReadiness } from '../tech-log/engine/readiness';
import { deriveSchedulingReadiness } from '../../scheduling/engine/readiness';
import { composePilotReadiness, type PilotReadiness } from './selectors';
import ReadinessBar from './ReadinessBar';
import TripBriefPanel from './panels/TripBriefPanel';
import AircraftAcceptancePanel from './panels/AircraftAcceptancePanel';
import PreflightLegsPanel from './panels/PreflightLegsPanel';
import MessagesPanel from './panels/MessagesPanel';
import type { TripRecord } from '../../scheduling/store/types';

export default function FlightHub({ trip, userRole }: { trip: TripRecord; userRole: string }) {
  const { store, tick, nowUtc } = useSchedulingWorkspace();
  const { state } = useTechLog();
  const [readiness, setReadiness] = useState<PilotReadiness | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const now = nowUtc();
      const sched = deriveSchedulingReadiness(await store.listInstancesForTrip(trip.id));
      const tlTrip = state.trips.find((x) => x.tripNumber === trip.tripNumber) ?? null;
      const pf = tlTrip ? deriveTripReadiness(tlTrip, state, now) : null;
      if (!cancelled) setReadiness(composePilotReadiness(sched, pf));
    })();
    return () => { cancelled = true; };
  }, [store, tick, state, nowUtc, trip]);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border p-4">
        <div className="font-semibold">{trip.tripNumber} · {trip.tail} · {trip.aircraftType}</div>
        <div className="text-sm text-muted-foreground">{trip.tripType} · {trip.legs?.length ?? 0} legs</div>
      </div>
      {readiness && <ReadinessBar readiness={readiness} />}
      <TripBriefPanel trip={trip} />
      <AircraftAcceptancePanel trip={trip} />
      <PreflightLegsPanel trip={trip} userRole={userRole} />
      <MessagesPanel />
    </div>
  );
}
```

- [ ] **Step 2: Add temporary panel stubs so it compiles**

Create each of `panels/TripBriefPanel.tsx`, `panels/AircraftAcceptancePanel.tsx`, `panels/PreflightLegsPanel.tsx`, `panels/MessagesPanel.tsx` as a titled placeholder card (real bodies in Tasks 5–8), e.g.:

```tsx
// src/components/pilot-workspace/panels/TripBriefPanel.tsx
import React from 'react';
import type { TripRecord } from '../../../scheduling/store/types';
export default function TripBriefPanel({ trip: _trip }: { trip: TripRecord }) {
  return <section className="rounded-lg border p-4"><h2 className="font-semibold mb-2">Trip brief</h2><p className="text-sm text-muted-foreground">Coming next.</p></section>;
}
```

(Repeat with the matching title for the other three: "Aircraft & acceptance", "Preflight", "Messages"; `PreflightLegsPanel` also takes `userRole: string`, `MessagesPanel` takes no props.)

- [ ] **Step 3: Verify (tsc + browser)**

Run: `npx tsc --noEmit -p tsconfig.json` → Expected: no new errors.
Browser: open a flight → the readiness bar shows a verdict + governing blocker; four titled placeholder cards render.

- [ ] **Step 4: Commit**

```bash
git add src/components/pilot-workspace/FlightHub.tsx src/components/pilot-workspace/panels/
git commit -m "feat(pilot-workspace): flight hub layout with composite readiness bar + panel stubs"
```

---

## Task 5: Trip brief panel (scheduling handoff + ACK)

**Files:** Modify `src/components/pilot-workspace/panels/TripBriefPanel.tsx`

**Interfaces:** Consumes `useSchedulingWorkspace()` → `{ store, tick, bump, nowUtc }`; `store.listEventsForTarget({ kind: 'role', value: 'pilot' })`; `store.updateEvent(...)`. Filters events to this trip's brief(s).

- [ ] **Step 1: Load pilot-targeted brief events for this trip and render + ACK**

```tsx
// src/components/pilot-workspace/panels/TripBriefPanel.tsx
import React, { useEffect, useState } from 'react';
import { useSchedulingWorkspace } from '../../scheduling-workspace/SchedulingWorkspaceContext';
import type { TripRecord } from '../../../scheduling/store/types';
import type { SchedulingEvent } from '../../../scheduling/store/types';

export default function TripBriefPanel({ trip }: { trip: TripRecord }) {
  const { store, tick, bump, nowUtc } = useSchedulingWorkspace();
  const [events, setEvents] = useState<SchedulingEvent[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const all = await store.listEventsForTarget({ kind: 'role', value: 'pilot' });
      const forTrip = all.filter((e) => (e.payload as { tripId?: string }).tripId === trip.id || e.type.startsWith('handoff:'));
      if (!cancelled) setEvents(forTrip);
    })();
    return () => { cancelled = true; };
  }, [store, tick, trip]);

  async function ack(e: SchedulingEvent) {
    await store.updateEvent({ ...e, ackState: 'acked', ackedBy: 'pilot', ackedAtUtc: nowUtc() });
    bump();
  }

  return (
    <section className="rounded-lg border p-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-semibold">Trip brief <span className="text-xs text-muted-foreground">from scheduling</span></h2>
        <a href="/scheduling-workspace" className="text-xs text-primary hover:underline">Open in scheduling ↗</a>
      </div>
      {events.length === 0 && <p className="text-sm text-muted-foreground">No brief delivered yet.</p>}
      <ul className="space-y-2">
        {events.map((e) => (
          <li key={e.id} className="flex items-center justify-between rounded border px-3 py-2">
            <span className="text-sm">{String((e.payload as { title?: string }).title ?? e.type)}</span>
            {e.ackState === 'acked'
              ? <span className="text-xs text-emerald-700">Acknowledged</span>
              : <button onClick={() => ack(e)} className="text-xs rounded bg-primary text-primary-foreground px-2 py-1">Acknowledge</button>}
          </li>
        ))}
      </ul>
    </section>
  );
}
```

- [ ] **Step 2: Verify (tsc + browser)**

Run: `npx tsc --noEmit -p tsconfig.json` → Expected: no new errors.
Browser: as `scheduling`, complete a trip's "crew brief" task (fires the handoff event). Switch to `pilot`, open that flight → the brief appears with an **Acknowledge** button → click it → it flips to "Acknowledged". Switch back to `scheduling` inbox → the same event shows acked. (Prototype note: cross-route store re-seeds, so verify within the seeded demo brief if the live one doesn't carry.)

- [ ] **Step 3: Commit**

```bash
git add src/components/pilot-workspace/panels/TripBriefPanel.tsx
git commit -m "feat(pilot-workspace): trip brief panel with ACK over the shared event bus"
```

---

## Task 6: Aircraft & acceptance panel (maintenance handoff)

Read serviceability / custody / open MEL inline; the signature-bearing acceptance deep-links to the existing tech-log ceremony (do NOT re-skin the e-sign flow).

**Files:** Modify `src/components/pilot-workspace/panels/AircraftAcceptancePanel.tsx`

**Interfaces:** Consumes `useTechLog()` → `{ state }`; `deriveServiceability`, `deriveCustody` (`../tech-log/engine/...`); matches the tech-log trip/aircraft by `trip.tripNumber` → `Aircraft`.

- [ ] **Step 1: Render serviceability + custody + open deferrals; deep-link to accept**

```tsx
// src/components/pilot-workspace/panels/AircraftAcceptancePanel.tsx
import React from 'react';
import { useTechLog } from '../../tech-log/TechLogContext';
import { deriveServiceability } from '../../tech-log/engine/serviceability';
import { deriveCustody } from '../../tech-log/engine/custody';
import type { TripRecord } from '../../../scheduling/store/types';

export default function AircraftAcceptancePanel({ trip }: { trip: TripRecord }) {
  const { state } = useTechLog();
  const now = new Date().toISOString();
  const tlTrip = state.trips.find((t) => t.tripNumber === trip.tripNumber);
  const ac = tlTrip ? state.aircraft.find((a) => a.id === tlTrip.aircraftId) : state.aircraft.find((a) => a.tailNumber === trip.tail);

  if (!ac) {
    return <section className="rounded-lg border p-4"><h2 className="font-semibold mb-2">Aircraft & acceptance</h2><p className="text-sm text-muted-foreground">Not released to preflight yet — no aircraft assigned.</p></section>;
  }

  const sv = deriveServiceability(ac.id, state, now);
  const custody = deriveCustody(ac.id, state, now);
  const openDeferrals = state.deferrals.filter((d) => d.aircraftId === ac.id && d.status === 'ACTIVE');

  return (
    <section className="rounded-lg border p-4 space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Aircraft & acceptance <span className="text-xs text-muted-foreground">from maintenance</span></h2>
        <a href={`/tech-log/aircraft/${ac.tailNumber}`} className="text-xs text-primary hover:underline">Open in tech-log ↗</a>
      </div>
      <div className="flex gap-4 text-sm">
        <span>Serviceability: <strong>{sv.status}</strong></span>
        <span>Custody: <strong>{custody.state.replace('_', ' ')}</strong></span>
      </div>
      {openDeferrals.length > 0 && (
        <div className="text-sm"><span className="text-muted-foreground">Open MEL/deferrals:</span> {openDeferrals.length}</div>
      )}
      {tlTrip && (
        <a href={`/tech-log/trips/${tlTrip.id}`} className="inline-block text-xs rounded border px-2 py-1 hover:bg-accent">
          Review & accept aircraft in tech-log ↗
        </a>
      )}
    </section>
  );
}
```

- [ ] **Step 2: Verify (tsc + browser)**

Run: `npx tsc --noEmit -p tsconfig.json` → Expected: no new errors.
Browser: open a released flight → serviceability + custody chips render; open-deferral count shows when present; "Review & accept aircraft in tech-log" deep-links to the tech-log Trip Workspace and the acceptance ceremony works there.

- [ ] **Step 3: Commit**

```bash
git add src/components/pilot-workspace/panels/AircraftAcceptancePanel.tsx
git commit -m "feat(pilot-workspace): aircraft & acceptance panel (serviceability/custody/MEL + deep-link accept)"
```

---

## Task 7: Preflight legs panel (FRAT / airport / fuel)

Fresh per-leg presentation; the FRAT form is reused; writes go through the shared `preflightActions` helpers.

**Files:** Modify `src/components/pilot-workspace/panels/PreflightLegsPanel.tsx`

**Interfaces:** Consumes `useTechLog()` → `{ state, dispatch }`; `useCurrentUser()` (tech-log) for `oid`/`role`/`displayName`; `StandaloneFRATForm` (`../../StandaloneFRATForm`); `completeFratOnLeg`/`markAirportReviewedOnLeg`/`submitFuelOnLeg` (Task 2). Reuse the same `newId` util `LegDetail` imports.

- [ ] **Step 1: Render legs with FRAT (reused form) / airport / fuel actions**

```tsx
// src/components/pilot-workspace/panels/PreflightLegsPanel.tsx
import React, { useState } from 'react';
import { toast } from 'sonner';
import { useTechLog, useCurrentUser } from '../../tech-log/TechLogContext';
import StandaloneFRATForm from '../../StandaloneFRATForm';
import { completeFratOnLeg, markAirportReviewedOnLeg, submitFuelOnLeg } from '../../tech-log/preflightActions';
import { newId } from '../../tech-log/util'; // reuse the SAME id util LegDetail imports — grep LegDetail for the exact path
import type { TripRecord } from '../../../scheduling/store/types';

export default function PreflightLegsPanel({ trip }: { trip: TripRecord; userRole: string }) {
  const { state, dispatch } = useTechLog();
  const user = useCurrentUser();
  const tlTrip = state.trips.find((t) => t.tripNumber === trip.tripNumber);
  const ac = tlTrip ? state.aircraft.find((a) => a.id === tlTrip.aircraftId) : undefined;
  const [fratOpenLegId, setFratOpenLegId] = useState<string | null>(null);
  const [fuel, setFuel] = useState<Record<string, string>>({});

  if (!tlTrip) {
    return <section className="rounded-lg border p-4"><h2 className="font-semibold mb-2">Preflight</h2><p className="text-sm text-muted-foreground">Not released to preflight yet.</p></section>;
  }

  return (
    <section className="rounded-lg border p-4 space-y-3">
      <h2 className="font-semibold">Preflight <span className="text-xs text-muted-foreground">by leg</span></h2>
      {(tlTrip.legs ?? []).map((leg) => (
        <div key={leg.id} className="rounded border p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-medium text-sm">Leg {leg.sequence}: {leg.departureIcao} → {leg.arrivalIcao}</span>
            <a href={`/tech-log/trips/${tlTrip.id}/legs/${leg.id}`} className="text-xs text-primary hover:underline">Leg detail ↗</a>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded bg-muted px-2 py-1">FRAT: {leg.fratStatus}{leg.fratScore != null ? ` (${leg.fratScore})` : ''}</span>
            <span className="rounded bg-muted px-2 py-1">Airport: {leg.airportReviewed ? 'reviewed' : 'not reviewed'}</span>
            <span className="rounded bg-muted px-2 py-1">Fuel: {leg.fuelRequestId ? 'submitted' : 'not submitted'}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {leg.fratStatus !== 'COMPLETED' && (
              <button className="text-xs rounded border px-2 py-1 hover:bg-accent" onClick={() => setFratOpenLegId(fratOpenLegId === leg.id ? null : leg.id)}>
                {fratOpenLegId === leg.id ? 'Close FRAT' : 'Start FRAT'}
              </button>
            )}
            {!leg.airportReviewed && (
              <button className="text-xs rounded border px-2 py-1 hover:bg-accent"
                onClick={() => markAirportReviewedOnLeg({ dispatch, newId, trip: tlTrip, leg, actorOid: user.oid })}>
                Mark airport reviewed
              </button>
            )}
            {!leg.fuelRequestId && (
              <span className="flex items-center gap-1">
                <input value={fuel[leg.id] ?? ''} onChange={(e) => setFuel((f) => ({ ...f, [leg.id]: e.target.value }))}
                  placeholder="lb" className="w-20 text-xs rounded border px-2 py-1" />
                <button className="text-xs rounded border px-2 py-1 hover:bg-accent" onClick={() => {
                  const res = submitFuelOnLeg({ dispatch, newId, trip: tlTrip, leg, actorOid: user.oid, lbs: Number(fuel[leg.id]), nowMs: Date.now() });
                  if (!res.ok) toast.error(res.error); else toast.success(`Fuel submitted to ${leg.departureIcao} fuel farm`);
                }}>Submit fuel</button>
              </span>
            )}
          </div>
          {fratOpenLegId === leg.id && (
            <div className="border-t pt-2">
              <StandaloneFRATForm
                userRole={user.role}
                initialData={{ flightNumber: trip.tripNumber, aircraft: ac?.tailNumber, departure: leg.departureIcao,
                  destination: leg.arrivalIcao, date: leg.departureTimeUtc.slice(0, 10), time: leg.departureTimeUtc.slice(11, 16), pic: user.displayName }}
                onClose={() => setFratOpenLegId(null)}
                onSave={(data: { status?: string; totalScore?: number }) => {
                  if (data.status === 'submitted') {
                    completeFratOnLeg({ dispatch, newId, trip: tlTrip, leg, actorOid: user.oid, totalScore: data.totalScore });
                    setFratOpenLegId(null);
                  }
                }}
              />
            </div>
          )}
        </div>
      ))}
    </section>
  );
}
```

> Implementation note for the worker: confirm the exact import paths for `newId`, `useCurrentUser`, and `toast` by opening `src/components/tech-log/pages/LegDetail.tsx` (it imports all three). Use whatever it uses — do not invent a path.

- [ ] **Step 2: Verify (tsc + browser)**

Run: `npx tsc --noEmit -p tsconfig.json` → Expected: no new errors.
Browser: open a released flight → for each leg: Start FRAT (reused form) → submit → chip flips to COMPLETED with score; Mark airport reviewed → chip flips; Submit fuel with a valid qty → chip flips; try fuel within 4h of departure → rejected toast. The Flight Hub readiness bar advances toward READY as legs complete.

- [ ] **Step 3: Commit**

```bash
git add src/components/pilot-workspace/panels/PreflightLegsPanel.tsx
git commit -m "feat(pilot-workspace): per-leg preflight panel (reused FRAT form + shared write helpers)"
```

---

## Task 8: Messages panel (pilot-targeted events)

**Files:** Modify `src/components/pilot-workspace/panels/MessagesPanel.tsx`

**Interfaces:** Consumes `useSchedulingWorkspace()` → `{ store, tick, bump, nowUtc }`; `store.listEventsForTarget({ kind: 'role', value: 'pilot' })`.

- [ ] **Step 1: List all pilot-targeted events with ack/open**

```tsx
// src/components/pilot-workspace/panels/MessagesPanel.tsx
import React, { useEffect, useState } from 'react';
import { useSchedulingWorkspace } from '../../scheduling-workspace/SchedulingWorkspaceContext';
import type { SchedulingEvent } from '../../../scheduling/store/types';

export default function MessagesPanel() {
  const { store, tick, bump, nowUtc } = useSchedulingWorkspace();
  const [events, setEvents] = useState<SchedulingEvent[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const all = await store.listEventsForTarget({ kind: 'role', value: 'pilot' });
      if (!cancelled) setEvents(all);
    })();
    return () => { cancelled = true; };
  }, [store, tick]);

  async function ack(e: SchedulingEvent) {
    await store.updateEvent({ ...e, ackState: 'acked', ackedBy: 'pilot', ackedAtUtc: nowUtc() });
    bump();
  }

  return (
    <section className="rounded-lg border p-4">
      <h2 className="font-semibold mb-2">Messages</h2>
      {events.length === 0 && <p className="text-sm text-muted-foreground">No messages.</p>}
      <ul className="space-y-2">
        {events.map((e) => (
          <li key={e.id} className="flex items-center justify-between rounded border px-3 py-2">
            <span className="text-sm">{e.type} · {String((e.payload as { title?: string }).title ?? '')}</span>
            {e.ackable && e.ackState !== 'acked'
              ? <button onClick={() => ack(e)} className="text-xs rounded bg-primary text-primary-foreground px-2 py-1">Ack</button>
              : <span className="text-xs text-muted-foreground">{e.ackState}</span>}
          </li>
        ))}
      </ul>
    </section>
  );
}
```

- [ ] **Step 2: Verify (tsc + browser)**

Run: `npx tsc --noEmit -p tsconfig.json` → Expected: no new errors.
Browser: open a flight → Messages lists pilot-targeted events with ack controls; acking updates state and survives a `bump`.

- [ ] **Step 3: Commit**

```bash
git add src/components/pilot-workspace/panels/MessagesPanel.tsx
git commit -m "feat(pilot-workspace): messages panel over pilot-targeted events"
```

---

## Task 9: Full integration verify + suite + spec-status

**Files:** none new (verification + docs status bump).

- [ ] **Step 1: Full type + test suite**

Run: `npx tsc --noEmit -p tsconfig.json` → Expected: clean.
Run: `npx vitest run` → Expected: all prior tests + the new `selectors.test.ts` and `preflightActions.test.ts` green.

- [ ] **Step 2: End-to-end browser walkthrough**

As `scheduling`: create/confirm a domestic trip, run its checklist, complete the crew-brief task, "Release to preflight".
As `pilot`: land on `/pilot-workspace` → open the flight → **Acknowledge** the brief → review serviceability/custody → complete **FRAT / airport / fuel** on each leg → readiness bar reaches **READY**.
Back as `scheduling`: the brief event shows acked and the trip's preflight readback reflects the completed legs.
Capture a screenshot of the READY Flight Hub.

- [ ] **Step 3: Flip the spec status**

In `docs/scheduling/slice-6-pilot-workspace-design.md`, change the Status line to `Built — browser-verified` and commit.

```bash
git add docs/scheduling/slice-6-pilot-workspace-design.md
git commit -m "docs(scheduling): mark Slice 6 pilot workspace built + verified"
```

---

## Self-Review notes (author)

- **Spec coverage:** §5 anatomy → Tasks 3–8 (My Flights, brief, aircraft, preflight legs, messages, readiness bar); §6 anti-island → Task 2 (shared write helpers) + shared derivations/forms throughout; §7 links-back → deep-links in every panel + ACK over the shared event bus; §3/P6-D5 "my flights" → Task 1; P6-D6 FRAT reuse → Task 7; §10 risk-3 signature safety → Task 6 deep-link exception (documented).
- **Deliberate scope call:** the signature-bearing aircraft acceptance deep-links rather than embedding, to avoid forking the e-sign ceremony (CLAUDE.md NEVER-rule adjacency). Everything else is embedded inline per P6-D1.
- **Known prototype seam:** `SchedulingWorkspaceProvider` and `TechLogProvider` are route-scoped and re-seed/re-load on mount, so a trip created live in the scheduling route may not carry into the pilot route in the same session; the seeded demo trips + localStorage-persisted preflight releases make the demo deterministic. Productionize note (shared app-level providers / real backend) already covered by the slice spec's handoff notes.
