import { Shield, MapPin, Fuel, Lock, Check, Plane, Clock, Flag } from 'lucide-react';
import type { QueueItem } from '../dayOfQueue';
import { formatCountdown } from '../dayOfQueue';
import { legsRemaining, type TimelineEntry, type LegEntry, type GroundEntry, type EndEntry } from '../dayTimeline';
import { airportInfo } from '../../tech-log/mockData/airports';

const zulu = (iso: string) => `${iso.slice(11, 16)}Z`;
const KIND_ICON = { frat: Shield, airport: MapPin, fuel: Fuel } as const;

/** "2:35" — a turn, or a block time. Hours are never padded; minutes always are. */
function duration(msTotal: number): string {
  const mins = Math.round(msTotal / 60_000);
  return `${Math.floor(mins / 60)}:${String(mins % 60).padStart(2, '0')}`;
}

function itemLabel(i: QueueItem): { title: string; sub: string; action: string } {
  switch (i.kind) {
    case 'frat':
      return { title: 'FRAT', sub: i.state === 'draft' ? 'Draft saved, not submitted' : 'Not started',
        action: i.state === 'draft' ? 'Resume' : 'Start' };
    case 'airport':
      return { title: `Airport review — ${i.departureIcao}, ${i.arrivalIcao}`, sub: 'Not reviewed', action: 'Open' };
    case 'fuel':
      return i.state === 'locked'
        ? { title: `Fuel — ${i.departureIcao} farm`, sub: `Request closed ${zulu(i.dueUtc)} — not submitted`, action: '' }
        : { title: `Fuel — ${i.departureIcao} farm`, sub: `Locks ${zulu(i.dueUtc)}`, action: 'Submit' };
  }
}

/** The rail: a dot on a line, so one glance finds where the day has got to. */
function Rail({ entry, last }: { entry: TimelineEntry; last: boolean }) {
  const past = entry.state === 'past';
  const current = entry.state === 'current';
  const Icon = entry.kind === 'leg' ? Plane : entry.kind === 'ground' ? Clock : Flag;
  return (
    <div className="flex w-4 shrink-0 flex-col items-center" aria-hidden>
      <span className={`flex h-4 w-4 items-center justify-center rounded-full ${
        current ? 'bg-[var(--gfo-daylight)] text-white'
        : past ? 'text-[var(--gfo-success-ink)]' : 'text-muted-foreground'}`}>
        {past && entry.kind === 'leg' ? <Check className="h-3 w-3" /> : <Icon className="h-3 w-3" />}
      </span>
      {!last && <span className="w-px flex-1 bg-border" />}
    </div>
  );
}

