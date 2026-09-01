/**
 * Leg times across time zones: what a flight's departure and arrival read on the wall clock at
 * each end, how long it was actually airborne, and how far the crew resets their watch.
 *
 * The problem this exists for: a leg is stored as two UTC instants, which is correct and also
 * unreadable. KLUK 22:15Z -> OMDB 11:40Z is 18:15 Thursday to 15:40 Friday — a day later on the
 * calendar for a 13h 25m flight. Every surface that showed a leg was doing some fraction of that
 * arithmetic itself, or not doing it at all. (LG-312)
 *
 * TWO NUMBERS THAT LOOK ALIKE AND ARE NOT:
 *   `elapsedMinutes`     — real time airborne, from the UTC instants. Never touched by zones or DST.
 *   `clockShiftMinutes`  — the difference between the two ends' UTC offsets, at their own instants.
 * Subtracting wall clocks would silently conflate them, and is wrong by an hour across any DST
 * boundary the flight crosses. Elapsed is always UTC arithmetic; that is the whole rule.
 *
 * DISPLAY AND PLANNING ONLY — not the regulatory clock. See `airportZone.ts`.
 */

import { zoneForAirport, offsetMinutesAt, zoneLabelAt } from './airportZone';

export interface LegEndpointTime {
  icao: string;
  /** The stored instant, echoed back so a caller never has to hold both this and the input. */
  utcIso: string;
  /** null when the field has no coordinates — see `zoneForAirport`. */
  zone: string | null;
  /** 24h wall clock at the field, e.g. "18:15". null when the zone or the instant is unknown. */
  wallTime: string | null;
  /** Local calendar date at the field as "YYYY-MM-DD" — sortable, and never locale-shuffled. */
  wallDate: string | null;
  /** How the field abbreviates its zone at that instant: "EDT", "EST", "GMT+4". */
  zoneLabel: string | null;
  /** Offset from UTC in minutes at that instant, DST included. */
  offsetMinutes: number | null;
}

export interface LegTimes {
  departure: LegEndpointTime;
  arrival: LegEndpointTime;
  /** True time airborne, from the UTC instants. Negative if the schedule is back-to-front. */
  elapsedMinutes: number | null;
  /** Local calendar days crossed: 0 same day, 1 next day, -1 the notorious westbound day-back. */
  dayShift: number | null;
  /** Arrival offset minus departure offset. +480 means the crew winds forward 8 hours. */
  clockShiftMinutes: number | null;
  /** The westbound tell: lands at an earlier wall-clock time than it left, on the same local day. */
  arrivesBeforeItDeparts: boolean | null;
}

export interface LegTimeInput {
  departureIcao: string;
  arrivalIcao: string;
  departureUtc: string;
  arrivalUtc: string;
}

/** "YYYY-MM-DD" and "HH:mm" as the given zone reads them at that instant. */
function wallParts(iso: string, zone: string): { date: string; time: string } | null {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return null;
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: zone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(at);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  const hour = get('hour') === '24' ? '00' : get('hour'); // some ICUs render midnight as 24
  return { date: `${get('year')}-${get('month')}-${get('day')}`, time: `${hour}:${get('minute')}` };
}

function endpoint(icao: string, utcIso: string): LegEndpointTime {
  const zone = zoneForAirport(icao);
  if (!zone) return { icao, utcIso, zone: null, wallTime: null, wallDate: null, zoneLabel: null, offsetMinutes: null };
  const wall = wallParts(utcIso, zone);
  return {
    icao,
    utcIso,
    zone,
    wallTime: wall?.time ?? null,
    wallDate: wall?.date ?? null,
    zoneLabel: zoneLabelAt(utcIso, zone),
    offsetMinutes: offsetMinutesAt(utcIso, zone),
  };
}

/** Whole days between two "YYYY-MM-DD" strings, counted as calendar days, not 24h periods. */
function calendarDaysBetween(from: string, to: string): number {
  const a = Date.UTC(+from.slice(0, 4), +from.slice(5, 7) - 1, +from.slice(8, 10));
  const b = Date.UTC(+to.slice(0, 4), +to.slice(5, 7) - 1, +to.slice(8, 10));
  return Math.round((b - a) / 86_400_000);
}

export function legTimes(input: LegTimeInput): LegTimes {
  const departure = endpoint(input.departureIcao, input.departureUtc);
  const arrival = endpoint(input.arrivalIcao, input.arrivalUtc);

  const depMs = new Date(input.departureUtc).getTime();
  const arrMs = new Date(input.arrivalUtc).getTime();
  const elapsedMinutes =
    Number.isNaN(depMs) || Number.isNaN(arrMs) ? null : Math.round((arrMs - depMs) / 60_000);

  const bothPlaced = departure.wallDate !== null && arrival.wallDate !== null;
  const dayShift = bothPlaced ? calendarDaysBetween(departure.wallDate!, arrival.wallDate!) : null;

  const clockShiftMinutes =
    departure.offsetMinutes !== null && arrival.offsetMinutes !== null
      ? arrival.offsetMinutes - departure.offsetMinutes
      : null;

  const arrivesBeforeItDeparts =
    bothPlaced && departure.wallTime !== null && arrival.wallTime !== null
      ? dayShift === 0 && arrival.wallTime < departure.wallTime
      : null;

  return { departure, arrival, elapsedMinutes, dayShift, clockShiftMinutes, arrivesBeforeItDeparts };
}

/** "13h 25m". Minutes are zero-padded so a column of these stays aligned. */
export function formatElapsed(minutes: number | null): string {
  if (minutes === null) return '—';
  const sign = minutes < 0 ? '-' : '';
  const abs = Math.abs(minutes);
  return `${sign}${Math.floor(abs / 60)}h ${String(abs % 60).padStart(2, '0')}m`;
}

/** "+8h", "-9h30m", "no change" — how far the watch moves, in the crew's own words. */
export function formatClockShift(minutes: number | null): string {
  if (minutes === null) return '—';
  if (minutes === 0) return 'no change';
  const sign = minutes < 0 ? '-' : '+';
  const abs = Math.abs(minutes);
  const rem = abs % 60;
  return `${sign}${Math.floor(abs / 60)}h${rem ? `${rem}m` : ''}`;
}

/** "+1 day" / "−1 day" / "" — the calendar-day badge beside an arrival time. */
export function formatDayShift(days: number | null): string {
  if (days === null || days === 0) return '';
  const abs = Math.abs(days);
  return `${days > 0 ? '+' : '−'}${abs} day${abs === 1 ? '' : 's'}`;
}
