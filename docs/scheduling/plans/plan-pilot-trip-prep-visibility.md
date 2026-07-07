# Pilot trip-prep visibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give pilots a read-only "Trip prep" view of the completed scheduling checklist items an operator chooses to expose, plus a scheduler/admin per-item toggle that applies live to every trip — replacing the must-acknowledge pilot brief.

**Architecture:** A live pilot-visibility config (a set of task-definition ids) in the scheduling store, decoupled from the frozen-at-instantiation templates so a toggle reaches in-flight trips. Two pure selectors drive the surfaces: one lists the per-trip checklist items for the toggle panel and seeds defaults; one projects a trip's completed instances to the pilot's visible list. The pilot `TripBriefPanel` becomes a read-only projection (no ack); a new scheduling-hub tab writes the config.

**Tech Stack:** React + TypeScript (strict), Vite, Tailwind + shadcn UI, Vitest (node env). Code under `src/scheduling/` and `src/components/{pilot-workspace,scheduling-workspace,scheduling-command}/`.

## Global Constraints

- **Tests are pure-logic only.** Vitest runs `src/**/*.test.ts` in a node env — no DOM/component tests. Logic (`.ts`) gets unit tests; UI (`.tsx`) is verified by `npm run type-check` + the running app.
- **Commands:** all tests `npm test`; one file `npx vitest run <path>`; types `npm run type-check`; dev server `npm run dev` (port 5199, `vite-dev` launch config; role picker → sign in).
- **Visibility is keyed by `taskDefId`** (per checklist-item definition, shared across trips) — never per-trip, never per-category. Read **live** from the store on every query; never pinned into a `TaskInstance`.
- **Pilot view shows completed items only** — `status === 'done'` ∩ visible. No `n_a`, no open/blocked/in_progress. **No acknowledge control.**
- **Scope to per-trip templates.** The toggle list and the default seed consider only `triggerType === 'per_trip'` templates; recurring office tasks are excluded.
- **Default seed** = per-trip task defs whose `handoffTarget` is `{ kind: 'role', value: 'pilot' }`.
- **Do not touch** `service.ts` handoff-event firing, the tech-log side, fuel/FRAT/airport/handoff, or non-pilot event acks. `TripBriefPanel` no longer reads events; the pilot's `MessagesPanel` excludes `handoff:*` events so they are not shown as an ackable duplicate of the Trip prep list.
- **Copy:** sentence case everywhere.
- **Determinism:** selectors take explicit inputs; no `Date.now()` inside pure logic.

---

## File structure

- Create `src/scheduling/engine/pilotVisibility.ts` — pure helpers `perTripTaskDefs`, `defaultPilotVisibleDefs`; type `PilotTaskDef`.
- Create `src/scheduling/engine/pilotVisibility.test.ts`.
- Modify `src/scheduling/engine/index.ts` — export the helpers/type.
- Create `src/components/pilot-workspace/tripPrep.ts` — pure projection `completedVisibleItems`; type `CompletedPrepItem`.
- Create `src/components/pilot-workspace/tripPrep.test.ts`.
- Modify `src/scheduling/store/types.ts` — `SchedulingStore` gains `getPilotVisibility` / `setPilotVisible`.
- Modify `src/scheduling/store/memory.ts` — in-memory config + methods.
- Modify `src/scheduling/store/drizzle-schema.ts` — `pilotVisibility` table (schema parity).
- Create `src/scheduling/store/pilotVisibility.test.ts` — store get/set test.
- Modify `src/components/pilot-workspace/panels/TripBriefPanel.tsx` — rework into the read-only projection.
- Create `src/components/scheduling-workspace/PilotVisibilityPanel.tsx` — the toggle panel.
- Modify `src/components/scheduling-command/SchedulingCommandCenter.tsx` — new "Pilot visibility" utility tab.
- Modify `src/components/scheduling-workspace/SchedulingWorkspaceContext.tsx` — seed defaults after templates.

