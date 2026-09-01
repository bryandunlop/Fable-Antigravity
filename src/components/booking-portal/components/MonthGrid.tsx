// The month, as drawn: six week rows, her trips as spanning bars, and one number on every
// day — how many aeroplanes are free.
//
// The bar carries no status badge and no tail. Solid means approved, dashed means pending,
// and that is the only visual difference there is; the same distinction reaches the
// executive as one word. A tail on the bar would teach her to ask for a tail, which is
// scheduling's call, not hers.

import { monthGrid, monthSegments, type CalDay } from '../../inflight/tripCalendar';
import type { DayFreeCount } from '../../../availability/engine/freeCount';
import type { DrawableHubTrip } from '../engine/hubMonth';
import { cn } from '../../ui/utils';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function FreeCount({ count }: { count: DayFreeCount | undefined }) {
  if (!count) return <span className="text-[11px] text-muted-foreground/40">·</span>;
  return (
    <span
      className={cn(
        'text-[11px] tabular-nums',
        count.free === 0 ? 'font-semibold text-muted-foreground' : 'text-muted-foreground',
        // Free only because nobody has rostered the day yet. Honest, and softer.
        count.confidence === 'provisional' && 'opacity-50',
      )}
      title={
        count.confidence === 'provisional'
          ? `${count.free} of ${count.fleetSize} free — beyond the published crew roster, so this is a plan, not a promise`
          : `${count.free} of ${count.fleetSize} aircraft free`
      }
    >
      {count.free}
    </span>
  );
}

export function MonthGrid({
  year,
  month,
  today,
  trips,
  freeByDate,
  selectedId,
  onSelect,
}: {
  year: number;
  month: number;
  today: Date;
  trips: DrawableHubTrip[];
  freeByDate: Record<string, DayFreeCount>;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const weeks = monthGrid(year, month, today);
  const calTrips = trips.map(t => t.calTrip);
  const segments = monthSegments(weeks, calTrips);
  const byId = new Map(trips.map(t => [t.id, t]));

  return (
    <div className="overflow-hidden rounded-lg border">
      <div className="grid grid-cols-7 border-b bg-muted/30">
        {DAY_LABELS.map(d => (
          <div key={d} className="px-2 py-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">
            {d}
          </div>
        ))}
      </div>

      {weeks.map((week, wi) => (
        <div key={wi} className="relative border-b last:border-b-0">
          <div className="grid grid-cols-7">
            {week.map((day: CalDay) => (
              <div
                key={day.key}
                className={cn(
                  'min-h-[86px] border-r px-2 py-1.5 last:border-r-0',
                  !day.inMonth && 'bg-muted/20',
                )}
              >
                <div className="flex items-baseline justify-between">
                  <span
                    className={cn(
                      'text-xs tabular-nums',
                      day.inMonth ? 'text-foreground' : 'text-muted-foreground/50',
                      day.isToday &&
                        'inline-flex h-5 w-5 items-center justify-center rounded-full bg-[var(--gfo-daylight,#0096FC)] font-semibold text-white',
                    )}
                  >
                    {day.day}
                  </span>
                  {day.inMonth && <FreeCount count={freeByDate[day.key]} />}
                </div>
              </div>
            ))}
          </div>

          {/* Bars sit above the day cells so one trip is one continuous shape across the
              week, rather than seven fragments that happen to touch. */}
          <div className="pointer-events-none absolute inset-x-0 top-8 flex flex-col gap-1 px-1">
            {segments[wi].map((seg, si) => {
              const trip = byId.get(seg.tripId);
              if (!trip) return null;
              const span = seg.endCol - seg.startCol + 1;
              return (
                <button
                  key={`${seg.tripId}-${si}`}
                  type="button"
                  onClick={() => onSelect(seg.tripId)}
                  style={{
                    marginLeft: `${(seg.startCol / 7) * 100}%`,
                    width: `${(span / 7) * 100}%`,
                  }}
                  className={cn(
                    'pointer-events-auto truncate px-2 py-0.5 text-left text-[11px] font-medium',
                    trip.style === 'solid'
                      ? 'border border-[var(--gfo-daylight-deep,#0077CC)] bg-[color-mix(in_srgb,var(--gfo-daylight,#0096FC)_16%,transparent)]'
                      : 'border border-dashed border-muted-foreground/60 bg-transparent text-muted-foreground',
                    seg.continuesLeft ? 'rounded-l-none' : 'rounded-l-md',
                    seg.continuesRight ? 'rounded-r-none' : 'rounded-r-md',
                    selectedId === seg.tripId && 'ring-2 ring-[var(--gfo-daylight,#0096FC)] ring-offset-1',
                  )}
                  title={`${trip.label} — ${trip.style === 'solid' ? 'approved' : 'asked for'}`}
                >
                  {seg.showLabel ? trip.label : ' '}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
