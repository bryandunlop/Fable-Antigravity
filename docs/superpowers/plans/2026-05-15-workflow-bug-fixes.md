# Inventory V2 — Workflow Bug Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 7 bugs that break or confuse the core inspection→pick→restock workflow so the demo flows correctly end-to-end.

**Architecture:** All changes are surgical edits to existing files — no new components, no new routes. The largest change is wiring the inspection submission to auto-generate pick list items when shortages exist.

**Tech Stack:** React 18, TypeScript, React Router v6, Vite, Tailwind CSS, shadcn/ui, Sonner (toasts)

---

## File Map

| File | Change |
|---|---|
| `src/components/inventory-v2/types.ts` | Add `ADD_PICK_ITEMS` action type |
| `src/components/inventory-v2/InventoryV2Context.tsx` | Add `ADD_PICK_ITEMS` reducer case |
| `src/components/inventory-v2/pages/InspectionReview.tsx` | Fix status chain, back button, cancel warning |
| `src/components/inventory-v2/pages/InspectionForm.tsx` | Resume, draft auto-save, inspector selector |
| `src/components/inventory-v2/pages/InventoryV2Dashboard.tsx` | Wire user + date filters |
| `src/components/inventory-v2/pages/UnitItemRequestList.tsx` | Add cancel + in_progress actions, fix color mapping |
| `src/components/inventory-v2/constants.ts` | No change needed (STATUS_COLORS already has cancelled/in_progress_req) |

---

## Task 1 — Add `ADD_PICK_ITEMS` Action + Wire Status Chain

The most critical fix. Submitting an inspection with missing items must set status to `restocking_needed` and auto-populate the pick list.

**Files:**
- Modify: `src/components/inventory-v2/types.ts`
- Modify: `src/components/inventory-v2/InventoryV2Context.tsx`
- Modify: `src/components/inventory-v2/pages/InspectionReview.tsx`

- [ ] **Step 1.1 — Add `ADD_PICK_ITEMS` to the action union in `types.ts`**

Find the `InventoryV2Action` union (around line 233). Add this line after `UPDATE_PICK_ITEM`:

```typescript
| { type: 'ADD_PICK_ITEMS'; payload: PickListItem[] }
```

- [ ] **Step 1.2 — Add `ADD_PICK_ITEMS` reducer case in `InventoryV2Context.tsx`**

Find the `case 'UPDATE_PICK_ITEM':` block (around line 123). Add immediately after it:

```typescript
case 'ADD_PICK_ITEMS':
  return { ...state, pickListItems: [...state.pickListItems, ...action.payload] };
```

- [ ] **Step 1.3 — Rewrite `handleComplete` in `InspectionReview.tsx`**

Find `handleComplete` (around line 205). Replace the entire callback:

```typescript
const handleComplete = useCallback(() => {
  if (!draft || !aircraft) {
    toast.error('No inspection data found');
    return;
  }

  const hasMissingItems = missingItems.length > 0;

  const charges: MissingItemCharge[] = missingItems.map((mi) => {
    const cost = costOverrides[mi.itemId] ?? mi.defaultCost;
    return {
      itemId: mi.itemId,
      description: mi.description,
      qtyMissing: mi.qtyMissing,
      fromCompartment: mi.compartmentId,
      costPerUnit: cost,
      total: mi.qtyMissing * cost,
      chargeToGuest: chargeFlags[mi.itemId] ?? false,
    };
  });

  const inspectionId = `insp-${Date.now()}`;

  const inspection: InspectionV2 = {
    id: inspectionId,
    tailNumber: draft.tailNumber,
    aircraftType: draft.aircraftType,
    date: new Date().toISOString(),
    reportedBy: MOCK_USERS[0].name,
    reservationId: reservationId || undefined,
    status: hasMissingItems ? 'restocking_needed' : 'submitted',
    checkedItems: draft.checkedItems,
    topLevelNotes,
    photos,
    additionalFees,
    missingItemCharges: charges,
    readinessScore: draft.readinessScore,
    submittedAt: new Date().toISOString(),
  };

  dispatch({ type: 'ADD_INSPECTION', payload: inspection });

  if (hasMissingItems) {
    const pickItems: PickListItem[] = missingItems.map((mi) => ({
      id: `pick-${Date.now()}-${mi.itemId}`,
      inspectionId,
      unitTailNumber: draft.tailNumber,
      itemId: mi.itemId,
      qtyNeeded: mi.qtyMissing,
      qtyTaken: 0,
      done: false,
    }));
    dispatch({ type: 'ADD_PICK_ITEMS', payload: pickItems });
    toast.success('Inspection submitted — restock needed. Pick list updated.');
    navigate('/inventory-v2/pick-list');
  } else {
    toast.success('Inspection completed successfully');
    navigate('/inventory-v2/my-inspections');
  }
}, [
  draft, aircraft, missingItems, costOverrides, chargeFlags,
  topLevelNotes, photos, additionalFees, reservationId, dispatch, navigate,
]);
```

