/**
 * What day is it, for the operator?
 *
 * The fleet calendar is a picture of days, and a day only exists relative to a zone. The app was
 * mixing two answers: the availability engine counts UTC days, the month grid was built from the
 * browser's local days. After 20:00 Eastern those disagree, and the grid drew a "today" cell the
 * engine had no row for — the month appeared to start tomorrow (LG-330, seen 2026-09-01).
 *
 * One answer, and it is the one the department already uses: the operator reference zone,
 * `America/New_York` (D24). DST-aware via `Intl`, never a fixed offset.
 *
 * Not the regulatory clock. D24 anchors the PL-25 calendar-day boundary to the same zone, but that
 * computation lives in `tech-log/engine/pl25.ts` with its own per-deferral override; this is a
 * display calendar and nothing more.
 */

import { REFERENCE_ZONE } from './cutoffs';

/** "YYYY-MM-DD" as the operator reference zone reads that instant. */
export function referenceDayKey(nowUtc: string): string {
  const at = new Date(nowUtc);
  if (Number.isNaN(at.getTime())) return nowUtc.slice(0, 10);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: REFERENCE_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(at);
  const get = (t: string) => parts.find(p => p.type === t)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

/**
 * Today as a `Date` whose LOCAL calendar parts are the operator's day — the shape a month grid
 * wants. The instant is meaningless; only year/month/date are ever read.
 */
export function referenceToday(nowUtc: string): Date {
  const [y, m, d] = referenceDayKey(nowUtc).split('-').map(Number);
  return new Date(y, m - 1, d);
}
