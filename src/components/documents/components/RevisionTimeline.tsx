import { Badge } from '../../ui/badge';
import { GFO_STATUS_CLASS, type GfoStatus } from '../../gfo/status';
import type { DocRevision, RevisionStatus } from '../types';

const STATUS_TONE: Record<RevisionStatus, GfoStatus> = {
  draft: 'neutral',
  'pending-approval': 'warning',
  approved: 'info',
  published: 'success',
  superseded: 'neutral',
  rejected: 'error',
};

const STATUS_LABEL: Record<RevisionStatus, string> = {
  draft: 'Draft',
  'pending-approval': 'Pending approval',
  approved: 'Approved (scheduled)',
  published: 'Published',
  superseded: 'Superseded',
  rejected: 'Rejected',
};

/** Manager-facing revision history: who wrote it, who decided, when it went live. */
export function RevisionTimeline({ revisions }: { revisions: DocRevision[] }) {
  return (
    <ol className="space-y-2">
      {revisions.map((r) => (
        <li key={r.id} className="flex items-start gap-3 rounded-md border border-border p-3 text-sm">
          <Badge variant="outline" className={`${GFO_STATUS_CLASS[STATUS_TONE[r.status]]} mt-0.5 shrink-0 border px-1.5 text-[10px]`}>
            {STATUS_LABEL[r.status]}
          </Badge>
          <div className="min-w-0">
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
            {r.changeSummary.trim() && (
              <p className="mt-1 text-xs text-muted-foreground">What changed: {r.changeSummary}</p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
