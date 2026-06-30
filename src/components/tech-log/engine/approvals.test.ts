import { describe, it, expect } from 'vitest';
import { isSelfApproval, applyApproval, type ReferenceTables } from './approvals';
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
});
