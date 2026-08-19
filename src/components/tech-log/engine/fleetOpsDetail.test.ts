import { describe, it, expect } from 'vitest';
import { summarizeFleetOpsDetail } from './fleetOpsDetail';
import type { Aircraft, Defect, Deferral } from '../types';

const ac: Aircraft = {
  id: 'ac1', tailNumber: 'N5PG', type: 'G500', serialNumber: '72157', status: 'ACTIVE',
  isProvisional: false, homeBase: 'KLUK', airframeTotalHours: 1200, airframeTotalCycles: 800,
};
const base = { aircraft: [ac] };
const NOW = '2026-06-21T00:00:00Z';

function defect(p: Partial<Defect> = {}): Defect {
  return {
    id: 'd1', aircraftId: 'ac1', source: 'PIREP', ataChapter: '79', description: 'Chip detector indication',
    airworthinessAffecting: true, status: 'OPEN', reportedByOid: 'u',
    occurredAtUtc: NOW, reportedAtUtc: NOW, signatureId: 's', ...p,
  };
}
function deferral(p: Partial<Deferral> = {}): Deferral {
  return {
    id: 'df1', defectId: 'd1', aircraftId: 'ac1', melItemId: 'm', governingMmelRevision: 'Rev 1',
    governingEffectiveDate: NOW, category: 'C', dayOfDiscoveryUtc: NOW, clockStartDateUtc: NOW,
    governingTimezone: 'America/New_York', melTitle: 'Galley chiller',
    repairIntervalUnit: 'CALENDAR_DAY', repairIntervalValue: 10, placardRequired: false,
    mProcedureRequired: false, extensionUsed: false, riiRequired: false, melReviewAcknowledged: true,
    signedByOid: 'u', signatureId: 's', status: 'ACTIVE', ...p,
  };
}

describe('summarizeFleetOpsDetail', () => {
  it('GREEN tail: no headline, no deferral clock', () => {
    const [row] = summarizeFleetOpsDetail({ ...base, defects: [], deferrals: [] }, NOW);
    expect(row.status).toBe('GREEN');
    expect(row.headline).toBeNull();
    expect(row.deferralClock).toBeNull();
  });

  it('RED tail: headline is the driving defect description', () => {
    const [row] = summarizeFleetOpsDetail({ ...base, defects: [defect()], deferrals: [] }, NOW);
    expect(row.status).toBe('RED');
    expect(row.headline).toBe('Chip detector indication');
    expect(row.ataChapter).toBe('79');
    expect(row.deferralClock).toBeNull();
  });

  it('AMBER tail: headline is the MEL title and the clock reads days remaining', () => {
    const due = '2026-06-27T03:59:00Z'; // 2359 ET on 26 Jun — 6 full days past NOW
    const [row] = summarizeFleetOpsDetail(
      { ...base, defects: [defect({ status: 'DEFERRED' })], deferrals: [deferral({ repairDueDateUtc: due })] },
      NOW,
    );
    expect(row.status).toBe('AMBER');
    expect(row.headline).toBe('Galley chiller');
    expect(row.deferralClock).not.toBeNull();
    expect(row.deferralClock!.category).toBe('C');
    expect(row.deferralClock!.governingTimezone).toBe('America/New_York');
    expect(row.deferralClock!.daysRemaining).toBe(6);
    expect(row.deferralClock!.intervalDays).toBe(10);
  });

  it('AMBER with two active deferrals: the clock is the soonest-due one', () => {
    const d2 = defect({ id: 'd2', status: 'DEFERRED', description: 'Other item' });
    const later = deferral({ id: 'df2', defectId: 'd2', repairDueDateUtc: '2026-07-10T00:00:00Z', melTitle: 'Later item' });
    const sooner = deferral({ repairDueDateUtc: '2026-06-24T00:00:00Z' });
    const [row] = summarizeFleetOpsDetail(
      { ...base, defects: [defect({ status: 'DEFERRED' }), d2], deferrals: [sooner, later] },
      NOW,
    );
    expect(row.status).toBe('AMBER');
    expect(row.headline).toBe('Galley chiller');
    expect(row.deferralClock!.daysRemaining).toBe(3);
  });

  it('carries the base airworthiness fields (superset of FleetAirworthinessEntry)', () => {
    const [row] = summarizeFleetOpsDetail({ ...base, defects: [defect()], deferrals: [] }, NOW);
    expect(row.tailNumber).toBe('N5PG');
    expect(row.type).toBe('G500');
    expect(row.isProvisional).toBe(false);
    expect(row.openAffectingDefects).toBe(1);
    expect(row.activeDeferrals).toBe(0);
  });
});
