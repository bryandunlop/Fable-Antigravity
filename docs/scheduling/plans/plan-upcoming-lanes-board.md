# Upcoming — forward triage lanes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an **Upcoming** view to `/scheduling-command` — forward triage lanes (This week / Next week / Later this month) keyed by when a trip's work is due, with overdue demoted to a slim strip, per-trip action badges, a "↓ N more" overflow prompt, and a global three-way Domestic / International / DASSP filter.

**Architecture:** A read-only projection over the existing scheduling store. A new pure selector (`buildUpcomingBoard`) buckets each trip by its soonest open, due-dated, non-overdue task into lane windows; a new `UpcomingLanes` component renders it; the trip-type filter is a small pure predicate wired into the existing `filteredTrips` memo. No schema, engine, or due-date changes. Design mirrors the existing `runBoardSelectors.ts` / `RunBoard.tsx` pair.

**Tech Stack:** React + TypeScript (strict), Vite, Tailwind + shadcn UI, Vitest (node env). Source lives under `src/components/scheduling-command/`.

## Global Constraints

- **Tests are pure-logic only.** Vitest runs `src/**/*.test.ts` in a node env — there is no DOM/component test setup. Logic (`.ts`) gets unit tests; UI (`.tsx`) is verified by `npm run type-check` + the running dev app.
- **Commands:** run all tests `npm test`; one file `npx vitest run <path>`; types `npm run type-check`; dev server `npm run dev` (serves `/scheduling-command`, port 5199 via the `vite-dev` launch config).
- **No schema / engine / due-date changes.** The Upcoming view is a derived projection over `BoardTrip` + `BoardTask` (from `adapter.ts`). It never stores state.
- **Lane windows (named constants):** This week `≤ 7d`, Next week `8–14d`, Later this month `15–30d`, the far edge capped by the active `horizonDays`.
- **Palette:** reuse the existing GFO status classes (`status-badge status-{error,warning,info}`, CSS vars `--gfo-error` / `--gfo-warning` / `--gfo-success`). Red is reserved for the overdue strip; lanes stay calm (blue/muted). Keep these scheduling-urgency colours distinct from the aircraft RED/AMBER/GREEN serviceability RAG.
- **Copy:** sentence case everywhere ("Due today", "This week", "on track").
- **`TripType`** = `'domestic' | 'international' | 'dca_dassp'`, exported from `../../scheduling/engine` (via `export * from './types'`).
- **Determinism:** every selector takes an explicit `nowMs` — never call `Date.now()` inside pure logic.

---

## File structure

- Modify `src/components/scheduling-command/adapter.ts` — add `tripType` to `BoardTrip` and populate it in `boardTripOf`.
- Modify `src/components/scheduling-command/runBoardSelectors.test.ts` — add `tripType` to the `trip()` test helper (compile fix for the new required field).
- Create `src/components/scheduling-command/upcomingLanesSelectors.ts` — `buildUpcomingBoard` + its model types.
- Create `src/components/scheduling-command/upcomingLanesSelectors.test.ts` — window/bucketing tests.
- Create `src/components/scheduling-command/tripFilters.ts` — `matchesTripTypeFilter` pure predicate.
- Create `src/components/scheduling-command/tripFilters.test.ts` — multi-select filter tests.
- Create `src/components/scheduling-command/UpcomingLanes.tsx` — the view (overdue strip + 3 lanes + overflow).
- Modify `src/components/scheduling-command/FilterBar.tsx` — add the three-way trip-type segment.
- Modify `src/components/scheduling-command/SchedulingCommandCenter.tsx` — new `upcoming` surface tab, `tripTypeFilter` state, filter predicate, memo, render.

---

### Task 1: Add `tripType` to the BoardTrip view model

**Files:**
- Modify: `src/components/scheduling-command/adapter.ts:24-39` (interface) and `:75-91` (`boardTripOf` return)
- Modify: `src/components/scheduling-command/runBoardSelectors.test.ts:17-25` (test helper compile fix)
- Test: `src/components/scheduling-command/adapter.test.ts` (existing — assert the new field)

**Interfaces:**
- Produces: `BoardTrip.tripType: TripRecord['tripType']` — consumed by Task 3 (filter) and Task 5 (predicate).

- [ ] **Step 1: Add the failing assertion to the existing adapter test**

In `src/components/scheduling-command/adapter.test.ts`, inside the first `boardTripOf` test (`derives readiness score…`, after the `b.aircraft` assertion on line 62), add:

```ts
    expect(b.tripType).toBe('domestic');
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run src/components/scheduling-command/adapter.test.ts`
Expected: FAIL — `b.tripType` is `undefined` (property does not exist).

- [ ] **Step 3: Add the field to the `BoardTrip` interface**

