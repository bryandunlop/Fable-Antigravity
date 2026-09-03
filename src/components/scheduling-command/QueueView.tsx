/**
 * The Queue lens (D110 slice 3): the bookings sorted by who is waiting on whom, oldest first — the
 * same bands the Trips home shows (D109 slice 5, `engine/queue.ts`), rendered as a lens of the
 * scheduling home so it shares the filter row and the docked drawer with the board and the horizon.
 */
import { useMemo } from 'react';
import { Card } from '../ui/card';
import { BAND_LABEL, BAND_NOTE, schedulingQueue, type QueueBand, type QueueRow } from '../trips/engine/queue';
import { routeLabel, tripSpan, type Trip } from '../trips/engine/trip';
import type { Person } from '../trips/engine/people';
import type { TripSettings } from '../trips/data/settingsStore';

const BAND_ORDER: QueueBand[] = ['you', 'ea', 'freezing', 'nobody'];
const BAND_TONE: Record<QueueBand, string> = {
  you: 'text-[var(--gfo-error-ink,#C81E2B)]',
  ea: 'text-[var(--gfo-warning-ink,#8A6200)]',
  freezing: 'text-[var(--gfo-midnight,#142D7E)] dark:text-[var(--gfo-daylight-light,#7FCCFE)]',
  nobody: 'text-muted-foreground',
};

function fmt(d: string | null): string {
  return d ? new Date(`${d}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' }) : '—';
}

export function QueueView({ trips, people, settings, nowUtc, tailFilter, onOpenTrip }: {
  trips: Trip[];
  people: Person[];
  settings: TripSettings;
  nowUtc: string;
  /** The shared filter row's tail selection; empty = every tail. */
  tailFilter: Set<string>;
  onOpenTrip: (tripId: string) => void;
}) {
  const queue = useMemo(() => schedulingQueue(trips, people, settings, nowUtc), [trips, people, settings, nowUtc]);
  const keep = (r: QueueRow) => tailFilter.size === 0 || (r.trip.tail ? tailFilter.has(r.trip.tail) : true);
  return (
    <Card className="overflow-hidden">
      <div className="flex items-baseline justify-between border-b px-5 py-3.5">
        <h2 className="text-base font-semibold">Queue <span className="text-sm font-normal text-muted-foreground">· by who is waiting · oldest first</span></h2>
        <span className="text-xs text-muted-foreground">Age from the last event</span>
      </div>
      {BAND_ORDER.map(band => {
        const rows = queue[band].filter(keep);
        if (rows.length === 0 && band !== 'you') return null;
        return (
          <section key={band} className="border-b last:border-b-0">
            <div className="flex items-baseline gap-2 px-5 pb-1.5 pt-3.5">
              <span className={`text-[11px] font-semibold uppercase tracking-wider ${BAND_TONE[band]}`}>{BAND_LABEL[band]}</span>
              <span className="text-xs text-muted-foreground">{rows.length ? `${rows.length} · ${BAND_NOTE[band]}` : BAND_NOTE[band]}</span>
            </div>
            {rows.length === 0 && <p className="px-5 pb-3 text-sm text-muted-foreground">Nothing.</p>}
            <ul>
              {rows.map(r => <Row key={r.trip.id} row={r} onOpen={() => onOpenTrip(r.trip.id)} />)}
            </ul>
          </section>
        );
      })}
    </Card>
  );
}

function Row({ row, onOpen }: { row: QueueRow; onOpen: () => void }) {
  const span = tripSpan(row.trip);
  const days = Math.floor(row.ageHours / 24);
  const age = row.ageHours < 1 ? 'just now' : days >= 1 ? `${days}d` : `${Math.floor(row.ageHours)}h`;
  return (
    <li>
      <button onClick={onOpen} className="grid w-full grid-cols-[72px_minmax(0,1fr)_auto] items-center gap-4 border-t border-border/50 px-5 py-2.5 text-left hover:bg-muted/40">
        <span className="text-xs font-semibold">{row.trip.tail ?? <span className="text-[var(--gfo-error-ink,#C81E2B)]">No tail</span>}</span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium">{row.trip.title} <span className="font-normal text-muted-foreground">· {routeLabel(row.trip)} · {fmt(span.start)}{span.end && span.end !== span.start ? ` – ${fmt(span.end)}` : ''}</span></span>
          {row.reasons.length > 0 && (
            <span className="mt-0.5 flex flex-wrap gap-x-2 text-xs">
              {row.reasons.map(reason => (
                <span key={reason} className={/gate|unnamed|unanswered|Freezes|No aircraft|change/.test(reason) ? 'text-amber-800 dark:text-amber-400' : 'text-muted-foreground'}>{reason}</span>
              ))}
            </span>
          )}
        </span>
        <span className="text-xs text-muted-foreground">{row.band === 'freezing' && row.freezesInHours !== null ? `in ${Math.max(1, Math.round(row.freezesInHours / 24))}d` : age}</span>
      </button>
    </li>
  );
}
