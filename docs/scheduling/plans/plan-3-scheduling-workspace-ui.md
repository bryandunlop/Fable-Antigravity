# Scheduling Workspace UI — Implementation Plan (Plan 3 of 3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. UI tasks are **demonstrated, not unit-tested** — each task's gate is: builds clean (`tsc` + Vite), renders in the preview browser, and the interaction works (verified via the preview tools by the controller). Steps use checkbox (`- [ ]`) syntax.

**Goal:** Build the **Scheduling workspace** — a role-gated front-door page (dev role-switch) that makes the Plan-1/2 foundation visible and clickable: a daily/monthly/quarterly **run-board** (kills the paper), a **Trips** view where a scheduler creates/mirrors a trip and its checklist + readiness auto-appear (starts the weave), a **Templates** viewer (the editable-data payoff), and a **Handoff inbox** proving events flow to another department. All on the in-memory store — **fully demoable here with no DB**.

**Architecture:** A route-scoped React provider (`SchedulingWorkspaceProvider`) instantiates `InMemorySchedulingStore` + `SchedulingService` once and seeds the real checklists; a `useSchedulingWorkspace()` hook exposes `{ service, store, ready, tick, bump }`. The store is mutable and React won't re-render on internal mutation, so every mutating action calls `bump()` (increments `tick`) and panels re-query the store on `tick`. Everything matches the existing app: relative `./ui/*` shadcn primitives, `lucide-react` icons, `ProtectedRoute` role-gating, route-scoped provider (like `MaintenanceWorkflowProvider`), role via props.

**Tech Stack:** React 18 + react-router-dom, shadcn/ui (`src/components/ui/*`), lucide-react, Tailwind. Consumes `src/scheduling/store` (barrel) + `src/scheduling/engine`. No new dependencies.

Reference: spec `docs/scheduling/foundation-scheduling-workspace-design.md` (§10 workspace UX, §11 handoffs). Foundation: Plans 1 & 2 (built).

## Global Constraints

