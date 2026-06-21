import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { PlaneTakeoff, Check, X, FilePlus, Download } from 'lucide-react';
import { useTechLog, useCurrentUser } from '../TechLogContext';
import { useIntegration } from '../integration/useIntegration';
import { currentRows } from '../engine/supersede';
import { newId } from '../util/id';
import type { FlightLog } from '../types';
import { TechLogShell } from '../components/TechLogShell';
import { SignCeremonyDialog } from '../components/SignCeremonyDialog';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';

const JOURNEY_INTENT = 'I certify this journey log entry is accurate and complete to the best of my knowledge.';

function hoursBetween(a: string, b: string): number {
  return Math.max(0, Math.round(((new Date(b).getTime() - new Date(a).getTime()) / 3600000) * 10) / 10);
}

export default function JourneyLog() {
  const [params] = useSearchParams();
  const { state, dispatch } = useTechLog();
  const user = useCurrentUser();
  const integration = useIntegration();
  const pilots = state.personnel.filter(p => p.role === 'PILOT');
  const dispatchable = state.aircraft.filter(a => !a.isProvisional);

  const [open, setOpen] = useState(false);
  const [signOpen, setSignOpen] = useState(false);
  const [pendingId, setPendingId] = useState('');

  const todayDate = new Date().toISOString().slice(0, 10);
  const [tail, setTail] = useState(params.get('tail') ?? dispatchable[0]?.tailNumber ?? '');
  const [date, setDate] = useState(todayDate);
  const [out, setOut] = useState('14:02');
  const [off, setOff] = useState('14:19');
  const [on, setOn] = useState('15:46');
  const [inn, setInn] = useState('15:53');
  const [landings, setLandings] = useState('1');
  const [cycles, setCycles] = useState('1');
  const [pic, setPic] = useState(pilots[0]?.oid ?? '');
  const [sic, setSic] = useState(pilots[1]?.oid ?? '');
  const [fuel, setFuel] = useState('');

  const iso = (t: string) => `${date}T${t}:00.000Z`;
  const oooi = [iso(out), iso(off), iso(on), iso(inn)];
  const monotonic = oooi[0] <= oooi[1] && oooi[1] <= oooi[2] && oooi[2] <= oooi[3];
  const crewDistinct = !!pic && !!sic && pic !== sic;
  const required = !!tail && !!date && !!out && !!off && !!on && !!inn && !!pic && !!sic;
  const valid = monotonic && crewDistinct && required;

  const flights = useMemo(
    () => currentRows(state.flightLogs).slice().sort((a, b) => b.flightDateUtc.localeCompare(a.flightDateUtc)),
    [state.flightLogs],
  );
  const tailOf = (id: string) => state.aircraft.find(a => a.id === id)?.tailNumber ?? '—';
  const nameOf = (oid: string) => state.personnel.find(p => p.oid === oid)?.displayName ?? oid;

  const doPrefill = () => {
    const p = integration.prefillFlight(tail, `${date}T00:00:00.000Z`);
    setOut(p.outUtc.slice(11, 16));
    setOff(p.offUtc.slice(11, 16));
    setOn(p.onUtc.slice(11, 16));
    setInn(p.inUtc.slice(11, 16));
    setLandings(String(p.landings));
    toast.success('Prefilled from myairops — review and sign.');
  };

  const beginSign = () => {
    if (!valid) return toast.error('Resolve the validation errors before signing.');
    setPendingId(newId('fl'));
    setSignOpen(true);
  };

  const onSigned = (sig: { id: string }) => {
    const ac = state.aircraft.find(a => a.tailNumber === tail)!;
    const flightTime = hoursBetween(oooi[1], oooi[2]);
    const blockTime = hoursBetween(oooi[0], oooi[3]);
    const cyc = Number(cycles) || 0;
    const seq = currentRows(state.flightLogs).filter(f => f.aircraftId === ac.id).length + 1;
    const flight: FlightLog = {
      id: pendingId, aircraftId: ac.id, sectorSequence: seq, flightDateUtc: iso(out),
      outUtc: oooi[0], offUtc: oooi[1], onUtc: oooi[2], inUtc: oooi[3],
      blockTime, flightTime, landings: Number(landings) || 0, cycles: cyc,
      picOid: pic, sicOid: sic, fuelUplift: fuel ? Number(fuel) : undefined,
      airframeTotalHours: Math.round((ac.airframeTotalHours + flightTime) * 10) / 10,
      airframeTotalCycles: ac.airframeTotalCycles + cyc, signatureId: sig.id,
    };
    dispatch({ type: 'ADD_SIGNATURE', payload: sig as any });
    dispatch({ type: 'ADD_FLIGHTLOG', payload: flight });
    dispatch({ type: 'EDIT_AIRCRAFT', payload: { ...ac, airframeTotalHours: flight.airframeTotalHours, airframeTotalCycles: flight.airframeTotalCycles } });
    dispatch({ type: 'ADD_AUDIT', payload: { id: newId('aud'), actorOid: user.oid, action: 'JOURNEY_SIGNED', entityType: 'FlightLog', entityId: flight.id, atUtc: new Date().toISOString(), summary: `${tail} sector ${seq}: ${flightTime}h flight, ${flight.landings} ldg` } });
    setOpen(false);
    toast.success(`Journey log signed — ${tail} airframe now ${flight.airframeTotalHours}h / ${flight.airframeTotalCycles} cyc.`);
  };

  const Gate = ({ ok, label }: { ok: boolean; label: string }) => (
    <div className={`flex items-center gap-1.5 text-xs ${ok ? 'text-[var(--gfo-success,#00B140)]' : 'text-[var(--gfo-error,#EF3340)]'}`}>
      {ok ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />} {label}
    </div>
  );

  return (
    <TechLogShell
      title="Journey Log"
      subtitle="Per-sector flight record (OOOI, hours, cycles, crew) with point-of-entry validation."
      actions={<Button size="sm" onClick={() => setOpen(true)}><FilePlus className="mr-1.5 h-4 w-4" /> New entry</Button>}
    >
      <div className="space-y-3">
        {flights.length === 0 && <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">No journey log entries yet.</CardContent></Card>}
        {flights.map(f => (
          <Card key={f.id}>
            <CardContent className="grid grid-cols-2 gap-2 p-4 text-sm md:grid-cols-6">
              <div><div className="text-xs text-muted-foreground">Aircraft</div><div className="font-medium">{tailOf(f.aircraftId)} · #{f.sectorSequence}</div></div>
              <div><div className="text-xs text-muted-foreground">OOOI</div><div>{f.outUtc.slice(11, 16)}/{f.offUtc.slice(11, 16)}/{f.onUtc.slice(11, 16)}/{f.inUtc.slice(11, 16)}</div></div>
              <div><div className="text-xs text-muted-foreground">Block / Flight</div><div>{f.blockTime}h / {f.flightTime}h</div></div>
              <div><div className="text-xs text-muted-foreground">Ldg / Cyc</div><div>{f.landings} / {f.cycles}</div></div>
              <div><div className="text-xs text-muted-foreground">Crew</div><div className="truncate">{nameOf(f.picOid)} / {nameOf(f.sicOid)}</div></div>
              <div><div className="text-xs text-muted-foreground">Airframe</div><div>{f.airframeTotalHours}h</div></div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><PlaneTakeoff className="h-4 w-4" /> New journey log entry</DialogTitle>
            <DialogDescription>OOOI must be non-decreasing; PIC and SIC must differ.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Aircraft</Label>
                <Select value={tail} onValueChange={(v: string) => setTail(v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{dispatchable.map(a => <SelectItem key={a.id} value={a.tailNumber}>{a.tailNumber} · {a.type}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Date (UTC)</Label><Input type="date" className="mt-1" value={date} onChange={e => setDate(e.target.value)} /></div>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={doPrefill}>
              <Download className="mr-1.5 h-4 w-4" /> Prefill from myairops
            </Button>
            <div className="grid grid-cols-4 gap-2">
              <div><Label className="text-xs">Out</Label><Input type="time" className="mt-1" value={out} onChange={e => setOut(e.target.value)} /></div>
              <div><Label className="text-xs">Off</Label><Input type="time" className="mt-1" value={off} onChange={e => setOff(e.target.value)} /></div>
              <div><Label className="text-xs">On</Label><Input type="time" className="mt-1" value={on} onChange={e => setOn(e.target.value)} /></div>
              <div><Label className="text-xs">In</Label><Input type="time" className="mt-1" value={inn} onChange={e => setInn(e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label className="text-xs">Landings</Label><Input type="number" className="mt-1" value={landings} onChange={e => setLandings(e.target.value)} /></div>
              <div><Label className="text-xs">Cycles</Label><Input type="number" className="mt-1" value={cycles} onChange={e => setCycles(e.target.value)} /></div>
              <div><Label className="text-xs">Fuel uplift (lb)</Label><Input type="number" className="mt-1" value={fuel} onChange={e => setFuel(e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>PIC</Label>
                <Select value={pic} onValueChange={(v: string) => setPic(v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{pilots.map(p => <SelectItem key={p.oid} value={p.oid}>{p.displayName}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>SIC</Label>
                <Select value={sic} onValueChange={(v: string) => setSic(v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{pilots.map(p => <SelectItem key={p.oid} value={p.oid}>{p.displayName}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1 rounded-md border p-2">
              <Gate ok={required} label="All required fields present" />
              <Gate ok={monotonic} label="OOOI non-decreasing (out ≤ off ≤ on ≤ in)" />
              <Gate ok={crewDistinct} label="PIC and SIC are different people" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={beginSign} disabled={!valid}>Continue to sign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SignCeremonyDialog open={signOpen} onOpenChange={setSignOpen} signer={user} signedEntity="FLIGHT_LOG" signedEntityId={pendingId} intentStatement={JOURNEY_INTENT} onSigned={onSigned} title="Sign journey log" />
    </TechLogShell>
  );
}