Add `PickListItem` to the imports at the top of the file:
```typescript
import type {
  InspectionCheckedItem,
  AdditionalFee,
  MissingItemCharge,
  InspectionV2,
  PickListItem,
} from '../types';
```

- [ ] **Step 1.4 — Verify TypeScript compiles**

```bash
cd ~/Antigravity/Antigravity-Aviation-Management-System
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 1.5 — Manual test**

1. Start the dev server: `npm run dev`
2. Navigate to `/inventory-v2/inspection`
3. Select an aircraft, set some items to qty 0 (below required)
4. Click Review → Complete
5. Expected: toast says "restock needed", redirected to `/inventory-v2/pick-list`
6. Open pick list — the missing items from your inspection appear as new rows

- [ ] **Step 1.6 — Commit**

```bash
git add src/components/inventory-v2/types.ts \
        src/components/inventory-v2/InventoryV2Context.tsx \
        src/components/inventory-v2/pages/InspectionReview.tsx
git commit -m "fix: wire inspection→restocking_needed status and auto-populate pick list"
```

---

## Task 2 — Fix Resume Inspection from Dashboard

**Files:**
- Modify: `src/components/inventory-v2/pages/InspectionForm.tsx`

- [ ] **Step 2.1 — Add `useSearchParams` import**

At the top of `InspectionForm.tsx`, find the react-router-dom import and add `useSearchParams`:

```typescript
import { useNavigate, useSearchParams } from 'react-router-dom';
```

- [ ] **Step 2.2 — Read the `resume` param and restore draft on mount**

Inside the `InspectionForm` component, find where `useNavigate` is called. Add directly below it:

```typescript
const [searchParams] = useSearchParams();
```

Then find the `useEffect` that calls `sessionStorage.getItem(SESSION_KEY)` (if one exists), or find where `selectedTailNumber` state is initialized. Add a new `useEffect` that runs once on mount to handle resume:

```typescript
// Resume an in-progress inspection by ID
useEffect(() => {
  const resumeId = searchParams.get('resume');
  if (!resumeId) return;

  const inspection = state.inspections.find((i) => i.id === resumeId);
  if (!inspection) {
    toast.error('Inspection not found');
    return;
  }

  setSelectedTailNumber(inspection.tailNumber);

  // Restore checkedItems map from saved inspection
  const restored = new Map<string, InspectionCheckedItem>();
  inspection.checkedItems.forEach((ci) => {
    restored.set(ci.itemId, ci);
  });
  setCheckedItems(restored);

  toast.info(`Resuming inspection for ${inspection.tailNumber}`);
}, []); // run once on mount only
```

Make sure `InspectionCheckedItem` is imported from `../types` (it should already be).

- [ ] **Step 2.3 — Show "Resuming" indicator in the header**

Find the header section that shows the aircraft selector. Add a small banner above or below it:

```typescript
{searchParams.get('resume') && (
  <div className="mb-3 flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-400">
    <span>↩</span>
    <span>Resuming in-progress inspection</span>
  </div>
)}
```

- [ ] **Step 2.4 — Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 2.5 — Manual test**

1. Start an inspection, do NOT click Review, navigate away
2. Go to Dashboard or My Inspections — find the in-progress card
3. Click it — should navigate to `/inventory-v2/inspection?resume=<id>`
4. Expected: form opens with aircraft pre-selected and items restored, amber "Resuming" banner shown

- [ ] **Step 2.6 — Commit**

```bash
git add src/components/inventory-v2/pages/InspectionForm.tsx
git commit -m "fix: implement resume inspection from dashboard via ?resume= query param"
```

---

## Task 3 — Draft Auto-Save During Inspection

**Files:**
- Modify: `src/components/inventory-v2/pages/InspectionForm.tsx`

- [ ] **Step 3.1 — Add debounced auto-save effect**

Find `const SESSION_KEY = 'inv-v2-inspection-draft';` at the top of the file (around line 37).

Inside the component, find the existing `useEffect` that writes to sessionStorage (the one triggered by clicking "Review"). Add a new, separate `useEffect` for auto-save. Place it after the `checkedItems` state is declared:

```typescript
// Auto-save draft to sessionStorage on every change (debounced 500ms)
useEffect(() => {
  if (!selectedTailNumber || checkedItems.size === 0) return;

  const aircraft = state.fleet.find((a) => a.tailNumber === selectedTailNumber);
  if (!aircraft) return;

  const timer = setTimeout(() => {
    const draft = {
      tailNumber: selectedTailNumber,
      aircraftType: aircraft.type,
      checkedItems: Array.from(checkedItems.values()),
      readinessScore: 0, // will be recalculated on review
    };
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(draft));
    } catch {
      // storage full — silently ignore
    }
  }, 500);

  return () => clearTimeout(timer);
}, [selectedTailNumber, checkedItems, state.fleet]);
```

- [ ] **Step 3.2 — Show "resume unsaved draft" banner on mount**

Add state to track whether an unsaved draft was found:

```typescript
const [hasUnsavedDraft, setHasUnsavedDraft] = useState(false);
```

In the mount effect (from Task 2, or add a new one if it doesn't exist yet), check for an existing draft when there's no `?resume` param:

```typescript
useEffect(() => {
  const resumeId = searchParams.get('resume');
  if (resumeId) return; // handled by Task 2's effect

  const raw = sessionStorage.getItem(SESSION_KEY);
  if (raw) {
    setHasUnsavedDraft(true);
  }
}, []);
```

Add the banner in the JSX, below the aircraft selector:

```typescript
{hasUnsavedDraft && !searchParams.get('resume') && (
  <div className="mb-3 flex items-center justify-between rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-sm text-blue-400">
    <span>↩ You have an unsaved draft from a previous session</span>
    <div className="flex gap-2">
      <button
        className="underline"
        onClick={() => {
          try {
            const raw = sessionStorage.getItem(SESSION_KEY);
            if (!raw) return;
            const draft = JSON.parse(raw);
            setSelectedTailNumber(draft.tailNumber);
            const restored = new Map<string, InspectionCheckedItem>();
            draft.checkedItems.forEach((ci: InspectionCheckedItem) => restored.set(ci.itemId, ci));
            setCheckedItems(restored);
          } catch { /* ignore */ }
          setHasUnsavedDraft(false);
        }}
      >
        Resume
      </button>
      <button
        className="underline opacity-60"
        onClick={() => {
          sessionStorage.removeItem(SESSION_KEY);
          setHasUnsavedDraft(false);
        }}
      >
        Discard
      </button>
    </div>
  </div>
)}
```

- [ ] **Step 3.3 — Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 3.4 — Manual test**

1. Open a new inspection, select aircraft, change some quantities
2. Navigate away (go to Dashboard)
3. Return to `/inventory-v2/inspection`
4. Expected: blue "unsaved draft" banner appears with Resume / Discard options
5. Click Resume → quantities restored

- [ ] **Step 3.5 — Commit**

```bash
git add src/components/inventory-v2/pages/InspectionForm.tsx
git commit -m "fix: auto-save inspection draft to sessionStorage with unsaved-draft restore banner"
```

---

## Task 4 — Back Button on Review + Cancel Warning

**Files:**
- Modify: `src/components/inventory-v2/pages/InspectionReview.tsx`

- [ ] **Step 4.1 — Import `AlertDialog` components**

Add to the existing shadcn imports at the top of `InspectionReview.tsx`:

```typescript
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../../ui/alert-dialog';
```

Import `ArrowLeft` from lucide-react:
```typescript
import { Plus, Trash2, Camera, Check, ArrowLeft } from 'lucide-react';
```

- [ ] **Step 4.2 — Add Back button to the header**

Find the page header section (the div/card at the top with the inspection title). Add a Back button that preserves the draft:

```typescript
<Button
  variant="ghost"
  size="sm"
  className="mb-4 gap-2"
  onClick={() => navigate('/inventory-v2/inspection')}
