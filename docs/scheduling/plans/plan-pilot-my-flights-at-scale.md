# Pilot My Flights at Scale Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganize the pilot's My Flights list so ~2 months of trips stay navigable — an in-progress pin, four forward time bands, a Domestic/Int'l/DASSP filter, and a "needs prep only" toggle — each card flagged when it needs the pilot's prep.

**Architecture:** Two new pure, unit-tested helpers (`groupTripsByHorizon`, `tripNeedsPrep`) in a new `myFlights.ts`, layered on top of the existing `selectPilotFlights` output; then `MyFlightsPanel` restructured from a flat card list into a filtered, time-grouped list. No engine, scheduling, or tech-log changes — only the pilot-workspace list and one one-line export.

**Tech Stack:** React + TypeScript (strict), Vite, Tailwind v4 (`landscape:` variant available), Vitest (node env, pure-logic tests only — no DOM/component tests).

## Global Constraints

- **Repo / branch:** `/Users/bryandunlop/Antigravity/Fable-Antigravity`, branch `feat/watchlist-scheduling-board`. (The `Tech Log for myGFO` directory is a separate docs repo — all code lives in Fable-Antigravity.)
- **TripType literals (exact):** `'domestic' | 'international' | 'dca_dassp'` from `src/scheduling/engine/types.ts`. Chip labels: `Domestic` / `Int'l` / `DASSP`. The DASSP literal is `'dca_dassp'` — never `'dassp'`.
- **Filter reuse:** use `matchesTripTypeFilter(tripType, selected: Set<TripType>)` from `src/components/scheduling-command/tripFilters.ts` — empty Set = show all, non-empty = union/OR. Copy the exact chip button JSX from `FilterBar.tsx` (lifted `Set<TripType>` state + a clone-then-add/delete toggle; never mutate the Set in place).
- **Band boundaries (named constants):** 7 / 14 / 30 days, inclusive at the lower band; anything past 30d → `Next month` (open-ended). `in_progress` status → `inProgress` bucket regardless of departure.
- **Fuel "needs prep":** `requiresFuelFarmSubmission(leg, aircraft)` (home-base/leg-one gate: `leg.departureIcao === aircraft.homeBase`) **&&** `!leg.fuelRequestId`. Keep the existing home-base gate — a mid-trip return to the hangar correctly re-flags. Outstation legs are crew-managed and never "needs prep" for fuel.
- **Cross-system join:** a scheduling `TripRecord` matches its tech-log `Trip` mirror by `tripNumber` string equality: `state.trips.find(x => x.tripNumber === t.tripNumber) ?? null`. `Trip.legs` is optional — always `?? []`.
- **"Needs prep" flag colour (hard GFO constraint):** the flag is a *workflow* signal, not airworthiness — it MUST be visually distinct from CAMP RAG (green/amber/red) and from the custody gold/blue axis. Use a neutral, non-RAG pill. The RAG-aligned card signal is the readiness *dot* (emerald `READY` / amber `NOT_READY` / red `BLOCKED`), which correctly keeps the RAG palette.
- **Layout:** iPad landscape-first, single column, centered with a readable max-width.
- **Testing:** pure helpers get Vitest tests (node env, no DOM). `MyFlightsPanel` is presentational — verified by `npm run type-check` (no NEW errors in changed files; the repo has pre-existing errors under `src/components/ui/*`) and live browser check. No component tests.
- **Scope:** extend `selectPilotFlights`'s output, do not rewrite it. No changes to `deriveTripReadiness`, `deriveSchedulingReadiness`, `composePilotReadiness`, the scheduling store, or the Slice-2 `FlightHub`.

---

## File Structure

