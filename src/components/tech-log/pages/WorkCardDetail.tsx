import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, ClipboardList, Wrench, Clock, Package, Trash2, Plus, ShieldCheck, UserCheck, Printer, CheckCircle2, CloudDownload, CalendarClock, PlayCircle, PackageSearch, ClipboardCheck, Hourglass, BookOpen, Cpu, X, Stethoscope, PhoneCall, Building2 } from 'lucide-react';
import { useTechLog, useCurrentUser } from '../TechLogContext';
import { useIntegration, expectedFromWo } from '../integration/useIntegration';
import { currentRows, latestFor } from '../engine/supersede';
import { validateCrs, validateRii } from '../engine/signing';
import { riiStepsComplete, pendingRiiSteps } from '../engine/rii';
import { appendStatusTag, statusDurations, currentTag, STATUS_TAG_LABELS } from '../engine/statusTags';
import { whyNoteRequired } from '../engine/labor';
import { rectificationClosePush } from '../engine/rectification';
import { INTENT } from '../constants';
import { WO_HEADER_STATUS } from '../integration/campTaxonomy';
import { printSignedRecord, mockPdfBlobUri } from '../util/printRecord';
import { workCardReferenceSections } from '../util/workCardPrint';
import { newId } from '../util/id';
import type { WorkCard, PartUsage, PartsOrder, LaborEntry, LaborCategory, MaintenanceRelease, Defect, Deferral, Signature, WorkCardStatusTag } from '../types';
import { TechLogShell } from '../components/TechLogShell';
import { SignCeremonyDialog } from '../components/SignCeremonyDialog';
import { CasChip } from '../components/CasChip';
import { SymptomNote } from '../components/SymptomNote';
import { WorkTimelinePanel } from '../components/WorkTimelinePanel';
import { PartsOrdersPanel } from '../components/PartsOrdersPanel';
import { WorkCardSyncBar } from '../components/WorkCardSyncBar';
import { useSync } from '../sync/useSync';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Checkbox } from '../../ui/checkbox';

const LABOR_CATEGORY_LABELS: Record<LaborCategory, string> = {
  WRENCH: 'Wrench time', TROUBLESHOOTING: 'Troubleshooting', TECH_OPS_CALL: 'Tech-ops call',
  PARTS_ORDERING: 'Parts ordering', INSPECTION: 'Inspection', OTHER: 'Other',
};
const TAG_LABELS = STATUS_TAG_LABELS;

