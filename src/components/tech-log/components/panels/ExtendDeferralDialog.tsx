import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { TimerReset, UserCheck } from 'lucide-react';
import { useTechLog, useCurrentUser } from '../../TechLogContext';
import { useIntegration } from '../../integration/useIntegration';
import { validateExtension, buildExtension } from '../../engine/extension';
import { INTENT } from '../../constants';
import { newId } from '../../util/id';
import type { Deferral, Signature } from '../../types';
import { SignCeremonyDialog } from '../SignCeremonyDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../../ui/dialog';
import { Button } from '../../../ui/button';
import { Label } from '../../../ui/label';
import { Textarea } from '../../../ui/textarea';

/**
 * One-tap deferral extension (DOM 2026-07-09) on full rails (TL-1): Cat B/C once-only, keyed
 * justification, SE-1 supersede authorization, and a FRESH e-signature on the superseding row.
 * Shared by the Deferrals list and AircraftDetail so the extension logic lives in one place.
 */
export function ExtendDeferralDialog({
  deferral,
  ataChapter,
  open,
  onOpenChange,
}: {
  deferral: Deferral;
  ataChapter?: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { state, dispatch } = useTechLog();
  const user = useCurrentUser();
  const integration = useIntegration();
  const [justification, setJustification] = useState('');
  const [signOpen, setSignOpen] = useState(false);
  const [pendingIds, setPendingIds] = useState({ rowId: '', signatureId: '' });

  const tail = state.aircraft.find(a => a.id === deferral.aircraftId)?.tailNumber ?? '—';
  const validation = validateExtension(deferral, user, justification);
  // Authorization/category/once-only failures are independent of the justification text.
  const hardBlock = validateExtension(deferral, user, 'placeholder justification text');

  const preview = useMemo(() => {
    if (!hardBlock.ok) return undefined;
    const { row } = buildExtension(deferral, user, 'preview', new Date().toISOString(), { rowId: 'preview', signatureId: 'preview' });
    return row.repairDueDateUtc
      ? `new due date ${new Date(row.repairDueDateUtc).toLocaleDateString()}`
      : `new usage limit ${row.usageDueThreshold} ${row.repairIntervalUnit === 'HOUR' ? 'airframe hours' : 'cycles'}`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deferral.id, hardBlock.ok]);

  const beginSign = () => {
    if (!validation.ok) return toast.error(validation.error ?? 'Extension blocked.');
    setPendingIds({ rowId: newId('df'), signatureId: newId('sig') });
    setSignOpen(true);
  };

  const onSigned = (sig: Signature) => {
    const now = new Date().toISOString();
    const { row, auditSummary } = buildExtension(deferral, user, justification, now, { rowId: pendingIds.rowId, signatureId: sig.id });
    dispatch({ type: 'ADD_SIGNATURE', payload: sig });
    dispatch({ type: 'SUPERSEDE_DEFERRAL', payload: row });
    // CAMP: the extension re-pushes as a correction carrying the parent discrepancy ref + new due.
    integration.pushDiscrepancy({
      entityType: 'DEFERRAL', entityId: row.id, aircraftId: row.aircraftId,
      ata: ataChapter ?? '—', description: `MEL deferral extended once: ${justification.trim()}`,
      category: row.category, nextDue: row.repairDueDateUtc, technician: user.displayName,
      intent: 'CORRECT', supersedesEntityId: deferral.id,
    });
    dispatch({ type: 'ADD_AUDIT', payload: { id: newId('aud'), actorOid: user.oid, action: 'DEFERRAL_EXTENDED', entityType: 'Deferral', entityId: row.id, atUtc: now, summary: `${tail}: ${auditSummary}` } });
    toast.success(`Cat ${deferral.category} deferral extended once — signed.`);
    setJustification('');
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open && !signOpen} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><TimerReset className="h-4 w-4" /> Extend deferral — {tail} · Cat {deferral.category}</DialogTitle>
            <DialogDescription>
              One-time extension for an equal repair interval (PL-25). This creates a new signed entry superseding the original — it is not an edit.
            </DialogDescription>
          </DialogHeader>

          {!hardBlock.ok ? (
            <p className="rounded-md border border-[var(--gfo-error,#EF3340)]/40 bg-[var(--gfo-error,#EF3340)]/5 p-3 text-sm text-[var(--gfo-error,#EF3340)]">{hardBlock.error}</p>
          ) : (
            <div className="space-y-3 text-sm">
              {hardBlock.auth?.thirdParty && (
                <p className="flex items-start gap-2 rounded-md border border-dashed p-2 text-xs text-muted-foreground">
                  <UserCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  Third-party extension as {hardBlock.auth.relationship} — the original signer and your relationship to them are recorded.
                </p>
              )}
              <div>
                <Label htmlFor="ext-just">Justification (required) — why the repair cannot be completed in the original interval</Label>
                <Textarea id="ext-just" className="mt-1" rows={3} value={justification}
                  placeholder="e.g. Part on order from GAC Savannah (POO), ETA Friday; no serviceable spare in stock."
                  onChange={e => setJustification(e.target.value)} />
              </div>
              {preview && <p className="text-xs text-muted-foreground">Equal-duration extension → {preview}. B/C only, once per deferral; A/D never extend.</p>}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={beginSign} disabled={!validation.ok}>
              <TimerReset className="mr-1.5 h-4 w-4" /> Sign extension
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SignCeremonyDialog open={signOpen} onOpenChange={setSignOpen} signer={user} signedEntity="DEFERRAL"
        signedEntityId={pendingIds.rowId} intentStatement={INTENT.EXTENSION}
        validate={() => { const v = validateExtension(deferral, user, justification); return { ok: v.ok, error: v.error }; }}
        payloadSummary={`Justification: ${justification.trim() || '—'}`}
        onSigned={onSigned} title="Sign deferral extension" />
    </>
  );
}
