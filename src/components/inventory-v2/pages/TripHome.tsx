import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ChevronLeft, Search, ShoppingCart, Plane, CheckCircle2,
  Users, Package, Plus, X, ChevronDown, ClipboardCheck, FileText,
  AlertTriangle, Star,
} from 'lucide-react';
import { Card } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Input } from '../../ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '../../ui/dialog';
import { toast } from 'sonner';
import { useInventoryV2 } from '../InventoryV2Context';
import { OfflineBanner } from '../shared/OfflineBanner';
import { LEG_PHASE_COLORS, SUPPLY_CATEGORIES } from '../constants';
import { formatRelativeTime } from '../shared/dateUtils';
import { getCompartmentsForAircraft, getCompartmentLabel } from '../compartmentConfig';
import { cn } from '../../ui/utils';
import type { InventoryItemV2, UsageLogEntry, Trip, TripLeg, LegPhase, TripViewMode } from '../types';
import QuickTapView from '../shared/QuickTapView';
import { TripLoadExtras } from './TripLoadExtras';
import { TripRestoreStock } from './TripRestoreStock';

// ─── Item Row ───────────────────────────────────────────────────────────────

interface ItemRowProps {
  item: InventoryItemV2;
  legUsage: number;
  onBoard: number;
  compartmentLabel: string;
  onIncrement: () => void;
  onDecrement: () => void;
  selected?: boolean;
  starred?: boolean;
  onToggleStar?: () => void;
}

