# Foundation Data Layer — Implementation Plan (Plan 2 of 3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist and orchestrate the Plan-1 engine behind a storage-agnostic `SchedulingStore` interface — with an in-memory implementation (fully testable/runnable in any environment, and the backing store for the Plan-3 demo) plus a real Drizzle/Postgres implementation written for the developer to run with a live `DATABASE_URL`. Adds the runtime validation boundary, the trip-mirror + event DTOs, and the `SchedulingService` that composes engine + store, and seeds the real daily/monthly/quarterly/domestic checklists as editable template data.

**Architecture:** A new `src/scheduling/store/` package. The `SchedulingStore` interface is the seam; the in-memory adapter is the default (no DB needed). `SchedulingService` is the only place the pure engine (`src/scheduling/engine/`) meets persistence. The Postgres adapter (new, clean scheduling tables — NOT the inventory-coupled `trips` table) implements the same interface and is swapped in when a DB exists. `parse*` functions guard every untyped deserialization boundary (a Plan-1 review requirement).

**Tech Stack:** TypeScript, Vitest (`npm test`), `drizzle-orm` (already a dependency; Postgres adapter only), Hono/Neon server pattern from `src/server/`. Consumes the Plan-1 engine barrel `src/scheduling/engine`.

Reference: spec `docs/scheduling/foundation-scheduling-workspace-design.md` (§6 data model, §7 engine, §9 event bus). Plan 1 (built): `docs/scheduling/plans/plan-1-foundation-engine-core.md`.

## Global Constraints

- **No DB in the build environment.** Tasks 1–5 and 7 MUST be testable with the in-memory store only (no `DATABASE_URL`). Task 6 (Postgres) is written and `tsc`-clean but is NOT run here — its verification is a documented developer step.
- **Storage-agnostic.** Nothing outside `src/scheduling/store/postgres.ts` + `drizzle-schema.ts` may import `drizzle-orm` or the server `db`. The service, in-memory store, validation, and seeds depend only on the `SchedulingStore` interface + engine.
- **Async interface.** Every `SchedulingStore` method returns a `Promise` (so the Postgres adapter fits). The in-memory adapter resolves immediately.
- **New, clean scheduling tables.** The Postgres adapter defines its OWN tables (`scheduling_trips`, `scheduling_trip_legs`, `checklist_templates`, `task_instances`, `scheduling_events`). Do NOT alter or reuse the inventory `trips`/`aircraft_type` enum.
- **Validate at the boundary.** `SchedulingStore` implementations return already-typed engine objects, but any method that ingests external/untyped data (template authoring, deserialization) MUST route through `parseTemplate` (Task 2) — which discriminates `scope` by `triggerType` and rejects unknown `Condition`/`DueRule` kinds.
- **Determinism preserved.** The service takes an injected `IdFactory` and explicit `nowUtc` — no `Date.now()` inside store/service logic (mirrors the engine). Only a thin outer caller supplies real time.
- **Everything-is-data.** Seeded templates (Task 7) are data, editable via the (Plan-3) authoring UI; nothing about checklist content is hardcoded in logic.
- **Tests:** Vitest, co-located `*.test.ts`, `import { describe, it, expect } from 'vitest'`. Run `npm test -- src/scheduling`. Gate: `npx tsc --noEmit 2>&1 | grep "src/scheduling"` empty (repo has pre-existing errors elsewhere — ignore those).

---

## File Structure

New package `src/scheduling/store/`:
- `types.ts` — `TripRecord`, `TripLegRecord`, `SchedulingEvent`, `EventTarget`, and the `SchedulingStore` interface.
- `mapping.ts` + `mapping.test.ts` — `toTripContext(trip)` (pure: derives engine `TripContext` from a `TripRecord`).
- `validate.ts` + `validate.test.ts` — `parseDueRule`, `parseCondition`, `parseTemplate` (runtime guards).
- `memory.ts` + `memory.test.ts` — `InMemorySchedulingStore`.
- `service.ts` + `service.test.ts` — `SchedulingService` (engine × store composition).
- `seed.ts` + `seed.test.ts` — the real daily/monthly/quarterly/domestic checklist templates as data + a `seedTemplates(store)` helper.
- `drizzle-schema.ts` — Postgres tables (developer-run, tsc-only here).
- `postgres.ts` — `DrizzleSchedulingStore` implementing the interface (developer-run, tsc-only here).
- `POSTGRES-RUNBOOK.md` — how the developer runs migrations + swaps the adapter.
- `index.ts` — barrel (in-memory path only; Postgres exported separately).

---

## Task 1: Store DTOs + `SchedulingStore` interface

**Files:**
- Create: `src/scheduling/store/types.ts`
- (No test — pure declarations; exercised by every later task.)

**Interfaces:**
- Consumes: engine types (`ChecklistTemplate`, `TaskInstance`, `TripType`, `HandoffTarget`).
- Produces: `TripLegRecord`, `TripRecord`, `EventTarget`, `SchedulingEvent`, `SchedulingStore`.

- [ ] **Step 1: Create the DTOs + interface**

Create `src/scheduling/store/types.ts`:

```ts
import type { ChecklistTemplate, TaskInstance, TripType, HandoffTarget } from '../engine';

export interface TripLegRecord {
  id: string;
  sequence: number;
  departureIcao: string;
  arrivalIcao: string;
  departureTimeUtc: string;   // ISO
  departureTimeLocal?: string;
  arrivalTimeUtc?: string;
  paxCount: number;
  filedStatus?: 'unfiled' | 'filed'; // for the inside-24h ForeFlight-lock logic (Plan 3)
}

export interface TripRecord {
  id: string;
  tripNumber: string;
  sourceSystem: 'manual' | 'myairops'; // 'manual' = stand-in until the Phase-2 pull
  sourceTripRef: string | null;        // the MAO trip number — reconciliation key; never written back
  tail: string;
  aircraftType: string;
  tripType: TripType;
  priority: 'standard' | 'vip' | 'urgent';
  status: 'planning' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  startDate: string; // ISO
  endDate: string;   // ISO
  legs: TripLegRecord[];
  createdBy: string;
  createdAtUtc: string;
  lastEditedBy?: string;
  lastEditedAtUtc?: string;
}

export interface EventTarget {
  kind: 'role' | 'dept' | 'person';
  value: string;
}

export interface SchedulingEvent {
  id: string;
  type: string;                 // e.g. 'crew_brief' | 'trip_sheet' | 'escalation'
  sourceDept: string;
  target: EventTarget;
  entityRef: { kind: 'trip' | 'leg' | 'task'; id: string };
  payload: Record<string, unknown>;
  actionUrl?: string;
  channel: HandoffTarget['channel'];   // 'inbox' (prototype) | 'teams' | 'email' (productionize via Graph)
  ackable: boolean;
  createdAtUtc: string;
  deliveredAtUtc?: string;
  ackState: 'n_a' | 'pending' | 'acked';
  ackedBy?: string;
  ackedAtUtc?: string;
}

/**
 * Storage seam. Every method is async so the Postgres adapter fits; the
 * in-memory adapter resolves immediately. Implementations return already-typed
 * engine/DTO objects (untyped input is validated upstream via validate.ts).
 */
export interface SchedulingStore {
  // Templates (versioned). saveTemplate upserts one (id, version).
  saveTemplate(t: ChecklistTemplate): Promise<ChecklistTemplate>;
  getTemplate(id: string, version?: number): Promise<ChecklistTemplate | null>; // omit version => latest published
  listPublishedTemplates(): Promise<ChecklistTemplate[]>; // latest published version of each id

  // Trip mirrors.
  saveTrip(t: TripRecord): Promise<TripRecord>;
  getTrip(id: string): Promise<TripRecord | null>;
  listTrips(): Promise<TripRecord[]>;

  // Task instances.
  saveInstances(xs: TaskInstance[]): Promise<void>;
  getInstance(id: string): Promise<TaskInstance | null>;
  updateInstance(x: TaskInstance): Promise<void>;
  listInstancesForTrip(tripId: string): Promise<TaskInstance[]>;
  listRecurringInstances(runDate: string): Promise<TaskInstance[]>;

  // Events.
  saveEvent(e: SchedulingEvent): Promise<SchedulingEvent>;
  getEvent(id: string): Promise<SchedulingEvent | null>;
  updateEvent(e: SchedulingEvent): Promise<void>;
  listEventsForTarget(target: EventTarget): Promise<SchedulingEvent[]>;
}
```

