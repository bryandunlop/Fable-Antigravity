// Maintenance downtime windows — the half of availability that CAMP cannot answer.
//
// CAMP's GetAircraftDueList returns tasks PENDING DUE (3-month cap, DAYS/MOS units); it does
// not return "the aircraft is in the hangar Tue-Fri". myairops MaintenanceEntryModel does, via
// scheduledStartUtc/scheduledEndUtc, which is why MaintenanceDowntimeBlock mirrors it.
//
// Pure. Every function takes the blocks it needs; nothing reads storage or the clock.

import type { MaintenanceDowntimeBlock } from '../types';

const DAY_MS = 86_400_000;

/** 'YYYY-MM-DD' for a UTC instant. */
export function utcDayKey(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/** Midnight UTC opening the given 'YYYY-MM-DD'. */
export function dayStartMs(dateUtc: string): number {
  return Date.parse(`${dateUtc}T00:00:00.000Z`);
}

export interface EffectiveWindow {
  startMs: number;
  endMs: number;
}

/**
 * What the block actually demands of the aircraft, or null when it demands nothing.
 *
 * Actual times win over scheduled ones in BOTH directions: an inspection that finished a day
 * early frees the tail a day early, and one that overran still holds it. `cancelled` and
 * `released` make no demand at all — note that `released` here is myairops' reversible ops-board
 * flag, not a Certificate of Release to Service.
 */
export function effectiveWindow(block: MaintenanceDowntimeBlock): EffectiveWindow | null {
  if (block.cancelled || block.released) return null;

  const startMs = Date.parse(block.actualStartUtc ?? block.scheduledStartUtc);
  const endMs = Date.parse(block.actualEndUtc ?? block.scheduledEndUtc);
  if (Number.isNaN(startMs) || Number.isNaN(endMs)) return null;
  if (endMs < startMs) return null;

  return { startMs, endMs };
}

/**
 * Every block holding `tail` on the given UTC day.
 *
 * A window overlapping ANY part of the day covers the whole day: an aircraft that comes out of
 * the hangar at 23:00Z did not fly that day, and one that goes in at 23:00Z has already been
 * committed to it. Availability is a day-grained question, so a partial overlap is a full block.
 */
export function blocksCoveringDay(
  blocks: MaintenanceDowntimeBlock[],
  tail: string,
  dateUtc: string,
): MaintenanceDowntimeBlock[] {
  const dayStart = dayStartMs(dateUtc);
  if (Number.isNaN(dayStart)) return [];
  const dayEnd = dayStart + DAY_MS - 1;

  return blocks.filter(b => {
    if (b.tail !== tail) return false;
    const w = effectiveWindow(b);
    return w !== null && w.startMs <= dayEnd && w.endMs >= dayStart;
  });
}

/**
 * The date the aircraft is expected back — the ETR shown to every audience.
 *
 * Earliest end among the covering blocks: the tail is available again as soon as the first one
 * frees it, and any later block will assert its own coverage on its own days. Null when nothing
 * covers the day, which is the honest answer for a RED tail with no block scheduled (LG-308) —
 * synthesising a return date is exactly what that row objects to.
 */
export function returnToServiceUtc(
  blocks: MaintenanceDowntimeBlock[],
  tail: string,
  dateUtc: string,
): string | null {
  const covering = blocksCoveringDay(blocks, tail, dateUtc);
  if (covering.length === 0) return null;

  const ends = covering
    .map(b => effectiveWindow(b)?.endMs)
    .filter((ms): ms is number => ms !== undefined);
  if (ends.length === 0) return null;

  return new Date(Math.min(...ends)).toISOString();
}
