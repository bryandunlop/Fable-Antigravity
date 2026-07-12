import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Send, Save, UploadCloud } from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '../../ui/dialog';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';
import { Checkbox } from '../../ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { ROLE_CATEGORIES } from '../../../lib/mockUsers';
import type { AckLevel, Doc, DocRevision } from '../types';
import { DOC_CLASS_LIST, classFor, type DocumentClassConfig } from '../classes';
import { useDocuments, identityFor, publishApprovalRequestedEvent, publishRequiredReadEvent } from '../DocumentsContext';
import { canAuthor, validateSubmit, validateDirectPublish } from '../engine/lifecycle';
import { nextDocId, nextRevisionId, nextRevisionLabel, currentRevision } from '../engine/revisions';
import { computeNextReviewDate } from '../engine/review';
import { sectionsToMarkdown, contentFieldsFromMarkdown } from '../engine/blocks';

export type EditorMode =
  | { kind: 'create'; classId?: string }
  // 'content' is the interim textarea's markdown prefill — independent of DocRevision.sections.
  | { kind: 'revise'; doc: Doc; baseRev: DocRevision; prefill?: Partial<DocRevision> & { content?: string } }
  | { kind: 'edit-draft'; doc: Doc; rev: DocRevision };

const ALL_ROLES = Object.values(ROLE_CATEGORIES).flat();

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Class-aware create / revise / edit-draft dialog. Controlled classes submit
 * for approval (four-eyes); tribal knowledge publishes directly. */
