import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { RefreshCw, Cloud, Info, Plus, Pencil, Ban, RotateCcw } from 'lucide-react';
import { useTechLog, useCurrentUser } from '../TechLogContext';
import { useIntegration } from '../integration/useIntegration';
import { canEditSafaChecklist, deriveSafaReadiness } from '../engine/safa';
import type { SafaRowStatus } from '../engine/safa';
import { newId } from '../util/id';
import type { SafaArea, SafaCheckItem } from '../types';
import { TechLogShell } from '../components/TechLogShell';
import { PendingApprovalsPanel } from '../components/PendingApprovalsPanel';
import { Card, CardContent } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../ui/dialog';

const DAY = 86400000;
const AREAS: SafaArea[] = ['A', 'B', 'C', 'D', 'E'];
const AREA_LABELS: Record<SafaArea, string> = { A: 'Flight deck', B: 'Safety / cabin', C: 'Aircraft condition', D: 'Cargo', E: 'General' };
const badgeVariant = (s: SafaRowStatus) => (s === 'ACTION' ? 'destructive' : s === 'DUE_SOON' ? 'secondary' : 'outline');
const statusLabel = (s: SafaRowStatus) => (s === 'ACTION' ? 'action' : s === 'DUE_SOON' ? 'due soon' : s === 'READY' ? 'ready' : 'unknown');

