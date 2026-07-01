import { describe, it, expect } from 'vitest';
import { evaluateTriggers, computeEscalations } from './triggers';
import type { TaskInstance } from './types';

const base = (over: Partial<TaskInstance>): TaskInstance => ({
  id: 'i1', templateId: 'tpl', templateVersion: 1, taskDefId: 'd', tripId: null, runDate: '2026-06-30',
  status: 'open', ownerRole: 'scheduling', dueAtUtc: '2026-06-30T19:00:00.000Z',
  requiresAck: false, ackState: 'n_a', auditTrail: [], ...over,
});

describe('evaluateTriggers §7', () => {
  const now = '2026-06-30T18:30:00.000Z';
  it('buckets overdue / due_soon / upcoming and ignores done + n_a-status tasks', () => {
    const items = [
      base({ id: 'over', dueAtUtc: '2026-06-30T17:00:00.000Z' }),
      base({ id: 'soon', dueAtUtc: '2026-06-30T18:45:00.000Z' }),
      base({ id: 'later', dueAtUtc: '2026-06-30T23:00:00.000Z' }),
      base({ id: 'done', status: 'done', dueAtUtc: '2026-06-30T17:00:00.000Z' }),
    ];
    const r = evaluateTriggers(items, now, 60);
    expect(r.overdue.map((t) => t.id)).toEqual(['over']);
    expect(r.dueSoon.map((t) => t.id)).toEqual(['soon']);
    expect(r.upcoming.map((t) => t.id)).toEqual(['later']);
  });
});

describe('computeEscalations §7', () => {
  it('fires when an ack is still pending past the escalation deadline', () => {
    const items = [
      base({ id: 'brief', requiresAck: true, ackState: 'pending',
        escalation: { deadline: { kind: 'dayOfTimeLocal', time: '17:00' }, notifyRole: 'scheduling' } }),
    ];
    // now = 17:30 EDT == 21:30 UTC, past the 17:00-local deadline
    const fired = computeEscalations(items, '2026-06-30T21:30:00.000Z', -240);
    expect(fired).toEqual([{ taskInstanceId: 'brief', notifyRole: 'scheduling', reason: 'unacked_past_deadline' }]);
  });

  it('does not fire once acked, or before the deadline', () => {
    const acked = base({ id: 'a', requiresAck: true, ackState: 'acked',
      escalation: { deadline: { kind: 'dayOfTimeLocal', time: '17:00' }, notifyRole: 'scheduling' } });
    const early = base({ id: 'e', requiresAck: true, ackState: 'pending',
      escalation: { deadline: { kind: 'dayOfTimeLocal', time: '17:00' }, notifyRole: 'scheduling' } });
    // now = 16:00 EDT == 20:00 UTC, before deadline
    expect(computeEscalations([acked, early], '2026-06-30T20:00:00.000Z', -240)).toEqual([]);
  });

  it('honors an author-supplied escalation reason', () => {
    const base2 = base({ id: 'br', requiresAck: true, ackState: 'pending',
      escalation: { deadline: { kind: 'dayOfTimeLocal', time: '17:00' }, notifyRole: 'scheduling', reason: 'crew_no_ack_call_required' } });
    const fired = computeEscalations([base2], '2026-06-30T21:30:00.000Z', -240);
    expect(fired).toEqual([{ taskInstanceId: 'br', notifyRole: 'scheduling', reason: 'crew_no_ack_call_required' }]);
  });
});
