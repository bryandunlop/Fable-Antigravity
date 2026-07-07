# Pilot trip view — two-phase (Slice 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganize the pilot's single-trip `FlightHub` into two touch-first phases (Prep / Day-of) with a day→leg stepper focused on the current leg, an outstanding-first pattern, and iPad landscape-first responsive layout — keeping all tech-log link-outs.

**Architecture:** A new pure `legContext` module drives the structure (current leg, day grouping, default phase, outstanding partition, FRAT early-submit warning). The all-legs `PreflightLegsPanel` is replaced by a `LegStepper` plus single-leg section components scoped to the selected leg; `FlightHub` becomes a header + two tabs + stepper + footer shell. No tech-log engine changes — the existing preflight actions and FRAT form are reused verbatim.

**Tech Stack:** React + TypeScript (strict), Vite, Tailwind, Vitest (node env). Code under `src/components/pilot-workspace/`.

## Global Constraints

- **Tests are pure-logic only.** Vitest runs `src/**/*.test.ts` (node env) — no DOM tests. Logic (`.ts`) gets unit tests; UI (`.tsx`) is verified by `npm run type-check` + the running app.
- **Commands:** all tests `npm test`; one file `npx vitest run <path>`; types `npm run type-check`; dev `npm run dev` (port 5199; role picker → sign in as `pilot`).
- **No tech-log engine changes.** Reuse `submitFuelOnLeg`, `markAirportReviewedOnLeg`, `completeFratOnLeg`, `saveFratDraftOnLeg` (`src/components/tech-log/preflightActions.ts`) and `StandaloneFRATForm` verbatim. Keep the "open in tech-log ↗" links.
- **Tabs are organizing defaults, never gates.** Any item is workable at any time; the default just picks the leading tab.
- **Outstanding-first:** the pilot's actionable items (fuel / FRAT / airport) lead when not done; done ones collapse behind "✓ N completed · tap to view". Trip prep (Slice 1) is all-completed reference — one collapsed block.
- **FRAT:** fill → save draft → submit; a **soft, confirmable warning** on submit more than `FRAT_EARLY_SUBMIT_WARN_HOURS` (24) before the leg's ETD; never hard-gated. Fuel keeps its 4h-before-ETD hard lock (existing).
- **iPad landscape-first, responsive to portrait**; ≥44px tap targets; leg strip scrolls horizontally.
- **Current leg** = first not-yet-departed leg (else the last). **Day grouping** keys on office-local departure date (`officeTzOffsetMinutes` from `useSchedulingWorkspace`). **Default phase:** `in_progress` or within 24h of the current leg's ETD → Day-of, else Prep.
- **Copy:** sentence case.
- **Determinism:** pure helpers take explicit `nowUtc`; no `Date.now()` inside them.

---

## File structure

