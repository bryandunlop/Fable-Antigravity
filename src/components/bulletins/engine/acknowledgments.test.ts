import { describe, it, expect } from 'vitest';
import {
  isAcknowledged,
  acknowledgedFor,
  outstandingReaders,
  unacknowledgedMustReads,
  type Reader,
} from './acknowledgments';
import type { Bulletin, BulletinAcknowledgment } from '../types';

function bulletin(overrides: Partial<Bulletin> = {}): Bulletin {
  return {
    id: 'PB-001',
    bulletinType: 'procedural',
    title: 'Test',
    content: '',
    category: 'Safety Procedures',
    roles: ['pilot'],
    effectiveDate: '2026-01-01',
    author: 'Author',
    createdDate: '2026-01-01',
    version: '1.0',
    isPinned: false,
    isArchived: false,
    requireAcknowledgment: true,
    tags: [],
    ...overrides,
  };
}

function ack(overrides: Partial<BulletinAcknowledgment> = {}): BulletinAcknowledgment {
  return {
    bulletinId: 'PB-001',
    bulletinVersion: '1.0',
    userId: 'USR001',
    userName: 'Captain John Smith',
    role: 'pilot',
    initials: 'JS',
    acknowledgedAtUtc: '2026-01-02T00:00:00.000Z',
    ...overrides,
  };
}

describe('isAcknowledged', () => {
  it('is true when the user acked the current version', () => {
    expect(isAcknowledged(bulletin(), [ack()], 'USR001')).toBe(true);
  });

  it('is false for a different user', () => {
    expect(isAcknowledged(bulletin(), [ack()], 'USR007')).toBe(false);
  });

  it('re-arms when the bulletin is re-issued at a new version', () => {
    const reissued = bulletin({ version: '2.0' });
    // The stored ack is against v1.0; the bulletin is now v2.0.
    expect(isAcknowledged(reissued, [ack({ bulletinVersion: '1.0' })], 'USR001')).toBe(false);
    expect(isAcknowledged(reissued, [ack({ bulletinVersion: '2.0' })], 'USR001')).toBe(true);
  });
});

describe('acknowledgedFor', () => {
  it('returns only current-version acks', () => {
    const b = bulletin({ version: '2.0' });
    const acks = [ack({ bulletinVersion: '1.0' }), ack({ bulletinVersion: '2.0', userId: 'USR007' })];
    expect(acknowledgedFor(b, acks)).toHaveLength(1);
    expect(acknowledgedFor(b, acks)[0].userId).toBe('USR007');
  });
});

describe('outstandingReaders', () => {
  const readers: Reader[] = [
    { role: 'pilot', userId: 'USR001' },
    { role: 'inflight', userId: 'USR003' },
  ];

  it('excludes readers who have acked', () => {
    const out = outstandingReaders(bulletin(), readers, [ack({ userId: 'USR001' })]);
    expect(out.map((r) => r.userId)).toEqual(['USR003']);
  });

  it('returns all readers when none have acked', () => {
    expect(outstandingReaders(bulletin(), readers, [])).toHaveLength(2);
  });
});

describe('unacknowledgedMustReads', () => {
  it('surfaces only unacked, non-archived, targeted must-reads', () => {
    const list: Bulletin[] = [
      bulletin({ id: 'PB-001' }),
      bulletin({ id: 'PB-002', requireAcknowledgment: false }), // not a must-read
      bulletin({ id: 'PB-003', isArchived: true }), // archived
      bulletin({ id: 'PB-004', roles: ['maintenance'] }), // not targeted at pilot
    ];
    const result = unacknowledgedMustReads(list, [], 'pilot', 'USR001');
    expect(result.map((b) => b.id)).toEqual(['PB-001']);
  });

  it('drops a must-read once the user acks the current version', () => {
    const list = [bulletin({ id: 'PB-001' })];
    const result = unacknowledgedMustReads(list, [ack()], 'pilot', 'USR001');
    expect(result).toHaveLength(0);
  });

  it("honors 'all' audience", () => {
    const list = [bulletin({ id: 'PB-001', roles: ['all'] })];
    expect(unacknowledgedMustReads(list, [], 'inflight', 'USR003')).toHaveLength(1);
  });
});
