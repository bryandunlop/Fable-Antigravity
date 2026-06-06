# Page Consolidation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consolidate ~10 pages into 2 unified pages — Aircraft Inspections (audit + history) and Commissary (stockroom management command center) — and simplify navigation.

**Architecture:** Two new page components replace 7 old ones. A new `StorageLocation` data type is added for commissary shelf/bin organization. The Commissary page uses modal overlays for Receive Stock, Shopping List, Add Item, and Manage Locations actions. InspectionForm is reused as-is for the audit flow, wrapped by a new AircraftInspections landing page.

**Tech Stack:** React 18, TypeScript, Tailwind CSS v4, shadcn/ui, Lucide React icons, react-router-dom, sonner (toasts)

**Spec:** `~/Obsidian/Antigravity/inventory-v2/specs/2026-06-06-page-consolidation-design.md`

**Design system:** `~/Obsidian/Antigravity/context/DESIGN-SYSTEM.md` — glass-premium cards, CSS variables for colors, Lucide icons only, light+dark mode support

**Code repo root:** `~/Antigravity/Antigravity-Aviation-Management-System/`

**Key paths:**
- Pages: `src/components/inventory-v2/pages/`
- Shared: `src/components/inventory-v2/shared/`
- Types: `src/components/inventory-v2/types.ts`
- Context/Reducer: `src/components/inventory-v2/InventoryV2Context.tsx`
- Constants: `src/components/inventory-v2/constants.ts`
- Mock data: `src/components/inventory-v2/mockData.ts`
- Routes + Nav: `src/App.tsx`, `src/components/Navigation.tsx`

---

## Task 1: Add StorageLocation type and vendor field to types.ts

**Files:**
- Modify: `src/components/inventory-v2/types.ts`

- [ ] **Step 1: Add StorageLocation interface after the Stockroom section (~line 125)**

In `types.ts`, after the `StockroomItem` interface (after line 134), add:

```typescript
// ─── Storage Locations (Commissary shelf/bin organization) ──────────────

export type StorageLocationType = 'shelf' | 'cabinet' | 'rack' | 'closet' | 'other';

export interface StorageLocation {
  id: string;
  name: string;           // "Shelf A — Beverages", "Medicine Cabinet", etc.
  type: StorageLocationType;
  sortOrder: number;
}
```

- [ ] **Step 2: Add `locationId` to StockroomItem**

In the `StockroomItem` interface, add `locationId` after `binLocation`:

```typescript
export interface StockroomItem {
  itemId: string;
  stockroomId: string;
  qtyOnHand: number;
  parLevel: number;
  minimumLevel: number;
  binLocation: string;
  locationId?: string;    // references StorageLocation.id
}
```

- [ ] **Step 3: Add `vendor` field to InventoryItemV2**

In the `InventoryItemV2` interface, add `vendor` after `reorderUrl` (~line 68):

```typescript
  reorderUrl?: string;
  vendor?: string;        // "Amazon" | "Kroger" | "Instacart" | custom string — for shopping list grouping
  barcode?: string;
```

- [ ] **Step 4: Add `storageLocations` to InventoryV2State**

In the `InventoryV2State` interface, add after `stockroomItems`:

```typescript
  stockroomItems: StockroomItem[];
  storageLocations: StorageLocation[];
```

- [ ] **Step 5: Add storage location actions to InventoryV2Action union**

Add these after the `BULK_UPDATE_STOCKROOM` action:

```typescript
  // Storage locations
  | { type: 'ADD_STORAGE_LOCATION'; payload: StorageLocation }
  | { type: 'UPDATE_STORAGE_LOCATION'; payload: Partial<StorageLocation> & { id: string } }
  | { type: 'REMOVE_STORAGE_LOCATION'; payload: string } // locationId
  | { type: 'REORDER_STORAGE_LOCATIONS'; payload: string[] } // ordered ids
```

- [ ] **Step 6: Verify the app still compiles**

Run: `cd ~/Antigravity/Antigravity-Aviation-Management-System && npx tsc --noEmit 2>&1 | head -30`

Expected: Compilation errors about missing `storageLocations` in initial state — that's expected, we'll fix it in Task 2.

- [ ] **Step 7: Commit**

```bash
git add src/components/inventory-v2/types.ts
git commit -m "feat: add StorageLocation type, vendor field, and locationId to types"
```

---

## Task 2: Add reducer cases and seed mock data

**Files:**
- Modify: `src/components/inventory-v2/InventoryV2Context.tsx`
- Modify: `src/components/inventory-v2/mockData.ts`

- [ ] **Step 1: Add storage location reducer cases to InventoryV2Context.tsx**

Find the reducer function. After the `case 'BULK_UPDATE_STOCKROOM':` case, add:

```typescript
    // ── Storage Locations ──
    case 'ADD_STORAGE_LOCATION':
      return { ...state, storageLocations: [...state.storageLocations, action.payload] };
    case 'UPDATE_STORAGE_LOCATION': {
      const { id, ...updates } = action.payload;
      return {
        ...state,
        storageLocations: state.storageLocations.map(loc =>
          loc.id === id ? { ...loc, ...updates } : loc
        ),
      };
    }
    case 'REMOVE_STORAGE_LOCATION':
      return {
        ...state,
        storageLocations: state.storageLocations.filter(loc => loc.id !== action.payload),
      };
    case 'REORDER_STORAGE_LOCATIONS': {
      const orderedIds = action.payload;
      const reordered = orderedIds
        .map((id, idx) => {
          const loc = state.storageLocations.find(l => l.id === id);
          return loc ? { ...loc, sortOrder: idx } : null;
        })
        .filter(Boolean) as import('./types').StorageLocation[];
      return { ...state, storageLocations: reordered };
    }
```

- [ ] **Step 2: Add `storageLocations: []` to the initial state in the context provider**

Find the `initialState` or the `buildInitialState` function in `InventoryV2Context.tsx`. Add `storageLocations` to the initial state object, seeded from mock data. Look for where `STOCKROOM_ITEMS` is imported and referenced — add a `STORAGE_LOCATIONS` import alongside it.

Add to the imports at the top:

```typescript
import { STORAGE_LOCATIONS } from './mockData';
```

Add to the initial state where other mock data is seeded:

```typescript
storageLocations: STORAGE_LOCATIONS,
```

- [ ] **Step 3: Add `STORAGE_LOCATIONS` seed data to mockData.ts**

At the end of `mockData.ts`, before or after `STOCKROOM_ITEMS`, add:

