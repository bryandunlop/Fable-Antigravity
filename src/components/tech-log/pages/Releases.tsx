import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { CheckCircle2, Wrench, ShieldCheck, UserCheck } from 'lucide-react';
import { useTechLog, useCurrentUser } from '../TechLogContext';
import { currentRows } from '../engine/supersede';
import { validateCrs, validateRii } from '../engine/signing';
import { INTENT } from '../constants';
import { newId } from '../util/id';
import type { Defect, Deferral, MaintenanceRelease, Signature, Personnel } from '../types';
import { TechLogShell } from '../components/TechLogShell';
import { SignCeremonyDialog } from '../components/SignCeremonyDialog';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Textarea } from '../../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';

export default function Releases() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { state, dispatch } = useTechLog();
  const user = useCurrentUser();
  const isMaint = user.role === 'MAINTENANCE';

  const deferralId = params.get('deferral') ?? undefined;
  const isGating = params.get('gating') === '1' && !!deferralId;
  const defectId = params.get('defect') ?? undefined;

  const deferral = deferralId ? currentRows(state.deferrals).find(d => d.id === deferralId) : undefined;
  const rectifyDefect = defectId ? currentRows(state.defects).find(d => d.id === defectId) : undefined;
  const targetAircraftId = deferral?.aircraftId ?? rectifyDefect?.aircraftId;
  const aircraft = state.aircraft.find(a => a.id === targetAircraftId);
  const mel = deferral ? state.melItems.find(m => m.id === deferral.melItemId) : undefined;
  const ata = rectifyDefect?.ataChapter ?? mel?.ataReference ?? '';

  const [work, setWork] = useState('');
  const [riiRequired, setRiiRequired] = useState(false);
  const [inspectorOid, setInspectorOid] = useState('');
  const [crsOpen, setCrsOpen] = useState(false);
  const [riiOpen, setRiiOpen] = useState(false);
  const [pendingReleaseId, setPendingReleaseId] = useState('');
  const [perfSig, setPerfSig] = useState<Signature | null>(null);

  const inspectors = state.personnel.filter(p => p.riiAuthorized && p.riiAuthorizedAta.includes(ata) && p.oid !== user.oid);
  const inspector = state.personnel.find(p => p.oid === inspectorOid);

  const beginCrs = () => {
    if (!isMaint) return toast.error('Only maintenance can sign a release.');
    if (!isGating && !work.trim()) return toast.error('Describe the work performed.');
    if (!isGating && riiRequired && !inspector) return toast.error('Select an RII inspector.');
    setPendingReleaseId(newId('rel'));
    setCrsOpen(true);
  };

  const finalizeGating = (sig: Signature) => {
    if (!deferral || !aircraft) return;
    const now = new Date().toISOString();
    const release: MaintenanceRelease = {
      id: pendingReleaseId, aircraftId: aircraft.id, signoffType: 'DEFERRAL', linkedDeferralId: deferral.id,
      isGatingDischarge: true, workDescription: `(M)/placard discharge for MEL ${mel?.subItemNumber ?? ''}`,
      completionDateUtc: now, returnToServiceStatement: 'Required (M) procedure / placard accomplished.',
      certifyingTechOid: user.oid, apCertificateNumber: user.apCertificateNumber ?? '', riiRequired: false, signatureId: sig.id,
    };
    const flipped: Deferral = { ...deferral, id: newId('df'), supersedesId: deferral.id, status: 'ACTIVE', gatingReleaseId: release.id, placardInstalled: true };
    dispatch({ type: 'ADD_SIGNATURE', payload: sig });
    dispatch({ type: 'ADD_RELEASE', payload: release });
    dispatch({ type: 'SUPERSEDE_DEFERRAL', payload: flipped });
    dispatch({ type: 'ADD_AUDIT', payload: { id: newId('aud'), actorOid: user.oid, action: 'GATING_RELEASE_SIGNED', entityType: 'Deferral', entityId: flipped.id, atUtc: now, summary: `${aircraft.tailNumber} (M)/placard discharged → deferral ACTIVE (AMBER)` } });
    toast.success(`${aircraft.tailNumber} now AMBER — deferral ACTIVE under MEL ${mel?.subItemNumber}.`);
    navigate(`/tech-log/aircraft/${aircraft.tailNumber}`);
  };

  const finalizeRectify = (pSig: Signature, rSig?: Signature) => {
    if (!rectifyDefect || !aircraft) return;
    const now = new Date().toISOString();
    const release: MaintenanceRelease = {
      id: pendingReleaseId, aircraftId: aircraft.id, signoffType: 'DEFECT_RECTIFICATION', linkedDefectId: rectifyDefect.id,
      isGatingDischarge: false, workDescription: work.trim(), completionDateUtc: now,
      returnToServiceStatement: 'The above work was performed and the aircraft is approved for return to service (14 CFR 91.417).',
      certifyingTechOid: user.oid, apCertificateNumber: user.apCertificateNumber ?? '',
      riiRequired, riiInspectorOid: rSig ? inspector?.oid : undefined, riiSignatureId: rSig?.id, signatureId: pSig.id,
    };
    const rectified: Defect = { ...rectifyDefect, id: newId('def'), supersedesId: rectifyDefect.id, status: 'RECTIFIED', rectificationText: work.trim(), clearedByOid: user.oid, clearedTsUtc: now, signatureId: pSig.id };
    dispatch({ type: 'ADD_SIGNATURE', payload: pSig });
    if (rSig) dispatch({ type: 'ADD_SIGNATURE', payload: rSig });
    dispatch({ type: 'ADD_RELEASE', payload: release });
    dispatch({ type: 'SUPERSEDE_DEFECT', payload: rectified });
    // clear any deferral on this defect
    const linkedDef = currentRows(state.deferrals).find(d => d.defectId === rectifyDefect.id && d.status !== 'CLEARED');
    if (linkedDef) dispatch({ type: 'SUPERSEDE_DEFERRAL', payload: { ...linkedDef, id: newId('df'), supersedesId: linkedDef.id, status: 'CLEARED' } });
    dispatch({ type: 'ADD_AUDIT', payload: { id: newId('aud'), actorOid: user.oid, action: 'CRS_SIGNED', entityType: 'Defect', entityId: rectified.id, atUtc: now, summary: `${aircraft.tailNumber} ATA ${rectifyDefect.ataChapter} rectified + RTS${riiRequired ? ' (RII dual sign-off)' : ''}` } });
    toast.success(`${aircraft.tailNumber} returned to service.`);
    navigate(`/tech-log/aircraft/${aircraft.tailNumber}`);
  };

  const onCrsSigned = (sig: Signature) => {
    setPerfSig(sig);
    if (isGating) return finalizeGating(sig);
    if (riiRequired) { setRiiOpen(true); return; }
    finalizeRectify(sig);
  };

  // ---------- render ----------
  if (isGating && deferral && aircraft) {
    return (
      <TechLogShell title={`(M)/Placard Release — ${aircraft.tailNumber}`} subtitle={`MEL ${mel?.subItemNumber} · ${mel?.title}`}>
        <Card className="max-w-2xl">
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Wrench className="h-4 w-4" /> Gating-discharge release</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="rounded bg-[var(--gfo-error,#EF3340)]/10 p-2 text-xs">
              {aircraft.tailNumber} is <strong>GROUNDED (RED)</strong>: the deferral is PENDING_PLACARD until the required (M) procedure / placard is accomplished and signed.
            </div>
            {mel?.mProcedure && <p className="rounded-md border p-3 text-xs"><strong>(M):</strong> {mel.mProcedure}</p>}
            {mel?.placardLocation && <p className="text-xs text-muted-foreground"><strong>Placard:</strong> {mel.placardLocation}</p>}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate('/tech-log/deferrals')}>Cancel</Button>
              <Button onClick={beginCrs} disabled={!isMaint}><ShieldCheck className="mr-1.5 h-4 w-4" /> Sign discharge release</Button>
            </div>
            <p className="text-xs text-muted-foreground">On signing, the deferral flips PENDING_PLACARD → ACTIVE and the aircraft moves RED → AMBER (the second of the two sign-offs).</p>
          </CardContent>
        </Card>
        <SignCeremonyDialog open={crsOpen} onOpenChange={setCrsOpen} signer={user} signedEntity="CRS" signedEntityId={pendingReleaseId}
          intentStatement={INTENT.GATING_RELEASE} requireStepUp validate={() => validateCrs(user)} onSigned={onCrsSigned} title="Sign (M)/placard release" />
      </TechLogShell>
    );
  }

  if (rectifyDefect && aircraft) {
    return (
      <TechLogShell title={`Return to Service — ${aircraft.tailNumber}`} subtitle={`ATA ${rectifyDefect.ataChapter} · ${rectifyDefect.description}`}>
        <Card className="max-w-2xl">
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><CheckCircle2 className="h-4 w-4" /> Certificate of Release to Service</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
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
              <Button variant="outline" onClick={() => navigate('/tech-log/defects')}>Cancel</Button>
              <Button onClick={beginCrs} disabled={!isMaint || (riiRequired && !inspector)}><ShieldCheck className="mr-1.5 h-4 w-4" /> Sign CRS</Button>
            </div>
          </CardContent>
        </Card>

        <SignCeremonyDialog open={crsOpen} onOpenChange={setCrsOpen} signer={user} signedEntity="CRS" signedEntityId={pendingReleaseId}
          intentStatement={INTENT.CRS} requireStepUp validate={() => validateCrs(user)} onSigned={onCrsSigned} title="Sign CRS (performer)" />
        {inspector && (
          <SignCeremonyDialog open={riiOpen} onOpenChange={setRiiOpen} signer={inspector} signedEntity="CRS" signedEntityId={pendingReleaseId}
            intentStatement={INTENT.RII} requireStepUp validate={() => validateRii(user.oid, inspector, ata)}
            onSigned={(rSig) => { if (perfSig) finalizeRectify(perfSig, rSig); }} title="RII independent inspection" />
        )}
      </TechLogShell>
    );
  }

  // fallback: recent releases
  const releases = currentRows(state.releases).slice().reverse();
  const tailOf = (id: string) => state.aircraft.find(a => a.id === id)?.tailNumber ?? '—';
  return (
    <TechLogShell title="Maintenance Releases" subtitle="Signed CRS, rectifications, and (M)/placard discharges.">
      <div className="space-y-3">
        {releases.length === 0 && <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">No releases yet. Rectify a defect or discharge a deferral from the Defects / Deferrals pages.</CardContent></Card>}
        {releases.map(r => (
          <Card key={r.id}>
            <CardContent className="p-4 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{tailOf(r.aircraftId)}</span>
                <Badge variant="outline">{r.signoffType}</Badge>
                {r.isGatingDischarge && <Badge variant="secondary">gating discharge</Badge>}
                {r.riiRequired && <Badge variant="outline"><UserCheck className="mr-1 h-3 w-3" />RII</Badge>}
                <span className="ml-auto text-xs text-muted-foreground">{new Date(r.completionDateUtc).toLocaleString()}</span>
              </div>
              <p className="mt-1 text-muted-foreground">{r.workDescription}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">A&P {r.apCertificateNumber || '—'}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </TechLogShell>
  );
}
