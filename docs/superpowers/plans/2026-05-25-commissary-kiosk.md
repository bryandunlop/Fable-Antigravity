# Commissary Kiosk Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a permanently-on, no-login iPad kiosk at `/commissary-kiosk` where anyone can log items they pulled from the commissary, depleting `qtyOnHand` in real time.

**Architecture:** A single new page component (`CommissaryKiosk.tsx`) mounted as a public route in `App.tsx` (same pattern as `/public/passenger-form`). It wraps in `InventoryV2Provider` for state access. Stock depletion reuses the existing `BULK_UPDATE_STOCKROOM` action — no new reducer cases or types needed. The component is fully self-contained with no global Navigation wrapper.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, shadcn/ui (`Button`, `Badge`), `useInventoryV2` context hook, React Router v6.

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `src/components/inventory-v2/pages/CommissaryKiosk.tsx` | **Create** | The kiosk page — layout, category tabs, item grid, confirm flow |
| `src/components/inventory-v2/index.ts` | **Modify** | Add `CommissaryKiosk` barrel export |
| `src/App.tsx` | **Modify** | Add `/commissary-kiosk` as a public route before the auth guard |

No new types or reducer changes — `BULK_UPDATE_STOCKROOM` already does exactly what's needed and triggers stock alerts automatically.

---

## Key Data Model

```
state.items: InventoryItemV2[]          — item names, supplyCategory
state.stockroomItems: StockroomItem[]   — qtyOnHand (join on itemId)

StockroomItem { itemId, stockroomId, qtyOnHand, parLevel, minimumLevel, binLocation }
InventoryItemV2 { id, itemName, supplyCategory, ... }
```

