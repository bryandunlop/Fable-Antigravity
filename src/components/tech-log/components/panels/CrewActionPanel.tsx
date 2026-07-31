import { useState } from 'react';
import { toast } from 'sonner';
import { ClipboardCheck, CheckCircle2, PenLine, Undo2 } from 'lucide-react';
import { useTechLog, useCurrentUser, useDisplayZone } from '../../TechLogContext';
import { latestFor } from '../../engine/supersede';
import {
  canMarkCrewAction, crewActionPending, crewActionPayloadExtra, markCrewActionComplied,
} from '../../engine/crewAction';
import { INTENT } from '../../constants';
import { formatRegulatoryCompact } from '../../util/displayZone';
import { newId } from '../../util/id';
import type { Attachment, Deferral, Signature } from '../../types';
import { SignCeremonyDialog } from '../SignCeremonyDialog';
import { DefectAttachmentsField } from './DefectFields';
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card';
import { Button } from '../../../ui/button';
import { Label } from '../../../ui/label';
import { Textarea } from '../../../ui/textarea';

/**
 * D59 — mark a deferral's crew action complied.
 *
 * **Evidence, not authority.** This panel writes no state transition: it appends a superseding
 * Deferral row carrying a `crewActionCompliance` record and leaves `status` exactly where it was
 * (PENDING_PLACARD). What it changes is that the gating-discharge release becomes signable. That
 * release — maintenance's signature — is still the only thing that flips the deferral to ACTIVE
 * and the aircraft RED → AMBER (D15/D16/D17).
 *
 * Open to **any pilot or maintenance user**, with no step-up (D26). Bryan, 2026-07-28: "if its on
 * the road the pilots do it but mx is the real and only sign off." Nothing here is an RII: the same
 * person may mark this and then sign the release.
 *
 * The instructions shown are the (O) procedure FROZEN onto the deferral at signing plus
 * maintenance's addendum — never a live `MelItem` read. An adversarial verifier proved on
 * 2026-07-26 that reading (O) text live let an edit make a mandatory crew acknowledgement silently
 * vanish from an already-signed briefing; the same hole would apply here.
 *
 * Takes a **deferralId**, not a Deferral: the row it acts on is resolved from the ledger at render
 * and again at signing, so a stale object on screen can never be the thing that gets marked.
 */
