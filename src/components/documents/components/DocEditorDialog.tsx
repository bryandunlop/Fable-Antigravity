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
import type { AckLevel, Doc, DocCasMeta, DocRevision, DocSection } from '../types';
import type { AircraftType, CasColor } from '../../tech-log/types';
import { CAS_KNOWLEDGE_CLASS_ID } from '../engine/casKnowledge';
import { DOC_CLASS_LIST, classFor, type DocumentClassConfig } from '../classes';
import { useDocuments, identityFor, publishApprovalRequestedEvent, publishRequiredReadEvent } from '../DocumentsContext';
import { useFleetTypes } from '../../tech-log/TechLogContext';
import { cabinSections } from '../engine/cabinSections';
import { canAuthor, validateSubmit, validateDirectPublish } from '../engine/lifecycle';
import { nextDocId, nextRevisionId, nextRevisionLabel, currentRevision } from '../engine/revisions';
import { computeNextReviewDate } from '../engine/review';
import { sectionsFromMarkdown, checksumForSections } from '../engine/blocks';
import { SectionedEditor } from './SectionedEditor';
import { StepFormEditor } from './StepFormEditor';
import {
  stepFormFromSections, stepFormToSections, stepFormToMarkdown, emptyStepFormModel, type StepFormModel,
} from '../engine/stepForm';
import { emptySection } from '../engine/blockEditor';
import { operatorTodayIso } from '../../../lib/operatorDate';

export type EditorMode =
  | {
      kind: 'create';
      classId?: string;
      /** D60: `fleetTypes` / `casMeta` seed a CAS reference entry created from a tail page. */
      prefill?: { content?: string; title?: string; category?: string; fleetTypes?: AircraftType[]; casMeta?: DocCasMeta };
    }
  // 'content' is the interim textarea's markdown prefill — independent of DocRevision.sections.
  | { kind: 'revise'; doc: Doc; baseRev: DocRevision; prefill?: Partial<DocRevision> & { content?: string } }
  | { kind: 'edit-draft'; doc: Doc; rev: DocRevision };

const ALL_ROLES = Object.values(ROLE_CATEGORIES).flat();

// LG-183 — the fleet-applicability picker no longer restates the type union. `useFleetTypes`
// derives it from the tails actually on file, so adding an aircraft in Admin → Fleet is the only
// place a type is ever "added" and this picker cannot drift from the fleet.
const CAS_COLORS: CasColor[] = ['WHITE', 'CYAN', 'AMBER', 'RED'];

function todayIso(): string {
  return operatorTodayIso(); // D24: operator calendar day, not UTC (C6)
}

/** Class-aware create / revise / edit-draft dialog. Controlled classes submit
 * for approval (four-eyes); tribal knowledge publishes directly. */
