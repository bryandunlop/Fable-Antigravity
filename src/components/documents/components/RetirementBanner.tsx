import { Link } from 'react-router-dom';
import { Archive } from 'lucide-react';
import type { Doc } from '../types';
import { docReaderPath } from '../classes';
import { formatDateOnly } from '../../../lib/operatorDate';

/**
 * "This is no longer the operative instruction" (TL-46).
 *
 * A retired bulletin stays readable — it is the record of what crews were told on
 * a date, and its acknowledgements stand. What it must not do is read as current,
 * because somebody arriving from a bookmark, a search result or an old email link
 * has no other way to know its content moved.
 *
 * Neutral rather than alarming: nothing is wrong here, and a red banner on a
 * correctly-superseded document would train people to ignore red banners.
 */
export function RetirementBanner({ doc }: { doc: Doc }) {
  if (!doc.retirement) return null;
  const { intoDocId, retiredOn } = doc.retirement;

  return (
    <div className="mb-4 flex items-start gap-3 rounded-md border border-border bg-muted/40 p-3.5">
      <Archive className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">Retired — this is no longer the operative instruction</p>
        <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
          Its content was folded into{' '}
          <Link to={docReaderPath(intoDocId)} className="font-medium text-accent hover:underline">
            {intoDocId}
          </Link>{' '}
          on {formatDateOnly(retiredOn, { day: 'numeric', month: 'short', year: 'numeric' })}. This
          copy is kept as a record of what was issued, and the acknowledgements against it stand.
        </p>
      </div>
    </div>
  );
}
