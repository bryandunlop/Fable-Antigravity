# Product Links (Reorder URLs) — Design Spec

**Date:** 2026-05-24
**Status:** Approved

## Purpose

Surface each commissary item's `reorderUrl` (vendor ordering link — Amazon, Costco, Target, etc.) in the places where someone would actually act on it: low-stock alerts and the stockroom count view. ItemManager already supports setting and displaying the URL.

## Current State

- `reorderUrl?: string` already exists on `InventoryItemV2`
- ItemManager already has an edit field for it and displays a clickable link on item cards
- No other pages surface it

## Changes

### 1. Commissary Dashboard Alerts (`CommissaryDashboard.tsx`)

On alert cards for items below threshold, add a small "Reorder" button/link if `item.reorderUrl` is set.

**Placement:** Inside the alert card, next to or below the item name.

**Appearance:**
- Small secondary button or icon link: `ExternalLink` icon + "Reorder" text
- Opens `reorderUrl` in a new tab (`target="_blank" rel="noopener noreferrer"`)
- Only renders if `reorderUrl` is non-empty

### 2. StockroomCount Item Rows (`StockroomCount.tsx`)

On items that are at or below par level, show a small reorder link icon.

**Placement:** At the end of the item row, after the qty controls.

**Appearance:**
- `ExternalLink` icon (16px), muted color, brightens on hover
- Tooltip: "Reorder from vendor"
- Only renders if `reorderUrl` is non-empty and item is at/below par

## Constraints

- No changes to `InventoryItemV2` type — `reorderUrl` already exists
- No changes to context, reducer, or mock data
- All links open in a new tab with `rel="noopener noreferrer"`
- Links render only when `reorderUrl` is truthy — no broken icons for items without a URL

## Files Changed

| File | Change |
|---|---|
| `src/components/inventory-v2/pages/CommissaryDashboard.tsx` | Add reorder link to alert cards |
| `src/components/inventory-v2/pages/StockroomCount.tsx` | Add reorder link icon to below-par item rows |

## Out of Scope

- Setting reorder URLs (already handled in ItemManager)
- Replenish page rows (not selected)
- Any page beyond CommissaryDashboard and StockroomCount
- Backend sync
