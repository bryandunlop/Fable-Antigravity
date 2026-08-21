import { describe, it, expect } from 'vitest';
import { reconcileTrip, instanceKey } from './reconcile';
import type { TaskInstance, TaskDefinition } from './types';
import type { TripDiff } from './diff';

const NOW = '2026-07-05T12:00:00.000Z';

const inst = (over: Partial<TaskInstance> & { taskDefId: string }): TaskInstance => ({
  id: `id:${instanceKey({ taskDefId: over.taskDefId, legId: over.legId, airportRole: over.airportRole })}`,
  templateId: 'tpl', templateVersion: 1, title: 'T', category: 'ops', order: 1,
  tripId: 'T1', runDate: null, status: 'open', ownerRole: 'scheduling', dueAtUtc: '2026-07-09T14:00:00.000Z',
  requiresAck: false, ackState: 'n_a',
  auditTrail: [{ atUtc: '2026-07-01T00:00:00.000Z', actor: 'system', action: 'created' }],
  ...over,
});
const def = (id: string, reTriggerOn?: TaskDefinition['reTriggerOn']): TaskDefinition => ({
  id, title: id, ownerRole: 'scheduling', category: 'ops', order: 1,
  dueRule: { kind: 'hoursBeforeEtd', hours: 24 }, requiresAck: false, reTriggerOn,
});
const defs = (arr: TaskDefinition[]) => new Map(arr.map((d) => [d.id, d]));
const NO_CHANGE: TripDiff = { aircraftChanged: false, legChanges: {} };

