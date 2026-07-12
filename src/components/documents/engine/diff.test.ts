import { describe, it, expect } from 'vitest';
import type { DocRevision, DocSection } from '../types';
import { diffRevisions, wordDiff } from './diff';
import { priorPublishedRevision } from './revisions';

function sec(id: string, title: string, blocks: { id: string; md: string }[], extra: Partial<DocSection> = {}): DocSection {
  return { id, level: 2, number: '', title, blocks: blocks.map((b) => ({ id: b.id, type: 'paragraph', md: b.md })), ...extra };
}
function rev(overrides: Partial<DocRevision> = {}): DocRevision {
  return {
    id: 'D-r1', docId: 'SOP-001', revision: '1.0', status: 'published', sections: [],
    changeSummary: '', effectiveDate: '2026-01-01', authorUserId: 'u', authorName: 'U',
    requireAcknowledgment: false, ackLevel: 'none', mockChecksum: 'x', ...overrides,
  };
}

describe('wordDiff', () => {
  it('marks inserted and deleted words, keeping shared runs', () => {
    const segs = wordDiff('the quick brown fox', 'the slow brown fox');
    expect(segs.filter((s) => s.kind === 'removed').map((s) => s.text).join('')).toContain('quick');
    expect(segs.filter((s) => s.kind === 'added').map((s) => s.text).join('')).toContain('slow');
    expect(segs.filter((s) => s.kind === 'same').map((s) => s.text).join('')).toContain('brown fox');
  });
  it('is all-same for identical text', () => {
    expect(wordDiff('same text', 'same text').every((s) => s.kind === 'same')).toBe(true);
  });
  it('reconstructs each side from its segments', () => {
    const a = 'reserve is 45 minutes at cruise';
    const b = 'reserve is 60 minutes at normal cruise';
    const segs = wordDiff(a, b);
    expect(segs.filter((s) => s.kind !== 'added').map((s) => s.text).join('')).toBe(a);
    expect(segs.filter((s) => s.kind !== 'removed').map((s) => s.text).join('')).toBe(b);
  });
});

