# Commissary Kiosk — Design Spec
**Date:** 2026-05-25  
**Status:** Approved

---

## Problem

Anyone pulling products from the commissary (FAs, cleaners, other crew) has no way to log what they removed. The commissary manager can't see stock deplete in real-time and doesn't know when to reorder. There's no accountability loop between "items leave the shelf" and "stock count updates."

---

## Solution

A permanently-on iPad kiosk mounted near the commissary shelves. No login. No navigation to the rest of the app. Anyone walks up, taps what they took, confirms, and walks away. Stock count in the system updates immediately.

---

## Route & Access

- **URL:** `/commissary-kiosk`
- **Auth:** None — public route, outside the `isAuthenticated` guard in `App.tsx`
- **Pattern:** Same as `/public/passenger-form` (existing public route precedent)
- **Implementation:** Add as a top-level `<Route>` before the auth-protected `/*` catch-all, wrapped in `<InventoryV2Provider userRole="commissary-kiosk">`
- **iPad setup:** Safari bookmarked to this URL, guided access / screen time lock prevents navigation away

---

## Screen Layout

Full-screen dark UI (matches inventory-v2 dark theme — `bg-slate-950`, `text-white`). No global Navigation component — renders standalone.

### Header (fixed, shrink-0)
- Left: "Commissary Checkout" — large title
- Right: "P&G Flight Ops" — subtle branding
- No back button, no logout, no nav links
- Bottom border separates from content

### Content (flex-1, overflow-y-auto)
- **Category pills** — horizontally scrollable row of pills, one per `SUPPLY_CATEGORIES` entry. Active pill highlighted in blue.
- **Item grid** — 2-column grid of all items in the selected category, sorted alphabetically.  
  Each item card shows:
  - Item name (truncated if needed)
  - Current stock count (e.g., "24 in stock") — dimmed
  - `−` button (disabled at 0) · quantity counter · `+` button
  - Large touch targets: buttons are `w-12 h-12` minimum

### Footer (sticky bottom-0, shrink-0)
- Single "Confirm — X items removed" button spanning full width
- Disabled + dimmed when total quantity = 0
- Enabled (green) when at least 1 item has quantity > 0
- `X` shows total item count across all categories (not just current tab)

### Confirmation Flash
- On confirm tap: full-screen green overlay with large "✓ Logged" 
- Duration: 2 seconds
- Then: auto-reset all counters to 0, return to category view (first category selected)

---

## Data Flow

### Reading
- Items sourced from `useInventoryV2()` → `state.items`
- Filtered by `supplyCategory` matching selected category pill
- Current stock shown from `item.currentStock`

### Writing
- On confirm, dispatch new action: `KIOSK_REMOVE_STOCK`
- Payload: `Array<{ itemId: string; quantity: number }>`
- Reducer: for each entry, decrements `currentStock` by `quantity` (floor at 0)
- Existing `localStorage` persistence handles saving — no extra work needed

### New reducer action (in `types.ts` and `InventoryV2Context.tsx`)
```typescript
| { type: 'KIOSK_REMOVE_STOCK'; payload: Array<{ itemId: string; quantity: number }> }
```

---

## What It Explicitly Does Not Do

- No user attribution (no name, no PIN, no role)
- No trip or aircraft association
- No editing of item metadata
- No navigation to any other part of the app
- No viewing of historical removals
- No receiving / add-to-stock flows

---

## Files to Create / Modify

| File | Change |
|---|---|
| `src/components/inventory-v2/pages/CommissaryKiosk.tsx` | New — the kiosk page component |
| `src/components/inventory-v2/types.ts` | Add `KIOSK_REMOVE_STOCK` action type |
| `src/components/inventory-v2/InventoryV2Context.tsx` | Add `KIOSK_REMOVE_STOCK` reducer case |
| `src/components/inventory-v2/index.ts` | Export `CommissaryKiosk` |
| `src/App.tsx` | Add `/commissary-kiosk` public route |

---

## Out of Scope (Future)

- Barcode / QR scanner input
- User attribution via PIN
- Per-aircraft stock depletion logging
- Low-stock alerts triggered from kiosk removals (commissary manager already has alert system)
