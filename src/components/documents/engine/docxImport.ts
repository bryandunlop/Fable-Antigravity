// .docx seed import: mammoth (docx → semantic HTML) → turndown (HTML → markdown)
// → the existing markdown→sections pipeline. The HTML→markdown conversion and
// title extraction are pure + unit-tested; the mammoth call is a thin async
// browser wrapper. Produces a markdown draft the author reviews before saving —
// no auto-publish (spec §7: import is a one-time seed into a draft revision).
import TurndownService from 'turndown';
// turndown-plugin-gfm ships no types; it exposes a `gfm` plugin (tables, strikethrough).
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore -- no type declarations for turndown-plugin-gfm
import { gfm } from 'turndown-plugin-gfm';

function makeTurndown(): TurndownService {
  const td = new TurndownService({ headingStyle: 'atx', bulletListMarker: '-' });
  td.use(gfm);
  return td;
}

/** Convert mammoth's semantic HTML to markdown (ATX headings, '-' bullets, GFM
 * tables) — the shape `sectionsFromMarkdown` already parses. Normalizes turndown's
 * list-marker padding and collapses excess blank lines, but never inside a fenced
 * code block (mirrors blocks.ts's `inFence` discipline). Pure. */
export function htmlToMarkdown(html: string): string {
  const raw = makeTurndown().turndown(html ?? '');
  const out: string[] = [];
  let inFence = false;
  let blanks = 0;
  for (const line of raw.split('\n')) {
    if (/^\s*```/.test(line)) { inFence = !inFence; out.push(line); blanks = 0; continue; }
    if (inFence) { out.push(line); continue; }
    if (line.trim() === '') { blanks += 1; if (blanks <= 1) out.push(''); continue; } // collapse blank runs to one
    blanks = 0;
    out.push(line.replace(/^(\s*(?:[-*+]|\d+\.))[ \t]+/, '$1 ')); // collapse list-marker padding
  }
  return out.join('\n').trim();
}

/** The document title is the first H1 in the imported markdown (kept in the body
 * too, as the seed content does). No H1 → empty title, whole markdown as body. */
export function titleFromMarkdown(markdown: string): string {
  const m = markdown.split('\n').find((l) => /^#\s+\S/.test(l));
  return m ? m.replace(/^#\s+/, '').trim() : '';
}

export interface DocxImportResult {
  title: string;
  markdown: string;
  /** Import notes surfaced to the importer: mammoth warnings + dropped-image count. */
  warnings: string[];
}

/** Parse a .docx ArrayBuffer into a title + markdown body. Async (mammoth).
 * Embedded images are dropped (Word data-URI images bloat storage and don't render
 * through the markdown reader) and reported as a warning. The caller opens the
 * editor in create mode prefilled — the author fills class/audience/ack and saves
 * through the normal four-eyes flow. */
export async function docxToImport(arrayBuffer: ArrayBuffer): Promise<DocxImportResult> {
  const mod = await import('mammoth');
  const mammoth = mod.default ?? mod;
  const result = await mammoth.convertToHtml({ arrayBuffer });
  const imageCount = (result.value.match(/<img\b/gi) ?? []).length;
  const html = result.value.replace(/<img\b[^>]*>/gi, ''); // drop base64 images before markdown
  const warnings = result.messages.map((m) => m.message);
  if (imageCount > 0) warnings.push(`${imageCount} image${imageCount === 1 ? ' was' : 's were'} not imported.`);
  const markdown = htmlToMarkdown(html);
  return { title: titleFromMarkdown(markdown), markdown, warnings };
}
