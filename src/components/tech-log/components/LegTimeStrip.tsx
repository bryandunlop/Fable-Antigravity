import { Plane, ArrowRight } from 'lucide-react';
import { legTimes, formatElapsed, formatClockShift, formatDayShift } from '../../../services/legTime';

/**
 * A leg's two ends read in their own field-local wall clocks, with Zulu underneath.
 *
 * Zulu alone is correct and unreadable: "dep 2215Z" tells a crew nothing about whether they are
 * leaving after dinner or before breakfast, and nothing at all about what day they land. This shows
 * both, keeps Zulu visible as the authoritative instant, and never invents a local time for a field
 * we cannot place — an unplaced end shows Zulu only. (LG-312)
 *
 * Field-local on purpose, and deliberately NOT the D24 regulatory clock: the MEL calendar day is
 * anchored to one operator zone, this is where the aeroplane actually is. The zone abbreviation is
 * always printed so the two can never be read as the same thing.
 */
export function LegTimeStrip({
  departureIcao,
  arrivalIcao,
  departureUtc,
  arrivalUtc,
  className = '',
}: {
  departureIcao: string;
  arrivalIcao: string;
  departureUtc: string;
  arrivalUtc: string;
  className?: string;
}) {
  const leg = legTimes({ departureIcao, arrivalIcao, departureUtc, arrivalUtc });
  const dayBadge = formatDayShift(leg.dayShift);

  return (
    <div className={`flex flex-wrap items-center gap-x-6 gap-y-3 ${className}`}>
      <End icao={departureIcao} end={leg.departure} />

      <div className="flex min-w-[7rem] flex-col items-center gap-0.5 text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Plane className="h-3.5 w-3.5" aria-hidden="true" />
          <ArrowRight className="h-3 w-3" aria-hidden="true" />
        </div>
        <span className="font-mono text-xs text-foreground/80">{formatElapsed(leg.elapsedMinutes)}</span>
        {leg.clockShiftMinutes !== null && leg.clockShiftMinutes !== 0 && (
          <span className="text-[11px]">clock {formatClockShift(leg.clockShiftMinutes)}</span>
        )}
      </div>

      <End icao={arrivalIcao} end={leg.arrival} badge={dayBadge} />
    </div>
  );
}

function End({
  icao,
  end,
  badge,
}: {
  icao: string;
  end: ReturnType<typeof legTimes>['departure'];
  badge?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{icao}</span>
      {end.wallTime ? (
        <span className="flex items-baseline gap-1.5">
          <span className="font-mono text-lg leading-none text-foreground">{end.wallTime}</span>
          <span className="text-[11px] text-muted-foreground">{end.zoneLabel}</span>
          {badge && (
            <span className="rounded bg-amber-100 px-1 py-px text-[10px] font-medium text-amber-900 dark:bg-amber-900/40 dark:text-amber-200">
              {badge}
            </span>
          )}
        </span>
      ) : (
        // No coordinates for this field, so no local time exists to show. Zulu below is the whole
        // answer — better a gap than a UTC value dressed up as local.
        <span className="font-mono text-lg leading-none text-muted-foreground">—</span>
      )}
      <span className="font-mono text-[11px] text-muted-foreground">
        {end.utcIso.slice(11, 16)}Z {end.utcIso.slice(0, 10)}
      </span>
    </div>
  );
}