```typescript
// ─── Storage Locations (Commissary shelves/bins) ────────────────────────

import type { StorageLocation } from './types';

export const STORAGE_LOCATIONS: StorageLocation[] = [
  { id: 'loc-a', name: 'Shelf A — Beverages',             type: 'shelf',   sortOrder: 0 },
  { id: 'loc-b', name: 'Shelf B — Coffee, Tea & Sweetener', type: 'shelf',   sortOrder: 1 },
  { id: 'loc-mc', name: 'Medicine Cabinet',                 type: 'cabinet', sortOrder: 2 },
  { id: 'loc-c', name: 'Shelf C — Toiletries & Self-Care',  type: 'shelf',   sortOrder: 3 },
  { id: 'loc-d', name: 'Shelf D — Cleaning Supplies',       type: 'shelf',   sortOrder: 4 },
  { id: 'loc-e', name: 'Shelf E — Kitchen & Dishware',      type: 'shelf',   sortOrder: 5 },
  { id: 'loc-f', name: 'Shelf F — Paper Goods & Food Storage', type: 'shelf', sortOrder: 6 },
  { id: 'loc-wr', name: 'Wine Rack',                        type: 'rack',    sortOrder: 7 },
  { id: 'loc-cl', name: 'Closet — Linens & Miscellaneous',  type: 'closet',  sortOrder: 8 },
  { id: 'loc-g', name: 'Shelf G — Snacks & Condiments',     type: 'shelf',   sortOrder: 9 },
];
```

- [ ] **Step 4: Update `generateStockroomItems()` to assign `locationId` by category**

In `mockData.ts`, modify the `generateStockroomItems` function to assign `locationId` based on the item's `supplyCategory`:

```typescript
function categoryToLocationId(cat: SupplyCategory): string {
  const map: Record<SupplyCategory, string> = {
    'beverages': 'loc-a',
    'coffee': 'loc-b',
    'tea': 'loc-b',
    'sweetener': 'loc-b',
    'medicine': 'loc-mc',
    'first-aid': 'loc-mc',
    'toiletries': 'loc-c',
    'self-care': 'loc-c',
    'cleaning-supplies': 'loc-d',
    'kitchen-supplies': 'loc-e',
    'paper-goods': 'loc-f',
    'wine': 'loc-wr',
    'linens': 'loc-cl',
    'miscellaneous': 'loc-cl',
    'snacks': 'loc-g',
  };
  return map[cat] ?? 'loc-cl';
}

function generateStockroomItems(): StockroomItem[] {
  const bins = ['A1', 'A2', 'A3', 'B1', 'B2', 'B3', 'C1', 'C2', 'C3', 'D1', 'D2', 'D3', 'E1', 'E2', 'F1', 'F2'];
  return ITEMS_V2.map((item, i) => ({
    itemId: item.id,
    stockroomId: 'sr-1',
    qtyOnHand: Math.floor(Math.random() * 20) + 3,
    parLevel: Math.max((item.defaultQuantities.G650 ?? item.defaultQuantities.G500 ?? 2) * 3, 6),
    minimumLevel: Math.max((item.defaultQuantities.G650 ?? item.defaultQuantities.G500 ?? 1) * 1, 2),
    binLocation: bins[i % bins.length],
    locationId: categoryToLocationId(item.supplyCategory),
  }));
}
```

- [ ] **Step 5: Add `vendor` values to a representative subset of items in ITEMS_V2**

In `mockData.ts`, add `vendor` to the `itemV2` helper function signature and pass it through, then add vendor values to items. The simplest approach: add vendor as an optional param to `itemV2()`:

Update the `itemV2` function signature to accept an optional `vendor` param:

```typescript
function itemV2(
  itemName: string,
  category: string,
  supplyCategory: SupplyCategory,
  compartmentId: string,
  location: string,
  uom: UnitOfMeasure,
  g650qty: number | null,
  g500qty: number | null,
  costPerUnit: number,
  vendorItemNumber?: string,
  internalItemNumber?: string,
  isConsumable?: boolean,
  posCategory?: string,
  vendor?: string,
  reorderUrl?: string,
): InventoryItemV2 {
  // ... existing body ...
  return {
    // ... existing fields ...
    ...(vendor !== undefined && { vendor }),
    ...(reorderUrl !== undefined && { reorderUrl }),
  };
}
```

Then add `vendor` and `reorderUrl` to a handful of representative items. For example, on the beverages:
- Perrier: `vendor: 'Amazon'`, `reorderUrl: 'https://amazon.com/dp/B000WGLHCI'`
- Coca-Cola: `vendor: 'Instacart'`, `reorderUrl: 'https://instacart.com/products/coca-cola'`
- Nespresso Pods: `vendor: 'Amazon'`, `reorderUrl: 'https://amazon.com/dp/B07F8VJVX4'`
- Green Tea: `vendor: 'Amazon'`, `reorderUrl: 'https://amazon.com/dp/B000FFIL86'`
- Advil: `vendor: 'Amazon'`, `reorderUrl: 'https://amazon.com/dp/B005NE4DMO'`
- Paper Towel Rolls: `vendor: 'Kroger'`, `reorderUrl: 'https://kroger.com/p/bounty'`
- Disinfecting Wipes: `vendor: 'Amazon'`, `reorderUrl: 'https://amazon.com/dp/B00HSC9F9G'`
- Benadryl: `vendor: 'Amazon'`, `reorderUrl: 'https://amazon.com/dp/B001FWXJD0'`

Add these vendor/reorderUrl values as the last two params of the corresponding `itemV2()` calls. Do at least 10-15 items across different categories so the Shopping List has meaningful vendor groupings.

- [ ] **Step 6: Verify the app compiles and loads**

Run: `cd ~/Antigravity/Antigravity-Aviation-Management-System && npx tsc --noEmit 2>&1 | head -20`

Expected: No errors (or only pre-existing warnings)

- [ ] **Step 7: Commit**

```bash
git add src/components/inventory-v2/InventoryV2Context.tsx src/components/inventory-v2/mockData.ts
git commit -m "feat: add StorageLocation reducer, seed locations, assign locationId and vendor to mock data"
```

---

## Task 3: Build AircraftInspections page

**Files:**
- Create: `src/components/inventory-v2/pages/AircraftInspections.tsx`
- Modify: `src/components/inventory-v2/pages/InspectionForm.tsx` (add `?tail=` support)

- [ ] **Step 1: Add `?tail=` pre-selection to InspectionForm**

In `InspectionForm.tsx`, find the `useEffect` that handles `?resume=` (around line 128). Add a new effect before it to handle `?tail=`:

```typescript
  // ── Pre-select aircraft from ?tail= query param ──
  useEffect(() => {
    const tailParam = searchParams.get('tail');
    if (!tailParam || selectedTailNumber) return; // don't override if already selected
    const aircraft = state.fleet.find(a => a.tailNumber === tailParam);
    if (aircraft) {
      setSelectedTailNumber(tailParam);
    }
  }, [searchParams, state.fleet]);
```

- [ ] **Step 2: Create AircraftInspections.tsx**

