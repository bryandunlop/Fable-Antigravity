/**
 * One leg, one clock — the arithmetic that turns a trip leg into two instants, computed once.
 *
 * Three places were doing this independently: `tripSheet.sheetLeg` (for the frozen sheet),
 * `rotation.tripAsRecord` (for the availability engine) and, in the UI, nothing at all — the
 * workspace showed `describeTiming(leg.timing)`, a bare "09:20" with no zone and no arrival.
 * A passenger reading "arrives 11:35" for a Seattle leg has no way to know whose 11:35 that is.
 * Bryan, 2026-09-02: "show the arrival time in Seattle as accurate even though it's a different
 * time in Cincinnati." (Phase 5 slice 1, LG-365.)
 *
 * The rule, stated once: a leg's stored truth is its DATE plus a wall-clock time at the DEPARTURE
 * field. Everything else — the UTC instant, the arrival instant, the arrival's own wall clock — is
 * derived from that, DST-aware, through `services/legTime` and `services/airportZone`.
 *
 * DISPLAY AND PLANNING ONLY. Not the regulatory clock: the PL-25 calendar-day boundary is anchored
 * to the deferral's `governing_timezone` (D24) and lives in `tech-log/engine/pl25.ts`. Cutoffs stay
 * in the operator reference zone (D106) and say "ET" — never a field zone.
 */

import { legTimes, formatDayShift, type LegEndpointTime, type LegTimes } from '../../../services/legTime';
import { lookupAirport } from '../../../services/airportCoords';
import { zoneForAirport } from '../../../services/airportZone';
import { plannedDepartureLocal, zonedToUtc, REFERENCE_ZONE } from './cutoffs';
import { SCHEDULING_DECIDES } from './places';
import type { TripLeg } from './trip';

const KT = 440;
const TAXI_MIN = 20;

function nm(a: string, b: string): number | null {
  const A = lookupAirport(a), B = lookupAirport(b);
  if (!A || !B) return null;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(B.lat - A.lat), dLon = toRad(B.lon - A.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(A.lat)) * Math.cos(toRad(B.lat)) * Math.sin(dLon / 2) ** 2;
  return 3440.065 * 2 * Math.asin(Math.sqrt(h));
}

/** Planning block time. 120 min when either field is unknown — stated, never hidden. */
export function estimateMinutes(from: string | null, to: string | null): number {
  if (!from || !to || from === SCHEDULING_DECIDES || to === SCHEDULING_DECIDES) return 120;
  const d = nm(from, to);
  return d === null ? 120 : Math.round((d / KT) * 60 + TAXI_MIN);
}

/** An ICAO we can actually place, or null. `SCHEDULING_DECIDES` is a placeholder, not a field. */
export const icaoOf = (a: string | null | undefined): string | null =>
  a && a !== SCHEDULING_DECIDES ? a : null;

export interface LegClock {
  /** The instant the aircraft leaves, from the departure field's own wall clock. */
  depUtc: string;
  /** Departure plus the planning block time. Scheduling replaces this when a tail is assigned. */
  arrUtc: string;
  /** Both ends read in their own zones, plus elapsed / day-shift / clock-shift. */
  times: LegTimes;
  /** True when the departure time is our planning number rather than one that was set. */
  planned: boolean;
  estimatedMinutes: number;
}

/**
 * The leg's two instants and how each end reads locally. Null when the leg has no date — a leg
 * without a day has no instant, and inventing one would print a confident wrong time.
 *
 * An unplaced departure field falls back to the operator reference zone for the *instant* only
 * (we still have to put the leg somewhere on the calendar); `times.departure.zone` stays null so
 * no surface prints a local time we cannot stand behind.
 */
export function legClock(leg: TripLeg): LegClock | null {
  if (!leg.date) return null;
  const from = icaoOf(leg.from.airport);
  const to = icaoOf(leg.to.airport);
  const zone = (from ? zoneForAirport(from) : null) ?? REFERENCE_ZONE;
  const depUtc = zonedToUtc(leg.date, plannedDepartureLocal(leg), zone);
  const estimatedMinutes = estimateMinutes(from, to);
  const arrUtc = new Date(Date.parse(depUtc) + estimatedMinutes * 60_000).toISOString();
  return {
    depUtc,
    arrUtc,
    // legTimes places each end independently; an unknown code yields a null-zone endpoint.
    times: legTimes({ departureIcao: from ?? '', arrivalIcao: to ?? '', departureUtc: depUtc, arrivalUtc: arrUtc }),
    planned: leg.timing.kind !== 'depart',
    estimatedMinutes,
  };
}

/**
 * One end as a person reads it: "09:20 EDT". When the field has no zone we print the UTC with its
 * Z — a bare "13:20" beside a local time would be read as local, and be wrong by up to 14 hours.
 */
export function formatLegWall(end: LegEndpointTime): string {
  if (end.wallTime && end.zoneLabel) return `${end.wallTime} ${end.zoneLabel}`;
  if (end.wallTime) return end.wallTime;
  return `${end.utcIso.slice(11, 16)}Z`;
}

/** "09:20 EDT → 12:35 PDT · 13:20Z → 19:35Z", with "+1 day" when the calendar turns over. */
export function formatLegClock(c: LegClock): string {
  const day = formatDayShift(c.times.dayShift);
  const local = `${formatLegWall(c.times.departure)} → ${formatLegWall(c.times.arrival)}${day ? ` ${day}` : ''}`;
  const utc = `${c.depUtc.slice(11, 16)}Z → ${c.arrUtc.slice(11, 16)}Z`;
  return `${local} · ${utc}`;
}
