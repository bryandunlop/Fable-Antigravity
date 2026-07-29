import { describe, it, expect } from 'vitest';
import {
  crewActionRequiredForMelItem, resolveDeferralCrewAction, entersPendingPlacard,
  crewActionPending, crewActionSatisfied, canMarkCrewAction, markCrewActionComplied,
  crewActionPayloadExtra,
} from './crewAction';
import { currentRows, latestFor } from './supersede';
import type { Deferral, MelItem, Personnel } from '../types';

const maint = (p: Partial<Personnel> = {}): Personnel => ({ oid: 'm', displayName: 'Tom Parker', role: 'MAINTENANCE', riiAuthorized: false, riiAuthorizedAta: [], active: true, ...p });
const pilot = (p: Partial<Personnel> = {}): Personnel => ({ oid: 'p', displayName: 'Capt Reed', role: 'PILOT', riiAuthorized: false, riiAuthorizedAta: [], active: true, ...p });

const mel = (p: Partial<MelItem> = {}): MelItem => ({
  id: 'm1', aircraftType: 'G500', mmelRevision: 'Rev 1', effectiveDate: '2025-09-03',
  approvalState: 'APPROVED', ataReference: '24', itemNumber: '24-01', subItemNumber: '24-01-01',
  title: 'x', category: 'C', numberInstalled: null, numberRequired: null, ...p,
});

const NOW = '2026-06-21T00:00:00Z';
const deferral = (p: Partial<Deferral> = {}): Deferral => ({
  id: 'df1', defectId: 'd1', aircraftId: 'ac1', melItemId: 'm1', governingMmelRevision: 'Rev 1',
  governingEffectiveDate: '2025-09-03', category: 'C', dayOfDiscoveryUtc: NOW, clockStartDateUtc: NOW,
  governingTimezone: 'America/New_York', repairIntervalUnit: 'CALENDAR_DAY', repairIntervalValue: 10,
  placardRequired: false, mProcedureRequired: false, extensionUsed: false, riiRequired: false,
  melReviewAcknowledged: true, signedByOid: 'u', signatureId: 's', status: 'PENDING_PLACARD', ...p,
});

describe('D59 — crewActionRequired provenance: authored on the MEL item, inherited by the deferral', () => {
  it('takes the flag the DOM / Chief Inspector authored on the MEL item', () => {
    expect(crewActionRequiredForMelItem(mel({ crewActionRequired: true, oProcedure: undefined }))).toBe(true);
  });

  it('an authored FALSE wins over the presence of an (O) procedure — the DOM said no crew action', () => {
    expect(crewActionRequiredForMelItem(mel({ crewActionRequired: false, oProcedure: 'Pull CB 3-J14' }))).toBe(false);
  });

  it('legacy/seeded items with no authored flag fall back to Boolean(oProcedure) — conservative in the gating direction', () => {
    expect(crewActionRequiredForMelItem(mel({ oProcedure: 'Pull CB 3-J14 before each flight' }))).toBe(true);
    expect(crewActionRequiredForMelItem(mel({}))).toBe(false);
    expect(crewActionRequiredForMelItem(mel({ oProcedure: '   ' }))).toBe(false);
  });
});

describe('D59 — line maintenance may ADD a crew action, never remove an inherited one', () => {
  it('adds a crew action on a deferral whose MEL item lacks the flag', () => {
    expect(resolveDeferralCrewAction(false, true)).toEqual({ crewActionRequired: true, overrideRejected: false });
  });

  it('leaves an un-flagged item un-flagged when maintenance does not add one', () => {
    expect(resolveDeferralCrewAction(false, false)).toEqual({ crewActionRequired: false, overrideRejected: false });
  });

  it('REJECTS an attempt to clear an inherited flag — the value stays true', () => {
    expect(resolveDeferralCrewAction(true, false)).toEqual({ crewActionRequired: true, overrideRejected: true });
  });

  it('re-asserting an inherited flag is not a rejected override', () => {
    expect(resolveDeferralCrewAction(true, true)).toEqual({ crewActionRequired: true, overrideRejected: false });
  });
});

describe('D59 — no new status: an only-(O) deferral now enters PENDING_PLACARD', () => {
  it('a crew action alone gates the deferral', () => {
    expect(entersPendingPlacard({ mProcedureRequired: false, placardRequired: false, crewActionRequired: true })).toBe(true);
  });
  it('(M) or placard still gate as before', () => {
    expect(entersPendingPlacard({ mProcedureRequired: true, placardRequired: false })).toBe(true);
    expect(entersPendingPlacard({ mProcedureRequired: false, placardRequired: true })).toBe(true);
  });
  it('nothing pending → straight to ACTIVE', () => {
    expect(entersPendingPlacard({ mProcedureRequired: false, placardRequired: false, crewActionRequired: false })).toBe(false);
    expect(entersPendingPlacard({ mProcedureRequired: false, placardRequired: false })).toBe(false);
  });
});

