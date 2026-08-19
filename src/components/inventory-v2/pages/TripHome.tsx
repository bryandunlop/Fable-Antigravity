import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ChevronLeft, Search, ShoppingCart, Plane, CheckCircle2,
  Users, Package, Plus, X, ChevronDown, ClipboardCheck, FileText,
  AlertTriangle, Star, Pencil,
} from 'lucide-react';
import { Card } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Input } from '../../ui/input';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from '../../ui/dialog';
import { toast } from 'sonner';
import { useInventoryV2 } from '../InventoryV2Context';
import { OfflineBanner } from '../shared/OfflineBanner';
import { LEG_PHASE_COLORS } from '../constants';
import { formatRelativeTime } from '../shared/dateUtils';
import { getCompartmentsForAircraft } from '../compartmentConfig';
import { cn } from '../../ui/utils';
import type { InventoryItemV2, UsageLogEntry, Trip, TripLeg, LegPhase, TripViewMode } from '../types';
import QuickTapView from '../shared/QuickTapView';
import ManageQuickAddDialog from '../shared/ManageQuickAddDialog';
import { getOnBoardQty } from '../tripMath';
import { buildLedgerRows, groupByCompartment, groupByCategory, belowParRows } from '../tripLedger';
import type { BelowParRow } from '../tripLedger';
import { LedgerRow, LedgerHeader, LedgerSectionHeader } from '../shared/LedgerRow';
import { selectLoggableItems } from '../loggableItems';
import { AddStockSheet, type StockSource } from './AddStockSheet';
import { EndLegReview } from './EndLegReview';

// ─── Next Leg Dialog ────────────────────────────────────────────────────────

