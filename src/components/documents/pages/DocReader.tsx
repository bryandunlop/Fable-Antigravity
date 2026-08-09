import { useState, useMemo, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, FilePlus2, MessageSquare, MessageSquarePlus, PencilLine, History, Users, GitCompareArrows, ChevronUp, ChevronDown, Printer, FileText } from 'lucide-react';
import { Button } from '../../ui/button';
import { GfoPanel, GfoEmptyState } from '../../gfo';
import { SectionedContent } from '../components/SectionedContent';
import { RevisionMedia } from '../components/RevisionMedia';
import { DiffedContent } from '../components/DiffedContent';
import { useDocuments } from '../DocumentsContext';
import { classFor } from '../classes';
import { canAuthor } from '../engine/lifecycle';
import { currentRevision, revisionsFor, priorPublishedRevision } from '../engine/revisions';
import { workingDraft } from '../engine/workbench';
import { diffRevisions } from '../engine/diff';
import { canManageDocuments } from '../roles';
import { documentsRoleUniverse } from '../roles';
import { readersFor } from '../engine/compliance';
import { AckPanel } from '../components/AckPanel';
import { ComplianceRoster } from '../components/ComplianceRoster';
import { SuggestionDialog } from '../components/SuggestionDialog';
import { CommentThread } from '../components/CommentThread';
import { CasMetaBanner } from '../components/CasMetaBanner';
import { DocIdentityHeader } from '../components/DocIdentity';
import { DocEditorDialog, type EditorMode } from '../components/DocEditorDialog';
import { RevisionTimeline } from '../components/RevisionTimeline';
import { ReviewPanel } from '../components/ReviewPanel';
import { BlockSuggestGutter } from '../components/BlockSuggestGutter';
import { InlineSuggestComposer } from '../components/InlineSuggestComposer';
import { InlineSuggestionThread } from '../components/InlineSuggestionThread';
import { openSuggestionsByBlock, canSeeSuggestion } from '../engine/suggestions';
import { identityFor, publishWithdrawnEvent } from '../DocumentsContext';
import {
  IDLE_ACCEPT_FLOW, beginAccept, acceptFlowOnPersisted, acceptFlowOnCancelled, acceptPrefill, type AcceptFlow,
} from '../engine/acceptFlow';
import type { DocSuggestion } from '../types';
import { toast } from 'sonner';
import { printDocument } from '../util/printDocument';
import { buildReviewDocx } from '../engine/docxExport';
import { SyncAgeChip } from '../components/SyncAgeChip';