- [ ] **Step 2: Type-check + commit**

Run: `npx tsc --noEmit 2>&1 | grep "src/scheduling" || echo clean`
Expected: clean.

```bash
git add src/scheduling/store/types.ts
git commit -m "feat(scheduling): add store DTOs + SchedulingStore interface"
```

---

## Task 2: Runtime validation (`parseDueRule`, `parseCondition`, `parseTemplate`)

**Files:**
- Create: `src/scheduling/store/validate.ts`
- Test: `src/scheduling/store/validate.test.ts`

**Interfaces:**
- Consumes: engine types (`DueRule`, `Condition`, `ChecklistTemplate`, `TaskDefinition`, `RecurringScope`, `TripType`).
- Produces: `parseDueRule(raw: unknown): DueRule`, `parseCondition(raw: unknown): Condition`, `parseTemplate(raw: unknown): ChecklistTemplate` — each throws `Error` with a clear message on invalid input. `parseTemplate` enforces T3: `scope` must match `triggerType` (`recurring`→RecurringScope, `per_trip`→TripType).

- [ ] **Step 1: Write the failing test**

Create `src/scheduling/store/validate.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { parseDueRule, parseCondition, parseTemplate } from './validate';

describe('parseDueRule', () => {
  it('accepts a valid rule', () => {
    expect(parseDueRule({ kind: 'hoursBeforeEtd', hours: 24 })).toEqual({ kind: 'hoursBeforeEtd', hours: 24 });
  });
  it('throws on unknown kind', () => {
    expect(() => parseDueRule({ kind: 'bogus' })).toThrow(/dueRule/i);
  });
  it('throws on a missing required field', () => {
    expect(() => parseDueRule({ kind: 'weekday' })).toThrow(/weekday/i);
  });
});

describe('parseCondition', () => {
  it('accepts and recurses allOf', () => {
    const c = { kind: 'allOf', conditions: [{ kind: 'always' }, { kind: 'paxCountAtLeast', value: 7 }] };
    expect(parseCondition(c)).toEqual(c);
  });
  it('throws on unknown kind', () => {
    expect(() => parseCondition({ kind: 'nope' })).toThrow(/condition/i);
  });
  it('throws when a nested condition is invalid', () => {
    expect(() => parseCondition({ kind: 'not', condition: { kind: 'nope' } })).toThrow(/condition/i);
  });
});

describe('parseTemplate', () => {
  const good = {
    id: 't', name: 'Daily', triggerType: 'recurring', scope: 'daily', version: 1,
    status: 'published', effectiveFrom: '2026-01-01T00:00:00.000Z',
    taskDefinitions: [{ id: 'a', title: 'x', ownerRole: 'scheduling', category: 'ops', order: 1,
      dueRule: { kind: 'weekday', day: 'MON' }, requiresAck: false }],
  };
  it('accepts a valid recurring template', () => {
    expect(parseTemplate(good).scope).toBe('daily');
  });
  it('T3: rejects a per_trip template with a recurring scope', () => {
    expect(() => parseTemplate({ ...good, triggerType: 'per_trip', scope: 'daily' })).toThrow(/scope/i);
  });
  it('T3: rejects a recurring template with a tripType scope', () => {
    expect(() => parseTemplate({ ...good, triggerType: 'recurring', scope: 'domestic' })).toThrow(/scope/i);
  });
  it('rejects a task def whose dueRule is invalid', () => {
    expect(() => parseTemplate({ ...good, taskDefinitions: [{ ...good.taskDefinitions[0], dueRule: { kind: 'bogus' } }] })).toThrow(/dueRule/i);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/scheduling/store/validate`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `validate.ts`**

Create `src/scheduling/store/validate.ts`:

