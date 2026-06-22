import { useState } from 'react';
import { toast } from 'sonner';
import { Wrench, ShieldCheck } from 'lucide-react';
import { useTechLog, useCurrentUser } from '../../TechLogContext';
import { validateCrs } from '../../engine/signing';
import { INTENT } from '../../constants';
import { mockPdfBlobUri } from '../../util/printRecord';
import { newId } from '../../util/id';
import type { Deferral, MaintenanceRelease, Signature } from '../../types';
import { SignCeremonyDialog } from '../SignCeremonyDialog';
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card';
import { Button } from '../../../ui/button';

/**
 * Reusable (M)/placard gating-discharge body — the SECOND of the two sign-offs that flips a
 * PENDING_PLACARD deferral to ACTIVE (RED → AMBER). Renders WITHOUT a TechLogShell. Same dispatch
 * sequence as before; calls onDone() after signing. Engine/gate logic unchanged.
 */
export function GatingReleasePanel({
  deferral,
  onDone,
  onCancel,
}: {
  deferral: Deferral;
  onDone: () => void;
  onCancel: () => void;
}) {
  const { state, dispatch } = useTechLog();
  const user = useCurrentUser();
  const isMaint = user.role === 'MAINTENANCE';
  const aircraft = state.aircraft.find(a => a.id === deferral.aircraftId);
  const mel = state.melItems.find(m => m.id === deferral.melItemId);

  const [crsOpen, setCrsOpen] = useState(false);
  const [pendingReleaseId, setPendingReleaseId] = useState('');

  if (!aircraft) return null;

  const beginCrs = () => {
    if (!isMaint) return toast.error('Only maintenance can sign a release.');
    setPendingReleaseId(newId('rel'));
    setCrsOpen(true);
  };

  const finalizeGating = (sig: Signature) => {
    const now = new Date().toISOString();
    const release: MaintenanceRelease = {
      id: pendingReleaseId, aircraftId: aircraft.id, signoffType: 'DEFERRAL', linkedDeferralId: deferral.id,
      isGatingDischarge: true, workDescription: `(M)/placard discharge for MEL ${mel?.subItemNumber ?? ''}`,
      completionDateUtc: now, returnToServiceStatement: 'Required (M) procedure / placard accomplished.',
      certifyingTechOid: user.oid, apCertificateNumber: user.apCertificateNumber ?? '', riiRequired: false,
      pdfBlobUri: mockPdfBlobUri('crs', pendingReleaseId), signatureId: sig.id,
    };
    const flipped: Deferral = { ...deferral, id: newId('df'), supersedesId: deferral.id, status: 'ACTIVE', gatingReleaseId: release.id, placardInstalled: true };
    dispatch({ type: 'ADD_SIGNATURE', payload: sig });
    dispatch({ type: 'ADD_RELEASE', payload: release });
    dispatch({ type: 'SUPERSEDE_DEFERRAL', payload: flipped });
    dispatch({ type: 'ADD_AUDIT', payload: { id: newId('aud'), actorOid: user.oid, action: 'GATING_RELEASE_SIGNED', entityType: 'Deferral', entityId: flipped.id, atUtc: now, summary: `${aircraft.tailNumber} (M)/placard discharged → deferral ACTIVE (AMBER)` } });
    toast.success(`${aircraft.tailNumber} now AMBER — deferral ACTIVE under MEL ${mel?.subItemNumber}.`);
    onDone();
  };

  return (
    <Card className="border-[var(--gfo-error,#EF3340)]/40">
      <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Wrench className="h-4 w-4" /> Gating-discharge release — step 2 of 2</CardTitle></CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="rounded bg-[var(--gfo-error,#EF3340)]/10 p-2 text-xs">
          {aircraft.tailNumber} is <strong>GROUNDED (RED)</strong>: the deferral is PENDING_PLACARD until the required (M) procedure / placard is accomplished and signed.
        </div>
        {mel?.mProcedure && <p className="rounded-md border p-3 text-xs"><strong>(M):</strong> {mel.mProcedure}</p>}
        {mel?.placardLocation && <p className="text-xs text-muted-foreground"><strong>Placard:</strong> {mel.placardLocation}</p>}
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>Later</Button>
          <Button onClick={beginCrs} disabled={!isMaint}><ShieldCheck className="mr-1.5 h-4 w-4" /> Sign discharge release</Button>
        </div>
        <p className="text-xs text-muted-foreground">On signing, the deferral flips PENDING_PLACARD → ACTIVE and the aircraft moves RED → AMBER (the second of the two sign-offs).</p>
      </CardContent>
      <SignCeremonyDialog open={crsOpen} onOpenChange={setCrsOpen} signer={user} signedEntity="CRS" signedEntityId={pendingReleaseId}
        intentStatement={INTENT.GATING_RELEASE} requireStepUp validate={() => validateCrs(user)} onSigned={finalizeGating} title="Sign (M)/placard release" />
    </Card>
  );
}