- **Prototype / developer handoff.** Dev role-switch (no Entra). In-memory store (no DB). Match the existing design system exactly (relative `./ui/*` imports, lucide-react, Tailwind `bg-background`/`text-foreground` tokens — NOT raw hex/slate).
- **Deterministic ids.** The provider's `idFactory` MUST be `(seed) => seed` (or a stable hash) — NOT `crypto.randomUUID()`. The engine relies on stable ids per seed for `generateRunBoard`/escalation idempotency; random ids silently break dedup.
- **Office timezone.** `officeTzOffsetMinutes: -240` (Eastern/EDT — the Lunken office) as a documented placeholder. TODO for the developer: derive from a real TZ source (DST-aware) — carries the same fixed-offset caveat as the spec.
- **Re-render on mutation.** After any `service.*` mutation, call `bump()`; panels read the store inside effects/renders keyed on `tick`. Never mutate returned store objects (they're deep copies anyway).
- **`nowUtc` at call sites.** UI code MAY use `new Date().toISOString()` to get "now" when calling service methods (the *engine* stays pure; the UI is the outer clock). Centralize as a `nowUtc()` helper in the context.
- **Role-gating.** Route + nav gated `['scheduling','admin']`. The Templates editor actions (if built) gate on `['admin','lead']` as the stand-in for a future `checklist-admin` capability (`scheduling-lead` role does NOT exist yet — flag in code).
- **Verification (per task):** `npm run build` (or `npx tsc --noEmit` scoped) clean for new files; render + interact in the preview browser (controller drives `preview_*`). No Vitest for UI.

---

## File Structure

New dir `src/components/scheduling-workspace/`:
- `SchedulingWorkspaceContext.tsx` — provider + `useSchedulingWorkspace` hook (the linchpin; full code below).
- `SchedulingWorkspace.tsx` — the page: header + shadcn `Tabs` (Run-board / Trips / Templates / Inbox) + loading gate.
- `RunBoardPanel.tsx` — recurring run-board.
- `TripsPanel.tsx` — trips list + create/mirror form + trip detail (checklist + readiness).
- `TemplatesPanel.tsx` — published-templates viewer (+ minimal edit if in scope).
- `InboxPanel.tsx` — handoff/escalation events by target role + ack.
- `taskRowHelpers.tsx` (optional) — shared status/due badge rendering used by run-board + trip detail.

Wiring: `src/App.tsx` (route), `src/components/Navigation.tsx` (nav entry).

---

## Task 1: `SchedulingWorkspaceContext` (provider + hook)

**Files:** Create `src/components/scheduling-workspace/SchedulingWorkspaceContext.tsx`

**Interfaces produced:** `SchedulingWorkspaceProvider` (component), `useSchedulingWorkspace(): { service: SchedulingService; store: InMemorySchedulingStore; ready: boolean; tick: number; bump: () => void; nowUtc: () => string; officeTzOffsetMinutes: number }`.

- [ ] **Step 1: Create the provider** (complete code — this is the linchpin every panel depends on):

```tsx
import React, { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { InMemorySchedulingStore, SchedulingService, seedTemplates } from '../../scheduling/store';

interface SchedulingWorkspaceContextValue {
  service: SchedulingService;
  store: InMemorySchedulingStore;
  ready: boolean;
  tick: number;            // bumped after every mutation so panels re-query
  bump: () => void;
  nowUtc: () => string;    // the UI is the outer clock; engine stays pure
  officeTzOffsetMinutes: number;
}

const SchedulingWorkspaceContext = createContext<SchedulingWorkspaceContextValue | undefined>(undefined);

// Eastern (Lunken) office. TODO(dev): derive from a real DST-aware TZ source.
const OFFICE_TZ_OFFSET_MINUTES = -240;

export function SchedulingWorkspaceProvider({ children }: { children: ReactNode }) {
  const [store] = useState(() => new InMemorySchedulingStore());
  const [service] = useState(() => new SchedulingService({
    store,
    idFactory: (seed) => seed, // MUST be deterministic — idempotency depends on stable ids per seed
    officeTzOffsetMinutes: OFFICE_TZ_OFFSET_MINUTES,
  }));
  const [ready, setReady] = useState(false);
  const [tick, setTick] = useState(0);
  const bump = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    seedTemplates(store).then(() => { if (!cancelled) setReady(true); });
    return () => { cancelled = true; };
  }, [store]);

  const nowUtc = useCallback(() => new Date().toISOString(), []);

  return (
    <SchedulingWorkspaceContext.Provider
      value={{ service, store, ready, tick, bump, nowUtc, officeTzOffsetMinutes: OFFICE_TZ_OFFSET_MINUTES }}
    >
      {children}
    </SchedulingWorkspaceContext.Provider>
  );
}

export function useSchedulingWorkspace() {
  const ctx = useContext(SchedulingWorkspaceContext);
  if (!ctx) throw new Error('useSchedulingWorkspace must be used within a SchedulingWorkspaceProvider');
  return ctx;
}
```

- [ ] **Step 2: Type-check** — `npx tsc --noEmit 2>&1 | grep "src/components/scheduling-workspace" || echo clean`. Verify `IdFactory` accepts `(seed) => seed` and the barrel exports resolve.
- [ ] **Step 3: Commit** — `feat(scheduling-ui): add SchedulingWorkspace context/provider (in-memory store + service, seeded)`.

---

## Task 2: Route + nav wiring

**Files:** Modify `src/App.tsx`, `src/components/Navigation.tsx`

- [ ] **Step 1** — In `src/App.tsx`, add imports (near the other feature imports): the `SchedulingWorkspaceProvider` from `./components/scheduling-workspace/SchedulingWorkspaceContext` and `SchedulingWorkspace` from `./components/scheduling-workspace/SchedulingWorkspace`.
- [ ] **Step 2** — Add a route in the Scheduling cluster (near line ~446), route-scoped provider (matching `MaintenanceWorkflowProvider`):
```tsx
<Route
  path="/scheduling-workspace"
  element={
    <ProtectedRoute userRole={userRole} additionalRoles={additionalRoles} allowedRoles={['scheduling', 'admin']}>
      <SchedulingWorkspaceProvider>
        <SchedulingWorkspace userRole={userRole} additionalRoles={additionalRoles} />
      </SchedulingWorkspaceProvider>
    </ProtectedRoute>
  }
/>
```
- [ ] **Step 3** — In `src/components/Navigation.tsx`, add to the "Scheduling" group's `items` (lines ~274–286):
```tsx
{ name: 'Scheduling Workspace', href: '/scheduling-workspace', icon: CalendarCheck, roles: ['scheduling', 'admin'] },
```
(`CalendarCheck` is already imported.)
- [ ] **Step 4: Build + verify** — `npm run build` clean; in preview, log in as `scheduling`, confirm the nav item appears and routes to a (stub-ok) page. Commit: `feat(scheduling-ui): route + nav entry for the scheduling workspace`.

> The `SchedulingWorkspace` page can be a minimal stub at this point (Task 3 fills it) so the route is verifiable early.

---

## Task 3: Workspace shell (`SchedulingWorkspace.tsx`)

**Files:** Create `src/components/scheduling-workspace/SchedulingWorkspace.tsx`

**Responsibility:** The page frame. Props `{ userRole: string; additionalRoles?: string[] }`. Header ("Scheduling Workspace" + a subtitle). A `ready` gate (show a `LoadingSpinner`/skeleton until `useSchedulingWorkspace().ready`). shadcn `Tabs` with four tabs: **Run-board**, **Trips**, **Templates**, **Inbox**, each rendering the corresponding panel (Tasks 4–7). Match `TripCoordination.tsx`'s top-level layout (container, `Card` sections, `text-foreground`/`bg-background` tokens). Pass `userRole`/`additionalRoles` down to `TemplatesPanel` (for the edit gate) and `InboxPanel` (default target role).

- [ ] Build the shell with the four `TabsContent` wired to the panels (import the panels; they can be stubs until their tasks). Verify tabs switch in preview. Commit: `feat(scheduling-ui): workspace shell + tabs`.

---

## Task 4: Run-board panel (`RunBoardPanel.tsx`)

**Responsibility:** The recurring daily/monthly/quarterly run-board — the "kill the paper" view.
- A **"Generate today's run-board"** button → `await service.generateRunBoard(nowUtc())` then `bump()`.
- Read `store.listRecurringInstances(runDate)` for today's office-local runDate (compute from `nowUtc()` + `officeTzOffsetMinutes`, or expose today's runDate — simplest: call `generateRunBoard` which returns the created set, and also list existing for the date). Render tasks grouped by `category`, each row: `title`, `ownerRole`, due time (`dueAtUtc` formatted), a status `Badge` (open/in_progress/blocked/done/n_a), an ack `Badge` when `requiresAck`, and action buttons (Start / Complete / Ack / Block) → `service.applyAction(id, {kind}, actorRole, nowUtc())` + `bump()`.
- Use `evaluateTriggers(instances, nowUtc())` (engine barrel) to flag **overdue** rows (red) vs due-soon (amber). Show the focus-item concept via a small legend.
- Empty state before generation.

