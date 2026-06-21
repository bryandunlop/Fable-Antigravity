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
    severity: 'HIGH', airworthinessAffecting: true, status: 'OPEN', reportedByOid: 'u',
    reportedAtUtc: NOW, signatureId: 's', ...p,
  };
}
function deferral(p: Partial<Deferral> = {}): Deferral {
  return {
    id: 'df1', defectId: 'd1', aircraftId: 'ac1', melItemId: 'm', governingMmelRevision: 'Rev 1',
    governingEffectiveDate: NOW, category: 'C', dayOfDiscoveryUtc: NOW, clockStartDateUtc: NOW,
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
});
