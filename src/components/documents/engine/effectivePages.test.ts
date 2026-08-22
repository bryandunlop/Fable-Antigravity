import { describe, it, expect } from 'vitest';
import type { Doc, DocRevision, DocAcknowledgment } from '../types';
import { buildEffectivePages } from './effectivePages';

function doc(over: Partial<Doc> = {}): Doc {
  return {
    id: 'GOM-3',
    classId: 'manual',
    title: 'General Operations Manual',
    category: 'General Operations',
    roles: ['pilot', 'inflight'],
    ownerUserId: 'U1',
    ownerName: 'Owner',
    tags: [],
    isPinned: false,
    isArchived: false,
    createdDate: '2026-01-01',
    ...over,
  };
}

function rev(
  id: string,
  revision: string,
  effectiveDate: string,
  sections: Array<[string, string, string]>,
  over: Partial<DocRevision> = {},
): DocRevision {
  return {
    id,
    docId: 'GOM-3',
    revision,
    status: 'published',
    sections: sections.map(([num, title, md]) => ({
      id: `GOM-3::${title.toLowerCase().replace(/\W+/g, '-')}`,
      level: 2,
      number: num,
      title,
      blocks: [{ id: `GOM-3::${title}::b0`, type: 'paragraph', md }],
    })),
    changeSummary: '',
    effectiveDate,
    ackLevel: 'initials',
    mockChecksum: 'a41f9c2e0000',
    ...over,
  } as DocRevision;
}

const r12 = rev('GOM-3-r12', '12', '2024-03-03', [
  ['3.1', 'Operational Control', 'The DO exercises operational control.'],
  ['3.3', 'Flight Planning', 'Verify chart currency.'],
], { status: 'superseded' });

const r14 = rev('GOM-3-r14', '14', '2026-02-01', [
  ['3.1', 'Operational Control', 'The DO exercises operational control.'], // unchanged since 12
  ['3.3', 'Flight Planning', 'Verify chart currency and the coverage cycle.'], // changed at 14
], { requireAcknowledgment: true, decidedByName: 'Chief Pilot', decidedAtUtc: '2026-01-28T10:00:00.000Z', authorName: 'Document Manager' });

const READERS = ['pilot', 'inflight', 'maintenance'];

describe('buildEffectivePages', () => {
  it('returns nothing for a document with no published revision', () => {
    expect(buildEffectivePages(doc(), 'Manual', [], [], [], READERS)).toBeUndefined();
  });

  it('dates each section from the revision its wording last changed in — not the document revision', () => {
    // A manual at rev 14 does not mean every section was touched at 14. Stamping
    // "14" against all of them is exactly the lie this report exists to prevent.
    const out = buildEffectivePages(doc(), 'Manual', [r12, r14], [], [], READERS)!;
    const byTitle = Object.fromEntries(out.rows.map((r) => [r.title, r]));
    expect(byTitle['Operational Control'].revisionLabel).toBe('12');
    expect(byTitle['Operational Control'].effectiveDate).toBe('2024-03-03');
    expect(byTitle['Flight Planning'].revisionLabel).toBe('14');
    expect(byTitle['Flight Planning'].effectiveDate).toBe('2026-02-01');
  });

  it('carries the document header facts an auditor asks for', () => {
    const out = buildEffectivePages(doc(), 'Manual', [r12, r14], [], [], READERS)!;
    expect(out).toMatchObject({
      docId: 'GOM-3',
      revisionLabel: '14',
      effectiveDate: '2026-02-01',
      checksum: 'a41f9c2e0000',
      approvedBy: 'Chief Pilot',
      approvedOn: '2026-01-28',
      authoredBy: 'Document Manager',
      sectionCount: 2,
    });
  });

  it('flags a section a bulletin has amended, and counts them', () => {
    const bulletin = {
      ...rev('PB-014-r1', '1.0', '2026-06-12', [['', 'Procedure', 'New wording.']]),
      docId: 'PB-014',
      amendments: [
        {
          id: 'PB-014-r1::am0',
          targetDocId: 'GOM-3',
          targetSectionId: 'GOM-3::flight-planning',
          summary: 'Chart currency.',
        },
      ],
    } as DocRevision;
    const out = buildEffectivePages(doc(), 'Manual', [r12, r14, bulletin], [], [], READERS)!;
    expect(out.rows.find((r) => r.title === 'Flight Planning')!.amendedBy).toEqual(['PB-014']);
    expect(out.rows.find((r) => r.title === 'Operational Control')!.amendedBy).toEqual([]);
    expect(out.amendedCount).toBe(1);
  });

  it('counts acknowledgements against THIS revision only', () => {
    // A prior-revision ack is not evidence anyone read the current one.
    const acks: DocAcknowledgment[] = [
      { docId: 'GOM-3', revisionId: 'GOM-3-r14', revision: '14', userId: 'U1', userName: 'A', role: 'pilot', level: 'initials', acknowledgedAtUtc: '2026-02-02T00:00:00Z' },
      { docId: 'GOM-3', revisionId: 'GOM-3-r12', revision: '12', userId: 'U2', userName: 'B', role: 'inflight', level: 'initials', acknowledgedAtUtc: '2024-03-04T00:00:00Z' },
    ];
    const out = buildEffectivePages(doc(), 'Manual', [r12, r14], [], acks, READERS)!;
    expect(out.acknowledged).toBe(1);
    // pilot + inflight are targeted; maintenance is not.
    expect(out.ackRequired).toBe(2);
  });

  it('reports no acknowledgement requirement when the revision asks for none', () => {
    const noAck = rev('GOM-3-r14', '14', '2026-02-01', [['3.1', 'Scope', 'x']], {
      requireAcknowledgment: false,
      ackLevel: 'none',
    });
    const out = buildEffectivePages(doc(), 'Manual', [noAck], [], [], READERS)!;
    expect(out.ackRequired).toBe(0);
  });

  it('handles a first revision with no history behind it', () => {
    const out = buildEffectivePages(doc(), 'Manual', [r14], [], [], READERS)!;
    expect(out.rows.every((r) => r.revisionLabel === '14')).toBe(true);
  });
});
