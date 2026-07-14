import { useState } from 'react';
import { toast } from 'sonner';
import { CalendarCheck2 } from 'lucide-react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import type { Doc } from '../types';
import { useDocuments } from '../DocumentsContext';
import { reviewStatus } from '../engine/review';
import { ReviewFlagBadge } from './ReviewFlagBadge';
import { operatorTodayIso } from '../../../lib/operatorDate';

/** Periodic-review controls (managers). Completing a review advances the
 * doc's next-review date by its cycle; publishing a revision also resets it. */
export function ReviewPanel({ doc, userRole, additionalRoles = [] }: { doc: Doc; userRole: string; additionalRoles?: string[] }) {
  const { state, completeReview } = useDocuments();
  const [note, setNote] = useState('');
  const todayIso = operatorTodayIso();
  const status = reviewStatus(doc, todayIso);
  const lastReview = state.reviews
    .filter((r) => r.docId === doc.id)
    .sort((a, b) => b.reviewedAtUtc.localeCompare(a.reviewedAtUtc))[0];

  if (!doc.reviewCycleDays && status === 'none') return null;

  return (
    <div className="space-y-2 rounded-md border border-border p-4">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <CalendarCheck2 className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium">Periodic review</span>
        {doc.nextReviewDate && <span className="text-muted-foreground">next due {doc.nextReviewDate}</span>}
        <ReviewFlagBadge doc={doc} todayIso={todayIso} />
      </div>
      {lastReview && (
        <p className="text-xs text-muted-foreground">
          Last reviewed {new Date(lastReview.reviewedAtUtc).toLocaleDateString()} by {lastReview.reviewedByName} (
          {lastReview.outcome === 'reaffirmed' ? 'reaffirmed current' : 'revision started'})
          {lastReview.note ? ` — ${lastReview.note}` : ''}
        </p>
      )}
      <div className="flex items-center gap-2">
        <Input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Review note (optional)"
          className="h-8 text-xs"
        />
        <Button
          size="sm"
          variant="secondary"
          className="shrink-0"
          onClick={() => {
            completeReview(doc.id, 'reaffirmed', note.trim() || undefined, userRole, additionalRoles);
            setNote('');
            toast.success('Review recorded — content reaffirmed current.');
          }}
        >
          Mark review complete
        </Button>
      </div>
    </div>
  );
}
