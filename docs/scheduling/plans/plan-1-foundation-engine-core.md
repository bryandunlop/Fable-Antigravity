# Foundation Engine Core — Implementation Plan (Plan 1 of 3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the pure, framework-free checklist/task engine that powers both the recurring scheduler run-board and per-trip checklists — dueRule computation, condition evaluation, template instantiation, time-trigger/escalation evaluation, readiness derivation, and audited task transitions — with full unit-test coverage and zero DB/UI dependencies.

**Architecture:** A set of pure TypeScript modules under `src/scheduling/engine/`. Every function takes its inputs (including "now") explicitly and returns new values — no `Date.now()`, no I/O, no React, no DB. This is the correctness-critical core; Plans 2 (data layer) and 3 (workspace UI) consume it. Mirrors the existing, well-tested `src/components/tech-log/engine/` pattern (co-located `*.ts` + `*.test.ts`).

**Tech Stack:** TypeScript, `date-fns` (already a dependency — do NOT add new deps), Vitest (`npm test`).

Reference spec: `docs/scheduling/foundation-scheduling-workspace-design.md` (§7 engine, §4 constraints). Section tags like "§7" in test names mirror the tech-log convention.

## Global Constraints

Every task's requirements implicitly include these (copied from the spec):

- **Prototype for developer handoff** — optimize for clarity + a genuine data flow; keep the dev role-switch. Do not build Entra/Azure/Key Vault.
- **Pure engine, no `Date.now()`** — every function receives `nowUtc` (ISO string) explicitly. This makes the engine deterministic and testable. Never call `new Date()` with no args or `Date.now()` inside engine modules.
- **No new dependencies** — use `date-fns` (already present). Do not add `date-fns-tz`, `luxon`, `temporal`, etc.
- **Timezone as a fixed offset** — the scheduling office's local time is passed as `officeTzOffsetMinutes` (e.g. `-240` for EDT). Full IANA/DST/multi-zone handling is a documented productionize note, NOT built here.
- **Everything-is-data** — the engine never hardcodes checklist content. Templates/task-definitions are passed in as data.
- **Point-in-time** — a `TaskInstance` stamps and retains the `templateVersion` it was created from; nothing mutates instances when a template later changes.
- **Test conventions** — Vitest, co-located `*.test.ts`, `import { describe, it, expect } from 'vitest'`. Run with `npm test`. Path alias `@/*` → `./src/*` (but engine modules import each other by relative path, matching tech-log).

---

## File Structure

All under `src/scheduling/engine/` (new directory — this is the fresh, canonical scheduling domain):

- `types.ts` — all engine types (DueRule, Condition, TaskDefinition, ChecklistTemplate, TaskInstance, TripContext, Readiness, etc.). No logic. The shared contract for every other module.
- `dueDates.ts` + `dueDates.test.ts` — `computeDueAtUtc(rule, ctx)`.
- `conditions.ts` + `conditions.test.ts` — `evaluateCondition(cond, trip)`.
- `instantiate.ts` + `instantiate.test.ts` — `instantiateRecurring(...)`, `instantiatePerTrip(...)`.
- `triggers.ts` + `triggers.test.ts` — `evaluateTriggers(...)`, `computeEscalations(...)`.
- `readiness.ts` + `readiness.test.ts` — `deriveSchedulingReadiness(...)`.
- `tasks.ts` + `tasks.test.ts` — `applyTaskAction(...)` (audited status/ack transitions).
- `index.ts` — barrel re-export.

Each task creates one logic module + its test. `types.ts` is created in Task 1 and extended (append-only) by later tasks; because it is pure type declarations, its "test" is that the consuming module's tests compile and pass.

---

## Task 1: DueRule types + `computeDueAtUtc`

**Files:**
- Create: `src/scheduling/engine/types.ts`
- Create: `src/scheduling/engine/dueDates.ts`
- Test: `src/scheduling/engine/dueDates.test.ts`

**Interfaces:**
- Consumes: nothing (first task).
- Produces:
  - Types in `types.ts`: `DueRule` (discriminated union, `kind` in `dayOfTimeLocal | weekday | dayOfMonth | quarterWeek | annualDate | hoursBeforeEtd | businessDaysBeforeEtd | monthsBeforeEtd`), `Weekday = 'MON'|'TUE'|'WED'|'THU'|'FRI'|'SAT'|'SUN'`, `DueContext { nowUtc: string; etdUtc?: string; officeTzOffsetMinutes: number }`.
  - `computeDueAtUtc(rule: DueRule, ctx: DueContext): string` (returns ISO UTC, e.g. `2026-06-30T19:00:00.000Z`).

- [ ] **Step 1: Write the failing test**

