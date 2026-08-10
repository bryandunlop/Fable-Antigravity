import { useState } from 'react';
import { toast } from 'sonner';
import { Check, CornerDownRight, MessageSquareText, X } from 'lucide-react';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Textarea } from '../../ui/textarea';
import { GfoEmptyState } from '../../gfo';
import type { Doc, DocSuggestion } from '../types';
import { useDocuments } from '../DocumentsContext';
import { anchorFor, anchorBlockMd, repliesFor } from '../engine/suggestions';
import { currentRevision } from '../engine/revisions';
import { inFlightRevision } from '../engine/workbench';
import { getRoleLabelByValue } from '../../../lib/mockUsers';

/**
 * Triage a document's reader suggestions IN PLACE.
 *
 * Accepting does not navigate anywhere and does not open the revision editor.
 * Each accept stages the reader's words into the document's single working
 * draft, so a maintainer can work through five suggestions and end with one
 * draft carrying five staged changes — the batching this surface exists for.
 */
export function SuggestionTriageList({
  doc,
  userRole,
  additionalRoles = [],
  canManage,
  highlightId,
}: {
  doc: Doc;
  userRole: string;
  additionalRoles?: string[];
  canManage: boolean;
  highlightId?: string;
}) {
  const { state, resolveSuggestion, acceptSuggestionIntoDraft, addSuggestionReply } = useDocuments();
  const [declining, setDeclining] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [replying, setReplying] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  const open = state.suggestions
    .filter((s) => s.docId === doc.id && s.status === 'open')
    .slice()
    .sort((a, b) => a.createdAtUtc.localeCompare(b.createdAtUtc));

  const inFlight = inFlightRevision(doc.id, state.revisions);
  const published = currentRevision(doc.id, state.revisions);
  // Two different reasons accepting is unavailable, and the maintainer needs to
  // know WHICH — one is "wait", the other is "there is nothing to revise".
  const blockedByApproval = inFlight?.status === 'pending-approval' ? inFlight : undefined;
  const nothingToReviseYet = !inFlight && !published;

  const accept = (s: DocSuggestion) => {
    acceptSuggestionIntoDraft(s.id, userRole, additionalRoles);
    toast.success(
      inFlightRevision(doc.id, state.revisions)
        ? 'Staged into the working draft.'
        : 'Working draft started — the change is staged in it.',
    );
  };

  if (open.length === 0) {
    return <GfoEmptyState message="No open suggestions on this document." icon={<MessageSquareText />} />;
  }

  return (
    <div className="space-y-3">
      {blockedByApproval && (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-900/10 dark:text-amber-200">
          Rev {blockedByApproval.revision} is with an approver. Accepted suggestions
          would fork a draft underneath them, so accepting waits until it is decided —
          or withdraw it from the History tab.
        </p>
      )}
      {nothingToReviseYet && (
        <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          This document has no published revision yet, so there is nothing to revise.
          Publish it first, then these suggestions can be staged.
        </p>
      )}

      <ul className="divide-y divide-border rounded-lg border border-border bg-card">
        {open.map((s) => {
          const anchor = anchorFor(s, state.revisions);
          const anchorText = anchorBlockMd(s, state.revisions);
          const replies = repliesFor(state.suggestionReplies, s.id);
          return (
            <li
              key={s.id}
              className={`px-4 py-3 ${s.id === highlightId ? 'bg-sky-50/60 dark:bg-sky-950/20' : ''}`}
            >
              {anchor && (
                <Badge variant="secondary" className="mb-2 px-1.5 text-[10px] font-normal">{anchor}</Badge>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                {/* The document as it reads today, beside what the reader wants —
                    the comparison a maintainer previously had to do from memory. */}
                <div className="rounded-md border border-border bg-muted/30 p-2.5">
                  <p className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">Currently reads</p>
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                    {anchorText ?? 'Not anchored to a specific block.'}
                  </p>
                </div>
                <div className="rounded-md border border-sky-200 bg-sky-50/60 p-2.5 dark:border-sky-900 dark:bg-sky-950/20">
                  <p className="mb-1 text-[10px] uppercase tracking-wide text-sky-800 dark:text-sky-300">Suggested</p>
                  <p className="whitespace-pre-wrap text-sm">{s.proposedChange}</p>
                </div>
              </div>

              <p className="mt-2 text-xs text-muted-foreground">
                Why: {s.rationale} — {s.authorName} ({getRoleLabelByValue(s.role)}),{' '}
                {new Date(s.createdAtUtc).toLocaleDateString()}
              </p>

              {replies.length > 0 && (
                <ul className="mt-2 space-y-1 border-l-2 border-border pl-3">
                  {replies.map((r) => (
                    <li key={r.id} className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{r.authorName}</span>: {r.text}
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                {canManage && (
                  <Button
                    size="sm"
                    onClick={() => accept(s)}
                    disabled={!!blockedByApproval || nothingToReviseYet}
                  >
                    <Check className="mr-1 h-3.5 w-3.5" /> Stage into draft
                  </Button>
                )}
                {canManage && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { setDeclining(declining === s.id ? null : s.id); setNote(''); }}
                  >
                    <X className="mr-1 h-3.5 w-3.5" /> Decline
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => { setReplying(replying === s.id ? null : s.id); setReplyText(''); }}
                >
                  <CornerDownRight className="mr-1 h-3.5 w-3.5" /> Reply
                </Button>
              </div>

              {replying === s.id && (
                <div className="mt-2 space-y-2">
                  <Textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Reply to the reader…"
                    rows={2}
                  />
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setReplying(null)}>Cancel</Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        if (replyText.trim().length < 2) { toast.error('Write a reply first.'); return; }
                        addSuggestionReply(s.id, replyText.trim(), userRole);
                        setReplying(null);
                        setReplyText('');
                      }}
                    >
                      Send
                    </Button>
                  </div>
                </div>
              )}

              {declining === s.id && (
                <div className="mt-2 space-y-2 rounded-md border border-border bg-muted/30 p-3">
                  <Textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Note back to the reader (required)…"
                    rows={2}
                  />
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="ghost" onClick={() => { setDeclining(null); setNote(''); }}>Cancel</Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        if (note.trim().length < 5) { toast.error('A decline note is required.'); return; }
                        resolveSuggestion(s.id, 'declined', note.trim(), userRole, additionalRoles);
                        setDeclining(null);
                        setNote('');
                        toast.success('Declined, with your note back to the reader.');
                      }}
                    >
                      Decline
                    </Button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
