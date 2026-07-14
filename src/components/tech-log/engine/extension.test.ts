import { describe, it, expect } from 'vitest';
import { validateExtension, buildExtension } from './extension';
import type { Deferral, Personnel } from '../types';

const signer: Personnel = { oid: 'm1', displayName: 'Dana Wolfe', role: 'MAINTENANCE', apCertificateNumber: 'AP3312890', riiAuthorized: false, riiAuthorizedAta: [], active: true };
const peer: Personnel = { oid: 'm2', displayName: 'Lee Park', role: 'MAINTENANCE', riiAuthorized: false, riiAuthorizedAta: [], active: true };
const dom: Personnel = { oid: 'dom1', displayName: 'Mike Ross', role: 'MAINTENANCE', isSupervisor: true, riiAuthorized: false, riiAuthorizedAta: [], active: true };

const JUST = 'Part on order from GAC Savannah, ETA Friday.';

const base: Deferral = {
  id: 'df-1', defectId: 'def-1', aircraftId: 'ac-1', melItemId: 'mel-1',
  governingMmelRevision: 'R5', governingEffectiveDate: '2026-01-01',
  category: 'C', dayOfDiscoveryUtc: '2026-01-26T10:00:00Z', clockStartDateUtc: '2026-01-27T00:00:00.000Z',
  // Fixture uses round UTC-midnight values, so it is governed UTC — keeps these assertions about the
  // extension doubling/supersede rails, not DST (DST math is covered in pl25.test.ts).
  governingTimezone: 'UTC',
  repairDueDateUtc: '2026-02-06T00:00:00.000Z', repairIntervalUnit: 'CALENDAR_DAY', repairIntervalValue: 10,
  placardRequired: false, mProcedureRequired: false, extensionUsed: false, riiRequired: false,
  melReviewAcknowledged: true, signedByOid: 'm1', signatureId: 'sig-1', status: 'ACTIVE',
};

describe('deferral extension — validation (PL-25 + SE-1)', () => {
  it('blocks Cat A and Cat D — never extendable', () => {
    expect(validateExtension({ ...base, category: 'A' }, signer, JUST).ok).toBe(false);
    expect(validateExtension({ ...base, category: 'D' }, signer, JUST).ok).toBe(false);
  });

  it('blocks a second extension (once-only)', () => {
    const r = validateExtension({ ...base, extensionUsed: true }, signer, JUST);
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/one extension/i);
  });

  it('requires a substantive keyed justification', () => {
    expect(validateExtension(base, signer, '').ok).toBe(false);
    expect(validateExtension(base, signer, '   ok   ').ok).toBe(false);
    expect(validateExtension(base, signer, JUST).ok).toBe(true);
  });

  it('blocks a non-signer, non-supervisor corrector (SE-1)', () => {
    const r = validateExtension(base, peer, JUST);
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/original signer|supervisor/i);
  });

  it('allows the original signer (not third-party) and a supervisor (third-party, relationship recorded)', () => {
    const self = validateExtension(base, signer, JUST);
    expect(self.ok).toBe(true);
    expect(self.auth?.thirdParty).toBe(false);
    const sup = validateExtension(base, dom, JUST);
    expect(sup.ok).toBe(true);
    expect(sup.auth?.thirdParty).toBe(true);
    expect(sup.auth?.relationship).toBeTruthy();
  });
});

describe('deferral extension — superseding row construction', () => {
  const ids = { rowId: 'df-2', signatureId: 'sig-2' };
  const now = '2026-02-04T15:00:00.000Z';

  it('extends a calendar Cat C for equal duration: due moves from clock start + 10d to + 20d', () => {
    const { row } = buildExtension(base, signer, JUST, now, ids);
    expect(row.id).toBe('df-2');
    expect(row.supersedesId).toBe('df-1');
    expect(row.repairDueDateUtc).toBe('2026-02-16T00:00:00.000Z');
    expect(row.repairIntervalValue).toBe(20);
    expect(row.extensionUsed).toBe(true);
    expect(row.extensionTsUtc).toBe(now);
    expect(row.extensionJustification).toBe(JUST);
    expect(row.status).toBe('ACTIVE');
  });

  it('honors a non-default proviso interval (7-day Cat B item → 14 days total)', () => {
    const d: Deferral = { ...base, category: 'B', repairIntervalValue: 7, repairDueDateUtc: '2026-02-03T00:00:00.000Z' };
    const { row } = buildExtension(d, signer, JUST, now, ids);
    expect(row.repairDueDateUtc).toBe('2026-02-10T00:00:00.000Z');
    expect(row.repairIntervalValue).toBe(14);
  });

  it('honors a usage-based interval (D24): threshold += original value, no calendar due invented', () => {
    const d: Deferral = {
      ...base, repairIntervalUnit: 'HOUR', repairIntervalValue: 25,
      repairDueDateUtc: undefined, usageDueThreshold: 1225,
    };
    const { row } = buildExtension(d, signer, JUST, now, ids);
    expect(row.usageDueThreshold).toBe(1250);
    expect(row.repairDueDateUtc).toBeUndefined();
    expect(row.repairIntervalValue).toBe(50);
  });

  it('carries a FRESH signature and the corrector as signer — never the original signature', () => {
    const { row } = buildExtension(base, dom, JUST, now, ids);
    expect(row.signatureId).toBe('sig-2');
    expect(row.signedByOid).toBe('dom1');
    expect(row.signatureId).not.toBe(base.signatureId);
  });

  it('audit summary flags a third-party (supervisor) extension', () => {
    const self = buildExtension(base, signer, JUST, now, ids);
    const sup = buildExtension(base, dom, JUST, now, ids);
    expect(self.auditSummary).not.toMatch(/third-party/i);
    expect(sup.auditSummary).toMatch(/third-party/i);
  });
});
