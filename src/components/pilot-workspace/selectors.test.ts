import { describe, it, expect } from 'vitest';
import { selectPilotFlights, composePilotReadiness } from './selectors';
import type { TripRecord } from '../../scheduling/store/types';
import type { Readiness } from '../../scheduling/engine/readiness';
import type { TripReadinessResult } from '../tech-log/engine/readiness';

const NOW = '2026-07-01T12:00:00.000Z';

function trip(over: Partial<TripRecord>): TripRecord {
  return {
    id: `trip-${over.tripNumber ?? 'X'}`,
    tripNumber: over.tripNumber ?? 'X',
    sourceSystem: 'manual',
    sourceTripRef: null,
    tail: 'N5PG',
    aircraftType: 'G650ER',
    tripType: 'domestic',
    priority: 'standard',
    status: over.status ?? 'confirmed',
    startDate: over.startDate ?? '2026-07-01',
    endDate: over.endDate ?? '2026-07-02',
    legs: over.legs ?? [
      { id: 'l1', sequence: 1, departureIcao: 'KLUK', arrivalIcao: 'KTEB',
        departureTimeUtc: '2026-07-01T18:00:00.000Z', paxCount: 3 },
    ],
    createdBy: 'seed', createdAtUtc: NOW,
    ...over,
  } as TripRecord;
}

describe('selectPilotFlights', () => {
  it('keeps planning/confirmed/in_progress trips and drops completed/cancelled', () => {
    const trips = [
      trip({ tripNumber: 'A', status: 'confirmed' }),
      trip({ tripNumber: 'B', status: 'completed' }),
      trip({ tripNumber: 'C', status: 'cancelled' }),
      trip({ tripNumber: 'D', status: 'in_progress' }),
    ];
    const got = selectPilotFlights(trips, NOW).map((t) => t.tripNumber);
    expect(got).toEqual(['A', 'D']);
  });

  it('excludes volume-seed board filler — those are scheduler-scale demo trips, not the pilot\'s flights', () => {
    const trips = [
      trip({ tripNumber: 'VOL', createdBy: 'volume-seed' }),
      trip({ tripNumber: 'REAL', createdBy: 'demo-seed' }),
    ];
    expect(selectPilotFlights(trips, NOW).map((t) => t.tripNumber)).toEqual(['REAL']);
  });

  it('sorts by earliest leg departure, soonest first', () => {
    const late = trip({ tripNumber: 'LATE', legs: [
      { id: 'l', sequence: 1, departureIcao: 'KLUK', arrivalIcao: 'KTEB',
        departureTimeUtc: '2026-07-03T10:00:00.000Z', paxCount: 1 }] });
    const soon = trip({ tripNumber: 'SOON', legs: [
      { id: 'l', sequence: 1, departureIcao: 'KLUK', arrivalIcao: 'KTEB',
        departureTimeUtc: '2026-07-01T15:00:00.000Z', paxCount: 1 }] });
    const got = selectPilotFlights([late, soon], NOW).map((t) => t.tripNumber);
    expect(got).toEqual(['SOON', 'LATE']);
  });
});

describe('composePilotReadiness', () => {
  const sched = (state: Readiness['state']): Readiness => ({ state, completion: state === 'READY' ? 1 : 0.5 });
  const pf = (state: TripReadinessResult['state'], blocker?: string): TripReadinessResult =>
    ({ state, blocker, computedAtUtc: NOW });

  it('is NOT_READY when the trip has not been released to preflight', () => {
    expect(composePilotReadiness(sched('READY'), null).state).toBe('NOT_READY');
    expect(composePilotReadiness(sched('READY'), null).blocker).toMatch(/not released/i);
  });

  it('is BLOCKED when the aircraft is unserviceable (preflight RED)', () => {
    const r = composePilotReadiness(sched('READY'), pf('RED', 'N5PG grounded: open airworthiness defect'));
    expect(r.state).toBe('BLOCKED');
    expect(r.blocker).toMatch(/grounded/i);
  });

  it('is BLOCKED when a coordination task is blocked', () => {
    expect(composePilotReadiness({ state: 'BLOCKED', blocker: 'permit', completion: 0.5 }, pf('READY')).state).toBe('BLOCKED');
  });

  it('is NOT_READY when preflight is incomplete', () => {
    expect(composePilotReadiness(sched('READY'), pf('NOT_READY', 'Leg 1 FRAT not started')).state).toBe('NOT_READY');
  });

  it('is READY only when scheduling READY and preflight READY', () => {
    expect(composePilotReadiness(sched('READY'), pf('READY')).state).toBe('READY');
    expect(composePilotReadiness(sched('NOT_READY'), pf('READY')).state).toBe('NOT_READY');
  });
});
