// ─── Commissary shared helpers ────────────────────────────────────────────────
import type { InventoryItemV2, StockroomItem, StockBatch, InventoryV2State } from './types';

/** An item master joined with its stockroom record (qty/par/min/bin/location). */
export type CommissaryItem = InventoryItemV2 & { stockroom?: StockroomItem };

export type ExpiryStatus = 'fresh' | 'expiring-soon' | 'expired' | 'none';

export function formatDateShort(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** Status of a single expiration date. <14 days out = expiring-soon. */
export function getBatchStatus(expDate?: string): ExpiryStatus {
  if (!expDate) return 'none';
  const now = Date.now();
  const exp = new Date(expDate).getTime();
  if (exp < now) return 'expired';
  if (exp - now < 14 * 24 * 60 * 60 * 1000) return 'expiring-soon';
  return 'fresh';
}

/** The soonest-expiring batch's date + status across an item's batches. */
export function getSoonestExpiry(batches: StockBatch[]): { date?: string; status: ExpiryStatus } {
  let soonest: { date?: string; status: ExpiryStatus } = { status: 'none' };
  for (const b of batches) {
    if (!b.expirationDate) continue;
    if (
      soonest.date === undefined ||
      new Date(b.expirationDate).getTime() < new Date(soonest.date).getTime()
    ) {
      soonest = { date: b.expirationDate, status: getBatchStatus(b.expirationDate) };
    }
  }
  return soonest;
}

/** 1–2 letter initials for the thumbnail fallback tile. */
export function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export const COMMISSARY_STOCKROOM_ID = 'sr-1';

/** Item master joined with its commissary stockroom record. Items with no stockroom record are excluded. */
export function buildCommissaryItems(state: InventoryV2State): CommissaryItem[] {
  const bySr = new Map(
    state.stockroomItems
      .filter(si => si.stockroomId === COMMISSARY_STOCKROOM_ID)
      .map(si => [si.itemId, si] as const)
  );
  return state.items
    .filter(i => bySr.has(i.id))
    .map(i => ({ ...i, stockroom: bySr.get(i.id) }));
}

export interface AttentionEntries {
  low: CommissaryItem[];
  expiring: Array<{ batch: StockBatch; item: InventoryItemV2; status: ExpiryStatus }>;
}

/** Below-par items + expiring/expired batches — drives the attention strip and triage sheet. */
export function getAttentionEntries(state: InventoryV2State): AttentionEntries {
  const low = buildCommissaryItems(state).filter(
    ci => ci.stockroom && ci.stockroom.qtyOnHand < ci.stockroom.parLevel
  );
  const itemById = new Map(state.items.map(i => [i.id, i] as const));
  const expiring = state.stockBatches
    .filter(b => b.stockroomId === COMMISSARY_STOCKROOM_ID)
    .map(b => ({ batch: b, item: itemById.get(b.itemId), status: getBatchStatus(b.expirationDate) }))
    .filter((e): e is AttentionEntries['expiring'][number] =>
      e.item !== undefined && (e.status === 'expiring-soon' || e.status === 'expired'))
    .sort((a, b) =>
      new Date(a.batch.expirationDate!).getTime() - new Date(b.batch.expirationDate!).getTime());
  return { low, expiring };
}

export interface AttentionLocationGroup {
  /** Storage location id, or 'unassigned' for the pseudo-folder. */
  locationId: string;
  locationName: string;
  low: CommissaryItem[];
  expiring: AttentionEntries['expiring'];
}

/**
 * Attention entries grouped by storage location so a manager can walk the
 * stockroom in one pass. Sorted by location sortOrder, Unassigned last.
 * Orphaned locationIds (location deleted out-of-band) fold into Unassigned —
 * matches the CommissaryHome/CommissaryLocation pseudo-folder contract.
 */
export function groupAttentionByLocation(state: InventoryV2State): AttentionLocationGroup[] {
  const { low, expiring } = getAttentionEntries(state);
  const locationById = new Map(state.storageLocations.map(l => [l.id, l] as const));
  const stockroomByItem = new Map(
    state.stockroomItems
      .filter(si => si.stockroomId === COMMISSARY_STOCKROOM_ID)
      .map(si => [si.itemId, si] as const)
  );
  const keyFor = (itemId: string): string => {
    const locId = stockroomByItem.get(itemId)?.locationId;
    return locId && locationById.has(locId) ? locId : 'unassigned';
  };
  const groups = new Map<string, AttentionLocationGroup>();
  const groupFor = (key: string): AttentionLocationGroup => {
    let group = groups.get(key);
    if (!group) {
      group = {
        locationId: key,
        locationName: key === 'unassigned' ? 'Unassigned' : locationById.get(key)!.name,
        low: [],
        expiring: [],
      };
      groups.set(key, group);
    }
    return group;
  };
  for (const ci of low) groupFor(keyFor(ci.id)).low.push(ci);
  for (const e of expiring) groupFor(keyFor(e.item.id)).expiring.push(e);
  return [...groups.values()].sort((a, b) => {
    if (a.locationId === 'unassigned') return 1;
    if (b.locationId === 'unassigned') return -1;
    return locationById.get(a.locationId)!.sortOrder - locationById.get(b.locationId)!.sortOrder;
  });
}

/** Total commissary value on hand: Σ qtyOnHand × costPerUnit. */
export function getStockValue(state: InventoryV2State): number {
  const itemById = new Map(state.items.map(i => [i.id, i] as const));
  return state.stockroomItems
    .filter(si => si.stockroomId === COMMISSARY_STOCKROOM_ID)
    .reduce((sum, si) => sum + si.qtyOnHand * (itemById.get(si.itemId)?.costPerUnit ?? 0), 0);
}

export function formatCurrency(n: number): string {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}
