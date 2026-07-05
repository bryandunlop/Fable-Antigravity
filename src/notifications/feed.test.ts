import { describe, it, expect } from 'vitest';
import { buildFeed } from './feed';
import { createEventStore } from './events';
import { createDismissalStore } from './dismissals';
import { memoryStorage } from './storage';
import type { FeedItem } from './types';

const NOW = '2026-07-04T12:00:00.000Z';

function deps(items: FeedItem[]) {
  const storage = memoryStorage();
  return {
    contributors: [() => items],
    events: createEventStore(storage),
    dismissals: createDismissalStore(storage),
  };
}

const derived: FeedItem[] = [
  { id: 'd-info', severity: 'info', title: 'info item', module: 'M', link: '/x', atUtc: '2026-07-04T10:00:00.000Z' },
  { id: 'd-crit', severity: 'critical', title: 'critical item', module: 'M', link: '/x' },
  { id: 'd-warn', severity: 'warn', title: 'warn item', module: 'M', link: '/x' },
];

describe('buildFeed', () => {
  it('merges contributors and events, sorted by severity then recency', () => {
    const d = deps(derived);
    d.events.publish({ id: 'ev1', severity: 'warn', title: 'event', module: 'M', link: '/y', audienceRoles: ['pilot'], atUtc: '2026-07-04T11:00:00.000Z' });
    const feed = buildFeed('pilot', NOW, d);
    expect(feed.entries.map(e => e.id)).toEqual(['d-crit', 'ev1', 'd-warn', 'd-info']);
    expect(feed.counts).toEqual({ total: 4, unread: 1, attention: 4, critical: 1 });
  });

  it('excludes events outside the audience', () => {
    const d = deps([]);
    d.events.publish({ id: 'ev1', severity: 'info', title: 'x', module: 'M', link: '/y', audienceRoles: ['scheduling'] });
    expect(buildFeed('pilot', NOW, d).entries).toEqual([]);
  });

  it('moves dismissed derived items to the dismissed list without read-state semantics', () => {
    const d = deps(derived);
    d.dismissals.dismiss('USR001', 'd-crit'); // pilot resolves to USR001
    const feed = buildFeed('pilot', NOW, d);
    expect(feed.entries.map(e => e.id)).toEqual(['d-warn', 'd-info']);
    expect(feed.dismissed.map(e => e.id)).toEqual(['d-crit']);
    expect(feed.counts).toEqual({ total: 2, unread: 0, attention: 2, critical: 0 });
  });

  it('read events lower unread/attention but stay in entries', () => {
    const d = deps([]);
    d.events.publish({ id: 'ev1', severity: 'info', title: 'x', module: 'M', link: '/y', audienceRoles: ['pilot'] });
    d.events.markRead('USR001', 'ev1');
    const feed = buildFeed('pilot', NOW, d);
    expect(feed.entries).toHaveLength(1);
    expect(feed.entries[0].kind === 'event' && feed.entries[0].isRead).toBe(true);
    expect(feed.counts).toEqual({ total: 1, unread: 0, attention: 0, critical: 0 });
  });

  it('a throwing contributor is skipped, not fatal', () => {
    const d = deps([]);
    d.contributors = [() => { throw new Error('boom'); }, () => derived];
    expect(buildFeed('pilot', NOW, d).entries).toHaveLength(3);
  });
});
