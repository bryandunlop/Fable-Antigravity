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

/**
 * Display a **date-only** field (`effectiveDate`, `expirationDate`, `ackDueDate`,
 * `nextReviewDate`) — a calendar day, not an instant.
 *
 * LG-117: `new Date('2024-11-01')` is parsed as UTC midnight per ECMA-262, so
 * `toLocaleDateString()` renders it as Oct 31 anywhere west of Greenwich. That shipped:
 * one controlled publication read "Nov 1, 2024" in the Document Center and "10/31/2024"
 * on the legacy bulletins page and in the printed copy. An effective date is a
 * regulatory attribute — the binder copy and the screen must not disagree.
 *
 * Parsing the components explicitly (rather than `new Date(\`${iso}T00:00:00\`)`) keeps
 * this independent of how the host parses date strings, and lets a malformed value fall
 * through as itself instead of rendering "Invalid Date" on a controlled publication.
 *
 * For a real timestamp (a `*AtUtc` field) use `new Date(utc).toLocaleString()` — those
 * ARE instants and should render in the reader's local zone.
 */
export function formatDateOnly(
  iso: string,
  options?: Intl.DateTimeFormatOptions,
  locale = 'en-US',
): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  const [, y, mo, d] = m.map(Number);
  const date = new Date(y, mo - 1, d); // local midnight — no zone shift
  // Round-trip guard: JS rolls 2024-13-45 over into 2025. A silently shifted date is
  // exactly the failure this function exists to prevent, so reject rather than display.
  if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d) return iso;
  return date.toLocaleDateString(locale, options);
}
