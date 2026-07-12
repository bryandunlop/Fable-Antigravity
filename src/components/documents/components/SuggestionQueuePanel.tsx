import { useState } from 'react';
import { toast } from 'sonner';
import { Check, MessageSquareText, X } from 'lucide-react';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Textarea } from '../../ui/textarea';
import { GfoEmptyState } from '../../gfo';
import { useDocuments, identityFor } from '../DocumentsContext';
import { openSuggestions, openSuggestionsForOwner } from '../engine/suggestions';
import { currentRevision } from '../engine/revisions';
import {
  IDLE_ACCEPT_FLOW,
  beginAccept,
  acceptFlowOnPersisted,
  acceptFlowOnCancelled,
  acceptPrefill,
  type AcceptFlow,
} from '../engine/acceptFlow';
import { DocEditorDialog, type EditorMode } from './DocEditorDialog';

const SEE_ALL_ROLES = ['document-manager', 'admin'];

/** Owner feedback queue. Accepting a suggestion opens a pre-filled draft
 * revision and records the decision only once that draft is actually persisted
 * (C4 — cancelling the editor leaves the suggestion open); declining requires
 * a note back to the reader. */
export function SuggestionQueuePanel({ userRole, additionalRoles = [] }: { userRole: string; additionalRoles?: string[] }) {
  const { state, resolveSuggestion } = useDocuments();
  const [declining, setDeclining] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [editor, setEditor] = useState<EditorMode | null>(null);
  const [acceptFlow, setAcceptFlow] = useState<AcceptFlow>(IDLE_ACCEPT_FLOW);

  const { userId } = identityFor(userRole);
  const seesAll = [userRole, ...additionalRoles].some((r) => SEE_ALL_ROLES.includes(r));
  const queue = seesAll
    ? openSuggestions(state.suggestions)
    : openSuggestionsForOwner(state.suggestions, state.docs, userId);

  const resolved = state.suggestions
    .filter((s) => s.status !== 'open')
    .sort((a, b) => (b.resolvedAtUtc ?? '').localeCompare(a.resolvedAtUtc ?? ''))
    .slice(0, 5);

  const accept = (id: string) => {
    const sug = state.suggestions.find((s) => s.id === id)!;
    const doc = state.docs.find((d) => d.id === sug.docId);
    const baseRev = doc ? currentRevision(doc.id, state.revisions) : undefined;
    if (!doc || !baseRev) {
      toast.error('No published revision to revise — the suggestion stays open.');
      return;
    }
    // Resolution waits until the draft actually exists (onPersisted below).
    setAcceptFlow(beginAccept(id));
    setEditor({ kind: 'revise', doc, baseRev, prefill: acceptPrefill(sug) });
  };

  const onEditorPersisted = () => {
    const { resolveSuggestionId, flow } = acceptFlowOnPersisted(acceptFlow);
    setAcceptFlow(flow);
    if (resolveSuggestionId) {
      resolveSuggestion(resolveSuggestionId, 'accepted', undefined, userRole);
      toast.success('Suggestion accepted — draft created.');
    }
  };

  return (
    <div className="space-y-4">
      {queue.length === 0 ? (
        <GfoEmptyState message="No open suggestions." icon={<MessageSquareText />} />
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border bg-card">
          {queue.map((s) => (
            <li key={s.id} className="px-4 py-3">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm">
                    <span className="font-medium">{s.docTitle}</span>
                    <span className="text-muted-foreground"> · {s.docId}</span>
                    {s.sectionRef && <Badge variant="secondary" className="ml-2 px-1.5 text-[10px]">{s.sectionRef}</Badge>}
                  </p>
                  <p className="mt-1 text-sm">{s.proposedChange}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Why: {s.rationale} — {s.authorName}, {new Date(s.createdAtUtc).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <Button size="sm" onClick={() => accept(s.id)}>
                    <Check className="mr-1 h-3.5 w-3.5" /> Accept → draft
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setDeclining(declining === s.id ? null : s.id)}>
                    <X className="mr-1 h-3.5 w-3.5" /> Decline
                  </Button>
                </div>
              </div>
              {declining === s.id && (
                <div className="mt-3 space-y-2 rounded-md border border-border bg-muted/30 p-3">
                  <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note back to the reader (required)…" rows={2} />
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="ghost" onClick={() => { setDeclining(null); setNote(''); }}>Cancel</Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        if (note.trim().length < 5) { toast.error('A decline note is required.'); return; }
                        resolveSuggestion(s.id, 'declined', note.trim(), userRole);
                        setDeclining(null);
                        setNote('');
                        toast.success('Suggestion declined with note.');
                      }}
                    >
                      Decline
                    </Button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {resolved.length > 0 && (
        <div>
          <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Recently resolved</p>
          <ul className="space-y-1.5 text-xs text-muted-foreground">
            {resolved.map((s) => (
              <li key={s.id}>
                <span className={s.status === 'accepted' ? 'text-emerald-600' : ''}>{s.status}</span> — {s.docTitle}: “{s.proposedChange.slice(0, 80)}{s.proposedChange.length > 80 ? '…' : ''}”
                {s.resolutionNote ? ` (${s.resolutionNote})` : ''}
              </li>
            ))}
          </ul>
        </div>
      )}

      {editor && (
        <DocEditorDialog
          open={!!editor}
          onOpenChange={(o) => {
            if (!o) {
              setEditor(null);
              // Closed without persisting → nothing resolves; suggestion stays open.
              setAcceptFlow(acceptFlowOnCancelled(acceptFlow).flow);
            }
          }}
          onPersisted={onEditorPersisted}
          mode={editor}
          userRole={userRole}
          additionalRoles={additionalRoles}
        />
      )}
    </div>
  );
}