>
  <ArrowLeft className="h-4 w-4" />
  Back to Inspection
</Button>
```

Place this above the main card/header. The draft is already in sessionStorage (written when "Review" was clicked in InspectionForm), so navigating back will let the form restore it.

- [ ] **Step 4.3 — Replace the Cancel button with an AlertDialog-wrapped version**

Find the existing Cancel button in the footer (near the Complete button). Replace it:

```typescript
<AlertDialog>
  <AlertDialogTrigger asChild>
    <Button variant="outline">Cancel</Button>
  </AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Discard this inspection?</AlertDialogTitle>
      <AlertDialogDescription>
        This will permanently discard all inspection data including notes, photos, and fees. This cannot be undone.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Keep editing</AlertDialogCancel>
      <AlertDialogAction
        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
        onClick={() => {
          sessionStorage.removeItem(SESSION_KEY);
          navigate('/inventory-v2');
        }}
      >
        Discard inspection
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

- [ ] **Step 4.4 — Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 4.5 — Manual test**

1. Complete an inspection form, click Review
2. On Review screen: click "← Back to Inspection" — form reopens with data intact
3. Click Review again, then click Cancel
4. Expected: AlertDialog appears with "Discard inspection?" warning
5. Click "Keep editing" — stays on review screen
6. Click Cancel again → "Discard inspection" → navigates to home, draft cleared