- **Create** `src/components/pilot-workspace/myFlights.ts` — pure helpers: `HorizonGroups` type, `groupTripsByHorizon`, `tripNeedsPrep`, band-day constants.
- **Create** `src/components/pilot-workspace/myFlights.test.ts` — Vitest suite for both helpers.
- **Modify** `src/components/pilot-workspace/selectors.ts` — export the existing private `firstDeparture` helper (one-word change) so the grouping helper reuses it.
- **Modify** `src/components/pilot-workspace/MyFlightsPanel.tsx` — restructure the flat list into filter chips + "needs prep only" toggle + in-progress pin + four time-banded sections; add the readiness dot, INTL/DASSP badge, and non-RAG "needs prep" pill to the card. Tap still calls `onOpen(trip)`.

`PilotWorkspace.tsx` (the parent) is unchanged — it already renders `<MyFlightsPanel onOpen={setSelected} />` and switches to `<FlightHub>` when a trip is selected.

---

### Task 1: `tripNeedsPrep` pure helper

**Files:**
- Create: `src/components/pilot-workspace/myFlights.ts`
- Test: `src/components/pilot-workspace/myFlights.test.ts`

**Interfaces:**
- Consumes: `Trip`, `TripLeg`, `Aircraft` from `../tech-log/types`; `requiresFuelFarmSubmission(leg: TripLeg, aircraft: Aircraft): boolean` from `../tech-log/engine/fuel`.
- Produces: `tripNeedsPrep(tlTrip: Trip | null, aircraft: Aircraft | undefined): boolean`.

- [ ] **Step 1: Write the failing test**

Create `src/components/pilot-workspace/myFlights.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { tripNeedsPrep } from './myFlights';
import type { Trip, TripLeg, Aircraft } from '../tech-log/types';

const NOW = '2026-07-01T12:00:00.000Z';

const mLeg = (over: Partial<TripLeg>): TripLeg => ({
  id: 'l1', sequence: 1, departureIcao: 'KLUK', arrivalIcao: 'KTEB',
  departureTimeUtc: NOW, arrivalTimeUtc: NOW,
  fratStatus: 'COMPLETED', airportReviewed: true,
  ...over,
} as TripLeg);

const mirror = (legs: TripLeg[]): Trip => ({
  id: 't1', tripNumber: 'X', aircraftId: 'ac1', name: 'X',
  status: 'OPEN', flightLogIds: [], legs,
  createdByOid: 'o', createdAtUtc: NOW,
} as Trip);

const AC: Aircraft = {
  id: 'ac1', tailNumber: 'N5PG', type: 'G650ER', serialNumber: '1',
  status: 'ACTIVE', isProvisional: false, homeBase: 'KLUK',
  airframeTotalHours: 0, airframeTotalCycles: 0,
} as Aircraft;

describe('tripNeedsPrep', () => {
  it('is false when the trip has no tech-log mirror (not released to preflight)', () => {
    expect(tripNeedsPrep(null, AC)).toBe(false);
  });

  it('is true when any leg FRAT is not completed', () => {
    expect(tripNeedsPrep(mirror([mLeg({ fratStatus: 'NOT_STARTED' })]), AC)).toBe(true);
    expect(tripNeedsPrep(mirror([mLeg({ fratStatus: 'IN_PROGRESS' })]), AC)).toBe(true);
  });

  it('is true when any leg airport is not reviewed', () => {
    expect(tripNeedsPrep(mirror([mLeg({ airportReviewed: false })]), AC)).toBe(true);
  });

  it('is true when the home-base (leg-one) fuel-farm submission is missing', () => {
    expect(tripNeedsPrep(mirror([mLeg({ fuelRequestId: undefined })]), AC)).toBe(true);
  });

  it('does not flag a missing fuel submission on an outstation leg', () => {
    const legs = [
      mLeg({ id: 'l1', departureIcao: 'KLUK', fuelRequestId: 'f1' }),      // home base, fuel submitted
      mLeg({ id: 'l2', departureIcao: 'KTEB', fuelRequestId: undefined }), // outstation, fuel not required
    ];
    expect(tripNeedsPrep(mirror(legs), AC)).toBe(false);
  });

  it('is false when every leg is fully prepped', () => {
    expect(tripNeedsPrep(mirror([mLeg({ fuelRequestId: 'f1' })]), AC)).toBe(false);
  });

  it('skips the fuel clause when aircraft is undefined', () => {
    expect(tripNeedsPrep(mirror([mLeg({ fuelRequestId: undefined })]), undefined)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/pilot-workspace/myFlights.test.ts`