- [ ] Build + verify in preview: generate → daily tasks appear with due/owner/status; Start/Complete/Ack update the row (via bump re-query); regenerating the same day doesn't duplicate. Commit: `feat(scheduling-ui): recurring run-board panel`.

---

## Task 5: Trips panel (`TripsPanel.tsx`)

**Responsibility:** The "start the weave" view — scheduler creates/mirrors a trip and its checklist + readiness appear.
- **List** trips (`store.listTrips()` on `tick`), each with tripNumber/tail/tripType/status + a computed readiness `Badge` (`await service.tripReadiness(id)`).
- **Create / mirror trip** form (shadcn `Dialog` + `Input`/`Select`): tripNumber, sourceTripRef (the MAO ref), tail, aircraftType, tripType (`domestic|international|dca_dassp`), priority, start/end date, and 1+ legs (departureIcao, arrivalIcao, departureTimeUtc, paxCount). On submit → build a `TripRecord` (id via `idFactory`/`crypto`? use a simple id like `trip-${tripNumber}`), `await service.createTripMirror(trip, nowUtc())`, `bump()`, select the new trip. (Note: only `domestic` templates are seeded, so domestic trips get a checklist; intl/dca show an empty checklist — that's expected, per the slice scope.)
- **Trip detail** (selected trip): the instantiated checklist (`store.listInstancesForTrip(id)`) grouped by category with the same task-row actions as the run-board, plus the computed readiness banner (READY/NOT_READY/BLOCKED + blocker). Completing a task that has a `handoffTarget` (e.g. the crew brief) emits an event — note it lands in the Inbox (Task 7).

- [ ] Build + verify in preview: create a domestic 7-pax G650ER trip → checklist includes the 7-pax conditional task; readiness shows NOT_READY; completing tasks flips it toward READY; completing a handoff task creates an inbox event. Commit: `feat(scheduling-ui): trips panel — create/mirror + checklist + readiness`.

---

## Task 6: Templates viewer (`TemplatesPanel.tsx`)

**Responsibility:** Show the seeded checklists AS editable data (the everything-is-data payoff).
- List `store.listPublishedTemplates()` (on `tick`), grouped by `triggerType`/`scope`. For each, show name, version, and its task definitions (title, ownerRole, category, dueRule summarized human-readably, requiresAck, condition summary, handoffTarget).
- **Edit gate:** if `userRole`/`additionalRoles` intersect `['admin','lead']`, show an "Edit (draft new version)" affordance — MINIMAL for this slice: edit a task's `title` and toggle `requiresAck`, then "Publish new version" → save a new `ChecklistTemplate` with `version+1`, validated via `parseTemplate`, through `store.saveTemplate` + `bump()`. (The full no-code rule/condition builder is a documented follow-up — this proves the versioned-editable-data model without building the whole builder.) If the role lacks the capability, render read-only with a note.
- Flag in a code comment that `scheduling-lead`/`checklist-admin` is the intended real gate (doesn't exist yet).

- [ ] Build + verify in preview: templates render with their tasks; as `admin`, edit a task title + publish → a new version appears and getTemplate(id) returns it; as `scheduling` (no lead/admin), the editor is hidden. Commit: `feat(scheduling-ui): templates viewer + minimal versioned edit`.

---

## Task 7: Handoff inbox (`InboxPanel.tsx`)

**Responsibility:** Prove data flows to the right department — the weave made visible.
- A target-role selector (default `pilot`; also `scheduling`, `maintenance`, an EA/`admin-assistant` option). Read `store.listEventsForTarget({ kind: 'role', value })` on `tick`.
- Render events: type (handoff/escalation), source, entity ref (trip/task), payload summary, created time, ack state. For `ackable` + `pending` events, an **Acknowledge** button → set `ackState:'acked'`, `ackedBy`, `ackedAtUtc` via `store.updateEvent(...)` + `bump()`. (Escalations targeted at `scheduling` and crew-brief handoffs targeted at `pilot` will appear after run-board/trip actions.)
- Empty state.

- [ ] Build + verify in preview: complete a crew-brief task in Trips → switch to Inbox (role=pilot) → the handoff event is listed; Acknowledge marks it acked. Commit: `feat(scheduling-ui): handoff inbox panel`.

---

## Task 8: End-to-end verification + polish

- [ ] Full-flow browser walkthrough (controller drives preview): log in as `scheduling` → Scheduling Workspace → generate run-board (daily tasks) → create a domestic 7-pax G650ER trip (checklist incl. 7-pax task appears, readiness NOT_READY) → complete tasks (readiness → READY; crew brief → Inbox event) → Templates tab shows seeded checklists → (as admin) edit+publish a template version. Capture a screenshot.
- [ ] `npm run build` clean; no NEW `src/components/scheduling-workspace` or `src/scheduling` type errors under `npx tsc --noEmit`.
- [ ] Commit any polish. This completes slices 0–1 (foundation + scheduling workspace).

---

## Self-Review (author)

**Spec coverage (§10/§11):** run-board (Task 4), trips create/mirror + checklist + readiness (Task 5), templates as editable data (Task 6), handoff inbox = the weave (Task 7), role-gated front door + progressive-migration nav entry (Tasks 2–3). Crew-brief handoff (scheduling→pilot) demonstrated end-to-end (Task 5→7).

**Deferred (documented):** full no-code rule/condition template BUILDER (Task 6 does viewer + minimal title/ack edit); recurring-task escalation surfacing (engine supports per-trip; run-board escalation is a follow-up); real Teams/email delivery (inbox is the stand-in); myairops pull (manual trip create stands in); DST-correct office TZ (fixed -240 placeholder).

**Risks:** the mutable-store + `bump()` re-render pattern is the main non-standard bit — every mutation MUST `bump()` or the UI goes stale. Async reads (`tripReadiness`, `listXxx` are Promises) need `useEffect`+state in each panel keyed on `tick`; don't call them directly in render.

**Type consistency:** panels consume `useSchedulingWorkspace()` → `{ service, store, ready, tick, bump, nowUtc, officeTzOffsetMinutes }`; `service` methods per Plan 2 (`generateRunBoard`, `createTripMirror`, `applyAction`, `tripReadiness`); store reads per the `SchedulingStore` interface; engine `evaluateTriggers` from the barrel.