export function DocEditorDialog({
  open,
  onOpenChange,
  mode,
  userRole,
  additionalRoles = [],
  onPersisted,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  mode: EditorMode;
  userRole: string;
  additionalRoles?: string[];
  /** Fired after a draft is actually persisted (save/submit/publish) — the
   * suggestion accept flow resolves feedback on this, not on dialog open (C4). */
  onPersisted?: () => void;
}) {
  const { state, createDoc, updateDocMeta, createDraft, updateDraft, submitForApproval, publishDirect } = useDocuments();
  const userRoles = [userRole, ...additionalRoles];
  const authorable = DOC_CLASS_LIST.filter((c) => canAuthor(c, userRoles));
  const FLEET_TYPES = useFleetTypes();

  const [classId, setClassId] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [roles, setRoles] = useState<string[]>([]);
  const [sections, setSections] = useState<DocSection[]>([]);
  const [changeSummary, setChangeSummary] = useState('');
  const [revisionLabel, setRevisionLabel] = useState('1.0');
  const [effectiveDate, setEffectiveDate] = useState(todayIso());
  const [requireAck, setRequireAck] = useState(true);
  const [ackLevel, setAckLevel] = useState<AckLevel>('initials');
  const [ackDueDate, setAckDueDate] = useState('');
  const [tags, setTags] = useState('');
  // D60 — CAS reference fields, only meaningful on the tribal-knowledge class.
  const [fleetTypes, setFleetTypes] = useState<AircraftType[]>([]);
  const [isCas, setIsCas] = useState(false);
  const [casMessage, setCasMessage] = useState('');
  const [casColor, setCasColor] = useState<CasColor>('AMBER');
  const [cmcCodes, setCmcCodes] = useState<string[]>([]);
  const [cmcDraft, setCmcDraft] = useState('');
  // D75 — the semi-rigid form. `useStepForm` is state, not a derived `cfg.stepForm`, because an
  // entry can outgrow the form: `stepFormFromSections` reports lossy and we fall back to the full
  // editor rather than silently dropping the table someone added.
  const [stepModel, setStepModel] = useState<StepFormModel>(emptyStepFormModel());
  const [useStepForm, setUseStepForm] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');

  useEffect(() => {
    if (!open) return;
    if (mode.kind === 'create') {
      const initial = mode.classId ?? authorable[0]?.id ?? '';
      const cfg = initial ? classFor(initial) : undefined;
      setClassId(initial);
      setTitle(mode.prefill?.title ?? '');
      // A prefilled category matters, not cosmetics: creating from a tail page must land the note
      // in a Ship Notes section. The class's first category is now a general-LIBRARY one, so
      // without this a note authored on a tail vanishes from the shelf it was created on.
      // LG-183 — the default category must come from the LIVE list for a step-form class, or a
      // renamed section leaves every new entry born on a name the picker no longer offers.
      const initialCats = cfg?.stepForm ? cabinSections(state) : (cfg?.categories ?? []);
      setCategory(mode.prefill?.category ?? initialCats[0] ?? '');
      setRoles([]);
      // A .docx-import prefill (Slice 4a) seeds sections once; otherwise start blank.
      setSections(mode.prefill?.content ? sectionsFromMarkdown(mode.prefill.content, 'new') : [emptySection()]);
      setChangeSummary('');
      setRevisionLabel('1.0');
      setEffectiveDate(todayIso());
      setRequireAck((cfg?.defaultAckLevel ?? 'initials') !== 'none');
      setAckLevel(cfg?.defaultAckLevel ?? 'initials');
      setAckDueDate(cfg?.defaultAckDueDays ? computeNextReviewDate(todayIso(), cfg.defaultAckDueDays) : '');
      setTags('');
      setFleetTypes(mode.prefill?.fleetTypes ?? []);
      setIsCas(!!mode.prefill?.casMeta);
      setCasMessage(mode.prefill?.casMeta?.casMessage ?? '');
      setCasColor(mode.prefill?.casMeta?.casColor ?? 'AMBER');
      setCmcCodes(mode.prefill?.casMeta?.cmcCodes ?? []);
      setCmcDraft('');
      // A new entry on a step-form class starts in the form; a .docx prefill starts in the full
      // editor, because imported content is exactly the arbitrary shape the form cannot hold.
      setStepModel(emptyStepFormModel());
      setUseStepForm(!!cfg?.stepForm && !mode.prefill?.content);
      setVideoUrl('');
    } else {
      const doc = mode.doc;
      const rev = mode.kind === 'revise' ? mode.baseRev : mode.rev;
      const cfg = classFor(doc.classId);
      // A draft may carry proposed identity changes not yet applied to the doc.
      const meta =
        mode.kind === 'edit-draft' && rev.proposedMeta
          ? rev.proposedMeta
          : { title: doc.title, category: doc.category, roles: doc.roles, tags: doc.tags };
      setClassId(doc.classId);
      setTitle(meta.title);
      setCategory(meta.category);
      setRoles(meta.roles);
      // Deep-copy the base tree so editing never mutates a published revision (D-6);
      // a suggestion-accept markdown prefill seeds sections once, then the editor owns identity.
      setSections(
        mode.kind === 'revise' && mode.prefill?.content
          ? sectionsFromMarkdown(mode.prefill.content, doc.id)
          : structuredClone(rev.sections),
      );
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
      setTags(meta.tags.join(', '));
      // D65 — CAS facts ride the REVISION, so they are read off the revision being
      // worked on: `revise` starts from what is published today, `edit-draft` from
      // what the draft already says. Reading them off the doc would reintroduce the
      // single mutable value the move exists to remove.
      setFleetTypes(rev.fleetTypes ?? []);
      setIsCas(!!rev.casMeta);
      setCasMessage(rev.casMeta?.casMessage ?? '');
      setCasColor(rev.casMeta?.casColor ?? 'AMBER');
      setCmcCodes(rev.casMeta?.cmcCodes ?? []);
      setCmcDraft('');
      // Reading the existing tree decides the editor: the form opens only if it can hold what is
      // already there. `revise` with a suggestion prefill is markdown, so read the parsed prefill,
      // not the base revision — otherwise the form would show the OLD steps and save them back.
      const bodySections =
        mode.kind === 'revise' && mode.prefill?.content
          ? sectionsFromMarkdown(mode.prefill.content, doc.id)
          : rev.sections;
      const { model, lossy } = stepFormFromSections(bodySections);
      setStepModel(model);
      setUseStepForm(!!cfg.stepForm && !lossy);
      setVideoUrl(rev.videos?.[0]?.url ?? '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const cfg: DocumentClassConfig | undefined = classId ? classFor(classId) : undefined;
  // LG-183 — cabin knowledge takes its sections from editable state; every other class still
  // reads the constant on its class config.
  const categoryOptions = cfg?.stepForm ? cabinSections(state) : (cfg?.categories ?? []);
  const hasPriorPublished = useMemo(() => {
    if (mode.kind === 'create') return false;
    return state.revisions.some(
      (r) => r.docId === mode.doc.id && (r.status === 'published' || r.status === 'superseded'),
    );
  }, [mode, state.revisions]);

  if (!cfg && open) return null;

  const toggleRole = (r: string) =>
    setRoles((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev.filter((x) => x !== 'all'), r]));

  const toggleFleetType = (t: AircraftType) =>
    setFleetTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  const addCmcCode = () => {
    // Trimmed here, at commit — not in onChange, which on a controlled input eats keystrokes.
    const code = cmcDraft.trim();
    if (!code) return;
    if (cmcCodes.some((c) => c.toLowerCase() === code.toLowerCase())) {
      toast.error(`${code} is already listed.`);
      setCmcDraft('');
      return;
    }
    setCmcCodes((prev) => [...prev, code]);
    setCmcDraft('');
  };

  const buildRecords = (): { doc: Doc; rev: DocRevision; liveControlled: boolean } | null => {
    if (!cfg) return null;
    // D75 — the form is a projection. Validate it here, but serialize it below against the real
    // doc id, so form-authored blocks get the same `<docId>::<section>::bN` ids as any other.
    const hasContent = useStepForm
      ? stepFormToMarkdown(stepModel).trim().length > 0
      : sections.some((s) => s.title.trim() || s.blocks.some((b) => b.md.trim()));
    if (!title.trim() || !hasContent || roles.length === 0) {
      toast.error(
        useStepForm
          ? 'Title, at least one step, and at least one audience role are required.'
          : 'Title, content, and at least one audience role are required.',
      );
      return null;
    }
    const casEnabled = cfg.id === CAS_KNOWLEDGE_CLASS_ID;
    const fleetScoped = !!cfg.fleetScoped;
    // A CAS entry with no message would be a catalog row the picker cannot offer.
    if (casEnabled && isCas && !casMessage.trim()) {
      toast.error('A CAS entry needs the message as the flight deck shows it.');
      return null;
    }
    if (casEnabled && isCas && fleetTypes.length === 0) {
      toast.error('Name at least one fleet type — a CAS entry with no applicability reaches no tail.');
      return null;
    }
    const casMeta: DocCasMeta | undefined =
      casEnabled && isCas
        ? { casMessage: casMessage.trim(), casColor, cmcCodes: cmcCodes.length ? cmcCodes : undefined }
        : undefined;
    // D65 — these ride the REVISION, not the doc: they reach the catalog only when
    // this revision publishes. Applied only on the class that owns them, so an edit
    // on any other class cannot blank them by omission.
    // D64 — fleet applicability is a CLASS CAPABILITY, not "is this tribal knowledge". An `sop`
    // is fleet-scoped too, because D64 keeps a procedure performed on the aircraft controlled and
    // has the shelf link out to it. The CAS message/colour half stays tribal-knowledge only.
    const casFields = fleetScoped
      ? { fleetTypes: fleetTypes.length ? fleetTypes : undefined, ...(casEnabled ? { casMeta } : {}) }
      : {};
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
    // C1: a live controlled doc's identity never changes on draft save — the
    // edits ride the revision (proposedMeta) and apply when it publishes.
    const liveControlled = mode.kind !== 'create' && cfg.controlled && hasPriorPublished;
    const metaChanged =
      mode.kind !== 'create' &&
      (doc.title !== mode.doc.title ||
        doc.category !== mode.doc.category ||
        doc.roles.length !== mode.doc.roles.length ||
        doc.roles.some((r, i) => r !== mode.doc.roles[i]) ||
        doc.tags.length !== mode.doc.tags.length ||
        doc.tags.some((t, i) => t !== mode.doc.tags[i]));
    const bodySections = useStepForm ? stepFormToSections(stepModel, doc.id) : sections;
    // Sidecar media. The video field is the step form's (D75, fork 3 — link only, no upload); the
    // images/links beside it belong to migrated legacy bulletins and are carried forward so a
    // revision is not the thing that deletes them.
    const priorRev = mode.kind === 'create' ? undefined : mode.kind === 'revise' ? mode.baseRev : mode.rev;
    const videos = cfg.stepForm
      ? videoUrl.trim()
        ? [{ url: videoUrl.trim(), title: title.trim() }]
        : undefined
      : priorRev?.videos;
    const rev: DocRevision = {
      id:
        mode.kind === 'edit-draft'
          ? mode.rev.id
          : nextRevisionId(doc.id, mode.kind === 'create' ? [] : state.revisions),
      docId: doc.id,
      revision: revisionLabel.trim() || '1.0',
      status: 'draft',
      sections: bodySections,
      mockChecksum: checksumForSections(bodySections),
      images: priorRev?.images,
      videos,
      links: priorRev?.links,
      // D73 — a received revision's provenance is its frozen claim about which
      // bytes it is. Rebuilding the revision object here without carrying it
      // would silently turn a received MEL into an "authored in myGFO" document
      // and drop it back to the meaningless placeholder digest. It is content,
      // not chrome, so it rides forward exactly like images/links do.
      provenance: priorRev?.provenance,
      changeSummary: changeSummary.trim(),
      effectiveDate,
      authorUserId: userId,
      authorName: userName,
      requireAcknowledgment: effAckLevel !== 'none',
      ackLevel: effAckLevel,
      ackDueDate: effAckLevel !== 'none' && ackDueDate ? ackDueDate : undefined,
      proposedMeta:
        liveControlled && metaChanged
          ? { title: doc.title, category: doc.category, roles: doc.roles, tags: doc.tags }
          : undefined,
      ...casFields,
    };
    return { doc, rev, liveControlled };
  };

  const persistDraft = (records: { doc: Doc; rev: DocRevision; liveControlled: boolean }) => {
    const { doc, rev, liveControlled } = records;
    if (mode.kind === 'create') {
      createDoc(doc, rev, userRoles);
    } else {
      // Meta edits on a never-published or uncontrolled doc apply directly
      // (role-gated in the reducer); on a live controlled doc they ride the
      // revision via proposedMeta instead — the published doc stays untouched.
      if (!liveControlled) updateDocMeta(doc, userRole, additionalRoles);
      if (mode.kind === 'revise') createDraft(rev, userRoles);
      else updateDraft(rev, userRole, additionalRoles);
    }
    onPersisted?.();
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
    // Defence in depth: PUBLISH_DIRECT is role-gated in the reducer as of the D60 fix pass
    // (LG-112), so this is the message, not the gate — a refusal in the reducer is a silent
    // console warning and the publisher deserves to be told why.
    if (!canAuthor(cfg, userRoles)) {
      toast.error(`Publishing ${cfg.labelPlural} requires one of: ${cfg.authorRoles.join(', ')}.`);
      return;
    }
    const v = validateDirectPublish(cfg, records.rev);
    if (!v.ok) {
      toast.error(v.error);
      return;
    }
    persistDraft(records);
    publishDirect(records.rev.id, userRoles);
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
                <Select value={classId} onValueChange={(v: string) => { setClassId(v); const c = classFor(v); setCategory((c.stepForm ? cabinSections(state) : c.categories)[0]); setAckLevel(c.defaultAckLevel); setRequireAck(c.defaultAckLevel !== 'none'); }}>
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
                    {categoryOptions.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
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
            <div className="flex items-center justify-between gap-3">
              <Label className="text-xs">{useStepForm ? 'Steps' : 'Content'}</Label>
              {/* Escape hatch, both ways. Form → full editor is always safe. Full editor → form is
                  offered only when the current tree fits, and takes the parsed tree with it. */}
              {cfg?.stepForm && (useStepForm ? (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  onClick={() => { setSections(stepFormToSections(stepModel, mode.kind === 'create' ? 'new' : mode.doc.id)); setUseStepForm(false); }}
                >
                  Switch to the full editor
                </Button>
              ) : stepFormFromSections(sections).lossy ? (
                <span className="text-xs text-muted-foreground">
                  This entry has content the step form can’t hold.
                </span>
              ) : (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  onClick={() => { setStepModel(stepFormFromSections(sections).model); setUseStepForm(true); }}
                >
                  Switch to the step form
                </Button>
              ))}
            </div>
            <div className="mt-1">
              {useStepForm ? (
                <StepFormEditor model={stepModel} onChange={setStepModel} />
              ) : (
                <SectionedEditor sections={sections} onChange={setSections} />
              )}
            </div>
          </div>

          {cfg?.stepForm && (
            <div>
              <Label htmlFor="docVideo" className="text-xs">Video (optional)</Label>
              <Input
                id="docVideo"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="Link to the walkthrough — YouTube, Vimeo, or any URL"
                className="mt-1"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                A link, not an upload. Record it wherever your crew already shares video and paste
                the link here.
              </p>
            </div>
          )}

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

          {/* D60/D64 — fleet applicability is shown for any FLEET-SCOPED class (tribal knowledge and
              `sop`), because both can appear on a tail page. The CAS message/colour/codes below are
              a separate, narrower concern: only tribal knowledge feeds the defect form's picker, so
              that half stays gated on the class id. */}
          {cfg?.fleetScoped && (
            <div className="rounded-md border border-border p-3">
              <Label className="text-xs">Fleet applicability</Label>
              <div className="mt-1 flex flex-wrap gap-3">
                {FLEET_TYPES.map((t) => (
                  <label key={t} className="flex cursor-pointer items-center gap-1.5 text-sm">
                    <Checkbox checked={fleetTypes.includes(t)} onCheckedChange={() => toggleFleetType(t)} />
                    {t}
                  </label>
                ))}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                A tail only sees knowledge tagged for its own type. Leave all three clear for general
                library content (airport notes and the like).
              </p>

              {cfg?.id === CAS_KNOWLEDGE_CLASS_ID && (
              <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm">
                <Checkbox checked={isCas} onCheckedChange={() => setIsCas((v) => !v)} />
                This entry explains one CAS message
              </label>
              )}

              {cfg?.id === CAS_KNOWLEDGE_CLASS_ID && isCas && (
                <div className="mt-2 space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <Input
                      aria-label="CAS message"
                      placeholder="Message as the flight deck shows it, e.g. R ENG CHIP"
                      value={casMessage}
                      onChange={(e) => setCasMessage(e.target.value)}
                      className="min-w-[16rem] flex-1"
                    />
                    <select
                      aria-label="CAS colour"
                      className="rounded-md border bg-background px-2 py-1 text-sm"
                      value={casColor}
                      onChange={(e) => setCasColor(e.target.value as CasColor)}
                    >
                      {CAS_COLORS.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs">Related CMC codes (hand-curated)</Label>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      {cmcCodes.map((c) => (
                        <span key={c} className="inline-flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-xs">
                          {c}
                          <button
                            type="button"
                            aria-label={`Remove ${c}`}
                            className="text-muted-foreground hover:text-foreground"
                            onClick={() => setCmcCodes((prev) => prev.filter((x) => x !== c))}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                      <Input
                        aria-label="Add CMC code"
                        placeholder="e.g. 79-3100-02"
                        value={cmcDraft}
                        onChange={(e) => setCmcDraft(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCmcCode(); } }}
                        className="w-40"
                      />
                      <Button type="button" size="sm" variant="outline" onClick={addCmcCode}>Add</Button>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Curated by hand on purpose. Codes recorded while troubleshooting a defect are
                      intake and diagnosis, not established knowledge, and are never rolled up here.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
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
