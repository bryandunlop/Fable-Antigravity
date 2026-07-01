import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '../ui/dialog';
import { Separator } from '../ui/separator';
import { Progress } from '../ui/progress';
import { Plus, Plane, ArrowLeft, Trash2, Send, ExternalLink } from 'lucide-react';
import { useSchedulingWorkspace } from './SchedulingWorkspaceContext';
import type { TripRecord, TripLegRecord } from '../../scheduling/store';
import type { TaskInstance, TaskAction, Readiness } from '../../scheduling/engine';
import { StatusBadge, AckBadge, TaskActionButtons, formatDueTime, groupByCategory } from './taskRowHelpers';
import { releaseSchedulingTripToPreflight, readPreflightSummary } from '../tech-log/bridge';

interface TripsPanelProps {
  userRole: string;
}

type TripType = TripRecord['tripType'];
type Priority = TripRecord['priority'];

function emptyLeg(sequence: number): TripLegRecord {
  return {
    id: `leg-${Date.now()}-${sequence}`,
    sequence,
    departureIcao: '',
    arrivalIcao: '',
    departureTimeUtc: '',
    paxCount: 1,
  };
}

function readinessBadgeClassName(state: Readiness['state']): string {
  switch (state) {
    case 'READY': return 'status-success';
    case 'BLOCKED': return 'status-error';
    case 'NOT_READY':
    default: return 'status-warning';
  }
}

