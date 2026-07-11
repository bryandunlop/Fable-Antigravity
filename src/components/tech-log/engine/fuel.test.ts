import { describe, it, expect } from 'vitest';
import { requiresFuelFarmSubmission, findNextFinalizedLeg } from './fuel';
import type { Aircraft, TripLeg, Trip } from '../types';

const ac: Aircraft = { id: 'ac1', tailNumber: 'N1PG', type: 'G650ER', serialNumber: '6260', status: 'ACTIVE', isProvisional: false, homeBase: 'KLUK', airframeTotalHours: 2450.5, airframeTotalCycles: 980 };
function leg(p: Partial<TripLeg> = {}): TripLeg {
  return { id: 'l1', sequence: 1, departureIcao: 'KLUK', arrivalIcao: 'KASE', departureTimeUtc: '2026-06-22T14:30:00Z', arrivalTimeUtc: '2026-06-22T16:35:00Z', fratStatus: 'NOT_STARTED', airportReviewed: false, ...p };
}

describe('requiresFuelFarmSubmission', () => {
  it('true when the leg departs the home base (KLUK)', () => {
    expect(requiresFuelFarmSubmission(leg({ departureIcao: 'KLUK' }), ac)).toBe(true);
  });
  it('false when departing an outstation (FBO handles fuel)', () => {
    expect(requiresFuelFarmSubmission(leg({ departureIcao: 'KASE' }), ac)).toBe(false);
  });
  it('exact ICAO match only — not case-insensitive or partial', () => {
    expect(requiresFuelFarmSubmission(leg({ departureIcao: 'kluk' }), ac)).toBe(false);
    expect(requiresFuelFarmSubmission(leg({ departureIcao: 'LUK' }), ac)).toBe(false);
  });
});

describe('findNextFinalizedLeg', () => {
  const trip: Trip = {
    id: 'trip-1', tripNumber: 'GFO-100', aircraftId: 'ac-1', name: 'Demo', status: 'OPEN',
    flightLogIds: [], createdByOid: 'oid-sys', createdAtUtc: '2026-07-01T00:00:00.000Z',
    legs: [
      { id: 'leg-1', sequence: 1, departureIcao: 'KLUK', arrivalIcao: 'KTEB', departureTimeUtc: '2026-07-11T12:00:00.000Z', arrivalTimeUtc: '2026-07-11T14:00:00.000Z', fratStatus: 'NOT_STARTED', airportReviewed: false, plannedFuelLb: 9400, fuelFinalizedByOid: 'USR001', fuelFinalizedAtUtc: '2026-07-10T18:00:00.000Z' },
      { id: 'leg-2', sequence: 2, departureIcao: 'KTEB', arrivalIcao: 'KLUK', departureTimeUtc: '2026-07-12T12:00:00.000Z', arrivalTimeUtc: '2026-07-12T14:00:00.000Z', fratStatus: 'NOT_STARTED', airportReviewed: false },
    ],
  };

  it('returns the earliest upcoming leg whose fuel has been finalized', () => {
    const leg = findNextFinalizedLeg('ac-1', { trips: [trip] }, '2026-07-10T20:00:00.000Z');
    expect(leg?.id).toBe('leg-1');
  });

  it('ignores legs that have not been finalized', () => {
    const noFinal: Trip = { ...trip, legs: [{ ...trip.legs![1] }] };
    const leg = findNextFinalizedLeg('ac-1', { trips: [noFinal] }, '2026-07-10T20:00:00.000Z');
    expect(leg).toBeUndefined();
  });

  it('ignores legs for a different aircraft', () => {
    const leg = findNextFinalizedLeg('ac-999', { trips: [trip] }, '2026-07-10T20:00:00.000Z');
    expect(leg).toBeUndefined();
  });
});
