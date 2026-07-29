import { describe, it, expect } from 'vitest';
import { canDeferDefect, canSignPlacardDischarge, canDischargeGating, resolveGatingSignability } from './disposition';
import { markCrewActionComplied } from './crewAction';
import type { Personnel, MelItem, Deferral } from '../types';

const maint = (p: Partial<Personnel> = {}): Personnel => ({ oid: 'm', displayName: 'M', role: 'MAINTENANCE', riiAuthorized: false, riiAuthorizedAta: [], active: true, ...p });
const pilot = (p: Partial<Personnel> = {}): Personnel => ({ oid: 'p', displayName: 'P', role: 'PILOT', riiAuthorized: false, riiAuthorizedAta: [], active: true, ...p });
const mel = (p: Partial<MelItem> = {}): MelItem => ({ id: 'm1', aircraftType: 'G500', mmelRevision: 'r', effectiveDate: 'd', approvalState: 'APPROVED', ataReference: '24', itemNumber: '24-01', subItemNumber: '24-01-01', title: 'x', category: 'C', numberInstalled: null, numberRequired: null, ...p });
const deferral = (p: Partial<Deferral> = {}): Deferral => ({ id: 'df', defectId: 'd', aircraftId: 'ac', melItemId: 'm1', governingMmelRevision: 'r', governingEffectiveDate: 'd', category: 'C', dayOfDiscoveryUtc: 'd', clockStartDateUtc: 'd', governingTimezone: 'America/New_York', repairIntervalUnit: 'CALENDAR_DAY', repairIntervalValue: 10, placardRequired: false, mProcedureRequired: false, extensionUsed: false, riiRequired: false, melReviewAcknowledged: true, signedByOid: 'u', signatureId: 's', status: 'PENDING_PLACARD', ...p });

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

// ── D59 — the one signability rule the gating-discharge panel asks at sign time ──
describe('resolveGatingSignability', () => {
  const NOW = '2026-02-05T00:00:00Z';
  const AIRFRAME = { hours: 0, cycles: 0 };
  const ask = (deferralId: string, deferrals: Deferral[], person = maint()) =>
    resolveGatingSignability({ deferralId, deferrals, person, asOfUtc: NOW, airframeNow: AIRFRAME });

  it('allows a maintenance discharge on a still-pending, unexpired, crew-action-free deferral', () => {
    const d = deferral({ repairDueDateUtc: '2026-02-20T00:00:00.000Z' });
    const r = ask('df', [d]);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.deferral.id).toBe('df');
  });

  it('rejects when the deferral row cannot be resolved at all', () => {
    const r = ask('df-gone', []);
    expect(r).toMatchObject({ ok: false, code: 'NOT_FOUND' });
  });

  // Workflow Logic Findings §1a — the live double-discharge race.
  it('RACE: rejects a second discharge once another actor has already flipped the gate to ACTIVE', () => {
    const original = deferral({ repairDueDateUtc: '2026-02-20T00:00:00.000Z' });
    // actor A signed first: a superseding row, ACTIVE, carrying the release.
    const discharged: Deferral = { ...original, id: 'df-2', supersedesId: 'df', status: 'ACTIVE', gatingReleaseId: 'rel-1' };
    // actor B is still holding the STALE `original` row on screen and hits Sign.
    const r = ask('df', [original, discharged]);
    expect(r).toMatchObject({ ok: false, code: 'NOT_PENDING' });
    if (!r.ok) expect(r.reason).toMatch(/no longer/i);
  });

  it('RACE: the stale row itself is not what is judged — the CHAIN HEAD is', () => {
    const original = deferral({ repairDueDateUtc: '2026-02-20T00:00:00.000Z' });
    const cleared: Deferral = { ...original, id: 'df-2', supersedesId: 'df', status: 'CLEARED' };
    expect(ask('df', [original, cleared])).toMatchObject({ ok: false, code: 'NOT_PENDING' });
  });

  it('still refuses to resurrect an expired deferral (§15.1 terminal)', () => {
    const d = deferral({ repairDueDateUtc: '2026-02-01T00:00:00.000Z' });
    expect(ask('df', [d])).toMatchObject({ ok: false, code: 'EXPIRED' });
  });

  it('D59 HARD GATE: blocks the release while a required crew action is unmarked', () => {
    const d = deferral({ repairDueDateUtc: '2026-02-20T00:00:00.000Z', crewActionRequired: true, melOProcedure: 'Pull CB 3-J14 before each flight' });
    const r = ask('df', [d]);
    expect(r).toMatchObject({ ok: false, code: 'CREW_ACTION_PENDING' });
  });

  it('D59: the gate opens once the crew action is marked complied', () => {
    const d = deferral({ repairDueDateUtc: '2026-02-20T00:00:00.000Z', crewActionRequired: true, melOProcedure: 'Pull CB 3-J14' });
    const marked = markCrewActionComplied(d, { rowId: 'df-2', complianceId: 'cac1', byOid: 'p', byName: 'Capt Reed', atUtc: NOW, signatureId: 'sig1' });
    const r = ask('df', [d, marked]);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.deferral.id).toBe('df-2');
  });

  it('D59: the SAME PERSON may mark complied and then sign the release — this is not an RII inspection', () => {
    const tech = maint({ oid: 'USR008', displayName: 'Tom Parker', apCertificateNumber: 'A&P 3456789' });
    const d = deferral({ repairDueDateUtc: '2026-02-20T00:00:00.000Z', crewActionRequired: true, melOProcedure: 'Pull CB 3-J14' });
    const marked = markCrewActionComplied(d, { rowId: 'df-2', complianceId: 'cac1', byOid: tech.oid, byName: tech.displayName, atUtc: NOW, signatureId: 'sig1' });
    const r = resolveGatingSignability({ deferralId: 'df', deferrals: [d, marked], person: tech, asOfUtc: NOW, airframeNow: AIRFRAME });
    expect(r.ok).toBe(true);
  });

  it('keeps the existing role gate: unauthorized crew cannot discharge', () => {
    const d = deferral({ repairDueDateUtc: '2026-02-20T00:00:00.000Z', placardRequired: true });
    expect(ask('df', [d], pilot())).toMatchObject({ ok: false, code: 'NOT_AUTHORIZED' });
    expect(ask('df', [d], pilot({ placardAuthorized: true })).ok).toBe(true);
  });

  it('a crew placard attestation is gated by an outstanding crew action too', () => {
    const d = deferral({ repairDueDateUtc: '2026-02-20T00:00:00.000Z', placardRequired: true, crewActionRequired: true });
    expect(ask('df', [d], pilot({ placardAuthorized: true }))).toMatchObject({ ok: false, code: 'CREW_ACTION_PENDING' });
  });
});