To show an item on the kiosk: it must exist in both `state.items` AND have a matching `state.stockroomItems` entry (i.e., it's physically in the commissary). Join on `item.id === stockroomItem.itemId`.

Stock depletion — dispatch `BULK_UPDATE_STOCKROOM` with updated `StockroomItem[]`:
```typescript
dispatch({
  type: 'BULK_UPDATE_STOCKROOM',
  payload: updatedStockroomItems, // StockroomItem[] with decremented qtyOnHand
});
```

---

## Task 1: Register the public route in App.tsx

**Files:**
- Modify: `src/App.tsx` (around line 171 — the public routes block)
- Modify: `src/components/inventory-v2/index.ts`

- [ ] **Step 1: Add the barrel export**

Open `src/components/inventory-v2/index.ts` and add one line after the existing page exports:

```typescript
export { default as CommissaryKiosk } from './pages/CommissaryKiosk';
```

- [ ] **Step 2: Import CommissaryKiosk in App.tsx**

Find the inventory-v2 import block in `src/App.tsx` (search for `InventoryV2Dashboard`). Add `CommissaryKiosk` to that import:

```typescript
import {
  InventoryV2Dashboard,
  // ... existing imports ...
  CommissaryKiosk,
} from './components/inventory-v2';
```

- [ ] **Step 3: Add the public route**

In `src/App.tsx`, find the public routes comment block (around line 170):

```tsx
{/* Public Routes - No Authentication Required */}
<Route path="/public/passenger-form" element={<PublicPassengerForm />} />
```

Add the kiosk route immediately after:

```tsx
{/* Public Routes - No Authentication Required */}
<Route path="/public/passenger-form" element={<PublicPassengerForm />} />
<Route
  path="/commissary-kiosk"
  element={
    <InventoryV2Provider userRole="commissary-kiosk">
      <CommissaryKiosk />
    </InventoryV2Provider>
  }
/>
```

- [ ] **Step 4: Create an empty placeholder so the import resolves**

Create `src/components/inventory-v2/pages/CommissaryKiosk.tsx` with just enough to compile:

```typescript
export default function CommissaryKiosk() {
  return <div>Commissary Kiosk — coming soon</div>;
}
```

- [ ] **Step 5: Verify it compiles**

```bash
cd /Users/bryandunlop/Antigravity/Antigravity-Aviation-Management-System
npx tsc --noEmit 2>&1 | grep "CommissaryKiosk"
```

Expected: no output (no errors mentioning CommissaryKiosk).

- [ ] **Step 6: Commit**

```bash
git add src/App.tsx src/components/inventory-v2/index.ts src/components/inventory-v2/pages/CommissaryKiosk.tsx
git commit -m "feat: register /commissary-kiosk public route"
```

---

## Task 2: Build CommissaryKiosk — layout skeleton

**Files:**
- Modify: `src/components/inventory-v2/pages/CommissaryKiosk.tsx`

The kiosk is a full-screen dark page with three zones: fixed header, scrollable content, sticky footer. It renders standalone — no `Navigation` wrapper, no breadcrumb.

- [ ] **Step 1: Replace placeholder with layout skeleton**

```typescript
import React, { useState, useMemo, useEffect } from 'react';
import { useInventoryV2 } from '../InventoryV2Context';
import { SUPPLY_CATEGORIES } from '../constants';
import type { SupplyCategory } from '../types';

export default function CommissaryKiosk() {
  const { state, dispatch } = useInventoryV2();
  const [selectedCategory, setSelectedCategory] = useState<SupplyCategory>('beverages');
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [confirmed, setConfirmed] = useState(false);

  // Total items across all categories
  const totalItems = useMemo(
    () => Object.values(quantities).reduce((sum, q) => sum + q, 0),
    [quantities]
  );

  // Items in selected category that exist in the stockroom
  const visibleItems = useMemo(() => {
    return state.items
      .filter(item => item.supplyCategory === selectedCategory)
      .filter(item => state.stockroomItems.some(si => si.itemId === item.id))
      .sort((a, b) => a.itemName.localeCompare(b.itemName));
  }, [state.items, state.stockroomItems, selectedCategory]);

  // Get qtyOnHand for a given itemId
  const getQtyOnHand = (itemId: string): number => {
    return state.stockroomItems.find(si => si.itemId === itemId)?.qtyOnHand ?? 0;
  };

  const handleIncrement = (itemId: string) => {
    const onHand = getQtyOnHand(itemId);
    const current = quantities[itemId] ?? 0;
    if (current >= onHand) return; // can't take more than what's there
    setQuantities(prev => ({ ...prev, [itemId]: current + 1 }));
  };

  const handleDecrement = (itemId: string) => {
    const current = quantities[itemId] ?? 0;
    if (current <= 0) return;
    setQuantities(prev => ({ ...prev, [itemId]: current - 1 }));
  };

  const handleConfirm = () => {
    const removals = Object.entries(quantities).filter(([, qty]) => qty > 0);
    if (removals.length === 0) return;

    const updatedStockroomItems = state.stockroomItems.map(si => {
      const qty = quantities[si.itemId] ?? 0;
      if (qty === 0) return si;
      return { ...si, qtyOnHand: Math.max(0, si.qtyOnHand - qty) };
    });

    dispatch({ type: 'BULK_UPDATE_STOCKROOM', payload: updatedStockroomItems });
    setConfirmed(true);
  };

  // Auto-reset after 2 seconds
  useEffect(() => {
    if (!confirmed) return;
    const timer = setTimeout(() => {
      setQuantities({});
      setSelectedCategory('beverages');
      setConfirmed(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, [confirmed]);

  return (
    <div className="h-screen flex flex-col bg-slate-950 text-white overflow-hidden relative">
      {/* ── CONFIRMATION FLASH ── */}
      {confirmed && (
        <div className="absolute inset-0 z-50 bg-emerald-600 flex flex-col items-center justify-center">
          <div className="text-8xl mb-4">✓</div>
          <div className="text-4xl font-bold">Logged</div>
        </div>
      )}

      {/* ── HEADER ── */}
      <div className="shrink-0 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Commissary Checkout</h1>
          <p className="text-sm text-slate-400">Log items you are removing from the commissary</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-slate-300">P&G Flight Ops</p>
          <p className="text-xs text-slate-500">GFO Commissary</p>
        </div>
      </div>

      {/* ── CATEGORY PILLS ── */}
      <div className="shrink-0 px-4 py-3 border-b border-slate-800 overflow-x-auto">
        <div className="flex gap-2 min-w-max">
          {SUPPLY_CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── ITEM GRID ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {visibleItems.length === 0 ? (
          <div className="text-center text-slate-500 mt-16 text-lg">
            No items in this category
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 max-w-2xl mx-auto">
            {visibleItems.map(item => {
              const qty = quantities[item.id] ?? 0;
              const onHand = getQtyOnHand(item.id);
              return (
                <div
                  key={item.id}
                  className={`bg-slate-800 rounded-xl p-4 flex items-center justify-between ${
                    qty > 0 ? 'ring-2 ring-blue-500' : ''
                  }`}
                >
                  <div className="min-w-0 mr-3">
                    <p className="font-semibold text-sm truncate">{item.itemName}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{onHand} in stock</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleDecrement(item.id)}
                      disabled={qty === 0}
                      className="w-12 h-12 rounded-lg bg-slate-700 disabled:opacity-30 flex items-center justify-center text-xl font-bold hover:bg-slate-600 transition-colors"
                    >
                      −
                    </button>
                    <span className="w-8 text-center text-lg font-bold">{qty}</span>
                    <button
                      onClick={() => handleIncrement(item.id)}
                      disabled={qty >= onHand}
                      className="w-12 h-12 rounded-lg bg-blue-600 disabled:opacity-30 flex items-center justify-center text-xl font-bold hover:bg-blue-500 transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── FOOTER ── */}
      <div className="shrink-0 px-4 py-4 border-t border-slate-800">
        <button
          onClick={handleConfirm}
          disabled={totalItems === 0}
          className="w-full max-w-2xl mx-auto block py-4 rounded-xl text-lg font-bold transition-colors disabled:opacity-30 disabled:cursor-not-allowed bg-emerald-600 hover:bg-emerald-500 text-white"
        >
          {totalItems === 0
            ? 'Select items to remove'
            : `Confirm — ${totalItems} item${totalItems === 1 ? '' : 's'} removed`}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles clean**

```bash
npx tsc --noEmit 2>&1 | grep "CommissaryKiosk"
```

Expected: no output.

- [ ] **Step 3: Start the dev server and manually verify**

```bash
npm run dev
```

Open `http://localhost:3000/commissary-kiosk` in a browser (no login required).

Verify:
- Page loads without redirecting to `/login`
- Header shows "Commissary Checkout" and "P&G Flight Ops"
- Category pills render and are horizontally scrollable
- Items appear in the grid (if empty, check that `state.stockroomItems` has entries matching `state.items`)
- `+` increments the counter, `−` decrements (disabled at 0)
- `+` disables when qty reaches `qtyOnHand`
- Footer button is disabled/grey with no selections
- Footer button shows item count when items selected
- Tapping Confirm shows green "✓ Logged" overlay, then resets after 2 seconds
- After reset: all counters zero, first category selected

- [ ] **Step 4: Commit**

```bash
git add src/components/inventory-v2/pages/CommissaryKiosk.tsx
git commit -m "feat: build commissary kiosk page with category browse and stock depletion"
```

---

## Task 3: Wire into .gitignore and vault

**Files:**
- Modify: `.gitignore` (root of repo)
- Update: `~/Obsidian/Antigravity/inventory-v2/progress/TRACKER.md`

- [ ] **Step 1: Add .superpowers to .gitignore**

```bash
echo '.superpowers/' >> /Users/bryandunlop/Antigravity/Antigravity-Aviation-Management-System/.gitignore
```

Verify it was added:
```bash
tail -3 /Users/bryandunlop/Antigravity/Antigravity-Aviation-Management-System/.gitignore
```

- [ ] **Step 2: Update the vault tracker**

Open `~/Obsidian/Antigravity/inventory-v2/progress/TRACKER.md` and add under the most recent track:

```markdown
## Commissary Kiosk (completed 2026-05-25)
| Feature | Status | Notes |
|---|---|---|
| `/commissary-kiosk` public route | ✅ Complete | No auth, InventoryV2Provider wrapped |
| Category pill nav | ✅ Complete | All 15 SUPPLY_CATEGORIES |
| Item grid with +/− | ✅ Complete | Filtered to items in stockroomItems |
| Stock depletion | ✅ Complete | BULK_UPDATE_STOCKROOM, triggers alerts |
| Confirm flash + auto-reset | ✅ Complete | 2s green overlay then zero counters |
```

- [ ] **Step 3: Commit**

```bash
git add .gitignore
git commit -m "chore: add .superpowers to .gitignore"
```
