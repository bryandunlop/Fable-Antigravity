import { describe, it, expect } from 'vitest';
import { deriveServiceability } from './serviceability';
import type { Aircraft, Defect, Deferral } from '../types';

const ac: Aircraft = {
  id: 'ac1', tailNumber: 'N5PG', type: 'G500', serialNumber: '72157', status: 'ACTIVE',
  isProvisional: false, homeBase: 'KLUK', airframeTotalHours: 1200, airframeTotalCycles: 800,
};
const base = { aircraft: [ac] };
const NOW = '2026-06-21T00:00:00Z';

function defect(p: Partial<Defect> = {}): Defect {
  return {
    id: 'd1', aircraftId: 'ac1', source: 'PIREP', ataChapter: '24', description: 'x',
    airworthinessAffecting: true, status: 'OPEN', reportedByOid: 'u',
    occurredAtUtc: NOW, reportedAtUtc: NOW, signatureId: 's', ...p,
  };
}
function deferral(p: Partial<Deferral> = {}): Deferral {
  return {
    id: 'df1', defectId: 'd1', aircraftId: 'ac1', melItemId: 'm', governingMmelRevision: 'Rev 1',
    governingEffectiveDate: NOW, category: 'C', dayOfDiscoveryUtc: NOW, clockStartDateUtc: NOW,
    governingTimezone: 'America/New_York',
    repairIntervalUnit: 'CALENDAR_DAY', repairIntervalValue: 10, placardRequired: false,
    mProcedureRequired: false, extensionUsed: false, riiRequired: false, melReviewAcknowledged: true,
    signedByOid: 'u', signatureId: 's', status: 'ACTIVE', ...p,
  };
}

describe('serviceability §14.2', () => {
  it('GREEN: no defects, no deferrals', () => {
    expect(deriveServiceability('ac1', { ...base, defects: [], deferrals: [] }, NOW).status).toBe('GREEN');
  });
  it('RED rule 1: open airworthiness defect, no active deferral', () => {
    const r = deriveServiceability('ac1', { ...base, defects: [defect()], deferrals: [] }, NOW);
    expect(r.status).toBe('RED'); expect(r.governingRule).toBe(1); expect(r.drivingDefectId).toBe('d1');
  });
  it('RED: deferral PENDING_PLACARD (gating) leaves defect uncovered', () => {
    const r = deriveServiceability('ac1', { ...base, defects: [defect({ status: 'DEFERRED' })], deferrals: [deferral({ status: 'PENDING_PLACARD' })] }, NOW);
    expect(r.status).toBe('RED');
  });
  it('AMBER: active deferral covers the defect', () => {
    const r = deriveServiceability('ac1', { ...base, defects: [defect({ status: 'DEFERRED' })], deferrals: [deferral({ status: 'ACTIVE' })] }, NOW);
    expect(r.status).toBe('AMBER'); expect(r.drivingDeferralId).toBe('df1');
  });
  it('RED rule 2: overdue deferral on a non-affecting defect still grounds (expiry path)', () => {
    const overdue = deferral({ status: 'ACTIVE', repairDueDateUtc: '2026-06-20T00:00:00Z' });
    const r = deriveServiceability('ac1', { ...base, defects: [defect({ status: 'DEFERRED', airworthinessAffecting: false })], deferrals: [overdue] }, NOW);
    expect(r.status).toBe('RED'); expect(r.governingRule).toBe(2);
  });
  it('expired deferral covering an affecting defect surfaces as RED via rule 1 (uncovered)', () => {
    const overdue = deferral({ status: 'ACTIVE', repairDueDateUtc: '2026-06-20T00:00:00Z' });
    const r = deriveServiceability('ac1', { ...base, defects: [defect({ status: 'DEFERRED' })], deferrals: [overdue] }, NOW);
    expect(r.status).toBe('RED'); expect(r.governingRule).toBe(1);
  });
  it('null airworthinessAffecting is treated as grounding', () => {
    const r = deriveServiceability('ac1', { ...base, defects: [defect({ airworthinessAffecting: null })], deferrals: [] }, NOW);
    expect(r.status).toBe('RED');
  });
  it('GREEN: a WATCHLISTED non-airworthiness defect is serviceability-neutral', () => {
    const r = deriveServiceability('ac1', { ...base, defects: [defect({ status: 'WATCHLISTED', airworthinessAffecting: false })], deferrals: [] }, NOW);
    expect(r.status).toBe('GREEN'); expect(r.governingRule).toBe(5);
  });
  it('AMBER: a watch item never drives status past an active deferral', () => {
    const watch = defect({ id: 'd2', status: 'WATCHLISTED', airworthinessAffecting: false });
    const r = deriveServiceability('ac1', { ...base, defects: [defect({ status: 'DEFERRED' }), watch], deferrals: [deferral({ status: 'ACTIVE' })] }, NOW);
    expect(r.status).toBe('AMBER'); expect(r.drivingDeferralId).toBe('df1');
  });
  // D59 — the hole this closes: before D59 a deferral whose only requirement was an (O) procedure
  // went straight to ACTIVE, so the tail read AMBER with a mandatory crew action nobody had done.
  // Serviceability itself is UNCHANGED — PENDING_PLACARD already contributed RED. What changed is
  // that an only-(O) deferral now enters PENDING_PLACARD at all.
  it('RED: an only-(O) deferral (crew action pending) holds the aircraft RED until the gating release is signed', () => {
    const onlyO = deferral({ status: 'PENDING_PLACARD', mProcedureRequired: false, placardRequired: false, crewActionRequired: true, melOProcedure: 'Pull CB 3-J14 before each flight' });
    const r = deriveServiceability('ac1', { ...base, defects: [defect({ status: 'DEFERRED' })], deferrals: [onlyO] }, NOW);
    expect(r.status).toBe('RED');
    expect(r.activeDeferrals).toBe(0);
  });
  it('AMBER: the same deferral once released — marking alone would not have done it', () => {
    const released = deferral({ status: 'ACTIVE', crewActionRequired: true, crewActionCompliance: { id: 'cac1', byOid: 'p', byName: 'Capt Reed', atUtc: NOW, signatureId: 'sig1' }, gatingReleaseId: 'rel1' });
    const r = deriveServiceability('ac1', { ...base, defects: [defect({ status: 'DEFERRED' })], deferrals: [released] }, NOW);
    expect(r.status).toBe('AMBER');
  });
  it('RED defense-in-depth: a contract-violating WATCHLISTED row still marked airworthiness-affecting grounds', () => {
    const r = deriveServiceability('ac1', { ...base, defects: [defect({ status: 'WATCHLISTED', airworthinessAffecting: true })], deferrals: [] }, NOW);
    expect(r.status).toBe('RED'); expect(r.governingRule).toBe(1);
  });
});