```typescript
// ─── Aircraft Inspections — Unified Audit + History Page ──────────────────
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardCheck, ChevronDown, ChevronRight, Plus, Calendar, User, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../../ui/collapsible';
import { useInventoryV2 } from '../InventoryV2Context';
import { V2Badge } from '../shared/V2Badge';
import { FLEET_V2 } from '../constants';
import type { InspectionV2 } from '../types';

// ─── Helpers ──────────────────────────────────────────────────────────────

function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
}

function recencyColor(dateStr: string | undefined): string {
  if (!dateStr) return 'bg-red-500/15 text-red-400';
  const days = daysSince(dateStr);
  if (days <= 30) return 'bg-emerald-500/15 text-emerald-400';
  if (days <= 60) return 'bg-amber-500/15 text-amber-400';
  return 'bg-red-500/15 text-red-400';
}

function readinessColor(score: number): string {
  if (score >= 95) return 'bg-emerald-500/15 text-emerald-400';
  if (score >= 80) return 'bg-amber-500/15 text-amber-400';
  return 'bg-red-500/15 text-red-400';
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

// ─── Component ────────────────────────────────────────────────────────────

export default function AircraftInspections() {
  const navigate = useNavigate();
  const { state } = useInventoryV2();
  const [filterTail, setFilterTail] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Group inspections by aircraft for card stats
  const inspectionsByTail = useMemo(() => {
    const map: Record<string, InspectionV2[]> = {};
    state.fleet.forEach(a => { map[a.tailNumber] = []; });
    state.inspections.forEach(i => {
      if (map[i.tailNumber]) map[i.tailNumber].push(i);
    });
    return map;
  }, [state.inspections, state.fleet]);

  // Last inspection per aircraft
  const lastInspection = (tail: string): InspectionV2 | undefined => {
    const sorted = (inspectionsByTail[tail] ?? [])
      .filter(i => i.status !== 'in_progress')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return sorted[0];
  };

  // Current year inspection count
  const yearCount = (tail: string): number => {
    const year = new Date().getFullYear();
    return (inspectionsByTail[tail] ?? []).filter(i => new Date(i.date).getFullYear() === year).length;
  };

  // In-progress inspection for a tail
  const inProgressForTail = (tail: string): InspectionV2 | undefined =>
    (inspectionsByTail[tail] ?? []).find(i => i.status === 'in_progress');

  // Filtered history
  const historyInspections = useMemo(() => {
    let list = state.inspections
      .filter(i => i.status !== 'in_progress')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    if (filterTail !== 'all') {
      list = list.filter(i => i.tailNumber === filterTail);
    }
    return list;
  }, [state.inspections, filterTail]);

  const handleCardClick = (tail: string) => {
    const inProg = inProgressForTail(tail);
    if (inProg) {
      navigate(`/inventory-v2/inspection?resume=${inProg.id}`);
    } else {
      navigate(`/inventory-v2/inspection?tail=${tail}`);
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto p-6 space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex items-center gap-3">
        <ClipboardCheck className="w-6 h-6 text-primary" />
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Aircraft Inspections</h1>
        <V2Badge />
      </div>
      <p className="text-sm text-muted-foreground -mt-4">Monthly baseline audit — verify what's on the aircraft matches system records</p>

      {/* Aircraft Cards — 2×2 grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {state.fleet.map(aircraft => {
          const last = lastInspection(aircraft.tailNumber);
          const count = yearCount(aircraft.tailNumber);
          const inProg = inProgressForTail(aircraft.tailNumber);

          return (
            <Card
              key={aircraft.tailNumber}
              className="glass-premium glass-premium-hover cursor-pointer transition-all duration-300"
              onClick={() => handleCardClick(aircraft.tailNumber)}
            >
              <CardContent className="p-5">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-xl font-bold text-foreground">{aircraft.tailNumber}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{aircraft.type}</div>
                  </div>
                  {inProg ? (
                    <Badge className="bg-blue-500/15 text-blue-400 border-blue-500/30 text-xs">
                      In Progress
                    </Badge>
                  ) : (
                    <Badge className={`${recencyColor(last?.date)} text-xs border-0`}>
                      {last ? `Last: ${formatDate(last.date)}` : 'Never inspected'}
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground mt-3">
                  {count} inspection{count !== 1 ? 's' : ''} this year
                </div>
                {last && (
                  <div className="text-xs text-muted-foreground mt-1">
                    Score: <span className={`font-medium ${last.readinessScore >= 95 ? 'text-emerald-400' : last.readinessScore >= 80 ? 'text-amber-400' : 'text-red-400'}`}>{last.readinessScore}%</span>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Inspection History */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-foreground">Inspection History</h2>
          <div className="flex gap-2">
            {['all', ...state.fleet.map(a => a.tailNumber)].map(tail => (
              <button
                key={tail}
                onClick={() => setFilterTail(tail)}
                className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
                  filterTail === tail
                    ? 'bg-primary/15 text-primary font-medium'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                {tail === 'all' ? 'All' : tail}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          {historyInspections.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center text-muted-foreground text-sm">
                No completed inspections found
              </CardContent>
            </Card>
          ) : (
            historyInspections.map(inspection => {
              const isExpanded = expandedId === inspection.id;
              const missingItems = inspection.checkedItems.filter(ci => ci.qtyInUnit < ci.requiredQty);

              return (
                <Collapsible key={inspection.id} open={isExpanded} onOpenChange={() => setExpandedId(isExpanded ? null : inspection.id)}>
                  <Card className="glass-panel transition-all duration-300">
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors rounded-xl">
                        <div>
                          <div className="text-sm font-semibold text-foreground">
                            {inspection.tailNumber} — {formatDate(inspection.date)}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                            <User className="w-3 h-3" />
                            {inspection.reportedBy} · {inspection.checkedItems.length} items checked
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge className={`${readinessColor(inspection.readinessScore)} text-xs border-0`}>
                            {inspection.readinessScore}%
                            {missingItems.length > 0 && ` — ${missingItems.length} missing`}
                          </Badge>
                          {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="px-4 pb-4 pt-0 border-t border-border/40">
                        {inspection.topLevelNotes && (
                          <p className="text-xs text-muted-foreground italic mt-3 mb-2">{inspection.topLevelNotes}</p>
                        )}
                        {missingItems.length > 0 && (
                          <div className="mt-3">
                            <div className="text-xs font-medium text-red-400 flex items-center gap-1 mb-2">
                              <AlertTriangle className="w-3 h-3" /> Missing Items
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {missingItems.map(ci => {
                                const item = state.items.find(i => i.id === ci.itemId);
                                return (
                                  <Badge key={ci.itemId} variant="outline" className="text-xs bg-red-500/10 border-red-500/30 text-red-400">
                                    {item?.itemName ?? ci.itemId}: {ci.qtyInUnit}/{ci.requiredQty}
                                  </Badge>
                                );
                              })}
                            </div>
                          </div>
                        )}
                        {inspection.additionalFees.length > 0 && (
                          <div className="mt-3">
                            <div className="text-xs font-medium text-muted-foreground mb-1">Additional Fees</div>
                            {inspection.additionalFees.map(fee => (
                              <div key={fee.id} className="text-xs text-muted-foreground">
                                {fee.description} — ${fee.amount.toFixed(2)}
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          {inspection.submittedAt ? `Submitted ${formatDateTime(inspection.submittedAt)}` : `Started ${formatDateTime(inspection.date)}`}
                          <span>· Status: {inspection.status.replace('_', ' ')}</span>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify it compiles**

Run: `cd ~/Antigravity/Antigravity-Aviation-Management-System && npx tsc --noEmit 2>&1 | head -20`

- [ ] **Step 4: Commit**

```bash
git add src/components/inventory-v2/pages/AircraftInspections.tsx src/components/inventory-v2/pages/InspectionForm.tsx
git commit -m "feat: create AircraftInspections page with aircraft cards and history list"
```

---

## Task 4: Register AircraftInspections route, update nav, remove old routes

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/Navigation.tsx`

