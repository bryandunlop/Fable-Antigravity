import { useState } from 'react';
import { toast } from 'sonner';
import { Wrench, ShieldCheck, ClipboardCheck, CheckCircle2 } from 'lucide-react';
import { useTechLog, useCurrentUser } from '../../TechLogContext';
import { validateCrs } from '../../engine/signing';
import { resolveGatingSignability } from '../../engine/disposition';
import { INTENT } from '../../constants';
import { mockPdfBlobUri } from '../../util/printRecord';
import { newId } from '../../util/id';
import type { Deferral, MaintenanceRelease, Signature } from '../../types';
import { SignCeremonyDialog } from '../SignCeremonyDialog';
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card';
import { Button } from '../../../ui/button';

/**
 * The limbs that actually gated THIS deferral, in the order the state machine states them.
 *
 * Used twice, and it must be the same expression both times: once in the RED banner, and once —
 * load-bearing — in the `workDescription` / `returnToServiceStatement` written into the signed
 * `MaintenanceRelease`. That statement is printed under "Work performed (14 CFR 91.417(a)(1)(i))"
 * and is append-only: a correction takes a superseding insert. Hard-coding "(M) procedure / placard"
 * was accurate only while those two were the only limbs; D59's crew action made it possible to
 * certify an (M) procedure and a placard the governing MEL item does not have.
 */
function gatingLimbs(d: Pick<Deferral, 'mProcedureRequired' | 'placardRequired' | 'crewActionRequired'>): string[] {
  return [
    d.mProcedureRequired ? '(M) procedure' : null,
    d.placardRequired ? 'placard' : null,
    d.crewActionRequired ? 'crew action' : null,
  ].filter((x): x is string => x !== null);
}

/** (M)/placard gating-discharge body (RED → AMBER). Maintenance signs a CRS discharge; an authorized
 *  crew member signs a non-CRS placard attestation for a placard-ONLY deferral. Same state-machine flip.
 *
 *  Two things this panel deliberately does NOT do:
 *
 *  - It does not judge the `deferral` prop it was handed. Every gate question goes to
 *    `resolveGatingSignability`, which resolves the CHAIN HEAD from the ledger by id — at render AND
 *    again inside the signature ceremony's `validate`. That is the Workflow Logic Findings §1a fix:
 *    the check used to run once against a captured row and never re-ask whether the deferral was
 *    still PENDING_PLACARD, so two actors could both discharge the same gate.
 *  - It does not let a deferral through while its D59 crew action is unmarked. Marking is somebody
 *    else's (or the same person's) job and carries no authority — but until it exists, this
 *    signature is the wrong one to give. */
