import { useState } from 'react';
import { toast } from 'sonner';
import { Send, PencilLine, Trash2, Check, X } from 'lucide-react';
import { Button } from '../../ui/button';
import { Textarea } from '../../ui/textarea';
import { getRoleLabelByValue } from '../../../lib/mockUsers';
import type { Doc } from '../types';
import { useDocuments, identityFor } from '../DocumentsContext';

/**
 * Discussion thread for comment-enabled classes (tribal knowledge).
 *
 * D60 closed the audit finding that authors could neither correct nor withdraw their own field
 * notes. Both are author-only and both leave a mark: an edit stamps "edited", a withdrawal marks the
 * note as withdrawn and NAMES who withdrew it — while keeping what it said. Nothing is silently
 * rewritten and nothing vanishes out of a thread other people have already replied to — the same
 * reasoning that makes `DocSuggestionReply` append-only.
 *
 * The withdrawal used to clear the text and fire on a single unconfirmed click, which is a delete
 * wearing the word "tombstone": one misclick unrecoverably destroyed a field note and the record
 * could not say what had been withdrawn. It now asks first, and the text stays, struck through.
 *
 * The authority check is in the reducer (`EDIT_COMMENT` / `DELETE_COMMENT`); these controls are only
 * the affordance.
 */
export function CommentThread({ doc, userRole }: { doc: Doc; userRole: string }) {
  const { state, addComment, editComment, deleteComment } = useDocuments();
  const [text, setText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const { userId } = identityFor(userRole);
  const comments = state.comments
    .filter((c) => c.docId === doc.id)
    .sort((a, b) => a.createdAtUtc.localeCompare(b.createdAtUtc));

  const submit = () => {
    if (text.trim().length < 3) {
      toast.error('Write a comment first.');
      return;
    }
    addComment(doc.id, text, userRole);
    setText('');
  };

  const beginEdit = (id: string, current: string) => {
    setEditingId(id);
    setDraft(current);
  };

  const saveEdit = (id: string) => {
    // Trim at COMMIT, never inside onChange on a controlled field — normalizing per
    // keystroke makes a trailing space unable to survive the round trip and eats it.
    if (!draft.trim()) {
      toast.error('An empty comment is a withdrawal — use Withdraw.');
      return;
    }
    editComment(id, draft, userRole);
    setEditingId(null);
    setDraft('');
  };

  return (
    <div className="space-y-3">
      {comments.length === 0 ? (
        <p className="text-sm text-muted-foreground">No comments yet — field reports welcome.</p>
      ) : (
        <ul className="space-y-3">
          {comments.map((c) => {
            const mine = c.authorUserId === userId;
            const editing = editingId === c.id;
            return (
              <li key={c.id} className="rounded-md border border-border p-3 text-sm">
                {c.deletedAtUtc ? (
                  <>
                    {/* The note itself is kept, struck through: the thread has to be able to say
                        what was withdrawn — people may already have acted on it. `isLiveComment`
                        is what keeps it out of the counts crews are shown. */}
                    <p className="line-through text-muted-foreground">{c.text}</p>
                    <p className="mt-1.5 text-xs italic text-muted-foreground">
                      Comment withdrawn by {c.authorName} · {new Date(c.deletedAtUtc).toLocaleString()} —
                      kept on the record, marked as no longer relied on.
                    </p>
                  </>
                ) : editing ? (
                  <div className="space-y-2">
                    <Textarea
                      aria-label="Edit comment"
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      rows={2}
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => saveEdit(c.id)}>
                        <Check className="mr-1.5 h-3.5 w-3.5" /> Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => { setEditingId(null); setDraft(''); }}>
                        <X className="mr-1.5 h-3.5 w-3.5" /> Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p>{c.text}</p>
                    <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs text-muted-foreground">
                        {c.authorName} ({getRoleLabelByValue(c.role)}) · {new Date(c.createdAtUtc).toLocaleString()}
                        {c.editedAtUtc && (
                          <span title={`Edited ${new Date(c.editedAtUtc).toLocaleString()}`}> · edited</span>
                        )}
                      </p>
                      {mine && confirmingId !== c.id && (
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs"
                            onClick={() => beginEdit(c.id, c.text)}
                          >
                            <PencilLine className="mr-1 h-3.5 w-3.5" /> Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs"
                            onClick={() => setConfirmingId(c.id)}
                          >
                            <Trash2 className="mr-1 h-3.5 w-3.5" /> Withdraw
                          </Button>
                        </div>
                      )}
                    </div>
                    {mine && confirmingId === c.id && (
                      // Asked, not assumed. A withdrawal cannot be undone by the author (the reducer
                      // refuses any further change to a withdrawn comment), so a single stray click
                      // must not be able to reach it.
                      <div className="mt-2 rounded-md border border-border bg-muted/40 p-2">
                        <p className="text-xs text-muted-foreground">
                          Withdraw this note? It stays on the record, marked as withdrawn and named —
                          and it cannot be edited or restored afterwards.
                        </p>
                        <div className="mt-1.5 flex gap-2">
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-7 px-2 text-xs"
                            onClick={() => { deleteComment(c.id, userRole); setConfirmingId(null); }}
                          >
                            Withdraw it
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-xs"
                            onClick={() => setConfirmingId(null)}
                          >
                            Keep it
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <div className="flex items-end gap-2">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add what you learned in the field…"
          rows={2}
          className="flex-1"
        />
        <Button size="sm" onClick={submit} className="shrink-0">
          <Send className="mr-1.5 h-3.5 w-3.5" /> Comment
        </Button>
      </div>
    </div>
  );
}