- [ ] **Step 1: Add import and route in App.tsx**

Add import at the top with the other inventory-v2 imports (~line 124):

```typescript
import AircraftInspectionsV2 from './components/inventory-v2/pages/AircraftInspections';
```

Add the new route after the existing `/inventory-v2` route (~line 418):

```typescript
<Route path="/inventory-v2/inspections" element={<InventoryRouteWrapper userRole={userRole}><AircraftInspectionsV2 /></InventoryRouteWrapper>} />
```

Remove the old route for `/inventory-v2/my-inspections` (~line 421):

Delete or comment out:
```typescript
// REMOVE: <Route path="/inventory-v2/my-inspections" element={...}><InspectionHistoryV2 /></...>} />
```

Keep `/inventory-v2/inspection` route (InspectionForm) — it's still used for the audit flow.

- [ ] **Step 2: Update Navigation.tsx sidebar**

In `src/components/Navigation.tsx`, find the nav items array (~line 269-280). Replace the inspection-related entries:

Replace:
```typescript
{ name: 'New Inspection', href: '/inventory-v2/inspection', icon: ClipboardCheck, roles: ['inflight', 'admin'] },
{ name: 'My Inspections', href: '/inventory-v2/my-inspections', icon: FileCheck, roles: ['inflight', 'admin'] },
```

With:
```typescript
{ name: 'Inspections', href: '/inventory-v2/inspections', icon: ClipboardCheck, roles: ['inflight', 'admin', 'commissary-manager'] },
```

Note: Added `'commissary-manager'` to roles since all users should see everything now.

- [ ] **Step 3: Verify it compiles and the route loads**

Run: `cd ~/Antigravity/Antigravity-Aviation-Management-System && npx tsc --noEmit 2>&1 | head -20`

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx src/components/Navigation.tsx
git commit -m "feat: register AircraftInspections route, update nav, remove My Inspections route"
```

---

## Task 5: Build Commissary page — main layout, stat cards, and item list

This is the largest task. The Commissary page will be built incrementally across Tasks 5–9.

**Files:**
- Create: `src/components/inventory-v2/pages/Commissary.tsx`

- [ ] **Step 1: Create Commissary.tsx with header, stat cards, controls, and location-grouped item list**

```typescript
// ─── Commissary — Unified Command Center ──────────────────────────────────
import React, { useState, useMemo, useCallback } from 'react';
import {
  Warehouse, Search, Plus, Minus, ChevronDown, Pencil,
  PackagePlus, ShoppingCart, Settings2, AlertTriangle,
  ExternalLink, Trash2, Package, Scan
} from 'lucide-react';
import { Card, CardContent } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../../ui/collapsible';
import { toast } from 'sonner';
import { useInventoryV2 } from '../InventoryV2Context';
import { V2Badge } from '../shared/V2Badge';
import { SUPPLY_CATEGORIES } from '../constants';
import type { InventoryItemV2, StockroomItem, StorageLocation, StockBatch } from '../types';

// ─── Helpers ──────────────────────────────────────────────────────────────

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getBatchStatus(expDate?: string): 'fresh' | 'expiring-soon' | 'expired' | 'none' {
  if (!expDate) return 'none';
  const now = Date.now();
  const exp = new Date(expDate).getTime();
  if (exp < now) return 'expired';
  if (exp - now < 14 * 24 * 60 * 60 * 1000) return 'expiring-soon';
  return 'fresh';
}

// ─── Component ────────────────────────────────────────────────────────────

