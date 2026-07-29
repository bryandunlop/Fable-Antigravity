import { useState } from 'react';
import { toast } from 'sonner';
import { CheckCircle2, ShieldCheck } from 'lucide-react';
import { useTechLog, useCurrentUser } from '../../TechLogContext';
import { currentRows } from '../../engine/supersede';
import { validateCrs, validateRii } from '../../engine/signing';
import { INTENT } from '../../constants';
import { mockPdfBlobUri } from '../../util/printRecord';
import { newId } from '../../util/id';
import type { Defect, MaintenanceRelease, Signature } from '../../types';
import { SignCeremonyDialog } from '../SignCeremonyDialog';
import { CasChip } from '../CasChip';
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card';
import { Button } from '../../../ui/button';
import { Textarea } from '../../../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../ui/select';

/**
 * Reusable CRS rectification body (work performed + optional RII dual sign-off). Renders WITHOUT a
 * TechLogShell. On finalize it performs the same dispatch sequence as before (release, defect →
 * RECTIFIED, clear linked deferral) and calls onDone(). Engine/gate logic unchanged.
 */
export function RectifyPanel({
  defect,
  onDone,
  onCancel,
}: {
  defect: Defect;
  onDone: () => void;
  onCancel: () => void;
}) {
  const { state, dispatch } = useTechLog();
  const user = useCurrentUser();
  const isMaint = user.role === 'MAINTENANCE';
  const aircraft = state.aircraft.find(a => a.id === defect.aircraftId);
  const ata = defect.ataChapter;

  const [work, setWork] = useState('');
  const [riiRequired, setRiiRequired] = useState(false);
  const [inspectorOid, setInspectorOid] = useState('');
  const [crsOpen, setCrsOpen] = useState(false);
  const [riiOpen, setRiiOpen] = useState(false);
  const [pendingReleaseId, setPendingReleaseId] = useState('');
  const [perfSig, setPerfSig] = useState<Signature | null>(null);

  const inspectors = state.personnel.filter(p => p.riiAuthorized && p.riiAuthorizedAta.includes(ata) && p.oid !== user.oid);
  const inspector = state.personnel.find(p => p.oid === inspectorOid);

  if (!aircraft) return null;

  const beginCrs = () => {
    if (!isMaint) return toast.error('Only maintenance can sign a release.');
    if (!work.trim()) return toast.error('Describe the work performed.');
    if (riiRequired && !inspector) return toast.error('Select an RII inspector.');
    setPendingReleaseId(newId('rel'));
    setCrsOpen(true);
  };

  const finalizeRectify = (pSig: Signature, rSig?: Signature) => {
    const now = new Date().toISOString();
    const release: MaintenanceRelease = {
      id: pendingReleaseId, aircraftId: aircraft.id, signoffType: 'DEFECT_RECTIFICATION', linkedDefectId: defect.id,
      isGatingDischarge: false, workDescription: work.trim(), completionDateUtc: now,
      returnToServiceStatement: 'The above work was performed and the aircraft is approved for return to service (14 CFR 91.417).',
      certifyingTechOid: user.oid, apCertificateNumber: user.apCertificateNumber ?? '',
      riiRequired, riiInspectorOid: rSig ? inspector?.oid : undefined, riiSignatureId: rSig?.id,
      pdfBlobUri: mockPdfBlobUri('crs', pendingReleaseId), signatureId: pSig.id,
    };
    const rectified: Defect = { ...defect, id: newId('def'), supersedesId: defect.id, status: 'RECTIFIED', rectificationText: work.trim(), clearedByOid: user.oid, clearedTsUtc: now, signatureId: pSig.id };
    dispatch({ type: 'ADD_SIGNATURE', payload: pSig });
    if (rSig) dispatch({ type: 'ADD_SIGNATURE', payload: rSig });
    dispatch({ type: 'ADD_RELEASE', payload: release });
    dispatch({ type: 'SUPERSEDE_DEFECT', payload: rectified });
    const linkedDef = currentRows(state.deferrals).find(d => d.defectId === defect.id && d.status !== 'CLEARED');
    if (linkedDef) dispatch({ type: 'SUPERSEDE_DEFERRAL', payload: { ...linkedDef, id: newId('df'), supersedesId: linkedDef.id, status: 'CLEARED' } });
    dispatch({ type: 'ADD_AUDIT', payload: { id: newId('aud'), actorOid: user.oid, action: 'CRS_SIGNED', entityType: 'Defect', entityId: rectified.id, atUtc: now, summary: `${aircraft.tailNumber} ATA ${defect.ataChapter} rectified + RTS${riiRequired ? ' (RII dual sign-off)' : ''}` } });
    toast.success(`${aircraft.tailNumber} returned to service.`);
    onDone();
  };

  const onCrsSigned = (sig: Signature) => {
    setPerfSig(sig);
    if (riiRequired) { setRiiOpen(true); return; }
    finalizeRectify(sig);
  };

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2 text-base"><CheckCircle2 className="h-4 w-4" /> Certificate of Release to Service</CardTitle></CardHeader>
      <CardContent className="space-y-3 text-sm">
        {/* D57: the annunciation the crew reported travels with the defect into the rectification
            record — it is often the only clue about which system actually complained. */}
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>ATA {defect.ataChapter} · {defect.description}</span>
          <CasChip message={defect.casMessage} color={defect.casColor} observed={defect.casObserved} />
        </div>
        <div>
          <label className="text-xs font-medium">Work performed (91.417(a)(1)(i))</label>
          <Textarea className="mt-1" value={work} onChange={e => setWork(e.target.value)} placeholder="Describe the corrective action…" />
        </div>
        <label className="flex items-start gap-2">
          <input type="checkbox" className="mt-1" checked={riiRequired} onChange={e => setRiiRequired(e.target.checked)} />
          <span className="text-xs">Required Inspection Item (RII) — needs an independent second inspector.</span>
        </label>
        {riiRequired && (
          <div>
            <label className="text-xs font-medium">RII inspector (authorized for ATA {ata}, not the performer)</label>
            <Select value={inspectorOid} onValueChange={(v: string) => setInspectorOid(v)}>
              <SelectTrigger className="mt-1"><SelectValue placeholder={inspectors.length ? 'Select inspector' : 'No authorized inspector for this ATA'} /></SelectTrigger>
              <SelectContent>
                {inspectors.map(p => <SelectItem key={p.oid} value={p.oid}>{p.displayName}</SelectItem>)}
              </SelectContent>
            </Select>
            {inspectors.length === 0 && <p className="mt-1 text-xs text-[var(--gfo-error,#EF3340)]">No RII-authorized inspector for ATA {ata} — sign-off cannot proceed.</p>}
          </div>
        )}
        <div className="rounded bg-muted/60 p-2 text-xs text-muted-foreground">
          CRS requires an A&P certificate on file ({user.apCertificateNumber ? `you: ${user.apCertificateNumber}` : 'you have none — sign will be rejected'}). Step-up re-auth required.
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={beginCrs} disabled={!isMaint || (riiRequired && !inspector)}><ShieldCheck className="mr-1.5 h-4 w-4" /> Sign CRS</Button>
        </div>
      </CardContent>

      <SignCeremonyDialog open={crsOpen} onOpenChange={setCrsOpen} signer={user} signedEntity="CRS" signedEntityId={pendingReleaseId}
        intentStatement={INTENT.CRS} requireStepUp validate={() => validateCrs(user)} onSigned={onCrsSigned} title="Sign CRS (performer)" />
      {inspector && (
        <SignCeremonyDialog open={riiOpen} onOpenChange={setRiiOpen} signer={inspector} signedEntity="CRS" signedEntityId={pendingReleaseId}
          intentStatement={INTENT.RII} requireStepUp validate={() => validateRii(user.oid, inspector, ata)}
          onSigned={(rSig) => { if (perfSig) finalizeRectify(perfSig, rSig); }} title="RII independent inspection" />
      )}
    </Card>
  );
}
