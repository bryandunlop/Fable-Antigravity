import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Search, ClipboardCheck, ShieldAlert, Clock } from 'lucide-react';
import { useTechLog, useCurrentUser } from '../../TechLogContext';
import { computeClockStart, computeRepairDue, DEFAULT_GOVERNING_TIMEZONE } from '../../engine/pl25';
import { GOVERNING_ZONE_OPTIONS, isOverride, validateGoverningOverride } from '../../util/governingZone';
import { formatRegulatoryCompact, formatRegulatoryDeadline, formatRegulatoryInstant, formatRegulatoryLabel } from '../../util/displayZone';
import { utcFromWallTime, wallTimeFromUtc } from '../../util/entryZone';
import { canDeferDefect } from '../../engine/disposition';
import { crewActionRequiredForMelItem, resolveDeferralCrewAction, entersPendingPlacard } from '../../engine/crewAction';
import { isNefItem } from '../../engine/nef';
import { CATEGORY_DAYS, INTENT } from '../../constants';
import { useIntegration } from '../../integration/useIntegration';
import { newId } from '../../util/id';
import type { Defect, Deferral, MelCategory, MelItem } from '../../types';
import { SignCeremonyDialog } from '../SignCeremonyDialog';
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card';
import { Badge } from '../../../ui/badge';
import { Button } from '../../../ui/button';
import { Input } from '../../../ui/input';
import { Textarea } from '../../../ui/textarea';
import { Checkbox } from '../../../ui/checkbox';

/**
 * D56 — whole minutes, because that is all the day-of-discovery control can express. A defect's
 * `occurredAtUtc` is stamped from `new Date()` and carries seconds; a `datetime-local` never does.
 * Comparing the two as raw ISO strings made the "Adjusted" hint latch on after any edit that merely
 * restored the value, reporting a change the signer had not made.
 */
const minuteOf = (iso: string) => Math.floor(new Date(iso).getTime() / 60_000);

function dueFromCategory(mel: MelItem & { category: MelCategory }, clockStart: string, airframe: { hours: number; cycles: number }, zone: string) {
  if (mel.category === 'A') return { repairDueDateUtc: undefined, repairIntervalUnit: 'CALENDAR_DAY' as const, repairIntervalValue: 0 };
  const value = CATEGORY_DAYS[mel.category] ?? 0;
  return computeRepairDue(mel.category, clockStart, { repairIntervalUnit: 'CALENDAR_DAY', repairIntervalValue: value }, airframe, zone);
}

/**
 * A catalog item that carries a repair category — Section One and Section Two. NEF items carry none
 * by design (D69/D70), and this narrowing is what stops a clockless item reaching the PL-25 math:
 * every call into `dueFromCategory` has to prove the category exists first, so the compiler enforces
 * it rather than a comment.
 */
