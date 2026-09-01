import { describe, it, expect } from 'vitest';
import { canDecideApproval, isSelfApproval, applyApproval, type ReferenceTables } from './approvals';
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

/**
 * D23 — blocking self-approval was never enough on its own. These proposals set
 * `apCertificateNumber`, `riiAuthorizedAta`, `isProvisional` and `approvalState`; whoever
 * approves one can defeat the CRS-cert gate, the RII check and the provisional-MEL block.
 * Until 2026-09-01 the reducer admitted ANY second person, because the role gate lived only
 * in the panel that draws the buttons — which that panel documents as convenience.
 */
describe('canDecideApproval', () => {
  const supervisor: Personnel = { ...personnel, oid: 'USR002', displayName: 'Sarah Wilson (DOM)', isSupervisor: true };
  const ordinary: Personnel = { ...personnel, oid: 'USR008', isSupervisor: false };

  it('admits a designated supervisor', () => {
    expect(canDecideApproval(supervisor).ok).toBe(true);
  });

  it('refuses a second pair of eyes that is not a qualified pair', () => {
    const verdict = canDecideApproval(ordinary);
    expect(verdict.ok).toBe(false);
    expect(verdict.error).toMatch(/supervisor/i);
  });

  it('refuses a decider who is not on file as personnel at all', () => {
    expect(canDecideApproval(undefined).ok).toBe(false);
  });

  it('refuses when isSupervisor is simply absent, rather than treating absence as permission', () => {
    const { isSupervisor: _drop, ...withoutFlag } = supervisor;
    expect(canDecideApproval(withoutFlag as Personnel).ok).toBe(false);
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

describe('MEL_REVISION_IMPORT (D95)', () => {
  const nef = (n: string, over: Partial<MelItem> = {}): MelItem => ({
    id: n, aircraftType: 'G650ER', mmelRevision: 'Original', effectiveDate: '2023-06-26',
    approvalState: 'APPROVED', ataReference: '25', itemNumber: n, subItemNumber: n,
    title: n, category: null, numberInstalled: null, numberRequired: null, melSection: 'NEF', ...over,
  });

  const importTables: ReferenceTables = {
    aircraft: [aircraft],
    personnel: [personnel],
    melItems: [nef('N100-1'), nef('N100-2'), nef('N100-3'), melA],
  };

  const pending: PendingApproval = {
    id: 'appr-imp', kind: 'MEL_REVISION_IMPORT', aircraftType: 'G650ER',
    revision: 'Rev 1', effectiveDate: '2026-04-27', evidenceRef: 'LOA-91.213-2026-0042',
    fileName: 'G650ER MEL R1.pdf', sections: ['NEF'],
    added: [nef('N100-9', { mmelRevision: 'Rev 1', effectiveDate: '2026-04-27' })],
    changed: [nef('N100-2', { title: 'Carpet and underlay', mmelRevision: 'Rev 1', effectiveDate: '2026-04-27' })],
    removedIds: ['N100-3'],
    unchangedCount: 1,
    stamps: [{ subItemNumber: 'N100-1', mmelRevision: 'Rev 1', effectiveDate: '2026-04-27' }],
    acknowledged: [],
    summary: 's', proposedByOid: 'USR002', proposedAtUtc: 't', status: 'PENDING',
  };

  const applied = applyApproval(importTables, pending);
  const find = (id: string) => applied.melItems.find(m => m.id === id)!;

  it('adds, replaces and stamps in one approval', () => {
    expect(find('N100-9')).toBeDefined();
    expect(find('N100-2').title).toBe('Carpet and underlay');
    expect(find('N100-1').mmelRevision).toBe('Rev 1');
  });

  it('supersedes a withdrawn item instead of deleting it', () => {
    // A deferral signed against it must still resolve; only APPROVED items are offered
    // for a new deferral, so nobody can cite it again.
    expect(find('N100-3').approvalState).toBe('SUPERSEDED');
    expect(applied.melItems.filter(m => m.id === 'N100-3')).toHaveLength(1);
  });

  it('leaves another fleet type untouched', () => {
    expect(find('mel1')).toEqual(melA);
  });

  it('cannot be approved by whoever proposed it', () => {
    expect(isSelfApproval(pending, 'USR002')).toBe(true);
  });
});