Expected: FAIL — `myFlights.ts` / `tripNeedsPrep` does not exist (import/resolve error).

- [ ] **Step 3: Write minimal implementation**

Create `src/components/pilot-workspace/myFlights.ts`:

```ts
import type { Trip, Aircraft } from '../tech-log/types';
import { requiresFuelFarmSubmission } from '../tech-log/engine/fuel';

/** A released trip needs the pilot's prep when any leg has an outstanding pilot action:
 *  FRAT not completed, airport not reviewed, or a home-base (leg-one) fuel-farm submission
 *  not yet made. A trip with no tech-log mirror (not released to preflight) needs nothing;
 *  aircraft serviceability is the readiness dot's concern, not a prep item. */
export function tripNeedsPrep(tlTrip: Trip | null, aircraft: Aircraft | undefined): boolean {
  if (!tlTrip) return false;
  for (const leg of tlTrip.legs ?? []) {
    if (leg.fratStatus !== 'COMPLETED') return true;
    if (!leg.airportReviewed) return true;
    if (aircraft && requiresFuelFarmSubmission(leg, aircraft) && !leg.fuelRequestId) return true;
  }
  return false;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/pilot-workspace/myFlights.test.ts`
Expected: PASS (7 assertions across the `tripNeedsPrep` describe block).

- [ ] **Step 5: Commit**

```bash
git add src/components/pilot-workspace/myFlights.ts src/components/pilot-workspace/myFlights.test.ts
git commit -m "feat(pilot): tripNeedsPrep — outstanding pilot action on a released trip"
```

---

### Task 2: `groupTripsByHorizon` pure helper

**Files:**
- Modify: `src/components/pilot-workspace/selectors.ts` (export `firstDeparture`)
- Modify: `src/components/pilot-workspace/myFlights.ts` (add grouping helper)
- Test: `src/components/pilot-workspace/myFlights.test.ts` (add grouping describe block)

**Interfaces:**
- Consumes: `TripRecord` from `../../scheduling/store/types`; `firstDeparture(t: TripRecord): number` (newly exported from `./selectors`).
- Produces: `interface HorizonGroups { inProgress; thisWeek; next2Weeks; laterThisMonth; nextMonth: TripRecord[] }` and `groupTripsByHorizon(trips: TripRecord[], nowUtc: string): HorizonGroups`. Also exports `THIS_WEEK_DAYS = 7`, `NEXT_2_WEEKS_DAYS = 14`, `THIS_MONTH_DAYS = 30`.

- [ ] **Step 1: Export `firstDeparture` from selectors**

In `src/components/pilot-workspace/selectors.ts`, change the helper's declaration from private to exported. It currently reads:

```ts
function firstDeparture(t: TripRecord): number {
```

Change to:

```ts
export function firstDeparture(t: TripRecord): number {
```

(No other change to that function or file.)

- [ ] **Step 2: Write the failing test**

Append to `src/components/pilot-workspace/myFlights.test.ts` (add `groupTripsByHorizon` to the existing import from `./myFlights`, and add these constants + describe block):