```ts
import type {
  DueRule, Condition, ChecklistTemplate, TaskDefinition, RecurringScope, TripType,
} from '../engine';

function isObj(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null;
}
function reqNum(o: Record<string, unknown>, k: string, ctx: string): number {
  if (typeof o[k] !== 'number') throw new Error(`${ctx}: missing/invalid number '${k}'`);
  return o[k] as number;
}
function reqStr(o: Record<string, unknown>, k: string, ctx: string): string {
  if (typeof o[k] !== 'string') throw new Error(`${ctx}: missing/invalid string '${k}'`);
  return o[k] as string;
}

const WEEKDAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

export function parseDueRule(raw: unknown): DueRule {
  if (!isObj(raw)) throw new Error('dueRule: not an object');
  const kind = raw.kind;
  switch (kind) {
    case 'dayOfTimeLocal': return { kind, time: reqStr(raw, 'time', 'dueRule.dayOfTimeLocal') };
    case 'weekday': {
      const day = reqStr(raw, 'day', 'dueRule.weekday');
      if (!WEEKDAYS.includes(day)) throw new Error(`dueRule.weekday: invalid day '${day}'`);
      const period = raw.period;
      if (period !== undefined && period !== 'AM' && period !== 'PM') throw new Error('dueRule.weekday: invalid period');
      return { kind, day: day as DueRule extends { kind: 'weekday' } ? never : never, ...(period ? { period } : {}) } as DueRule;
    }
    case 'dayOfMonth': {
      const when = reqStr(raw, 'when', 'dueRule.dayOfMonth');
      if (!['before', 'onOrBefore', 'around'].includes(when)) throw new Error('dueRule.dayOfMonth: invalid when');
      return { kind, day: reqNum(raw, 'day', 'dueRule.dayOfMonth'), when } as DueRule;
    }
    case 'quarterWeek': return { kind, week: reqNum(raw, 'week', 'dueRule.quarterWeek') };
    case 'annualDate': return { kind, month: reqNum(raw, 'month', 'dueRule.annualDate'), day: reqNum(raw, 'day', 'dueRule.annualDate') };
    case 'hoursBeforeEtd': return { kind, hours: reqNum(raw, 'hours', 'dueRule.hoursBeforeEtd') };
    case 'businessDaysBeforeEtd': return { kind, days: reqNum(raw, 'days', 'dueRule.businessDaysBeforeEtd') };
    case 'monthsBeforeEtd': return { kind, months: reqNum(raw, 'months', 'dueRule.monthsBeforeEtd') };
    default: throw new Error(`dueRule: unknown kind '${String(kind)}'`);
  }
}

export function parseCondition(raw: unknown): Condition {
  if (!isObj(raw)) throw new Error('condition: not an object');
  const kind = raw.kind;
  switch (kind) {
    case 'always': return { kind };
    case 'tripType': return { kind, equals: reqStr(raw, 'equals', 'condition.tripType') as TripType };
    case 'paxCountAtLeast': return { kind, value: reqNum(raw, 'value', 'condition.paxCountAtLeast') };
    case 'tailEquals': return { kind, value: reqStr(raw, 'value', 'condition.tailEquals') };
    case 'aircraftTypeEquals': return { kind, value: reqStr(raw, 'value', 'condition.aircraftTypeEquals') };
    case 'isWeekendDeparture': return { kind };
    case 'allOf': case 'anyOf': {
      if (!Array.isArray(raw.conditions)) throw new Error(`condition.${kind}: conditions not an array`);
      return { kind, conditions: raw.conditions.map(parseCondition) };
    }
    case 'not': return { kind, condition: parseCondition(raw.condition) };
    default: throw new Error(`condition: unknown kind '${String(kind)}'`);
  }
}

const RECURRING_SCOPES: RecurringScope[] = ['daily', 'monthly', 'quarterly'];
const TRIP_TYPES: TripType[] = ['domestic', 'international', 'dca_dassp'];

function parseTaskDef(raw: unknown): TaskDefinition {
  if (!isObj(raw)) throw new Error('taskDefinition: not an object');
  const def: TaskDefinition = {
    id: reqStr(raw, 'id', 'taskDefinition'),
    title: reqStr(raw, 'title', 'taskDefinition'),
    ownerRole: reqStr(raw, 'ownerRole', 'taskDefinition'),
    category: reqStr(raw, 'category', 'taskDefinition'),
    order: reqNum(raw, 'order', 'taskDefinition'),
    dueRule: parseDueRule(raw.dueRule),
    requiresAck: raw.requiresAck === true,
  };
  if (typeof raw.description === 'string') def.description = raw.description;
  if (raw.condition !== undefined) def.condition = parseCondition(raw.condition);
  if (raw.escalation !== undefined) {
    if (!isObj(raw.escalation)) throw new Error('taskDefinition.escalation: not an object');
    def.escalation = {
      deadline: parseDueRule(raw.escalation.deadline),
      notifyRole: reqStr(raw.escalation, 'notifyRole', 'escalation'),
      ...(typeof raw.escalation.reason === 'string' ? { reason: raw.escalation.reason } : {}),
    };
  }
  if (raw.handoffTarget !== undefined) {
    const h = raw.handoffTarget;
    if (!isObj(h)) throw new Error('taskDefinition.handoffTarget: not an object');
    def.handoffTarget = { kind: reqStr(h, 'kind', 'handoffTarget') as 'role', value: reqStr(h, 'value', 'handoffTarget'),
      ...(h.channel ? { channel: h.channel as 'inbox' } : {}) };
  }
  if (typeof raw.dependsOn === 'string') def.dependsOn = raw.dependsOn;
  return def;
}

export function parseTemplate(raw: unknown): ChecklistTemplate {
  if (!isObj(raw)) throw new Error('template: not an object');
  const triggerType = raw.triggerType;
  if (triggerType !== 'recurring' && triggerType !== 'per_trip') throw new Error(`template: invalid triggerType '${String(triggerType)}'`);
  const scope = reqStr(raw, 'scope', 'template');
  // T3: scope family must match triggerType.
  if (triggerType === 'recurring' && !RECURRING_SCOPES.includes(scope as RecurringScope)) {
    throw new Error(`template: recurring scope must be one of ${RECURRING_SCOPES.join('|')}, got '${scope}'`);
  }
  if (triggerType === 'per_trip' && !TRIP_TYPES.includes(scope as TripType)) {
    throw new Error(`template: per_trip scope must be one of ${TRIP_TYPES.join('|')}, got '${scope}'`);
  }
  const status = reqStr(raw, 'status', 'template');
  if (!['draft', 'published', 'archived'].includes(status)) throw new Error(`template: invalid status '${status}'`);
  if (!Array.isArray(raw.taskDefinitions)) throw new Error('template: taskDefinitions not an array');
  return {
    id: reqStr(raw, 'id', 'template'),
    name: reqStr(raw, 'name', 'template'),
    triggerType,
    scope: scope as RecurringScope | TripType,
    version: reqNum(raw, 'version', 'template'),
    status: status as ChecklistTemplate['status'],
    effectiveFrom: reqStr(raw, 'effectiveFrom', 'template'),
    taskDefinitions: raw.taskDefinitions.map(parseTaskDef),
  };
}
```

> Note for the implementer: the `weekday` branch's return type gymnastics above are illustrative — implement it so it returns `{ kind: 'weekday', day, ...(period ? { period } : {}) }` typed as `DueRule`. Keep the runtime checks (valid day, valid period) exactly; simplify the type assertion to `as DueRule` if the inline conditional type is awkward. The behavior the tests pin is what matters: valid weekday accepted, bad day/kind/missing-field throws.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/scheduling/store/validate`
Expected: PASS (10 tests).

- [ ] **Step 5: Commit**

```bash
git add src/scheduling/store/validate.ts src/scheduling/store/validate.test.ts
git commit -m "feat(scheduling): add runtime validation for deserialized templates/rules/conditions"
```

---

## Task 3: `toTripContext` mapping

**Files:**
- Create: `src/scheduling/store/mapping.ts`
- Test: `src/scheduling/store/mapping.test.ts`

**Interfaces:**
- Consumes: `TripRecord` (Task 1), engine `TripContext`.
- Produces: `toTripContext(trip: TripRecord): TripContext` — `etdUtc` = earliest leg `departureTimeUtc` (or `trip.startDate` if no legs); `maxPaxCount` = max leg `paxCount` (or 0); `isWeekendDeparture` = the earliest leg's departure day (UTC) is Sat/Sun.

- [ ] **Step 1: Write the failing test**

Create `src/scheduling/store/mapping.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { toTripContext } from './mapping';
import type { TripRecord } from './types';

const trip = (over: Partial<TripRecord> = {}): TripRecord => ({
  id: 'T1', tripNumber: 'TRIP-1', sourceSystem: 'manual', sourceTripRef: 'MAO-9',
  tail: 'N1PG', aircraftType: 'G650ER', tripType: 'domestic', priority: 'standard',
  status: 'planning', startDate: '2026-07-10T00:00:00.000Z', endDate: '2026-07-12T00:00:00.000Z',
  legs: [
    { id: 'l2', sequence: 2, departureIcao: 'KASE', arrivalIcao: 'KLUK', departureTimeUtc: '2026-07-11T15:00:00.000Z', paxCount: 3 },
    { id: 'l1', sequence: 1, departureIcao: 'KLUK', arrivalIcao: 'KASE', departureTimeUtc: '2026-07-10T14:00:00.000Z', paxCount: 7 },
  ],
  createdBy: 'u', createdAtUtc: '2026-06-30T12:00:00.000Z', ...over,
});

describe('toTripContext', () => {
  it('derives etd from the earliest leg, max pax, and weekday flag', () => {
    const ctx = toTripContext(trip());
    expect(ctx).toMatchObject({
      tripId: 'T1', tripType: 'domestic', tail: 'N1PG', aircraftType: 'G650ER',
      etdUtc: '2026-07-10T14:00:00.000Z', maxPaxCount: 7, isWeekendDeparture: false,
    });
  });
  it('flags a weekend departure (Sat/Sun earliest leg)', () => {
    // 2026-07-11 is a Saturday
    const ctx = toTripContext(trip({ legs: [
      { id: 'l1', sequence: 1, departureIcao: 'KLUK', arrivalIcao: 'KASE', departureTimeUtc: '2026-07-11T14:00:00.000Z', paxCount: 2 },
    ]}));
    expect(ctx.isWeekendDeparture).toBe(true);
    expect(ctx.etdUtc).toBe('2026-07-11T14:00:00.000Z');
  });
  it('falls back to startDate and 0 pax when there are no legs', () => {
    const ctx = toTripContext(trip({ legs: [] }));
    expect(ctx.etdUtc).toBe('2026-07-10T00:00:00.000Z');
    expect(ctx.maxPaxCount).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/scheduling/store/mapping`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `mapping.ts`**

Create `src/scheduling/store/mapping.ts`:

