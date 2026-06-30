import { describe, it, expect } from 'vitest';
import { canDeferDefect, canSignPlacardDischarge, canDischargeGating } from './disposition';
import type { Personnel, MelItem, Deferral } from '../types';

const maint = (p: Partial<Personnel> = {}): Personnel => ({ oid: 'm', displayName: 'M', role: 'MAINTENANCE', riiAuthorized: false, riiAuthorizedAta: [], active: true, ...p });
const pilot = (p: Partial<Personnel> = {}): Personnel => ({ oid: 'p', displayName: 'P', role: 'PILOT', riiAuthorized: false, riiAuthorizedAta: [], active: true, ...p });
const mel = (p: Partial<MelItem> = {}): MelItem => ({ id: 'm1', aircraftType: 'G500', mmelRevision: 'r', effectiveDate: 'd', approvalState: 'APPROVED', ataReference: '24', itemNumber: '24-01', subItemNumber: '24-01-01', title: 'x', category: 'C', numberInstalled: null, numberRequired: null, ...p });
const deferral = (p: Partial<Deferral> = {}): Deferral => ({ id: 'df', defectId: 'd', aircraftId: 'ac', melItemId: 'm1', governingMmelRevision: 'r', governingEffectiveDate: 'd', category: 'C', dayOfDiscoveryUtc: 'd', clockStartDateUtc: 'd', repairIntervalUnit: 'CALENDAR_DAY', repairIntervalValue: 10, placardRequired: false, mProcedureRequired: false, extensionUsed: false, riiRequired: false, melReviewAcknowledged: true, signedByOid: 'u', signatureId: 's', status: 'PENDING_PLACARD', ...p });

describe('canDeferDefect', () => {
  it('maintenance can defer any item', () => { expect(canDeferDefect(maint(), mel({ flightCrewDeferral: false }))).toBe(true); });
  it('authorized crew can defer an FC-deferrable item', () => { expect(canDeferDefect(pilot({ crewDeferralAuthorized: true }), mel({ flightCrewDeferral: true }))).toBe(true); });
  it('authorized crew cannot defer a non-FC-deferrable item', () => { expect(canDeferDefect(pilot({ crewDeferralAuthorized: true }), mel({ flightCrewDeferral: false }))).toBe(false); });
  it('unauthorized crew cannot defer even an FC-deferrable item', () => { expect(canDeferDefect(pilot(), mel({ flightCrewDeferral: true }))).toBe(false); });
});

describe('canSignPlacardDischarge', () => {
  it('maintenance can sign any discharge', () => { expect(canSignPlacardDischarge(maint(), deferral({ mProcedureRequired: true }))).toBe(true); });
  it('authorized crew can sign a placard-only discharge', () => { expect(canSignPlacardDischarge(pilot({ placardAuthorized: true }), deferral({ placardRequired: true, mProcedureRequired: false }))).toBe(true); });
  it('authorized crew cannot sign when an (M) procedure is required', () => { expect(canSignPlacardDischarge(pilot({ placardAuthorized: true }), deferral({ placardRequired: true, mProcedureRequired: true }))).toBe(false); });
  it('unauthorized crew cannot sign a placard discharge', () => { expect(canSignPlacardDischarge(pilot(), deferral({ placardRequired: true, mProcedureRequired: false }))).toBe(false); });
});

describe('canDischargeGating', () => {
  it('allows the discharge before the repair-due boundary', () => {
    const d = deferral({ repairDueDateUtc: '2026-02-06T00:00:00.000Z' });
    expect(canDischargeGating(d, '2026-02-05T23:00:00Z', { hours: 0, cycles: 0 })).toBe(true);
  });

  it('blocks a late discharge once the deferral has already expired (calendar)', () => {
    const d = deferral({ repairDueDateUtc: '2026-02-06T00:00:00.000Z' });
    expect(canDischargeGating(d, '2026-02-10T00:00:00Z', { hours: 0, cycles: 0 })).toBe(false);
  });

  it('blocks a late discharge once usage has crossed the threshold', () => {
    const d = deferral({ repairIntervalUnit: 'CYCLE', repairDueDateUtc: undefined, usageDueThreshold: 850 });
    expect(canDischargeGating(d, '2026-02-10T00:00:00Z', { hours: 0, cycles: 850 })).toBe(false);
  });
});
