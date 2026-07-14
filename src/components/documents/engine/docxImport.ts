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
  const td = new TurndownService({ headingStyle: 'atx', bulletListMarker: '-', codeBlockStyle: 'fenced' });
  td.use(gfm);
  return td;
}

/** Convert mammoth's semantic HTML to markdown (ATX headings, '-' bullets, GFM
 * tables) — the shape `sectionsFromMarkdown` already parses. Pure. */
export function htmlToMarkdown(html: string): string {
  return makeTurndown()
    .turndown(html ?? '')
    .replace(/^(\s*(?:[-*+]|\d+\.))[ \t]+/gm, '$1 ') // collapse turndown's list-marker padding
    .replace(/\n{3,}/g, '\n\n')
    .trim();
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
  /** mammoth conversion warnings (unrecognized styles, dropped content) — surfaced to the importer. */
  warnings: string[];
}

/** Parse a .docx ArrayBuffer into a title + markdown body. Async (mammoth). The
 * caller opens the editor in create mode prefilled with this — the author fills
 * class/audience/ack and saves through the normal four-eyes flow. */
export async function docxToImport(arrayBuffer: ArrayBuffer): Promise<DocxImportResult> {
  const mammoth = (await import('mammoth')).default ?? (await import('mammoth'));
  const result = await mammoth.convertToHtml({ arrayBuffer });
  const markdown = htmlToMarkdown(result.value);
  return {
    title: titleFromMarkdown(markdown),
    markdown,
    warnings: result.messages.filter((m) => m.type === 'warning' || m.type === 'error').map((m) => m.message),
  };
}
