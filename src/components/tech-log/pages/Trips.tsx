import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Route as RouteIcon, Plus, Plane, Lock, Unlock } from 'lucide-react';
import { useTechLog, useCurrentUser } from '../TechLogContext';
import { currentRows } from '../engine/supersede';
import { newId } from '../util/id';
import type { Trip, FlightLog } from '../types';
import { TechLogShell } from '../components/TechLogShell';
import { Card, CardContent } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';

function aggregate(flights: FlightLog[]) {
  const block = Math.round(flights.reduce((s, f) => s + f.blockTime, 0) * 10) / 10;
  const flight = Math.round(flights.reduce((s, f) => s + f.flightTime, 0) * 10) / 10;
  const landings = flights.reduce((s, f) => s + f.landings, 0);
  const dates = flights.map(f => f.flightDateUtc).sort();
  return { block, flight, landings, sectors: flights.length, first: dates[0], last: dates[dates.length - 1] };
}

export default function Trips() {
  const { state, dispatch } = useTechLog();
  const user = useCurrentUser();
  const dispatchable = state.aircraft.filter(a => !a.isProvisional);

  const [open, setOpen] = useState(false);
  const [tail, setTail] = useState(dispatchable[0]?.tailNumber ?? '');
  const [name, setName] = useState('');
  const [addSectorTrip, setAddSectorTrip] = useState<Trip | null>(null);
  const [sectorPick, setSectorPick] = useState('');

  const tailOf = (id: string) => state.aircraft.find(a => a.id === id)?.tailNumber ?? '—';
  const flightById = (id: string) => state.flightLogs.find(f => f.id === id);
  const assignedFlightIds = useMemo(() => new Set(state.trips.flatMap(t => t.flightLogIds)), [state.trips]);
  const trips = state.trips.slice().sort((a, b) => b.createdAtUtc.localeCompare(a.createdAtUtc));

  const create = () => {
    if (!tail || !name.trim()) return toast.error('Aircraft and a trip name are required.');
    const ac = state.aircraft.find(a => a.tailNumber === tail)!;
    const now = new Date().toISOString();
    const id = newId('trip');
    const trip: Trip = { id, tripNumber: `TRIP-${id.slice(-4).toUpperCase()}`, aircraftId: ac.id, name: name.trim(), status: 'OPEN', flightLogIds: [], createdByOid: user.oid, createdAtUtc: now };
    dispatch({ type: 'ADD_TRIP', payload: trip });
    dispatch({ type: 'ADD_AUDIT', payload: { id: newId('aud'), actorOid: user.oid, action: 'TRIP_CREATED', entityType: 'Trip', entityId: id, atUtc: now, summary: `${ac.tailNumber} trip ${trip.tripNumber} — ${trip.name}` } });
    setOpen(false); setName('');
    toast.success(`Trip ${trip.tripNumber} created — add sectors to it.`);
  };

  const availableSectors = (trip: Trip) =>
    currentRows(state.flightLogs)
      .filter(f => f.aircraftId === trip.aircraftId && !assignedFlightIds.has(f.id))
      .sort((a, b) => a.flightDateUtc.localeCompare(b.flightDateUtc));

  const addSector = () => {
    if (!addSectorTrip || !sectorPick) return;
    const updated: Trip = { ...addSectorTrip, flightLogIds: [...addSectorTrip.flightLogIds, sectorPick] };
    dispatch({ type: 'EDIT_TRIP', payload: updated });
    setAddSectorTrip(null); setSectorPick('');
    toast.success('Sector added to trip.');
  };

  const toggleStatus = (t: Trip) => {
    dispatch({ type: 'EDIT_TRIP', payload: { ...t, status: t.status === 'OPEN' ? 'CLOSED' : 'OPEN' } });
  };

  return (
    <TechLogShell
      title="Trips"
      subtitle="Optional multi-sector grouping over journey logs. Each per-sector log remains the authoritative record."
      actions={<Button size="sm" onClick={() => setOpen(true)}><Plus className="mr-1.5 h-4 w-4" /> New trip</Button>}
    >
      <div className="space-y-3">
        {trips.length === 0 && <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">No trips yet. Group sectors into a trip for a roll-up view.</CardContent></Card>}
        {trips.map(t => {
          const flights = t.flightLogIds.map(flightById).filter(Boolean) as FlightLog[];
          const agg = aggregate(flights);
          return (
            <Card key={t.id}>
              <CardContent className="p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <RouteIcon className="h-4 w-4 text-muted-foreground" />
                      <span className="font-semibold">{t.tripNumber}</span>
                      <span className="font-semibold">{tailOf(t.aircraftId)}</span>
                      <Badge variant={t.status === 'OPEN' ? 'secondary' : 'outline'}>{t.status}</Badge>
                    </div>
                    <p className="mt-1 text-sm">{t.name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {agg.sectors} sector(s) · block {agg.block}h · flight {agg.flight}h · {agg.landings} ldg
                      {agg.first ? ` · ${new Date(agg.first).toLocaleDateString()}${agg.last && agg.last !== agg.first ? `–${new Date(agg.last).toLocaleDateString()}` : ''}` : ''}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    {t.status === 'OPEN' && <Button size="sm" variant="outline" onClick={() => { setAddSectorTrip(t); setSectorPick(''); }}><Plus className="mr-1.5 h-4 w-4" /> Add sector</Button>}
                    <Button size="sm" variant="ghost" onClick={() => toggleStatus(t)}>
                      {t.status === 'OPEN' ? <><Lock className="mr-1.5 h-4 w-4" /> Close</> : <><Unlock className="mr-1.5 h-4 w-4" /> Reopen</>}
                    </Button>
                  </div>
                </div>
                {flights.length > 0 && (
                  <div className="mt-3 space-y-1 border-t pt-2">
                    {flights.sort((a, b) => a.flightDateUtc.localeCompare(b.flightDateUtc)).map(f => (
                      <div key={f.id} className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5"><Plane className="h-3 w-3" /> Sector #{f.sectorSequence} · {f.outUtc.slice(11, 16)}–{f.inUtc.slice(11, 16)}</span>
                        <span className="shrink-0">{f.blockTime}h block / {f.flightTime}h flight</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* New trip */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><RouteIcon className="h-4 w-4" /> New trip</DialogTitle>
            <DialogDescription>A trip groups multiple journey-log sectors under one parent.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div>
              <Label>Aircraft</Label>
              <Select value={tail} onValueChange={(v: string) => setTail(v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{dispatchable.map(a => <SelectItem key={a.id} value={a.tailNumber}>{a.tailNumber} · {a.type}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Trip name</Label><Input className="mt-1" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. KLUK–EGGW–LFPB round trip" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={create}>Create trip</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add sector */}
      <Dialog open={!!addSectorTrip} onOpenChange={o => !o && setAddSectorTrip(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add sector to {addSectorTrip?.tripNumber}</DialogTitle>
            <DialogDescription>Only unassigned journey-log sectors for {addSectorTrip ? tailOf(addSectorTrip.aircraftId) : ''} are listed.</DialogDescription>
          </DialogHeader>
          {addSectorTrip && (
            <Select value={sectorPick} onValueChange={(v: string) => setSectorPick(v)}>
              <SelectTrigger><SelectValue placeholder="Select a sector" /></SelectTrigger>
              <SelectContent>
                {availableSectors(addSectorTrip).map(f => (
                  <SelectItem key={f.id} value={f.id}>#{f.sectorSequence} · {new Date(f.flightDateUtc).toLocaleDateString()} · {f.flightTime}h</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {addSectorTrip && availableSectors(addSectorTrip).length === 0 && <p className="text-xs text-muted-foreground">No unassigned sectors for this aircraft.</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddSectorTrip(null)}>Cancel</Button>
            <Button onClick={addSector} disabled={!sectorPick}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TechLogShell>
  );
}