export function GatingReleasePanel({ deferral, onDone, onCancel }: { deferral: Deferral; onDone: () => void; onCancel: () => void }) {
  const { state, dispatch } = useTechLog();
  const user = useCurrentUser();
  const isMaint = user.role === 'MAINTENANCE';
  const aircraft = state.aircraft.find(a => a.id === deferral.aircraftId);
  const mel = state.melItems.find(m => m.id === deferral.melItemId);

  const [signOpen, setSignOpen] = useState(false);
  const [pendingReleaseId, setPendingReleaseId] = useState('');

  if (!aircraft) return null;

  const airframeNow = { hours: aircraft.airframeTotalHours, cycles: aircraft.airframeTotalCycles };
  /** Asked fresh every time — never cached, never taken from the prop. */
  const signability = () => resolveGatingSignability({
    deferralId: deferral.id, deferrals: state.deferrals, person: user,
    asOfUtc: new Date().toISOString(), airframeNow,
  });

  const gate = signability();
  // The live row, for display. Falls back to the prop only so a not-found row still renders a card.
  const current = gate.ok ? gate.deferral : (gate.deferral ?? deferral);
  const canSign = gate.ok;
  // An *authorized* crew member signs a non-CRS placard attestation.
  const crewAttestation = !isMaint && canSign;
  const mark = current.crewActionCompliance;

  const begin = () => {
    const g = signability();
    if (!g.ok) return toast.error(g.reason);
    setPendingReleaseId(newId('rel'));
    setSignOpen(true);
  };

  const finalize = (sig: Signature) => {
    // Defense in depth behind the ceremony's own `validate` — a signature must never be able to
    // produce a release against a deferral that moved while the dialog was open.
    const g = signability();
    if (!g.ok) return toast.error(g.reason);
    const target = g.deferral;
    const now = new Date().toISOString();
    // Composed from the limbs outstanding on the row being discharged — never a fixed sentence. This
    // record is signed evidence of what was done; naming a limb this MEL item does not carry would be
    // a false statement in an append-only regulatory record.
    const limbs = gatingLimbs(target).join(' / ') || 'gating requirement';
    const release: MaintenanceRelease = {
      id: pendingReleaseId, aircraftId: aircraft.id, signoffType: 'DEFERRAL', linkedDeferralId: target.id,
      isGatingDischarge: true,
      workDescription: crewAttestation ? `Placard installed (crew attestation) for MEL ${mel?.subItemNumber ?? ''}` : `${limbs} discharge for MEL ${mel?.subItemNumber ?? ''}`,
      completionDateUtc: now,
      returnToServiceStatement: crewAttestation ? 'Required placard installed per MEL provisions (crew attestation).' : `Required ${limbs} accomplished.`,
      certifyingTechOid: user.oid, apCertificateNumber: crewAttestation ? '' : (user.apCertificateNumber ?? ''), riiRequired: false,
      pdfBlobUri: mockPdfBlobUri('crs', pendingReleaseId), signatureId: sig.id,
    };
    const flipped: Deferral = { ...target, id: newId('df'), supersedesId: target.id, status: 'ACTIVE', gatingReleaseId: release.id, placardInstalled: true };
    dispatch({ type: 'ADD_SIGNATURE', payload: sig });
    dispatch({ type: 'ADD_RELEASE', payload: release });
    dispatch({ type: 'SUPERSEDE_DEFERRAL', payload: flipped });
    dispatch({ type: 'ADD_AUDIT', payload: { id: newId('aud'), actorOid: user.oid, action: 'GATING_RELEASE_SIGNED', entityType: 'Deferral', entityId: flipped.id, atUtc: now, summary: `${aircraft.tailNumber} ${crewAttestation ? 'placard attested by crew' : `${limbs} discharged`} → deferral ACTIVE (AMBER)` } });
    toast.success(`${aircraft.tailNumber} now AMBER — deferral ACTIVE under MEL ${mel?.subItemNumber}.`);
    onDone();
  };

  return (
    <Card className="border-[var(--gfo-error,#EF3340)]/40">
      <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Wrench className="h-4 w-4" /> Gating-discharge release — step 2 of 2</CardTitle></CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="rounded bg-[var(--gfo-error,#EF3340)]/10 p-2 text-xs">
          {aircraft.tailNumber} is <strong>GROUNDED (RED)</strong>: the deferral is PENDING_PLACARD until the required {gatingLimbs(current).join(' / ') || 'placard'} is accomplished and signed.
        </div>
        {mel?.mProcedure && <p className="rounded-md border p-3 text-xs"><strong>(M):</strong> {mel.mProcedure}</p>}
        {mel?.placardLocation && <p className="text-xs text-muted-foreground"><strong>Placard:</strong> {mel.placardLocation}</p>}

        {/* D59 — the crew action, read off the frozen deferral row (never a live MelItem join). */}
        {current.crewActionRequired && (
          mark ? (
            <p className="flex items-start gap-1.5 rounded-md border p-2 text-xs">
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--gfo-success-ink,#00803A)]" />
              <span>Crew action marked complied by <strong>{mark.byName}</strong>{mark.note ? ` — ${mark.note}` : ''}. That mark is evidence; your signature below is what releases the aircraft.</span>
            </p>
          ) : (
            <p className="flex items-start gap-1.5 rounded-md border border-[var(--gfo-error,#EF3340)]/40 p-2 text-xs">
              <ClipboardCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>The crew action on this deferral <strong>has not been marked complied</strong>. A pilot or maintenance user must record it before this release can be signed.</span>
            </p>
          )
        )}

        {crewAttestation && <p className="rounded bg-[var(--gfo-warning,#F1B434)]/15 p-2 text-xs">Crew placard attestation (non-CRS). Items carrying an (M) procedure require maintenance.</p>}
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>Later — stays in Work Queue</Button>
          <Button onClick={begin} disabled={!canSign}><ShieldCheck className="mr-1.5 h-4 w-4" /> {crewAttestation ? 'Attest placard installed' : 'Sign discharge release'}</Button>
        </div>
        {!gate.ok && gate.code === 'EXPIRED' && <p className="text-xs text-[var(--gfo-error-ink,#C81E2B)]">This deferral already passed its repair-due condition and reads EXPIRED — discharging it now would silently un-ground an overdue item. Use an extension or correction instead.</p>}
        {/* CREW_ACTION_PENDING has its own block above, with the (O) context — repeating the reason
            here would say the same sentence twice on one card. */}
        {!gate.ok && gate.code !== 'EXPIRED' && gate.code !== 'CREW_ACTION_PENDING' && <p className="text-xs text-[var(--gfo-error-ink,#C81E2B)]">{gate.reason}</p>}
        <p className="text-xs text-muted-foreground">On signing, the deferral flips PENDING_PLACARD → ACTIVE and the aircraft moves RED → AMBER.</p>
      </CardContent>
      <SignCeremonyDialog open={signOpen} onOpenChange={setSignOpen} signer={user}
        signedEntity={crewAttestation ? 'DEFERRAL' : 'CRS'} signedEntityId={pendingReleaseId}
        intentStatement={crewAttestation ? INTENT.PLACARD_ATTESTATION : INTENT.GATING_RELEASE}
        requireStepUp={!crewAttestation}
        // Re-asked AT THE MOMENT OF SIGNING, from the ledger: the §1a race fix. `validate` runs
        // before the signature is minted, so a deferral someone else discharged mid-ceremony blocks
        // here rather than producing a second release.
        validate={() => {
          const g = signability();
          if (!g.ok) return { ok: false, error: g.reason };
          return crewAttestation ? { ok: true } : validateCrs(user);
        }}
        onSigned={finalize} title={crewAttestation ? 'Attest placard installed' : 'Sign (M)/placard release'} />
    </Card>
  );
}
