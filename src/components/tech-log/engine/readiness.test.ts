import { describe, it, expect } from 'vitest';
import { deriveTripReadiness } from './readiness';
import type { Aircraft, Defect, Deferral, FlightBriefing, MelItem, Trip, TripLeg } from '../types';

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
function mel(p: Partial<MelItem> = {}): MelItem {
  return { id: 'm1', aircraftType: 'G650ER', mmelRevision: 'Rev 1', effectiveDate: NOW, approvalState: 'APPROVED', ataReference: '24', itemNumber: '24-01', subItemNumber: '24-01-01', title: 'x', category: 'C', numberInstalled: null, numberRequired: null, ...p };
}
function ackDeferral(p: Partial<Deferral> = {}): Deferral {
  return { id: 'df1', defectId: 'd1', aircraftId: 'ac1', melItemId: 'm1', governingMmelRevision: 'Rev 1', governingEffectiveDate: NOW, category: 'C', dayOfDiscoveryUtc: NOW, clockStartDateUtc: NOW, governingTimezone: 'America/New_York', repairIntervalUnit: 'CALENDAR_DAY', repairIntervalValue: 10, restrictionText: 'Day VMC only', placardRequired: false, mProcedureRequired: false, extensionUsed: false, riiRequired: false, melReviewAcknowledged: true, signedByOid: 'u', signatureId: 's', status: 'ACTIVE', ...p };
}
function briefing(p: Partial<FlightBriefing> = {}): FlightBriefing {
  return { id: 'brief1', aircraftId: 'ac1', preparedByOid: 'm', createdAtUtc: NOW, status: 'ACKNOWLEDGED', checklist: [], ...p };
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
  it('RED precedence: aircraft grounded outranks a FRAT no-go (blocker is the aircraft, no driving leg)', () => {
    const r = deriveTripReadiness(trip([leg({ fratScore: 25, fratStatus: 'NOT_STARTED' })]), { ...clean, defects: [defect()] }, NOW);
    expect(r.state).toBe('RED');
    expect(r.blocker).toMatch(/grounded/i);
    expect(r.drivingLegId).toBeUndefined();
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

  it('NOT_READY: an ACTIVE deferral requiring PIC acknowledgement that has not been acknowledged', () => {
    const r = deriveTripReadiness(trip([leg()]), { ...clean, deferrals: [ackDeferral()], melItems: [mel()], briefings: [] }, NOW);
    expect(r.state).toBe('NOT_READY');
    expect(r.blocker).toMatch(/acknowledg/i);
  });

  it('NOT_READY: the latest briefing acknowledged a different deferral set (this one was never ticked)', () => {
    const b = briefing({ acknowledgedDeferralIds: ['some-other-deferral'] });
    const r = deriveTripReadiness(trip([leg()]), { ...clean, deferrals: [ackDeferral()], melItems: [mel()], briefings: [b] }, NOW);
    expect(r.state).toBe('NOT_READY');
    expect(r.blocker).toMatch(/acknowledg/i);
  });

  it('READY: the active deferral requiring ack was acknowledged via the latest briefing', () => {
    const b = briefing({ acknowledgedDeferralIds: ['df1'] });
    const r = deriveTripReadiness(trip([leg()]), { ...clean, deferrals: [ackDeferral()], melItems: [mel()], briefings: [b] }, NOW);
    expect(r.state).toBe('READY');
  });

  it('READY: an ACTIVE deferral with no restriction/placard/(O) procedure needs no acknowledgement', () => {
    const r = deriveTripReadiness(trip([leg()]), { ...clean, deferrals: [ackDeferral({ restrictionText: undefined })], melItems: [mel()], briefings: [] }, NOW);
    expect(r.state).toBe('READY');
  });
});