Create `src/scheduling/engine/dueDates.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { computeDueAtUtc } from './dueDates';
import type { DueContext } from './types';

// EDT: local = UTC-4h => offset -240 min. All "local" times below are office-local (Eastern).
const ctx = (over: Partial<DueContext> = {}): DueContext => ({
  nowUtc: '2026-06-30T12:00:00.000Z', // Tue 2026-06-30, 08:00 EDT
  officeTzOffsetMinutes: -240,
  ...over,
});

describe('computeDueAtUtc §7', () => {
  it('dayOfTimeLocal: 15:00 office-local on the reference local date -> UTC', () => {
    // 15:00 EDT on 2026-06-30 == 19:00 UTC
    const r = computeDueAtUtc({ kind: 'dayOfTimeLocal', time: '15:00' }, ctx());
    expect(r).toBe('2026-06-30T19:00:00.000Z');
  });

  it('weekday MON of the reference week at 09:00 local', () => {
    // Reference week containing Tue 2026-06-30 -> Monday is 2026-06-29; 09:00 EDT == 13:00 UTC
    const r = computeDueAtUtc({ kind: 'weekday', day: 'MON' }, ctx());
    expect(r).toBe('2026-06-29T13:00:00.000Z');
  });

  it('weekday FRI PM -> 17:00 local', () => {
    // Friday of the ref week is 2026-07-03; 17:00 EDT == 21:00 UTC
    const r = computeDueAtUtc({ kind: 'weekday', day: 'FRI', period: 'PM' }, ctx());
    expect(r).toBe('2026-07-03T21:00:00.000Z');
  });

  it('dayOfMonth before the 15th -> 17:00 local on the 15th of the ref month', () => {
    const r = computeDueAtUtc({ kind: 'dayOfMonth', day: 15, when: 'before' }, ctx());
    expect(r).toBe('2026-06-15T21:00:00.000Z');
  });

  it('quarterWeek 1 -> first day of ref quarter at 17:00 local', () => {
    // 2026-06-30 is in Q2 (Apr-Jun); quarter start 2026-04-01; 17:00 EDT == 21:00 UTC
    const r = computeDueAtUtc({ kind: 'quarterWeek', week: 1 }, ctx());
    expect(r).toBe('2026-04-01T21:00:00.000Z');
  });

  it('annualDate Mar 31 -> 17:00 local of the ref year', () => {
    // Mar 31 is EDT (DST) but offset is caller-supplied; with -240 => 21:00 UTC
    const r = computeDueAtUtc({ kind: 'annualDate', month: 3, day: 31 }, ctx());
    expect(r).toBe('2026-03-31T21:00:00.000Z');
  });

  it('hoursBeforeEtd 24 -> pure UTC subtraction from ETD', () => {
    const r = computeDueAtUtc(
      { kind: 'hoursBeforeEtd', hours: 24 },
      ctx({ etdUtc: '2026-07-10T14:00:00.000Z' }),
    );
    expect(r).toBe('2026-07-09T14:00:00.000Z');
  });

  it('businessDaysBeforeEtd 1: weekday ETD -> previous weekday at 12:00 local', () => {
    // ETD Wed 2026-07-08; 1 business day before = Tue 2026-07-07; 12:00 EDT == 16:00 UTC
    const r = computeDueAtUtc(
      { kind: 'businessDaysBeforeEtd', days: 1 },
      ctx({ etdUtc: '2026-07-08T14:00:00.000Z' }),
    );
    expect(r).toBe('2026-07-07T16:00:00.000Z');
  });

  it('businessDaysBeforeEtd 1: Sunday ETD naturally lands on Friday (weekends skipped)', () => {
    // ETD Sun 2026-07-12; stepping back 1 business day skips Sat 07-11 -> Fri 2026-07-10, 12:00 local
    const r = computeDueAtUtc(
      { kind: 'businessDaysBeforeEtd', days: 1 },
      ctx({ etdUtc: '2026-07-12T14:00:00.000Z' }),
    );
    expect(r).toBe('2026-07-10T16:00:00.000Z');
  });

  it('monthsBeforeEtd 1 -> ETD minus one month at 12:00 local', () => {
    // ETD 2026-08-10 -> 2026-07-10, 12:00 EDT == 16:00 UTC
    const r = computeDueAtUtc(
      { kind: 'monthsBeforeEtd', months: 1 },
      ctx({ etdUtc: '2026-08-10T14:00:00.000Z' }),
    );
    expect(r).toBe('2026-07-10T16:00:00.000Z');
  });

  it('throws if an ETD-relative rule is given no etdUtc', () => {
    expect(() => computeDueAtUtc({ kind: 'hoursBeforeEtd', hours: 24 }, ctx())).toThrow(/etdUtc/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- dueDates`
Expected: FAIL — `computeDueAtUtc` / `./types` not found.

- [ ] **Step 3: Create the shared types file**

Create `src/scheduling/engine/types.ts`:

```ts
// Engine-wide types. Pure declarations, no logic. Extended (append-only) by later tasks.

export type Weekday = 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN';

export type DueRule =
  | { kind: 'dayOfTimeLocal'; time: string /* 'HH:MM' 24h, office-local */ }
  | { kind: 'weekday'; day: Weekday; period?: 'AM' | 'PM' }
  | { kind: 'dayOfMonth'; day: number; when: 'before' | 'onOrBefore' | 'around' }
  | { kind: 'quarterWeek'; week: number /* 1 = first week of the quarter */ }
  | { kind: 'annualDate'; month: number /* 1-12 */; day: number }
  | { kind: 'hoursBeforeEtd'; hours: number }
  | { kind: 'businessDaysBeforeEtd'; days: number }
  | { kind: 'monthsBeforeEtd'; months: number };

export interface DueContext {
  /** Reference "now" (ISO UTC). For recurring tasks this is the duty day being generated. */
  nowUtc: string;
  /** Earliest departure / ETD (ISO UTC). Required for *BeforeEtd rules. */
  etdUtc?: string;
  /** Scheduling office local offset in minutes vs UTC for the reference date (e.g. -240 for EDT). */
  officeTzOffsetMinutes: number;
}
```

- [ ] **Step 4: Implement `computeDueAtUtc`**

Create `src/scheduling/engine/dueDates.ts`:

