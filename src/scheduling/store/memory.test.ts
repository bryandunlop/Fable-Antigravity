import { describe, it, expect } from 'vitest';
import { InMemorySchedulingStore } from './memory';
import type { ChecklistTemplate, TaskInstance } from '../engine';
import type { TripRecord, SchedulingEvent } from './types';

const tpl = (over: Partial<ChecklistTemplate>): ChecklistTemplate => ({
  id: 'tpl', name: 'n', triggerType: 'recurring', scope: 'daily', version: 1,
  status: 'published', effectiveFrom: '2026-01-01T00:00:00.000Z', taskDefinitions: [], ...over,
});

describe('InMemorySchedulingStore templates', () => {
  it('getTemplate(id) returns the highest published version', async () => {
    const s = new InMemorySchedulingStore();
    await s.saveTemplate(tpl({ version: 1 }));
    await s.saveTemplate(tpl({ version: 2 }));
    await s.saveTemplate(tpl({ version: 3, status: 'draft' })); // draft ignored by getTemplate(id)
    expect((await s.getTemplate('tpl'))?.version).toBe(2);
    expect((await s.getTemplate('tpl', 1))?.version).toBe(1); // explicit version returns draft/any
    expect((await s.getTemplate('tpl', 3))?.status).toBe('draft');
  });
  it('listPublishedTemplates returns one latest-published per id', async () => {
    const s = new InMemorySchedulingStore();
    await s.saveTemplate(tpl({ id: 'a', version: 1 }));
    await s.saveTemplate(tpl({ id: 'a', version: 2 }));
    await s.saveTemplate(tpl({ id: 'b', version: 1 }));
    const list = await s.listPublishedTemplates();
    expect(list.map((t) => `${t.id}v${t.version}`).sort()).toEqual(['av2', 'bv1']);
  });
});

describe('InMemorySchedulingStore trips/instances/events', () => {
  const trip: TripRecord = {
    id: 'T1', tripNumber: 'TRIP-1', sourceSystem: 'manual', sourceTripRef: null, tail: 'N1PG',
    aircraftType: 'G650ER', tripType: 'domestic', priority: 'standard', status: 'planning',
    startDate: '2026-07-10T00:00:00.000Z', endDate: '2026-07-12T00:00:00.000Z', legs: [],
    createdBy: 'u', createdAtUtc: '2026-06-30T12:00:00.000Z',
  };
  const inst = (over: Partial<TaskInstance>): TaskInstance => ({
    id: 'i1', templateId: 'tpl', templateVersion: 1, taskDefId: 'd', title: 't', category: 'c', order: 1,
    tripId: 'T1', runDate: null, status: 'open', ownerRole: 'scheduling', dueAtUtc: '2026-07-09T14:00:00.000Z',
    requiresAck: false, ackState: 'n_a', auditTrail: [], ...over,
  });

  it('saves + lists trips', async () => {
    const s = new InMemorySchedulingStore();
    await s.saveTrip(trip);
    expect((await s.getTrip('T1'))?.tripNumber).toBe('TRIP-1');
    expect(await s.listTrips()).toHaveLength(1);
  });
  it('saves instances and lists by trip vs runDate; updateInstance replaces', async () => {
    const s = new InMemorySchedulingStore();
    await s.saveInstances([inst({ id: 'i1', tripId: 'T1', runDate: null }), inst({ id: 'i2', tripId: null, runDate: '2026-06-30' })]);
    expect((await s.listInstancesForTrip('T1')).map((x) => x.id)).toEqual(['i1']);
    expect((await s.listRecurringInstances('2026-06-30')).map((x) => x.id)).toEqual(['i2']);
    await s.updateInstance(inst({ id: 'i1', tripId: 'T1', status: 'done' }));
    expect((await s.getInstance('i1'))?.status).toBe('done');
  });
  it('returns deep copies — mutating a returned instance does not affect the store', async () => {
    const s = new InMemorySchedulingStore();
    await s.saveInstances([inst({ id: 'i1', tripId: 'T1' })]);
    const got = (await s.getInstance('i1'))!;
    got.status = 'done';
    got.auditTrail.push({ atUtc: 'x', actor: 'y', action: 'z' });
    const again = (await s.getInstance('i1'))!;
    expect(again.status).toBe('open');
    expect(again.auditTrail).toHaveLength(0);
  });

  it('saves events and lists by exact target', async () => {
    const s = new InMemorySchedulingStore();
    const ev: SchedulingEvent = {
      id: 'e1', type: 'crew_brief', sourceDept: 'scheduling', target: { kind: 'role', value: 'pilot' },
      entityRef: { kind: 'trip', id: 'T1' }, payload: {}, channel: 'inbox', ackable: true,
      createdAtUtc: '2026-06-30T12:00:00.000Z', ackState: 'pending',
    };
    await s.saveEvent(ev);
    expect((await s.listEventsForTarget({ kind: 'role', value: 'pilot' })).map((e) => e.id)).toEqual(['e1']);
    expect(await s.listEventsForTarget({ kind: 'role', value: 'maintenance' })).toEqual([]);
  });
});
