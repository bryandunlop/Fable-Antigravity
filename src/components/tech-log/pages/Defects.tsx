import { useMemo, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { FilePlus, AlertTriangle, Wrench, CheckCircle2 } from 'lucide-react';
import { useTechLog, useCurrentUser } from '../TechLogContext';
import { currentRows } from '../engine/supersede';
import { TechLogShell } from '../components/TechLogShell';
import { SignCeremonyDialog } from '../components/SignCeremonyDialog';
import { ATA_CHAPTERS, INTENT } from '../constants';
import { newId } from '../util/id';
import type { Defect, Severity, DefectSource } from '../types';
import { Card, CardContent } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';

const STATUS_VARIANT: Record<string, 'destructive' | 'secondary' | 'outline' | 'default'> = {
  OPEN: 'destructive', DEFERRED: 'secondary', RECTIFIED: 'outline', CLOSED: 'outline',
};

export default function Defects() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { state, dispatch } = useTechLog();
  const user = useCurrentUser();
  const isMaint = user.role === 'MAINTENANCE';
  const tailFilter = params.get('tail') ?? undefined;

  const [formOpen, setFormOpen] = useState(params.get('new') === '1');
  const [signOpen, setSignOpen] = useState(false);
  const [pendingDefectId, setPendingDefectId] = useState<string>('');

  // form state
  const dispatchable = state.aircraft.filter(a => !a.isProvisional);
  const [tail, setTail] = useState(tailFilter ?? dispatchable[0]?.tailNumber ?? '');
  const [ata, setAta] = useState('32');
  const [severity, setSeverity] = useState<Severity>('HIGH');
  const [description, setDescription] = useState('');
  const [symptom, setSymptom] = useState('');

  const defects = useMemo(() => {
    let list = currentRows(state.defects);
    if (tailFilter) {
      const ac = state.aircraft.find(a => a.tailNumber === tailFilter);
      list = list.filter(d => d.aircraftId === ac?.id);
    }
    return list.sort((a, b) => b.reportedAtUtc.localeCompare(a.reportedAtUtc));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.defects, tailFilter]);

  const tailOf = (id: string) => state.aircraft.find(a => a.id === id)?.tailNumber ?? '—';

  const beginSign = () => {
    if (!tail || !description.trim()) {
      toast.error('Aircraft and description are required.');
      return;
    }
    setPendingDefectId(newId('def'));
    setSignOpen(true);
  };

  const onSigned = (sig: { id: string }) => {
    const ac = state.aircraft.find(a => a.tailNumber === tail)!;
    const source: DefectSource = isMaint ? 'MAREP' : 'PIREP';
    const defect: Defect = {
      id: pendingDefectId, aircraftId: ac.id, source, ataChapter: ata,
      description: description.trim(), symptom: symptom.trim() || undefined, severity,
      airworthinessAffecting: null, // conservative default = grounding; only maintenance can clear via release/deferral
      status: 'OPEN', reportedByOid: user.oid, reportedAtUtc: new Date().toISOString(),
      signatureId: sig.id,
    };
    dispatch({ type: 'ADD_SIGNATURE', payload: sig as any });
    dispatch({ type: 'ADD_DEFECT', payload: defect });
    dispatch({ type: 'ADD_AUDIT', payload: { id: newId('aud'), actorOid: user.oid, action: 'DEFECT_REPORTED', entityType: 'Defect', entityId: defect.id, atUtc: defect.reportedAtUtc, summary: `${source} ${tail} ATA ${ata} — ${severity}` } });
    setFormOpen(false);
    setDescription(''); setSymptom('');
    toast.success(`Defect logged on ${tail} — aircraft now grounded (RED) pending maintenance triage.`);
  };

  return (
    <TechLogShell
      title={tailFilter ? `Defects — ${tailFilter}` : 'Defects'}
      subtitle="Pilot reports a squawk; maintenance triages it (defer under MEL or rectify)."
      actions={
        <Button size="sm" onClick={() => setFormOpen(true)}>
          <FilePlus className="mr-1.5 h-4 w-4" /> Report defect
        </Button>
      }
    >
      <div className="space-y-3">
        {defects.length === 0 && (
          <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">No defects logged.</CardContent></Card>
        )}
        {defects.map(d => (
          <Card key={d.id}>
            <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{tailOf(d.aircraftId)}</span>
                  <Badge variant="outline">ATA {d.ataChapter}</Badge>
                  <Badge variant={STATUS_VARIANT[d.status]}>{d.status}</Badge>
                  <span className="text-xs text-muted-foreground">{d.severity} · {d.source}</span>
                </div>
                <p className="mt-1 text-sm">{d.description}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">Reported {new Date(d.reportedAtUtc).toLocaleString()}</p>
              </div>
              {isMaint && d.status === 'OPEN' && (
                <div className="flex shrink-0 gap-2">
                  <Button size="sm" variant="secondary" onClick={() => navigate(`/tech-log/deferrals?defect=${d.id}`)}>
                    <Wrench className="mr-1.5 h-4 w-4" /> Defer (MEL)
                  </Button>
                  <Button size="sm" onClick={() => navigate(`/tech-log/releases?defect=${d.id}`)}>
                    <CheckCircle2 className="mr-1.5 h-4 w-4" /> Rectify (CRS)
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Report defect dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Report defect</DialogTitle>
            <DialogDescription>Capture the observation. Maintenance determines dispatch impact.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Aircraft</Label>
                <Select value={tail} onValueChange={(v: string) => setTail(v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {dispatchable.map(a => <SelectItem key={a.id} value={a.tailNumber}>{a.tailNumber} · {a.type}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>ATA chapter</Label>
                <Select value={ata} onValueChange={(v: string) => setAta(v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ATA_CHAPTERS.map(c => <SelectItem key={c.code} value={c.code}>{c.code} · {c.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea className="mt-1" value={description} onChange={e => setDescription(e.target.value)} placeholder="What was observed?" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Symptom / CAS (optional)</Label>
                <Input className="mt-1" value={symptom} onChange={e => setSymptom(e.target.value)} placeholder="e.g. GEAR amber CAS" />
              </div>
              <div>
                <Label>Severity</Label>
                <Select value={severity} onValueChange={(v: string) => setSeverity(v as Severity)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as Severity[]).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <p className="rounded bg-muted/60 px-2 py-1.5 text-xs text-muted-foreground">
              Reported as airworthiness-affecting by default — the aircraft goes <strong>RED</strong> until maintenance defers it under the MEL or rectifies it. Pilots cannot self-clear.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button onClick={beginSign}>Continue to sign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SignCeremonyDialog
        open={signOpen}
        onOpenChange={setSignOpen}
        signer={user}
        signedEntity="DEFECT"
        signedEntityId={pendingDefectId}
        intentStatement={INTENT.PILOT_DEFECT}
        onSigned={onSigned}
        title="Sign defect report"
      />
    </TechLogShell>
  );
}