- [ ] **Step 4.6 — Commit**

```bash
git add src/components/inventory-v2/pages/InspectionReview.tsx
git commit -m "fix: add Back button to review screen and AlertDialog-guarded Cancel"
```

---

## Task 5 — Inspector Name Selector

**Files:**
- Modify: `src/components/inventory-v2/pages/InspectionForm.tsx`
- Modify: `src/components/inventory-v2/pages/InspectionReview.tsx`

- [ ] **Step 5.1 — Add user selector state to InspectionForm**

Find `MOCK_USERS` import in `InspectionForm.tsx` (it should already be imported from `../constants`). Add state:

```typescript
const [selectedUser, setSelectedUser] = useState(MOCK_USERS[0]);
```

- [ ] **Step 5.2 — Add user selector UI to InspectionForm**

Find the aircraft selector section near the top of the form JSX. Add a user selector directly above it:

```typescript
{/* Inspector selector */}
<div className="mb-4">
  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
    Inspector
  </label>
  <Select
    value={selectedUser.id}
    onValueChange={(id) => {
      const user = MOCK_USERS.find((u) => u.id === id);
      if (user) setSelectedUser(user);
    }}
  >
    <SelectTrigger className="h-10">
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      {MOCK_USERS.map((user) => (
        <SelectItem key={user.id} value={user.id}>
          {user.name}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>
```

Import `Select` components if not already imported:
```typescript
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
```

- [ ] **Step 5.3 — Pass selected user through the sessionStorage draft**

In the `InspectionDraft` interface at the top of `InspectionReview.tsx`, add `reportedBy`:

```typescript
interface InspectionDraft {
  tailNumber: string;
  aircraftType: 'G650' | 'G500';
  checkedItems: InspectionCheckedItem[];
  readinessScore: number;
  reportedBy: string; // add this
}
```

In `InspectionForm.tsx`, find where the draft is written to sessionStorage (the handler triggered by clicking "Review"). Add `reportedBy` to the draft object:

```typescript
const draft = {
  tailNumber: selectedTailNumber,
  aircraftType: aircraft.type,
  checkedItems: Array.from(checkedItems.values()),
  readinessScore,
  reportedBy: selectedUser.name, // add this
};
sessionStorage.setItem(SESSION_KEY, JSON.stringify(draft));
```

- [ ] **Step 5.4 — Use `draft.reportedBy` in `handleComplete` in InspectionReview**

Find `reportedBy: MOCK_USERS[0].name` in `handleComplete`. Replace:

```typescript
reportedBy: draft.reportedBy ?? MOCK_USERS[0].name,
```

- [ ] **Step 5.5 — Show inspector name on the Review screen**

In `InspectionReview.tsx`, find the header area that shows the tail number and date. Add the reporter display:

```typescript
{draft?.reportedBy && (
  <p className="text-sm text-muted-foreground">
    Inspector: <span className="font-medium text-foreground">{draft.reportedBy}</span>
  </p>
)}
```

- [ ] **Step 5.6 — Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 5.7 — Manual test**

1. Open a new inspection
2. Change the Inspector dropdown from the default to a different user
3. Click Review — the review screen shows the correct inspector name
4. Complete the inspection — it appears in My Inspections attributed to the correct user

- [ ] **Step 5.8 — Commit**

```bash
git add src/components/inventory-v2/pages/InspectionForm.tsx \
        src/components/inventory-v2/pages/InspectionReview.tsx
git commit -m "fix: add inspector name selector to inspection form; removes hardcoded Sarah Mitchell"
```

---