- Create `src/components/pilot-workspace/legContext.ts` — pure helpers.
- Create `src/components/pilot-workspace/legContext.test.ts`.
- Create `src/components/pilot-workspace/panels/LegStepper.tsx` — day-grouped leg strip.
- Create `src/components/pilot-workspace/panels/LegFuelSection.tsx` — Prep, one leg's fuel.
- Create `src/components/pilot-workspace/panels/LegDayOfSection.tsx` — Day-of, one leg's FRAT + airport (outstanding-first, early-submit warning).
- Modify `src/components/pilot-workspace/FlightHub.tsx` — header + tabs + stepper + footer shell; remove the all-legs `PreflightLegsPanel` usage.
- `src/components/pilot-workspace/panels/PreflightLegsPanel.tsx` — left in place (no longer mounted by `FlightHub`; the `LegDetail`/legacy routes still use nothing from it — it's only referenced by `FlightHub`). Removing its mount is enough; do not delete the file in this slice.

---

### Task 1: `legContext` pure helpers

**Files:**
- Create: `src/components/pilot-workspace/legContext.ts`
- Test: `src/components/pilot-workspace/legContext.test.ts`

**Interfaces:**
- Produces: `currentLegIndex(legs, nowUtc)`, `groupLegsByDay(legs, officeTzOffsetMinutes)`, `defaultPhase(tripStatus, currentLegEtdUtc, nowUtc, thresholdHours?)`, `partitionOutstanding(items)`, `fratEarlySubmitWarning(nowUtc, etdUtc, thresholdHours?)`, const `FRAT_EARLY_SUBMIT_WARN_HOURS = 24`. Consumed by Tasks 2–4.

- [ ] **Step 1: Write the failing test**

Create `src/components/pilot-workspace/legContext.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  currentLegIndex, groupLegsByDay, defaultPhase, partitionOutstanding, fratEarlySubmitWarning,
} from './legContext';

const leg = (dep: string) => ({ departureTimeUtc: dep });

describe('currentLegIndex', () => {
  const NOW = '2026-07-09T12:00:00.000Z';
  it('picks the first leg not yet departed', () => {
    const legs = [leg('2026-07-09T06:00:00.000Z'), leg('2026-07-09T18:00:00.000Z'), leg('2026-07-10T06:00:00.000Z')];
    expect(currentLegIndex(legs, NOW)).toBe(1);
  });
  it('returns the last leg when all have departed', () => {
    const legs = [leg('2026-07-08T06:00:00.000Z'), leg('2026-07-09T06:00:00.000Z')];
    expect(currentLegIndex(legs, NOW)).toBe(1);
  });
  it('returns -1 for no legs; treats a leg departing exactly now as current', () => {
    expect(currentLegIndex([], NOW)).toBe(-1);
    expect(currentLegIndex([leg(NOW)], NOW)).toBe(0);
  });
});

describe('groupLegsByDay', () => {
  it('groups by office-local departure date and keeps the original index', () => {
    // office offset -240 (EDT): 2026-07-10T02:00Z is still Jul 9 local
    const legs = [leg('2026-07-09T18:00:00.000Z'), leg('2026-07-10T02:00:00.000Z'), leg('2026-07-10T18:00:00.000Z')];
    const groups = groupLegsByDay(legs, -240);
    expect(groups.map(g => g.dayKey)).toEqual(['2026-07-09', '2026-07-10']);
    expect(groups[0].legs.map(x => x.index)).toEqual([0, 1]); // first two are the same local day
    expect(groups[1].legs.map(x => x.index)).toEqual([2]);
  });
});

describe('defaultPhase', () => {
  const NOW = '2026-07-09T12:00:00.000Z';
  it('is day-of when the trip is in progress', () => {
    expect(defaultPhase('in_progress', '2026-07-20T00:00:00.000Z', NOW)).toBe('day-of');
  });
  it('is day-of within the threshold and prep beyond it', () => {
    expect(defaultPhase('confirmed', '2026-07-09T20:00:00.000Z', NOW)).toBe('day-of'); // 8h out
    expect(defaultPhase('confirmed', '2026-07-12T12:00:00.000Z', NOW)).toBe('prep');   // 3d out
  });
  it('is prep when there is no current leg ETD', () => {
    expect(defaultPhase('confirmed', undefined, NOW)).toBe('prep');
  });
});

describe('partitionOutstanding', () => {
  it('splits not-done (outstanding) from done, preserving order', () => {
    const items = [{ id: 'a', done: false }, { id: 'b', done: true }, { id: 'c', done: false }];
    const { outstanding, done } = partitionOutstanding(items);
    expect(outstanding.map(i => i.id)).toEqual(['a', 'c']);
    expect(done.map(i => i.id)).toEqual(['b']);
  });
});

describe('fratEarlySubmitWarning', () => {
  const NOW = '2026-07-09T12:00:00.000Z';
  it('warns when submitting more than the threshold before ETD, not within it', () => {
    expect(fratEarlySubmitWarning(NOW, '2026-07-11T12:00:00.000Z')).toBe(true);  // 48h out
    expect(fratEarlySubmitWarning(NOW, '2026-07-09T20:00:00.000Z')).toBe(false); // 8h out
    expect(fratEarlySubmitWarning(NOW, '2026-07-10T12:00:00.000Z')).toBe(false); // exactly 24h → not > threshold
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run src/components/pilot-workspace/legContext.test.ts`
Expected: FAIL — module `./legContext` does not exist.

- [ ] **Step 3: Write the helpers**

Create `src/components/pilot-workspace/legContext.ts`:

```ts
export const FRAT_EARLY_SUBMIT_WARN_HOURS = 24;

/** Index of the first leg not yet departed (the leg to prep/fly); the last leg if all have departed; -1 if none. */
export function currentLegIndex(legs: { departureTimeUtc: string }[], nowUtc: string): number {
  if (legs.length === 0) return -1;
  const now = new Date(nowUtc).getTime();
  const idx = legs.findIndex((l) => new Date(l.departureTimeUtc).getTime() >= now);
  return idx === -1 ? legs.length - 1 : idx;
}

/** Group legs by their office-local departure date, preserving each leg's original index. */
export function groupLegsByDay<T extends { departureTimeUtc: string }>(
  legs: T[], officeTzOffsetMinutes: number,
): { dayKey: string; legs: { leg: T; index: number }[] }[] {
  const groups: { dayKey: string; legs: { leg: T; index: number }[] }[] = [];
  legs.forEach((leg, index) => {
    const localMs = new Date(leg.departureTimeUtc).getTime() + officeTzOffsetMinutes * 60_000;
    const dayKey = new Date(localMs).toISOString().slice(0, 10);
    let g = groups.find((x) => x.dayKey === dayKey);
    if (!g) { g = { dayKey, legs: [] }; groups.push(g); }
    g.legs.push({ leg, index });
  });
  return groups;
}

/** Which phase leads: day-of when in progress or within the threshold of the current leg's ETD, else prep. */
export function defaultPhase(
  tripStatus: string,
  currentLegEtdUtc: string | undefined,
  nowUtc: string,
  thresholdHours: number = 24,
): 'prep' | 'day-of' {
  if (tripStatus === 'in_progress') return 'day-of';
  if (!currentLegEtdUtc) return 'prep';
  const hoursUntil = (new Date(currentLegEtdUtc).getTime() - new Date(nowUtc).getTime()) / 3_600_000;
  return hoursUntil <= thresholdHours ? 'day-of' : 'prep';
}

/** Split the pilot's actionable items into outstanding (not done, leading) and done (collapsed), order preserved. */
export function partitionOutstanding<T extends { done: boolean }>(items: T[]): { outstanding: T[]; done: T[] } {
  return { outstanding: items.filter((i) => !i.done), done: items.filter((i) => i.done) };
}

/** A6 soft warning: true when a final FRAT submit is more than `thresholdHours` before the leg's ETD. */
export function fratEarlySubmitWarning(
  nowUtc: string, etdUtc: string, thresholdHours: number = FRAT_EARLY_SUBMIT_WARN_HOURS,
): boolean {
  const hoursUntil = (new Date(etdUtc).getTime() - new Date(nowUtc).getTime()) / 3_600_000;
  return hoursUntil > thresholdHours;
}
```

- [ ] **Step 4: Run the tests and the type-check**

Run: `npx vitest run src/components/pilot-workspace/legContext.test.ts && npm run type-check`
Expected: PASS (all cases); type-check clean for the new files (repo has ~264 pre-existing `src/components/ui/*` errors — ignore).

- [ ] **Step 5: Commit**

```bash
git add src/components/pilot-workspace/legContext.ts src/components/pilot-workspace/legContext.test.ts
git commit -m "feat(pilot): legContext helpers — current leg, day grouping, phase, outstanding, FRAT warn"
```

---

### Task 2: `LegStepper` component

**Files:**
- Create: `src/components/pilot-workspace/panels/LegStepper.tsx`

**Interfaces:**
- Consumes: `groupLegsByDay` from `../legContext`; the tech-log `TripLeg` type from `../../tech-log/types`.
- Produces: `export function LegStepper({ legs, currentIndex, selectedIndex, officeTzOffsetMinutes, onSelect }: { legs: TripLeg[]; currentIndex: number; selectedIndex: number; officeTzOffsetMinutes: number; onSelect: (index: number) => void })`. Consumed by Task 4.

> No unit test — `.tsx` (Vitest is node-only). Verify by `npm run type-check`.

- [ ] **Step 1: Write the component**

Create `src/components/pilot-workspace/panels/LegStepper.tsx`:

```tsx
import { Check } from 'lucide-react';
import { groupLegsByDay } from '../legContext';
import type { TripLeg } from '../../tech-log/types';

const dayLabel = (dayKey: string) =>
  new Date(`${dayKey}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

/**
 * Day-grouped, horizontally-scrollable leg strip. Completed/departed legs before the current one
 * show a check; the current leg is highlighted; a saved-but-unsubmitted FRAT draft is flagged.
 * Tapping a leg selects it (shared across the Prep and Day-of tabs).
 */
export function LegStepper({
  legs, currentIndex, selectedIndex, officeTzOffsetMinutes, onSelect,
}: {
  legs: TripLeg[];
  currentIndex: number;
  selectedIndex: number;
  officeTzOffsetMinutes: number;
  onSelect: (index: number) => void;
}) {
  if (legs.length <= 1) return null;
  const groups = groupLegsByDay(legs, officeTzOffsetMinutes);
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1">
      {groups.map((g) => (
        <div key={g.dayKey} className="flex items-center gap-1.5 shrink-0">
          <span className="text-[11px] text-muted-foreground pr-0.5">{dayLabel(g.dayKey)}</span>
          {g.legs.map(({ leg, index }) => {
            const selected = index === selectedIndex;
            const past = index < currentIndex;
            const draft = leg.fratStatus === 'IN_PROGRESS';
            return (
              <button
                key={leg.id}
                onClick={() => onSelect(index)}
                className={`shrink-0 rounded-lg border px-3 py-2 text-xs font-medium min-h-[44px] transition-colors ${
                  selected ? 'border-primary bg-accent text-foreground'
                  : past ? 'border-input bg-muted text-muted-foreground'
                  : 'border-input bg-background text-foreground hover:bg-accent'
                }`}
              >
                <span className="inline-flex items-center gap-1">
                  {past && <Check className="h-3.5 w-3.5 text-emerald-600" />}
                  L{leg.sequence}
                  {index === currentIndex && <span className="text-[10px] text-primary">· now</span>}
                </span>
                {draft && <span className="block text-[10px] text-amber-600">draft</span>}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npm run type-check`
Expected: clean for `LegStepper.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/components/pilot-workspace/panels/LegStepper.tsx
git commit -m "feat(pilot): LegStepper — day-grouped leg strip with current-leg + draft flags"
```

---

### Task 3: single-leg Prep + Day-of sections

**Files:**
- Create: `src/components/pilot-workspace/panels/LegFuelSection.tsx`
- Create: `src/components/pilot-workspace/panels/LegDayOfSection.tsx`

**Interfaces:**
- Consumes: preflight actions from `../../tech-log/preflightActions`; `StandaloneFRATForm` from `../../StandaloneFRATForm`; `extractFratSelections` from `../../tech-log/util/fratDraft`; `newId` from `../../tech-log/util/id`; `useTechLog`, `useCurrentUser` from `../../tech-log/TechLogContext`; `fratEarlySubmitWarning` from `../legContext`; the tech-log `Trip`/`TripLeg` types.
- Produces: `export function LegFuelSection({ tlTrip, leg })` and `export function LegDayOfSection({ tlTrip, leg, tripNumber })` (props typed below). Consumed by Task 4.

> No unit test — `.tsx`. Verify by `npm run type-check`. These lift the existing per-leg logic from `PreflightLegsPanel` (verbatim actions) but scope it to a single leg.

- [ ] **Step 1: Create the fuel section**

Create `src/components/pilot-workspace/panels/LegFuelSection.tsx`:

```tsx
import { useState } from 'react';
import { toast } from 'sonner';
import { useTechLog, useCurrentUser } from '../../tech-log/TechLogContext';
import { submitFuelOnLeg } from '../../tech-log/preflightActions';
import { newId } from '../../tech-log/util/id';
import type { Trip, TripLeg } from '../../tech-log/types';

/** Prep-tab fuel submission for one leg (home-base fuel-farm). Keeps the existing 4h-before-ETD lock. */
export function LegFuelSection({ tlTrip, leg }: { tlTrip: Trip; leg: TripLeg }) {
  const { dispatch } = useTechLog();
  const user = useCurrentUser();
  const [lbs, setLbs] = useState('');

  if (leg.fuelRequestId) {
    return (
      <div className="rounded-lg border p-3 text-sm">
        <span className="font-medium">Fuel</span> <span className="text-emerald-700">· submitted to {leg.departureIcao} fuel farm</span>
      </div>
    );
  }
  return (
    <div className="rounded-lg border p-3">
      <div className="text-sm font-medium mb-1">Fuel request <span className="text-xs text-muted-foreground">{leg.departureIcao} fuel farm</span></div>
      <div className="flex items-center gap-2">
        <input value={lbs} onChange={(e) => setLbs(e.target.value)} placeholder="lb"
          className="w-24 text-sm rounded border px-2 py-2 min-h-[44px]" />
        <button className="text-sm rounded border px-3 py-2 min-h-[44px] hover:bg-accent"
          onClick={() => {
            const res = submitFuelOnLeg({ dispatch, newId, trip: tlTrip, leg, actorOid: user.oid, lbs: Number(lbs), nowMs: Date.now() });
            if (!res.ok) toast.error(res.error); else toast.success(`Fuel submitted to ${leg.departureIcao} fuel farm`);
          }}>Submit fuel</button>
      </div>
      <p className="text-xs text-muted-foreground mt-1">Locks 4 hours before departure.</p>
    </div>
  );
}
```

- [ ] **Step 2: Create the day-of section**

Create `src/components/pilot-workspace/panels/LegDayOfSection.tsx`:

```tsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Check } from 'lucide-react';
import { useTechLog, useCurrentUser } from '../../tech-log/TechLogContext';
import StandaloneFRATForm from '../../StandaloneFRATForm';
import { completeFratOnLeg, markAirportReviewedOnLeg, saveFratDraftOnLeg } from '../../tech-log/preflightActions';
import { extractFratSelections } from '../../tech-log/util/fratDraft';
import { newId } from '../../tech-log/util/id';
import { fratEarlySubmitWarning } from '../legContext';
import type { Trip, TripLeg } from '../../tech-log/types';

/** Day-of actions for one leg: FRAT (fill → draft → submit, with an early-submit soft warning) + airport review.
 *  Outstanding items lead; the airport data + full FRAT page keep their tech-log links. */
export function LegDayOfSection({ tlTrip, leg, tripNumber }: { tlTrip: Trip; leg: TripLeg; tripNumber: string }) {
  const { dispatch } = useTechLog();
  const user = useCurrentUser();
  const [fratOpen, setFratOpen] = useState(false);

  const submitFrat = (totalScore?: number) => {
    if (fratEarlySubmitWarning(new Date().toISOString(), leg.departureTimeUtc)) {
      if (!window.confirm('This FRAT is being submitted well before departure — conditions may change. Submit anyway?')) return;
    }
    completeFratOnLeg({ dispatch, newId, trip: tlTrip, leg, actorOid: user.oid, totalScore });
    setFratOpen(false);
  };

  return (
    <div className="space-y-3">
      {/* FRAT */}
      <div className="rounded-lg border p-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">FRAT
            {leg.fratStatus === 'COMPLETED' && <span className="ml-2 text-xs text-emerald-700"><Check className="inline h-3.5 w-3.5" /> submitted{leg.fratScore != null ? ` · ${leg.fratScore}` : ''}</span>}
            {leg.fratStatus === 'IN_PROGRESS' && <span className="ml-2 text-xs text-amber-600">draft saved</span>}
            {leg.fratStatus === 'NOT_STARTED' && <span className="ml-2 text-xs text-amber-600">not started</span>}
          </span>
        </div>
        {leg.fratStatus !== 'COMPLETED' && (
          <button className="mt-2 text-sm rounded border px-3 py-2 min-h-[44px] hover:bg-accent"
            onClick={() => setFratOpen((o) => !o)}>
            {fratOpen ? 'Close FRAT' : leg.fratStatus === 'IN_PROGRESS' ? 'Resume FRAT (draft)' : 'Start FRAT'}
          </button>
        )}
        {fratOpen && (
          <div className="border-t mt-2 pt-2">
            <StandaloneFRATForm
              userRole={user.role}
              initialData={{ flightNumber: tripNumber, departure: leg.departureIcao, destination: leg.arrivalIcao,
                date: leg.departureTimeUtc.slice(0, 10), time: leg.departureTimeUtc.slice(11, 16), pic: user.displayName,
                selections: leg.fratDraft?.selections, mitigationNotes: leg.fratDraft?.mitigationNotes }}
              onClose={() => setFratOpen(false)}
              onSave={(data: { status?: string; totalScore?: number; mitigationNotes?: string; items?: { items: { selected: boolean }[] }[] }) => {
                if (data.status === 'submitted') {
                  submitFrat(data.totalScore);
                } else if (data.status === 'draft') {
                  saveFratDraftOnLeg({ dispatch, newId, trip: tlTrip, leg, actorOid: user.oid,
                    selections: extractFratSelections(data.items ?? []), mitigationNotes: data.mitigationNotes,
                    nowUtc: new Date().toISOString() });
                  setFratOpen(false);
                  toast.success('FRAT draft saved — resume any time before departure');
                }
              }}
            />
          </div>
        )}
      </div>

      {/* Airport review */}
      <div className="rounded-lg border p-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Airport review
            {leg.airportReviewed
              ? <span className="ml-2 text-xs text-emerald-700"><Check className="inline h-3.5 w-3.5" /> reviewed</span>
              : <span className="ml-2 text-xs text-amber-600">not reviewed</span>}
          </span>
          <Link to={`/tech-log/trips/${tlTrip.id}/legs/${leg.id}`} className="text-xs text-primary hover:underline">open details ↗</Link>
        </div>
        {!leg.airportReviewed && (
          <button className="mt-2 text-sm rounded border px-3 py-2 min-h-[44px] hover:bg-accent"
            onClick={() => markAirportReviewedOnLeg({ dispatch, newId, trip: tlTrip, leg, actorOid: user.oid })}>
            Mark airport reviewed
          </button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Type-check**

Run: `npm run type-check`
Expected: clean for both new files.

- [ ] **Step 4: Commit**

```bash
git add src/components/pilot-workspace/panels/LegFuelSection.tsx src/components/pilot-workspace/panels/LegDayOfSection.tsx
git commit -m "feat(pilot): single-leg fuel (Prep) + FRAT/airport (Day-of) sections with early-submit warning"
```

---

### Task 4: reorganize `FlightHub` into the two-phase shell

**Files:**
- Modify (rewrite): `src/components/pilot-workspace/FlightHub.tsx`

**Interfaces:**
- Consumes: `LegStepper`, `LegFuelSection`, `LegDayOfSection` (Tasks 2–3); `currentLegIndex`, `defaultPhase` (Task 1); the existing `ReadinessBar`, `TripBriefPanel`, `AircraftAcceptancePanel`, `MessagesPanel`, `ReportDefectDialog`, and readiness composition (unchanged).

> No unit test — verified by `npm run type-check` + the running app.

- [ ] **Step 1: Replace `FlightHub.tsx`**

Replace the entire contents of `src/components/pilot-workspace/FlightHub.tsx` with:

```tsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSchedulingWorkspace } from '../scheduling-workspace/SchedulingWorkspaceContext';
import { useTechLog } from '../tech-log/TechLogContext';
import { ReportDefectDialog } from '../tech-log/components/panels/ReportDefectDialog';
import { deriveTripReadiness } from '../tech-log/engine/readiness';
import { deriveSchedulingReadiness } from '../../scheduling/engine/readiness';
import { composePilotReadiness, type PilotReadiness } from './selectors';
import { currentLegIndex, defaultPhase } from './legContext';
import ReadinessBar from './ReadinessBar';
import TripBriefPanel from './panels/TripBriefPanel';
import AircraftAcceptancePanel from './panels/AircraftAcceptancePanel';
import MessagesPanel from './panels/MessagesPanel';
import { LegStepper } from './panels/LegStepper';
import { LegFuelSection } from './panels/LegFuelSection';
import { LegDayOfSection } from './panels/LegDayOfSection';
import type { TripRecord } from '../../scheduling/store/types';

export default function FlightHub({ trip, userRole }: { trip: TripRecord; userRole: string }) {
  const { store, tick, nowUtc, officeTzOffsetMinutes } = useSchedulingWorkspace();
  const { state } = useTechLog();
  const [readiness, setReadiness] = useState<PilotReadiness | null>(null);
  const [squawkOpen, setSquawkOpen] = useState(false);
  const tlTrip = state.trips.find((x) => x.tripNumber === trip.tripNumber) ?? null;
  const tlAc = state.aircraft.find((a) => a.tailNumber === trip.tail);
  const legs = tlTrip?.legs ?? [];

  const now = nowUtc();
  const currentIdx = currentLegIndex(legs, now);
  const [selectedIdx, setSelectedIdx] = useState(currentIdx < 0 ? 0 : currentIdx);
  const [phase, setPhase] = useState<'prep' | 'day-of'>(
    defaultPhase(trip.status, legs[currentIdx]?.departureTimeUtc, now),
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const sched = deriveSchedulingReadiness(await store.listInstancesForTrip(trip.id));
      const pf = tlTrip ? deriveTripReadiness(tlTrip, state, now) : null;
      if (!cancelled) setReadiness(composePilotReadiness(sched, pf));
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store, tick, state, trip]);

  const selectedLeg = legs[selectedIdx];

  return (
    <div className="space-y-4">
      {/* Always-visible header */}
      <div className="rounded-lg border p-4 space-y-3">
        <div>
          <div className="font-semibold">{trip.tripNumber} · {trip.tail} · {trip.aircraftType}</div>
          <div className="text-sm text-muted-foreground">{trip.tripType} · {legs.length} legs</div>
        </div>
        {readiness && <ReadinessBar readiness={readiness} />}
        <div className="flex gap-2">
          {(['prep', 'day-of'] as const).map((p) => (
            <button key={p} onClick={() => setPhase(p)}
              className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium min-h-[44px] transition-colors ${
                phase === p ? 'border-primary bg-accent text-foreground' : 'bg-background text-muted-foreground hover:bg-accent'}`}>
              {p === 'prep' ? 'Prep' : 'Day-of'}
            </button>
          ))}
        </div>
      </div>

      {!tlTrip && <div className="rounded-lg border p-4 text-sm text-muted-foreground">Not released to preflight yet.</div>}

      {tlTrip && (
        <>
          {legs.length > 1 && (
            <LegStepper legs={legs} currentIndex={currentIdx < 0 ? 0 : currentIdx} selectedIndex={selectedIdx}
              officeTzOffsetMinutes={officeTzOffsetMinutes} onSelect={setSelectedIdx} />
          )}

          {/* landscape: two columns; portrait: one */}
          <div className="grid grid-cols-1 landscape:grid-cols-2 gap-3">
            {phase === 'prep' ? (
              <>
                {selectedLeg && <LegFuelSection tlTrip={tlTrip} leg={selectedLeg} />}
                <TripBriefPanel trip={trip} userRole={userRole} />
              </>
            ) : (
              <>
                {selectedLeg && <LegDayOfSection tlTrip={tlTrip} leg={selectedLeg} tripNumber={trip.tripNumber} />}
                <AircraftAcceptancePanel trip={trip} />
              </>
            )}
          </div>
        </>
      )}

      {/* Always-visible footer */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3">
        <div className="flex gap-2">
          {tlAc && <button onClick={() => setSquawkOpen(true)} className="text-sm rounded border px-3 py-2 min-h-[44px] hover:bg-accent">Report a squawk</button>}
          {tlAc && <Link to="/tech-log/intermittent" className="text-sm rounded border px-3 py-2 min-h-[44px] hover:bg-accent">Log nuisance item ↗</Link>}
        </div>
      </div>
      <MessagesPanel />

      {tlAc && <ReportDefectDialog open={squawkOpen} onOpenChange={setSquawkOpen} lockTail={tlAc.tailNumber} />}
    </div>
  );
}
```

- [ ] **Step 2: Confirm the `landscape:` variant is available**

The layout uses Tailwind's `landscape:` orientation variant. Verify it is enabled (it is core in Tailwind v3+; no config needed). If `npm run type-check` and the dev build accept the class (Tailwind JIT compiles arbitrary/known variants), no action. If the build warns the variant is unknown, fall back to a width breakpoint: replace `landscape:grid-cols-2` with `md:grid-cols-2`.

- [ ] **Step 3: Type-check and run the full suite**

Run: `npm run type-check && npm test`
Expected: type-check clean for `FlightHub.tsx`; `npm test` unchanged/green (this task adds no tests and changes no logic — the Task 1 tests already pass).

- [ ] **Step 4: Verify in the running app**

Run: `npm run dev` (port 5199). Sign in as `pilot`, open a trip from My Flights. Confirm: the header shows identity + readiness + **Prep | Day-of** tabs; a multi-leg trip shows the day-grouped **leg stepper** (current leg marked "now"); **Prep** shows the selected leg's fuel + the collapsed Trip-prep; **Day-of** shows the selected leg's FRAT (Start/Resume) + airport review + the acceptance panel; the footer shows "Report a squawk" and Messages. Switch legs → per-leg content follows. Start a FRAT, save a draft → the leg chip shows "draft"; submit far from ETD → the soft warning appears.

- [ ] **Step 5: Commit**

```bash
git add src/components/pilot-workspace/FlightHub.tsx
git commit -m "feat(pilot): two-phase FlightHub — Prep/Day-of tabs, leg stepper, footer, landscape-first"
```

---

## Self-review
- **Spec coverage:** two tabs + time-aware default → Task 4 (`defaultPhase`); day→leg stepper → Tasks 1–2, 4; outstanding-first → Task 3 (fuel/FRAT/airport lead when not done) + Trip prep collapsed (Slice-1 panel, mounted in Prep); split legs panel → Task 3 sections replace the all-legs `PreflightLegsPanel` (unmounted in Task 4); squawk+messages footer → Task 4; keep tech-log links → Task 3 (airport details, FRAT full page) + Task 4 (acceptance, nuisance); iPad landscape-first → Task 4 grid; FRAT draft-then-submit + soft warning → Tasks 1 (`fratEarlySubmitWarning`) + 3; current-leg/day/phase helpers → Task 1. §6 tests all in Task 1. All spec §4 surfaces covered.
- **Placeholder scan:** none — full code for every step. (Task 3 Step 2 flags one readability line to delete; called out explicitly.)
- **Type consistency:** `legContext` signatures (T1) consumed unchanged in T2/T4; `LegStepper`/`LegFuelSection`/`LegDayOfSection` prop shapes (T2/T3) match their mounts in T4; preflight-action args (`{dispatch,newId,trip,leg,actorOid,...}`) match `preflightActions.ts`; `TripLeg`/`Trip` from `../../tech-log/types`.
- **Assumptions (spec §7):** A1 24h threshold (`defaultPhase`/`FRAT_EARLY_SUBMIT_WARN_HOURS`) · A2 Trip prep stays completed-only (the Slice-1 `TripBriefPanel` mounts unchanged in Prep) · A3 current leg = first not-departed (`currentLegIndex`) · A4 day grouping by office-local date (`groupLegsByDay`) · A5 local-state tabs (`useState` in `FlightHub`) · A6 soft warning (`fratEarlySubmitWarning` + `window.confirm`). All implemented.
