import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Activity, Plus, Info, CheckCircle2, RotateCw, ArrowUpRight } from 'lucide-react';
import { useTechLog, useCurrentUser } from '../TechLogContext';
import { ATA_CHAPTERS } from '../constants';
import { newId } from '../util/id';
import type { IntermittentFault, IntermittentFaultOccurrence } from '../types';
import { TechLogShell } from '../components/TechLogShell';
import { ReportDefectDialog } from '../components/panels/ReportDefectDialog';
import { Card, CardContent } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';

export default function IntermittentFaults() {
  const { state, dispatch } = useTechLog();
  const user = useCurrentUser();
  const dispatchable = state.aircraft.filter(a => !a.isProvisional);

  const [open, setOpen] = useState(false);
  const [occOpen, setOccOpen] = useState<IntermittentFault | null>(null);
  const [occNote, setOccNote] = useState('');
  const [promote, setPromote] = useState<IntermittentFault | null>(null);
  const [tail, setTail] = useState(dispatchable[0]?.tailNumber ?? '');
  const [ata, setAta] = useState('31');
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');

  const tailOf = (id: string) => state.aircraft.find(a => a.id === id)?.tailNumber ?? '—';
  const nameOf = (oid: string) => state.personnel.find(p => p.oid === oid)?.displayName ?? oid;
  const occOf = (faultId: string) => state.intermittentOccurrences.filter(o => o.faultId === faultId).sort((a, b) => b.observedAtUtc.localeCompare(a.observedAtUtc));

  const faults = useMemo(
    () => state.intermittentFaults.slice().sort((a, b) => b.firstObservedUtc.localeCompare(a.firstObservedUtc)),
    [state.intermittentFaults],
  );

  const create = () => {
    if (!tail || !title.trim()) return toast.error('Aircraft and title are required.');
    const ac = state.aircraft.find(a => a.tailNumber === tail)!;
    const now = new Date().toISOString();
    const fault: IntermittentFault = { id: newId('if'), aircraftId: ac.id, ataChapter: ata, title: title.trim(), description: note.trim() || undefined, status: 'MONITORING', firstObservedUtc: now, createdByOid: user.oid };
    const occ: IntermittentFaultOccurrence = { id: newId('ifo'), faultId: fault.id, aircraftId: ac.id, observedAtUtc: now, observedByOid: user.oid, note: note.trim() || undefined };
    dispatch({ type: 'ADD_INTERMITTENT_FAULT', payload: fault });
    dispatch({ type: 'ADD_INTERMITTENT_OCCURRENCE', payload: occ });
    dispatch({ type: 'ADD_AUDIT', payload: { id: newId('aud'), actorOid: user.oid, action: 'INTERMITTENT_LOGGED', entityType: 'IntermittentFault', entityId: fault.id, atUtc: now, summary: `${tail} ATA ${ata} intermittent: ${fault.title}` } });
    setOpen(false); setTitle(''); setNote('');
    toast.success('Intermittent fault logged (monitoring — does not affect serviceability).');
  };

  const addOccurrence = () => {
    if (!occOpen) return;
    const now = new Date().toISOString();
    const occ: IntermittentFaultOccurrence = { id: newId('ifo'), faultId: occOpen.id, aircraftId: occOpen.aircraftId, observedAtUtc: now, observedByOid: user.oid, note: occNote.trim() || undefined };
    dispatch({ type: 'ADD_INTERMITTENT_OCCURRENCE', payload: occ });
    dispatch({ type: 'ADD_AUDIT', payload: { id: newId('aud'), actorOid: user.oid, action: 'INTERMITTENT_OCCURRENCE', entityType: 'IntermittentFault', entityId: occOpen.id, atUtc: now, summary: `${tailOf(occOpen.aircraftId)} recurrence of "${occOpen.title}"` } });
    setOccOpen(null); setOccNote('');
    toast.success('Occurrence recorded.');
  };

  const resolve = (f: IntermittentFault) => {
    dispatch({ type: 'EDIT_INTERMITTENT_FAULT', payload: { ...f, status: 'RESOLVED' } });
    dispatch({ type: 'ADD_AUDIT', payload: { id: newId('aud'), actorOid: user.oid, action: 'INTERMITTENT_RESOLVED', entityType: 'IntermittentFault', entityId: f.id, atUtc: new Date().toISOString(), summary: `${tailOf(f.aircraftId)} intermittent "${f.title}" marked resolved` } });
    toast.success('Marked resolved.');
  };

  return (
    <TechLogShell
      title="Intermittent Faults"
      subtitle="Track non-repeatable faults and their occurrences. Monitoring only — never affects dispatch."
      actions={<Button size="sm" onClick={() => setOpen(true)}><Plus className="mr-1.5 h-4 w-4" /> Log fault</Button>}
    >
      <Card className="mb-3 border-muted-foreground/30">
        <CardContent className="flex items-start gap-2 p-3 text-xs text-muted-foreground">
          <Info className="mt-0.5 h-4 w-4" />
          Intermittent faults are watch-items: they accumulate occurrences to support troubleshooting but, unlike defects, they do <strong>not</strong> change the serviceability color. Convert to a defect if a fault becomes confirmed/repeatable.
        </CardContent>
      </Card>

      <div className="space-y-3">
        {faults.length === 0 && <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">No intermittent faults logged.</CardContent></Card>}
        {faults.map(f => {
          const occs = occOf(f.id);
          return (
            <Card key={f.id}>
              <CardContent className="p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Activity className="h-4 w-4 text-muted-foreground" />
                      <span className="font-semibold">{tailOf(f.aircraftId)}</span>
                      <Badge variant="outline">ATA {f.ataChapter}</Badge>
                      <Badge variant={f.status === 'RESOLVED' ? 'outline' : 'secondary'}>{f.status}</Badge>
                      <Badge variant="outline">×{occs.length} occurrence{occs.length === 1 ? '' : 's'}</Badge>
                    </div>
                    <p className="mt-1 text-sm">{f.title}</p>
                    {f.description && <p className="mt-0.5 text-xs text-muted-foreground">{f.description}</p>}
                    <p className="mt-0.5 text-xs text-muted-foreground">First observed {new Date(f.firstObservedUtc).toLocaleDateString()}</p>
                  </div>
                  {f.status !== 'RESOLVED' && (
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => setOccOpen(f)}><RotateCw className="mr-1.5 h-4 w-4" /> Log occurrence</Button>
                      <Button size="sm" variant="secondary" onClick={() => setPromote(f)}><ArrowUpRight className="mr-1.5 h-4 w-4" /> Promote to defect</Button>
                      <Button size="sm" variant="ghost" onClick={() => resolve(f)}><CheckCircle2 className="mr-1.5 h-4 w-4" /> Resolve</Button>
                    </div>
                  )}
                </div>
                {occs.length > 0 && (
                  <div className="mt-3 space-y-1 border-t pt-2">
                    {occs.map(o => (
                      <div key={o.id} className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                        <span>{o.note ?? 'Observed'}</span>
                        <span className="shrink-0">{nameOf(o.observedByOid)} · {new Date(o.observedAtUtc).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* New fault */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Activity className="h-4 w-4" /> Log intermittent fault</DialogTitle>
            <DialogDescription>Captured for monitoring/troubleshooting; does not ground the aircraft.</DialogDescription>
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
              <div>
                <Label>ATA chapter</Label>
                <Select value={ata} onValueChange={(v: string) => setAta(v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{ATA_CHAPTERS.map(c => <SelectItem key={c.code} value={c.code}>{c.code} · {c.title}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Title</Label><Input className="mt-1" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Nuisance MAINT CAS at TOD" /></div>
            <div><Label>First-occurrence note</Label><Textarea className="mt-1" value={note} onChange={e => setNote(e.target.value)} placeholder="Conditions, duration, what cleared it…" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={create}>Log fault</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add occurrence */}
      <Dialog open={!!occOpen} onOpenChange={o => !o && setOccOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log occurrence</DialogTitle>
            <DialogDescription>{occOpen ? `${tailOf(occOpen.aircraftId)} — ${occOpen.title}` : ''}</DialogDescription>
          </DialogHeader>
          <Textarea value={occNote} onChange={e => setOccNote(e.target.value)} placeholder="What happened this time?" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setOccOpen(null)}>Cancel</Button>
            <Button onClick={addOccurrence}>Record</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Promote intermittent fault → confirmed defect (opens the report dialog prefilled) */}
      {promote && (
        <ReportDefectDialog
          open={!!promote}
          onOpenChange={o => { if (!o) setPromote(null); }}
          lockTail={tailOf(promote.aircraftId)}
          prefill={{ ata: promote.ataChapter, description: `${promote.title} — promoted from intermittent fault (${occOf(promote.id).length} occurrence(s)).` }}
          onReported={() => {
            dispatch({ type: 'EDIT_INTERMITTENT_FAULT', payload: { ...promote, status: 'RESOLVED' } });
            dispatch({ type: 'ADD_AUDIT', payload: { id: newId('aud'), actorOid: user.oid, action: 'INTERMITTENT_PROMOTED', entityType: 'IntermittentFault', entityId: promote.id, atUtc: new Date().toISOString(), summary: `${tailOf(promote.aircraftId)} intermittent "${promote.title}" promoted to a confirmed defect` } });
            toast.success('Promoted to a defect — the intermittent fault is now resolved.');
            setPromote(null);
          }}
        />
      )}
    </TechLogShell>
  );
}
