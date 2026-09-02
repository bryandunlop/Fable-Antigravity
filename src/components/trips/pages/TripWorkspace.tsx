// The trip workspace (D105, direction C): itinerary · record · documents, one page per trip.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, FileText, Mail, Paperclip, Search, Send, Snowflake } from 'lucide-react';
import { Button } from '../../ui/button';
import { GfoPageHeader, GfoPanel } from '../../gfo';
import { cn } from '../../ui/utils';
import { useTripsModule } from '../TripsContext';
import { LEADS } from '../data/tripsStore';
import { LegEditor } from '../components/LegEditor';
import { CORE_TAILS } from '../../../fleet/registry';
import { airportLabel, SCHEDULING_DECIDES } from '../engine/places';
import {
  addDocument, addLeg, askQuestion, assignTail, canSubmit, decline, documentsOf, eventText, postMessage,
  readinessChecks, removeLeg, setHeader, shareDraft, submitBlockers, submitItinerary, updateLeg,
  setCatering, setCrew, setPassengers, bumpTrip, cancelTrip, setBoard, requestChange, decideChange, pendingChanges, passengerEditPolicy, addLegBy, newLeg,
  type Trip, type TripEvent, type DenialCategory, type ChangeRequest,
} from '../engine/trip';
import { cutoffsFor, formatEt, freezeDue, moveCutoff, firstDepartureUtc, isInternational, type CutoffKind } from '../engine/cutoffs';
import { rotationFor, tripsAsRecords } from '../engine/rotation';
import { PlacePicker } from '../components/PlacePicker';
import { freezeSheet, inFreezeWindow, latestSheet } from '../engine/tripSheet';
import { autoSendIfDue, draftEmail, emailDraftOf, emailState } from '../engine/briefingEmail';
import { getCrewRoster } from '../../crew/crewRecords';
import { appendOverlay } from '../../../availability/source';
import { loadAvailabilityData } from '../../../availability/data/availabilityStore';
import { reconcileBoardHolds, releaseAllBoardHolds } from '../engine/board';
import { DENIAL_CATEGORIES, DENIAL_LABEL } from '../engine/metrics';
import { newWatch } from '../engine/watches';
import { describeTiming } from '../../booking-portal/engine/legTiming';

const field = 'h-9 rounded-md border border-border bg-input-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring';

