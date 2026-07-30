// Pure block content model: markdown ↔ section tree, deterministic IDs, and a
// canonical serialization for the content checksum. No React / no storage.
import type { DocSection, DocBlock, BlockType } from '../types';
import { mockSha256 } from '../../tech-log/engine/signing';

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'untitled';
}

const HEADING = /^(#{1,6})\s+(.*)$/;
const LIST_ITEM = /^\s*(?:[-*+]|\d+\.)\s+/;
const IMAGE_ONLY = /^!\[[^\]]*\]\(([^)]+)\)$/;
const ALERT = /^>\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/i;
/** A task-card step. Deliberately NOT a blockquote (a step is an instruction, not a quote) and
 *  deliberately NOT an ordered list, so `1.` keeps meaning an ordinary list. */
export const STEP_MARKER = /^\[!STEP\]\s*/i;

function calloutKindFor(tag: string): DocBlock['calloutKind'] {
  const t = tag.toUpperCase();
  if (t === 'WARNING') return 'warning';
  if (t === 'CAUTION') return 'caution';
  return 'note'; // NOTE / TIP / IMPORTANT
}

function numberAndTitle(text: string): { number: string; title: string } {
  const m = /^(\d+(?:\.\d+)*)\s+(.*)$/.exec(text.trim());
  return m ? { number: m[1], title: m[2].trim() } : { number: '', title: text.trim() };
}

interface RawSection { level: number; number: string; title: string; body: string[] }

function splitRawSections(markdown: string): RawSection[] {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const out: RawSection[] = [];
  let current: RawSection | null = null;
  for (const line of lines) {
    const h = HEADING.exec(line);
    if (h && h[1].length <= 2) {
      const { number, title } = numberAndTitle(h[2]);
      current = { level: h[1].length, number, title, body: [] };
      out.push(current);
    } else {
      if (!current) { current = { level: 1, number: '', title: '', body: [] }; out.push(current); }
      current.body.push(line);
    }
  }
  return out;
}

