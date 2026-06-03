import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ChevronLeft, Search, ShoppingCart, Plane, CheckCircle2,
  Users, Package, Plus, X, ChevronDown,
} from 'lucide-react';
import { Card } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Input } from '../../ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '../../ui/dialog';
import { useInventoryV2 } from '../InventoryV2Context';
import { OfflineBanner } from '../shared/OfflineBanner';
import { LEG_PHASE_COLORS, SUPPLY_CATEGORIES } from '../constants';
import { getCompartmentsForAircraft, getCompartmentLabel } from '../compartmentConfig';
import { cn } from '../../ui/utils';
import type { InventoryItemV2, UsageLogEntry, Trip, TripLeg, LegPhase } from '../types';

// ─── Item Row ───────────────────────────────────────────────────────────────

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
          className="w-10 h-10 rounded-md bg-slate-800 border border-slate-700 flex items-center justify-center text-lg hover:bg-slate-700 transition-colors"
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
          className="w-10 h-10 rounded-md bg-slate-800 border border-slate-700 flex items-center justify-center text-lg hover:bg-slate-700 transition-colors"
        >
          +
        </button>
      </div>
    </div>
  );
}

// ─── Next Leg Dialog ────────────────────────────────────────────────────────

function NextLegDialog({
  open,
  onClose,
  onSubmit,
  onSkip,
  lastDestination,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { origin: string; destination: string; date: string; paxCount: number }) => void;
  onSkip: () => void;
  lastDestination: string;
}) {
  const [origin, setOrigin] = useState(lastDestination);
  const [destination, setDestination] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [paxCount, setPaxCount] = useState(0);

  function handleSubmit() {
    if (!origin.trim() || !destination.trim()) return;
    onSubmit({
      origin: origin.trim().toUpperCase(),
      destination: destination.trim().toUpperCase(),
      date,
      paxCount,
    });
    setDestination('');
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Next Leg</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">From</label>
              <Input
                value={origin}
                onChange={e => setOrigin(e.target.value.toUpperCase())}
                className="uppercase font-mono"
                maxLength={4}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">To</label>
              <Input
                value={destination}
                onChange={e => setDestination(e.target.value.toUpperCase())}
                className="uppercase font-mono"
                maxLength={4}
                autoFocus
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Date</label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Pax</label>
              <Input
                type="number" value={paxCount} min={0} max={19}
                onChange={e => setPaxCount(parseInt(e.target.value, 10) || 0)}
              />
            </div>
          </div>
        </div>
        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={onSkip} className="flex-1">
            Skip for Now
          </Button>
          <Button onClick={handleSubmit} disabled={!origin.trim() || !destination.trim()} className="flex-1">
            Add & Go
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Trip Complete Dialog ───────────────────────────────────────────────────

function TripCompleteDialog({
  open,
  onClose,
  trip,
  onStartReplenish,
}: {
  open: boolean;
  onClose: () => void;
  trip: Trip;
  onStartReplenish: () => void;
}) {
  const totalUsed = trip.legs.reduce(
    (sum, l) => sum + l.usageLog.reduce((s, e) => s + e.qtyUsed, 0), 0
  );

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            Trip Complete
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">Aircraft</p>
              <p className="font-mono font-bold">{trip.tailNumber}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Legs Flown</p>
              <p className="font-bold">{trip.legs.length}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Total Items Used</p>
              <p className="font-bold">{totalUsed}</p>
            </div>
            {trip.tripName && (
              <div>
                <p className="text-muted-foreground text-xs">Trip</p>
                <p className="font-medium truncate">{trip.tripName}</p>
              </div>
            )}
          </div>
        </div>
        <DialogFooter className="flex-col gap-2">
          <Button onClick={onStartReplenish} className="w-full bg-emerald-600 hover:bg-emerald-500">
            Start Replenish
          </Button>
          <Button variant="outline" onClick={onClose} className="w-full">
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function TripHome() {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();
  const { state, dispatch } = useInventoryV2();

  const trip = state.trips.find(t => t.id === tripId);

  if (!trip) {
    return (
      <div className="max-w-5xl mx-auto p-6 space-y-4">
        <p className="text-muted-foreground">Trip not found.</p>
        <Button onClick={() => navigate('/inventory-v2/trips')}>Back to Fleet</Button>
      </div>
    );
  }

  return <TripViewInner tripId={tripId!} trip={trip} state={state} dispatch={dispatch} navigate={navigate} />;
}

// ─── Inner Component ────────────────────────────────────────────────────────

function TripViewInner({
  tripId,
  trip,
  state,
  dispatch,
  navigate,
}: {
  tripId: string;
  trip: Trip;
  state: ReturnType<typeof useInventoryV2>['state'];
  dispatch: ReturnType<typeof useInventoryV2>['dispatch'];
  navigate: ReturnType<typeof useNavigate>;
}) {
  const [view, setView] = useState<'compartment' | 'category'>('compartment');
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showNextLeg, setShowNextLeg] = useState(false);
  const [showTripComplete, setShowTripComplete] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);

  const activeLeg = trip.legs.find(l => l.status === 'active') ?? null;
  const activeLegIndex = trip.legs.findIndex(l => l.status === 'active');
  const isLastLeg = activeLegIndex === trip.legs.length - 1;
  const aircraftType = trip.aircraftType;
  const phase: LegPhase = activeLeg?.phase ?? 'complete';

  const phaseColors = LEG_PHASE_COLORS[phase];

  // If trip is completed, show the complete state
  if (trip.status === 'completed') {
    return (
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <OfflineBanner />
        <button
          onClick={() => navigate('/inventory-v2/trips')}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft size={16} /> Fleet
        </button>
        <div className="text-center py-12 space-y-4">
          <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto" />
          <h1 className="text-2xl font-bold">Trip Complete</h1>
          <p className="text-muted-foreground">
            {trip.tailNumber} · {trip.legs.length} legs · {trip.tripName || 'Unnamed Trip'}
          </p>
          <Button
            onClick={() => navigate(`/inventory-v2/replenish?tail=${trip.tailNumber}`)}
            className="bg-emerald-600 hover:bg-emerald-500"
          >
            Start Replenish
          </Button>
        </div>
      </div>
    );
  }

  // ─── Quick Count Logic ──────────────────────────────────────────────────

  const filteredItems = useMemo(() => {
    const lowerSearch = search.toLowerCase();
    return state.items.filter(item => {
      const qty = item.defaultQuantities[aircraftType];
      if (!qty || qty <= 0) return false;
      if (search && !item.itemName.toLowerCase().includes(lowerSearch)) return false;
      return true;
    });
  }, [state.items, aircraftType, search]);

  function getLegUsage(item: InventoryItemV2): number {
    if (!activeLeg) return 0;
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
    if (!activeLeg) return;
    const existing = activeLeg.usageLog.find(e => e.itemId === item.id);
    if (existing) {
      dispatch({
        type: 'UPDATE_USAGE_LOG_ENTRY',
        payload: {
          tripId: trip.id,
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
        payload: { tripId: trip.id, legId: activeLeg.id, entry: newEntry },
      });
    }
  }

  function handleDecrement(item: InventoryItemV2) {
    if (!activeLeg) return;
    const existing = activeLeg.usageLog.find(e => e.itemId === item.id);
    if (!existing) return;
    if (existing.qtyUsed <= 1) {
      dispatch({
        type: 'REMOVE_USAGE_LOG_ENTRY',
        payload: { tripId: trip.id, legId: activeLeg.id, entryId: existing.id },
      });
    } else {
      dispatch({
        type: 'UPDATE_USAGE_LOG_ENTRY',
        payload: {
          tripId: trip.id,
          legId: activeLeg.id,
          entry: { ...existing, qtyUsed: existing.qtyUsed - 1 },
        },
      });
    }
  }

  const totalLegUsage = activeLeg
    ? activeLeg.usageLog.reduce((sum, e) => sum + e.qtyUsed, 0)
    : 0;

  const compartments = useMemo(
    () => getCompartmentsForAircraft(state.compartmentConfigs, aircraftType),
    [state.compartmentConfigs, aircraftType]
  );

  const relevantCategories = useMemo(() => {
    const cats = new Set(filteredItems.map(i => i.supplyCategory));
    return SUPPLY_CATEGORIES.filter(c => cats.has(c.id)).map(c => c.id);
  }, [filteredItems]);

  // ─── Grocery list item count ──────────────────────────────────────────────

  const groceryItemCount = useMemo(() => {
    const gl = state.groceryLists.find(
      g => g.tripId === trip.id && g.status !== 'fulfilled'
    );
    return gl?.items.length ?? 0;
  }, [state.groceryLists, trip.id]);

  // ─── Phase Actions ────────────────────────────────────────────────────────

  function handleLanded() {
    if (!activeLeg) return;
    dispatch({
      type: 'SET_LEG_PHASE',
      payload: { tripId: trip.id, legId: activeLeg.id, phase: 'on_ground' },
    });
    setShowNextLeg(true);
  }

  function handleNextLeg() {
    if (!activeLeg) return;
    dispatch({ type: 'ADVANCE_TO_NEXT_LEG', payload: trip.id });
  }

  function handleAddNextLeg(data: { origin: string; destination: string; date: string; paxCount: number }) {
    if (!activeLeg) return;
    // Complete current leg and add the new one
    dispatch({
      type: 'COMPLETE_LEG',
      payload: { tripId: trip.id, legId: activeLeg.id },
    });
    dispatch({
      type: 'SET_LEG_PHASE',
      payload: { tripId: trip.id, legId: activeLeg.id, phase: 'complete' },
    });

    const newLeg: TripLeg = {
      id: `leg-${Date.now()}`,
      tripId: trip.id,
      legNumber: trip.legs.length + 1,
      origin: data.origin,
      destination: data.destination,
      date: data.date,
      paxCount: data.paxCount,
      status: 'active',
      phase: 'in_flight',
      usageLog: [],
      notes: [],
    };
    dispatch({ type: 'ADD_LEG_TO_TRIP', payload: { tripId: trip.id, leg: newLeg } });
    setShowNextLeg(false);
  }

  function handleSkipNextLeg() {
    setShowNextLeg(false);
  }

  function handleCompleteTrip() {
    if (!activeLeg) return;
    dispatch({
      type: 'SET_LEG_PHASE',
      payload: { tripId: trip.id, legId: activeLeg.id, phase: 'complete' },
    });
    dispatch({ type: 'COMPLETE_TRIP', payload: trip.id });
    setShowTripComplete(true);
  }

  function handleStartReplenish() {
    setShowTripComplete(false);
    navigate(`/inventory-v2/replenish?tail=${trip.tailNumber}`);
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="-m-6 -mb-20 flex flex-col h-[calc(100dvh-9.125rem)] md:h-[calc(100dvh-4.5625rem)] overflow-hidden">
      <OfflineBanner />

      {/* ── HEADER ── */}
      <div className="bg-slate-950/95 backdrop-blur-sm border-b border-slate-800 px-4 py-3 space-y-1.5 shrink-0">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/inventory-v2/trips')}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft size={16} /> Fleet
          </button>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold font-mono">{trip.tailNumber}</span>
            <Badge className="bg-blue-500/15 text-blue-400 border border-blue-500/30 text-xs">
              {trip.aircraftType}
            </Badge>
          </div>
        </div>

        {activeLeg && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-mono font-semibold">
                Leg {activeLeg.legNumber}: {activeLeg.origin} → {activeLeg.destination}
              </span>
              <Badge className={cn('text-xs', phaseColors.bg, phaseColors.text, 'border', phaseColors.border)}>
                {phaseColors.label}
              </Badge>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Users size={12} />
                {activeLeg.paxCount}
              </span>
              <span className="flex items-center gap-1">
                <Package size={12} />
                {totalLegUsage}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── SCROLLABLE CONTENT ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-4 pt-4 pb-4">
          {activeLeg ? (
            <>
              {/* View toggle + search */}
              <div className="flex items-center gap-3 mb-4">
                <div className="flex gap-1 p-1 bg-slate-800 rounded-lg">
                  <button
                    className={cn(
                      'px-3 py-1.5 rounded text-xs font-medium transition-colors',
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
                      'px-3 py-1.5 rounded text-xs font-medium transition-colors',
                      view === 'category'
                        ? 'bg-slate-600 text-white'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                    onClick={() => setView('category')}
                  >
                    Category
                  </button>
                </div>
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="pl-8 h-9 text-sm"
                    placeholder="Search items..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>
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
                          <span className={cn('text-xs font-semibold uppercase tracking-wide', compartment.color)}>
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
                  <Card className="bg-slate-900/60 border-slate-700 overflow-hidden">
                    {filteredItems
                      .filter(item => selectedCategory === 'all' || item.supplyCategory === selectedCategory)
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
                    {filteredItems.filter(item => selectedCategory === 'all' || item.supplyCategory === selectedCategory).length === 0 && (
                      <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                        No items match your search.
                      </div>
                    )}
                  </Card>
                </div>
              )}

              {/* ── Leg Timeline (collapsible) ── */}
              {trip.legs.length > 1 && (
                <div className="mt-6">
                  <button
                    onClick={() => setShowTimeline(!showTimeline)}
                    className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', !showTimeline && '-rotate-90')} />
                    Flight Timeline ({trip.legs.length} legs)
                  </button>
                  {showTimeline && (
                    <div className="mt-2 bg-slate-900/60 border border-slate-700 rounded-lg overflow-hidden">
                      {trip.legs.map(leg => {
                        const legUsed = leg.usageLog.reduce((sum, e) => sum + e.qtyUsed, 0);
                        return (
                          <div
                            key={leg.id}
                            className={cn(
                              'flex items-center gap-3 px-4 py-2.5 border-b border-slate-800 last:border-0',
                              leg.status === 'upcoming' && 'opacity-50'
                            )}
                          >
                            <div className="shrink-0">
                              {leg.status === 'completed' && <CheckCircle2 className="text-emerald-400" size={18} />}
                              {leg.status === 'active' && (
                                <div className="w-[18px] h-[18px] rounded-full bg-amber-500 flex items-center justify-center text-[10px] font-bold text-slate-950">
                                  {leg.legNumber}
                                </div>
                              )}
                              {leg.status === 'upcoming' && (
                                <div className="w-[18px] h-[18px] rounded-full border-2 border-slate-600 flex items-center justify-center text-[10px] text-slate-500">
                                  {leg.legNumber}
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium font-mono">
                                {leg.origin} → {leg.destination}
                              </p>
                            </div>
                            {legUsed > 0 && (
                              <span className="text-xs text-muted-foreground">{legUsed} used</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-16 space-y-3">
              <Plane className="h-10 w-10 text-muted-foreground/40 mx-auto" />
              <p className="text-muted-foreground">No active leg</p>
              <Button onClick={() => navigate('/inventory-v2/trips')}>Back to Fleet</Button>
            </div>
          )}
        </div>
      </div>

      {/* ── STICKY FOOTER ── */}
      {activeLeg && (
        <div className="bg-slate-950 border-t-2 border-slate-700 px-4 py-3 shrink-0">
          <div className="max-w-5xl mx-auto flex items-center gap-3">
            {/* Grocery list button */}
            <Button
              variant="outline"
              className="flex-1 relative"
              onClick={() => navigate('grocery-list')}
            >
              <ShoppingCart className="mr-2 h-4 w-4" />
              Grocery List
              {groceryItemCount > 0 && (
                <span className="ml-2 bg-amber-500 text-slate-950 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {groceryItemCount}
                </span>
              )}
            </Button>

            {/* Phase-dependent primary action */}
            {phase === 'in_flight' && (
              <Button
                className="flex-1 bg-blue-600 hover:bg-blue-500"
                onClick={handleLanded}
              >
                <Plane className="mr-2 h-4 w-4" />
                Landed
              </Button>
            )}

            {phase === 'on_ground' && !isLastLeg && (
              <Button
                className="flex-1 bg-amber-600 hover:bg-amber-500"
                onClick={handleNextLeg}
              >
                Next Leg
              </Button>
            )}

            {phase === 'on_ground' && isLastLeg && (
              <Button
                className="flex-1 bg-emerald-600 hover:bg-emerald-500"
                onClick={handleCompleteTrip}
              >
                Complete Trip
              </Button>
            )}
          </div>
        </div>
      )}

      {/* ── Dialogs ── */}
      {activeLeg && (
        <NextLegDialog
          open={showNextLeg}
          onClose={() => setShowNextLeg(false)}
          onSubmit={handleAddNextLeg}
          onSkip={handleSkipNextLeg}
          lastDestination={activeLeg.destination}
        />
      )}

      <TripCompleteDialog
        open={showTripComplete}
        onClose={() => {
          setShowTripComplete(false);
          navigate('/inventory-v2/trips');
        }}
        trip={trip}
        onStartReplenish={handleStartReplenish}
      />
    </div>
  );
}
