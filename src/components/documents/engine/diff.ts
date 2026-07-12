// Pure revision diff: sections by id → blocks by id → word-level LCS inside
// modified blocks. No React / no storage / no deps. Computed on demand (D-5).
import type { DocRevision, DocSection, DocBlock } from '../types';

export interface WordSegment { kind: 'same' | 'added' | 'removed'; text: string }

export type BlockChange = 'unchanged' | 'added' | 'removed' | 'modified' | 'moved';
export interface BlockDiff {
  id: string;
  kind: BlockChange;
  block?: DocBlock;      // next-revision block (unchanged/added/modified/moved)
  prevBlock?: DocBlock;  // prev-revision block (removed/modified)
  segments?: WordSegment[]; // present for 'modified'
}

export type SectionChange = 'unchanged' | 'added' | 'removed' | 'renumbered' | 'retitled' | 'modified';
export interface SectionDiff {
  id: string;
  kind: SectionChange;
  section?: DocSection;     // next-revision section (all but 'removed')
  prevSection?: DocSection; // prev-revision section ('removed')
  blocks: BlockDiff[];
}

export interface DocDiff {
  sections: SectionDiff[];
  counts: {
    added: number; removed: number; modified: number; moved: number;
    sectionsAdded: number; sectionsRemoved: number;
  };
  hasChanges: boolean;
}

/** Tokenize into words, whitespace runs, and punctuation so highlights land on word boundaries. */
function tokenize(s: string): string[] {
  return s.match(/\s+|[^\s\w]+|[\w']+/g) ?? [];
}

export function wordDiff(a: string, b: string): WordSegment[] {
  const at = tokenize(a);
  const bt = tokenize(b);
  const m = at.length;
  const n = bt.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      dp[i][j] = at[i] === bt[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const out: WordSegment[] = [];
  const push = (kind: WordSegment['kind'], text: string) => {
    const last = out[out.length - 1];
    if (last && last.kind === kind) last.text += text;
    else out.push({ kind, text });
  };
  let i = 0;
  let j = 0;
  while (i < m && j < n) {
    if (at[i] === bt[j]) { push('same', at[i]); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { push('removed', at[i]); i++; }
    else { push('added', bt[j]); j++; }
  }
  while (i < m) { push('removed', at[i]); i++; }
  while (j < n) { push('added', bt[j]); j++; }
  return out;
}

function diffBlocks(prev: DocBlock[], next: DocBlock[]): { blocks: BlockDiff[]; added: number; removed: number; modified: number; moved: number } {
  const prevById = new Map(prev.map((b) => [b.id, b]));
  const nextById = new Map(next.map((b) => [b.id, b]));
  const prevOrder = prev.map((b) => b.id);
  const out: BlockDiff[] = [];
  let added = 0;
  let removed = 0;
  let modified = 0;
  let moved = 0;

  next.forEach((b, idx) => {
    // splitFrom lineage: a split child matches its parent → reads as a modification, not an add.
    const p = prevById.get(b.id) ?? (b.splitFrom ? prevById.get(b.splitFrom) : undefined);
    if (!p) { out.push({ id: b.id, kind: 'added', block: b }); added++; return; }
    if (p.md !== b.md) {
      out.push({ id: b.id, kind: 'modified', block: b, prevBlock: p, segments: wordDiff(p.md, b.md) });
      modified++;
      return;
    }
    // Same content; detect a move by relative order among the blocks common to both revisions.
    const prevIdx = prevOrder.indexOf(b.id);
    const commonBefore = next.slice(0, idx).filter((x) => prevById.has(x.id)).length;
    const prevCommonBefore = prev.slice(0, prevIdx).filter((x) => nextById.has(x.id)).length;
    if (commonBefore !== prevCommonBefore) { out.push({ id: b.id, kind: 'moved', block: b, prevBlock: p }); moved++; }
    else out.push({ id: b.id, kind: 'unchanged', block: b });
  });

  // Removed blocks: in prev, claimed by no next block (by id or as a split parent).
  const claimed = new Set(next.flatMap((b) => [b.id, b.splitFrom].filter(Boolean) as string[]));
  prev.forEach((p) => {
    if (!claimed.has(p.id)) { out.push({ id: p.id, kind: 'removed', prevBlock: p }); removed++; }
  });

  return { blocks: out, added, removed, modified, moved };
}

export function diffRevisions(prev: DocRevision | undefined, next: DocRevision): DocDiff {
  const prevSecs = prev?.sections ?? [];
  const prevById = new Map(prevSecs.map((s) => [s.id, s]));
  const nextIds = new Set(next.sections.map((s) => s.id));
  const counts = { added: 0, removed: 0, modified: 0, moved: 0, sectionsAdded: 0, sectionsRemoved: 0 };
  const sections: SectionDiff[] = [];

  for (const s of next.sections) {
    const p = prevById.get(s.id);
    if (!p) {
      const bd = s.blocks.map<BlockDiff>((b) => ({ id: b.id, kind: 'added', block: b }));
      counts.added += bd.length;
      counts.sectionsAdded++;
      sections.push({ id: s.id, kind: 'added', section: s, blocks: bd });
      continue;
    }
    const { blocks, added, removed, modified, moved } = diffBlocks(p.blocks, s.blocks);
    counts.added += added; counts.removed += removed; counts.modified += modified; counts.moved += moved;
    const blockChanged = blocks.some((b) => b.kind !== 'unchanged');
    let kind: SectionChange = 'unchanged';
    if (blockChanged) kind = 'modified';
    else if (p.number !== s.number) kind = 'renumbered';
    else if (p.title !== s.title) kind = 'retitled';
    sections.push({ id: s.id, kind, section: s, blocks });
  }

  // Removed sections: present in prev, absent from next.
  for (const p of prevSecs) {
    if (!nextIds.has(p.id)) {
      counts.sectionsRemoved++;
      counts.removed += p.blocks.length;
      sections.push({
        id: p.id, kind: 'removed', prevSection: p,
        blocks: p.blocks.map<BlockDiff>((b) => ({ id: b.id, kind: 'removed', prevBlock: b })),
      });
    }
  }

  const hasChanges =
    counts.added + counts.removed + counts.modified + counts.moved + counts.sectionsAdded + counts.sectionsRemoved > 0
    || sections.some((s) => s.kind === 'renumbered' || s.kind === 'retitled');
  return { sections, counts, hasChanges };
}