function LegRow({ entry, onOpenItem }: { entry: LegEntry; onOpenItem: (i: QueueItem) => void }) {
  const { leg } = entry;
  const blockMs = new Date(leg.arrivalTimeUtc).getTime() - new Date(leg.departureTimeUtc).getTime();
  return (
    <>
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <span className={`text-sm font-medium ${entry.state === 'past' ? 'text-muted-foreground' : ''}`}>
          {leg.departureIcao} → {leg.arrivalIcao}
        </span>
        {entry.airborne && <span className="gfo-chip shrink-0"><span className="gfo-chip-dot gfo-dot-crew" aria-hidden /> Airborne</span>}
        {entry.next && <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--gfo-daylight-ink,var(--primary))]">Next</span>}
      </div>
      <div className="text-xs text-muted-foreground">
        Leg {leg.sequence} · {zulu(leg.departureTimeUtc)}–{zulu(leg.arrivalTimeUtc)} · {duration(blockMs)} block
        {entry.state === 'past' && leg.fratStatus === 'COMPLETED' && leg.fratScore != null ? ` · FRAT ${leg.fratScore}` : ''}
      </div>

      {entry.items.length > 0 && (
        <ul className="mt-2 space-y-1.5">
          {entry.items.map((i) => {
            const Icon = KIND_ICON[i.kind];
            const { title, sub, action } = itemLabel(i);
            const late = i.state === 'locked';
            return (
              <li key={i.id} className="flex items-center gap-2.5 rounded border border-border bg-muted/40 px-2.5 py-1.5">
                <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-medium leading-tight">{title}</span>
                  <span className={`block text-[11px] ${late ? 'text-[var(--gfo-error-ink)]' : 'text-muted-foreground'}`}>{sub}</span>
                </span>
                {action
                  ? <button onClick={() => onOpenItem(i)}
                      className="min-h-[32px] shrink-0 rounded-full border border-border bg-card px-3 py-1 text-[11px] font-medium duration-fast hover:bg-accent">
                      {action}
                    </button>
                  : <span className="inline-flex shrink-0 items-center gap-1 px-1 text-[11px] text-muted-foreground">
                      <Lock className="h-3 w-3" aria-hidden /> Locked
                    </span>}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

function GroundRow({ entry }: { entry: GroundEntry }) {
  const info = airportInfo(entry.icao);
  return (
    <>
      <div className="text-sm">
        <span className={entry.state === 'current' ? 'font-medium' : 'text-muted-foreground'}>
          {entry.state === 'current' ? 'On the ground at ' : 'Turn at '}{entry.icao}
        </span>
        <span className="text-muted-foreground"> · {duration(entry.durationMs)}</span>
      </div>
      <div className="text-xs text-muted-foreground">
        {zulu(entry.fromUtc)}–{zulu(entry.toUtc)} · before leg {entry.nextLegSequence}
        {info ? ` · ${info.fbo}` : ''}
      </div>
      {/* An airport limitation is a fact about the ground time, not about the flight — a curfew or a
          PPR is exactly what a crew needs while sitting there deciding when to call for the pull-out. */}
      {info?.limitations && (
        <div className="mt-1 text-xs text-[var(--gfo-sunrise-deep)] dark:text-[var(--gfo-sunrise-light)]">{info.limitations}</div>
      )}
    </>
  );
}

function EndRow({ entry }: { entry: EndEntry }) {
  return (
    <>
      <div className={`text-sm ${entry.state === 'current' ? 'font-medium' : 'text-muted-foreground'}`}>
        End of day · {entry.icao}
      </div>
      <div className="text-xs text-muted-foreground">
        {entry.state === 'current' ? 'Last leg flown — hand the aircraft back to maintenance.' : `On the ground ${zulu(entry.atUtc)}`}
      </div>
    </>
  );
}

/**
 * "Your day" — the day-of pane's list, after Bryan's 2026-08-21 note that the workspace "just sits
 * on this screen" once the aircraft has been accepted.
 *
 * It replaces the flat by-the-clock queue with the day in clock order: legs, the ground time between
 * them, and the end of the day, with each outstanding item shown against the leg it belongs to. The
 * queue is still the source of those items (see `dayTimeline`), so the two can never disagree about
 * what is owed — this only changes where the pilot reads it.
 */
export function DayTimeline({
  nowUtc, entries, onOpenItem,
}: {
  nowUtc: string;
  entries: TimelineEntry[];
  onOpenItem: (item: QueueItem) => void;
}) {
  const left = legsRemaining(entries);

  return (
    <section className="rounded-lg border border-border bg-card">
      <div className="flex items-baseline justify-between gap-2 border-b border-border px-4 py-2.5">
        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Your day</span>
        <span className="text-xs text-muted-foreground">
          {left === 0 ? 'Every leg flown' : `${left} leg${left === 1 ? '' : 's'} to fly`}
        </span>
      </div>

      {entries.length === 0 ? (
        <p className="px-4 py-4 text-sm text-muted-foreground">No legs on this trip yet.</p>
      ) : (
        <ol className="px-4 py-3">
          {entries.map((e, idx) => (
            <li key={e.id} className="flex gap-3">
              {/* The clock column is fixed-width and tabular so the times line up into a spine —
                  a day you can read down rather than one you have to parse row by row. */}
              <span className={`w-[52px] shrink-0 pt-0.5 text-right text-xs tabular-nums ${
                e.state === 'current' ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                {e.state === 'current' ? 'now' : zulu(e.kind === 'leg' ? e.leg.departureTimeUtc : e.kind === 'ground' ? e.fromUtc : e.atUtc)}
              </span>
              <Rail entry={e} last={idx === entries.length - 1} />
              <div className={`min-w-0 flex-1 ${idx === entries.length - 1 ? 'pb-0.5' : 'pb-4'}`}>
                {e.kind === 'leg' ? <LegRow entry={e} onOpenItem={onOpenItem} />
                  : e.kind === 'ground' ? <GroundRow entry={e} />
                  : <EndRow entry={e} />}
                {e.state === 'current' && e.kind === 'ground' && (
                  <div className="mt-1 text-xs text-muted-foreground">
                    Next push {formatCountdown(nowUtc, e.toUtc)}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