In `src/components/scheduling-command/adapter.ts`, in the `BoardTrip` interface, add `tripType` next to `isInternational` (after line 35 `isInternational: boolean;`):

```ts
  isInternational: boolean;
  tripType: TripRecord['tripType'];
```

- [ ] **Step 4: Populate it in `boardTripOf`**

In the `boardTripOf` return object (after line 86 `isInternational: trip.tripType === 'international',`), add:

```ts
    isInternational: trip.tripType === 'international',
    tripType: trip.tripType,
```

- [ ] **Step 5: Fix the one BoardTrip-literal test helper**

In `src/components/scheduling-command/runBoardSelectors.test.ts`, the `trip()` helper builds a `BoardTrip` literal. Add `tripType: 'domestic',` immediately after the `isInternational: false,` field (line 23):

```ts
    readinessScore: 50, isInternational: false, tripType: 'domestic', priority: 'standard', tripStatus: 'planning',
```

- [ ] **Step 6: Run the adapter + runBoard tests and the type-check**

Run: `npx vitest run src/components/scheduling-command/adapter.test.ts src/components/scheduling-command/runBoardSelectors.test.ts && npm run type-check`
Expected: PASS, and `type-check` clean (confirms no other `BoardTrip` literal broke).

- [ ] **Step 7: Commit**

```bash
git add src/components/scheduling-command/adapter.ts src/components/scheduling-command/adapter.test.ts src/components/scheduling-command/runBoardSelectors.test.ts
git commit -m "feat(scheduling): expose tripType on BoardTrip for the upcoming-lanes filter"
```

---

### Task 2: `buildUpcomingBoard` selector + tests

**Files:**
- Create: `src/components/scheduling-command/upcomingLanesSelectors.ts`
- Test: `src/components/scheduling-command/upcomingLanesSelectors.test.ts`

**Interfaces:**
- Consumes: `BoardTrip`, `BoardTask` from `./adapter` (Task 1).
- Produces: `buildUpcomingBoard(trips: BoardTrip[], nowMs: number, horizonDays: number): UpcomingModel`; types `UpcomingLane = 'this-week' | 'next-week' | 'later'`, `UpcomingTrip`, `OverdueItem`, `UpcomingModel`, and the const `UPCOMING_WINDOWS`. Consumed by Task 4 (component) and Task 5 (memo).

- [ ] **Step 1: Write the failing test file**

