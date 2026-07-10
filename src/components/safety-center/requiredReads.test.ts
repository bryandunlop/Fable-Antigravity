import { describe, it, expect } from 'vitest';
import { compliance, pendingForUser, type RequiredRead, type Acknowledgement } from './requiredReads';

function read(over: Partial<RequiredRead>): RequiredRead {
  return {
    id: 'rr-1', title: 'Doc', kind: 'document', summary: '', body: '',
    completionCode: 'X', publishedDate: '2026-07-10', urgent: false,
    groups: ['Flight Crew'], recipients: ['A', 'B', 'C'], ...over,
  };
}
const ack = (readId: string, userName: string): Acknowledgement => ({
  id: `a-${userName}`, readId, userId: `u-${userName}`, userName, code: 'X', readAtUtc: '2026-07-10T00:00:00Z',
});

describe('compliance', () => {
  it('computes acked/total/pct and a per-recipient roster', () => {
    const r = read({});
    const c = compliance(r, [ack('rr-1', 'A')]);
    expect(c.ackedCount).toBe(1);
    expect(c.total).toBe(3);
    expect(c.pct).toBe(33);
    expect(c.roster.find((m) => m.name === 'A')?.read).toBe(true);
    expect(c.roster.find((m) => m.name === 'B')?.read).toBe(false);
  });

  it('ignores acks for other documents', () => {
    const c = compliance(read({}), [ack('rr-other', 'A')]);
    expect(c.ackedCount).toBe(0);
    expect(c.pct).toBe(0);
  });

  it('is 100% when every recipient has acknowledged', () => {
    const c = compliance(read({ recipients: ['A', 'B'] }), [ack('rr-1', 'A'), ack('rr-1', 'B')]);
    expect(c.pct).toBe(100);
  });
});

describe('pendingForUser', () => {
  const reads = [read({ id: 'rr-1', recipients: ['A', 'B'] }), read({ id: 'rr-2', recipients: ['B'] })];
  it('returns only reads a user is a recipient of and has not acknowledged', () => {
    const pending = pendingForUser(reads, [ack('rr-1', 'A')], 'A');
    expect(pending.map((r) => r.id)).toEqual([]); // A only in rr-1, already acked
  });
  it('surfaces unacknowledged reads for the user', () => {
    const pending = pendingForUser(reads, [], 'B');
    expect(pending.map((r) => r.id).sort()).toEqual(['rr-1', 'rr-2']);
  });
  it('excludes reads the user is not targeted for', () => {
    const pending = pendingForUser(reads, [], 'C');
    expect(pending).toEqual([]);
  });
});
