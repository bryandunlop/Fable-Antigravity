import { defaultStorage, type StorageLike } from './storage';

const KEY = 'trip-reminders';

export interface TripReminder {
  id: string;
  title: string;
  detail?: string;
  dueAtUtc: string;
  tripId: string;
}

export function listTripReminders(storage: StorageLike | null = defaultStorage()): TripReminder[] {
  if (!storage) return [];
  try {
    const parsed = JSON.parse(storage.getItem(KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function addTripReminder(r: TripReminder, storage: StorageLike | null = defaultStorage()): void {
  if (!storage) return;
  storage.setItem(KEY, JSON.stringify([...listTripReminders(storage), r]));
}