```ts
import type { DueRule, DueContext, Weekday } from './types';

const WEEKDAY_INDEX: Record<Weekday, number> = {
  SUN: 0, MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6,
};
const DAY_MS = 86_400_000;

/** Build an ISO-UTC string from an office-local wall clock (Y/M/D H:M) + offset. */
function localWallClockToUtc(
  year: number, month1: number, day: number, hh: number, mm: number, offsetMinutes: number,
): string {
  // Interpret the wall clock as if it were UTC, then remove the office offset to get true UTC.
  const asIfUtcMs = Date.UTC(year, month1 - 1, day, hh, mm, 0, 0);
  return new Date(asIfUtcMs - offsetMinutes * 60_000).toISOString();
}

/**
 * A Date whose UTC fields equal the office-local wall clock of `iso`.
 * ALL calendar math below reads UTC fields only (getUTC*, Date.UTC, ms arithmetic),
 * so results are independent of the machine/CI timezone. Do NOT introduce date-fns
 * local-tz helpers (startOfWeek, getDay, startOfQuarter, subMonths) here.
 */
function localClock(iso: string, offsetMinutes: number): Date {
  return new Date(new Date(iso).getTime() + offsetMinutes * 60_000);
}

function parseTime(t: string): { hh: number; mm: number } {
  const [hh, mm] = t.split(':').map(Number);
  return { hh, mm };
}

export function computeDueAtUtc(rule: DueRule, ctx: DueContext): string {
  const off = ctx.officeTzOffsetMinutes;
  const ref = localClock(ctx.nowUtc, off);
  const y = ref.getUTCFullYear();
  const m1 = ref.getUTCMonth() + 1;
  const d = ref.getUTCDate();

  const requireEtd = (): string => {
    if (!ctx.etdUtc) throw new Error(`DueRule '${rule.kind}' requires ctx.etdUtc`);
    return ctx.etdUtc;
  };

  switch (rule.kind) {
    case 'dayOfTimeLocal': {
      const { hh, mm } = parseTime(rule.time);
      return localWallClockToUtc(y, m1, d, hh, mm, off);
    }
    case 'weekday': {
      // Monday-based week containing the reference local date.
      const fromMonday = (ref.getUTCDay() + 6) % 7; // days since Monday
      const monday = new Date(ref.getTime() - fromMonday * DAY_MS);
      const offsetDays = (WEEKDAY_INDEX[rule.day] + 6) % 7; // Mon=0 .. Sun=6
      const target = new Date(monday.getTime() + offsetDays * DAY_MS);
      const hh = rule.period === 'PM' ? 17 : 9;
      return localWallClockToUtc(
        target.getUTCFullYear(), target.getUTCMonth() + 1, target.getUTCDate(), hh, 0, off,
      );
    }
    case 'dayOfMonth': {
      const hh = rule.when === 'around' ? 12 : 17;
      return localWallClockToUtc(y, m1, rule.day, hh, 0, off);
    }
    case 'quarterWeek': {
      const qStartMonth1 = Math.floor((m1 - 1) / 3) * 3 + 1; // 1,4,7,10
      const qStart = new Date(Date.UTC(y, qStartMonth1 - 1, 1));
      const target = new Date(qStart.getTime() + (rule.week - 1) * 7 * DAY_MS);
      return localWallClockToUtc(
        target.getUTCFullYear(), target.getUTCMonth() + 1, target.getUTCDate(), 17, 0, off,
      );
    }
    case 'annualDate':
      return localWallClockToUtc(y, rule.month, rule.day, 17, 0, off);
    case 'hoursBeforeEtd':
      return new Date(new Date(requireEtd()).getTime() - rule.hours * 3_600_000).toISOString();
    case 'businessDaysBeforeEtd': {
      // Step back `days` business days from ETD, skipping Sat/Sun. A Sunday ETD
      // naturally lands on the preceding Friday for days=1 (the "Fri-for-Sun" rule).
      let cursor = localClock(requireEtd(), off);
      let remaining = rule.days;
      while (remaining > 0) {
        cursor = new Date(cursor.getTime() - DAY_MS);
        const dow = cursor.getUTCDay();
        if (dow !== 0 && dow !== 6) remaining -= 1;
      }
      return localWallClockToUtc(
        cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, cursor.getUTCDate(), 12, 0, off,
      );
    }
    case 'monthsBeforeEtd': {
      const etd = localClock(requireEtd(), off);
      // Date.UTC normalizes a negative/overflowing month, so month subtraction is safe.
      const target = new Date(Date.UTC(
        etd.getUTCFullYear(), etd.getUTCMonth() - rule.months, etd.getUTCDate(),
      ));
      return localWallClockToUtc(
        target.getUTCFullYear(), target.getUTCMonth() + 1, target.getUTCDate(), 12, 0, off,
      );
    }
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- dueDates`
Expected: PASS (11 tests). All date math uses UTC fields + the caller's offset, so results are machine-timezone-independent.

- [ ] **Step 6: Commit**

```bash
git add src/scheduling/engine/types.ts src/scheduling/engine/dueDates.ts src/scheduling/engine/dueDates.test.ts
git commit -m "feat(scheduling): add engine dueRule computation (computeDueAtUtc)"
```

---

## Task 2: Condition types + `evaluateCondition`

**Files:**
- Modify: `src/scheduling/engine/types.ts` (append `Condition`, `TripContext`)
- Create: `src/scheduling/engine/conditions.ts`
- Test: `src/scheduling/engine/conditions.test.ts`

**Interfaces:**
- Consumes: `types.ts` from Task 1.
- Produces:
  - Types: `TripType = 'domestic' | 'international' | 'dca_dassp'`; `TripContext { tripId: string; tripType: TripType; tail: string; aircraftType: string; etdUtc: string; maxPaxCount: number; isWeekendDeparture: boolean }`; `Condition` (discriminated union, `kind` in `always | tripType | paxCountAtLeast | tailEquals | aircraftTypeEquals | isWeekendDeparture | allOf | anyOf | not`).
  - `evaluateCondition(cond: Condition, trip: TripContext): boolean`.

- [ ] **Step 1: Write the failing test**

Create `src/scheduling/engine/conditions.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { evaluateCondition } from './conditions';
import type { Condition, TripContext } from './types';

const trip = (over: Partial<TripContext> = {}): TripContext => ({
  tripId: 't1', tripType: 'domestic', tail: 'N1PG', aircraftType: 'G650ER',
  etdUtc: '2026-07-10T14:00:00.000Z', maxPaxCount: 4, isWeekendDeparture: false, ...over,
});

describe('evaluateCondition §7', () => {
  it('always is true', () => {
    expect(evaluateCondition({ kind: 'always' }, trip())).toBe(true);
  });
  it('tripType matches', () => {
    expect(evaluateCondition({ kind: 'tripType', equals: 'international' }, trip({ tripType: 'international' }))).toBe(true);
    expect(evaluateCondition({ kind: 'tripType', equals: 'international' }, trip())).toBe(false);
  });
  it('paxCountAtLeast', () => {
    expect(evaluateCondition({ kind: 'paxCountAtLeast', value: 7 }, trip({ maxPaxCount: 7 }))).toBe(true);
    expect(evaluateCondition({ kind: 'paxCountAtLeast', value: 7 }, trip({ maxPaxCount: 6 }))).toBe(false);
  });
  it('allOf: 7-pax G650 focus item', () => {
    const c: Condition = { kind: 'allOf', conditions: [
      { kind: 'paxCountAtLeast', value: 7 },
      { kind: 'aircraftTypeEquals', value: 'G650ER' },
    ]};
    expect(evaluateCondition(c, trip({ maxPaxCount: 7 }))).toBe(true);
    expect(evaluateCondition(c, trip({ maxPaxCount: 7, aircraftType: 'G500' }))).toBe(false);
  });
  it('anyOf and not', () => {
    expect(evaluateCondition({ kind: 'anyOf', conditions: [
      { kind: 'tripType', equals: 'dca_dassp' }, { kind: 'isWeekendDeparture' },
    ]}, trip({ isWeekendDeparture: true }))).toBe(true);
    expect(evaluateCondition({ kind: 'not', condition: { kind: 'isWeekendDeparture' } }, trip())).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- conditions`
Expected: FAIL — `evaluateCondition` not found.

- [ ] **Step 3: Extend `types.ts`**

Append to `src/scheduling/engine/types.ts`:

