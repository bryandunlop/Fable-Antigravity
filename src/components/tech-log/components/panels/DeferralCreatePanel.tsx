import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Search, ClipboardCheck, ShieldAlert } from 'lucide-react';
import { useTechLog, useCurrentUser } from '../../TechLogContext';
import { computeClockStart, computeRepairDue, DEFAULT_GOVERNING_TIMEZONE } from '../../engine/pl25';
import { canDeferDefect } from '../../engine/disposition';
import { CATEGORY_DAYS, INTENT } from '../../constants';
import { useIntegration } from '../../integration/useIntegration';
import { newId } from '../../util/id';
import type { Defect, Deferral, MelItem } from '../../types';
import { SignCeremonyDialog } from '../SignCeremonyDialog';
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card';
import { Badge } from '../../../ui/badge';
import { Button } from '../../../ui/button';
import { Input } from '../../../ui/input';
import { Textarea } from '../../../ui/textarea';

function dueFromCategory(mel: MelItem, clockStart: string, airframe: { hours: number; cycles: number }, zone: string) {
  if (mel.category === 'A') return { repairDueDateUtc: undefined, repairIntervalUnit: 'CALENDAR_DAY' as const, repairIntervalValue: 0 };
  const value = CATEGORY_DAYS[mel.category] ?? 0;
  return computeRepairDue(mel.category, clockStart, { repairIntervalUnit: 'CALENDAR_DAY', repairIntervalValue: value }, airframe, zone);
}

/**
 * Reusable MEL-deferral create body (MEL picker + review & sign). Renders WITHOUT a TechLogShell so it
 * can be hosted on the standalone Deferrals page OR inline on the Tail Workspace. On sign it performs
 * the exact same dispatch sequence as before (supersede defect → DEFERRED, add deferral, push CAMP) and
 * calls onDone(newDeferral); the host decides what happens next (navigate to gating, or mount the gating
 * panel inline). The regulatory engine calls are unchanged.
 */
