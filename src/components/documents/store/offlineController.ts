// Module-singleton offline controller: real connectivity (navigator.onLine +
// online/offline events) OR a demo "work offline" toggle, a durable outbox in
// IndexedDB (docStore), and drain-on-reconnect. Exposed to React via
// useSyncExternalStore (see hooks/useOffline). A singleton — not a Context —
// so the chip and the suggestion composer share one source without touching App.
import { idbDocStore } from './docStore';
import { drainEntries, pendingEntries, type OutboxEntry, type OutboxKind } from '../engine/offline';

export interface OfflineState {
  online: boolean;          // effective (real connectivity AND not demo-offline)
  pending: OutboxEntry[];
  lastSyncedUtc?: string;
  ready: boolean;
}

let realOnline = typeof navigator === 'undefined' ? true : navigator.onLine;
let demoOffline = false;
let all: OutboxEntry[] = []; // full outbox mirror (incl. synced)
let state: OfflineState = { online: realOnline, pending: [], lastSyncedUtc: undefined, ready: false };

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const effectiveOnline = () => realOnline && !demoOffline;
function set(next: Partial<OfflineState>) { state = { ...state, ...next }; emit(); }

async function sync(): Promise<void> {
  if (!effectiveOnline() || !all.some((e) => !e.syncedAtUtc)) return;
  const now = new Date().toISOString();
  all = drainEntries(all, now);
  await idbDocStore.putOutboxMany(all);
  await idbDocStore.setLastSynced(now);
  set({ pending: pendingEntries(all), lastSyncedUtc: now });
}

async function load(): Promise<void> {
  try {
    all = await idbDocStore.allOutbox();
    const lastSyncedUtc = await idbDocStore.getLastSynced();
    set({ pending: pendingEntries(all), lastSyncedUtc, ready: true, online: effectiveOnline() });
    await sync();
  } catch {
    set({ ready: true }); // IndexedDB unavailable — degrade gracefully
  }
}

export async function queueOutbox(kind: OutboxKind, label: string): Promise<void> {
  const entry: OutboxEntry = { id: crypto.randomUUID(), kind, label, queuedAtUtc: new Date().toISOString() };
  all = [...all, entry];
  set({ pending: pendingEntries(all) });
  try { await idbDocStore.putOutbox(entry); } catch { /* degrade */ }
  await sync();
}

/** Demo affordance: simulate going offline/online without touching the network. */
export function setDemoOffline(off: boolean): void {
  demoOffline = off;
  set({ online: effectiveOnline() });
  void sync();
}

function onOnline() { realOnline = true; set({ online: effectiveOnline() }); void sync(); }
function onOffline() { realOnline = false; set({ online: effectiveOnline() }); }

let started = false;
export function startOfflineController(): void {
  if (started || typeof window === 'undefined') return;
  started = true;
  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);
  void load();
}

export function subscribeOffline(cb: () => void): () => void {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}
export function getOfflineSnapshot(): OfflineState { return state; }
export function isDemoOffline(): boolean { return demoOffline; }
