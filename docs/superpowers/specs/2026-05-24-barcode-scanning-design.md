# Barcode Scanning — Design Spec

**Date:** 2026-05-24
**Status:** Approved

## Purpose

Wire the existing `BarcodeScannerDialog` into Add to Stock and ItemManager, and add a `barcode` field to the item type for future real-scanner integration. The scanner remains simulated (returns a random item) for demo purposes.

## Current State

- `BarcodeScannerDialog` exists at `src/components/inventory-v2/shared/BarcodeScannerDialog.tsx`
- Props: `open`, `onOpenChange`, `onItemScanned: (itemId: string) => void`
- Behavior: simulates a scan by picking a random item from `state.items` and calling `onItemScanned` with that item's id
- Already used in `InspectionForm.tsx`
- `InventoryItemV2` has `vendorItemNumber` and `internalItemNumber` but no `barcode` field

## Type Change

Add optional `barcode` field to `InventoryItemV2` in `types.ts`:

```ts
barcode?: string;
```

No mock data changes — existing items will have `barcode: undefined`. The field is there for future real-barcode assignment.

## Feature 1: Add to Stock — Scan to Identify Item (`Receiving.tsx`)

Add a "Scan Item" button to the Add to Stock page. When tapped, it opens `BarcodeScannerDialog`. On scan, the returned `itemId` selects that item in the staging list (same as tapping the item manually in the browse/search list).

**Behavior:**
1. User taps "Scan Item" in the header or near the search bar
2. Scanner dialog opens, user taps "Scan" (simulated)
3. Returned `itemId` auto-selects that item in the staging area, pre-filled with qty 1
4. User adjusts qty and confirms as normal

**No changes to Add to Stock's save/dispatch logic** — only the item selection step is augmented.

## Feature 2: ItemManager — Barcode Field (`ItemManager.tsx`)

Add a "Barcode" field to the item edit form, after the existing `vendorItemNumber` field.

**Edit form additions:**
- Text input: "Barcode" — user can type a barcode manually
- "Scan to Assign" button next to the input — opens `BarcodeScannerDialog` in a special mode where instead of looking up an item, the scan result is treated as the barcode string to assign (simulate by generating a random 12-digit numeric string as a mock EAN-13 barcode)

**Display:**
- On the item detail card in ItemManager, show the barcode value if set (small monospace text with a barcode icon)
- No barcode rendered as an image — just the numeric string

**Save behavior:** `barcode` field included in `ADD_ITEM` / `UPDATE_ITEM` dispatch payload (no reducer changes needed — payload is the full `InventoryItemV2` object).

## Constraints

- `BarcodeScannerDialog` is not modified — it works as-is for Add to Stock and Replenish
- For ItemManager's "Scan to Assign," the dialog's `onItemScanned` callback is repurposed: instead of resolving an item, it generates and sets a mock barcode string. This can be done by passing a custom `onItemScanned` handler that ignores the `itemId` and sets a generated barcode in the form state.
- No real camera API, no ZXing/QuaggaJS library — simulation only
- No changes to mock data

## Files Changed

| File | Change |
|---|---|
| `src/components/inventory-v2/types.ts` | Add `barcode?: string` to `InventoryItemV2` |
| `src/components/inventory-v2/pages/Receiving.tsx` | Add scan button + dialog wiring for item selection |
| `src/components/inventory-v2/pages/ItemManager.tsx` | Add barcode field to edit form + "Scan to Assign" button |

## Out of Scope

- Real barcode scanning hardware or camera API
- Barcode image generation
- Replenish page scan integration (covered in replenish spec)
- Backend sync
