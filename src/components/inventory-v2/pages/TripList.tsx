import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plane, Plus, Calendar, Users, ChevronRight, ChevronDown, X } from 'lucide-react';
import { Card, CardContent } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Input } from '../../ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../ui/dialog';
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
    if (!origin.trim() || !destination.trim()) return;
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

  const isValid = origin.trim() && destination.trim();

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
          <Button onClick={handleSubmit} disabled={!isValid}>
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
  onStartTrip,
}: {
  aircraft: FleetAircraft;
  activeTrip: Trip | undefined;
  onStartTrip: () => void;
}) {
  const navigate = useNavigate();
  const activeLeg = activeTrip?.legs.find(l => l.status === 'active');

  function handleClick() {
    if (activeTrip) {
      navigate(`/inventory-v2/trips/${activeTrip.id}`);
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
          : 'border-slate-700 hover:border-slate-500'
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
            activeTrip ? 'bg-amber-500/20' : 'bg-slate-800'
          )}>
            <Plane className={cn(
              'h-6 w-6',
              activeTrip ? 'text-amber-400' : 'text-slate-500'
            )} />
          </div>
        </div>

        {activeTrip && activeLeg ? (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-sm font-mono text-amber-400">
              <span>{activeLeg.origin}</span>
              <span className="text-muted-foreground">→</span>
              <span>{activeLeg.destination}</span>
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
        ) : (
          <p className="text-sm text-muted-foreground">No active trip</p>
        )}

        <div className="flex items-center justify-end">
          {activeTrip ? (
            <span className="text-xs text-amber-400 flex items-center gap-1">
              Open <ChevronRight className="h-3 w-3" />
            </span>
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
      className="w-full flex items-center gap-3 px-4 py-3 border-b border-slate-800 last:border-0 hover:bg-slate-800/50 transition-colors text-left"
    >
      <Badge className="shrink-0 text-xs font-mono bg-slate-800 text-slate-300 border border-slate-700">
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
      <Badge className={cn('shrink-0 text-xs', colors.bg, colors.text, 'border', colors.border)}>
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

  const completedTrips = state.trips
    .filter(t => t.status !== 'active')
    .sort((a, b) => b.startDate.localeCompare(a.startDate));

  function getActiveTrip(tailNumber: string): Trip | undefined {
    return state.trips.find(t => t.tailNumber === tailNumber && t.status === 'active');
  }

  function handleStartTrip(aircraft: FleetAircraft) {
    setSelectedAircraft(aircraft);
    setShowDialog(true);
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
    const newTrip: Trip = {
      id: tripId,
      tailNumber: data.tailNumber,
      aircraftType: data.aircraftType,
      tripName: data.tripName || undefined,
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
        phase: 'in_flight',
        usageLog: [],
        notes: [],
      }],
      notes: [],
      createdBy: state.currentUser.name,
      createdAt: new Date().toISOString(),
    };

    dispatch({ type: 'ADD_TRIP', payload: newTrip });
    setShowDialog(false);
    setSelectedAircraft(null);
    navigate(`/inventory-v2/trips/${tripId}`);
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
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
            onStartTrip={() => handleStartTrip(aircraft)}
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
