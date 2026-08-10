import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Send, Save, Undo2, Sparkles } from 'lucide-react';
import { Button } from '../../ui/button';
import { Textarea } from '../../ui/textarea';
import { GfoEmptyState } from '../../gfo';
import type { Doc, DocSection } from '../types';
import { useDocuments } from '../DocumentsContext';
import { classFor } from '../classes';
import { validateSubmit } from '../engine/lifecycle';
import { currentRevision, priorPublishedRevision } from '../engine/revisions';
import { stagedBlocks, workingDraft } from '../engine/workbench';
import { checksumForSections } from '../engine/blocks';
import { clearStagedMark } from '../engine/blockEditor';
import { SectionedEditor } from './SectionedEditor';

/**
 * The document's single working draft, edited in place.
 *
 * Staged changes — blocks holding a reader's own words — are listed at the top
 * and must all be worked in before the draft can be submitted. That refusal is
 * shown here, not warned to the console, because it is the one rule a maintainer
 * will actually run into.
 */
export function WorkingDraftPanel({
  doc,
  userRole,
  additionalRoles = [],
}: {
  doc: Doc;
  userRole: string;
  additionalRoles?: string[];
}) {
  const { state, updateDraft, submitForApproval, withdrawDraft } = useDocuments();
  const draft = workingDraft(doc.id, state.revisions);

  const [sections, setSections] = useState<DocSection[]>(draft?.sections ?? []);
  const [summary, setSummary] = useState(draft?.changeSummary ?? '');
  const [dirty, setDirty] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [reason, setReason] = useState('');

  // Re-sync when a suggestion is staged from the other tab: that writes the draft
  // through the reducer, and the local editor copy must not shadow it.
  const draftId = draft?.id;
  const draftChecksum = draft?.mockChecksum;
  useEffect(() => {
    if (!draft || dirty) return;
    setSections(draft.sections);
    setSummary(draft.changeSummary);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftId, draftChecksum]);

  if (!draft) {
    return (
      <GfoEmptyState
        message="No working draft. Stage a suggestion, or start a new revision from the reader."
        icon={<Sparkles />}
      />
    );
  }

  const staged = stagedBlocks(sections);
  const hasPriorPublished = !!priorPublishedRevision(doc.id, state.revisions) || !!currentRevision(doc.id, state.revisions);
  const cfg = classFor(doc.classId);

  const persist = () => {
    updateDraft(
      { ...draft, sections, changeSummary: summary, mockChecksum: checksumForSections(sections) },
      userRole,
      additionalRoles,
    );
    setDirty(false);
  };

  const save = () => {
    persist();
    toast.success('Draft saved.');
  };

  const submit = () => {
    const check = validateSubmit(
      { status: draft.status, sections, changeSummary: summary },
      hasPriorPublished,
    );
    if (!check.ok) {
      toast.error(check.error);
      return;
    }
    persist();
    submitForApproval(draft.id);
    toast.success(`Submitted — awaiting one of: ${cfg.approverRoles.join(', ')}.`);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Rev {draft.revision} · {draft.status === 'rejected' ? 'returned to you' : 'draft'}
          {dirty && <span className="ml-2 text-amber-700 dark:text-amber-400">unsaved changes</span>}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" onClick={save} disabled={!dirty}>
            <Save className="mr-1.5 h-4 w-4" /> Save
          </Button>
          <Button size="sm" onClick={submit} disabled={staged.length > 0}>
            <Send className="mr-1.5 h-4 w-4" /> Submit for approval
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setWithdrawing((v) => !v)}>
            <Undo2 className="mr-1.5 h-4 w-4" /> Withdraw
          </Button>
        </div>
      </div>

      {draft.status === 'rejected' && draft.rejectionReason && (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm">
          <span className="font-medium">Returned by {draft.decidedByName}:</span> {draft.rejectionReason}
        </p>
      )}

      {staged.length > 0 && (
        <div className="rounded-md border border-sky-200 bg-sky-50/60 p-3 dark:border-sky-900 dark:bg-sky-950/20">
          <p className="text-sm font-medium text-sky-900 dark:text-sky-200">
            {staged.length} staged change{staged.length === 1 ? '' : 's'} to work in
          </p>
          <p className="mt-0.5 text-xs text-sky-800/80 dark:text-sky-300/80">
            These hold a reader's own words. Edit each into document wording, merge it
            up into the block above, or remove it. The draft cannot be submitted until
            they are all resolved.
          </p>
          <ul className="mt-2 space-y-1.5">
            {staged.map((b) => (
              <li key={b.id} className="flex items-start justify-between gap-2 text-sm">
                <span className="min-w-0 flex-1 truncate">{b.md}</span>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 shrink-0 px-2 text-xs"
                  onClick={() => { setSections(clearStagedMark(sections, b.id)); setDirty(true); }}
                >
                  Accept as written
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="wd-summary">What changed</label>
        <Textarea
          id="wd-summary"
          value={summary}
          onChange={(e) => { setSummary(e.target.value); setDirty(true); }}
          rows={3}
          placeholder="Summarise the change for readers…"
        />
      </div>

      <SectionedEditor
        sections={sections}
        onChange={(next) => { setSections(next); setDirty(true); }}
      />

      {withdrawing && (
        <div className="space-y-2 rounded-md border border-border bg-muted/30 p-3">
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why is this draft being withdrawn? (required)"
            rows={2}
          />
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => { setWithdrawing(false); setReason(''); }}>Cancel</Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => {
                if (reason.trim().length < 5) { toast.error('A withdrawal reason is required.'); return; }
                withdrawDraft(draft.id, reason.trim(), userRole, additionalRoles);
                setWithdrawing(false);
                setReason('');
                toast.success('Draft withdrawn — it stays in the history with your reason.');
              }}
            >
              Withdraw
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