export default function Safa() {
  const { state, dispatch } = useTechLog();
  const user = useCurrentUser();
  const integration = useIntegration();
  const canEdit = canEditSafaChecklist(user);
  const now = Date.now();

  const dispatchable = state.aircraft.filter(a => !a.isProvisional);
  const [tail, setTail] = useState(dispatchable[0]?.tailNumber ?? '');
  const ac = state.aircraft.find(a => a.tailNumber === tail) ?? dispatchable[0];

  const status = useMemo(() => (ac ? integration.readSafaStatus(ac.id) : { items: [], unconfirmed: true, openQuestion: '' }), [ac]);
  const rows = useMemo(() => deriveSafaReadiness(state.safaCheckItems, status.items), [state.safaCheckItems, status]);

  // Whole-definition four-eyes: block new proposals while one is pending so before/after can't fork.
  const pendingSafa = state.pendingApprovals.some(p => p.status === 'PENDING' && p.kind === 'SAFA_CHECKLIST_EDIT');
  const [draft, setDraft] = useState<SafaCheckItem | null>(null);
  const [isNew, setIsNew] = useState(false);

  const openNew = () => { setIsNew(true); setDraft({ id: newId('safa'), code: '', area: 'A', areaLabel: AREA_LABELS.A, title: '', guidance: undefined, active: true }); };
  const openEdit = (it: SafaCheckItem) => { setIsNew(false); setDraft({ ...it }); };

  const proposeChange = (before: SafaCheckItem[], after: SafaCheckItem[], summary: string, entityId: string, verb: string) => {
    const at = new Date().toISOString();
    dispatch({ type: 'PROPOSE_CHANGE', payload: { id: newId('appr'), kind: 'SAFA_CHECKLIST_EDIT', before, after, summary, proposedByOid: user.oid, proposedAtUtc: at, status: 'PENDING' } });
    dispatch({ type: 'ADD_AUDIT', payload: { id: newId('aud'), actorOid: user.oid, action: 'SAFA_CHECK_EDIT_PROPOSED', entityType: 'SafaCheckItem', entityId, atUtc: at, summary: `Proposed ${verb} — awaiting a separate approver` } });
    toast.success('SAFA check change proposed — awaiting a separate approver.');
  };

  const save = () => {
    if (!draft) return;
    if (!draft.code.trim() || !draft.title.trim()) return toast.error('Code and title are required.');
    const item: SafaCheckItem = { ...draft, code: draft.code.trim().toUpperCase(), title: draft.title.trim(), areaLabel: AREA_LABELS[draft.area], guidance: draft.guidance?.trim() || undefined };
    const before = state.safaCheckItems;
    const after = isNew ? [...before, item] : before.map(i => (i.id === item.id ? item : i));
    proposeChange(before, after, `${isNew ? 'Add' : 'Edit'} SAFA check item — ${item.code} ${item.title}`, item.id, `${isNew ? 'add' : 'edit'} of SAFA item ${item.code}`);
    setDraft(null);
  };

  const toggleActive = (it: SafaCheckItem) => {
    const before = state.safaCheckItems;
    const after = before.map(i => (i.id === it.id ? { ...i, active: !i.active } : i));
    proposeChange(before, after, `${it.active ? 'Deactivate' : 'Reactivate'} SAFA check item — ${it.code} ${it.title}`, it.id, `${it.active ? 'deactivate' : 'reactivate'} of SAFA item ${it.code}`);
  };

  return (
    <TechLogShell
      title="SAFA Ramp-Check Readiness"
      subtitle={canEdit
        ? 'Reg & Comp maintains the check items; CAMP feeds each aircraft’s status (read-only). Advisory — not a dispatch gate.'
        : 'Read-only — Reg & Comp maintains these items; CAMP feeds status. Advisory heads-up before international legs.'}
      actions={
        <div className="flex items-center gap-2">
          {ac && (
            <Select value={tail} onValueChange={(v: string) => setTail(v)}>
              <SelectTrigger className="h-9 w-[120px]"><SelectValue /></SelectTrigger>
              <SelectContent>{dispatchable.map(a => <SelectItem key={a.id} value={a.tailNumber}>{a.tailNumber}</SelectItem>)}</SelectContent>
            </Select>
          )}
          <Button size="sm" variant="outline" onClick={() => ac && integration.refreshAirworthiness(ac.id)}><RefreshCw className="mr-1.5 h-4 w-4" /> Refresh from CAMP</Button>
          {canEdit && <Button size="sm" disabled={pendingSafa} onClick={openNew}><Plus className="mr-1.5 h-4 w-4" /> Add item</Button>}
        </div>
      }
    >
      {canEdit && <PendingApprovalsPanel kinds={['SAFA_CHECKLIST_EDIT']} />}

      <Card className="mb-3 border-muted-foreground/30">
        <CardContent className="flex items-start gap-2 p-3 text-xs text-muted-foreground">
          <Cloud className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            Item definitions are compliance-owned in myGFO (edited under four-eyes). Per-aircraft <strong>status</strong> is a read-only view of <strong>CAMP</strong> (sandbox/mock).{' '}
            <span className="inline-flex items-center gap-1"><Info className="h-3 w-3" /> OQ: the CAMP read for SAFA status is undocumented — confirm before wiring the real read.</span>
          </div>
        </CardContent>
      </Card>

      {pendingSafa && canEdit && (
        <p className="mb-2 text-xs text-muted-foreground">A SAFA change is awaiting approval — further edits are paused until it is decided.</p>
      )}

      <div className="space-y-2">
        {rows.length === 0 && <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">No SAFA check items defined yet.</CardContent></Card>}
        {rows.map(({ item, status: st, expiryUtc, note }) => {
          const days = expiryUtc ? Math.floor((new Date(expiryUtc).getTime() - now) / DAY) : null;
          return (
            <Card key={item.id}>
              <CardContent className="flex flex-col gap-2 p-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">Area {item.area} · {item.areaLabel}</Badge>
                    <span className="font-medium">{item.title}</span>
                    <Badge variant={badgeVariant(st)}>{statusLabel(st)}</Badge>
                  </div>
                  {item.guidance && <p className="mt-1 text-xs text-muted-foreground">{item.guidance}</p>}
                  {note && <p className="mt-0.5 text-xs text-[var(--gfo-warning,#F1B434)]">{note}</p>}
                </div>
                <div className="flex items-center gap-3">
                  {expiryUtc && <span className="shrink-0 text-sm text-muted-foreground">expires {new Date(expiryUtc).toLocaleDateString()}{days != null ? ` · ${days}d` : ''}</span>}
                  {canEdit && (
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" disabled={pendingSafa} onClick={() => openEdit(item)} title="Edit"><Pencil className="h-4 w-4" /></Button>
                      <Button size="sm" variant="ghost" disabled={pendingSafa} onClick={() => toggleActive(item)} title={item.active ? 'Deactivate' : 'Reactivate'}>{item.active ? <Ban className="h-4 w-4" /> : <RotateCcw className="h-4 w-4" />}</Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={!!draft} onOpenChange={o => !o && setDraft(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isNew ? 'Add SAFA check item' : 'Edit SAFA check item'}</DialogTitle>
            <DialogDescription>Requires a separate approver before it takes effect (four-eyes).</DialogDescription>
          </DialogHeader>
          {draft && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Inspection area</Label>
                  <Select value={draft.area} onValueChange={(v: SafaArea) => setDraft({ ...draft, area: v, areaLabel: AREA_LABELS[v] })}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>{AREAS.map(a => <SelectItem key={a} value={a}>Area {a} · {AREA_LABELS[a]}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Code</Label><Input className="mt-1" value={draft.code} onChange={e => setDraft({ ...draft, code: e.target.value })} placeholder="e.g. A-COFA" /></div>
              </div>
              <div><Label>Title</Label><Input className="mt-1" value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} placeholder="What the ramp inspector checks" /></div>
              <div><Label>Guidance (optional)</Label><Textarea className="mt-1" value={draft.guidance ?? ''} onChange={e => setDraft({ ...draft, guidance: e.target.value || undefined })} /></div>
              <p className="text-xs text-muted-foreground">Code joins to CAMP&apos;s per-aircraft status; a new code with no CAMP match shows status &ldquo;unknown&rdquo; until CAMP provides it.</p>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setDraft(null)}>Cancel</Button><Button onClick={save}>Submit for approval</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </TechLogShell>
  );
}
