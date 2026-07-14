import { useState } from 'react';
import { toast } from 'sonner';
import { Check, X, Send } from 'lucide-react';
import { Button } from '../../ui/button';
import { Textarea } from '../../ui/textarea';
import { getRoleLabelByValue } from '../../../lib/mockUsers';
import type { Doc, DocRevision, DocSuggestion } from '../types';
import { useDocuments } from '../DocumentsContext';
import { repliesFor } from '../engine/suggestions';

/** Inline thread for the open suggestions anchored to one block: proposal +
 * rationale, a short reply thread, and (for owner/managers) Accept→draft / Decline. */
export function InlineSuggestionThread({
  suggestions, doc, rev, userRole, canManage, onAccept, onClose,
}: {
  suggestions: DocSuggestion[];
  doc: Doc;
  rev: DocRevision;
  userRole: string;
  canManage: boolean;
  onAccept: (sug: DocSuggestion) => void; // reuses DocReader's accept→draft flow
  onClose: () => void;
}) {
  const { state, addSuggestionReply, resolveSuggestion } = useDocuments();
  const [replyFor, setReplyFor] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [declineFor, setDeclineFor] = useState<string | null>(null);
  const [note, setNote] = useState('');
  void doc; void rev;

  const sendReply = (id: string) => {
    if (replyText.trim().length < 2) { toast.error('Write a reply first.'); return; }
    addSuggestionReply(id, replyText, userRole);
    setReplyText(''); setReplyFor(null);
  };

  return (
    <div className="max-h-96 space-y-3 overflow-y-auto">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-sky-800 dark:text-sky-300">
          {suggestions.length} open suggestion{suggestions.length === 1 ? '' : 's'}
        </p>
        <button type="button" aria-label="Close" onClick={onClose}><X className="h-3.5 w-3.5 text-muted-foreground" /></button>
      </div>

      {suggestions.map((s) => (
        <div key={s.id} className="rounded-md border border-border p-2.5">
          <p className="text-sm">{s.proposedChange}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Why: {s.rationale} — {s.authorName} ({getRoleLabelByValue(s.role)})
          </p>

          {repliesFor(state.suggestionReplies, s.id).map((r) => (
            <div key={r.id} className="mt-2 border-l-2 border-sky-200 pl-2 dark:border-sky-800">
              <p className="text-sm">{r.text}</p>
              <p className="text-xs text-muted-foreground">{r.authorName} · {new Date(r.createdAtUtc).toLocaleString()}</p>
            </div>
          ))}

          {replyFor === s.id ? (
            <div className="mt-2 space-y-1.5">
              <Textarea value={replyText} onChange={(e) => setReplyText(e.target.value)} rows={2} placeholder="Reply…" />
              <div className="flex justify-end gap-1.5">
                <Button size="sm" variant="ghost" onClick={() => { setReplyFor(null); setReplyText(''); }}>Cancel</Button>
                <Button size="sm" onClick={() => sendReply(s.id)}><Send className="mr-1 h-3 w-3" /> Reply</Button>
              </div>
            </div>
          ) : (
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Button size="sm" variant="outline" onClick={() => setReplyFor(s.id)}>Reply</Button>
              {canManage && (
                <>
                  <Button size="sm" onClick={() => onAccept(s)}><Check className="mr-1 h-3 w-3" /> Accept → draft</Button>
                  <Button size="sm" variant="outline" onClick={() => setDeclineFor(declineFor === s.id ? null : s.id)}>Decline</Button>
                </>
              )}
            </div>
          )}

          {declineFor === s.id && (
            <div className="mt-2 space-y-1.5 rounded-md bg-muted/30 p-2">
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Note back to the reader (required)…" />
              <div className="flex justify-end gap-1.5">
                <Button size="sm" variant="ghost" onClick={() => { setDeclineFor(null); setNote(''); }}>Cancel</Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => {
                    if (note.trim().length < 5) { toast.error('A decline note is required.'); return; }
                    resolveSuggestion(s.id, 'declined', note.trim(), userRole);
                    setDeclineFor(null); setNote('');
                    toast.success('Suggestion declined with note.');
                  }}
                >Decline</Button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
