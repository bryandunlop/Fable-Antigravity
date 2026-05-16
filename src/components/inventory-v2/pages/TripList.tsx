import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plane, Plus, MapPin, Calendar, Users, ChevronRight, X } from 'lucide-react';
import { Card, CardContent } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Input } from '../../ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/select';
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
import { TRIP_STATUS_COLORS, FLEET_V2 } from '../constants';
import type { Trip } from '../types';

// ─── Leg Row for New Trip Dialog ─────────────────────────────────────────────

interface LegFormData {
  origin: string;
  destination: string;
  date: string;
  paxCount: number;
}

function LegRow({
  leg,
  index,
  onChange,
  onRemove,
  canRemove,
}: {
  leg: LegFormData;
  index: number;
  onChange: (index: number, field: keyof LegFormData, value: string | number) => void;
  onRemove: (index: number) => void;
  canRemove: boolean;
}) {
  return (
    <div className="flex items-start gap-2 py-2">
      <span className="mt-2 w-6 shrink-0 text-center text-xs text-muted-foreground font-medium">
        {index + 1}
      </span>
      <div className="flex flex-1 flex-wrap gap-2">
        <Input
          placeholder="Origin (e.g. KPBI)"
          value={leg.origin}
          onChange={e => onChange(index, 'origin', e.target.value.toUpperCase())}
          className="w-[100px] uppercase"
          maxLength={4}
        />
        <Input
          placeholder="Destination"
          value={leg.destination}
          onChange={e => onChange(index, 'destination', e.target.value.toUpperCase())}
          className="w-[100px] uppercase"
          maxLength={4}
        />
        <Input
          type="date"
          value={leg.date}
          onChange={e => onChange(index, 'date', e.target.value)}
          className="w-[145px]"
        />
        <Input
          type="number"
          placeholder="Pax"
          value={leg.paxCount}
          min={0}
          max={19}
          onChange={e => onChange(index, 'paxCount', parseInt(e.target.value, 10) || 0)}
          className="w-[70px]"
        />
      </div>
      {canRemove && (
        <button
          type="button"
          onClick={() => onRemove(index)}
          className="mt-1.5 rounded p-1 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

// ─── New Trip Dialog ──────────────────────────────────────────────────────────

function NewTripDialog({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    tailNumber: string;
    aircraftType: 'G650' | 'G500';
    tripName: string;
    tripNumber: string;
    legs: LegFormData[];
  }) => void;
}) {
  const [tailNumber, setTailNumber] = useState('');
  const [tripName, setTripName] = useState('');
  const [tripNumber, setTripNumber] = useState('');
  const [legs, setLegs] = useState<LegFormData[]>([
    { origin: '', destination: '', date: '', paxCount: 0 },
  ]);

  function handleLegChange(index: number, field: keyof LegFormData, value: string | number) {
    setLegs(prev => prev.map((l, i) => (i === index ? { ...l, [field]: value } : l)));
  }

  function addLeg() {
    setLegs(prev => [...prev, { origin: '', destination: '', date: '', paxCount: 0 }]);
  }

  function removeLeg(index: number) {
    setLegs(prev => prev.filter((_, i) => i !== index));
  }

  function handleSubmit() {
    const fleet = FLEET_V2.find(f => f.tailNumber === tailNumber);
    if (!fleet || !tripName.trim() || !tripNumber.trim()) return;
    onSubmit({
      tailNumber: fleet.tailNumber,
      aircraftType: fleet.type,
      tripName: tripName.trim(),
      tripNumber: tripNumber.trim(),
      legs,
    });
    // Reset
    setTailNumber('');
    setTripName('');
    setTripNumber('');
    setLegs([{ origin: '', destination: '', date: '', paxCount: 0 }]);
  }

  const isValid = tailNumber && tripName.trim() && tripNumber.trim() && legs.length > 0;

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>New Trip</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Aircraft */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Aircraft</label>
            <Select value={tailNumber} onValueChange={setTailNumber}>
              <SelectTrigger>
                <SelectValue placeholder="Select aircraft…" />
              </SelectTrigger>
              <SelectContent>
                {FLEET_V2.map(f => (
                  <SelectItem key={f.tailNumber} value={f.tailNumber}>
                    {f.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Trip Name */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Trip Name</label>
            <Input
              placeholder="e.g. East Coast Swing"
              value={tripName}
              onChange={e => setTripName(e.target.value)}
            />
          </div>

          {/* Trip Number */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Trip Number</label>
            <Input
              placeholder="e.g. TRP-2026-0042"
              value={tripNumber}
              onChange={e => setTripNumber(e.target.value)}
            />
          </div>

          {/* Legs */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Legs</label>
              <div className="flex items-start gap-5 ml-8 text-[10px] text-muted-foreground">
                <span className="w-[100px]">Origin</span>
                <span className="w-[100px]">Destination</span>
                <span className="w-[145px]">Date</span>
                <span className="w-[70px]">Pax</span>
              </div>
            </div>
            <div className="divide-y">
              {legs.map((leg, i) => (
                <LegRow
                  key={i}
                  leg={leg}
                  index={i}
                  onChange={handleLegChange}
                  onRemove={removeLeg}
                  canRemove={legs.length > 1}
                />
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-1 w-full text-xs"
              onClick={addLeg}
            >
              <Plus className="mr-1 h-3 w-3" />
              Add Leg
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid}>
            Create Trip
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Trip Card ────────────────────────────────────────────────────────────────

function TripCard({ trip }: { trip: Trip }) {
  const navigate = useNavigate();
  const colors = TRIP_STATUS_COLORS[trip.status];
  const activeLeg = trip.legs.find(l => l.status === 'active');
  const completedLegs = trip.legs.filter(l => l.status === 'completed').length;
  const currentLegNumber = activeLeg?.legNumber ?? completedLegs;

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  return (
    <Card
      onClick={() => navigate(`/inventory-v2/trips/${trip.id}`)}
      className="hover:border-slate-600 cursor-pointer transition-colors"
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          {/* Left: trip info */}
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Tail badge */}
              <Badge
                className={`shrink-0 text-xs font-mono ${
                  trip.status === 'active'
                    ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                    : 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                }`}
              >
                <Plane className="mr-1 h-3 w-3" />
                {trip.tailNumber}
              </Badge>
              {/* Status badge */}
              <Badge
                className={`shrink-0 text-xs ${colors.bg} ${colors.text} border ${colors.border}`}
              >
                {colors.label}
              </Badge>
            </div>

            {/* Trip name + number */}
            <div>
              <p className="font-semibold leading-tight">{trip.tripName}</p>
              <p className="text-xs text-muted-foreground font-mono">{trip.tripNumber}</p>
            </div>

            {/* Meta row */}
            <div className="flex items-center gap-4 flex-wrap text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {formatDate(trip.startDate)}
                {trip.endDate && ` — ${formatDate(trip.endDate)}`}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                Leg {currentLegNumber} of {trip.legs.length}
              </span>
            </div>

            {/* Active leg route */}
            {activeLeg && (
              <div className="flex items-center gap-1 text-xs text-amber-400 font-mono">
                <Plane className="h-3 w-3 shrink-0" />
                Leg {activeLeg.legNumber}: {activeLeg.origin} → {activeLeg.destination}
                {activeLeg.paxCount > 0 && (
                  <span className="ml-2 flex items-center gap-0.5 text-muted-foreground">
                    <Users className="h-3 w-3" />
                    {activeLeg.paxCount}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Right: chevron */}
          <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function TripList() {
  const { state, dispatch } = useInventoryV2();
  const navigate = useNavigate();

  const [filterTail, setFilterTail] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'completed'>('all');
  const [showDialog, setShowDialog] = useState(false);

  // Filter
  const filtered = state.trips
    .filter(t => filterTail === 'all' || t.tailNumber === filterTail)
    .filter(t => filterStatus === 'all' || t.status === filterStatus);

  // Active pinned to top, then sort by startDate desc within each group
  const sorted = [
    ...filtered
      .filter(t => t.status === 'active')
      .sort((a, b) => b.startDate.localeCompare(a.startDate)),
    ...filtered
      .filter(t => t.status !== 'active')
      .sort((a, b) => b.startDate.localeCompare(a.startDate)),
  ];

  function handleCreateTrip(data: {
    tailNumber: string;
    aircraftType: 'G650' | 'G500';
    tripName: string;
    tripNumber: string;
    legs: LegFormData[];
  }) {
    const now = Date.now();
    const newTrip: Trip = {
      id: `trip-${now}`,
      tailNumber: data.tailNumber,
      aircraftType: data.aircraftType,
      tripName: data.tripName,
      tripNumber: data.tripNumber,
      status: 'active',
      startDate: data.legs[0]?.date || new Date().toISOString().split('T')[0],
      legs: data.legs.map((l, i) => ({
        id: `leg-${now}-${i}`,
        tripId: `trip-${now}`,
        legNumber: i + 1,
        origin: l.origin,
        destination: l.destination,
        date: l.date,
        paxCount: l.paxCount,
        status: i === 0 ? 'active' : 'upcoming',
        usageLog: [],
        notes: [],
      })),
      notes: [],
      createdBy: state.currentUser.name,
      createdAt: new Date().toISOString(),
    };

    dispatch({ type: 'ADD_TRIP', payload: newTrip });
    setShowDialog(false);
    navigate(`/inventory-v2/trips/${newTrip.id}`);
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <OfflineBanner />

      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">Trips</h1>
          <V2Badge variant="v2" size="md" />
        </div>
        <Button onClick={() => setShowDialog(true)} size="sm">
          <Plus className="mr-1.5 h-4 w-4" />
          New Trip
        </Button>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={filterTail} onValueChange={setFilterTail}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Aircraft" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Aircraft</SelectItem>
            {FLEET_V2.map(f => (
              <SelectItem key={f.tailNumber} value={f.tailNumber}>
                {f.displayName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Status pills */}
        <div className="flex gap-2">
          {(['all', 'active', 'completed'] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors border ${
                filterStatus === s
                  ? 'bg-purple-500/20 text-purple-400 border-purple-500/40'
                  : 'bg-transparent text-muted-foreground border-slate-700 hover:border-slate-500'
              }`}
            >
              {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Trip list */}
      {sorted.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-14">
            <Plane className="mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm font-medium text-muted-foreground">No trips found</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Adjust your filters or create a new trip.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sorted.map(trip => (
            <TripCard key={trip.id} trip={trip} />
          ))}
        </div>
      )}

      {/* New Trip Dialog */}
      <NewTripDialog
        open={showDialog}
        onClose={() => setShowDialog(false)}
        onSubmit={handleCreateTrip}
      />
    </div>
  );
}
