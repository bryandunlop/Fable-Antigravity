// What the request form shows an EA about the days they are asking for.
//
// ADVISORY ONLY. It never blocks a submission: the form already says scheduling assigns the
// aircraft, and an EA asking for a day the fleet looks tight on is still a legitimate ask —
// scheduling may move a trip, release a hold, or find a crew. What this prevents is the EA
// finding out a week later.
//
// Disclosure runs at the source; everything here works on already-disclosed cells and cannot
// widen what an executive or EA sees.

import type { DisclosedCell } from '../../../availability/engine/disclosure';
import type { ReasonCategory } from '../../../availability/types';

export interface DraftLegDates {
  date: string;
}

/** The distinct UTC days a draft touches, in order, ignoring blanks and duplicates. */
export function datesForLegs(legs: DraftLegDates[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const leg of legs) {
    if (!leg.date || seen.has(leg.date)) continue;
    seen.add(leg.date);
    out.push(leg.date);
  }
  return out;
}

export interface TailLine {
  tail: string;
  category: ReasonCategory;
  /** Already-composed exec-safe sentence, or null when the tail is free. */
  label: string | null;
  available: boolean;
}

export interface DayAvailabilityLine {
  dateUtc: string;
  availableTails: string[];
  tails: TailLine[];
  /** True when nothing in the fleet is free that day — the line worth reading. */
  nothingFree: boolean;
}

/** Group disclosed cells into one line per requested day, available tails first. */
export function summarizeByDay(cells: DisclosedCell[], dates: string[]): DayAvailabilityLine[] {
  return dates.map(dateUtc => {
    const tails: TailLine[] = cells
      .filter(c => c.dateUtc === dateUtc)
      .map(c => ({
        tail: c.tail,
        category: c.category,
        label: c.label,
        available: c.state === 'available',
      }))
      .sort((a, b) => Number(b.available) - Number(a.available) || a.tail.localeCompare(b.tail));

    const availableTails = tails.filter(t => t.available).map(t => t.tail);
    return { dateUtc, availableTails, tails, nothingFree: tails.length > 0 && availableTails.length === 0 };
  });
}

/**
 * Whether the tail an executive picked on the fleet week is still free on a chosen day.
 * Null when that day was not asked about, or the tail is not one this viewer can see.
 */
export function requestedTailStatus(
  lines: DayAvailabilityLine[],
  requestedTail: string | null,
  dateUtc: string,
): TailLine | null {
  if (!requestedTail) return null;
  return lines.find(l => l.dateUtc === dateUtc)?.tails.find(t => t.tail === requestedTail) ?? null;
}
