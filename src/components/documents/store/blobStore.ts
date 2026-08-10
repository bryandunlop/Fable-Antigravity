// Durable storage for received-document bytes.
//
// Same interface seam as DocStore: the app talks to BlobStore, not to IndexedDB,
// so the Capacitor build re-implements it over native file storage and tests run
// against an in-memory double (there is no fake-indexeddb in this repo).
//
// This is what makes a received document readable on a ramp with no
// connectivity — the whole reason D73 ingests bytes instead of a pointer.
import { openDB, type IDBPDatabase } from 'idb';

const DB_NAME = 'mygfo-document-blobs';
const DB_VERSION = 1;
const BLOBS = 'blobs';

export interface StoredBlob {
  key: string;
  bytes: ArrayBuffer;
  mimeType: string;
  filename: string;
}

export interface BlobStore {
  put(blob: StoredBlob): Promise<void>;
  /** Undefined for a missing key — never throws. A blob evicted by the browser
   *  must degrade to "download it again", not to a crash mid-flight. */
  get(key: string): Promise<StoredBlob | undefined>;
  delete(key: string): Promise<void>;
  keys(): Promise<string[]>;
}

let dbp: Promise<IDBPDatabase> | null = null;
function db(): Promise<IDBPDatabase> {
  if (!dbp) {
    dbp = openDB(DB_NAME, DB_VERSION, {
      upgrade(d) {
        if (!d.objectStoreNames.contains(BLOBS)) d.createObjectStore(BLOBS, { keyPath: 'key' });
      },
    });
  }
  return dbp;
}

export const idbBlobStore: BlobStore = {
  async put(blob) {
    await (await db()).put(BLOBS, blob);
  },
  async get(key) {
    try {
      return (await (await db()).get(BLOBS, key)) as StoredBlob | undefined;
    } catch {
      return undefined;
    }
  },
  async delete(key) {
    await (await db()).delete(BLOBS, key);
  },
  async keys() {
    return (await (await db()).getAllKeys(BLOBS)) as string[];
  },
};

/** In-memory BlobStore for tests and for any environment without IndexedDB. */
export function memoryBlobStore(): BlobStore {
  const map = new Map<string, StoredBlob>();
  return {
    async put(blob) { map.set(blob.key, blob); },
    async get(key) { return map.get(key); },
    async delete(key) { map.delete(key); },
    async keys() { return [...map.keys()]; },
  };
}
