// Relative dates for demo seed data — the one helper, shared.
//
// The safety seeds used to carry absolute dates, and they rotted: hazards
// stamped February 2024 read as 925 days in stage, and audits stamped February
// 2026 read as "172 days overdue" on a crew member's home screen. Both made
// working features look broken, and the age-bucketed board (D85 · C4) collapsed
// into a single column because every case was ancient.
//
// Bumping the numbers would only reset the clock on the same failure. Seeds are
// now offsets from the moment the demo first seeds, so they age naturally from
// whenever someone starts. They freeze into localStorage on first run, exactly
// as a real record would, and "Reset demo" regenerates them from the new today.
//
// Anchored to the OPERATOR calendar day (D24 · America/New_York), not UTC — the
// same anchor the app's own effective/overdue comparisons use. A UTC anchor
// disagrees with them for the hours around UTC midnight, which is precisely when
// a due-today row would flip to overdue on screen and nowhere else.
//
// NOT for production data. Anything a regulation cares about carries a real
// stamped date; this is scenery.

import { operatorTodayIso } from './operatorDate';

export function daysFromNow(n: number): string {
  const d = new Date(`${operatorTodayIso()}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function today(): string {
  return daysFromNow(0);
}

export function daysAgo(n: number): string {
  return daysFromNow(-n);
}

export function daysAhead(n: number): string {
  return daysFromNow(n);
}
