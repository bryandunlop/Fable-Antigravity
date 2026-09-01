/**
 * Airport -> IANA time zone, derived from the field's coordinates.
 *
 * Before this module, the only zone table in the app was a 19-entry literal locked inside
 * `components/ops-wall/SunTimesChip.tsx` — invisible to every other surface, and hand-maintained
 * in step with `airportCoords`. Deriving the zone from lat/lon removes the second list entirely:
 * anything we can plot, we can clock. (LG-312)
 *
 * `tz-lookup` (CC0, one 73 KB file, no dependencies, browser-safe) resolves a coordinate against
 * the IANA time-zone boundaries. It is a pure geographic lookup — it knows nothing about DST.
 * The offset for a given instant comes from `Intl` and the host's tz database, which is what makes
 * `offsetMinutesAt` DST-correct. Same discipline as the D24 MEL clock: never a fixed offset.
 *
 * DISPLAY AND PLANNING ONLY. This is not the regulatory clock. The PL-25 calendar-day boundary is
 * anchored to the deferral's own `governing_timezone` (D24) and lives in `tech-log/engine/pl25.ts`;
 * do not reach for a field-local zone to decide any regulatory boundary.
 */

import tzLookup from 'tz-lookup';
import { lookupAirport, normalizeAirportCode } from './airportCoords';

/**
 * Curated zone overrides, applied before the coordinate lookup.
 *
 * Deliberately empty. A field whose published coordinates sit on the wrong side of a zone boundary
 * (they exist — border fields, and enclaves like the Arizona Navajo Nation) gets one line here with
 * a comment saying who confirmed it. An empty override table is the honest state: nothing has been
 * proven wrong yet. The coordinate lookup was verified against all 22 hand-curated stations the
 * app previously carried and matched every one — see `airportZone.test.ts`.
 */
export const ZONE_OVERRIDES: Record<string, string> = {};

/**
 * The IANA zone for an airport code (ICAO or IATA), or `null` when we have no coordinates for it.
 *
 * `null` is load-bearing: a station we cannot place must render no local time at all rather than
 * quietly falling back to UTC, which reads as a real local time and is wrong by up to 14 hours.
 */
export function zoneForAirport(code: string | undefined | null): string | null {
  const key = normalizeAirportCode(code);
  if (!key) return null;
  const override = ZONE_OVERRIDES[key];
  if (override) return override;
  const field = lookupAirport(key);
  if (!field) return null;
  try {
    return tzLookup(field.lat, field.lon);
  } catch {
    // tz-lookup throws on an out-of-range coordinate. A bad row in the table must not take
    // down a trip page.
    return null;
  }
}

/** The zone's offset from UTC, in minutes, at that instant — DST included. */
export function offsetMinutesAt(iso: string, zone: string): number | null {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return null;
  const label = new Intl.DateTimeFormat('en-US', { timeZone: zone, timeZoneName: 'longOffset' })
    .formatToParts(at)
    .find((p) => p.type === 'timeZoneName')?.value;
  // "GMT+05:30", "GMT-04:00", or bare "GMT" at exactly zero.
  const m = /^GMT(?:([+-])(\d{2}):(\d{2}))?$/.exec(label ?? '');
  if (!m) return null;
  if (!m[1]) return 0;
  const minutes = Number(m[2]) * 60 + Number(m[3]);
  return m[1] === '-' ? -minutes : minutes;
}

/** How the field itself abbreviates its zone at that instant — "EDT", "EST", "GMT+4". */
export function zoneLabelAt(iso: string, zone: string): string | null {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return null;
  return (
    new Intl.DateTimeFormat('en-US', { timeZone: zone, timeZoneName: 'short' })
      .formatToParts(at)
      .find((p) => p.type === 'timeZoneName')?.value ?? null
  );
}
