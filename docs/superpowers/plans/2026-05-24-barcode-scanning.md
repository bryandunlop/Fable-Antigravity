# Barcode Scanning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `barcode` field to the item type, wire `BarcodeScannerDialog` into Add to Stock (scan to select an item) and ItemManager (scan to assign a barcode to an item). The scanner remains simulated throughout.

**Architecture:** `BarcodeScannerDialog` already exists and accepts `onItemScanned: (itemId: string) => void`. For Add to Stock, scanning returns an itemId which auto-stages that item. For ItemManager, the `onItemScanned` callback is repurposed to generate and assign a mock barcode string to the form. A new `barcode?: string` field is added to `InventoryItemV2` and threaded through `ItemFormState`, `itemToForm`, `emptyForm`, `handleAdd`, and `handleUpdate`.

**Tech Stack:** React, TypeScript, lucide-react (`Camera`, `Barcode`), sonner toasts, existing `BarcodeScannerDialog`

---

### Task 1: Add `barcode` field to `InventoryItemV2`

**Files:**
- Modify: `src/components/inventory-v2/types.ts`

- [ ] **Step 1: Add `barcode` field to `InventoryItemV2`**

In `types.ts`, find the `InventoryItemV2` interface (line 47). Find the `reorderUrl` field:
```ts
reorderUrl?: string;
```

Add `barcode` directly after it:
```ts
reorderUrl?: string;
barcode?: string;
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/bryandunlop/Antigravity/Antigravity-Aviation-Management-System && npx tsc --noEmit 2>&1 | head -30
```

Expected: No errors. The field is optional so no existing code breaks.

- [ ] **Step 3: Commit**

```bash
git add src/components/inventory-v2/types.ts
git commit -m "feat(inventory-v2): add optional barcode field to InventoryItemV2"
```

---

### Task 2: Wire barcode scanner into Add to Stock (Receiving.tsx)

**Files:**
- Modify: `src/components/inventory-v2/pages/Receiving.tsx`

When a scan returns an `itemId`, the item is auto-staged with qty 1. If already staged, its qty is incremented by 1.

- [ ] **Step 1: Add `Camera` to lucide imports and import `BarcodeScannerDialog`**

Find the lucide-react import in `Receiving.tsx`:
```tsx
import {
  PackagePlus, Search, Plus, Minus, ChevronDown, Check,
  User, Clock, ShoppingCart, X, History
} from 'lucide-react';
```

Replace with:
```tsx
import {
  PackagePlus, Search, Plus, Minus, ChevronDown, Check,
  User, Clock, ShoppingCart, X, History, Camera
} from 'lucide-react';
```

Then add the `BarcodeScannerDialog` import after the existing shared imports:
```tsx
import { BarcodeScannerDialog } from '../shared/BarcodeScannerDialog';
```

- [ ] **Step 2: Add scanner state**

In the component body after the existing state declarations (after `const [openSections, setOpenSections] = useState...`), add:
```tsx
const [scannerOpen, setScannerOpen] = useState(false);
```

- [ ] **Step 3: Add scan handler**

After the `setStagedQty` function, add:
```tsx
const handleScan = (itemId: string) => {
  setStaged(prev => ({ ...prev, [itemId]: (prev[itemId] ?? 0) + 1 }));
  const item = state.items.find(i => i.id === itemId);
  toast.success(`Added: ${item?.itemName ?? itemId}`);
  setScannerOpen(false);
};
```

- [ ] **Step 4: Add Scan button to the header**

Find the header buttons div (lines 145–154):
```tsx
<div className="flex items-center gap-2">
  <Button
    variant={showHistory ? 'default' : 'outline'}
    size="sm"
    onClick={() => setShowHistory(h => !h)}
    className={showHistory ? 'bg-purple-500 hover:bg-purple-600 text-white' : ''}
  >
    <History className="w-4 h-4 mr-1" /> History {stockroomLog.length > 0 && `(${stockroomLog.length})`}
  </Button>
</div>
```