export function CrewActionPanel({
  deferralId,
  onDone,
  onCancel,
}: {
  deferralId: string;
  onDone?: (marked: Deferral) => void;
  onCancel: () => void;
}) {
  const { state, dispatch } = useTechLog();
  const { displayZone } = useDisplayZone();
  const user = useCurrentUser();

  const [note, setNote] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [correcting, setCorrecting] = useState(false);
  const [signOpen, setSignOpen] = useState(false);
  const [pendingIds, setPendingIds] = useState<{ row: string; compliance: string }>({ row: '', compliance: '' });

  const deferral = latestFor(state.deferrals, deferralId);
  if (!deferral) return null;
  const aircraft = state.aircraft.find(a => a.id === deferral.aircraftId);
  if (!aircraft) return null;

  const mark = deferral.crewActionCompliance;
  const pending = crewActionPending(deferral);
  // The row must still be standing at the gate. A deferral maintenance has released (ACTIVE) or
  // rectified away (CLEARED) is a closed record — and the `?crewAction=1` deep link in the crew
  // notification carries no status test, so a link held from before the closure lands right here.
  const atGate = deferral.status === 'PENDING_PLACARD';
  // A correction re-opens the form on an already-marked deferral. `canMarkCrewAction` is about the
  // first mark, so the correction path is authorized separately — same audience, stated separately
  // so the two rules do not silently merge. Who may supersede WHOSE mark follows Q5 when answered.
  const canAct = correcting ? (atGate && Boolean(mark)) : canMarkCrewAction(user, deferral);

  const begin = () => {
    if (!canAct) return toast.error('This deferral has no outstanding crew action.');
    if (correcting && !note.trim()) return toast.error('A correction must say what is being corrected.');
    setPendingIds({ row: newId('df'), compliance: newId('cac') });
    setSignOpen(true);
  };

  const finalize = (sig: Signature) => {
    // Re-resolve at sign time: another actor may have marked (or corrected) this deferral while the
    // form sat open. Signing against the row we rendered would fork the ledger chain.
    const current = latestFor(state.deferrals, deferralId);
    if (!current) return toast.error('This deferral could not be found in the ledger.');
    // Mirrors `resolveGatingSignability`'s status re-check on the sibling panel: not just "has anyone
    // else marked it" but "is this row still the one at the gate". Maintenance may have rectified the
    // defect and superseded the deferral to CLEARED while this form sat open.
    if (current.status !== 'PENDING_PLACARD') {
      return toast.error(`This deferral is no longer awaiting its gating release — it now reads ${current.status}. A crew action cannot be recorded against it.`);
    }
    if (!correcting && !crewActionPending(current)) {
      return toast.error(`This crew action was already marked complied by ${current.crewActionCompliance?.byName ?? 'another user'}. Nothing to record.`);
    }
    const nowIso = new Date().toISOString();
    const marked = markCrewActionComplied(current, {
      rowId: pendingIds.row,
      complianceId: pendingIds.compliance,
      byOid: user.oid,
      // TL-16: frozen here. A later rename must not repaint who marked this action complied.
      byName: user.displayName,
      atUtc: nowIso,
      note: note.trim() || undefined,
      attachments,
      signatureId: sig.id,
      supersedesComplianceId: correcting ? current.crewActionCompliance?.id : undefined,
    });
    dispatch({ type: 'ADD_SIGNATURE', payload: sig });
    dispatch({ type: 'SUPERSEDE_DEFERRAL', payload: marked });
    dispatch({ type: 'ADD_AUDIT', payload: {
      id: newId('aud'), actorOid: user.oid,
      action: correcting ? 'CREW_ACTION_MARK_CORRECTED' : 'CREW_ACTION_COMPLIED',
      entityType: 'Deferral', entityId: marked.id, atUtc: nowIso,
      summary: `${aircraft.tailNumber} MEL ${deferral.melSubItemNumber ?? 'item'} crew action ${correcting ? 'mark corrected' : 'marked complied'} by ${user.displayName}${attachments.length ? ` · ${attachments.length} photo(s)` : ''} — maintenance still signs the release`,
    } });
    toast.success(`Crew action recorded on ${aircraft.tailNumber}. Maintenance signs the gating release to dispatch.`);
    setCorrecting(false);
    setNote('');
    setAttachments([]);
    onDone?.(marked);
  };

  const showForm = pending || correcting;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ClipboardCheck className="h-4 w-4" /> Crew action — MEL {deferral.melSubItemNumber ?? 'item'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {!atGate && (
          <p className="rounded bg-[var(--gfo-warning,#F1B434)]/15 p-2 text-xs">
            This deferral is no longer awaiting its gating release — it now reads <strong>{deferral.status}</strong>. It is shown here as a record; nothing further can be marked against it.
          </p>
        )}
        <div className="rounded-md border p-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">(O) Operational procedure — as recorded on this deferral</div>
          <p className="mt-1 whitespace-pre-wrap text-sm">{deferral.melOProcedure ?? 'No (O) procedure text was recorded on this deferral.'}</p>
          {deferral.crewActionInstructions && (
            <>
              <div className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Maintenance instructions</div>
              <p className="mt-1 whitespace-pre-wrap text-sm">{deferral.crewActionInstructions}</p>
            </>
          )}
        </div>

        {mark && (
          <div className="rounded-md border p-3">
            <div className="flex items-center gap-1.5 text-[var(--gfo-success-ink,#00803A)]">
              <CheckCircle2 className="h-4 w-4" /> Marked complied by {mark.byName}
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {formatRegulatoryCompact(mark.atUtc, displayZone, deferral.governingTimezone)}
              {mark.supersedesId ? ' · correction' : ''}
            </p>
            {mark.note && <p className="mt-1 text-sm">{mark.note}</p>}
            {mark.attachments?.length ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {mark.attachments.filter(a => a.uri.startsWith('data:')).map(a => (
                  <img key={a.id} src={a.uri} alt={a.filename} title={`${a.filename} · SHA-256 ${a.sha256.slice(0, 12)}…`} className="h-12 w-12 rounded border object-cover" />
                ))}
              </div>
            ) : null}
            <p className="mt-2 rounded bg-muted/60 px-2 py-1 text-xs text-muted-foreground">
              This record is evidence that the action was done. It releases nothing — the aircraft stays grounded until maintenance signs the gating release.
            </p>
            {!correcting && atGate && (
              <Button size="sm" variant="outline" className="mt-2" onClick={() => { setCorrecting(true); setNote(''); setAttachments([]); }}>
                <Undo2 className="mr-1.5 h-4 w-4" /> Correct this mark
              </Button>
            )}
          </div>
        )}

        {showForm && (
          <>
            {correcting && (
              <p className="rounded bg-[var(--gfo-warning,#F1B434)]/15 p-2 text-xs">
                The existing mark is retained unaltered and superseded by this entry. Say what is being corrected.
              </p>
            )}
            <div>
              <Label htmlFor="crew-action-note">What was done{correcting ? ' — and what was wrong' : ' (optional)'}</Label>
              <Textarea id="crew-action-note" className="mt-1" value={note} onChange={e => setNote(e.target.value)}
                placeholder="e.g. CB 3-J14 pulled and collared; verified with the FO before taxi." />
            </div>
            <DefectAttachmentsField attachments={attachments} setAttachments={setAttachments} />
            <p className="rounded bg-muted/60 px-2 py-1.5 text-xs text-muted-foreground">
              Either a pilot or a maintenance user may record this. Your signature says the action was accomplished — it does <strong>not</strong> release the aircraft.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { if (correcting) setCorrecting(false); else onCancel(); }}>
                {correcting ? 'Cancel correction' : 'Later'}
              </Button>
              <Button onClick={begin} disabled={!canAct}>
                <PenLine className="mr-1.5 h-4 w-4" /> {correcting ? 'Sign correction' : 'Mark complied'}
              </Button>
            </div>
          </>
        )}
      </CardContent>

      <SignCeremonyDialog
        open={signOpen} onOpenChange={setSignOpen} signer={user}
        signedEntity="CREW_ACTION" signedEntityId={pendingIds.compliance}
        intentStatement={INTENT.CREW_ACTION_COMPLIANCE}
        // D26: no step-up. The mark carries no authority, so it demands no fresh authentication.
        requireStepUp={false}
        // D18: the photo digests are folded into the content hash — the signature is invalid if a
        // photo is altered afterwards. Same expression the defect report form uses.
        payloadExtra={crewActionPayloadExtra(attachments)}
        payloadSummary={attachments.length ? `Covers ${attachments.length} attachment(s) by SHA-256 digest — the signature is invalid if a photo is altered.` : undefined}
        onSigned={finalize}
        title={correcting ? 'Sign crew-action correction' : 'Sign crew-action compliance'}
      />
    </Card>
  );
}
