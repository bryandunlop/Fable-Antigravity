import { describe, it, expect } from 'vitest';
import { fratModule, fuelModule, handoverModule, schedulingModule, deriveTripModules, totalOutstanding } from './moduleStatus';
import type { Trip, TripLeg, Aircraft, TechLogState, FlightBriefing } from '../tech-log/types';
import type { Readiness } from '../../scheduling/engine/readiness';

const NOW = '2026-07-01T12:00:00.000Z';
const PAST = '2026-07-01T06:00:00.000Z';
const AC_ID = 'ac1';

const AC: Aircraft = {
  id: AC_ID, tailNumber: 'N5PG', type: 'G650ER', serialNumber: '1',
  status: 'ACTIVE', isProvisional: false, homeBase: 'KLUK',
  airframeTotalHours: 0, airframeTotalCycles: 0,
} as Aircraft;

const mLeg = (over: Partial<TripLeg>): TripLeg => ({
  id: 'l1', sequence: 1, departureIcao: 'KLUK', arrivalIcao: 'KTEB',
  departureTimeUtc: NOW, arrivalTimeUtc: NOW,
  fratStatus: 'COMPLETED', airportReviewed: true, fuelRequestId: 'f1',
  ...over,
} as TripLeg);

const mirror = (legs: TripLeg[]): Trip => ({
  id: 't1', tripNumber: 'X', aircraftId: AC_ID, name: 'X',
  status: 'OPEN', flightLogIds: [], legs,
  createdByOid: 'o', createdAtUtc: NOW,
} as Trip);

const state = (over: Partial<TechLogState> = {}): TechLogState => ({
  aircraft: [AC], defects: [], deferrals: [], recurringChecks: [], recurringAccomplishments: [],
  briefings: [], postflights: [], melItems: [],
  ...over,
} as unknown as TechLogState);

describe('fratModule', () => {
  it('is muted when the trip is not released to preflight', () => {
    expect(fratModule(null)).toMatchObject({ tone: 'muted', summary: 'not released', outstanding: 0 });
  });
  it('is done when every leg has FRAT complete and airport reviewed', () => {
    expect(fratModule(mirror([mLeg({}), mLeg({ id: 'l2' })]))).toMatchObject({ tone: 'done', outstanding: 0 });
  });
  it('counts an outstanding FRAT', () => {
    expect(fratModule(mirror([mLeg({ fratStatus: 'NOT_STARTED' })]))).toMatchObject({ tone: 'action', summary: '1 to do', outstanding: 1 });
  });
  it('counts FRAT and airport per leg together', () => {
    const t = mirror([mLeg({ fratStatus: 'IN_PROGRESS', airportReviewed: false }), mLeg({ id: 'l2', fratStatus: 'NOT_STARTED', airportReviewed: false })]);
    expect(fratModule(t)).toMatchObject({ tone: 'action', outstanding: 4 });
  });
});

describe('fuelModule', () => {
  it('is muted when not released', () => {
    expect(fuelModule(null, AC)).toMatchObject({ tone: 'muted', summary: 'not released' });
  });
  it('is muted when no leg needs a home-base fuel-farm submission', () => {
    expect(fuelModule(mirror([mLeg({ departureIcao: 'KTEB' })]), AC)).toMatchObject({ tone: 'muted', summary: 'not required' });
  });
  it('flags a missing home-base submission', () => {
    expect(fuelModule(mirror([mLeg({ departureIcao: 'KLUK', fuelRequestId: undefined })]), AC)).toMatchObject({ tone: 'action', summary: '1 to submit', outstanding: 1 });
  });
  it('is done when the home-base submission exists', () => {
    expect(fuelModule(mirror([mLeg({ departureIcao: 'KLUK', fuelRequestId: 'f1' })]), AC)).toMatchObject({ tone: 'done', summary: 'submitted' });
  });
  it('is muted when the aircraft is unknown', () => {
    expect(fuelModule(mirror([mLeg({ fuelRequestId: undefined })]), undefined)).toMatchObject({ tone: 'muted' });
  });
});

