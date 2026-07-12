import { Link } from 'react-router-dom';
import { ChevronRight, CheckCircle2 } from 'lucide-react';
import { Badge } from '../../ui/badge';
import { GFO_STATUS_CLASS } from '../../gfo/status';
import { GfoEmptyState } from '../../gfo';
import { useDocuments, identityFor } from '../DocumentsContext';
import { unacknowledgedRequiredReads, isOverdue } from '../engine/acknowledgments';
import { classFor } from '../classes';
import { DocIdentityLine } from './DocIdentity';
import { operatorTodayIso } from '../../../lib/operatorDate';

/** "My required reads" — every published revision the current user still owes.
 * Used by the hub tab and re-pointed surfaces (Safety Center Documents tab). */
export function RequiredReadsList({ userRole }: { userRole: string }) {
  const { state } = useDocuments();
  const { userId } = identityFor(userRole);
  const todayIso = operatorTodayIso();
  const outstanding = unacknowledgedRequiredReads(
    state.docs,
    state.revisions,
    state.acknowledgments,
    userRole,
    userId,
  );

  if (outstanding.length === 0) {
    return (
      <GfoEmptyState
        icon={<CheckCircle2 />}
        message="All caught up — no outstanding read-and-acknowledge items."
      />
    );
  }

  return (
    <ul className="divide-y divide-border rounded-lg border border-border bg-card">
      {outstanding.map(({ doc, rev }) => {
        const cfg = classFor(doc.classId);
        const to = cfg.readerRoute === '/documents' ? `/documents/${doc.id}` : cfg.readerRoute;
        const overdue = isOverdue(rev, todayIso);
        return (
          <li key={rev.id}>
            <Link
              to={to}
              className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50"
            >
              <div className="min-w-0 flex-1">
                <DocIdentityLine doc={doc} rev={rev} />
                {rev.changeSummary.trim() && (
                  <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                    What changed: {rev.changeSummary}
                  </p>
                )}
              </div>
              <Badge
                variant="outline"
                className={`${GFO_STATUS_CLASS[overdue ? 'error' : 'warning']} shrink-0 border px-1.5 text-[10px]`}
              >
                {overdue
                  ? 'Overdue'
                  : rev.ackLevel === 'signature'
                    ? 'Read & sign'
                    : 'Read & initial'}
              </Badge>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