describe('serviceability counts (fleet-surface projection)', () => {
  it('GREEN state has zero counts', () => {
    const r = deriveServiceability('ac1', { ...base, defects: [], deferrals: [] }, NOW);
    expect(r.openAffectingDefects).toBe(0);
    expect(r.activeDeferrals).toBe(0);
  });
  it('counts every open affecting defect, not just the driving one', () => {
    const r = deriveServiceability('ac1', { ...base, defects: [defect(), defect({ id: 'd2' })], deferrals: [] }, NOW);
    expect(r.openAffectingDefects).toBe(2);
    expect(r.activeDeferrals).toBe(0);
  });
  it('AMBER: counts both the deferred defect and its active deferral', () => {
    const r = deriveServiceability('ac1', { ...base, defects: [defect({ status: 'DEFERRED' })], deferrals: [deferral({ status: 'ACTIVE' })] }, NOW);
    expect(r.openAffectingDefects).toBe(1);
    expect(r.activeDeferrals).toBe(1);
  });
  it('an expired deferral is not counted active', () => {
    const overdue = deferral({ status: 'ACTIVE', repairDueDateUtc: '2026-06-20T00:00:00Z' });
    const r = deriveServiceability('ac1', { ...base, defects: [defect({ status: 'DEFERRED', airworthinessAffecting: false })], deferrals: [overdue] }, NOW);
    expect(r.activeDeferrals).toBe(0);
    expect(r.openAffectingDefects).toBe(0);
  });
  it('non-affecting watch items are not counted', () => {
    const r = deriveServiceability('ac1', { ...base, defects: [defect({ status: 'WATCHLISTED', airworthinessAffecting: false })], deferrals: [] }, NOW);
    expect(r.openAffectingDefects).toBe(0);
  });
});
