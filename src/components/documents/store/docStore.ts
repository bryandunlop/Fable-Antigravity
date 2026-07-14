// IndexedDB-backed durable store for the offline outbox + sync metadata (spec §8,
// D-7). This is the DocStore boundary the future Capacitor build re-implements over
// SQLite — the app talks to this interface, not to IndexedDB directly. The main
// documents state stays in localStorage (unchanged); only the offline queue is here.
import { openDB, type IDBPDatabase } from 'idb';
import type { OutboxEntry } from '../engine/offline';

const DB_NAME = 'mygfo-documents';
const DB_VERSION = 1;
const OUTBOX = 'outbox';
const META = 'meta';
const LAST_SYNCED = 'lastSyncedUtc';

let dbp: Promise<IDBPDatabase> | null = null;
function db(): Promise<IDBPDatabase> {
  if (!dbp) {
    dbp = openDB(DB_NAME, DB_VERSION, {
      upgrade(d) {
        if (!d.objectStoreNames.contains(OUTBOX)) d.createObjectStore(OUTBOX, { keyPath: 'id' });
        if (!d.objectStoreNames.contains(META)) d.createObjectStore(META);
      },
    });
  }
  return dbp;
}

export interface DocStore {
  allOutbox(): Promise<OutboxEntry[]>;
  putOutbox(entry: OutboxEntry): Promise<void>;
  putOutboxMany(entries: OutboxEntry[]): Promise<void>;
  getLastSynced(): Promise<string | undefined>;
  setLastSynced(utc: string): Promise<void>;
}

export const idbDocStore: DocStore = {
  async allOutbox() {
    return (await db()).getAll(OUTBOX) as Promise<OutboxEntry[]>;
  },
  async putOutbox(entry) {
    await (await db()).put(OUTBOX, entry);
  },
  async putOutboxMany(entries) {
    const d = await db();
    const tx = d.transaction(OUTBOX, 'readwrite');
    await Promise.all([...entries.map((e) => tx.store.put(e)), tx.done]);
  },
  async getLastSynced() {
    return (await db()).get(META, LAST_SYNCED) as Promise<string | undefined>;
  },
  async setLastSynced(utc) {
    await (await db()).put(META, utc, LAST_SYNCED);
  },
};
