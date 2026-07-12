// D24 — regulatory/operational calendar days are anchored to the operator
// reference zone (America/New_York), DST-aware via the IANA tz database.
// Instants are stored UTC; the *calendar day* is derived here, never from the
// UTC date (which rolls over at 19:00/20:00 ET and flips effective/overdue/
// review comparisons a day early).
export const OPERATOR_TIME_ZONE = 'America/New_York';

// en-CA formats as YYYY-MM-DD, matching the ISO date strings compared
// lexicographically throughout the app.
const dayFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: OPERATOR_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Today's ISO date (YYYY-MM-DD) in the operator reference zone. */
export function operatorTodayIso(now: Date = new Date()): string {
  return dayFormat.format(now);
}