export function DeferralCreatePanel({
  defect,
  onDone,
  onCancel,
}: {
  defect: Defect;
  onDone: (deferral: Deferral) => void;
  onCancel: () => void;
}) {
  const { state, dispatch } = useTechLog();
  const user = useCurrentUser();
  const integration = useIntegration();
  const aircraft = state.aircraft.find(a => a.id === defect.aircraftId);

  const [query, setQuery] = useState(`${defect.ataChapter}-`);
  const [selectedMelId, setSelectedMelId] = useState('');
  const [ack, setAck] = useState(false);
  const [restriction, setRestriction] = useState('');
  const [signOpen, setSignOpen] = useState(false);
  const [pendingDeferralId, setPendingDeferralId] = useState('');

  const melMatches = useMemo(() => {
    if (!aircraft) return [];
    const q = query.trim().toLowerCase();
    return state.melItems
      .filter(m => m.aircraftType === aircraft.type && m.approvalState === 'APPROVED')
      .filter(m => !q || m.subItemNumber.toLowerCase().includes(q) || m.title.toLowerCase().includes(q) || m.ataReference === q)
      .slice(0, 25);
  }, [state.melItems, aircraft, query]);

  const selectedMel = state.melItems.find(m => m.id === selectedMelId);
  const willGate = !!(selectedMel?.mProcedure?.trim() || selectedMel?.placardText?.trim());
  const cat = selectedMel?.category;

  if (!aircraft) return null;

  if (aircraft.isProvisional) {
    return (
      <Card className="border-[var(--gfo-error,#EF3340)]/40">
        <CardContent className="flex items-start gap-2 p-4 text-sm">
          <ShieldAlert className="mt-0.5 h-4 w-4 text-[var(--gfo-error,#EF3340)]" />
          <span><strong>Deferral blocked.</strong> {aircraft.tailNumber}'s {aircraft.type} D195 MEL is pending FSDO approval (provisional). No deferrals may be created against an unapproved MEL.</span>
        </CardContent>
      </Card>
    );
  }

  const beginSign = () => {
    if (!selectedMel) return toast.error('Select a governing MEL item.');
    if (!ack) return toast.error('You must acknowledge the MEL review before signing.');
    if (!canDeferDefect(user, selectedMel)) return toast.error('You are not authorized to defer this MEL item.');
    setPendingDeferralId(newId('df'));
    setSignOpen(true);
  };

  const onSigned = (sig: { id: string }) => {
    if (!selectedMel) return;
    const now = new Date().toISOString();
    // D24: anchor the PL-25 clock to the governing zone (default Eastern; a per-deferral override UI
    // can later set a different operating-local zone + reason). The stored governingTimezone must be
    // the same zone the clock was computed under.
    const zone = DEFAULT_GOVERNING_TIMEZONE;
    const clockStart = computeClockStart(now, zone);
    const airframe = { hours: aircraft.airframeTotalHours, cycles: aircraft.airframeTotalCycles };
    const due = dueFromCategory(selectedMel, clockStart, airframe, zone);
    const mProcedureRequired = !!selectedMel.mProcedure?.trim();
    const placardRequired = !!selectedMel.placardText?.trim();

    const supDefect: Defect = { ...defect, id: newId('def'), status: 'DEFERRED', supersedesId: defect.id, signatureId: sig.id };
    const deferral: Deferral = {
      id: pendingDeferralId, defectId: supDefect.id, aircraftId: aircraft.id, melItemId: selectedMel.id,
      governingMmelRevision: selectedMel.mmelRevision, governingEffectiveDate: selectedMel.effectiveDate,
      category: selectedMel.category, dayOfDiscoveryUtc: now, clockStartDateUtc: clockStart,
      governingTimezone: zone,
      repairDueDateUtc: due.repairDueDateUtc, repairIntervalUnit: due.repairIntervalUnit, repairIntervalValue: due.repairIntervalValue,
      restrictionText: restriction.trim() || selectedMel.provisos, placardRequired,
      mProcedureRequired, placardLocation: selectedMel.placardLocation, extensionUsed: false,
      riiRequired: false, melReviewAcknowledged: true, signedByOid: user.oid, signatureId: sig.id,
      status: (mProcedureRequired || placardRequired) ? 'PENDING_PLACARD' : 'ACTIVE',
    };
    dispatch({ type: 'ADD_SIGNATURE', payload: sig as any });
    dispatch({ type: 'SUPERSEDE_DEFECT', payload: supDefect });
    dispatch({ type: 'ADD_DEFERRAL', payload: deferral });
    dispatch({ type: 'ADD_AUDIT', payload: { id: newId('aud'), actorOid: user.oid, action: 'DEFERRAL_SIGNED', entityType: 'Deferral', entityId: deferral.id, atUtc: now, summary: `${aircraft.tailNumber} deferred under MEL ${selectedMel.subItemNumber} (Cat ${selectedMel.category})` } });

    integration.pushDiscrepancy({
      entityType: 'DEFERRAL', entityId: deferral.id, aircraftId: aircraft.id,
      ata: selectedMel.ataReference, description: `MEL ${selectedMel.subItemNumber} — ${selectedMel.title}`,
      restriction: deferral.restrictionText, nextDue: deferral.repairDueDateUtc,
      category: selectedMel.category, technician: user.displayName, intent: 'CREATE',
    });

    onDone(deferral);
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Search className="h-4 w-4" /> Governing MEL item</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <Input placeholder="Search by item number, title, or ATA…" value={query} onChange={e => setQuery(e.target.value)} />
          <div className="max-h-[320px] space-y-1 overflow-y-auto">
            {melMatches.map(m => (
              <button key={m.id} onClick={() => { setSelectedMelId(m.id); setRestriction(m.provisos ?? ''); }}
                className={`w-full rounded-md border p-2 text-left text-sm hover:bg-accent/40 ${selectedMelId === m.id ? 'border-primary bg-accent/40' : ''}`}>
                <div className="flex items-center justify-between">
                  <span className="font-medium">{m.subItemNumber}</span>
                  <span className="flex items-center gap-1">
                    <Badge variant="outline">Cat {m.category}</Badge>
                    {m.mProcedure ? <Badge variant="destructive">(M)</Badge> : null}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">{m.title}</div>
              </button>
            ))}
            {melMatches.length === 0 && <p className="p-2 text-xs text-muted-foreground">No matching MEL items.</p>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><ClipboardCheck className="h-4 w-4" /> Review &amp; sign</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          {!selectedMel && <p className="text-muted-foreground">Select a MEL item to review its category, clock, provisos, and (M)/placard requirement.</p>}
          {selectedMel && (
            <>
              <div className="rounded-md border p-3">
                <div className="font-medium">{selectedMel.subItemNumber} — {selectedMel.title}</div>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  <Badge variant="outline">Cat {cat}</Badge>
                  <Badge variant="outline">{CATEGORY_DAYS[cat!] ? `${CATEGORY_DAYS[cat!]}-day clock` : 'per proviso'}</Badge>
                  {selectedMel.numberInstalled != null && <Badge variant="outline">{selectedMel.numberRequired}/{selectedMel.numberInstalled} req</Badge>}
                  {selectedMel.flightCrewDeferral ? <Badge variant="outline">FC-deferrable</Badge> : null}
                </div>
                {selectedMel.provisos && <p className="mt-2 text-xs text-muted-foreground">{selectedMel.provisos}</p>}
                {selectedMel.mProcedure && <p className="mt-2 rounded bg-[var(--gfo-error,#EF3340)]/10 p-2 text-xs"><strong>(M):</strong> {selectedMel.mProcedure}</p>}
                {selectedMel.placardLocation && <p className="mt-1 text-xs text-muted-foreground"><strong>Placard:</strong> {selectedMel.placardLocation}</p>}
              </div>

              <div className={`rounded-md p-2 text-xs ${willGate ? 'bg-[var(--gfo-error,#EF3340)]/10' : 'bg-[var(--gfo-warning,#F1B434)]/15'}`}>
                {willGate
                  ? 'This item requires an (M) procedure and/or a placard → the deferral starts PENDING_PLACARD and the aircraft stays RED until the gating discharge is signed.'
                  : 'No (M) procedure or placard → the deferral goes ACTIVE on signing and the aircraft moves to AMBER (dispatchable under restriction).'}
              </div>

              <div>
                <label className="text-xs font-medium">Restriction / limitation</label>
                <Textarea className="mt-1" value={restriction} onChange={e => setRestriction(e.target.value)} />
              </div>

              <label className="flex items-start gap-2">
                <input type="checkbox" className="mt-1" checked={ack} onChange={e => setAck(e.target.checked)} />
                <span className="text-xs">I have reviewed the governing MEL item (revision {selectedMel.mmelRevision}, eff. {selectedMel.effectiveDate}), its category, provisos, (O)/(M) procedures, and placard, and I authorize this deferral.</span>
              </label>

              <div className="flex gap-2">
                <Button variant="outline" onClick={onCancel}>Cancel</Button>
                <Button onClick={beginSign} disabled={!canDeferDefect(user, selectedMel) || !ack}>Sign deferral</Button>
              </div>
              {!canDeferDefect(user, selectedMel) && <p className="text-xs text-[var(--gfo-error,#EF3340)]">{user.role === 'MAINTENANCE' ? '' : 'Crew may only defer flight-crew-deferrable (FC-deferrable) MEL items.'}</p>}
            </>
          )}
        </CardContent>
      </Card>

      <SignCeremonyDialog
        open={signOpen} onOpenChange={setSignOpen} signer={user}
        signedEntity="DEFERRAL" signedEntityId={pendingDeferralId}
        intentStatement={INTENT.DEFERRAL} onSigned={onSigned} title="Sign MEL deferral"
      />
    </div>
  );
}
