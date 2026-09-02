// A's form, kept: the request builder for trips planned far out. It creates a DRAFT and lands
// on the trip workspace; nothing is sent to scheduling until the EA shares or submits.
// Reached from the calendar too (D → C): ?date=YYYY-MM-DD&to=YYYY-MM-DD pre-fills the legs.

import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../../ui/button';
import { GfoPageHeader, GfoPanel } from '../../gfo';
import { useTripsModule } from '../TripsContext';
import { LEADS } from '../data/tripsStore';
import { LegEditor } from '../components/LegEditor';
import { createDraft, newLeg, submitBlockers, readinessChecks, type TripLeg } from '../engine/trip';
import { usualAirport, type PlaceRecord } from '../engine/places';

const field = 'h-9 rounded-md border border-border bg-input-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring';

function home(places: PlaceRecord[]) {
  const cvg = places.find(p => p.id === 'pl-cvg') ?? places[0];
  return cvg ? { placeName: cvg.name, placeId: cvg.id, airport: usualAirport(cvg)?.icao ?? null } : { placeName: '', placeId: null, airport: null };
}

export default function NewTrip() {
  const { actor, places, create, nowUtc } = useTripsModule();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const [title, setTitle] = useState('');
  const [leadId, setLeadId] = useState(LEADS[0].id);
  const [seats, setSeats] = useState(2);
  const [legs, setLegs] = useState<TripLeg[]>(() => {
    const out = newLeg({ from: home(places), date: params.get('date') });
    const back = newLeg({ to: home(places), date: params.get('to') ?? params.get('date') });
    return [out, back];
  });

  const preview = useMemo(() => createDraft({
    title, leadPassengerId: leadId, leadPassengerName: LEADS.find(l => l.id === leadId)?.name ?? '', seatsHeld: seats, legs, by: actor, nowUtc: '1970-01-01T00:00:00.000Z',
  }), [title, leadId, seats, legs, actor]);
  const blockers = submitBlockers(preview);
  const checks = readinessChecks(preview);

  function updateLegAt(i: number, patch: Partial<Omit<TripLeg, 'id'>>) {
    setLegs(ls => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  }
  function addLegAfterLast() {
    setLegs(ls => [...ls, newLeg({ from: { ...ls[ls.length - 1].to } })]);
  }

  function saveDraft() {
    const trip = createDraft({ title, leadPassengerId: leadId, leadPassengerName: LEADS.find(l => l.id === leadId)?.name ?? '', seatsHeld: seats, legs, by: actor, nowUtc: nowUtc() });
    create(trip);
    navigate(`/trips/${trip.id}`);
  }

  return (
    <div className="mx-auto max-w-[1200px] space-y-4 p-6">
      <GfoPageHeader
        eyebrow="New trip"
        title={title.trim() || 'New trip request'}
        description="Saved as a draft only you can see. Share it or submit it from the trip page."
        actions={<Button onClick={saveDraft}>Save draft</Button>}
      />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <GfoPanel title="Where and when">
            <div className="space-y-3">
              {legs.map((leg, i) => (
                <LegEditor key={leg.id} index={i} leg={leg} places={places} onChange={p => updateLegAt(i, p)}
                  onRemove={legs.length > 1 ? () => setLegs(ls => ls.filter((_, j) => j !== i)) : undefined}
                  missingDate={blockers.some(b => b.legId === leg.id && b.text.includes('date'))} />
              ))}
              <Button variant="outline" size="sm" onClick={addLegAfterLast}>+ Add a leg</Button>
            </div>
          </GfoPanel>
          <GfoPanel title="Who">
            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <label className="gfo-eyebrow mb-1 block text-muted-foreground">Trip name</label>
                <input className={`${field} w-full`} value={title} onChange={e => setTitle(e.target.value)} placeholder="Seattle plant visit" aria-label="Trip name" />
              </div>
              <div>
                <label className="gfo-eyebrow mb-1 block text-muted-foreground">Lead passenger</label>
                <select className={`${field} w-full`} value={leadId} onChange={e => setLeadId(e.target.value)} aria-label="Lead passenger">
                  {LEADS.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
              <div>
                <label className="gfo-eyebrow mb-1 block text-muted-foreground">Seats to hold</label>
                <input type="number" min={1} max={14} className={`${field} w-full`} value={seats} onChange={e => setSeats(Math.max(1, Number(e.target.value) || 1))} aria-label="Seats to hold" />
                <p className="mt-1 text-xs text-muted-foreground">Names come later. The trip page will ask when it matters.</p>
              </div>
            </div>
          </GfoPanel>
        </div>
        <div className="space-y-4">
          <GfoPanel title="Before you submit">
            <ul className="space-y-1.5 text-sm">
              {blockers.map((b, i) => (
                <li key={`b${i}`} className="flex gap-2"><span className="rounded bg-destructive/10 px-1.5 text-xs font-medium text-destructive">blocks</span><span>{b.text}</span></li>
              ))}
              {checks.map((c, i) => (
                <li key={`c${i}`} className="flex gap-2"><span className="rounded bg-amber-500/10 px-1.5 text-xs font-medium text-amber-800 dark:text-amber-400">check</span><span>{c.text}</span></li>
              ))}
              {blockers.length === 0 && checks.length === 0 && <li className="text-muted-foreground">Nothing yet.</li>}
            </ul>
          </GfoPanel>
          <GfoPanel title="What happens next">
            <p className="text-sm text-muted-foreground">Saving opens a trip page with its own record and document space. Scheduling sees nothing until you share or submit, and holds nothing until you submit.</p>
          </GfoPanel>
        </div>
      </div>
    </div>
  );
}
