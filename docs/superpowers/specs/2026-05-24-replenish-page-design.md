# Replenish Page — Design Spec

**Date:** 2026-05-24
**Status:** Approved
**Replaces:** Pick List (`PickList.tsx`) + Restock List (`RestockList.tsx`)

## Purpose

Merge the Pick List and Restock List into a single "Replenish" page. The current two-page flow (pick items from stockroom → restock items on aircraft) maps to one physical job. The new page presents both steps on one screen with a per-item "Picked → Loaded" progression.

## Constraints

- All existing mock data, item definitions, locations, categories, compartments, and stockroom quantities remain unchanged.
- The context state shape (`pickListItems`, `restockListItems` in `InventoryV2State`) stays the same.
- All existing reducer actions (`UPDATE_PICK_ITEM`, `SET_RESTOCK_LIST`, `UPDATE_RESTOCK_ITEM`, `ADD_PICK_ITEMS`) stay as-is.
- No new types or state fields are introduced.

## Route

`/inventory-v2/replenish`

Replaces:
- `/inventory-v2/pick-list`
- `/inventory-v2/restock-list`

## Page Layout

### Header

- Icon + "Replenish" title + `V2Badge`
- Unit filter dropdown: All Units / N5PG / N6PG

### Summary Bar

One-line status: `"12 items — 8 picked, 3 loaded"`

Segmented progress indicator showing picked vs loaded vs remaining.

### Body — Collapsible Sections by Aircraft Unit

Each section header:
- Tail number
- Item count badge
- Progress text: `"5/8 picked · 2/8 loaded"`
- Bulk actions: "Check All Picked" / "Check All Loaded" checkboxes
- Collapse/expand chevron

### Item Rows

Each row displays (left to right):

| Element | Source | Notes |
|---|---|---|
| Bin location | `stockroomItems[].binLocation` | Helps locate item in stockroom |
| Item name | `items[].itemName` | Truncated if long |
| UOM | `items[].uom` | Displayed after name or as subtitle |
| Qty needed | `pickListItems[].qtyNeeded` | Static display |
| Qty taken | `pickListItems[].qtyTaken` | +/- controls, capped at 0..qtyNeeded |
| Picked checkbox | `pickListItems[].done` | Marks item as pulled from stockroom |
| Loaded checkbox | `restockListItems[].done` | Disabled until Picked is checked |
| Cancel | `restockListItems[].cancelled` | Strikes through the row, skips the item |

### Sticky Footer

- UPDATE button — persists all local changes to context via existing dispatch actions

## State Synchronization

The page reads from both `state.pickListItems` and `state.restockListItems` and joins them by `itemId + unitTailNumber + inspectionId`.

When the user interacts:

1. **Qty +/- changes** → update local pick item's `qtyTaken`
2. **"Picked" checked** → set pick item's `done: true`; if no corresponding restock item exists, generate one (same logic as current `RestockList.tsx` lines 20-33)
3. **"Loaded" checked** → set restock item's `done: true`
4. **Cancel** → set restock item's `cancelled: true`
5. **UPDATE button** → dispatch `UPDATE_PICK_ITEM` for each pick item, then `SET_RESTOCK_LIST` for all restock items
6. **All items loaded for an inspection** → dispatch `UPDATE_INSPECTION` with `status: 'restocked'`

## Navigation Changes

### Sidebar Nav

Remove:
- "Pick List" nav item
- "Restock List" nav item

Add:
- "Replenish" nav item — same position/group, icon: `PackagePlus`

### Dashboard Links

- "Restocking Needed" panel `onClick` → `/inventory-v2/replenish` (currently goes to `/inventory-v2/pick-list`)

## Files Changed

| File | Change |
|---|---|
| `src/components/inventory-v2/pages/Replenish.tsx` | **New** — merged page |
| `src/components/inventory-v2/pages/PickList.tsx` | **Delete** |
| `src/components/inventory-v2/pages/RestockList.tsx` | **Delete** |
| `src/App.tsx` | Remove pick-list and restock-list routes, add replenish route |
| Sidebar nav component (wherever nav items are defined) | Swap two items for one |
| `src/components/inventory-v2/pages/InventoryV2Dashboard.tsx` | Update "Restocking Needed" panel navigate target |
| `src/components/inventory-v2/pages/index.ts` (barrel) | Update exports |

## Empty State

When no pick list items exist:

```
No items to replenish. Complete an inspection with missing items to generate a replenish list.
```

## Barcode Scanning Integration

A "Scan" button appears in the Replenish page header (next to the unit filter). Tapping it opens `BarcodeScannerDialog`. On a successful scan, the returned `itemId` is used to find the matching pick list item in the current view and auto-checks it as **Picked** (sets `done: true` on the local pick item). A toast confirms which item was matched.

The scanner remains simulated (random item from `state.items`) — no real barcode hardware integration in this pass.

**Files added:**
- `BarcodeScannerDialog` already exists at `src/components/inventory-v2/shared/BarcodeScannerDialog.tsx` — no changes needed.

**Additional file changes for scan integration:**

| File | Change |
|---|---|
| `src/components/inventory-v2/pages/Replenish.tsx` | Add scan button + `BarcodeScannerDialog` wiring |

## Out of Scope

- Product links / reorder URLs (see separate spec)
- Barcode assignment in ItemManager (see separate spec)
- Backend sync
- Changes to mock data or item definitions
