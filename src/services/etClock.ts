/**
 * "HH:MM ET today" arithmetic for the ops surfaces.
 *
 * The demo flight feed (todaysOpsMock) carries bare "HH:MM" Eastern strings —
 * the same convention DailyFlightsWidget already prints raw — so a countdown
 * beside them is a same-day minutes difference, not an instant subtraction.
 * Both sides are read through America/New_York via Intl, so the DST offset is
 * whatever the tz database says on the day (never a fixed -4/-5).
 *
 * DISPLAY ONLY. This never gates anything; when a real scheduling feed lands it
 * will carry UTC instants and this module goes away.
 */

const HHMM = /^([01]?\d|2[0-3]):([0-5]\d)$/;

/** Minutes since Eastern midnight for an instant. */
export function etMinutesOfDay(now: Date): number {
  const [h, m] = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit', hour12: false,
  })
    .format(now)
    .split(':')
    .map(Number);
  return h * 60 + m;
}

/** Minutes from now until "HH:MM" ET today. Negative when already past; NaN on bad input. */
export function minutesUntilEt(hhmm: string, now: Date): number {
  const parts = HHMM.exec(hhmm.trim());
  if (!parts) return NaN;
  const target = Number(parts[1]) * 60 + Number(parts[2]);
  return target - etMinutesOfDay(now);
}

/**
 * "in 3h 10m" / "in 40m" for a time still ahead today; undefined once it is past
 * or unparseable — a countdown that keeps ticking after the event is worse than
 * no countdown, because it reads as authoritative.
 */
export function formatUntilEt(hhmm: string, now: Date): string | undefined {
  const mins = minutesUntilEt(hhmm, now);
  if (!Number.isFinite(mins) || mins <= 0) return undefined;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `in ${m}m`;
  if (m === 0) return `in ${h}h`;
  return `in ${h}h ${m}m`;
}
