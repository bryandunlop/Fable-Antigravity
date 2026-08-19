import { describe, it, expect } from 'vitest';
import { selectLoggableItems } from './loggableItems';
import type { InventoryItemV2, TripLeg } from './types';

function item(
  id: string,
  itemName: string,
  opts: { g650?: number; g500?: number; isConsumable?: boolean } = {},
): InventoryItemV2 {
  const dq: Partial<Record<'G650' | 'G500', number>> = {};
  if (opts.g650 !== undefined) dq.G650 = opts.g650;
  if (opts.g500 !== undefined) dq.G500 = opts.g500;
  return {
    id,
    itemName,
    description: itemName,
    category: 'test',
    supplyCategory: 'beverages',
    compartmentId: 'aft-galley',
    location: 'Galley Right',
    uom: 'ea',
    vendorItemNumber: `VND-${id}`,
    internalItemNumber: `PG-${id}`,
    costPerUnit: 1,
    defaultQuantities: dq,
    currentQuantity: 0,
    requiredQuantity: 0,
    needsReplenishment: false,
    priority: 'medium',
    alternateNames: [],
    ...(opts.isConsumable !== undefined && { isConsumable: opts.isConsumable }),
  } as InventoryItemV2;
}

function leg(usage: { itemId: string; qtyUsed: number }[] = []): TripLeg {
  return {
    id: 'leg-1',
    tripId: 'trip-1',
    legNumber: 1,
    origin: 'LUK',
    destination: 'TEB',
    date: '2026-05-10',
    paxCount: 3,
    status: 'active',
    phase: 'in_flight',
    usageLog: usage.map((u, i) => ({
      id: `ue-${i}`,
      legId: 'leg-1',
      itemId: u.itemId,
      qtyUsed: u.qtyUsed,
      loggedBy: 'Test',
      loggedAt: '2026-05-10T09:00:00Z',
    })),
    notes: [],
  } as TripLeg;
}

const PERRIER = item('1', 'Perrier 330ml', { g650: 8, g500: 8, isConsumable: true });
// Galley equipment: stocked, but never "used up" on a leg.
const FORKS = item('2', 'Dinner Forks', { g650: 14, g500: 14, isConsumable: false });
const SLICER = item('3', 'Mandolin Slicer', { g650: 1, g500: 1, isConsumable: false });
// Consumable, but not carried on the G500.
const NYQUIL = item('4', 'NyQuil', { g650: 2, isConsumable: true });
// No isConsumable flag at all — the item master's default is "consumable".
const NAPKINS = item('5', 'Cocktail Napkins', { g650: 1, g500: 1 });

const ALL = [PERRIER, FORKS, SLICER, NYQUIL, NAPKINS];
const names = (items: InventoryItemV2[]) => items.map(i => i.itemName);

describe('selectLoggableItems', () => {
  it('keeps consumables stocked on this aircraft type', () => {
    const got = selectLoggableItems({ items: ALL, aircraftType: 'G650', activeLeg: leg() });
    expect(names(got)).toContain('Perrier 330ml');
    expect(names(got)).toContain('NyQuil');
  });

  it('treats a missing isConsumable flag as consumable', () => {
    const got = selectLoggableItems({ items: ALL, aircraftType: 'G650', activeLeg: leg() });
    expect(names(got)).toContain('Cocktail Napkins');
  });

  // TL-43: this is the whole point. Compartment and Category used to show these.
  it('drops galley equipment — you do not log a mandolin slicer as used', () => {
    const got = selectLoggableItems({ items: ALL, aircraftType: 'G650', activeLeg: leg() });
    expect(names(got)).not.toContain('Dinner Forks');
    expect(names(got)).not.toContain('Mandolin Slicer');
  });

  it('drops items with no par for this aircraft type', () => {
    const got = selectLoggableItems({ items: ALL, aircraftType: 'G500', activeLeg: leg() });
    expect(names(got)).not.toContain('NyQuil');
  });

  // Hiding a row must never hide a record that already exists.
  it('keeps a non-consumable that already has usage logged on this leg', () => {
    const got = selectLoggableItems({
      items: ALL,
      aircraftType: 'G650',
      activeLeg: leg([{ itemId: FORKS.id, qtyUsed: 2 }]),
    });
    expect(names(got)).toContain('Dinner Forks');
    expect(names(got)).not.toContain('Mandolin Slicer');
  });

  it('ignores a zero-quantity usage entry when deciding to keep equipment', () => {
    const got = selectLoggableItems({
      items: ALL,
      aircraftType: 'G650',
      activeLeg: leg([{ itemId: FORKS.id, qtyUsed: 0 }]),
    });
    expect(names(got)).not.toContain('Dinner Forks');
  });

  it('applies the search filter, case-insensitively', () => {
    const got = selectLoggableItems({
      items: ALL,
      aircraftType: 'G650',
      activeLeg: leg(),
      search: 'perr',
    });
    expect(names(got)).toEqual(['Perrier 330ml']);
  });

  it('applies the search filter to usage-preserved equipment too', () => {
    const got = selectLoggableItems({
      items: ALL,
      aircraftType: 'G650',
      activeLeg: leg([{ itemId: FORKS.id, qtyUsed: 2 }]),
      search: 'perr',
    });
    expect(names(got)).toEqual(['Perrier 330ml']);
  });

  it('works with no active leg (pre-flight, before a leg exists)', () => {
    const got = selectLoggableItems({ items: ALL, aircraftType: 'G650', activeLeg: null });
    expect(names(got)).not.toContain('Dinner Forks');
    expect(names(got)).toContain('Perrier 330ml');
  });

  it('preserves the input order', () => {
    const got = selectLoggableItems({ items: ALL, aircraftType: 'G650', activeLeg: leg() });
    expect(names(got)).toEqual(['Perrier 330ml', 'NyQuil', 'Cocktail Napkins']);
  });
});
