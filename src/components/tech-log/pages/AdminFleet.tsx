import { useState } from 'react';
import { toast } from 'sonner';
import { Plane, Pencil, BadgeCheck } from 'lucide-react';
import { useTechLog, useCurrentUser } from '../TechLogContext';
import { newId } from '../util/id';
import type { Aircraft, AircraftType, AircraftStatus } from '../types';
import { TechLogShell } from '../components/TechLogShell';
import { PendingApprovalsPanel } from '../components/PendingApprovalsPanel';
import { Card, CardContent } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';

export default function AdminFleet() {
  const { state, dispatch } = useTechLog();
  const user = useCurrentUser();
  const canEdit = user.role === 'MAINTENANCE';
  const [draft, setDraft] = useState<Aircraft | null>(null);
  const [activateTarget, setActivateTarget] = useState<Aircraft | null>(null);
  const [evidenceRef, setEvidenceRef] = useState('');

  const hasPendingActivation = (acId: string) =>
    state.pendingApprovals.some(p => p.status === 'PENDING' && p.kind === 'MEL_TYPE_ACTIVATION' && p.aircraftId === acId);
  const hasPendingEdit = (acId: string) =>
    state.pendingApprovals.some(p => p.status === 'PENDING' && p.kind === 'AIRCRAFT_EDIT' && p.after.id === acId);

  const save = () => {
    if (!draft) return;
    if (!draft.tailNumber.trim() || !draft.serialNumber.trim()) return toast.error('Tail and serial are required.');
    const now = new Date().toISOString();
    dispatch({
      type: 'PROPOSE_CHANGE',
      payload: {
        id: newId('appr'), kind: 'AIRCRAFT_EDIT', before: state.aircraft.find(a => a.id === draft.id)!, after: draft,
        summary: `Edit ${draft.tailNumber} (S/N ${draft.serialNumber}, ${draft.type}, ${draft.status})`,
        proposedByOid: user.oid, proposedAtUtc: now, status: 'PENDING',
      },
    });
    dispatch({ type: 'ADD_AUDIT', payload: { id: newId('aud'), actorOid: user.oid, action: 'AIRCRAFT_EDIT_PROPOSED', entityType: 'Aircraft', entityId: draft.id, atUtc: now, summary: `Proposed edit to ${draft.tailNumber} (S/N ${draft.serialNumber}) — awaiting a separate approver` } });
    toast.success(`Edit to ${draft.tailNumber} proposed — awaiting a separate approver.`);
    setDraft(null);
  };

  const proposeActivation = () => {
    if (!activateTarget) return;
    if (!evidenceRef.trim()) return toast.error('FSDO LOA evidence reference is required.');
    const melItemIds = state.melItems.filter(m => m.aircraftType === activateTarget.type && m.approvalState !== 'APPROVED').map(m => m.id);
    const now = new Date().toISOString();
    dispatch({
      type: 'PROPOSE_CHANGE',
      payload: {
        id: newId('appr'), kind: 'MEL_TYPE_ACTIVATION', aircraftId: activateTarget.id, aircraftType: activateTarget.type,
        melItemIds, evidenceRef: evidenceRef.trim(),
        summary: `${activateTarget.type} D195 approval — activate ${activateTarget.tailNumber}, approve ${melItemIds.length} MEL item(s)`,
        proposedByOid: user.oid, proposedAtUtc: now, status: 'PENDING',
      },
    });
    dispatch({ type: 'ADD_AUDIT', payload: { id: newId('aud'), actorOid: user.oid, action: 'TYPE_ACTIVATION_PROPOSED', entityType: 'Aircraft', entityId: activateTarget.id, atUtc: now, summary: `Proposed ${activateTarget.type} D195 activation for ${activateTarget.tailNumber} (FSDO LOA: ${evidenceRef.trim()}) — awaiting a separate approver` } });
    toast.success('Activation proposed — awaiting a separate approver.');
    setActivateTarget(null);
    setEvidenceRef('');
  };

  return (
    <TechLogShell title="Admin · Fleet" subtitle="Reference data — proposed edits require a separate maintenance approver (four-eyes, SE-2).">
      <PendingApprovalsPanel kinds={['AIRCRAFT_EDIT', 'MEL_TYPE_ACTIVATION']} />
      <div className="space-y-3">
        {state.aircraft.map(ac => (
          <Card key={ac.id}>
            <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <Plane className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="flex items-center gap-2 font-semibold">{ac.tailNumber}
                    <Badge variant="outline">{ac.type}</Badge>
                    <Badge variant={ac.isProvisional ? 'destructive' : 'secondary'}>{ac.status}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">S/N {ac.serialNumber} · {ac.homeBase} · {ac.airframeTotalHours}h / {ac.airframeTotalCycles} cyc</div>
                </div>
              </div>
              <div className="flex gap-2">
                {/* LG-211 — "& activate" read as something this button does. It does not: D23
                    requires a separate DOM approver, and the old label hid that gate behind a verb
                    that sounded like the person clicking could finish the job alone. */}
                {ac.isProvisional && canEdit && (
                  <Button size="sm" disabled={hasPendingActivation(ac.id)} onClick={() => setActivateTarget(ac)}>
                    <BadgeCheck className="mr-1.5 h-4 w-4" /> {hasPendingActivation(ac.id) ? 'Activation pending' : 'Propose activation (DOM approval required)'}
                  </Button>
                )}
                <Button size="sm" variant="outline" disabled={!canEdit || hasPendingEdit(ac.id)} onClick={() => setDraft({ ...ac })}><Pencil className="mr-1.5 h-4 w-4" /> Edit</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!draft} onOpenChange={o => !o && setDraft(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Propose aircraft edit</DialogTitle><DialogDescription>Updatable reference data — requires a separate maintenance approver before it takes effect.</DialogDescription></DialogHeader>
          {draft && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Tail number</Label><Input className="mt-1" value={draft.tailNumber} onChange={e => setDraft({ ...draft, tailNumber: e.target.value })} /></div>
                <div><Label>Serial number</Label><Input className="mt-1" value={draft.serialNumber} onChange={e => setDraft({ ...draft, serialNumber: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Type</Label>
                  <Select value={draft.type} onValueChange={(v: string) => setDraft({ ...draft, type: v as AircraftType })}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>{(['G650ER', 'G500', 'G800'] as AircraftType[]).map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={draft.status} onValueChange={(v: string) => setDraft({ ...draft, status: v as AircraftStatus, isProvisional: v === 'PROVISIONAL' })}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>{(['ACTIVE', 'PROVISIONAL', 'STORED', 'SOLD'] as AircraftStatus[]).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Home base</Label><Input className="mt-1" value={draft.homeBase} onChange={e => setDraft({ ...draft, homeBase: e.target.value })} /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDraft(null)}>Cancel</Button>
            <Button onClick={save}>Submit for approval</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!activateTarget} onOpenChange={o => { if (!o) { setActivateTarget(null); setEvidenceRef(''); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Propose D195 MEL approval</DialogTitle><DialogDescription>Requires an FSDO Letter of Authorization reference and a separate maintenance approver.</DialogDescription></DialogHeader>
          {activateTarget && (
            <div className="space-y-3 text-sm">
              <p>{activateTarget.type} D195 — activates {activateTarget.tailNumber} and approves {state.melItems.filter(m => m.aircraftType === activateTarget.type && m.approvalState !== 'APPROVED').length} pending MEL item(s).</p>
              <div><Label>FSDO LOA reference</Label><Input className="mt-1" value={evidenceRef} onChange={e => setEvidenceRef(e.target.value)} placeholder="e.g. FSDO-LOA-2026-04" /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setActivateTarget(null); setEvidenceRef(''); }}>Cancel</Button>
            <Button onClick={proposeActivation}>Submit for approval</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TechLogShell>
  );
}
