import { describe, it, expect } from 'vitest';
import { deriveSchedulingReadiness } from './readiness';
import type { TaskInstance } from './types';

const t = (over: Partial<TaskInstance>): TaskInstance => ({
  id: 'i', templateId: 'tpl', templateVersion: 1, taskDefId: 'd', title: 'demo', category: 'ops', order: 1, tripId: 'T1', runDate: null,
  status: 'open', ownerRole: 'scheduling', dueAtUtc: '2026-07-01T00:00:00.000Z',
  requiresAck: false, ackState: 'n_a', auditTrail: [], ...over,
});

describe('deriveSchedulingReadiness §7', () => {
  it('READY when every task is done or n_a', () => {
    const r = deriveSchedulingReadiness([t({ id: 'a', status: 'done' }), t({ id: 'b', status: 'n_a' })]);
    expect(r.state).toBe('READY');
    expect(r.completion).toBe(1);
  });
  it('NOT_READY with open tasks, completion computed', () => {
    const r = deriveSchedulingReadiness([t({ id: 'a', status: 'done' }), t({ id: 'b', status: 'open' })]);
    expect(r.state).toBe('NOT_READY');
    expect(r.completion).toBe(0.5);
  });
  it('BLOCKED beats NOT_READY and names the blocker', () => {
    const r = deriveSchedulingReadiness([t({ id: 'a', status: 'open' }), t({ id: 'b', status: 'blocked' })]);
    expect(r.state).toBe('BLOCKED');
    expect(r.blocker).toBe('b');
  });
  it('empty checklist is READY at completion 1', () => {
    expect(deriveSchedulingReadiness([])).toEqual({ state: 'READY', completion: 1 });
  });
  it('excludes cancelled tasks from the rollup (no completion inflation, no hold)', () => {
    // one done + one cancelled -> the cancelled task is ignored, so completion is 1/1 = READY
    const r = deriveSchedulingReadiness([t({ id: 'a', status: 'done' }), t({ id: 'b', status: 'cancelled' })]);
    expect(r.state).toBe('READY');
    expect(r.completion).toBe(1);
    // one open + one cancelled -> still NOT_READY, denominator excludes the cancelled task
    const r2 = deriveSchedulingReadiness([t({ id: 'a', status: 'open' }), t({ id: 'b', status: 'cancelled' })]);
    expect(r2.state).toBe('NOT_READY');
    expect(r2.completion).toBe(0);
  });
});