```ts
// --- add to the top import ---
// import { groupTripsByHorizon, tripNeedsPrep } from './myFlights';

const NOW_MS = new Date(NOW).getTime();
const DAY = 24 * 60 * 60 * 1000;
const iso = (ms: number) => new Date(ms).toISOString();

function trip({ daysOut = 1, ...over }: Partial<import('../../scheduling/store/types').TripRecord> & { daysOut?: number }) {
  const depMs = NOW_MS + daysOut * DAY;
  return {
    id: `trip-${over.tripNumber ?? 'X'}`,
    tripNumber: over.tripNumber ?? 'X',
    sourceSystem: 'manual', sourceTripRef: null,
    tail: 'N5PG', aircraftType: 'G650ER',
    tripType: 'domestic', priority: 'standard',
    status: 'confirmed',
    startDate: '2026-07-01', endDate: '2026-07-02',
    legs: [{ id: 'l1', sequence: 1, departureIcao: 'KLUK', arrivalIcao: 'KTEB',
      departureTimeUtc: iso(depMs), paxCount: 3 }],
    createdBy: 'seed', createdAtUtc: NOW,
    ...over,
  } as import('../../scheduling/store/types').TripRecord;
}

describe('groupTripsByHorizon', () => {
  it('pins in_progress trips and buckets the rest by days-to-departure (boundaries inclusive)', () => {
    const g = groupTripsByHorizon([
      trip({ tripNumber: 'IP', status: 'in_progress', daysOut: 40 }),
      trip({ tripNumber: 'W', daysOut: 3 }),
      trip({ tripNumber: 'W7', daysOut: 7 }),    // exactly 7 -> this week
      trip({ tripNumber: 'N2', daysOut: 10 }),
      trip({ tripNumber: 'N14', daysOut: 14 }),  // exactly 14 -> next 2 weeks
      trip({ tripNumber: 'L', daysOut: 20 }),
      trip({ tripNumber: 'L30', daysOut: 30 }),  // exactly 30 -> later this month
      trip({ tripNumber: 'M', daysOut: 45 }),
      trip({ tripNumber: 'M90', daysOut: 90 }),
    ], NOW);
    expect(g.inProgress.map((t) => t.tripNumber)).toEqual(['IP']);
    expect(g.thisWeek.map((t) => t.tripNumber)).toEqual(['W', 'W7']);
    expect(g.next2Weeks.map((t) => t.tripNumber)).toEqual(['N2', 'N14']);
    expect(g.laterThisMonth.map((t) => t.tripNumber)).toEqual(['L', 'L30']);
    expect(g.nextMonth.map((t) => t.tripNumber)).toEqual(['M', 'M90']);
  });

  it('orders trips soonest-departure-first within a band regardless of input order', () => {
    const g = groupTripsByHorizon([
      trip({ tripNumber: 'B', daysOut: 5 }),
      trip({ tripNumber: 'A', daysOut: 2 }),
    ], NOW);
    expect(g.thisWeek.map((t) => t.tripNumber)).toEqual(['A', 'B']);
  });

  it('returns every band as an array, empty when nothing falls in it', () => {
    expect(groupTripsByHorizon([], NOW)).toEqual({
      inProgress: [], thisWeek: [], next2Weeks: [], laterThisMonth: [], nextMonth: [],
    });
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/components/pilot-workspace/myFlights.test.ts`
Expected: FAIL — `groupTripsByHorizon` is not exported from `./myFlights`.

- [ ] **Step 4: Write minimal implementation**

Add to `src/components/pilot-workspace/myFlights.ts` (new imports + code; keep the existing `tripNeedsPrep`):

