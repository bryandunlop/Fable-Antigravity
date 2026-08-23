/**
 * Read an approved MEL PDF in the browser (D95).
 *
 * pdf.js gives positioned text items; `layout.ts` turns them back into the fixed-width
 * lines the parser slices. Layout is computed PER PAGE — the origin and the character
 * width are properties of a page, and averaging them across a 218-page document would
 * shear every column.
 *
 * `pageOfLine` is kept so a parsed row can be shown beside the page it came from. An
 * approver who wants to check one row should not have to go looking for it.
 */
import * as pdfjs from 'pdfjs-dist';
import { linesFromTextItems, type PdfTextItem } from './layout';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

export interface PdfText {
  lines: string[];
  /** 1-based PDF page each line came from, index-aligned with `lines`. */
  pageOfLine: number[];
  pageCount: number;
}

export async function readPdfText(
  data: ArrayBuffer,
  onProgress?: (page: number, total: number) => void,
): Promise<{ text: PdfText; doc: pdfjs.PDFDocumentProxy }> {
  const doc = await pdfjs.getDocument({ data }).promise;
  const lines: string[] = [];
  const pageOfLine: number[] = [];

  for (let n = 1; n <= doc.numPages; n += 1) {
    const page = await doc.getPage(n);
    const content = await page.getTextContent();
    // TextContent mixes text items with marked-content markers; only the former carry a string.
    const items = content.items.filter(i => 'str' in i) as unknown as PdfTextItem[];
    for (const line of linesFromTextItems(items)) {
      lines.push(line);
      pageOfLine.push(n);
    }
    onProgress?.(n, doc.numPages);
  }

  return { text: { lines, pageOfLine, pageCount: doc.numPages }, doc };
}

/**
 * The PDF page a parsed row was read from — the first line whose leading token is the
 * item number. Null when it cannot be located, which is shown as "page unknown" rather
 * than guessed: pointing an approver at the wrong page is worse than showing none.
 */
export function pageForItem(text: PdfText, subItemNumber: string): number | null {
  const idx = text.lines.findIndex(l => l.trimStart().startsWith(subItemNumber));
  return idx === -1 ? null : text.pageOfLine[idx];
}
