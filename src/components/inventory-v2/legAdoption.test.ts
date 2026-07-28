import { describe, it, expect } from 'vitest';
import { adoptMyairopsTrip, findAdoptedTrip, formatLegTiming, describeResolvedLeg } from './legAdoption';
import type { ResolvedLeg } from '../../integration/myairops/legResolver';
import type { TripRecord, TripLegRecord } from '../../scheduling/store/types';
import type { Trip } from './types';

const NOW = '2026-07-28T12:00:00.000Z';
const NOW_MS = Date.parse(NOW);
const H = 60 * 60 * 1000;
const at = (hoursFromNow: number) => new Date(NOW_MS + hoursFromNow * H).toISOString();

const LEGS: TripLegRecord[] = [
  { id: 'mao-leg-1', sequence: 1, departureIcao: 'KLUK', arrivalIcao: 'KTEB', departureTimeUtc: at(-8), arrivalTimeUtc: at(-6), paxCount: 4, filedStatus: 'unfiled' },
  { id: 'mao-leg-2', sequence: 2, departureIcao: 'KTEB', arrivalIcao: 'KOPF', departureTimeUtc: at(-4), arrivalTimeUtc: at(-2), paxCount: 3, filedStatus: 'unfiled' },
  { id: 'mao-leg-3', sequence: 3, departureIcao: 'KOPF', arrivalIcao: 'KLUK', departureTimeUtc: at(3), arrivalTimeUtc: at(5), paxCount: 2, filedStatus: 'unfiled' },
];

const RECORD: TripRecord = {
  id: 'mao-trip-7315',
  tripNumber: 'MAO-7315',
  sourceSystem: 'myairops',
  sourceTripRef: 'MAO-7315',
  tail: 'N2PG',
  aircraftType: 'G650ER',
  tripType: 'domestic',
  priority: 'standard',
  status: 'in_progress',
  startDate: at(-8),
  endDate: at(5),
  legs: LEGS,
  createdBy: 'myairops-sync',
  createdAtUtc: NOW,
};

const resolved = (legIndex: number, kind: ResolvedLeg['kind'], offsetMs = 2 * H): ResolvedLeg => ({
  kind, trip: RECORD, leg: LEGS[legIndex], offsetMs,
});

const OPTS = { aircraftType: 'G650' as const, createdBy: 'Sarah Mitchell', nowIso: NOW };

describe('adoptMyairopsTrip', () => {
  it('mirrors the myairops trip, carrying the source refs that make it a mirror not an original', () => {
    const trip = adoptMyairopsTrip(resolved(1, 'just_landed'), OPTS);

    expect(trip.id).toBe('mao-trip-7315');
    expect(trip.sourceSystem).toBe('myairops');
    expect(trip.sourceTripRef).toBe('MAO-7315');
    expect(trip.tripNumber).toBe('MAO-7315');
    expect(trip.tailNumber).toBe('N2PG');
    expect(trip.status).toBe('active');
    expect(trip.createdBy).toBe('Sarah Mitchell');
    expect(trip.legs.map(l => l.sourceLegRef)).toEqual(['mao-leg-1', 'mao-leg-2', 'mao-leg-3']);
    expect(trip.legs[0]).toMatchObject({ legNumber: 1, origin: 'KLUK', destination: 'KTEB', paxCount: 4 });
  });

  it('takes aircraft type from our own fleet, not from the myairops record', () => {
    // The record says G650ER; inventory v2's union is G650 | G500 and the fleet is our reference data.
    expect(adoptMyairopsTrip(resolved(1, 'just_landed'), OPTS).aircraftType).toBe('G650');
    expect(adoptMyairopsTrip(resolved(1, 'just_landed'), { ...OPTS, aircraftType: 'G500' }).aircraftType).toBe('G500');
  });

  it('makes the resolved leg active, earlier legs completed and later legs upcoming', () => {
    const trip = adoptMyairopsTrip(resolved(1, 'just_landed'), OPTS);

    expect(trip.legs.map(l => l.status)).toEqual(['completed', 'active', 'upcoming']);
    // Just landed = on the ground with the leg still open, so reconciliation can run.
    expect(trip.legs.map(l => l.phase)).toEqual(['complete', 'on_ground', 'pre_flight']);
  });

  it('phases the active leg by how it was resolved', () => {
    expect(adoptMyairopsTrip(resolved(1, 'in_flight', 0), OPTS).legs[1].phase).toBe('in_flight');
    expect(adoptMyairopsTrip(resolved(2, 'next_departure', 3 * H), OPTS).legs[2].phase).toBe('pre_flight');
    expect(adoptMyairopsTrip(resolved(2, 'next_departure', 3 * H), OPTS).legs.map(l => l.status))
      .toEqual(['completed', 'completed', 'active']);
  });

  it('is deterministic — adopting twice produces the same trip id', () => {
    expect(adoptMyairopsTrip(resolved(1, 'just_landed'), OPTS).id)
      .toBe(adoptMyairopsTrip(resolved(2, 'next_departure'), OPTS).id);
  });

  it('dates each leg from its own departure, not the trip start', () => {
    const trip = adoptMyairopsTrip(resolved(1, 'just_landed'), OPTS);
    expect(trip.legs[0].date).toBe(LEGS[0].departureTimeUtc.slice(0, 10));
    expect(trip.legs[2].date).toBe(LEGS[2].departureTimeUtc.slice(0, 10));
  });
});

