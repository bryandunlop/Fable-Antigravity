# Workflow Weave Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the five seam-gaps found in the 2026-07-02 scheduling→pilot→maintenance workflow review: pilot squawk/nuisance entry points, a real per-trip crew brief, FRAT draft persistence on trip surfaces, cross-role deep-link gating, and a Work-Queue-first maintenance landing.

**Architecture:** All five items are wiring/presentation over existing engines — no new regulatory logic. Squawk entry reuses `ReportDefectDialog`; the crew brief is template *data* plus the existing handoff-event machinery; FRAT drafts persist on the tech-log `TripLeg` via the shared `preflightActions` write helpers; nav/landing changes live in `engine/nav.ts` + `PilotHome`.

**Tech Stack:** Vite 6 + React 18 + TS + Tailwind/shadcn, react-router-dom, vitest. Branch `feat/workflow-weave-fixes` off `main` @ `6e7a3d1`.

## Global Constraints

- Never fork regulatory logic: defect reporting = `ReportDefectDialog`; FRAT scoring = `StandaloneFRATForm`; readiness derivations imported, never copied.
- Signed records append-only; FRAT *drafts* are mutable orchestration on `TripLeg` (like `fratStatus`), NOT signed records.
- Tech-log files must stay tsc-clean: `npx tsc --noEmit 2>&1 | grep -E "tech-log|pilot-workspace|scheduling"` → empty.
- Test commands: `npx vitest run src/components/tech-log src/scheduling src/components/pilot-workspace` (fast loop), full `npx vitest run` + `npx vite build` before finishing.
- Conventional commits; end with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- shadcn imports are **relative** (`../../ui/button`), never `@/`.

---

### Task 1: Per-trip "Send crew brief" task (crew-brief delivery for every trip)

**Files:**
- Modify: `src/scheduling/store/seed.ts` (DOMESTIC_PER_TRIP ~line 187, INTERNATIONAL_PER_TRIP ~line 247, DASSP_PER_TRIP ~line 400)
- Test: `src/scheduling/store/service.test.ts`

**Interfaces:**
- Produces: task def id `send-crew-brief` in all three per-trip templates; completing its instance emits a `handoff:crew` event with `payload.tripId` targeted `{kind:'role', value:'pilot'}` (existing `SchedulingService.applyAction` behavior — no service change).

- [ ] **Step 1: Write the failing test** (mirror the existing handoff test at `service.test.ts:61`; use the real seeds)

```ts
import { seedTemplates } from './seed'; // add to existing imports

it('every per-trip template delivers a crew brief: completing send-crew-brief emits a pilot-targeted event with the tripId', async () => {
  const { store, service } = svc();
  await seedTemplates(store);
  // domestic trip fixture — reuse the file's `trip` fixture if tripType==='domestic', else:
  const domTrip = { ...trip, tripType: 'domestic' as const };
  const { instances } = await service.createTripMirror(domTrip, NOW);
  const brief = instances.find((i) => i.taskDefId === 'send-crew-brief');
  expect(brief).toBeDefined();
  const done = await service.applyAction(brief!.id, { kind: 'complete' }, 'sched:1', NOW);
  expect(done.status).toBe('done');
  const inbox = await store.listEventsForTarget({ kind: 'role', value: 'pilot' });
  expect(inbox.some((e) => (e.payload as { tripId?: string }).tripId === domTrip.id)).toBe(true);
});
```

- [ ] **Step 2: Run test → FAIL** (`brief` undefined). `npx vitest run src/scheduling/store/service.test.ts`
- [ ] **Step 3: Add the task def to all three per-trip templates** (append to each `taskDefinitions` array; `order: 99` = sorts last):

```ts
{
  id: 'send-crew-brief',
  title: 'Send crew brief',
  description: 'Deliver the trip brief to the crew in the system — schedule, pax, handling, and anything covered verbally.',
  ownerRole: 'scheduling',
  category: 'crew',
  order: 99,
  dueRule: { kind: 'hoursBeforeEtd', hours: 48 },
  requiresAck: false,
  handoffTarget: { kind: 'role', value: 'pilot', channel: 'teams' },
},
```

