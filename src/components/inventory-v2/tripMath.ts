import type { Trip } from './types';

/**
 * On-board quantity for an item on a trip: `par + loaded extras − logged usage`.
 *
 * Par lookup is the caller's job (`item.defaultQuantities[trip.aircraftType] ?? 0`)
 * so this stays a pure function over the trip alone.
 *
 * `opts.upToLegId` scopes the calculation by leg array order:
 * - `undefined` (omitted) — whole trip: all usage, all load items.
 * - a leg id — usage from legs up to and including that leg; load items with no
 *   `legId` (pre-trip) or a `legId` of a counted leg. An unknown id counts no legs.
 * - `null` — before any leg flew: pre-trip load items only, no usage.
 */
export function getOnBoardQty(
  trip: Trip,
  itemId: string,
  par: number,
  opts: { upToLegId?: string | null } = {}
): number {
  const { upToLegId } = opts;

  const countedLegs =
    upToLegId === undefined
      ? trip.legs
      : upToLegId === null
        ? []
        : trip.legs.slice(0, trip.legs.findIndex(l => l.id === upToLegId) + 1);

  const usage = countedLegs
    .flatMap(l => l.usageLog)
    .filter(e => e.itemId === itemId)
    .reduce((sum, e) => sum + e.qtyUsed, 0);

  const countedLegIds = new Set(countedLegs.map(l => l.id));
  const loadTotal = (trip.loadItems ?? [])
    .filter(li => li.itemId === itemId)
    .filter(li => upToLegId === undefined || li.legId === undefined || countedLegIds.has(li.legId))
    .reduce((sum, li) => sum + li.qty, 0);

  return par + loadTotal - usage;
}
