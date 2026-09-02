// The trips list — the EA's drafts and live trips; scheduling's submitted and shared ones.
// Search across every record from here (D105: B's one surviving idea).

import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { Button } from '../../ui/button';
import { GfoPageHeader, GfoPanel } from '../../gfo';
import { cn } from '../../ui/utils';
import { useTripsModule } from '../TripsContext';
import { routeLabel, searchEvents, submitBlockers, tripSpan, eventText, type Trip } from '../engine/trip';
import { schedulingQueue, BAND_LABEL, BAND_NOTE, type QueueBand, type QueueRow } from '../engine/queue';

const STATUS_LABEL: Record<Trip['status'], string> = { draft: 'Draft', submitted: 'Submitted', confirmed: 'Confirmed', declined: 'Declined', cancelled: 'Cancelled' };
const STATUS_TONE: Record<Trip['status'], string> = {
  draft: 'bg-amber-500/10 text-amber-800 dark:text-amber-400',
  submitted: 'bg-secondary text-secondary-foreground',
  confirmed: 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-400',
  declined: 'bg-destructive/10 text-destructive',
  cancelled: 'bg-muted text-muted-foreground',
};

function fmt(d: string | null): string {
  if (!d) return '—';
  return new Date(`${d}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });
}

const BAND_ORDER: QueueBand[] = ['you', 'ea', 'freezing', 'nobody'];

export default function TripsHome() {
  const { trips, actor, people, settings, nowUtc } = useTripsModule();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const hits = useMemo(() => searchEvents(trips, q).slice(0, 12), [trips, q]);
  const isSched = actor.role === 'scheduling';

  // Scheduling reads the queue, not a status list: "submitted" and "confirmed" say what state a trip
  // is in, never who is holding it up, and that is the only question a scheduler opens this page with.
  const queue = useMemo(
    () => (isSched ? schedulingQueue(trips, people, settings, nowUtc()) : null),
    [isSched, trips, people, settings, nowUtc],
  );

  const groups: Array<{ title: string; rows: Trip[] }> = isSched
    ? [
        // Drafts are not in the queue — nobody can act on a trip that has not been submitted — so
        // they keep a list of their own.
        { title: 'Drafts shared with you', rows: trips.filter(t => t.status === 'draft') },
      ]
    : [
        { title: 'Drafts', rows: trips.filter(t => t.status === 'draft') },
        { title: 'Submitted', rows: trips.filter(t => t.status === 'submitted') },
        { title: 'Confirmed', rows: trips.filter(t => t.status === 'confirmed') },
      ];

  return (
    <div className="mx-auto max-w-[1200px] space-y-4 p-6">
      <GfoPageHeader
        eyebrow={isSched ? 'Scheduling · trips' : `Trips · ${actor.name.split(' ')[0]}`}
        title="Trips"
        actions={
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search every trip record…" aria-label="Search trip records"
                className="h-9 w-72 rounded-md border border-border bg-input-background pl-8 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
            </div>
            {!isSched && (
              <Button size="sm" onClick={() => navigate('/trips/new')}><Plus className="mr-1.5 h-4 w-4" />New trip</Button>
            )}
          </div>
        }
      />

      {q.trim() && (
        <GfoPanel title={`Search · ${hits.length} ${hits.length === 1 ? 'hit' : 'hits'}`}>
          {hits.length === 0 && <p className="text-sm text-muted-foreground">Nothing in any record matches "{q}".</p>}
          <ul className="divide-y divide-border">
            {hits.map(h => (
              <li key={h.event.id} className="py-2 text-sm">
                <Link to={`/trips/${h.trip.id}`} className="font-medium text-primary hover:underline">{h.trip.title}</Link>
                <span className="mx-2 text-muted-foreground">·</span>
                <span>{eventText(h.event)}</span>
                <span className="ml-2 text-xs text-muted-foreground">{h.event.by.name} · {new Date(h.event.at).toLocaleString('en-US', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
              </li>
            ))}
          </ul>
        </GfoPanel>
      )}

      {queue && BAND_ORDER.map(band => {
        const rows = queue[band];
        if (rows.length === 0 && band !== 'you') return null;
        return (
          <GfoPanel key={band} title={`${BAND_LABEL[band]}${rows.length ? ` · ${rows.length}` : ''}`}>
            {rows.length === 0 && <p className="text-sm text-muted-foreground">Nothing. {BAND_NOTE[band]}</p>}
            {rows.length > 0 && <p className="mb-3 text-xs text-muted-foreground">{BAND_NOTE[band]}</p>}
            <ul className="divide-y divide-border">
              {rows.map(r => <QueueRowItem key={r.trip.id} row={r} />)}
            </ul>
          </GfoPanel>
        );
      })}

      {groups.map(g => (
        <GfoPanel key={g.title} title={g.title}>
          {g.rows.length === 0 && <p className="text-sm text-muted-foreground">None.</p>}
          <ul className="divide-y divide-border">
            {g.rows.map(t => {
              const span = tripSpan(t);
              const blockers = submitBlockers(t);
              return (
                <li key={t.id}>
                  <Link to={`/trips/${t.id}`} className="flex items-center gap-4 py-2.5 hover:bg-muted/40">
                    <span className={cn('w-24 shrink-0 rounded px-2 py-0.5 text-center text-xs font-medium', STATUS_TONE[t.status])}>{STATUS_LABEL[t.status]}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-primary">{t.title}</span>
                      <span className="block truncate text-xs text-muted-foreground">{routeLabel(t)} · {t.leadPassengerName} + {Math.max(0, t.seatsHeld - 1)} · {fmt(span.start)}{span.end && span.end !== span.start ? ` – ${fmt(span.end)}` : ''}</span>
                    </span>
                    {t.status === 'draft' && (
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {blockers.length > 0 ? `${blockers.length} to fix` : 'ready to submit'}{t.visibleToScheduling ? ' · shared' : ' · private'}
                      </span>
                    )}
                    {t.tail && <span className="shrink-0 text-xs font-medium">{t.tail}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </GfoPanel>
      ))}
    </div>
  );
}

/** One trip in the queue: what it is, why it is here, and how long it has been waiting. */
function QueueRowItem({ row }: { row: QueueRow }) {
  const span = tripSpan(row.trip);
  const days = Math.floor(row.ageHours / 24);
  const age = row.ageHours < 1 ? 'just now' : days >= 1 ? `${days} day${days === 1 ? '' : 's'}` : `${Math.floor(row.ageHours)} h`;
  return (
    <li>
      <Link to={`/trips/${row.trip.id}`} className="flex items-start gap-4 py-2.5 hover:bg-muted/40">
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-primary">{row.trip.title}</span>
          <span className="block truncate text-xs text-muted-foreground">
            {routeLabel(row.trip)} · {row.trip.leadPassengerName} + {Math.max(0, row.trip.seatsHeld - 1)} · {fmt(span.start)}
            {span.end && span.end !== span.start ? ` – ${fmt(span.end)}` : ''}
          </span>
          {row.reasons.length > 0 && (
            <span className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5">
              {row.reasons.map(reason => (
                <span key={reason} className={cn('text-xs', /gate|unnamed|unanswered|Freezes/.test(reason) ? 'text-amber-800 dark:text-amber-400' : 'text-muted-foreground')}>
                  {reason}
                </span>
              ))}
            </span>
          )}
        </span>
        <span className="shrink-0 text-right">
          {row.trip.tail && <span className="block text-xs font-medium">{row.trip.tail}</span>}
          <span className="block text-xs text-muted-foreground">{age}</span>
        </span>
      </Link>
    </li>
  );
}