Create `src/components/scheduling-command/upcomingLanesSelectors.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { buildUpcomingBoard } from './upcomingLanesSelectors';
import type { BoardTrip, BoardTask } from './adapter';

const DAY = 86400000;
const NOW = new Date(2026, 6, 3, 12, 0, 0, 0).getTime(); // noon, fixed

let seq = 0;
function task(p: Partial<BoardTask> = {}): BoardTask {
  return {
    id: `i${seq++}`, title: 'Permit', category: 'ops', order: 1, status: 'open',
    ownerRole: 'scheduling', dueAtUtc: new Date(NOW).toISOString(),
    requiresAck: false, ackState: 'n_a', ...p,
  };
}
function trip(depDaysFromNow: number, tasks: BoardTask[], p: Partial<BoardTrip> = {}): BoardTrip {
  return {
    id: `t${seq++}`, tripNumber: `T-${seq}`, client: 'Domestic', aircraft: 'N2PG',
    aircraftType: 'G650ER', route: 'KTEB → EGGW',
    departureDate: new Date(NOW + depDaysFromNow * DAY).toISOString(), durationDays: 2,
    readinessScore: 50, isInternational: false, tripType: 'domestic',
    priority: 'standard', tripStatus: 'planning', tasks, ...p,
  };
}
const dueIn = (days: number) => new Date(NOW + days * DAY).toISOString();

describe('buildUpcomingBoard', () => {
  it('assigns a trip to the lane of its soonest upcoming due task', () => {
    const t = trip(20, [task({ dueAtUtc: dueIn(3) }), task({ dueAtUtc: dueIn(10) })]);
    const m = buildUpcomingBoard([t], NOW, 30);
    expect(m.lanes['this-week']).toHaveLength(1);
    expect(m.lanes['this-week'][0].soonest?.dueLabel).toMatch(/due/i);
    expect(m.lanes['this-week'][0].countInWindow).toBe(1); // only the +3d task is within this-week
    expect(m.lanes['next-week']).toHaveLength(0);
  });

  it('honours lane boundaries at exactly 7 / 14 / 30 days', () => {
    const wk = trip(40, [task({ dueAtUtc: dueIn(7) })]);
    const next = trip(41, [task({ dueAtUtc: dueIn(8) })]);
    const later = trip(42, [task({ dueAtUtc: dueIn(30) })]);
    const beyond = trip(43, [task({ dueAtUtc: dueIn(31) })]);
    const m = buildUpcomingBoard([wk, next, later, beyond], NOW, 60);
    expect(m.lanes['this-week'].map(u => u.trip.id)).toEqual([wk.id]);
    expect(m.lanes['next-week'].map(u => u.trip.id)).toEqual([next.id]);
    expect(m.lanes['later'].map(u => u.trip.id)).toEqual([later.id]);
    // +31d is past the 30d 'later' edge → not shown in any lane
    const all = [...m.lanes['this-week'], ...m.lanes['next-week'], ...m.lanes['later']];
    expect(all.find(u => u.trip.id === beyond.id)).toBeUndefined();
  });

  it('demotes overdue tasks to the strip (oldest first) and never into a lane', () => {
    const a = trip(10, [task({ dueAtUtc: dueIn(-1) })]);
    const b = trip(12, [task({ dueAtUtc: dueIn(-4) }), task({ dueAtUtc: dueIn(-2) })]);
    const m = buildUpcomingBoard([a, b], NOW, 30);
    expect(m.overdue.map(o => o.tripId)).toEqual([b.id, a.id]); // b is 4d overdue → first
    expect(m.overdue[0].overdueCount).toBe(2);
    expect(m.overdue[0].dueLabel).toBe('Overdue 4d');
    expect(m.lanes['this-week']).toHaveLength(0);
    expect(m.lanes['next-week']).toHaveLength(0);
  });

  it('an overdue-only trip appears in the strip but not as a quiet lane card', () => {
    const t = trip(9, [task({ dueAtUtc: dueIn(-1) })]);
    const m = buildUpcomingBoard([t], NOW, 30);
    expect(m.overdue).toHaveLength(1);
    const all = [...m.lanes['this-week'], ...m.lanes['next-week'], ...m.lanes['later']];
    expect(all).toHaveLength(0);
  });

  it('a trip with nothing pending shows as a quiet card laned by departure, after loud cards', () => {
    const loud = trip(6, [task({ dueAtUtc: dueIn(2) })]);          // this-week by work
    const quiet = trip(4, [task({ status: 'done', dueAtUtc: dueIn(1) })]); // departs in 4d, nothing due
    const m = buildUpcomingBoard([quiet, loud], NOW, 30);
    expect(m.lanes['this-week'].map(u => u.trip.id)).toEqual([loud.id, quiet.id]); // loud before quiet
    expect(m.lanes['this-week'][1].quiet).toBe(true);
    expect(m.lanes['this-week'][1].soonest).toBeUndefined();
  });

  it('excludes settled (done/n_a) and departed trips, and tasks with no due date', () => {
    const departed = trip(-1, [task({ dueAtUtc: dueIn(0) })]);
    const t = trip(5, [
      task({ status: 'done', dueAtUtc: dueIn(1) }),
      task({ status: 'n_a', dueAtUtc: dueIn(1) }),
      task({ dueAtUtc: 'not-a-date' }),
      task({ status: 'in_progress', dueAtUtc: dueIn(2) }),
    ]);
    const m = buildUpcomingBoard([departed, t], NOW, 30);
    expect(m.lanes['this-week']).toHaveLength(1);
    expect(m.lanes['this-week'][0].soonest?.key).toBe(t.tasks[3].id); // the only valid open+due task
    expect(m.totalTrips).toBe(1); // departed excluded
  });

  it('caps the far edge at the active horizon', () => {
    const t = trip(40, [task({ dueAtUtc: dueIn(20) })]);
    const m = buildUpcomingBoard([t], NOW, 14); // laterEnd = min(30,14) = 14d → +20d dropped
    const all = [...m.lanes['this-week'], ...m.lanes['next-week'], ...m.lanes['later']];
    expect(all).toHaveLength(0);
  });

  it('sorts loud cards within a lane by soonest due', () => {
    const a = trip(20, [task({ dueAtUtc: dueIn(5) })]);
    const b = trip(21, [task({ dueAtUtc: dueIn(2) })]);
    const m = buildUpcomingBoard([a, b], NOW, 30);
    expect(m.lanes['this-week'].map(u => u.trip.id)).toEqual([b.id, a.id]);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run src/components/scheduling-command/upcomingLanesSelectors.test.ts`
Expected: FAIL — cannot import `buildUpcomingBoard` (module does not exist).

- [ ] **Step 3: Write the selector**

Create `src/components/scheduling-command/upcomingLanesSelectors.ts`:

