// The EA's message log (D111): every conversation she has with scheduling, in one place, both
// directions, most recent first. The needs-you band on the trips home answers "what is waiting on
// me"; this page answers the other half — "what was said, and when" — which an unanswered-only
// panel can never do. Identity and timestamp on every line, and searchable, per the scheduling
// manager's ask (LG-319): several people work one trip, so a message with no name is a rumour.

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, Search } from 'lucide-react';
import { GfoPageHeader, GfoPanel } from '../../gfo';
import { cn } from '../../ui/utils';
import { useTripsModule } from '../TripsContext';
import { newsForEa } from '../engine/adminMessages';
import { routeLabel, type Trip, type TripEvent } from '../engine/trip';

type Line = Extract<TripEvent, { kind: 'message' }> | Extract<TripEvent, { kind: 'question' }>;

interface Thread {
  trip: Trip;
  lines: Line[];
  /** Scheduling's messages since she last spoke — the amber mark. */
  news: number;
  lastAt: number;
}

function threadsOf(trips: Trip[]): Thread[] {
  const out: Thread[] = [];
  for (const trip of trips) {
    if (trip.status === 'cancelled' || trip.status === 'declined') continue;
    const lines = trip.events.filter((e): e is Line => e.kind === 'message' || e.kind === 'question');
    if (lines.length === 0) continue;
    out.push({ trip, lines, news: newsForEa(trip).length, lastAt: Date.parse(lines[lines.length - 1].at) });
  }
  return out.sort((a, b) => b.lastAt - a.lastAt);
}

const when = (at: string) =>
  new Date(at).toLocaleString('en-US', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export default function MessagesLogPage() {
  const { trips } = useTripsModule();
  const [q, setQ] = useState('');
  const threads = useMemo(() => threadsOf(trips), [trips]);

  const needle = q.trim().toLowerCase();
  // Searching flattens the log: when she is looking for a sentence she does not care which trip it
  // was on, only that the answer comes with a name and a date attached.
  const hits = useMemo(() => {
    if (!needle) return [];
    const out: Array<{ trip: Trip; line: Line }> = [];
    for (const t of threads) {
      for (const line of t.lines) {
        if (line.text.toLowerCase().includes(needle) || line.by.name.toLowerCase().includes(needle) || t.trip.title.toLowerCase().includes(needle)) {
          out.push({ trip: t.trip, line });
        }
      }
    }
    return out.sort((a, b) => Date.parse(b.line.at) - Date.parse(a.line.at));
  }, [threads, needle]);

  const waiting = threads.reduce((n, t) => n + t.news, 0);

  return (
    <div className="mx-auto max-w-[900px] space-y-4 p-6">
      <GfoPageHeader
        eyebrow="Trips · messages"
        title="Messages"
        actions={
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search every message…" aria-label="Search messages"
              className="h-9 w-72 rounded-md border border-border bg-input-background pl-8 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
          </div>
        }
      />

      {!needle && (
        <p className="text-sm text-muted-foreground">
          {threads.length === 0
            ? 'No conversations yet. Message scheduling from any trip and it appears here.'
            : waiting > 0
              ? `${waiting} new from scheduling across ${threads.length} ${threads.length === 1 ? 'trip' : 'trips'}.`
              : `${threads.length} ${threads.length === 1 ? 'conversation' : 'conversations'}. Nothing new from scheduling.`}
        </p>
      )}

      {needle && (
        <GfoPanel title={`Search · ${hits.length} ${hits.length === 1 ? 'line' : 'lines'}`}>
          {hits.length === 0 && <p className="text-sm text-muted-foreground">No message matches "{q}".</p>}
          <ul className="divide-y divide-border">
            {hits.map(({ trip, line }) => (
              <li key={line.id} className="py-2 text-sm">
                <Link to={`/trips/${trip.id}?tab=record`} className="font-medium text-primary hover:underline">{trip.title}</Link>
                <span className="mx-2 text-muted-foreground">·</span>
                <span>{line.kind === 'question' ? `Asked: ${line.text}` : line.text}</span>
                <span className="ml-2 text-xs text-muted-foreground">{line.by.name} · {when(line.at)}</span>
              </li>
            ))}
          </ul>
        </GfoPanel>
      )}

      {!needle && threads.map(t => {
        // The tail of the conversation, because the last thing said is what she is coming back for.
        const tail = t.lines.slice(-3);
        return (
          <GfoPanel
            key={t.trip.id}
            title={t.trip.title}
            action={<Link to={`/trips/${t.trip.id}?tab=record`} className="text-xs text-primary hover:underline">Open the trip</Link>}
          >
            <p className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
              <span>{routeLabel(t.trip)}{t.trip.tail ? ` · ${t.trip.tail}` : ''}</span>
              {t.news > 0 && (
                <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 px-1.5 py-0.5 font-medium text-amber-800 dark:text-amber-400">
                  <MessageSquare className="h-3 w-3" aria-hidden="true" />{t.news} new
                </span>
              )}
              {t.lines.length > tail.length && <span>· {t.lines.length - tail.length} earlier</span>}
            </p>
            <ul className="space-y-2">
              {tail.map(line => (
                <li key={line.id} className={cn('rounded-md border px-3 py-2 text-sm', line.by.role === 'ea' ? 'border-transparent bg-muted/50' : 'bg-card')}>
                  <p className="mb-0.5 text-xs text-muted-foreground">{line.by.name} · {when(line.at)}{line.kind === 'question' ? ` · asked about the ${line.about}` : ''}</p>
                  {line.text}
                </li>
              ))}
            </ul>
          </GfoPanel>
        );
      })}
    </div>
  );
}
