// Time-axis math for the hangar TV walls (D88). Pure — tested in wallTime.test.ts.
//
// The ops wall draws the day as swimlanes on a fixed 0600–2200 ET axis. Times in
// the demo feed (todaysOpsMock) are bare "HH:MM" ET strings, matching what the
// DailyFlightsWidget already prints raw.

export const AXIS_START_MIN = 6 * 60;
export const AXIS_END_MIN = 22 * 60;
const AXIS_SPAN = AXIS_END_MIN - AXIS_START_MIN;

export function hhmmToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + (m || 0);
}

/** Percent [0..100] of a minutes-since-midnight instant on the axis, clamped. */
export function pctOnAxis(minutes: number): number {
  return Math.max(0, Math.min(100, ((minutes - AXIS_START_MIN) / AXIS_SPAN) * 100));
}

/** Block geometry for a leg from departure to arrival (both "HH:MM" ET), clamped to the axis. */
export function legBlockPct(dep: string, arr: string): { leftPct: number; widthPct: number } {
  const leftPct = pctOnAxis(hhmmToMinutes(dep));
  const rightPct = pctOnAxis(hhmmToMinutes(arr));
  return { leftPct, widthPct: Math.max(0, rightPct - leftPct) };
}
