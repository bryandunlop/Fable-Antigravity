import { describe, it, expect } from 'vitest';
import { deriveTripReadiness } from './readiness';
import type { Aircraft, Defect, Trip, TripLeg } from '../types';

const ac: Aircraft = { id: 'ac1', tailNumber: 'N1PG', type: 'G650ER', serialNumber: '6260', status: 'ACTIVE', isProvisional: false, homeBase: 'KLUK', airframeTotalHours: 2450.5, airframeTotalCycles: 980 };
const NOW = '2026-06-22T12:00:00Z';

function defect(p: Partial<Defect> = {}): Defect {
  return { id: 'd1', aircraftId: 'ac1', source: 'PIREP', ataChapter: '24', description: 'x', severity: 'HIGH', airworthinessAffecting: true, status: 'OPEN', reportedByOid: 'u', reportedAtUtc: NOW, signatureId: 's', ...p };
}
function leg(p: Partial<TripLeg> = {}): TripLeg {
  return { id: 'l1', sequence: 1, departureIcao: 'KASE', arrivalIcao: 'KTEB', departureTimeUtc: NOW, arrivalTimeUtc: NOW, fratStatus: 'COMPLETED', fratScore: 12, airportReviewed: true, ...p };
}
function trip(legs: TripLeg[]): Trip {
  return { id: 't1', tripNumber: 'TRIP-0001', aircraftId: 'ac1', name: 'demo', status: 'OPEN', flightLogIds: [], legs, createdByOid: 'u', createdAtUtc: NOW };
}
const clean = { aircraft: [ac], defects: [], deferrals: [] };

describe('deriveTripReadiness §9', () => {
  it('READY: no legs and a dispatchable aircraft', () => {
    expect(deriveTripReadiness(trip([]), clean, NOW).state).toBe('READY');
  });
  it('READY: all legs FRAT-complete, airports reviewed, no home-base fuel owed', () => {
    expect(deriveTripReadiness(trip([leg(), leg({ id: 'l2', sequence: 2 })]), clean, NOW).state).toBe('READY');
  });
  it('RED: aircraft grounded beats any leg state', () => {
    const r = deriveTripReadiness(trip([leg({ fratStatus: 'NOT_STARTED' })]), { ...clean, defects: [defect()] }, NOW);
    expect(r.state).toBe('RED');
    expect(r.blocker).toMatch(/grounded/i);
  });
  it('RED: a FRAT no-go (>=25) grounds the trip', () => {
    const r = deriveTripReadiness(trip([leg({ fratScore: 25 })]), clean, NOW);
    expect(r.state).toBe('RED');
    expect(r.drivingLegId).toBe('l1');
  });
  it('NOT_READY: an incomplete FRAT', () => {
    const r = deriveTripReadiness(trip([leg({ fratStatus: 'IN_PROGRESS' })]), clean, NOW);
    expect(r.state).toBe('NOT_READY');
    expect(r.blocker).toMatch(/frat/i);
  });
  it('NOT_READY: an unreviewed airport', () => {
    const r = deriveTripReadiness(trip([leg({ airportReviewed: false })]), clean, NOW);
    expect(r.state).toBe('NOT_READY');
    expect(r.blocker).toMatch(/airport/i);
  });
  it('NOT_READY: a home-base (KLUK) departure with no fuel submission', () => {
    const r = deriveTripReadiness(trip([leg({ departureIcao: 'KLUK' })]), clean, NOW);
    expect(r.state).toBe('NOT_READY');
    expect(r.blocker).toMatch(/fuel/i);
  });
  it('READY: a home-base departure once fuel is submitted', () => {
    expect(deriveTripReadiness(trip([leg({ departureIcao: 'KLUK', fuelRequestId: 'FR-1' })]), clean, NOW).state).toBe('READY');
  });
  it('READY: an outstation departure needs no fuel submission', () => {
    expect(deriveTripReadiness(trip([leg({ departureIcao: 'KASE' })]), clean, NOW).state).toBe('READY');
  });
});
