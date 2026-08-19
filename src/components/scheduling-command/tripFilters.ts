import type { TripType } from '../../scheduling/engine';

// Multi-select trip-type filter: an empty selection means "show all" (mirrors the tail-chip
// semantics in FilterBar); otherwise a trip matches when its type is one of the selected.
export function matchesTripTypeFilter(tripType: TripType, selected: Set<TripType>): boolean {
  return selected.size === 0 || selected.has(tripType);
}

// Work-ahead predicate (D87 amendment, Bryan 2026-08-19): schedulers clear work AHEAD of due
// dates, so "needs attention" filtering must never hide a trip that still has anything open —
// the only trips worth hiding are the fully CLEARED ones. Due dates order the spine; they are
// never a gate on visibility.
import type { BoardTrip } from './adapter';

export function hasOpenWork(trip: BoardTrip): boolean {
  if (trip.criticalBlocker) return true;
  return trip.tasks.some(t => t.status !== 'done' && t.status !== 'n_a');
}

/** Trip counts per tail / per type, so the filter popover states what each choice yields. */
export function filterCounts(trips: BoardTrip[]): { byTail: Map<string, number>; byType: Map<TripType, number> } {
  const byTail = new Map<string, number>();
  const byType = new Map<TripType, number>();
  for (const t of trips) {
    byTail.set(t.aircraft, (byTail.get(t.aircraft) ?? 0) + 1);
    byType.set(t.tripType, (byType.get(t.tripType) ?? 0) + 1);
  }
  return { byTail, byType };
}