```ts
import type { TripContext } from '../engine';
import type { TripRecord } from './types';

export function toTripContext(trip: TripRecord): TripContext {
  const legs = trip.legs.slice().sort((a, b) => a.sequence - b.sequence);
  const earliest = legs.reduce<typeof legs[number] | undefined>((min, l) => {
    if (!min) return l;
    return new Date(l.departureTimeUtc).getTime() < new Date(min.departureTimeUtc).getTime() ? l : min;
  }, undefined);
  const etdUtc = earliest ? earliest.departureTimeUtc : trip.startDate;
  const maxPaxCount = legs.reduce((m, l) => Math.max(m, l.paxCount), 0);
  const dow = new Date(etdUtc).getUTCDay(); // 0=Sun..6=Sat (UTC — see spec DST caveat)
  return {
    tripId: trip.id,
    tripType: trip.tripType,
    tail: trip.tail,
    aircraftType: trip.aircraftType,
    etdUtc,
    maxPaxCount,
    isWeekendDeparture: dow === 0 || dow === 6,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/scheduling/store/mapping`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/scheduling/store/mapping.ts src/scheduling/store/mapping.test.ts
git commit -m "feat(scheduling): add TripRecord -> engine TripContext mapping"
```

---

## Task 4: In-memory store

**Files:**
- Create: `src/scheduling/store/memory.ts`
- Test: `src/scheduling/store/memory.test.ts`

**Interfaces:**
- Consumes: `SchedulingStore` + DTOs (Task 1), engine types.
- Produces: `class InMemorySchedulingStore implements SchedulingStore`. Template versioning: `saveTemplate` keys by `(id, version)`; `getTemplate(id)` (no version) and `listPublishedTemplates()` return the HIGHEST-`version` template whose `status === 'published'` per id.

- [ ] **Step 1: Write the failing test**

Create `src/scheduling/store/memory.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { InMemorySchedulingStore } from './memory';
import type { ChecklistTemplate, TaskInstance } from '../engine';
import type { TripRecord, SchedulingEvent } from './types';

const tpl = (over: Partial<ChecklistTemplate>): ChecklistTemplate => ({
  id: 'tpl', name: 'n', triggerType: 'recurring', scope: 'daily', version: 1,
  status: 'published', effectiveFrom: '2026-01-01T00:00:00.000Z', taskDefinitions: [], ...over,
});

describe('InMemorySchedulingStore templates', () => {
  it('getTemplate(id) returns the highest published version', async () => {
    const s = new InMemorySchedulingStore();
    await s.saveTemplate(tpl({ version: 1 }));
    await s.saveTemplate(tpl({ version: 2 }));
    await s.saveTemplate(tpl({ version: 3, status: 'draft' })); // draft ignored by getTemplate(id)
    expect((await s.getTemplate('tpl'))?.version).toBe(2);
    expect((await s.getTemplate('tpl', 1))?.version).toBe(1); // explicit version returns draft/any
    expect((await s.getTemplate('tpl', 3))?.status).toBe('draft');
  });
  it('listPublishedTemplates returns one latest-published per id', async () => {
    const s = new InMemorySchedulingStore();
    await s.saveTemplate(tpl({ id: 'a', version: 1 }));
    await s.saveTemplate(tpl({ id: 'a', version: 2 }));
    await s.saveTemplate(tpl({ id: 'b', version: 1 }));
    const list = await s.listPublishedTemplates();
    expect(list.map((t) => `${t.id}v${t.version}`).sort()).toEqual(['av2', 'bv1']);
  });
});