## Task 6 — Wire Dashboard User and Date Filters

**Files:**
- Modify: `src/components/inventory-v2/pages/InventoryV2Dashboard.tsx`

- [ ] **Step 6.1 — Add filter helpers for user and date**

In `InventoryV2Dashboard.tsx`, find `matchesUnitFilter`. Add two more helpers directly below it:

```typescript
const matchesUserFilter = (reportedBy: string) => {
  if (!filters.userFilter || filters.userFilter === 'everyone') return true;
  return reportedBy === filters.userFilter;
};

const matchesDateFilter = (dateStr: string) => {
  if (!filters.dateFrom && !filters.dateTo) return true;
  const date = new Date(dateStr).getTime();
  const from = filters.dateFrom ? new Date(filters.dateFrom).getTime() : -Infinity;
  const to = filters.dateTo
    ? new Date(filters.dateTo + 'T23:59:59').getTime()
    : Infinity;
  return date >= from && date <= to;
};
```

- [ ] **Step 6.2 — Apply all three filters to every panel**

Update each `useMemo` to use all three filter helpers. Replace the five panel memos:

```typescript
const inProgress = useMemo(() =>
  state.inspections.filter(i =>
    i.status === 'in_progress' &&
    matchesUnitFilter(i.tailNumber) &&
    matchesUserFilter(i.reportedBy) &&
    matchesDateFilter(i.date)
  ),
  [state.inspections, filters]
);

const recentlyCompleted = useMemo(() =>
  state.inspections
    .filter(i =>
      (i.status === 'submitted' || i.status === 'restocked') &&
      matchesUnitFilter(i.tailNumber) &&
      matchesUserFilter(i.reportedBy) &&
      matchesDateFilter(i.date)
    )
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 10),
  [state.inspections, filters]
);

const restockingNeeded = useMemo(() =>
  state.inspections.filter(i =>
    i.status === 'restocking_needed' &&
    matchesUnitFilter(i.tailNumber) &&
    matchesUserFilter(i.reportedBy) &&
    matchesDateFilter(i.date)
  ),
  [state.inspections, filters]
);

const recentlyRestocked = useMemo(() =>
  state.inspections
    .filter(i =>
      i.status === 'restocked' &&
      matchesUnitFilter(i.tailNumber) &&
      matchesUserFilter(i.reportedBy) &&
      matchesDateFilter(i.date)
    )
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5),
  [state.inspections, filters]
);

const openRequests = useMemo(() =>
  state.unitItemRequests.filter(r =>
    r.status === 'open' &&
    matchesUnitFilter(r.unitTailNumber) &&
    matchesUserFilter(r.requestedBy) &&
    matchesDateFilter(r.requestDate)
  ),
  [state.unitItemRequests, filters]
);

const completedRequests = useMemo(() =>
  state.unitItemRequests.filter(r =>
    r.status === 'fulfilled' &&
    matchesUnitFilter(r.unitTailNumber) &&
    matchesUserFilter(r.requestedBy) &&
    matchesDateFilter(r.requestDate)
  ),
  [state.unitItemRequests, filters]
);
```

- [ ] **Step 6.3 — Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 6.4 — Manual test**

1. Open Dashboard, click Filters
2. Set User to "Sarah Mitchell"
3. Expected: panels only show Sarah's inspections/requests
4. Set a date range (e.g. today only)
5. Expected: panels further filtered to that date range
6. Clear filters — all data returns

- [ ] **Step 6.5 — Commit**

```bash
git add src/components/inventory-v2/pages/InventoryV2Dashboard.tsx
git commit -m "fix: wire user and date range filters in dashboard panel queries"
```

---

## Task 7 — Unit Item Request: Cancel + In-Progress Actions

**Files:**
- Modify: `src/components/inventory-v2/pages/UnitItemRequestList.tsx`

- [ ] **Step 7.1 — Import AlertDialog and fix STATUS_COLORS mapping**

Add AlertDialog imports at the top of `UnitItemRequestList.tsx`:

```typescript
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../../ui/alert-dialog';
```

- [ ] **Step 7.2 — Fix the `getStatusColors` function**

Find the `getStatusColors` function (or the `switch`/`case` that maps status to `STATUS_COLORS`). The `in_progress` status currently falls through to the default. Fix it:

```typescript
const getStatusColors = (status: UnitItemRequest['status']) => {
  switch (status) {
    case 'open':        return STATUS_COLORS.open;
    case 'in_progress': return STATUS_COLORS.in_progress_req; // amber, not blue
    case 'fulfilled':   return STATUS_COLORS.fulfilled;
    case 'cancelled':   return STATUS_COLORS.cancelled;
    default:            return STATUS_COLORS.open;
  }
};
```

