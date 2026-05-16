import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Search, ClipboardList } from 'lucide-react';
import { Card } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../ui/dialog';
import { useInventoryV2 } from '../InventoryV2Context';
import { OfflineBanner } from '../shared/OfflineBanner';
import { V2Badge } from '../shared/V2Badge';
import { SUPPLY_CATEGORIES } from '../constants';
import { getCompartmentsForAircraft, getCompartmentLabel } from '../compartmentConfig';
import { cn } from '../../ui/utils';
import type { InventoryItemV2, UsageLogEntry, Trip, TripLeg, InventoryV2State, InventoryV2Action } from '../types';

// ─── Main Component ───────────────────────────────────────────────────────────

export default function QuickCount() {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();
  const { state, dispatch } = useInventoryV2();

  const [view, setView] = useState<'compartment' | 'category'>('compartment');
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showSummary, setShowSummary] = useState(false);

  const trip = state.trips.find(t => t.id === tripId);
  const activeLeg = trip ? (trip.legs.find(l => l.status === 'active') ?? null) : null;

  // ─── Not found / no active leg ─────────────────────────────────────────────

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
        <p className="text-muted-foreground">No active leg found for this trip.</p>
        <Button onClick={() => navigate(`/inventory-v2/trips/${tripId}`)}>Back to Trip</Button>
      </div>
    );
  }

  return (
    <QuickCountInner
      tripId={tripId!}
      trip={trip}
      activeLeg={activeLeg}
      view={view}
      setView={setView}
      search={search}
      setSearch={setSearch}
      selectedCategory={selectedCategory}
      setSelectedCategory={setSelectedCategory}
      showSummary={showSummary}
      setShowSummary={setShowSummary}
      state={state}
      dispatch={dispatch}
      navigate={navigate}
    />
  );
}

// ─── Item Row (module-scope to avoid remount on parent re-render) ─────────────

interface ItemRowProps {
  item: InventoryItemV2;
  legUsage: number;
  onBoard: number;
  compartmentLabel: string;
  onIncrement: () => void;
  onDecrement: () => void;
}

function ItemRow({ item, legUsage, onBoard, compartmentLabel, onIncrement, onDecrement }: ItemRowProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 py-3 border-b border-slate-800/60',
        legUsage === 0 && 'opacity-50'
      )}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate">{item.itemName}</p>
        <p className="text-xs text-muted-foreground">
          {compartmentLabel} · {onBoard} on board
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onDecrement}
          className="w-8 h-8 rounded-md bg-slate-800 border border-slate-700 flex items-center justify-center text-lg hover:bg-slate-700 transition-colors"
          disabled={legUsage === 0}
        >
          −
        </button>
        <span
          className={cn(
            'w-8 text-center text-base font-bold',
            legUsage > 0 ? 'text-blue-400' : 'text-slate-500'
          )}
        >
          {legUsage}
        </span>
        <button
          onClick={onIncrement}
          className="w-8 h-8 rounded-md bg-slate-800 border border-slate-700 flex items-center justify-center text-lg hover:bg-slate-700 transition-colors"
        >
          +
        </button>
      </div>
    </div>
  );
}

// ─── Inner Component (avoids hooks-after-return issues) ───────────────────────