---

### Task 1: Pure scheduling-visibility helpers

**Files:**
- Create: `src/scheduling/engine/pilotVisibility.ts`
- Test: `src/scheduling/engine/pilotVisibility.test.ts`
- Modify: `src/scheduling/engine/index.ts`

**Interfaces:**
- Consumes: `ChecklistTemplate`, `TaskDefinition` from `./types`.
- Produces: `perTripTaskDefs(templates: ChecklistTemplate[]): PilotTaskDef[]`; `defaultPilotVisibleDefs(templates: ChecklistTemplate[]): string[]`; `interface PilotTaskDef { id: string; title: string; category: string }`. Consumed by Tasks 3-seed and 5.

- [ ] **Step 1: Write the failing test**

Create `src/scheduling/engine/pilotVisibility.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { perTripTaskDefs, defaultPilotVisibleDefs } from './pilotVisibility';
import type { ChecklistTemplate, TaskDefinition } from './types';

const def = (p: Partial<TaskDefinition> & { id: string }): TaskDefinition => ({
  title: `T ${p.id}`, ownerRole: 'scheduling', category: 'ops', order: 1,
  dueRule: { kind: 'hoursBeforeEtd', hours: 24 }, requiresAck: false, ...p,
});
const tmpl = (p: Partial<ChecklistTemplate> & { id: string; taskDefinitions: TaskDefinition[] }): ChecklistTemplate => ({
  name: p.id, triggerType: 'per_trip', scope: 'domestic', version: 1, status: 'published',
  effectiveFrom: '2026-01-01T00:00:00.000Z', ...p,
});

describe('perTripTaskDefs', () => {
  it('lists per-trip task defs deduped by id, ignoring recurring templates', () => {
    const templates = [
      tmpl({ id: 'dom', taskDefinitions: [def({ id: 'a', title: 'Crew brief', category: 'crew' }), def({ id: 'b' })] }),
      tmpl({ id: 'intl', scope: 'international', taskDefinitions: [def({ id: 'a' }), def({ id: 'c' })] }), // 'a' duplicate
      tmpl({ id: 'daily', triggerType: 'recurring', scope: 'daily', taskDefinitions: [def({ id: 'z' })] }),
    ];
    const got = perTripTaskDefs(templates);
    expect(got.map(d => d.id).sort()).toEqual(['a', 'b', 'c']);
    expect(got.find(d => d.id === 'a')).toEqual({ id: 'a', title: 'Crew brief', category: 'crew' });
  });
});

describe('defaultPilotVisibleDefs', () => {
  it('seeds from per-trip defs that hand off to the pilot role', () => {
    const templates = [
      tmpl({ id: 'dom', taskDefinitions: [
        def({ id: 'pilotItem', handoffTarget: { kind: 'role', value: 'pilot' } }),
        def({ id: 'deptItem', handoffTarget: { kind: 'dept', value: 'universal-aviation' } }),
        def({ id: 'plain' }),
      ] }),
      tmpl({ id: 'daily', triggerType: 'recurring', scope: 'daily', taskDefinitions: [
        def({ id: 'recurringPilot', handoffTarget: { kind: 'role', value: 'pilot' } }), // recurring → excluded
      ] }),
    ];
    expect(defaultPilotVisibleDefs(templates)).toEqual(['pilotItem']);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run src/scheduling/engine/pilotVisibility.test.ts`
Expected: FAIL — module `./pilotVisibility` does not exist.

- [ ] **Step 3: Write the helpers**

Create `src/scheduling/engine/pilotVisibility.ts`:

