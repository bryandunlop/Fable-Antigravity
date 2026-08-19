import { describe, it, expect } from 'vitest';
import {
  buildLedgerRows,
  groupByCompartment,
  groupByCategory,
  compartmentSummary,
  belowParRows,
} from './tripLedger';
import type { InventoryItemV2, Trip, TripLeg, CompartmentDefinition } from './types';

// ─── fixtures ────────────────────────────────────────────────────────────────

function item(
  id: string,
  itemName: string,
  o: {
    g650?: number;
    compartmentId?: string;
    location?: string;
    supplyCategory?: string;
    isConsumable?: boolean;
  } = {},
): InventoryItemV2 {
  return {
    id,
    itemName,
    description: itemName,
    category: 'test',
    supplyCategory: (o.supplyCategory ?? 'beverages') as InventoryItemV2['supplyCategory'],
    compartmentId: o.compartmentId ?? 'aft-galley',
    location: o.location ?? 'Galley Right',
    uom: 'ea',
    vendorItemNumber: `VND-${id}`,
    internalItemNumber: `PG-${id}`,
    costPerUnit: 1,
    defaultQuantities: o.g650 === undefined ? {} : { G650: o.g650 },
    currentQuantity: 0,
    requiredQuantity: 0,
    needsReplenishment: false,
    priority: 'medium',
    alternateNames: [],
    ...(o.isConsumable !== undefined && { isConsumable: o.isConsumable }),
  } as InventoryItemV2;
}

const PERRIER = item('1', 'Perrier 330ml', { g650: 8 });
const COLA = item('2', 'Coca-Cola', { g650: 6 });
const NESPRESSO = item('3', 'Nespresso Pods', {
  g650: 4, compartmentId: 'fwd-galley', location: 'Galley Left', supplyCategory: 'coffee',
});
const TRASH = item('4', 'Black Trash Bags', {
  g650: 10, compartmentId: 'aft-galley', location: 'Under Counter', supplyCategory: 'cleaning-supplies',
});
const FORKS = item('5', 'Dinner Forks', {
  g650: 14, compartmentId: 'fwd-galley', location: 'Galley Left',
  supplyCategory: 'kitchen-supplies', isConsumable: false,
});

const ITEMS = [PERRIER, COLA, NESPRESSO, TRASH, FORKS];

const COMPARTMENTS: CompartmentDefinition[] = [
  { id: 'fwd-galley', label: 'Forward Galley', icon: 'Coffee', color: 'text-amber-400', sortOrder: 1 },
  { id: 'aft-galley', label: 'Aft Galley', icon: 'UtensilsCrossed', color: 'text-orange-400', sortOrder: 2 },
  { id: 'chiller', label: 'Chiller', icon: 'Snowflake', color: 'text-sky-400', sortOrder: 3 },
];

function leg(usage: [string, number][] = []): TripLeg {
  return {
    id: 'leg-1', tripId: 'trip-1', legNumber: 1, origin: 'LUK', destination: 'TEB',
    date: '2026-05-10', paxCount: 3, status: 'active', phase: 'in_flight',
    usageLog: usage.map(([itemId, qtyUsed], i) => ({
      id: `ue-${i}`, legId: 'leg-1', itemId, qtyUsed, loggedBy: 'T', loggedAt: '2026-05-10T09:00:00Z',
    })),
    notes: [],
  } as TripLeg;
}

function trip(legs: TripLeg[], loads: { itemId: string; qty: number; legId?: string }[] = []): Trip {
  return {
    id: 'trip-1', tailNumber: 'N1PG', aircraftType: 'G650', tripName: 'T', status: 'active',
    startDate: '2026-05-10', createdBy: 'T', createdAt: '2026-05-09T00:00:00Z',
    notes: [], returnItems: [], legs,
    loadItems: loads.map((l, i) => ({
      id: `tl-${i}`, itemId: l.itemId, qty: l.qty, source: 'commissary' as const,
      loadedBy: 'T', loadedAt: '2026-05-10T06:00:00Z', ...(l.legId && { legId: l.legId }),
    })),
  } as Trip;
}

const rowFor = (rows: ReturnType<typeof buildLedgerRows>, name: string) =>
  rows.find(r => r.item.itemName === name)!;

// ─── buildLedgerRows ─────────────────────────────────────────────────────────

describe('buildLedgerRows', () => {
  it('carries par, loaded, used and on-board for each item', () => {
    const l = leg([['1', 4], ['2', 3]]);
    const rows = buildLedgerRows({
      items: ITEMS, trip: trip([l], [{ itemId: '1', qty: 4 }]), leg: l, aircraftType: 'G650',
    });
    const perrier = rowFor(rows, 'Perrier 330ml');
    expect(perrier.par).toBe(8);
    expect(perrier.loaded).toBe(4);
    expect(perrier.used).toBe(4);
    expect(perrier.onBoard).toBe(8); // 8 par + 4 loaded − 4 used

    const cola = rowFor(rows, 'Coca-Cola');
    expect(cola.loaded).toBe(0);
    expect(cola.used).toBe(3);
    expect(cola.onBoard).toBe(3);
  });

  it('excludes items with no par for the aircraft type', () => {
    const l = leg();
    const rows = buildLedgerRows({
      items: [...ITEMS, item('9', 'G500 Only', {})], trip: trip([l]), leg: l, aircraftType: 'G650',
    });
    expect(rows.map(r => r.item.itemName)).not.toContain('G500 Only');
  });

  it('flags equipment rather than dropping it — the caller decides', () => {
    const l = leg();
    const rows = buildLedgerRows({ items: ITEMS, trip: trip([l]), leg: l, aircraftType: 'G650' });
    expect(rowFor(rows, 'Dinner Forks').isEquipment).toBe(true);
    expect(rowFor(rows, 'Perrier 330ml').isEquipment).toBe(false);
  });

  it('honours the search filter', () => {
    const l = leg();
    const rows = buildLedgerRows({
      items: ITEMS, trip: trip([l]), leg: l, aircraftType: 'G650', search: 'COLA',
    });
    expect(rows.map(r => r.item.itemName)).toEqual(['Coca-Cola']);
  });

  it('reports zero usage with no active leg', () => {
    const rows = buildLedgerRows({ items: ITEMS, trip: trip([]), leg: null, aircraftType: 'G650' });
    expect(rowFor(rows, 'Perrier 330ml').used).toBe(0);
    expect(rowFor(rows, 'Perrier 330ml').onBoard).toBe(8);
  });
});

