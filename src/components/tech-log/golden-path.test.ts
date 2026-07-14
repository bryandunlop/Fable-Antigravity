import { describe, it, expect } from 'vitest';
import { getDefaultState } from './mockData/scenarios';
import { deriveServiceability } from './engine/serviceability';
import { computeClockStart, computeRepairDue } from './engine/pl25';
import type { Defect, Deferral } from './types';

// Proves the hero demo flow end-to-end through the engine + lifecycle transitions.
describe('golden path: report -> defer (M-gated) -> gating release', () => {
  const base = getDefaultState();
  const ac = base.aircraft.find(a => a.tailNumber === 'N5PG')!; // seeded GREEN
  const now = '2026-06-21T12:00:00Z';
  const mel = base.melItems.find(m => m.aircraftType === ac.type && m.approvalState === 'APPROVED' && m.mProcedure)!;
  const cs = computeClockStart(now);
  const due = computeRepairDue(mel.category, cs, { repairIntervalUnit: 'CALENDAR_DAY', repairIntervalValue: 10 }, { hours: ac.airframeTotalHours, cycles: ac.airframeTotalCycles });

  const openDefect: Defect = { id: 'd1', aircraftId: ac.id, source: 'PIREP', ataChapter: mel.ataReference, description: 'x', severity: 'HIGH', airworthinessAffecting: null, status: 'OPEN', reportedByOid: 'USR001', reportedAtUtc: now, signatureId: 's1' };
  const deferredDefect: Defect = { ...openDefect, id: 'd1b', status: 'DEFERRED', supersedesId: 'd1' };
  const deferralPP: Deferral = { id: 'df1', defectId: 'd1b', aircraftId: ac.id, melItemId: mel.id, governingMmelRevision: mel.mmelRevision, governingEffectiveDate: mel.effectiveDate, category: mel.category, dayOfDiscoveryUtc: now, clockStartDateUtc: cs, governingTimezone: 'America/New_York', repairDueDateUtc: due.repairDueDateUtc, repairIntervalUnit: 'CALENDAR_DAY', repairIntervalValue: 10, placardRequired: false, mProcedureRequired: true, extensionUsed: false, riiRequired: false, melReviewAcknowledged: true, signedByOid: 'USR002', signatureId: 's2', status: 'PENDING_PLACARD' };
  const deferralActive: Deferral = { ...deferralPP, id: 'df1b', supersedesId: 'df1', status: 'ACTIVE', gatingReleaseId: 'rel1' };

  it('1) N5PG starts GREEN', () => {
    expect(deriveServiceability(ac.id, base, now).status).toBe('GREEN');
  });
  it('2) pilot reports open defect -> RED', () => {
    const s = { ...base, defects: [...base.defects, openDefect] };
    expect(deriveServiceability(ac.id, s, now).status).toBe('RED');
  });
  it('3) defer under an (M) item -> PENDING_PLACARD -> still RED', () => {
    const s = { ...base, defects: [...base.defects, openDefect, deferredDefect], deferrals: [...base.deferrals, deferralPP] };
    expect(deriveServiceability(ac.id, s, now).status).toBe('RED');
  });
  it('4) sign the gating (M)/placard release -> ACTIVE -> AMBER', () => {
    const s = { ...base, defects: [...base.defects, openDefect, deferredDefect], deferrals: [...base.deferrals, deferralPP, deferralActive] };
    expect(deriveServiceability(ac.id, s, now).status).toBe('AMBER');
  });
  it('the chosen MEL item really carries an (M) procedure (gating precondition)', () => {
    expect(mel.mProcedure).toBeTruthy();
  });
});
