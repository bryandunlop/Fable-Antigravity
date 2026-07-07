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
  etdUtc: '2026-07-10T14:00:00.000Z', maxPaxCount: 4, isWeekendDeparture: false,
  routeIcaos: [], ...over,
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

describe('instantiatePerTrip — per-airport (Phase 2)', () => {
  const perAirport: ChecklistTemplate = {
    id: 'tpl-air', name: 'Per-airport', triggerType: 'per_trip', scope: 'domestic',
    version: 1, status: 'published', effectiveFrom: '2026-01-01T00:00:00.000Z',
    taskDefinitions: [
      { id: 'fbo', title: 'FBO handling', ownerRole: 'scheduling', category: 'handling', order: 1,
        dueRule: { kind: 'businessDaysBeforeEtd', days: 1 }, requiresAck: false,
        appliesTo: { endpoint: 'both', airport: { kind: 'prefix', prefix: 'K', except: ['KLUK'] } } },
      { id: 'ppr', title: 'KBOS PPR', ownerRole: 'scheduling', category: 'handling', order: 2,
        dueRule: { kind: 'hoursBeforeEtd', hours: 24 }, requiresAck: false,
        appliesTo: { endpoint: 'arrival', airport: { kind: 'exact', icao: 'KBOS' } } },
    ],
  };

  const legged = (over: Partial<TripContext> = {}): TripContext => trip({
    routeIcaos: ['KLUK', 'KBOS', 'KLGA'],
    legs: [
      { legId: 'L1', sequence: 1, departureIcao: 'KLUK', arrivalIcao: 'KBOS',
        departureTimeUtc: '2026-07-10T14:00:00.000Z', arrivalTimeUtc: '2026-07-10T16:00:00.000Z', paxCount: 4 },
      { legId: 'L2', sequence: 2, departureIcao: 'KBOS', arrivalIcao: 'KLGA',
        departureTimeUtc: '2026-07-12T13:00:00.000Z', arrivalTimeUtc: '2026-07-12T14:00:00.000Z', paxCount: 4 },
    ],
    ...over,
  });

  it('fans a per-airport task to each matching leg-endpoint (K except KLUK) with distinct ids', () => {
    const out = instantiatePerTrip([perAirport], legged(), { ...ctx, etdUtc: legged().etdUtc }, idf)
      .filter((t) => t.taskDefId === 'fbo');
    const stamps = out.map((t) => `${t.airportIcao}:${t.airportRole}:${t.legId}`).sort();
    expect(stamps).toEqual(['KBOS:arrival:L1', 'KBOS:departure:L2', 'KLGA:arrival:L2']);
    expect(new Set(out.map((t) => t.id)).size).toBe(3);
    expect(out.some((t) => t.airportIcao === 'KLUK')).toBe(false);
  });

  it('anchors an arrival-endpoint task due date to the arrival time, not the leg departure', () => {
    const out = instantiatePerTrip([perAirport], legged(), { ...ctx, etdUtc: legged().etdUtc }, idf)
      .filter((t) => t.taskDefId === 'ppr');
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ airportIcao: 'KBOS', airportRole: 'arrival', legId: 'L1' });
    // 24h before the KBOS ARRIVAL (16:00), not the leg departure (14:00)
    expect(out[0].dueAtUtc).toBe('2026-07-09T16:00:00.000Z');
  });

  it('gives the same airport on two legs distinct instances (out-and-back)', () => {
    const oab = legged({ legs: [
      { legId: 'A', sequence: 1, departureIcao: 'KTEB', arrivalIcao: 'KBOS',
        departureTimeUtc: '2026-07-10T14:00:00.000Z', arrivalTimeUtc: '2026-07-10T15:00:00.000Z', paxCount: 2 },
      { legId: 'B', sequence: 2, departureIcao: 'KBOS', arrivalIcao: 'KTEB',
        departureTimeUtc: '2026-07-11T14:00:00.000Z', arrivalTimeUtc: '2026-07-11T15:00:00.000Z', paxCount: 2 },
    ] });
    const out = instantiatePerTrip([perAirport], oab, { ...ctx, etdUtc: oab.etdUtc }, idf)
      .filter((t) => t.taskDefId === 'fbo');
    expect(out).toHaveLength(4); // KTEB-dep-A, KBOS-arr-A, KBOS-dep-B, KTEB-arr-B
    expect(new Set(out.map((t) => t.id)).size).toBe(4);
  });
});
