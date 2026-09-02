// The month calendar's per-day picture of THE FOUR — the executive schedule page (D104).
//
// Two things this does that `disclose()` alone does not:
//   1. Restricts to the core fleet register. The tech-log projection knows six airframes (the
//      demo-only N7PG and the incoming G800 among them); the schedule an executive plans
//      against is four. Showing six taught the old fleet week to say "3 of 6 available".
//   2. Treats a core tail the engine said NOTHING about as unavailable, not free. Absence of a
//      verdict is not a verdict — the same default-RED discipline the tech-log projection uses.
//
// Disclosure still runs through `discloseCell`, so the audience boundary is the engine's, not
// this file's. Pure: no React, no storage, no clock.

import { CORE_TAILS } from '../../fleet/registry';
import type { Audience, FleetAvailability, TailDayAvailability } from '../types';
import { discloseCell, type DisclosedCell } from './disclosure';

/** 'YYYY-MM-DD' → one disclosed cell per core tail, in register order. */
export type CoreFleetByDay = Record<string, DisclosedCell[]>;

function unknownCell(tail: string, dateUtc: string): DisclosedCell {
  return {
    tail,
    dateUtc,
    state: 'unavailable',
    category: 'not-in-service',
    label: 'Not yet in service',
    untilUtc: null,
  };
}

export function coreFleetByDay(fleet: FleetAvailability, audience: Audience): CoreFleetByDay {
  const cellIndex = new Map<string, TailDayAvailability>();
  for (const row of fleet.rows) {
    for (const c of row.cells) cellIndex.set(`${row.tail}|${c.dateUtc}`, c);
  }

  const out: CoreFleetByDay = {};
  for (const day of fleet.days) {
    out[day.dateUtc] = CORE_TAILS.map(tail => {
      const c = cellIndex.get(`${tail}|${day.dateUtc}`);
      return c ? discloseCell(c, audience) : unknownCell(tail, day.dateUtc);
    });
  }
  return out;
}

/** Short word for a chip, from the disclosed category only — never from the model. */
export function chipWord(cell: DisclosedCell): string {
  switch (cell.category) {
    case 'none': return 'open';
    case 'maintenance': return 'maint';
    case 'not-in-service': return 'not in svc';
    case 'no-crew': return 'no crew';
    case 'not-yet-rostered': return 'open';
    case 'committed': return 'away';
    case 'held': return 'held';
  }
}
