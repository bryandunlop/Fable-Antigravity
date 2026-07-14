import { describe, it, expect } from 'vitest';
import { Paragraph, Table } from 'docx';
import { blockToDocx, buildReviewDocx } from './docxExport';
import type { Doc, DocBlock, DocRevision } from '../types';

const b = (over: Partial<DocBlock>): DocBlock => ({ id: 'blk-1', type: 'paragraph', md: '', ...over });

describe('blockToDocx', () => {
  it('produces docx children for every block type without throwing', () => {
    const types: DocBlock[] = [
      b({ type: 'paragraph', md: 'A gate at **1,000** ft.' }),
      b({ type: 'heading', md: '### Sub' }),
      b({ type: 'list', md: '- a\n- b' }),
      b({ type: 'table', md: '| A | B |\n|---|---|\n| 1 | 2 |' }),
      b({ type: 'callout', calloutKind: 'warning', md: '> [!WARNING]\n> Careful.' }),
      b({ type: 'figure', md: '![alt](/x.png)' }),
    ];
    for (const blk of types) {
      const out = blockToDocx(blk);
      expect(out.length).toBeGreaterThan(0);
      out.forEach((el) => expect(el instanceof Paragraph || el instanceof Table).toBe(true));
    }
  });
});

describe('buildReviewDocx', () => {
  it('resolves to a non-empty .docx Blob', async () => {
    const doc: Doc = { id: 'SOP-001', classId: 'sop', title: 'Stabilized Approach', category: 'c', roles: ['all'], ownerUserId: 'u', ownerName: 'O', tags: [], isPinned: false, isArchived: false, createdDate: '2026-01-01' };
    const rev: DocRevision = { id: 'SOP-001-r2', docId: 'SOP-001', revision: '2.0', status: 'published', sections: [{ id: 's', level: 2, number: '1', title: 'Criteria', blocks: [b({ md: 'x' })] }], changeSummary: '', effectiveDate: '2026-07-10', authorUserId: 'u', authorName: 'O', requireAcknowledgment: false, ackLevel: 'none', mockChecksum: 'abc123def456' };
    const blob = await buildReviewDocx(doc, rev);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(500);
  });
});
