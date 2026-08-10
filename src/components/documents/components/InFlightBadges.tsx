import { Badge } from '../../ui/badge';
import { GFO_STATUS_CLASS } from '../../gfo/status';
import type { Doc, DocRevision, DocSuggestion } from '../types';
import { docInFlight } from '../engine/workbench';

/**
 * "What is happening to this document right now", in one strip.
 *
 * The library list used to show only the published revision, so a document with
 * three open suggestions and a draft in review looked identical to a dormant
 * one. These badges are the same in the library row, the reader header and the
 * workbench header, so a maintainer learns one vocabulary.
 *
 * Suggestion and draft chips are sky/blue — the lane already reserved for reader
 * feedback in BlockSuggestGutter. Review currency keeps RAG, because that one IS
 * semantically red/amber (overdue vs due soon).
 */
export function InFlightBadges({
  doc,
  revisions,
  suggestions,
  todayIso,
  className = '',
}: {
  doc: Doc;
  revisions: DocRevision[];
  suggestions: DocSuggestion[];
  todayIso: string;
  className?: string;
}) {
  const f = docInFlight(doc, revisions, suggestions, todayIso);
  if (!f.hasActivity) return null;

  return (
    <span className={`inline-flex flex-wrap items-center gap-1.5 ${className}`}>
      {f.openSuggestionCount > 0 && (
        <Badge
          variant="outline"
          className="border-sky-300 bg-sky-50 px-1.5 text-[10px] text-sky-900 dark:border-sky-800 dark:bg-sky-950/50 dark:text-sky-200"
          title="Open reader suggestions awaiting triage"
        >
          {f.openSuggestionCount} suggestion{f.openSuggestionCount === 1 ? '' : 's'}
        </Badge>
      )}
      {f.workingDraft && (
        <Badge variant="secondary" className="px-1.5 text-[10px]" title="A working draft is open on this document">
          Working draft{f.stagedCount > 0 ? ` · ${f.stagedCount} staged` : ''}
        </Badge>
      )}
      {f.pendingApproval && (
        <Badge
          variant="outline"
          className={`${GFO_STATUS_CLASS.warning} border px-1.5 text-[10px]`}
          title="Submitted — waiting on a second pair of eyes"
        >
          Rev {f.pendingApproval.revision} pending approval
        </Badge>
      )}
      {f.scheduled && (
        <Badge variant="outline" className="px-1.5 text-[10px]" title="Approved — publishes on its effective date">
          Rev {f.scheduled.revision} scheduled
        </Badge>
      )}
      {(f.review === 'overdue' || f.review === 'due-soon') && (
        <Badge
          variant="outline"
          className={`${GFO_STATUS_CLASS[f.review === 'overdue' ? 'error' : 'warning']} border px-1.5 text-[10px]`}
        >
          {f.review === 'overdue' ? 'Review overdue' : 'Review due soon'}
        </Badge>
      )}
    </span>
  );
}
