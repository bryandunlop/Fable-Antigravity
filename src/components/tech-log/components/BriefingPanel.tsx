import { useState } from 'react';
import { toast } from 'sonner';
import { ClipboardCheck, Send, CheckCircle2, Printer, Plane, Wrench, AlertTriangle, Eye, Fuel, CalendarClock, FileSignature, ArrowRight, Lock, ChevronDown, ChevronRight, RefreshCw } from 'lucide-react';
import { useTechLog, useCurrentUser } from '../TechLogContext';
import { deriveServiceability } from '../engine/serviceability';
import { projectCheck } from '../engine/recurringChecks';
import { campForecast } from '../integration/campClient';
import { buildBriefingDisclosure, disclosureDigest } from '../engine/briefingDisclosure';
import { deferralsRequiringAck, canAcceptDispatch } from '../engine/handover';
import { INTENT } from '../constants';
import { latestPublishedTemplate, isReleaseGated, buildInitialEntries } from '../engine/checklist';
import { printSignedRecord, mockPdfBlobUri } from '../util/printRecord';
import { newId } from '../util/id';
import type { Aircraft, BriefingChecklistRow, BriefingComingDueRow, BriefingDisclosure, FlightBriefing, Signature } from '../types';
import { SignCeremonyDialog } from './SignCeremonyDialog';
import { ChecklistRunner } from './checklist/ChecklistRunner';
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

const melLabel = (r: { melSubItemNumber: string | null }) => r.melSubItemNumber ?? 'not recorded';
const melText = (r: { restrictionText: string | null; melTitle: string | null }) =>
  r.restrictionText ?? r.melTitle ?? 'MEL item not recorded';

/**
 * TL-16 — the printed briefing, built ONLY from the frozen disclosure and the frozen Signature rows.
 * A module-level function taking a `BriefingDisclosure`, deliberately: it has no access to
 * `TechLogState`, so it cannot re-derive the disclosed content or live-join `melItems`/`personnel`
 * however the surrounding component changes.
 */