```ts
export type TripType = 'domestic' | 'international' | 'dca_dassp';

export interface TripContext {
  tripId: string;
  tripType: TripType;
  tail: string;
  aircraftType: string;
  etdUtc: string;
  maxPaxCount: number;
  isWeekendDeparture: boolean;
}

export type Condition =
  | { kind: 'always' }
  | { kind: 'tripType'; equals: TripType }
  | { kind: 'paxCountAtLeast'; value: number }
  | { kind: 'tailEquals'; value: string }
  | { kind: 'aircraftTypeEquals'; value: string }
  | { kind: 'isWeekendDeparture' }
  | { kind: 'allOf'; conditions: Condition[] }
  | { kind: 'anyOf'; conditions: Condition[] }
  | { kind: 'not'; condition: Condition };
```

- [ ] **Step 4: Implement `evaluateCondition`**

Create `src/scheduling/engine/conditions.ts`:

```ts
import type { Condition, TripContext } from './types';

export function evaluateCondition(cond: Condition, trip: TripContext): boolean {
  switch (cond.kind) {
    case 'always': return true;
    case 'tripType': return trip.tripType === cond.equals;
    case 'paxCountAtLeast': return trip.maxPaxCount >= cond.value;
    case 'tailEquals': return trip.tail === cond.value;
    case 'aircraftTypeEquals': return trip.aircraftType === cond.value;
    case 'isWeekendDeparture': return trip.isWeekendDeparture;
    case 'allOf': return cond.conditions.every((c) => evaluateCondition(c, trip));
    case 'anyOf': return cond.conditions.some((c) => evaluateCondition(c, trip));
    case 'not': return !evaluateCondition(cond.condition, trip);
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- conditions`
Expected: PASS (5 tests).

- [ ] **Step 6: Commit**

```bash
git add src/scheduling/engine/types.ts src/scheduling/engine/conditions.ts src/scheduling/engine/conditions.test.ts
git commit -m "feat(scheduling): add engine condition evaluation"
```

---

## Task 3: Template/instance types + `instantiateRecurring` & `instantiatePerTrip`

**Files:**
- Modify: `src/scheduling/engine/types.ts` (append template/task/instance types)
- Create: `src/scheduling/engine/instantiate.ts`
- Test: `src/scheduling/engine/instantiate.test.ts`

**Interfaces:**
- Consumes: `computeDueAtUtc` (Task 1), `evaluateCondition` (Task 2), types.
- Produces:
  - Types: `RecurringScope = 'daily'|'monthly'|'quarterly'`; `OwnerRole = string`; `HandoffChannel = 'inbox'|'teams'|'email'`; `HandoffTarget { kind:'role'|'dept'|'person'; value:string; channel?: HandoffChannel }`; `EscalationRule { deadline: DueRule; notifyRole: OwnerRole; reason?: string }`; `TaskDefinition`; `ChecklistTemplate`; `TaskStatus`; `AckState`; `AuditEntry`; `TaskInstance`.
  - `instantiateRecurring(template: ChecklistTemplate, ctx: DueContext, idFactory: IdFactory): TaskInstance[]`
  - `instantiatePerTrip(templates: ChecklistTemplate[], trip: TripContext, ctx: DueContext, idFactory: IdFactory): TaskInstance[]`
  - `type IdFactory = (seed: string) => string` (injected — keeps instantiation deterministic in tests; production passes a UUID/`crypto.randomUUID` wrapper).

- [ ] **Step 1: Write the failing test**

Create `src/scheduling/engine/instantiate.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { instantiateRecurring, instantiatePerTrip } from './instantiate';
import type { ChecklistTemplate, TripContext, DueContext, IdFactory } from './types';

const idf: IdFactory = (seed) => `id:${seed}`;
const ctx: DueContext = { nowUtc: '2026-06-30T12:00:00.000Z', officeTzOffsetMinutes: -240 };

const daily: ChecklistTemplate = {
  id: 'tpl-daily', name: 'Scheduler Daily', triggerType: 'recurring', scope: 'daily',
  version: 3, status: 'published', effectiveFrom: '2026-01-01T00:00:00.000Z',
  taskDefinitions: [
    { id: 'd-brief', title: 'Send crew brief', ownerRole: 'scheduling', category: 'crew',
      order: 1, dueRule: { kind: 'dayOfTimeLocal', time: '15:00' }, requiresAck: true,
      escalation: { deadline: { kind: 'dayOfTimeLocal', time: '17:00' }, notifyRole: 'scheduling' },
      handoffTarget: { kind: 'role', value: 'pilot', channel: 'teams' } },
    { id: 'd-fuel', title: 'Update Lunken fuel price', ownerRole: 'scheduling', category: 'fuel',
      order: 2, dueRule: { kind: 'weekday', day: 'MON' }, requiresAck: false,
      condition: { kind: 'always' } },
  ],
};

const domesticPerTrip: ChecklistTemplate = {
  id: 'tpl-dom', name: 'Domestic Per-Trip', triggerType: 'per_trip', scope: 'domestic',
  version: 1, status: 'published', effectiveFrom: '2026-01-01T00:00:00.000Z',
  taskDefinitions: [
    { id: 't-suit', title: 'Airport suitability check', ownerRole: 'scheduling', category: 'dispatch',
      order: 1, dueRule: { kind: 'hoursBeforeEtd', hours: 24 }, requiresAck: false },
    { id: 't-7pax', title: '7-pax G650 special handling', ownerRole: 'scheduling', category: 'dispatch',
      order: 2, dueRule: { kind: 'hoursBeforeEtd', hours: 48 }, requiresAck: false,
      condition: { kind: 'allOf', conditions: [
        { kind: 'paxCountAtLeast', value: 7 }, { kind: 'aircraftTypeEquals', value: 'G650ER' },
      ]}},
  ],
};

const trip = (over: Partial<TripContext> = {}): TripContext => ({
  tripId: 'T1', tripType: 'domestic', tail: 'N1PG', aircraftType: 'G650ER',
  etdUtc: '2026-07-10T14:00:00.000Z', maxPaxCount: 4, isWeekendDeparture: false, ...over,
});

describe('instantiateRecurring §7', () => {
  it('creates one instance per task def, pinned to the template version, with computed dueAt', () => {
    const out = instantiateRecurring(daily, ctx, idf);
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({
      templateId: 'tpl-daily', templateVersion: 3, taskDefId: 'd-brief',
      tripId: null, status: 'open', ownerRole: 'scheduling', requiresAck: true, ackState: 'pending',
      dueAtUtc: '2026-06-30T19:00:00.000Z',
    });
    expect(out[0].auditTrail).toHaveLength(1);
    expect(out[0].auditTrail[0].action).toBe('created');
    // non-ack task starts ackState 'n_a'
    expect(out[1].ackState).toBe('n_a');
    expect(out[1].escalation).toBeUndefined();
    expect(out[0].escalation).toEqual({ deadline: { kind: 'dayOfTimeLocal', time: '17:00' }, notifyRole: 'scheduling' });
  });

  it('stamps runDate (office-local date) and null tripId for recurring', () => {
    const out = instantiateRecurring(daily, ctx, idf);
    expect(out[0].runDate).toBe('2026-06-30');
    expect(out[0].tripId).toBeNull();
  });
});

describe('instantiatePerTrip §7', () => {
  it('selects only matching-scope, published templates and includes only condition-passing tasks', () => {
    const out = instantiatePerTrip([domesticPerTrip], trip(), { ...ctx, etdUtc: trip().etdUtc }, idf);
    // maxPax 4 -> the 7-pax task is excluded
    expect(out.map((t) => t.taskDefId)).toEqual(['t-suit']);
    expect(out[0]).toMatchObject({ tripId: 'T1', templateVersion: 1, dueAtUtc: '2026-07-09T14:00:00.000Z', runDate: null });
  });

  it('includes conditional tasks when the trip matches', () => {
    const out = instantiatePerTrip([domesticPerTrip], trip({ maxPaxCount: 7 }), { ...ctx, etdUtc: trip().etdUtc }, idf);
    expect(out.map((t) => t.taskDefId)).toEqual(['t-suit', 't-7pax']);
  });

  it('ignores templates whose scope != tripType and non-published templates', () => {
    const intl: ChecklistTemplate = { ...domesticPerTrip, id: 'tpl-intl', scope: 'international' };
    const draft: ChecklistTemplate = { ...domesticPerTrip, id: 'tpl-draft', status: 'draft' };
    const out = instantiatePerTrip([intl, draft], trip(), { ...ctx, etdUtc: trip().etdUtc }, idf);
    expect(out).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- instantiate`
