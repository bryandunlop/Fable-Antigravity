import type { TripType } from '../../scheduling/engine';

// Multi-select trip-type filter: an empty selection means "show all" (mirrors the tail-chip
// semantics in FilterBar); otherwise a trip matches when its type is one of the selected.
export function matchesTripTypeFilter(tripType: TripType, selected: Set<TripType>): boolean {
  return selected.size === 0 || selected.has(tripType);
}
