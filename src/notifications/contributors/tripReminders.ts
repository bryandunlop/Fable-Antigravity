import type { FeedItem } from '../types';
import { defaultStorage, type StorageLike } from '../storage';
import { listTripReminders } from '../tripReminderStore';

const AUDIENCE = ['scheduling', 'admin', 'lead', 'admin-assistant'];

export function buildTripReminderFeed(
  userRole: string,
  nowUtc: string,
  storage: StorageLike | null = defaultStorage(),
): FeedItem[] {
  if (!AUDIENCE.includes(userRole) || !storage) return [];
  return listTripReminders(storage)
    .filter(r => r.dueAtUtc <= nowUtc)
    .map(r => ({
      id: `trip-reminder:${r.id}`,
      severity: 'warn' as const,
      title: r.title,
      detail: r.detail,
      module: 'Trip Coordination',
      link: '/trip-coordination',
      atUtc: r.dueAtUtc,
    }));
}
