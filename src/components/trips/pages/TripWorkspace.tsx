// The trip workspace (D105, direction C): itinerary · record · documents, one page per trip.

import { useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Paperclip, Search, Send } from 'lucide-react';
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
  type Trip, type TripEvent,
} from '../engine/trip';
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
};

export default function TripWorkspace() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { trips, actor, places, update, nowUtc } = useTripsModule();
  const trip = trips.find(t => t.id === id);
  const [draft, setDraft] = useState('');
  const [q, setQ] = useState('');
  const [tail, setTail] = useState(CORE_TAILS[0]);
  const fileRef = useRef<HTMLInputElement>(null);

  const feed = useMemo(() => {
    const qq = q.trim().toLowerCase();
    const all = [...(trip?.events ?? [])].sort((a, b) => a.at.localeCompare(b.at));
    return qq ? all.filter(e => `${eventText(e)} ${e.by.name} ${e.kind}`.toLowerCase().includes(qq)) : all;
  }, [trip?.events, q]);

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
                onClick={() => update(tripId, t => submitItinerary(t, actor, nowUtc()))}>Submit itinerary</Button>
            )}
            {isSched && trip.status === 'submitted' && (
              <div className="flex items-center gap-1.5">
                <select className={field} value={tail} onChange={e => setTail(e.target.value)} aria-label="Aircraft">
                  {CORE_TAILS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <Button size="sm" onClick={() => update(tripId, t => assignTail(t, tail, actor, nowUtc()))}>Assign {tail}</Button>
                <Button size="sm" variant="outline" onClick={() => { const r = window.prompt('Reason (the EA sees this):'); if (r) update(tripId, t => decline(t, actor, r, nowUtc())); }}>Decline</Button>
              </div>
            )}
            {isSched && trip.status === 'draft' && (
              <span className="text-xs text-muted-foreground">A shared draft — nothing can be held until it is submitted.</span>
            )}
          </div>
        }
      />

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
                <div className="gfo-eyebrow mb-1 text-muted-foreground">Leg {i + 1} · {day(leg.date)}</div>
                <div className="font-medium text-primary">{leg.from.placeName} → {leg.to.placeName}</div>
                <div className="text-xs text-muted-foreground">{airportLabel(places, leg.from.airport ?? '?')} → {airportLabel(places, leg.to.airport ?? '?')} · {describeTiming(leg.timing)}</div>
                {isSched && (leg.to.airport === SCHEDULING_DECIDES || !leg.to.airport) && (
                  <Button variant="outline" size="sm" className="mt-2" onClick={askAirport}>Ask about the airport</Button>
                )}
              </div>
            ))}
            {editable && <Button variant="outline" size="sm" onClick={() => update(tripId, t => addLeg(t))}>+ Add a leg</Button>}
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
            <ul className="space-y-1 text-sm">
              <li><span className="text-muted-foreground">21 days out</span> · names for {Math.max(0, trip.seatsHeld - 1)} seats</li>
              <li><span className="text-muted-foreground">72 h out</span> · trip sheet freezes</li>
            </ul>
            <p className="mt-2 text-xs text-muted-foreground">Cutoffs become settings in Phase 3.</p>
          </GfoPanel>
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
