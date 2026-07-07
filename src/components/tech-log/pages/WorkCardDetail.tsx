import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, ClipboardList, Wrench, Clock, Package, Trash2, Plus, ShieldCheck, UserCheck, Printer, CheckCircle2, CloudDownload, CalendarClock } from 'lucide-react';
import { useTechLog, useCurrentUser } from '../TechLogContext';
import { useIntegration } from '../integration/useIntegration';
import { currentRows } from '../engine/supersede';
import { validateCrs, validateRii } from '../engine/signing';
import { riiStepsComplete, pendingRiiSteps } from '../engine/rii';
import { rectificationClosePush } from '../engine/rectification';
import { INTENT } from '../constants';
import { WO_HEADER_STATUS } from '../integration/campTaxonomy';
import { printSignedRecord, mockPdfBlobUri } from '../util/printRecord';
import { newId } from '../util/id';
import type { WorkCard, PartUsage, LaborEntry, MaintenanceRelease, Defect, Deferral, Signature } from '../types';
import { TechLogShell } from '../components/TechLogShell';
import { SignCeremonyDialog } from '../components/SignCeremonyDialog';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';

export default function WorkCardDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { state, dispatch } = useTechLog();
  const user = useCurrentUser();
  const isMaint = user.role === 'MAINTENANCE';
  const integration = useIntegration();

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

  const addLabor = () => {
    if (!lhours || !ldesc.trim()) return toast.error('Hours and description are required.');
    const entry: LaborEntry = { id: newId('lb'), workCardId: card.id, techOid: ltech, hours: Number(lhours) || 0, dateUtc: new Date().toISOString(), description: ldesc.trim() };
    dispatch({ type: 'ADD_LABOR_ENTRY', payload: entry });
    setLhours(''); setLdesc('');
  };

  const addStepsFromCamp = () => {
    if (!addWo) return;
    const wo = integration.pullWorkOrder(card.aircraftId, addWo);
    if (!wo) return toast.error('CAMP returned no detail for that work order.');
    const newSteps = wo.lines.filter(l => l.lineType === 'T').map((l, i) => ({
      id: newId('st'), seq: card.steps.length + i + 1, text: l.description, done: false,
      riiRequired: wo.riiRequired && /independent inspection|\bRII\b/i.test(l.description),
    }));
    dispatch({ type: 'EDIT_WORK_CARD', payload: { ...card, steps: [...card.steps, ...newSteps], woNumber: card.woNumber ?? wo.woNumber } });
    setAddWo('');
    toast.success(`Added ${newSteps.length} step(s) from CAMP ${wo.woNumber}.`);
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
        { heading: 'Steps', body: card.steps.map(s => `${s.done ? '☑' : '☐'} ${s.text}`).join('\n') },
        { heading: 'Parts', body: parts.length ? parts.map(p => `${p.partNumber} (${p.description}) ×${p.qty}${p.serialNumber ? ` S/N ${p.serialNumber}` : ''}${p.removedPartNumber ? ` — removed ${p.removedPartNumber}${p.removedSerialNumber ? `/${p.removedSerialNumber}` : ''}` : ''}`).join('\n') : 'None' },
        { heading: 'Labor', body: labor.length ? labor.map(l => `${nameOf(l.techOid)} — ${l.hours} h — ${l.description}`).join('\n') + `\nTotal: ${totalLabor} h` : 'None' },
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
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Steps */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><ClipboardList className="h-4 w-4" /> Task steps</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {card.steps.map(s => (
              <div key={s.id} className={`flex items-start gap-2 rounded-md border p-2 text-sm ${s.done ? 'bg-[var(--gfo-success,#00B140)]/5' : ''}`}>
                <input type="checkbox" className="mt-0.5" checked={s.done} disabled={completed || !isMaint} onChange={() => toggleStep(s.id)} />
                <span className="flex-1">
                  <span className="text-xs text-muted-foreground">#{s.seq}</span> {s.text}
                  {s.riiRequired && <Badge variant="outline" className="ml-2"><UserCheck className="mr-1 h-3 w-3" />RII</Badge>}
                </span>
                {s.riiRequired && (
                  s.riiSignatureId
                    ? <Badge variant="secondary" className="shrink-0 self-center text-[10px]"><CheckCircle2 className="mr-1 h-3 w-3" />RII {nameOf(s.riiInspectorOid ?? '')}</Badge>
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
                <div><span className="font-medium">{nameOf(l.techOid)}</span> · {l.hours} h<div className="text-xs text-muted-foreground">{l.description}</div></div>
                {!completed && isMaint && <Button size="icon" variant="ghost" onClick={() => dispatch({ type: 'DELETE_LABOR_ENTRY', payload: l.id })}><Trash2 className="h-4 w-4" /></Button>}
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
                <Button size="sm" variant="outline" onClick={addLabor}><Plus className="mr-1.5 h-4 w-4" /> Add labor</Button>
              </div>
            )}
          </CardContent>
        </Card>

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
                  <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={rotable} onChange={e => setRotable(e.target.checked)} /> Rotable</label>
                  <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={showRemoved} onChange={e => setShowRemoved(e.target.checked)} /> Records a removal</label>
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
