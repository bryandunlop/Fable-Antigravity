import { describe, it, expect } from 'vitest';
import { linesFromTextItems, charWidth, type PdfTextItem } from './layout';

const at = (str: string, x: number, y: number, perChar = 5): PdfTextItem => ({
  str,
  transform: [1, 0, 0, 1, x, y],
  width: str.length * perChar,
});

describe('linesFromTextItems', () => {
  it('groups items by baseline and places them in their own columns', () => {
    const lines = linesFromTextItems([
      at('Dispatch Consideration', 400, 700),
      at('Item #', 50, 700),
      at('Item', 100, 700),
      at('2-31', 50, 680),
      at('Wing Anti-Ice', 100, 680),
    ]);

    expect(lines).toHaveLength(2);
    expect(lines[0].indexOf('Item #')).toBe(0);
    // Both rows must agree on where the columns start, or the parser slices the wrong text.
    expect(lines[1].indexOf('2-31')).toBe(lines[0].indexOf('Item #'));
    expect(lines[1].indexOf('Wing Anti-Ice')).toBe(lines[0].indexOf('Item', 6));
  });

  it('treats baselines a fraction apart as one line', () => {
    expect(linesFromTextItems([at('a', 50, 700), at('b', 80, 700.4)])).toHaveLength(1);
  });

  it('separates rather than overlaps when two fragments claim the same column', () => {
    const [line] = linesFromTextItems([at('abcdef', 50, 700), at('ghi', 52, 700)]);
    expect(line).toBe('abcdef ghi');
  });

  it('uses a median character width so one wide heading cannot shear the columns', () => {
    const items = [at('body text here', 50, 700, 5), at('body text here', 50, 690, 5), at('T', 50, 720, 60)];
    expect(charWidth(items)).toBe(5);
  });

  it('emits nothing when no glyph has a measurable width', () => {
    // There is no scale to place columns against; guessing one produces plausible rubbish.
    expect(linesFromTextItems([{ str: 'abc', transform: [1, 0, 0, 1, 50, 700], width: 0 }])).toEqual([]);
  });
});
