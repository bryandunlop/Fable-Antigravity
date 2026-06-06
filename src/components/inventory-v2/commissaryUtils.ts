// ─── Commissary shared helpers ────────────────────────────────────────────────
import type { InventoryItemV2, StockroomItem, StockBatch } from './types';

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