describe('findAdoptedTrip', () => {
  const adopted = adoptMyairopsTrip(resolved(1, 'just_landed'), OPTS);
  const handMade: Trip = {
    id: 'trip-999', tailNumber: 'N2PG', aircraftType: 'G650', status: 'active',
    startDate: '2026-07-28', legs: [], notes: [], loadItems: [], returnItems: [],
    createdBy: 'Mike Johnson', createdAt: NOW,
  };

  it('finds an already-adopted trip so a second tap does not create a duplicate', () => {
    expect(findAdoptedTrip([handMade, adopted], RECORD)?.id).toBe('mao-trip-7315');
  });

  it('does not match a hand-typed trip for the same tail', () => {
    expect(findAdoptedTrip([handMade], RECORD)).toBeUndefined();
  });
});

describe('formatLegTiming', () => {
  it('states when the leg landed, in Zulu, with how stale that is', () => {
    expect(formatLegTiming(resolved(1, 'just_landed', 2 * H))).toBe(`landed ${LEGS[1].arrivalTimeUtc!.slice(11, 16)}Z · 2h ago`);
  });

  it('states when the next leg departs and how soon', () => {
    expect(formatLegTiming(resolved(2, 'next_departure', 3 * H))).toBe(`departs ${LEGS[2].departureTimeUtc.slice(11, 16)}Z · in 3h`);
  });

  it('says in flight without a stale-ness claim it cannot support', () => {
    expect(formatLegTiming(resolved(1, 'in_flight', 0))).toBe('in flight');
  });

  it('uses minutes under the hour so a fresh landing does not read as "0h ago"', () => {
    expect(formatLegTiming(resolved(1, 'just_landed', 25 * 60 * 1000))).toContain('25m ago');
  });

  it('falls back to departure time when the leg has no arrival time', () => {
    const noArrival: ResolvedLeg = {
      kind: 'just_landed', trip: RECORD, offsetMs: 2 * H,
      leg: { ...LEGS[1], arrivalTimeUtc: undefined },
    };
    expect(formatLegTiming(noArrival)).toBe(`landed ${LEGS[1].departureTimeUtc.slice(11, 16)}Z · 2h ago`);
  });
});

describe('describeResolvedLeg', () => {
  it('joins route and timing into the label an inspection records', () => {
    expect(describeResolvedLeg(resolved(1, 'just_landed', 2 * H)))
      .toBe(`KTEB → KOPF · landed ${LEGS[1].arrivalTimeUtc!.slice(11, 16)}Z · 2h ago`);
  });
});