export default function Commissary() {
  const { state, dispatch } = useInventoryV2();
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'location' | 'category'>('location');
  const [showLowOnly, setShowLowOnly] = useState(false);
  const [hideZero, setHideZero] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);

  // Modal states (built in later tasks)
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [shoppingOpen, setShoppingOpen] = useState(false);
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [locationsOpen, setLocationsOpen] = useState(false);

  const stockroomItems = useMemo(() =>
    state.stockroomItems.filter(si => si.stockroomId === 'sr-1'),
    [state.stockroomItems]
  );

  const getStockroomItem = useCallback((itemId: string) =>
    stockroomItems.find(si => si.itemId === itemId),
    [stockroomItems]
  );

  // Stats
  const criticalCount = useMemo(() =>
    stockroomItems.filter(si => si.qtyOnHand <= si.minimumLevel).length,
    [stockroomItems]
  );
  const lowCount = useMemo(() =>
    stockroomItems.filter(si => si.qtyOnHand > si.minimumLevel && si.qtyOnHand < si.parLevel).length,
    [stockroomItems]
  );

  // Filtered items
  const filteredItems = useMemo(() => {
    let items = state.items.map(item => ({
      ...item,
      stockroom: getStockroomItem(item.id),
    }));

    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(i =>
        i.itemName.toLowerCase().includes(q) ||
        i.vendorItemNumber?.toLowerCase().includes(q) ||
        i.internalItemNumber?.toLowerCase().includes(q) ||
        i.stockroom?.binLocation?.toLowerCase().includes(q) ||
        i.vendor?.toLowerCase().includes(q)
      );
    }

    if (showLowOnly) {
      items = items.filter(i => {
        const si = i.stockroom;
        return si && si.qtyOnHand < si.parLevel;
      });
    }

    if (hideZero) {
      items = items.filter(i => (i.stockroom?.qtyOnHand ?? 0) > 0);
    }

    return items;
  }, [search, showLowOnly, hideZero, stockroomItems, state.items, getStockroomItem]);

  // Group by location
  const groupedByLocation = useMemo(() => {
    const groups: Record<string, typeof filteredItems> = {};
    const sortedLocations = [...state.storageLocations].sort((a, b) => a.sortOrder - b.sortOrder);

    sortedLocations.forEach(loc => {
      const locItems = filteredItems.filter(i => i.stockroom?.locationId === loc.id);
      if (locItems.length > 0) groups[loc.id] = locItems;
    });

    // Unassigned items
    const unassigned = filteredItems.filter(i => !i.stockroom?.locationId || !state.storageLocations.find(l => l.id === i.stockroom?.locationId));
    if (unassigned.length > 0) groups['unassigned'] = unassigned;

    return groups;
  }, [filteredItems, state.storageLocations]);

  // Group by category
  const groupedByCategory = useMemo(() => {
    const groups: Record<string, typeof filteredItems> = {};
    SUPPLY_CATEGORIES.forEach(cat => {
      const catItems = filteredItems.filter(i => i.supplyCategory === cat.id);
      if (catItems.length > 0) groups[cat.id] = catItems;
    });
    return groups;
  }, [filteredItems]);

  const grouped = viewMode === 'location' ? groupedByLocation : groupedByCategory;

  const getGroupLabel = (key: string): string => {
    if (viewMode === 'location') {
      if (key === 'unassigned') return 'Unassigned';
      return state.storageLocations.find(l => l.id === key)?.name ?? key;
    }
    return SUPPLY_CATEGORIES.find(c => c.id === key)?.label ?? key;
  };

  const getGroupAlertCounts = (items: typeof filteredItems) => {
    let critical = 0, low = 0;
    items.forEach(i => {
      const si = i.stockroom;
      if (!si) return;
      if (si.qtyOnHand <= si.minimumLevel) critical++;
      else if (si.qtyOnHand < si.parLevel) low++;
    });
    return { critical, low };
  };

  const toggleSection = (key: string) => {
    setOpenSections(prev => ({ ...prev, [key]: prev[key] === false ? true : !prev[key] }));
  };

  const isSectionOpen = (key: string, idx: number) => {
    if (openSections[key] !== undefined) return openSections[key];
    return idx === 0; // first section open by default
  };

  const handleQtyChange = (itemId: string, delta: number) => {
    const si = getStockroomItem(itemId);
    if (!si) return;
    const newQty = Math.max(0, si.qtyOnHand + delta);
    dispatch({
      type: 'UPDATE_STOCKROOM_ITEM',
      payload: { ...si, qtyOnHand: newQty },
    });
  };

  const getBatchesForItem = (itemId: string): StockBatch[] =>
    state.stockBatches.filter(b => b.itemId === itemId && b.stockroomId === 'sr-1');

  const handleDisposeBatch = (batch: StockBatch) => {
    const item = state.items.find(i => i.id === batch.itemId);
    dispatch({
      type: 'DISPOSE_EXPIRED_BATCH',
      payload: { batchId: batch.id, itemId: batch.itemId, stockroomId: batch.stockroomId, qty: batch.quantity },
    });
    toast.success(`Disposed ${batch.quantity}x ${item?.itemName ?? 'item'} (${batch.batchLabel ?? 'batch'})`);
  };

  return (
    <div className="max-w-[1600px] mx-auto p-6 space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Warehouse className="w-6 h-6 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Commissary</h1>
          <V2Badge />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button className="btn-aviation-primary gap-1.5" onClick={() => setReceiveOpen(true)}>
            <PackagePlus className="w-4 h-4" /> Receive Stock
          </Button>
          <Button variant="outline" className="gap-1.5 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10" onClick={() => setShoppingOpen(true)}>
            <ShoppingCart className="w-4 h-4" /> Shopping List
          </Button>
          <Button variant="outline" className="gap-1.5" onClick={() => setAddItemOpen(true)}>
            <Plus className="w-4 h-4" /> Add Item
          </Button>
          <Button variant="ghost" className="gap-1.5" onClick={() => setLocationsOpen(true)}>
            <Settings2 className="w-4 h-4" /> Locations
          </Button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="glass-premium glass-premium-hover">
          <CardContent className="p-5">
            <div className="text-xs uppercase tracking-wider font-semibold text-red-400/70">Critical</div>
            <div className="text-4xl font-light tracking-tight text-red-400 mt-1">{criticalCount}</div>
            <div className="text-xs text-muted-foreground mt-1">At or below minimum</div>
          </CardContent>
        </Card>
        <Card className="glass-premium glass-premium-hover">
          <CardContent className="p-5">
            <div className="text-xs uppercase tracking-wider font-semibold text-amber-400/70">Low Stock</div>
            <div className="text-4xl font-light tracking-tight text-amber-400 mt-1">{lowCount}</div>
            <div className="text-xs text-muted-foreground mt-1">Below par level</div>
          </CardContent>
        </Card>
        <Card className="glass-premium glass-premium-hover">
          <CardContent className="p-5">
            <div className="text-xs uppercase tracking-wider font-semibold text-emerald-400/70">Total Items</div>
            <div className="text-4xl font-light tracking-tight text-emerald-400 mt-1">{state.items.length}</div>
            <div className="text-xs text-muted-foreground mt-1">Across {state.storageLocations.length} locations</div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <div className="flex gap-3 items-center flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search items, vendors, bin locations..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex bg-muted rounded-lg p-0.5">
          <button
            onClick={() => setViewMode('location')}
            className={`text-xs px-3 py-1.5 rounded-md transition-colors ${viewMode === 'location' ? 'bg-primary/15 text-primary font-medium' : 'text-muted-foreground'}`}
          >
            By Location
          </button>
          <button
            onClick={() => setViewMode('category')}
            className={`text-xs px-3 py-1.5 rounded-md transition-colors ${viewMode === 'category' ? 'bg-primary/15 text-primary font-medium' : 'text-muted-foreground'}`}
          >
            By Category
          </button>
        </div>
        <button
          onClick={() => setShowLowOnly(v => !v)}
          className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${showLowOnly ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'border-border text-muted-foreground'}`}
        >
          Low / Critical Only
        </button>
        <button
          onClick={() => setHideZero(v => !v)}
          className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${hideZero ? 'bg-primary/10 border-primary/30 text-primary' : 'border-border text-muted-foreground'}`}
        >
          Hide Zero
        </button>
      </div>

      {/* Item List by Group */}
      <div className="space-y-3">
        {Object.entries(grouped).map(([key, items], idx) => {
          const isOpen = isSectionOpen(key, idx);
          const { critical, low } = getGroupAlertCounts(items);

          return (
            <Collapsible key={key} open={isOpen} onOpenChange={() => toggleSection(key)}>
              <Card className="glass-panel overflow-hidden">
                <CollapsibleTrigger asChild>
                  <div className="flex items-center justify-between px-4 py-2.5 cursor-pointer hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-2">
                      <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? '' : '-rotate-90'}`} />
                      <span className="font-semibold text-sm text-foreground">{getGroupLabel(key)}</span>
                      <Badge variant="outline" className="text-xs text-muted-foreground border-border">
                        {items.length}
                      </Badge>
                      {critical > 0 && (
                        <Badge className="bg-red-500/15 text-red-400 border-0 text-[10px]">{critical} critical</Badge>
                      )}
                      {low > 0 && (
                        <Badge className="bg-amber-500/15 text-amber-400 border-0 text-[10px]">{low} low</Badge>
                      )}
                    </div>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="border-t border-border/40">
                    {items.map(item => {
                      const si = item.stockroom;
                      const qty = si?.qtyOnHand ?? 0;
                      const isLow = si ? (qty > si.minimumLevel && qty < si.parLevel) : false;
                      const isCritical = si ? qty <= si.minimumLevel : false;
                      const batchList = getBatchesForItem(item.id);
                      const isExpanded = expandedItemId === item.id;

                      return (
                        <React.Fragment key={item.id}>
                          <div
                            className={`flex items-center justify-between px-4 py-2.5 border-b border-border/20 last:border-b-0 transition-colors cursor-pointer ${
                              isCritical ? 'bg-red-500/5' : isLow ? 'bg-amber-500/5' : 'hover:bg-muted/20'
                            }`}
                            onClick={() => setExpandedItemId(isExpanded ? null : item.id)}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {si?.binLocation && (
                                  <span className="text-[10px] font-mono px-1.5 py-0.5 bg-muted rounded text-muted-foreground">
                                    {si.binLocation}
                                  </span>
                                )}
                                <span className="text-sm font-medium text-foreground">{item.itemName}</span>
                                {isCritical && <Badge className="bg-red-500/15 text-red-400 border-0 text-[10px]">CRITICAL</Badge>}
                                {isLow && !isCritical && <Badge className="bg-amber-500/15 text-amber-400 border-0 text-[10px]">LOW</Badge>}
                              </div>
                              <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1 flex-wrap">
                                <span>Min: {si?.minimumLevel ?? '—'}</span>
                                <span>·</span>
                                <span>Par: {si?.parLevel ?? '—'}</span>
                                <span>·</span>
                                <span className="text-emerald-400">{item.uom}</span>
                                {item.vendorItemNumber && <><span>·</span><span>{item.vendorItemNumber}</span></>}
                                {item.reorderUrl && (
                                  <>
                                    <span>·</span>
                                    <a
                                      href={item.reorderUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-400 hover:text-blue-300 transition-colors inline-flex items-center gap-0.5"
                                      onClick={e => e.stopPropagation()}
                                    >
                                      {item.vendor ?? 'Reorder'} <ExternalLink className="w-2.5 h-2.5" />
                                    </a>
                                  </>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <div className="flex items-center gap-1.5">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={e => { e.stopPropagation(); handleQtyChange(item.id, -1); }}
                                >
                                  <Minus className="w-3 h-3" />
                                </Button>
                                <span className={`w-8 text-center font-mono font-bold text-sm ${
                                  isCritical ? 'text-red-400' : isLow ? 'text-amber-400' : 'text-emerald-400'
                                }`}>
                                  {qty}
                                </span>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={e => { e.stopPropagation(); handleQtyChange(item.id, 1); }}
                                >
                                  <Plus className="w-3 h-3" />
                                </Button>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-primary/60 hover:text-primary"
                                onClick={e => { e.stopPropagation(); /* edit handled in Task 7 */ }}
                              >
                                <Pencil className="w-3 h-3" />
                              </Button>
                              {batchList.length > 0 && (
                                <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                              )}
                            </div>
                          </div>
                          {/* Batch Expansion */}
                          {isExpanded && batchList.length > 0 && (
                            <div className="px-4 py-2 bg-muted/30 border-b border-border/20">
                              <div className="grid grid-cols-5 gap-2 text-xs text-muted-foreground font-medium px-1 mb-1">
                                <span>Lot</span><span>Qty</span><span>Received</span><span>Expires</span><span></span>
                              </div>
                              {batchList.map(batch => {
                                const status = getBatchStatus(batch.expirationDate);
                                const statusColor = status === 'expired' ? 'text-red-400' : status === 'expiring-soon' ? 'text-amber-400' : 'text-emerald-400';
                                return (
                                  <div key={batch.id} className="grid grid-cols-5 gap-2 text-xs items-center px-1 py-1 rounded hover:bg-muted/50">
                                    <span className="font-mono truncate">{batch.batchLabel ?? '—'}</span>
                                    <span>{batch.quantity}</span>
                                    <span>{formatDateShort(batch.receivedDate)}</span>
                                    <span className={statusColor}>
                                      {batch.expirationDate ? formatDateShort(batch.expirationDate) : 'N/A'}
                                      {status === 'expired' && ' ✕'}
                                      {status === 'expiring-soon' && ' ⚠'}
                                    </span>
                                    <span>
                                      {status === 'expired' && (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-5 px-2 text-[10px] text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                          onClick={e => { e.stopPropagation(); handleDisposeBatch(batch); }}
                                        >
                                          <Trash2 className="w-3 h-3 mr-0.5" /> Dispose
                                        </Button>
                                      )}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                          {isExpanded && batchList.length === 0 && (
                            <div className="px-4 py-2 bg-muted/30 border-b border-border/20">
                              <p className="text-xs text-muted-foreground">No batch data</p>
                            </div>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          );
        })}

        {Object.keys(grouped).length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Package className="w-8 h-8 mb-2 opacity-40" />
            <p className="text-sm">No items match your filters</p>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd ~/Antigravity/Antigravity-Aviation-Management-System && npx tsc --noEmit 2>&1 | head -20`

- [ ] **Step 3: Commit**

```bash
git add src/components/inventory-v2/pages/Commissary.tsx
git commit -m "feat: create Commissary command center page with stat cards, controls, location-grouped item list, batch expansion"
```

---

## Task 6: Build Receive Stock modal

**Files:**
- Create: `src/components/inventory-v2/shared/ReceiveStockModal.tsx`
- Modify: `src/components/inventory-v2/pages/Commissary.tsx` (wire up)

- [ ] **Step 1: Create ReceiveStockModal.tsx**

Port the staging/confirm logic from `Receiving.tsx` into a Dialog component. Key features: browse items by category, +/− staging, expiration date + lot label per item, "Added by" selector, notes field, confirm button that dispatches `BULK_UPDATE_STOCKROOM` + `ADD_STOCK_BATCH` + `ADD_STOCK_LOG`, barcode scanner support.

The component should accept `{ open: boolean; onOpenChange: (open: boolean) => void }` props and use the shadcn `Dialog` component.

Implement the full component following the pattern from `Receiving.tsx` (lines 20-478). Port the `staged` state, `handleSubmit`, `handleScan`, category-grouped browsing, and cart sidebar — but inside a Dialog layout.

- [ ] **Step 2: Wire into Commissary.tsx**

Import and render:
```typescript
import ReceiveStockModal from '../shared/ReceiveStockModal';
```

At the bottom of the Commissary return, before the closing `</div>`:
```typescript
<ReceiveStockModal open={receiveOpen} onOpenChange={setReceiveOpen} />
```

- [ ] **Step 3: Verify it compiles**

- [ ] **Step 4: Commit**

```bash
git add src/components/inventory-v2/shared/ReceiveStockModal.tsx src/components/inventory-v2/pages/Commissary.tsx
git commit -m "feat: add Receive Stock modal to Commissary page"
```

---

## Task 7: Build Shopping List modal and Edit Item dialog

**Files:**
- Create: `src/components/inventory-v2/shared/ShoppingListModal.tsx`
- Create: `src/components/inventory-v2/shared/EditItemDialog.tsx`
- Modify: `src/components/inventory-v2/pages/Commissary.tsx` (wire up)

- [ ] **Step 1: Create ShoppingListModal.tsx**

A Dialog that:
- Auto-generates list of items where `qtyOnHand < parLevel`
- Each row: item name, current qty, par level, qty to order (`parLevel - qtyOnHand`), reorder link
- Grouped by `vendor` field: Amazon group, Kroger group, Instacart group, Other group
- "Copy to Clipboard" button that formats the list as text
- Uses shadcn Dialog, props: `{ open: boolean; onOpenChange: (open: boolean) => void }`

- [ ] **Step 2: Create EditItemDialog.tsx**

A Dialog for editing a single item. Props: `{ item: InventoryItemV2 | null; open: boolean; onOpenChange: (open: boolean) => void }`.

Fields: name, category (select from SUPPLY_CATEGORIES), UOM (select from UOM_OPTIONS), G650 qty, G500 qty, cost per unit, vendor, reorderUrl, barcode, location (select from storageLocations), bin location (text), par level, minimum level.

On save: dispatches `UPDATE_ITEM` for the item fields and `UPDATE_STOCKROOM_ITEM` for stockroom fields (par, min, bin, locationId).

Delete button: dispatches `REMOVE_ITEM`.

Also supports "Add New Item" mode when `item` is null — dispatches `ADD_ITEM` + creates a new `StockroomItem`.

Port the edit form pattern from `ItemManager.tsx`.

- [ ] **Step 3: Wire both into Commissary.tsx**

Import both components. Add state for edit dialog:
```typescript
const [editItem, setEditItem] = useState<InventoryItemV2 | null>(null);
const [editOpen, setEditOpen] = useState(false);
```

Wire the Pencil button onClick to open the edit dialog:
```typescript
onClick={e => { e.stopPropagation(); setEditItem(item); setEditOpen(true); }}
```

Wire the "+ Add Item" header button:
```typescript
onClick={() => { setEditItem(null); setAddItemOpen(true); }}
```

Render at bottom:
```typescript
<ShoppingListModal open={shoppingOpen} onOpenChange={setShoppingOpen} />
<EditItemDialog item={editItem} open={editOpen || addItemOpen} onOpenChange={(v) => { setEditOpen(v); setAddItemOpen(v); if (!v) setEditItem(null); }} />
```

- [ ] **Step 4: Verify it compiles**

- [ ] **Step 5: Commit**

```bash
git add src/components/inventory-v2/shared/ShoppingListModal.tsx src/components/inventory-v2/shared/EditItemDialog.tsx src/components/inventory-v2/pages/Commissary.tsx
git commit -m "feat: add Shopping List modal and Edit Item dialog to Commissary"
```

---

## Task 8: Build Manage Locations dialog and Stock History

**Files:**
- Create: `src/components/inventory-v2/shared/ManageLocationsDialog.tsx`
- Modify: `src/components/inventory-v2/pages/Commissary.tsx` (wire up + add history toggle)

- [ ] **Step 1: Create ManageLocationsDialog.tsx**

A Dialog for managing storage locations. Props: `{ open: boolean; onOpenChange: (open: boolean) => void }`.

Features:
- List all `state.storageLocations` sorted by `sortOrder`
- Inline rename (click name → input field)
- Add new location: name + type selector (shelf/cabinet/rack/closet/other)
- Remove location (with confirmation if items are assigned to it)
- Up/down arrows to reorder (dispatches `REORDER_STORAGE_LOCATIONS`)
- Dispatches `ADD_STORAGE_LOCATION`, `UPDATE_STORAGE_LOCATION`, `REMOVE_STORAGE_LOCATION`

- [ ] **Step 2: Add Stock History toggle to Commissary.tsx**

Add a `showHistory` state and a "History" button in the header actions. When toggled, show a scrollable card of `state.stockLog` entries (same pattern as `Receiving.tsx` lines 206-248). Each entry shows: who added, when, item badges, notes.

```typescript
const [showHistory, setShowHistory] = useState(false);
const stockroomLog = state.stockLog.filter(l => l.stockroomId === 'sr-1');
```

Add button in header:
```typescript
<Button
  variant={showHistory ? 'default' : 'ghost'}
  className={`gap-1.5 ${showHistory ? 'btn-aviation-primary' : ''}`}
  onClick={() => setShowHistory(h => !h)}
>
  <Clock className="w-4 h-4" /> History {stockroomLog.length > 0 && `(${stockroomLog.length})`}
</Button>
```

Render history card between stat cards and controls when `showHistory` is true.

- [ ] **Step 3: Wire ManageLocationsDialog**

```typescript
import ManageLocationsDialog from '../shared/ManageLocationsDialog';
// ...
<ManageLocationsDialog open={locationsOpen} onOpenChange={setLocationsOpen} />
```

- [ ] **Step 4: Port BulkAdjustModal integration**

Import and add BulkAdjustModal with a trigger button (can be in the "more actions" area or as a secondary button):

```typescript
import BulkAdjustModal from '../shared/BulkAdjustModal';
// ... state
const [bulkAdjustOpen, setBulkAdjustOpen] = useState(false);
// ... in header actions or controls bar
<Button variant="ghost" size="sm" onClick={() => setBulkAdjustOpen(true)}>Bulk Adjust</Button>
// ... render
<BulkAdjustModal open={bulkAdjustOpen} onOpenChange={setBulkAdjustOpen} />
```

- [ ] **Step 5: Verify it compiles**

- [ ] **Step 6: Commit**

```bash
git add src/components/inventory-v2/shared/ManageLocationsDialog.tsx src/components/inventory-v2/pages/Commissary.tsx
git commit -m "feat: add Manage Locations dialog, Stock History toggle, and Bulk Adjust to Commissary"
```

---

## Task 9: Register Commissary route, update nav, remove old routes and pages

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/Navigation.tsx`
- Modify: `src/components/inventory-v2/pages/InventoryV2Dashboard.tsx`

- [ ] **Step 1: Update App.tsx — add Commissary import and route**

Add import:
```typescript
import CommissaryV2 from './components/inventory-v2/pages/Commissary';
```

Replace the old CommissaryDashboard route:
```typescript
// REPLACE this line:
// <Route path="/inventory-v2/commissary" element={<InventoryRouteWrapper userRole={userRole}><CommissaryDashboard /></InventoryRouteWrapper>} />
// WITH:
<Route path="/inventory-v2/commissary" element={<InventoryRouteWrapper userRole={userRole}><CommissaryV2 /></InventoryRouteWrapper>} />
```

Remove these routes:
```typescript
// REMOVE these lines:
// <Route path="/inventory-v2/stockroom" ...
// <Route path="/inventory-v2/physical-count" ...
// <Route path="/inventory-v2/receiving" ...
// <Route path="/inventory-v2/item-manager" ...
```

Remove the unused imports:
```typescript
// REMOVE these imports:
// import StockroomCountV2 from ...
// import PhysicalCountV2 from ...
// import ReceivingV2 from ...
// import ItemManagerV2 from ...
// import CommissaryDashboard from ...
```

- [ ] **Step 2: Update Navigation.tsx sidebar**

Replace the stockroom/commissary-related nav items (~lines 273-279) with:

```typescript
{ name: 'Commissary', href: '/inventory-v2/commissary', icon: Warehouse, roles: ['inflight', 'admin', 'commissary-manager'] },
```

Remove:
- `Stockroom` entry
- `Physical Count` entry
- `Add to Stock` entry
- `Item Manager` entry
- Old `Commissary` entry (replaced above)

Add `Warehouse` to the Lucide import at the top of Navigation.tsx.

The final nav order should be:
```typescript
{ name: 'Dashboard', href: '/inventory-v2', icon: Layers, roles: ['inflight', 'admin', 'pilot', 'commissary-manager'] },
{ name: 'Trips', href: '/inventory-v2/trips', icon: Plane, roles: ['inflight', 'admin', 'commissary-manager'] },
{ name: 'Inspections', href: '/inventory-v2/inspections', icon: ClipboardCheck, roles: ['inflight', 'admin', 'commissary-manager'] },
{ name: 'Commissary', href: '/inventory-v2/commissary', icon: Warehouse, roles: ['inflight', 'admin', 'commissary-manager'] },
{ name: 'Replenish', href: '/inventory-v2/replenish', icon: PackagePlus, roles: ['inflight', 'admin'] },
{ name: 'Unit Requests', href: '/inventory-v2/unit-requests', icon: Send, roles: ['inflight', 'admin'] },
{ name: 'Settings', href: '/inventory-v2/settings', icon: Settings, roles: ['admin', 'commissary-manager'] },
```

- [ ] **Step 3: Remove role-based redirect from InventoryV2Dashboard**

In `InventoryV2Dashboard.tsx`, remove the `useEffect` that redirects commissary-manager (lines 26-29):

```typescript
// REMOVE this useEffect:
// useEffect(() => {
//   if (state.currentUser.role === 'commissary-manager') {
//     navigate('/inventory-v2/commissary', { replace: true });
//   }
// }, [state.currentUser.role, navigate]);
```

- [ ] **Step 4: Verify it compiles**

Run: `cd ~/Antigravity/Antigravity-Aviation-Management-System && npx tsc --noEmit 2>&1 | head -20`

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/components/Navigation.tsx src/components/inventory-v2/pages/InventoryV2Dashboard.tsx
git commit -m "feat: register Commissary route, update nav, remove old routes, remove role-based redirect"
```

---

## Task 10: Delete old page files and update vault docs

**Files:**
- Delete: `src/components/inventory-v2/pages/InspectionHistory.tsx`
- Delete: `src/components/inventory-v2/pages/StockroomCount.tsx`
- Delete: `src/components/inventory-v2/pages/Receiving.tsx`
- Delete: `src/components/inventory-v2/pages/ItemManager.tsx`
- Delete: `src/components/inventory-v2/pages/CommissaryDashboard.tsx`
- Delete: `src/components/inventory-v2/pages/PhysicalCount.tsx`
- Modify: `~/Obsidian/Antigravity/inventory-v2/COMPONENT-MAP.md`
- Modify: `~/Obsidian/Antigravity/CLAUDE.md`

- [ ] **Step 1: Delete removed page files**

```bash
cd ~/Antigravity/Antigravity-Aviation-Management-System
rm src/components/inventory-v2/pages/InspectionHistory.tsx
rm src/components/inventory-v2/pages/StockroomCount.tsx
rm src/components/inventory-v2/pages/Receiving.tsx
rm src/components/inventory-v2/pages/ItemManager.tsx
rm src/components/inventory-v2/pages/CommissaryDashboard.tsx
rm src/components/inventory-v2/pages/PhysicalCount.tsx
```

- [ ] **Step 2: Verify no remaining imports reference deleted files**

```bash
grep -rn "InspectionHistory\|StockroomCount\|Receiving\|ItemManager\|CommissaryDashboard\|PhysicalCount" src/ --include="*.tsx" --include="*.ts"
```

Expected: Only references in the deleted import lines (which were already removed in Task 9). If any remain, fix them.

- [ ] **Step 3: Verify the app compiles**

Run: `cd ~/Antigravity/Antigravity-Aviation-Management-System && npx tsc --noEmit 2>&1 | head -20`

- [ ] **Step 4: Update COMPONENT-MAP.md in vault**

Update `~/Obsidian/Antigravity/inventory-v2/COMPONENT-MAP.md`:
- Remove entries for deleted pages
- Add entry for `AircraftInspections.tsx` at route `/inventory-v2/inspections`
- Add entry for `Commissary.tsx` at route `/inventory-v2/commissary`
- Add entries for new shared components: `ReceiveStockModal.tsx`, `ShoppingListModal.tsx`, `EditItemDialog.tsx`, `ManageLocationsDialog.tsx`

- [ ] **Step 5: Update CLAUDE.md in vault**

Update `~/Obsidian/Antigravity/CLAUDE.md`:
- Update the routes table to reflect new routes and removed routes
- Update "Current State" section to note the page consolidation is complete
- Add note about `StorageLocation` type and `storageLocations` in state
- Remove references to the old pages in "Completed Work Tracks" or add a new track entry

- [ ] **Step 6: Commit code changes**

```bash
cd ~/Antigravity/Antigravity-Aviation-Management-System
git add -A src/components/inventory-v2/pages/
git commit -m "chore: delete old pages absorbed into AircraftInspections and Commissary"
```

- [ ] **Step 7: Verify the app runs**

Run: `cd ~/Antigravity/Antigravity-Aviation-Management-System && npm run dev`

Open in browser and verify:
- `/inventory-v2/inspections` loads with aircraft cards and history
- `/inventory-v2/commissary` loads with stat cards, item list, action buttons
- Clicking an aircraft card navigates to the inspection form with tail pre-selected
- Nav sidebar shows the simplified navigation
- CommissaryKiosk still works at `/commissary-kiosk`
- Replenish still works at `/inventory-v2/replenish`
- Trips workflow still works at `/inventory-v2/trips`