- [ ] **Step 4: Run test → PASS**; run whole scheduling suite (`npx vitest run src/scheduling`) — watch for tests asserting template task counts; update any exact-count assertions.
- [ ] **Step 5: Commit** `feat(scheduling): unconditional per-trip "Send crew brief" handoff task`

---

### Task 2: FRAT draft data model + shared write helper

**Files:**
- Modify: `src/components/tech-log/types.ts` (TripLeg ~line 278)
- Modify: `src/components/tech-log/preflightActions.ts`
- Create: `src/components/tech-log/util/fratDraft.ts`
- Test: `src/components/tech-log/preflightActions.test.ts`, `src/components/tech-log/util/fratDraft.test.ts`

**Interfaces:**
- Produces:
  - `types.ts`: `export interface FratDraft { selections: boolean[][]; mitigationNotes?: string; savedAtUtc: string; }`; `TripLeg` gains `fratDraft?: FratDraft;` (additive/optional — no DATA_VERSION bump).
  - `preflightActions.ts`: `saveFratDraftOnLeg(args: Base & { selections: boolean[][]; mitigationNotes?: string; nowUtc: string }): void` — patches leg `{ fratStatus:'IN_PROGRESS', fratDraft }`, audit `LEG_FRAT_DRAFT_SAVED`. `completeFratOnLeg` now also clears `fratDraft: undefined`.
  - `util/fratDraft.ts`:
    `mergeFratSelections<S extends { items: { selected: boolean }[] }>(sections: S[], selections?: boolean[][]): S[]` (out-of-range saved indices ignored; undefined selections → sections unchanged) and
    `extractFratSelections(sections: { items: { selected: boolean }[] }[]): boolean[][]`.

- [ ] **Step 1: Failing tests** — in `preflightActions.test.ts` (reuse its dispatch-capture harness):

```ts
it('saveFratDraftOnLeg stores the draft and marks the leg IN_PROGRESS', () => {
  const { dispatched, base } = harness(); // follow the file's existing setup pattern
  saveFratDraftOnLeg({ ...base, selections: [[true, false], [false]], mitigationNotes: 'wx watch', nowUtc: '2026-07-02T12:00:00.000Z' });
  const edit = dispatched.find((a) => a.type === 'EDIT_TRIP')!.payload;
  const leg = edit.legs[0];
  expect(leg.fratStatus).toBe('IN_PROGRESS');
  expect(leg.fratDraft).toEqual({ selections: [[true, false], [false]], mitigationNotes: 'wx watch', savedAtUtc: '2026-07-02T12:00:00.000Z' });
});

it('completeFratOnLeg clears any saved draft', () => {
  const { dispatched, base } = harness({ legOverrides: { fratStatus: 'IN_PROGRESS', fratDraft: { selections: [[true]], savedAtUtc: 'x' } } });
  completeFratOnLeg({ ...base, totalScore: 12 });
  const leg = dispatched.find((a) => a.type === 'EDIT_TRIP')!.payload.legs[0];
  expect(leg.fratStatus).toBe('COMPLETED');
  expect(leg.fratDraft).toBeUndefined();
});
```

  and in `util/fratDraft.test.ts`:

```ts
import { mergeFratSelections, extractFratSelections } from './fratDraft';

const sections = [{ items: [{ selected: false }, { selected: false }] }, { items: [{ selected: false }] }];

it('mergeFratSelections applies the saved matrix and ignores out-of-range entries', () => {
  const merged = mergeFratSelections(sections, [[true], [true, true]]);
  expect(merged[0].items.map(i => i.selected)).toEqual([true, false]);
  expect(merged[1].items.map(i => i.selected)).toEqual([true]);
  expect(sections[0].items[0].selected).toBe(false); // input not mutated
});

it('mergeFratSelections without a matrix returns sections unchanged', () => {
  expect(mergeFratSelections(sections, undefined)).toEqual(sections);
});

it('extractFratSelections round-trips', () => {
  expect(extractFratSelections(mergeFratSelections(sections, [[true, false], [true]]))).toEqual([[true, false], [true]]);
});
```