function NextLegDialog({
  open,
  onClose,
  onSubmit,
  onSkip,
  lastDestination,
  editLeg,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { origin: string; destination: string; date: string; paxCount: number }) => void;
  onSkip: () => void;
  lastDestination: string;
  // When advancing into a pre-planned leg, pass it here to pre-fill the form.
  // Fields stay editable; confirming applies the edits then advances.
  editLeg?: TripLeg;
}) {
  const isEdit = Boolean(editLeg);
  const [origin, setOrigin] = useState(editLeg?.origin ?? lastDestination);
  const [destination, setDestination] = useState(editLeg?.destination ?? '');
  const [date, setDate] = useState(editLeg?.date ?? new Date().toISOString().split('T')[0]);
  const [paxCount, setPaxCount] = useState(editLeg?.paxCount ?? 0);

  // Re-seed the form each time the dialog opens (or the target leg changes),
  // since this component stays mounted between openings.
  useEffect(() => {
    if (!open) return;
    setOrigin(editLeg?.origin ?? lastDestination);
    setDestination(editLeg?.destination ?? '');
    setDate(editLeg?.date ?? new Date().toISOString().split('T')[0]);
    setPaxCount(editLeg?.paxCount ?? 0);
  }, [open, editLeg, lastDestination]);

  function handleSubmit() {
    if (!origin.trim() || !destination.trim()) return;
    onSubmit({
      origin: origin.trim().toUpperCase(),
      destination: destination.trim().toUpperCase(),
      date,
      paxCount,
    });
    if (!isEdit) setDestination('');
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Confirm Next Leg' : 'Next Leg'}</DialogTitle>
          <DialogDescription>Where the aircraft goes next, so stock can be planned against it.</DialogDescription>
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
            {isEdit ? 'Cancel' : 'Skip for Now'}
          </Button>
          <Button onClick={handleSubmit} disabled={!origin.trim() || !destination.trim()} className="flex-1">
            {isEdit ? 'Confirm & Go' : 'Add & Go'}
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
  belowPar,
  onStartReplenish,
  onStartInspection,
}: {
  open: boolean;
  onClose: () => void;
  trip: Trip;
  belowPar: BelowParRow[];
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
          <DialogDescription>Choose what happens to the remaining stock now the trip has closed.</DialogDescription>
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

          {/* The ledger, filtered — the argument for which button to press (D86).
              The old dialog offered Inspection and Restock as bare choices and
              let the crew guess which the aircraft needed. */}
          {belowPar.length > 0 ? (
            <div className="rounded-md border border-border overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 bg-muted/60 border-b border-border">
                <span className="text-xs font-semibold uppercase tracking-wide text-primary">
                  Below par on arrival
                </span>
                <span className="text-xs text-muted-foreground">{belowPar.length} lines</span>
              </div>
              <div className="max-h-40 overflow-y-auto">
                {belowPar.slice(0, 8).map(row => (
                  <div
                    key={row.item.id}
                    className="flex items-center gap-3 px-3 py-1.5 border-b border-border/60 last:border-0"
                  >
                    <span className="flex-1 min-w-0 text-sm truncate">{row.item.itemName}</span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {row.onBoard}/{row.par}
                    </span>
                    <span
                      className={cn(
                        'w-16 text-right text-xs font-semibold tabular-nums',
                        row.onBoard <= 0 ? 'text-destructive' : 'text-amber-600 dark:text-amber-400',
                      )}
                    >
                      short {row.short}
                    </span>
                  </div>
                ))}
              </div>
              {belowPar.length > 8 && (
                <p className="px-3 py-1.5 text-xs text-muted-foreground bg-muted/40 border-t border-border">
                  and {belowPar.length - 8} more
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Everything came back at or above par — nothing to restock.
            </p>
          )}
        </div>
        <DialogFooter className="flex-col gap-2">
          {belowPar.length > 0 ? (
            <Button onClick={onStartReplenish} className="w-full">
              <Package className="mr-2 h-4 w-4" />
              Restock {belowPar.length} line{belowPar.length === 1 ? '' : 's'}
            </Button>
          ) : (
            <Button onClick={onStartReplenish} variant="outline" className="w-full">
              <Package className="mr-2 h-4 w-4" />
              Restock Aircraft
            </Button>
          )}
          <Button onClick={onStartInspection} variant="outline" className="w-full">
            <ClipboardCheck className="mr-2 h-4 w-4" />
            Start Inspection
            <span className="ml-1 text-xs text-muted-foreground">full count</span>
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
          <DialogDescription className="text-muted-foreground">
            This will mark {trip.tailNumber} as returned and begin the return-to-baseline process.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2 text-sm">
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
  const [selectedCompartment, setSelectedCompartment] = useState<string | null>(null);
  const [showNextLeg, setShowNextLeg] = useState(false);
  const [showTripComplete, setShowTripComplete] = useState(false);
  const [showConfirmComplete, setShowConfirmComplete] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const [showManageQuickAdd, setShowManageQuickAdd] = useState(false);
  const [screen, setScreen] = useState<'trip' | 'add-stock' | 'end-leg'>('trip');
  const [discrepancy, setDiscrepancy] = useState('');
  // Which side of the source switch the sheet opens on. Both entry points reach
  // the same sheet — "Pull from Commissary" and "Restore Stock" were never two
  // jobs, only two defaults (D86).
  const [stockSource, setStockSource] = useState<StockSource>('commissary');
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const undoToastRef = useRef<string | number | undefined>(undefined);

  // Persist view mode preference
  useEffect(() => {
    localStorage.setItem('inv2-trip-view-mode', view);
  }, [view]);

  // Legacy entry point: the end-of-leg review used to be its own route and
  // handed the last leg back here through ?confirmComplete=1. The review is a
  // state of this screen now (D86), but an old link can still carry the param.
  // open the same confirm dialog the footer button uses, then strip the param
  // so refresh/back doesn't re-trigger it.
  useEffect(() => {
    if (searchParams.get('confirmComplete') === '1' && trip.status === 'active') {
      setShowConfirmComplete(true);
      const next = new URLSearchParams(searchParams);
      next.delete('confirmComplete');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams, trip.status]);

  const activeLeg = trip.legs.find(l => l.status === 'active') ?? null;
  const activeLegIndex = trip.legs.findIndex(l => l.status === 'active');
  const isLastLeg = activeLegIndex === trip.legs.length - 1;
  // The pre-planned leg immediately after the active one, if the trip was booked
  // with more legs. Drives the "Next Leg: X→Y" fork disclosure on the ground.
  const plannedNextLeg = !isLastLeg && activeLegIndex >= 0 ? trip.legs[activeLegIndex + 1] : null;
  const aircraftType = trip.aircraftType;
  const phase: LegPhase = activeLeg?.phase ?? 'complete';

  const phaseColors = LEG_PHASE_COLORS[phase];

  // NOTE: the completed-trip early return lives AFTER all hooks below — moving
  // it here would skip later hooks and break the Rules of Hooks when a trip
  // transitions to 'completed' mid-render.

  // ─── Quick Count Logic ──────────────────────────────────────────────────

  // Compartment and Category used to filter on par + search only, while Quick Tap
  // filtered `isConsumable !== false` inside QuickTapView — 149 items vs 98 on the
  // G650, so switching view changed the list under the user (TL-43). One shared
  // definition now, in loggableItems.ts.
  const filteredItems = useMemo(
    () => selectLoggableItems({ items: state.items, aircraftType, activeLeg, search }),
    [state.items, aircraftType, activeLeg, search],
  );

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
    return getOnBoardQty(trip, item.id, item.defaultQuantities[aircraftType] ?? 0);
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

  // ─── The stock ledger (D86) ───────────────────────────────────────────────
  // One set of numbers, arranged three ways. `filteredItems` stays the logging
  // list (TL-43) and the ledger is built over exactly it, so every lens agrees.

  const ledgerRows = useMemo(
    () => buildLedgerRows({ items: filteredItems, trip, leg: activeLeg, aircraftType }),
    [filteredItems, trip, activeLeg, aircraftType],
  );

  const compartmentGroups = useMemo(
    () => groupByCompartment(ledgerRows, compartments),
    [ledgerRows, compartments],
  );
  const compartmentChips = useMemo(
    () => compartmentGroups.map(g => ({ id: g.id, label: g.label, count: g.rowCount })),
    [compartmentGroups],
  );
  // The picked compartment can fall out of the list when a search narrows it —
  // fall back to the first that still has rows rather than rendering nothing.
  const activeCompartmentId =
    compartmentChips.find(c => c.id === selectedCompartment)?.id ?? compartmentChips[0]?.id;
  const activeCompartment = compartmentGroups.find(g => g.id === activeCompartmentId);

  const categoryGroups = useMemo(() => groupByCategory(ledgerRows), [ledgerRows]);
  const categoryChips = useMemo(
    () => categoryGroups.map(g => ({ id: g.id, label: g.label, count: g.rowCount })),
    [categoryGroups],
  );
  const visibleCategoryGroups = useMemo(
    () => (selectedCategory === 'all' ? categoryGroups : categoryGroups.filter(g => g.id === selectedCategory)),
    [categoryGroups, selectedCategory],
  );

  const favoriteRows = useMemo(
    () => ledgerRows.filter(r => isFavorite(r.item.id)),
    [ledgerRows, isFavorite],
  );

  // What the aircraft is short when the trip closes — computed over the WHOLE
  // stocked list, not the search-narrowed one, so a stray search cannot shrink
  // the restock list.
  const belowPar = useMemo(
    () => belowParRows(buildLedgerRows({ items: state.items, trip, leg: activeLeg, aircraftType })),
    [state.items, trip, activeLeg, aircraftType],
  );

  // ─── Grocery list item count ──────────────────────────────────────────────

  const groceryItemCount = useMemo(() => {
    return state.groceryLists
      .filter(g => g.tripId === trip.id && g.status !== 'fulfilled')
      .reduce(
        (sum, g) => sum + g.items.filter(i => i.qtyFulfilled < i.qtyNeeded).length,
        0
      );
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
            Restock Aircraft
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

  // "Add Another Leg" — always available on the ground. Whether the trip already
  // has a pre-planned next leg or not, we now open NextLegDialog so the FA sees
  // (and can edit) the leg before advancing. Pre-planned legs pre-fill the form;
  // brand-new legs start blank. No more silent auto-advance.
  function handleAddOrAdvanceLeg() {
    setShowNextLeg(true);
  }

  // Advance into an existing pre-planned leg, applying any edits the FA made in
  // the dialog first, then completing the current leg and activating the next.
  function handleConfirmPlannedLeg(data: { origin: string; destination: string; date: string; paxCount: number }) {
    if (!activeLeg || !plannedNextLeg) return;
    dispatch({
      type: 'UPDATE_LEG',
      payload: {
        tripId: trip.id,
        leg: { ...plannedNextLeg, ...data },
      },
    });
    dispatch({ type: 'ADVANCE_TO_NEXT_LEG', payload: trip.id });
    setShowNextLeg(false);
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

  // ─── Closing a leg (D86) ─────────────────────────────────────────────────
  // Was a route of its own; it is a state of this screen now. Same dispatches.

  function handleGenerateGroceryList() {
    if (!activeLeg) return;
    const existing = state.groceryLists.find(g => g.tripId === trip.id && g.legId === activeLeg.id);
    if (existing) {
      navigate('grocery-list');
      return;
    }
    const usageRows = activeLeg.usageLog.filter(e => e.qtyUsed > 0);
    dispatch({
      type: 'ADD_GROCERY_LIST',
      payload: {
        id: `gl-${crypto.randomUUID()}`,
        tripId: trip.id,
        legId: activeLeg.id,
        tailNumber: trip.tailNumber,
        status: 'draft',
        items: usageRows.map(e => ({
          id: crypto.randomUUID(),
          itemId: e.itemId,
          qtyNeeded: e.qtyUsed,
          qtyFulfilled: 0,
        })),
        generatedAt: new Date().toISOString(),
        generatedBy: state.currentUser.name,
      },
    });
    navigate('grocery-list');
  }

  function handleCompleteLegFromReview() {
    if (!activeLeg) return;
    if (discrepancy.trim()) {
      dispatch({
        type: 'ADD_TRIP_NOTE',
        payload: {
          tripId: trip.id,
          note: {
            id: `tn-${crypto.randomUUID()}`,
            tripId: trip.id,
            legId: activeLeg.id,
            text: `⚠️ Discrepancy: ${discrepancy.trim()}`,
            author: state.currentUser.name,
            createdAt: new Date().toISOString(),
          },
        },
      });
      setDiscrepancy('');
    }
    setScreen('trip');
    if (isLastLeg) {
      // The old route bounced back through ?confirmComplete=1 to reach this
      // dialog. Same screen now, so it is just a call.
      setShowConfirmComplete(true);
    } else {
      // ADVANCE_TO_NEXT_LEG completes the active leg itself — dispatching
      // COMPLETE_LEG first leaves its reducer no active leg to find.
      dispatch({ type: 'ADVANCE_TO_NEXT_LEG', payload: trip.id });
    }
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
    // Mark the final leg's status completed too — keeps leg state identical to
    // the end-of-leg review's entry point and lets REOPEN_TRIP (undo) find it.
    dispatch({ type: 'COMPLETE_LEG', payload: { tripId: trip.id, legId: activeLeg.id } });
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
  if (screen === 'end-leg' && activeLeg) {
    return (
      <EndLegReview
        trip={trip}
        leg={activeLeg}
        rows={ledgerRows}
        isLastLeg={isLastLeg}
        discrepancy={discrepancy}
        onDiscrepancyChange={setDiscrepancy}
        onIncrement={handleIncrement}
        onDecrement={handleDecrement}
        onGenerateGroceryList={handleGenerateGroceryList}
        onComplete={handleCompleteLegFromReview}
        onBack={() => setScreen('trip')}
      />
    );
  }

  if (screen === 'add-stock') {
    return (
      <AddStockSheet
        trip={trip}
        leg={activeLeg}
        lens={view === 'category' ? 'category' : 'compartment'}
        initialSource={stockSource}
        onBack={() => setScreen('trip')}
      />
    );
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
            {/* Pull from Commissary has its prominent CTA in the pre_flight footer;
                keep a persistent, plainly-labeled entry here for the other phases. */}
            {activeLeg && phase !== 'pre_flight' && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5"
                onClick={() => { setStockSource('commissary'); setScreen('add-stock'); }}
              >
                <Package size={14} />
                <span className="hidden sm:inline">Pull from Commissary</span>
                <span className="sm:hidden">Pull</span>
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
                {view === 'quick-tap' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 gap-1.5 text-xs text-muted-foreground hover:text-foreground ml-auto"
                    onClick={() => setShowManageQuickAdd(true)}
                  >
                    <Pencil size={13} />
                    Edit
                  </Button>
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
                  isFavorite={isFavorite}
                  onToggleFavorite={toggleFavorite}
                />
              )}

              {/* ── Compartment lens (D86) ──
                  A PICKER, not eight stacked headings: Forward Galley alone is 61
                  of the G650's 149 lines, so grouping on its own reduced nothing.
                  You stand in one compartment at a time, and the item's own
                  `location` is the shelf inside it. */}
              {view === 'compartment' && (
                <div className="space-y-3">
                  <div className="flex gap-2 flex-wrap">
                    {compartmentChips.map(chip => (
                      <button
                        key={chip.id}
                        onClick={() => setSelectedCompartment(chip.id)}
                        className={cn(
                          'flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-medium transition-colors border',
                          chip.id === activeCompartmentId
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-card text-muted-foreground border-border hover:text-foreground'
                        )}
                      >
                        {chip.label}
                        <span className={cn(
                          'rounded-full px-1.5 text-[10px]',
                          chip.id === activeCompartmentId ? 'bg-white/20' : 'bg-muted'
                        )}>
                          {chip.count}
                        </span>
                      </button>
                    ))}
                  </div>

                  <Card className="bg-card border-border overflow-hidden">
                    <LedgerHeader />
                    {favoriteRows.length > 0 && (
                      <>
                        <div className="flex items-center gap-2 px-4 py-1.5 bg-amber-500/10 border-b border-border">
                          <Star size={12} className="fill-amber-400 text-amber-400" />
                          <span className="text-xs font-semibold uppercase tracking-wide text-amber-500">Pinned</span>
                        </div>
                        {favoriteRows.map(row => (
                          <LedgerRow
                            key={`fav-${row.item.id}`}
                            row={row}
                            onIncrement={() => handleIncrement(row.item)}
                            onDecrement={() => handleDecrement(row.item)}
                            selected={selectedIndex === filteredItems.findIndex(i => i.id === row.item.id)}
                            starred
                            onToggleStar={() => toggleFavorite(row.item.id)}
                          />
                        ))}
                      </>
                    )}
                    {activeCompartment?.sections.map(section => (
                      <div key={section.key}>
                        <LedgerSectionHeader
                          label={section.label}
                          note={`${section.rows.length} item${section.rows.length === 1 ? '' : 's'}`}
                        />
                        {section.rows.map(row => (
                          <LedgerRow
                            key={row.item.id}
                            row={row}
                            onIncrement={() => handleIncrement(row.item)}
                            onDecrement={() => handleDecrement(row.item)}
                            selected={selectedIndex === filteredItems.findIndex(i => i.id === row.item.id)}
                            starred={isFavorite(row.item.id)}
                            onToggleStar={() => toggleFavorite(row.item.id)}
                          />
                        ))}
                      </div>
                    ))}
                    {!activeCompartment && (
                      <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                        No items match your search.
                      </div>
                    )}
                  </Card>
                </div>
              )}

              {/* ── Category lens (D86) — same ledger, grouped by supply type ── */}
              {view === 'category' && (
                <div className="space-y-3">
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {[{ id: 'all', label: 'All', count: ledgerRows.length }, ...categoryChips].map(chip => (
                      <button
                        key={chip.id}
                        onClick={() => setSelectedCategory(chip.id)}
                        className={cn(
                          'flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-colors border',
                          selectedCategory === chip.id
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-card text-muted-foreground border-border hover:text-foreground'
                        )}
                      >
                        {chip.label}
                        <span className={cn(
                          'rounded-full px-1.5 text-[10px]',
                          selectedCategory === chip.id ? 'bg-white/20' : 'bg-muted'
                        )}>
                          {chip.count}
                        </span>
                      </button>
                    ))}
                  </div>

                  <Card className="bg-card border-border overflow-hidden">
                    <LedgerHeader />
                    {visibleCategoryGroups.map(group => (
                      <div key={group.id}>
                        <LedgerSectionHeader
                          label={group.label}
                          note={group.usedTotal > 0 ? `${group.usedTotal} used` : undefined}
                        />
                        {group.sections[0].rows.map(row => (
                          <LedgerRow
                            key={row.item.id}
                            row={row}
                            onIncrement={() => handleIncrement(row.item)}
                            onDecrement={() => handleDecrement(row.item)}
                            selected={selectedIndex === filteredItems.findIndex(i => i.id === row.item.id)}
                            starred={isFavorite(row.item.id)}
                            onToggleStar={() => toggleFavorite(row.item.id)}
                          />
                        ))}
                      </div>
                    ))}
                    {visibleCategoryGroups.length === 0 && (
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
            {/* on_ground secondary row: Grocery List + Restore Stock — visually
                subordinate to the primary decision row below (smaller, ghost, muted). */}
            {phase === 'on_ground' && (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1 h-10 relative text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => navigate('grocery-list')}
                >
                  <ShoppingCart className="mr-1.5 h-3.5 w-3.5" />
                  Grocery List
                  {groceryItemCount > 0 && (
                    <span className="ml-1.5 bg-amber-500 text-background text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                      {groceryItemCount}
                    </span>
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1 h-10 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => { setStockSource('road'); setScreen('add-stock'); }}
                >
                  <Package className="mr-1.5 h-3.5 w-3.5" />
                  Restore Stock
                </Button>
              </div>
            )}

            {/* Primary action row */}
            <div className="flex items-center gap-3">
              {/* pre_flight: Pull from Commissary (the moment to load up) + Start Flight */}
              {phase === 'pre_flight' && (
                <div className="flex flex-col gap-2 w-full">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => { setStockSource('commissary'); setScreen('add-stock'); }}
                  >
                    <Package className="mr-2 h-4 w-4" />
                    Pull from Commissary
                  </Button>
                  <Button
                    className="w-full"
                    onClick={handleStartFlight}
                  >
                    <Plane className="mr-2 h-4 w-4" />
                    Start Flight
                  </Button>
                </div>
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
                    onClick={() => setScreen('end-leg')}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Review Leg
                  </Button>
                  <Button
                    className="flex-1 bg-amber-600 hover:bg-amber-500"
                    onClick={handleAddOrAdvanceLeg}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    {plannedNextLeg
                      ? `Next Leg: ${plannedNextLeg.origin || '—'}→${plannedNextLeg.destination || '—'}`
                      : 'Add Another Leg'}
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
          onSubmit={plannedNextLeg ? handleConfirmPlannedLeg : handleAddNextLeg}
          onSkip={handleSkipNextLeg}
          lastDestination={activeLeg.destination}
          editLeg={plannedNextLeg ?? undefined}
        />
      )}

      <ConfirmCompleteDialog
        open={showConfirmComplete}
        onClose={() => setShowConfirmComplete(false)}
        onConfirm={handleConfirmCompleteTrip}
        trip={trip}
      />

      <TripCompleteDialog
        belowPar={belowPar}
        open={showTripComplete}
        onClose={() => {
          setShowTripComplete(false);
          navigate('/inventory-v2/trips');
        }}
        trip={trip}
        onStartReplenish={handleStartReplenish}
        onStartInspection={handleStartInspection}
      />

      <ManageQuickAddDialog
        open={showManageQuickAdd}
        onOpenChange={setShowManageQuickAdd}
      />
    </div>
  );
}
