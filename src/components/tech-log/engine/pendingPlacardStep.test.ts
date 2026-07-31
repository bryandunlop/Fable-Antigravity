import { describe, it, expect } from 'vitest';
import { pendingPlacardStep } from './pendingPlacardStep';
import type { Deferral } from '../types';

/**
 * LG-170 — a signed deferral in PENDING_PLACARD leaves the aircraft RED. The interface used to say so
 * by printing the enum. These pin that it now says what to DO, that the words come only from the
 * frozen row, and that the grounding claim is never softened by the friendlier copy.
 */
const base: Deferral = {
  id: 'd1', defectId: 'x1', aircraftId: 'a1', melItemId: 'm1',
  governingMmelRevision: 'Rev 1', governingEffectiveDate: '2026-01-01',
  melSubItemNumber: '32-41-01', melTitle: 'Gear door',
  category: 'C',
  dayOfDiscoveryUtc: '2026-07-25T12:00:00.000Z',
  clockStartDateUtc: '2026-07-26T04:00:00.000Z',
  governingTimezone: 'America/New_York',
  repairDueDateUtc: '2026-08-05T04:00:00.000Z',
  repairIntervalUnit: 'CALENDAR_DAY', repairIntervalValue: 10,
  placardRequired: true, mProcedureRequired: false, placardInstalled: false,
  placardLocation: 'LH MLG bay',
  extensionUsed: false, riiRequired: false, melReviewAcknowledged: true,
  signedByOid: 'o1', signatureId: 's1',
  status: 'PENDING_PLACARD',
};

describe('pendingPlacardStep (LG-170)', () => {
  it('says nothing for a deferral that is not pending', () => {
    expect(pendingPlacardStep({ ...base, status: 'ACTIVE' })).toBeNull();
    expect(pendingPlacardStep({ ...base, status: 'CLEARED' })).toBeNull();
  });

  it('names the placard and where it goes, from the frozen row', () => {
    const step = pendingPlacardStep(base)!;
    expect(step.action).toMatch(/install the placard/i);
    expect(step.where).toBe('LH MLG bay');
  });

  it('omits the location rather than inventing one when the signed row did not record it', () => {
    const step = pendingPlacardStep({ ...base, placardLocation: undefined })!;
    expect(step.where).toBeUndefined();
    expect(step.action).toMatch(/install the placard/i);
  });

  it('names both jobs when the item carries a placard and an (M) procedure', () => {
    const step = pendingPlacardStep({ ...base, mProcedureRequired: true })!;
    expect(step.action).toMatch(/placard/i);
    expect(step.action).toMatch(/\(M\) procedure/i);
  });

  it('names only the (M) procedure when the placard is already installed', () => {
    const step = pendingPlacardStep({ ...base, placardInstalled: true, mProcedureRequired: true })!;
    expect(step.action).not.toMatch(/install the placard/i);
    expect(step.action).toMatch(/\(M\) procedure/i);
  });

  it('puts the D59 crew action first when it is outstanding — it gates the release', () => {
    const step = pendingPlacardStep({ ...base, crewActionRequired: true })!;
    expect(step.action).toMatch(/crew action/i);
    // Sending a technician to the placard first would be the wrong job.
    expect(step.action).not.toMatch(/install the placard/i);
  });

  it('moves past the crew action once it is complied', () => {
    const step = pendingPlacardStep({
      ...base,
      crewActionRequired: true,
      crewActionCompliance: {
        id: 'ca1', byOid: 'o9', byName: 'A. Mercer', atUtc: '2026-07-27T10:00:00.000Z',
        signatureId: 'sig-ca1',
      },
    })!;
    expect(step.action).toMatch(/install the placard/i);
  });

  it('still names an act when nothing specific is outstanding, never the enum', () => {
    const step = pendingPlacardStep({ ...base, placardRequired: false, mProcedureRequired: false })!;
    expect(step.action).toMatch(/sign the/i);
    expect(step.action).not.toMatch(/PENDING_PLACARD/);
  });

  it('always reports the aircraft as still grounded', () => {
    for (const d of [
      base,
      { ...base, mProcedureRequired: true },
      { ...base, crewActionRequired: true },
      { ...base, placardRequired: false },
    ] as Deferral[]) {
      expect(pendingPlacardStep(d)!.stillGrounded).toBe(true);
    }
  });
});
