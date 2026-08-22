// Personal notes on a controlled document (Phase 4).
//
// Bryan confirmed people actively mark up documents at GFO today. That makes this
// table stakes rather than polish — shipping a reader whose notes vanish on a
// revision would be worse than the PDFs it replaces.
//
// The hard part is not storing a note. It is finding the text again after the
// document changes underneath it. One study of general web annotations found 27%
// already orphaned, so this is the normal case, not an edge one.
//
// Two invariants:
//
//  1. **Never silently re-anchor.** A note moved onto text its author never read
//     is worse than a note that says it lost its place — the reader would trust a
//     mark that now sits against different words.
//  2. **Never touch the document.** Annotations live in their own store keyed by
//     block id. They are not blocks, they never enter a revision, and they cannot
//     perturb a content digest.
import type { DocRevision } from '../types';

/** How much surrounding text is kept to re-find a quote that moved. */
export const CONTEXT_CHARS = 40;

export interface DocAnnotation {
  id: string;
  docId: string;
  userId: string;
  /** The block the note was made against — the structural anchor, tried first. */
  blockId: string;
  /** The revision it was made against, so an orphan can say what it was reading. */
  anchoredRevisionId: string;
  /** The exact words the author marked. */
  quote: string;
  /** Text immediately before and after the quote, for re-finding it. */
  prefix: string;
  suffix: string;
  /** Character offset of the quote within the block at anchoring time. */
  offset: number;
  /** The author's own words. Empty for a plain highlight. */
  note: string;
  createdAtUtc: string;
}

export type AnchorState =
  /** Found exactly where it was left. */
  | 'exact'
  /** Found again, but the text moved — within its block or into another. */
  | 'moved'
  /** The marked words are gone. Surfaced, never dropped and never re-attached. */
  | 'orphan';

export interface ResolvedAnnotation {
  annotation: DocAnnotation;
  state: AnchorState;
  /** Where it resolved to. Absent when orphaned. */
  blockId?: string;
  start?: number;
  end?: number;
}

function findAt(text: string, quote: string, offset: number): boolean {
  return text.slice(offset, offset + quote.length) === quote;
}

/**
 * Score a candidate position by how much of the stored context still surrounds it.
 *
 * Context is what separates "the same sentence, shifted" from "a different
 * sentence that happens to use the same words" — a phrase like "shall be recorded"
 * may appear a dozen times in one manual, and without context the note would
 * cheerfully attach to the wrong one.
 */
function contextScore(text: string, at: number, ann: DocAnnotation): number {
  const before = text.slice(Math.max(0, at - CONTEXT_CHARS), at);
  const after = text.slice(at + ann.quote.length, at + ann.quote.length + CONTEXT_CHARS);
  let score = 0;
  if (ann.prefix && before.endsWith(ann.prefix.slice(-Math.min(ann.prefix.length, CONTEXT_CHARS)))) score += 2;
  if (ann.suffix && after.startsWith(ann.suffix.slice(0, Math.min(ann.suffix.length, CONTEXT_CHARS)))) score += 2;
  return score;
}

function allIndexes(haystack: string, needle: string): number[] {
  const out: number[] = [];
  if (!needle) return out;
  let from = 0;
  for (;;) {
    const at = haystack.indexOf(needle, from);
    if (at === -1) break;
    out.push(at);
    from = at + 1;
  }
  return out;
}

/**
 * Re-find one annotation in a revision.
 *
 * Ordered fallback, cheapest and most certain first:
 *
 *   1. Same block, same offset, same words → `exact`.
 *   2. Same block, words moved → `moved`, picking the best-context position.
 *   3. Any other block in the revision → `moved`.
 *   4. Nothing → `orphan`.
 *
 * Step 3 is deliberate: a section renumbered or split gives its blocks new ids,
 * and refusing to look past the original block would orphan notes on text that is
 * still plainly there.
 */
export function resolveAnnotation(ann: DocAnnotation, rev: DocRevision): ResolvedAnnotation {
  const blocks = rev.sections.flatMap((s) => s.blocks);
  const own = blocks.find((b) => b.id === ann.blockId);

  if (own && findAt(own.md, ann.quote, ann.offset)) {
    return { annotation: ann, state: 'exact', blockId: own.id, start: ann.offset, end: ann.offset + ann.quote.length };
  }

  const best = { blockId: '', at: -1, score: -1, sameBlock: false };
  for (const block of blocks) {
    for (const at of allIndexes(block.md, ann.quote)) {
      const sameBlock = block.id === ann.blockId;
      // Context first, then prefer the original block, then the nearest offset —
      // so a duplicated phrase resolves to the one the author actually marked.
      const score = contextScore(block.md, at, ann) + (sameBlock ? 1 : 0) - Math.abs(at - ann.offset) / 10000;
      if (score > best.score) {
        best.blockId = block.id;
        best.at = at;
        best.score = score;
        best.sameBlock = sameBlock;
      }
    }
  }

  if (best.at === -1) return { annotation: ann, state: 'orphan' };
  return {
    annotation: ann,
    state: 'moved',
    blockId: best.blockId,
    start: best.at,
    end: best.at + ann.quote.length,
  };
}

export function resolveAnnotations(anns: DocAnnotation[], rev: DocRevision): ResolvedAnnotation[] {
  return anns.map((a) => resolveAnnotation(a, rev));
}

/** The notes attached to one block, in the order they were made. */
export function annotationsForBlock(resolved: ResolvedAnnotation[], blockId: string): ResolvedAnnotation[] {
  return resolved
    .filter((r) => r.state !== 'orphan' && r.blockId === blockId)
    .sort((a, b) => a.annotation.createdAtUtc.localeCompare(b.annotation.createdAtUtc));
}

export function orphanedAnnotations(resolved: ResolvedAnnotation[]): ResolvedAnnotation[] {
  return resolved.filter((r) => r.state === 'orphan');
}

/**
 * Build an annotation from a selection inside a block.
 *
 * Captures the context at the moment of marking — trying to reconstruct it later,
 * from a document that has since changed, is exactly the problem this avoids.
 */
export function makeAnnotation(input: {
  id: string;
  docId: string;
  userId: string;
  rev: DocRevision;
  blockId: string;
  blockText: string;
  start: number;
  end: number;
  note: string;
  nowUtc: string;
}): DocAnnotation {
  const quote = input.blockText.slice(input.start, input.end);
  return {
    id: input.id,
    docId: input.docId,
    userId: input.userId,
    blockId: input.blockId,
    anchoredRevisionId: input.rev.id,
    quote,
    prefix: input.blockText.slice(Math.max(0, input.start - CONTEXT_CHARS), input.start),
    suffix: input.blockText.slice(input.end, input.end + CONTEXT_CHARS),
    offset: input.start,
    note: input.note,
    createdAtUtc: input.nowUtc,
  };
}