```ts
import type { ChecklistTemplate } from './types';

export interface PilotTaskDef {
  id: string;
  title: string;
  category: string;
}

/** Per-trip checklist items (deduped by task-def id) — the ones eligible for pilot visibility. */
export function perTripTaskDefs(templates: ChecklistTemplate[]): PilotTaskDef[] {
  const byId = new Map<string, PilotTaskDef>();
  for (const t of templates) {
    if (t.triggerType !== 'per_trip') continue;
    for (const d of t.taskDefinitions) {
      if (!byId.has(d.id)) byId.set(d.id, { id: d.id, title: d.title, category: d.category });
    }
  }
  return [...byId.values()];
}

/** Default pilot-visible set: per-trip items that already hand off to the pilot role. */
export function defaultPilotVisibleDefs(templates: ChecklistTemplate[]): string[] {
  const ids = new Set<string>();
  for (const t of templates) {
    if (t.triggerType !== 'per_trip') continue;
    for (const d of t.taskDefinitions) {
      if (d.handoffTarget?.kind === 'role' && d.handoffTarget.value === 'pilot') ids.add(d.id);
    }
  }
  return [...ids];
}
```

- [ ] **Step 4: Export from the engine barrel**

In `src/scheduling/engine/index.ts`, add after the last export line:

```ts
export { perTripTaskDefs, defaultPilotVisibleDefs } from './pilotVisibility';
export type { PilotTaskDef } from './pilotVisibility';
```

- [ ] **Step 5: Run the test and the type-check**

Run: `npx vitest run src/scheduling/engine/pilotVisibility.test.ts && npm run type-check`
Expected: PASS (2 tests); type-check clean for these files.

- [ ] **Step 6: Commit**

```bash
git add src/scheduling/engine/pilotVisibility.ts src/scheduling/engine/pilotVisibility.test.ts src/scheduling/engine/index.ts
git commit -m "feat(scheduling): pure helpers for pilot-visibility (per-trip defs + default seed)"
```

---

### Task 2: Pilot completed-items projection

**Files:**
- Create: `src/components/pilot-workspace/tripPrep.ts`
- Test: `src/components/pilot-workspace/tripPrep.test.ts`

**Interfaces:**
- Consumes: `TaskInstance` from `../../scheduling/engine`.
- Produces: `completedVisibleItems(instances: TaskInstance[], visible: Set<string>): CompletedPrepItem[]`; `interface CompletedPrepItem { id: string; title: string; completedAtUtc?: string }`. Consumed by Task 4.

- [ ] **Step 1: Write the failing test**

Create `src/components/pilot-workspace/tripPrep.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { completedVisibleItems } from './tripPrep';
import type { TaskInstance } from '../../scheduling/engine';

const inst = (p: Partial<TaskInstance> & { id: string; taskDefId: string }): TaskInstance => ({
  templateId: 'tmpl', templateVersion: 1, title: `Task ${p.id}`, category: 'ops', order: 1,
  tripId: 'trip-1', runDate: null, status: 'done', ownerRole: 'scheduling',
  dueAtUtc: '2026-07-01T00:00:00.000Z', requiresAck: false, ackState: 'n_a', auditTrail: [],
  ...p,
});

describe('completedVisibleItems', () => {
  it('keeps only done instances whose task-def is visible, ordered by checklist order', () => {
    const visible = new Set(['a', 'b']);
    const instances = [
      inst({ id: 'i2', taskDefId: 'b', order: 2, title: 'Catering', completedAtUtc: '2026-07-01T10:00:00.000Z' }),
      inst({ id: 'i1', taskDefId: 'a', order: 1, title: 'Crew brief', completedAtUtc: '2026-07-01T09:00:00.000Z' }),
    ];
    const got = completedVisibleItems(instances, visible);
    expect(got.map(x => x.id)).toEqual(['i1', 'i2']); // ordered by `order`
    expect(got[0]).toEqual({ id: 'i1', title: 'Crew brief', completedAtUtc: '2026-07-01T09:00:00.000Z' });
  });

  it('excludes not-done statuses and completed-but-hidden items', () => {
    const visible = new Set(['a', 'b', 'c']);
    const instances = [
      inst({ id: 'open', taskDefId: 'a', status: 'open' }),
      inst({ id: 'blocked', taskDefId: 'b', status: 'blocked' }),
      inst({ id: 'na', taskDefId: 'c', status: 'n_a' }),
      inst({ id: 'doneHidden', taskDefId: 'hidden', status: 'done' }),
    ];
    expect(completedVisibleItems(instances, visible)).toEqual([]);
  });

  it('is empty when nothing is visible', () => {
    const instances = [inst({ id: 'i1', taskDefId: 'a', status: 'done' })];
    expect(completedVisibleItems(instances, new Set())).toEqual([]);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run src/components/pilot-workspace/tripPrep.test.ts`
