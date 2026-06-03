import React, { useState, useMemo } from 'react';
import { ChevronLeft } from 'lucide-react';
import { Button } from '../../ui/button';
import { useInventoryV2 } from '../InventoryV2Context';
import { SUPPLY_CATEGORIES } from '../constants';
import type { Trip, TripLoadItem, SupplyCategory } from '../types';

interface TripLoadExtrasProps {
  trip: Trip;
  onBack: () => void;
}

export function TripLoadExtras({ trip, onBack }: TripLoadExtrasProps) {
  return <TripLoadExtrasInner trip={trip} onBack={onBack} />;
}

function TripLoadExtrasInner({ trip, onBack }: TripLoadExtrasProps) {
  const { state, dispatch } = useInventoryV2();
  const [selectedCategory, setSelectedCategory] = useState<SupplyCategory>('beverages');
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const stockroomMap = useMemo(
    () => new Map(state.stockroomItems.map(si => [si.itemId, si])),
    [state.stockroomItems]
  );

  const parMap = useMemo(
    () => new Map(state.items.map(item => [item.id, item.defaultQuantities[trip.aircraftType] ?? 0])),
    [state.items, trip.aircraftType]
  );

  const visibleItems = useMemo(() => {
    return state.items
      .filter(item => item.supplyCategory === selectedCategory)
      .filter(item => stockroomMap.has(item.id))
      .sort((a, b) => a.itemName.localeCompare(b.itemName));
  }, [state.items, stockroomMap, selectedCategory]);

  const totalUnits = Object.values(quantities).reduce((sum, q) => sum + q, 0);
  const selectedItemCount = Object.values(quantities).filter(q => q > 0).length;

  const lowStockWarnings = useMemo(() => {
    return Object.entries(quantities)
      .filter(([itemId, qty]) => {
        if (qty === 0) return false;
        const si = stockroomMap.get(itemId);
        const par = parMap.get(itemId) ?? 0;
        return si && si.qtyOnHand < par;
      })
      .map(([itemId]) => state.items.find(i => i.id === itemId)?.itemName)
      .filter(Boolean);
  }, [quantities, stockroomMap, parMap, state.items]);

  function handleIncrement(itemId: string) {
    const si = stockroomMap.get(itemId);
    const onHand = si?.qtyOnHand ?? 0;
    const current = quantities[itemId] ?? 0;
    if (current >= onHand) return;
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
      source: 'commissary',
      loadedBy: state.currentUser.name,
      loadedAt: new Date().toISOString(),
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
          {trip.tailNumber} · Pre-flight
        </button>
        <h1 className="text-lg font-bold text-primary-foreground">Load Extras</h1>
        <p className="text-xs text-primary-foreground/70">From commissary · Deducts stock on confirm</p>
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
              const si = stockroomMap.get(item.id);
              const onHand = si?.qtyOnHand ?? 0;
              const par = parMap.get(item.id) ?? 0;
              const isLow = onHand < par;
              return (
                <div
                  key={item.id}
                  className={`bg-card rounded-xl p-3 flex flex-col gap-2 border transition-all ${
                    qty > 0
                      ? 'ring-2 ring-primary border-primary/30'
                      : 'border-border/50'
                  }`}
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-sm leading-tight">{item.itemName}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Par {par} {item.uom} ·{' '}
                      <span className={isLow ? 'text-destructive font-medium' : 'text-emerald-600 font-medium'}>
                        {onHand} avail
                      </span>
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
                      disabled={qty >= onHand}
                      className="w-10 h-10 rounded-lg bg-primary text-primary-foreground disabled:opacity-30 flex items-center justify-center text-xl hover:bg-primary/90 transition-colors"
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
        {lowStockWarnings.length > 0 && (
          <p className="text-xs text-destructive mb-2">
            ⚠ Low commissary stock: {lowStockWarnings.join(', ')}
          </p>
        )}
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
          {selectedItemCount === 0 ? 'Select items to load' : 'Confirm Load from Commissary'}
        </Button>
      </div>
    </div>
  );
}