export default function TripsPanel({ userRole }: TripsPanelProps) {
  const { service, store, tick, bump, nowUtc } = useSchedulingWorkspace();
  const navigate = useNavigate();
  const [trips, setTrips] = useState<TripRecord[]>([]);
  const [readinessByTrip, setReadinessByTrip] = useState<Record<string, Readiness>>({});
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [instances, setInstances] = useState<TaskInstance[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Create-trip form state
  const [tripNumber, setTripNumber] = useState('');
  const [sourceTripRef, setSourceTripRef] = useState('');
  const [tail, setTail] = useState('');
  const [aircraftType, setAircraftType] = useState('G650ER');
  const [tripType, setTripType] = useState<TripType>('domestic');
  const [priority, setPriority] = useState<Priority>('standard');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [legs, setLegs] = useState<TripLegRecord[]>([emptyLeg(1)]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    store.listTrips().then(async (rows) => {
      if (cancelled) return;
      setTrips(rows);
      const entries = await Promise.all(rows.map(async (t) => [t.id, await service.tripReadiness(t.id)] as const));
      if (cancelled) return;
      setReadinessByTrip(Object.fromEntries(entries));
    });
    return () => { cancelled = true; };
  }, [store, service, tick]);

  useEffect(() => {
    if (!selectedTripId) { setInstances([]); return; }
    let cancelled = false;
    store.listInstancesForTrip(selectedTripId).then((rows) => {
      if (!cancelled) setInstances(rows);
    });
    return () => { cancelled = true; };
  }, [store, selectedTripId, tick]);

  const selectedTrip = useMemo(() => trips.find((t) => t.id === selectedTripId) ?? null, [trips, selectedTripId]);
  const selectedReadiness = selectedTripId ? readinessByTrip[selectedTripId] : undefined;
  const preflight = useMemo(
    () => (selectedTrip ? readPreflightSummary(selectedTrip.tripNumber) : null),
    [selectedTrip, tick]
  );

  const grouped = useMemo(() => groupByCategory(instances), [instances]);

  function resetForm() {
    setTripNumber(''); setSourceTripRef(''); setTail(''); setAircraftType('G650ER');
    setTripType('domestic'); setPriority('standard'); setStartDate(''); setEndDate('');
    setLegs([emptyLeg(1)]);
    setFormError(null);
  }

  function updateLeg(index: number, patch: Partial<TripLegRecord>) {
    setLegs((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }

  function addLeg() {
    setLegs((prev) => [...prev, emptyLeg(prev.length + 1)]);
  }

  function removeLeg(index: number) {
    setLegs((prev) => prev.filter((_, i) => i !== index).map((l, i) => ({ ...l, sequence: i + 1 })));
  }

  async function handleCreateTrip() {
    setFormError(null);
    if (!tripNumber.trim() || !tail.trim() || !startDate || !endDate) {
      setFormError('Trip number, tail, start date, and end date are required.');
      return;
    }
    if (legs.some((l) => !l.departureIcao.trim() || !l.arrivalIcao.trim() || !l.departureTimeUtc)) {
      setFormError('Every leg needs a departure/arrival ICAO and a departure time.');
      return;
    }
    const id = `trip-${tripNumber.trim()}`;
    if (trips.some((t) => t.id === id)) {
      toast.error('A trip with that number already exists');
      return;
    }
    setSubmitting(true);
    try {
      const trip: TripRecord = {
        id,
        tripNumber: tripNumber.trim(),
        sourceSystem: 'manual',
        sourceTripRef: sourceTripRef.trim() || null,
        tail: tail.trim(),
        aircraftType,
        tripType,
        priority,
        status: 'planning',
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        legs: legs.map((l) => ({ ...l, departureTimeUtc: new Date(l.departureTimeUtc).toISOString() })),
        createdBy: userRole,
        createdAtUtc: nowUtc(),
      };
      const { trip: created } = await service.createTripMirror(trip, nowUtc());
      bump();
      setSelectedTripId(created.id);
      setDialogOpen(false);
      resetForm();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create trip');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAction(instanceId: string, action: TaskAction) {
    try {
      await service.applyAction(instanceId, action, userRole, nowUtc());
      bump();
    } catch (err) {
      toast.error(`Couldn't ${action.kind} task: ${err instanceof Error ? err.message : 'unknown error'}`);
    }
  }

  function handleReleaseToPreflight(trip: TripRecord) {
    try {
      const { createdAircraft } = releaseSchedulingTripToPreflight({
        tripNumber: trip.tripNumber,
        name: trip.tripNumber,
        tail: trip.tail,
        aircraftType: trip.aircraftType,
        createdByOid: userRole ?? 'scheduling',
        nowUtc: nowUtc(),
        legs: trip.legs.map((l) => ({
          sequence: l.sequence,
          departureIcao: l.departureIcao,
          arrivalIcao: l.arrivalIcao,
          departureTimeUtc: l.departureTimeUtc,
          arrivalTimeUtc: l.arrivalTimeUtc,
        })),
      });
      toast[createdAircraft ? 'warning' : 'success'](
        createdAircraft
          ? `Released — no fleet aircraft for ${trip.tail}, created a demo placeholder`
          : 'Released to preflight'
      );
      bump();
    } catch (err) {
      toast.error(`Couldn't release to preflight: ${err instanceof Error ? err.message : 'unknown error'}`);
    }
  }

  if (selectedTrip) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setSelectedTripId(null)}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back to trips
            </Button>
          </div>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Plane className="h-5 w-5" /> {selectedTrip.tripNumber} · {selectedTrip.tail}
              </CardTitle>
              <CardDescription>
                {selectedTrip.aircraftType} · {selectedTrip.tripType} · {selectedTrip.priority} · {selectedTrip.status}
              </CardDescription>
              {selectedReadiness && (
                <p className="text-xs text-muted-foreground mt-1">
                  Coordination: {selectedReadiness.state} · Preflight: {preflight ? preflight.overall : 'not released'}
                </p>
              )}
            </div>
            {selectedReadiness && (
              <div className="text-right space-y-1">
                <span className={`status-badge ${readinessBadgeClassName(selectedReadiness.state)}`}>{selectedReadiness.state}</span>
                <div className="w-40">
                  <Progress value={selectedReadiness.completion * 100} />
                </div>
                {selectedReadiness.blocker && (
                  <p className="text-xs text-destructive">Blocked by: {selectedReadiness.blocker}</p>
                )}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="text-sm font-semibold mb-2">Legs</h3>
            <div className="space-y-1 text-sm text-muted-foreground">
              {selectedTrip.legs.map((leg) => (
                <div key={leg.id}>
                  Leg {leg.sequence}: {leg.departureIcao} → {leg.arrivalIcao} · dep {formatDueTime(leg.departureTimeUtc)} · {leg.paxCount} pax
                </div>
              ))}
            </div>
          </div>
          <Separator />
          <div>
            <div className="flex items-center justify-between gap-4 flex-wrap mb-2">
              <h3 className="text-sm font-semibold">Preflight</h3>
              {preflight === null ? (
                <Button size="sm" onClick={() => handleReleaseToPreflight(selectedTrip)}>
                  <Send className="h-3.5 w-3.5 mr-1.5" /> Release to preflight
                </Button>
              ) : (
                <Button variant="outline" size="sm" onClick={() => navigate('/tech-log/trips/' + preflight.techLogTripId)}>
                  Open preflight <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
                </Button>
              )}
            </div>
            {preflight === null ? (
              <p className="text-sm text-muted-foreground">
                Not yet released. Releasing projects this trip into the crew's tech-log preflight flow (FRAT, airport review, fuel).
              </p>
            ) : (
              <div className="space-y-2">
                <span className={`status-badge ${preflight.overall === 'READY' ? 'status-success' : 'status-warning'}`}>
                  Preflight: {preflight.overall}
                </span>
                <div className="space-y-1.5">
                  {preflight.legs.map((leg) => (
                    <div key={leg.sequence} className="flex items-center justify-between gap-4 border rounded-md p-2.5 text-sm">
                      <span className="text-foreground">
                        Leg {leg.sequence}: {leg.departureIcao} → {leg.arrivalIcao}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className={`status-badge ${leg.fratStatus === 'COMPLETED' ? 'status-success' : leg.fratStatus === 'IN_PROGRESS' ? 'status-info' : 'status-warning'}`}>
                          FRAT {leg.fratStatus === 'COMPLETED' ? (leg.fratScore ?? '✓') : leg.fratStatus.replace('_', ' ').toLowerCase()}
                        </span>
                        <span className={`status-badge ${leg.airportReviewed ? 'status-success' : 'status-warning'}`}>
                          {leg.airportReviewed ? 'Airport reviewed' : 'Airport not reviewed'}
                        </span>
                        <span className={leg.fuelSubmitted ? 'status-badge status-success' : 'text-xs text-muted-foreground px-2'}>
                          {leg.fuelSubmitted ? 'Fuel submitted' : '—'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <Separator />
          <div className="space-y-6">
            <h3 className="text-sm font-semibold">Checklist</h3>
            {instances.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No checklist instantiated for this trip type yet (only "domestic" templates are seeded in this slice).
              </p>
            ) : (
              grouped.map(([category, rows]) => (
                <div key={category} className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {category.replace(/-/g, ' ')}
                  </h4>
                  <div className="space-y-2">
                    {rows.map((inst) => (
                      <div key={inst.id} className="flex items-center justify-between gap-4 border rounded-md p-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-foreground">{inst.title}</span>
                            <StatusBadge status={inst.status} />
                            {inst.requiresAck && <AckBadge ackState={inst.ackState} />}
                          </div>
                          <div className="text-xs mt-1 text-muted-foreground">
                            Owner: {inst.ownerRole} · Due {formatDueTime(inst.dueAtUtc)}
                            {inst.handoffTarget && ` · Hands off to ${inst.handoffTarget.value}`}
                          </div>
                        </div>
                        <TaskActionButtons instance={inst} onAction={(a) => handleAction(inst.id, a)} />
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Trips</CardTitle>
          <CardDescription>Create or mirror a trip to instantiate its checklist</CardDescription>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> New / mirror trip</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create / mirror a trip</DialogTitle>
              <DialogDescription>
                Stands in for the myairops pull (Phase 2). sourceTripRef is the MAO trip number.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="tripNumber">Trip number</Label>
                  <Input id="tripNumber" value={tripNumber} onChange={(e) => setTripNumber(e.target.value)} placeholder="T-2026-0142" />
                </div>
                <div>
                  <Label htmlFor="sourceTripRef">myairops ref (optional)</Label>
                  <Input id="sourceTripRef" value={sourceTripRef} onChange={(e) => setSourceTripRef(e.target.value)} placeholder="MAO-9931" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="tail">Tail</Label>
                  <Input id="tail" value={tail} onChange={(e) => setTail(e.target.value)} placeholder="N650PG" />
                </div>
                <div>
                  <Label htmlFor="aircraftType">Aircraft type</Label>
                  <Select value={aircraftType} onValueChange={setAircraftType}>
                    <SelectTrigger id="aircraftType"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="G650ER">G650ER</SelectItem>
                      <SelectItem value="G500">G500</SelectItem>
                      <SelectItem value="G800">G800</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="tripType">Trip type</Label>
                  <Select value={tripType} onValueChange={(v: string) => setTripType(v as TripType)}>
                    <SelectTrigger id="tripType"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="domestic">Domestic</SelectItem>
                      <SelectItem value="international">International</SelectItem>
                      <SelectItem value="dca_dassp">DCA/DASSP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <Select value={priority} onValueChange={(v: string) => setPriority(v as Priority)}>
                    <SelectTrigger id="priority"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">Standard</SelectItem>
                      <SelectItem value="vip">VIP</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="startDate">Start date</Label>
                  <Input id="startDate" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="endDate">End date</Label>
                  <Input id="endDate" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
              </div>

              <Separator />
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Legs</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addLeg}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add leg
                  </Button>
                </div>
                {legs.map((leg, i) => (
                  <div key={leg.id} className="border rounded-md p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">Leg {leg.sequence}</span>
                      {legs.length > 1 && (
                        <Button type="button" variant="ghost" size="sm" onClick={() => removeLeg(i)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        placeholder="Departure ICAO (KLUK)"
                        value={leg.departureIcao}
                        onChange={(e) => updateLeg(i, { departureIcao: e.target.value.toUpperCase() })}
                      />
                      <Input
                        placeholder="Arrival ICAO (KJFK)"
                        value={leg.arrivalIcao}
                        onChange={(e) => updateLeg(i, { arrivalIcao: e.target.value.toUpperCase() })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="datetime-local"
                        value={leg.departureTimeUtc}
                        onChange={(e) => updateLeg(i, { departureTimeUtc: e.target.value })}
                      />
                      <Input
                        type="number"
                        min={0}
                        placeholder="Pax count"
                        value={leg.paxCount}
                        onChange={(e) => updateLeg(i, { paxCount: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {formError && <p className="text-sm text-destructive">{formError}</p>}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateTrip} disabled={submitting}>
                {submitting ? 'Creating...' : 'Create trip'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {trips.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <Plane className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No trips yet.</p>
            <p className="text-sm">Create or mirror a trip to instantiate its checklist.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {trips.map((trip) => {
              const readiness = readinessByTrip[trip.id];
              return (
                <button
                  key={trip.id}
                  type="button"
                  onClick={() => setSelectedTripId(trip.id)}
                  className="w-full text-left flex items-center justify-between gap-4 border rounded-md p-3 hover:bg-accent transition-colors"
                >
                  <div>
                    <div className="font-medium text-foreground flex items-center gap-2">
                      <Plane className="h-4 w-4 text-muted-foreground" />
                      {trip.tripNumber} · {trip.tail}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {trip.aircraftType} · {trip.tripType} · {trip.priority} · {trip.status}
                    </div>
                  </div>
                  {readiness && (
                    <span className={`status-badge ${readinessBadgeClassName(readiness.state)}`}>{readiness.state}</span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