- [ ] **Step 2: Run → FAIL** (functions/fields missing)
- [ ] **Step 3: Implement** the type, the two helpers, `saveFratDraftOnLeg`, and add `fratDraft: undefined` to `completeFratOnLeg`'s patch.
- [ ] **Step 4: Run → PASS**; tech-log tsc clean.
- [ ] **Step 5: Commit** `feat(tech-log): FRAT draft persistence on TripLeg via shared preflight write helpers`

---

### Task 3: FRAT form hydrates drafts; trip surfaces save/resume them

**Files:**
- Modify: `src/components/StandaloneFRATForm.tsx` (fratSections init ~line 72, mitigationNotes ~line 68)
- Modify: `src/components/tech-log/pages/LegDetail.tsx` (~lines 104–131)
- Modify: `src/components/pilot-workspace/panels/PreflightLegsPanel.tsx` (~lines 64–80)

**Interfaces:**
- Consumes: Task 2's `FratDraft`, `saveFratDraftOnLeg`, `mergeFratSelections`, `extractFratSelections`.
- Produces: `initialData.selections?: boolean[][]` + `initialData.mitigationNotes?: string` honored by the form; both trip surfaces persist drafts and re-open them.

- [ ] **Step 1: Form hydration** — `StandaloneFRATForm.tsx`:

```ts
import { mergeFratSelections } from './tech-log/util/fratDraft';
// line ~68:
const [mitigationNotes, setMitigationNotes] = useState<string>(flightData?.mitigationNotes ?? '');
// line ~72 — wrap the existing literal DEFAULT array:
const [fratSections, setFratSections] = useState<FRATSection[]>(() =>
  mergeFratSelections([ /* existing literal array, unchanged */ ], flightData?.selections));
```

- [ ] **Step 2: LegDetail wiring** — button label + onSave draft branch + initialData:

