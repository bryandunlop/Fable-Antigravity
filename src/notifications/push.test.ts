import { describe, it, expect } from 'vitest';
import {
  isNotifiable, newNotifiables, isOptedIn, setOptedIn, loadNotifiedIds, saveNotifiedIds,
} from './push';
import { memoryStorage } from './storage';
import type { FeedItem } from './types';

function item(id: string, severity: FeedItem['severity']): FeedItem {
  return { id, severity, title: id, module: 'Test', link: '/x' };
}

describe('isNotifiable', () => {
  it('accepts critical and warn, rejects info', () => {
    expect(isNotifiable(item('a', 'critical'))).toBe(true);
    expect(isNotifiable(item('b', 'warn'))).toBe(true);
    expect(isNotifiable(item('c', 'info'))).toBe(false);
  });
});

describe('newNotifiables', () => {
  it('returns notifiable items not already surfaced', () => {
    const items = [item('a', 'critical'), item('b', 'info'), item('c', 'warn')];
    const out = newNotifiables(items, new Set(['a']));
    expect(out.map((i) => i.id)).toEqual(['c']); // a already notified, b not notifiable
  });

  it('returns nothing when all are already notified', () => {
    const items = [item('a', 'critical'), item('c', 'warn')];
    expect(newNotifiables(items, new Set(['a', 'c']))).toEqual([]);
  });
});

describe('opt-in preference', () => {
  it('round-trips', () => {
    const s = memoryStorage();
    expect(isOptedIn(s)).toBe(false);
    setOptedIn(true, s);
    expect(isOptedIn(s)).toBe(true);
    setOptedIn(false, s);
    expect(isOptedIn(s)).toBe(false);
  });
});

describe('notified ids storage', () => {
  it('round-trips per user', () => {
    const s = memoryStorage();
    expect(loadNotifiedIds('USR001', s)).toEqual([]);
    saveNotifiedIds('USR001', ['a', 'b'], s);
    expect(loadNotifiedIds('USR001', s)).toEqual(['a', 'b']);
    // isolation per user
    expect(loadNotifiedIds('USR002', s)).toEqual([]);
  });

  it('bounds stored ids to the most recent 300', () => {
    const s = memoryStorage();
    const many = Array.from({ length: 350 }, (_, i) => `id-${i}`);
    saveNotifiedIds('USR001', many, s);
    const stored = loadNotifiedIds('USR001', s);
    expect(stored).toHaveLength(300);
    expect(stored[0]).toBe('id-50'); // oldest 50 dropped
    expect(stored[stored.length - 1]).toBe('id-349');
  });
});