Expected: FAIL — module `./tripPrep` does not exist.

- [ ] **Step 3: Write the projection**

Create `src/components/pilot-workspace/tripPrep.ts`:

```ts
import type { TaskInstance } from '../../scheduling/engine';

export interface CompletedPrepItem {
  id: string;
  title: string;
  completedAtUtc?: string;
}

/**
 * The pilot's read-only "Trip prep" list: a trip's completed task instances whose task-def is
 * pilot-visible, ordered by checklist order. A projection over live state — no events, no ack.
 * `visible` is the current pilot-visibility set (read live from the store).
 */
export function completedVisibleItems(instances: TaskInstance[], visible: Set<string>): CompletedPrepItem[] {
  return instances
    .filter((x) => x.status === 'done' && visible.has(x.taskDefId))
    .sort((a, b) => a.order - b.order)
    .map((x) => ({ id: x.id, title: x.title, completedAtUtc: x.completedAtUtc }));
}
```

- [ ] **Step 4: Run the test and the type-check**

Run: `npx vitest run src/components/pilot-workspace/tripPrep.test.ts && npm run type-check`
Expected: PASS (3 tests); type-check clean.

- [ ] **Step 5: Commit**

```bash
git add src/components/pilot-workspace/tripPrep.ts src/components/pilot-workspace/tripPrep.test.ts
git commit -m "feat(pilot): completedVisibleItems projection for the trip-prep view"
```

---

### Task 3: Store pilot-visibility config

**Files:**
- Modify: `src/scheduling/store/types.ts` (interface)
- Modify: `src/scheduling/store/memory.ts` (impl)
- Modify: `src/scheduling/store/drizzle-schema.ts` (table)
- Test: `src/scheduling/store/pilotVisibility.test.ts`

**Interfaces:**
- Produces: `SchedulingStore.getPilotVisibility(): Promise<string[]>` and `SchedulingStore.setPilotVisible(taskDefId: string, visible: boolean): Promise<void>`. Consumed by Tasks 4 and 5.

- [ ] **Step 1: Write the failing test**

Create `src/scheduling/store/pilotVisibility.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { InMemorySchedulingStore } from './memory';

describe('InMemorySchedulingStore pilot visibility', () => {
  it('starts empty, adds and removes taskDefIds', async () => {
    const s = new InMemorySchedulingStore();
    expect(await s.getPilotVisibility()).toEqual([]);
    await s.setPilotVisible('a', true);
    await s.setPilotVisible('b', true);
    expect((await s.getPilotVisibility()).sort()).toEqual(['a', 'b']);
    await s.setPilotVisible('a', false);
    expect(await s.getPilotVisibility()).toEqual(['b']);
  });

  it('setting the same id visible twice does not duplicate it', async () => {
    const s = new InMemorySchedulingStore();
    await s.setPilotVisible('a', true);
    await s.setPilotVisible('a', true);
    expect(await s.getPilotVisibility()).toEqual(['a']);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run src/scheduling/store/pilotVisibility.test.ts`
Expected: FAIL — `getPilotVisibility` is not a function.

- [ ] **Step 3: Add the interface methods**

In `src/scheduling/store/types.ts`, inside the `SchedulingStore` interface, add after the `listEventsForTarget` line (before the closing `}`):

