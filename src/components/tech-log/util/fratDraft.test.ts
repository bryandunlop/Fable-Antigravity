import { describe, it, expect } from 'vitest';
import { mergeFratSelections, extractFratSelections } from './fratDraft';

const sections = [
  { title: 'A', items: [{ text: 'a1', selected: false }, { text: 'a2', selected: false }] },
  { title: 'B', items: [{ text: 'b1', selected: false }] },
];

describe('mergeFratSelections', () => {
  it('applies the saved matrix and ignores out-of-range entries', () => {
    const merged = mergeFratSelections(sections, [[true], [true, true]]);
    expect(merged[0].items.map((i) => i.selected)).toEqual([true, false]);
    expect(merged[1].items.map((i) => i.selected)).toEqual([true]);
    // input not mutated
    expect(sections[0].items[0].selected).toBe(false);
  });

  it('returns sections unchanged without a matrix', () => {
    expect(mergeFratSelections(sections, undefined)).toEqual(sections);
  });
});

describe('extractFratSelections', () => {
  it('round-trips through merge', () => {
    const merged = mergeFratSelections(sections, [[true, false], [true]]);
    expect(extractFratSelections(merged)).toEqual([[true, false], [true]]);
  });
});
