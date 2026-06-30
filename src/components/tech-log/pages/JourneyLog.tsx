import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { PlaneTakeoff, Check, X, FilePlus, Download, Pencil, Printer } from 'lucide-react';
import { useTechLog, useCurrentUser } from '../TechLogContext';
import { useIntegration } from '../integration/useIntegration';
import { currentRows } from '../engine/supersede';
import { canSupersede } from '../engine/authz';
import { INTENT } from '../constants';
import { printSignedRecord, mockPdfBlobUri } from '../util/printRecord';
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
  const [correctingId, setCorrectingId] = useState<string | null>(null);

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
  const [oil1, setOil1] = useState('');
  const [oil2, setOil2] = useState('');
  const [oilApu, setOilApu] = useState('');
  const [deIceType, setDeIceType] = useState<'' | 'I' | 'II' | 'III' | 'IV'>('');
  const [deIceFluid, setDeIceFluid] = useState('');
  const [deIceTime, setDeIceTime] = useState('');
  const [delayCode, setDelayCode] = useState('');
  const [delayMins, setDelayMins] = useState('');
  const [delayAta, setDelayAta] = useState('');

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

  const signerOf = (f: FlightLog) => state.signatures.find(s => s.id === f.signatureId)?.signerOid ?? '';

  const doPrefill = () => {
    const p = integration.prefillFlight(tail, `${date}T00:00:00.000Z`);
    setOut(p.outUtc.slice(11, 16));
    setOff(p.offUtc.slice(11, 16));
    setOn(p.onUtc.slice(11, 16));
    setInn(p.inUtc.slice(11, 16));
    setLandings(String(p.landings));
    toast.success('Prefilled from myairops — review and sign.');
  };

  const startNew = () => {
    setCorrectingId(null);
    setOpen(true);
  };

  // Open the form prefilled from an existing signed leg to file a correction (supersede).
  const openCorrect = (f: FlightLog) => {
    const auth = canSupersede(signerOf(f), user);
    if (!auth.ok) return toast.error(auth.error ?? 'Not authorized to correct this record.');
    const ac = state.aircraft.find(a => a.id === f.aircraftId);
    setTail(ac?.tailNumber ?? '');
    setDate(f.flightDateUtc.slice(0, 10));
    setOut(f.outUtc.slice(11, 16)); setOff(f.offUtc.slice(11, 16)); setOn(f.onUtc.slice(11, 16)); setInn(f.inUtc.slice(11, 16));
    setLandings(String(f.landings)); setCycles(String(f.cycles));
    setPic(f.picOid); setSic(f.sicOid);
    setFuel(f.fuelUplift != null ? String(f.fuelUplift) : '');
    setOil1(f.oilUplift?.eng1 != null ? String(f.oilUplift.eng1) : '');
    setOil2(f.oilUplift?.eng2 != null ? String(f.oilUplift.eng2) : '');
    setOilApu(f.oilUplift?.apu != null ? String(f.oilUplift.apu) : '');
    setDeIceType(f.deIce?.fluidType ?? ''); setDeIceFluid(f.deIce?.fluidName ?? ''); setDeIceTime(f.deIce?.startUtc ? f.deIce.startUtc.slice(11, 16) : '');
    setDelayCode(f.delayCode ?? ''); setDelayMins(f.delayMinutes != null ? String(f.delayMinutes) : ''); setDelayAta(f.delayAtaChapter ?? '');
    setCorrectingId(f.id);
    setOpen(true);
    if (auth.thirdParty) toast.info(`Filing a third-party correction as ${auth.relationship}. The original signer is recorded.`);
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
    const oilUplift =
      oil1 || oil2 || oilApu
        ? { eng1: oil1 ? Number(oil1) : undefined, eng2: oil2 ? Number(oil2) : undefined, apu: oilApu ? Number(oilApu) : undefined }
        : undefined;
    const deIce = deIceType ? { fluidType: deIceType, fluidName: deIceFluid.trim() || undefined, startUtc: deIceTime ? iso(deIceTime) : undefined } : undefined;
    const original = correctingId ? state.flightLogs.find(f => f.id === correctingId) : undefined;
    // A correction keeps the original sector + airframe snapshot (it fixes leg content, not the cumulative total).
    const seq = original ? original.sectorSequence : currentRows(state.flightLogs).filter(f => f.aircraftId === ac.id).length + 1;
    const flight: FlightLog = {
      id: pendingId, aircraftId: ac.id, tripId: original?.tripId, sectorSequence: seq, flightDateUtc: iso(out),
      outUtc: oooi[0], offUtc: oooi[1], onUtc: oooi[2], inUtc: oooi[3],
      blockTime, flightTime, landings: Number(landings) || 0, cycles: cyc,
      picOid: pic, sicOid: sic, fuelUplift: fuel ? Number(fuel) : undefined,
      oilUplift, deIce,
      delayCode: delayCode.trim() || undefined,
      delayMinutes: delayMins ? Number(delayMins) : undefined,
      delayAtaChapter: delayAta.trim() || undefined,
      airframeTotalHours: original ? original.airframeTotalHours : Math.round((ac.airframeTotalHours + flightTime) * 10) / 10,
      airframeTotalCycles: original ? original.airframeTotalCycles : ac.airframeTotalCycles + cyc,
      pdfBlobUri: mockPdfBlobUri('journey', pendingId),
      supersedesId: original?.id, signatureId: sig.id,
    };
    dispatch({ type: 'ADD_SIGNATURE', payload: sig as any });
    if (original) {
      dispatch({ type: 'SUPERSEDE_FLIGHTLOG', payload: flight });
      dispatch({ type: 'ADD_AUDIT', payload: { id: newId('aud'), actorOid: user.oid, action: 'JOURNEY_CORRECTED', entityType: 'FlightLog', entityId: flight.id, atUtc: new Date().toISOString(), summary: `${tail} sector ${seq} corrected (supersedes ${original.id})${signerOf(original) !== user.oid ? ' — third-party correction' : ''}` } });
      toast.success(`Correction signed — original retained, correction is now current.`);
    } else {
      dispatch({ type: 'ADD_FLIGHTLOG', payload: flight });
      // Cumulative airframe totals are an operational byproduct of signing this flight leg, not a
      // discretionary reference-data edit (CLAUDE.md SE-2 four-eyes applies to certs/RII/provisional
      // status, not to this) — direct EDIT_AIRCRAFT here is intentional, see TechLogContext.tsx.
      dispatch({ type: 'EDIT_AIRCRAFT', payload: { ...ac, airframeTotalHours: flight.airframeTotalHours, airframeTotalCycles: flight.airframeTotalCycles } });
      dispatch({ type: 'ADD_AUDIT', payload: { id: newId('aud'), actorOid: user.oid, action: 'JOURNEY_SIGNED', entityType: 'FlightLog', entityId: flight.id, atUtc: new Date().toISOString(), summary: `${tail} sector ${seq}: ${flightTime}h flight, ${flight.landings} ldg` } });
      toast.success(`Journey log signed — ${tail} airframe now ${flight.airframeTotalHours}h / ${flight.airframeTotalCycles} cyc.`);
    }
    setOpen(false);
    setCorrectingId(null);
  };

  const printFlight = (f: FlightLog) => {
    const ac = state.aircraft.find(a => a.id === f.aircraftId);
    const sig = state.signatures.find(s => s.id === f.signatureId);
    const extras: { label: string; value: string }[] = [];
    if (f.fuelUplift) extras.push({ label: 'Fuel uplift', value: `${f.fuelUplift} lb` });
    if (f.oilUplift) extras.push({ label: 'Oil uplift (qt)', value: `Eng1 ${f.oilUplift.eng1 ?? '—'} / Eng2 ${f.oilUplift.eng2 ?? '—'}${f.oilUplift.apu ? ` / APU ${f.oilUplift.apu}` : ''}` });
    if (f.deIce) extras.push({ label: 'De-ice', value: `Type ${f.deIce.fluidType}${f.deIce.fluidName ? ` · ${f.deIce.fluidName}` : ''}` });
    if (f.delayMinutes || f.delayCode) extras.push({ label: 'Delay', value: `${f.delayCode ?? ''} ${f.delayMinutes ?? 0}m${f.delayAtaChapter ? ` · ATA ${f.delayAtaChapter}` : ''}`.trim() });
    printSignedRecord({
      docTitle: 'Journey Log Entry',
      recordType: 'Journey Log',
      reference: f.id,
      aircraft: ac ? `${ac.tailNumber} · ${ac.type} · S/N ${ac.serialNumber}` : undefined,
      pdfBlobUri: f.pdfBlobUri ?? `blob://mygfo-worm/journey/${f.id}.pdf`,
      sections: [
        { heading: 'Sector', fields: [
          { label: 'Sector #', value: String(f.sectorSequence) },
          { label: 'Date (UTC)', value: f.flightDateUtc.slice(0, 10) },
          { label: 'OUT / OFF', value: `${f.outUtc.slice(11, 16)} / ${f.offUtc.slice(11, 16)}` },
          { label: 'ON / IN', value: `${f.onUtc.slice(11, 16)} / ${f.inUtc.slice(11, 16)}` },
          { label: 'Block / Flight', value: `${f.blockTime}h / ${f.flightTime}h` },
          { label: 'Landings / Cycles', value: `${f.landings} / ${f.cycles}` },
          { label: 'PIC', value: nameOf(f.picOid) },
          { label: 'SIC', value: nameOf(f.sicOid) },
          { label: 'Airframe total', value: `${f.airframeTotalHours}h / ${f.airframeTotalCycles} cyc` },
          ...extras,
        ] },
      ],
      signatures: sig ? [{ role: sig.signerRole, name: sig.signerName, cert: sig.certNumber, hash: sig.mockContentHash, signedAtUtc: sig.signedAtUtc, amr: sig.amr.join('+') }] : [],
      footnote: f.supersedesId ? `This entry is a correction superseding ${f.supersedesId}.` : undefined,
    });
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
      actions={<Button size="sm" onClick={startNew}><FilePlus className="mr-1.5 h-4 w-4" /> New entry</Button>}
    >
      <div className="space-y-3">
        {flights.length === 0 && <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">No journey log entries yet.</CardContent></Card>}
        {flights.map(f => {
          const oil = f.oilUplift ? [f.oilUplift.eng1, f.oilUplift.eng2, f.oilUplift.apu].filter(v => v != null) : [];
          const extras: string[] = [];
          if (f.fuelUplift) extras.push(`Fuel ${f.fuelUplift} lb`);
          if (oil.length) extras.push(`Oil ${[f.oilUplift?.eng1 ?? 0, f.oilUplift?.eng2 ?? 0].join('/')}${f.oilUplift?.apu ? ` (APU ${f.oilUplift.apu})` : ''} qt`);
          if (f.deIce) extras.push(`De-ice Type ${f.deIce.fluidType}${f.deIce.fluidName ? ` ${f.deIce.fluidName}` : ''}`);
          if (f.delayMinutes || f.delayCode) extras.push(`Delay ${f.delayCode ?? ''}${f.delayMinutes ? ` ${f.delayMinutes}m` : ''}${f.delayAtaChapter ? ` ATA ${f.delayAtaChapter}` : ''}`.trim());
          return (
          <Card key={f.id}>
            <CardContent className="grid grid-cols-2 gap-2 p-4 text-sm md:grid-cols-6">
              <div><div className="text-xs text-muted-foreground">Aircraft</div><div className="font-medium">{tailOf(f.aircraftId)} · #{f.sectorSequence}{f.supersedesId && <span className="ml-1 text-xs text-muted-foreground">(corr.)</span>}</div></div>
              <div><div className="text-xs text-muted-foreground">OOOI</div><div>{f.outUtc.slice(11, 16)}/{f.offUtc.slice(11, 16)}/{f.onUtc.slice(11, 16)}/{f.inUtc.slice(11, 16)}</div></div>
              <div><div className="text-xs text-muted-foreground">Block / Flight</div><div>{f.blockTime}h / {f.flightTime}h</div></div>
              <div><div className="text-xs text-muted-foreground">Ldg / Cyc</div><div>{f.landings} / {f.cycles}</div></div>
              <div><div className="text-xs text-muted-foreground">Crew</div><div className="truncate">{nameOf(f.picOid)} / {nameOf(f.sicOid)}</div></div>
              <div><div className="text-xs text-muted-foreground">Airframe</div><div>{f.airframeTotalHours}h</div></div>
              {extras.length > 0 && (
                <div className="col-span-2 mt-1 flex flex-wrap gap-1.5 border-t pt-2 md:col-span-6">
                  {extras.map((x, i) => <Badge key={i} variant="outline" className="font-normal">{x}</Badge>)}
                </div>
              )}
              <div className="col-span-2 mt-1 flex flex-wrap justify-end gap-2 border-t pt-2 md:col-span-6">
                <Button size="sm" variant="ghost" onClick={() => printFlight(f)}><Printer className="mr-1.5 h-4 w-4" /> View / Print</Button>
                {canSupersede(signerOf(f), user).ok && (
                  <Button size="sm" variant="outline" onClick={() => openCorrect(f)}><Pencil className="mr-1.5 h-4 w-4" /> Correct</Button>
                )}
              </div>
            </CardContent>
          </Card>
          );
        })}
      </div>

      <Dialog open={open} onOpenChange={o => { setOpen(o); if (!o) setCorrectingId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {correctingId ? <Pencil className="h-4 w-4" /> : <PlaneTakeoff className="h-4 w-4" />}
              {correctingId ? 'Correct journey log entry' : 'New journey log entry'}
            </DialogTitle>
            <DialogDescription>
              {correctingId
                ? 'This files a correction. The original signed entry is retained unaltered; your correction supersedes it.'
                : 'OOOI must be non-decreasing; PIC and SIC must differ.'}
            </DialogDescription>
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

            <details className="rounded-md border px-3 py-2">
              <summary className="cursor-pointer text-xs font-medium text-muted-foreground">Oil uplift · de-ice · delay (optional)</summary>
              <div className="mt-3 space-y-3">
                <div>
                  <Label className="text-xs">Oil uplift (qt)</Label>
                  <div className="mt-1 grid grid-cols-3 gap-2">
                    <Input type="number" step="0.1" placeholder="Eng 1" value={oil1} onChange={e => setOil1(e.target.value)} />
                    <Input type="number" step="0.1" placeholder="Eng 2" value={oil2} onChange={e => setOil2(e.target.value)} />
                    <Input type="number" step="0.1" placeholder="APU" value={oilApu} onChange={e => setOilApu(e.target.value)} />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Ground de-/anti-ice</Label>
                  <div className="mt-1 grid grid-cols-3 gap-2">
                    <Select value={deIceType || 'none'} onValueChange={(v: string) => setDeIceType(v === 'none' ? '' : (v as 'I' | 'II' | 'III' | 'IV'))}>
                      <SelectTrigger><SelectValue placeholder="Fluid type" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {(['I', 'II', 'III', 'IV'] as const).map(t => <SelectItem key={t} value={t}>Type {t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Input placeholder="Fluid / mix" value={deIceFluid} onChange={e => setDeIceFluid(e.target.value)} disabled={!deIceType} />
                    <Input type="time" value={deIceTime} onChange={e => setDeIceTime(e.target.value)} disabled={!deIceType} title="Holdover clock start (UTC)" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Delay</Label>
                  <div className="mt-1 grid grid-cols-3 gap-2">
                    <Input placeholder="Delay code" value={delayCode} onChange={e => setDelayCode(e.target.value)} />
                    <Input type="number" placeholder="Minutes" value={delayMins} onChange={e => setDelayMins(e.target.value)} />
                    <Input placeholder="ATA (if tech)" value={delayAta} onChange={e => setDelayAta(e.target.value)} />
                  </div>
                </div>
              </div>
            </details>

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

      <SignCeremonyDialog open={signOpen} onOpenChange={setSignOpen} signer={user} signedEntity="FLIGHT_LOG" signedEntityId={pendingId}
        intentStatement={correctingId ? INTENT.CORRECTION : JOURNEY_INTENT}
        payloadSummary={correctingId ? 'Correction — supersedes the original signed entry, which is retained.' : undefined}
        onSigned={onSigned} title={correctingId ? 'Sign correction' : 'Sign journey log'} />
    </TechLogShell>
  );
}
