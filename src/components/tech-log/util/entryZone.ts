import { TZDate } from '@date-fns/tz';
import { DEFAULT_GOVERNING_TIMEZONE } from '../engine/pl25';
import { deviceZone } from './displayZone';

// D56 entry layer — the mirror of the D24 display layer in `displayZone.ts`.
//
// `displayZone` renders a stored UTC instant through a chosen lens. This does the reverse: it takes
// the wall-clock digits a user typed into an `<input type="datetime-local">` plus the zone they meant
// them in, and produces the one UTC instant to store. Storage is always UTC; the zone is only how
// the digits are interpreted.
//
// The conversion is `TZDate` from `@date-fns/tz` — the same primitive `engine/pl25.ts` uses for the
// PL-25 midnight boundary, and for the same reason: the offset must come from the zone's real DST
// rules. Eastern is UTC-5 in January and UTC-4 in July; a fixed offset is wrong for half the year.
// NOTE (as in pl25.ts): use the multi-arg TZDate constructor, NOT date-fns helpers — in date-fns
// 3.6.0 those strip the TZDate zone and fall back to host-local time.

/** The three entry modes D56 asks for. */
export type EntryZoneMode = 'UTC' | 'EASTERN' | 'LOCAL';

export const ENTRY_ZONE_OPTIONS: { mode: EntryZoneMode; label: string }[] = [
  { mode: 'UTC', label: 'UTC (Z)' },
  { mode: 'EASTERN', label: 'Eastern (ET)' },
  { mode: 'LOCAL', label: 'Device local' },
];

/** The IANA zone an entry mode resolves to. `device` is injectable for tests. */
export function entryZone(mode: EntryZoneMode, device: string = deviceZone()): string {
  if (mode === 'UTC') return 'UTC';
  if (mode === 'EASTERN') return DEFAULT_GOVERNING_TIMEZONE;
  return device;
}

// `datetime-local` yields "YYYY-MM-DDTHH:mm"; some browsers append ":ss" when a sub-minute step is set.
const WALL_TIME = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;

/**
 * Wall-clock digits interpreted in `zone` -> the UTC ISO instant to store.
 * Returns null for an incomplete or unparseable entry, so a half-typed field can never be stored as
 * a plausible-looking wrong instant (the caller keeps the previous value and blocks the sign).
 *
 * ONE-WAY DURING A DST FALL-BACK REPEAT. A wall time inside the repeated hour names two instants,
 * and this resolves it to the EARLIER (pre-transition) one. So `wallTimeFromUtc` and
 * `utcFromWallTime` are NOT inverses for that hour: sending the displayed digits back through here
 * unchanged — which is what a signer re-entering the value they were already shown does — moves the
 * stored instant back by an hour. Verified: `2026-11-01T06:30:00.000Z` (01:30 EST, post-transition)
 * renders as `"2026-11-01T01:30"`, which converts back to `2026-11-01T05:30:00.000Z` (01:30 EDT) —
 * one hour earlier.
 *
 * THE BOUND — it cannot change a day of discovery or a repair-due date. An exhaustive scan of every
 * 30-minute instant over five years (2024-2029) across all eleven zones in `GOVERNING_ZONE_OPTIONS`
 * found 70 round-trip divergences and ZERO clock-start divergences: every DST zone in the governing
 * set repeats somewhere in 01:00-02:59 local, and an hour subtracted inside that window cannot
 * straddle local midnight, so the PL-25 calendar day is identical either way. The error is one hour
 * of recorded precision on a value whose regulatory meaning is a calendar day.
 *
 * NOT FIXED, deliberately. A real fix means replacing `<input type="datetime-local">`, which has no
 * way to express EST-vs-EDT — the control structurally cannot carry the disambiguation, so the only
 * remedy is a different control. Not worth it for a bounded, non-regulatory one-hour discrepancy.
 */
export function utcFromWallTime(wall: string, zone: string): string | null {
  const m = WALL_TIME.exec(wall.trim());
  if (!m) return null;
  const t = new TZDate(
    Number(m[1]), Number(m[2]) - 1, Number(m[3]),
    Number(m[4]), Number(m[5]), Number(m[6] ?? 0), 0,
    zone,
  );
  const ms = t.getTime();
  return Number.isNaN(ms) ? null : new Date(ms).toISOString();
}

const pad = (n: number, width = 2) => String(n).padStart(width, '0');

/**
 * A stored UTC ISO instant -> the `datetime-local` value that shows it as wall-clock digits in
 * `zone`. Empty string for an unusable instant (an invalid `value` makes the input go blank rather
 * than render "NaN-NaN-NaN").
 */
export function wallTimeFromUtc(iso: string, zone: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const z = TZDate.tz(zone, d);
  return `${pad(z.getFullYear(), 4)}-${pad(z.getMonth() + 1)}-${pad(z.getDate())}T${pad(z.getHours())}:${pad(z.getMinutes())}`;
}
