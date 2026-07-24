import { describe, it, expect } from 'vitest';
import { canEditSafaChecklist, deriveSafaReadiness, safaAttentionRows } from './safa';
import { applyApproval, type ReferenceTables } from './approvals';
import { campSafaStatus } from '../integration/campClient';
import type { Personnel, SafaCheckItem, SafaCheckStatus, PendingApproval } from '../types';

const regComp: Pick<Personnel, 'regComplianceAuthorized'> = { regComplianceAuthorized: true };
const pilot: Pick<Personnel, 'regComplianceAuthorized'> = {};
const maint: Pick<Personnel, 'regComplianceAuthorized'> = { regComplianceAuthorized: false };

const items: SafaCheckItem[] = [
  { id: 'i1', code: 'A-COFA', area: 'A', areaLabel: 'Flight deck', title: 'C of A on board', active: true },
  { id: 'i2', code: 'B-ELT', area: 'B', areaLabel: 'Safety / cabin', title: 'ELT battery in date', active: true },
  { id: 'i3', code: 'X-GONE', area: 'E', areaLabel: 'General', title: 'Retired item', active: false },
  { id: 'i4', code: 'NO-CAMP', area: 'C', areaLabel: 'Aircraft condition', title: 'Item CAMP has no status for', active: true },
];
const statuses: SafaCheckStatus[] = [
  { code: 'A-COFA', status: 'READY' },
  { code: 'B-ELT', status: 'ACTION', expiryUtc: '2020-01-01T00:00:00Z', note: 'overdue' },
];

describe('canEditSafaChecklist', () => {
  it('is true only for a Reg & Comp user', () => {
    expect(canEditSafaChecklist(regComp)).toBe(true);
    expect(canEditSafaChecklist(pilot)).toBe(false);
    expect(canEditSafaChecklist(maint)).toBe(false);
  });
});

describe('deriveSafaReadiness', () => {
  const rows = deriveSafaReadiness(items, statuses);

  it('excludes inactive items', () => {
    expect(rows.find(r => r.item.id === 'i3')).toBeUndefined();
    expect(rows).toHaveLength(3);
  });

  it('joins the CAMP status by code', () => {
    expect(rows.find(r => r.item.code === 'A-COFA')?.status).toBe('READY');
    const elt = rows.find(r => r.item.code === 'B-ELT');
    expect(elt?.status).toBe('ACTION');
    expect(elt?.note).toBe('overdue');
  });

  it('reads UNKNOWN when CAMP has no matching code', () => {
    expect(rows.find(r => r.item.code === 'NO-CAMP')?.status).toBe('UNKNOWN');
  });

  it('safaAttentionRows returns only DUE_SOON/ACTION rows', () => {
    const attention = safaAttentionRows(rows);
    expect(attention.map(r => r.item.code)).toEqual(['B-ELT']);
  });
});

describe('campSafaStatus', () => {
  it('is deterministic per serial (codes + statuses stable across calls)', () => {
    const a = campSafaStatus('6260').map(x => [x.code, x.status]);
    const b = campSafaStatus('6260').map(x => [x.code, x.status]);
    expect(a).toEqual(b);
  });

  it('always surfaces at least one DUE_SOON and one ACTION so the UI is meaningful', () => {
    const s = campSafaStatus('72157');
    expect(s.some(x => x.status === 'DUE_SOON')).toBe(true);
    expect(s.some(x => x.status === 'ACTION')).toBe(true);
  });
});

describe('applyApproval — SAFA_CHECKLIST_EDIT (four-eyes apply)', () => {
  it('replaces the whole SAFA definition with the proposed "after" list', () => {
    const before = items.slice(0, 1);
    const after: SafaCheckItem[] = [...before, { id: 'iN', code: 'E-INS', area: 'E', areaLabel: 'General', title: 'Insurance valid', active: true }];
    const tables: ReferenceTables = { aircraft: [], personnel: [], melItems: [], safaCheckItems: before };
    const pending: PendingApproval = { id: 'appr', kind: 'SAFA_CHECKLIST_EDIT', before, after, summary: 'add item', proposedByOid: 'USR-RC1', proposedAtUtc: 't', status: 'PENDING' };
    const result = applyApproval(tables, pending);
    expect(result.safaCheckItems).toEqual(after);
    expect(result.safaCheckItems).toHaveLength(2);
  });
});