Replace with:
```tsx
<div className="flex items-center gap-2">
  <Button
    variant="outline"
    size="sm"
    onClick={() => setScannerOpen(true)}
    className="gap-1.5"
  >
    <Camera className="w-4 h-4" />
    Scan Item
  </Button>
  <Button
    variant={showHistory ? 'default' : 'outline'}
    size="sm"
    onClick={() => setShowHistory(h => !h)}
    className={showHistory ? 'bg-purple-500 hover:bg-purple-600 text-white' : ''}
  >
    <History className="w-4 h-4 mr-1" /> History {stockroomLog.length > 0 && `(${stockroomLog.length})`}
  </Button>
</div>
```

- [ ] **Step 5: Add `BarcodeScannerDialog` to the JSX**

At the very bottom of the returned JSX, just before the closing `</div>` of the root element, add:
```tsx
<BarcodeScannerDialog
  open={scannerOpen}
  onOpenChange={setScannerOpen}
  onItemScanned={handleScan}
/>
```

- [ ] **Step 6: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: No errors.

- [ ] **Step 7: Commit**

```bash
git add src/components/inventory-v2/pages/Receiving.tsx
git commit -m "feat(inventory-v2): add barcode scan to Add to Stock for item selection"
```

---

### Task 3: Add barcode field and scan-to-assign to ItemManager

**Files:**
- Modify: `src/components/inventory-v2/pages/ItemManager.tsx`

The form gets a `barcode` field. A "Scan to Assign" button generates a mock 13-digit numeric barcode string and sets it in the form. The barcode is shown read-only on item cards.

- [ ] **Step 1: Add `Camera` and `Barcode` to lucide imports**

Find the lucide-react import in `ItemManager.tsx` and add `Camera` and `Barcode` to it.

- [ ] **Step 2: Import `BarcodeScannerDialog`**

After the existing shared imports, add:
```tsx
import { BarcodeScannerDialog } from '../shared/BarcodeScannerDialog';
```

- [ ] **Step 3: Add `barcode` to `ItemFormState`**

Find the `ItemFormState` interface (around line 90–102):
```ts
interface ItemFormState {
  itemName: string;
  supplyCategory: SupplyCategory;
  compartmentId: string;
  location: string;
  uom: UnitOfMeasure;
  g650Qty: string;
  g500Qty: string;
  costPerUnit: string;
  reorderUrl: string;
  vendorItemNumber: string;
}
```

Replace with:
```ts
interface ItemFormState {
  itemName: string;
  supplyCategory: SupplyCategory;
  compartmentId: string;
  location: string;
  uom: UnitOfMeasure;
  g650Qty: string;
  g500Qty: string;
  costPerUnit: string;
  reorderUrl: string;
  vendorItemNumber: string;
  barcode: string;
}
```

- [ ] **Step 4: Update `emptyForm` and `itemToForm`**

Find `emptyForm`:
```ts
function emptyForm(): ItemFormState {
  return {
    itemName: '',
    supplyCategory: 'miscellaneous',
    compartmentId: '',
    location: '',
    uom: 'ea',
    g650Qty: '',
    g500Qty: '',
    costPerUnit: '',
    reorderUrl: '',
    vendorItemNumber: '',
  };
}
```

Add `barcode: ''` before the closing brace:
```ts
function emptyForm(): ItemFormState {
  return {
    itemName: '',
    supplyCategory: 'miscellaneous',
    compartmentId: '',
    location: '',
    uom: 'ea',
    g650Qty: '',
    g500Qty: '',
    costPerUnit: '',
    reorderUrl: '',
    vendorItemNumber: '',
    barcode: '',
  };
}
```

Find `itemToForm`:
```ts
function itemToForm(item: InventoryItemV2): ItemFormState {
  return {
    ...
    reorderUrl: item.reorderUrl ?? '',
    vendorItemNumber: item.vendorItemNumber ?? '',
  };
}
```

