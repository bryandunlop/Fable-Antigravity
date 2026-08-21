import { describe, it, expect } from 'vitest';
import { SchedulingService } from './service';
import { InMemorySchedulingStore } from './memory';
import { seedTemplates } from './seed';
import type { ChecklistTemplate, IdFactory } from '../engine';
import type { TripRecord } from './types';

const idf: IdFactory = (seed) => `id:${seed}`;
const NOW = '2026-06-30T12:00:00.000Z';

const perTrip: ChecklistTemplate = {
  id: 'dom', name: 'Domestic', triggerType: 'per_trip', scope: 'domestic', version: 1,
  status: 'published', effectiveFrom: '2026-01-01T00:00:00.000Z',
  taskDefinitions: [
    { id: 'suit', title: 'Airport suitability', ownerRole: 'scheduling', category: 'dispatch', order: 1,
      dueRule: { kind: 'hoursBeforeEtd', hours: 24 }, requiresAck: false },
    { id: 'brief', title: 'Send crew brief', ownerRole: 'scheduling', category: 'crew', order: 2,
      dueRule: { kind: 'hoursBeforeEtd', hours: 3 }, requiresAck: true,
      escalation: { deadline: { kind: 'hoursBeforeEtd', hours: 1 }, notifyRole: 'scheduling' },
      handoffTarget: { kind: 'role', value: 'pilot', channel: 'inbox' } },
  ],
};
const daily: ChecklistTemplate = {
  id: 'daily', name: 'Daily', triggerType: 'recurring', scope: 'daily', version: 1,
  status: 'published', effectiveFrom: '2026-01-01T00:00:00.000Z',
  taskDefinitions: [{ id: 'fuel', title: 'Update fuel price', ownerRole: 'scheduling', category: 'fuel', order: 1,
    dueRule: { kind: 'weekday', day: 'MON' }, requiresAck: false }],
};
const trip: TripRecord = {
  id: 'T1', tripNumber: 'TRIP-1', sourceSystem: 'manual', sourceTripRef: 'MAO-1', tail: 'N1PG',
  aircraftType: 'G650ER', tripType: 'domestic', priority: 'standard', status: 'planning',
  startDate: '2026-07-10T00:00:00.000Z', endDate: '2026-07-12T00:00:00.000Z',
  legs: [{ id: 'l1', sequence: 1, departureIcao: 'KLUK', arrivalIcao: 'KASE', departureTimeUtc: '2026-07-10T14:00:00.000Z', paxCount: 4 }],
  createdBy: 'u', createdAtUtc: NOW,
};

function svc() {
  const store = new InMemorySchedulingStore();
  const service = new SchedulingService({ store, idFactory: idf, officeTzOffsetMinutes: -240 });
  return { store, service };
}

