import React, { useState, useMemo } from 'react';
import { ChevronLeft } from 'lucide-react';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { useInventoryV2 } from '../InventoryV2Context';
import { SUPPLY_CATEGORIES } from '../constants';
import type { Trip, TripLeg, TripLoadItem, SupplyCategory } from '../types';

interface TripRestoreStockProps {
  trip: Trip;
  leg: TripLeg;
  onBack: () => void;
}

export function TripRestoreStock({ trip, leg, onBack }: TripRestoreStockProps) {
  return <TripRestoreStockInner trip={trip} leg={leg} onBack={onBack} />;
}

function TripRestoreStockInner({ trip, leg, onBack }: TripRestoreStockProps) {
  const { state, dispatch } = useInventoryV2();
  const [selectedCategory, setSelectedCategory] = useState<SupplyCategory>('beverages');

  // Usage on this leg, keyed by itemId — used both to pre-fill and to label cards.
  const usedThisLeg = useMemo(() => {
    const m = new Map<string, number>();
    leg.usageLog.forEach(e => m.set(e.itemId, (m.get(e.itemId) ?? 0) + e.qtyUsed));
    return m;
  }, [leg.usageLog]);

  // Pre-fill quantities from this leg's usage — FA adjusts to what was actually loaded.
  const [quantities, setQuantities] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    usedThisLeg.forEach((qty, itemId) => {
      if (qty > 0) init[itemId] = qty;
    });
    return init;
  });

  const visibleItems = useMemo(() => {
    return state.items
      .filter(item => item.supplyCategory === selectedCategory)
      .sort((a, b) => {
        // Items used this leg float to the top.
        const aUsed = usedThisLeg.has(a.id) ? 1 : 0;
        const bUsed = usedThisLeg.has(b.id) ? 1 : 0;
        if (aUsed !== bUsed) return bUsed - aUsed;
        return a.itemName.localeCompare(b.itemName);
      });
  }, [state.items, selectedCategory, usedThisLeg]);

  const totalUnits = Object.values(quantities).reduce((sum, q) => sum + q, 0);
  const selectedItemCount = Object.values(quantities).filter(q => q > 0).length;

  function handleIncrement(itemId: string) {
    const current = quantities[itemId] ?? 0;
    setQuantities(prev => ({ ...prev, [itemId]: current + 1 }));
  }

  function handleDecrement(itemId: string) {
    const current = quantities[itemId] ?? 0;
    if (current <= 0) return;
    setQuantities(prev => ({ ...prev, [itemId]: current - 1 }));
  }

  function handleConfirm() {
    const loadEntries = Object.entries(quantities).filter(([, qty]) => qty > 0);
    if (loadEntries.length === 0) return;

    const items: TripLoadItem[] = loadEntries.map(([itemId, qty]) => ({
      id: `tl-${crypto.randomUUID()}`,
      itemId,
      qty,
      source: 'road',
      loadedBy: state.currentUser.name,
      loadedAt: new Date().toISOString(),
      legId: leg.id,
    }));

    dispatch({ type: 'ADD_TRIP_LOAD_ITEMS', payload: { tripId: trip.id, items } });
    onBack();
  }

  return (
    <div className="-m-6 -mb-20 flex flex-col h-[calc(100dvh-9.125rem)] md:h-[calc(100dvh-4.5625rem)] overflow-hidden">
      {/* Header */}
      <div className="shrink-0 bg-primary px-4 py-3 border-b border-border">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-sm text-primary-foreground/70 hover:text-primary-foreground mb-1"
        >
          <ChevronLeft size={16} />
          {trip.tailNumber} · On ground
        </button>
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-bold text-primary-foreground">Restore Stock</h1>
          <Badge className="bg-amber-500/20 text-amber-200 border border-amber-400/40 text-xs">
            Road sourced
          </Badge>
        </div>
        <p className="text-xs text-primary-foreground/70">Record what you loaded · No commissary impact</p>
      </div>

      {/* Category pills */}
      <div className="shrink-0 px-4 py-3 border-b border-border overflow-x-auto bg-muted/30">
        <div className="flex gap-2 min-w-max">
          {SUPPLY_CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Item grid */}
      <div className="flex-1 overflow-y-auto p-3 bg-muted/20">
        {visibleItems.length === 0 ? (
          <div className="text-center text-muted-foreground mt-16">No items in this category</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-w-2xl mx-auto">
            {visibleItems.map(item => {
              const qty = quantities[item.id] ?? 0;
              const used = usedThisLeg.get(item.id) ?? 0;
              return (
                <div
                  key={item.id}
                  className={`bg-card rounded-xl p-3 flex flex-col gap-2 border transition-all ${
                    qty > 0
                      ? 'ring-2 ring-primary border-primary/30'
                      : used > 0
                        ? 'border-destructive/40'
                        : 'border-border/50'
                  }`}
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-sm leading-tight">{item.itemName}</p>
                    <p className="text-xs mt-0.5">
                      {used > 0 ? (
                        <span className="text-destructive font-medium">−{used} used this leg</span>
                      ) : (
                        <span className="text-muted-foreground">Not used · add if loaded</span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => handleDecrement(item.id)}
                      disabled={qty === 0}
                      className="w-10 h-10 rounded-lg bg-muted border border-border disabled:opacity-30 flex items-center justify-center text-xl hover:bg-muted/80 transition-colors"
                    >
                      −
                    </button>
                    <span className={`text-lg font-bold min-w-[2rem] text-center ${qty > 0 ? 'text-primary' : 'text-muted-foreground'}`}>
                      {qty}
                    </span>
                    <button
                      onClick={() => handleIncrement(item.id)}
                      className="w-10 h-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center text-xl hover:bg-primary/90 transition-colors"
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

      {/* Footer */}
      <div className="shrink-0 bg-card border-t border-border px-4 py-3">
        <p className="text-xs text-amber-600 dark:text-amber-400 mb-2">
          Road sourced — no commissary deduction
        </p>
        {selectedItemCount > 0 && (
          <div className="flex gap-2 mb-3 flex-wrap">
            <span className="text-xs bg-muted border border-border rounded-lg px-2.5 py-1 font-medium text-primary">
              {selectedItemCount} {selectedItemCount === 1 ? 'item' : 'items'}
            </span>
            <span className="text-xs bg-muted border border-border rounded-lg px-2.5 py-1 font-medium text-primary">
              {totalUnits} units total
            </span>
          </div>
        )}
        <Button
          className="w-full"
          disabled={selectedItemCount === 0}
          onClick={handleConfirm}
        >
          {selectedItemCount === 0 ? 'Add items you loaded' : 'Confirm Restored Stock'}
        </Button>
      </div>
    </div>
  );
}