```ts
  listEventsForTarget(target: EventTarget): Promise<SchedulingEvent[]>;

  // Pilot-visibility config — which per-trip checklist items pilots see as completed.
  getPilotVisibility(): Promise<string[]>;                          // visible taskDefIds
  setPilotVisible(taskDefId: string, visible: boolean): Promise<void>;
```

- [ ] **Step 4: Implement in the in-memory store**

In `src/scheduling/store/memory.ts`, add the field next to the other private maps (after `private events = ...`):

```ts
  private events = new Map<string, SchedulingEvent>();
  private pilotVisible = new Set<string>();
```

And add the methods before the closing `}` of the class:

```ts
  async getPilotVisibility(): Promise<string[]> { return [...this.pilotVisible]; }
  async setPilotVisible(taskDefId: string, visible: boolean): Promise<void> {
    if (visible) this.pilotVisible.add(taskDefId); else this.pilotVisible.delete(taskDefId);
  }
```

- [ ] **Step 5: Add the Postgres table (schema parity)**

In `src/scheduling/store/drizzle-schema.ts`, add after the `schedulingEvents` table definition:

```ts
export const pilotVisibility = pgTable('pilot_visibility', {
  taskDefId: text('task_def_id').primaryKey(),
  visible: boolean('visible').notNull(),
});
```

- [ ] **Step 6: Run the test and the type-check**

Run: `npx vitest run src/scheduling/store/pilotVisibility.test.ts && npm run type-check`
Expected: PASS (2 tests); type-check clean (the `SchedulingStore` interface is implemented only by `InMemorySchedulingStore`, so no other implementer breaks).

- [ ] **Step 7: Commit**

```bash
git add src/scheduling/store/types.ts src/scheduling/store/memory.ts src/scheduling/store/drizzle-schema.ts src/scheduling/store/pilotVisibility.test.ts
git commit -m "feat(scheduling): pilot-visibility config in the scheduling store"
```

---

### Task 4: Rework TripBriefPanel into the read-only "Trip prep" view

**Files:**
- Modify (full rewrite): `src/components/pilot-workspace/panels/TripBriefPanel.tsx`

**Interfaces:**
- Consumes: `completedVisibleItems`, `CompletedPrepItem` from `../tripPrep` (Task 2); `store.listInstancesForTrip`, `store.getPilotVisibility` (Task 3).

> No unit test — `.tsx` view (Vitest is node-only). Verify via `npm run type-check` and the running app.

- [ ] **Step 1: Replace the file contents**

Replace the entire contents of `src/components/pilot-workspace/panels/TripBriefPanel.tsx` with:

```tsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import { useSchedulingWorkspace } from '../../scheduling-workspace/SchedulingWorkspaceContext';
import type { TripRecord } from '../../../scheduling/store/types';
import { completedVisibleItems, type CompletedPrepItem } from '../tripPrep';

const fmtWhen = (iso?: string) =>
  iso ? new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '';

/**
 * Pilot "Trip prep" — a read-only list of the completed scheduling checklist items the operator
 * has chosen to expose (see the scheduling Pilot-visibility panel). A live projection over the
 * trip's task instances; no acknowledgement (replaces the former ackable brief).
 */
export default function TripBriefPanel({ trip, userRole }: { trip: TripRecord; userRole: string }) {
  const { store, tick } = useSchedulingWorkspace();
  const [items, setItems] = useState<CompletedPrepItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [instances, visible] = await Promise.all([
        store.listInstancesForTrip(trip.id),
        store.getPilotVisibility(),
      ]);
      if (!cancelled) setItems(completedVisibleItems(instances, new Set(visible)));
    })();
    return () => { cancelled = true; };
  }, [store, tick, trip]);

  return (
    <section className="rounded-lg border p-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-semibold">Trip prep <span className="text-xs text-muted-foreground">from scheduling</span></h2>
        {['scheduling', 'admin'].includes(userRole) && (
          <Link to="/scheduling-workspace" className="text-xs text-primary hover:underline">Open in scheduling ↗</Link>
        )}
      </div>
      {items.length === 0 && <p className="text-sm text-muted-foreground">No trip prep completed yet.</p>}
      <ul className="space-y-2">
        {items.map((it) => (
          <li key={it.id} className="flex items-center justify-between rounded border px-3 py-2">
            <span className="text-sm">{it.title}</span>
            <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700">
              <Check className="h-3.5 w-3.5" /> done{it.completedAtUtc ? ` · ${fmtWhen(it.completedAtUtc)}` : ''}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npm run type-check`
