import { toast } from 'sonner';
import { ShieldAlert, Check, X } from 'lucide-react';
import { useTechLog, useCurrentUser } from '../TechLogContext';
import type { PendingApproval } from '../types';
import { Card, CardContent } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';

/** Renders the PENDING rows of the four-eyes queue (SE-2) for the given proposal kinds. The proposer
 * never sees an approve/reject button on their own proposal — they only see "awaiting a different
 * approver" — and the reducer enforces the same rule independently (engine/approvals.isSelfApproval),
 * so this UI gate is convenience, not the actual security boundary. */
export function PendingApprovalsPanel({ kinds }: { kinds: PendingApproval['kind'][] }) {
  const { state, dispatch } = useTechLog();
  const user = useCurrentUser();
  const canDecide = user.role === 'MAINTENANCE';
  const pending = state.pendingApprovals.filter(p => p.status === 'PENDING' && kinds.includes(p.kind));

  if (pending.length === 0) return null;

  const decide = (p: PendingApproval, approve: boolean) => {
    dispatch({ type: 'DECIDE_APPROVAL', payload: { id: p.id, approve, decidedByOid: user.oid, decidedAtUtc: new Date().toISOString() } });
    toast.success(approve ? `Approved: ${p.summary}` : `Rejected: ${p.summary}`);
  };

  return (
    <div className="mb-4 space-y-2">
      <div className="text-xs font-semibold uppercase text-muted-foreground">Pending approvals (four-eyes)</div>
      {pending.map(p => {
        const isSelf = p.proposedByOid === user.oid;
        return (
          <Card key={p.id} className="border-amber-400/50">
            <CardContent className="flex flex-col gap-2 p-3 text-sm md:flex-row md:items-center md:justify-between">
              <div>
                <div className="font-medium">{p.summary}</div>
                {p.kind === 'MEL_TYPE_ACTIVATION' && <div className="text-xs text-muted-foreground">FSDO LOA: {p.evidenceRef}</div>}
                <div className="text-xs text-muted-foreground">Proposed {new Date(p.proposedAtUtc).toLocaleString()}</div>
              </div>
              {isSelf ? (
                <Badge variant="outline"><ShieldAlert className="mr-1 h-3 w-3" /> Awaiting a different approver</Badge>
              ) : canDecide ? (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => decide(p, false)}><X className="mr-1 h-4 w-4" /> Reject</Button>
                  <Button size="sm" onClick={() => decide(p, true)}><Check className="mr-1 h-4 w-4" /> Approve</Button>
                </div>
              ) : null}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