export default function WorkCardDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { state, dispatch } = useTechLog();
  const user = useCurrentUser();
  const isMaint = user.role === 'MAINTENANCE';
  const integration = useIntegration();
  const sync = useSync(); // TL-38 — null outside SyncProvider; every call site is optional-chained.

  const card = state.workCards.find(w => w.id === id);
  const ac = card ? state.aircraft.find(a => a.id === card.aircraftId) : undefined;

  // part add form
  const [pn, setPn] = useState('');
  const [pdesc, setPdesc] = useState('');
  const [psn, setPsn] = useState('');
  const [pqty, setPqty] = useState('1');
  const [rotable, setRotable] = useState(false);
  const [showRemoved, setShowRemoved] = useState(false);
  const [rpn, setRpn] = useState('');
  const [rsn, setRsn] = useState('');
  const [rreason, setRreason] = useState('');
  // labor add form
  const [ltech, setLtech] = useState(user.oid);
  const [lhours, setLhours] = useState('');
  const [ldesc, setLdesc] = useState('');
  const [lcat, setLcat] = useState<LaborCategory>('WRENCH');
  const [lnote, setLnote] = useState('');
  // CMC fault-code entry (LG-99) — the code being typed, not yet on the card
  const [cmcDraft, setCmcDraft] = useState('');
  // status-tag control (QM4/D27) — POO demands a note (what part, from whom)
  const [pooNote, setPooNote] = useState('');
  const [pooPromptOpen, setPooPromptOpen] = useState(false);
  // A just-raised parts order awaiting the "shall I tag the card?" offer (LG-100 — offer, don't force)
  const [offeredOrder, setOfferedOrder] = useState<PartsOrder | null>(null);
  // completion sign
  const [inspectorOid, setInspectorOid] = useState('');
  const [crsOpen, setCrsOpen] = useState(false);
  const [riiOpen, setRiiOpen] = useState(false);
  const [pendingReleaseId, setPendingReleaseId] = useState('');
  const [perfSig, setPerfSig] = useState<Signature | null>(null);
  const [riiStepOpen, setRiiStepOpen] = useState(false);
  const [riiStepId, setRiiStepId] = useState<string | null>(null);
  const [addWo, setAddWo] = useState('');
  const [woOpts, setWoOpts] = useState<{ woNumber: string; title: string; ata: string; scheduled: boolean; riiRequired: boolean }[]>([]);

  useEffect(() => {
    if (card && isMaint && card.status !== 'COMPLETED') setWoOpts(integration.listWorkOrders(card.aircraftId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!card || !ac) {
    return (
      <TechLogShell title="Work card not found">
        <Button variant="outline" onClick={() => navigate('/tech-log/work-queue')}><ArrowLeft className="mr-1.5 h-4 w-4" /> Back to work queue</Button>
      </TechLogShell>
    );
  }

  const parts = state.partUsages.filter(p => p.workCardId === card.id);
  const labor = state.laborEntries.filter(l => l.workCardId === card.id);
  const maintPersonnel = state.personnel.filter(p => p.role === 'MAINTENANCE');
  const inspectors = state.personnel.filter(p => p.riiAuthorized && p.riiAuthorizedAta.includes(card.ataChapter) && p.oid !== user.oid);
  const inspector = state.personnel.find(p => p.oid === inspectorOid);
  const nameOf = (oid: string) => state.personnel.find(p => p.oid === oid)?.displayName ?? oid;
  const completed = card.status === 'COMPLETED';
  const stepsDone = card.steps.filter(s => s.done).length;
  const allStepsDone = card.steps.length > 0 && stepsDone === card.steps.length;
  const totalLabor = Math.round(labor.reduce((s, l) => s + l.hours, 0) * 10) / 10;
  const release = card.completedReleaseId ? state.releases.find(r => r.id === card.completedReleaseId) : undefined;
  // Due context from the CAMP due-list item this card complies with (read-view; CAMP is the system of record).
  const forecastItem = card.forecastRef ? integration.readForecast(card.aircraftId).find(f => f.ref === card.forecastRef) : undefined;
  const forecastDays = forecastItem?.dueDateUtc ? Math.floor((new Date(forecastItem.dueDateUtc).getTime() - Date.now()) / 86400000) : null;
  const hasRiiSteps = card.steps.some(s => s.riiRequired);
  const needsRii = card.riiRequired || hasRiiSteps;
  const riiStepsDone = riiStepsComplete(card.steps);

  /**
   * LG-108 — the defect this card was raised against, resolved through the SUPERSEDING CHAIN.
   *
   * Defects are an append-only ledger: a correction is a new row with a new id pointing back at the
   * one it replaces. `card.linkedDefectId` still names the ORIGINAL, so `currentRows(...).find(d =>
   * d.id === card.linkedDefectId)` — the idiom used elsewhere on this page — returns **undefined**
   * the moment anyone corrects the defect, and the narrative would silently vanish from the card.
   * `latestFor` walks the chain from an origin id to whatever row is current, which is what "the
   * linked defect" has always meant. (The same bare-`.find()` sits in `finalize` below and in three
   * engine modules; that is a pre-existing gap, flagged rather than fixed here.)
   */
  const linkedDefect = card.linkedDefectId ? latestFor(state.defects, card.linkedDefectId) : undefined;

  // ── AMM reference + CMC fault codes (LG-98/99) ──
  // These are the FIRST card-level editable scalars on a work card: everything else editable here is
  // a collection (steps / parts / labor) or a status tag. The pattern being set is the page's own
  // read-only gate, `{!completed && isMaint && …}`, with the locked rendering being plain text
  // rather than a disabled input — a complied-with card must not look like something you could
  // still type into. Both fields are hand-entered (D22); nothing here touches CAMP.
  const cmcCodes = card.cmcFaultCodes ?? [];
  /**
   * TL-38 — edit locally at once, then queue the same change for the server. The local dispatch keeps
   * typing instant; the queued op is what makes the edit exist anywhere other than this browser. If
   * the card moved underneath the edit the server refuses it and `WorkCardSyncBar` says so — the
   * local optimistic value is then replaced by the server's copy, so what is on screen is what is
   * real, not what this device wished were real.
   */
  const patch = (next: Partial<WorkCard>) => {
    dispatch({ type: 'EDIT_WORK_CARD', payload: { ...card, ...next } });
    sync?.submit('workcard.patch', card.id, next);
  };
  const setAmmReference = (v: string) => patch({ ammReference: v.trim() ? v : undefined });
  const addCmcCode = (raw: string) => {
    const code = raw.trim();
    if (!code) return;
    if (cmcCodes.some(c => c.toLowerCase() === code.toLowerCase())) {
      setCmcDraft('');
      return toast.error(`${code} is already on this card.`);
    }
    patch({ cmcFaultCodes: [...cmcCodes, code] });
    setCmcDraft('');
  };
  const removeCmcCode = (code: string) => {
    const next = cmcCodes.filter(c => c !== code);
    patch({ cmcFaultCodes: next.length ? next : undefined });
  };
  // The pilot's single reported code (LG-99) is a starting hint, never an automatic entry: what the
  // crew read off the CMC page is their observation, and putting it on the card is a maintenance act.
  const pilotCode = linkedDefect?.cmcFaultCode?.trim();
  const pilotHint = pilotCode && !cmcCodes.some(c => c.toLowerCase() === pilotCode.toLowerCase()) ? pilotCode : undefined;

  const toggleStep = (stepId: string) => {
    if (completed || !isMaint) return;
    const steps = card.steps.map(s => (s.id === stepId ? { ...s, done: !s.done } : s));
    const nextStatus = steps.some(s => s.done) ? 'IN_WORK' : 'OPEN';
    dispatch({ type: 'EDIT_WORK_CARD', payload: { ...card, steps, status: nextStatus, headerStatusCode: nextStatus === 'IN_WORK' ? 1 : card.headerStatusCode } });
  };

  const addPart = () => {
    if (!pn.trim() || !pdesc.trim()) return toast.error('Part number and description are required.');
    const part: PartUsage = {
      id: newId('pu'), workCardId: card.id, aircraftId: card.aircraftId, ataChapter: card.ataChapter,
      partNumber: pn.trim(), description: pdesc.trim(), serialNumber: psn.trim() || undefined, qty: Number(pqty) || 1, isRotable: rotable,
      removedPartNumber: showRemoved ? rpn.trim() || undefined : undefined,
      removedSerialNumber: showRemoved ? rsn.trim() || undefined : undefined,
      removedReason: showRemoved ? rreason.trim() || undefined : undefined,
      installedAtUtc: new Date().toISOString(), addedByOid: user.oid,
    };
    dispatch({ type: 'ADD_PART_USAGE', payload: part });
    setPn(''); setPdesc(''); setPsn(''); setPqty('1'); setRotable(false); setShowRemoved(false); setRpn(''); setRsn(''); setRreason('');
  };

  // Why-note prompting (QM1/QM5): long work must say why — prompted at entry, not buried.
  const pendingHours = Number(lhours) || 0;
  const needsWhyNote = whyNoteRequired(pendingHours, totalLabor + pendingHours);

  const addLabor = () => {
    if (!lhours || !ldesc.trim()) return toast.error('Hours and description are required.');
    if (needsWhyNote && !lnote.trim()) return toast.error('This work ran long — add a why-note (what drove the time: troubleshooting path, parts wait, tech-ops call…).');
    const entry: LaborEntry = {
      // TL-16: freeze the technician's name — these lines print on the work-card CRS.
      id: newId('lb'), workCardId: card.id, techOid: ltech, techName: nameOf(ltech), hours: pendingHours,
      dateUtc: new Date().toISOString(), description: ldesc.trim(),
      category: lcat, note: lnote.trim() || undefined,
    };
    // TL-38 — the hours land in local state immediately AND are queued for the server. Labor is an
    // append, so the server never rejects it for a concurrent edit (see `sync/applyOp.ts`): a
    // technician's logged time is the one thing this workflow must not be able to lose.
    dispatch({ type: 'ADD_LABOR_ENTRY', payload: entry });
    sync?.submit('workcard.labor.add', card.id, entry);
    setLhours(''); setLdesc(''); setLnote(''); setLcat('WRENCH');
  };

  /**
   * TL-38 — a removed labor line must reach the server too. Deleting locally only would leave the
   * entry on the server's copy, and the next thing that pulled that copy down would resurrect it —
   * into `totalLabor`, and from there into the "Labor N h" sentence on the signed release.
   */
  const removeLabor = (laborEntryId: string) => {
    dispatch({ type: 'DELETE_LABOR_ENTRY', payload: laborEntryId });
    sync?.submit('workcard.labor.delete', card.id, { laborEntryId });
  };

  /**
   * TL-38 — D61's retrospective timeline is the surface the numbers actually come from, so it is the
   * one that most needs to survive being read on another device. It edits the history as a unit
   * (reasons, notes, the per-gap include/exclude flag), and `timeAudit` travels with it because D62
   * makes that the append-only record of every edit to `statusTags`.
   */
  const saveTimeline = (next: WorkCard) => {
    dispatch({ type: 'EDIT_WORK_CARD', payload: next });
    sync?.submit('workcard.timeline.set', card.id, {
      statusTags: next.statusTags ?? [],
      timeAudit: next.timeAudit ?? [],
    });
  };

  /**
   * TL-38 — the parts panel hands back a whole card, so diff out what actually changed and send the
   * narrow op. Sending the whole card as a patch would make every parts edit conflict with any
   * concurrent change to any other field, which is how a sync becomes something people work around.
   */
  const savePartsOrders = (next: WorkCard) => {
    dispatch({ type: 'EDIT_WORK_CARD', payload: next });
    const before = card.partsOrders ?? [];
    const after = next.partsOrders ?? [];
    const added = after.find(o => !before.some(b => b.id === o.id));
    if (added) return sync?.submit('workcard.parts.add', card.id, added);
    const received = after.find(o => o.receivedAtUtc && !before.find(b => b.id === o.id)?.receivedAtUtc);
    if (received?.receivedAtUtc) {
      sync?.submit('workcard.parts.receive', card.id, { partsOrderId: received.id, receivedAtUtc: received.receivedAtUtc });
    }
  };

  // ── work/wait status tags (QM4/D27) ──
  const tagNow = currentTag(card);
  const durations = statusDurations(card, new Date().toISOString());
  const setStatusTag = (tag: WorkCardStatusTag, note?: string, partsOrderId?: string) => {
    const r = appendStatusTag(card, tag, user.oid, new Date().toISOString(), { note, byName: user.displayName, partsOrderId });
    if (!r.ok) return toast.error(r.error);
    dispatch({ type: 'EDIT_WORK_CARD', payload: r.card });
    // TL-38 — send the newly appended tag + its audit row, not the whole card. `appendStatusTag` is
    // the only sanctioned writer of the time history (D62), so the op carries exactly what it wrote.
    const newTag = r.card.statusTags?.[r.card.statusTags.length - 1];
    const newAudit = r.card.timeAudit?.[r.card.timeAudit.length - 1];
    if (newTag && newAudit) sync?.submit('workcard.statustag.add', card.id, { tag: newTag, audit: newAudit });
    setPooPromptOpen(false); setPooNote('');
    toast.success(tag === 'WAITING_PARTS' ? 'Tagged waiting on parts (POO) — wait time now accruing to parts.' : tag === 'WAITING_INSPECTION' ? 'Tagged waiting on inspection.' : 'Card tagged in work.');
  };

  const addStepsFromCamp = () => {
    if (!addWo) return;
    const wo = integration.pullWorkOrder(card.aircraftId, addWo);
    if (!wo) return toast.error('CAMP returned no detail for that work order.');
    const newSteps = wo.lines.filter(l => l.lineType === 'T').map((l, i) => ({
      id: newId('st'), seq: card.steps.length + i + 1, text: l.description, done: false,
      riiRequired: wo.riiRequired && /independent inspection|\bRII\b/i.test(l.description),
    }));
    // Merge the WO's expected parts/tools/consumables (dedupe on kind+part number+name).
    const seen = new Set((card.campExpected ?? []).map(e => `${e.kind}|${e.partNumber ?? ''}|${e.name}`));
    const addedExpected = expectedFromWo(wo).filter(e => !seen.has(`${e.kind}|${e.partNumber ?? ''}|${e.name}`));
    const campExpected = [...(card.campExpected ?? []), ...addedExpected];
    dispatch({ type: 'EDIT_WORK_CARD', payload: { ...card, steps: [...card.steps, ...newSteps], woNumber: card.woNumber ?? wo.woNumber, campExpected: campExpected.length ? campExpected : undefined } });
    setAddWo('');
    toast.success(`Added ${newSteps.length} step(s)${addedExpected.length ? ` + ${addedExpected.length} expected part/tool item(s)` : ''} from CAMP ${wo.woNumber}.`);
  };

  const beginStepRii = (stepId: string) => {
    if (!inspector) return toast.error('Select an RII inspector authorized for this ATA.');
    setRiiStepId(stepId);
    setRiiStepOpen(true);
  };
  const onStepRiiSigned = (stepId: string, rSig: Signature) => {
    dispatch({ type: 'ADD_SIGNATURE', payload: rSig });
    const steps = card.steps.map(s => (s.id === stepId ? { ...s, riiSignatureId: rSig.id, riiInspectorOid: inspector?.oid } : s));
    dispatch({ type: 'EDIT_WORK_CARD', payload: { ...card, steps } });
    toast.success('RII step inspected and signed.');
  };

  const beginComplete = () => {
    if (!isMaint) return toast.error('Only maintenance can sign work-card completion.');
    if (!allStepsDone) return toast.error('Mark all steps complete before signing.');
    const crs = validateCrs(user);
    if (!crs.ok) return toast.error(crs.error);
    if (needsRii && !inspector) return toast.error('Select an RII inspector authorized for this ATA.');
    if (hasRiiSteps && !riiStepsDone) return toast.error(`Every RII step must be independently inspector-signed first (${pendingRiiSteps(card.steps).length} pending).`);
    setPendingReleaseId(newId('rel'));
    setCrsOpen(true);
  };

  const finalize = (pSig: Signature, rSig?: Signature) => {
    const now = new Date().toISOString();
    const partsSummary = parts.length ? ` Parts: ${parts.map(p => `${p.partNumber}×${p.qty}`).join(', ')}.` : '';
    const release: MaintenanceRelease = {
      id: pendingReleaseId, aircraftId: card.aircraftId, signoffType: 'WORKCARD', linkedWorkCardId: card.id,
      linkedDefectId: card.linkedDefectId, isGatingDischarge: false,
      workDescription: `${card.title} (CAMP ${card.woNumber ?? '—'}).${partsSummary} Labor ${totalLabor} h.`,
      completionDateUtc: now,
      returnToServiceStatement: 'Work card complied with; the aircraft is approved for return to service (14 CFR 91.417).',
      certifyingTechOid: user.oid, apCertificateNumber: user.apCertificateNumber ?? '',
      riiRequired: needsRii,
      riiInspectorOid: rSig ? inspector?.oid : card.steps.find(s => s.riiRequired && s.riiSignatureId)?.riiInspectorOid,
      riiSignatureId: rSig?.id ?? card.steps.find(s => s.riiRequired && s.riiSignatureId)?.riiSignatureId,
      pdfBlobUri: mockPdfBlobUri('crs', pendingReleaseId), signatureId: pSig.id,
    };
    dispatch({ type: 'ADD_SIGNATURE', payload: pSig });
    if (rSig) dispatch({ type: 'ADD_SIGNATURE', payload: rSig });
    dispatch({ type: 'ADD_RELEASE', payload: release });
    dispatch({ type: 'EDIT_WORK_CARD', payload: { ...card, status: 'COMPLETED', completedReleaseId: release.id, completedAtUtc: now, headerStatusCode: 0 } });

    // If this card was raised against a defect, rectify it (return to service).
    if (card.linkedDefectId) {
      const def = currentRows(state.defects).find(d => d.id === card.linkedDefectId);
      if (def && def.status !== 'RECTIFIED' && def.status !== 'CLOSED') {
        const rectified: Defect = { ...def, id: newId('def'), supersedesId: def.id, status: 'RECTIFIED', rectificationText: release.workDescription, clearedByOid: user.oid, clearedTsUtc: now, signatureId: pSig.id };
        dispatch({ type: 'SUPERSEDE_DEFECT', payload: rectified });
        // CAMP: rectification closes the discrepancy (UPDATE → Closed), carrying the parent ref
        // forward (off-ledger, OQ9) and the pre-rectification status (watch lane stays DEFERRED-WATCHLIST).
        integration.pushDiscrepancy(rectificationClosePush(def, rectified.id, {
          technician: user.displayName, riiItem: needsRii, inspector: inspector?.displayName,
        }));
        const linkedDef = currentRows(state.deferrals).find(d => d.defectId === def.id && d.status !== 'CLEARED');
        if (linkedDef) {
          const cleared: Deferral = { ...linkedDef, id: newId('df'), supersedesId: linkedDef.id, status: 'CLEARED' } as Deferral;
          dispatch({ type: 'SUPERSEDE_DEFERRAL', payload: cleared });
          integration.pushDiscrepancy({
            entityType: 'DEFERRAL', entityId: cleared.id, aircraftId: linkedDef.aircraftId,
            ata: def.ataChapter, description: `MEL deferral cleared on rectification of ${def.id}`,
            technician: user.displayName, intent: 'CLOSE', supersedesEntityId: linkedDef.id,
          });
        }
      }
    }
    dispatch({ type: 'ADD_AUDIT', payload: { id: newId('aud'), actorOid: user.oid, action: 'WORKCARD_COMPLETED', entityType: 'WorkCard', entityId: card.id, atUtc: now, summary: `${ac.tailNumber} ${card.cardNumber} complied with — RTS${card.riiRequired ? ' (RII dual sign-off)' : ''}` } });
    toast.success(`${card.cardNumber} complied with — ${ac.tailNumber} returned to service.`);
  };

  const onCrsSigned = (sig: Signature) => {
    setPerfSig(sig);
    // Per-step RII (if any) is already signed before completion; only the legacy card-level RII opens here.
    if (card.riiRequired && !hasRiiSteps) { setRiiOpen(true); return; }
    finalize(sig);
  };

  const printCompletion = () => {
    if (!release) return;
    const perf = state.signatures.find(s => s.id === release.signatureId);
    const rii = release.riiSignatureId ? state.signatures.find(s => s.id === release.riiSignatureId) : undefined;
    printSignedRecord({
      docTitle: 'Work Card — Certificate of Release to Service',
      recordType: 'Work card', reference: `${card.cardNumber} · ${release.id}`,
      aircraft: `${ac.tailNumber} · ${ac.type} · S/N ${ac.serialNumber}`,
      pdfBlobUri: release.pdfBlobUri ?? mockPdfBlobUri('crs', release.id),
      sections: [
        { heading: 'Work card', fields: [
          { label: 'Card', value: card.cardNumber }, { label: 'CAMP WO', value: card.woNumber ?? '—' },
          { label: 'ATA', value: card.ataChapter }, { label: 'Type', value: card.scheduled ? 'Scheduled' : 'Corrective' },
        ], body: card.title },
        // LG-98/99 — shared with the other two CRS call sites; see `util/workCardPrint.ts`.
        ...workCardReferenceSections(card),
        { heading: 'Steps', body: card.steps.map(s => `${s.done ? '☑' : '☐'} ${s.text}`).join('\n') },
        { heading: 'Parts', body: parts.length ? parts.map(p => `${p.partNumber} (${p.description}) ×${p.qty}${p.serialNumber ? ` S/N ${p.serialNumber}` : ''}${p.removedPartNumber ? ` — removed ${p.removedPartNumber}${p.removedSerialNumber ? `/${p.removedSerialNumber}` : ''}` : ''}`).join('\n') : 'None' },
        // Frozen at entry (TL-16) — never a live Personnel join on a signed release.
        { heading: 'Labor', body: labor.length ? labor.map(l => `${l.techName ?? 'not recorded'} — ${l.hours} h — ${l.description}`).join('\n') + `\nTotal: ${totalLabor} h` : 'None' },
        { heading: 'Return to service', body: release.returnToServiceStatement },
      ],
      signatures: [perf, rii].filter(Boolean).map(s => ({ role: s!.signerRole, name: s!.signerName, cert: s!.certNumber, hash: s!.mockContentHash, signedAtUtc: s!.signedAtUtc, amr: s!.amr.join('+') })),
    });
  };

  return (
    <TechLogShell
      title={`${card.cardNumber} — ${card.title}`}
      subtitle={`${ac.tailNumber} · ${ac.type} · ATA ${card.ataChapter}${card.woNumber ? ` · CAMP ${card.woNumber}` : ''}`}
      actions={
        <>
          <Button variant="outline" size="sm" onClick={() => navigate(`/tech-log/aircraft/${ac.tailNumber}?tab=workcards`)}><ArrowLeft className="mr-1.5 h-4 w-4" /> {ac.tailNumber}</Button>
          {completed && <Button size="sm" variant="ghost" onClick={printCompletion}><Printer className="mr-1.5 h-4 w-4" /> View / Print</Button>}
        </>
      }
    >
      {/* TL-38 — who last touched this card and when, who else is in it, and anything this device
          typed that the server refused. Above the card body on purpose: a technician picking up
          someone else's job needs it before they read the work, not after. */}
      <WorkCardSyncBar workCardId={card.id} nowIso={new Date().toISOString()} />
      <Card className="mb-4">
        <CardContent className="flex flex-wrap items-center gap-3 p-4 text-sm">
          <Badge variant={completed ? 'outline' : card.status === 'IN_WORK' ? 'secondary' : 'destructive'}>{card.status}</Badge>
          <span className="text-muted-foreground">WO status: {WO_HEADER_STATUS[card.headerStatusCode] ?? card.headerStatusCode}</span>
          {card.scheduled ? <Badge variant="outline">scheduled</Badge> : <Badge variant="outline">corrective</Badge>}
          {card.riiRequired && <Badge variant="outline"><UserCheck className="mr-1 h-3 w-3" />RII required</Badge>}
          {card.linkedDefectId && <Badge variant="outline">linked defect</Badge>}
          {forecastItem && (
            <Badge variant="outline" className={!completed && forecastDays != null && forecastDays <= 7 ? 'border-[var(--gfo-warning,#F1B434)] text-[var(--gfo-warning,#F1B434)]' : ''}>
              <CalendarClock className="mr-1 h-3 w-3" />
              CAMP due list{forecastItem.dueDateUtc ? ` · ${new Date(forecastItem.dueDateUtc).toLocaleDateString()} · ${forecastDays != null && forecastDays < 0 ? `overdue ${Math.abs(forecastDays)}d` : `${forecastDays}d`}` : ''}
            </Badge>
          )}
          <span className="ml-auto text-xs text-muted-foreground">steps {stepsDone}/{card.steps.length} · labor {totalLabor} h · {parts.length} part(s)</span>
        </CardContent>
        {/* LG-108 — what was actually reported, in the header a tech reads before troubleshooting.
            The `linked defect` badge above has never carried anything but the word: no description,
            no annunciation, no narrative. The narrative in particular ("started as a flicker on
            taxi, went solid after rotation") is the one thing the structured CAS message cannot
            say, and until now it reached no screen at all. */}
        {linkedDefect && (
          <CardContent className="border-t p-4 pt-3 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Reported defect</span>
              <Badge variant="outline">ATA {linkedDefect.ataChapter}</Badge>
              <CasChip message={linkedDefect.casMessage} color={linkedDefect.casColor} observed={linkedDefect.casObserved} />
            </div>
            <p className="mt-1">{linkedDefect.description}</p>
            <SymptomNote symptom={linkedDefect.symptom} source={linkedDefect.source} />
          </CardContent>
        )}
      </Card>

      {/* ── Troubleshooting references: AMM ref + CMC fault codes (LG-98/99) ── */}
      <Card className="mb-4" data-testid="work-card-references">
        <CardContent className="space-y-3 p-4 text-sm">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">Troubleshooting references</span>
            <span className="text-xs text-muted-foreground">manual entry — not sourced from CAMP</span>
          </div>

          {/* AMM reference — free text, because the reference is whatever document the tech actually
              worked to (AMM / CMM / SB) and there is no manual index in the app to validate against. */}
          {!completed && isMaint ? (
            <div>
              <Label htmlFor="wc-amm-ref" className="text-xs">AMM reference</Label>
              <Input
                id="wc-amm-ref"
                className="mt-1"
                placeholder="e.g. AMM 32-30-00"
                value={card.ammReference ?? ''}
                onChange={e => setAmmReference(e.target.value)}
              />
            </div>
          ) : (
            <div>
              <div className="text-xs text-muted-foreground">AMM reference</div>
              {card.ammReference
                ? <span className="font-medium">{card.ammReference}</span>
                : <span className="text-muted-foreground">Not recorded.</span>}
            </div>
          )}

          {/* CMC fault codes — a real add/remove chip list. Deliberately NOT the comma-separated
              string in a single `<Input>` that `AdminPersonnel` uses for `riiAuthorizedAta`: one
              stray comma there silently splits a value, there is no way to remove a single entry
              without re-typing the line, and nothing can render an individual code as its own
              object. The precedent followed instead is the attachments grid in `DefectFields`. */}
          <div>
            <div className="text-xs text-muted-foreground">CMC fault codes</div>
            {cmcCodes.length === 0 && <p className="mt-1 text-muted-foreground">None recorded.</p>}
            {cmcCodes.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1.5">
                {cmcCodes.map(code => (
                  <span key={code} className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-mono text-xs">
                    {code}
                    {!completed && isMaint && (
                      <button type="button" aria-label={`Remove CMC code ${code}`} title="Remove" onClick={() => removeCmcCode(code)}>
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </span>
                ))}
              </div>
            )}
            {!completed && isMaint && (
              <div className="mt-2 flex flex-col gap-2 md:flex-row md:items-center">
                <Input
                  aria-label="Add CMC fault code"
                  className="md:max-w-xs"
                  placeholder="e.g. 32-3120-04"
                  value={cmcDraft}
                  onChange={e => setCmcDraft(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCmcCode(cmcDraft); } }}
                />
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" disabled={!cmcDraft.trim()} onClick={() => addCmcCode(cmcDraft)}>
                    <Plus className="mr-1.5 h-3.5 w-3.5" /> Add code
                  </Button>
                  {pilotHint && (
                    <Button size="sm" variant="ghost" aria-label={`Add pilot-reported code ${pilotHint}`} onClick={() => addCmcCode(pilotHint)}>
                      <Cpu className="mr-1.5 h-3.5 w-3.5" /> Pilot reported {pilotHint}
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/**
        * D61's primary time-entry surface: the editable, reconstructed-after-the-fact timeline.
        * Available on a complied-with card too (D62) — the write-up happens at end of shift.
        */}
      <WorkTimelinePanel
        card={card}
        canEdit={isMaint}
        user={{ oid: user.oid, displayName: user.displayName }}
        nameOf={nameOf}
        onSave={saveTimeline}
      />

      {/* One-tap chips (QM4/D27) — the CONVENIENCE path per D61, never the source of truth. */}
      {!completed && isMaint && (
        <Card className="mb-4">
          <CardContent className="flex flex-col gap-3 p-4 text-sm md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <Hourglass className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Tag as you go</span>
              <span className="text-xs text-muted-foreground">
                optional — the timeline above is what the numbers come from
              </span>
              {durations.openTag && <Badge variant="outline">now: {TAG_LABELS[durations.openTag]}</Badge>}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant={tagNow === 'DIAGNOSING' ? 'secondary' : 'outline'} disabled={tagNow === 'DIAGNOSING'} onClick={() => setStatusTag('DIAGNOSING')}><Stethoscope className="mr-1.5 h-3.5 w-3.5" /> Diagnosing</Button>
              <Button size="sm" variant={tagNow === 'IN_WORK' ? 'secondary' : 'outline'} disabled={tagNow === 'IN_WORK'} onClick={() => setStatusTag('IN_WORK')}><PlayCircle className="mr-1.5 h-3.5 w-3.5" /> In work</Button>
              <Button size="sm" variant={tagNow === 'WAITING_PARTS' ? 'secondary' : 'outline'} disabled={tagNow === 'WAITING_PARTS'} onClick={() => setPooPromptOpen(true)}><PackageSearch className="mr-1.5 h-3.5 w-3.5" /> Waiting on parts</Button>
              <Button size="sm" variant={tagNow === 'WAITING_TECH_REP' ? 'secondary' : 'outline'} disabled={tagNow === 'WAITING_TECH_REP'} onClick={() => setStatusTag('WAITING_TECH_REP')}><PhoneCall className="mr-1.5 h-3.5 w-3.5" /> Waiting on tech rep</Button>
              <Button size="sm" variant={tagNow === 'WAITING_CONTRACT_MX' ? 'secondary' : 'outline'} disabled={tagNow === 'WAITING_CONTRACT_MX'} onClick={() => setStatusTag('WAITING_CONTRACT_MX')}><Building2 className="mr-1.5 h-3.5 w-3.5" /> Waiting on contract mx</Button>
              <Button size="sm" variant={tagNow === 'WAITING_INSPECTION' ? 'secondary' : 'outline'} disabled={tagNow === 'WAITING_INSPECTION'} onClick={() => setStatusTag('WAITING_INSPECTION')}><ClipboardCheck className="mr-1.5 h-3.5 w-3.5" /> Waiting on inspection</Button>
            </div>
          </CardContent>
          {pooPromptOpen && (
            <CardContent className="border-t p-3">
              <div className="flex flex-col gap-2 md:flex-row md:items-center">
                <Input autoFocus placeholder="POO note — what part, ordered from whom (e.g. battery, GAC Savannah, ETA Fri)" value={pooNote} onChange={e => setPooNote(e.target.value)} />
                <div className="flex shrink-0 gap-2">
                  <Button size="sm" onClick={() => setStatusTag('WAITING_PARTS', pooNote)}>Tag POO</Button>
                  <Button size="sm" variant="ghost" onClick={() => { setPooPromptOpen(false); setPooNote(''); }}>Cancel</Button>
                </div>
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Offer, never force (LG-100): raising an order may set WAITING_PARTS, and satisfies that
          tag's mandatory what/from-whom note by reference to the order. */}
      {offeredOrder && !completed && (
        <Card className="mb-4 border-dashed">
          <CardContent className="flex flex-col gap-2 p-3 text-sm md:flex-row md:items-center md:justify-between">
            <span>
              Order raised with {offeredOrder.vendor}. Tag the card <strong>waiting on parts</strong> from now?
            </span>
            <div className="flex shrink-0 gap-2">
              <Button size="sm" onClick={() => {
                setStatusTag('WAITING_PARTS', `${offeredOrder.description} — ordered from ${offeredOrder.vendor}`, offeredOrder.id);
                setOfferedOrder(null);
              }}>Tag waiting on parts</Button>
              <Button size="sm" variant="ghost" onClick={() => setOfferedOrder(null)}>No, keep the current state</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* D62 — `isMaint`, NOT `!completed && isMaint`. A parts order belongs to the same
            retrospective record as the timeline above, and is gated the same way for the same
            reason: an order nobody marked received before the card was signed off could otherwise
            never be closed, so its lead time stayed wrong permanently and the vendor metric
            inherited the error. */}
        <PartsOrdersPanel
          card={card}
          canEdit={isMaint}
          onSave={savePartsOrders}
          waitingPartsAlready={tagNow === 'WAITING_PARTS'}
          onOfferWaitingParts={setOfferedOrder}
        />
        {/* Steps */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><ClipboardList className="h-4 w-4" /> Task steps</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {card.steps.map(s => (
              <div key={s.id} className={`flex items-start gap-2 rounded-md border p-2 text-sm ${s.done ? 'bg-[var(--gfo-success,#00B140)]/5' : ''}`}>
                <Checkbox className="mt-0.5 size-5" checked={s.done} disabled={completed || !isMaint} onCheckedChange={() => toggleStep(s.id)} />
                <span className="flex-1">
                  <span className="text-xs text-muted-foreground">#{s.seq}</span> {s.text}
                  {s.riiRequired && <Badge variant="outline" className="ml-2"><UserCheck className="mr-1 h-3 w-3" />RII</Badge>}
                </span>
                {s.riiRequired && (
                  s.riiSignatureId
                    ? <Badge variant="secondary" className="shrink-0 self-center text-[10px]"><CheckCircle2 className="mr-1 h-3 w-3" />RII {state.signatures.find(sig => sig.id === s.riiSignatureId)?.signerName ?? 'not recorded'}</Badge>
                    : !completed && (s.done
                        ? <Button size="sm" variant="outline" className="h-7 shrink-0" disabled={!isMaint || !inspector} onClick={() => beginStepRii(s.id)}>RII sign</Button>
                        : <span className="shrink-0 self-center text-[10px] text-muted-foreground">complete step</span>)
                )}
              </div>
            ))}
            {card.steps.length === 0 && <p className="text-sm text-muted-foreground">No task steps on this card.</p>}
            {isMaint && !completed && woOpts.length > 0 && (
              <div className="mt-2 flex items-center gap-2 border-t pt-2">
                <Select value={addWo} onValueChange={(v: string) => setAddWo(v)}>
                  <SelectTrigger className="h-8 flex-1"><SelectValue placeholder="Add steps from a CAMP work order…" /></SelectTrigger>
                  <SelectContent>{woOpts.map(w => <SelectItem key={w.woNumber} value={w.woNumber}>{w.woNumber} · {w.title}{w.riiRequired ? ' (RII)' : ''}</SelectItem>)}</SelectContent>
                </Select>
                <Button size="sm" variant="outline" className="h-8 shrink-0" disabled={!addWo} onClick={addStepsFromCamp}><CloudDownload className="mr-1.5 h-3.5 w-3.5" /> Add</Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Labor */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Clock className="h-4 w-4" /> Labor ({totalLabor} h)</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {labor.map(l => (
              <div key={l.id} className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm">
                <div>
                  <span className="font-medium">{l.techName ?? 'not recorded'}</span> · {l.hours} h
                  <Badge variant="outline" className="ml-2 text-[10px]">{LABOR_CATEGORY_LABELS[l.category ?? 'WRENCH']}</Badge>
                  <div className="text-xs text-muted-foreground">{l.description}</div>
                  {l.note && <div className="mt-0.5 border-l-2 pl-2 text-xs italic text-muted-foreground">why: {l.note}</div>}
                </div>
                {!completed && isMaint && <Button size="icon" variant="ghost" onClick={() => removeLabor(l.id)}><Trash2 className="h-4 w-4" /></Button>}
              </div>
            ))}
            {labor.length === 0 && <p className="text-sm text-muted-foreground">No labor recorded.</p>}
            {!completed && isMaint && (
              <div className="space-y-2 rounded-md border border-dashed p-2">
                <Select value={ltech} onValueChange={(v: string) => setLtech(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{maintPersonnel.map(p => <SelectItem key={p.oid} value={p.oid}>{p.displayName}</SelectItem>)}</SelectContent>
                </Select>
                <div className="grid grid-cols-3 gap-2">
                  <Input type="number" step="0.1" placeholder="Hours" value={lhours} onChange={e => setLhours(e.target.value)} />
                  <Input className="col-span-2" placeholder="Description" value={ldesc} onChange={e => setLdesc(e.target.value)} />
                </div>
                <Select value={lcat} onValueChange={(v: string) => setLcat(v as LaborCategory)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(LABOR_CATEGORY_LABELS) as LaborCategory[]).map(c => <SelectItem key={c} value={c}>{LABOR_CATEGORY_LABELS[c]}</SelectItem>)}
                  </SelectContent>
                </Select>
                {needsWhyNote && (
                  <div className="rounded bg-[var(--gfo-warning,#F1B434)]/10 p-2 text-xs">
                    This work ran long — say why (drives the "why did it take that long" answer later):
                    <Input className="mt-1" placeholder="e.g. 3 hrs isolating harness chafe with tech ops on the line" value={lnote} onChange={e => setLnote(e.target.value)} />
                  </div>
                )}
                {!needsWhyNote && <Input placeholder="Why-note (optional — what drove the time)" value={lnote} onChange={e => setLnote(e.target.value)} />}
                <Button size="sm" variant="outline" onClick={addLabor}><Plus className="mr-1.5 h-4 w-4" /> Add labor (end of shift)</Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Expected parts & tooling mirrored from the CAMP WO (read-only; install is still captured below) */}
        {card.campExpected && card.campExpected.length > 0 && (
          <Card className="lg:col-span-2">
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><PackageSearch className="h-4 w-4" /> Expected parts &amp; tooling — from CAMP {card.woNumber ?? ''}</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {card.campExpected.map((e, i) => (
                <div key={i} className="flex flex-col gap-1 rounded-md border border-dashed p-2 text-sm md:flex-row md:items-center md:justify-between">
                  <div>
                    <Badge variant="outline" className="mr-2 text-[10px]">{e.kind === 'PART' ? 'Part' : e.kind === 'TOOL' ? 'Tool' : 'Consumable'}</Badge>
                    <span className="font-medium">{e.partNumber ?? '—'}</span> · {e.name}
                    {e.serialNumber && <span className="text-muted-foreground"> · S/N {e.serialNumber}</span>}
                    {e.qty != null && <span className="text-muted-foreground"> · ×{e.qty}</span>}
                    {e.calibrationDueUtc && <span className="text-muted-foreground"> · cal due {new Date(e.calibrationDueUtc).toLocaleDateString()}</span>}
                  </div>
                  {!completed && isMaint && e.kind !== 'TOOL' && (
                    <Button size="sm" variant="ghost" className="h-7 shrink-0 text-xs"
                      onClick={() => { setPn(e.partNumber ?? ''); setPdesc(e.name); setPsn(e.serialNumber ?? ''); setPqty(String(e.qty ?? 1)); toast.info('Copied into the part form below — confirm and add when installed.'); }}>
                      Use in part form
                    </Button>
                  )}
                </div>
              ))}
              <p className="text-xs text-muted-foreground">Mirrored from the CAMP work order (WRK required tools/consumables + task part numbers). What was actually installed is recorded under Parts and covered by the signed CRS.</p>
            </CardContent>
          </Card>
        )}

        {/* Parts */}
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Package className="h-4 w-4" /> Parts ({parts.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {parts.map(p => (
              <div key={p.id} className="flex flex-col gap-1 rounded-md border p-2 text-sm md:flex-row md:items-center md:justify-between">
                <div>
                  <span className="font-medium">{p.partNumber}</span> · {p.description} · ×{p.qty}
                  {p.serialNumber && <span className="text-muted-foreground"> · S/N {p.serialNumber}</span>}
                  {p.isRotable && <Badge variant="outline" className="ml-2">rotable</Badge>}
                  {p.removedPartNumber && <div className="text-xs text-muted-foreground">removed {p.removedPartNumber}{p.removedSerialNumber ? ` / ${p.removedSerialNumber}` : ''}{p.removedReason ? ` — ${p.removedReason}` : ''}</div>}
                </div>
                {!completed && isMaint && <Button size="icon" variant="ghost" onClick={() => dispatch({ type: 'DELETE_PART_USAGE', payload: p.id })}><Trash2 className="h-4 w-4" /></Button>}
              </div>
            ))}
            {parts.length === 0 && <p className="text-sm text-muted-foreground">No parts recorded.</p>}
            {!completed && isMaint && (
              <div className="space-y-2 rounded-md border border-dashed p-2">
                <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                  <Input placeholder="Part number" value={pn} onChange={e => setPn(e.target.value)} />
                  <Input className="md:col-span-2" placeholder="Description" value={pdesc} onChange={e => setPdesc(e.target.value)} />
                  <Input type="number" placeholder="Qty" value={pqty} onChange={e => setPqty(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                  <Input className="md:col-span-2" placeholder="Serial number (if serialized)" value={psn} onChange={e => setPsn(e.target.value)} />
                  <label className="flex items-center gap-2 text-xs"><Checkbox checked={rotable} onCheckedChange={(v: unknown) => setRotable(v === true)} /> Rotable</label>
                  <label className="flex items-center gap-2 text-xs"><Checkbox checked={showRemoved} onCheckedChange={(v: unknown) => setShowRemoved(v === true)} /> Records a removal</label>
                </div>
                {showRemoved && (
                  <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                    <Input placeholder="Removed P/N" value={rpn} onChange={e => setRpn(e.target.value)} />
                    <Input placeholder="Removed S/N" value={rsn} onChange={e => setRsn(e.target.value)} />
                    <Input placeholder="Reason (e.g. unscheduled)" value={rreason} onChange={e => setRreason(e.target.value)} />
                  </div>
                )}
                <Button size="sm" variant="outline" onClick={addPart}><Plus className="mr-1.5 h-4 w-4" /> Add part</Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Completion */}
      <Card className="mt-4 max-w-3xl">
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Wrench className="h-4 w-4" /> Completion &amp; return to service</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          {completed ? (
            <div className="flex items-center gap-2 rounded bg-[var(--gfo-success,#00B140)]/10 p-2 text-[var(--gfo-success,#00B140)]">
              <CheckCircle2 className="h-4 w-4" /> Complied with {card.completedAtUtc ? new Date(card.completedAtUtc).toLocaleString() : ''}. Release {card.completedReleaseId}.
            </div>
          ) : (
            <>
              {needsRii && (
                <div>
                  <Label className="text-xs">RII inspector (authorized for ATA {card.ataChapter}, not the performer){hasRiiSteps ? ' — signs each RII step independently' : ''}</Label>
                  <Select value={inspectorOid} onValueChange={(v: string) => setInspectorOid(v)}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder={inspectors.length ? 'Select inspector' : 'No authorized inspector for this ATA'} /></SelectTrigger>
                    <SelectContent>{inspectors.map(p => <SelectItem key={p.oid} value={p.oid}>{p.displayName}</SelectItem>)}</SelectContent>
                  </Select>
                  {inspectors.length === 0 && <p className="mt-1 text-xs text-[var(--gfo-error,#EF3340)]">No RII-authorized inspector for ATA {card.ataChapter} — completion cannot proceed.</p>}
                  {hasRiiSteps && !riiStepsDone && <p className="mt-1 text-xs text-[var(--gfo-warning,#F1B434)]">{pendingRiiSteps(card.steps).length} RII step(s) still need an independent inspector signature.</p>}
                </div>
              )}
              <div className="rounded bg-muted/60 p-2 text-xs text-muted-foreground">
                CRS requires an A&P certificate ({user.apCertificateNumber ? `you: ${user.apCertificateNumber}` : 'you have none — sign will be rejected'}). All steps must be complete{card.riiRequired ? ' and an RII inspector must independently sign' : ''}. Step-up re-auth required.
              </div>
              <Button onClick={beginComplete} disabled={!isMaint || !allStepsDone || (needsRii && !inspector) || (hasRiiSteps && !riiStepsDone)}>
                <ShieldCheck className="mr-1.5 h-4 w-4" /> Sign completion (RTS)
              </Button>
              {!allStepsDone && <p className="text-xs text-muted-foreground">Mark all {card.steps.length} steps complete to enable signing.</p>}
            </>
          )}
        </CardContent>
      </Card>

      <SignCeremonyDialog open={crsOpen} onOpenChange={setCrsOpen} signer={user} signedEntity="WORK_CARD" signedEntityId={pendingReleaseId}
        intentStatement={INTENT.CRS} requireStepUp validate={() => validateCrs(user)}
        payloadSummary={`${card.cardNumber}: ${stepsDone}/${card.steps.length} steps, ${parts.length} part(s), ${totalLabor} h labor.`}
        onSigned={onCrsSigned} title="Sign work-card completion (performer)" />
      {inspector && (
        <SignCeremonyDialog open={riiOpen} onOpenChange={setRiiOpen} signer={inspector} signedEntity="WORK_CARD" signedEntityId={pendingReleaseId}
          intentStatement={INTENT.RII} requireStepUp validate={() => validateRii(user.oid, inspector, card.ataChapter)}
          onSigned={(rSig) => { if (perfSig) finalize(perfSig, rSig); }} title="RII independent inspection" />
      )}
      {inspector && riiStepId && (
        <SignCeremonyDialog open={riiStepOpen} onOpenChange={setRiiStepOpen} signer={inspector} signedEntity="WORK_CARD" signedEntityId={riiStepId}
          intentStatement={INTENT.RII} requireStepUp validate={() => validateRii(user.oid, inspector, card.ataChapter)}
          onSigned={(rSig) => onStepRiiSigned(riiStepId, rSig)} title="RII step — independent inspection" />
      )}
    </TechLogShell>
  );
}
