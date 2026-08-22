/**
 * Reconstruct fixed-width text lines from a PDF's positioned text items — the
 * in-browser equivalent of `pdftotext -layout`.
 *
 * The layout flag is load-bearing for the D195 MELs (D95): they are column tables whose
 * column x-positions are read off each page's own header row, because the indentation
 * drifts page to page. A reading-order text dump loses the columns entirely and the
 * parser has nothing to slice.
 *
 * This is deliberately free of any pdf.js import so it can be tested against hand-built
 * item lists. The pdf.js call that produces `PdfTextItem[]` lives at the UI boundary.
 */

export interface PdfTextItem {
  str: string;
  /** pdf.js text-item transform; [4] is x, [5] is y, in PDF user space. */
  transform: number[];
  /** Advance width of `str` in the same units as the transform. */
  width: number;
}

/** Two items whose baselines differ by less than this are on the same visual line. */
const LINE_EPSILON = 2;

/**
 * Median advance-width of a single character across the page.
 *
 * A median rather than a mean: headings and the odd wide glyph are outliers that would
 * drag a mean and shear every column on the page by a character or two. Items with no
 * measurable width (empty or zero-advance strings) carry no information and are skipped
 * rather than counted as zero, which would halve the estimate.
 */
export function charWidth(items: PdfTextItem[]): number {
  const widths = items
    .filter(it => it.str.length > 0 && it.width > 0)
    .map(it => it.width / it.str.length)
    .sort((a, b) => a - b);
  if (widths.length === 0) return 0;
  return widths[Math.floor(widths.length / 2)];
}

export function linesFromTextItems(items: PdfTextItem[]): string[] {
  if (items.length === 0) return [];

  const unit = charWidth(items);
  // Every glyph was zero-width: there is no scale to place columns against, and guessing
  // one would silently produce plausible-looking rubbish. Emit nothing and let the
  // caller's zero-warnings gate refuse the import.
  if (unit <= 0) return [];

  const originX = Math.min(...items.map(it => it.transform[4]));

  const rows: { y: number; items: PdfTextItem[] }[] = [];
  for (const it of [...items].sort((a, b) => b.transform[5] - a.transform[5])) {
    const y = it.transform[5];
    const row = rows[rows.length - 1];
    if (row && Math.abs(row.y - y) < LINE_EPSILON) row.items.push(it);
    else rows.push({ y, items: [it] });
  }

  return rows.map(row => {
    let line = '';
    for (const it of row.items.sort((a, b) => a.transform[4] - b.transform[4])) {
      const col = Math.round((it.transform[4] - originX) / unit);
      // Never pull a fragment left of where it sits: overlapping the previous one would
      // corrupt both. A single separating space is the least-lying repair.
      if (col > line.length) line += ' '.repeat(col - line.length);
      else if (line.length > 0 && !line.endsWith(' ')) line += ' ';
      line += it.str;
    }
    return line.trimEnd();
  });
}
