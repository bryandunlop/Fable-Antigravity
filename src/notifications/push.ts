// Client-side push bridge: turns high-severity in-app feed items into OS
// notifications (via the already-registered service worker). No backend / VAPID —
// real server web-push (public/sw.js already has a `push` handler) is a later step.
import type { FeedItem, FeedSeverity } from './types';
import { defaultStorage, type StorageLike } from './storage';

/** Only these severities are worth an OS-level interruption. */
export const NOTIFIABLE_SEVERITIES: FeedSeverity[] = ['critical', 'warn'];

const OPT_IN_KEY = 'push-opt-in';
const NOTIFIED_PREFIX = 'push-notified:';
const MAX_NOTIFIED = 300;

export function isNotifiable(item: Pick<FeedItem, 'severity'>): boolean {
  return NOTIFIABLE_SEVERITIES.includes(item.severity);
}

/** Notifiable feed items we have not already surfaced to the OS. Pure — testable. */
export function newNotifiables(items: FeedItem[], alreadyNotified: Set<string>): FeedItem[] {
  return items.filter((i) => isNotifiable(i) && !alreadyNotified.has(i.id));
}

export function isOptedIn(storage: StorageLike | null = defaultStorage()): boolean {
  return storage?.getItem(OPT_IN_KEY) === 'true';
}

export function setOptedIn(value: boolean, storage: StorageLike | null = defaultStorage()): void {
  storage?.setItem(OPT_IN_KEY, value ? 'true' : 'false');
}

export function loadNotifiedIds(userId: string, storage: StorageLike | null = defaultStorage()): string[] {
  if (!storage) return [];
  try {
    const raw = storage.getItem(NOTIFIED_PREFIX + userId);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveNotifiedIds(userId: string, ids: string[], storage: StorageLike | null = defaultStorage()): void {
  if (!storage) return;
  // Keep the most recent ids only, bounding unbounded growth across a long session.
  const bounded = ids.slice(-MAX_NOTIFIED);
  storage.setItem(NOTIFIED_PREFIX + userId, JSON.stringify(bounded));
}