Expected: clean for `TripBriefPanel.tsx` (no remaining references to `SchedulingEvent`, `ack`, `bump`, or `nowUtc` in this file).

- [ ] **Step 3: Commit**

```bash
git add src/components/pilot-workspace/panels/TripBriefPanel.tsx
git commit -m "feat(pilot): Trip prep view — read-only completed items, no ack"
```

---

### Task 5: Scheduler toggle panel + hub tab + default seeding

**Files:**
- Create: `src/components/scheduling-workspace/PilotVisibilityPanel.tsx`
- Modify: `src/components/scheduling-command/SchedulingCommandCenter.tsx`
- Modify: `src/components/scheduling-workspace/SchedulingWorkspaceContext.tsx`

**Interfaces:**
- Consumes: `perTripTaskDefs`, `PilotTaskDef`, `defaultPilotVisibleDefs` from `../../scheduling/engine` (Task 1); `store.getPilotVisibility`, `store.setPilotVisible`, `store.listPublishedTemplates` (Task 3).

> No unit test — `.tsx`/wiring. Verify via `npm run type-check` + full `npm test` + the running app.

- [ ] **Step 1: Create the toggle panel**

Create `src/components/scheduling-workspace/PilotVisibilityPanel.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { useSchedulingWorkspace } from './SchedulingWorkspaceContext';
import { perTripTaskDefs, type PilotTaskDef } from '../../scheduling/engine';
import { Switch } from '../ui/switch';

/**
 * Scheduler/admin control over which completed trip-prep checklist items pilots can see.
 * Writes the store's pilot-visibility config; changes apply live to every trip (the pilot
 * Trip-prep view reads this config on each query). Recurring office tasks are not listed.
 */
export default function PilotVisibilityPanel() {
  const { store, tick, bump } = useSchedulingWorkspace();
  const [defs, setDefs] = useState<PilotTaskDef[]>([]);
  const [visible, setVisible] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [templates, vis] = await Promise.all([store.listPublishedTemplates(), store.getPilotVisibility()]);
      if (!cancelled) { setDefs(perTripTaskDefs(templates)); setVisible(new Set(vis)); }
    })();
    return () => { cancelled = true; };
  }, [store, tick]);

  async function toggle(id: string, on: boolean) {
    await store.setPilotVisible(id, on);
    bump();
  }

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold">Pilot visibility</h2>
        <p className="text-sm text-muted-foreground">
          Choose which completed trip-prep items pilots can see. Changes apply to every trip.
        </p>
      </div>
      <div className="rounded-lg border divide-y">
        {defs.length === 0 && <p className="p-4 text-sm text-muted-foreground">No per-trip checklist items.</p>}
        {defs.map((d) => (
          <div key={d.id} className="flex items-center justify-between px-4 py-2.5">
            <div>
              <span className="text-sm font-medium">{d.title}</span>
              <span className="ml-2 text-xs text-muted-foreground">{d.category}</span>
            </div>
            <Switch checked={visible.has(d.id)} onCheckedChange={(on) => toggle(d.id, on)} />
          </div>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Wire the tab into the scheduling hub**

In `src/components/scheduling-command/SchedulingCommandCenter.tsx`:

Add `Eye` to the lucide import on line 3:

```ts
import { CalendarClock, CalendarDays, ClipboardList, Eye, Inbox as InboxIcon, LayoutList, ListChecks, Loader2, Plus, Rows3, Send } from 'lucide-react';
```

Add the panel import next to the other panel imports (after line 8 `import InboxPanel ...`):

```ts
import PilotVisibilityPanel from '../scheduling-workspace/PilotVisibilityPanel';
```

Extend the `Surface` type (line 28) to include the new surface:

```ts
type Surface = 'schedule' | 'upcoming' | 'action' | 'templates' | 'inbox' | 'foreflight' | 'pilot-visibility';
```

Add the tab to `UTILITY_TABS` (the array starting line 31) as a new entry:

```ts
  { key: 'pilot-visibility', label: 'Pilot visibility', icon: Eye },