function printBriefing(input: {
  b: FlightBriefing;
  aircraft: Aircraft;
  disclosure: BriefingDisclosure | null;
  signatures: Signature[];
  unsnapshotted: boolean;
}): void {
  const { b, aircraft, disclosure, signatures, unsnapshotted } = input;
  const list = <T,>(rows: T[], fmt: (r: T) => string) => (rows.length ? rows.map(fmt).join('\n') : 'None');
  printSignedRecord({
    docTitle: 'Flight Briefing', recordType: 'Briefing', reference: b.id,
    aircraft: `${aircraft.tailNumber} · ${aircraft.type} · S/N ${aircraft.serialNumber}`,
    pdfBlobUri: mockPdfBlobUri('briefing', b.id),
    sections: [
      { heading: 'Dispatch status', fields: [
        { label: 'Serviceability', value: disclosure?.serviceability ?? b.serviceabilityAtRelease ?? '—' },
        { label: 'Fuel planned', value: b.fuelPlannedLb ? `${b.fuelPlannedLb} lb` : '—' },
        { label: 'Prepared by', value: b.preparedByName ?? 'not recorded' },
        { label: 'Content as disclosed at', value: disclosure?.computedAtUtc ?? '—' },
      ], body: b.notes },
      { heading: 'Active MEL deferrals', body: list(disclosure?.deferrals ?? [], d => `MEL ${melLabel(d)} (Cat ${d.category}${d.isExpired ? ', EXPIRED' : ''}) — ${melText(d)}`) },
      { heading: 'Open defects', body: list(disclosure?.openDefects ?? [], d => `ATA ${d.ataChapter} — ${d.description}`) },
      { heading: 'Watch items — tracked, non-airworthiness', body: list(disclosure?.watchItems ?? [], d => `ATA ${d.ataChapter} — ${d.description}`) },
      { heading: 'Recurring checks due', body: list(disclosure?.checksDue ?? [], c => `${c.name} — ${c.state}`) },
      { heading: 'Coming due (CAMP)', body: list(disclosure?.comingDue ?? [], i => `${i.description} — ${i.dueDateUtc ? new Date(i.dueDateUtc).toLocaleDateString() : ''}`) },
      { heading: 'Preflight checklist', body: disclosure?.checklist.length ? disclosure.checklist.map(l => `${l.done ? '☑' : '☐'} ${l.label}`).join('\n') : '—' },
    ],
    signatures: signatures.map(s => ({ role: s.signerRole, name: s.signerName, cert: s.certNumber, hash: s.mockContentHash, signedAtUtc: s.signedAtUtc, amr: s.amr.join('+') })),
    footnote: unsnapshotted
      ? 'This briefing predates content snapshotting (TL-16): the items above are current values, not a record of what was disclosed at release.'
      : undefined,
  });
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
  const [briefOpen, setBriefOpen] = useState(false);
  const ackDeferrals = deferralsRequiringAck(aircraft.id, state, now);
  const allAcked = ackDeferrals.every(d => ackChecks[d.id]);

  const briefing = latestBriefing(state.briefings, aircraft.id);
  const sv = deriveServiceability(aircraft.id, state, now);

  // The CAMP due-list is an EXTERNAL, time-relative feed: campForecast() offsets every due date from
  // Date.now(), so it must be captured into the disclosure and frozen, never re-fetched at print time.
  const comingDueRows: BriefingComingDueRow[] = campForecast(aircraft.serialNumber, { hours: aircraft.airframeTotalHours, cycles: aircraft.airframeTotalCycles })
    .filter(i => i.dueDateUtc)
    .sort((a, b) => (a.dueDateUtc ?? '').localeCompare(b.dueDateUtc ?? ''))
    .slice(0, 3)
    .map(i => ({ ref: i.ref, description: i.description, dueDateUtc: i.dueDateUtc ?? null }));

  /**
   * The checklist as it stands NOW. Resolved here and folded INTO the disclosure so it is frozen at
   * release with everything else: an adversarial verifier proved (2026-07-26) that reading it live
   * let an already-acknowledged briefing print an item unticked, because `EDIT_CHECKLIST_INSTANCE`
   * replaces the whole instance row. The template was always correctly version-pinned; the mutable
   * instance was the hole.
   */
  const liveChecklistLines = (b: FlightBriefing | undefined): BriefingChecklistRow[] => {
    const inst = b && state.checklistInstances.find(i => i.id === b.checklistInstanceId);
    const t = inst && state.checklistTemplates.find(x => x.id === inst.templateId && x.version === inst.templateVersion);
    if (!inst || !t) return [];
    return t.sections.flatMap(sec => sec.items).map(def => {
      const e = inst.entries.find(en => en.itemDefId === def.id);
      return { label: def.label, done: e?.state === 'DONE' || e?.state === 'NA' };
    });
  };

  // What the aircraft looks like RIGHT NOW. Used to build the snapshot at release, to fill the DRAFT
  // view, and — after release — only to detect that the released briefing no longer matches reality.
  const liveDisclosure = buildBriefingDisclosure(aircraft.id, state, now, comingDueRows, liveChecklistLines(briefing));

  const frozen = briefing?.disclosureAtRelease ?? null;
  const isDraft = !briefing || briefing.status === 'DRAFT';
  /** A briefing signed before TL-16 landed. Rendered with a stated caveat, never silently backfilled. */
  const unsnapshotted = !isDraft && !frozen;
  // THE RULE: once a briefing leaves DRAFT, every surface reads the frozen snapshot. This is the fix.
  const disclosure = isDraft ? liveDisclosure : (frozen ?? liveDisclosure);

  /**
   * Freezing the disclosure would, on its own, trade one safety bug for a worse one: if maintenance
   * opens a grounding defect at T2.5, a frozen brief would show the PIC a clean aircraft. So the
   * frozen copy is what the signature covers, and this comparison forces a re-release when the
   * aircraft has moved underneath a briefing that has not yet been accepted.
   */
  const isStale = Boolean(
    briefing?.status === 'RELEASED' && frozen && liveDisclosure &&
    disclosureDigest(frozen) !== disclosureDigest(liveDisclosure),
  );

  const baseGate = canAcceptDispatch(aircraft.id, state, now);
  const acceptGate = !baseGate.ok
    ? baseGate
    : unsnapshotted
      // An adversarial verifier proved (2026-07-26) that the legacy fallback was the worst hole in
      // this panel: a RELEASED briefing with no snapshot rendered LIVE content on the PIC's signing
      // surface, `isStale` was structurally incapable of firing (it requires `frozen`), and the only
      // caveat sat inside a readout collapsed behind "Full briefing". So the PIC could sign a
      // document whose disclosed content nobody can attest to, with no warning anywhere they look.
      // If we cannot say what was disclosed, it cannot be accepted.
      ? { ok: false, reason: 'This briefing was released before its content was recorded, so what it disclosed cannot be attested. Maintenance must release a new briefing before you accept it.' }
      : isStale
        ? { ok: false, reason: "The aircraft's records have changed since this briefing was released. Maintenance must release an updated briefing before you accept it." }
        : { ok: true as const, reason: undefined };

  const template = latestPublishedTemplate(state.checklistTemplates, aircraft.type, 'PREFLIGHT');
  const instance = state.checklistInstances.find(i => i.id === briefing?.checklistInstanceId);
  // Version-pinned template the instance was actually built from — NOT the latest published template,
  // which may have drifted (a new version can be published while this briefing sits in DRAFT).
  const instanceTemplate = instance && state.checklistTemplates.find(t => t.id === instance.templateId && t.version === instance.templateVersion);

  /** Signer identity always from the frozen Signature row — never a live Personnel join (DM-3/IN-4). */
  const sigById = (id?: string) => (id ? state.signatures.find(s => s.id === id) : undefined);
  const doPrint = (b: FlightBriefing) => printBriefing({
    b, aircraft,
    disclosure: b.status === 'DRAFT' ? liveDisclosure : (b.disclosureAtRelease ?? liveDisclosure),
    signatures: [sigById(b.releaseSignatureId), sigById(b.ackSignatureId)].filter((s): s is Signature => Boolean(s)),
    unsnapshotted: b.status !== 'DRAFT' && !b.disclosureAtRelease,
  });

  const createDraft = () => {
    if (!template) return toast.error(`No published preflight checklist for ${aircraft.type} yet — ask a maintenance admin to publish one in Admin > Checklists.`);
    const instanceId = newId('cli');
    const b: FlightBriefing = {
      id: newId('brief'), aircraftId: aircraft.id, preparedByOid: user.oid, preparedByName: user.displayName,
      createdAtUtc: new Date().toISOString(), status: 'DRAFT',
      checklistInstanceId: instanceId,
    };
    dispatch({
      type: 'ADD_CHECKLIST_INSTANCE',
      payload: {
        id: instanceId, aircraftId: aircraft.id, phase: 'PREFLIGHT', templateId: template.id, templateVersion: template.version,
        briefingId: b.id, entries: buildInitialEntries(template),
        createdAtUtc: new Date().toISOString(),
      },
    });
    dispatch({ type: 'ADD_BRIEFING', payload: b });
    toast.success('Briefing started — complete the checklist, then release for flight.');
  };

  const patch = (b: FlightBriefing) => dispatch({ type: 'EDIT_BRIEFING', payload: b });

  const beginRelease = (_b: FlightBriefing) => {
    if (!instanceTemplate || !instance) return;
    const gate = isReleaseGated(instance, instanceTemplate);
    if (!gate.ok) return toast.error(`Complete the required checklist items first (${gate.missing.length} remaining).`);
    setPendingSigId(newId('sig'));
    setRelOpen(true);
  };
  const onReleased = (b: FlightBriefing) => (sig: Signature) => {
    const nowIso = new Date().toISOString();
    dispatch({ type: 'ADD_SIGNATURE', payload: sig });
    dispatch({ type: 'EDIT_BRIEFING', payload: {
      ...b, status: 'RELEASED', serviceabilityAtRelease: sv.status,
      // TL-16: the whole disclosed content, frozen here, is what every later surface renders.
      disclosureAtRelease: liveDisclosure ?? undefined,
      releasedAtUtc: nowIso, releaseSignatureId: sig.id,
    } });
    if (instance) dispatch({ type: 'EDIT_CHECKLIST_INSTANCE', payload: { ...instance, signatureId: sig.id } });
    dispatch({ type: 'ADD_AUDIT', payload: { id: newId('aud'), actorOid: user.oid, action: 'BRIEFING_RELEASED', entityType: 'FlightBriefing', entityId: b.id, atUtc: nowIso, summary: `${aircraft.tailNumber} flight briefing released to crew` } });
    toast.success(`Briefing released — the crew has been notified.`);
  };

  /** Re-release after divergence: a fresh draft, so the new disclosure gets its own signature. */
  const reRelease = () => {
    createDraft();
    toast.info('The previous briefing is superseded — complete and release the new one.');
  };

  const beginAck = () => { setPendingSigId(newId('sig')); setAckOpen(true); };
  const onAcked = (b: FlightBriefing) => (sig: Signature) => {
    const nowIso = new Date().toISOString();
    dispatch({ type: 'ADD_SIGNATURE', payload: sig });
    dispatch({ type: 'EDIT_BRIEFING', payload: { ...b, status: 'ACKNOWLEDGED', acknowledgedByOid: user.oid, acknowledgedAtUtc: nowIso, ackSignatureId: sig.id, acknowledgedDeferralIds: ackDeferrals.map(d => d.id) } });
    dispatch({ type: 'ADD_AUDIT', payload: { id: newId('aud'), actorOid: user.oid, action: 'BRIEFING_ACKNOWLEDGED', entityType: 'FlightBriefing', entityId: b.id, atUtc: nowIso, summary: `${aircraft.tailNumber} briefing acknowledged by PIC ${user.displayName}` } });
    toast.success(`Briefing acknowledged — ${aircraft.tailNumber} accepted for flight.`);
  };

  const readoutProps = (b: FlightBriefing) => ({
    b,
    disclosure: b.status === 'DRAFT' ? liveDisclosure : (b.disclosureAtRelease ?? liveDisclosure),
    acknowledgedByName: sigById(b.ackSignatureId)?.signerName ?? null,
    unsnapshotted: b.status !== 'DRAFT' && !b.disclosureAtRelease,
  });

  // ── empty / prepare ──
  if (!briefing || briefing.status === 'ACKNOWLEDGED') {
    return (
      <div className="space-y-3">
        {briefing && briefing.status === 'ACKNOWLEDGED' && <BriefingReadout {...readoutProps(briefing)} onPrint={() => doPrint(briefing)} />}
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
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><ClipboardCheck className="h-4 w-4" /> Preflight checklist</CardTitle></CardHeader>
          <CardContent>
            {instanceTemplate && instance
              ? <ChecklistRunner aircraft={aircraft} template={instanceTemplate} instance={instance} onChange={next => dispatch({ type: 'EDIT_CHECKLIST_INSTANCE', payload: next })} />
              : <p className="text-sm text-muted-foreground">No checklist instance found for this briefing.</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Briefing details</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="flex items-center gap-1.5"><Fuel className="h-3.5 w-3.5" /> Fuel planned (lb)</Label><Input type="number" className="mt-1" value={briefing.fuelPlannedLb ?? ''} onChange={e => patch({ ...briefing, fuelPlannedLb: e.target.value ? Number(e.target.value) : undefined })} /></div>
            </div>
            <div><Label>Notes to crew</Label><Textarea className="mt-1" value={briefing.notes ?? ''} onChange={e => patch({ ...briefing, notes: e.target.value || undefined })} placeholder="Anything the crew should know before the flight…" /></div>
            <div className="rounded bg-muted/60 p-2 text-xs text-muted-foreground">On release, the briefing takes a permanent snapshot of the airworthiness content as it stands now — serviceability ({sv.status}), active MELs, open defects, watch items, recurring checks and coming-due maintenance. That snapshot is what the crew signs and what prints, and it never changes afterwards.</div>
            <Button onClick={() => beginRelease(briefing)}><Send className="mr-1.5 h-4 w-4" /> Release for flight</Button>
          </CardContent>
        </Card>
        <SignCeremonyDialog open={relOpen} onOpenChange={setRelOpen} signer={user} signedEntity="BRIEFING" signedEntityId={pendingSigId}
          intentStatement={INTENT.BRIEFING_RELEASE} payloadSummary={`${aircraft.tailNumber} preflight checklist complete; serviceability ${sv.status}.`}
          payloadExtra={liveDisclosure ? disclosureDigest(liveDisclosure) : undefined}
          onSigned={onReleased(briefing)} title="Release briefing for flight" />
      </div>
    );
  }

  // ── RELEASED — maintenance sees the readout awaiting the crew; the pilot gets a focused accept sheet ──
  if (isMaint) {
    return (
      <div className="space-y-3">
        {isStale && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border p-3 text-sm" style={{ borderColor: 'var(--gfo-warning,#F1B434)' }}>
            <RefreshCw className="h-4 w-4" style={{ color: 'var(--gfo-warning,#F1B434)' }} />
            <span>This aircraft's records have changed since the briefing was released. The crew cannot accept it — release an updated briefing.</span>
            <Button size="sm" className="ml-auto" onClick={reRelease}>Prepare updated briefing</Button>
          </div>
        )}
        <BriefingReadout {...readoutProps(briefing)} />
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="ghost" onClick={() => doPrint(briefing)}><Printer className="mr-1.5 h-4 w-4" /> View / Print</Button>
          <span className="self-center text-xs text-muted-foreground">Released — awaiting crew acknowledgement.</span>
        </div>
      </div>
    );
  }

  const svAtRelease = disclosure?.serviceability ?? briefing.serviceabilityAtRelease ?? sv.status;
  const svColor = svAtRelease === 'GREEN' ? 'var(--gfo-success,#00B140)' : svAtRelease === 'AMBER' ? 'var(--gfo-warning,#F1B434)' : 'var(--gfo-error,#EF3340)';
  const svText = svAtRelease === 'GREEN' ? 'Serviceable — no open items' : svAtRelease === 'AMBER' ? 'Serviceable with limitations' : 'Unserviceable — grounded';
  // Frozen MEL identity for the acknowledge checkboxes: the PIC must tick against the same text the
  // briefing discloses and the signature covers, not against a MelItem a later revision can rewrite.
  const disclosedById = new Map((disclosure?.deferrals ?? []).map(r => [r.deferralId, r]));
  return (
    <div className="space-y-3">
      {/* Custody transfer — maintenance → you, on the P&G-blue axis (distinct from RAG serviceability) */}
      <div className="flex items-center gap-3 rounded-lg border p-3 text-sm">
        <span className="inline-flex items-center gap-1.5 text-muted-foreground"><span className="gfo-chip-dot gfo-dot-maint" /> Maintenance</span>
        <ArrowRight className="h-4 w-4" style={{ color: 'var(--gfo-custody-crew)' }} />
        <span className="inline-flex items-center gap-1.5 font-medium" style={{ color: 'var(--gfo-custody-crew)' }}><span className="gfo-chip-dot gfo-dot-crew" /> You · PIC</span>
        {briefing.releasedAtUtc && <span className="ml-auto text-xs text-muted-foreground">released {new Date(briefing.releasedAtUtc).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>}
      </div>

      {/* Both caveats sit HERE, on the accept sheet itself — above the verdict, the MEL checkboxes
          and the sign button. The readout's own banner is not enough: on this surface the readout is
          collapsed behind "Full briefing" by default, so a warning that lives only inside it is a
          warning the PIC never sees before signing. */}
      {unsnapshotted && (
        <div className="flex items-start gap-2 rounded-lg border p-3 text-sm" style={{ borderColor: 'var(--gfo-warning,#F1B434)' }}>
          <RefreshCw className="mt-0.5 h-4 w-4 shrink-0" style={{ color: 'var(--gfo-warning,#F1B434)' }} />
          <span>This briefing was released before myGFO recorded what it disclosed, so the items below are <strong>current values, not a record of what you were shown</strong>. It cannot be accepted — ask maintenance for a new briefing.</span>
        </div>
      )}
      {isStale && (
        <div className="flex items-start gap-2 rounded-lg border p-3 text-sm" style={{ borderColor: 'var(--gfo-warning,#F1B434)' }}>
          <RefreshCw className="mt-0.5 h-4 w-4 shrink-0" style={{ color: 'var(--gfo-warning,#F1B434)' }} />
          <span>Maintenance has changed this aircraft's records since the briefing below was released. What you see is the briefing as released — it is no longer current, so it cannot be accepted. Ask maintenance for an updated briefing.</span>
        </div>
      )}

      {/* Serviceability verdict (RAG) */}
      <div className="flex items-center gap-3 rounded-lg border p-3" style={{ borderColor: svColor }}>
        <span className="inline-block h-3 w-3 rounded-full" style={{ background: svColor }} />
        <span className="font-medium" style={{ color: svColor }}>{svText}</span>
      </div>

      {/* MEL items the PIC must acknowledge before accepting */}
      {ackDeferrals.length > 0 && (
        <Card>
          <CardContent className="space-y-2 p-4 text-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Acknowledge each active MEL item before you accept</div>
            {ackDeferrals.map(d => {
              const row = disclosedById.get(d.id);
              const num = row?.melSubItemNumber ?? d.melSubItemNumber ?? 'not recorded';
              const text = row ? melText(row) : (d.restrictionText ?? d.melTitle ?? 'restriction/placard');
              return (
                <label key={d.id} className="flex items-start gap-2 rounded-md border p-2">
                  <input type="checkbox" className="mt-1" checked={!!ackChecks[d.id]} onChange={() => setAckChecks(prev => ({ ...prev, [d.id]: !prev[d.id] }))} />
                  <span>MEL {num} (Cat {d.category}) — {text}</span>
                </label>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Full briefing — collapsed so the decision-critical items lead */}
      <div>
        <button onClick={() => setBriefOpen(o => !o)} className="flex w-full items-center justify-between rounded-lg border p-3 text-sm hover:bg-muted/40">
          <span className="inline-flex items-center gap-1.5 text-muted-foreground"><FileSignature className="h-4 w-4" /> Full briefing — fuel, coming-due, checklist</span>
          {briefOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
        </button>
        {briefOpen && <div className="mt-3"><BriefingReadout {...readoutProps(briefing)} /></div>}
      </div>

      {!acceptGate.ok && <p className="text-xs" style={{ color: 'var(--gfo-error,#EF3340)' }}>{acceptGate.reason}</p>}

      {/* One weighty acceptance — the gravity of a PIC signature + custody transfer */}
      <Button className="w-full" size="lg" disabled={!acceptGate.ok || !allAcked} onClick={beginAck}>
        <FileSignature className="mr-2 h-4 w-4" /> Acknowledge &amp; accept — sign as PIC
      </Button>
      <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
        <Lock className="h-3.5 w-3.5" /> step-up signature · transfers custody to you and is recorded
      </p>
      <div><Button size="sm" variant="ghost" onClick={() => doPrint(briefing)}><Printer className="mr-1.5 h-4 w-4" /> View / Print</Button></div>

      <SignCeremonyDialog open={ackOpen} onOpenChange={setAckOpen} signer={user} signedEntity="BRIEFING" signedEntityId={pendingSigId}
        intentStatement={INTENT.BRIEFING_ACK} validate={() => ({ ok: acceptGate.ok && allAcked, error: !acceptGate.ok ? acceptGate.reason : !allAcked ? 'Acknowledge each active MEL item before accepting.' : undefined })}
        // The acknowledged ids AND a fingerprint of the disclosed content, so the PIC's signature
        // covers what was actually shown — not just which boxes were ticked (TL-16).
        payloadExtra={[ackDeferrals.map(d => d.id).join(','), disclosure ? disclosureDigest(disclosure) : ''].join('|')}
        payloadSummary={`${aircraft.tailNumber} briefing — serviceability ${svAtRelease}, ${ackDeferrals.length} MEL item(s) acknowledged.`}
        onSigned={onAcked(briefing)} title="Acknowledge flight briefing (PIC)" />
    </div>
  );
}

/**
 * The readout shared by RELEASED + ACKNOWLEDGED briefings.
 *
 * TL-16: this is a MODULE-LEVEL component taking a `BriefingDisclosure`, not a closure over the
 * parent's `state`. That is the structural point — it cannot re-derive the disclosed content and
 * cannot live-join `melItems` or `personnel`, whatever anyone later adds to the parent. It was
 * previously nested inside `BriefingPanel` and read `deferrals`/`openDefects`/`watchItems`/`comingDue`
 * straight out of live state on every render.
 */
function BriefingReadout({ b, disclosure, acknowledgedByName, unsnapshotted, onPrint }: {
  b: FlightBriefing;
  disclosure: BriefingDisclosure | null;
  acknowledgedByName: string | null;
  unsnapshotted: boolean;
  onPrint?: () => void;
}) {
  const sv = disclosure?.serviceability ?? b.serviceabilityAtRelease ?? 'RED';
  const statusColor = sv === 'GREEN' ? 'var(--gfo-success,#00B140)' : sv === 'AMBER' ? 'var(--gfo-warning,#F1B434)' : 'var(--gfo-error,#EF3340)';
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-base"><FileSignature className="h-4 w-4" /> Flight Briefing</CardTitle>
        <Badge variant={b.status === 'ACKNOWLEDGED' ? 'secondary' : 'outline'}>{b.status}</Badge>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {unsnapshotted && (
          <p className="rounded bg-[var(--gfo-warning,#F1B434)]/10 px-2 py-1 text-xs">
            This briefing predates content snapshotting — the items below are current values, not a record of what was disclosed at release.
          </p>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1.5 font-medium" style={{ color: statusColor }}><Plane className="h-4 w-4" /> {sv}</span>
          {b.fuelPlannedLb != null && <span className="inline-flex items-center gap-1 text-muted-foreground"><Fuel className="h-3.5 w-3.5" /> {b.fuelPlannedLb} lb</span>}
          <span className="text-xs text-muted-foreground">prepared by {b.preparedByName ?? 'not recorded'}{b.releasedAtUtc ? ` · released ${new Date(b.releasedAtUtc).toLocaleString()}` : ''}</span>
        </div>
        {b.notes && <p className="rounded-md border-l-4 border-l-primary bg-muted/50 p-2">{b.notes}</p>}

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><Wrench className="h-3.5 w-3.5" /> Active MEL deferrals</div>
            {!disclosure?.deferrals.length ? <p className="text-muted-foreground">None.</p> : disclosure.deferrals.map(d => (
              <div key={d.deferralId} className="border-b py-1 last:border-0 text-xs">
                <span className="font-medium">MEL {melLabel(d)}</span> (Cat {d.category}{d.isExpired ? ', EXPIRED' : ''}) — {melText(d)}
              </div>
            ))}
          </div>
          <div>
            <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><AlertTriangle className="h-3.5 w-3.5" /> Open defects</div>
            {!disclosure?.openDefects.length ? <p className="text-muted-foreground">None.</p> : disclosure.openDefects.map(d => <div key={d.defectId} className="border-b py-1 last:border-0 text-xs">ATA {d.ataChapter} — {d.description}</div>)}
          </div>
        </div>

        <div>
          <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><Eye className="h-3.5 w-3.5" /> Watch items — tracked, non-airworthiness</div>
          {!disclosure?.watchItems.length ? <p className="text-muted-foreground">None.</p> : disclosure.watchItems.map(d => (
            <div key={d.defectId} className="flex items-center gap-2 border-b py-1 last:border-0 text-xs">
              <Badge variant="secondary" className="shrink-0 text-[10px]">WATCH</Badge>
              <span>ATA {d.ataChapter} — {d.description}</span>
            </div>
          ))}
        </div>

        <div>
          <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><CalendarClock className="h-3.5 w-3.5" /> Coming due (CAMP)</div>
          {!disclosure?.comingDue.length ? <p className="text-muted-foreground">Nothing imminent.</p> : disclosure.comingDue.map(i => <div key={i.ref} className="text-xs text-muted-foreground">{i.description} — {i.dueDateUtc ? new Date(i.dueDateUtc).toLocaleDateString() : ''}</div>)}
        </div>

        {!!disclosure?.checksDue.length && (
          <div className="rounded bg-[var(--gfo-warning,#F1B434)]/10 px-2 py-1 text-xs">
            {disclosure.checksDue.length} recurring check(s) due/expired — see Overview.
          </div>
        )}

        <div>
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Preflight checklist</div>
          <div className="grid grid-cols-1 gap-0.5 md:grid-cols-2">
            {!disclosure?.checklist.length
              ? <div className="text-muted-foreground">—</div>
              : disclosure.checklist.map(l => <div key={l.label} className="text-xs">{l.done ? '☑' : '☐'} {l.label}</div>)}
          </div>
        </div>

        {b.status === 'ACKNOWLEDGED' && (
          <div className="flex items-center gap-2 rounded bg-[var(--gfo-success,#00B140)]/10 p-2 text-[var(--gfo-success,#00B140)]">
            <CheckCircle2 className="h-4 w-4" /> Acknowledged by {acknowledgedByName ?? 'not recorded'} · {b.acknowledgedAtUtc ? new Date(b.acknowledgedAtUtc).toLocaleString() : ''}
            {onPrint && <Button size="sm" variant="ghost" className="ml-auto" onClick={onPrint}><Printer className="mr-1.5 h-4 w-4" /> Print</Button>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