```ts
import type { BoardTrip, BoardTask } from './adapter';

// Pure projection for the "Upcoming" view: forward triage lanes keyed by WHEN THE WORK IS DUE.
// A trip lands in the lane of its soonest open, due-dated, non-overdue task. Overdue tasks are
// demoted to a separate strip; trips with nothing pending show as quiet cards laned by departure.
// All time inputs are explicit (nowMs) so window edges are unit-testable.

const DAY_MS = 86400000;

export const UPCOMING_WINDOWS = { thisWeekDays: 7, nextWeekDays: 14, laterDays: 30 } as const;

export type UpcomingLane = 'this-week' | 'next-week' | 'later';

export interface UpcomingAction {
  key: string; // TaskInstance id — the applyAction / focus key
  title: string;
  ownerRole: string;
  dueMs: number;
  dueLabel: string; // 'Due today' | 'Due in 31h' | 'Due in 4d'
}

export interface UpcomingTrip {
  trip: BoardTrip;
  lane: UpcomingLane;
  soonest?: UpcomingAction; // headline action; undefined => quiet card
  countInWindow: number;    // open, due-dated actions falling inside this lane's window
  quiet: boolean;           // nothing pending → laned by departure, rendered muted
}

export interface OverdueItem {
  tripId: string;
  tail: string;
  route: string;
  tripNumber: string;
  actionTitle: string; // the oldest overdue action's title
  dueLabel: string;    // 'Overdue 4d'
  overdueCount: number;
}

export interface UpcomingModel {
  overdue: OverdueItem[]; // oldest-overdue first
  lanes: Record<UpcomingLane, UpcomingTrip[]>; // loud (by soonest due) then quiet (by departure)
  totalTrips: number; // non-departed trips considered
}

const isOpen = (t: BoardTask) => t.status !== 'done' && t.status !== 'n_a';

function upcomingLabel(dueMs: number, nowMs: number, endOfTodayMs: number): string {
  if (dueMs <= endOfTodayMs) return 'Due today';
  const hours = Math.round((dueMs - nowMs) / 3600000);
  return hours <= 48 ? `Due in ${hours}h` : `Due in ${Math.ceil((dueMs - nowMs) / DAY_MS)}d`;
}

function overdueLabel(dueMs: number, startOfTodayMs: number): string {
  const days = Math.max(1, Math.ceil((startOfTodayMs - dueMs) / DAY_MS));
  return `Overdue ${days}d`;
}

export function buildUpcomingBoard(
  trips: BoardTrip[],
  nowMs: number,
  horizonDays: number,
): UpcomingModel {
  const startOfToday = new Date(nowMs);
  startOfToday.setHours(0, 0, 0, 0);
  const startOfTodayMs = startOfToday.getTime();
  const endOfTodayMs = startOfTodayMs + DAY_MS - 1;

  const thisWeekEndMs = startOfTodayMs + UPCOMING_WINDOWS.thisWeekDays * DAY_MS;
  const nextWeekEndMs = startOfTodayMs + UPCOMING_WINDOWS.nextWeekDays * DAY_MS;
  const laterEndMs = startOfTodayMs + Math.min(UPCOMING_WINDOWS.laterDays, horizonDays) * DAY_MS;

  const laneFor = (dueMs: number): UpcomingLane | null => {
    if (dueMs > laterEndMs) return null;
    if (dueMs <= thisWeekEndMs) return 'this-week';
    if (dueMs <= nextWeekEndMs) return 'next-week';
    return 'later';
  };
  const laneEndMs = (lane: UpcomingLane): number =>
    lane === 'this-week' ? thisWeekEndMs : lane === 'next-week' ? nextWeekEndMs : laterEndMs;

  const overdueRaw: (OverdueItem & { worstMs: number })[] = [];
  const lanes: Record<UpcomingLane, UpcomingTrip[]> = { 'this-week': [], 'next-week': [], later: [] };
  let totalTrips = 0;

  for (const trip of trips) {
    const depMs = new Date(trip.departureDate).getTime();
    if (depMs <= nowMs) continue; // departed — its pre-departure checklist is moot (mirrors runBoard)
    totalTrips++;

    const open = trip.tasks
      .filter(isOpen)
      .map(t => ({ t, dueMs: new Date(t.dueAtUtc).getTime() }))
      .filter(o => Number.isFinite(o.dueMs));
    const overdue = open.filter(o => o.dueMs < startOfTodayMs).sort((a, b) => a.dueMs - b.dueMs);
    const upcoming = open.filter(o => o.dueMs >= startOfTodayMs).sort((a, b) => a.dueMs - b.dueMs);

    if (overdue.length) {
      const worst = overdue[0];
      overdueRaw.push({
        tripId: trip.id, tail: trip.aircraft, route: trip.route, tripNumber: trip.tripNumber,
        actionTitle: worst.t.title, dueLabel: overdueLabel(worst.dueMs, startOfTodayMs),
        overdueCount: overdue.length, worstMs: worst.dueMs,
      });
    }

    const soonest = upcoming[0];
    if (soonest) {
      const lane = laneFor(soonest.dueMs);
      if (!lane) continue; // soonest work is beyond the horizon — not upcoming yet
      const end = laneEndMs(lane);
      lanes[lane].push({
        trip, lane,
        soonest: {
          key: soonest.t.id, title: soonest.t.title, ownerRole: soonest.t.ownerRole,
          dueMs: soonest.dueMs, dueLabel: upcomingLabel(soonest.dueMs, nowMs, endOfTodayMs),
        },
        countInWindow: upcoming.filter(o => o.dueMs <= end).length,
        quiet: false,
      });
    } else if (overdue.length === 0 && depMs <= laterEndMs) {
      const lane = laneFor(depMs); // nothing pending → quiet card laned by departure
      if (lane) lanes[lane].push({ trip, lane, countInWindow: 0, quiet: true });
    }
    // overdue-only trips are represented in the strip, never as a lane card
  }

  overdueRaw.sort((a, b) => a.worstMs - b.worstMs || a.tripNumber.localeCompare(b.tripNumber));
  const overdueItems = overdueRaw.map(({ worstMs, ...rest }) => rest);

  for (const key of Object.keys(lanes) as UpcomingLane[]) {
    lanes[key].sort((a, b) => {
      if (a.quiet !== b.quiet) return a.quiet ? 1 : -1;
      if (!a.quiet && !b.quiet) return a.soonest!.dueMs - b.soonest!.dueMs;
      return new Date(a.trip.departureDate).getTime() - new Date(b.trip.departureDate).getTime();
    });
  }

  return { overdue: overdueItems, lanes, totalTrips };
}
```

