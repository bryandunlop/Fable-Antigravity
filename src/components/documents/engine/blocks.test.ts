import { describe, it, expect } from 'vitest';
import {
  sectionsFromMarkdown,
  sectionsToMarkdown,
  canonicalizeSections,
  checksumForSections,
  sectionsPlainText,
} from './blocks';

const GOM = `# General Operations Manual — Chapter 3

## 3.1 Operational Control
The Director of Operations exercises operational control.

## 3.2 Fuel Policy
Plan destination + reserve.

- Reserve is 45 minutes
- PIC may increase fuel`;

describe('sectionsFromMarkdown', () => {
  it('makes a level-1 preamble from the H1 and a section per H2', () => {
    const s = sectionsFromMarkdown(GOM, 'GOM-3');
    expect(s.map((x) => x.title)).toEqual([
      'General Operations Manual — Chapter 3',
      'Operational Control',
      'Fuel Policy',
    ]);
    expect(s[0].level).toBe(1);
    expect(s[1].level).toBe(2);
  });

  it('parses a leading number out of the heading', () => {
    const s = sectionsFromMarkdown(GOM, 'GOM-3');
    expect(s[1].number).toBe('3.1');
    expect(s[1].title).toBe('Operational Control');
    expect(s[0].number).toBe('');
  });

  it('gives deterministic ids from docId + heading slug', () => {
    const a = sectionsFromMarkdown(GOM, 'GOM-3');
    const b = sectionsFromMarkdown(GOM, 'GOM-3');
    expect(a[1].id).toBe('GOM-3::operational-control');
    expect(a[1].id).toBe(b[1].id);
    expect(a[1].blocks[0].id).toBe('GOM-3::operational-control::b0');
  });

  it('classifies a contiguous bullet run as one list block', () => {
    const s = sectionsFromMarkdown(GOM, 'GOM-3');
    const fuel = s[2];
    const kinds = fuel.blocks.map((b) => b.type);
    expect(kinds).toEqual(['paragraph', 'list']);
    expect(fuel.blocks[1].md).toContain('- Reserve is 45 minutes');
  });

  it('detects a GFM table block', () => {
    const md = `## Limits\n\n| Item | Value |\n| --- | --- |\n| Vref | 120 |`;
    const s = sectionsFromMarkdown(md, 'SOP-9');
    expect(s[0].blocks[0].type).toBe('table');
  });

  it('detects a GFM alert as a callout with its kind', () => {
    const md = `## Warnings\n\n> [!WARNING]\n> Do not exceed the limit.`;
    const s = sectionsFromMarkdown(md, 'SOP-9');
    expect(s[0].blocks[0].type).toBe('callout');
    expect(s[0].blocks[0].calloutKind).toBe('warning');
  });

  it('detects an image-only paragraph as a figure block', () => {
    const md = `## Diagram\n\n![ramp map](/img/ramp.png)`;
    const s = sectionsFromMarkdown(md, 'TK-9');
    expect(s[0].blocks[0].type).toBe('figure');
    expect(s[0].blocks[0].figureRef).toBe('/img/ramp.png');
  });

  it('handles content with no headings as a single untitled section', () => {
    const s = sectionsFromMarkdown('Just a note.\n\nSecond para.', 'TK-1');
    expect(s).toHaveLength(1);
    expect(s[0].title).toBe('');
    expect(s[0].blocks).toHaveLength(2);
  });

  it('de-duplicates ids when two headings share text', () => {
    const md = `## Notes\n\nA\n\n## Notes\n\nB`;
    const s = sectionsFromMarkdown(md, 'D-1');
    expect(s[0].id).toBe('D-1::notes');
    expect(s[1].id).toBe('D-1::notes-2');
  });
});

describe('round-trip', () => {
  it('re-parsing sectionsToMarkdown yields the same tree (idempotent)', () => {
    const once = sectionsFromMarkdown(GOM, 'GOM-3');
    const twice = sectionsFromMarkdown(sectionsToMarkdown(once), 'GOM-3');
    expect(twice).toEqual(once);
  });
});

describe('degenerate & extra-coverage cases', () => {
  it('keeps ids stable and round-trips a blank heading after a leading blank line', () => {
    const md = '\n## \n\nReal content.';
    const once = sectionsFromMarkdown(md, 'DOC');
    expect(once).toHaveLength(1);
    expect(once[0].id).toBe('DOC::untitled');
    const twice = sectionsFromMarkdown(sectionsToMarkdown(once), 'DOC');
    expect(twice).toEqual(once);
    expect(checksumForSections(twice)).toBe(checksumForSections(once));
  });

  it('classifies an H3+ line inside a section body as a heading block', () => {
    const s = sectionsFromMarkdown('## Parent\n\n### Sub heading\n\nText.', 'D-2');
    expect(s[0].blocks[0].type).toBe('heading');
    expect(s[0].blocks[1].type).toBe('paragraph');
  });

  it('returns an empty array for empty input', () => {
    expect(sectionsFromMarkdown('', 'D-3')).toEqual([]);
  });
});

describe('canonicalizeSections / checksum', () => {
  it('is stable regardless of object key insertion order', () => {
    const s = sectionsFromMarkdown(GOM, 'GOM-3');
    const reordered = s.map((sec) => ({
      blocks: sec.blocks.map((b) => ({ md: b.md, type: b.type, id: b.id })),
      title: sec.title, number: sec.number, level: sec.level, id: sec.id,
    })) as unknown as typeof s;
    expect(canonicalizeSections(reordered)).toBe(canonicalizeSections(s));
  });

  it('changes when block text changes', () => {
    const a = sectionsFromMarkdown(GOM, 'GOM-3');
    const b = sectionsFromMarkdown(GOM.replace('45 minutes', '60 minutes'), 'GOM-3');
    expect(checksumForSections(a)).not.toBe(checksumForSections(b));
  });
});

describe('sectionsPlainText', () => {
  it('returns non-empty text when any block has content', () => {
    const s = sectionsFromMarkdown(GOM, 'GOM-3');
    expect(sectionsPlainText(s).trim().length).toBeGreaterThan(0);
  });
  it('is empty for an empty tree', () => {
    expect(sectionsPlainText([]).trim()).toBe('');
  });
});
