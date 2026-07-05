import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { CheckCircle2, LogOut, Star, Search, X, Undo2 } from 'lucide-react';
import { useInventoryV2 } from '../InventoryV2Context';
import { SUPPLY_CATEGORIES } from '../constants';
import type { SupplyCategory, StockroomItem } from '../types';
import { cn } from '../../ui/utils';

// Undo window (ms) — how long the "Undo" button stays live after Confirm
const UNDO_WINDOW_MS = 5000;

function exitKiosk() {
  // If opened as a new tab from the app, close the tab.
  // If visited directly (e.g. iPad bookmark), navigate to the commissary dashboard.
  if (window.history.length <= 1 || window.opener) {
    window.close();
    // Fallback: if close() is blocked (e.g. not script-opened), navigate instead
    setTimeout(() => { window.location.href = '/inventory-v2/commissary'; }, 300);
  } else {
    window.history.back();
  }
}

export default function CommissaryKiosk() {
  const { state, dispatch } = useInventoryV2();
  const [selectedCategory, setSelectedCategory] = useState<SupplyCategory>('beverages');
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [confirmed, setConfirmed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Undo window state: true while the "Undo" button is live in the flash overlay.
  const [canUndo, setCanUndo] = useState(false);
  // Snapshot of the exact deltas applied on Confirm, so Undo can dispatch the inverse.
  // { stockroomItems: pre-confirm rows (for the inverse update), quantities: staged qtys to restore }
  const undoSnapshotRef = useRef<{ stockroomItems: StockroomItem[]; quantities: Record<string, number> } | null>(null);
  // Ref to the search input so we can detect focus for keyboard-shortcut gating.
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Kiosk has no user — use a shared "kiosk" key for favorites
  const KIOSK_USER_ID = 'kiosk';
  const kioskFavorites = state.favoriteItems[KIOSK_USER_ID] ?? [];
  const isFavorite = (itemId: string) => kioskFavorites.includes(itemId);
  function toggleFavorite(itemId: string) {
    dispatch({ type: 'TOGGLE_FAVORITE_ITEM', payload: { userId: KIOSK_USER_ID, itemId } });
  }

  // Total items across all categories
  const totalItems = useMemo(
    () => Object.values(quantities).reduce((sum, q) => sum + q, 0),
    [quantities]
  );

  // Memoized Map of itemId -> qtyOnHand for O(1) lookups
  const stockroomMap = useMemo(
    () => new Map(state.stockroomItems.map(si => [si.itemId, si.qtyOnHand])),
    [state.stockroomItems]
  );

  const trimmedQuery = searchQuery.trim().toLowerCase();
  const isSearching = trimmedQuery.length > 0;

  // Items to show. A non-empty search overrides the category filter and matches
  // item name + alternateNames across ALL categories. Otherwise: selected category.
  const visibleItems = useMemo(() => {
    return state.items
      .filter(item => stockroomMap.has(item.id))
      .filter(item => {
        if (isSearching) {
          if (item.itemName.toLowerCase().includes(trimmedQuery)) return true;
          return (item.alternateNames ?? []).some(alt => alt.toLowerCase().includes(trimmedQuery));
        }
        return item.supplyCategory === selectedCategory;
      })
      .sort((a, b) => {
        const aFav = kioskFavorites.includes(a.id) ? 0 : 1;
        const bFav = kioskFavorites.includes(b.id) ? 0 : 1;
        if (aFav !== bFav) return aFav - bFav;
        return a.itemName.localeCompare(b.itemName);
      });
  }, [state.items, stockroomMap, selectedCategory, kioskFavorites, isSearching, trimmedQuery]);

  const handleIncrement = (itemId: string) => {
    const onHand = stockroomMap.get(itemId) ?? 0;
    const current = quantities[itemId] ?? 0;
    if (current >= onHand) return; // can't take more than what's there
    setQuantities(prev => ({ ...prev, [itemId]: current + 1 }));
  };

  const handleDecrement = (itemId: string) => {
    const current = quantities[itemId] ?? 0;
    if (current <= 0) return;
    setQuantities(prev => ({ ...prev, [itemId]: current - 1 }));
  };

  const handleConfirm = useCallback(() => {
    if (confirmed) return; // guard against double-tap on slow devices
    const removals = Object.entries(quantities).filter(([, qty]) => qty > 0);
    if (removals.length === 0) return;

    // Pre-confirm rows for the affected items — these are the exact quantities
    // to restore on Undo (inverse BULK_UPDATE_STOCKROOM).
    const affectedRows = state.stockroomItems.filter(si => (quantities[si.itemId] ?? 0) > 0);

    const updatedStockroomItems = affectedRows
      .map(si => ({ ...si, qtyOnHand: Math.max(0, si.qtyOnHand - quantities[si.itemId]) }));

    // Snapshot BEFORE clearing staged qtys, so Undo can restore both stock and steppers.
    undoSnapshotRef.current = {
      stockroomItems: affectedRows.map(si => ({ ...si })),
      quantities: { ...quantities },
    };

    dispatch({ type: 'BULK_UPDATE_STOCKROOM', payload: updatedStockroomItems });
    setSearchQuery('');
    setConfirmed(true);
    setCanUndo(true);
  }, [confirmed, quantities, state.stockroomItems, dispatch]);

  // Undo: dispatch the inverse update (restore deducted qtys), cancel the auto-reset,
  // and restore the staged quantities so the crew member can correct and re-confirm.
  const handleUndo = useCallback(() => {
    if (!canUndo) return; // guard against double-undo
    const snapshot = undoSnapshotRef.current;
    setCanUndo(false);
    undoSnapshotRef.current = null;
    if (snapshot) {
      dispatch({ type: 'BULK_UPDATE_STOCKROOM', payload: snapshot.stockroomItems });
      setQuantities(snapshot.quantities);
    }
    setConfirmed(false);
  }, [canUndo, dispatch]);

  // Auto-reset after the undo window elapses (unchanged 2s flash → extended to the
  // undo window). If the crew member taps Undo, that path clears `confirmed` first
  // and this timer is torn down.
  useEffect(() => {
    if (!confirmed) return;
    const timer = setTimeout(() => {
      setCanUndo(false);
      undoSnapshotRef.current = null;
      setQuantities({});
      setSelectedCategory('beverages');
      setSearchQuery('');
      setConfirmed(false);
    }, UNDO_WINDOW_MS);
    return () => clearTimeout(timer);
  }, [confirmed]);

  // Keyboard shortcuts: 1-9 → category (only when search is NOT focused),
  // Enter → confirm, Escape → clear search first, then staged quantities.
  useEffect(() => {
    const catIds = SUPPLY_CATEGORIES.map(c => c.id);
    function onKey(e: KeyboardEvent) {
      if (confirmed) return;
      const searchFocused = document.activeElement === searchInputRef.current;
      if (e.key === 'Escape') {
        if (searchQuery) {
          setSearchQuery('');
          searchInputRef.current?.blur();
        } else {
          setQuantities({});
        }
        return;
      }
      if (searchFocused) return; // don't hijack typing in the search box
      const num = parseInt(e.key);
      if (!isNaN(num) && num >= 1 && num <= catIds.length) {
        setSelectedCategory(catIds[num - 1] as typeof selectedCategory);
      } else if (e.key === 'Enter') {
        handleConfirm();
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [confirmed, handleConfirm, searchQuery]);

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-slate-950 text-slate-900 dark:text-white overflow-hidden relative animate-in fade-in duration-200">
      {/* ── CONFIRMATION FLASH ── */}
      {confirmed && (
        <div className="absolute inset-0 z-50 bg-emerald-600 flex flex-col items-center justify-center">
          <CheckCircle2 className="w-24 h-24 text-white mb-4" />
          <div className="text-4xl font-bold text-white">Logged</div>
          {canUndo && (
            <button
              onClick={handleUndo}
              className="mt-8 flex items-center gap-2 px-8 py-4 rounded-xl text-lg font-bold bg-white/15 hover:bg-white/25 text-white ring-2 ring-white/60 transition-colors"
            >
              <Undo2 className="w-6 h-6" />
              Undo
            </button>
          )}
        </div>
      )}

      {/* ── HEADER ── */}
      <div className="shrink-0 px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Commissary Checkout</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Log items you are removing from the commissary</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Flight Operations</p>
            <p className="text-xs text-slate-400 dark:text-slate-500">GFO Commissary</p>
          </div>
          <button
            onClick={exitKiosk}
            title="Exit Kiosk"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Exit
          </button>
        </div>
      </div>

      {/* ── SEARCH ── */}
      <div className="shrink-0 px-4 pt-3">
        <div className="relative max-w-2xl mx-auto">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500 pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            inputMode="search"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search all items…"
            aria-label="Search all items"
            className="w-full h-14 pl-12 pr-12 rounded-xl text-base bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 border border-transparent focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => { setSearchQuery(''); searchInputRef.current?.focus(); }}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* ── CATEGORY PILLS ── */}
      <div className={cn(
        'shrink-0 px-4 py-3 border-b border-slate-200 dark:border-slate-800 overflow-x-auto',
        isSearching && 'opacity-40 pointer-events-none'
      )}>
        <div className="flex gap-2 min-w-max">
          {SUPPLY_CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
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
          <div className="text-center text-slate-400 dark:text-slate-500 mt-16 text-lg">
            {isSearching
              ? `No matches for "${searchQuery.trim()}"`
              : 'No items in this category'}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 max-w-2xl mx-auto">
            {visibleItems.map(item => {
              const qty = quantities[item.id] ?? 0;
              const onHand = stockroomMap.get(item.id) ?? 0;
              return (
                <div
                  key={item.id}
                  className={cn('rounded-lg border border-border bg-card shadow-sm p-4 flex items-center justify-between', qty > 0 && 'ring-2 ring-blue-500')}
                >
                  <div className="min-w-0 mr-3">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => toggleFavorite(item.id)}
                        className="shrink-0 text-slate-400 hover:text-amber-400 transition-colors"
                        aria-label={isFavorite(item.id) ? 'Unpin' : 'Pin'}
                      >
                        <Star size={13} className={cn(isFavorite(item.id) && 'fill-amber-400 text-amber-400')} />
                      </button>
                      <p className="font-semibold text-sm truncate">{item.itemName}</p>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{onHand} in stock</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleDecrement(item.id)}
                      disabled={qty === 0}
                      aria-label={`Decrease ${item.itemName}`}
                      className="w-12 h-12 rounded-lg bg-muted disabled:opacity-30 flex items-center justify-center text-xl font-bold hover:bg-muted/80 transition-colors"
                    >
                      −
                    </button>
                    <span className="w-8 text-center text-lg font-bold">{qty}</span>
                    <button
                      onClick={() => handleIncrement(item.id)}
                      disabled={qty >= onHand}
                      aria-label={`Increase ${item.itemName}`}
                      className="w-12 h-12 rounded-lg bg-blue-600 disabled:opacity-30 flex items-center justify-center text-xl font-bold hover:bg-blue-500 text-white transition-colors"
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
      <div className="shrink-0 px-4 py-4 border-t border-slate-200 dark:border-slate-800">
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
