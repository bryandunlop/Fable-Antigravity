import { useState } from 'react';
import { toast } from 'sonner';
import { Check, ChevronDown, ChevronUp, X } from 'lucide-react';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Textarea } from '../../ui/textarea';
import { GfoEmptyState } from '../../gfo';
import { useDocuments, identityFor, publishRequiredReadEvent } from '../DocumentsContext';
import { classFor } from '../classes';
import { canApprove, validateDecision } from '../engine/lifecycle';
import { DocIdentityLine } from './DocIdentity';
import { SectionedContent } from './SectionedContent';

/** Pending-approval queue for approver roles. Own submissions are decision-
 * disabled (four-eyes) — the guard also lives in the reducer. */
export function ApprovalQueuePanel({ userRole, additionalRoles = [] }: { userRole: string; additionalRoles?: string[] }) {
  const { state, decideApproval } = useDocuments();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  const userRoles = [userRole, ...additionalRoles];
  const { userId } = identityFor(userRole);
  const todayIso = new Date().toISOString().slice(0, 10);

  const pending = state.revisions
    .filter((r) => r.status === 'pending-approval')
    .map((rev) => ({ rev, doc: state.docs.find((d) => d.id === rev.docId)! }))
    .filter((x) => x.doc && canApprove(classFor(x.doc.classId), userRoles))
    .sort((a, b) => (a.rev.submittedAtUtc ?? '').localeCompare(b.rev.submittedAtUtc ?? ''));

  if (pending.length === 0) {
    return <GfoEmptyState message="No revisions are waiting for approval." />;
  }

  const decide = (docId: string, revisionId: string, approve: boolean, rejectionReason?: string) => {
    const doc = state.docs.find((d) => d.id === docId)!;
    const rev = state.revisions.find((r) => r.id === revisionId)!;
    const v = validateDecision(classFor(doc.classId), rev, userId, userRoles);
    if (!v.ok) {
      toast.error(v.error);
      return;
    }
    decideApproval({ revisionId, deciderRoles: userRoles, deciderRole: userRole, approve, reason: rejectionReason });
    if (approve) {
      if (rev.effectiveDate <= todayIso) {
        publishRequiredReadEvent(doc, rev);
        toast.success(`${doc.id} rev ${rev.revision} approved and published.`);
      } else {
        toast.success(`${doc.id} rev ${rev.revision} approved — publishes ${rev.effectiveDate}.`);
      }
    } else {
      toast.success(`${doc.id} rev ${rev.revision} returned to the author.`);
    }
    setRejecting(null);
    setReason('');
  };

  return (
    <ul className="divide-y divide-border rounded-lg border border-border bg-card">
      {pending.map(({ doc, rev }) => {
        const own = rev.authorUserId === userId;
        const isOpen = expanded === rev.id;
        return (
          <li key={rev.id} className="px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <DocIdentityLine doc={doc} rev={rev} />
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Submitted by {rev.authorName}
                  {rev.submittedAtUtc ? ` · ${new Date(rev.submittedAtUtc).toLocaleString()}` : ''}
                </p>
                {rev.changeSummary.trim() && (
                  <p className="mt-1 text-xs"><span className="font-medium">What changed:</span> {rev.changeSummary}</p>
                )}
              </div>
              {own ? (
                <Badge variant="outline" className="shrink-0 text-[10px]">Awaiting another approver</Badge>
              ) : (
                <div className="flex shrink-0 items-center gap-1.5">
                  <Button size="sm" onClick={() => decide(doc.id, rev.id, true)}>
                    <Check className="mr-1 h-3.5 w-3.5" /> Approve
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setRejecting(rejecting === rev.id ? null : rev.id)}>
                    <X className="mr-1 h-3.5 w-3.5" /> Reject
                  </Button>
                </div>
              )}
              <Button size="sm" variant="ghost" onClick={() => setExpanded(isOpen ? null : rev.id)} aria-label="Preview content">
                {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>

            {rejecting === rev.id && !own && (
              <div className="mt-3 space-y-2 rounded-md border border-border bg-muted/30 p-3">
                <Textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Reason returned to the author (required)…"
                  rows={2}
                />
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="ghost" onClick={() => { setRejecting(null); setReason(''); }}>Cancel</Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      if (reason.trim().length < 5) { toast.error('A rejection reason is required.'); return; }
                      decide(doc.id, rev.id, false, reason.trim());
                    }}
                  >
                    Return to author
                  </Button>
                </div>
              </div>
            )}

            {isOpen && (
              <div className="prose-bulletin mt-3 max-h-96 overflow-y-auto rounded-md border border-border bg-muted/20 p-4">
                <SectionedContent sections={rev.sections} />
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