- [ ] **Step 4: Run the tests and watch them pass**

Run: `npx vitest run src/components/scheduling-command/upcomingLanesSelectors.test.ts`
Expected: PASS (all 8 cases).

- [ ] **Step 5: Commit**

```bash
git add src/components/scheduling-command/upcomingLanesSelectors.ts src/components/scheduling-command/upcomingLanesSelectors.test.ts
git commit -m "feat(scheduling): buildUpcomingBoard — forward triage lanes keyed by work-due"
```

---

### Task 3: Trip-type filter predicate + tests

**Files:**
- Create: `src/components/scheduling-command/tripFilters.ts`
- Test: `src/components/scheduling-command/tripFilters.test.ts`

**Interfaces:**
- Consumes: `TripType` from `../../scheduling/engine`.
- Produces: `matchesTripTypeFilter(tripType: TripType, selected: Set<TripType>): boolean`. Consumed by Task 5.

- [ ] **Step 1: Write the failing test**

Create `src/components/scheduling-command/tripFilters.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { matchesTripTypeFilter } from './tripFilters';
import type { TripType } from '../../scheduling/engine';

describe('matchesTripTypeFilter', () => {
  const set = (...v: TripType[]) => new Set<TripType>(v);

  it('shows every trip when nothing is selected', () => {
    expect(matchesTripTypeFilter('domestic', set())).toBe(true);
    expect(matchesTripTypeFilter('international', set())).toBe(true);
    expect(matchesTripTypeFilter('dca_dassp', set())).toBe(true);
  });

  it('matches only the selected type', () => {
    expect(matchesTripTypeFilter('international', set('international'))).toBe(true);
    expect(matchesTripTypeFilter('domestic', set('international'))).toBe(false);
  });

  it('unions across a multi-select', () => {
    const f = set('domestic', 'dca_dassp');
    expect(matchesTripTypeFilter('domestic', f)).toBe(true);
    expect(matchesTripTypeFilter('dca_dassp', f)).toBe(true);
    expect(matchesTripTypeFilter('international', f)).toBe(false);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run src/components/scheduling-command/tripFilters.test.ts`
Expected: FAIL — module `./tripFilters` does not exist.

- [ ] **Step 3: Write the predicate**

Create `src/components/scheduling-command/tripFilters.ts`:

```ts
import type { TripType } from '../../scheduling/engine';

// Multi-select trip-type filter: an empty selection means "show all" (mirrors the tail-chip
// semantics in FilterBar); otherwise a trip matches when its type is one of the selected.
export function matchesTripTypeFilter(tripType: TripType, selected: Set<TripType>): boolean {
  return selected.size === 0 || selected.has(tripType);
}
```

- [ ] **Step 4: Run the tests and watch them pass**

Run: `npx vitest run src/components/scheduling-command/tripFilters.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/scheduling-command/tripFilters.ts src/components/scheduling-command/tripFilters.test.ts
git commit -m "feat(scheduling): multi-select trip-type filter predicate"
```

---

### Task 4: `UpcomingLanes` component

**Files:**
- Create: `src/components/scheduling-command/UpcomingLanes.tsx`

