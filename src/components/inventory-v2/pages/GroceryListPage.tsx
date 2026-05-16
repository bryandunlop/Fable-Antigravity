import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Search, X } from 'lucide-react';
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
    `🛒 Grocery List — ${trip.tailNumber}`,
    `Trip: ${trip.tripName} (${trip.tripNumber})`,
    `Leg ${activeLeg.legNumber}: ${activeLeg.origin} → ${activeLeg.destination}`,
    '',
    'RESTOCK NEEDED:',
    ...autoItems.map(gi => {
      const itemDef = allItems.find(i => i.id === gi.itemId);
      return `• ${itemDef?.itemName ?? gi.itemId} — Need ${gi.qtyNeeded}`;
    }),
    '',
    'MANUALLY ADDED:',
    ...manualItems.map(gi => {
      const itemDef = allItems.find(i => i.id === gi.itemId);
      return `• ${itemDef?.itemName ?? gi.itemId} — ${gi.qtyNeeded}`;
    }),
    '',
    notes ? `Notes: ${notes}` : '',
  ];
  return lines.filter(l => l !== undefined).join('\n');
}

// ─── Auto Item Row ─────────────────────────────────────────────────────────────

interface AutoItemRowProps {
  groceryItem: GroceryListItem;
  itemDef: InventoryItemV2 | undefined;
  aircraftType: 'G650' | 'G500';
  totalUsed: number;
  onChangeQty: (delta: number) => void;
}

function AutoItemRow({ groceryItem, itemDef, aircraftType, totalUsed, onChangeQty }: AutoItemRowProps) {
  const par = itemDef?.defaultQuantities[aircraftType] ?? 0;
  const remaining = par - totalUsed;

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-blue-500/10 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate">{itemDef?.itemName ?? groceryItem.itemId}</p>
        <p className="text-xs text-muted-foreground">
          Used {totalUsed} this trip · {remaining} remaining · Par: {par}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => onChangeQty(-1)}
          disabled={groceryItem.qtyNeeded <= 0}
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
      </div>
    </div>
  );
}

// ─── Manual Item Row ───────────────────────────────────────────────────────────

interface ManualItemRowProps {
  groceryItem: GroceryListItem;
  itemDef: InventoryItemV2 | undefined;
  onChangeQty: (delta: number) => void;
  onRemove: () => void;
}

function ManualItemRow({ groceryItem, itemDef, onChangeQty, onRemove }: ManualItemRowProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-emerald-500/10 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate">{itemDef?.itemName ?? groceryItem.itemId}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => onChangeQty(-1)}
          disabled={groceryItem.qtyNeeded <= 1}
          className="w-8 h-8 rounded-md bg-slate-800 border border-slate-700 flex items-center justify-center text-lg hover:bg-slate-700 transition-colors disabled:opacity-40"
        >
          −
        </button>
        <span className="w-8 text-center text-base font-bold text-emerald-400">
          {groceryItem.qtyNeeded}
        </span>
        <button
          onClick={() => onChangeQty(1)}
          className="w-8 h-8 rounded-md bg-slate-800 border border-slate-700 flex items-center justify-center text-lg hover:bg-slate-700 transition-colors"
        >
          +
        </button>
        <button
          onClick={onRemove}
          className="w-8 h-8 rounded-md bg-red-500/10 border border-red-500/30 flex items-center justify-center hover:bg-red-500/20 transition-colors text-red-400"
        >
          <X size={14} />
        </button>
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
      // All items that existed at load time are treated as auto (manual set stays empty)
      // unless we stored that separately — on reload, we can't distinguish, so treat all as auto
      return;
    }

    // Generate grocery list inline
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
    // Don't add duplicates
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
      await navigator.share({ title: `Grocery List — ${trip.tailNumber}`, text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text).catch(() => {});
    }
  }

  function handleSendToCommissary() {
    if (!groceryList) return;
    dispatch({ type: 'SEND_GROCERY_LIST', payload: groceryList.id });
    setGroceryList({ ...groceryList, status: 'sent' });
  }

  // ─── Filtered items for add dialog ────────────────────────────────────────

  const filteredAddItems = useMemo(() => {
    const lower = addSearch.toLowerCase();
    return state.items.filter(i => !lower || i.itemName.toLowerCase().includes(lower));
  }, [state.items, addSearch]);

  // ─── Render ────────────────────────────────────────────────────────────────

  if (!groceryList) return null;

  const statusColors = GROCERY_STATUS_COLORS[groceryList.status];

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
          <h1 className="text-2xl font-bold">Grocery List</h1>
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

      <p className="text-xs text-muted-foreground mb-6">
        Auto-generated {new Date(groceryList.generatedAt).toLocaleString()} by {groceryList.generatedBy}
      </p>

      <div className="space-y-4">
        {/* ── Auto-generated section ── */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg overflow-hidden">
          <div className="px-4 py-2 border-b border-blue-500/20">
            <span className="text-xs font-semibold uppercase tracking-wide text-blue-400">
              Auto-Added — Based on Usage This Trip
            </span>
          </div>
          {autoItems.length > 0 ? (
            autoItems.map(gi => (
              <AutoItemRow
                key={gi.id}
                groceryItem={gi}
                itemDef={state.items.find(i => i.id === gi.itemId)}
                aircraftType={aircraftType}
                totalUsed={usageByItem.get(gi.itemId) ?? 0}
                onChangeQty={delta => handleChangeQty(gi.id, delta)}
              />
            ))
          ) : (
            <p className="px-4 py-3 text-sm text-muted-foreground">No items below par yet.</p>
          )}
        </div>

        {/* ── Manually added section ── */}
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg overflow-hidden">
          <div className="px-4 py-2 border-b border-emerald-500/20 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-emerald-400">
              Manually Added
            </span>
            <Button size="sm" variant="outline" onClick={() => setShowAddDialog(true)}>
              + Add Item
            </Button>
          </div>
          {manualItemsList.length > 0 ? (
            manualItemsList.map(gi => (
              <ManualItemRow
                key={gi.id}
                groceryItem={gi}
                itemDef={state.items.find(i => i.id === gi.itemId)}
                onChangeQty={delta => handleChangeQty(gi.id, delta)}
                onRemove={() => handleRemoveManual(gi.id)}
              />
            ))
          ) : (
            <p className="px-4 py-3 text-sm text-muted-foreground italic">
              No items manually added.
            </p>
          )}
        </div>

        {/* ── Notes ── */}
        <div className="space-y-1">
          <label className="text-sm text-muted-foreground">
            Notes for whoever is restocking:
          </label>
          <Textarea
            className="min-h-[80px] bg-slate-900 border-slate-700"
            placeholder="e.g. Client requested extra sparkling water and lemons..."
            value={groceryList.notes ?? ''}
            onChange={e => updateGroceryList({ ...groceryList, notes: e.target.value })}
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
          className="flex-[1.5] bg-blue-600 hover:bg-blue-500"
          onClick={handleSendToCommissary}
          disabled={groceryList.status !== 'draft'}
        >
          {groceryList.status === 'sent' ? 'Sent ✓' : 'Send to Commissary'}
        </Button>
      </div>

      {/* ── Add Item dialog ── */}
      <Dialog open={showAddDialog} onOpenChange={open => { setShowAddDialog(open); if (!open) setAddSearch(''); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Item</DialogTitle>
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
