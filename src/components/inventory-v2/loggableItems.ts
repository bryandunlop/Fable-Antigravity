import type { InventoryItemV2, TripLeg } from './types';

/**
 * The item list a crew member can log usage against on a leg.
 *
 * One definition, so every trip view agrees on what the list IS (TL-43). Before
 * this, Quick Tap filtered `isConsumable !== false` inside `QuickTapView` while
 * Compartment and Category filtered only on par + search inside `TripHome` — 98
 * items versus 149 on the G650. Switching view changed the list under the user,
 * and two of the three views put a plus/minus stepper next to a Mandolin Slicer
 * and a set of Headsets and asked how many were used this leg.
 *
 * `isConsumable: false` is the item master's own marker for galley equipment
 * (dishware, cutlery, trays, oven mitts, headsets) — carried and inspected, but
 * never consumed. It is excluded from *logging* only; inspection and loading
 * flows still need those lines, so they must not reach for this function.
 *
 * The one exception is deliberate: an item that already carries usage on this
 * leg stays visible even when it is equipment. Hiding a row must never hide a
 * record — otherwise a stray entry becomes invisible and uneditable while still
 * counting toward the leg total.
 */
export function selectLoggableItems({
  items,
  aircraftType,
  activeLeg,
  search = '',
}: {
  items: InventoryItemV2[];
  aircraftType: 'G650' | 'G500';
  activeLeg: TripLeg | null;
  search?: string;
}): InventoryItemV2[] {
  const loggedOnThisLeg = new Set(
    (activeLeg?.usageLog ?? []).filter(e => e.qtyUsed > 0).map(e => e.itemId),
  );
  const needle = search.trim().toLowerCase();

  return items.filter(item => {
    const par = item.defaultQuantities[aircraftType];
    if (!par || par <= 0) return false;

    const isEquipment = item.isConsumable === false;
    if (isEquipment && !loggedOnThisLeg.has(item.id)) return false;

    if (needle && !item.itemName.toLowerCase().includes(needle)) return false;

    return true;
  });
}