```ts
import type { TripRecord } from '../../scheduling/store/types';
import { firstDeparture } from './selectors';

const DAY_MS = 24 * 60 * 60 * 1000;
export const THIS_WEEK_DAYS = 7;
export const NEXT_2_WEEKS_DAYS = 14;
export const THIS_MONTH_DAYS = 30;

export interface HorizonGroups {
  inProgress: TripRecord[];
  thisWeek: TripRecord[];
  next2Weeks: TripRecord[];
  laterThisMonth: TripRecord[];
  nextMonth: TripRecord[];
}

/** Bucket a pilot's trips into an in-progress pin plus four forward time bands,
 *  soonest departure first within each band. Self-contained: sorts internally, so
 *  callers need not pre-sort. Boundaries (7/14/30 days) are inclusive at the lower band. */
export function groupTripsByHorizon(trips: TripRecord[], nowUtc: string): HorizonGroups {
  const nowMs = new Date(nowUtc).getTime();
  const groups: HorizonGroups = {
    inProgress: [], thisWeek: [], next2Weeks: [], laterThisMonth: [], nextMonth: [],
  };
  const sorted = [...trips].sort((a, b) => firstDeparture(a) - firstDeparture(b));
  for (const t of sorted) {
    if (t.status === 'in_progress') { groups.inProgress.push(t); continue; }
    const days = (firstDeparture(t) - nowMs) / DAY_MS;
    if (days <= THIS_WEEK_DAYS) groups.thisWeek.push(t);
    else if (days <= NEXT_2_WEEKS_DAYS) groups.next2Weeks.push(t);
    else if (days <= THIS_MONTH_DAYS) groups.laterThisMonth.push(t);
    else groups.nextMonth.push(t);
  }
  return groups;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/components/pilot-workspace/myFlights.test.ts`
Expected: PASS — both describe blocks (`tripNeedsPrep` + `groupTripsByHorizon`).

- [ ] **Step 6: Commit**

```bash
git add src/components/pilot-workspace/myFlights.ts src/components/pilot-workspace/myFlights.test.ts src/components/pilot-workspace/selectors.ts
git commit -m "feat(pilot): groupTripsByHorizon — time-banded My Flights buckets"
```

---

### Task 3: Restructure `MyFlightsPanel` into the filtered, time-grouped list

**Files:**
- Modify: `src/components/pilot-workspace/MyFlightsPanel.tsx` (full rewrite of the component body — same default export + same `{ onOpen }` prop)

**Interfaces:**
- Consumes: `selectPilotFlights`, `composePilotReadiness`, `PilotReadiness` from `./selectors`; `groupTripsByHorizon`, `tripNeedsPrep`, `HorizonGroups` from `./myFlights`; `matchesTripTypeFilter` from `../scheduling-command/tripFilters`; `TripType` from `../../scheduling/engine/types`; `deriveTripReadiness`, `deriveSchedulingReadiness`, `useTechLog`, `useSchedulingWorkspace` (already imported today).
- Produces: no new exports — `export default function MyFlightsPanel({ onOpen }: { onOpen: (trip: TripRecord) => void })`, unchanged signature.

- [ ] **Step 1: Rewrite the component**

Replace the entire contents of `src/components/pilot-workspace/MyFlightsPanel.tsx` with:

