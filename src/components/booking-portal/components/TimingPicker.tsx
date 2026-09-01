// What is fixed about a leg's timing (D100). Three shapes, one chosen at a time.
//
// The point of the control is the third option existing at all: an EA who says
// "any time that day" has handed scheduling a whole day of latitude, and the old
// form gave her no way to say it — she had to invent a departure time instead.

import { Clock } from 'lucide-react';
import { deriveDeparture, type LegTiming } from '../engine/legTiming';
import { cn } from '../../ui/utils';

const field = 'rounded-md border bg-background px-2.5 py-1.5 text-sm';

export function TimingPicker({
  timing,
  onChange,
  departureAirport,
  arrivalAirport,
  date,
  estMinutes,
  legLabel,
}: {
  timing: LegTiming;
  onChange: (t: LegTiming) => void;
  departureAirport: string;
  arrivalAirport: string;
  date: string;
  estMinutes: number;
  legLabel: string;
}) {
  // Both fields and the date, so an arrive-by across zones subtracts on real instants rather
  // than on the arrival's wall clock — five hours and a day out on a transatlantic leg (TL-47).
  const dep =
    timing.kind === 'arrive'
      ? deriveDeparture(timing, estMinutes, { from: departureAirport, to: arrivalAirport, date })
      : null;

  const row = (selected: boolean) =>
    cn(
      'flex flex-wrap items-center gap-2.5 rounded-lg border px-3 py-2',
      selected ? 'border-[var(--gfo-daylight,#0096FC)] ring-2 ring-[color-mix(in_srgb,var(--gfo-daylight,#0096FC)_20%,transparent)]' : 'border-border',
    );

  return (
    <div className="rounded-lg border border-[color-mix(in_srgb,var(--gfo-daylight,#0096FC)_30%,transparent)] bg-[color-mix(in_srgb,var(--gfo-daylight,#0096FC)_5%,transparent)] p-3">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
        What's fixed about the timing
      </p>
      <p className="mb-2.5 mt-0.5 text-xs text-muted-foreground">
        Pick the one that's true. The looser this is, the more scheduling can do with the fleet.
      </p>

      <div className="flex flex-col gap-2">
        <label className={row(timing.kind === 'depart')}>
          <input
            type="radio"
            name={`timing-${legLabel}`}
            checked={timing.kind === 'depart'}
            onChange={() => onChange({ kind: 'depart', departLocal: '08:00', flexHours: 2 })}
          />
          <span className="w-28 text-sm">Depart around</span>
          <input
            aria-label={`${legLabel} departure time`}
            type="time"
            className={cn(field, 'w-28')}
            disabled={timing.kind !== 'depart'}
            value={timing.kind === 'depart' ? timing.departLocal : '08:00'}
            onChange={(e) =>
              timing.kind === 'depart' && onChange({ ...timing, departLocal: e.target.value })
            }
          />
          <span className="text-sm text-muted-foreground">±</span>
          <input
            aria-label={`${legLabel} flexibility hours`}
            type="number"
            min={0}
            max={12}
            className={cn(field, 'w-16')}
            disabled={timing.kind !== 'depart'}
            value={timing.kind === 'depart' ? timing.flexHours : 0}
            onChange={(e) =>
              timing.kind === 'depart' && onChange({ ...timing, flexHours: Number(e.target.value) })
            }
          />
          <span className="text-sm text-muted-foreground">h</span>
        </label>

        <label className={row(timing.kind === 'arrive')}>
          <input
            type="radio"
            name={`timing-${legLabel}`}
            checked={timing.kind === 'arrive'}
            onChange={() => onChange({ kind: 'arrive', arriveByLocal: '09:00' })}
          />
          <span className="w-28 text-sm font-medium">Be there by</span>
          <input
            aria-label={`${legLabel} arrive by time`}
            type="time"
            className={cn(field, 'w-28')}
            disabled={timing.kind !== 'arrive'}
            value={timing.kind === 'arrive' ? timing.arriveByLocal : '09:00'}
            onChange={(e) =>
              timing.kind === 'arrive' && onChange({ kind: 'arrive', arriveByLocal: e.target.value })
            }
          />
          <span className="text-sm text-muted-foreground">local, {arrivalAirport || 'destination'}</span>
        </label>

        <label className={row(timing.kind === 'flexible')}>
          <input
            type="radio"
            name={`timing-${legLabel}`}
            checked={timing.kind === 'flexible'}
            onChange={() => onChange({ kind: 'flexible' })}
          />
          <span className="text-sm">Any time that day — he's flexible</span>
        </label>
      </div>

      {dep?.clock && (
        <p className="mt-2.5 flex items-center gap-1.5 text-xs text-[var(--gfo-daylight-deep,#0077CC)]">
          <Clock className="h-3.5 w-3.5" />
          Scheduling will likely file a {dep.clock}
          {dep.zoned && dep.zoneLabel ? ` ${dep.zoneLabel}` : ''} departure
          {dep.previousDay ? ' the day before' : ''}
          {dep.zoned
            ? ` from ${departureAirport || 'the origin'}`
            : ' — assuming one time zone, since we could not place both fields'}
          {' '}— you'll see the real time when they confirm.
        </p>
      )}
    </div>
  );
}
