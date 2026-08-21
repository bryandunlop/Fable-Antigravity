// D24 display layer. A regulatory instant is stored in UTC (one absolute moment); this renders it
// through a chosen lens for display ONLY — it never affects the grounding decision (isDeferralExpired
// compares UTC instants). Default lens is the deferral's own governing zone so every device shows the
// same regulatory calendar day; UTC and device-Local are cross-reference toggles.

export type DisplayZoneMode = 'GOVERNING' | 'UTC' | 'LOCAL';

export interface FormattedInstant {
  date: string;       // e.g. "Jan 30, 2026"
  time: string;       // 24h e.g. "00:00"
  zoneLabel: string;  // DST-correct short name, e.g. "EST" | "EDT" | "UTC" | "PST"
  differsFromGoverningDate: boolean; // true when this lens lands on a different calendar day than the governing zone
}

/** The device's current IANA zone (what "Local" resolves to). Isolated so it can be injected in tests. */
export function deviceZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

function zoneFor(mode: DisplayZoneMode, governingZone: string, device: string): string {
  if (mode === 'UTC') return 'UTC';
  if (mode === 'LOCAL') return device;
  return governingZone;
}

function dateIn(iso: string, zone: string): string {
  return new Intl.DateTimeFormat('en-US', { timeZone: zone, month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(iso));
}

/** Render a stored UTC instant through the given display lens (D24). */
export function formatRegulatoryInstant(
  iso: string,
  mode: DisplayZoneMode,
  governingZone: string,
  device: string = deviceZone(),
): FormattedInstant {
  const zone = zoneFor(mode, governingZone, device);
  const d = new Date(iso);
  const time = new Intl.DateTimeFormat('en-US', { timeZone: zone, hour: '2-digit', minute: '2-digit', hour12: false }).format(d);
  const zoneLabel = new Intl.DateTimeFormat('en-US', { timeZone: zone, timeZoneName: 'short' })
    .formatToParts(d).find(p => p.type === 'timeZoneName')?.value ?? zone;
  const date = dateIn(iso, zone);
  return { date, time, zoneLabel, differsFromGoverningDate: date !== dateIn(iso, governingZone) };
}

/** Compact one-line render, e.g. "Jan 30, 2026 · 00:00 EST". */
export function formatRegulatoryLabel(iso: string, mode: DisplayZoneMode, governingZone: string, device?: string): string {
  const f = formatRegulatoryInstant(iso, mode, governingZone, device);
  return `${f.date} · ${f.time} ${f.zoneLabel}`;
}

/** List-friendly render: drops the time when it is midnight in the shown zone (the governing-mode
 * common case), keeps it otherwise so a shifted lens (UTC/Local) still reads unambiguously.
 * For START/point instants only (clock start, noticed/reported, signed-at). An END boundary must
 * use formatRegulatoryDeadline — a midnight expiry rendered as its own bare date reads a full day
 * late (LG-195). */
export function formatRegulatoryCompact(iso: string, mode: DisplayZoneMode, governingZone: string, device?: string): string {
  const f = formatRegulatoryInstant(iso, mode, governingZone, device);
  return f.time === '00:00' ? `${f.date} ${f.zoneLabel}` : `${f.date} · ${f.time} ${f.zoneLabel}`;
}

/** Deadline render for an END boundary (deferral repair-due / expiry). A midnight boundary is the
 * previous calendar day ending, so it renders as that day at 23:59 — PL-25's own idiom ("2359 on
 * February 5"), never the bare next-day date a reader mistakes for an extra working day (LG-195).
 * Non-midnight boundaries pass through with their time. Display-only: the grounding decision
 * remains isDeferralExpired comparing UTC instants, and the stored instant never changes.
 * NOT for CAMP coming-due dates — those are calendar days (due DURING that day), a different
 * convention that formatRegulatoryCompact already renders correctly. */
export function formatRegulatoryDeadline(iso: string, mode: DisplayZoneMode, governingZone: string, device?: string): string {
  const f = deadlineParts(iso, mode, governingZone, device);
  return `${f.date} · ${f.time} ${f.zoneLabel}`;
}

/**
 * The same END boundary for a surface with no room for a year — a hangar-TV lane label.
 * Identical day-shift to formatRegulatoryDeadline (that is the whole reason this exists rather
 * than callers slicing the long string or reformatting the raw instant, either of which would
 * quietly reintroduce LG-195's day-late read). Drops ONLY the year.
 */
export function formatRegulatoryDeadlineShort(iso: string, mode: DisplayZoneMode, governingZone: string, device?: string): string {
  const f = deadlineParts(iso, mode, governingZone, device);
  // "Aug 18, 2026" -> "Aug 18". The year is the only thing a tight surface may drop; the
  // day and time carry the regulatory meaning.
  return `${f.date.replace(/,\s*\d{4}$/, '')} · ${f.time} ${f.zoneLabel}`;
}

/**
 * An END boundary resolved to the parts that should be DISPLAYED: a midnight boundary becomes
 * the previous day at 23:59 (PL-25's idiom), everything else passes through untouched.
 */
function deadlineParts(iso: string, mode: DisplayZoneMode, governingZone: string, device?: string): FormattedInstant {
  const f = formatRegulatoryInstant(iso, mode, governingZone, device);
  if (f.time !== '00:00') return f;
  const lastMinute = new Date(new Date(iso).getTime() - 60_000).toISOString();
  return formatRegulatoryInstant(lastMinute, mode, governingZone, device);
}