function when(at: string): string {
  return new Date(at).toLocaleString('en-US', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}
function day(d: string | null): string {
  return d ? new Date(`${d}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' }) : 'no date yet';
}

const STATUS_TONE: Record<Trip['status'], string> = {
  draft: 'bg-amber-500/10 text-amber-800 dark:text-amber-400',
  submitted: 'bg-secondary text-secondary-foreground',
  confirmed: 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-400',
  declined: 'bg-destructive/10 text-destructive',
  cancelled: 'bg-muted text-muted-foreground',
};

export default function TripWorkspace() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { trips, allTrips, actor, places, update, nowUtc, settings, sheetCtx, weatherFor, setWatches } = useTripsModule();
  const trip = trips.find(t => t.id === id);
  const [draft, setDraft] = useState('');
  const [q, setQ] = useState('');
  const [tail, setTail] = useState(CORE_TAILS[0]);
  const [moving, setMoving] = useState<{ kind: CutoffKind; date: string; reason: string } | null>(null);
  const [namesText, setNamesText] = useState<string | null>(null);
  const [refusal, setRefusal] = useState<{ kind: 'decline' | 'bump'; category: DenialCategory; note: string } | null>(null);
  const [addingLeg, setAddingLeg] = useState<{ index: number; from: import('../engine/trip').LegEnd; to: import('../engine/trip').LegEnd; date: string } | null>(null);
  const [changing, setChanging] = useState<{ legId: string; date: string; arriveBy: string; to: import('../engine/trip').LegEnd | null; reason: string } | null>(null);
  const roster = useMemo(() => getCrewRoster(nowUtc()), [nowUtc]);
  const fileRef = useRef<HTMLInputElement>(null);

  const feed = useMemo(() => {
    const qq = q.trim().toLowerCase();
    const all = [...(trip?.events ?? [])].sort((a, b) => a.at.localeCompare(b.at));
    return qq ? all.filter(e => `${eventText(e)} ${e.by.name} ${e.kind}`.toLowerCase().includes(qq)) : all;
  }, [trip?.events, q]);

  // The clock does two things on its own: at T-72 the sheet freezes and the email is drafted;
  // past the dead-man timer the email goes. Both are recorded as events; neither needs a person.
  // A minute tick, so a trip left open crosses T-72 and the dead-man deadline without a reload
  // (fresh review, 2026-09-01). In production this is a scheduled job, not a component.
  const [clockTick, setClockTick] = useState(0);
  useEffect(() => {
    const h = window.setInterval(() => setClockTick(t => t + 1), 60_000);
    return () => window.clearInterval(h);
  }, []);
  const tripIdForClock = trip?.id ?? null;
  const tripStatus = trip?.status;
  const hasSheet = !!(trip && latestSheet(trip));
  const draftState = trip ? emailState(trip, nowUtc()).state : 'none';
  useEffect(() => {
    if (!tripIdForClock || (tripStatus !== 'submitted' && tripStatus !== 'confirmed')) return;
    const now = nowUtc();
    update(tripIdForClock, t => {
      let next = t;
      if (!latestSheet(next) && freezeDue(next, settings.cutoffs, now)) {
        const by = { name: 'T-72 clock', role: 'system' as const };
        next = freezeSheet(next, sheetCtx, now, by);
        const sheet = latestSheet(next);
        if (sheet && !emailDraftOf(next)) {
          next = draftEmail(next, sheet, settings.email, settings.passengerPrefs, weatherFor(sheet.legs.map(l => l.to.icao).filter((x): x is string => !!x)), by, now);
        }
      }
      next = autoSendIfDue(next, now);
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripIdForClock, tripStatus, hasSheet, draftState, clockTick]);

  if (!trip) {
    return (
      <div className="mx-auto max-w-[1200px] p-6">
        <GfoPanel><p className="text-sm text-muted-foreground">This trip is not visible to you, or does not exist.</p></GfoPanel>
      </div>
    );
  }

  const tripId = trip.id;
  const isEa = actor.role === 'ea';
  const isSched = actor.role === 'scheduling';
  const editable = trip.status === 'draft' && isEa;
  const blockers = submitBlockers(trip);
  const checks = readinessChecks(trip);
  const docs = documentsOf(trip);
  const cutoffs = cutoffsFor(trip, settings.cutoffs);
  const sheet = latestSheet(trip);
  const email = emailState(trip, nowUtc());
  const live = trip.status === 'submitted' || trip.status === 'confirmed';
  const canFreezeNow = isSched && live && !sheet && inFreezeWindow(trip, settings.cutoffs.freezeHours * 3, nowUtc());
  const dep = firstDepartureUtc(trip);
  const hoursToDeparture = dep ? (Date.parse(dep) - Date.parse(nowUtc())) / 3_600_000 : null;
  const paxPolicy = passengerEditPolicy(hoursToDeparture, isInternational(trip), settings.cutoffs.namesDomesticHours, settings.cutoffs.namesInternationalHours);
  const pending = pendingChanges(trip);
  const rotation = (() => {
    if (!trip.tail) return [];
    const dates = trip.legs.map(l => l.date).filter((d): d is string => !!d).sort();
    if (dates.length === 0) return [];
    const from = new Date(Date.parse(`${dates[0]}T00:00:00Z`) - 2 * 86_400_000).toISOString().slice(0, 10);
    const to = new Date(Date.parse(`${dates[dates.length - 1]}T00:00:00Z`) + 3 * 86_400_000).toISOString().slice(0, 10);
    return rotationFor(trip.tail, tripsAsRecords(allTrips), from, to);
  })();
  function submitChange() {
    if (!changing) return;
    const leg = trip!.legs.find(l => l.id === changing.legId)!;
    const patch: ChangeRequest['patch'] = {};
    if (changing.date && changing.date !== leg.date) patch.date = changing.date;
    if (changing.arriveBy) patch.timing = { kind: 'arrive', arriveByLocal: changing.arriveBy };
    if (changing.to && changing.to.placeName && (changing.to.placeName !== leg.to.placeName || changing.to.airport !== leg.to.airport)) patch.to = changing.to;
    update(tripId, t => requestChange(t, changing.legId, patch, changing.reason, actor, nowUtc()));
    setChanging(null);
  }

  function freezeNow() {
    const now = nowUtc();
    update(tripId, t => {
      let next = freezeSheet(t, sheetCtx, now, actor);
      const sh = latestSheet(next);
      if (sh && !emailDraftOf(next)) {
        next = draftEmail(next, sh, settings.email, settings.passengerPrefs, weatherFor(sh.legs.map(l => l.to.icao).filter((x): x is string => !!x)), actor, now);
      }
      return next;
    });
  }
  /** Board trips: make the fleet-wide holds match the trip's window (engine/board.ts). */
  function syncBoardHolds(t: Trip) {
    if (!t.board || (t.status !== 'submitted' && t.status !== 'confirmed')) return;
    const now = nowUtc();
    for (const o of reconcileBoardHolds(t, t.board, loadAvailabilityData(now).overlays, actor, now)) appendOverlay(o, now);
  }
  function releaseBoardHolds(t: Trip) {
    const now = nowUtc();
    for (const o of releaseAllBoardHolds(t, loadAvailabilityData(now).overlays, actor, now)) appendOverlay(o, now);
  }
  // React runs a functional state updater during render, not inside the handler, so anything
  // that must happen AFTER the new trip exists is computed from the current trip here and the
  // updater just installs it.
  function submitNow() {
    const after = submitItinerary(trip!, actor, nowUtc());
    update(tripId, () => after);
    syncBoardHolds(after);
  }
  function confirmRefusal() {
    if (!refusal) return;
    const now = nowUtc();
    const after = refusal.kind === 'decline' ? decline(trip!, actor, refusal.note, now, refusal.category) : bumpTrip(trip!, actor, refusal.category, refusal.note, now);
    update(tripId, () => after);
    if (after.status === 'declined') releaseBoardHolds(after);
    setRefusal(null);
  }
  function watchTheseDates() {
    const dates = trip!.legs.map(l => l.date).filter((d): d is string => !!d).sort();
    if (dates.length === 0) return;
    setWatches(ws => [...ws, newWatch({ cabin: 'any', fromDate: dates[0], toDate: dates[dates.length - 1], forName: trip!.leadPassengerName, seats: trip!.seatsHeld, createdBy: actor.name, fromTripId: trip!.id }, nowUtc())]);
    navigate('/trips/watches');
  }
  function saveNames() {
    if (namesText === null) return;
    update(tripId, t => setPassengers(t, namesText.split(',').map(x => x.trim()).filter(Boolean), actor, nowUtc()));
    setNamesText(null);
  }

  function send() {
    if (!draft.trim()) return;
    update(tripId, t => postMessage(t, actor, draft, nowUtc()));
    setDraft('');
  }
  function askAirport() {
    const text = window.prompt('Ask the EA about the airport:', 'Which airport works for this leg?');
    if (text) update(tripId, t => askQuestion(t, actor, 'airport', text, nowUtc()));
  }
  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const small = f.size <= 200_000;
    const finish = (dataUrl?: string) =>
      update(tripId, t => addDocument(t, actor, { name: f.name, sizeBytes: f.size, dataUrl, tag: { kind: 'trip' }, visibleTo: ['ea', 'scheduling'] }, nowUtc()));
    if (small) { const r = new FileReader(); r.onload = () => finish(String(r.result)); r.readAsDataURL(f); } else finish();
    e.target.value = '';
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-4 p-6">
      <GfoPageHeader
        eyebrow={<span className="inline-flex items-center gap-2"><button onClick={() => navigate('/trips')} className="inline-flex items-center gap-1 hover:text-primary"><ArrowLeft className="h-3.5 w-3.5" />Trips</button></span> as unknown as string}
        title={trip.title}
        description={`${trip.leadPassengerName} + ${Math.max(0, trip.seatsHeld - 1)} · ${trip.tail ?? 'no aircraft yet'} · created by ${trip.createdBy.name}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn('rounded px-2 py-0.5 text-xs font-medium', STATUS_TONE[trip.status])}>
              {trip.status === 'draft' ? (trip.visibleToScheduling ? 'Draft · shared' : 'Draft · private') : trip.status[0].toUpperCase() + trip.status.slice(1)}
            </span>
            {isEa && trip.status === 'draft' && !trip.visibleToScheduling && (
              <Button variant="outline" size="sm" onClick={() => update(tripId, t => shareDraft(t, actor, nowUtc()))}>Share draft with scheduling</Button>
            )}
            {isEa && trip.status === 'draft' && (
              <Button size="sm" disabled={!canSubmit(trip)} title={blockers.map(b => b.text).join(' · ') || undefined}
                onClick={submitNow}>Submit itinerary</Button>
            )}
            {isSched && trip.status === 'submitted' && (
              <div className="flex items-center gap-1.5">
                <select className={field} value={tail} onChange={e => setTail(e.target.value)} aria-label="Aircraft">
                  {CORE_TAILS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <Button size="sm" onClick={() => update(tripId, t => assignTail(t, tail, actor, nowUtc()))}>Assign {tail}</Button>
                <Button size="sm" variant="outline" onClick={() => setRefusal({ kind: 'decline', category: 'no-crew', note: '' })}>Decline</Button>
              </div>
            )}
            {isSched && trip.status === 'confirmed' && (
              <Button size="sm" variant="outline" onClick={() => setRefusal({ kind: 'bump', category: 'senior-conflict', note: '' })}>Bump off {trip.tail}</Button>
            )}
            {isEa && (trip.status === 'submitted' || trip.status === 'confirmed' || trip.status === 'draft') && (
              <Button size="sm" variant="ghost" onClick={() => { const r = window.prompt('Cancel this trip — why?'); if (r !== null) { const after = cancelTrip(trip, actor, r, nowUtc()); update(tripId, () => after); releaseBoardHolds(after); } }}>Cancel trip</Button>
            )}
            {isEa && trip.status === 'declined' && (
              <Button size="sm" variant="outline" onClick={watchTheseDates}>Watch these dates</Button>
            )}
            {isSched && trip.status === 'draft' && (
              <span className="text-xs text-muted-foreground">A shared draft — nothing can be held until it is submitted.</span>
            )}
          </div>
        }
      />

      {refusal && (
        <GfoPanel title={refusal.kind === 'decline' ? 'Decline this request' : `Bump this trip off ${trip.tail}`}>
          <div className="grid gap-3 md:grid-cols-[260px_1fr_auto_auto]">
            <select className={field} value={refusal.category} aria-label="Reason category" onChange={e => setRefusal({ ...refusal, category: e.target.value as DenialCategory })}>
              {DENIAL_CATEGORIES.map(c => <option key={c} value={c}>{DENIAL_LABEL[c]}</option>)}
            </select>
            <input className={field} value={refusal.note} placeholder="A line the EA reads (optional)" aria-label="Reason note" onChange={e => setRefusal({ ...refusal, note: e.target.value })} />
            <Button size="sm" onClick={confirmRefusal}>{refusal.kind === 'decline' ? 'Decline' : 'Bump'}</Button>
            <Button size="sm" variant="outline" onClick={() => setRefusal(null)}>Cancel</Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">The category is what the metrics count. {refusal.kind === 'bump' ? 'The trip returns to the queue without an aircraft.' : 'The EA can watch these dates for an opening.'}</p>
        </GfoPanel>
      )}

      <div className="grid gap-4 xl:grid-cols-[1.1fr_1.3fr_0.9fr]">
        {/* ── Itinerary ── */}
        <GfoPanel title="Itinerary">
          <div className="space-y-3">
            {trip.legs.map((leg, i) => editable ? (
              <LegEditor key={leg.id} index={i} leg={leg} places={places}
                onChange={p => update(tripId, t => updateLeg(t, leg.id, p))}
                onRemove={trip.legs.length > 1 ? () => update(tripId, t => removeLeg(t, leg.id)) : undefined}
                missingDate={blockers.some(b => b.legId === leg.id && b.text.includes('date'))} />
            ) : (
              <div key={leg.id} className="rounded-md border border-border p-3 text-sm">
                <div className="gfo-eyebrow mb-1 text-muted-foreground">Leg {i + 1} · {day(leg.date)}{leg.positioning ? ' · positioning · nobody aboard' : ''}</div>
                <div className="font-medium text-primary">{leg.from.placeName} → {leg.to.placeName}</div>
                <div className="text-xs text-muted-foreground">{airportLabel(places, leg.from.airport ?? '?')} → {airportLabel(places, leg.to.airport ?? '?')} · {describeTiming(leg.timing)}</div>
                {isSched && (leg.to.airport === SCHEDULING_DECIDES || !leg.to.airport) && (
                  <Button variant="outline" size="sm" className="mt-2" onClick={askAirport}>Ask about the airport</Button>
                )}
                {pending.filter(c => c.legId === leg.id).map(c => (
                  <div key={c.id} className="mt-2 rounded-md border border-amber-500/40 bg-amber-500/5 p-2 text-xs">
                    <div className="font-medium text-amber-800 dark:text-amber-400">Change requested{c.reason ? ` — ${c.reason}` : ''}</div>
                    <div className="text-muted-foreground">
                      {c.patch.date && <span>date → {c.patch.date} · </span>}
                      {c.patch.timing?.kind === 'arrive' && <span>be there by {c.patch.timing.arriveByLocal} · </span>}
                      {c.patch.to && <span>to → {c.patch.to.placeName}{c.patch.to.airport ? ` (${c.patch.to.airport})` : ''}</span>}
                    </div>
                    {isSched && (
                      <div className="mt-1.5 flex gap-1.5">
                        <Button size="sm" onClick={() => update(tripId, t => decideChange(t, c.id, true, '', actor, nowUtc()))}>Approve</Button>
                        <Button size="sm" variant="outline" onClick={() => { const n = window.prompt('Why not? (the EA reads this)') ?? ''; update(tripId, t => decideChange(t, c.id, false, n, actor, nowUtc())); }}>Decline</Button>
                      </div>
                    )}
                    {isEa && <div className="mt-1 text-muted-foreground">Waiting on scheduling. The itinerary does not move until they approve.</div>}
                  </div>
                ))}
                {isEa && live && !pending.some(c => c.legId === leg.id) && changing?.legId !== leg.id && (
                  <Button variant="outline" size="sm" className="mt-2" onClick={() => setChanging({ legId: leg.id, date: leg.date ?? '', arriveBy: leg.timing.kind === 'arrive' ? leg.timing.arriveByLocal : '', to: null, reason: '' })}>Request a change</Button>
                )}
                {changing?.legId === leg.id && (
                  <div className="mt-2 space-y-2 rounded-md border border-border p-2">
                    <div className="grid grid-cols-2 gap-2">
                      <label className="text-xs text-muted-foreground">New date<input type="date" className={`${field} mt-0.5 w-full`} value={changing.date} aria-label="New date" onChange={e => setChanging({ ...changing, date: e.target.value })} /></label>
                      <label className="text-xs text-muted-foreground">Be there by<input type="time" className={`${field} mt-0.5 w-full`} value={changing.arriveBy} aria-label="New arrive by" onChange={e => setChanging({ ...changing, arriveBy: e.target.value })} /></label>
                    </div>
                    <PlacePicker label="New destination (optional)" value={changing.to ?? { placeName: '', placeId: null, airport: null }} places={places} onChange={to => setChanging({ ...changing, to })} />
                    <input className={`${field} w-full`} value={changing.reason} placeholder="Why — scheduling reads this" aria-label="Change reason" onChange={e => setChanging({ ...changing, reason: e.target.value })} />
                    <div className="flex gap-1.5">
                      <Button size="sm" onClick={submitChange} disabled={!changing.reason.trim()}>Ask scheduling</Button>
                      <Button size="sm" variant="outline" onClick={() => setChanging(null)}>Cancel</Button>
                    </div>
                  </div>
                )}
                {live && (isEa || isSched) && (
                  <label className="mt-2 block">
                    <span className="gfo-eyebrow text-muted-foreground">Catering</span>
                    <input className={`${field} mt-0.5 w-full`} defaultValue={leg.catering ?? ''} placeholder="Nothing loaded yet" aria-label={`Catering leg ${i + 1}`}
                      onBlur={e => { if ((leg.catering ?? '') !== e.target.value.trim()) update(tripId, t => setCatering(t, leg.id, e.target.value, actor, nowUtc())); }} />
                  </label>
                )}
              </div>
            ))}
            {editable && <Button variant="outline" size="sm" onClick={() => update(tripId, t => addLeg(t))}>+ Add a leg</Button>}
            {isSched && live && !addingLeg && (
              <Button variant="outline" size="sm" onClick={() => setAddingLeg({ index: 0, from: { placeName: 'Cincinnati', placeId: 'pl-cvg', airport: 'KLUK' }, to: { ...trip.legs[0].from }, date: trip.legs[0].date ?? '' })}>+ Add a positioning leg</Button>
            )}
            {addingLeg && (
              <div className="space-y-2 rounded-md border border-dashed border-emerald-600/60 p-3">
                <div className="gfo-eyebrow text-emerald-800 dark:text-emerald-300">Positioning leg · nobody aboard</div>
                <div className="grid gap-2 md:grid-cols-2">
                  <PlacePicker label="From" value={addingLeg.from} places={places} onChange={from => setAddingLeg({ ...addingLeg, from })} />
                  <PlacePicker label="To" value={addingLeg.to} places={places} onChange={to => setAddingLeg({ ...addingLeg, to })} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-xs text-muted-foreground">Date<input type="date" className={`${field} mt-0.5 w-full`} value={addingLeg.date} aria-label="Positioning leg date" onChange={e => setAddingLeg({ ...addingLeg, date: e.target.value })} /></label>
                  <label className="text-xs text-muted-foreground">Insert<select className={`${field} mt-0.5 w-full`} value={addingLeg.index} aria-label="Insert position" onChange={e => setAddingLeg({ ...addingLeg, index: Number(e.target.value) })}>
                    <option value={0}>before leg 1</option>
                    {trip.legs.map((_, i) => <option key={i + 1} value={i + 1}>after leg {i + 1}</option>)}
                  </select></label>
                </div>
                <div className="flex gap-1.5">
                  <Button size="sm" disabled={!addingLeg.date || !addingLeg.from.placeName || !addingLeg.to.placeName} onClick={() => { update(tripId, t => addLegBy(t, addingLeg.index, { ...newLeg(), from: addingLeg.from, to: addingLeg.to, date: addingLeg.date, timing: { kind: 'flexible' }, positioning: true }, actor, nowUtc())); setAddingLeg(null); }}>Add it</Button>
                  <Button size="sm" variant="outline" onClick={() => setAddingLeg(null)}>Cancel</Button>
                </div>
                <p className="text-xs text-muted-foreground">Reads 'potentially open' on the fleet schedule; a rider could take it. In Phase 2 a leg entered in myairops arrives here the same way.</p>
              </div>
            )}
          </div>

          <div className="mt-4 grid gap-3 border-t border-border pt-4 text-sm md:grid-cols-2">
            <div>
              <label className="gfo-eyebrow mb-1 block text-muted-foreground">Lead</label>
              {editable ? (
                <select className={`${field} w-full`} value={trip.leadPassengerId} aria-label="Lead passenger"
                  onChange={e => update(tripId, t => setHeader(t, { leadPassengerId: e.target.value, leadPassengerName: LEADS.find(l => l.id === e.target.value)?.name ?? '' }))}>
                  {LEADS.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              ) : <div>{trip.leadPassengerName}</div>}
            </div>
            <div>
              <label className="gfo-eyebrow mb-1 block text-muted-foreground">Seats to hold</label>
              {editable ? (
                <input type="number" min={1} max={14} className={`${field} w-full`} value={trip.seatsHeld} aria-label="Seats to hold"
                  onChange={e => update(tripId, t => setHeader(t, { seatsHeld: Math.max(1, Number(e.target.value) || 1) }))} />
              ) : <div>{trip.seatsHeld}</div>}
            </div>
            {live && (
              <div className="md:col-span-2">
                <label className="gfo-eyebrow mb-1 block text-muted-foreground">Names so far · {trip.passengerNames.length} of {trip.seatsHeld}</label>
                {isEa && paxPolicy === 'free' ? (
                  <div className="flex gap-1.5">
                    <input className={`${field} flex-1`} value={namesText ?? trip.passengerNames.join(', ')} aria-label="Passenger names"
                      onChange={e => setNamesText(e.target.value)} onBlur={saveNames} onKeyDown={e => e.key === 'Enter' && saveNames()} placeholder="Comma-separated" />
                  </div>
                ) : isEa ? (
                  <div>
                    <div>{trip.passengerNames.join(' · ')}</div>
                    <p className="mt-1 text-xs text-amber-800 dark:text-amber-400">
                      {paxPolicy === 'locked' ? 'Departed — the list is closed.' : `Inside the ${isInternational(trip) ? 'international' : 'domestic'} names cutoff — ask scheduling in the record to change who is aboard.`}
                    </p>
                  </div>
                ) : <div>{trip.passengerNames.join(' · ')}</div>}
                {trip.passengerNames.length < trip.seatsHeld && <p className="mt-1 text-xs text-muted-foreground">{trip.seatsHeld - trip.passengerNames.length} seat{trip.seatsHeld - trip.passengerNames.length === 1 ? '' : 's'} still unnamed.</p>}
              </div>
            )}
            {live && trip.tail && (
              <div className="md:col-span-2">
                <label className="gfo-eyebrow mb-1 block text-muted-foreground">Crew</label>
                {isSched ? (
                  <div className="grid grid-cols-3 gap-1.5">
                    {(['PIC', 'SIC', 'FA'] as const).map(role => (
                      <select key={role} className={`${field} w-full`} aria-label={role}
                        value={role === 'PIC' ? trip.crew?.pic ?? '' : role === 'SIC' ? trip.crew?.sic ?? '' : trip.crew?.fa ?? ''}
                        onChange={e => update(tripId, t => setCrew(t, { pic: t.crew?.pic ?? '', sic: t.crew?.sic ?? '', fa: t.crew?.fa ?? null, [role === 'PIC' ? 'pic' : role === 'SIC' ? 'sic' : 'fa']: e.target.value || (role === 'FA' ? null : '') }, actor, nowUtc()))}>
                        <option value="">{role} —</option>
                        {roster.filter(c => c.role === role).map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                      </select>
                    ))}
                  </div>
                ) : <div>{trip.crew ? `${trip.crew.pic} · ${trip.crew.sic}${trip.crew.fa ? ` · ${trip.crew.fa}` : ''}` : <span className="text-muted-foreground">not yet assigned</span>}</div>}
              </div>
            )}
            {(editable || trip.board) && (
              <div className="md:col-span-2 rounded-md border border-dashed border-border p-2">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={!!trip.board} disabled={!editable} aria-label="Board trip"
                    onChange={e => update(tripId, t => setBoard(t, e.target.checked ? { fromDate: t.legs[0]?.date ?? '', toDate: t.legs.at(-1)?.date ?? t.legs[0]?.date ?? '', tailsNeeded: CORE_TAILS.length } : null, actor, nowUtc()))} />
                  <span className="font-medium">Board of directors trip</span>
                  <span className="text-xs text-muted-foreground">blocks the fleet across its window when submitted; give days back by narrowing</span>
                </label>
                {trip.board && (
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    <label className="text-xs text-muted-foreground">Window from<input type="date" className={`${field} mt-0.5 w-full`} value={trip.board.fromDate} disabled={!editable && !isSched} aria-label="Board window from"
                      onChange={e => { const after = setBoard(trip, { ...trip.board!, fromDate: e.target.value }, actor, nowUtc()); update(tripId, () => after); syncBoardHolds(after); }} /></label>
                    <label className="text-xs text-muted-foreground">to<input type="date" className={`${field} mt-0.5 w-full`} value={trip.board.toDate} disabled={!editable && !isSched} aria-label="Board window to"
                      onChange={e => { const after = setBoard(trip, { ...trip.board!, toDate: e.target.value }, actor, nowUtc()); update(tripId, () => after); syncBoardHolds(after); }} /></label>
                    <label className="text-xs text-muted-foreground">Aircraft needed<select className={`${field} mt-0.5 w-full`} value={trip.board.tailsNeeded} disabled={!editable && !isSched} aria-label="Aircraft needed"
                      onChange={e => { const after = setBoard(trip, { ...trip.board!, tailsNeeded: Number(e.target.value) }, actor, nowUtc()); update(tripId, () => after); syncBoardHolds(after); }}>
                      {CORE_TAILS.map((_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
                    </select></label>
                  </div>
                )}
              </div>
            )}
            {editable && (
              <div className="md:col-span-2">
                <label className="gfo-eyebrow mb-1 block text-muted-foreground">Trip name</label>
                <input className={`${field} w-full`} value={trip.title} aria-label="Trip name" onChange={e => update(tripId, t => setHeader(t, { title: e.target.value }))} />
              </div>
            )}
          </div>

          {trip.status === 'draft' && (
            <div className="mt-4 border-t border-border pt-4 text-sm">
              <div className="gfo-eyebrow mb-1.5 text-muted-foreground">Before you submit</div>
              <ul className="space-y-1">
                {blockers.map((b, i) => <li key={`b${i}`} className="flex gap-2"><span className="rounded bg-destructive/10 px-1.5 text-xs font-medium text-destructive">blocks</span>{b.text}</li>)}
                {checks.map((c, i) => <li key={`c${i}`} className="flex gap-2"><span className="rounded bg-amber-500/10 px-1.5 text-xs font-medium text-amber-800 dark:text-amber-400">check</span>{c.text}</li>)}
              </ul>
              <p className="mt-2 text-xs text-muted-foreground">Scheduling cannot hold an aircraft until the itinerary is submitted.</p>
            </div>
          )}
        </GfoPanel>

        {/* ── Record ── */}
        <GfoPanel
          title="Record"
          action={
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search this trip…" aria-label="Search this trip"
                className="h-8 w-48 rounded-md border border-border bg-input-background pl-7 pr-2 text-xs outline-none focus:ring-2 focus:ring-ring" />
            </div>
          }
        >
          <ol className="space-y-3">
            {feed.map(e => <EventRow key={e.id} e={e} />)}
            {feed.length === 0 && <li className="text-sm text-muted-foreground">Nothing matches.</li>}
          </ol>
          {(isEa || isSched) && (
            <div className="mt-4 flex items-center gap-2 border-t border-border pt-4">
              <input value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()}
                placeholder={isSched && !trip.visibleToScheduling ? 'Not visible to scheduling yet' : isSched ? 'Message the EA…' : 'Message scheduling…'}
                disabled={isSched && !trip.visibleToScheduling}
                aria-label="Message" className={`${field} flex-1`} />
              <input ref={fileRef} type="file" className="hidden" onChange={onFile} aria-label="Attach a file" />
              <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} title="Attach a file"><Paperclip className="h-4 w-4" /></Button>
              <Button size="sm" onClick={send} disabled={!draft.trim()}><Send className="mr-1.5 h-4 w-4" />Send</Button>
            </div>
          )}
          {isEa && !trip.visibleToScheduling && (
            <p className="mt-2 text-xs text-muted-foreground">Only you can see this record until you share or submit.</p>
          )}
        </GfoPanel>

        {/* ── Documents + coming up ── */}
        <div className="space-y-4">
          <GfoPanel title="Documents" action={<Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}><Paperclip className="mr-1.5 h-4 w-4" />Add</Button>}>
            {docs.length === 0 && <p className="text-sm text-muted-foreground">Nothing yet. Drop the agenda, passports, anything the trip needs.</p>}
            <ul className="divide-y divide-border text-sm">
              {docs.map(d => (
                <li key={d.id} className="flex items-center justify-between py-2">
                  <span className="min-w-0">
                    {d.dataUrl ? <a href={d.dataUrl} download={d.name} className="truncate font-medium text-primary hover:underline">{d.name}</a> : <span className="truncate font-medium">{d.name}</span>}
                    <span className="block text-xs text-muted-foreground">{(d.sizeBytes / 1024).toFixed(0)} KB · {d.tag.kind === 'leg' ? `leg ${trip.legs.findIndex(l => l.id === (d.tag as { legId: string }).legId) + 1}` : d.tag.kind === 'passenger' ? d.tag.name : 'trip'}</span>
                  </span>
                  <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">EA + scheduling</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-muted-foreground">Crew never see these here. Scheduling sends what the crew needs, later.</p>
          </GfoPanel>
          <GfoPanel title="Coming up">
            {cutoffs.length === 0 && <p className="text-sm text-muted-foreground">Give the first leg a date and the cutoffs appear.</p>}
            <ul className="space-y-2 text-sm">
              {cutoffs.map(c => (
                <li key={c.kind}>
                  <div className="flex items-start justify-between gap-2">
                    <span>
                      <span className="block">{c.label}</span>
                      <span className={cn('block text-xs', c.dueUtc < nowUtc() ? 'text-muted-foreground line-through' : 'text-muted-foreground')}>{formatEt(c.dueUtc)}{c.source === 'override' && <span className="ml-1 rounded bg-amber-500/10 px-1 text-[10px] font-medium text-amber-800 dark:text-amber-400">moved</span>}</span>
                      {c.source === 'override' && <span className="block text-[11px] text-muted-foreground">{c.movedBy}: {c.reason}</span>}
                    </span>
                    {isSched && live && moving?.kind !== c.kind && (
                      <button className="text-xs text-accent hover:underline" onClick={() => setMoving({ kind: c.kind, date: c.dueUtc.slice(0, 10), reason: '' })}>Move</button>
                    )}
                  </div>
                  {moving?.kind === c.kind && (
                    <div className="mt-1.5 space-y-1.5 rounded-md border border-border p-2">
                      <input type="date" className={`${field} w-full`} value={moving.date} aria-label="New date" onChange={e => setMoving({ ...moving, date: e.target.value })} />
                      <input className={`${field} w-full`} value={moving.reason} placeholder="Why — the record keeps it" aria-label="Reason" onChange={e => setMoving({ ...moving, reason: e.target.value })} />
                      <div className="flex gap-1.5">
                        <Button size="sm" disabled={!moving.reason.trim() || !moving.date} onClick={() => { update(tripId, t => moveCutoff(t, moving.kind, `${moving.date}T13:00:00.000Z`, moving.reason, actor, nowUtc())); setMoving(null); }}>Move it</Button>
                        <Button size="sm" variant="outline" onClick={() => setMoving(null)}>Cancel</Button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-muted-foreground">Defaults from Trip settings; a move here is this trip only.</p>
          </GfoPanel>

          {isSched && trip.tail && rotation.length > 0 && (
            <GfoPanel title={`${trip.tail} around this trip`}>
              <ul className="space-y-1 text-sm">
                {rotation.map((r, i) => (
                  <li key={i} className={cn('flex items-center justify-between gap-2', r.kind !== 'passenger' && 'text-emerald-800 dark:text-emerald-300')}>
                    <span>{r.dateUtc.slice(5)} · {r.from} → {r.to}{r.kind === 'ferry' ? ' · empty · potentially open' : r.kind === 'return' ? ' · empty return · potentially open' : r.kind === 'positioning' ? ' · positioning · potentially open' : ''}</span>
                    <span className="text-xs text-muted-foreground">{r.kind === 'passenger' ? (r.tripId === trip.id ? 'this trip' : r.title) : ''}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-muted-foreground">Every leg this aircraft flies around these dates, across trips. An empty leg is one a rider could take.</p>
            </GfoPanel>
          )}

          {live && (
            <GfoPanel title="The 72-hour moment">
              {!sheet && (
                <div className="space-y-2 text-sm">
                  <p className="text-muted-foreground">The trip sheet freezes and the passenger email is drafted at {cutoffs.find(c => c.kind === 'freeze') ? formatEt(cutoffs.find(c => c.kind === 'freeze')!.dueUtc) : 'T-72'}.</p>
                  {canFreezeNow && <Button size="sm" variant="outline" onClick={freezeNow}><Snowflake className="mr-1.5 h-4 w-4" />Freeze now</Button>}
                  {isSched && live && !canFreezeNow && <p className="text-xs text-muted-foreground">Freeze early becomes available inside {settings.cutoffs.freezeHours * 3} h of departure.</p>}
                </div>
              )}
              {sheet && (
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between"><span>Trip sheet v{sheet.version}</span><Button size="sm" variant="outline" onClick={() => navigate(`/trips/${trip.id}/sheet`)}><FileText className="mr-1.5 h-4 w-4" />Open</Button></div>
                  <div className="flex items-center justify-between">
                    <span>
                      Passenger email
                      <span className="block text-xs text-muted-foreground">
                        {email.state === 'drafted' && `drafted · sends itself in ${email.hoursLeft.toFixed(1)} h if nobody does`}
                        {email.state === 'sent' && (email.auto ? `auto-sent unreviewed · ${formatEt(email.at)}` : `sent · ${formatEt(email.at)}`)}
                        {email.state === 'none' && 'not drafted'}
                      </span>
                    </span>
                    <Button size="sm" variant="outline" onClick={() => navigate(`/trips/${trip.id}/email`)}><Mail className="mr-1.5 h-4 w-4" />Open</Button>
                  </div>
                </div>
              )}
            </GfoPanel>
          )}
        </div>
      </div>
    </div>
  );
}

function EventRow({ e }: { e: TripEvent }) {
  const system = e.kind !== 'message' && e.kind !== 'question';
  if (system) {
    return (
      <li className="border-l-2 border-border pl-3 text-xs text-muted-foreground">
        {eventText(e)} · {e.by.name} · {when(e.at)}
      </li>
    );
  }
  const initials = e.by.name.split(' ').map(s => s[0]).join('').slice(0, 2).toUpperCase();
  return (
    <li className="flex gap-2.5">
      <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold', e.by.role === 'scheduling' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground')}>{initials}</span>
      <div className="min-w-0">
        <div className="text-xs"><span className="font-semibold text-primary">{e.by.name}</span><span className="ml-1.5 text-muted-foreground">{e.by.role === 'scheduling' ? 'Scheduling' : e.by.role === 'ea' ? 'EA' : e.by.role} · {when(e.at)}</span></div>
        <p className="text-sm leading-relaxed">
          {e.kind === 'question' && <span className="mr-1.5 rounded bg-amber-500/10 px-1.5 py-0.5 text-[11px] font-medium text-amber-800 dark:text-amber-400">question · {e.about}</span>}
          {e.text}
        </p>
      </div>
    </li>
  );
}