function chunkBody(body: string[]): string[] {
  const chunks: string[] = [];
  let buf: string[] = [];
  let inFence = false;
  const flush = () => { if (buf.length) { chunks.push(buf.join('\n').trim()); buf = []; } };
  for (const line of body) {
    // A fenced code block may contain blank lines — don't split inside one.
    if (/^```/.test(line.trim())) inFence = !inFence;
    if (line.trim() === '' && !inFence) flush();
    else buf.push(line);
  }
  flush();
  return chunks.filter((c) => c.length > 0);
}

function classify(chunk: string): { type: BlockType; calloutKind?: DocBlock['calloutKind']; figureRef?: string } {
  const lines = chunk.split('\n');
  const alert = ALERT.exec(lines[0]);
  if (alert) return { type: 'callout', calloutKind: calloutKindFor(alert[1]) };
  if (STEP_MARKER.test(lines[0])) {
    // A step may carry one photo on its own line; lift it so the renderer can place it
    // beside the instruction rather than leaving it inline in the prose.
    const img = lines.slice(1).map((l) => IMAGE_ONLY.exec(l.trim())).find(Boolean);
    return img ? { type: 'step', figureRef: img[1] } : { type: 'step' };
  }
  const img = IMAGE_ONLY.exec(chunk.trim());
  if (img && lines.length === 1) return { type: 'figure', figureRef: img[1] };
  if (lines.length >= 2 && lines[0].includes('|') && /^\s*\|?\s*:?-{2,}/.test(lines[1])) return { type: 'table' };
  if (lines.every((l) => LIST_ITEM.test(l))) return { type: 'list' };
  if (lines.length === 1 && /^#{3,6}\s/.test(lines[0])) return { type: 'heading' };
  return { type: 'paragraph' };
}

/** Public re-classifier for the structured editor: given a block's edited
 * markdown, return its type + callout/figure metadata (id/splitFrom are the
 * editor's concern, not derived here). */
export function classifyBlockMd(md: string): { type: BlockType; calloutKind?: DocBlock['calloutKind']; figureRef?: string } {
  return classify(md.trim());
}

export function sectionsFromMarkdown(markdown: string, docId: string): DocSection[] {
  const raws = splitRawSections(markdown).map((raw) => ({ raw, chunks: chunkBody(raw.body) }));
  // Drop a fully empty leading preamble (e.g. a blank line before the first heading)
  // BEFORE id allocation, so it cannot reserve a slug the first real section then collides with.
  const kept = raws.filter(
    ({ raw, chunks }, i) =>
      !(i === 0 && raw.level === 1 && raw.title === '' && raw.number === '' && chunks.length === 0),
  );
  const usedIds = new Map<string, number>();
  return kept.map(({ raw, chunks }) => {
    const base = `${docId}::${slug(raw.title)}`;
    const seen = usedIds.get(base) ?? 0;
    usedIds.set(base, seen + 1);
    const id = seen === 0 ? base : `${base}-${seen + 1}`;
    const blocks: DocBlock[] = chunks.map((chunk, ordinal) => {
      const c = classify(chunk);
      const block: DocBlock = { id: `${id}::b${ordinal}`, type: c.type, md: chunk };
      if (c.calloutKind) block.calloutKind = c.calloutKind;
      if (c.figureRef) block.figureRef = c.figureRef;
      return block;
    });
    return { id, level: raw.level, number: raw.number, title: raw.title, blocks };
  });
}

/** Step number by block id, counted from position among the section's 'step' blocks.
 *
 * The ONE source of truth for step numbering — the reader, the HTML export and the .docx export all
 * read it, so a step is never numbered twice by two different rules. Numbering is positional on
 * purpose: inserting or deleting a step renumbers the rest with no author action, which is the
 * whole reason authors don't hand-maintain "step 4 of 9". Non-step blocks are absent from the map,
 * so a note sitting between two steps does not consume a number. */
export function stepNumbers(blocks: DocBlock[]): Map<string, number> {
  const out = new Map<string, number>();
  let n = 0;
  for (const b of blocks) if (b.type === 'step') out.set(b.id, ++n);
  return out;
}

/** The instruction text with the `[!STEP]` marker removed. The marker stays literal in `md` so the
 * block round-trips through markdown; only the presentation strips it. */
export function stepBody(md: string): string {
  return md.replace(STEP_MARKER, '');
}

export function sectionsToMarkdown(sections: DocSection[]): string {
  return sections
    .map((s) => {
      const hasHeading = s.level >= 2 || s.title !== '' || s.number !== '';
      // No trimEnd: a blank level-2 heading must keep its trailing space ('## ')
      // so it re-parses back into a heading rather than collapsing into a preamble.
      const heading = hasHeading
        ? `${'#'.repeat(Math.max(1, s.level))} ${s.number ? `${s.number} ` : ''}${s.title}`
        : '';
      const body = s.blocks.map((b) => b.md).join('\n\n');
      return [heading, body].filter((p) => p.length > 0).join('\n\n');
    })
    .filter((p) => p.length > 0)
    .join('\n\n');
}

export function canonicalizeSections(sections: DocSection[]): string {
  return JSON.stringify(
    sections.map((s) => ({
      id: s.id,
      level: s.level,
      number: s.number,
      title: s.title,
      blocks: s.blocks.map((b) => ({
        id: b.id,
        type: b.type,
        md: b.md,
        calloutKind: b.calloutKind ?? null,
        figureRef: b.figureRef ?? null,
        splitFrom: b.splitFrom ?? null,
        effectivity: b.effectivity ?? null,
      })),
    })),
  );
}

export function checksumForSections(sections: DocSection[]): string {
  return mockSha256(canonicalizeSections(sections));
}

/** The two content-derived DocRevision fields from a single parse — so the
 * rendered `sections` and the signed `mockChecksum` can never diverge. */
export function contentFieldsFromMarkdown(
  markdown: string,
  docId: string,
): { sections: DocSection[]; mockChecksum: string } {
  const sections = sectionsFromMarkdown(markdown, docId);
  return { sections, mockChecksum: checksumForSections(sections) };
}

export function sectionsPlainText(sections: DocSection[]): string {
  return sections.map((s) => `${s.title}\n${s.blocks.map((b) => b.md).join('\n')}`).join('\n');
}
