import React, { useState, useMemo, useEffect } from 'react';
import { CheckCircle2, LogOut } from 'lucide-react';
import { useInventoryV2 } from '../InventoryV2Context';
import { SUPPLY_CATEGORIES } from '../constants';
import type { SupplyCategory } from '../types';

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

  // Items in selected category that exist in the stockroom
  const visibleItems = useMemo(() => {
    return state.items
      .filter(item => item.supplyCategory === selectedCategory)
      .filter(item => stockroomMap.has(item.id))
      .sort((a, b) => a.itemName.localeCompare(b.itemName));
  }, [state.items, stockroomMap, selectedCategory]);

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

  const handleConfirm = () => {
    if (confirmed) return; // guard against double-tap on slow devices
    const removals = Object.entries(quantities).filter(([, qty]) => qty > 0);
    if (removals.length === 0) return;

    const updatedStockroomItems = state.stockroomItems
      .filter(si => (quantities[si.itemId] ?? 0) > 0)
      .map(si => ({ ...si, qtyOnHand: Math.max(0, si.qtyOnHand - quantities[si.itemId]) }));

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
    <div className="h-screen flex flex-col bg-white dark:bg-slate-950 text-slate-900 dark:text-white overflow-hidden relative">
      {/* ── CONFIRMATION FLASH ── */}
      {confirmed && (
        <div className="absolute inset-0 z-50 bg-emerald-600 flex flex-col items-center justify-center">
          <CheckCircle2 className="w-24 h-24 text-white mb-4" />
          <div className="text-4xl font-bold text-white">Logged</div>
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
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">P&G Flight Ops</p>
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

      {/* ── CATEGORY PILLS ── */}
      <div className="shrink-0 px-4 py-3 border-b border-slate-200 dark:border-slate-800 overflow-x-auto">
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
            No items in this category
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 max-w-2xl mx-auto">
            {visibleItems.map(item => {
              const qty = quantities[item.id] ?? 0;
              const onHand = stockroomMap.get(item.id) ?? 0;
              return (
                <div
                  key={item.id}
                  className={`bg-slate-100 dark:bg-slate-800 rounded-xl p-4 flex items-center justify-between ${
                    qty > 0 ? 'ring-2 ring-blue-500' : ''
                  }`}
                >
                  <div className="min-w-0 mr-3">
                    <p className="font-semibold text-sm truncate">{item.itemName}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{onHand} in stock</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleDecrement(item.id)}
                      disabled={qty === 0}
                      aria-label={`Decrease ${item.itemName}`}
                      className="w-12 h-12 rounded-lg bg-slate-200 dark:bg-slate-700 disabled:opacity-30 flex items-center justify-center text-xl font-bold hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
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
