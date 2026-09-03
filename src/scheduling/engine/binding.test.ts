import { describe, it, expect } from 'vitest';
import { instantiatePerTrip } from './instantiate';
import { instanceKey, reconcileTrip } from './reconcile';
import type { ChecklistTemplate, TripContext, DueContext, IdFactory, TaskDefinition } from './types';

const idf: IdFactory = (seed) => `id:${seed}`;
const ctx: DueContext = { nowUtc: '2026-09-01T12:00:00.000Z', officeTzOffsetMinutes: -240 };

const tpl: ChecklistTemplate = {
  id: 'tpl-intl', name: 'International', triggerType: 'per_trip', scope: 'international',
  version: 1, status: 'published', effectiveFrom: '2026-01-01T00:00:00.000Z',
  taskDefinitions: [
    { id: 'pax-passports', title: 'Confirm PAX passports & visas', ownerRole: 'scheduling', category: 'customs', order: 1, dueRule: { kind: 'hoursBeforeEtd', hours: 240 }, requiresAck: false, bindTo: 'person' },
    { id: 'crew-brief', title: 'Send crew brief', ownerRole: 'scheduling', category: 'crew', order: 2, dueRule: { kind: 'hoursBeforeEtd', hours: 48 }, requiresAck: false, bindTo: 'crew' },
    { id: 'handler', title: 'Handler', ownerRole: 'scheduling', category: 'handling', order: 3, dueRule: { kind: 'hoursBeforeEtd', hours: 72 }, requiresAck: false, appliesTo: { endpoint: 'arrival', airport: { kind: 'prefix', prefix: 'E' } } },
    { id: 'insurance', title: 'Insurance certificate', ownerRole: 'scheduling', category: 'ops', order: 4, dueRule: { kind: 'hoursBeforeEtd', hours: 96 }, requiresAck: false },
  ],
};

const trip: TripContext = {
  tripId: 'trip-1', tripType: 'international', tail: 'N2PG', aircraftType: 'G650ER',
  etdUtc: '2026-09-12T12:00:00.000Z', maxPaxCount: 2, isWeekendDeparture: false, routeIcaos: ['KLUK', 'EGLL'],
  legs: [{ legId: 'leg-a', sequence: 1, departureIcao: 'KLUK', arrivalIcao: 'EGLL', departureTimeUtc: '2026-09-12T12:00:00.000Z', arrivalTimeUtc: '2026-09-12T19:40:00.000Z', paxCount: 2 }],
  people: [{ id: 'P-REYES', name: 'A. Reyes' }, { id: 'P-SREYES', name: 'S. Reyes' }],
};

describe('every checklist item says what it is about (D110 slice 2)', () => {
  it('a person-bound task fans out to one instance per person aboard, each bound to that person', () => {
    const xs = instantiatePerTrip([tpl], trip, ctx, idf).filter(i => i.taskDefId === 'pax-passports');
    expect(xs).toHaveLength(2);
    expect(xs.map(i => i.boundTo)).toEqual([
      { kind: 'person', id: 'P-REYES', label: 'A. Reyes' },
      { kind: 'person', id: 'P-SREYES', label: 'S. Reyes' },
    ]);
    expect(xs.map(i => i.personId)).toEqual(['P-REYES', 'P-SREYES']);
    expect(new Set(xs.map(i => i.id)).size).toBe(2);
  });
  it('a per-airport task is bound to its leg; a crew task to the crew; the rest to nothing', () => {
    const xs = instantiatePerTrip([tpl], trip, ctx, idf);
    expect(xs.find(i => i.taskDefId === 'handler')!.boundTo).toEqual({ kind: 'leg', id: 'leg-a', label: 'Leg 1 · EGLL' });
    expect(xs.find(i => i.taskDefId === 'crew-brief')!.boundTo).toEqual({ kind: 'crew', id: 'crew', label: 'Crew' });
    expect(xs.find(i => i.taskDefId === 'insurance')!.boundTo).toBeUndefined();
  });
  it('with nobody named yet, a person-bound task falls back to one trip-level instance (the hinge)', () => {
    const xs = instantiatePerTrip([tpl], { ...trip, people: [] }, ctx, idf).filter(i => i.taskDefId === 'pax-passports');
    expect(xs).toHaveLength(1);
    expect(xs[0].boundTo).toBeUndefined();
  });
  it('a passenger removed cancels their bound item; re-added, it is restored; the other person\'s cleared item stays done', () => {
    const defs = new Map<string, TaskDefinition>(tpl.taskDefinitions.map(d => [d.id, d]));
    const live = instantiatePerTrip([tpl], trip, ctx, idf).map(i => i.taskDefId === 'pax-passports' && i.personId === 'P-REYES' ? { ...i, status: 'done' as const } : i);
    const without = instantiatePerTrip([tpl], { ...trip, people: [trip.people![0]] }, ctx, idf);
    const plan = reconcileTrip(live, without, { aircraftChanged: false, legChanges: {} }, defs, 'system', ctx.nowUtc);
    const cancelled = plan.toUpdate.find(i => i.personId === 'P-SREYES');
    expect(cancelled?.status).toBe('cancelled');
    expect(plan.toUpdate.find(i => i.personId === 'P-REYES')).toBeUndefined();
    const after = live.map(i => plan.toUpdate.find(u => u.id === i.id) ?? i);
    const back = reconcileTrip(after, instantiatePerTrip([tpl], trip, ctx, idf), { aircraftChanged: false, legChanges: {} }, defs, 'system', ctx.nowUtc);
    expect(back.toUpdate.find(i => i.personId === 'P-SREYES')?.status).toBe('open');
    expect(back.toCreate).toHaveLength(0);
  });
  it('instance identity includes the person, so two people never collide on one key', () => {
    expect(instanceKey({ taskDefId: 'x', personId: 'a' })).not.toBe(instanceKey({ taskDefId: 'x', personId: 'b' }));
  });
});