describe('InMemorySchedulingStore trips/instances/events', () => {
  const trip: TripRecord = {
    id: 'T1', tripNumber: 'TRIP-1', sourceSystem: 'manual', sourceTripRef: null, tail: 'N1PG',
    aircraftType: 'G650ER', tripType: 'domestic', priority: 'standard', status: 'planning',
    startDate: '2026-07-10T00:00:00.000Z', endDate: '2026-07-12T00:00:00.000Z', legs: [],
    createdBy: 'u', createdAtUtc: '2026-06-30T12:00:00.000Z',
  };
  const inst = (over: Partial<TaskInstance>): TaskInstance => ({
    id: 'i1', templateId: 'tpl', templateVersion: 1, taskDefId: 'd', title: 't', category: 'c', order: 1,
    tripId: 'T1', runDate: null, status: 'open', ownerRole: 'scheduling', dueAtUtc: '2026-07-09T14:00:00.000Z',
    requiresAck: false, ackState: 'n_a', auditTrail: [], ...over,
  });

  it('saves + lists trips', async () => {
    const s = new InMemorySchedulingStore();
    await s.saveTrip(trip);
    expect((await s.getTrip('T1'))?.tripNumber).toBe('TRIP-1');
    expect(await s.listTrips()).toHaveLength(1);
  });
  it('saves instances and lists by trip vs runDate; updateInstance replaces', async () => {
    const s = new InMemorySchedulingStore();
    await s.saveInstances([inst({ id: 'i1', tripId: 'T1', runDate: null }), inst({ id: 'i2', tripId: null, runDate: '2026-06-30' })]);
    expect((await s.listInstancesForTrip('T1')).map((x) => x.id)).toEqual(['i1']);
    expect((await s.listRecurringInstances('2026-06-30')).map((x) => x.id)).toEqual(['i2']);
    await s.updateInstance(inst({ id: 'i1', tripId: 'T1', status: 'done' }));
    expect((await s.getInstance('i1'))?.status).toBe('done');
  });
  it('saves events and lists by exact target', async () => {
    const s = new InMemorySchedulingStore();
    const ev: SchedulingEvent = {
      id: 'e1', type: 'crew_brief', sourceDept: 'scheduling', target: { kind: 'role', value: 'pilot' },
      entityRef: { kind: 'trip', id: 'T1' }, payload: {}, channel: 'inbox', ackable: true,
      createdAtUtc: '2026-06-30T12:00:00.000Z', ackState: 'pending',
    };
    await s.saveEvent(ev);
    expect((await s.listEventsForTarget({ kind: 'role', value: 'pilot' })).map((e) => e.id)).toEqual(['e1']);
    expect(await s.listEventsForTarget({ kind: 'role', value: 'maintenance' })).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/scheduling/store/memory`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `memory.ts`**

Create `src/scheduling/store/memory.ts`:

```ts
import type { ChecklistTemplate, TaskInstance } from '../engine';
import type { SchedulingStore, TripRecord, SchedulingEvent, EventTarget } from './types';

export class InMemorySchedulingStore implements SchedulingStore {
  private templates = new Map<string, ChecklistTemplate>(); // key `${id}:${version}`
  private trips = new Map<string, TripRecord>();
  private instances = new Map<string, TaskInstance>();
  private events = new Map<string, SchedulingEvent>();

  async saveTemplate(t: ChecklistTemplate): Promise<ChecklistTemplate> {
    this.templates.set(`${t.id}:${t.version}`, structuredClone(t));
    return t;
  }
  private latestPublished(id: string): ChecklistTemplate | null {
    let best: ChecklistTemplate | null = null;
    for (const t of this.templates.values()) {
      if (t.id === id && t.status === 'published' && (!best || t.version > best.version)) best = t;
    }
    return best ? structuredClone(best) : null;
  }
  async getTemplate(id: string, version?: number): Promise<ChecklistTemplate | null> {
    if (version === undefined) return this.latestPublished(id);
    const t = this.templates.get(`${id}:${version}`);
    return t ? structuredClone(t) : null;
  }
  async listPublishedTemplates(): Promise<ChecklistTemplate[]> {
    const ids = new Set([...this.templates.values()].map((t) => t.id));
    return [...ids].map((id) => this.latestPublished(id)).filter((t): t is ChecklistTemplate => t !== null);
  }

  async saveTrip(t: TripRecord): Promise<TripRecord> { this.trips.set(t.id, structuredClone(t)); return t; }
  async getTrip(id: string): Promise<TripRecord | null> { const t = this.trips.get(id); return t ? structuredClone(t) : null; }
  async listTrips(): Promise<TripRecord[]> { return [...this.trips.values()].map((t) => structuredClone(t)); }

  async saveInstances(xs: TaskInstance[]): Promise<void> { for (const x of xs) this.instances.set(x.id, structuredClone(x)); }
  async getInstance(id: string): Promise<TaskInstance | null> { const x = this.instances.get(id); return x ? structuredClone(x) : null; }
  async updateInstance(x: TaskInstance): Promise<void> { this.instances.set(x.id, structuredClone(x)); }
  async listInstancesForTrip(tripId: string): Promise<TaskInstance[]> {
    return [...this.instances.values()].filter((x) => x.tripId === tripId).map((x) => structuredClone(x));
  }
  async listRecurringInstances(runDate: string): Promise<TaskInstance[]> {
    return [...this.instances.values()].filter((x) => x.tripId === null && x.runDate === runDate).map((x) => structuredClone(x));
  }

  async saveEvent(e: SchedulingEvent): Promise<SchedulingEvent> { this.events.set(e.id, structuredClone(e)); return e; }
  async getEvent(id: string): Promise<SchedulingEvent | null> { const e = this.events.get(id); return e ? structuredClone(e) : null; }
  async updateEvent(e: SchedulingEvent): Promise<void> { this.events.set(e.id, structuredClone(e)); }
  async listEventsForTarget(target: EventTarget): Promise<SchedulingEvent[]> {
    return [...this.events.values()]
      .filter((e) => e.target.kind === target.kind && e.target.value === target.value)
      .map((e) => structuredClone(e));
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/scheduling/store/memory`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/scheduling/store/memory.ts src/scheduling/store/memory.test.ts
git commit -m "feat(scheduling): add in-memory SchedulingStore implementation"
```

---

## Task 5: `SchedulingService` (engine × store composition)

**Files:**
- Create: `src/scheduling/store/service.ts`
- Test: `src/scheduling/store/service.test.ts`

**Interfaces:**
- Consumes: engine barrel (`instantiatePerTrip`, `instantiateRecurring`, `applyTaskAction`, `computeEscalations`, `deriveSchedulingReadiness`, types), `SchedulingStore`, `toTripContext`.
- Produces:
  - `class SchedulingService` constructed with `{ store: SchedulingStore; idFactory: IdFactory; officeTzOffsetMinutes: number }`.
  - `createTripMirror(trip: TripRecord, nowUtc: string): Promise<{ trip: TripRecord; instances: TaskInstance[] }>` — saves the trip, instantiates per-trip checklists from published `per_trip` templates via `instantiatePerTrip(templates, toTripContext(trip), { nowUtc, officeTzOffsetMinutes, etdUtc }, idFactory)`, saves + returns the instances.
  - `generateRunBoard(nowUtc: string): Promise<TaskInstance[]>` — for each published `recurring` template, `instantiateRecurring`; skips a template whose instances already exist for that runDate (idempotent); saves + returns new instances.
  - `applyAction(instanceId, action, actor, nowUtc): Promise<TaskInstance>` — loads, `applyTaskAction`, persists; if the action is `complete` on a task with a `handoffTarget`, emits a handoff `SchedulingEvent`.
  - `runEscalations(nowUtc): Promise<SchedulingEvent[]>` — `computeEscalations` over ALL open instances (trip + recurring), emits one escalation event per firing (idempotent per instance: skip if an unacked escalation event already exists for it).
  - `tripReadiness(tripId): Promise<Readiness>` — `deriveSchedulingReadiness(listInstancesForTrip)`.

- [ ] **Step 1: Write the failing test**

Create `src/scheduling/store/service.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { SchedulingService } from './service';
import { InMemorySchedulingStore } from './memory';
import type { ChecklistTemplate, IdFactory } from '../engine';
import type { TripRecord } from './types';

const idf: IdFactory = (seed) => `id:${seed}`;
const NOW = '2026-06-30T12:00:00.000Z';

const perTrip: ChecklistTemplate = {
  id: 'dom', name: 'Domestic', triggerType: 'per_trip', scope: 'domestic', version: 1,
  status: 'published', effectiveFrom: '2026-01-01T00:00:00.000Z',
  taskDefinitions: [
    { id: 'suit', title: 'Airport suitability', ownerRole: 'scheduling', category: 'dispatch', order: 1,
      dueRule: { kind: 'hoursBeforeEtd', hours: 24 }, requiresAck: false },
    { id: 'brief', title: 'Send crew brief', ownerRole: 'scheduling', category: 'crew', order: 2,
      dueRule: { kind: 'hoursBeforeEtd', hours: 3 }, requiresAck: true,
      escalation: { deadline: { kind: 'hoursBeforeEtd', hours: 1 }, notifyRole: 'scheduling' },
      handoffTarget: { kind: 'role', value: 'pilot', channel: 'inbox' } },
  ],
};
const daily: ChecklistTemplate = {
  id: 'daily', name: 'Daily', triggerType: 'recurring', scope: 'daily', version: 1,
  status: 'published', effectiveFrom: '2026-01-01T00:00:00.000Z',
  taskDefinitions: [{ id: 'fuel', title: 'Update fuel price', ownerRole: 'scheduling', category: 'fuel', order: 1,
    dueRule: { kind: 'weekday', day: 'MON' }, requiresAck: false }],
};
const trip: TripRecord = {
  id: 'T1', tripNumber: 'TRIP-1', sourceSystem: 'manual', sourceTripRef: 'MAO-1', tail: 'N1PG',
  aircraftType: 'G650ER', tripType: 'domestic', priority: 'standard', status: 'planning',
  startDate: '2026-07-10T00:00:00.000Z', endDate: '2026-07-12T00:00:00.000Z',
  legs: [{ id: 'l1', sequence: 1, departureIcao: 'KLUK', arrivalIcao: 'KASE', departureTimeUtc: '2026-07-10T14:00:00.000Z', paxCount: 4 }],
  createdBy: 'u', createdAtUtc: NOW,
};

function svc() {
  const store = new InMemorySchedulingStore();
  const service = new SchedulingService({ store, idFactory: idf, officeTzOffsetMinutes: -240 });
  return { store, service };
}

describe('SchedulingService', () => {
  it('createTripMirror saves the trip and instantiates its per-trip checklist', async () => {
    const { store, service } = svc();
    await store.saveTemplate(perTrip);
    const { instances } = await service.createTripMirror(trip, NOW);
    expect(instances.map((i) => i.taskDefId)).toEqual(['suit', 'brief']);
    expect((await store.listInstancesForTrip('T1')).length).toBe(2);
    expect((await store.getTrip('T1'))?.sourceTripRef).toBe('MAO-1');
  });

  it('generateRunBoard is idempotent per runDate', async () => {
    const { service } = svc();
    await service['store'].saveTemplate(daily);
    const first = await service.generateRunBoard(NOW);
    expect(first.map((i) => i.taskDefId)).toEqual(['fuel']);
    const second = await service.generateRunBoard(NOW);
    expect(second).toEqual([]); // already generated for this runDate
  });

  it('applyAction completes a task and emits a handoff event when the def has a handoffTarget', async () => {
    const { store, service } = svc();
    await store.saveTemplate(perTrip);
    const { instances } = await service.createTripMirror(trip, NOW);
    const brief = instances.find((i) => i.taskDefId === 'brief')!;
    // brief requires ack; ack then complete
    await service.applyAction(brief.id, { kind: 'ack' }, 'pilot:1', NOW);
    const done = await service.applyAction(brief.id, { kind: 'complete' }, 'sched:1', NOW);
    expect(done.status).toBe('done');
    const inbox = await store.listEventsForTarget({ kind: 'role', value: 'pilot' });
    expect(inbox.length).toBe(1);
    expect(inbox[0].entityRef).toEqual({ kind: 'task', id: brief.id });
  });

  it('runEscalations emits one escalation per unacked-past-deadline task, idempotently', async () => {
    const { store, service } = svc();
    await store.saveTemplate(perTrip);
    await service.createTripMirror(trip, NOW);
    // now = T-0.5h before the 14:00Z ETD => past the T-1h escalation deadline; brief still pending
    const nowLate = '2026-07-10T13:30:00.000Z';
    const fired = await service.runEscalations(nowLate);
    expect(fired.length).toBe(1);
    expect(fired[0].type).toBe('escalation');
    const again = await service.runEscalations(nowLate);
    expect(again).toEqual([]); // idempotent — escalation already open for that task
  });

  it('tripReadiness reflects instance states', async () => {
    const { store, service } = svc();
    await store.saveTemplate(perTrip);
    const { instances } = await service.createTripMirror(trip, NOW);
    expect((await service.tripReadiness('T1')).state).toBe('NOT_READY');
    for (const i of instances) {
      if (i.requiresAck) await service.applyAction(i.id, { kind: 'ack' }, 'x', NOW);
      await service.applyAction(i.id, { kind: 'complete' }, 'x', NOW);
    }
    expect((await service.tripReadiness('T1')).state).toBe('READY');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/scheduling/store/service`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `service.ts`**

Create `src/scheduling/store/service.ts`:

```ts
import {
  instantiatePerTrip, instantiateRecurring, applyTaskAction, computeEscalations, deriveSchedulingReadiness,
} from '../engine';
import type { IdFactory, TaskInstance, TaskAction, Readiness } from '../engine';
import type { SchedulingStore, TripRecord, SchedulingEvent } from './types';
import { toTripContext } from './mapping';

export interface SchedulingServiceDeps {
  store: SchedulingStore;
  idFactory: IdFactory;
  officeTzOffsetMinutes: number;
}

export class SchedulingService {
  private store: SchedulingStore;
  private idFactory: IdFactory;
  private off: number;

  constructor(deps: SchedulingServiceDeps) {
    this.store = deps.store;
    this.idFactory = deps.idFactory;
    this.off = deps.officeTzOffsetMinutes;
  }

  async createTripMirror(trip: TripRecord, nowUtc: string): Promise<{ trip: TripRecord; instances: TaskInstance[] }> {
    await this.store.saveTrip(trip);
    const templates = await this.store.listPublishedTemplates();
    const tripCtx = toTripContext(trip);
    const instances = instantiatePerTrip(
      templates, tripCtx, { nowUtc, officeTzOffsetMinutes: this.off, etdUtc: tripCtx.etdUtc }, this.idFactory,
    );
    await this.store.saveInstances(instances);
    return { trip, instances };
  }

  async generateRunBoard(nowUtc: string): Promise<TaskInstance[]> {
    const templates = (await this.store.listPublishedTemplates()).filter((t) => t.triggerType === 'recurring');
    const created: TaskInstance[] = [];
    for (const t of templates) {
      const fresh = instantiateRecurring(t, { nowUtc, officeTzOffsetMinutes: this.off }, this.idFactory);
      if (fresh.length === 0) continue;
      const runDate = fresh[0].runDate!;
      const existing = await this.store.listRecurringInstances(runDate);
      const existingIds = new Set(existing.map((x) => x.id));
      const toSave = fresh.filter((x) => !existingIds.has(x.id)); // idempotent — stable ids per (template,version,def,runDate)
      if (toSave.length) { await this.store.saveInstances(toSave); created.push(...toSave); }
    }
    return created;
  }

  async applyAction(instanceId: string, action: TaskAction, actor: string, nowUtc: string): Promise<TaskInstance> {
    const current = await this.store.getInstance(instanceId);
    if (!current) throw new Error(`No task instance '${instanceId}'`);
    const next = applyTaskAction(current, action, actor, nowUtc);
    await this.store.updateInstance(next);
    if (action.kind === 'complete' && next.handoffTarget) {
      await this.store.saveEvent(this.handoffEvent(next, nowUtc));
    }
    return next;
  }

  async runEscalations(nowUtc: string): Promise<SchedulingEvent[]> {
    const all = await this.allActiveInstances();
    const firings = computeEscalations(all, nowUtc, this.off);
    const out: SchedulingEvent[] = [];
    for (const f of firings) {
      const existing = await this.store.listEventsForTarget({ kind: 'role', value: f.notifyRole });
      const already = existing.some((e) => e.type === 'escalation' && e.entityRef.id === f.taskInstanceId && e.ackState !== 'acked');
      if (already) continue; // idempotent
      const ev: SchedulingEvent = {
        id: this.idFactory(`escalation:${f.taskInstanceId}`),
        type: 'escalation', sourceDept: 'scheduling', target: { kind: 'role', value: f.notifyRole },
        entityRef: { kind: 'task', id: f.taskInstanceId }, payload: { reason: f.reason },
        channel: 'inbox', ackable: true, createdAtUtc: nowUtc, ackState: 'pending',
      };
      await this.store.saveEvent(ev);
      out.push(ev);
    }
    return out;
  }

  async tripReadiness(tripId: string): Promise<Readiness> {
    return deriveSchedulingReadiness(await this.store.listInstancesForTrip(tripId));
  }

  private handoffEvent(inst: TaskInstance, nowUtc: string): SchedulingEvent {
    const t = inst.handoffTarget!;
    return {
      id: this.idFactory(`handoff:${inst.id}`),
      type: `handoff:${inst.category}`, sourceDept: inst.ownerRole,
      target: { kind: t.kind, value: t.value }, entityRef: { kind: 'task', id: inst.id },
      payload: { title: inst.title, tripId: inst.tripId }, channel: t.channel ?? 'inbox',
      ackable: true, createdAtUtc: nowUtc, ackState: 'pending',
    };
  }

  private async allActiveInstances(): Promise<TaskInstance[]> {
    // In-memory-friendly: gather from all trips + all recurring runDates present.
    const trips = await this.store.listTrips();
    const perTrip = (await Promise.all(trips.map((t) => this.store.listInstancesForTrip(t.id)))).flat();
    // Recurring: collect distinct runDates from existing per-... not tracked here, so read via a wide net.
    // The store exposes listRecurringInstances(runDate); the service tracks no date index, so callers that
    // need recurring escalations pass through generateRunBoard first. For escalation we include any recurring
    // instances discoverable by the store's own iteration is not part of the interface — so we rely on per-trip
    // instances here. Recurring escalations are wired in Plan 3 when the run-board date is in scope.
    return perTrip;
  }
}
```

> Implementer note: `allActiveInstances` intentionally covers per-trip instances only (the `SchedulingStore` interface lists recurring instances by a known `runDate`, and the service holds no date index). This satisfies the escalation test (which escalates a per-trip brief). Recurring-task escalation is driven by Plan 3, which knows the current run-board date and can call a date-scoped path. Leave this as-is; do not add a `listAllRecurring()` method to the interface in this task.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/scheduling/store/service`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/scheduling/store/service.ts src/scheduling/store/service.test.ts
git commit -m "feat(scheduling): add SchedulingService (engine x store composition)"
```

---

## Task 6: Postgres adapter (developer-run — written + tsc-clean here, NOT executed)

**Files:**
- Create: `src/scheduling/store/drizzle-schema.ts`
- Create: `src/scheduling/store/postgres.ts`
- Create: `src/scheduling/store/POSTGRES-RUNBOOK.md`

**Interfaces:**
- Consumes: `drizzle-orm/pg-core`, the server `db` client (`src/server/db/index.ts` — read that file to import the existing client the same way `src/server/routes/trips.ts` does), `SchedulingStore` + DTOs, engine types.
- Produces: new pg tables (`schedulingTrips`, `schedulingTripLegs`, `checklistTemplates`, `taskInstances`, `schedulingEvents`) using JSONB for the nested engine structures (`legs`, `taskDefinitions`, `auditTrail`, `payload`, `handoffTarget`, `escalation`); `class DrizzleSchedulingStore implements SchedulingStore`.

**IMPORTANT:** There is no database in this environment. This task is **written and `tsc`-clean only**; it is NOT run and has NO Vitest test (integration verification is the developer's `db:push` step, per the runbook). Do not attempt `db:push` or DB queries.

- [ ] **Step 1: Read the existing server DB pattern**

Read `src/server/db/index.ts` (how the `db` client is created/exported) and the top of `src/server/routes/trips.ts` (how routes import `db` + schema). Mirror those imports exactly.

- [ ] **Step 2: Create the Drizzle schema**

Create `src/scheduling/store/drizzle-schema.ts` — new, clean tables (do NOT touch the inventory `trips`/`aircraft_type` enum). Use `jsonb` for nested structures so the engine's typed objects round-trip without a relational explosion:

```ts
import { pgTable, text, integer, boolean, timestamp, jsonb, primaryKey } from 'drizzle-orm/pg-core';

export const checklistTemplates = pgTable('checklist_templates', {
  id: text('id').notNull(),
  version: integer('version').notNull(),
  name: text('name').notNull(),
  triggerType: text('trigger_type').notNull(),
  scope: text('scope').notNull(),
  status: text('status').notNull(),
  effectiveFrom: timestamp('effective_from', { withTimezone: true }).notNull(),
  taskDefinitions: jsonb('task_definitions').notNull(), // TaskDefinition[]
}, (t) => ({ pk: primaryKey({ columns: [t.id, t.version] }) }));

export const schedulingTrips = pgTable('scheduling_trips', {
  id: text('id').primaryKey(),
  tripNumber: text('trip_number').notNull(),
  sourceSystem: text('source_system').notNull(),
  sourceTripRef: text('source_trip_ref'),
  tail: text('tail').notNull(),
  aircraftType: text('aircraft_type').notNull(), // free text (NOT the inventory G650/G500 enum)
  tripType: text('trip_type').notNull(),
  priority: text('priority').notNull(),
  status: text('status').notNull(),
  startDate: timestamp('start_date', { withTimezone: true }).notNull(),
  endDate: timestamp('end_date', { withTimezone: true }).notNull(),
  createdBy: text('created_by').notNull(),
  createdAtUtc: timestamp('created_at_utc', { withTimezone: true }).notNull(),
  lastEditedBy: text('last_edited_by'),
  lastEditedAtUtc: timestamp('last_edited_at_utc', { withTimezone: true }),
});

export const schedulingTripLegs = pgTable('scheduling_trip_legs', {
  id: text('id').primaryKey(),
  tripId: text('trip_id').notNull(),
  sequence: integer('sequence').notNull(),
  departureIcao: text('departure_icao').notNull(),
  arrivalIcao: text('arrival_icao').notNull(),
  departureTimeUtc: timestamp('departure_time_utc', { withTimezone: true }).notNull(),
  departureTimeLocal: text('departure_time_local'),
  arrivalTimeUtc: timestamp('arrival_time_utc', { withTimezone: true }),
  paxCount: integer('pax_count').notNull(),
  filedStatus: text('filed_status'),
});

export const taskInstances = pgTable('task_instances', {
  id: text('id').primaryKey(),
  templateId: text('template_id').notNull(),
  templateVersion: integer('template_version').notNull(),
  taskDefId: text('task_def_id').notNull(),
  title: text('title').notNull(),
  category: text('category').notNull(),
  order: integer('task_order').notNull(),
  description: text('description'),
  tripId: text('trip_id'),
  runDate: text('run_date'),
  status: text('status').notNull(),
  ownerRole: text('owner_role').notNull(),
  dueAtUtc: timestamp('due_at_utc', { withTimezone: true }).notNull(),
  requiresAck: boolean('requires_ack').notNull(),
  ackState: text('ack_state').notNull(),
  ackedBy: text('acked_by'),
  ackedAtUtc: timestamp('acked_at_utc', { withTimezone: true }),
  completedBy: text('completed_by'),
  completedAtUtc: timestamp('completed_at_utc', { withTimezone: true }),
  notes: text('notes'),
  handoffTarget: jsonb('handoff_target'),
  escalation: jsonb('escalation'),
  auditTrail: jsonb('audit_trail').notNull(),
});

export const schedulingEvents = pgTable('scheduling_events', {
  id: text('id').primaryKey(),
  type: text('type').notNull(),
  sourceDept: text('source_dept').notNull(),
  targetKind: text('target_kind').notNull(),
  targetValue: text('target_value').notNull(),
  entityRefKind: text('entity_ref_kind').notNull(),
  entityRefId: text('entity_ref_id').notNull(),
  payload: jsonb('payload').notNull(),
  actionUrl: text('action_url'),
  channel: text('channel'),
  ackable: boolean('ackable').notNull(),
  createdAtUtc: timestamp('created_at_utc', { withTimezone: true }).notNull(),
  deliveredAtUtc: timestamp('delivered_at_utc', { withTimezone: true }),
  ackState: text('ack_state').notNull(),
  ackedBy: text('acked_by'),
  ackedAtUtc: timestamp('acked_at_utc', { withTimezone: true }),
});
```

- [ ] **Step 3: Implement the Postgres store**

Create `src/scheduling/store/postgres.ts` implementing `SchedulingStore` against the above tables. Map rows ↔ DTO/engine objects (timestamps → ISO strings via `.toISOString()`; JSONB columns cast to the engine types; `getTemplate(id)` with no version → `ORDER BY version DESC` where `status='published' LIMIT 1`; `listPublishedTemplates` → the latest published per id). Import `db` exactly as `src/server/routes/trips.ts` does. Since this is not run here, the implementer writes it to be `tsc`-clean and faithful to the in-memory store's semantics (use `InMemorySchedulingStore` as the behavioral reference). Keep each method small and mirror the interface. (Full method bodies are the implementer's transcription task; the semantics are pinned by `memory.test.ts`.)

- [ ] **Step 4: Write the runbook**

Create `src/scheduling/store/POSTGRES-RUNBOOK.md` documenting: (1) set `DATABASE_URL` in `.env.local`; (2) `npm run db:push` to create the new scheduling tables; (3) swap `InMemorySchedulingStore` → `DrizzleSchedulingStore` at the composition root; (4) that these tables are additive and independent of the inventory schema; (5) that integration tests require a live DB and are out of scope for the no-DB build environment.

- [ ] **Step 5: Type-check + commit**

Run: `npx tsc --noEmit 2>&1 | grep "src/scheduling" || echo clean`
Expected: clean (no runtime test — DB not present).

```bash
git add src/scheduling/store/drizzle-schema.ts src/scheduling/store/postgres.ts src/scheduling/store/POSTGRES-RUNBOOK.md
git commit -m "feat(scheduling): add Drizzle/Postgres store adapter + runbook (developer-run)"
```

---

## Task 7: Seed the real checklists as template data + barrel

**Files:**
- Create: `src/scheduling/store/seed.ts`
- Test: `src/scheduling/store/seed.test.ts`
- Create: `src/scheduling/store/index.ts`

**Interfaces:**
- Consumes: engine `ChecklistTemplate`, `SchedulingStore`, `parseTemplate` (Task 2).
- Produces: `SEED_TEMPLATES: ChecklistTemplate[]` (the real Scheduler Daily, Monthly, Quarterly recurring checklists + the Domestic per-trip checklist, transcribed from the spec as DATA), and `async seedTemplates(store: SchedulingStore): Promise<void>` (validates each via `parseTemplate` then `saveTemplate`). Barrel `index.ts` re-exports the store package's public surface.

- [ ] **Step 1: Write the failing test**

Create `src/scheduling/store/seed.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { SEED_TEMPLATES, seedTemplates } from './seed';
import { InMemorySchedulingStore } from './memory';
import { parseTemplate } from './validate';
import { instantiateRecurring, instantiatePerTrip } from '../engine';

describe('SEED_TEMPLATES', () => {
  it('every seed template passes validation (valid scope/triggerType/rules)', () => {
    for (const t of SEED_TEMPLATES) expect(() => parseTemplate(t)).not.toThrow();
  });
  it('includes the daily/monthly/quarterly recurring + domestic per-trip checklists', () => {
    const byScope = SEED_TEMPLATES.map((t) => `${t.triggerType}:${t.scope}`);
    expect(byScope).toEqual(expect.arrayContaining([
      'recurring:daily', 'recurring:monthly', 'recurring:quarterly', 'per_trip:domestic',
    ]));
  });
  it('seedTemplates loads them and they instantiate', async () => {
    const store = new InMemorySchedulingStore();
    await seedTemplates(store);
    const published = await store.listPublishedTemplates();
    expect(published.length).toBe(SEED_TEMPLATES.length);
    const daily = published.find((t) => t.scope === 'daily')!;
    expect(instantiateRecurring(daily, { nowUtc: '2026-06-29T12:00:00.000Z', officeTzOffsetMinutes: -240 }, (s) => s).length)
      .toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/scheduling/store/seed`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `seed.ts`**

Create `src/scheduling/store/seed.ts`. Transcribe the real checklists from the spec/source docs into `ChecklistTemplate` objects (data — not logic). Each `ChecklistTemplate` = `{ id, name, triggerType, scope, version: 1, status: 'published', effectiveFrom: '2026-01-01T00:00:00.000Z', taskDefinitions: [...] }`. Include AT MINIMUM these four (the implementer fills each `taskDefinitions` array from the checklist content — the source is `docs/scheduling/foundation-scheduling-workspace-design.md` §1 and the original docs; representative items shown, add the rest from the daily/monthly/quarterly/domestic lists):

- **Daily** (`recurring`/`daily`) — e.g. `{ id: 'brief', title: 'Send next-day crew brief', ownerRole: 'scheduling', category: 'crew', order: N, dueRule: { kind: 'dayOfTimeLocal', time: '15:00' }, requiresAck: true, escalation: { deadline: { kind: 'dayOfTimeLocal', time: '17:00' }, notifyRole: 'scheduling' }, handoffTarget: { kind: 'role', value: 'pilot', channel: 'teams' } }`; `{ id: 'fuel-luk', title: 'Update Lunken fuel price in FuelerLinx', ownerRole: 'scheduling', category: 'fuel', order: N, dueRule: { kind: 'weekday', day: 'MON' }, requiresAck: false }`; currency report (Mon+Thu → two defs or a Mon and a Thu def); NOTAMs/weather intake (`dayOfTimeLocal` early); trip-sheet-to-EA handoff; etc.
- **Monthly** (`recurring`/`monthly`) — imputed-income report `{ dueRule: { kind: 'dayOfMonth', day: 15, when: 'before' } }`, chargeback `{ kind: 'dayOfMonth', day: 25, when: 'around' }`, pilot logbook distribution, flight-log audit (order 1, the gate), etc.
- **Quarterly** (`recurring`/`quarterly`) — FOS user-access audit `{ kind: 'quarterWeek', week: 1 }`, EU ETS `{ kind: 'annualDate', month: 3, day: 31 }` (annual item living on the quarterly board), SIFL updates, passport review, etc.
- **Domestic per-trip** (`per_trip`/`domestic`) — airport suitability `{ kind: 'hoursBeforeEtd', hours: 24 }`; 7-pax G650 special handling with `condition: { kind: 'allOf', conditions: [{ kind: 'paxCountAtLeast', value: 7 }, { kind: 'aircraftTypeEquals', value: 'G650ER' }] }`; NOTAM/TFR check; fuel/Jet-A confirmation; etc.

Then:
```ts
import type { ChecklistTemplate } from '../engine';
import type { SchedulingStore } from './types';
import { parseTemplate } from './validate';

export const SEED_TEMPLATES: ChecklistTemplate[] = [ /* the four templates above */ ];

export async function seedTemplates(store: SchedulingStore): Promise<void> {
  for (const raw of SEED_TEMPLATES) {
    const t = parseTemplate(raw); // validate content before persisting
    await store.saveTemplate(t);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/scheduling/store/seed`
Expected: PASS (3 tests).

- [ ] **Step 5: Create the barrel**

Create `src/scheduling/store/index.ts`:

```ts
export * from './types';
export { toTripContext } from './mapping';
export { parseTemplate, parseCondition, parseDueRule } from './validate';
export { InMemorySchedulingStore } from './memory';
export { SchedulingService } from './service';
export type { SchedulingServiceDeps } from './service';
export { SEED_TEMPLATES, seedTemplates } from './seed';
// NOTE: Postgres adapter is intentionally NOT re-exported here — import
// './postgres' + './drizzle-schema' directly at the server composition root
// (they require a DB). Keeps the in-memory/demo path free of drizzle.
```

- [ ] **Step 6: Full store suite + type-check + commit**

Run: `npm test -- src/scheduling` then `npx tsc --noEmit 2>&1 | grep "src/scheduling" || echo clean`
Expected: all scheduling tests pass (engine 39 + store additions); type-check clean.

```bash
git add src/scheduling/store/seed.ts src/scheduling/store/seed.test.ts src/scheduling/store/index.ts
git commit -m "feat(scheduling): seed real daily/monthly/quarterly/domestic checklists as template data + store barrel"
```

---

## Self-Review (completed by author)

**Spec coverage:** trip-mirror DTO with `sourceTripRef`/no-write-back (§6, D2) → Task 1; versioned templates + point-in-time (§8) → in-memory versioning Task 4 + Postgres Task 6; addressable event bus with `channel` for Teams/email (§9) → `SchedulingEvent` Task 1, emitted in Task 5; the deserialization-validation obligation + T3 scope discrimination (Plan-1 review) → Task 2; engine×store composition (createTrip→instantiate, run-board, apply-action, escalations, readiness) → Task 5; real checklists as editable data (everything-is-data) → Task 7; real Postgres persistence for handoff → Task 6.

**No-DB constraint honored:** Tasks 1–5, 7 run on the in-memory store (no `DATABASE_URL`). Task 6 is written + tsc-clean only, with a runbook — explicitly NOT verified here.

**Deferred to Plan 3 (recorded):** recurring-task escalation needs the current run-board date (service `allActiveInstances` covers per-trip only by design — see the Task 5 implementer note); Hono routes over the service (the demo consumes the service client-side); real Microsoft Teams/email delivery via Graph (`channel` hint is carried, not dispatched).

**Placeholder scan:** Task 7's `taskDefinitions` arrays are the one place the implementer must transcribe checklist content from the spec/source docs (data, not logic) — the four templates, their scopes, representative items, and the exact dueRule/condition shapes are specified; the implementer completes each list from §1 of the spec. This is content-authoring from a cited source, not an unspecified placeholder.

**Type consistency:** `SchedulingStore` method signatures are identical across `memory.ts` (Task 4) and `postgres.ts` (Task 6); `SchedulingEvent`/`TripRecord`/`EventTarget` defined once (Task 1); `SchedulingService` consumes the engine barrel's exact exports (`instantiatePerTrip`, `instantiateRecurring`, `applyTaskAction`, `computeEscalations`, `deriveSchedulingReadiness`, `IdFactory`, `TaskAction`, `Readiness`).
