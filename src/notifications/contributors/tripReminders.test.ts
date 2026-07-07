import { describe, it, expect } from 'vitest';
import { addTripReminder, listTripReminders } from '../tripReminderStore';
import { buildTripReminderFeed } from './tripReminders';
import { memoryStorage } from '../storage';

const NOW = '2026-07-04T12:00:00.000Z';

describe('trip reminders', () => {
  it('persists reminders and surfaces only the due ones', () => {
    const s = memoryStorage();
    addTripReminder({ id: 'TR1', title: 'File intl flight plans', detail: 'TRP-2026-014', dueAtUtc: '2026-07-04T09:00:00.000Z', tripId: 'TRP-2026-014' }, s);
    addTripReminder({ id: 'TR2', title: 'Catering confirmation', dueAtUtc: '2026-07-05T09:00:00.000Z', tripId: 'TRP-2026-015' }, s);
    expect(listTripReminders(s)).toHaveLength(2);

    const items = buildTripReminderFeed('scheduling', NOW, s);
    expect(items.map(i => i.id)).toEqual(['trip-reminder:TR1']);
    expect(items[0].severity).toBe('warn');
    expect(items[0].module).toBe('Trip Coordination');
    expect(items[0].link).toBe('/trip-coordination');
  });

  it('returns nothing for roles outside the audience and on empty storage', () => {
    const s = memoryStorage();
    addTripReminder({ id: 'TR1', title: 'x', dueAtUtc: '2026-07-01T00:00:00.000Z', tripId: 't' }, s);
    expect(buildTripReminderFeed('pilot', NOW, s)).toEqual([]);
    expect(buildTripReminderFeed('scheduling', NOW, memoryStorage())).toEqual([]);

    const s2 = memoryStorage();
    s2.setItem('trip-reminders', '{}');
    expect(buildTripReminderFeed('scheduling', NOW, s2)).toEqual([]);
  });
});
