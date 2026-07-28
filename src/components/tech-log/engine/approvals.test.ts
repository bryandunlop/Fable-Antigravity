import { describe, it, expect } from 'vitest';
import { isSelfApproval, applyApproval, validateMelDeferrable, type ReferenceTables } from './approvals';
import type { Aircraft, Personnel, MelItem, PendingApproval } from '../types';

const aircraft: Aircraft = { id: 'ac1', tailNumber: 'N1PG', type: 'G800', serialNumber: '88041', status: 'PROVISIONAL', isProvisional: true, homeBase: 'KTEB', airframeTotalHours: 10, airframeTotalCycles: 5 };
const personnel: Personnel = { oid: 'USR008', displayName: 'Tom Parker', role: 'MAINTENANCE', apCertificateNumber: 'AP-2810773', riiAuthorized: false, riiAuthorizedAta: [], active: true };
const melA: MelItem = { id: 'mel1', aircraftType: 'G800', mmelRevision: 'r1', effectiveDate: '2026-01-01', approvalState: 'PENDING_FSDO', ataReference: '24', itemNumber: '24-02', subItemNumber: '24-02-02', title: 'APU', category: 'C', numberInstalled: 1, numberRequired: 0 };
const melB: MelItem = { ...melA, id: 'mel2', subItemNumber: '24-02-03' };
const tables: ReferenceTables = { aircraft: [aircraft], personnel: [personnel], melItems: [melA, melB] };

describe('isSelfApproval', () => {
  it('is true when the decider is the proposer', () => {
    const pending: PendingApproval = { id: 'appr1', kind: 'AIRCRAFT_EDIT', before: aircraft, after: aircraft, summary: 's', proposedByOid: 'USR002', proposedAtUtc: 't', status: 'PENDING' };
    expect(isSelfApproval(pending, 'USR002')).toBe(true);
  });
  it('is false when the decider differs from the proposer', () => {
    const pending: PendingApproval = { id: 'appr1', kind: 'AIRCRAFT_EDIT', before: aircraft, after: aircraft, summary: 's', proposedByOid: 'USR002', proposedAtUtc: 't', status: 'PENDING' };
    expect(isSelfApproval(pending, 'USR010')).toBe(false);
  });
});

describe('applyApproval', () => {
  it('AIRCRAFT_EDIT replaces the matching aircraft row only', () => {
    const after: Aircraft = { ...aircraft, homeBase: 'KPBI' };
    const pending: PendingApproval = { id: 'appr1', kind: 'AIRCRAFT_EDIT', before: aircraft, after, summary: 's', proposedByOid: 'USR002', proposedAtUtc: 't', status: 'PENDING' };
    const result = applyApproval(tables, pending);
    expect(result.aircraft).toEqual([after]);
    expect(result.personnel).toBe(tables.personnel);
    expect(result.melItems).toBe(tables.melItems);
  });

  it('PERSONNEL_EDIT replaces the matching personnel row only', () => {
    const after: Personnel = { ...personnel, apCertificateNumber: 'AP-9999999' };
    const pending: PendingApproval = { id: 'appr2', kind: 'PERSONNEL_EDIT', before: personnel, after, summary: 's', proposedByOid: 'USR002', proposedAtUtc: 't', status: 'PENDING' };
    const result = applyApproval(tables, pending);
    expect(result.personnel).toEqual([after]);
    expect(result.aircraft).toBe(tables.aircraft);
  });

  it('MEL_TYPE_ACTIVATION clears isProvisional, sets ACTIVE, and approves only the listed MEL items', () => {
    const pending: PendingApproval = { id: 'appr3', kind: 'MEL_TYPE_ACTIVATION', aircraftId: 'ac1', aircraftType: 'G800', melItemIds: ['mel1'], evidenceRef: 'FSDO-LOA-2026-04', summary: 's', proposedByOid: 'USR002', proposedAtUtc: 't', status: 'PENDING' };
    const result = applyApproval(tables, pending);
    expect(result.aircraft[0]).toMatchObject({ id: 'ac1', isProvisional: false, status: 'ACTIVE' });
    expect(result.melItems.find(m => m.id === 'mel1')?.approvalState).toBe('APPROVED');
    expect(result.melItems.find(m => m.id === 'mel2')?.approvalState).toBe('PENDING_FSDO'); // not in melItemIds — untouched
  });

  it('MEL_ITEM_APPROVAL approves only the named MEL item, leaving siblings untouched', () => {
    const pending: PendingApproval = { id: 'appr4', kind: 'MEL_ITEM_APPROVAL', melItemId: 'mel2', evidenceRef: 'FSDO-LOA-2026-05', summary: 's', proposedByOid: 'USR002', proposedAtUtc: 't', status: 'PENDING' };
    const result = applyApproval(tables, pending);
    expect(result.melItems.find(m => m.id === 'mel2')?.approvalState).toBe('APPROVED');
    expect(result.melItems.find(m => m.id === 'mel1')?.approvalState).toBe('PENDING_FSDO'); // untouched sibling
    expect(result.aircraft).toBe(tables.aircraft); // untouched table keeps reference identity
    expect(result.personnel).toBe(tables.personnel);
  });
});

describe('validateMelDeferrable (CLAUDE.md hard stop: no deferral against an unapproved MEL)', () => {
  const item = (approvalState: MelItem['approvalState']) => ({ approvalState, subItemNumber: '24-02-02' });

  it('allows a deferral against an APPROVED item', () => {
    expect(validateMelDeferrable(item('APPROVED')).ok).toBe(true);
  });

  it('blocks DRAFT — the item carries no dispatch relief yet', () => {
    const r = validateMelDeferrable(item('DRAFT'));
    expect(r.ok).toBe(false);
    expect(r.error).toContain('still in draft');
  });

  it('blocks PENDING_FSDO — the G800 provisional case', () => {
    const r = validateMelDeferrable(item('PENDING_FSDO'));
    expect(r.ok).toBe(false);
    expect(r.error).toContain('awaiting FSDO approval');
  });

  it('blocks SUPERSEDED with a distinct message pointing at the current item', () => {
    const r = validateMelDeferrable(item('SUPERSEDED'));
    expect(r.ok).toBe(false);
    expect(r.error).toContain('superseded');
  });

  it('names the offending MEL item so the error is actionable', () => {
    expect(validateMelDeferrable({ approvalState: 'DRAFT', subItemNumber: '25-10-01a' }).error).toContain('25-10-01a');
  });

  it('is not satisfied by any state other than APPROVED', () => {
    const states: MelItem['approvalState'][] = ['DRAFT', 'PENDING_FSDO', 'SUPERSEDED'];
    for (const s of states) expect(validateMelDeferrable(item(s)).ok).toBe(false);
  });
});