**Interfaces:**
- Consumes: `UpcomingModel`, `UpcomingLane`, `UpcomingTrip` from `./upcomingLanesSelectors` (Task 2); `TripIdentityLine` from `./TripIdentity`; `Card`/`Badge` from `../ui/*`.
- Produces: `export function UpcomingLanes({ model, onOpenTrip }: { model: UpcomingModel; onOpenTrip: (tripId: string, taskId?: string) => void })`. Consumed by Task 5.

> No unit test — this is a `.tsx` view (vitest is node-only here). Verified by `npm run type-check` and, in Task 5, by loading the app.

- [ ] **Step 1: Write the component**

Create `src/components/scheduling-command/UpcomingLanes.tsx`:

```tsx
import { useState } from 'react';
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronRight, Clock, Inbox } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { TripIdentityLine } from './TripIdentity';
import type { UpcomingLane, UpcomingModel, UpcomingTrip } from './upcomingLanesSelectors';

const LANE_META: Record<UpcomingLane, { label: string; dot: string }> = {
  'this-week': { label: 'This week', dot: 'bg-[var(--gfo-info,#2F80ED)]' },
  'next-week': { label: 'Next week', dot: 'bg-muted-foreground/50' },
  later: { label: 'Later this month', dot: 'bg-muted-foreground/30' },
};
const LANE_ORDER: UpcomingLane[] = ['this-week', 'next-week', 'later'];
const PREVIEW = 6;

function TripActionCard({ item, onOpenTrip }: { item: UpcomingTrip; onOpenTrip: (id: string, taskId?: string) => void }) {
  const { trip, soonest, countInWindow, quiet } = item;
  return (
    <button
      onClick={() => onOpenTrip(trip.id, soonest?.key)}
      className={`w-full text-left border rounded-lg px-3 py-2.5 hover:bg-accent transition-colors ${quiet ? 'bg-muted/30' : 'bg-background'}`}
    >
      <TripIdentityLine trip={trip} />
      <div className="mt-2">
        {quiet ? (
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <CheckCircle2 className="h-3.5 w-3.5 text-[var(--gfo-success,#00B140)]" /> on track
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium status-badge status-info px-2 py-1 rounded-md">
            <Clock className="h-3.5 w-3.5" />
            {soonest!.title} · {soonest!.dueLabel}
            {countInWindow > 1 ? ` · ${countInWindow} items` : ''}
          </span>
        )}
      </div>
    </button>
  );
}

function Lane({ lane, items, onOpenTrip }: { lane: UpcomingLane; items: UpcomingTrip[]; onOpenTrip: (id: string, taskId?: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const meta = LANE_META[lane];
  const shown = expanded ? items : items.slice(0, PREVIEW);
  const hidden = items.length - shown.length;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline gap-2 px-1">
        <span className={`w-2 h-2 rounded-full ${meta.dot}`} />
        <span className="text-sm font-medium">{meta.label}</span>
        <span className="text-xs text-muted-foreground">{items.length} trip{items.length === 1 ? '' : 's'}</span>
      </div>
      {shown.map(item => (
        <TripActionCard key={item.trip.id} item={item} onOpenTrip={onOpenTrip} />
      ))}
      {items.length === 0 && <p className="text-xs text-muted-foreground px-1 py-2">Nothing here.</p>}
      {hidden > 0 && (
        <button
          onClick={() => setExpanded(true)}
          className="flex items-center justify-center gap-1.5 text-xs font-medium text-[var(--gfo-info,#2F80ED)] border border-dashed rounded-md py-1.5 hover:bg-accent transition-colors"
        >
          <ChevronDown className="h-3.5 w-3.5" /> {hidden} more
        </button>
      )}
    </div>
  );
}

/**
 * Upcoming — "what's coming up." Forward triage lanes keyed by when work is due; overdue is a slim
 * strip, not a lane. Each card is a trip badged with its soonest action; a "N more" prompt reveals
 * anything below the fold. Clicking a card opens the trip drawer, focused on its soonest action.
 */
export function UpcomingLanes({ model, onOpenTrip }: { model: UpcomingModel; onOpenTrip: (tripId: string, taskId?: string) => void }) {
  const laneTotal = LANE_ORDER.reduce((n, l) => n + model.lanes[l].length, 0);

  return (
    <div className="flex flex-col gap-4">
      {model.overdue.length > 0 && (
        <button
          onClick={() => onOpenTrip(model.overdue[0].tripId)}
          className="flex items-center gap-2.5 text-left rounded-md px-3 py-2 border border-[var(--gfo-error,#EF3340)]/40 bg-[var(--gfo-error,#EF3340)]/10 hover:bg-[var(--gfo-error,#EF3340)]/15 transition-colors"
        >
          <AlertTriangle className="h-4 w-4 text-[var(--gfo-error,#EF3340)] shrink-0" />
          <span className="text-xs font-medium text-[var(--gfo-error,#EF3340)]">
            {model.overdue.length} need{model.overdue.length === 1 ? 's' : ''} attention now
          </span>
          <span className="text-xs text-muted-foreground truncate">
            {model.overdue[0].tail} {model.overdue[0].route} · {model.overdue[0].actionTitle} · {model.overdue[0].dueLabel}
            {model.overdue.length > 1 ? ` · +${model.overdue.length - 1} more` : ''}
          </span>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground ml-auto shrink-0" />
        </button>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {LANE_ORDER.map(lane => (
          <Lane key={lane} lane={lane} items={model.lanes[lane]} onOpenTrip={onOpenTrip} />
        ))}
      </div>

      {laneTotal === 0 && model.overdue.length === 0 && (
        <Card>
          <CardContent className="p-12 flex flex-col items-center gap-3 text-muted-foreground">
            {model.totalTrips === 0 ? <Inbox className="h-10 w-10 opacity-40" /> : <CheckCircle2 className="h-10 w-10 text-[var(--gfo-success,#00B140)] opacity-60" />}
            <p className="font-medium">{model.totalTrips === 0 ? 'No trips in this horizon.' : 'Nothing coming up — all caught up.'}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npm run type-check`
