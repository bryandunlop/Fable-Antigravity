import { useState } from 'react';
import { toast } from 'sonner';
import { Eye, TriangleAlert } from 'lucide-react';
import { useTechLog, useCurrentUser } from '../../TechLogContext';
import { canWatchlistDefect, canEscalateWatchedDefect } from '../../engine/watchlist';
import { INTENT } from '../../constants';
import { useIntegration } from '../../integration/useIntegration';
import { newId } from '../../util/id';
import type { Defect } from '../../types';
import { SignCeremonyDialog } from '../SignCeremonyDialog';
import { Button } from '../../../ui/button';
import { Textarea } from '../../../ui/textarea';
import { Label } from '../../../ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../../ui/dialog';

/**
 * WATCH disposition (mirrors CAMP DEFERRED-WATCHLIST): maintenance attests a defect is
 * non-airworthiness (cabin/NEF) and tracks it without an MEL deferral. Superseding insert +
 * signature, same rails as the correction flow — the reducer's fork guard applies unchanged.
 */
export function WatchlistDialog({
  defect,
  open,
  onOpenChange,
}: {
  defect: Defect;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { state, dispatch } = useTechLog();
  const user = useCurrentUser();
  const integration = useIntegration();
  const aircraft = state.aircraft.find(a => a.id === defect.aircraftId);

  const [attested, setAttested] = useState(false);
  const [note, setNote] = useState('');
  const [signOpen, setSignOpen] = useState(false);
  const [pendingId, setPendingId] = useState('');

  const beginSign = () => {
    const gate = canWatchlistDefect(user, defect, attested ? false : null);
    if (!gate.ok) return toast.error(gate.reason ?? 'Watch disposition not permitted.');
    setPendingId(newId('def'));
    setSignOpen(true);
  };

  const onSigned = (sig: { id: string }) => {
    const watched: Defect = {
      ...defect,
      id: pendingId,
      status: 'WATCHLISTED',
      airworthinessAffecting: false,
      locationFreetext: note.trim() ? [defect.locationFreetext, `Watch: ${note.trim()}`].filter(Boolean).join(' · ') : defect.locationFreetext,
      supersedesId: defect.id,
      signatureId: sig.id,
    };
    dispatch({ type: 'ADD_SIGNATURE', payload: sig as any });
    dispatch({ type: 'SUPERSEDE_DEFECT', payload: watched });
    dispatch({ type: 'ADD_AUDIT', payload: { id: newId('aud'), actorOid: user.oid, action: 'DEFECT_WATCHLISTED', entityType: 'Defect', entityId: watched.id, atUtc: new Date().toISOString(), summary: `${aircraft?.tailNumber ?? defect.aircraftId} ATA ${defect.ataChapter} placed on watch list (non-airworthiness)` } });
    integration.pushDiscrepancy({
      entityType: 'DEFECT', entityId: watched.id, aircraftId: defect.aircraftId,
      ata: defect.ataChapter, description: defect.description,
      technician: user.displayName, intent: 'CORRECT', supersedesEntityId: defect.id,
      defectStatus: 'WATCHLISTED',
    });
    toast.success('Placed on watch list — serviceability unaffected, item tracked in the work queue.');
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Eye className="h-4 w-4" /> Place on watch list</DialogTitle>
            <DialogDescription>Track a non-airworthiness item (cabin/NEF) without an MEL deferral. The original signed defect is retained; your disposition supersedes it.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="rounded-md border p-3">
              <div className="font-medium">{aircraft?.tailNumber} · ATA {defect.ataChapter} · {defect.source}</div>
              <p className="mt-1 text-sm">{defect.description}</p>
            </div>
            <div>
              <Label>Watch note (optional)</Label>
              <Textarea className="mt-1" value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. monitor at next transit check; part on order" />
            </div>
            <label className="flex items-start gap-2">
              <input type="checkbox" className="mt-1" checked={attested} onChange={e => setAttested(e.target.checked)} />
              <span className="text-xs">I assess this defect as <strong>not airworthiness-affecting</strong> (cabin/NEF). It will be tracked on the watch list without an MEL deferral and does not restrict dispatch.</span>
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={beginSign} disabled={!attested}>Continue to sign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SignCeremonyDialog
        open={signOpen} onOpenChange={setSignOpen} signer={user}
        signedEntity="DEFECT" signedEntityId={pendingId}
        intentStatement={INTENT.WATCHLIST} onSigned={onSigned} title="Sign watch disposition"
      />
    </>
  );
}

/** Escalation out of watch: reassessed as airworthiness-affecting → back to OPEN (grounds via rule 1). */
export function EscalateWatchDialog({
  defect,
  open,
  onOpenChange,
}: {
  defect: Defect;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { state, dispatch } = useTechLog();
  const user = useCurrentUser();
  const integration = useIntegration();
  const aircraft = state.aircraft.find(a => a.id === defect.aircraftId);

  const [signOpen, setSignOpen] = useState(false);
  const [pendingId, setPendingId] = useState('');

  const beginSign = () => {
    const gate = canEscalateWatchedDefect(user, defect);
    if (!gate.ok) return toast.error(gate.reason ?? 'Escalation not permitted.');
    setPendingId(newId('def'));
    setSignOpen(true);
  };

  const onSigned = (sig: { id: string }) => {
    const escalated: Defect = {
      ...defect,
      id: pendingId,
      status: 'OPEN',
      airworthinessAffecting: true,
      supersedesId: defect.id,
      signatureId: sig.id,
    };
    dispatch({ type: 'ADD_SIGNATURE', payload: sig as any });
    dispatch({ type: 'SUPERSEDE_DEFECT', payload: escalated });
    dispatch({ type: 'ADD_AUDIT', payload: { id: newId('aud'), actorOid: user.oid, action: 'DEFECT_WATCH_ESCALATED', entityType: 'Defect', entityId: escalated.id, atUtc: new Date().toISOString(), summary: `${aircraft?.tailNumber ?? defect.aircraftId} ATA ${defect.ataChapter} watch item escalated to open grounding defect` } });
    integration.pushDiscrepancy({
      entityType: 'DEFECT', entityId: escalated.id, aircraftId: defect.aircraftId,
      ata: defect.ataChapter, description: defect.description,
      technician: user.displayName, intent: 'CORRECT', supersedesEntityId: defect.id,
      defectStatus: 'OPEN',
    });
    toast.warning(`Watch item escalated — ${aircraft?.tailNumber ?? 'aircraft'} is now grounded (RED) pending triage.`);
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><TriangleAlert className="h-4 w-4" /> Escalate watch item</DialogTitle>
            <DialogDescription>Reassess this watch item as airworthiness-affecting. It returns to OPEN and the aircraft grounds (RED) until deferred or rectified.</DialogDescription>
          </DialogHeader>
          <div className="rounded-md border p-3 text-sm">
            <div className="font-medium">{aircraft?.tailNumber} · ATA {defect.ataChapter}</div>
            <p className="mt-1">{defect.description}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button variant="destructive" onClick={beginSign}>Continue to sign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SignCeremonyDialog
        open={signOpen} onOpenChange={setSignOpen} signer={user}
        signedEntity="DEFECT" signedEntityId={pendingId}
        intentStatement={INTENT.WATCH_ESCALATION} onSigned={onSigned} title="Sign escalation"
      />
    </>
  );
}