export function DocReader({ userRole, additionalRoles = [] }: { userRole: string; additionalRoles?: string[] }) {
  const { docId } = useParams<{ docId: string }>();
  const { state, resolveSuggestion, withdrawDraft } = useDocuments();
  const [editor, setEditor] = useState<EditorMode | null>(null);
  const [suggesting, setSuggesting] = useState(false);
  const [showChanges, setShowChanges] = useState(true);
  const [activeBlock, setActiveBlock] = useState<{ id: string; mode: 'compose' | 'thread' } | null>(null);
  const [acceptFlow, setAcceptFlow] = useState<AcceptFlow>(IDLE_ACCEPT_FLOW);
  const articleRef = useRef<HTMLElement>(null);
  const changeIdxRef = useRef(-1);

  const doc = state.docs.find((d) => d.id === docId);
  const rev = doc ? currentRevision(doc.id, state.revisions) : undefined;
  const allRevs = doc ? revisionsFor(doc.id, state.revisions) : [];
  const priorRev = doc && rev ? priorPublishedRevision(doc.id, state.revisions) : undefined;
  const diff = useMemo(() => (rev && priorRev ? diffRevisions(priorRev, rev) : null), [rev, priorRev]);
  const changeCount = diff ? diff.counts.total : 0;
  const showingDiff = !!(diff?.hasChanges && showChanges);
  const { userId } = identityFor(userRole);
  const byBlock = useMemo(() => openSuggestionsByBlock(state.suggestions), [state.suggestions]);

  const gotoChange = (dir: 1 | -1) => {
    const nodes = articleRef.current?.querySelectorAll<HTMLElement>('[data-changed]');
    if (!nodes || nodes.length === 0) return;
    changeIdxRef.current = (changeIdxRef.current + dir + nodes.length) % nodes.length;
    const el = nodes[changeIdxRef.current];
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add('ring-2', 'ring-amber-400', 'rounded');
    window.setTimeout(() => el.classList.remove('ring-2', 'ring-amber-400', 'rounded'), 1200);
  };

  const userRoles = [userRole, ...additionalRoles];
  const manager = canManageDocuments(userRole, additionalRoles);
  const author = doc ? canAuthor(classFor(doc.classId), userRoles) : false;
  const editableRev = doc ? workingDraft(doc.id, state.revisions) : undefined;

  if (!doc || (!rev && !author && !manager)) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 p-6">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/documents"><ArrowLeft className="mr-1.5 h-4 w-4" /> Documents</Link>
        </Button>
        <GfoEmptyState message="This document does not exist or has no published revision." />
      </div>
    );
  }

  const headerRev = rev ?? allRevs[0];
  const priorRevisions = allRevs.filter((r) => r.id !== headerRev?.id && r.status === 'superseded');
  const showChangeSummary = rev && rev.changeSummary.trim() && priorRevisions.length > 0;

  // Accepting a suggestion opens a pre-filled draft revision; the decision is only
  // recorded once that draft actually persists (acceptFlow — the C4 invariant).
  const acceptSuggestion = (s: DocSuggestion) => {
    const baseRev = currentRevision(doc.id, state.revisions);
    if (!baseRev) { toast.error('No published revision to revise — the suggestion stays open.'); return; }
    setAcceptFlow(beginAccept(s.id));
    setEditor({ kind: 'revise', doc, baseRev, prefill: acceptPrefill(s) });
    setActiveBlock(null);
  };

  const onEditorPersisted = () => {
    const { resolveSuggestionId, flow } = acceptFlowOnPersisted(acceptFlow);
    setAcceptFlow(flow);
    if (resolveSuggestionId) {
      resolveSuggestion(resolveSuggestionId, 'accepted', undefined, userRole, additionalRoles);
      toast.success('Suggestion accepted — draft created.');
    }
  };

  // Inline suggestions: hover-to-suggest on the right gutter (any reader); pins on
  // blocks with open suggestions visible to owner/managers/author (spec S-1).
  const renderBlockGutter = rev
    ? (blockId: string) => {
        const visibleOpen = (byBlock.get(blockId) ?? []).filter((s) => canSeeSuggestion(s, userId, userRoles, doc));
        const active = activeBlock?.id === blockId;
        return (
          <BlockSuggestGutter
            openCount={visibleOpen.length}
            canSeePins={visibleOpen.length > 0}
            active={active}
            onSuggest={() => setActiveBlock({ id: blockId, mode: 'compose' })}
            onOpenThread={() => setActiveBlock({ id: blockId, mode: 'thread' })}
            onClose={() => setActiveBlock(null)}
          >
            {active && activeBlock?.mode === 'compose' && (
              <InlineSuggestComposer doc={doc} rev={rev} blockId={blockId} userRole={userRole} onDone={() => setActiveBlock(null)} />
            )}
            {active && activeBlock?.mode === 'thread' && visibleOpen.length > 0 && (
              <InlineSuggestionThread
                suggestions={visibleOpen}
                doc={doc}
                rev={rev}
                userRole={userRole}
                additionalRoles={additionalRoles}
                canManage={manager || author}
                onAccept={acceptSuggestion}
                onClose={() => setActiveBlock(null)}
              />
            )}
          </BlockSuggestGutter>
        );
      }
    : undefined;

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="ghost" size="sm" asChild className="-ml-2">
            <Link to="/documents"><ArrowLeft className="mr-1.5 h-4 w-4" /> Documents</Link>
          </Button>
          <SyncAgeChip />
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {diff?.hasChanges && rev && (
            <>
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-900 dark:bg-amber-900/40 dark:text-amber-200">
                {changeCount} change{changeCount === 1 ? '' : 's'} in rev {rev.revision}
              </span>
              <Button size="sm" variant={showChanges ? 'secondary' : 'outline'} onClick={() => setShowChanges((v) => !v)}>
                <GitCompareArrows className="mr-1.5 h-4 w-4" /> {showChanges ? 'Changes: on' : 'Changes: off'}
              </Button>
              {showingDiff && (
                <div className="flex items-center">
                  <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Previous change" onClick={() => gotoChange(-1)}>
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Next change" onClick={() => gotoChange(1)}>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </>
          )}
          {rev && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => { if (!printDocument(doc, rev)) toast.error('Allow pop-ups to export the PDF.'); }}
            >
              <Printer className="mr-1.5 h-4 w-4" /> Export PDF
            </Button>
          )}
          {rev && (manager || author) && (
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                try {
                  const blob = await buildReviewDocx(doc, rev);
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `${doc.id}-rev${rev.revision}-review.docx`;
                  a.click();
                  URL.revokeObjectURL(url);
                  toast.success('Review .docx exported — edit with tracked changes on.');
                } catch {
                  toast.error('Could not generate the .docx export.');
                }
              }}
            >
              <FileText className="mr-1.5 h-4 w-4" /> Export .docx
            </Button>
          )}
          {rev && (
            <Button size="sm" variant="outline" onClick={() => setSuggesting(true)}>
              <MessageSquarePlus className="mr-1.5 h-4 w-4" /> Suggest a change
            </Button>
          )}
          {author && (
            <>
            {editableRev && (
              <Button size="sm" variant="secondary" onClick={() => setEditor({ kind: 'edit-draft', doc, rev: editableRev })}>
                <PencilLine className="mr-1.5 h-4 w-4" /> Edit draft (rev {editableRev.revision})
              </Button>
            )}
            {rev && !editableRev && (
              <Button size="sm" variant="secondary" onClick={() => setEditor({ kind: 'revise', doc, baseRev: rev })}>
                <FilePlus2 className="mr-1.5 h-4 w-4" /> New revision
              </Button>
            )}
            </>
          )}
        </div>
      </div>

      {headerRev && <DocIdentityHeader doc={doc} rev={headerRev} />}

      {/* D60/D65 — the entry's fleet applicability and curated CAS facts, read back to the reader.
          `rev` is the CURRENT PUBLISHED revision, so this shows exactly what the catalog offers. */}
      <CasMetaBanner rev={rev} />

      {showChangeSummary && rev && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/10">
          <p className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-amber-900 dark:text-amber-200">
            <AlertTriangle className="h-3.5 w-3.5" /> What changed in rev {rev.revision}
          </p>
          <p className="text-sm text-amber-900/90 dark:text-amber-200/90">{rev.changeSummary}</p>
        </div>
      )}

      {rev ? (
        <GfoPanel>
          <article ref={articleRef} className="prose-bulletin">
            {showingDiff && diff ? (
              <DiffedContent diff={diff} renderBlockGutter={renderBlockGutter} />
            ) : (
              <SectionedContent sections={rev.sections} renderBlockGutter={renderBlockGutter} />
            )}
            <RevisionMedia rev={rev} />
          </article>
          <AckPanel doc={doc} rev={rev} userRole={userRole} />
        </GfoPanel>
      ) : (
        <GfoEmptyState message="No published revision yet — see the revision history below." />
      )}

      {rev && classFor(doc.classId).commentsEnabled && (
        <GfoPanel title="Field notes & comments" action={<MessageSquare className="h-4 w-4 text-muted-foreground" />}>
          <CommentThread doc={doc} userRole={userRole} />
        </GfoPanel>
      )}

      {manager && <ReviewPanel doc={doc} userRole={userRole} additionalRoles={additionalRoles} />}

      {manager && rev && rev.requireAcknowledgment && rev.ackLevel !== 'none' && (
        <GfoPanel title="Read receipts" action={<Users className="h-4 w-4 text-muted-foreground" />}>
          <ComplianceRoster rev={rev} readers={readersFor(doc, documentsRoleUniverse())} acks={state.acknowledgments} />
        </GfoPanel>
      )}

      {(manager || author) && allRevs.length > 0 && (
        <GfoPanel title="Revision history" action={<History className="h-4 w-4 text-muted-foreground" />}>
          <RevisionTimeline
            revisions={allRevs}
            canManage={manager || author}
            onWithdraw={(revisionId, reason) => {
              const target = allRevs.find((r) => r.id === revisionId);
              withdrawDraft(revisionId, reason, userRole, additionalRoles);
              // C7: tell the approver pool if we pulled something out of their queue.
              if (target?.status === 'pending-approval') {
                publishWithdrawnEvent(doc, target, identityFor(userRole).userName);
              }
            }}
          />
        </GfoPanel>
      )}

      {rev && (
        <SuggestionDialog open={suggesting} onOpenChange={setSuggesting} doc={doc} rev={rev} userRole={userRole} />
      )}

      {editor && (
        <DocEditorDialog
          open={!!editor}
          onOpenChange={(o) => { if (!o) { setEditor(null); setAcceptFlow(acceptFlowOnCancelled(acceptFlow).flow); } }}
          onPersisted={onEditorPersisted}
          mode={editor}
          userRole={userRole}
          additionalRoles={additionalRoles}
        />
      )}
    </div>
  );
}