```tsx
import React, { useEffect, useMemo, useState } from 'react';
import { useSchedulingWorkspace } from '../scheduling-workspace/SchedulingWorkspaceContext';
import { useTechLog } from '../tech-log/TechLogContext';
import { deriveTripReadiness } from '../tech-log/engine/readiness';
import { deriveSchedulingReadiness } from '../../scheduling/engine/readiness';
import { selectPilotFlights, composePilotReadiness, type PilotReadiness } from './selectors';
import { groupTripsByHorizon, tripNeedsPrep, type HorizonGroups } from './myFlights';
import { matchesTripTypeFilter } from '../scheduling-command/tripFilters';
import type { TripRecord } from '../../scheduling/store/types';
import type { TripType } from '../../scheduling/engine/types';

const TRIP_TYPE_OPTIONS: [TripType, string][] = [
  ['domestic', 'Domestic'],
  ['international', "Int'l"],
  ['dca_dassp', 'DASSP'],
];

// RAG-aligned dispatch dot (this is the airworthiness axis; the "needs prep" pill below is NOT).
const DOT: Record<PilotReadiness['state'], string> = {
  READY: 'bg-emerald-500',
  NOT_READY: 'bg-amber-500',
  BLOCKED: 'bg-red-500',
};

const BANDS: [keyof Omit<HorizonGroups, 'inProgress'>, string][] = [
  ['thisWeek', 'This week'],
  ['next2Weeks', 'Next 2 weeks'],
  ['laterThisMonth', 'Later this month'],
  ['nextMonth', 'Next month'],
];

const chipClass = (active: boolean) =>
  `px-2.5 py-1.5 rounded-md text-xs font-medium border transition-colors ${
    active
      ? 'bg-foreground text-background border-foreground'
      : 'bg-background text-muted-foreground border-input hover:text-foreground hover:bg-accent'
  }`;

export default function MyFlightsPanel({ onOpen }: { onOpen: (trip: TripRecord) => void }) {
  const { store, tick, nowUtc } = useSchedulingWorkspace();
  const { state } = useTechLog();
  const [trips, setTrips] = useState<TripRecord[]>([]);
  const [readiness, setReadiness] = useState<Record<string, PilotReadiness>>({});
  const [typeFilter, setTypeFilter] = useState<Set<TripType>>(new Set());
  const [needsPrepOnly, setNeedsPrepOnly] = useState(false);

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

  // "Needs prep" is synchronous from the tech-log mirror + aircraft (no store round-trip).
  const needsPrepById = useMemo(() => {
    const out: Record<string, boolean> = {};
    for (const t of trips) {
      const tlTrip = state.trips.find((x) => x.tripNumber === t.tripNumber) ?? null;
      const ac = tlTrip ? state.aircraft.find((a) => a.id === tlTrip.aircraftId) : undefined;
      out[t.id] = tripNeedsPrep(tlTrip, ac);
    }
    return out;
  }, [trips, state]);

  const groups = useMemo(() => {
    const filtered = trips.filter(
      (t) => matchesTripTypeFilter(t.tripType, typeFilter) && (!needsPrepOnly || needsPrepById[t.id]),
    );
    return groupTripsByHorizon(filtered, nowUtc());
  }, [trips, typeFilter, needsPrepOnly, needsPrepById, nowUtc]);

  const toggleType = (t: TripType) =>
    setTypeFilter((prev) => { const s = new Set(prev); s.has(t) ? s.delete(t) : s.add(t); return s; });

  const total = groups.inProgress.length + BANDS.reduce((n, [k]) => n + groups[k].length, 0);

  const card = (t: TripRecord, pinned = false) => {
    const r = readiness[t.id];
    const dep = t.legs?.[0];
    const badge = t.tripType === 'international' ? "Int'l" : t.tripType === 'dca_dassp' ? 'DASSP' : null;
    return (
      <button key={t.id} onClick={() => onOpen(t)}
        className={`w-full text-left rounded-lg border p-4 hover:bg-accent transition-colors ${pinned ? 'border-primary bg-accent/40' : ''}`}>
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2 font-semibold">
            {r && <span className={`h-2.5 w-2.5 rounded-full ${DOT[r.state]}`} aria-hidden />}
            {t.tripNumber} · {t.tail}
          </span>
          <span className="flex items-center gap-1.5">
            {badge && (
              <span className="text-[10px] font-medium uppercase tracking-wide rounded border px-1.5 py-0.5 text-muted-foreground">{badge}</span>
            )}
            {needsPrepById[t.id] && (
              <span className="text-[10px] font-medium uppercase tracking-wide rounded-full border border-input bg-background px-2 py-0.5 text-foreground">
                Needs prep
              </span>
            )}
          </span>
        </div>
        <div className="text-sm text-muted-foreground mt-1">
          {dep ? `${dep.departureIcao} → ${t.legs[t.legs.length - 1].arrivalIcao} · ${dep.departureTimeUtc.slice(0, 16).replace('T', ' ')}Z` : 'No legs'}
        </div>
        {r?.blocker && <div className="text-xs mt-1 text-muted-foreground">{r.blocker}</div>}
      </button>
    );
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1">
          {TRIP_TYPE_OPTIONS.map(([value, label]) => (
            <button key={value} onClick={() => toggleType(value)} className={chipClass(typeFilter.has(value))}>
              {label}
            </button>
          ))}
        </div>
        <button onClick={() => setNeedsPrepOnly((v) => !v)} className={chipClass(needsPrepOnly)}>
          Needs prep only
        </button>
      </div>

      {total === 0 && (
        <p className="text-muted-foreground text-sm">
          {needsPrepOnly ? 'Nothing needs your prep right now.' : 'No flights match this filter.'}
        </p>
      )}

      {groups.inProgress.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">In progress</h2>
          {groups.inProgress.map((t) => card(t, true))}
        </section>
      )}

      {BANDS.map(([key, label]) =>
        groups[key].length > 0 ? (
          <section key={key} className="space-y-2">
            <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</h2>
            {groups[key].map((t) => card(t))}
          </section>
        ) : null,
      )}
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npm run type-check`
Expected: no NEW errors referencing `src/components/pilot-workspace/MyFlightsPanel.tsx` or `myFlights.ts`. (Pre-existing errors under `src/components/ui/*` are unrelated — confirm the count/paths match the baseline.)

