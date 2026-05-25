# Product Links (Reorder URLs) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Surface each commissary item's `reorderUrl` vendor link in the Commissary Dashboard alert rows and StockroomCount below-par item rows.

**Architecture:** `reorderUrl` already exists on `InventoryItemV2` and is set/edited in ItemManager. This plan only adds display of that field in two places: a "Reorder" button in `StockRow` inside CommissaryDashboard, and a small external link icon on below-par rows in StockroomCount. No type changes, no state changes.

**Tech Stack:** React, TypeScript, Tailwind CSS, lucide-react (`ExternalLink`)

---

### Task 1: Add reorder link to CommissaryDashboard alert rows

**Files:**
- Modify: `src/components/inventory-v2/pages/CommissaryDashboard.tsx`

The `StockRow` component at the top of this file currently takes `{ si: StockroomItem, itemName: string, label: 'critical' | 'threshold' }` and shows a "Restock →" button. We need to also accept `reorderUrl?: string` and render a link when it's present.

- [ ] **Step 1: Add `ExternalLink` to the lucide import**

Find the import at line 3 of `CommissaryDashboard.tsx`:
```tsx
import { CheckCircle2, ShoppingCart } from 'lucide-react';
```

Replace with:
```tsx
import { CheckCircle2, ShoppingCart, ExternalLink } from 'lucide-react';
```

- [ ] **Step 2: Update `StockRow` props and rendering**

Find the `StockRow` function (lines 23–54):
```tsx
function StockRow({
  si,
  itemName,
  label,
}: {
  si: StockroomItem;
  itemName: string;
  label: 'critical' | 'threshold';
}) {
  const navigate = useNavigate();
  const limitLabel = label === 'critical'
    ? `Minimum: ${si.minimumLevel}`
    : `Par: ${si.parLevel}`;

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-semibold truncate">{itemName}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {si.qtyOnHand} on hand · {limitLabel}
        </p>
      </div>
      <Button
        size="sm"
        className="h-7 shrink-0 px-3 text-xs"
        onClick={() => navigate(`/inventory-v2/receiving?itemId=${si.itemId}`)}
      >
        Restock →
      </Button>
    </div>
  );
}
```

Replace with:
```tsx
function StockRow({
  si,
  itemName,
  label,
  reorderUrl,
}: {
  si: StockroomItem;
  itemName: string;
  label: 'critical' | 'threshold';
  reorderUrl?: string;
}) {
  const navigate = useNavigate();
  const limitLabel = label === 'critical'
    ? `Minimum: ${si.minimumLevel}`
    : `Par: ${si.parLevel}`;

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-semibold truncate">{itemName}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {si.qtyOnHand} on hand · {limitLabel}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {reorderUrl && (
          <a
            href={reorderUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
            onClick={e => e.stopPropagation()}
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Reorder
          </a>
        )}
        <Button
          size="sm"
          className="h-7 px-3 text-xs"
          onClick={() => navigate(`/inventory-v2/receiving?itemId=${si.itemId}`)}
        >
          Restock →
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Pass `reorderUrl` at call sites**

Find in `CommissaryDashboard.tsx` (the `itemName` helper function and usages):

The existing `itemName` helper at line 76 returns only the name. Add a parallel helper for `reorderUrl`:

Find:
```tsx
function itemName(itemId: string) {
  return state.items.find(i => i.id === itemId)?.itemName ?? itemId;
}
```

Replace with:
```tsx
function itemName(itemId: string) {
  return state.items.find(i => i.id === itemId)?.itemName ?? itemId;
}

function itemReorderUrl(itemId: string) {
  return state.items.find(i => i.id === itemId)?.reorderUrl;
}
```

Then find the two `StockRow` render calls:
```tsx
<StockRow key={si.itemId} si={si} itemName={itemName(si.itemId)} label="critical" />
```
and
```tsx
<StockRow key={si.itemId} si={si} itemName={itemName(si.itemId)} label="threshold" />
```

Replace both with (adding `reorderUrl`):
```tsx
<StockRow key={si.itemId} si={si} itemName={itemName(si.itemId)} label="critical" reorderUrl={itemReorderUrl(si.itemId)} />
```
and
```tsx
<StockRow key={si.itemId} si={si} itemName={itemName(si.itemId)} label="threshold" reorderUrl={itemReorderUrl(si.itemId)} />
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd /Users/bryandunlop/Antigravity/Antigravity-Aviation-Management-System && npx tsc --noEmit 2>&1 | head -30
```

Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/inventory-v2/pages/CommissaryDashboard.tsx
git commit -m "feat(inventory-v2): surface reorder links on commissary dashboard alert rows"
```

---

### Task 2: Add reorder link to StockroomCount below-par rows

**Files:**
- Modify: `src/components/inventory-v2/pages/StockroomCount.tsx`

The item row grid is currently `grid-cols-[1fr_80px_90px_90px_120px_60px_60px_28px]`. We'll add a small inline reorder link icon after the item name within the name cell — no grid change needed.

- [ ] **Step 1: Add `ExternalLink` to the lucide import**

Find the existing lucide-react import in `StockroomCount.tsx` and add `ExternalLink` to it. Example — if it reads:
```tsx
import { Minus, Plus, ChevronDown, ... } from 'lucide-react';
```

Add `ExternalLink` to that list.

- [ ] **Step 2: Add the reorder link inline in the item name cell**

Find the item name cell in the row (around line 218 of StockroomCount.tsx):
```tsx
<span className="font-medium truncate">{item.itemName}</span>
```

Replace with:
```tsx
<span className="font-medium truncate flex items-center gap-1.5">
  {item.itemName}
  {isBelowPar && item.reorderUrl && (
    <a
      href={item.reorderUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-400 hover:text-blue-300 transition-colors shrink-0"
      title="Reorder from vendor"
      onClick={e => e.stopPropagation()}
    >
      <ExternalLink className="w-3 h-3" />
    </a>
  )}
</span>
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/inventory-v2/pages/StockroomCount.tsx
git commit -m "feat(inventory-v2): show reorder link on below-par stockroom count rows"
```
