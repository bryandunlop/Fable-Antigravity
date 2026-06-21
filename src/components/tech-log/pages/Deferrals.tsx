import { useMemo, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Wrench, ShieldAlert, Clock, Search, ClipboardCheck, TimerReset } from 'lucide-react';
import { useTechLog, useCurrentUser } from '../TechLogContext';
import { currentRows } from '../engine/supersede';
import { computeClockStart, computeRepairDue, isDeferralExpired } from '../engine/pl25';
import { CATEGORY_DAYS, INTENT } from '../constants';
import { useIntegration } from '../integration/useIntegration';
import { newId } from '../util/id';
import type { Defect, Deferral, MelItem } from '../types';
import { TechLogShell } from '../components/TechLogShell';
import { SignCeremonyDialog } from '../components/SignCeremonyDialog';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Textarea } from '../../ui/textarea';

function dueFromCategory(mel: MelItem, clockStart: string, airframe: { hours: number; cycles: number }) {
  if (mel.category === 'A') return { repairDueDateUtc: undefined, repairIntervalUnit: 'CALENDAR_DAY' as const, repairIntervalValue: 0 };
  const value = CATEGORY_DAYS[mel.category] ?? 0;
  return computeRepairDue(mel.category, clockStart, { repairIntervalUnit: 'CALENDAR_DAY', repairIntervalValue: value }, airframe);
}

