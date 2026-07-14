// Pure offline helpers: the outbox record model + sync-age classification. No
// IndexedDB / no React here (the DocStore impl + provider consume these). The
// outbox represents actions taken locally that must later sync to the server/CAMP
// (Phase 2) — in this demo, "sync" resolves against local state (honest caveat).

export type OutboxKind = 'ack' | 'suggestion';

export interface OutboxEntry {
  /** Client idempotency key (UUID) — a retried enqueue is the same entry. */
  id: string;
  kind: OutboxKind;
  /** Human label for the queued item (e.g. "Suggestion on SOP-001"). */
  label: string;
  queuedAtUtc: string;
  /** Set once the entry has synced; undefined while pending. */
  syncedAtUtc?: string;
}

/** De-dupe by idempotency key (last write wins) — a lost ACK re-enqueue is a no-op. */
export function dedupeOutbox(entries: OutboxEntry[]): OutboxEntry[] {
  const byId = new Map<string, OutboxEntry>();
  for (const e of entries) byId.set(e.id, e);
  return [...byId.values()];
}

export function pendingEntries(entries: OutboxEntry[]): OutboxEntry[] {
  return dedupeOutbox(entries).filter((e) => !e.syncedAtUtc);
}

/** Mark every pending entry synced at nowUtc (demo drain — no real transport). */
export function drainEntries(entries: OutboxEntry[], nowUtc: string): OutboxEntry[] {
  return dedupeOutbox(entries).map((e) => (e.syncedAtUtc ? e : { ...e, syncedAtUtc: nowUtc }));
}

export type SyncLevel = 'fresh' | 'aging' | 'stale';

const H = 3_600_000;

/** Escalating freshness of the local offline copy (spec §8): neutral < 24 h,
 * amber up to 7 days, prominent ≥ 7 days. */
export function syncAgeLevel(lastSyncedUtc: string | undefined, nowUtc: string): SyncLevel {
  if (!lastSyncedUtc) return 'stale';
  const ageH = (Date.parse(nowUtc) - Date.parse(lastSyncedUtc)) / H;
  if (ageH < 24) return 'fresh';
  if (ageH < 24 * 7) return 'aging';
  return 'stale';
}

export function syncAgeLabel(lastSyncedUtc: string | undefined, nowUtc: string): string {
  if (!lastSyncedUtc) return 'Not yet synced';
  const mins = Math.max(0, Math.round((Date.parse(nowUtc) - Date.parse(lastSyncedUtc)) / 60000));
  if (mins < 1) return 'Synced just now';
  if (mins < 60) return `Synced ${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `Synced ${hrs}h ago`;
  return `Synced ${Math.round(hrs / 24)}d ago`;
}