Expected: clean (no errors). If `status-badge status-info` classes are unknown to your setup they are global CSS from the GFO theme, already used in `RunBoard.tsx:14` — no change needed.

- [ ] **Step 3: Commit**

```bash
git add src/components/scheduling-command/UpcomingLanes.tsx
git commit -m "feat(scheduling): UpcomingLanes view — lanes, overdue strip, overflow prompt"
```

---

### Task 5: Wire the Upcoming view + trip-type filter into the command center

**Files:**
- Modify: `src/components/scheduling-command/FilterBar.tsx`
- Modify: `src/components/scheduling-command/SchedulingCommandCenter.tsx`

**Interfaces:**
- Consumes: `buildUpcomingBoard` (Task 2), `UpcomingLanes` (Task 4), `matchesTripTypeFilter` (Task 3), `TripType` from `../../scheduling/engine`.
- Produces: the `upcoming` surface, wired filter state.

- [ ] **Step 1: Extend FilterBar with the trip-type segment**

In `src/components/scheduling-command/FilterBar.tsx`, add the import at the top (after line 4):

```ts
import type { TripType } from '../../scheduling/engine';

const TRIP_TYPE_OPTIONS: [TripType, string][] = [
  ['domestic', 'Domestic'],
  ['international', "Int'l"],
  ['dca_dassp', 'DASSP'],
];
```

Add two props to the destructured params and the prop types (after `onToggleTail`):

```ts
  tailFilter,
  onToggleTail,
  tripTypeFilter,
  onToggleTripType,
```

```ts
  tailFilter: Set<string>;
  onToggleTail: (tail: string) => void;
  tripTypeFilter: Set<TripType>;
  onToggleTripType: (t: TripType) => void;
```

Render the segment immediately after the tail-chips `</div>` (after line 49), mirroring the tail-chip styling:

```tsx
      <div className="flex gap-1">
        {TRIP_TYPE_OPTIONS.map(([value, label]) => (
          <button key={value} onClick={() => onToggleTripType(value)}
            className={`px-2.5 py-1.5 rounded-md text-xs font-medium border transition-colors ${tripTypeFilter.has(value) ? 'bg-foreground text-background border-foreground' : 'bg-background text-muted-foreground border-input hover:text-foreground hover:bg-accent'}`}>
            {label}
          </button>
        ))}
      </div>
```

- [ ] **Step 2: Add imports + state in SchedulingCommandCenter**

In `src/components/scheduling-command/SchedulingCommandCenter.tsx`, add imports (after line 22 `import { buildRunBoard, type RunTask } from './runBoardSelectors';`):

```ts
import { buildUpcomingBoard } from './upcomingLanesSelectors';
import { UpcomingLanes } from './UpcomingLanes';
import { matchesTripTypeFilter } from './tripFilters';
import type { TripType } from '../../scheduling/engine';
```

Extend the `Surface` type (line 24):

```ts
type Surface = 'schedule' | 'upcoming' | 'action' | 'templates' | 'inbox' | 'foreflight';
```

Add filter state next to `tailFilter` (after line 52):

```ts
  const [tripTypeFilter, setTripTypeFilter] = useState<Set<TripType>>(new Set());
```

- [ ] **Step 3: Add the filter predicate, memo, and toggle**

In the `filteredTrips` useMemo (after the `tailFilter` guard on line 99), add:

```ts
    if (!matchesTripTypeFilter(t.tripType, tripTypeFilter)) return false;
```

Add `tripTypeFilter` to that memo's dependency array (line 111 currently `[trips, tailFilter, actionRequiredOnly, searchTerm]`):

