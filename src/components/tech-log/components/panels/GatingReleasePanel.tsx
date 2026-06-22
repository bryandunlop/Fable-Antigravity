import { useState } from 'react';
import { toast } from 'sonner';
import { Wrench, ShieldCheck } from 'lucide-react';
import { useTechLog, useCurrentUser } from '../../TechLogContext';
import { validateCrs } from '../../engine/signing';
import { canSignPlacardDischarge } from '../../engine/disposition';
import { INTENT } from '../../constants';
import { mockPdfBlobUri } from '../../util/printRecord';
import { newId } from '../../util/id';
import type { Deferral, MaintenanceRelease, Signature } from '../../types';
import { SignCeremonyDialog } from '../SignCeremonyDialog';
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card';
import { Button } from '../../../ui/button';

/** (M)/placard gating-discharge body (RED → AMBER). Maintenance signs a CRS discharge; an authorized
 *  crew member signs a non-CRS placard attestation for a placard-ONLY deferral. Same state-machine flip. */
export function GatingReleasePanel({ deferral, onDone, onCancel }: { deferral: Deferral; onDone: () => void; onCancel: () => void }) {
  const { state, dispatch } = useTechLog();
  const user = useCurrentUser();
  const isMaint = user.role === 'MAINTENANCE';
  const aircraft = state.aircraft.find(a => a.id === deferral.aircraftId);
  const mel = state.melItems.find(m => m.id === deferral.melItemId);

  const [signOpen, setSignOpen] = useState(false);
  const [pendingReleaseId, setPendingReleaseId] = useState('');

  if (!aircraft) return null;

  const canSign = canSignPlacardDischarge(user, deferral);
  const crewAttestation = !isMaint && canSign; // an *authorized* crew member signs a non-CRS placard attestation

  const begin = () => {
    if (!canSign) return toast.error(isMaint ? 'Cannot sign this discharge.' : 'An (M) procedure requires maintenance — crew may only attest a placard-only item.');
    setPendingReleaseId(newId('rel'));
    setSignOpen(true);
  };

  const finalize = (sig: Signature) => {
    const now = new Date().toISOString();
    const release: MaintenanceRelease = {
      id: pendingReleaseId, aircraftId: aircraft.id, signoffType: 'DEFERRAL', linkedDeferralId: deferral.id,
      isGatingDischarge: true,
      workDescription: crewAttestation ? `Placard installed (crew attestation) for MEL ${mel?.subItemNumber ?? ''}` : `(M)/placard discharge for MEL ${mel?.subItemNumber ?? ''}`,
      completionDateUtc: now,
      returnToServiceStatement: crewAttestation ? 'Required placard installed per MEL provisions (crew attestation).' : 'Required (M) procedure / placard accomplished.',
      certifyingTechOid: user.oid, apCertificateNumber: crewAttestation ? '' : (user.apCertificateNumber ?? ''), riiRequired: false,
      pdfBlobUri: mockPdfBlobUri('crs', pendingReleaseId), signatureId: sig.id,
    };
    const flipped: Deferral = { ...deferral, id: newId('df'), supersedesId: deferral.id, status: 'ACTIVE', gatingReleaseId: release.id, placardInstalled: true };
    dispatch({ type: 'ADD_SIGNATURE', payload: sig });
    dispatch({ type: 'ADD_RELEASE', payload: release });
    dispatch({ type: 'SUPERSEDE_DEFERRAL', payload: flipped });
    dispatch({ type: 'ADD_AUDIT', payload: { id: newId('aud'), actorOid: user.oid, action: 'GATING_RELEASE_SIGNED', entityType: 'Deferral', entityId: flipped.id, atUtc: now, summary: `${aircraft.tailNumber} ${crewAttestation ? 'placard attested by crew' : '(M)/placard discharged'} → deferral ACTIVE (AMBER)` } });
    toast.success(`${aircraft.tailNumber} now AMBER — deferral ACTIVE under MEL ${mel?.subItemNumber}.`);
    onDone();
  };

  return (
    <Card className="border-[var(--gfo-error,#EF3340)]/40">
      <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Wrench className="h-4 w-4" /> Gating-discharge release — step 2 of 2</CardTitle></CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="rounded bg-[var(--gfo-error,#EF3340)]/10 p-2 text-xs">
          {aircraft.tailNumber} is <strong>GROUNDED (RED)</strong>: the deferral is PENDING_PLACARD until the required {deferral.mProcedureRequired ? '(M) procedure / placard' : 'placard'} is accomplished and signed.
        </div>
        {mel?.mProcedure && <p className="rounded-md border p-3 text-xs"><strong>(M):</strong> {mel.mProcedure}</p>}
        {mel?.placardLocation && <p className="text-xs text-muted-foreground"><strong>Placard:</strong> {mel.placardLocation}</p>}
        {crewAttestation && <p className="rounded bg-[var(--gfo-warning,#F1B434)]/15 p-2 text-xs">Crew placard attestation (non-CRS). Items carrying an (M) procedure require maintenance.</p>}
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>Later</Button>
          <Button onClick={begin} disabled={!canSign}><ShieldCheck className="mr-1.5 h-4 w-4" /> {crewAttestation ? 'Attest placard installed' : 'Sign discharge release'}</Button>
        </div>
        {!canSign && !isMaint && <p className="text-xs text-[var(--gfo-error,#EF3340)]">This item needs an (M) procedure — maintenance must sign. The aircraft stays RED until then.</p>}
        <p className="text-xs text-muted-foreground">On signing, the deferral flips PENDING_PLACARD → ACTIVE and the aircraft moves RED → AMBER.</p>
      </CardContent>
      <SignCeremonyDialog open={signOpen} onOpenChange={setSignOpen} signer={user}
        signedEntity={crewAttestation ? 'DEFERRAL' : 'CRS'} signedEntityId={pendingReleaseId}
        intentStatement={crewAttestation ? INTENT.PLACARD_ATTESTATION : INTENT.GATING_RELEASE}
        requireStepUp={!crewAttestation} validate={crewAttestation ? undefined : () => validateCrs(user)}
        onSigned={finalize} title={crewAttestation ? 'Attest placard installed' : 'Sign (M)/placard release'} />
    </Card>
  );
}
