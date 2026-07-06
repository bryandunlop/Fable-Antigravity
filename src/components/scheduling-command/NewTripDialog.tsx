import { useState } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Separator } from '../ui/separator';
import { useSchedulingWorkspace } from '../scheduling-workspace/SchedulingWorkspaceContext';
import type { TripRecord, TripLegRecord } from '../../scheduling/store';

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

/** Create/mirror a trip (stands in for the Phase-2 myairops pull). On create the engine
 *  instantiates the matching per-trip checklist; onCreated lets the hub open the new trip. */
export function NewTripDialog({
  open,
  onOpenChange,
  userRole,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  userRole: string;
  onCreated: (tripId: string) => void;
}) {
  const { service, bump, nowUtc, store } = useSchedulingWorkspace();

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

  function resetForm() {
    setTripNumber(''); setSourceTripRef(''); setTail(''); setAircraftType('G650ER');
    setTripType('domestic'); setPriority('standard'); setStartDate(''); setEndDate('');
    setLegs([emptyLeg(1)]);
    setFormError(null);
  }

  const updateLeg = (index: number, patch: Partial<TripLegRecord>) =>
    setLegs(prev => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  const addLeg = () => setLegs(prev => [...prev, emptyLeg(prev.length + 1)]);
  const removeLeg = (index: number) =>
    setLegs(prev => prev.filter((_, i) => i !== index).map((l, i) => ({ ...l, sequence: i + 1 })));

  async function handleCreateTrip() {
    setFormError(null);
    if (!tripNumber.trim() || !tail.trim() || !startDate || !endDate) {
      setFormError('Trip number, tail, start date, and end date are required.');
      return;
    }
    if (legs.some(l => !l.departureIcao.trim() || !l.arrivalIcao.trim() || !l.departureTimeUtc)) {
      setFormError('Every leg needs a departure/arrival ICAO and a departure time.');
      return;
    }
    const id = `trip-${tripNumber.trim()}`;
    if (await store.getTrip(id)) {
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
        legs: legs.map(l => ({ ...l, departureTimeUtc: new Date(l.departureTimeUtc).toISOString() })),
        createdBy: userRole,
        createdAtUtc: nowUtc(),
      };
      const { trip: created } = await service.createTripMirror(trip, nowUtc());
      bump();
      onOpenChange(false);
      resetForm();
      onCreated(created.id);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create trip');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) resetForm(); }}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New / mirror trip</DialogTitle>
          <DialogDescription>
            Stands in for the myairops pull (Phase 2). Creating the trip instantiates its checklist
            from the current published template.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="nt-tripNumber">Trip number</Label>
              <Input id="nt-tripNumber" value={tripNumber} onChange={e => setTripNumber(e.target.value)} placeholder="T-2026-0142" />
            </div>
            <div>
              <Label htmlFor="nt-sourceTripRef">myairops ref (optional)</Label>
              <Input id="nt-sourceTripRef" value={sourceTripRef} onChange={e => setSourceTripRef(e.target.value)} placeholder="MAO-9931" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="nt-tail">Tail</Label>
              <Input id="nt-tail" value={tail} onChange={e => setTail(e.target.value)} placeholder="N2PG" />
            </div>
            <div>
              <Label htmlFor="nt-aircraftType">Aircraft type</Label>
              <Select value={aircraftType} onValueChange={setAircraftType}>
                <SelectTrigger id="nt-aircraftType"><SelectValue /></SelectTrigger>
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
              <Label htmlFor="nt-tripType">Trip type</Label>
              <Select value={tripType} onValueChange={(v: string) => setTripType(v as TripType)}>
                <SelectTrigger id="nt-tripType"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="domestic">Domestic</SelectItem>
                  <SelectItem value="international">International</SelectItem>
                  <SelectItem value="dca_dassp">DCA/DASSP</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="nt-priority">Priority</Label>
              <Select value={priority} onValueChange={(v: string) => setPriority(v as Priority)}>
                <SelectTrigger id="nt-priority"><SelectValue /></SelectTrigger>
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
              <Label htmlFor="nt-startDate">Start date</Label>
              <Input id="nt-startDate" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="nt-endDate">End date</Label>
              <Input id="nt-endDate" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
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
                  <Input placeholder="Departure ICAO (KLUK)" value={leg.departureIcao}
                    onChange={e => updateLeg(i, { departureIcao: e.target.value.toUpperCase() })} />
                  <Input placeholder="Arrival ICAO (KJFK)" value={leg.arrivalIcao}
                    onChange={e => updateLeg(i, { arrivalIcao: e.target.value.toUpperCase() })} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input type="datetime-local" value={leg.departureTimeUtc}
                    onChange={e => updateLeg(i, { departureTimeUtc: e.target.value })} />
                  <Input type="number" min={0} placeholder="Pax count" value={leg.paxCount}
                    onChange={e => updateLeg(i, { paxCount: Number(e.target.value) })} />
                </div>
              </div>
            ))}
          </div>

          {formError && <p className="text-sm text-destructive">{formError}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleCreateTrip} disabled={submitting}>
            {submitting ? 'Creating…' : 'Create trip'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
