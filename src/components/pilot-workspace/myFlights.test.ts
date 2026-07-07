import { describe, it, expect } from 'vitest';
import { tripNeedsPrep } from './myFlights';
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
