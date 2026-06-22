import { useState } from 'react';
import { toast } from 'sonner';
import { ClipboardCheck, Send, CheckCircle2, Printer, Plane, Wrench, AlertTriangle, Fuel, CalendarClock, FileSignature } from 'lucide-react';
import { useTechLog, useCurrentUser } from '../TechLogContext';
import { deriveServiceability } from '../engine/serviceability';
import { currentRows } from '../engine/supersede';
import { isDeferralExpired } from '../engine/pl25';
import { projectCheck } from '../engine/recurringChecks';
import { campForecast } from '../integration/campClient';
import { deferralsRequiringAck, canAcceptDispatch } from '../engine/handover';
import { INTENT, DEFAULT_PREFLIGHT_CHECKLIST } from '../constants';
import { printSignedRecord, mockPdfBlobUri } from '../util/printRecord';
import { newId } from '../util/id';
import type { Aircraft, FlightBriefing, Signature } from '../types';
import { SignCeremonyDialog } from './SignCeremonyDialog';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';

/** Latest briefing for an aircraft (most recent by createdAtUtc). */
export function latestBriefing(briefings: FlightBriefing[], aircraftId: string): FlightBriefing | undefined {
  return briefings.filter(b => b.aircraftId === aircraftId).sort((a, b) => b.createdAtUtc.localeCompare(a.createdAtUtc))[0];
}

