import { Badge } from '../../ui/badge';
import { GFO_STATUS_CLASS } from '../../gfo/status';
import type { Doc } from '../types';
import { reviewStatus } from '../engine/review';

/** Periodic-review state chip — RAG used semantically (review currency), managers only. */
export function ReviewFlagBadge({ doc, todayIso }: { doc: Doc; todayIso: string }) {
  const s = reviewStatus(doc, todayIso);
  if (s === 'none' || s === 'ok') return null;
  return (
    <Badge
      variant="outline"
      className={`${GFO_STATUS_CLASS[s === 'overdue' ? 'error' : 'warning']} border px-1.5 text-[10px]`}
    >
      {s === 'overdue' ? 'Review overdue' : 'Review due soon'}
    </Badge>
  );
}