- [ ] **Step 3: Run the full pilot-workspace test suite (no regressions)**

Run: `npx vitest run src/components/pilot-workspace`
Expected: PASS — `myFlights.test.ts`, `selectors.test.ts`, `legContext.test.ts`, `tripPrep.test.ts` all green.

- [ ] **Step 4: Live-verify in the browser**

Start the dev server (preview_start) and open the pilot workspace (Flight Hub). Confirm: (a) the Domestic/Int'l/DASSP chips filter the list; (b) the four time bands render with headers and an in-progress pin when present; (c) the "Needs prep only" toggle hides trips with nothing outstanding and shows the correct empty-state copy; (d) the "needs prep" pill is neutral (not red/amber/green); (e) tapping a card opens the Slice-2 `FlightHub`; (f) the readiness dot colours match each trip's state. Capture a screenshot for the user.

- [ ] **Step 5: Commit**

```bash
git add src/components/pilot-workspace/MyFlightsPanel.tsx
git commit -m "feat(pilot): time-grouped My Flights list with filter + needs-prep toggle"
```

---

## Self-Review

**Spec coverage:**
- Time-grouped sections (in-progress pin + 4 bands) → Task 2 (`groupTripsByHorizon`) + Task 3 (render).
- Domestic/Int'l/DASSP filter → Task 3 (reused `matchesTripTypeFilter` + FilterBar chip JSX).
- "Needs prep only" toggle → Task 3 (`needsPrepOnly` state) + Task 1 (`tripNeedsPrep`).
- Fuel = leg-one/home-base only → Task 1 (`requiresFuelFarmSubmission` gate) + tests (outstation-leg case).
- Readiness dot RAG-aligned; needs-prep flag non-RAG → Task 3 (`DOT` map + neutral pill) + Global Constraints.
- Tap → Slice-2 view → Task 3 (`onOpen` preserved).
- iPad landscape-first single column → Task 3 (`mx-auto max-w-3xl`).

**Placeholder scan:** none — every step has full code or an exact command + expected output.

**Type consistency:** `HorizonGroups` keys (`inProgress`/`thisWeek`/`next2Weeks`/`laterThisMonth`/`nextMonth`) are identical across Task 2's helper, its tests, and Task 3's `BANDS`/`total`/render. `tripNeedsPrep(Trip | null, Aircraft | undefined)` and `groupTripsByHorizon(TripRecord[], string)` signatures match between definition, tests, and the panel's call sites. `TripType` literals (`'domestic'|'international'|'dca_dassp'`) and `firstDeparture(TripRecord): number` (exported in Task 2, consumed in the same task) are consistent.

**Open design note for the user:** the "needs prep" pill defaults to a neutral outline (non-RAG per the GFO constraint); the exact hue is worth a live look — flagged in Task 3 Step 4.