Expected: FAIL — `instantiate` module / exports not found.

- [ ] **Step 3: Extend `types.ts`**

Append to `src/scheduling/engine/types.ts`:

```ts
export type RecurringScope = 'daily' | 'monthly' | 'quarterly';
export type OwnerRole = string;
export type HandoffChannel = 'inbox' | 'teams' | 'email';

export interface HandoffTarget {
  kind: 'role' | 'dept' | 'person';
  value: string;
  channel?: HandoffChannel; // prototype delivers to 'inbox'; teams/email are productionize (Graph)
}

export interface EscalationRule {
  deadline: DueRule;      // when the unacked task escalates (e.g. 17:00 local)
  notifyRole: OwnerRole;  // who gets notified (e.g. scheduling, who then phones crew)
  reason?: string;
}

export interface TaskDefinition {
  id: string;
  title: string;
  description?: string;
  ownerRole: OwnerRole;
  category: string;
  order: number;
  dueRule: DueRule;
  requiresAck: boolean;
  escalation?: EscalationRule;
  condition?: Condition;      // undefined == always
  handoffTarget?: HandoffTarget;
  dependsOn?: string;         // task-def id
}

export interface ChecklistTemplate {
  id: string;
  name: string;
  triggerType: 'recurring' | 'per_trip';
  scope: RecurringScope | TripType; // recurring uses RecurringScope; per_trip uses TripType
  version: number;
  status: 'draft' | 'published' | 'archived';
  effectiveFrom: string; // ISO UTC
  taskDefinitions: TaskDefinition[];
}

export type TaskStatus = 'open' | 'in_progress' | 'blocked' | 'done' | 'n_a';
export type AckState = 'n_a' | 'pending' | 'acked';

export interface AuditEntry {
  atUtc: string;
  actor: string;   // person/role id; 'system' for engine-generated
  action: string;  // 'created' | 'status:done' | 'ack' | ...
  detail?: string;
}

export interface TaskInstance {
  id: string;
  templateId: string;
  templateVersion: number; // PINNED at instantiation — never mutated on template change
  taskDefId: string;
  tripId: string | null;   // null for recurring
  runDate: string | null;  // office-local YYYY-MM-DD for recurring; null for per-trip
  status: TaskStatus;
  ownerRole: OwnerRole;
  dueAtUtc: string;
  requiresAck: boolean;
  ackState: AckState;
  ackedBy?: string;
  ackedAtUtc?: string;
  completedBy?: string;
  completedAtUtc?: string;
  notes?: string;
  handoffTarget?: HandoffTarget;
  escalation?: EscalationRule;
  auditTrail: AuditEntry[];
}

export type IdFactory = (seed: string) => string;
```

- [ ] **Step 4: Implement `instantiate.ts`**

Create `src/scheduling/engine/instantiate.ts`:

```ts
import { parseISO } from 'date-fns';
import { computeDueAtUtc } from './dueDates';
import { evaluateCondition } from './conditions';
import type {
  ChecklistTemplate, TaskDefinition, TaskInstance, TripContext, DueContext, IdFactory,
} from './types';

/** Office-local YYYY-MM-DD for a UTC instant + offset. */
function officeLocalDate(iso: string, offsetMinutes: number): string {
  const local = new Date(parseISO(iso).getTime() + offsetMinutes * 60_000);
  const y = local.getUTCFullYear();
  const m = String(local.getUTCMonth() + 1).padStart(2, '0');
  const d = String(local.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function buildInstance(
  def: TaskDefinition, template: ChecklistTemplate, ctx: DueContext,
  tripId: string | null, runDate: string | null, idFactory: IdFactory,
): TaskInstance {
  const seed = `${template.id}:${template.version}:${def.id}:${tripId ?? runDate}`;
  return {
    id: idFactory(seed),
    templateId: template.id,
    templateVersion: template.version,
    taskDefId: def.id,
    tripId,
    runDate,
    status: 'open',
    ownerRole: def.ownerRole,
    dueAtUtc: computeDueAtUtc(def.dueRule, ctx),
    requiresAck: def.requiresAck,
    ackState: def.requiresAck ? 'pending' : 'n_a',
    handoffTarget: def.handoffTarget,
    escalation: def.escalation,
    auditTrail: [{ atUtc: ctx.nowUtc, actor: 'system', action: 'created' }],
  };
}

export function instantiateRecurring(
  template: ChecklistTemplate, ctx: DueContext, idFactory: IdFactory,
): TaskInstance[] {
  if (template.triggerType !== 'recurring' || template.status !== 'published') return [];
  const runDate = officeLocalDate(ctx.nowUtc, ctx.officeTzOffsetMinutes);
  return template.taskDefinitions
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((def) => buildInstance(def, template, ctx, null, runDate, idFactory));
}

export function instantiatePerTrip(
  templates: ChecklistTemplate[], trip: TripContext, ctx: DueContext, idFactory: IdFactory,
): TaskInstance[] {
  const dueCtx: DueContext = { ...ctx, etdUtc: ctx.etdUtc ?? trip.etdUtc };
  return templates
    .filter((t) => t.triggerType === 'per_trip' && t.status === 'published' && t.scope === trip.tripType)
    .flatMap((template) =>
      template.taskDefinitions
        .slice()
        .sort((a, b) => a.order - b.order)
        .filter((def) => (def.condition ? evaluateCondition(def.condition, trip) : true))
        .map((def) => buildInstance(def, template, dueCtx, trip.tripId, null, idFactory)),
    );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- instantiate`