describe('reconcileTrip', () => {
  it('FLAGS a completed task on passenger add (advisory, D89); a non-re-triggering task stays done', () => {
    const existing = [
      inst({ taskDefId: 'pax', status: 'done', completedBy: 'x', completedAtUtc: NOW }),
      inst({ taskDefId: 'catering', status: 'done', completedBy: 'x', completedAtUtc: NOW }),
    ];
    const desired = [inst({ taskDefId: 'pax' }), inst({ taskDefId: 'catering' })];
    const diff: TripDiff = { aircraftChanged: false, legChanges: { L1: { rescheduled: false, paxDelta: 1 } } };
    const plan = reconcileTrip(existing, desired, diff, defs([def('pax', ['passengerChange']), def('catering')]), 'system', NOW);

    const pax = plan.toUpdate.find((i) => i.taskDefId === 'pax');
    expect(pax?.status).toBe('done');           // advisory: cleared work stays cleared
    expect(pax?.completedBy).toBe('x');         // completion is never wiped by a trip change
    expect(pax?.reflag).toEqual({ change: 'passengerChange' });
    expect(plan.toUpdate.some((i) => i.taskDefId === 'catering')).toBe(false); // untouched
  });

  it('flags a completed leg task on reschedule and refreshes its dueAtUtc to the desired value', () => {
    const existing = [inst({ taskDefId: 'ppr', legId: 'L1', airportRole: 'arrival', status: 'done', completedBy: 'x', dueAtUtc: '2026-07-09T16:00:00.000Z' })];
    const desired = [inst({ taskDefId: 'ppr', legId: 'L1', airportRole: 'arrival', dueAtUtc: '2026-07-11T16:00:00.000Z', etdUtc: '2026-07-12T16:00:00.000Z' })];
    const diff: TripDiff = { aircraftChanged: false, legChanges: { L1: { rescheduled: true, paxDelta: 0 } } };
    const plan = reconcileTrip(existing, desired, diff, defs([def('ppr', ['legScheduleChange'])]), 'system', NOW);

    const ppr = plan.toUpdate.find((i) => i.taskDefId === 'ppr');
    expect(ppr?.status).toBe('done');           // advisory (D89)
    expect(ppr?.reflag).toEqual({ change: 'legScheduleChange' });
    expect(ppr?.dueAtUtc).toBe('2026-07-11T16:00:00.000Z');
  });

  it('PRESERVES an unchanged completed+acked survivor (not in toUpdate)', () => {
    const survivor = inst({
      taskDefId: 'ppr', legId: 'L1', airportRole: 'arrival',
      requiresAck: true, ackState: 'acked', ackedBy: 'p', ackedAtUtc: NOW,
      status: 'done', completedBy: 'p', completedAtUtc: NOW,
    });
    const desired = [inst({ taskDefId: 'ppr', legId: 'L1', airportRole: 'arrival', requiresAck: true, ackState: 'pending' })];
    const plan = reconcileTrip([survivor], desired, NO_CHANGE, defs([def('ppr', ['legScheduleChange'])]), 'system', NOW);
    expect(plan.toUpdate).toHaveLength(0);
    expect(plan.toCreate).toHaveLength(0);
  });

  it('creates instances for a newly-added leg-airport', () => {
    const desired = [inst({ taskDefId: 'fbo', legId: 'L2', airportRole: 'arrival' })];
    const plan = reconcileTrip([], desired, NO_CHANGE, defs([def('fbo', ['legScheduleChange'])]), 'system', NOW);
    expect(plan.toCreate).toHaveLength(1);
    expect(plan.toCreate[0].status).toBe('open');
  });

  it('restores a cancelled task when its leg-airport key comes back (leg re-added under the same id)', () => {
    // Audit #4: a removed leg was cancelled, then the SAME leg id reappears in desired. The task
    // must come back live — not stay cancelled (which would leave the airport with no task), and
    // not spawn a duplicate create (the deterministic id collides with the cancelled row).
    const cancelled = inst({
      taskDefId: 'fbo', legId: 'L1', airportRole: 'departure', status: 'cancelled',
      completedBy: 'x', completedAtUtc: NOW, dueAtUtc: '2026-07-09T16:00:00.000Z',
      auditTrail: [{ atUtc: NOW, actor: 'system', action: 'cancelled', detail: 'no longer applies' }],
    });
    const desired = [inst({ taskDefId: 'fbo', legId: 'L1', airportRole: 'departure', dueAtUtc: '2026-07-11T16:00:00.000Z', etdUtc: '2026-07-12T16:00:00.000Z' })];
    const plan = reconcileTrip([cancelled], desired, NO_CHANGE, defs([def('fbo', ['legScheduleChange', 'aircraftChange'])]), 'system', NOW);

    expect(plan.toCreate).toHaveLength(0); // restored in place, not duplicated
    const restored = plan.toUpdate.find((i) => i.taskDefId === 'fbo');
    expect(restored?.status).toBe('open');
    expect(restored?.completedBy).toBeUndefined();
    expect(restored?.reflag).toBeUndefined();
    expect(restored?.dueAtUtc).toBe('2026-07-11T16:00:00.000Z'); // timing refreshed to the re-added leg
    expect(restored?.auditTrail.at(-1)).toMatchObject({ action: 'restored' });
  });

  it('leaves a cancelled task cancelled when its leg stays gone (idempotent, not re-cancelled)', () => {
    const cancelled = inst({ taskDefId: 'fbo', legId: 'L1', airportRole: 'departure', status: 'cancelled' });
    const plan = reconcileTrip([cancelled], [], NO_CHANGE, defs([def('fbo', ['legScheduleChange'])]), 'system', NOW);
    expect(plan.toCreate).toHaveLength(0);
    expect(plan.toUpdate).toHaveLength(0); // no churn on an already-cancelled, still-absent task
  });

  it('cancels (never deletes) a task whose leg was removed; completion fields preserved', () => {
    const removed = inst({ taskDefId: 'fbo', legId: 'L3', airportRole: 'departure', status: 'done', completedBy: 'x', completedAtUtc: NOW });
    const plan = reconcileTrip([removed], [], NO_CHANGE, defs([def('fbo', ['legScheduleChange'])]), 'system', NOW);
    const c = plan.toUpdate.find((i) => i.taskDefId === 'fbo');
    expect(c?.status).toBe('cancelled');
    expect(c?.completedBy).toBe('x'); // history preserved
    expect(c?.auditTrail.at(-1)).toMatchObject({ action: 'cancelled', detail: 'no longer applies' });
  });
});

describe('D89 follow-ups (review catches)', () => {
  it('cancelling a leg clears a prior advisory reflag — no Dismiss/Redo on dead work', () => {
    const flagged = inst({
      taskDefId: 'ppr', legId: 'L1', airportRole: 'arrival',
      status: 'done', completedBy: 'x', completedAtUtc: NOW,
      reflag: { change: 'legScheduleChange' },
    });
    const plan = reconcileTrip([flagged], [], NO_CHANGE, defs([def('ppr', ['legScheduleChange'])]), 'system', NOW);
    const cancelled = plan.toUpdate.find((i) => i.taskDefId === 'ppr');
    expect(cancelled?.status).toBe('cancelled');
    expect(cancelled?.reflag).toBeUndefined();
  });
});
