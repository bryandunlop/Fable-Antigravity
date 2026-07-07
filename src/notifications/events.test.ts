import { describe, it, expect, vi } from 'vitest';
import { createEventStore } from './events';
import { memoryStorage } from './storage';

const base = {
  id: 'hazard:HZ-001',
  severity: 'warn' as const,
  title: 'New hazard reported: High severity',
  module: 'Safety Systems',
  link: '/safety/hazards',
  audienceRoles: ['safety', 'admin'],
};

describe('event store', () => {
  it('publishes an event with a stamped atUtc and empty readBy', () => {
    const store = createEventStore(memoryStorage());
    store.publish(base);
    const all = store.list();
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe('hazard:HZ-001');
    expect(all[0].readBy).toEqual([]);
    expect(all[0].atUtc).toBeTruthy();
  });

  it('is idempotent by id — re-publishing is a no-op', () => {
    const store = createEventStore(memoryStorage());
    store.publish(base);
    store.publish({ ...base, title: 'changed' });
    expect(store.list()).toHaveLength(1);
    expect(store.list()[0].title).toBe('New hazard reported: High severity');
  });

  it('filters by audience role', () => {
    const store = createEventStore(memoryStorage());
    store.publish(base);
    store.publish({ ...base, id: 'e2', audienceRoles: ['scheduling'] });
    expect(store.listFor('safety').map(e => e.id)).toEqual(['hazard:HZ-001']);
    expect(store.listFor('scheduling').map(e => e.id)).toEqual(['e2']);
    expect(store.listFor('fa')).toEqual([]);
  });

  it('tracks read state per user', () => {
    const store = createEventStore(memoryStorage());
    store.publish(base);
    store.markRead('USR001', 'hazard:HZ-001');
    expect(store.list()[0].readBy).toEqual(['USR001']);
    store.markRead('USR001', 'hazard:HZ-001'); // no duplicate
    expect(store.list()[0].readBy).toEqual(['USR001']);
    store.markUnread('USR001', 'hazard:HZ-001');
    expect(store.list()[0].readBy).toEqual([]);
  });

  it('markAllRead marks only the role-visible events', () => {
    const store = createEventStore(memoryStorage());
    store.publish(base);
    store.publish({ ...base, id: 'e2', audienceRoles: ['scheduling'] });
    store.markAllRead('USR001', 'safety');
    expect(store.list().find(e => e.id === 'hazard:HZ-001')!.readBy).toEqual(['USR001']);
    expect(store.list().find(e => e.id === 'e2')!.readBy).toEqual([]);
  });

  it('caps stored events at 100, dropping the oldest', () => {
    const store = createEventStore(memoryStorage());
    for (let i = 0; i < 105; i++) store.publish({ ...base, id: `e${i}` });
    expect(store.list()).toHaveLength(100);
    expect(store.list().some(e => e.id === 'e0')).toBe(false);
    expect(store.list().some(e => e.id === 'e104')).toBe(true);
  });

  it('notifies subscribers on publish and read-state change', () => {
    const store = createEventStore(memoryStorage());
    const fn = vi.fn();
    const unsub = store.subscribe(fn);
    store.publish(base);
    store.markRead('USR001', 'hazard:HZ-001');
    expect(fn).toHaveBeenCalledTimes(2);
    unsub();
    store.publish({ ...base, id: 'e9' });
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('persists across store instances sharing the same storage', () => {
    const storage = memoryStorage();
    createEventStore(storage).publish(base);
    expect(createEventStore(storage).list()).toHaveLength(1);
  });
});
