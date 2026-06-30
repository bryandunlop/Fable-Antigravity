import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { BookOpen, BadgeCheck, Search } from 'lucide-react';
import { useTechLog, useCurrentUser } from '../TechLogContext';
import { newId } from '../util/id';
import type { AircraftType, MelItem } from '../types';
import { TechLogShell } from '../components/TechLogShell';
import { PendingApprovalsPanel } from '../components/PendingApprovalsPanel';
import { Card, CardContent } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../ui/dialog';

const APPROVAL_VARIANT: Record<string, 'secondary' | 'destructive' | 'outline'> = {
  APPROVED: 'secondary', PENDING_FSDO: 'destructive', DRAFT: 'destructive', SUPERSEDED: 'outline',
};

export default function AdminMel() {
  const { state, dispatch } = useTechLog();
  const user = useCurrentUser();
  const canEdit = user.role === 'MAINTENANCE';
  const [type, setType] = useState<AircraftType>('G500');
  const [q, setQ] = useState('');
  const [approveTarget, setApproveTarget] = useState<MelItem | null>(null);
  const [evidenceRef, setEvidenceRef] = useState('');

  const items = useMemo(() => {
    const query = q.trim().toLowerCase();
    return state.melItems
      .filter(m => m.aircraftType === type)
      .filter(m => !query || m.subItemNumber.toLowerCase().includes(query) || m.title.toLowerCase().includes(query))
      .slice(0, 60);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.melItems, type, q]);

  const total = state.melItems.filter(m => m.aircraftType === type).length;

  const hasPendingApproval = (melItemId: string) =>
    state.pendingApprovals.some(p => p.status === 'PENDING' && p.kind === 'MEL_ITEM_APPROVAL' && p.melItemId === melItemId);

  const proposeApproval = () => {
    if (!approveTarget) return;
    if (!evidenceRef.trim()) return toast.error('FSDO LOA evidence reference is required.');
    const now = new Date().toISOString();
    dispatch({
      type: 'PROPOSE_CHANGE',
      payload: {
        id: newId('appr'), kind: 'MEL_ITEM_APPROVAL', melItemId: approveTarget.id, evidenceRef: evidenceRef.trim(),
        summary: `Approve MEL ${approveTarget.subItemNumber} (${approveTarget.aircraftType})`,
        proposedByOid: user.oid, proposedAtUtc: now, status: 'PENDING',
      },
    });
    dispatch({ type: 'ADD_AUDIT', payload: { id: newId('aud'), actorOid: user.oid, action: 'MEL_APPROVAL_PROPOSED', entityType: 'MelItem', entityId: approveTarget.id, atUtc: now, summary: `Proposed approval of MEL ${approveTarget.subItemNumber} (FSDO LOA: ${evidenceRef.trim()}) — awaiting a separate approver` } });
    toast.success('Approval proposed — awaiting a separate approver.');
    setApproveTarget(null);
    setEvidenceRef('');
  };

  return (
    <TechLogShell
      title="Admin · MEL Management"
      subtitle="D195 content by type, revision, and approval state — proposed approvals require a separate maintenance approver (four-eyes, SE-2)."
      actions={
        <div className="flex items-center gap-2">
          <Select value={type} onValueChange={(v: string) => setType(v as AircraftType)}>
            <SelectTrigger className="h-9 w-[150px]"><SelectValue /></SelectTrigger>
            <SelectContent>{(['G500', 'G650ER', 'G800'] as AircraftType[]).map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      }
    >
      <PendingApprovalsPanel kinds={['MEL_ITEM_APPROVAL']} />
      <div className="mb-3 flex items-center gap-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input placeholder={`Search ${total} ${type} items…`} value={q} onChange={e => setQ(e.target.value)} className="max-w-sm" />
        <span className="text-xs text-muted-foreground">showing {items.length} of {total}</span>
      </div>
      <div className="space-y-2">
        {items.map(m => (
          <Card key={m.id}>
            <CardContent className="flex flex-col gap-2 p-3 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{m.subItemNumber}</span>
                  <Badge variant="outline">Cat {m.category}</Badge>
                  {m.mProcedure ? <Badge variant="outline">(M)</Badge> : null}
                  <Badge variant={APPROVAL_VARIANT[m.approvalState]}>{m.approvalState}</Badge>
                  <span className="text-xs text-muted-foreground">{m.mmelRevision} · eff {m.effectiveDate}</span>
                </div>
                <div className="mt-0.5 truncate text-sm text-muted-foreground">{m.title}</div>
              </div>
              {m.approvalState !== 'APPROVED' && canEdit && (
                <Button size="sm" disabled={hasPendingApproval(m.id)} onClick={() => setApproveTarget(m)}>
                  <BadgeCheck className="mr-1.5 h-4 w-4" /> {hasPendingApproval(m.id) ? 'Approval pending' : 'Propose approval'}
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
        {items.length === 0 && <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">No {type} MEL items match.</CardContent></Card>}
      </div>

      <Dialog open={!!approveTarget} onOpenChange={o => { if (!o) { setApproveTarget(null); setEvidenceRef(''); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Propose MEL item approval</DialogTitle><DialogDescription>Requires an FSDO Letter of Authorization reference and a separate maintenance approver.</DialogDescription></DialogHeader>
          {approveTarget && (
            <div className="space-y-3 text-sm">
              <p>Approve MEL {approveTarget.subItemNumber} ({approveTarget.title}) for {approveTarget.aircraftType}.</p>
              <div><Label>FSDO LOA reference</Label><Input className="mt-1" value={evidenceRef} onChange={e => setEvidenceRef(e.target.value)} placeholder="e.g. FSDO-LOA-2026-05" /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setApproveTarget(null); setEvidenceRef(''); }}>Cancel</Button>
            <Button onClick={proposeApproval}>Submit for approval</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TechLogShell>
  );
}