export default function Deferrals() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { state, dispatch } = useTechLog();
  const user = useCurrentUser();
  const integration = useIntegration();
  const isMaint = user.role === 'MAINTENANCE';

  const defectId = params.get('defect') ?? undefined;
  const defect = defectId ? currentRows(state.defects).find(d => d.id === defectId) : undefined;
  const aircraft = defect ? state.aircraft.find(a => a.id === defect.aircraftId) : undefined;

  const [query, setQuery] = useState(defect ? `${defect.ataChapter}-` : '');
  const [selectedMelId, setSelectedMelId] = useState<string>('');
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
  const willGate = !!selectedMel?.mProcedure?.trim();
  const cat = selectedMel?.category;

  const beginSign = () => {
    if (!selectedMel) return toast.error('Select a governing MEL item.');
    if (!ack) return toast.error('You must acknowledge the MEL review before signing.');
    setPendingDeferralId(newId('df'));
    setSignOpen(true);
  };

  const onSigned = (sig: { id: string }) => {
    if (!defect || !aircraft || !selectedMel) return;
    const now = new Date().toISOString();
    const clockStart = computeClockStart(now);
    const airframe = { hours: aircraft.airframeTotalHours, cycles: aircraft.airframeTotalCycles };
    const due = dueFromCategory(selectedMel, clockStart, airframe);
    const mProcedureRequired = !!selectedMel.mProcedure?.trim();

    // Supersede the defect -> DEFERRED (immutability: new row, original retained)
    const supDefect: Defect = { ...defect, id: newId('def'), status: 'DEFERRED', supersedesId: defect.id, signatureId: sig.id };
    const deferral: Deferral = {
      id: pendingDeferralId, defectId: supDefect.id, aircraftId: aircraft.id, melItemId: selectedMel.id,
      governingMmelRevision: selectedMel.mmelRevision, governingEffectiveDate: selectedMel.effectiveDate,
      category: selectedMel.category, dayOfDiscoveryUtc: now, clockStartDateUtc: clockStart,
      repairDueDateUtc: due.repairDueDateUtc, repairIntervalUnit: due.repairIntervalUnit, repairIntervalValue: due.repairIntervalValue,
      restrictionText: restriction.trim() || selectedMel.provisos, placardRequired: false,
      mProcedureRequired, placardLocation: selectedMel.placardLocation, extensionUsed: false,
      riiRequired: false, melReviewAcknowledged: true, signedByOid: user.oid, signatureId: sig.id,
      status: mProcedureRequired ? 'PENDING_PLACARD' : 'ACTIVE',
    };
    dispatch({ type: 'ADD_SIGNATURE', payload: sig as any });
    dispatch({ type: 'SUPERSEDE_DEFECT', payload: supDefect });
    dispatch({ type: 'ADD_DEFERRAL', payload: deferral });
    dispatch({ type: 'ADD_AUDIT', payload: { id: newId('aud'), actorOid: user.oid, action: 'DEFERRAL_SIGNED', entityType: 'Deferral', entityId: deferral.id, atUtc: now, summary: `${aircraft.tailNumber} deferred under MEL ${selectedMel.subItemNumber} (Cat ${selectedMel.category})` } });

    // Phase-2 integration: push the MEL deferral to CAMP via IntegrateDiscrepancies (mock connector).
    integration.pushDiscrepancy({
      entityType: 'DEFERRAL', entityId: deferral.id, aircraftId: aircraft.id,
      ata: selectedMel.ataReference, description: `MEL ${selectedMel.subItemNumber} — ${selectedMel.title}`,
      restriction: deferral.restrictionText, nextDue: deferral.repairDueDateUtc,
      category: selectedMel.category, technician: user.displayName,
    });

    if (mProcedureRequired) {
      toast.warning(`Deferral pending (M)/placard — ${aircraft.tailNumber} stays GROUNDED until the gating release is signed.`);
      navigate(`/tech-log/releases?deferral=${deferral.id}&gating=1`);
    } else {
      toast.success(`${aircraft.tailNumber} dispatchable under MEL ${selectedMel.subItemNumber} (AMBER).`);
      navigate(`/tech-log/aircraft/${aircraft.tailNumber}`);
    }
  };

  // ---- list of current open deferrals (when not in create mode) ----
  const openDeferrals = currentRows(state.deferrals).filter(d => d.status !== 'CLEARED');
  const tailOf = (id: string) => state.aircraft.find(a => a.id === id)?.tailNumber ?? '—';

  const extend = (d: Deferral) => {
    if (d.category === 'A' || d.category === 'D') return toast.error(`Cat ${d.category} deferrals cannot be extended.`);
    if (d.extensionUsed) return toast.error('This deferral has already used its one extension.');
    const ac = state.aircraft.find(a => a.id === d.aircraftId)!;
    const value = (CATEGORY_DAYS[d.category] ?? 0) * 2;
    const due = computeRepairDue(d.category, d.clockStartDateUtc, { repairIntervalUnit: 'CALENDAR_DAY', repairIntervalValue: value }, { hours: ac.airframeTotalHours, cycles: ac.airframeTotalCycles });
    const ext: Deferral = { ...d, id: newId('df'), supersedesId: d.id, extensionUsed: true, extensionTsUtc: new Date().toISOString(), extensionJustification: 'One-time extension (demo)', repairIntervalValue: value, repairDueDateUtc: due.repairDueDateUtc };
    dispatch({ type: 'SUPERSEDE_DEFERRAL', payload: ext });
    dispatch({ type: 'ADD_AUDIT', payload: { id: newId('aud'), actorOid: user.oid, action: 'DEFERRAL_EXTENDED', entityType: 'Deferral', entityId: ext.id, atUtc: ext.extensionTsUtc!, summary: `Extended ${tailOf(d.aircraftId)} Cat ${d.category} deferral once` } });
    toast.success(`Cat ${d.category} deferral extended once.`);
  };

  // ===== CREATE MODE =====
  if (defect && aircraft) {
    if (aircraft.isProvisional) {
      return (
        <TechLogShell title={`Defer — ${aircraft.tailNumber}`}>
          <Card className="border-[var(--gfo-error,#EF3340)]/40">
            <CardContent className="flex items-start gap-2 p-4 text-sm">
              <ShieldAlert className="mt-0.5 h-4 w-4 text-[var(--gfo-error,#EF3340)]" />
              <span><strong>Deferral blocked.</strong> {aircraft.tailNumber}'s {aircraft.type} D195 MEL is pending FSDO approval (provisional). No deferrals may be created against an unapproved MEL.</span>
            </CardContent>
          </Card>
        </TechLogShell>
      );
    }
    return (
      <TechLogShell title={`Defer defect — ${aircraft.tailNumber}`} subtitle={`ATA ${defect.ataChapter} · ${defect.description}`}>
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
                      ? 'This item carries an (M) procedure → deferral starts PENDING_PLACARD and the aircraft stays RED until a gating-discharge MaintenanceRelease is signed (two sign-offs).'
                      : 'No (M) procedure → deferral goes ACTIVE on signing and the aircraft moves to AMBER (dispatchable under restriction).'}
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
                    <Button variant="outline" onClick={() => navigate('/tech-log/defects')}>Cancel</Button>
                    <Button onClick={beginSign} disabled={!isMaint || !ack}>Sign deferral</Button>
                  </div>
                  {!isMaint && <p className="text-xs text-[var(--gfo-error,#EF3340)]">Switch to a maintenance persona to sign deferrals.</p>}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <SignCeremonyDialog
          open={signOpen} onOpenChange={setSignOpen} signer={user}
          signedEntity="DEFERRAL" signedEntityId={pendingDeferralId}
          intentStatement={INTENT.DEFERRAL} onSigned={onSigned} title="Sign MEL deferral"
        />
      </TechLogShell>
    );
  }

  // ===== LIST MODE =====
  return (
    <TechLogShell title="MEL Deferrals" subtitle="Active and pending deferrals across the fleet.">
      <div className="space-y-3">
        {openDeferrals.length === 0 && <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">No open deferrals. Defer a defect from the Defects page.</CardContent></Card>}
        {openDeferrals.map(d => {
          const ac = state.aircraft.find(a => a.id === d.aircraftId)!;
          const mel = state.melItems.find(m => m.id === d.melItemId);
          const expired = isDeferralExpired(d, new Date().toISOString(), { hours: ac.airframeTotalHours, cycles: ac.airframeTotalCycles });
          const effective = expired ? 'EXPIRED' : d.status;
          const ms = d.repairDueDateUtc ? new Date(d.repairDueDateUtc).getTime() - Date.now() : null;
          const corr = state.campCorrelation.find(c => c.mygfoEntityId === d.id);
          return (
            <Card key={d.id}>
              <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{tailOf(d.aircraftId)}</span>
                    <Badge variant="outline">MEL {mel?.subItemNumber ?? '—'}</Badge>
                    <Badge variant="outline">Cat {d.category}</Badge>
                    <Badge variant={effective === 'ACTIVE' ? 'secondary' : 'destructive'}>{effective}</Badge>
                    {corr?.campDiscrepancyRef && <Badge variant="outline">CAMP {corr.campDiscrepancyRef}</Badge>}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{mel?.title}</p>
                  {d.repairDueDateUtc && (
                    <div className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" /> due {new Date(d.repairDueDateUtc).toLocaleDateString()} · {ms != null && ms > 0 ? `${Math.floor(ms / 86400000)}d left` : 'overdue'}
                      {d.extensionUsed && ' · extended'}
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  {effective === 'PENDING_PLACARD' && isMaint && (
                    <Button size="sm" onClick={() => navigate(`/tech-log/releases?deferral=${d.id}&gating=1`)}>
                      <Wrench className="mr-1.5 h-4 w-4" /> Sign (M)/placard release
                    </Button>
                  )}
                  {effective === 'ACTIVE' && isMaint && (
                    <Button size="sm" variant="outline" onClick={() => extend(d)}>
                      <TimerReset className="mr-1.5 h-4 w-4" /> Extend
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => navigate(`/tech-log/aircraft/${tailOf(d.aircraftId)}`)}>View</Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </TechLogShell>
  );
}