describe('D59 — the complied mark is evidence, not authority', () => {
  it('pending while the action is required and unmarked', () => {
    const d = deferral({ crewActionRequired: true });
    expect(crewActionPending(d)).toBe(true);
    expect(crewActionSatisfied(d)).toBe(false);
  });

  it('satisfied once a compliance record exists', () => {
    const d = deferral({ crewActionRequired: true, crewActionCompliance: { id: 'cac1', byOid: 'p', byName: 'Capt Reed', atUtc: NOW, signatureId: 'sig1' } });
    expect(crewActionPending(d)).toBe(false);
    expect(crewActionSatisfied(d)).toBe(true);
  });

  it('a deferral carrying no crew action is trivially satisfied', () => {
    expect(crewActionSatisfied(deferral())).toBe(true);
  });

  it('BOTH a pilot and a maintenance user may mark it — on the road the pilots do it, at base maintenance often does', () => {
    const d = deferral({ crewActionRequired: true });
    expect(canMarkCrewAction(pilot(), d)).toBe(true);
    expect(canMarkCrewAction(maint(), d)).toBe(true);
  });

  it('nobody marks a deferral that carries no crew action, or one already marked', () => {
    expect(canMarkCrewAction(pilot(), deferral())).toBe(false);
    expect(canMarkCrewAction(maint(), deferral({ crewActionRequired: true, crewActionCompliance: { id: 'cac1', byOid: 'p', byName: 'P', atUtc: NOW, signatureId: 'sig1' } }))).toBe(false);
  });

  it('marking FLIPS NO STATE — the superseding row is still PENDING_PLACARD (D16/D17)', () => {
    const before = deferral({ crewActionRequired: true });
    const after = markCrewActionComplied(before, {
      rowId: 'df2', complianceId: 'cac1', byOid: 'p', byName: 'Capt Reed', atUtc: NOW, signatureId: 'sig1',
    });
    expect(after.status).toBe('PENDING_PLACARD');
    expect(after.gatingReleaseId).toBeUndefined();
    expect(after.crewActionRequired).toBe(true);
    expect(after.crewActionCompliance?.byName).toBe('Capt Reed');
  });

  it('marking is a SUPERSEDING INSERT, never an edit — the original row is untouched and retained', () => {
    const before = deferral({ crewActionRequired: true });
    const after = markCrewActionComplied(before, {
      rowId: 'df2', complianceId: 'cac1', byOid: 'p', byName: 'Capt Reed', atUtc: NOW, signatureId: 'sig1',
    });
    expect(after.id).toBe('df2');
    expect(after.supersedesId).toBe('df1');
    expect(before.crewActionCompliance).toBeUndefined();
    expect(currentRows([before, after]).map(r => r.id)).toEqual(['df2']);
  });

  it('freezes the marker name on the record (TL-16) — no live Personnel join', () => {
    const after = markCrewActionComplied(deferral({ crewActionRequired: true }), {
      rowId: 'df2', complianceId: 'cac1', byOid: 'p', byName: 'Capt Reed', atUtc: NOW, signatureId: 'sig1',
    });
    expect(after.crewActionCompliance).toMatchObject({ byOid: 'p', byName: 'Capt Reed' });
  });

  it('a mistaken mark is corrected by a superseding insert that preserves the chain', () => {
    const original = deferral({ crewActionRequired: true });
    const marked = markCrewActionComplied(original, {
      rowId: 'df2', complianceId: 'cac1', byOid: 'p', byName: 'Capt Reed', atUtc: NOW, signatureId: 'sig1', note: 'CB pulled',
    });
    const corrected = markCrewActionComplied(marked, {
      rowId: 'df3', complianceId: 'cac2', byOid: 'm', byName: 'Tom Parker', atUtc: '2026-06-21T01:00:00Z',
      signatureId: 'sig2', note: 'Wrong CB recorded — corrected', supersedesComplianceId: 'cac1',
    });
    const rows = [original, marked, corrected];
    expect(currentRows(rows).map(r => r.id)).toEqual(['df3']);
    expect(latestFor(rows, 'df1')?.id).toBe('df3');
    expect(corrected.crewActionCompliance?.supersedesId).toBe('cac1');
    // the superseded mark is retained unaltered
    expect(marked.crewActionCompliance?.note).toBe('CB pulled');
  });

  it('folds photo digests into the signed payload EXACTLY as the defect report form does (D18)', () => {
    const att = (i: number) => ({ id: `att${i}`, filename: `p${i}.jpg`, contentType: 'image/jpeg', bytes: i, sha256: String(i).repeat(64), uri: 'data:', capturedAtUtc: NOW });
    const attachments = [att(1), att(2)];
    // `ReportDefectDialog`'s expression, written out so a divergence fails here rather than silently
    // producing a differently-hashed payload on one of the two surfaces.
    expect(crewActionPayloadExtra(attachments)).toBe(attachments.map(a => a.sha256).join(','));
    expect(crewActionPayloadExtra([])).toBeUndefined();
  });

  it('carries the optional photo attachments onto the record so their digests can be signed (D18)', () => {
    const att = { id: 'att1', filename: 'cb.jpg', contentType: 'image/jpeg', bytes: 1, sha256: 'a'.repeat(64), uri: 'data:', capturedAtUtc: NOW };
    const after = markCrewActionComplied(deferral({ crewActionRequired: true }), {
      rowId: 'df2', complianceId: 'cac1', byOid: 'p', byName: 'P', atUtc: NOW, signatureId: 'sig1', attachments: [att],
    });
    expect(after.crewActionCompliance?.attachments).toEqual([att]);
  });
});
