import { describe, it, expect } from 'vitest';
import { applyTaskAction } from './tasks';
import type { TaskInstance } from './types';

const t = (over: Partial<TaskInstance> = {}): TaskInstance => ({
  id: 'i', templateId: 'tpl', templateVersion: 2, taskDefId: 'd', title: 'demo', category: 'ops', order: 1, tripId: null, runDate: '2026-06-30',
  status: 'open', ownerRole: 'scheduling', dueAtUtc: '2026-06-30T19:00:00.000Z',
  requiresAck: false, ackState: 'n_a', auditTrail: [{ atUtc: '2026-06-30T12:00:00.000Z', actor: 'system', action: 'created' }],
  ...over,
});
const NOW = '2026-06-30T18:00:00.000Z';

describe('applyTaskAction §7', () => {
  it('does not mutate the input and appends an audit entry', () => {
    const orig = t();
    const next = applyTaskAction(orig, { kind: 'start' }, 'user:sched1', NOW);
    expect(orig.status).toBe('open');            // input untouched
    expect(next.status).toBe('in_progress');
    expect(next.auditTrail).toHaveLength(2);
    expect(next.auditTrail[1]).toMatchObject({ actor: 'user:sched1', action: 'status:in_progress', atUtc: NOW });
    expect(next.templateVersion).toBe(2);        // pin never changes
  });

  it('ack sets ackState and requires requiresAck', () => {
    const next = applyTaskAction(t({ requiresAck: true, ackState: 'pending' }), { kind: 'ack' }, 'pilot:1', NOW);
    expect(next.ackState).toBe('acked');
    expect(next.ackedBy).toBe('pilot:1');
    expect(next.ackedAtUtc).toBe(NOW);
    expect(() => applyTaskAction(t(), { kind: 'ack' }, 'x', NOW)).toThrow(/does not require ack/i);
  });

  it('complete is blocked until an ack-required task is acked', () => {
    expect(() => applyTaskAction(t({ requiresAck: true, ackState: 'pending' }), { kind: 'complete' }, 'x', NOW))
      .toThrow(/ack/i);
    const acked = t({ requiresAck: true, ackState: 'acked' });
    const done = applyTaskAction(acked, { kind: 'complete' }, 'x', NOW);
    expect(done.status).toBe('done');
    expect(done.completedBy).toBe('x');
  });

  it('block records the reason; unblock returns to open; note appends without status change', () => {
    const blocked = applyTaskAction(t(), { kind: 'block', reason: 'awaiting slot' }, 'x', NOW);
    expect(blocked.status).toBe('blocked');
    expect(blocked.auditTrail[1].detail).toBe('awaiting slot');
    expect(applyTaskAction(blocked, { kind: 'unblock' }, 'x', NOW).status).toBe('open');
    const noted = applyTaskAction(t(), { kind: 'note', text: 'called FBO' }, 'x', NOW);
    expect(noted.status).toBe('open');
    expect(noted.notes).toBe('called FBO');
  });

  it('markNa sets status to n_a and audits it', () => {
    const next = applyTaskAction(t(), { kind: 'markNa' }, 'user:sched1', NOW);
    expect(next.status).toBe('n_a');
    expect(next.auditTrail[1]).toMatchObject({ actor: 'user:sched1', action: 'status:n_a', atUtc: NOW });
  });
});

describe('applyTaskAction clearReflag (D89)', () => {
  it('dismisses an advisory flag without touching completion', () => {
    const start = t({
      status: 'done', completedBy: 's', completedAtUtc: NOW,
      reflag: { change: 'passengerChange' },
    });
    const out = applyTaskAction(start, { kind: 'clearReflag' }, 's', NOW);
    expect(out.reflag).toBeUndefined();
    expect(out.status).toBe('done');
    expect(out.completedBy).toBe('s');
    expect(out.auditTrail[out.auditTrail.length - 1]).toMatchObject({ action: 'reflag:dismissed' });
  });
});

describe('applyTaskAction reopen (Phase 2 — explicit human action; reconcile no longer calls it, D89)', () => {
  it('reopens a completed+acked task: resets status/ack/completion, sets reflag, refreshes due', () => {
    const done = t({
      requiresAck: true, ackState: 'acked', ackedBy: 'p', ackedAtUtc: NOW,
      status: 'done', completedBy: 'p', completedAtUtc: NOW,
    });
    const re = applyTaskAction(
      done,
      { kind: 'reopen', change: 'passengerChange', detail: 'pax +1', newDueAtUtc: '2026-07-01T00:00:00.000Z' },
      'system', NOW,
    );
    expect(re.status).toBe('open');
    expect(re.ackState).toBe('pending');
    expect(re.ackedBy).toBeUndefined();
    expect(re.completedBy).toBeUndefined();
    expect(re.reflag).toEqual({ change: 'passengerChange' });
    expect(re.dueAtUtc).toBe('2026-07-01T00:00:00.000Z');
    expect(re.auditTrail[re.auditTrail.length - 1]).toMatchObject({ action: 'reopened:passengerChange', detail: 'pax +1' });
  });

  it('complete clears the reflag', () => {
    const flagged = t({ reflag: { change: 'aircraftChange' } });
    const done = applyTaskAction(flagged, { kind: 'complete' }, 'x', NOW);
    expect(done.status).toBe('done');
    expect(done.reflag).toBeUndefined();
  });
});
