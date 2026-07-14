import { describe, it, expect } from 'vitest';
import { toCsv } from './exportUtils';

describe('toCsv', () => {
  it('quotes every cell and doubles embedded double-quotes', () => {
    expect(toCsv(['A'], [['he said "hi"']])).toBe('"A"\n"he said ""hi"""');
  });

  it('neutralizes formula-injection leading characters with a single quote (C10)', () => {
    const lines = toCsv(
      ['Title'],
      [['=HYPERLINK("http://x","click")'], ['+1'], ['-2'], ['@SUM(A1)'], ['safe title']],
    ).split('\n');
    expect(lines[1]).toBe(`"'=HYPERLINK(""http://x"",""click"")"`);
    expect(lines[2]).toBe(`"'+1"`);
    expect(lines[3]).toBe(`"'-2"`);
    expect(lines[4]).toBe(`"'@SUM(A1)"`);
    expect(lines[5]).toBe('"safe title"'); // untouched — no prefix
  });

  it('neutralizes a leading tab, carriage return, or line feed', () => {
    expect(toCsv(['H'], [['\t=1']]).split('\n')[1]).toBe(`"'\t=1"`);
  });
});
