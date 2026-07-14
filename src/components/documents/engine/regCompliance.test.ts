import { describe, it, expect } from 'vitest';
import { buildCoverage, coverageSummary, docComplianceRefs } from './regCompliance';
import type { Doc, DocRevision } from '../types';
import type { RegRequirement } from './regCatalog';

const reqs: RegRequirement[] = [
  { id: 'r1', authority: 'FAR', ref: '14 CFR 91.175', title: 'Minimums' },
  { id: 'r2', authority: 'MEL', ref: 'D195', title: 'Deferrals' },
];

const doc: Doc = { id: 'SOP-001', classId: 'sop', title: 'SOP', category: 'c', roles: ['all'], ownerUserId: 'u', ownerName: 'O', tags: [], isPinned: false, isArchived: false, createdDate: '2026-01-01' };
const rev: DocRevision = {
  id: 'SOP-001-r1', docId: 'SOP-001', revision: '1.0', status: 'published',
  sections: [{ id: 's', level: 2, number: '3.1', title: 'Criteria', blocks: [
    { id: 'b0', type: 'paragraph', md: 'x', complianceRefs: ['r1'] },
    { id: 'b1', type: 'paragraph', md: 'y' },
  ] }],
  changeSummary: '', effectiveDate: '2026-07-10', authorUserId: 'u', authorName: 'O', requireAcknowledgment: false, ackLevel: 'none', mockChecksum: 'x',
};

describe('buildCoverage', () => {
  it('marks a cited requirement covered with its block site, and an unmapped one a gap', () => {
    const rows = buildCoverage([doc], [rev], reqs);
    const r1 = rows.find((r) => r.req.id === 'r1')!;
    const r2 = rows.find((r) => r.req.id === 'r2')!;
    expect(r1.covered).toBe(true);
    expect(r1.by).toEqual([{ docId: 'SOP-001', docTitle: 'SOP', sectionNumber: '3.1', sectionTitle: 'Criteria', blockId: 'b0' }]);
    expect(r2.covered).toBe(false);
    expect(r2.by).toEqual([]);
  });
  it('ignores non-published revisions', () => {
    const draft = { ...rev, status: 'draft' as const };
    expect(buildCoverage([doc], [draft], reqs).every((r) => !r.covered)).toBe(true);
  });
});

describe('coverageSummary', () => {
  it('counts covered vs gaps', () => {
    expect(coverageSummary(buildCoverage([doc], [rev], reqs))).toEqual({ total: 2, covered: 1, gaps: 1 });
  });
});

describe('docComplianceRefs', () => {
  it('returns the distinct refs a published doc addresses', () => {
    expect(docComplianceRefs(doc, [rev])).toEqual(['r1']);
  });
});
