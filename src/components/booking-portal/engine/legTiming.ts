// What the EA actually knows about timing (D100 design pass, 2026-08-29).
//
// The old form demanded a departure time. An EA usually does not have one — she
// has "he must be in Teterboro by 09:00", or nothing firmer than the date. Made-up
// departure times are worse than no time at all: they read to scheduling as a
// constraint the principal never asked for, and they hide the flexibility that
// lets the fleet absorb the trip.
//
// So a leg states what is FIXED, in one of three shapes, and the expected
// departure is DERIVED for display. Nothing here reads a clock.

export type LegTiming =
  | { kind: 'depart'; departLocal: string; flexHours: number }
  | { kind: 'arrive'; arriveByLocal: string }
  | { kind: 'flexible' };

/** Legacy legs carry departLocal/flexHours directly; read them as a 'depart' timing. */
export function timingOfLeg(leg: {
  timing?: LegTiming;
  departLocal?: string;
  flexHours?: number;
}): LegTiming {
  if (leg.timing) return leg.timing;
  return { kind: 'depart', departLocal: leg.departLocal ?? '08:00', flexHours: leg.flexHours ?? 0 };
}

const HH_MM = /^([01]\d|2[0-3]):([0-5]\d)$/;

function minutesOfClock(hhmm: string): number | null {
  const m = HH_MM.exec(hhmm);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

function clockOfMinutes(mins: number): string {
  // Wraps backwards across midnight: an early arrival can imply a departure the
  // previous evening, and printing "-1:15" would be worse than printing 22:45.
  const wrapped = ((mins % 1440) + 1440) % 1440;
  const h = Math.floor(wrapped / 60);
  const m = wrapped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** True when the derived departure falls on the day before the arrival. */
export function departsPreviousDay(timing: LegTiming, estMinutes: number): boolean {
  if (timing.kind !== 'arrive') return false;
  const arrive = minutesOfClock(timing.arriveByLocal);
  if (arrive === null) return false;
  return arrive - estMinutes < 0;
}

/**
 * The departure scheduling would most likely file. For an arrive-by leg that is
 * the arrival less the flight time; for the other two shapes there is nothing to
 * derive — a firm departure is already stated, and a flexible leg has no answer
 * to give, which is the point of it.
 */
export function expectedDeparture(timing: LegTiming, estMinutes: number): string | null {
  if (timing.kind === 'depart') return timing.departLocal;
  if (timing.kind === 'flexible') return null;
  const arrive = minutesOfClock(timing.arriveByLocal);
  if (arrive === null || !Number.isFinite(estMinutes)) return null;
  return clockOfMinutes(arrive - Math.round(estMinutes));
}

/** One line for the request card, the queue row and the itinerary header. */
export function describeTiming(timing: LegTiming): string {
  switch (timing.kind) {
    case 'depart':
      return timing.flexHours > 0
        ? `Depart ${timing.departLocal} ± ${timing.flexHours} h`
        : `Depart ${timing.departLocal} firm`;
    case 'arrive':
      return `Be there by ${timing.arriveByLocal}`;
    case 'flexible':
      return 'Any time that day';
  }
}

/**
 * How much room scheduling has, in hours — the whole reason the three shapes
 * exist. A flexible leg is worth a working day (08:00–20:00) rather than
 * infinity: it means "whenever suits the fleet", not "at 03:00".
 */
export const FLEXIBLE_DAY_HOURS = 12;

export function latitudeHours(timing: LegTiming): number {
  switch (timing.kind) {
    case 'depart':
      // ± flex is a window on both sides of the stated time.
      return timing.flexHours * 2;
    case 'arrive':
      return FLEXIBLE_DAY_HOURS / 2;
    case 'flexible':
      return FLEXIBLE_DAY_HOURS;
  }
}

/** Valid enough to submit: a stated time must actually be a time. */
export function isTimingComplete(timing: LegTiming): boolean {
  if (timing.kind === 'depart') return minutesOfClock(timing.departLocal) !== null && timing.flexHours >= 0;
  if (timing.kind === 'arrive') return minutesOfClock(timing.arriveByLocal) !== null;
  return true;
}
