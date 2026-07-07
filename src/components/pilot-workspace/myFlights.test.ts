import { describe, it, expect } from 'vitest';
import { groupTripsByHorizon, tripNeedsPrep } from './myFlights';
import type { Trip, TripLeg, Aircraft } from '../tech-log/types';

const NOW = '2026-07-01T12:00:00.000Z';

const mLeg = (over: Partial<TripLeg>): TripLeg => ({
  id: 'l1', sequence: 1, departureIcao: 'KLUK', arrivalIcao: 'KTEB',
  departureTimeUtc: NOW, arrivalTimeUtc: NOW,
  fratStatus: 'COMPLETED', airportReviewed: true,
  ...over,
} as TripLeg);

const mirror = (legs: TripLeg[]): Trip => ({
  id: 't1', tripNumber: 'X', aircraftId: 'ac1', name: 'X',
  status: 'OPEN', flightLogIds: [], legs,
  createdByOid: 'o', createdAtUtc: NOW,
} as Trip);

const AC: Aircraft = {
  id: 'ac1', tailNumber: 'N5PG', type: 'G650ER', serialNumber: '1',
  status: 'ACTIVE', isProvisional: false, homeBase: 'KLUK',
  airframeTotalHours: 0, airframeTotalCycles: 0,
} as Aircraft;

describe('tripNeedsPrep', () => {
  it('is false when the trip has no tech-log mirror (not released to preflight)', () => {
    expect(tripNeedsPrep(null, AC)).toBe(false);
  });

  it('is true when any leg FRAT is not completed', () => {
    expect(tripNeedsPrep(mirror([mLeg({ fratStatus: 'NOT_STARTED' })]), AC)).toBe(true);
    expect(tripNeedsPrep(mirror([mLeg({ fratStatus: 'IN_PROGRESS' })]), AC)).toBe(true);
  });

  it('is true when any leg airport is not reviewed', () => {
    expect(tripNeedsPrep(mirror([mLeg({ airportReviewed: false })]), AC)).toBe(true);
  });

  it('is true when the home-base (leg-one) fuel-farm submission is missing', () => {
    expect(tripNeedsPrep(mirror([mLeg({ fuelRequestId: undefined })]), AC)).toBe(true);
  });

  it('does not flag a missing fuel submission on an outstation leg', () => {
    const legs = [
      mLeg({ id: 'l1', departureIcao: 'KLUK', fuelRequestId: 'f1' }),      // home base, fuel submitted
      mLeg({ id: 'l2', departureIcao: 'KTEB', fuelRequestId: undefined }), // outstation, fuel not required
    ];
    expect(tripNeedsPrep(mirror(legs), AC)).toBe(false);
  });

  it('is false when every leg is fully prepped', () => {
    expect(tripNeedsPrep(mirror([mLeg({ fuelRequestId: 'f1' })]), AC)).toBe(false);
  });

  it('skips the fuel clause when aircraft is undefined', () => {
    expect(tripNeedsPrep(mirror([mLeg({ fuelRequestId: undefined })]), undefined)).toBe(false);
  });
});

const NOW_MS = new Date(NOW).getTime();
const DAY = 24 * 60 * 60 * 1000;
const iso = (ms: number) => new Date(ms).toISOString();

function trip({ daysOut = 1, ...over }: Partial<import('../../scheduling/store/types').TripRecord> & { daysOut?: number }) {
  const depMs = NOW_MS + daysOut * DAY;
  return {
    id: `trip-${over.tripNumber ?? 'X'}`,
    tripNumber: over.tripNumber ?? 'X',
    sourceSystem: 'manual', sourceTripRef: null,
    tail: 'N5PG', aircraftType: 'G650ER',
    tripType: 'domestic', priority: 'standard',
    status: 'confirmed',
    startDate: '2026-07-01', endDate: '2026-07-02',
    legs: [{ id: 'l1', sequence: 1, departureIcao: 'KLUK', arrivalIcao: 'KTEB',
      departureTimeUtc: iso(depMs), paxCount: 3 }],
    createdBy: 'seed', createdAtUtc: NOW,
    ...over,
  } as import('../../scheduling/store/types').TripRecord;
}

describe('groupTripsByHorizon', () => {
  it('pins in_progress trips and buckets the rest by days-to-departure (boundaries inclusive)', () => {
    const g = groupTripsByHorizon([
      trip({ tripNumber: 'IP', status: 'in_progress', daysOut: 40 }),
      trip({ tripNumber: 'W', daysOut: 3 }),
      trip({ tripNumber: 'W7', daysOut: 7 }),    // exactly 7 -> this week
      trip({ tripNumber: 'N2', daysOut: 10 }),
      trip({ tripNumber: 'N14', daysOut: 14 }),  // exactly 14 -> next 2 weeks
      trip({ tripNumber: 'L', daysOut: 20 }),
      trip({ tripNumber: 'L30', daysOut: 30 }),  // exactly 30 -> later this month
      trip({ tripNumber: 'M', daysOut: 45 }),
      trip({ tripNumber: 'M90', daysOut: 90 }),
    ], NOW);
    expect(g.inProgress.map((t) => t.tripNumber)).toEqual(['IP']);
    expect(g.thisWeek.map((t) => t.tripNumber)).toEqual(['W', 'W7']);
    expect(g.next2Weeks.map((t) => t.tripNumber)).toEqual(['N2', 'N14']);
    expect(g.laterThisMonth.map((t) => t.tripNumber)).toEqual(['L', 'L30']);
    expect(g.nextMonth.map((t) => t.tripNumber)).toEqual(['M', 'M90']);
  });

  it('orders trips soonest-departure-first within a band regardless of input order', () => {
    const g = groupTripsByHorizon([
      trip({ tripNumber: 'B', daysOut: 5 }),
      trip({ tripNumber: 'A', daysOut: 2 }),
    ], NOW);
    expect(g.thisWeek.map((t) => t.tripNumber)).toEqual(['A', 'B']);
  });

  it('returns every band as an array, empty when nothing falls in it', () => {
    expect(groupTripsByHorizon([], NOW)).toEqual({
      inProgress: [], thisWeek: [], next2Weeks: [], laterThisMonth: [], nextMonth: [],
    });
  });
});
