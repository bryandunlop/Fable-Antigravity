import { Link } from 'react-router-dom';
import { ArrowRight, MessageSquareText } from 'lucide-react';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { GfoEmptyState } from '../../gfo';
import { useDocuments, identityFor } from '../DocumentsContext';
import { docManagePath } from '../classes';
import { openSuggestions, openSuggestionsForOwner, anchorFor } from '../engine/suggestions';
import { suggestionOutcome, type SuggestionOutcome } from '../engine/workbench';

const SEE_ALL_ROLES = ['document-manager', 'admin'];

/** What became of a suggestion, in words its author would recognise. */
const OUTCOME_LABEL: Record<SuggestionOutcome, string> = {
  open: 'open',
  declined: 'declined',
  'staged-in-draft': 'staged in a draft',
  'pending-approval': 'in a revision pending approval',
  scheduled: 'in a revision scheduled to publish',
  published: 'published',
  dropped: 'not carried forward',
};

/**
 * The CROSS-DOCUMENT suggestion queue: "across everything I own, what needs me".
 *
 * It deliberately does not act on suggestions. Accepting one is a judgement made
 * beside that document's other open work, so every row links into the document's
 * workbench rather than duplicating triage here — which is what produced two
 * accept paths that could disagree.
 */
export function SuggestionQueuePanel({ userRole, additionalRoles = [] }: { userRole: string; additionalRoles?: string[] }) {
  const { state } = useDocuments();
  const { userId } = identityFor(userRole);
  const seesAll = [userRole, ...additionalRoles].some((r) => SEE_ALL_ROLES.includes(r));
  const queue = seesAll
    ? openSuggestions(state.suggestions)
    : openSuggestionsForOwner(state.suggestions, state.docs, userId);

  const resolved = state.suggestions
    .filter((s) => s.status !== 'open')
    .sort((a, b) => (b.resolvedAtUtc ?? '').localeCompare(a.resolvedAtUtc ?? ''))
    .slice(0, 5);

  return (
    <div className="space-y-4">
      {queue.length === 0 ? (
        <GfoEmptyState message="No open suggestions." icon={<MessageSquareText />} />
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border bg-card">
          {queue.map((s) => {
            const anchor = anchorFor(s, state.revisions);
            return (
              <li key={s.id} className="flex items-start gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm">
                    <span className="font-medium">{s.docTitle}</span>
                    <span className="text-muted-foreground"> · {s.docId}</span>
                    {anchor && <Badge variant="secondary" className="ml-2 px-1.5 text-[10px]">{anchor}</Badge>}
                  </p>
                  <p className="mt-1 text-sm">{s.proposedChange}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Why: {s.rationale} — {s.authorName}, {new Date(s.createdAtUtc).toLocaleDateString()}
                  </p>
                </div>
                <Button size="sm" variant="outline" asChild className="shrink-0">
                  <Link to={docManagePath(s.docId, { tab: 'suggestions', suggestion: s.id })}>
                    Open in Manage <ArrowRight className="ml-1 h-3.5 w-3.5" />
                  </Link>
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      {resolved.length > 0 && (
        <div>
          <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Recently resolved</p>
          <ul className="space-y-1.5 text-xs text-muted-foreground">
            {resolved.map((s) => {
              // Derived from the revision carrying it — a suggestion whose draft was
              // withdrawn must not still read as though it shipped.
              const outcome = suggestionOutcome(s, state.revisions);
              return (
                <li key={s.id}>
                  <span className={outcome === 'published' ? 'text-emerald-600' : ''}>{OUTCOME_LABEL[outcome]}</span>
                  {' — '}{s.docTitle}: “{s.proposedChange.slice(0, 80)}{s.proposedChange.length > 80 ? '…' : ''}”
                  {s.resolutionNote ? ` (${s.resolutionNote})` : ''}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