Add `barcode` at the end:
```ts
function itemToForm(item: InventoryItemV2): ItemFormState {
  return {
    itemName: item.itemName,
    supplyCategory: item.supplyCategory,
    compartmentId: item.compartmentId,
    location: item.location,
    uom: item.uom,
    g650Qty: item.defaultQuantities.G650 != null ? String(item.defaultQuantities.G650) : '',
    g500Qty: item.defaultQuantities.G500 != null ? String(item.defaultQuantities.G500) : '',
    costPerUnit: item.costPerUnit != null ? String(item.costPerUnit) : '',
    reorderUrl: item.reorderUrl ?? '',
    vendorItemNumber: item.vendorItemNumber ?? '',
    barcode: item.barcode ?? '',
  };
}
```

- [ ] **Step 5: Include `barcode` in `handleAdd` and `handleUpdate`**

In `handleAdd`, find where `newItem` is built (line 226). Add `barcode` after `reorderUrl`:
```ts
reorderUrl: form.reorderUrl.trim() || undefined,
barcode: form.barcode.trim() || undefined,
```

In `handleUpdate`, find where `updated` is built (line 268). Add `barcode` after `reorderUrl`:
```ts
reorderUrl: form.reorderUrl.trim() || undefined,
barcode: form.barcode.trim() || undefined,
```

- [ ] **Step 6: Add scanner state to the component**

In the component body after existing state declarations, add:
```tsx
const [barcodeScanner, setBarcodeScanner] = useState(false);
```

- [ ] **Step 7: Add Barcode field and Scan-to-Assign to the edit form**

In the form JSX, find the Reorder URL block (lines 502–510):
```tsx
{/* Reorder URL */}
<div className="space-y-1.5">
  <label className="text-sm font-medium">Reorder URL (optional)</label>
  <Input
    value={form.reorderUrl}
    onChange={e => setForm(f => ({ ...f, reorderUrl: e.target.value }))}
    placeholder="https://..."
  />
</div>
```

After the Reorder URL block (before Vendor Item #), add:
```tsx
{/* Barcode */}
<div className="space-y-1.5">
  <label className="text-sm font-medium">Barcode (optional)</label>
  <div className="flex gap-2">
    <Input
      value={form.barcode}
      onChange={e => setForm(f => ({ ...f, barcode: e.target.value }))}
      placeholder="e.g. 0012345678901"
      className="font-mono"
    />
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="shrink-0 gap-1.5"
      onClick={() => setBarcodeScanner(true)}
    >
      <Camera className="w-4 h-4" />
      Scan
    </Button>
  </div>
</div>
```

- [ ] **Step 8: Add `BarcodeScannerDialog` to the form with mock-barcode handler**

The scan callback for ItemManager ignores the returned itemId and instead generates a mock barcode string (13-digit numeric, like EAN-13 format).

Just before the closing `</DialogContent>` (or at the bottom of the dialog, before `DialogFooter`), add the dialog. Also add the scanner near the other dialogs in the JSX — place `BarcodeScannerDialog` outside the main dialog. Find where the main Dialog is closed and add after it:

```tsx
<BarcodeScannerDialog
  open={barcodeScanner}
  onOpenChange={setBarcodeScanner}
  onItemScanned={() => {
    const mockBarcode = String(Math.floor(1000000000000 + Math.random() * 9000000000000));
    setForm(f => ({ ...f, barcode: mockBarcode }));
    setBarcodeScanner(false);
  }}
/>
```

- [ ] **Step 9: Show barcode on item cards**

Find where item cards display `item.reorderUrl` (around line 44 of ItemManager.tsx where the card renders item details):

```tsx
{item.reorderUrl && (
  <a
    href={item.reorderUrl}
    ...
  >
```

After that block, add:
```tsx
{item.barcode && (
  <div className="flex items-center gap-1 mt-1">
    <Barcode className="w-3 h-3 text-muted-foreground" />
    <span className="font-mono text-xs text-muted-foreground">{item.barcode}</span>
  </div>
)}
```

- [ ] **Step 10: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: No errors.

- [ ] **Step 11: Commit**

```bash
git add src/components/inventory-v2/pages/ItemManager.tsx
git commit -m "feat(inventory-v2): add barcode field and scan-to-assign to ItemManager"
```