describe('SchedulingService', () => {
  it('createTripMirror saves the trip and instantiates its per-trip checklist', async () => {
    const { store, service } = svc();
    await store.saveTemplate(perTrip);
    const { instances } = await service.createTripMirror(trip, NOW);
    expect(instances.map((i) => i.taskDefId)).toEqual(['suit', 'brief']);
    expect((await store.listInstancesForTrip('T1')).length).toBe(2);
    expect((await store.getTrip('T1'))?.sourceTripRef).toBe('MAO-1');
  });

  it('generateRunBoard is idempotent per runDate', async () => {
    const { store, service } = svc();
    await store.saveTemplate(daily);
    const first = await service.generateRunBoard(NOW);
    expect(first.map((i) => i.taskDefId)).toEqual(['fuel']);
    const second = await service.generateRunBoard(NOW);
    expect(second).toEqual([]); // already generated for this runDate
  });

  it('applyAction completes a task and emits a handoff event when the def has a handoffTarget', async () => {
    const { store, service } = svc();
    await store.saveTemplate(perTrip);
    const { instances } = await service.createTripMirror(trip, NOW);
    const brief = instances.find((i) => i.taskDefId === 'brief')!;
    // brief requires ack; ack then complete
    await service.applyAction(brief.id, { kind: 'ack' }, 'pilot:1', NOW);
    const done = await service.applyAction(brief.id, { kind: 'complete' }, 'sched:1', NOW);
    expect(done.status).toBe('done');
    const inbox = await store.listEventsForTarget({ kind: 'role', value: 'pilot' });
    expect(inbox.length).toBe(1);
    expect(inbox[0].entityRef).toEqual({ kind: 'task', id: brief.id });
  });

  it('runEscalations emits one escalation per unacked-past-deadline task, idempotently', async () => {
    const { store, service } = svc();
    await store.saveTemplate(perTrip);
    await service.createTripMirror(trip, NOW);
    // now = T-0.5h before the 14:00Z ETD => past the T-1h escalation deadline; brief still pending
    const nowLate = '2026-07-10T13:30:00.000Z';
    const fired = await service.runEscalations(nowLate);
    expect(fired.length).toBe(1);
    expect(fired[0].type).toBe('escalation');
    const again = await service.runEscalations(nowLate);
    expect(again).toEqual([]); // idempotent — escalation already open for that task
  });

  it('tripReadiness reflects instance states', async () => {
    const { store, service } = svc();
    await store.saveTemplate(perTrip);
    const { instances } = await service.createTripMirror(trip, NOW);
    expect((await service.tripReadiness('T1')).state).toBe('NOT_READY');
    for (const i of instances) {
      if (i.requiresAck) await service.applyAction(i.id, { kind: 'ack' }, 'x', NOW);
      await service.applyAction(i.id, { kind: 'complete' }, 'x', NOW);
    }
    expect((await service.tripReadiness('T1')).state).toBe('READY');
  });

  const paxTpl: ChecklistTemplate = {
    id: 'dom2', name: 'D', triggerType: 'per_trip', scope: 'domestic', version: 1,
    status: 'published', effectiveFrom: '2026-01-01T00:00:00.000Z',
    taskDefinitions: [
      { id: 'pax', title: 'Confirm PAX forms', ownerRole: 'scheduling', category: 'ops', order: 1,
        dueRule: { kind: 'hoursBeforeEtd', hours: 24 }, requiresAck: true, reTriggerOn: ['passengerChange'],
        escalation: { deadline: { kind: 'hoursBeforeEtd', hours: 1 }, notifyRole: 'scheduling' },
        handoffTarget: { kind: 'role', value: 'pilot', channel: 'inbox' } },
    ],
  };
  const addPax = (t: TripRecord, n = 1): TripRecord =>
    ({ ...t, legs: [{ ...t.legs[0], paxCount: t.legs[0].paxCount + n }] });

  it('updateTrip FLAGS a completed pax task when a passenger is added (advisory, D89)', async () => {
    const { store, service } = svc();
    await store.saveTemplate(paxTpl);
    const { instances } = await service.createTripMirror(trip, NOW);
    const pax = instances.find((i) => i.taskDefId === 'pax')!;
    await service.applyAction(pax.id, { kind: 'ack' }, 'p', NOW);
    await service.applyAction(pax.id, { kind: 'complete' }, 's', NOW);
    const { updated } = await service.updateTrip(addPax(trip), NOW);
    expect(updated.find((i) => i.taskDefId === 'pax')?.reflag).toEqual({ change: 'passengerChange' });
    const stored = await store.getInstance(pax.id);
    expect(stored?.status).toBe('done');        // advisory: the clear survives the change
    expect(stored?.reflag).toEqual({ change: 'passengerChange' });
  });

  it('updateTrip leaves a completed task done when the change does not re-trigger it', async () => {
    const { store, service } = svc();
    await store.saveTemplate({ ...paxTpl, taskDefinitions: [{ ...paxTpl.taskDefinitions[0], reTriggerOn: [] }] });
    const { instances } = await service.createTripMirror(trip, NOW);
    const pax = instances.find((i) => i.taskDefId === 'pax')!;
    await service.applyAction(pax.id, { kind: 'ack' }, 'p', NOW);
    await service.applyAction(pax.id, { kind: 'complete' }, 's', NOW);
    await service.updateTrip(addPax(trip), NOW);
    expect((await store.getInstance(pax.id))?.status).toBe('done');
  });

  it('an advisory reflag does NOT re-arm escalation (D89 — no demanded rework)', async () => {
    const { store, service } = svc();
    await store.saveTemplate(paxTpl);
    const { instances } = await service.createTripMirror(trip, NOW);
    const pax = instances.find((i) => i.taskDefId === 'pax')!;
    const late = '2026-07-10T13:30:00.000Z';
    expect((await service.runEscalations(late)).length).toBe(1);
    await service.applyAction(pax.id, { kind: 'ack' }, 'p', NOW);
    await service.applyAction(pax.id, { kind: 'complete' }, 's', NOW);
    await service.updateTrip(addPax(trip, 2), NOW);
    expect((await service.runEscalations(late)).length).toBe(0); // stays settled — flag is advisory
  });

  it.each(['domestic', 'international', 'dca_dassp'] as const)(
    'seeded %s trips deliver a crew brief: completing send-crew-brief emits a pilot-targeted event with the tripId',
    async (tripType) => {
      const { store, service } = svc();
      await seedTemplates(store);
      const t: TripRecord = { ...trip, id: `T-${tripType}`, tripNumber: `TRIP-${tripType}`, tripType };
      const { instances } = await service.createTripMirror(t, NOW);
      const brief = instances.find((i) => i.taskDefId === 'send-crew-brief');
      expect(brief).toBeDefined();
      const done = await service.applyAction(brief!.id, { kind: 'complete' }, 'sched:1', NOW);
      expect(done.status).toBe('done');
      const inbox = await store.listEventsForTarget({ kind: 'role', value: 'pilot' });
      expect(inbox.some((e) => (e.payload as { tripId?: string }).tripId === t.id)).toBe(true);
    },
  );
});