Expected: PASS (5 tests).

- [ ] **Step 6: Commit**

```bash
git add src/scheduling/engine/types.ts src/scheduling/engine/instantiate.ts src/scheduling/engine/instantiate.test.ts
git commit -m "feat(scheduling): add recurring + per-trip checklist instantiation"
```

---

## Task 4: Time-trigger evaluator + escalations

**Files:**
- Create: `src/scheduling/engine/triggers.ts`
- Test: `src/scheduling/engine/triggers.test.ts`

**Interfaces:**
- Consumes: `computeDueAtUtc` (Task 1), types (`TaskInstance`, `DueContext`).
- Produces:
  - `type DueBucket = 'overdue' | 'due_soon' | 'upcoming'`
  - `evaluateTriggers(instances: TaskInstance[], nowUtc: string, dueSoonWindowMinutes?: number): { overdue: TaskInstance[]; dueSoon: TaskInstance[]; upcoming: TaskInstance[] }` (only considers instances with status `open`/`in_progress`/`blocked`; `done`/`n_a` are excluded).
  - `computeEscalations(instances: TaskInstance[], nowUtc: string, officeTzOffsetMinutes: number): EscalationFiring[]` where `EscalationFiring { taskInstanceId: string; notifyRole: string; reason: string }` — fires when a task `requiresAck`, is still `pending` ack, has an `escalation`, and `now >= escalation.deadline`.

- [ ] **Step 1: Write the failing test**

Create `src/scheduling/engine/triggers.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { evaluateTriggers, computeEscalations } from './triggers';
import type { TaskInstance } from './types';

const base = (over: Partial<TaskInstance>): TaskInstance => ({
  id: 'i1', templateId: 'tpl', templateVersion: 1, taskDefId: 'd', tripId: null, runDate: '2026-06-30',
  status: 'open', ownerRole: 'scheduling', dueAtUtc: '2026-06-30T19:00:00.000Z',
  requiresAck: false, ackState: 'n_a', auditTrail: [], ...over,
});

describe('evaluateTriggers §7', () => {
  const now = '2026-06-30T18:30:00.000Z';
  it('buckets overdue / due_soon / upcoming and ignores done + n_a-status tasks', () => {
    const items = [
      base({ id: 'over', dueAtUtc: '2026-06-30T17:00:00.000Z' }),
      base({ id: 'soon', dueAtUtc: '2026-06-30T18:45:00.000Z' }),
      base({ id: 'later', dueAtUtc: '2026-06-30T23:00:00.000Z' }),
      base({ id: 'done', status: 'done', dueAtUtc: '2026-06-30T17:00:00.000Z' }),
    ];
    const r = evaluateTriggers(items, now, 60);
    expect(r.overdue.map((t) => t.id)).toEqual(['over']);
    expect(r.dueSoon.map((t) => t.id)).toEqual(['soon']);
    expect(r.upcoming.map((t) => t.id)).toEqual(['later']);
  });
});

describe('computeEscalations §7', () => {
  it('fires when an ack is still pending past the escalation deadline', () => {
    const items = [
      base({ id: 'brief', requiresAck: true, ackState: 'pending',
        escalation: { deadline: { kind: 'dayOfTimeLocal', time: '17:00' }, notifyRole: 'scheduling' } }),
    ];
    // now = 17:30 EDT == 21:30 UTC, past the 17:00-local deadline
    const fired = computeEscalations(items, '2026-06-30T21:30:00.000Z', -240);
    expect(fired).toEqual([{ taskInstanceId: 'brief', notifyRole: 'scheduling', reason: 'unacked_past_deadline' }]);
  });

  it('does not fire once acked, or before the deadline', () => {
    const acked = base({ id: 'a', requiresAck: true, ackState: 'acked',
      escalation: { deadline: { kind: 'dayOfTimeLocal', time: '17:00' }, notifyRole: 'scheduling' } });
    const early = base({ id: 'e', requiresAck: true, ackState: 'pending',
      escalation: { deadline: { kind: 'dayOfTimeLocal', time: '17:00' }, notifyRole: 'scheduling' } });
    // now = 16:00 EDT == 20:00 UTC, before deadline
    expect(computeEscalations([acked, early], '2026-06-30T20:00:00.000Z', -240)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- triggers`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `triggers.ts`**

Create `src/scheduling/engine/triggers.ts`:

```ts
import { parseISO } from 'date-fns';
import { computeDueAtUtc } from './dueDates';
import type { TaskInstance } from './types';

const ACTIVE = new Set(['open', 'in_progress', 'blocked']);

export interface TriggerBuckets {
  overdue: TaskInstance[];
  dueSoon: TaskInstance[];
  upcoming: TaskInstance[];
}

export function evaluateTriggers(
  instances: TaskInstance[], nowUtc: string, dueSoonWindowMinutes = 120,
): TriggerBuckets {
  const now = parseISO(nowUtc).getTime();
  const windowMs = dueSoonWindowMinutes * 60_000;
  const out: TriggerBuckets = { overdue: [], dueSoon: [], upcoming: [] };
  for (const t of instances) {
    if (!ACTIVE.has(t.status)) continue;
    const due = parseISO(t.dueAtUtc).getTime();
    if (due < now) out.overdue.push(t);
    else if (due - now <= windowMs) out.dueSoon.push(t);
    else out.upcoming.push(t);
  }
  return out;
}

export interface EscalationFiring {
  taskInstanceId: string;
  notifyRole: string;
  reason: string;
}

export function computeEscalations(
  instances: TaskInstance[], nowUtc: string, officeTzOffsetMinutes: number,
): EscalationFiring[] {
  const now = parseISO(nowUtc).getTime();
  const fired: EscalationFiring[] = [];
  for (const t of instances) {
    if (!t.requiresAck || t.ackState !== 'pending' || !t.escalation) continue;
    const deadline = parseISO(
      computeDueAtUtc(t.escalation.deadline, { nowUtc, officeTzOffsetMinutes }),
    ).getTime();
    if (now >= deadline) {
      fired.push({ taskInstanceId: t.id, notifyRole: t.escalation.notifyRole, reason: 'unacked_past_deadline' });
    }
  }
  return fired;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- triggers`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/scheduling/engine/triggers.ts src/scheduling/engine/triggers.test.ts
