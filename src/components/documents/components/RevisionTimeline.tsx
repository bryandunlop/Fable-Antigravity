import { useState } from 'react';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { GFO_STATUS_CLASS, type GfoStatus } from '../../gfo/status';
import type { DocRevision, DocSuggestion, RevisionStatus } from '../types';

const STATUS_TONE: Record<RevisionStatus, GfoStatus> = {
  draft: 'neutral',
  'pending-approval': 'warning',
  approved: 'info',
  published: 'success',
  superseded: 'neutral',
  rejected: 'error',
  withdrawn: 'neutral',
};

const STATUS_LABEL: Record<RevisionStatus, string> = {
  draft: 'Draft',
  'pending-approval': 'Pending approval',
  approved: 'Approved (scheduled)',
  published: 'Published',
  superseded: 'Superseded',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
};

const WITHDRAWABLE: RevisionStatus[] = ['draft', 'pending-approval', 'rejected'];

/** Manager-facing revision history: who wrote it, who decided, when it went live.
 * When canManage + onWithdraw are provided, a not-yet-published revision can be
 * withdrawn from here (reason required); withdrawn revisions stay in the history
 * as a tombstone with their reason (C7). */
export function RevisionTimeline({
  revisions,
  canManage = false,
  onWithdraw,
  suggestions = [],
}: {
  revisions: DocRevision[];
  canManage?: boolean;
  onWithdraw?: (revisionId: string, reason: string) => void;
  /** When supplied, each revision names the reader suggestions it carries —
   *  the reverse of DocSuggestion.resolvedIntoRevisionId. */
  suggestions?: DocSuggestion[];
}) {
  const [withdrawingId, setWithdrawingId] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  const confirmWithdraw = (id: string) => {
    if (!reason.trim() || !onWithdraw) return;
    onWithdraw(id, reason.trim());
    setWithdrawingId(null);
    setReason('');
  };

  return (
    <ol className="space-y-2">
      {revisions.map((r) => (
        <li key={r.id} className="flex items-start gap-3 rounded-md border border-border p-3 text-sm">
          <Badge variant="outline" className={`${GFO_STATUS_CLASS[STATUS_TONE[r.status]]} mt-0.5 shrink-0 border px-1.5 text-[10px]`}>
            {STATUS_LABEL[r.status]}
          </Badge>
          <div className="min-w-0 flex-1">
            <p className="font-medium">Rev {r.revision} <span className="font-normal text-muted-foreground">· effective {r.effectiveDate}</span></p>
            <p className="text-xs text-muted-foreground">
              Authored by {r.authorName}
              {r.decidedByName && r.status !== 'draft' && r.status !== 'pending-approval'
                ? ` · ${r.status === 'rejected' ? 'returned' : 'approved'} by ${r.decidedByName}`
                : ''}
              {r.publishedAtUtc ? ` · published ${new Date(r.publishedAtUtc).toLocaleDateString()}` : ''}
            </p>
            {r.status === 'rejected' && r.rejectionReason && (
              <p className="mt-1 text-xs text-muted-foreground">Reason: {r.rejectionReason}</p>
            )}
            {r.status === 'withdrawn' && r.withdrawalReason && (
              <p className="mt-1 text-xs text-muted-foreground">
                Withdrawn{r.withdrawnByName ? ` by ${r.withdrawnByName}` : ''}: {r.withdrawalReason}
              </p>
            )}
            {r.changeSummary.trim() && (
              <p className="mt-1 text-xs text-muted-foreground">What changed: {r.changeSummary}</p>
            )}
            {/* Which readers this revision answers — credit visible on the record,
                not only inside the change summary's prose. */}
            {(() => {
              const carried = suggestions.filter((s) => s.resolvedIntoRevisionId === r.id);
              if (carried.length === 0) return null;
              return (
                <p className="mt-1 text-xs text-sky-800 dark:text-sky-300">
                  Carries {carried.length} reader suggestion{carried.length === 1 ? '' : 's'} —{' '}
                  {[...new Set(carried.map((s) => s.authorName))].join(', ')}
                </p>
              );
            })()}

            {canManage && onWithdraw && WITHDRAWABLE.includes(r.status) && (
              withdrawingId === r.id ? (
                <div className="mt-2 space-y-2">
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Reason for withdrawal (required)…"
                    rows={2}
                    className="w-full rounded-md border border-border bg-background p-2 text-xs"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" disabled={!reason.trim()} onClick={() => confirmWithdraw(r.id)}>
                      Confirm withdrawal
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { setWithdrawingId(null); setReason(''); }}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <Button size="sm" variant="outline" className="mt-2" onClick={() => { setWithdrawingId(r.id); setReason(''); }}>
                  Withdraw…
                </Button>
              )
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