```tsx
{!fratOpen && <Button size="sm" variant="outline" onClick={() => setFratOpen(true)}>
  {leg.fratStatus === 'COMPLETED' ? 'Redo FRAT' : leg.fratStatus === 'IN_PROGRESS' ? 'Resume FRAT (draft)' : 'Start FRAT'}
</Button>}
// initialData gains:
selections: leg.fratDraft?.selections,
mitigationNotes: leg.fratDraft?.mitigationNotes,
// onSave becomes:
onSave={(data: any) => {
  if (data.status === 'submitted') { completeFrat(data); return; }
  saveFratDraftOnLeg({ dispatch, newId, trip, leg, actorOid: user.oid,
    selections: extractFratSelections(data.items ?? []), mitigationNotes: data.mitigationNotes,
    nowUtc: new Date().toISOString() });
  setFratOpen(false);
}}
```

  (Adapt names to the file's existing `completeFrat`/imports; status line under "Flight risk assessment" shows `Draft saved · resume` when `IN_PROGRESS`.)

- [ ] **Step 3: PreflightLegsPanel wiring** — same pattern with `saveFratDraftOnLeg`/`extractFratSelections`, `setFratOpenLegId(null)` after draft save; "Start FRAT" action label → `Resume FRAT` when `IN_PROGRESS`.
- [ ] **Step 4: Verify** — vitest scope green; tsc clean; browser: open leg → Start FRAT → tick items → Save Draft → reopen → selections restored → Submit → draft cleared, COMPLETED.
- [ ] **Step 5: Commit** `feat(tech-log): FRAT save-draft/resume on LegDetail and pilot Flight Hub`

---

### Task 4: Squawk + nuisance entry points on pilot surfaces

**Files:**
- Modify: `src/components/pilot-workspace/FlightHub.tsx`
- Modify: `src/components/tech-log/pages/TripWorkspace.tsx` (actions ~line 78)
- Modify: `src/components/tech-log/engine/nav.ts` (GROUPS_PILOT ~line 14, tripsMatch ~line 8)
- Test: `src/components/tech-log/engine/nav.test.ts`

**Interfaces:**
- Consumes: `ReportDefectDialog({ open, onOpenChange, lockTail })` from `tech-log/components/panels/ReportDefectDialog`.
- Produces: pilot nav sub-item `Nuisance items → /tech-log/intermittent`.

- [ ] **Step 1: Failing nav test:**

```ts
it('pilot Trips group exposes Nuisance items and stays active on /tech-log/intermittent', () => {
  const r = resolveNav('PILOT', '/tech-log/intermittent');
  expect(r.activeGroup.key).toBe('trips');
  expect(r.activeSub?.label).toBe('Nuisance items');
});
```

- [ ] **Step 2: nav.ts** — `tripsMatch` adds `|| p.startsWith('/tech-log/intermittent')`; GROUPS_PILOT trips.sub adds `{ label: 'Nuisance items', to: '/tech-log/intermittent' }`. Run → PASS (check no MAINT nav test regressed — maintenance Records match also claims `/tech-log/intermittent`; pilot groups are separate so no conflict).
- [ ] **Step 3: FlightHub squawk panel** — after `<AircraftAcceptancePanel …/>`:

```tsx
const tlAc = state.aircraft.find((a) => a.tailNumber === trip.tail);
const [squawkOpen, setSquawkOpen] = useState(false);
…
{tlAc && (
  <section className="rounded-lg border p-4">
    <div className="flex items-center justify-between">
      <h2 className="font-semibold">Squawks <span className="text-xs text-muted-foreground">to maintenance</span></h2>
      <div className="flex gap-2">
        <button onClick={() => setSquawkOpen(true)} className="text-xs rounded border px-2 py-1 hover:bg-accent">Report squawk</button>
        <Link to="/tech-log/intermittent" className="text-xs rounded border px-2 py-1 hover:bg-accent">Log nuisance item ↗</Link>
      </div>
    </div>
    <ReportDefectDialog open={squawkOpen} onOpenChange={setSquawkOpen} lockTail={tlAc.tailNumber} />
  </section>
)}
```

- [ ] **Step 4: TripWorkspace header action** — add `Report squawk` Button beside "My trips" (state `squawkOpen`; render `<ReportDefectDialog … lockTail={ac.tailNumber} />` when `ac`).
- [ ] **Step 5: Verify** browser: hub → Report squawk → sign → appears in maintenance Work Queue "New squawks"; nuisance link lands on Intermittent with "Log fault". Commit `feat(pilot): squawk & nuisance-item entry points on Flight Hub, Trip Workspace, and pilot nav`

---

### Task 5: Cross-role deep-link gating (TripBriefPanel)

**Files:**
- Modify: `src/components/pilot-workspace/panels/TripBriefPanel.tsx`, `src/components/pilot-workspace/FlightHub.tsx`

- [ ] **Step 1:** `TripBriefPanel({ trip, userRole }: { trip: TripRecord; userRole: string })`; render the `Open in scheduling ↗` Link only when `['scheduling', 'admin'].includes(userRole)`. FlightHub passes `userRole={userRole}`.
- [ ] **Step 2:** Verify (pilot: link gone; brief + Acknowledge unaffected). tsc clean. Commit `fix(pilot): hide scheduling-workspace deep-link from roles the route rejects`

---

### Task 6: Maintenance lands on Work Queue with a fleet strip

**Files:**
- Modify: `src/components/tech-log/pages/PilotHome.tsx`
- Modify: `src/components/tech-log/pages/WorkQueue.tsx` (maintenance lens)
- Modify: `src/components/tech-log/pages/FleetStatus.tsx` (~line 35)
- Modify: `src/components/tech-log/engine/nav.ts` (GROUPS_MAINT ~lines 26–28)
- Test: `src/components/tech-log/engine/nav.test.ts`

- [ ] **Step 1: Failing nav test:**

```ts
it('maintenance root is the Work Queue; Fleet keeps aircraft pages', () => {
  expect(resolveNav('MAINTENANCE', '/tech-log').activeGroup.key).toBe('workqueue');
  expect(resolveNav('MAINTENANCE', '/tech-log/aircraft/N1PG').activeGroup.key).toBe('fleet');
});
```

- [ ] **Step 2: nav.ts** — GROUPS_MAINT fleet: `to: '/tech-log/fleet'`, match = `(p) => p.startsWith('/tech-log/fleet') || p.startsWith('/tech-log/aircraft')`; workqueue match adds `p === '/tech-log'`. Fix any existing assertions that pinned root→fleet.
- [ ] **Step 3: PilotHome** — `return user.role === 'MAINTENANCE' ? <WorkQueue /> : <Trips />;`
- [ ] **Step 4: WorkQueue fleet strip** (maintenance lens only, above the sections; import `deriveServiceability` from `../engine/serviceability`):

```tsx
const counts = useMemo(() => {
  const c = { RED: 0, AMBER: 0, GREEN: 0, PROV: 0 };
  for (const ac of state.aircraft) {
    if (ac.isProvisional) { c.PROV++; continue; }
    c[deriveServiceability(ac.id, state, now).status]++;
  }
  return c;
}, [state, now]);
…
<div className="grid grid-cols-4 gap-2">
  {([['Grounded', c.RED, 'RED'], ['MEL / restricted', c.AMBER, 'AMBER'], ['Serviceable', c.GREEN, 'GREEN'], ['Provisional', c.PROV, 'PROV']] as const).map(([label, n, f]) => (
    <button key={f} onClick={() => navigate(`/tech-log/fleet?filter=${f}`)} className="rounded-md border p-2 text-left hover:bg-accent/40">
      <div className="text-xs text-muted-foreground">{label}</div><div className="text-lg font-semibold">{n}</div>
    </button>
  ))}
</div>
```

- [ ] **Step 5: FleetStatus filter param** — `const [params] = useSearchParams();` initialize `filter` from `params.get('filter')` when it is one of `ALL|RED|AMBER|GREEN|PROV`.
- [ ] **Step 6: Verify** browser (maintenance login → tech-log root shows Work Queue + strip; strip cards filter the fleet board), nav tests green. Commit `feat(tech-log): maintenance lands on Work Queue with glanceable fleet strip`

---

### Task 7: Full verification + docs

- [ ] `npx vitest run` (whole repo) green; `npx tsc --noEmit 2>&1 | grep -E "tech-log|pilot-workspace|scheduling/"` empty; `npx vite build` green.
- [ ] Browser E2E: scheduling → trip → complete "Send crew brief" → pilot hub shows brief → Acknowledge → accept aircraft → FRAT draft→resume→submit → Report squawk → maintenance Work Queue triages it.
- [ ] Update `docs/scheduling/` review note pointer + vault (`~/Obsidian/Antigravity/scheduling/`): STATE.md outstanding section + review note "built" status.
- [ ] Commit docs; push branch; open PR to main.

## Self-Review (done at write time)

- Coverage: item 1→Task 4, item 2→Task 1, item 3→Tasks 2–3, item 4→Task 5, item 5→Task 6. ✔
- Placeholders: none — all code blocks concrete; "adapt to file's harness/imports" notes are about matching existing local names, with the pattern shown. ✔
- Type consistency: `FratDraft.selections: boolean[][]` used consistently across Tasks 2–3; `saveFratDraftOnLeg` signature matches call sites. ✔
