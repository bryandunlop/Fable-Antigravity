import { describe, it, expect } from 'vitest';
import { dedupeOutbox, pendingEntries, drainEntries, syncAgeLevel, syncAgeLabel, type OutboxEntry } from './offline';

const e = (over: Partial<OutboxEntry>): OutboxEntry => ({ id: 'k1', kind: 'suggestion', label: 'x', queuedAtUtc: '2026-07-12T00:00:00Z', ...over });

describe('dedupeOutbox', () => {
  it('keeps one entry per idempotency key (last wins)', () => {
    const out = dedupeOutbox([e({ id: 'k1', label: 'a' }), e({ id: 'k1', label: 'b' }), e({ id: 'k2' })]);
    expect(out).toHaveLength(2);
    expect(out.find((x) => x.id === 'k1')!.label).toBe('b');
  });
});

describe('pendingEntries', () => {
  it('returns only un-synced, de-duped', () => {
    const out = pendingEntries([e({ id: 'k1' }), e({ id: 'k2', syncedAtUtc: '2026-07-12T01:00:00Z' })]);
    expect(out.map((x) => x.id)).toEqual(['k1']);
  });
});

describe('drainEntries', () => {
  it('stamps every pending entry synced, leaves already-synced', () => {
    const now = '2026-07-12T02:00:00Z';
    const out = drainEntries([e({ id: 'k1' }), e({ id: 'k2', syncedAtUtc: '2026-07-12T01:00:00Z' })], now);
    expect(out.find((x) => x.id === 'k1')!.syncedAtUtc).toBe(now);
    expect(out.find((x) => x.id === 'k2')!.syncedAtUtc).toBe('2026-07-12T01:00:00Z');
  });
});

describe('syncAgeLevel', () => {
  const now = '2026-07-12T12:00:00Z';
  it('fresh < 24h', () => expect(syncAgeLevel('2026-07-12T00:00:00Z', now)).toBe('fresh'));
  it('aging < 7d', () => expect(syncAgeLevel('2026-07-09T00:00:00Z', now)).toBe('aging'));
  it('stale >= 7d', () => expect(syncAgeLevel('2026-07-01T00:00:00Z', now)).toBe('stale'));
  it('never-synced is stale', () => expect(syncAgeLevel(undefined, now)).toBe('stale'));
});

describe('syncAgeLabel', () => {
  const now = '2026-07-12T12:00:00Z';
  it('formats minutes / hours / days', () => {
    expect(syncAgeLabel('2026-07-12T11:30:00Z', now)).toBe('Synced 30m ago');
    expect(syncAgeLabel('2026-07-12T09:00:00Z', now)).toBe('Synced 3h ago');
    expect(syncAgeLabel('2026-07-10T12:00:00Z', now)).toBe('Synced 2d ago');
    expect(syncAgeLabel(undefined, now)).toBe('Not yet synced');
  });
});
