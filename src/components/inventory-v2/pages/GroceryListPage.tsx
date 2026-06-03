import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Search, X, CheckCircle2, Circle, Plus, Share2, Camera, Users, Package } from 'lucide-react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Textarea } from '../../ui/textarea';
import { Badge } from '../../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../ui/dialog';
import { useInventoryV2 } from '../InventoryV2Context';
import { OfflineBanner } from '../shared/OfflineBanner';
import { LEG_PHASE_COLORS, GROCERY_STATUS_COLORS } from '../constants';
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
    `Shopping List — ${trip.tailNumber}`,
    `Leg ${activeLeg.legNumber}: ${activeLeg.origin} → ${activeLeg.destination}`,
    '',
    'RESTOCK NEEDED:',
    ...autoItems.map(gi => {
      const name = gi.isManual
        ? (gi.manualItemName ?? 'Unknown')
        : (allItems.find(i => i.id === gi.itemId)?.itemName ?? gi.itemId);
      const picked = gi.qtyFulfilled >= gi.qtyNeeded;
      return `${picked ? '✓' : '○'} ${name} — ${gi.qtyNeeded}`;
    }),
    '',
    'ADDITIONAL ITEMS:',
    ...manualItems.map(gi => {
      const name = gi.isManual
        ? (gi.manualItemName ?? 'Unknown')
        : (allItems.find(i => i.id === gi.itemId)?.itemName ?? gi.itemId);
      const picked = gi.qtyFulfilled >= gi.qtyNeeded;
      return `${picked ? '✓' : '○'} ${name} — ${gi.qtyNeeded}`;
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
  const displayName = groceryItem.isManual
    ? (groceryItem.manualItemName ?? 'Unknown Item')
    : (itemDef?.itemName ?? groceryItem.itemId);

  return (
    <div className={cn(
      'flex items-center gap-3 px-4 py-3 border-b border-white/5 last:border-0 transition-opacity',
      picked && 'opacity-50'
    )}>
      <button
        onClick={onTogglePicked}
        className="shrink-0 text-muted-foreground hover:text-emerald-400 transition-colors"
      >
        {picked
          ? <CheckCircle2 className="w-6 h-6 text-emerald-400" />
          : <Circle className="w-6 h-6" />
        }
      </button>

      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-semibold truncate', picked && 'line-through text-muted-foreground')}>
          {displayName}
        </p>
        {sublabel && (
          <p className="text-xs text-muted-foreground mt-0.5">{sublabel}</p>
        )}
        {groceryItem.isManual && (
          <p className="text-xs text-amber-400/70 mt-0.5">Custom item</p>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => onChangeQty(-1)}
          disabled={groceryItem.qtyNeeded <= 1}
          className="w-10 h-10 rounded-md bg-muted border border-border flex items-center justify-center text-lg hover:bg-muted/80 transition-colors disabled:opacity-40"
        >
          −
        </button>
        <span className="w-8 text-center text-base font-bold text-blue-400">
          {groceryItem.qtyNeeded}
        </span>
        <button
          onClick={() => onChangeQty(1)}
          className="w-10 h-10 rounded-md bg-muted border border-border flex items-center justify-center text-lg hover:bg-muted/80 transition-colors"
        >
          +
        </button>
        {onRemove && (
          <button
            onClick={onRemove}
            className="w-10 h-10 rounded-md bg-red-500/10 border border-red-500/30 flex items-center justify-center hover:bg-red-500/20 transition-colors text-red-400"
          >
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

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
        <Button onClick={() => navigate('/inventory-v2/trips')}>Back to Fleet</Button>
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
  const listRef = useRef<HTMLDivElement>(null);

  const [groceryList, setGroceryList] = useState<GroceryList | null>(null);
  const [manualItemIds, setManualItemIds] = useState<Set<string>>(new Set());
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addSearch, setAddSearch] = useState('');
  const [freeFormText, setFreeFormText] = useState('');

  const phase = activeLeg.phase;
  const phaseColors = LEG_PHASE_COLORS[phase];

  // ─── On mount: find or create ──────────────────────────────────────────────

  useEffect(() => {
    const existing = state.groceryLists.find(
      gl => gl.tripId === tripId && gl.legId === activeLeg.id
    );
    if (existing) {
      setGroceryList(existing);
      const manuals = new Set<string>();
      existing.items.forEach(i => { if (i.isManual) manuals.add(i.id); });
      setManualItemIds(manuals);
      return;
    }

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
  }, [tripId, activeLeg?.id]);

  // ─── Helper: update grocery list ──────────────────────────────────────────

  function updateGroceryList(updated: GroceryList) {
    setGroceryList(updated);
    dispatch({ type: 'UPDATE_GROCERY_LIST', payload: updated });
  }

  // ─── Derived lists ─────────────────────────────────────────────────────────

  const autoItems = groceryList?.items.filter(i => !i.isManual) ?? [];
  const manualItemsList = groceryList?.items.filter(i => i.isManual || manualItemIds.has(i.id)) ?? [];

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
          ? { ...i, qtyNeeded: Math.max(1, i.qtyNeeded + delta) }
          : i
      ),
    };
    updateGroceryList(updated);
  }

  // ─── Remove item ──────────────────────────────────────────────────────────

  function handleRemoveItem(itemId: string) {
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

  // ─── Add inventory item ───────────────────────────────────────────────────

  function handleAddItem(inventoryItem: InventoryItemV2) {
    if (!groceryList) return;
    const already = groceryList.items.some(gi => gi.itemId === inventoryItem.id && !gi.isManual);
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

  // ─── Add free-form item ───────────────────────────────────────────────────

  function handleAddFreeForm() {
    if (!groceryList || !freeFormText.trim()) return;
    const newGi: GroceryListItem = {
      id: crypto.randomUUID(),
      itemId: `manual-${crypto.randomUUID()}`,
      qtyNeeded: 1,
      qtyFulfilled: 0,
      isManual: true,
      manualItemName: freeFormText.trim(),
    };
    const updated: GroceryList = {
      ...groceryList,
      items: [...groceryList.items, newGi],
    };
    setManualItemIds(prev => new Set([...prev, newGi.id]));
    updateGroceryList(updated);
    setFreeFormText('');
  }

  // ─── Done Shopping ────────────────────────────────────────────────────────

  function handleDoneShopping() {
    if (!groceryList) return;
    dispatch({ type: 'FULFILL_GROCERY_LIST', payload: groceryList.id });
    setGroceryList({ ...groceryList, status: 'fulfilled' });
  }

  // ─── Share ────────────────────────────────────────────────────────────────

  async function handleShare() {
    if (!groceryList) return;
    const text = buildCopyText(trip, activeLeg, autoItems, manualItemsList, state.items, groceryList.notes);
    if (navigator.share) {
      await navigator.share({ title: `Shopping List — ${trip.tailNumber}`, text }).catch(() => {});
    } else {
      await navigator.clipboard.writeText(text).catch(() => {});
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
    <div className="-m-6 -mb-20 flex flex-col h-[calc(100dvh-9.125rem)] md:h-[calc(100dvh-4.5625rem)] overflow-hidden">
      <OfflineBanner />

      {/* ── HEADER ── */}
      <div className="bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3 space-y-1.5 shrink-0">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(`/inventory-v2/trips/${tripId}`)}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft size={16} /> Trip
          </button>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold font-mono">{trip.tailNumber}</span>
            <Badge className={cn('text-xs status-badge', statusColors.className)}>
              {statusColors.label}
            </Badge>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-mono">
            Leg {activeLeg.legNumber}: {activeLeg.origin} → {activeLeg.destination}
          </span>
          {totalItems > 0 && (
            <span className="text-xs text-muted-foreground">
              {pickedItems}/{totalItems} picked
            </span>
          )}
        </div>
        {/* Progress bar */}
        {totalItems > 0 && (
          <div className="h-1 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all"
              style={{ width: `${Math.round((pickedItems / totalItems) * 100)}%` }}
            />
          </div>
        )}
      </div>

      {/* ── SCROLLABLE CONTENT ── */}
      <div className="flex-1 overflow-y-auto" ref={listRef}>
        <div className="max-w-5xl mx-auto px-4 pt-4 pb-4 space-y-4">
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
                + From Inventory
              </Button>
            </div>

            {/* Free-form item input */}
            <div className="px-4 py-3 border-b border-emerald-500/10 flex gap-2">
              <Input
                placeholder="Add custom item (e.g. brie cheese, catering order)..."
                value={freeFormText}
                onChange={e => setFreeFormText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAddFreeForm(); }}
                className="flex-1 text-sm"
                disabled={isComplete}
              />
              <Button
                size="sm"
                variant="outline"
                onClick={handleAddFreeForm}
                disabled={!freeFormText.trim() || isComplete}
              >
                <Plus className="h-4 w-4" />
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
                  onRemove={() => handleRemoveItem(gi.id)}
                />
              ))
            ) : (
              <p className="px-4 py-3 text-sm text-muted-foreground italic">
                No additional items. Type above or tap "+ From Inventory" to add.
              </p>
            )}
          </div>

          {/* ── Notes ── */}
          <div className="space-y-1">
            <label className="text-sm text-muted-foreground">Notes & Instructions</label>
            <Textarea
              className="min-h-[80px] bg-card border-border"
              placeholder="e.g. Get organic honey, check Costco for Perrier, catering order from Joe's..."
              value={groceryList.notes ?? ''}
              onChange={e => updateGroceryList({ ...groceryList, notes: e.target.value })}
              disabled={isComplete}
            />
          </div>
        </div>
      </div>

      {/* ── STICKY FOOTER ── */}
      <div className="bg-background border-t-2 border-border px-4 py-3 shrink-0">
        <div className="max-w-5xl mx-auto flex gap-3">
          <Button variant="outline" className="flex-1" onClick={handleShare}>
            <Share2 className="mr-2 h-4 w-4" />
            Share
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
      </div>

      {/* ── Add Item dialog ── */}
      <Dialog open={showAddDialog} onOpenChange={open => { setShowAddDialog(open); if (!open) setAddSearch(''); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add from Inventory</DialogTitle>
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
                  const alreadyAdded = groceryList.items.some(gi => gi.itemId === item.id && !gi.isManual);
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleAddItem(item)}
                      disabled={alreadyAdded}
                      className={cn(
                        'w-full text-left px-3 py-2 rounded text-sm transition-colors',
                        alreadyAdded
                          ? 'opacity-40 cursor-not-allowed'
                          : 'hover:bg-muted'
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