git commit -m "feat(scheduling): add time-trigger buckets + ack escalation evaluation"
```

---

## Task 5: Trip readiness derivation

**Files:**
- Create: `src/scheduling/engine/readiness.ts`
- Test: `src/scheduling/engine/readiness.test.ts`

**Interfaces:**
- Consumes: types (`TaskInstance`).
- Produces:
  - `type ReadinessState = 'READY' | 'NOT_READY' | 'BLOCKED'`
  - `interface Readiness { state: ReadinessState; blocker?: string; completion: number /* 0..1 */ }`
  - `deriveSchedulingReadiness(tripTaskInstances: TaskInstance[]): Readiness` — precedence: any `blocked` task → `BLOCKED` (blocker = first blocked task's id); else any non-`done`/`n_a` task → `NOT_READY`; else `READY`. `completion` = done+n_a over total.

- [ ] **Step 1: Write the failing test**

Create `src/scheduling/engine/readiness.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { deriveSchedulingReadiness } from './readiness';
import type { TaskInstance } from './types';

const t = (over: Partial<TaskInstance>): TaskInstance => ({
  id: 'i', templateId: 'tpl', templateVersion: 1, taskDefId: 'd', tripId: 'T1', runDate: null,
  status: 'open', ownerRole: 'scheduling', dueAtUtc: '2026-07-01T00:00:00.000Z',
  requiresAck: false, ackState: 'n_a', auditTrail: [], ...over,
});