export function DocEditorDialog({
  open,
  onOpenChange,
  mode,
  userRole,
  additionalRoles = [],
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  mode: EditorMode;
  userRole: string;
  additionalRoles?: string[];
}) {
  const { state, createDoc, updateDocMeta, createDraft, updateDraft, submitForApproval, publishDirect } = useDocuments();
  const userRoles = [userRole, ...additionalRoles];
  const authorable = DOC_CLASS_LIST.filter((c) => canAuthor(c, userRoles));

  const [classId, setClassId] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [roles, setRoles] = useState<string[]>([]);
  const [content, setContent] = useState('');
  const [changeSummary, setChangeSummary] = useState('');
  const [revisionLabel, setRevisionLabel] = useState('1.0');
  const [effectiveDate, setEffectiveDate] = useState(todayIso());
  const [requireAck, setRequireAck] = useState(true);
  const [ackLevel, setAckLevel] = useState<AckLevel>('initials');
  const [ackDueDate, setAckDueDate] = useState('');
  const [tags, setTags] = useState('');

  useEffect(() => {
    if (!open) return;
    if (mode.kind === 'create') {
      const initial = mode.classId ?? authorable[0]?.id ?? '';
      const cfg = initial ? classFor(initial) : undefined;
      setClassId(initial);
      setTitle('');
      setCategory(cfg?.categories[0] ?? '');
      setRoles([]);
      setContent('');
      setChangeSummary('');
      setRevisionLabel('1.0');
      setEffectiveDate(todayIso());
      setRequireAck((cfg?.defaultAckLevel ?? 'initials') !== 'none');
      setAckLevel(cfg?.defaultAckLevel ?? 'initials');
      setAckDueDate(cfg?.defaultAckDueDays ? computeNextReviewDate(todayIso(), cfg.defaultAckDueDays) : '');
      setTags('');
    } else {
      const doc = mode.doc;
      const rev = mode.kind === 'revise' ? mode.baseRev : mode.rev;
      const cfg = classFor(doc.classId);
      setClassId(doc.classId);
      setTitle(doc.title);
      setCategory(doc.category);
      setRoles(doc.roles);
      setContent(mode.kind === 'revise' ? (mode.prefill?.content ?? sectionsToMarkdown(rev.sections)) : sectionsToMarkdown(rev.sections));
      setChangeSummary(mode.kind === 'revise' ? (mode.prefill?.changeSummary ?? '') : rev.changeSummary);
      setRevisionLabel(mode.kind === 'revise' ? nextRevisionLabel(rev.revision, 'major') : rev.revision);
      setEffectiveDate(mode.kind === 'revise' ? todayIso() : rev.effectiveDate);
      setRequireAck(mode.kind === 'revise' ? rev.requireAcknowledgment : rev.requireAcknowledgment);
      setAckLevel(rev.ackLevel);
      setAckDueDate(
        mode.kind === 'revise'
          ? cfg.defaultAckDueDays
            ? computeNextReviewDate(todayIso(), cfg.defaultAckDueDays)
            : ''
          : rev.ackDueDate ?? '',
      );
      setTags(doc.tags.join(', '));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const cfg: DocumentClassConfig | undefined = classId ? classFor(classId) : undefined;
  const hasPriorPublished = useMemo(() => {
    if (mode.kind === 'create') return false;
    return state.revisions.some(
      (r) => r.docId === mode.doc.id && (r.status === 'published' || r.status === 'superseded'),
    );
  }, [mode, state.revisions]);

  if (!cfg && open) return null;

  const toggleRole = (r: string) =>
    setRoles((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev.filter((x) => x !== 'all'), r]));

  const buildRecords = (): { doc: Doc; rev: DocRevision } | null => {
    if (!cfg) return null;
    if (!title.trim() || !content.trim() || roles.length === 0) {
      toast.error('Title, content, and at least one audience role are required.');
      return null;
    }
    const { userId, userName } = identityFor(userRole);
    const effAckLevel: AckLevel = cfg.ackLevelLocked ? cfg.defaultAckLevel : requireAck ? ackLevel : 'none';
    const doc: Doc =
      mode.kind === 'create'
        ? {
            id: nextDocId(cfg, state.docs),
            classId: cfg.id,
            title: title.trim(),
            category,
            roles,
            ownerUserId: userId,
            ownerName: userName,
            tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
            isPinned: false,
            isArchived: false,
            reviewCycleDays: cfg.defaultReviewCycleDays,
            createdDate: todayIso(),
          }
        : {
            ...mode.doc,
            title: title.trim(),
            category,
            roles,
            tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
          };
    const rev: DocRevision = {
      id:
        mode.kind === 'edit-draft'
          ? mode.rev.id
          : nextRevisionId(doc.id, mode.kind === 'create' ? [] : state.revisions),
      docId: doc.id,
      revision: revisionLabel.trim() || '1.0',
      status: 'draft',
      ...contentFieldsFromMarkdown(content, doc.id),
      changeSummary: changeSummary.trim(),
      effectiveDate,
      authorUserId: userId,
      authorName: userName,
      requireAcknowledgment: effAckLevel !== 'none',
      ackLevel: effAckLevel,
      ackDueDate: effAckLevel !== 'none' && ackDueDate ? ackDueDate : undefined,
    };
    return { doc, rev };
  };

  const persistDraft = (records: { doc: Doc; rev: DocRevision }) => {
    const { doc, rev } = records;
    if (mode.kind === 'create') {
      createDoc(doc, rev);
    } else {
      // Doc metadata (title/roles/tags) may have been edited alongside the revision.
      updateDocMeta(doc);
      if (mode.kind === 'revise') createDraft(rev);
      else updateDraft(rev);
    }
  };

  const saveDraft = () => {
    const records = buildRecords();
    if (!records) return;
    persistDraft(records);
    toast.success('Draft saved.');
    onOpenChange(false);
  };

  const submit = () => {
    const records = buildRecords();
    if (!records || !cfg) return;
    const v = validateSubmit(records.rev, hasPriorPublished);
    if (!v.ok) {
      toast.error(v.error);
      return;
    }
    persistDraft(records);
    submitForApproval(records.rev.id);
    publishApprovalRequestedEvent(records.doc, records.rev);
    toast.success(`Submitted for approval (${cfg.approverRoles.join(' / ')}).`);
    onOpenChange(false);
  };

  const publish = () => {
    const records = buildRecords();
    if (!records || !cfg) return;
    const v = validateDirectPublish(cfg, records.rev);
    if (!v.ok) {
      toast.error(v.error);
      return;
    }
    persistDraft(records);
    publishDirect(records.rev.id);
    publishRequiredReadEvent(records.doc, records.rev);
    toast.success('Published.');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode.kind === 'create' ? 'New document' : mode.kind === 'revise' ? `New revision — ${mode.doc.id}` : `Edit draft — ${mode.doc.id}`}
          </DialogTitle>
          <DialogDescription>
            {cfg?.controlled
              ? 'Controlled document: a second authorized person must approve before crews see it.'
              : 'Published directly by curators — no approval step.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          {mode.kind === 'create' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Document class</Label>
                <Select value={classId} onValueChange={(v: string) => { setClassId(v); const c = classFor(v); setCategory(c.categories[0]); setAckLevel(c.defaultAckLevel); setRequireAck(c.defaultAckLevel !== 'none'); }}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select class" /></SelectTrigger>
                  <SelectContent>
                    {authorable.map((c) => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(cfg?.categories ?? []).map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="docTitle" className="text-xs">Title</Label>
            <Input id="docTitle" value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1" />
          </div>

          <div>
            <Label className="text-xs">Audience</Label>
            <div className="mt-1 grid grid-cols-3 gap-2 rounded-md border border-border p-3 sm:grid-cols-4">
              <label className="flex cursor-pointer items-center gap-1.5 text-sm">
                <Checkbox checked={roles.includes('all')} onCheckedChange={() => setRoles(roles.includes('all') ? [] : ['all'])} />
                Everyone
              </label>
              {ALL_ROLES.map((r) => (
                <label key={r.value} className="flex cursor-pointer items-center gap-1.5 text-sm">
                  <Checkbox checked={roles.includes(r.value)} disabled={roles.includes('all')} onCheckedChange={() => toggleRole(r.value)} />
                  {r.label}
                </label>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="docContent" className="text-xs">Content (markdown)</Label>
            <Textarea id="docContent" value={content} onChange={(e) => setContent(e.target.value)} rows={12} className="mt-1 font-mono text-xs" />
          </div>

          {hasPriorPublished && (
            <div>
              <Label htmlFor="docChangeSummary" className="text-xs">What changed (shown to readers before they acknowledge — required)</Label>
              <Textarea id="docChangeSummary" value={changeSummary} onChange={(e) => setChangeSummary(e.target.value)} rows={2} className="mt-1" />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <Label htmlFor="docRevLabel" className="text-xs">Revision</Label>
              <Input id="docRevLabel" value={revisionLabel} onChange={(e) => setRevisionLabel(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="docEff" className="text-xs">Effective date</Label>
              <Input id="docEff" type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} className="mt-1" />
            </div>
            {!cfg?.ackLevelLocked && (
              <>
                <div>
                  <Label className="text-xs">Acknowledgment</Label>
                  <Select
                    value={requireAck ? ackLevel : 'none'}
                    onValueChange={(v: string) => {
                      if (v === 'none') setRequireAck(false);
                      else { setRequireAck(true); setAckLevel(v as AckLevel); }
                    }}
                  >
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Not required</SelectItem>
                      <SelectItem value="initials">Read &amp; initial</SelectItem>
                      <SelectItem value="signature">Read &amp; sign (ceremony)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {requireAck && (
                  <div>
                    <Label htmlFor="docAckDue" className="text-xs">Ack due</Label>
                    <Input id="docAckDue" type="date" value={ackDueDate} onChange={(e) => setAckDueDate(e.target.value)} className="mt-1" />
                  </div>
                )}
              </>
            )}
          </div>

          <div>
            <Label htmlFor="docTags" className="text-xs">Tags (comma-separated)</Label>
            <Input id="docTags" value={tags} onChange={(e) => setTags(e.target.value)} className="mt-1" />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          {cfg?.controlled ? (
            <>
              <Button variant="secondary" onClick={saveDraft}>
                <Save className="mr-1.5 h-4 w-4" /> Save draft
              </Button>
              <Button onClick={submit}>
                <Send className="mr-1.5 h-4 w-4" /> Submit for approval
              </Button>
            </>
          ) : (
            <Button onClick={publish}>
              <UploadCloud className="mr-1.5 h-4 w-4" /> Publish
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
