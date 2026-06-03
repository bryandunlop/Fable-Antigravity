// ─── Inventory V2 — Quick Tap POS View ──────────────────────────────────────
// A point-of-sale-style grid for fast in-flight item usage logging.
// Designed for speed: large tap targets, minimal scrolling, and familiar POS UX.

import React, { useState, useMemo, useCallback, useRef } from 'react';
import {
  Coffee, GlassWater, Cookie, Wine, Scroll, Pill, SprayCan,
  Minus, Plus, X, ChevronDown, ShoppingCart, Zap, type LucideIcon,
} from 'lucide-react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { cn } from '../../ui/utils';
import { POS_CATEGORIES, DEFAULT_QUICK_ADD_ITEM_IDS } from '../constants';
import type { InventoryItemV2, TripLeg, Trip } from '../types';

// ─── Icon Map ───────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, LucideIcon> = {
  Coffee,
  GlassWater,
  Cookie,
  Wine,
  Scroll,
  Pill,
  SprayCan,
};

// ─── Types ──────────────────────────────────────────────────────────────────

interface QuickTapViewProps {
  items: InventoryItemV2[];
  activeLeg: TripLeg;
  trip: Trip;
  aircraftType: 'G650' | 'G500';
  onIncrement: (item: InventoryItemV2) => void;
  onDecrement: (item: InventoryItemV2) => void;
  getLegUsage: (item: InventoryItemV2) => number;
  getOnBoard: (item: InventoryItemV2) => number;
}

// ─── Quick-Tap Tile ─────────────────────────────────────────────────────────

function TapTile({
  item,
  usage,
  onBoard,
  onTap,
  onLongPress,
}: {
  item: InventoryItemV2;
  usage: number;
  onBoard: number;
  onTap: () => void;
  onLongPress: () => void;
}) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggered = useRef(false);

  const handlePointerDown = useCallback(() => {
    longPressTriggered.current = false;
    timerRef.current = setTimeout(() => {
      longPressTriggered.current = true;
      onLongPress();
    }, 400);
  }, [onLongPress]);

  const handlePointerUp = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (!longPressTriggered.current) {
      onTap();
    }
  }, [onTap]);

  const handlePointerLeave = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  return (
    <button
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      className={cn(
        'relative flex flex-col items-center justify-center gap-1.5 p-3',
        'bg-muted/80 border border-border rounded-xl',
        'hover:bg-muted active:scale-95 transition-all duration-150',
        'select-none touch-manipulation min-h-[88px]',
        onBoard <= 0 && 'opacity-40 pointer-events-none'
      )}
    >
      {/* Usage badge */}
      {usage > 0 && (
        <span className="absolute -top-1.5 -right-1.5 bg-blue-500 text-white text-xs font-bold rounded-full min-w-[22px] h-[22px] flex items-center justify-center px-1 shadow-lg shadow-blue-500/30 z-10">
          {usage}
        </span>
      )}

      {/* Item name */}
      <span className="text-xs font-semibold text-center leading-tight line-clamp-2">
        {item.itemName}
      </span>

      {/* On-board indicator */}
      <span className={cn(
        'text-[10px] font-medium',
        onBoard <= 2 ? 'text-amber-500' : 'text-muted-foreground'
      )}>
        {onBoard} left
      </span>
    </button>
  );
}

// ─── Category Card ──────────────────────────────────────────────────────────

function CategoryCard({
  category,
  itemCount,
  usageCount,
  onClick,
}: {
  category: typeof POS_CATEGORIES[0];
  itemCount: number;
  usageCount: number;
  onClick: () => void;
}) {
  const IconComponent = ICON_MAP[category.icon] || Coffee;

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 p-4',
        'bg-muted/60 border border-border rounded-xl',
        'hover:bg-muted active:scale-[0.98] transition-all duration-150',
        'select-none touch-manipulation text-left w-full'
      )}
    >
      <div className={cn(
        'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
        'bg-background/80 border border-border'
      )}>
        <IconComponent className={cn('w-5 h-5', category.color)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate">{category.label}</p>
        <p className="text-xs text-muted-foreground">
          {itemCount} item{itemCount !== 1 ? 's' : ''}
          {usageCount > 0 && (
            <span className="text-blue-400 ml-1">· {usageCount} used</span>
          )}
        </p>
      </div>
      <ChevronDown className="w-4 h-4 text-muted-foreground -rotate-90 shrink-0" />
    </button>
  );
}

// ─── Category Sheet (slide-up panel) ────────────────────────────────────────