```ts
  }), [trips, tailFilter, tripTypeFilter, actionRequiredOnly, searchTerm]);
```

Add the upcoming model memo right after the `runModel` memo (after line 117):

```ts
  const upcomingModel = useMemo(
    () => buildUpcomingBoard(filteredTrips, nowMs, horizonDays),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filteredTrips, horizonDays],
  );
```

Add the toggle next to `toggleTail` (after line 129):

```ts
  const toggleTripType = (t: TripType) =>
    setTripTypeFilter(prev => { const s = new Set(prev); s.has(t) ? s.delete(t) : s.add(t); return s; });
```

- [ ] **Step 4: Add the surface tab + filter-bar wiring + render**

Update `showsFilterBar` (line 141):

```ts
  const showsFilterBar = surface === 'schedule' || surface === 'upcoming' || surface === 'action';
```

Update the primary `Tabs` value (line 160) to keep the tab highlighted on the upcoming surface:

```tsx
        <Tabs value={surface === 'schedule' || surface === 'upcoming' || surface === 'action' ? surface : ''} className="w-auto">
```

Add a `TabsTrigger` for Upcoming between Schedule and Action Center (after the Schedule trigger, line 164). Use the existing `CalendarClock`-style icon already imported — add `CalendarClock` to the lucide import on line 3, then:

```tsx
            <TabsTrigger value="upcoming" onClick={() => setSurface('upcoming')}>
              <CalendarClock className="h-4 w-4 mr-1.5" /> Upcoming
            </TabsTrigger>
```

(Extend the line 3 import to include `CalendarClock`.)

Pass the new props to `FilterBar` (inside the `<FilterBar .../>` block, after `onToggleTail={toggleTail}` on line 201):

```tsx
          tailFilter={tailFilter} onToggleTail={toggleTail}
          tripTypeFilter={tripTypeFilter} onToggleTripType={toggleTripType}
```

Render the surface (after the `surface === 'schedule' && scheduleView === 'list'` block, before the `surface === 'action'` block, ~line 216):

```tsx
      {surface === 'upcoming' && (
        <UpcomingLanes model={upcomingModel} onOpenTrip={openTrip} />
      )}
```

- [ ] **Step 5: Type-check and run the full test suite**

Run: `npm run type-check && npm test`
Expected: type-check clean; all tests pass (including Tasks 1–3).

- [ ] **Step 6: Verify in the running app**

Run: `npm run dev` (port 5199). Open `/scheduling-command`, sign in with a scheduling/admin role. Confirm:
- A new **Upcoming** tab sits between Schedule and Action Center.
- It shows three lanes (This week / Next week / Later this month); trips carry a soonest-action badge; a "N more" prompt appears when a lane has > 6 trips.
- The filter bar shows Domestic / Int'l / DASSP chips; toggling them filters every surface (Schedule, Upcoming, Action Center).
- If any trip has an overdue task, the slim red strip appears above the lanes; clicking it opens that trip.

- [ ] **Step 7: Commit**

```bash
git add src/components/scheduling-command/FilterBar.tsx src/components/scheduling-command/SchedulingCommandCenter.tsx
git commit -m "feat(scheduling): add Upcoming surface + global trip-type filter to the command center"
```

---

## Assumptions carried from the spec (confirm during review)
- **A1** Quiet "nothing-due" trips appear in Upcoming, laned by departure, rendered muted (vs. omitting them). *Implemented as shown; flip by dropping the `else if` quiet-card branch in `buildUpcomingBoard`.*
- **A2** Badge count = open actions due within the lane's window (not lifetime backlog). *Implemented via `countInWindow`.*
- **A3** Window boundaries 7 / 14 / 30 days. *Named constants in `UPCOMING_WINDOWS` — one-line change.*
- **A4** Recurring daily/monthly office ticklers stay in the Action Center, not the Upcoming lanes. *Implemented — `buildUpcomingBoard` takes only trips.*

## Self-review
- **Spec coverage:** (a) due-soon-not-overdue → lanes + overdue strip (Tasks 2, 4); (b) intl/domestic filter → Tasks 1, 3, 5; (c) clutter / which-trip-has-an-action → per-trip cards + badges + "N more" (Tasks 2, 4); placement as a new view → Task 5; the `runBoardSelectors.ts:75` mislabel is superseded by explicit windows (Task 2). All covered.
- **Placeholder scan:** none — every code step carries full code and exact commands.
- **Type consistency:** `BoardTrip.tripType` (T1) is consumed by `matchesTripTypeFilter` (T3) and the predicate (T5); `buildUpcomingBoard`/`UpcomingModel` (T2) are consumed unchanged by `UpcomingLanes` (T4) and the memo (T5); `onOpenTrip(tripId, taskId?)` matches the existing `openTrip` signature in `SchedulingCommandCenter.tsx:119`.
