import { describe, it, expect } from 'vitest';
import { planFixFromDeferral } from './fixFromDeferral';
import type { Deferral, Defect, WorkCard } from '../types';

const defect = (over: Partial<Defect> = {}): Defect => ({
  id: 'def-1', aircraftId: 'ac-1', ataChapter: '24', description: 'Gen 2 offline',
  status: 'DEFERRED', severity: 'HIGH', source: 'PIREP', reportedByOid: 'U1',
  reportedAtUtc: 'now', signatureId: 'sig-d',
  ...over,
} as Defect);

const deferral = (over: Partial<Deferral> = {}): Deferral => ({
  id: 'df-1', defectId: 'def-1', aircraftId: 'ac-1', melItemId: 'mel-1',
  governingMmelRevision: 'r1', governingEffectiveDate: 'now', category: 'C',
  dayOfDiscoveryUtc: 'now', clockStartDateUtc: 'now', governingTimezone: 'America/New_York',
  repairIntervalUnit: 'CALENDAR_DAY', repairIntervalValue: 10,
  placardRequired: false, mProcedureRequired: false, extensionUsed: false,
  riiRequired: false, melReviewAcknowledged: true, signedByOid: 'U1',
  signatureId: 'sig', status: 'ACTIVE',
  ...over,
} as Deferral);

const card = (over: Partial<WorkCard> = {}): WorkCard => ({
  id: 'wc-1', cardNumber: 'WC-0001', aircraftId: 'ac-1', title: 't', ataChapter: '24',
  description: 'd', steps: [], status: 'OPEN', source: 'MANUAL', headerStatusCode: 1,
  scheduled: false, riiRequired: false, createdAtUtc: 'now',
  ...over,
} as WorkCard);

const IDS = { cardId: 'wc-new', stepId: 'st-new' };

describe('planFixFromDeferral', () => {
  it("resolves the deferral's defect and plans a card linked to both defect and deferral", () => {
    const plan = planFixFromDeferral(deferral(), [defect()], [], IDS, 'now');
    expect(plan.kind).toBe('CREATE');
    if (plan.kind !== 'CREATE') throw new Error('expected CREATE');
    expect(plan.card.linkedDefectId).toBe('def-1');
    expect(plan.card.linkedDeferralId).toBe('df-1');
    expect(plan.card.id).toBe('wc-new');
    expect(plan.card.status).toBe('OPEN');
  });

  it('opens the existing open card instead of creating a duplicate', () => {
    const existing = card({ id: 'wc-existing', linkedDefectId: 'def-1', status: 'IN_WORK' });
    const plan = planFixFromDeferral(deferral(), [defect()], [existing], IDS, 'now');
    expect(plan).toEqual({ kind: 'OPEN_EXISTING', cardId: 'wc-existing' });
  });

  it('a COMPLETED card for the same defect does not block raising a fresh one', () => {
    const done = card({ id: 'wc-done', linkedDefectId: 'def-1', status: 'COMPLETED' });
    const plan = planFixFromDeferral(deferral(), [defect()], [done], IDS, 'now');
    expect(plan.kind).toBe('CREATE');
  });

  it("returns NO_DEFECT when the deferral's defect is not among the current defects", () => {
    const plan = planFixFromDeferral(deferral({ defectId: 'missing' }), [defect()], [], IDS, 'now');
    expect(plan).toEqual({ kind: 'NO_DEFECT' });
  });
});
