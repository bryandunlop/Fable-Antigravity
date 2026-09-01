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
//
// TL-47: that derivation was originally zone-blind — it subtracted the flight time from
// the ARRIVAL's wall clock and presented the answer as the DEPARTURE's local time. For a
// domestic leg those are the same clock and the answer is exact, which is why every test
// here passed. Across zones it is wrong by the zone difference: "be in London by 09:00"
// derived 02:00 when the truth is 21:00 the previous evening — five hours out AND the
// wrong day. `deriveDeparture` now does the subtraction on real instants when it can
// place both fields, and says plainly (`zoned: false`) when it cannot.

import { zoneForAirport, offsetMinutesAt, zoneLabelAt } from '../../../services/airportZone';

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

/** Where and when the leg actually is — enough to place both ends on the map and the calendar. */
export interface LegPlace {
  /** Departure field, ICAO or IATA. */
  from: string;
  /** Arrival field, ICAO or IATA. */
  to: string;
  /** The date the arrive-by time refers to, "YYYY-MM-DD". */
  date: string;
}

export interface DerivedDeparture {
  /** Departure wall clock at the DEPARTURE field, "HH:mm". null when there is nothing to derive. */
  clock: string | null;
  /** True when that departure falls on the day before the stated arrival date. */
  previousDay: boolean;
  /**
   * True only when both fields resolved to real zones and the subtraction happened on real
   * instants. False means the answer is the old same-zone arithmetic and is only right if the
   * two fields share a zone — the UI should not present it as a firm local time.
   */
  zoned: boolean;
  /** The DEPARTURE field's zone abbreviation at that instant ("EDT"), or null when unzoned. */
  zoneLabel: string | null;
}

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * The arrive-by wall time, on that date, at that field, as a real UTC instant.
 *
 * The offset has to be read at roughly the instant in question, not at some fixed reference,
 * or the answer is an hour out for half the year. Reading it at the naive-UTC guess is close
 * enough to pick the right side of every DST transition except for wall times inside the
 * transition hour itself, where no correct answer exists anyway.
 */
function instantOf(dateIso: string, hhmm: string, zone: string): number | null {
  const d = ISO_DATE.exec(dateIso);
  const mins = minutesOfClock(hhmm);
  if (!d || mins === null) return null;
  const guess = Date.UTC(Number(d[1]), Number(d[2]) - 1, Number(d[3]), 0, mins);
  const offset = offsetMinutesAt(new Date(guess).toISOString(), zone);
  if (offset === null) return null;
  return guess - offset * 60_000;
}

/** "HH:mm" and the local calendar date, as `zone` reads that instant. */
function wallAt(ms: number, zone: string): { clock: string; date: string } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: zone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(new Date(ms));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  const hour = get('hour') === '24' ? '00' : get('hour');
  return { clock: `${hour}:${get('minute')}`, date: `${get('year')}-${get('month')}-${get('day')}` };
}

/**
 * The departure scheduling would most likely file, and how much to trust it.
 *
 * For an arrive-by leg that is the arrival less the flight time; for the other two shapes there
 * is nothing to derive — a firm departure is already stated, and a flexible leg has no answer to
 * give, which is the point of it.
 *
 * Given a `place` whose both ends resolve to zones, the subtraction happens on real UTC instants
 * and the result is the departure field's own wall clock. Without that — no place supplied, or a
 * field we cannot locate — it falls back to the original same-zone arithmetic and reports
 * `zoned: false` so the caller can mark it as an assumption rather than a time. (TL-47)
 */
export function deriveDeparture(
  timing: LegTiming,
  estMinutes: number,
  place?: LegPlace,
): DerivedDeparture {
  const unzoned = (clock: string | null, previousDay = false): DerivedDeparture => ({
    clock, previousDay, zoned: false, zoneLabel: null,
  });

  if (timing.kind === 'depart') return unzoned(timing.departLocal);
  if (timing.kind === 'flexible') return unzoned(null);

  const arrive = minutesOfClock(timing.arriveByLocal);
  if (arrive === null || !Number.isFinite(estMinutes)) return unzoned(null);

  const blindClock = clockOfMinutes(arrive - Math.round(estMinutes));
  const blindPrevDay = arrive - estMinutes < 0;

  if (!place) return unzoned(blindClock, blindPrevDay);
  const depZone = zoneForAirport(place.from);
  const arrZone = zoneForAirport(place.to);
  if (!depZone || !arrZone) return unzoned(blindClock, blindPrevDay);

  const arriveUtc = instantOf(place.date, timing.arriveByLocal, arrZone);
  if (arriveUtc === null) return unzoned(blindClock, blindPrevDay);

  const departUtc = arriveUtc - Math.round(estMinutes) * 60_000;
  const wall = wallAt(departUtc, depZone);
  return {
    clock: wall.clock,
    previousDay: wall.date < place.date,
    zoned: true,
    zoneLabel: zoneLabelAt(new Date(departUtc).toISOString(), depZone),
  };
}

/** True when the derived departure falls on the day before the arrival. */
export function departsPreviousDay(timing: LegTiming, estMinutes: number, place?: LegPlace): boolean {
  return deriveDeparture(timing, estMinutes, place).previousDay;
}

/** The departure clock alone — see `deriveDeparture` for whether it is zone-resolved. */
export function expectedDeparture(timing: LegTiming, estMinutes: number, place?: LegPlace): string | null {
  return deriveDeparture(timing, estMinutes, place).clock;
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