// ─── groupByCompartment ──────────────────────────────────────────────────────

describe('groupByCompartment', () => {
  const l = leg([['1', 4], ['4', 2]]);
  const rows = buildLedgerRows({ items: ITEMS, trip: trip([l]), leg: l, aircraftType: 'G650' });

  it('groups by compartment in the configured order, then by stowage location', () => {
    const groups = groupByCompartment(rows, COMPARTMENTS);
    expect(groups.map(g => g.label)).toEqual(['Forward Galley', 'Aft Galley']);

    const aft = groups.find(g => g.label === 'Aft Galley')!;
    expect(aft.sections.map(s => s.label)).toEqual(['Galley Right', 'Under Counter']);
    expect(aft.sections[0].rows.map(r => r.item.itemName)).toEqual(['Perrier 330ml', 'Coca-Cola']);
    expect(aft.sections[1].rows.map(r => r.item.itemName)).toEqual(['Black Trash Bags']);
  });

  // TL-44: main-cabin and chiller are declared but hold nothing.
  it('omits compartments that hold no rows', () => {
    const groups = groupByCompartment(rows, COMPARTMENTS);
    expect(groups.map(g => g.id)).not.toContain('chiller');
  });

  it('totals usage per compartment', () => {
    const groups = groupByCompartment(rows, COMPARTMENTS);
    expect(groups.find(g => g.id === 'aft-galley')!.usedTotal).toBe(6); // 4 Perrier + 2 trash bags
    expect(groups.find(g => g.id === 'fwd-galley')!.usedTotal).toBe(0);
  });

  it('keeps rows whose compartment is not in the config, under their own heading', () => {
    const orphan = item('7', 'Orphan', { g650: 1, compartmentId: 'nowhere', location: 'Somewhere' });
    const l2 = leg();
    const r2 = buildLedgerRows({ items: [...ITEMS, orphan], trip: trip([l2]), leg: l2, aircraftType: 'G650' });
    const groups = groupByCompartment(r2, COMPARTMENTS);
    expect(groups.map(g => g.id)).toContain('nowhere');
  });
});

// ─── compartmentSummary ──────────────────────────────────────────────────────

describe('compartmentSummary', () => {
  it('counts rows per compartment for the picker, config order, empties dropped', () => {
    const l = leg();
    const rows = buildLedgerRows({ items: ITEMS, trip: trip([l]), leg: l, aircraftType: 'G650' });
    expect(compartmentSummary(rows, COMPARTMENTS)).toEqual([
      { id: 'fwd-galley', label: 'Forward Galley', count: 2 },
      { id: 'aft-galley', label: 'Aft Galley', count: 3 },
    ]);
  });
});

// ─── groupByCategory ─────────────────────────────────────────────────────────

describe('groupByCategory', () => {
  it('groups by supply category, alphabetically by label, one section each', () => {
    const l = leg([['3', 2]]);
    const rows = buildLedgerRows({ items: ITEMS, trip: trip([l]), leg: l, aircraftType: 'G650' });
    const groups = groupByCategory(rows);
    expect(groups.map(g => g.label)).toEqual(['Beverages', 'Cleaning Supplies', 'Coffee', 'Kitchen Supplies']);
    expect(groups.find(g => g.label === 'Coffee')!.usedTotal).toBe(2);
    expect(groups[0].sections).toHaveLength(1);
  });
});

// ─── belowParRows ────────────────────────────────────────────────────────────

describe('belowParRows', () => {
  it('finds what finished the trip under par, worst shortfall first', () => {
    const l = leg([['1', 6], ['2', 1], ['3', 4]]);
    const rows = buildLedgerRows({ items: ITEMS, trip: trip([l]), leg: l, aircraftType: 'G650' });
    const below = belowParRows(rows);
    // Perrier par 8 − 6 used = 2 on board, short 6. Nespresso 4 − 4 = 0, short 4.
    // Coca-Cola 6 − 1 = 5, short 1.
    expect(below.map(r => [r.item.itemName, r.short])).toEqual([
      ['Perrier 330ml', 6],
      ['Nespresso Pods', 4],
      ['Coca-Cola', 1],
    ]);
  });

  it('ignores equipment — a fork is not restocked from the commissary', () => {
    const l = leg([['5', 3]]);
    const rows = buildLedgerRows({ items: ITEMS, trip: trip([l]), leg: l, aircraftType: 'G650' });
    expect(belowParRows(rows).map(r => r.item.itemName)).not.toContain('Dinner Forks');
  });

  it('is empty when everything is at or above par', () => {
    const l = leg();
    const rows = buildLedgerRows({ items: ITEMS, trip: trip([l]), leg: l, aircraftType: 'G650' });
    expect(belowParRows(rows)).toEqual([]);
  });
});
