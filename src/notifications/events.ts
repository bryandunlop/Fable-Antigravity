import type { NotificationEvent } from './types';
import { defaultStorage, memoryStorage, type StorageLike } from './storage';

const KEY = 'notification-events';
const MAX_EVENTS = 100;

export interface EventStore {
  /** Idempotent by id: publishing an existing id is a silent no-op. */
  publish(e: Omit<NotificationEvent, 'readBy' | 'atUtc'> & { atUtc?: string }): void;
  list(): NotificationEvent[];
  listFor(userRole: string): NotificationEvent[];
  markRead(userId: string, eventId: string): void;
  markUnread(userId: string, eventId: string): void;
  markAllRead(userId: string, userRole: string): void;
  subscribe(fn: () => void): () => void;
}

export function createEventStore(storage: StorageLike): EventStore {
  const listeners = new Set<() => void>();

  const load = (): NotificationEvent[] => {
    try {
      const raw = storage.getItem(KEY);
      return raw ? (JSON.parse(raw) as NotificationEvent[]) : [];
    } catch {
      return [];
    }
  };
  const save = (events: NotificationEvent[]) => {
    storage.setItem(KEY, JSON.stringify(events.slice(0, MAX_EVENTS)));
    listeners.forEach(fn => fn());
  };

  return {
    publish(e) {
      const events = load();
      if (events.some(x => x.id === e.id)) return;
      save([{ ...e, atUtc: e.atUtc ?? new Date().toISOString(), readBy: [] }, ...events]);
    },
    list: load,
    listFor(userRole) {
      return load().filter(e => e.audienceRoles.includes(userRole));
    },
    markRead(userId, eventId) {
      save(load().map(e =>
        e.id === eventId && !e.readBy.includes(userId) ? { ...e, readBy: [...e.readBy, userId] } : e,
      ));
    },
    markUnread(userId, eventId) {
      save(load().map(e => (e.id === eventId ? { ...e, readBy: e.readBy.filter(u => u !== userId) } : e)));
    },
    markAllRead(userId, userRole) {
      save(load().map(e =>
        e.audienceRoles.includes(userRole) && !e.readBy.includes(userId)
          ? { ...e, readBy: [...e.readBy, userId] }
          : e,
      ));
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}

/** App-wide singleton (in-memory fallback keeps non-browser environments harmless). */
export const eventStore = createEventStore(defaultStorage() ?? memoryStorage());