function QuickCountInner({
  tripId,
  trip,
  activeLeg,
  view,
  setView,
  search,
  setSearch,
  selectedCategory,
  setSelectedCategory,
  showSummary,
  setShowSummary,
  state,
  dispatch,
  navigate,
}: {
  tripId: string;
  trip: Trip;
  activeLeg: TripLeg;
  view: 'compartment' | 'category';
  setView: (v: 'compartment' | 'category') => void;
  search: string;
  setSearch: (s: string) => void;
  selectedCategory: string;
  setSelectedCategory: (c: string) => void;
  showSummary: boolean;
  setShowSummary: (b: boolean) => void;
  state: InventoryV2State;
  dispatch: (action: InventoryV2Action) => void;
  navigate: ReturnType<typeof useNavigate>;
}) {
  const aircraftType = trip.aircraftType;

  // ─── Filtered items ───────────────────────────────────────────────────────

  const filteredItems = useMemo(() => {
    const lowerSearch = search.toLowerCase();
    return state.items.filter(item => {
      const qty = item.defaultQuantities[aircraftType];
      if (!qty || qty <= 0) return false;
      if (search && !item.itemName.toLowerCase().includes(lowerSearch)) return false;
      return true;
    });
  }, [state.items, aircraftType, search]);

  // ─── Usage helpers ────────────────────────────────────────────────────────

  function getLegUsage(item: InventoryItemV2): number {
    return activeLeg.usageLog.find(e => e.itemId === item.id)?.qtyUsed ?? 0;
  }

  function getOnBoard(item: InventoryItemV2): number {
    const allLegsUsage = trip.legs
      .flatMap((l: TripLeg) => l.usageLog)
      .filter(e => e.itemId === item.id)
      .reduce((sum, e) => sum + e.qtyUsed, 0);
    return (item.defaultQuantities[aircraftType] ?? 0) - allLegsUsage;
  }

  function handleIncrement(item: InventoryItemV2) {
    const existing = activeLeg.usageLog.find(e => e.itemId === item.id);
    if (existing) {
      dispatch({
        type: 'UPDATE_USAGE_LOG_ENTRY',
        payload: {
          tripId,
          legId: activeLeg.id,
          entry: { ...existing, qtyUsed: existing.qtyUsed + 1 },
        },
      });
    } else {
      const newEntry: UsageLogEntry = {
        id: `ue-${crypto.randomUUID()}`,
        legId: activeLeg.id,
        itemId: item.id,
        qtyUsed: 1,
        loggedBy: state.currentUser.name,
        loggedAt: new Date().toISOString(),
      };
      dispatch({
        type: 'ADD_USAGE_LOG_ENTRY',
        payload: { tripId, legId: activeLeg.id, entry: newEntry },
      });
    }
  }

  function handleDecrement(item: InventoryItemV2) {
    const existing = activeLeg.usageLog.find(e => e.itemId === item.id);
    if (!existing) return;
    if (existing.qtyUsed <= 1) {
      dispatch({
        type: 'REMOVE_USAGE_LOG_ENTRY',
        payload: { tripId, legId: activeLeg.id, entryId: existing.id },
      });
    } else {
      dispatch({
        type: 'UPDATE_USAGE_LOG_ENTRY',
        payload: {
          tripId,
          legId: activeLeg.id,
          entry: { ...existing, qtyUsed: existing.qtyUsed - 1 },
        },
      });
    }
  }

  // ─── Total leg usage ──────────────────────────────────────────────────────

  const totalLegUsage = activeLeg.usageLog.reduce((sum, e) => sum + e.qtyUsed, 0);

  // ─── Summary items ────────────────────────────────────────────────────────

  const summaryItems = useMemo(() => {
    return activeLeg.usageLog
      .filter(e => e.qtyUsed > 0)
      .map(e => ({
        entry: e,
        item: state.items.find(i => i.id === e.itemId),
      }))
      .filter(({ item }) => !!item);
  }, [activeLeg.usageLog, state.items]);

  // ─── Compartments ─────────────────────────────────────────────────────────

  const compartments = useMemo(
    () => getCompartmentsForAircraft(state.compartmentConfigs, aircraftType),
    [state.compartmentConfigs, aircraftType]
  );

  // ─── Category tabs ────────────────────────────────────────────────────────

  const relevantCategories = useMemo(() => {
    const cats = new Set(filteredItems.map(i => i.supplyCategory));
    return SUPPLY_CATEGORIES.filter(c => cats.has(c.id)).map(c => c.id);
  }, [filteredItems]);

  // ─── Render ───────────────────────────────────────────────────────────────

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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Quick Count</h1>
          <p className="text-sm text-muted-foreground">
            {trip.tailNumber} · Leg {activeLeg.legNumber}: {activeLeg.origin} →{' '}
            {activeLeg.destination}
          </p>
        </div>
        <V2Badge variant="v2" size="md" />
      </div>

      {/* View toggle */}
      <div className="flex gap-1 p-1 bg-slate-800 rounded-lg w-fit mb-4">
        <button
          className={cn(
            'px-4 py-1.5 rounded text-sm font-medium transition-colors',
            view === 'compartment'
              ? 'bg-slate-600 text-white'
              : 'text-muted-foreground hover:text-foreground'
          )}
          onClick={() => setView('compartment')}
        >
          Compartment
        </button>
        <button
          className={cn(
            'px-4 py-1.5 rounded text-sm font-medium transition-colors',
            view === 'category'
              ? 'bg-slate-600 text-white'
              : 'text-muted-foreground hover:text-foreground'
          )}
          onClick={() => setView('category')}
        >
          Category
        </button>
      </div>

      {/* Search bar */}
      <div className="relative mb-4">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          className="pl-9"
          placeholder="Search items..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* ── Compartment view ── */}
      {view === 'compartment' && (
        <Card className="bg-slate-900/60 border-slate-700 overflow-hidden">
          {compartments.map(compartment => {
            const sectionItems = filteredItems.filter(
              item => item.compartmentId === compartment.id
            );
            if (sectionItems.length === 0) return null;
            const sectionUsage = sectionItems.reduce((sum, item) => sum + getLegUsage(item), 0);

            return (
              <div key={compartment.id}>
                <div className="flex items-center justify-between px-4 py-2 bg-slate-900/60 border-b border-slate-700">
                  <span
                    className={cn(
                      'text-xs font-semibold uppercase tracking-wide',
                      compartment.color
                    )}
                  >
                    {compartment.label}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {sectionUsage > 0 ? `${sectionUsage} used` : ''}
                  </span>
                </div>
                {sectionItems.map(item => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    legUsage={getLegUsage(item)}
                    onBoard={getOnBoard(item)}
                    compartmentLabel={getCompartmentLabel(state.compartmentConfigs, aircraftType, item.compartmentId)}
                    onIncrement={() => handleIncrement(item)}
                    onDecrement={() => handleDecrement(item)}
                  />
                ))}
              </div>
            );
          })}
          {filteredItems.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              No items match your search.
            </div>
          )}
        </Card>
      )}

      {/* ── Category view ── */}
      {view === 'category' && (
        <div className="space-y-4">
          {/* Category tabs */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {(['all', ...relevantCategories] as string[]).map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors',
                  selectedCategory === cat
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 text-muted-foreground hover:text-foreground'
                )}
              >
                {cat === 'all'
                  ? 'All'
                  : SUPPLY_CATEGORIES.find(c => c.id === cat)?.label ?? cat}
              </button>
            ))}
          </div>

          {/* Flat item list */}
          <Card className="bg-slate-900/60 border-slate-700 overflow-hidden">
            {filteredItems
              .filter(
                item =>
                  selectedCategory === 'all' || item.supplyCategory === selectedCategory
              )
              .map(item => (
                <ItemRow
                  key={item.id}
                  item={item}
                  legUsage={getLegUsage(item)}
                  onBoard={getOnBoard(item)}
                  compartmentLabel={getCompartmentLabel(state.compartmentConfigs, aircraftType, item.compartmentId)}
                  onIncrement={() => handleIncrement(item)}
                  onDecrement={() => handleDecrement(item)}
                />
              ))}
            {filteredItems.filter(
              item =>
                selectedCategory === 'all' || item.supplyCategory === selectedCategory
            ).length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                No items match your search.
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ── Sticky footer ── */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-950 border-t-2 border-blue-500/50 px-6 py-3 flex items-center justify-between z-10">
        <span className="text-sm text-muted-foreground">
          This leg:{' '}
          <strong className="text-foreground">{totalLegUsage} items used</strong>
        </span>
        <Button size="sm" variant="outline" onClick={() => setShowSummary(true)}>
          View Summary
        </Button>
      </div>

      {/* ── Summary dialog ── */}
      <Dialog open={showSummary} onOpenChange={setShowSummary}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList size={18} />
              Leg {activeLeg.legNumber} Summary
            </DialogTitle>
          </DialogHeader>
          {summaryItems.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No items logged for this leg yet.
            </p>
          ) : (
            <div className="space-y-1 max-h-80 overflow-y-auto">
              {summaryItems.map(({ entry, item }) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between py-2 border-b border-slate-800 last:border-0"
                >
                  <span className="text-sm">{item?.itemName}</span>
                  <span className="text-sm font-bold text-blue-400">{entry.qtyUsed}</span>
                </div>
              ))}
              <div className="flex items-center justify-between pt-2">
                <span className="text-sm font-semibold">Total</span>
                <span className="text-sm font-bold">{totalLegUsage}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