function CategorySheet({
  category,
  items,
  getLegUsage,
  getOnBoard,
  onIncrement,
  onDecrement,
  onClose,
  onLongPress,
}: {
  category: typeof POS_CATEGORIES[0];
  items: InventoryItemV2[];
  getLegUsage: (item: InventoryItemV2) => number;
  getOnBoard: (item: InventoryItemV2) => number;
  onIncrement: (item: InventoryItemV2) => void;
  onDecrement: (item: InventoryItemV2) => void;
  onClose: () => void;
  onLongPress: (item: InventoryItemV2) => void;
}) {
  const IconComponent = ICON_MAP[category.icon] || Coffee;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Sheet */}
      <div
        className="relative bg-card rounded-t-2xl border-t border-border max-h-[75dvh] flex flex-col animate-in slide-in-from-bottom duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className={cn(
              'w-9 h-9 rounded-lg flex items-center justify-center',
              'bg-muted border border-border'
            )}>
              <IconComponent className={cn('w-5 h-5', category.color)} />
            </div>
            <div>
              <h3 className="text-sm font-bold">{category.label}</h3>
              <p className="text-xs text-muted-foreground">{items.length} items · tap to add</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center hover:bg-muted/80"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Item grid */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
            {items.map(item => (
              <TapTile
                key={item.id}
                item={item}
                usage={getLegUsage(item)}
                onBoard={getOnBoard(item)}
                onTap={() => onIncrement(item)}
                onLongPress={() => onLongPress(item)}
              />
            ))}
          </div>
          {items.length === 0 && (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No items in this category for this aircraft.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Cart Review Sheet ──────────────────────────────────────────────────────

function CartReviewSheet({
  items,
  usageEntries,
  getLegUsage,
  onIncrement,
  onDecrement,
  onClose,
}: {
  items: InventoryItemV2[];
  usageEntries: { item: InventoryItemV2; qty: number }[];
  getLegUsage: (item: InventoryItemV2) => number;
  onIncrement: (item: InventoryItemV2) => void;
  onDecrement: (item: InventoryItemV2) => void;
  onClose: () => void;
}) {
  const totalItems = usageEntries.reduce((sum, e) => sum + e.qty, 0);

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <div
        className="relative bg-card rounded-t-2xl border-t border-border max-h-[80dvh] flex flex-col animate-in slide-in-from-bottom duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div>
            <h3 className="text-sm font-bold">Items Logged This Leg</h3>
            <p className="text-xs text-muted-foreground">
              {usageEntries.length} item{usageEntries.length !== 1 ? 's' : ''} · {totalItems} total
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center hover:bg-muted/80"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Item list */}
        <div className="flex-1 overflow-y-auto">
          {usageEntries.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">
              No items logged yet. Tap items above to start tracking.
            </div>
          ) : (
            usageEntries.map(({ item, qty }) => (
              <div
                key={item.id}
                className="flex items-center gap-3 px-5 py-3 border-b border-border/60"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{item.itemName}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.category}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => onDecrement(item)}
                    className="w-9 h-9 rounded-lg bg-muted border border-border flex items-center justify-center hover:bg-muted/80 transition-colors"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-7 text-center text-sm font-bold text-blue-400">
                    {qty}
                  </span>
                  <button
                    onClick={() => onIncrement(item)}
                    className="w-9 h-9 rounded-lg bg-muted border border-border flex items-center justify-center hover:bg-muted/80 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Quantity Picker Dialog ─────────────────────────────────────────────────

function QtyPickerDialog({
  item,
  currentQty,
  onConfirm,
  onClose,
}: {
  item: InventoryItemV2;
  currentQty: number;
  onConfirm: (qty: number) => void;
  onClose: () => void;
}) {
  const [value, setValue] = useState(currentQty || 1);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative bg-card border border-border rounded-2xl p-5 w-[280px] space-y-4 animate-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        <div>
          <h3 className="text-sm font-bold">{item.itemName}</h3>
          <p className="text-xs text-muted-foreground">Set quantity used</p>
        </div>
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => setValue(v => Math.max(0, v - 1))}
            className="w-12 h-12 rounded-xl bg-muted border border-border flex items-center justify-center text-xl hover:bg-muted/80 transition-colors"
          >
            −
          </button>
          <Input
            type="number"
            value={value}
            onChange={e => setValue(Math.max(0, parseInt(e.target.value, 10) || 0))}
            className="w-20 text-center text-2xl font-bold h-12"
            min={0}
          />
          <button
            onClick={() => setValue(v => v + 1)}
            className="w-12 h-12 rounded-xl bg-muted border border-border flex items-center justify-center text-xl hover:bg-muted/80 transition-colors"
          >
            +
          </button>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={() => { onConfirm(value); onClose(); }}
            className="flex-1 bg-blue-600 hover:bg-blue-500"
          >
            Set ({value})
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function QuickTapView({
  items,
  activeLeg,
  trip,
  aircraftType,
  onIncrement,
  onDecrement,
  getLegUsage,
  getOnBoard,
}: QuickTapViewProps) {
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const [showCart, setShowCart] = useState(false);
  const [qtyPickerItem, setQtyPickerItem] = useState<InventoryItemV2 | null>(null);

  // ── Consumable items only ──
  const consumableItems = useMemo(() => {
    return items.filter(item => item.isConsumable !== false);
  }, [items]);

  // ── Quick Add items (pinned top 8) ──
  const quickAddItems = useMemo(() => {
    return DEFAULT_QUICK_ADD_ITEM_IDS
      .map(id => consumableItems.find(i => i.id === id))
      .filter((item): item is InventoryItemV2 => {
        if (!item) return false;
        const qty = item.defaultQuantities[aircraftType];
        return qty !== undefined && qty > 0;
      });
  }, [consumableItems, aircraftType]);

  // ── Items grouped by POS category ──
  const categoryGroups = useMemo(() => {
    return POS_CATEGORIES
      .map(cat => {
        const catItems = consumableItems.filter(item =>
          item.posCategory === cat.id
        );
        const usageCount = catItems.reduce((sum, item) => sum + getLegUsage(item), 0);
        return { category: cat, items: catItems, usageCount };
      })
      .filter(g => g.items.length > 0);
  }, [consumableItems, getLegUsage]);

  // ── All usage entries for cart review ──
  const usageEntries = useMemo(() => {
    return activeLeg.usageLog
      .map(entry => {
        const item = items.find(i => i.id === entry.itemId);
        return item ? { item, qty: entry.qtyUsed } : null;
      })
      .filter((e): e is { item: InventoryItemV2; qty: number } => e !== null)
      .sort((a, b) => a.item.itemName.localeCompare(b.item.itemName));
  }, [activeLeg.usageLog, items]);

  const totalUsed = activeLeg.usageLog.reduce((sum, e) => sum + e.qtyUsed, 0);

  // ── Long-press handler (set specific quantity) ──
  const handleLongPress = useCallback((item: InventoryItemV2) => {
    setQtyPickerItem(item);
  }, []);

  const handleQtyConfirm = useCallback((qty: number) => {
    if (!qtyPickerItem) return;
    const currentUsage = getLegUsage(qtyPickerItem);
    const diff = qty - currentUsage;
    if (diff > 0) {
      for (let i = 0; i < diff; i++) onIncrement(qtyPickerItem);
    } else if (diff < 0) {
      for (let i = 0; i < Math.abs(diff); i++) onDecrement(qtyPickerItem);
    }
    setQtyPickerItem(null);
  }, [qtyPickerItem, getLegUsage, onIncrement, onDecrement]);

  // ── Find the open category data ──
  const openCategoryData = openCategory
    ? categoryGroups.find(g => g.category.id === openCategory)
    : null;

  return (
    <div className="space-y-5">
      {/* ── Quick Add Section ── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-4 h-4 text-amber-400" />
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Quick Add
          </h3>
          <span className="text-[10px] text-muted-foreground/60 ml-auto">tap to +1 · hold for qty</span>
        </div>
        <div className="grid grid-cols-4 gap-2.5">
          {quickAddItems.map(item => (
            <TapTile
              key={item.id}
              item={item}
              usage={getLegUsage(item)}
              onBoard={getOnBoard(item)}
              onTap={() => onIncrement(item)}
              onLongPress={() => handleLongPress(item)}
            />
          ))}
        </div>
      </div>

      {/* ── Category Grid ── */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
          Browse by Category
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {categoryGroups.map(({ category, items: catItems, usageCount }) => (
            <CategoryCard
              key={category.id}
              category={category}
              itemCount={catItems.length}
              usageCount={usageCount}
              onClick={() => setOpenCategory(category.id)}
            />
          ))}
        </div>
      </div>

      {/* ── Cart Footer Bar ── */}
      <div
        className={cn(
          'sticky bottom-0 -mx-4 px-4 py-3 border-t border-border',
          'bg-background/95 backdrop-blur-sm',
          totalUsed > 0 ? 'cursor-pointer' : ''
        )}
        onClick={() => totalUsed > 0 && setShowCart(true)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">
              {totalUsed > 0 ? (
                <>
                  <span className="text-blue-400 font-bold">{totalUsed}</span>
                  {' '}item{totalUsed !== 1 ? 's' : ''} logged
                </>
              ) : (
                <span className="text-muted-foreground">No items logged yet</span>
              )}
            </span>
          </div>
          {totalUsed > 0 && (
            <span className="text-xs text-blue-400 font-medium">
              Review →
            </span>
          )}
        </div>
      </div>

      {/* ── Category Sheet ── */}
      {openCategoryData && (
        <CategorySheet
          category={openCategoryData.category}
          items={openCategoryData.items}
          getLegUsage={getLegUsage}
          getOnBoard={getOnBoard}
          onIncrement={onIncrement}
          onDecrement={onDecrement}
          onClose={() => setOpenCategory(null)}
          onLongPress={handleLongPress}
        />
      )}

      {/* ── Cart Review Sheet ── */}
      {showCart && (
        <CartReviewSheet
          items={items}
          usageEntries={usageEntries}
          getLegUsage={getLegUsage}
          onIncrement={onIncrement}
          onDecrement={onDecrement}
          onClose={() => setShowCart(false)}
        />
      )}

      {/* ── Quantity Picker ── */}
      {qtyPickerItem && (
        <QtyPickerDialog
          item={qtyPickerItem}
          currentQty={getLegUsage(qtyPickerItem)}
          onConfirm={handleQtyConfirm}
          onClose={() => setQtyPickerItem(null)}
        />
      )}
    </div>
  );
}
