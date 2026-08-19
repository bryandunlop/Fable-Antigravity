import type {
  InventoryItemV2,
  Trip,
  TripLeg,
  CompartmentDefinition,
} from './types';
import { SUPPLY_CATEGORIES } from './constants';
import { getOnBoardQty } from './tripMath';

/**
 * The trip stock ledger (D86).
 *
 * One set of numbers — par, loaded, used this leg, on board — computed once and
 * arranged three ways. Quick Tap, Compartment and Category are LENSES over this,
 * not three screens with three ideas of the data. Before D86 the compartment and
 * category views recomputed their own totals inline in `TripHome`, which is how
 * they came to disagree with Quick Tap about which items even existed (TL-43).
 *
 * Nothing here filters equipment out. `isEquipment` is reported and the caller
 * decides: logging excludes it (you do not use up a fork), loading includes it
 * (you certainly do load one).
 */

export interface LedgerRow {
  item: InventoryItemV2;
  /** Par for this aircraft type — what the aircraft is stocked to. */
  par: number;
  /** Units added to this trip so far, from the commissary or the road. */
  loaded: number;
  /** Units logged against the active leg. */
  used: number;
  /** par + loaded − usage across the whole trip. */
  onBoard: number;
  isEquipment: boolean;
}

/** A stowage location inside a compartment — "Galley Right", "Under Counter". */
export interface LedgerSection {
  key: string;
  label: string;
  rows: LedgerRow[];
}

export interface LedgerGroup {
  id: string;
  label: string;
  sections: LedgerSection[];
  rowCount: number;
  usedTotal: number;
}

export function buildLedgerRows({
  items,
  trip,
  leg,
  aircraftType,
  search = '',
}: {
  items: InventoryItemV2[];
  trip: Trip;
  leg: TripLeg | null;
  aircraftType: 'G650' | 'G500';
  search?: string;
}): LedgerRow[] {
  const needle = search.trim().toLowerCase();
  const usedByItem = new Map<string, number>();
  for (const e of leg?.usageLog ?? []) {
    usedByItem.set(e.itemId, (usedByItem.get(e.itemId) ?? 0) + e.qtyUsed);
  }
  const loadedByItem = new Map<string, number>();
  for (const l of trip.loadItems ?? []) {
    loadedByItem.set(l.itemId, (loadedByItem.get(l.itemId) ?? 0) + l.qty);
  }

  const rows: LedgerRow[] = [];
  for (const item of items) {
    const par = item.defaultQuantities[aircraftType];
    if (!par || par <= 0) continue;
    if (needle && !item.itemName.toLowerCase().includes(needle)) continue;

    rows.push({
      item,
      par,
      loaded: loadedByItem.get(item.id) ?? 0,
      used: usedByItem.get(item.id) ?? 0,
      onBoard: getOnBoardQty(trip, item.id, par),
      isEquipment: item.isConsumable === false,
    });
  }
  return rows;
}

/**
 * Compartment lens: grouped the way the aircraft is stowed, and then by the
 * shelf inside it. That second level is the item's own `location` field, which
 * the pre-D86 compartment view read for a row subtitle and never grouped on —
 * so Forward Galley rendered as one undifferentiated list of 61 items.
 */
export function groupByCompartment(
  rows: LedgerRow[],
  compartments: CompartmentDefinition[],
): LedgerGroup[] {
  const order = new Map(compartments.map((c, i) => [c.id, i]));
  const labelOf = new Map(compartments.map(c => [c.id, c.label]));

  const byCompartment = new Map<string, LedgerRow[]>();
  for (const row of rows) {
    const id = row.item.compartmentId;
    const bucket = byCompartment.get(id);
    if (bucket) bucket.push(row);
    else byCompartment.set(id, [row]);
  }

  return [...byCompartment.entries()]
    .sort((a, b) => (order.get(a[0]) ?? Number.MAX_SAFE_INTEGER) - (order.get(b[0]) ?? Number.MAX_SAFE_INTEGER))
    .map(([id, groupRows]) => ({
      id,
      // An unconfigured compartment keeps its raw id rather than vanishing —
      // a silently dropped row is worse than an ugly heading.
      label: labelOf.get(id) ?? id,
      sections: sectionsByLocation(groupRows),
      rowCount: groupRows.length,
      usedTotal: groupRows.reduce((n, r) => n + r.used, 0),
    }));
}

function sectionsByLocation(rows: LedgerRow[]): LedgerSection[] {
  const byLocation = new Map<string, LedgerRow[]>();
  for (const row of rows) {
    const key = row.item.location || 'Unassigned';
    const bucket = byLocation.get(key);
    if (bucket) bucket.push(row);
    else byLocation.set(key, [row]);
  }
  // First-seen order, which follows the item master — the order the stock list
  // itself is written in, and the closest thing we have to how it is walked.
  return [...byLocation.entries()].map(([label, sectionRows]) => ({
    key: label,
    label,
    rows: sectionRows,
  }));
}

/** The compartment picker: one chip per compartment that actually holds something. */
export function compartmentSummary(
  rows: LedgerRow[],
  compartments: CompartmentDefinition[],
): { id: string; label: string; count: number }[] {
  return groupByCompartment(rows, compartments).map(g => ({
    id: g.id,
    label: g.label,
    count: g.rowCount,
  }));
}

/** Category lens: grouped by supply type — the ordering and reordering model. */
export function groupByCategory(rows: LedgerRow[]): LedgerGroup[] {
  const labelOf = new Map(SUPPLY_CATEGORIES.map(c => [c.id as string, c.label]));

  const byCategory = new Map<string, LedgerRow[]>();
  for (const row of rows) {
    const id = row.item.supplyCategory as string;
    const bucket = byCategory.get(id);
    if (bucket) bucket.push(row);
    else byCategory.set(id, [row]);
  }

  return [...byCategory.entries()]
    .map(([id, groupRows]) => ({
      id,
      label: labelOf.get(id) ?? id,
      sections: [{ key: id, label: labelOf.get(id) ?? id, rows: groupRows }],
      rowCount: groupRows.length,
      usedTotal: groupRows.reduce((n, r) => n + r.used, 0),
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export interface BelowParRow extends LedgerRow {
  short: number;
}

/**
 * What the aircraft is short when the trip closes — the argument for sending the
 * crew to Replenish rather than making them guess. Equipment is excluded: a fork
 * that went missing is an inspection finding, not a commissary pick.
 */
export function belowParRows(rows: LedgerRow[]): BelowParRow[] {
  return rows
    .filter(r => !r.isEquipment && r.onBoard < r.par)
    .map(r => ({ ...r, short: r.par - r.onBoard }))
    .sort((a, b) => b.short - a.short || a.item.itemName.localeCompare(b.item.itemName));
}

export interface ReviewRow extends LedgerRow {
  /** On board when this leg began: par + loads − usage through the PREVIOUS leg. */
  startedWith: number;
  /** What is left now — startedWith minus this leg's usage. */
  remaining: number;
}

/**
 * The end-of-leg review (D86): the same ledger rows, with the two extra columns
 * the review needs. `prevLegId` is the leg before the one being closed, or null
 * when closing the first — the scoping `getOnBoardQty` already understands, so
 * the review and the live list can never disagree about the maths.
 */
export function toReviewRows(
  rows: LedgerRow[],
  trip: Trip,
  prevLegId: string | null,
): ReviewRow[] {
  return rows.map(row => {
    const startedWith = getOnBoardQty(trip, row.item.id, row.par, { upToLegId: prevLegId });
    return { ...row, startedWith, remaining: startedWith - row.used };
  });
}