function ItemRow({ item, legUsage, onBoard, compartmentLabel, onIncrement, onDecrement, selected, starred, onToggleStar }: ItemRowProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 py-3 border-b border-border/60 transition-colors',
        legUsage === 0 && 'opacity-50',
        selected && 'bg-primary/10 border-l-2 border-l-primary'
      )}
    >
      {onToggleStar && (
        <button
          onClick={onToggleStar}
          className="shrink-0 text-muted-foreground hover:text-amber-400 transition-colors"
          aria-label={starred ? 'Unpin item' : 'Pin item'}
        >
          <Star size={14} className={cn(starred && 'fill-amber-400 text-amber-400')} />
        </button>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate">{item.itemName}</p>
        <p className="text-xs text-muted-foreground">
          {compartmentLabel} · {onBoard} on board
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onDecrement}
          className="w-10 h-10 rounded-md bg-muted border border-border flex items-center justify-center text-lg hover:bg-muted/80 transition-colors"
          disabled={legUsage === 0}
        >
          −
        </button>
        <span
          className={cn(
            'w-8 text-center text-base font-bold',
            legUsage > 0 ? 'text-blue-400' : 'text-muted-foreground'
          )}
        >
          {legUsage}
        </span>
        <button
          onClick={onIncrement}
          className="w-10 h-10 rounded-md bg-muted border border-border flex items-center justify-center text-lg hover:bg-muted/80 transition-colors"
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
  onStartInspection,
}: {
  open: boolean;
  onClose: () => void;
  trip: Trip;
  onStartReplenish: () => void;
  onStartInspection: () => void;
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
            Trip Complete — What's Next?
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
          <Button onClick={onStartInspection} className="w-full bg-blue-600 hover:bg-blue-500">
            <ClipboardCheck className="mr-2 h-4 w-4" />
            Start Inspection
          </Button>
          <Button onClick={onStartReplenish} variant="outline" className="w-full">
            <Package className="mr-2 h-4 w-4" />
            Restock Aircraft
          </Button>
          <Button variant="ghost" onClick={onClose} className="w-full text-muted-foreground">
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Confirm Complete Dialog ─────────────────────────────────────────────────

function ConfirmCompleteDialog({
  open,
  onClose,
  onConfirm,
  trip,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  trip: Trip;
}) {
  const totalUsed = trip.legs.reduce(
    (sum, l) => sum + l.usageLog.reduce((s, e) => s + e.qtyUsed, 0), 0
  );
  const sentLists = trip.legs.filter(l => l.groceryListId).length;

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Complete Trip?</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2 text-sm">
          <p className="text-muted-foreground">
            This will mark {trip.tailNumber} as returned and begin the return-to-baseline process.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-muted-foreground text-xs">Legs completed</p>
              <p className="font-bold">{trip.legs.length}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Total items used</p>
              <p className="font-bold">{totalUsed}</p>
            </div>
            {sentLists > 0 && (
              <div>
                <p className="text-muted-foreground text-xs">Grocery lists sent</p>
                <p className="font-bold">{sentLists}</p>
              </div>
            )}
          </div>
        </div>
        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button onClick={onConfirm} className="flex-1 bg-emerald-600 hover:bg-emerald-500">
            Complete Trip
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
  const [view, setView] = useState<TripViewMode>(() => {
    return (localStorage.getItem('inv2-trip-view-mode') as TripViewMode) || 'quick-tap';
  });
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showNextLeg, setShowNextLeg] = useState(false);
  const [showTripComplete, setShowTripComplete] = useState(false);
  const [showConfirmComplete, setShowConfirmComplete] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const [screen, setScreen] = useState<'trip' | 'load-extras' | 'restore-stock'>('trip');
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const undoToastRef = useRef<string | number | undefined>(undefined);

  // Persist view mode preference
  useEffect(() => {
    localStorage.setItem('inv2-trip-view-mode', view);
  }, [view]);

  const activeLeg = trip.legs.find(l => l.status === 'active') ?? null;
  const activeLegIndex = trip.legs.findIndex(l => l.status === 'active');
  const isLastLeg = activeLegIndex === trip.legs.length - 1;
  const aircraftType = trip.aircraftType;
  const phase: LegPhase = activeLeg?.phase ?? 'complete';

  const phaseColors = LEG_PHASE_COLORS[phase];

  // NOTE: the completed-trip early return lives AFTER all hooks below — moving
  // it here would skip later hooks and break the Rules of Hooks when a trip
  // transitions to 'completed' mid-render.

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

  // ─── Favorites ────────────────────────────────────────────────────────────

  const userFavorites = state.favoriteItems[state.currentUser.id] ?? [];

  const isFavorite = useCallback((itemId: string) => userFavorites.includes(itemId), [userFavorites]);

  function toggleFavorite(itemId: string) {
    dispatch({ type: 'TOGGLE_FAVORITE_ITEM', payload: { userId: state.currentUser.id, itemId } });
  }

  const favoriteItems = useMemo(
    () => filteredItems.filter(item => isFavorite(item.id)),
    [filteredItems, isFavorite]
  );

  // ─── Keyboard Shortcuts ───────────────────────────────────────────────────

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!activeLeg) return;
      // Don't intercept when user is typing in a search input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => prev === null ? 0 : Math.min(prev + 1, filteredItems.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => prev === null ? 0 : Math.max(prev - 1, 0));
      } else if ((e.key === '+' || e.key === '=') && selectedIndex !== null) {
        handleIncrement(filteredItems[selectedIndex]);
      } else if (e.key === '-' && selectedIndex !== null) {
        handleDecrement(filteredItems[selectedIndex]);
      } else if (e.key === 'Escape') {
        setSelectedIndex(null);
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [activeLeg, filteredItems, selectedIndex]);

  function getLegUsage(item: InventoryItemV2): number {
    if (!activeLeg) return 0;
    return activeLeg.usageLog.find(e => e.itemId === item.id)?.qtyUsed ?? 0;
  }

  function getOnBoard(item: InventoryItemV2): number {
    const par = item.defaultQuantities[aircraftType] ?? 0;
    const allLegsUsage = trip.legs
      .flatMap((l: TripLeg) => l.usageLog)
      .filter(e => e.itemId === item.id)
      .reduce((sum, e) => sum + e.qtyUsed, 0);
    const loadTotal = (trip.loadItems ?? [])
      .filter(li => li.itemId === item.id)
      .reduce((sum, li) => sum + li.qty, 0);
    return par + loadTotal - allLegsUsage;
  }

  function handleIncrement(item: InventoryItemV2) {
    if (!activeLeg) return;
    // Logging an item is itself the signal that the flight is underway — no need
    // to tap "Start Flight" first. First tap in pre_flight advances the phase.
    if (activeLeg.phase === 'pre_flight') {
      dispatch({
        type: 'SET_LEG_PHASE',
        payload: { tripId: trip.id, legId: activeLeg.id, phase: 'in_flight' },
      });
    }
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

  // If trip is completed, show the complete state.
  // MUST stay below all hooks — see note near the top of this component.
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

  // ─── Phase Actions ────────────────────────────────────────────────────────

  function handleStartFlight() {
    if (!activeLeg) return;
    dispatch({
      type: 'SET_LEG_PHASE',
      payload: { tripId: trip.id, legId: activeLeg.id, phase: 'in_flight' },
    });
  }

  function handleLanded() {
    if (!activeLeg) return;
    // Always land into on_ground and let the footer present the choice
    // (Add Another Leg vs Complete Trip) — even on a single-leg trip.
    dispatch({
      type: 'SET_LEG_PHASE',
      payload: { tripId: trip.id, legId: activeLeg.id, phase: 'on_ground' },
    });
  }

  function handleNextLeg() {
    if (!activeLeg) return;
    dispatch({ type: 'ADVANCE_TO_NEXT_LEG', payload: trip.id });
  }

  // "Add Another Leg" — always available on the ground. If the trip was planned
  // with a subsequent leg, advance into it; otherwise open the dialog to create
  // a brand-new leg and keep the trip going.
  function handleAddOrAdvanceLeg() {
    if (!isLastLeg) {
      handleNextLeg();
    } else {
      setShowNextLeg(true);
    }
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
    setShowConfirmComplete(true);
  }

  function handleConfirmCompleteTrip() {
    if (!activeLeg) return;
    setShowConfirmComplete(false);
    dispatch({
      type: 'SET_LEG_PHASE',
      payload: { tripId: trip.id, legId: activeLeg.id, phase: 'complete' },
    });
    dispatch({ type: 'COMPLETE_TRIP', payload: trip.id });

    const tripId = trip.id;
    undoToastRef.current = toast('Trip completed.', {
      duration: 5000,
      action: {
        label: 'Undo',
        onClick: () => {
          dispatch({ type: 'REOPEN_TRIP', payload: tripId });
          setShowTripComplete(false);
        },
      },
    });

    setShowTripComplete(true);
  }

  function handleStartReplenish() {
    setShowTripComplete(false);
    navigate(`/inventory-v2/replenish?tail=${trip.tailNumber}`);
  }

  function handleStartInspection() {
    setShowTripComplete(false);
    navigate(`/inventory-v2/inspection?tail=${trip.tailNumber}`);
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  // Sub-screen renders
  if (screen === 'load-extras') {
    return <TripLoadExtras trip={trip} onBack={() => setScreen('trip')} />;
  }

  if (screen === 'restore-stock' && activeLeg) {
    return <TripRestoreStock trip={trip} leg={activeLeg} onBack={() => setScreen('trip')} />;
  }

  return (
    <div className="-m-6 -mb-20 flex flex-col h-[calc(100dvh-9.125rem)] md:h-[calc(100dvh-4.5625rem)] overflow-hidden animate-in fade-in duration-200">
      <OfflineBanner />

      {/* ── HEADER ── */}
      <div className="bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3 space-y-1.5 shrink-0">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/inventory-v2/trips')}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft size={16} /> Fleet
          </button>
          <div className="flex items-center gap-2">
            {activeLeg && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1 text-xs text-muted-foreground"
                onClick={() => setScreen('load-extras')}
              >
                <Package size={14} /> Load Extras
              </Button>
            )}
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
                Leg {activeLeg.legNumber}: {activeLeg.origin || '—'} → {activeLeg.destination || '—'}
              </span>
              <Badge className={cn('text-xs status-badge', phaseColors.className)}>
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

        {/* Multi-user awareness */}
        {trip.lastEditedBy && trip.lastEditedAt && (() => {
          const editedSecondsAgo = (Date.now() - new Date(trip.lastEditedAt).getTime()) / 1000;
          const editedByOther = trip.lastEditedBy !== state.currentUser.name;
          if (editedByOther && editedSecondsAgo < 60) {
            return (
              <div className="flex items-center gap-1.5 text-xs text-amber-500 bg-amber-500/10 rounded px-2 py-1">
                <AlertTriangle size={12} />
                {trip.lastEditedBy} is also editing this trip
              </div>
            );
          }
          if (trip.lastEditedBy) {
            return (
              <p className="text-xs text-muted-foreground">
                Last edited by {trip.lastEditedBy} · {formatRelativeTime(trip.lastEditedAt)}
              </p>
            );
          }
          return null;
        })()}
      </div>

      {/* ── SCROLLABLE CONTENT ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-4 pt-4 pb-4">
          {activeLeg ? (
            <>
              {/* View toggle + search */}
              <div className="flex items-center gap-3 mb-4">
                <div className="flex gap-1 p-1 bg-muted rounded-lg">
                  <button
                    className={cn(
                      'px-3 py-1.5 rounded text-xs font-medium transition-colors flex items-center gap-1',
                      view === 'quick-tap'
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                    onClick={() => setView('quick-tap')}
                  >
                    ⚡ Quick Tap
                  </button>
                  <button
                    className={cn(
                      'px-3 py-1.5 rounded text-xs font-medium transition-colors',
                      view === 'compartment'
                        ? 'bg-background text-foreground shadow-sm'
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
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                    onClick={() => setView('category')}
                  >
                    Category
                  </button>
                </div>
                {view !== 'quick-tap' && (
                  <div className="relative flex-1">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      className="pl-8 h-9 text-sm"
                      placeholder="Search items..."
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                    />
                  </div>
                )}
              </div>

              {/* ── Quick Tap view ── */}
              {view === 'quick-tap' && (
                <QuickTapView
                  items={filteredItems}
                  activeLeg={activeLeg}
                  trip={trip}
                  aircraftType={aircraftType}
                  onIncrement={handleIncrement}
                  onDecrement={handleDecrement}
                  getLegUsage={getLegUsage}
                  getOnBoard={getOnBoard}
                />
              )}

              {/* ── Compartment view ── */}
              {view === 'compartment' && (
                <Card className="bg-card border-border overflow-hidden">
                  {favoriteItems.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 border-b border-border">
                        <Star size={12} className="fill-amber-400 text-amber-400" />
                        <span className="text-xs font-semibold uppercase tracking-wide text-amber-500">Pinned</span>
                      </div>
                      {favoriteItems.map(item => {
                        const idx = filteredItems.findIndex(i => i.id === item.id);
                        return (
                          <ItemRow
                            key={`fav-${item.id}`}
                            item={item}
                            legUsage={getLegUsage(item)}
                            onBoard={getOnBoard(item)}
                            compartmentLabel={getCompartmentLabel(state.compartmentConfigs, aircraftType, item.compartmentId)}
                            onIncrement={() => handleIncrement(item)}
                            onDecrement={() => handleDecrement(item)}
                            selected={selectedIndex === idx}
                            starred
                            onToggleStar={() => toggleFavorite(item.id)}
                          />
                        );
                      })}
                    </div>
                  )}
                  {compartments.map(compartment => {
                    const sectionItems = filteredItems.filter(
                      item => item.compartmentId === compartment.id
                    );
                    if (sectionItems.length === 0) return null;
                    const sectionUsage = sectionItems.reduce((sum, item) => sum + getLegUsage(item), 0);

                    return (
                      <div key={compartment.id}>
                        <div className="flex items-center justify-between px-4 py-2 bg-muted/60 border-b border-border">
                          <span className={cn('text-xs font-semibold uppercase tracking-wide', compartment.color)}>
                            {compartment.label}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {sectionUsage > 0 ? `${sectionUsage} used` : ''}
                          </span>
                        </div>
                        {sectionItems.map(item => {
                          const idx = filteredItems.findIndex(i => i.id === item.id);
                          return (
                            <ItemRow
                              key={item.id}
                              item={item}
                              legUsage={getLegUsage(item)}
                              onBoard={getOnBoard(item)}
                              compartmentLabel={getCompartmentLabel(state.compartmentConfigs, aircraftType, item.compartmentId)}
                              onIncrement={() => handleIncrement(item)}
                              onDecrement={() => handleDecrement(item)}
                              selected={selectedIndex === idx}
                              starred={isFavorite(item.id)}
                              onToggleStar={() => toggleFavorite(item.id)}
                            />
                          );
                        })}
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
                            : 'bg-muted text-muted-foreground hover:text-foreground'
                        )}
                      >
                        {cat === 'all'
                          ? 'All'
                          : SUPPLY_CATEGORIES.find(c => c.id === cat)?.label ?? cat}
                      </button>
                    ))}
                  </div>
                  <Card className="bg-card border-border overflow-hidden">
                    {favoriteItems.length > 0 && selectedCategory === 'all' && (
                      <div>
                        <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 border-b border-border">
                          <Star size={12} className="fill-amber-400 text-amber-400" />
                          <span className="text-xs font-semibold uppercase tracking-wide text-amber-500">Pinned</span>
                        </div>
                        {favoriteItems.map(item => {
                          const idx = filteredItems.findIndex(i => i.id === item.id);
                          return (
                            <ItemRow
                              key={`fav-${item.id}`}
                              item={item}
                              legUsage={getLegUsage(item)}
                              onBoard={getOnBoard(item)}
                              compartmentLabel={getCompartmentLabel(state.compartmentConfigs, aircraftType, item.compartmentId)}
                              onIncrement={() => handleIncrement(item)}
                              onDecrement={() => handleDecrement(item)}
                              selected={selectedIndex === idx}
                              starred
                              onToggleStar={() => toggleFavorite(item.id)}
                            />
                          );
                        })}
                      </div>
                    )}
                    {filteredItems
                      .filter(item => selectedCategory === 'all' || item.supplyCategory === selectedCategory)
                      .map(item => {
                        const idx = filteredItems.findIndex(i => i.id === item.id);
                        return (
                          <ItemRow
                            key={item.id}
                            item={item}
                            legUsage={getLegUsage(item)}
                            onBoard={getOnBoard(item)}
                            compartmentLabel={getCompartmentLabel(state.compartmentConfigs, aircraftType, item.compartmentId)}
                            onIncrement={() => handleIncrement(item)}
                            onDecrement={() => handleDecrement(item)}
                            selected={selectedIndex === idx}
                            starred={isFavorite(item.id)}
                            onToggleStar={() => toggleFavorite(item.id)}
                          />
                        );
                      })}
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
                    <div className="mt-2 bg-card border border-border rounded-lg overflow-hidden">
                      {trip.legs.map(leg => {
                        const legUsed = leg.usageLog.reduce((sum, e) => sum + e.qtyUsed, 0);
                        return (
                          <div
                            key={leg.id}
                            className={cn(
                              'flex items-center gap-3 px-4 py-2.5 border-b border-border last:border-0',
                              leg.status === 'upcoming' && 'opacity-50'
                            )}
                          >
                            <div className="shrink-0">
                              {leg.status === 'completed' && <CheckCircle2 className="text-emerald-400" size={18} />}
                              {leg.status === 'active' && (
                                <div className="w-[18px] h-[18px] rounded-full bg-amber-500 flex items-center justify-center text-[10px] font-bold text-background">
                                  {leg.legNumber}
                                </div>
                              )}
                              {leg.status === 'upcoming' && (
                                <div className="w-[18px] h-[18px] rounded-full border-2 border-border flex items-center justify-center text-[10px] ">
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
        <div className="bg-background border-t-2 border-border px-4 py-3 shrink-0">
          <div className="max-w-5xl mx-auto space-y-2">
            {/* on_ground: Grocery List + Restore Stock (mid-trip road-sourced loads) */}
            {phase === 'on_ground' && (
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  className="flex-1 relative"
                  onClick={() => navigate('grocery-list')}
                >
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  Grocery List
                  {groceryItemCount > 0 && (
                    <span className="ml-2 bg-amber-500 text-background text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                      {groceryItemCount}
                    </span>
                  )}
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setScreen('restore-stock')}
                >
                  <Package className="mr-2 h-4 w-4" />
                  Restore Stock
                </Button>
              </div>
            )}

            {/* Primary action row */}
            <div className="flex items-center gap-3">
              {/* pre_flight: Load Extras + Start Flight */}
              {phase === 'pre_flight' && (
                <>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setScreen('load-extras')}
                  >
                    Load Extras
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handleStartFlight}
                  >
                    <Plane className="mr-2 h-4 w-4" />
                    Start Flight
                  </Button>
                </>
              )}

              {/* in_flight: Grocery List + Landed */}
              {phase === 'in_flight' && (
                <>
                  <Button
                    variant="outline"
                    className="flex-1 relative"
                    onClick={() => navigate('grocery-list')}
                  >
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    Grocery List
                    {groceryItemCount > 0 && (
                      <span className="ml-2 bg-amber-500 text-background text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                        {groceryItemCount}
                      </span>
                    )}
                  </Button>
                  <Button
                    className="flex-1 bg-blue-600 hover:bg-blue-500"
                    onClick={handleLanded}
                  >
                    <Plane className="mr-2 h-4 w-4" />
                    Landed
                  </Button>
                </>
              )}

              {/* on_ground: Review Leg + Add Another Leg + Complete Trip
                  (all three always available, regardless of leg count) */}
              {phase === 'on_ground' && (
                <>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => activeLeg && navigate(`/inventory-v2/trips/${trip.id}/reconcile`)}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Review Leg
                  </Button>
                  <Button
                    className="flex-1 bg-amber-600 hover:bg-amber-500"
                    onClick={handleAddOrAdvanceLeg}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Another Leg
                  </Button>
                  <Button
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500"
                    onClick={handleCompleteTrip}
                  >
                    Complete Trip
                  </Button>
                </>
              )}
            </div>
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

      <ConfirmCompleteDialog
        open={showConfirmComplete}
        onClose={() => setShowConfirmComplete(false)}
        onConfirm={handleConfirmCompleteTrip}
        trip={trip}
      />

      <TripCompleteDialog
        open={showTripComplete}
        onClose={() => {
          setShowTripComplete(false);
          navigate('/inventory-v2/trips');
        }}
        trip={trip}
        onStartReplenish={handleStartReplenish}
        onStartInspection={handleStartInspection}
      />
    </div>
  );
}
