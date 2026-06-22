import { describe, it, expect } from 'vitest';
import { getDefaultState } from '../mockData/scenarios';
import { buildNotifications } from './notifications';
import type { Personnel } from '../types';

describe('notifications feed', () => {
  const s = getDefaultState();
  const now = new Date().toISOString();
  const maint = s.personnel.find(p => p.oid === 'USR002')!; // DOM (maintenance)
  const pilot = s.personnel.find(p => p.oid === 'USR001')! as Personnel; // Capt (reported d-n1pg + d-n6pg)

  it('maintenance sees the open squawk (N1PG) as a notification', () => {
    const feed = buildNotifications(s, maint, now);
    expect(feed.some(n => n.id === 'sq:d-n1pg')).toBe(true);
  });

  it('pilot sees the released briefing (N2PG) and their deferred squawk (N6PG)', () => {
    const feed = buildNotifications(s, pilot, now);
    expect(feed.some(n => n.id === 'br:brief-1')).toBe(true);
    expect(feed.some(n => n.id === 'ac:d-n6pg')).toBe(true);
  });

  it('dismissed notifications are excluded', () => {
    const s2 = { ...s, dismissedNotifications: ['sq:d-n1pg'] };
    expect(buildNotifications(s2, maint, now).some(n => n.id === 'sq:d-n1pg')).toBe(false);
  });

  it('feed is sorted critical-first', () => {
    const feed = buildNotifications(s, maint, now);
    const ranks = feed.map(n => (n.severity === 'critical' ? 0 : n.severity === 'warn' ? 1 : 2));
    for (let i = 1; i < ranks.length; i++) expect(ranks[i - 1]).toBeLessThanOrEqual(ranks[i]);
  });
});
