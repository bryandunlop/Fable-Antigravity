import { describe, it, expect } from 'vitest';
import { instantiateRecurring, instantiatePerTrip } from './instantiate';
import type { ChecklistTemplate, TripContext, DueContext, IdFactory } from './types';

const idf: IdFactory = (seed) => `id:${seed}`;
const ctx: DueContext = { nowUtc: '2026-06-30T12:00:00.000Z', officeTzOffsetMinutes: -240 };

const daily: ChecklistTemplate = {
  id: 'tpl-daily', name: 'Scheduler Daily', triggerType: 'recurring', scope: 'daily',
  version: 3, status: 'published', effectiveFrom: '2026-01-01T00:00:00.000Z',
  taskDefinitions: [
    { id: 'd-brief', title: 'Send crew brief', ownerRole: 'scheduling', category: 'crew',
      order: 1, dueRule: { kind: 'dayOfTimeLocal', time: '15:00' }, requiresAck: true,
      escalation: { deadline: { kind: 'dayOfTimeLocal', time: '17:00' }, notifyRole: 'scheduling' },
      handoffTarget: { kind: 'role', value: 'pilot', channel: 'teams' } },
    { id: 'd-fuel', title: 'Update Lunken fuel price', ownerRole: 'scheduling', category: 'fuel',
      order: 2, dueRule: { kind: 'weekday', day: 'MON' }, requiresAck: false,
      condition: { kind: 'always' } },
  ],
};

const domesticPerTrip: ChecklistTemplate = {
  id: 'tpl-dom', name: 'Domestic Per-Trip', triggerType: 'per_trip', scope: 'domestic',
  version: 1, status: 'published', effectiveFrom: '2026-01-01T00:00:00.000Z',
  taskDefinitions: [
    { id: 't-suit', title: 'Airport suitability check', ownerRole: 'scheduling', category: 'dispatch',
      order: 1, dueRule: { kind: 'hoursBeforeEtd', hours: 24 }, requiresAck: false },
    { id: 't-7pax', title: '7-pax G650 special handling', ownerRole: 'scheduling', category: 'dispatch',
      order: 2, dueRule: { kind: 'hoursBeforeEtd', hours: 48 }, requiresAck: false,
      condition: { kind: 'allOf', conditions: [
        { kind: 'paxCountAtLeast', value: 7 }, { kind: 'aircraftTypeEquals', value: 'G650ER' },
      ]}},
  ],
};

const trip = (over: Partial<TripContext> = {}): TripContext => ({
  tripId: 'T1', tripType: 'domestic', tail: 'N1PG', aircraftType: 'G650ER',
  etdUtc: '2026-07-10T14:00:00.000Z', maxPaxCount: 4, isWeekendDeparture: false, ...over,
});

describe('instantiateRecurring §7', () => {
  it('creates one instance per task def, pinned to the template version, with computed dueAt', () => {
    const out = instantiateRecurring(daily, ctx, idf);
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({
      templateId: 'tpl-daily', templateVersion: 3, taskDefId: 'd-brief',
      tripId: null, status: 'open', ownerRole: 'scheduling', requiresAck: true, ackState: 'pending',
      dueAtUtc: '2026-06-30T19:00:00.000Z',
      // point-in-time display snapshot copied from the task definition
      title: 'Send crew brief', category: 'crew', order: 1,
    });
    expect(out[0].auditTrail).toHaveLength(1);
    expect(out[0].auditTrail[0].action).toBe('created');
    // non-ack task starts ackState 'n_a'
    expect(out[1].ackState).toBe('n_a');
    expect(out[1].escalation).toBeUndefined();
    expect(out[0].escalation).toEqual({ deadline: { kind: 'dayOfTimeLocal', time: '17:00' }, notifyRole: 'scheduling' });
  });

  it('stamps runDate (office-local date) and null tripId for recurring', () => {
    const out = instantiateRecurring(daily, ctx, idf);
    expect(out[0].runDate).toBe('2026-06-30');
    expect(out[0].tripId).toBeNull();
  });

  it('leaves etdUtc undefined for recurring instances', () => {
    const out = instantiateRecurring(daily, ctx, idf);
    expect(out[0].etdUtc).toBeUndefined();
  });
});

describe('instantiatePerTrip §7', () => {
  it('selects only matching-scope, published templates and includes only condition-passing tasks', () => {
    const out = instantiatePerTrip([domesticPerTrip], trip(), { ...ctx, etdUtc: trip().etdUtc }, idf);
    // maxPax 4 -> the 7-pax task is excluded
    expect(out.map((t) => t.taskDefId)).toEqual(['t-suit']);
    expect(out[0]).toMatchObject({ tripId: 'T1', templateVersion: 1, dueAtUtc: '2026-07-09T14:00:00.000Z', runDate: null });
    // per-trip instance carries the ETD it was scheduled against
    expect(out[0].etdUtc).toBe('2026-07-10T14:00:00.000Z');
  });

  it('includes conditional tasks when the trip matches', () => {
    const out = instantiatePerTrip([domesticPerTrip], trip({ maxPaxCount: 7 }), { ...ctx, etdUtc: trip().etdUtc }, idf);
    expect(out.map((t) => t.taskDefId)).toEqual(['t-suit', 't-7pax']);
  });

  it('ignores templates whose scope != tripType and non-published templates', () => {
    const intl: ChecklistTemplate = { ...domesticPerTrip, id: 'tpl-intl', scope: 'international' };
    const draft: ChecklistTemplate = { ...domesticPerTrip, id: 'tpl-draft', status: 'draft' };
    const out = instantiatePerTrip([intl, draft], trip(), { ...ctx, etdUtc: trip().etdUtc }, idf);
    expect(out).toHaveLength(0);
  });
});