describe('diffRevisions', () => {
  it('reports no changes for identical trees', () => {
    const r = rev({ sections: [sec('D::a', 'A', [{ id: 'D::a::b0', md: 'hello' }])] });
    const d = diffRevisions(r, r);
    expect(d.hasChanges).toBe(false);
    expect(d.counts.added + d.counts.removed + d.counts.modified).toBe(0);
  });

  it('flags a modified block with word segments', () => {
    const prev = rev({ sections: [sec('D::a', 'A', [{ id: 'D::a::b0', md: 'reserve is 45 minutes' }])] });
    const next = rev({ sections: [sec('D::a', 'A', [{ id: 'D::a::b0', md: 'reserve is 60 minutes' }])] });
    const d = diffRevisions(prev, next);
    const bd = d.sections[0].blocks[0];
    expect(bd.kind).toBe('modified');
    expect(bd.segments!.some((s) => s.kind === 'added' && s.text.includes('60'))).toBe(true);
    expect(d.counts.modified).toBe(1);
  });

  it('flags an added block and a removed block by id', () => {
    const prev = rev({ sections: [sec('D::a', 'A', [{ id: 'D::a::b0', md: 'keep' }, { id: 'D::a::b1', md: 'gone' }])] });
    const next = rev({ sections: [sec('D::a', 'A', [{ id: 'D::a::b0', md: 'keep' }, { id: 'D::a::b2', md: 'fresh' }])] });
    const d = diffRevisions(prev, next);
    const kinds = d.sections[0].blocks.map((b) => b.kind);
    expect(kinds).toContain('added');
    expect(kinds).toContain('removed');
    expect(d.counts.added).toBe(1);
    expect(d.counts.removed).toBe(1);
  });

  it('reads a split child (splitFrom → parent) as a modification, not an add+remove', () => {
    const prev = rev({ sections: [sec('D::a', 'A', [{ id: 'D::a::b0', md: 'one long paragraph split later' }])] });
    const next = rev({
      sections: [sec('D::a', 'A', [
        { id: 'D::a::b0', md: 'one long paragraph' },
        { id: 'D::a::b1', md: 'split later' },
      ])],
    });
    // mark b1 as split from b0
    next.sections[0].blocks[1].splitFrom = 'D::a::b0';
    const d = diffRevisions(prev, next);
    const kinds = d.sections[0].blocks.map((b) => b.kind);
    expect(kinds).not.toContain('added');
    expect(kinds).not.toContain('removed');
    expect(kinds.filter((k) => k === 'modified').length).toBe(2);
  });

  it('flags an added section', () => {
    const prev = rev({ sections: [sec('D::a', 'A', [{ id: 'D::a::b0', md: 'x' }])] });
    const next = rev({
      sections: [
        sec('D::a', 'A', [{ id: 'D::a::b0', md: 'x' }]),
        sec('D::c', 'C', [{ id: 'D::c::b0', md: 'new section' }]),
      ],
    });
    const d = diffRevisions(prev, next);
    expect(d.sections.find((s) => s.id === 'D::c')!.kind).toBe('added');
    expect(d.counts.sectionsAdded).toBe(1);
  });

  it('flags a removed section', () => {
    const prev = rev({
      sections: [
        sec('D::a', 'A', [{ id: 'D::a::b0', md: 'x' }]),
        sec('D::c', 'C', [{ id: 'D::c::b0', md: 'going away' }]),
      ],
    });
    const next = rev({ sections: [sec('D::a', 'A', [{ id: 'D::a::b0', md: 'x' }])] });
    const d = diffRevisions(prev, next);
    expect(d.sections.find((s) => s.id === 'D::c')!.kind).toBe('removed');
    expect(d.counts.sectionsRemoved).toBe(1);
  });

  it('flags a renumbered/retitled section (same id, changed number/title)', () => {
    const prev = rev({ sections: [sec('D::a', 'Old Title', [{ id: 'D::a::b0', md: 'x' }], { number: '3.1' })] });
    const next = rev({ sections: [sec('D::a', 'New Title', [{ id: 'D::a::b0', md: 'x' }], { number: '3.2' })] });
    const d = diffRevisions(prev, next);
    expect(['renumbered', 'retitled']).toContain(d.sections[0].kind);
    expect(d.hasChanges).toBe(true);
  });

  it('treats a missing prior revision as all-added', () => {
    const next = rev({ sections: [sec('D::a', 'A', [{ id: 'D::a::b0', md: 'brand new' }])] });
    const d = diffRevisions(undefined, next);
    expect(d.hasChanges).toBe(true);
    expect(d.sections[0].kind).toBe('added');
    expect(d.sections[0].blocks[0].kind).toBe('added');
  });

  it('interleaves a removed block at its original position, not the section end', () => {
    const prev = rev({ sections: [sec('D::a', 'A', [
      { id: 'D::a::b0', md: 'A' }, { id: 'D::a::b1', md: 'B' }, { id: 'D::a::b2', md: 'C' },
    ])] });
    const next = rev({ sections: [sec('D::a', 'A', [{ id: 'D::a::b0', md: 'A' }, { id: 'D::a::b2', md: 'C' }])] });
    const d = diffRevisions(prev, next);
    // order must be A, (B removed), C — the removal sits between A and C, not after C
    expect(d.sections[0].blocks.map((b) => `${b.kind}:${b.id}`)).toEqual([
      'unchanged:D::a::b0', 'removed:D::a::b1', 'unchanged:D::a::b2',
    ]);
  });

  it('counts a heading-only change and a move in the total (chip never reads 0 while changed)', () => {
    // heading-only
    const p1 = rev({ sections: [sec('D::a', 'Old', [{ id: 'D::a::b0', md: 'x' }], { number: '3.1' })] });
    const n1 = rev({ sections: [sec('D::a', 'New', [{ id: 'D::a::b0', md: 'x' }], { number: '3.1' })] });
    const d1 = diffRevisions(p1, n1);
    expect(d1.counts.total).toBe(1);
    expect(d1.sections[0].headingChanged).toBe(true);
  });

  it('reports headingChanged independently even when a block in the same section also changed', () => {
    const prev = rev({ sections: [sec('D::a', 'Old', [{ id: 'D::a::b0', md: 'x' }], { number: '3.1' })] });
    const next = rev({ sections: [sec('D::a', 'New', [{ id: 'D::a::b0', md: 'y' }], { number: '3.1' })] });
    const d = diffRevisions(prev, next);
    expect(d.sections[0].kind).toBe('modified');   // block changed
    expect(d.sections[0].headingChanged).toBe(true); // AND heading changed — not masked
  });

  it('does not throw / misclassify when a split child shares its parent content (splitFrom guard)', () => {
    const prev = rev({ sections: [sec('D::a', 'A', [{ id: 'D::a::b0', md: 'same text' }])] });
    const next = rev({ sections: [sec('D::a', 'A', [{ id: 'D::a::b0', md: 'same text' }, { id: 'D::a::b9', md: 'same text' }])] });
    next.sections[0].blocks[1].splitFrom = 'D::a::b0';
    const d = diffRevisions(prev, next);
    // b9 matched its parent by content via splitFrom → unchanged (no spurious 'moved' from slice(0,-1))
    expect(d.sections[0].blocks.find((b) => b.id === 'D::a::b9')!.kind).toBe('unchanged');
  });
});

describe('priorPublishedRevision', () => {
  it('returns the superseded revision immediately before the published one', () => {
    const revs = [
      rev({ id: 'SOP-001-r1', status: 'superseded' }),
      rev({ id: 'SOP-001-r2', status: 'superseded' }),
      rev({ id: 'SOP-001-r3', status: 'published' }),
    ];
    expect(priorPublishedRevision('SOP-001', revs)?.id).toBe('SOP-001-r2');
  });
  it('orders by numeric -rN suffix, not lexically (r10 > r2)', () => {
    const revs = [
      rev({ id: 'SOP-001-r2', status: 'superseded' }),
      rev({ id: 'SOP-001-r10', status: 'superseded' }),
      rev({ id: 'SOP-001-r11', status: 'published' }),
    ];
    expect(priorPublishedRevision('SOP-001', revs)?.id).toBe('SOP-001-r10');
  });
  it('returns undefined when there is no prior (only a published revision)', () => {
    expect(priorPublishedRevision('SOP-001', [rev({ id: 'SOP-001-r1', status: 'published' })])).toBeUndefined();
  });
});