describe('deriveSchedulingReadiness §7', () => {
  it('READY when every task is done or n_a', () => {
    const r = deriveSchedulingReadiness([t({ id: 'a', status: 'done' }), t({ id: 'b', status: 'n_a' })]);
    expect(r.state).toBe('READY');
    expect(r.completion).toBe(1);
  });
  it('NOT_READY with open tasks, completion computed', () => {
    const r = deriveSchedulingReadiness([t({ id: 'a', status: 'done' }), t({ id: 'b', status: 'open' })]);
    expect(r.state).toBe('NOT_READY');
    expect(r.completion).toBe(0.5);
  });
  it('BLOCKED beats NOT_READY and names the blocker', () => {
    const r = deriveSchedulingReadiness([t({ id: 'a', status: 'open' }), t({ id: 'b', status: 'blocked' })]);
    expect(r.state).toBe('BLOCKED');
    expect(r.blocker).toBe('b');
  });
  it('empty checklist is READY at completion 1', () => {
    expect(deriveSchedulingReadiness([])).toEqual({ state: 'READY', completion: 1 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- readiness`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `readiness.ts`**

Create `src/scheduling/engine/readiness.ts`:

```ts
import type { TaskInstance } from './types';

export type ReadinessState = 'READY' | 'NOT_READY' | 'BLOCKED';
export interface Readiness {
  state: ReadinessState;
  blocker?: string;
  completion: number; // 0..1
}

export function deriveSchedulingReadiness(tasks: TaskInstance[]): Readiness {
  if (tasks.length === 0) return { state: 'READY', completion: 1 };
  const settled = (s: string) => s === 'done' || s === 'n_a';
  const completion = tasks.filter((t) => settled(t.status)).length / tasks.length;

  const blocked = tasks.find((t) => t.status === 'blocked');
  if (blocked) return { state: 'BLOCKED', blocker: blocked.id, completion };

  const anyOpen = tasks.some((t) => !settled(t.status));
  return { state: anyOpen ? 'NOT_READY' : 'READY', completion };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- readiness`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/scheduling/engine/readiness.ts src/scheduling/engine/readiness.test.ts
git commit -m "feat(scheduling): add trip readiness derivation"
```

---

## Task 6: Audited task transitions

**Files:**
- Create: `src/scheduling/engine/tasks.ts`
- Test: `src/scheduling/engine/tasks.test.ts`
- Create: `src/scheduling/engine/index.ts` (barrel)

**Interfaces:**
- Consumes: types (`TaskInstance`, `AuditEntry`).
- Produces:
  - `type TaskAction = { kind: 'start' } | { kind: 'complete' } | { kind: 'block'; reason: string } | { kind: 'unblock' } | { kind: 'ack' } | { kind: 'markNa' } | { kind: 'note'; text: string }`
  - `applyTaskAction(instance: TaskInstance, action: TaskAction, actor: string, nowUtc: string): TaskInstance` — returns a NEW instance (never mutates input), appends an `AuditEntry`, and enforces rules: `ack` requires `requiresAck` (else throws); `complete` on an ack-required task with `ackState !== 'acked'` throws; `templateVersion` is never changed.

- [ ] **Step 1: Write the failing test**

Create `src/scheduling/engine/tasks.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { applyTaskAction } from './tasks';
import type { TaskInstance } from './types';

const t = (over: Partial<TaskInstance> = {}): TaskInstance => ({
  id: 'i', templateId: 'tpl', templateVersion: 2, taskDefId: 'd', tripId: null, runDate: '2026-06-30',
  status: 'open', ownerRole: 'scheduling', dueAtUtc: '2026-06-30T19:00:00.000Z',
  requiresAck: false, ackState: 'n_a', auditTrail: [{ atUtc: '2026-06-30T12:00:00.000Z', actor: 'system', action: 'created' }],
  ...over,
});
const NOW = '2026-06-30T18:00:00.000Z';

describe('applyTaskAction §7', () => {
  it('does not mutate the input and appends an audit entry', () => {
    const orig = t();
    const next = applyTaskAction(orig, { kind: 'start' }, 'user:sched1', NOW);
    expect(orig.status).toBe('open');            // input untouched
    expect(next.status).toBe('in_progress');
    expect(next.auditTrail).toHaveLength(2);
    expect(next.auditTrail[1]).toMatchObject({ actor: 'user:sched1', action: 'status:in_progress', atUtc: NOW });
    expect(next.templateVersion).toBe(2);        // pin never changes
  });

  it('ack sets ackState and requires requiresAck', () => {
    const next = applyTaskAction(t({ requiresAck: true, ackState: 'pending' }), { kind: 'ack' }, 'pilot:1', NOW);
    expect(next.ackState).toBe('acked');
    expect(next.ackedBy).toBe('pilot:1');
    expect(next.ackedAtUtc).toBe(NOW);
    expect(() => applyTaskAction(t(), { kind: 'ack' }, 'x', NOW)).toThrow(/does not require ack/i);
  });

  it('complete is blocked until an ack-required task is acked', () => {
    expect(() => applyTaskAction(t({ requiresAck: true, ackState: 'pending' }), { kind: 'complete' }, 'x', NOW))
      .toThrow(/ack/i);
    const acked = t({ requiresAck: true, ackState: 'acked' });
    const done = applyTaskAction(acked, { kind: 'complete' }, 'x', NOW);
    expect(done.status).toBe('done');
    expect(done.completedBy).toBe('x');
  });

  it('block records the reason; unblock returns to open; note appends without status change', () => {
    const blocked = applyTaskAction(t(), { kind: 'block', reason: 'awaiting slot' }, 'x', NOW);
    expect(blocked.status).toBe('blocked');
    expect(blocked.auditTrail[1].detail).toBe('awaiting slot');
    expect(applyTaskAction(blocked, { kind: 'unblock' }, 'x', NOW).status).toBe('open');
    const noted = applyTaskAction(t(), { kind: 'note', text: 'called FBO' }, 'x', NOW);
    expect(noted.status).toBe('open');
    expect(noted.notes).toBe('called FBO');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tasks`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `tasks.ts`**

Create `src/scheduling/engine/tasks.ts`:

```ts
import type { TaskInstance, AuditEntry, TaskStatus } from './types';

export type TaskAction =
  | { kind: 'start' }
  | { kind: 'complete' }
  | { kind: 'block'; reason: string }
  | { kind: 'unblock' }
  | { kind: 'ack' }
  | { kind: 'markNa' }
  | { kind: 'note'; text: string };

function withAudit(inst: TaskInstance, entry: AuditEntry): TaskInstance {
  return { ...inst, auditTrail: [...inst.auditTrail, entry] };
}

export function applyTaskAction(
  instance: TaskInstance, action: TaskAction, actor: string, nowUtc: string,
): TaskInstance {
  const audit = (act: string, detail?: string): AuditEntry => ({ atUtc: nowUtc, actor, action: act, detail });

  switch (action.kind) {
    case 'start':
      return withAudit({ ...instance, status: 'in_progress' as TaskStatus }, audit('status:in_progress'));
    case 'complete':
      if (instance.requiresAck && instance.ackState !== 'acked') {
        throw new Error('Cannot complete: task requires ack and is not acked');
      }
      return withAudit(
        { ...instance, status: 'done', completedBy: actor, completedAtUtc: nowUtc },
        audit('status:done'),
      );
    case 'block':
      return withAudit({ ...instance, status: 'blocked' }, audit('status:blocked', action.reason));
    case 'unblock':
      return withAudit({ ...instance, status: 'open' }, audit('status:open'));
    case 'ack':
      if (!instance.requiresAck) throw new Error('Task does not require ack');
      return withAudit(
        { ...instance, ackState: 'acked', ackedBy: actor, ackedAtUtc: nowUtc },
        audit('ack'),
      );
    case 'markNa':
      return withAudit({ ...instance, status: 'n_a' }, audit('status:n_a'));
    case 'note':
      return withAudit({ ...instance, notes: action.text }, audit('note', action.text));
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tasks`
Expected: PASS (4 tests).

- [ ] **Step 5: Create the barrel export**

Create `src/scheduling/engine/index.ts`:

```ts
export * from './types';
export { computeDueAtUtc } from './dueDates';
export { evaluateCondition } from './conditions';
export { instantiateRecurring, instantiatePerTrip } from './instantiate';
export { evaluateTriggers, computeEscalations } from './triggers';
export type { TriggerBuckets, EscalationFiring } from './triggers';
export { deriveSchedulingReadiness } from './readiness';
export type { ReadinessState, Readiness } from './readiness';
export { applyTaskAction } from './tasks';
export type { TaskAction } from './tasks';
```

- [ ] **Step 6: Run the full engine suite + type-check**

Run: `npm test -- src/scheduling/engine` then `npm run type-check`
Expected: All engine tests PASS; type-check clean.

- [ ] **Step 7: Commit**

```bash
git add src/scheduling/engine/tasks.ts src/scheduling/engine/tasks.test.ts src/scheduling/engine/index.ts
git commit -m "feat(scheduling): add audited task transitions + engine barrel export"
```

---

## Self-Review (completed by author)

**Spec coverage (§7 engine):** dueRule vocabulary → Task 1; conditionalOn vocabulary → Task 2; recurring + per-trip instantiation (with version pinning + conditional selection) → Task 3; time-trigger evaluator + escalation → Task 4; readiness derivation → Task 5; audited task transitions → Task 6. The `channel` hint for Teams/email delivery (§9) is on `HandoffTarget` (Task 3), consumed by the event bus in Plan 2.

**Deferred to later plans (intentional, not gaps):** persistence of templates/instances/events + the store-level point-in-time guarantee (editing a template never rewrites existing instances) → **Plan 2** (data layer). The engine already stamps `templateVersion`; the *don't-rewrite* guarantee is a store invariant. Monthly/quarterly template *content* is seed data → Plan 2. UI, run-board, template editor, handoff inboxes → **Plan 3**.

**Placeholder scan:** none — every step has complete code.

**Type consistency:** `TaskInstance`, `DueRule`, `Condition`, `ChecklistTemplate`, `TripContext`, `IdFactory` are defined once in `types.ts` and imported everywhere. `computeDueAtUtc(rule, ctx)`, `evaluateCondition(cond, trip)`, `instantiateRecurring/PerTrip`, `evaluateTriggers`, `computeEscalations`, `deriveSchedulingReadiness`, `applyTaskAction` signatures match between their producing task and the barrel in Task 6.

**Productionize note (carry to handoff doc):** `computeDueAtUtc` uses a caller-supplied fixed `officeTzOffsetMinutes` — correct for a single reference date but not DST-/multi-zone-aware. Replace with a proper tz library (Temporal or `date-fns-tz`) when productionizing, especially before international scheduling (slice 3).
```