describe('schedulingModule', () => {
  it('is muted when scheduling readiness is unknown', () => {
    expect(schedulingModule(undefined)).toMatchObject({ tone: 'muted', summary: '—' });
  });
  it('maps READY to done', () => {
    expect(schedulingModule({ state: 'READY' } as Readiness)).toMatchObject({ tone: 'done', summary: 'on track', outstanding: 0 });
  });
  it('maps NOT_READY to action, surfacing the blocker', () => {
    expect(schedulingModule({ state: 'NOT_READY', blocker: 'permits pending' } as Readiness)).toMatchObject({ tone: 'action', summary: 'permits pending', outstanding: 1 });
  });
  it('maps BLOCKED to blocked', () => {
    expect(schedulingModule({ state: 'BLOCKED', blocker: 'slot conflict' } as Readiness)).toMatchObject({ tone: 'blocked', summary: 'slot conflict', outstanding: 1 });
  });
});

describe('handoverModule (aircraft-keyed, independent of trip release)', () => {
  it('is muted when the aircraft is unknown (e.g. a non-fleet tail)', () => {
    expect(handoverModule(undefined, state(), NOW)).toMatchObject({ tone: 'muted', summary: 'no aircraft' });
  });
  it('is muted "in maintenance" when serviceable and no briefing has been released', () => {
    expect(handoverModule(AC, state(), NOW)).toMatchObject({ tone: 'muted', summary: 'in maintenance' });
  });
  it('is on the custody axis (not amber) "ready to accept" once a briefing is released to the crew', () => {
    const briefings = [{ id: 'b1', aircraftId: AC_ID, status: 'RELEASED', releasedAtUtc: PAST } as FlightBriefing];
    expect(handoverModule(AC, state({ briefings }), NOW)).toMatchObject({ tone: 'custody', summary: 'ready to accept', outstanding: 1 });
  });
  it('is on the custody axis once the PIC has accepted', () => {
    const briefings = [{ id: 'b1', aircraftId: AC_ID, status: 'ACKNOWLEDGED', releasedAtUtc: PAST, acknowledgedAtUtc: PAST } as FlightBriefing];
    expect(handoverModule(AC, state({ briefings }), NOW)).toMatchObject({ tone: 'custody', summary: 'in your custody' });
  });
  it('is blocked when the aircraft is RED (grounded), overriding custody', () => {
    const defects = [{ id: 'd1', aircraftId: AC_ID, status: 'OPEN', airworthinessAffecting: true, ataChapter: '27' } as unknown as TechLogState['defects'][number]];
    expect(handoverModule(AC, state({ defects }), NOW)).toMatchObject({ tone: 'blocked', summary: 'grounded' });
  });

  /**
   * LG-143 — a clean provisional tail reads GREEN from deriveServiceability (which knows nothing of
   * isProvisional), so this module fell straight through the RED test to the custody switch and
   * told the PIC "ready to accept" about an aircraft they are now blocked from accepting.
   */
  it('is blocked when the aircraft is in onboarding, even with a briefing released to the crew (LG-143)', () => {
    const prov = { ...AC, isProvisional: true } as Aircraft;
    const briefings = [{ id: 'b1', aircraftId: AC_ID, status: 'RELEASED', releasedAtUtc: PAST } as FlightBriefing];

    // Same briefing state that reads "ready to accept" for the non-provisional tail two tests
    // above. The provisional case puts the tail in `state` too, because the module reads the
    // serviceability PROJECTION rather than the passed row — one source of truth, so a caller
    // cannot hand it an aircraft object that disagrees with the ledger.
    expect(handoverModule(AC, state({ briefings }), NOW)).toMatchObject({ summary: 'ready to accept' });
    expect(handoverModule(prov, state({ briefings, aircraft: [prov] }), NOW))
      .toMatchObject({ tone: 'blocked', summary: 'in onboarding' });
  });
});

describe('deriveTripModules / totalOutstanding', () => {
  it('returns the four modules in board order and rolls up outstanding counts', () => {
    const t = mirror([mLeg({ fratStatus: 'NOT_STARTED', departureIcao: 'KLUK', fuelRequestId: undefined })]);
    const mods = deriveTripModules(t, AC, state(), { state: 'READY' } as Readiness, NOW);
    expect(mods.map((m) => m.key)).toEqual(['frat', 'fuel', 'handover', 'scheduling']);
    // FRAT: 1 (frat not started) + fuel: 1 (home-base unsent) + handover: 0 (in maintenance) + sched: 0
    expect(totalOutstanding(mods)).toBe(2);
  });
});
