// Watches (D107): a cabin and a window; fires with a pre-filled request when something opens.

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, X } from 'lucide-react';
import { Button } from '../../ui/button';
import { GfoPageHeader, GfoPanel } from '../../gfo';
import { cn } from '../../ui/utils';
import { useTripsModule } from '../TripsContext';
import { LEADS } from '../data/tripsStore';
import { readFleetAvailability } from '../../../availability/source';
import { useTrips } from '../../hooks/useFleetAvailability';
import { dismissWatch, evaluateWatches, freeByCabin, newWatch, type WatchCabin } from '../engine/watches';

const field = 'h-9 rounded-md border border-border bg-input-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring';
const CABIN_LABEL: Record<WatchCabin, string> = { big: 'Big cabin (G650ER)', standard: 'Standard cabin (G500)', any: 'Any aircraft' };

export default function WatchesPage() {
  const { watches, setWatches, actor, nowUtc } = useTripsModule();
  const navigate = useNavigate();
  const schedTrips = useTrips();
  const [form, setForm] = useState({ cabin: 'big' as WatchCabin, from: '', to: '', forName: LEADS[0].name, seats: 2 });

  // Evaluate against today's picture every time the page opens or the fleet changes.
  const free = useMemo(() => freeByCabin(readFleetAvailability({ trips: schedTrips }, nowUtc(), 400)), [schedTrips, nowUtc]);
  useEffect(() => { setWatches(ws => evaluateWatches(ws, free, nowUtc())); }, [free, nowUtc, setWatches]);

  const mine = actor.role === 'scheduling' ? watches : watches.filter(w => w.createdBy === actor.name);
  const fired = mine.filter(w => w.status === 'fired');
  const watching = mine.filter(w => w.status === 'watching');
  const done = mine.filter(w => w.status === 'expired' || w.status === 'dismissed');

  function add() {
    if (!form.from || !form.to || form.to < form.from) return;
    setWatches(ws => [...ws, newWatch({ cabin: form.cabin, fromDate: form.from, toDate: form.to, forName: form.forName, seats: form.seats, createdBy: actor.name }, nowUtc())]);
    setForm(f => ({ ...f, from: '', to: '' }));
  }

  return (
    <div className="mx-auto max-w-[1000px] space-y-4 p-6">
      <GfoPageHeader eyebrow="Trips" title="Watches" description="A watch reserves nothing. When the cabin you need comes free on a day in your window, you get a request already filled in." />
      {actor.role === 'ea' && (
        <GfoPanel title="Watch for an opening">
          <div className="grid gap-3 md:grid-cols-[1fr_140px_140px_1fr_90px_auto]">
            <select className={field} value={form.cabin} onChange={e => setForm({ ...form, cabin: e.target.value as WatchCabin })} aria-label="Cabin">{(Object.keys(CABIN_LABEL) as WatchCabin[]).map(c => <option key={c} value={c}>{CABIN_LABEL[c]}</option>)}</select>
            <input type="date" className={field} value={form.from} onChange={e => setForm({ ...form, from: e.target.value })} aria-label="From" />
            <input type="date" className={field} value={form.to} onChange={e => setForm({ ...form, to: e.target.value })} aria-label="To" />
            <select className={field} value={form.forName} onChange={e => setForm({ ...form, forName: e.target.value })} aria-label="For">{LEADS.map(l => <option key={l.id} value={l.name}>{l.name}</option>)}</select>
            <input type="number" min={1} className={field} value={form.seats} onChange={e => setForm({ ...form, seats: Math.max(1, Number(e.target.value) || 1) })} aria-label="Seats" />
            <Button onClick={add} disabled={!form.from || !form.to}><Bell className="mr-1.5 h-4 w-4" />Watch</Button>
          </div>
        </GfoPanel>
      )}
      {fired.length > 0 && (
        <GfoPanel title="Something opened">
          <ul className="divide-y divide-border">
            {fired.map(w => (
              <li key={w.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <span><span className="font-medium text-primary">{CABIN_LABEL[w.cabin]}</span> free on {w.firedForDate} · you watched {w.fromDate} – {w.toDate} for {w.forName} + {Math.max(0, w.seats - 1)}</span>
                <span className="flex gap-1.5">
                  <Button size="sm" onClick={() => { setWatches(ws => dismissWatch(ws, w.id)); navigate(`/trips/new?date=${w.firedForDate}&to=${w.firedForDate}`); }}>Start the request</Button>
                  <Button size="sm" variant="outline" onClick={() => setWatches(ws => dismissWatch(ws, w.id))} aria-label="Dismiss"><X className="h-4 w-4" /></Button>
                </span>
              </li>
            ))}
          </ul>
        </GfoPanel>
      )}
      <GfoPanel title={`Watching · ${watching.length}`}>
        {watching.length === 0 && <p className="text-sm text-muted-foreground">Nothing being watched.</p>}
        <ul className="divide-y divide-border">
          {watching.map(w => (
            <li key={w.id} className="flex items-center justify-between py-2 text-sm">
              <span>{CABIN_LABEL[w.cabin]} · {w.fromDate} – {w.toDate} · {w.forName} + {Math.max(0, w.seats - 1)}<span className="ml-2 text-xs text-muted-foreground">by {w.createdBy}</span></span>
              <button className="text-xs text-muted-foreground hover:text-destructive" onClick={() => setWatches(ws => dismissWatch(ws, w.id))}>Stop watching</button>
            </li>
          ))}
        </ul>
      </GfoPanel>
      {done.length > 0 && (
        <GfoPanel title="Past">
          <ul className="space-y-1 text-xs text-muted-foreground">{done.map(w => <li key={w.id} className={cn(w.status === 'expired' && 'line-through')}>{CABIN_LABEL[w.cabin]} · {w.fromDate} – {w.toDate} · {w.status}</li>)}</ul>
        </GfoPanel>
      )}
    </div>
  );
}