```

Add the render branch next to the other utility panels (after the `surface === 'foreflight'` line, ~line 247):

```tsx
      {surface === 'foreflight' && <ForeFlightPanel />}
      {surface === 'pilot-visibility' && <PilotVisibilityPanel />}
```

- [ ] **Step 3: Seed the default visibility after templates load**

In `src/components/scheduling-workspace/SchedulingWorkspaceContext.tsx`, add the engine import near the top imports:

```ts
import { defaultPilotVisibleDefs } from '../../scheduling/engine';
```

In `ensureSeeded()`, immediately after `await seedTemplates(store);` (line 35), add:

```ts
      await seedTemplates(store);
      // Default pilot-visible set = the per-trip items that already hand off to the pilot.
      for (const id of defaultPilotVisibleDefs(await store.listPublishedTemplates())) {
        await store.setPilotVisible(id, true);
      }
```

- [ ] **Step 4: Type-check and run the full suite**

Run: `npm run type-check && npm test`
Expected: type-check clean for the changed files; all tests pass (including Tasks 1–3's new tests, and the existing `selectors.test.ts` unaffected).

- [ ] **Step 5: Verify in the running app**

Run: `npm run dev` (port 5199). Sign in as `scheduling`, open `/scheduling-command` → the new **Pilot visibility** tab lists the per-trip checklist items with switches; the pilot-handoff items are on by default. Toggle one off. Then sign in as `pilot`, open `/pilot-workspace` → a trip's **Trip prep** section lists only the completed, still-visible items with a "done" check and no Acknowledge button; the item you toggled off is absent.

- [ ] **Step 6: Commit**

```bash
git add src/components/scheduling-workspace/PilotVisibilityPanel.tsx src/components/scheduling-command/SchedulingCommandCenter.tsx src/components/scheduling-workspace/SchedulingWorkspaceContext.tsx
git commit -m "feat(scheduling): Pilot visibility toggle panel + hub tab + default seeding"
```

---

## Self-review
- **Spec coverage:** completed-only pilot view → Tasks 2, 4; per-item toggle live to all trips → Tasks 1, 3, 5 (config read live in Task 4's query); replace ack → Task 4 (no ack control, reads projection not events); live config keyed by taskDefId → Task 3; default seeded from `handoffTarget: pilot` → Tasks 1, 5. All §4 surfaces + §6 tests covered.
- **Placeholder scan:** none — every code step carries complete code and exact commands.
- **Type consistency:** `perTripTaskDefs`/`PilotTaskDef`/`defaultPilotVisibleDefs` (T1) consumed unchanged in T5; `completedVisibleItems`/`CompletedPrepItem` (T2) consumed in T4; `getPilotVisibility(): Promise<string[]>` / `setPilotVisible(taskDefId, visible)` (T3) consumed in T4 (`new Set(await getPilotVisibility())`) and T5. `TaskInstance.taskDefId`/`status`/`order`/`completedAtUtc` match `engine/types.ts`.
- **Assumptions (from the spec §7):** A1 default seeded (T5) · A2 shows completion time, not actor (T4 `fmtWhen`, no name) · A3 hub utility tab (T5) · A4 keyed by taskDefId (T1/T3). All implemented as documented; each is a small, localized change to reverse.
