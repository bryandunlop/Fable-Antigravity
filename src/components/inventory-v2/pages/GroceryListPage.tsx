import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Search, X, CheckCircle2, Circle } from 'lucide-react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Textarea } from '../../ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../ui/dialog';
import { useInventoryV2 } from '../InventoryV2Context';
import { OfflineBanner } from '../shared/OfflineBanner';
import { GROCERY_STATUS_COLORS } from '../constants';
import { cn } from '../../ui/utils';
import type {
  GroceryList,
  GroceryListItem,
  InventoryItemV2,
  Trip,
  TripLeg,
  InventoryV2State,
  InventoryV2Action,
} from '../types';

// ─── Main Component ────────────────────────────────────────────────────────────

export default function GroceryListPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();
  const { state, dispatch } = useInventoryV2();

  const trip = state.trips.find(t => t.id === tripId);
  const activeLeg = trip ? (trip.legs.find(l => l.status === 'active') ?? null) : null;

  if (!trip) {
    return (
      <div className="max-w-5xl mx-auto p-6 space-y-4">
        <p className="text-muted-foreground">Trip not found.</p>
        <Button onClick={() => navigate('/inventory-v2/trips')}>Back to Trips</Button>
      </div>
    );
  }

  if (!activeLeg) {
    return (
      <div className="max-w-5xl mx-auto p-6 space-y-4">
        <button
          onClick={() => navigate(`/inventory-v2/trips/${tripId}`)}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2"
        >
          <ChevronLeft size={16} /> Back to Trip
        </button>
        <p className="text-muted-foreground">No active leg for this trip.</p>
        <Button onClick={() => navigate(`/inventory-v2/trips/${tripId}`)}>Back to Trip</Button>
      </div>
    );
  }

  return (
    <GroceryListInner
      tripId={tripId!}
      trip={trip}
      activeLeg={activeLeg}
      state={state}
      dispatch={dispatch}
      navigate={navigate}
    />
  );
}

// ─── Helper: generate copy text ────────────────────────────────────────────────

function buildCopyText(
  trip: Trip,
  activeLeg: TripLeg,
  autoItems: GroceryListItem[],
  manualItems: GroceryListItem[],
  allItems: InventoryItemV2[],
  notes: string | undefined
): string {
  const lines: string[] = [
    `🛒 Shopping List — ${trip.tailNumber}`,
    `Trip: ${trip.tripName} (${trip.tripNumber})`,
    `Leg ${activeLeg.legNumber}: ${activeLeg.origin} → ${activeLeg.destination}`,
    '',
    'RESTOCK NEEDED:',
    ...autoItems.map(gi => {
      const itemDef = allItems.find(i => i.id === gi.itemId);
      const picked = gi.qtyFulfilled >= gi.qtyNeeded;
      return `${picked ? '✓' : '○'} ${itemDef?.itemName ?? gi.itemId} — ${gi.qtyNeeded}`;
    }),
    '',
    'ADDITIONAL ITEMS:',
    ...manualItems.map(gi => {
      const itemDef = allItems.find(i => i.id === gi.itemId);
      const picked = gi.qtyFulfilled >= gi.qtyNeeded;
      return `${picked ? '✓' : '○'} ${itemDef?.itemName ?? gi.itemId} — ${gi.qtyNeeded}`;
    }),
    '',
    notes ? `Notes: ${notes}` : '',
  ];
  return lines.filter(l => l !== undefined).join('\n');
}

// ─── Item Row ──────────────────────────────────────────────────────────────────

interface ItemRowProps {
  groceryItem: GroceryListItem;
  itemDef: InventoryItemV2 | undefined;
  picked: boolean;
  onTogglePicked: () => void;
  onChangeQty: (delta: number) => void;
  onRemove?: () => void;
  sublabel?: string;
}

