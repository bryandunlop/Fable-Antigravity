import { describe, it, expect } from 'vitest';
import { completedVisibleItems } from './tripPrep';
import type { TaskInstance } from '../../scheduling/engine';

const inst = (p: Partial<TaskInstance> & { id: string; taskDefId: string }): TaskInstance => ({
  templateId: 'tmpl', templateVersion: 1, title: `Task ${p.id}`, category: 'ops', order: 1,
  tripId: 'trip-1', runDate: null, status: 'done', ownerRole: 'scheduling',
  dueAtUtc: '2026-07-01T00:00:00.000Z', requiresAck: false, ackState: 'n_a', auditTrail: [],
  ...p,
});

describe('completedVisibleItems', () => {
  it('keeps only done instances whose task-def is visible, ordered by checklist order', () => {
    const visible = new Set(['a', 'b']);
    const instances = [
      inst({ id: 'i2', taskDefId: 'b', order: 2, title: 'Catering', completedAtUtc: '2026-07-01T10:00:00.000Z' }),
      inst({ id: 'i1', taskDefId: 'a', order: 1, title: 'Crew brief', completedAtUtc: '2026-07-01T09:00:00.000Z' }),
    ];
    const got = completedVisibleItems(instances, visible);
    expect(got.map(x => x.id)).toEqual(['i1', 'i2']); // ordered by `order`
    expect(got[0]).toEqual({ id: 'i1', title: 'Crew brief', completedAtUtc: '2026-07-01T09:00:00.000Z' });
  });

  it('excludes not-done statuses and completed-but-hidden items', () => {
    const visible = new Set(['a', 'b', 'c']);
    const instances = [
      inst({ id: 'open', taskDefId: 'a', status: 'open' }),
      inst({ id: 'blocked', taskDefId: 'b', status: 'blocked' }),
      inst({ id: 'na', taskDefId: 'c', status: 'n_a' }),
      inst({ id: 'doneHidden', taskDefId: 'hidden', status: 'done' }),
    ];
    expect(completedVisibleItems(instances, visible)).toEqual([]);
  });

  it('is empty when nothing is visible', () => {
    const instances = [inst({ id: 'i1', taskDefId: 'a', status: 'done' })];
    expect(completedVisibleItems(instances, new Set())).toEqual([]);
  });
});
