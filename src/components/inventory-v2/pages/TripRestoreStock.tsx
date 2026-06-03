import React, { useState, useMemo } from 'react';
import { ChevronLeft } from 'lucide-react';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { useInventoryV2 } from '../InventoryV2Context';
import { SUPPLY_CATEGORIES } from '../constants';
import type { Trip, TripLeg, TripLoadItem, SupplyCategory } from '../types';

interface TripRestoreStockProps {
  trip: Trip;
  activeLeg: TripLeg;
  onBack: () => void;
}

export function TripRestoreStock({ trip, activeLeg, onBack }: TripRestoreStockProps) {
  return <TripRestoreStockInner trip={trip} activeLeg={activeLeg} onBack={onBack} />;
}

function TripRestoreStockInner({ trip, activeLeg, onBack }: TripRestoreStockProps) {
  const { state, dispatch } = useInventoryV2();
  const [selectedCategory, setSelectedCategory] = useState<SupplyCategory>('beverages');

  // Pre-fill from active leg's usage log
  const usageByItem = useMemo(() => {
    const map = new Map<string, number>();
    activeLeg.usageLog.forEach(e => {
      map.set(e.itemId, (map.get(e.itemId) ?? 0) + e.qtyUsed);
    });
    return map;
  }, [activeLeg.usageLog]);

  const [quantities, setQuantities] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    usageByItem.forEach((qty, itemId) => {
      init[itemId] = qty;
    });
    return init;
  });

  const visibleItems = useMemo(() => {
    return state.items
      .filter(item => item.supplyCategory === selectedCategory)
      .filter(item => {
        const si = state.stockroomItems.find(s => s.itemId === item.id);
        return !!si;
      })
      .sort((a, b) => {
        // Consumed items first
        const aUsed = usageByItem.get(a.id) ?? 0;
        const bUsed = usageByItem.get(b.id) ?? 0;
        if (bUsed !== aUsed) return bUsed - aUsed;
        return a.itemName.localeCompare(b.itemName);
      });
  }, [state.items, state.stockroomItems, selectedCategory, usageByItem]);

  const totalUnits = Object.values(quantities).reduce((sum, q) => sum + q, 0);
  const selectedItemCount = Object.values(quantities).filter(q => q > 0).length;

  function handleIncrement(itemId: string) {
    setQuantities(prev => ({ ...prev, [itemId]: (prev[itemId] ?? 0) + 1 }));
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
      legId: activeLeg.id,
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
          {trip.tailNumber} · On Ground · {activeLeg.destination}
        </button>
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-bold text-primary-foreground">Restore Stock</h1>
          <Badge variant="outline" className="text-xs border-amber-400/50 text-amber-300 bg-amber-900/20">
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
              const usedThisLeg = usageByItem.get(item.id) ?? 0;
              const wasConsumed = usedThisLeg > 0;
              return (
                <div
                  key={item.id}
                  className={`bg-card rounded-xl p-3 flex flex-col gap-2 border transition-all ${
                    qty > 0
                      ? 'ring-2 ring-primary border-primary/30'
                      : wasConsumed
                      ? 'border-destructive/30 bg-destructive/5'
                      : 'border-border/50 opacity-60'
                  }`}
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-sm leading-tight">{item.itemName}</p>
                    <p className={`text-xs mt-0.5 ${wasConsumed ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                      {wasConsumed ? `−${usedThisLeg} used this leg` : 'Not used · add if loaded'}
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
              {totalUnits} units loaded
            </span>
          </div>
        )}
        <Button
          className="w-full"
          disabled={selectedItemCount === 0}
          onClick={handleConfirm}
        >
          {selectedItemCount === 0 ? 'Adjust quantities to confirm' : 'Confirm Restore'}
        </Button>
      </div>
    </div>
  );
}
