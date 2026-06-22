import { describe, it, expect } from 'vitest';
import { requiresFuelFarmSubmission } from './fuel';
import type { Aircraft, TripLeg } from '../types';

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
