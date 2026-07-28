import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plane, Plus, Calendar, Users, ChevronRight, ChevronDown, X } from 'lucide-react';
import { Card, CardContent } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Input } from '../../ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../ui/dialog';
import { loadMyairopsTripMirrors } from '../../../integration/myairops/scheduleSource';
import { resolveLegForTail } from '../../../integration/myairops/legResolver';
import type { LegResolution, ResolvedLeg } from '../../../integration/myairops/legResolver';
import { adoptMyairopsTrip, findAdoptedTrip, formatLegRoute, formatLegTiming } from '../legAdoption';
import { useInventoryV2 } from '../InventoryV2Context';
import { OfflineBanner } from '../shared/OfflineBanner';
import { V2Badge } from '../shared/V2Badge';
import { TRIP_STATUS_COLORS } from '../constants';
import { cn } from '../../ui/utils';
import type { Trip, FleetAircraft } from '../types';

// ─── New Trip Dialog (simplified — just first leg) ──────────────────────────

function NewTripDialog({
  open,
  onClose,
  onSubmit,
  aircraft,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    tailNumber: string;
    aircraftType: 'G650' | 'G500';
    tripName: string;
    tripNumber: string;
    origin: string;
    destination: string;
    date: string;
    paxCount: number;
  }) => void;
  aircraft: FleetAircraft;
}) {
  const [tripName, setTripName] = useState('');
  const [tripNumber, setTripNumber] = useState('');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [paxCount, setPaxCount] = useState(0);

  function resetForm() {
    setTripName('');
    setTripNumber('');
    setOrigin('');
    setDestination('');
    setDate(new Date().toISOString().split('T')[0]);
    setPaxCount(0);
  }

  function handleSubmit() {
    onSubmit({
      tailNumber: aircraft.tailNumber,
      aircraftType: aircraft.type,
      tripName: tripName.trim(),
      tripNumber: tripNumber.trim(),
      origin: origin.trim().toUpperCase(),
      destination: destination.trim().toUpperCase(),
      date,
      paxCount,
    });
    resetForm();
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plane className="h-5 w-5 text-amber-400" />
            Start Trip — {aircraft.tailNumber}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Origin</label>
              <Input
                placeholder="KPBI"
                value={origin}
                onChange={e => setOrigin(e.target.value.toUpperCase())}
                className="uppercase font-mono"
                maxLength={4}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Destination</label>
              <Input
                placeholder="KTEB"
                value={destination}
                onChange={e => setDestination(e.target.value.toUpperCase())}
                className="uppercase font-mono"
                maxLength={4}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Date</label>
              <Input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Passengers</label>
              <Input
                type="number"
                placeholder="0"
                value={paxCount}
                min={0}
                max={19}
                onChange={e => setPaxCount(parseInt(e.target.value, 10) || 0)}
              />
            </div>
          </div>

          <details className="group">
            <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
              Optional: Trip name & number
            </summary>
            <div className="mt-3 space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Trip Name</label>
                <Input
                  placeholder="e.g. East Coast Swing"
                  value={tripName}
                  onChange={e => setTripName(e.target.value)}
                  className="text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Trip Number</label>
                <Input
                  placeholder="e.g. TRP-2026-0042"
                  value={tripNumber}
                  onChange={e => setTripNumber(e.target.value)}
                  className="text-sm"
                />
              </div>
            </div>
          </details>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            Start Trip
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Aircraft Card ──────────────────────────────────────────────────────────

function AircraftCard({
  aircraft,
  activeTrip,
  resolution,
  onStartTrip,
  onAdoptLeg,
  onPickLeg,
  lastInspection,
  stockStatus,
}: {
  aircraft: FleetAircraft;
  activeTrip: Trip | undefined;
  resolution: LegResolution | undefined;
  onStartTrip: () => void;
  onAdoptLeg: (resolved: ResolvedLeg) => void;
  onPickLeg: () => void;
  lastInspection?: { readinessScore: number; date: string } | null;
  stockStatus: { status: 'stocked' | 'attention'; count: number };
}) {
  const navigate = useNavigate();
  const activeLeg = activeTrip?.legs.find(l => l.status === 'active');
  // Only offer the schedule when no trip is already running on this tail — mid-trip, the
  // trip you are in wins over whatever the schedule thinks.
  const resolved = activeTrip ? null : resolution?.primary ?? null;
  const hasOtherLegs = !!resolution && resolution.candidates.length > 1;

  function handleClick() {
    if (activeTrip) {
      navigate(`/inventory-v2/trips/${activeTrip.id}`);
    } else if (resolved) {
      onAdoptLeg(resolved);
    } else {
      onStartTrip();
    }
  }

  return (
    <Card
      onClick={handleClick}
      className={cn(
        'cursor-pointer transition-all hover:scale-[1.02]',
        activeTrip
          ? 'border-amber-500/40 bg-amber-500/5 hover:border-amber-500/60'
          : resolved
            ? 'border-sky-500/40 bg-sky-500/5 hover:border-sky-500/60'
            : 'border-border hover:border-primary/40'
      )}
    >
      <CardContent className="p-5 space-y-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold font-mono tracking-tight">{aircraft.tailNumber}</h2>
            <Badge className="bg-blue-500/15 text-blue-400 border border-blue-500/30 text-xs">
              {aircraft.type}
            </Badge>
          </div>
          <div className={cn(
            'p-2.5 rounded-xl',
            activeTrip ? 'bg-amber-500/20' : resolved ? 'bg-sky-500/20' : 'bg-muted'
          )}>
            <Plane className={cn(
              'h-6 w-6',
              activeTrip ? 'text-amber-400' : resolved ? 'text-sky-400' : 'text-slate-500'
            )} />
          </div>
        </div>

        {activeTrip && activeLeg ? (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-sm font-mono text-amber-400">
              <span>{activeLeg.origin || '—'}</span>
              <span className="text-muted-foreground">→</span>
              <span>{activeLeg.destination || '—'}</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {activeLeg.paxCount} pax
              </span>
              <span>Leg {activeLeg.legNumber} of {activeTrip.legs.length}</span>
            </div>
            {activeTrip.tripName && (
              <p className="text-xs text-muted-foreground truncate">{activeTrip.tripName}</p>
            )}
          </div>
        ) : resolved ? (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-sm font-mono text-sky-400">
              <span>{resolved.leg.departureIcao}</span>
              <span className="text-muted-foreground">→</span>
              <span>{resolved.leg.arrivalIcao}</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {resolved.leg.paxCount} pax
              </span>
              {/* Scheduled, not actual — the time and its age are always on screen so a
                  stale answer is visible rather than trusted (D53). */}
              <span>{formatLegTiming(resolved)}</span>
            </div>
            <p className="text-xs text-muted-foreground truncate">
              From myairops · {resolved.trip.tripNumber}
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No active trip</p>
        )}

        {/* Fleet readiness */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className={cn(
              'w-2 h-2 rounded-full',
              stockStatus.status === 'stocked' ? 'bg-emerald-400' : 'bg-amber-400'
            )} />
            <span className="text-muted-foreground">
              {stockStatus.status === 'stocked'
                ? 'Stocked'
                : `${stockStatus.count} item${stockStatus.count === 1 ? '' : 's'} requested`}
            </span>
          </div>
          {lastInspection ? (
            <span className="text-muted-foreground">
              {lastInspection.readinessScore}% · {new Date(lastInspection.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          ) : (
            <span className="text-muted-foreground">No inspection</span>
          )}
        </div>

        <div className="flex items-center justify-end gap-3">
          {activeTrip ? (
            <span className="text-xs text-amber-400 flex items-center gap-1">
              Open <ChevronRight className="h-3 w-3" />
            </span>
          ) : resolved ? (
            <>
              {hasOtherLegs && (
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); onPickLeg(); }}
                  className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
                >
                  Not this leg?
                </button>
              )}
              <span className="text-xs text-sky-400 flex items-center gap-1">
                Open leg <ChevronRight className="h-3 w-3" />
              </span>
            </>
          ) : (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Plus className="h-3 w-3" /> Start Trip
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Leg Picker ─────────────────────────────────────────────────────────────
// The correction path. Resolution is inferred from a SCHEDULE, so saying "no, that
// one" has to be one tap — otherwise a late trip forces the user back to typing.

function LegPickerDialog({
  aircraft,
  resolution,
  onPick,
  onManual,
  onClose,
}: {
  aircraft: FleetAircraft;
  resolution: LegResolution | undefined;
  onPick: (resolved: ResolvedLeg) => void;
  onManual: () => void;
  onClose: () => void;
}) {
  const candidates = resolution?.candidates ?? [];

  return (
    <Dialog open onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plane className="h-5 w-5 text-sky-400" />
            Which leg? — {aircraft.tailNumber}
          </DialogTitle>
          <DialogDescription>
            Scheduled legs from myairops within a day of now. Times are scheduled, not actual.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-1">
          {candidates.map(candidate => (
            <button
              key={candidate.leg.id}
              type="button"
              onClick={() => onPick(candidate)}
              className="w-full rounded-md border border-border px-3 py-2.5 text-left transition-colors hover:border-sky-500/60 hover:bg-sky-500/5"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-sm text-sky-400">{formatLegRoute(candidate)}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{candidate.leg.paxCount} pax</span>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {formatLegTiming(candidate)} · {candidate.trip.tripNumber}
              </p>
            </button>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onManual}>Enter a trip manually</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Trip History Row ────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function TripHistoryRow({ trip }: { trip: Trip }) {
  const navigate = useNavigate();
  const colors = TRIP_STATUS_COLORS[trip.status];

  return (
    <button
      onClick={() => navigate(`/inventory-v2/trips/${trip.id}`)}
      className="w-full flex items-center gap-3 px-4 py-3 border-b border-border last:border-0 hover:bg-muted/50 transition-colors text-left"
    >
      <Badge className="shrink-0 text-xs font-mono bg-muted text-muted-foreground border border-border">
        {trip.tailNumber}
      </Badge>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">
          {trip.tripName || `${trip.legs[0]?.origin} → ${trip.legs[trip.legs.length - 1]?.destination}`}
        </p>
        <p className="text-xs text-muted-foreground">
          {formatDate(trip.startDate)}
          {trip.endDate && ` — ${formatDate(trip.endDate)}`}
          {' · '}
          {trip.legs.length} leg{trip.legs.length !== 1 ? 's' : ''}
        </p>
      </div>
      <Badge className={cn('shrink-0 text-xs status-badge', colors.className)}>
        {colors.label}
      </Badge>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </button>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function TripList() {
  const { state, dispatch } = useInventoryV2();
  const navigate = useNavigate();

  const [showDialog, setShowDialog] = useState(false);
  const [selectedAircraft, setSelectedAircraft] = useState<FleetAircraft | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [pickerFor, setPickerFor] = useState<FleetAircraft | null>(null);

  // Pinned at mount so the cards don't re-resolve under the user mid-tap. The page is
  // remounted on navigation, which is often enough for a turn.
  const [nowIso] = useState(() => new Date().toISOString());

  const mirrors = useMemo(() => loadMyairopsTripMirrors(nowIso), [nowIso]);

  const resolutions = useMemo(() => {
    const map = new Map<string, LegResolution>();
    state.fleet.forEach(a => map.set(a.tailNumber, resolveLegForTail(mirrors, a.tailNumber, nowIso)));
    return map;
  }, [mirrors, state.fleet, nowIso]);

  const completedTrips = state.trips
    .filter(t => t.status !== 'active')
    .sort((a, b) => b.startDate.localeCompare(a.startDate));

  function getActiveTrip(tailNumber: string): Trip | undefined {
    return state.trips.find(t => t.tailNumber === tailNumber && t.status === 'active');
  }

  function getLastInspection(tailNumber: string) {
    const completed = state.inspections
      .filter(i => i.tailNumber === tailNumber && (i.status === 'submitted' || i.status === 'restocked'))
      .sort((a, b) => (b.submittedAt ?? b.date).localeCompare(a.submittedAt ?? a.date));
    if (!completed.length) return null;
    return { readinessScore: completed[0].readinessScore, date: completed[0].submittedAt ?? completed[0].date };
  }

  // Aircraft is "Stocked" (at baseline) by default; only shows attention when
  // there are open unit item requests for that tail (something actually needed).
  function getStockStatus(tailNumber: string): { status: 'stocked' | 'attention'; count: number } {
    const count = state.unitItemRequests
      .filter(r => r.unitTailNumber === tailNumber &&
                   (r.status === 'open' || r.status === 'in_progress'))
      .reduce((n, r) => n + r.items.length, 0);
    return { status: count > 0 ? 'attention' : 'stocked', count };
  }

  function handleStartTrip(aircraft: FleetAircraft) {
    setSelectedAircraft(aircraft);
    setShowDialog(true);
  }

  // Adopting the schedule instead of retyping it. Idempotent on the myairops trip
  // reference: a second tap opens the trip already adopted rather than making a twin.
  function handleAdoptLeg(aircraft: FleetAircraft, resolved: ResolvedLeg) {
    setPickerFor(null);

    const existing = findAdoptedTrip(state.trips, resolved.trip);
    if (existing) {
      navigate(`/inventory-v2/trips/${existing.id}`);
      return;
    }

    const trip = adoptMyairopsTrip(resolved, {
      aircraftType: aircraft.type,
      createdBy: state.currentUser.name,
      nowIso: new Date().toISOString(),
    });
    dispatch({ type: 'ADD_TRIP', payload: trip });
    navigate(`/inventory-v2/trips/${trip.id}`);
  }

  function handleCreateTrip(data: {
    tailNumber: string;
    aircraftType: 'G650' | 'G500';
    tripName: string;
    tripNumber: string;
    origin: string;
    destination: string;
    date: string;
    paxCount: number;
  }) {
    const now = Date.now();
    const tripId = `trip-${now}`;
    const tripDate = data.date || new Date().toISOString().split('T')[0];
    // All fields are optional — fall back to a readable auto name when blank.
    const autoName = `${data.tailNumber} · ${tripDate}`;
    const newTrip: Trip = {
      id: tripId,
      tailNumber: data.tailNumber,
      aircraftType: data.aircraftType,
      tripName: data.tripName || autoName,
      tripNumber: data.tripNumber || undefined,
      status: 'active',
      startDate: data.date || new Date().toISOString().split('T')[0],
      legs: [{
        id: `leg-${now}-0`,
        tripId,
        legNumber: 1,
        origin: data.origin,
        destination: data.destination,
        date: data.date,
        paxCount: data.paxCount,
        status: 'active',
        phase: 'pre_flight',
        usageLog: [],
        notes: [],
      }],
      notes: [],
      loadItems: [],
      returnItems: [],
      createdBy: state.currentUser.name,
      createdAt: new Date().toISOString(),
    };

    dispatch({ type: 'ADD_TRIP', payload: newTrip });
    setShowDialog(false);
    setSelectedAircraft(null);
    navigate(`/inventory-v2/trips/${tripId}`);
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6 animate-in fade-in duration-200">
      <OfflineBanner />

      {/* Header */}
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-bold">Fleet</h1>
        <V2Badge variant="v2" size="md" />
      </div>

      {/* Aircraft Grid */}
      <div className="grid grid-cols-2 gap-3">
        {state.fleet.map(aircraft => (
          <AircraftCard
            key={aircraft.tailNumber}
            aircraft={aircraft}
            activeTrip={getActiveTrip(aircraft.tailNumber)}
            resolution={resolutions.get(aircraft.tailNumber)}
            onStartTrip={() => handleStartTrip(aircraft)}
            onAdoptLeg={resolved => handleAdoptLeg(aircraft, resolved)}
            onPickLeg={() => setPickerFor(aircraft)}
            lastInspection={getLastInspection(aircraft.tailNumber)}
            stockStatus={getStockStatus(aircraft.tailNumber)}
          />
        ))}
      </div>

      {/* Trip History */}
      {completedTrips.length > 0 && (
        <div>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full"
          >
            <ChevronDown className={cn(
              'h-4 w-4 transition-transform',
              !showHistory && '-rotate-90'
            )} />
            Trip History ({completedTrips.length})
          </button>

          {showHistory && (
            <Card className="mt-2 overflow-hidden">
              {completedTrips.map(trip => (
                <TripHistoryRow key={trip.id} trip={trip} />
              ))}
            </Card>
          )}
        </div>
      )}

      {/* Leg Picker — the "not this leg?" correction */}
      {pickerFor && (
        <LegPickerDialog
          aircraft={pickerFor}
          resolution={resolutions.get(pickerFor.tailNumber)}
          onPick={resolved => handleAdoptLeg(pickerFor, resolved)}
          onManual={() => { const a = pickerFor; setPickerFor(null); handleStartTrip(a); }}
          onClose={() => setPickerFor(null)}
        />
      )}

      {/* New Trip Dialog */}
      {selectedAircraft && (
        <NewTripDialog
          open={showDialog}
          onClose={() => { setShowDialog(false); setSelectedAircraft(null); }}
          onSubmit={handleCreateTrip}
          aircraft={selectedAircraft}
        />
      )}
    </div>
  );
}
