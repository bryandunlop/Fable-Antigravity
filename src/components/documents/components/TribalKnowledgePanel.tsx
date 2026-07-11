import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Lightbulb, MessageSquare, Pin, Plus } from 'lucide-react';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { GfoEmptyState } from '../../gfo';
import { useDocuments } from '../DocumentsContext';
import { classFor } from '../classes';
import { canAuthor } from '../engine/lifecycle';
import { currentRevision } from '../engine/revisions';
import { reviewStatus } from '../engine/review';
import { suggestionCounts } from '../engine/suggestions';
import { GFO_STATUS_CLASS } from '../../gfo/status';
import { DocEditorDialog } from './DocEditorDialog';
import { ReviewFlagBadge } from './ReviewFlagBadge';

/** Curated tribal knowledge: curators add/edit; everyone reads and comments.
 * Entries carry an owner and a staleness (review) date so knowledge can't rot silently. */
export function TribalKnowledgePanel({ userRole, additionalRoles = [] }: { userRole: string; additionalRoles?: string[] }) {
  const { state } = useDocuments();
  const [creating, setCreating] = useState(false);
  const todayIso = new Date().toISOString().slice(0, 10);
  const curator = canAuthor(classFor('tribal-knowledge'), [userRole, ...additionalRoles]);

  const entries = state.docs
    .filter((d) => d.classId === 'tribal-knowledge' && !d.isArchived)
    .sort((a, b) => Number(b.isPinned) - Number(a.isPinned) || b.createdDate.localeCompare(a.createdDate));

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <p className="max-w-2xl text-sm text-muted-foreground">
          Field-proven knowledge that isn't (yet) procedure — airport gotchas, aircraft quirks, what actually
          works. Curated by managers and specialists; anyone can read and comment. Proven entries graduate
          into SOPs and bulletins via the normal approval flow.
        </p>
        {curator && (
          <Button size="sm" onClick={() => setCreating(true)} className="shrink-0">
            <Plus className="mr-1.5 h-4 w-4" /> New entry
          </Button>
        )}
      </div>

      {entries.length === 0 ? (
        <GfoEmptyState icon={<Lightbulb />} message="No tribal knowledge entries yet." circle="sunrise" />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {entries.map((doc) => {
            const rev = currentRevision(doc.id, state.revisions);
            const comments = state.comments.filter((c) => c.docId === doc.id).length;
            const stale = reviewStatus(doc, todayIso) === 'overdue';
            const sugs = suggestionCounts(state.suggestions, doc.id);
            return (
              <Link
                key={doc.id}
                to={`/documents/${doc.id}`}
                className="rounded-lg border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex items-start gap-2">
                  {doc.isPinned && <Pin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gfo-daylight" />}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium leading-snug">{doc.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{doc.category} · {doc.id}</p>
                  </div>
                  {stale ? (
                    <Badge variant="outline" className={`${GFO_STATUS_CLASS.warning} shrink-0 border px-1.5 text-[10px]`}>
                      Needs re-verify
                    </Badge>
                  ) : (
                    <ReviewFlagBadge doc={doc} todayIso={todayIso} />
                  )}
                </div>
                <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                  <span>Owner: {doc.ownerName}</span>
                  {rev && <span>updated {rev.effectiveDate}</span>}
                  <span className="inline-flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" /> {comments}
                  </span>
                  {sugs.open > 0 && <span>{sugs.open} open suggestion{sugs.open === 1 ? '' : 's'}</span>}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <DocEditorDialog
        open={creating}
        onOpenChange={setCreating}
        mode={{ kind: 'create', classId: 'tribal-knowledge' }}
        userRole={userRole}
        additionalRoles={additionalRoles}
      />
    </div>
  );
}
