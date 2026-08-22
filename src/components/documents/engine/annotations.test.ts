import { describe, it, expect } from 'vitest';
import type { DocRevision } from '../types';
import {
  annotationsForBlock,
  makeAnnotation,
  orphanedAnnotations,
  resolveAnnotation,
  resolveAnnotations,
  type DocAnnotation,
} from './annotations';

const BODY =
  'Where single-point pressure refuelling is available it shall be the primary method. Over-wing gravity fuelling is permitted only where the pressure system is unserviceable and the deferral is recorded.';

function rev(blocks: Array<[string, string]>, id = 'SOP-4-r3'): DocRevision {
  return {
    id,
    docId: 'SOP-4',
    revision: '3',
    status: 'published',
    sections: [
      {
        id: 'SOP-4::s1',
        level: 2,
        number: '2.4',
        title: 'Refuelling',
        blocks: blocks.map(([bid, md]) => ({ id: bid, type: 'paragraph' as const, md })),
      },
    ],
    changeSummary: '',
    effectiveDate: '2026-02-01',
    ackLevel: 'none',
  } as DocRevision;
}

const QUOTE = 'Over-wing gravity fuelling is permitted only where the pressure system is unserviceable';

function ann(): DocAnnotation {
  const start = BODY.indexOf(QUOTE);
  return makeAnnotation({
    id: 'AN-1',
    docId: 'SOP-4',
    userId: 'U1',
    rev: rev([['b0', BODY]]),
    blockId: 'b0',
    blockText: BODY,
    start,
    end: start + QUOTE.length,
    note: 'KTEB Signature truck is low pressure — allow double the turn time.',
    nowUtc: '2026-07-14T10:00:00.000Z',
  });
}

function withOverrides(over: Partial<DocAnnotation>): DocAnnotation {
  return { ...ann(), ...over };
}

describe('makeAnnotation', () => {
  it('captures the quote and its surrounding context at the moment of marking', () => {
    const a = ann();
    expect(a.quote).toBe(QUOTE);
    expect(a.prefix.endsWith('primary method. ')).toBe(true);
    expect(a.suffix.startsWith(' and the deferral')).toBe(true);
    expect(a.anchoredRevisionId).toBe('SOP-4-r3');
  });
});

describe('resolveAnnotation', () => {
  it('finds a note exactly where it was left', () => {
    const r = resolveAnnotation(ann(), rev([['b0', BODY]]));
    expect(r.state).toBe('exact');
    expect(r.blockId).toBe('b0');
  });

  it('re-finds a note when text is inserted above it in the same block', () => {
    const shifted = `Fuelling is subject to the aircraft flight manual. ${BODY}`;
    const r = resolveAnnotation(ann(), rev([['b0', shifted]]));
    expect(r.state).toBe('moved');
    expect(shifted.slice(r.start, r.end)).toBe(QUOTE);
  });

  it('re-finds a note whose block was renumbered into a new id', () => {
    // A split or renumbered section gives its blocks new ids. Refusing to look
    // past the original block would orphan notes on text plainly still there.
    const r = resolveAnnotation(ann(), rev([['b7-new', BODY]]));
    expect(r.state).toBe('moved');
    expect(r.blockId).toBe('b7-new');
  });

  it('ORPHANS rather than re-attaching when the words are gone', () => {
    const rewritten = 'Gravity fuelling requires the DOM’s concurrence and a recorded deferral in every case.';
    const r = resolveAnnotation(ann(), rev([['b0', rewritten]]));
    expect(r.state).toBe('orphan');
    expect(r.blockId).toBeUndefined();
  });

  it('uses context to pick the right one of two identical phrases', () => {
    // "shall be recorded" appears all over a manual. Without context the note
    // attaches to whichever came first, which is a mark against words its author
    // never read.
    const phrase = 'shall be recorded';
    const text = `The defect ${phrase} in the log. The deferral ${phrase} on the placard.`;
    const second = text.lastIndexOf(phrase);
    const a = makeAnnotation({
      id: 'AN-2',
      docId: 'SOP-4',
      userId: 'U1',
      rev: rev([['b0', text]]),
      blockId: 'b0',
      blockText: text,
      start: second,
      end: second + phrase.length,
      note: 'placard one',
      nowUtc: '2026-07-14T10:00:00.000Z',
    });

    // Now push everything along; both occurrences still exist.
    const moved = `Preamble. ${text}`;
    const r = resolveAnnotation(a, rev([['b0', moved]]));
    expect(r.state).toBe('moved');
    // It must land on the SECOND occurrence — the one about the placard.
    expect(moved.slice(0, r.start!).endsWith('The deferral ')).toBe(true);
  });

  it('prefers the original block when the same words exist in two blocks', () => {
    const r = resolveAnnotation(withOverrides({ offset: 0 }), rev([
      ['other', BODY],
      ['b0', BODY],
    ]));
    expect(r.state).toBe('moved');
    expect(r.blockId).toBe('b0');
  });
});

describe('grouping', () => {
  const revNow = rev([['b0', BODY]]);

  it('lists a block’s notes oldest first', () => {
    const a1 = withOverrides({ id: 'A', createdAtUtc: '2026-07-14T10:00:00.000Z' });
    const a2 = withOverrides({ id: 'B', createdAtUtc: '2026-05-01T10:00:00.000Z' });
    const grouped = annotationsForBlock(resolveAnnotations([a1, a2], revNow), 'b0');
    expect(grouped.map((g) => g.annotation.id)).toEqual(['B', 'A']);
  });

  it('keeps orphans out of the block list but reports them separately', () => {
    const gone = withOverrides({ id: 'C', quote: 'text that no longer exists anywhere' });
    const resolved = resolveAnnotations([ann(), gone], revNow);
    expect(annotationsForBlock(resolved, 'b0').map((r) => r.annotation.id)).toEqual(['AN-1']);
    expect(orphanedAnnotations(resolved).map((r) => r.annotation.id)).toEqual(['C']);
  });
});