function ItemRow({ groceryItem, itemDef, picked, onTogglePicked, onChangeQty, onRemove, sublabel }: ItemRowProps) {
  return (
    <div className={cn(
      'flex items-center gap-3 px-4 py-3 border-b border-white/5 last:border-0 transition-opacity',
      picked && 'opacity-50'
    )}>
      {/* Check toggle */}
      <button
        onClick={onTogglePicked}
        className="shrink-0 text-muted-foreground hover:text-emerald-400 transition-colors"
        title={picked ? 'Mark as not picked up' : 'Mark as picked up'}
      >
        {picked
          ? <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          : <Circle className="w-5 h-5" />
        }
      </button>

      {/* Item name */}
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-semibold truncate', picked && 'line-through text-muted-foreground')}>
          {itemDef?.itemName ?? groceryItem.itemId}
        </p>
        {sublabel && (
          <p className="text-xs text-muted-foreground mt-0.5">{sublabel}</p>
        )}
      </div>

      {/* Qty controls */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => onChangeQty(-1)}
          disabled={groceryItem.qtyNeeded <= (onRemove ? 1 : 0)}
          className="w-8 h-8 rounded-md bg-slate-800 border border-slate-700 flex items-center justify-center text-lg hover:bg-slate-700 transition-colors disabled:opacity-40"
        >
          −
        </button>
        <span className="w-8 text-center text-base font-bold text-blue-400">
          {groceryItem.qtyNeeded}
        </span>
        <button
          onClick={() => onChangeQty(1)}
          className="w-8 h-8 rounded-md bg-slate-800 border border-slate-700 flex items-center justify-center text-lg hover:bg-slate-700 transition-colors"
        >
          +
        </button>
        {onRemove && (
          <button
            onClick={onRemove}
            className="w-8 h-8 rounded-md bg-red-500/10 border border-red-500/30 flex items-center justify-center hover:bg-red-500/20 transition-colors text-red-400"
          >
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Inner Component ───────────────────────────────────────────────────────────

function GroceryListInner({
  tripId,
  trip,
  activeLeg,
  state,
  dispatch,
  navigate,
}: {
  tripId: string;
  trip: Trip;
  activeLeg: TripLeg;
  state: InventoryV2State;
  dispatch: (action: InventoryV2Action) => void;
  navigate: ReturnType<typeof useNavigate>;
}) {
  const aircraftType = trip.aircraftType;

  const [groceryList, setGroceryList] = useState<GroceryList | null>(null);
  const [manualItemIds, setManualItemIds] = useState<Set<string>>(new Set());
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addSearch, setAddSearch] = useState('');

  // ─── On mount: find or create ──────────────────────────────────────────────

  useEffect(() => {
    const existing = state.groceryLists.find(
      gl => gl.tripId === tripId && gl.legId === activeLeg.id
    );
    if (existing) {
      setGroceryList(existing);
      return;
    }

    // Generate shopping list based on trip usage
    const usageByItem = new Map<string, number>();
    trip.legs.forEach(leg => {
      leg.usageLog.forEach(entry => {
        usageByItem.set(entry.itemId, (usageByItem.get(entry.itemId) ?? 0) + entry.qtyUsed);
      });
    });

    const autoItems: GroceryListItem[] = [];
    state.items.forEach(item => {
      const par = item.defaultQuantities[aircraftType] ?? 0;
      if (par === 0) return;
      const totalUsed = usageByItem.get(item.id) ?? 0;
      const remaining = par - totalUsed;
      if (remaining < par) {
        autoItems.push({
          id: crypto.randomUUID(),
          itemId: item.id,
          qtyNeeded: Math.max(0, par - remaining),
          qtyFulfilled: 0,
        });
      }
    });

    const generated: GroceryList = {
      id: `gl-${crypto.randomUUID()}`,
      tripId: trip.id,
      legId: activeLeg.id,
      tailNumber: trip.tailNumber,
      status: 'draft',
      items: autoItems,
      generatedAt: new Date().toISOString(),
      generatedBy: state.currentUser.name,
    };

    dispatch({ type: 'ADD_GROCERY_LIST', payload: generated });
    setGroceryList(generated);
  }, [tripId, activeLeg?.id, trip, state.items, state.currentUser, aircraftType, dispatch]);

  // ─── Helper: update grocery list ──────────────────────────────────────────

  function updateGroceryList(updated: GroceryList) {
    setGroceryList(updated);
    dispatch({ type: 'UPDATE_GROCERY_LIST', payload: updated });
  }

  // ─── Derived lists ─────────────────────────────────────────────────────────

  const autoItems = groceryList?.items.filter(i => !manualItemIds.has(i.id)) ?? [];
  const manualItemsList = groceryList?.items.filter(i => manualItemIds.has(i.id)) ?? [];

  // ─── Usage map (trip-wide) ─────────────────────────────────────────────────

  const usageByItem = useMemo(() => {
    const map = new Map<string, number>();
    trip.legs.forEach(leg => {
      leg.usageLog.forEach(entry => {
        map.set(entry.itemId, (map.get(entry.itemId) ?? 0) + entry.qtyUsed);
      });
    });
    return map;
  }, [trip.legs]);

  // ─── Toggle item picked ────────────────────────────────────────────────────

  function handleTogglePicked(groceryItemId: string) {
    if (!groceryList) return;
    const updated: GroceryList = {
      ...groceryList,
      items: groceryList.items.map(i => {
        if (i.id !== groceryItemId) return i;
        const nowPicked = i.qtyFulfilled < i.qtyNeeded;
        return { ...i, qtyFulfilled: nowPicked ? i.qtyNeeded : 0 };
      }),
    };
    updateGroceryList(updated);
  }

  // ─── Qty change ───────────────────────────────────────────────────────────

  function handleChangeQty(itemId: string, delta: number) {
    if (!groceryList) return;
    const updated: GroceryList = {
      ...groceryList,
      items: groceryList.items.map(i =>
        i.id === itemId
          ? { ...i, qtyNeeded: Math.max(0, i.qtyNeeded + delta) }
          : i
      ),
    };
    updateGroceryList(updated);
  }

  // ─── Remove manual item ────────────────────────────────────────────────────

  function handleRemoveManual(itemId: string) {
    if (!groceryList) return;
    const updated: GroceryList = {
      ...groceryList,
      items: groceryList.items.filter(i => i.id !== itemId),
    };
    setManualItemIds(prev => {
      const next = new Set(prev);
      next.delete(itemId);
      return next;
    });
    updateGroceryList(updated);
  }

  // ─── Add manual item ───────────────────────────────────────────────────────

  function handleAddItem(inventoryItem: InventoryItemV2) {
    if (!groceryList) return;
    const already = groceryList.items.some(gi => gi.itemId === inventoryItem.id);
    if (already) {
      setShowAddDialog(false);
      return;
    }
    const newGi: GroceryListItem = {
      id: crypto.randomUUID(),
      itemId: inventoryItem.id,
      qtyNeeded: 1,
      qtyFulfilled: 0,
    };
    const updated: GroceryList = {
      ...groceryList,
      items: [...groceryList.items, newGi],
    };
    setManualItemIds(prev => new Set([...prev, newGi.id]));
    updateGroceryList(updated);
    setShowAddDialog(false);
    setAddSearch('');
  }

  // ─── Done Shopping ────────────────────────────────────────────────────────

  function handleDoneShopping() {
    if (!groceryList) return;
    dispatch({ type: 'FULFILL_GROCERY_LIST', payload: groceryList.id });
    setGroceryList({ ...groceryList, status: 'fulfilled' });
  }

  // ─── Copy / Share ──────────────────────────────────────────────────────────

  function getCopyText() {
    if (!groceryList) return '';
    return buildCopyText(trip, activeLeg, autoItems, manualItemsList, state.items, groceryList.notes);
  }

  function handleCopy() {
    navigator.clipboard.writeText(getCopyText()).catch(() => {});
  }

  async function handleShare() {
    const text = getCopyText();
    if (navigator.share) {
      await navigator.share({ title: `Shopping List — ${trip.tailNumber}`, text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text).catch(() => {});
    }
  }

  // ─── Filtered items for add dialog ────────────────────────────────────────

  const filteredAddItems = useMemo(() => {
    const lower = addSearch.toLowerCase();
    return state.items.filter(i => !lower || i.itemName.toLowerCase().includes(lower));
  }, [state.items, addSearch]);

  // ─── Progress ─────────────────────────────────────────────────────────────

  const totalItems = groceryList?.items.length ?? 0;
  const pickedItems = groceryList?.items.filter(i => i.qtyFulfilled >= i.qtyNeeded).length ?? 0;

  // ─── Render ────────────────────────────────────────────────────────────────

  if (!groceryList) return null;

  const statusColors = GROCERY_STATUS_COLORS[groceryList.status];
  const isComplete = groceryList.status === 'fulfilled';

  return (
    <div className="max-w-5xl mx-auto p-6 pb-24">
      <OfflineBanner />

      {/* Back button */}
      <button
        onClick={() => navigate(`/inventory-v2/trips/${tripId}`)}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ChevronLeft size={16} /> Back to Trip
      </button>

      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div>
          <h1 className="text-2xl font-bold">Shopping List</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {trip.tailNumber} · Leg {activeLeg.legNumber}: {activeLeg.origin} → {activeLeg.destination}
          </p>
        </div>
        <span
          className={cn(
            'px-2.5 py-1 rounded-full text-xs font-semibold border',
            statusColors.bg,
            statusColors.text,
            statusColors.border
          )}
        >
          {statusColors.label}
        </span>
      </div>

      {/* Progress */}
      {totalItems > 0 && (
        <div className="flex items-center gap-2 mb-6">
          <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all"
              style={{ width: `${Math.round((pickedItems / totalItems) * 100)}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground shrink-0">
            {pickedItems} / {totalItems} picked up
          </span>
        </div>
      )}

      <div className="space-y-4">
        {/* ── Restock Needed section ── */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg overflow-hidden">
          <div className="px-4 py-2 border-b border-blue-500/20">
            <span className="text-xs font-semibold uppercase tracking-wide text-blue-400">
              Restock Needed — Based on Trip Usage
            </span>
          </div>
          {autoItems.length > 0 ? (
            autoItems.map(gi => {
              const itemDef = state.items.find(i => i.id === gi.itemId);
              const par = itemDef?.defaultQuantities[aircraftType] ?? 0;
              const totalUsed = usageByItem.get(gi.itemId) ?? 0;
              return (
                <ItemRow
                  key={gi.id}
                  groceryItem={gi}
                  itemDef={itemDef}
                  picked={gi.qtyFulfilled >= gi.qtyNeeded}
                  onTogglePicked={() => handleTogglePicked(gi.id)}
                  onChangeQty={delta => handleChangeQty(gi.id, delta)}
                  sublabel={`Used ${totalUsed} this trip · Par: ${par}`}
                />
              );
            })
          ) : (
            <p className="px-4 py-3 text-sm text-muted-foreground">No items below par yet.</p>
          )}
        </div>

        {/* ── Additional Items section ── */}
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg overflow-hidden">
          <div className="px-4 py-2 border-b border-emerald-500/20 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-emerald-400">
              Additional Items
            </span>
            <Button size="sm" variant="outline" onClick={() => setShowAddDialog(true)}>
              + Add Item
            </Button>
          </div>
          {manualItemsList.length > 0 ? (
            manualItemsList.map(gi => (
              <ItemRow
                key={gi.id}
                groceryItem={gi}
                itemDef={state.items.find(i => i.id === gi.itemId)}
                picked={gi.qtyFulfilled >= gi.qtyNeeded}
                onTogglePicked={() => handleTogglePicked(gi.id)}
                onChangeQty={delta => handleChangeQty(gi.id, delta)}
                onRemove={() => handleRemoveManual(gi.id)}
              />
            ))
          ) : (
            <p className="px-4 py-3 text-sm text-muted-foreground italic">
              No additional items. Tap "+ Add Item" to add something to pick up.
            </p>
          )}
        </div>

        {/* ── Shopping Notes ── */}
        <div className="space-y-1">
          <label className="text-sm text-muted-foreground">Shopping Notes</label>
          <Textarea
            className="min-h-[80px] bg-slate-900 border-slate-700"
            placeholder="e.g. Get the organic honey, check if they have Perrier at Costco first..."
            value={groceryList.notes ?? ''}
            onChange={e => updateGroceryList({ ...groceryList, notes: e.target.value })}
            disabled={isComplete}
          />
        </div>
      </div>

      {/* ── Action bar ── */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-950 border-t border-slate-800 px-6 py-3 flex gap-3 z-10">
        <Button variant="outline" className="flex-1" onClick={handleCopy}>
          📋 Copy List
        </Button>
        <Button variant="outline" className="flex-1" onClick={handleShare}>
          📤 Share
        </Button>
        <Button
          className={cn(
            'flex-[1.5]',
            isComplete
              ? 'bg-emerald-700 hover:bg-emerald-700 cursor-default'
              : 'bg-emerald-600 hover:bg-emerald-500'
          )}
          onClick={handleDoneShopping}
          disabled={isComplete}
        >
          {isComplete ? 'Shopping Complete ✓' : 'Done Shopping'}
        </Button>
      </div>

      {/* ── Add Item dialog ── */}
      <Dialog open={showAddDialog} onOpenChange={open => { setShowAddDialog(open); if (!open) setAddSearch(''); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Item to Shopping List</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search items..."
                value={addSearch}
                onChange={e => setAddSearch(e.target.value)}
                autoFocus
              />
            </div>
            <div className="max-h-72 overflow-y-auto space-y-1">
              {filteredAddItems.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No items found.</p>
              ) : (
                filteredAddItems.map(item => {
                  const alreadyAdded = groceryList.items.some(gi => gi.itemId === item.id);
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleAddItem(item)}
                      disabled={alreadyAdded}
                      className={cn(
                        'w-full text-left px-3 py-2 rounded text-sm transition-colors',
                        alreadyAdded
                          ? 'opacity-40 cursor-not-allowed'
                          : 'hover:bg-slate-800'
                      )}
                    >
                      <span className="font-medium">{item.itemName}</span>
                      {alreadyAdded && (
                        <span className="ml-2 text-xs text-muted-foreground">(already added)</span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