type DeferrableMelItem = MelItem & { category: MelCategory };

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
  // D24 governing-zone override (Eastern default; override to operating-local requires a reason).
  const [governingZone, setGoverningZone] = useState(DEFAULT_GOVERNING_TIMEZONE);
  const [overrideReason, setOverrideReason] = useState('');
  const [showOverride, setShowOverride] = useState(false);
  // D56: the PL-25 day of discovery defaults to when the defect was NOTICED, not to now — a defect
  // seen at 2330Z and written up the next morning would otherwise start its clock a day late.
  // Maintenance can still adjust it here, before signing; after signing the deferral is immutable.
  const [dayOfDiscoveryUtc, setDayOfDiscoveryUtc] = useState(defect.occurredAtUtc);
  // D59 crew action. `addCrewAction` is the ADD-ONLY override: it can turn a crew action ON where
  // the MEL item does not carry one, and it is not even rendered when the item does — an inherited
  // requirement is corrected in MEL management (D23 four-eyes), never unticked here.
  const [addCrewAction, setAddCrewAction] = useState(false);
  const [crewActionInstructions, setCrewActionInstructions] = useState('');

  const melMatches = useMemo(() => {
    if (!aircraft) return [];
    const q = query.trim().toLowerCase();
    return state.melItems
      .filter(m => m.aircraftType === aircraft.type && m.approvalState === 'APPROVED')
      // TL-37 — the HARD BLOCK (Bryan, 2026-07-31). `canDeferDefect` already refused a crew signing
      // a maintenance-only item at the button, but the list still OFFERED it, so a pilot down-route
      // picked an item, filled the form and only then learned they could not sign it. Both MELs mark
      // every item `Flight Crew Deferral Item` YES/NO; ~41 across the fleet are NO. Filtering here
      // means a crew member is never shown an item the MEL reserves to maintenance.
      .filter(m => canDeferDefect(user, m))
      .filter(m => !q || m.subItemNumber.toLowerCase().includes(q) || m.title.toLowerCase().includes(q) || m.ataReference === q)
      .slice(0, 25);
    // `user` IS a dependency: the list is now filtered by who is standing here (TL-37), and the
    // current user resolves from the login AFTER the first render. Omitting it cached the list
    // computed against whoever was resolved first — a maintenance user could be left looking at the
    // crew-filtered list, which is the same class of bug as reading authority off the fallback
    // persona. Caught by `deferralClockDefault.test.tsx`, which went looking for an item the stale
    // list had dropped.
  }, [state.melItems, aircraft, query, user]);

  const selectedMel = state.melItems.find(m => m.id === selectedMelId);
  // D69 — an NEF item carries no repair category, so there is no PL-25 interval to start. It is
  // still a real, placarded, tracked deferral; it is the CLOCK that is absent, not the deferral.
  const isNef = selectedMel ? isNefItem(selectedMel) : false;
  // D59: the flag is AUTHORED on the MEL item by the DOM / Chief Inspector at MEL entry; the
  // deferral inherits it. Legacy/auto-extracted items with no authored flag fall back to
  // Boolean(oProcedure) — conservative in the gating direction.
  const crewActionInherited = selectedMel ? crewActionRequiredForMelItem(selectedMel) : false;
  // The requested value is `inherited || added` rather than `added` alone, because the UI cannot
  // express "remove": the checkbox is not rendered when the item carries the flag. The engine call
  // stays anyway — it is where the add-only rule lives, and it must hold for any future caller.
  const { crewActionRequired } = resolveDeferralCrewAction(crewActionInherited, crewActionInherited || addCrewAction);
  // D59 assumes the frozen (O) snapshot carries the instruction. On the ADD-ONLY path that premise
  // does not hold: the checkbox is rendered only when the item lacks the authored flag, which for an
  // unauthored item means it has no (O) text at all — so `melOProcedure` freezes as undefined and the
  // addendum is the ONLY possible instruction. Empty, it produces a signed deferral that requires the
  // crew to do something it never says, and the crew panel then renders "No (O) procedure text was
  // recorded on this deferral" above a Sign button asserting it was "accomplished as described above".
  const addendumRequired = crewActionRequired && !selectedMel?.oProcedure?.trim();
  const willGate = entersPendingPlacard({
    mProcedureRequired: !!selectedMel?.mProcedure?.trim(),
    placardRequired: !!selectedMel?.placardText?.trim(),
    crewActionRequired,
  });
  const cat = selectedMel?.category;

  // D24: live preview of the PL-25 clock under the chosen governing zone, so the signer sees the
  // effect of an override before signing. Advisory only (the real clock is re-stamped at signing).
  const clockPreview = useMemo(() => {
    // A clockless NEF item (D69) has no interval to preview — return null rather than a start date
    // implying a clock that will never run.
    if (!selectedMel?.category) return null;
    const cs = computeClockStart(dayOfDiscoveryUtc, governingZone);
    const due = dueFromCategory(selectedMel as DeferrableMelItem, cs, { hours: 0, cycles: 0 }, governingZone);
    return {
      start: formatRegulatoryCompact(cs, 'GOVERNING', governingZone),
      due: due.repairDueDateUtc ? formatRegulatoryDeadline(due.repairDueDateUtc, 'GOVERNING', governingZone) : null,
      // The boundary instant's own calendar day in the governing zone — the day the aircraft wakes
      // up grounded — so "by 23:59 Aug 18" cannot be misread in either direction (LG-195).
      groundsInto: due.repairDueDateUtc ? formatRegulatoryInstant(due.repairDueDateUtc, 'GOVERNING', governingZone).date : null,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMelId, governingZone, dayOfDiscoveryUtc]);

  if (!aircraft) return null;

  if (aircraft.isProvisional) {
    return (
      <Card className="border-[var(--gfo-error,#EF3340)]/40">
        <CardContent className="flex items-start gap-2 p-4 text-sm">
          <ShieldAlert className="mt-0.5 h-4 w-4 text-[var(--gfo-error-ink,#C81E2B)]" />
          <span><strong>Deferral blocked.</strong> {aircraft.tailNumber}'s {aircraft.type} D195 MEL is pending FSDO approval (provisional). No deferrals may be created against an unapproved MEL.</span>
        </CardContent>
      </Card>
    );
  }

  const beginSign = () => {
    if (!selectedMel) return toast.error('Select a governing MEL item.');
    if (!ack) return toast.error('You must acknowledge the MEL review before signing.');
    if (!canDeferDefect(user, selectedMel)) return toast.error('You are not authorized to defer this MEL item.');
    const ovr = validateGoverningOverride(governingZone, overrideReason);
    if (!ovr.ok) return toast.error(ovr.error!);
    if (addendumRequired && !crewActionInstructions.trim()) {
      return toast.error('This MEL item carries no (O) procedure text — write the crew instructions, or the crew action says nothing.');
    }
    // D56: a future day of discovery would push the whole repair clock forward — almost certainly a
    // mistyped year in the adjust field, never a real adjustment. Same guard as the report form.
    if (new Date(dayOfDiscoveryUtc).getTime() > Date.now() + 60_000) {
      return toast.error('The day of discovery cannot be in the future.');
    }
    setPendingDeferralId(newId('df'));
    setSignOpen(true);
  };

  const onSigned = (sig: { id: string }) => {
    if (!selectedMel) return;
    const now = new Date().toISOString();
    // D24: anchor the PL-25 clock to the governing zone (Eastern default, or a per-deferral override
    // to the aircraft operating-local zone). The stored governingTimezone must be the same zone the
    // clock was computed under; an override also records its reason.
    // D56: the clock is fed the day of discovery (defaulted from the defect's occurrence, possibly
    // adjusted above) — NOT `now`, which is when the deferral happens to be signed.
    const zone = governingZone;
    const clockStart = computeClockStart(dayOfDiscoveryUtc, zone);
    const airframe = { hours: aircraft.airframeTotalHours, cycles: aircraft.airframeTotalCycles };
    // D69 — a clockless deferral: no due date, no usage threshold, and therefore no expiry.
    // `isDeferralExpired` already returns false for a deferral carrying neither, so nothing had to
    // be special-cased downstream to stop this grounding an aircraft.
    const due = selectedMel.category
      ? dueFromCategory(selectedMel as DeferrableMelItem, clockStart, airframe, zone)
      : { repairDueDateUtc: undefined, repairIntervalUnit: 'CALENDAR_DAY' as const, repairIntervalValue: 0 };
    const mProcedureRequired = !!selectedMel.mProcedure?.trim();
    // Every NEF item carries the program's placard rule in `placardText`, so this is already true
    // for them — stated rather than special-cased.
    const placardRequired = !!selectedMel.placardText?.trim();

    const supDefect: Defect = { ...defect, id: newId('def'), status: 'DEFERRED', supersedesId: defect.id, signatureId: sig.id };
    const deferral: Deferral = {
      id: pendingDeferralId, defectId: supDefect.id, aircraftId: aircraft.id, melItemId: selectedMel.id,
      governingMmelRevision: selectedMel.mmelRevision, governingEffectiveDate: selectedMel.effectiveDate,
      // D36: freeze the MEL's display identity here, with the revision. MelItem is updatable in
      // place, so anything read back through melItemId later shows the CURRENT text — which on a
      // ramp screen means showing a regulator the wrong provision under a right-looking revision.
      melSubItemNumber: selectedMel.subItemNumber, melTitle: selectedMel.title,
      // TL-16: the (O) procedure too — it decides whether the PIC must acknowledge this item.
      melOProcedure: selectedMel.oProcedure,
      // D59: and the crew-action flag, frozen for the same reason — an EDIT_MEL_ITEM must never be
      // able to make a mandatory crew action vanish from an already-signed deferral.
      crewActionRequired,
      crewActionInstructions: crewActionRequired ? (crewActionInstructions.trim() || undefined) : undefined,
      category: selectedMel.category,
      // Snapshotted, not derived at read time: this deferral must still read as an NEF deferral
      // after the MEL item is revised (the same rule as `melOProcedure` and the governing revision).
      nefProgram: isNefItem(selectedMel) || undefined,
      dayOfDiscoveryUtc, clockStartDateUtc: clockStart,
      governingTimezone: zone,
      governingTimezoneOverrideReason: isOverride(zone) ? overrideReason.trim() : undefined,
      repairDueDateUtc: due.repairDueDateUtc, repairIntervalUnit: due.repairIntervalUnit, repairIntervalValue: due.repairIntervalValue,
      restrictionText: restriction.trim() || selectedMel.provisos, placardRequired,
      mProcedureRequired, placardLocation: selectedMel.placardLocation, extensionUsed: false,
      riiRequired: false, melReviewAcknowledged: true, signedByOid: user.oid, signatureId: sig.id,
      // D59: a crew action gates first release exactly as an (M) procedure or a placard does. Before
      // this, a deferral whose ONLY requirement was an (O) procedure went straight to ACTIVE and the
      // aircraft was dispatchable with a mandatory crew action nobody had done.
      status: entersPendingPlacard({ mProcedureRequired, placardRequired, crewActionRequired }) ? 'PENDING_PLACARD' : 'ACTIVE',
    };
    dispatch({ type: 'ADD_SIGNATURE', payload: sig as any });
    dispatch({ type: 'SUPERSEDE_DEFECT', payload: supDefect });
    dispatch({ type: 'ADD_DEFERRAL', payload: deferral });
    dispatch({ type: 'ADD_AUDIT', payload: { id: newId('aud'), actorOid: user.oid, action: 'DEFERRAL_SIGNED', entityType: 'Deferral', entityId: deferral.id, atUtc: now, summary: `${aircraft.tailNumber} deferred under MEL ${selectedMel.subItemNumber} (${selectedMel.category ? `Cat ${selectedMel.category}` : 'NEF — no repair interval'})` } });

    integration.pushDiscrepancy({
      entityType: 'DEFERRAL', entityId: deferral.id, aircraftId: aircraft.id,
      ata: selectedMel.ataReference, description: `MEL ${selectedMel.subItemNumber} — ${selectedMel.title}`,
      restriction: deferral.restrictionText, nextDue: deferral.repairDueDateUtc,
      // CAMP's `MelFlag` is documented as "A, B, C, D **or null**", so a clockless NEF deferral has a
      // legal representation on the vendor side already, and `NEFFlag` is a writable Y/N — see
      // `ref-camp-discrepancy-writable-fields`. Nothing here is invented.
      category: selectedMel.category ?? undefined, nefProgram: isNef || undefined,
      technician: user.displayName, intent: 'CREATE',
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
                  ? 'This item requires an (M) procedure, a placard and/or a crew action → the deferral starts PENDING_PLACARD and the aircraft stays RED until the gating discharge is signed.'
                  : 'No (M) procedure, placard or crew action → the deferral goes ACTIVE on signing and the aircraft moves to AMBER (dispatchable under restriction).'}
              </div>

              {/* D59 — crew action. Provenance is the point: the requirement is authored on the MEL
                  item by the DOM / Chief Inspector, so when it is inherited there is deliberately NO
                  control to clear it here. Line maintenance may only ADD one. */}
              <div className="rounded-md border p-2">
                {crewActionInherited ? (
                  <>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant="destructive">Crew action</Badge>
                      <span className="text-xs text-muted-foreground">per MEL item — DOM/CI</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      The crew (or maintenance) must accomplish the (O) procedure and mark it complied before this
                      aircraft is released on this MEL. A wrongly-flagged item is corrected in MEL management,
                      not on the deferral.
                    </p>
                  </>
                ) : (
                  <label className="flex items-start gap-2">
                    <Checkbox id="deferral-add-crew-action" className="mt-0.5 size-5" checked={addCrewAction} onCheckedChange={(v: unknown) => setAddCrewAction(v === true)} />
                    <span className="text-xs">
                      <span className="font-medium">Crew action required</span> — this MEL item carries none; add one for this deferral.
                    </span>
                  </label>
                )}
                {crewActionRequired && (
                  <div className="mt-2">
                    <label className="text-xs font-medium" htmlFor="deferral-crew-instructions">
                      Crew instructions {addendumRequired ? '(required)' : '(addendum, optional)'}
                    </label>
                    <Textarea id="deferral-crew-instructions" className="mt-1" value={crewActionInstructions} onChange={e => setCrewActionInstructions(e.target.value)}
                      placeholder={addendumRequired
                        ? 'What the crew must accomplish, and how it is verified — there is no (O) text to fall back on.'
                        : 'Anything beyond the (O) procedure text the crew needs — the (O) text itself is carried automatically.'} />
                    {addendumRequired && (
                      <p className="mt-1 text-xs text-[var(--gfo-error-ink,#C81E2B)]">
                        This item carries no (O) procedure text, so these instructions are the only thing the crew will be shown.
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-medium">Restriction / limitation</label>
                <Textarea className="mt-1" value={restriction} onChange={e => setRestriction(e.target.value)} />
              </div>

              <div className="rounded-md border p-2">
                {!showOverride ? (
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1 text-xs"><Clock className="h-3.5 w-3.5 text-muted-foreground" /> Governing timezone <span className="font-medium">Eastern (ET)</span></span>
                    <Button variant="outline" className="h-7 text-xs" onClick={() => setShowOverride(true)}>Override</Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium">Governing timezone — override</span>
                      <Button variant="outline" className="h-7 text-xs" onClick={() => { setShowOverride(false); setGoverningZone(DEFAULT_GOVERNING_TIMEZONE); setOverrideReason(''); }}>Use Eastern</Button>
                    </div>
                    <select className="w-full rounded-md border bg-background px-2 py-1 text-sm" value={governingZone} onChange={e => setGoverningZone(e.target.value)}>
                      {GOVERNING_ZONE_OPTIONS.map(o => <option key={o.zone} value={o.zone}>{o.label}</option>)}
                    </select>
                    {isOverride(governingZone) && (
                      <Textarea placeholder="Reason for override (required) — e.g. aircraft on deployment to KLAX; DOM directs local-day clock." value={overrideReason} onChange={e => setOverrideReason(e.target.value)} />
                    )}
                  </div>
                )}
                {/* D56: defaulted from the defect's occurrence, shown as wall-clock digits in the
                    governing zone (the zone the PL-25 calendar day is actually read in), and
                    adjustable until the deferral is signed. */}
                <div className="mt-2">
                  <label className="text-xs font-medium" htmlFor="deferral-day-of-discovery">Day of discovery</label>
                  <div className="mt-1 flex gap-2">
                    <Input
                      id="deferral-day-of-discovery"
                      type="datetime-local"
                      value={wallTimeFromUtc(dayOfDiscoveryUtc, governingZone)}
                      onChange={e => {
                        const utc = utcFromWallTime(e.target.value, governingZone);
                        if (utc) setDayOfDiscoveryUtc(utc);
                      }}
                    />
                    {/* Mirrors OccurredAtField's zone control, but deliberately NOT a picker: these
                        digits are read in the deferral's GOVERNING zone — the zone the PL-25 calendar
                        day is judged in — so the only way to change their meaning is to change the
                        governing zone above. Without the label, switching that zone silently
                        reinterpreted digits the signer had already typed. */}
                    <span
                      aria-label="Day of discovery timezone"
                      title="Read in the deferral's governing timezone — change it above, not here."
                      className="inline-flex shrink-0 items-center rounded-md border bg-muted px-2 py-1 text-sm text-muted-foreground"
                    >
                      {formatRegulatoryInstant(dayOfDiscoveryUtc, 'GOVERNING', governingZone).zoneLabel}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Stored as {formatRegulatoryLabel(dayOfDiscoveryUtc, 'UTC', 'UTC')}.{' '}
                    {minuteOf(dayOfDiscoveryUtc) === minuteOf(defect.occurredAtUtc)
                      ? 'Defaulted from when the defect was noticed. Adjust if maintenance establishes a different discovery time.'
                      : 'Adjusted — no longer the reported occurrence time.'}
                  </p>
                </div>
                {clockPreview && (
                  <>
                    <p className="mt-2 text-xs text-muted-foreground">clock starts {clockPreview.start}{clockPreview.due ? ` · repair by ${clockPreview.due}` : ' · usage-based'}</p>
                    {clockPreview.groundsInto && (
                      <p className="mt-0.5 text-xs text-muted-foreground">aircraft grounds at the start of {clockPreview.groundsInto}</p>
                    )}
                  </>
                )}
              </div>

              <label className="flex items-start gap-2">
                <Checkbox className="mt-0.5 size-5" checked={ack} onCheckedChange={(v: unknown) => setAck(v === true)} />
                <span className="text-xs">I have reviewed the governing MEL item (revision {selectedMel.mmelRevision}, eff. {selectedMel.effectiveDate}), its category, provisos, (O)/(M) procedures, and placard, and I authorize this deferral.</span>
              </label>

              <div className="flex gap-2">
                <Button variant="outline" onClick={onCancel}>Cancel</Button>
                <Button onClick={beginSign} disabled={!canDeferDefect(user, selectedMel) || !ack || !validateGoverningOverride(governingZone, overrideReason).ok}>Sign deferral</Button>
              </div>
              {!canDeferDefect(user, selectedMel) && <p className="text-xs text-[var(--gfo-error-ink,#C81E2B)]">{user.role === 'MAINTENANCE' ? '' : 'Crew may only defer flight-crew-deferrable (FC-deferrable) MEL items.'}</p>}
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