(`STATUS_COLORS.in_progress_req` already exists in `constants.ts` with amber styling.)

- [ ] **Step 7.3 — Add "Mark In Progress" button to the detail Sheet**

Find the section in the Sheet that shows the action buttons (where "Mark Fulfilled" is rendered). Add "Mark In Progress" for `open` requests:

```typescript
{selectedRequest.status === 'open' && (
  <div className="flex gap-2 pt-4 border-t">
    <Button
      size="sm"
      variant="outline"
      className="gap-1 border-amber-500/40 text-amber-400 hover:bg-amber-500/10"
      onClick={() => {
        dispatch({
          type: 'UPDATE_UNIT_REQUEST',
          payload: { ...selectedRequest, status: 'in_progress' },
        });
        setSelectedRequest(null);
        toast.success('Request marked in progress');
      }}
    >
      Mark In Progress
    </Button>
    <Button
      size="sm"
      className="gap-1"
      onClick={() => {
        dispatch({
          type: 'UPDATE_UNIT_REQUEST',
          payload: { ...selectedRequest, status: 'fulfilled' },
        });
        setSelectedRequest(null);
        toast.success('Request marked fulfilled');
      }}
    >
      <Check className="w-4 h-4 mr-1" /> Mark Fulfilled
    </Button>
  </div>
)}
```

- [ ] **Step 7.4 — Add "Mark Fulfilled" and "Cancel Request" for `in_progress` requests**

Directly below the `open` block, add actions for `in_progress`:

```typescript
{selectedRequest.status === 'in_progress' && (
  <div className="flex gap-2 pt-4 border-t">
    <Button
      size="sm"
      className="gap-1"
      onClick={() => {
        dispatch({
          type: 'UPDATE_UNIT_REQUEST',
          payload: { ...selectedRequest, status: 'fulfilled' },
        });
        setSelectedRequest(null);
        toast.success('Request marked fulfilled');
      }}
    >
      <Check className="w-4 h-4 mr-1" /> Mark Fulfilled
    </Button>
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant="outline" className="border-red-500/40 text-red-400 hover:bg-red-500/10">
          Cancel Request
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancel this request?</AlertDialogTitle>
          <AlertDialogDescription>
            This cannot be undone. The request will be marked cancelled.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep request</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={() => {
              dispatch({
                type: 'UPDATE_UNIT_REQUEST',
                payload: { ...selectedRequest, status: 'cancelled' },
              });
              setSelectedRequest(null);
              toast.success('Request cancelled');
            }}
          >
            Cancel request
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
)}
```

- [ ] **Step 7.5 — Grey out cancelled request cards**

Find where request cards are rendered (the grid of cards). Add a `cancelled` visual state:

```typescript
<div
  key={request.id}
  className={`cursor-pointer rounded-xl border p-4 transition-colors hover:border-primary/50 hover:bg-muted/30 ${
    request.status === 'cancelled' ? 'opacity-50 pointer-events-none' : ''
  }`}
  onClick={() => request.status !== 'cancelled' && setSelectedRequest(request)}
>
```

- [ ] **Step 7.6 — Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 7.7 — Manual test**

1. Open `/inventory-v2/unit-requests`, click an open request
2. Sheet opens: "Mark In Progress" and "Mark Fulfilled" buttons visible
3. Click "Mark In Progress" → card updates to amber "In Progress" badge
4. Reopen the card → "Mark Fulfilled" and "Cancel Request" visible
5. Click "Cancel Request" → AlertDialog appears → confirm → card greyed out
6. Cancelled card is no longer clickable

- [ ] **Step 7.8 — Commit**

```bash
git add src/components/inventory-v2/pages/UnitItemRequestList.tsx
git commit -m "fix: add cancel + in-progress actions to unit item requests; fix amber color mapping"
```

---

## Final Verification

- [ ] Run TypeScript check one last time:

```bash
npx tsc --noEmit
```

- [ ] Run the dev server and walk through the complete inspection flow end-to-end:
  1. New inspection → set some items low → Review → Complete
  2. Redirected to Pick List — shortages appear
  3. Dashboard → Filters → apply user filter → panels respond
  4. Unit Item Requests → mark in progress → cancel one

- [ ] All 7 bugs confirmed fixed. Track 1 complete.
