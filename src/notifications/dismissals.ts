import { defaultStorage, memoryStorage, type StorageLike } from './storage';

const keyFor = (userId: string) => `notif-dismissed:${userId}`;

export interface DismissalStore {
  dismiss(userId: string, id: string): void;
  restore(userId: string, id: string): void;
  listDismissed(userId: string): string[];
  subscribe(fn: () => void): () => void;
}

export function createDismissalStore(storage: StorageLike): DismissalStore {
  const listeners = new Set<() => void>();

  const load = (userId: string): string[] => {
    try {
      const raw = storage.getItem(keyFor(userId));
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  };
  const save = (userId: string, ids: string[]) => {
    storage.setItem(keyFor(userId), JSON.stringify(ids));
    listeners.forEach(fn => fn());
  };

  return {
    dismiss(userId, id) {
      const ids = load(userId);
      save(userId, ids.includes(id) ? ids : [...ids, id]);
    },
    restore(userId, id) {
      save(userId, load(userId).filter(x => x !== id));
    },
    listDismissed: load,
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}

export const dismissalStore = createDismissalStore(defaultStorage() ?? memoryStorage());
