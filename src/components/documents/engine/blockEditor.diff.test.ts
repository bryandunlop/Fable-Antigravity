import { describe, it, expect } from 'vitest';
import type { DocRevision, DocSection } from '../types';
import { diffRevisions } from './diff';
import { moveBlock, splitBlock, editBlockMd } from './blockEditor';

// Integration: structured-editor ops (Slice 3) feed the revision diff (Slice 2).
// This is the reason Slice 3 exists — because authoring preserves block IDs, the
// reader's yellow-lines read an edit as a modification and a reorder as a move,
// never delete + re-add. Guards against a regression to the old positional
// (markdown-reparse) save path, which would recycle IDs and shatter the diff.

function sec(id: string, blocks: { id: string; md: string }[]): DocSection {
  return { id, level: 2, number: '', title: 'S', blocks: blocks.map((b) => ({ id: b.id, type: 'paragraph', md: b.md })) };
}
function rev(sections: DocSection[]): DocRevision {
  return {
    id: 'D-r', docId: 'SOP-001', revision: '1.0', status: 'published', sections,
    changeSummary: '', effectiveDate: '2026-01-01', authorUserId: 'u', authorName: 'U',
    requireAcknowledgment: false, ackLevel: 'none', mockChecksum: 'x',
  };
}
const base = (): DocSection[] => [
  sec('D::s', [
    { id: 'b1', md: 'First paragraph.' },
    { id: 'b2', md: 'Second paragraph here.' },
    { id: 'b3', md: 'Third paragraph.' },
  ]),
];

describe('blockEditor → diffRevisions (ID preservation makes the diff precise)', () => {
  it('a reordered block reads as moved, never removed + added', () => {
    const next = moveBlock(base(), 'b1', 'down'); // [b2, b1, b3]
    const d = diffRevisions(rev(base()), rev(next));
    expect(d.counts.added).toBe(0);
    expect(d.counts.removed).toBe(0);
    expect(d.counts.moved).toBeGreaterThanOrEqual(1);
    expect(d.sections[0].blocks.some((b) => b.kind === 'moved')).toBe(true);
  });

  it('a caret split reads as modifications via splitFrom, never removed + added', () => {
    let n = 0;
    // Split b2 at the caret: head keeps b2's id, tail is fresh with splitFrom=b2.
    const next = splitBlock(base(), 'b2', 'Second paragraph', 'here.', () => `nb${++n}`);
    const d = diffRevisions(rev(base()), rev(next));
    expect(d.counts.added).toBe(0);
    expect(d.counts.removed).toBe(0);
    expect(d.counts.modified).toBe(2); // head content shortened + tail (splitFrom) both read as edits
  });

  it('an in-place edit touches exactly one block; the rest stay unchanged', () => {
    const next = editBlockMd(base(), 'b2', 'Second paragraph, revised.');
    const d = diffRevisions(rev(base()), rev(next));
    expect(d.counts).toMatchObject({ added: 0, removed: 0, moved: 0, modified: 1 });
    const blocks = d.sections[0].blocks;
    expect(blocks.find((b) => b.id === 'b2')?.kind).toBe('modified');
    expect(blocks.filter((b) => b.id === 'b1' || b.id === 'b3').every((b) => b.kind === 'unchanged')).toBe(true);
  });
});