export function BriefingPanel({ aircraft }: { aircraft: Aircraft }) {
  const { state, dispatch } = useTechLog();
  const user = useCurrentUser();
  const isMaint = user.role === 'MAINTENANCE';
  const now = new Date().toISOString();

  const [relOpen, setRelOpen] = useState(false);
  const [ackOpen, setAckOpen] = useState(false);
  const [pendingSigId, setPendingSigId] = useState('');
  const [ackChecks, setAckChecks] = useState<Record<string, boolean>>({});
  const ackDeferrals = deferralsRequiringAck(aircraft.id, state, now);
  const allAcked = ackDeferrals.every(d => ackChecks[d.id]);
  const acceptGate = canAcceptDispatch(aircraft.id, state, now);

  const briefing = latestBriefing(state.briefings, aircraft.id);
  const sv = deriveServiceability(aircraft.id, state, now);
  const nameOf = (oid?: string) => state.personnel.find(p => p.oid === oid)?.displayName ?? oid ?? '—';

  // live briefing content
  const deferrals = currentRows(state.deferrals).filter(d => d.aircraftId === aircraft.id && d.status !== 'CLEARED');
  const openDefects = currentRows(state.defects).filter(d => d.aircraftId === aircraft.id && (d.status === 'OPEN' || d.status === 'DEFERRED'));
  const checksDue = state.recurringChecks
    .filter(c => c.aircraftId === aircraft.id)
    .map(c => projectCheck(c, state.recurringAccomplishments, now, { hours: aircraft.airframeTotalHours, cycles: aircraft.airframeTotalCycles }))
    .filter(p => p.state !== 'CURRENT');
  const comingDue = campForecast(aircraft.serialNumber, { hours: aircraft.airframeTotalHours, cycles: aircraft.airframeTotalCycles })
    .filter(i => i.dueDateUtc).sort((a, b) => (a.dueDateUtc ?? '').localeCompare(b.dueDateUtc ?? '')).slice(0, 3);
  const melOf = (id: string) => state.melItems.find(m => m.id === id);

  const createDraft = () => {
    const b: FlightBriefing = {
      id: newId('brief'), aircraftId: aircraft.id, preparedByOid: user.oid, createdAtUtc: new Date().toISOString(), status: 'DRAFT',
      checklist: DEFAULT_PREFLIGHT_CHECKLIST.map((c, i) => ({ id: newId(`brc${i}`), text: c.text, mandatory: c.mandatory, done: false, source: 'TEMPLATE' as const })),
    };
    dispatch({ type: 'ADD_BRIEFING', payload: b });
    toast.success('Briefing started — complete the checklist, then release for flight.');
  };

  const patch = (b: FlightBriefing) => dispatch({ type: 'EDIT_BRIEFING', payload: b });
  const toggleItem = (b: FlightBriefing, itemId: string) =>
    patch({ ...b, checklist: b.checklist.map(c => (c.id === itemId ? { ...c, done: !c.done } : c)) });

  const beginRelease = (b: FlightBriefing) => {
    const missing = b.checklist.filter(c => c.mandatory && !c.done);
    if (missing.length) return toast.error(`Complete the mandatory checklist items first (${missing.length} remaining).`);
    setPendingSigId(newId('sig'));
    setRelOpen(true);
  };
  const onReleased = (b: FlightBriefing) => (sig: Signature) => {
    const nowIso = new Date().toISOString();
    dispatch({ type: 'ADD_SIGNATURE', payload: sig });
    dispatch({ type: 'EDIT_BRIEFING', payload: { ...b, status: 'RELEASED', serviceabilityAtRelease: sv.status, releasedAtUtc: nowIso, releaseSignatureId: sig.id } });
    dispatch({ type: 'ADD_AUDIT', payload: { id: newId('aud'), actorOid: user.oid, action: 'BRIEFING_RELEASED', entityType: 'FlightBriefing', entityId: b.id, atUtc: nowIso, summary: `${aircraft.tailNumber} flight briefing released to crew` } });
    toast.success(`Briefing released — the crew has been notified.`);
  };

  const beginAck = () => { setPendingSigId(newId('sig')); setAckOpen(true); };
  const onAcked = (b: FlightBriefing) => (sig: Signature) => {
    const nowIso = new Date().toISOString();
    dispatch({ type: 'ADD_SIGNATURE', payload: sig });
    dispatch({ type: 'EDIT_BRIEFING', payload: { ...b, status: 'ACKNOWLEDGED', acknowledgedByOid: user.oid, acknowledgedAtUtc: nowIso, ackSignatureId: sig.id, acknowledgedDeferralIds: ackDeferrals.map(d => d.id) } });
    dispatch({ type: 'ADD_AUDIT', payload: { id: newId('aud'), actorOid: user.oid, action: 'BRIEFING_ACKNOWLEDGED', entityType: 'FlightBriefing', entityId: b.id, atUtc: nowIso, summary: `${aircraft.tailNumber} briefing acknowledged by PIC ${user.displayName}` } });
    toast.success(`Briefing acknowledged — ${aircraft.tailNumber} accepted for flight.`);
  };

  const printBriefing = (b: FlightBriefing) => {
    const relSig = state.signatures.find(s => s.id === b.releaseSignatureId);
    const ackSig = state.signatures.find(s => s.id === b.ackSignatureId);
    printSignedRecord({
      docTitle: 'Flight Briefing', recordType: 'Briefing', reference: b.id,
      aircraft: `${aircraft.tailNumber} · ${aircraft.type} · S/N ${aircraft.serialNumber}`,
      pdfBlobUri: mockPdfBlobUri('briefing', b.id),
      sections: [
        { heading: 'Dispatch status', fields: [
          { label: 'Serviceability', value: b.serviceabilityAtRelease ?? sv.status },
          { label: 'Fuel planned', value: b.fuelPlannedLb ? `${b.fuelPlannedLb} lb` : '—' },
        ], body: b.notes },
        { heading: 'Active MEL deferrals', body: deferrals.length ? deferrals.map(d => `MEL ${melOf(d.melItemId)?.subItemNumber ?? '—'} (Cat ${d.category}) — ${d.restrictionText ?? melOf(d.melItemId)?.title ?? ''}`).join('\n') : 'None' },
        { heading: 'Open defects', body: openDefects.length ? openDefects.map(d => `ATA ${d.ataChapter} — ${d.description}`).join('\n') : 'None' },
        { heading: 'Coming due (CAMP)', body: comingDue.length ? comingDue.map(i => `${i.description} — ${i.dueDateUtc ? new Date(i.dueDateUtc).toLocaleDateString() : ''}`).join('\n') : 'None' },
        { heading: 'Preflight checklist', body: b.checklist.map(c => `${c.done ? '☑' : '☐'} ${c.text}`).join('\n') },
      ],
      signatures: [relSig, ackSig].filter(Boolean).map(s => ({ role: s!.signerRole, name: s!.signerName, cert: s!.certNumber, hash: s!.mockContentHash, signedAtUtc: s!.signedAtUtc, amr: s!.amr.join('+') })),
    });
  };

  // ── empty / prepare ──
  if (!briefing || briefing.status === 'ACKNOWLEDGED') {
    return (
      <div className="space-y-3">
        {briefing && briefing.status === 'ACKNOWLEDGED' && <BriefingReadout b={briefing} />}
        {isMaint ? (
          <Card>
            <CardContent className="flex flex-col items-start gap-2 p-6 text-sm">
              <p className="text-muted-foreground">{briefing ? 'The last briefing was acknowledged. Prepare a new one for the next flight.' : 'No active briefing. Prepare one for the crew.'}</p>
              <Button onClick={createDraft}><ClipboardCheck className="mr-1.5 h-4 w-4" /> Prepare flight briefing</Button>
            </CardContent>
          </Card>
        ) : (
          !briefing && <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">No flight briefing yet — maintenance prepares it before the flight.</CardContent></Card>
        )}
      </div>
    );
  }

  // ── DRAFT (maintenance editing) ──
  if (briefing.status === 'DRAFT') {
    if (!isMaint) {
      return <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">Maintenance is preparing the flight briefing — you'll be notified when it's released.</CardContent></Card>;
    }
    const doneCount = briefing.checklist.filter(c => c.done).length;
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><ClipboardCheck className="h-4 w-4" /> Preflight checklist ({doneCount}/{briefing.checklist.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {briefing.checklist.map(c => (
              <label key={c.id} className={`flex cursor-pointer items-start gap-2 rounded-md border p-2 text-sm ${c.done ? 'bg-[var(--gfo-success,#00B140)]/5' : ''}`}>
                <input type="checkbox" className="mt-0.5" checked={c.done} onChange={() => toggleItem(briefing, c.id)} />
                <span>{c.text}{c.mandatory && <Badge variant="outline" className="ml-2">required</Badge>}{c.source === 'CAMP' && <Badge variant="outline" className="ml-1">CAMP</Badge>}</span>
              </label>
            ))}
            <p className="text-xs text-muted-foreground">Standing template items. In production these can be augmented with the aircraft's CAMP preflight tasks.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Briefing details</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="flex items-center gap-1.5"><Fuel className="h-3.5 w-3.5" /> Fuel planned (lb)</Label><Input type="number" className="mt-1" value={briefing.fuelPlannedLb ?? ''} onChange={e => patch({ ...briefing, fuelPlannedLb: e.target.value ? Number(e.target.value) : undefined })} /></div>
            </div>
            <div><Label>Notes to crew</Label><Textarea className="mt-1" value={briefing.notes ?? ''} onChange={e => patch({ ...briefing, notes: e.target.value || undefined })} placeholder="Anything the crew should know before the flight…" /></div>
            <div className="rounded bg-muted/60 p-2 text-xs text-muted-foreground">On release, the briefing snapshots current serviceability ({sv.status}) and is sent to the crew with active MELs, open defects, fuel, and coming-due maintenance.</div>
            <Button onClick={() => beginRelease(briefing)}><Send className="mr-1.5 h-4 w-4" /> Release for flight</Button>
          </CardContent>
        </Card>
        <SignCeremonyDialog open={relOpen} onOpenChange={setRelOpen} signer={user} signedEntity="BRIEFING" signedEntityId={pendingSigId}
          intentStatement={INTENT.BRIEFING_RELEASE} payloadSummary={`${aircraft.tailNumber} preflight checklist complete; serviceability ${sv.status}.`}
          onSigned={onReleased(briefing)} title="Release briefing for flight" />
      </div>
    );
  }

  // ── RELEASED (assembled briefing; pilot acknowledges) ──
  return (
    <div className="space-y-3">
      <BriefingReadout b={briefing} />
      {!isMaint && ackDeferrals.length > 0 && (
        <Card>
          <CardContent className="space-y-2 p-4 text-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Acknowledge each active MEL item before accepting</div>
            {ackDeferrals.map(d => {
              const mel = melOf(d.melItemId);
              return (
                <label key={d.id} className="flex items-start gap-2">
                  <input type="checkbox" className="mt-1" checked={!!ackChecks[d.id]} onChange={() => setAckChecks(prev => ({ ...prev, [d.id]: !prev[d.id] }))} />
                  <span>MEL {mel?.subItemNumber ?? '—'} (Cat {d.category}) — {d.restrictionText || mel?.oProcedure || mel?.title || 'restriction/placard'}</span>
                </label>
              );
            })}
          </CardContent>
        </Card>
      )}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="ghost" onClick={() => printBriefing(briefing)}><Printer className="mr-1.5 h-4 w-4" /> View / Print</Button>
        {!isMaint && (
          <Button size="sm" disabled={!acceptGate.ok || !allAcked} onClick={beginAck}>
            <CheckCircle2 className="mr-1.5 h-4 w-4" /> Acknowledge &amp; accept (PIC)
          </Button>
        )}
      </div>
      {!isMaint && !acceptGate.ok && <p className="text-xs text-[var(--gfo-error,#EF3340)]">{acceptGate.reason}</p>}
      <SignCeremonyDialog open={ackOpen} onOpenChange={setAckOpen} signer={user} signedEntity="BRIEFING" signedEntityId={pendingSigId}
        intentStatement={INTENT.BRIEFING_ACK} validate={() => ({ ok: acceptGate.ok, error: acceptGate.reason })}
        payloadExtra={ackDeferrals.map(d => d.id).join(',')}
        payloadSummary={`${aircraft.tailNumber} briefing — serviceability ${briefing.serviceabilityAtRelease ?? sv.status}, ${ackDeferrals.length} MEL item(s) acknowledged.`}
        onSigned={onAcked(briefing)} title="Acknowledge flight briefing (PIC)" />
    </div>
  );

  // ── readout (shared by RELEASED + ACKNOWLEDGED) ──
  function BriefingReadout({ b }: { b: FlightBriefing }) {
    const statusColor = (b.serviceabilityAtRelease ?? sv.status) === 'GREEN' ? 'var(--gfo-success,#00B140)' : (b.serviceabilityAtRelease ?? sv.status) === 'AMBER' ? 'var(--gfo-warning,#F1B434)' : 'var(--gfo-error,#EF3340)';
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2 text-base"><FileSignature className="h-4 w-4" /> Flight Briefing</CardTitle>
          <Badge variant={b.status === 'ACKNOWLEDGED' ? 'secondary' : 'outline'}>{b.status}</Badge>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 font-medium" style={{ color: statusColor }}><Plane className="h-4 w-4" /> {b.serviceabilityAtRelease ?? sv.status}</span>
            {b.fuelPlannedLb != null && <span className="inline-flex items-center gap-1 text-muted-foreground"><Fuel className="h-3.5 w-3.5" /> {b.fuelPlannedLb} lb</span>}
            <span className="text-xs text-muted-foreground">prepared by {nameOf(b.preparedByOid)}{b.releasedAtUtc ? ` · released ${new Date(b.releasedAtUtc).toLocaleString()}` : ''}</span>
          </div>
          {b.notes && <p className="rounded-md border-l-4 border-l-primary bg-muted/50 p-2">{b.notes}</p>}

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><Wrench className="h-3.5 w-3.5" /> Active MEL deferrals</div>
              {deferrals.length === 0 ? <p className="text-muted-foreground">None.</p> : deferrals.map(d => {
                const exp = isDeferralExpired(d, now, { hours: aircraft.airframeTotalHours, cycles: aircraft.airframeTotalCycles });
                return <div key={d.id} className="border-b py-1 last:border-0 text-xs"><span className="font-medium">MEL {melOf(d.melItemId)?.subItemNumber ?? '—'}</span> (Cat {d.category}{exp ? ', EXPIRED' : ''}) — {d.restrictionText ?? melOf(d.melItemId)?.title}</div>;
              })}
            </div>
            <div>
              <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><AlertTriangle className="h-3.5 w-3.5" /> Open defects</div>
              {openDefects.length === 0 ? <p className="text-muted-foreground">None.</p> : openDefects.map(d => <div key={d.id} className="border-b py-1 last:border-0 text-xs">ATA {d.ataChapter} — {d.description}</div>)}
            </div>
          </div>

          <div>
            <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><CalendarClock className="h-3.5 w-3.5" /> Coming due (CAMP)</div>
            {comingDue.length === 0 ? <p className="text-muted-foreground">Nothing imminent.</p> : comingDue.map((i, idx) => <div key={idx} className="text-xs text-muted-foreground">{i.description} — {i.dueDateUtc ? new Date(i.dueDateUtc).toLocaleDateString() : ''}</div>)}
          </div>

          {checksDue.length > 0 && (
            <div className="rounded bg-[var(--gfo-warning,#F1B434)]/10 px-2 py-1 text-xs">
              {checksDue.length} recurring check(s) due/expired — see Overview.
            </div>
          )}

          <div>
            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Preflight checklist</div>
            <div className="grid grid-cols-1 gap-0.5 md:grid-cols-2">
              {b.checklist.map(c => <div key={c.id} className="text-xs">{c.done ? '☑' : '☐'} {c.text}</div>)}
            </div>
          </div>

          {b.status === 'ACKNOWLEDGED' && (
            <div className="flex items-center gap-2 rounded bg-[var(--gfo-success,#00B140)]/10 p-2 text-[var(--gfo-success,#00B140)]">
              <CheckCircle2 className="h-4 w-4" /> Acknowledged by {nameOf(b.acknowledgedByOid)} · {b.acknowledgedAtUtc ? new Date(b.acknowledgedAtUtc).toLocaleString() : ''}
              <Button size="sm" variant="ghost" className="ml-auto" onClick={() => printBriefing(b)}><Printer className="mr-1.5 h-4 w-4" /> Print</Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }
}
