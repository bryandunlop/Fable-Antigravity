import { describe, it, expect } from 'vitest';
import {
  sectionsFromMarkdown,
  sectionsToMarkdown,
  canonicalizeSections,
  checksumForSections,
  sectionsPlainText,
  classifyBlockMd,
  stepNumbers,
} from './blocks';

describe('classifyBlockMd', () => {
  it('classifies paragraph, list, callout, figure', () => {
    expect(classifyBlockMd('Just a sentence.').type).toBe('paragraph');
    expect(classifyBlockMd('- a\n- b').type).toBe('list');
    const c = classifyBlockMd('> [!WARNING]\n> Do not exceed VMO.');
    expect(c.type).toBe('callout');
    expect(c.calloutKind).toBe('warning');
    const f = classifyBlockMd('![diagram](/img/x.png)');
    expect(f.type).toBe('figure');
    expect(f.figureRef).toBe('/img/x.png');
  });
});

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

  it('keeps a fenced code block with an internal blank line as one block', () => {
    const md = '## Snippet\n\n```js\nconst a = 1;\n\nconst b = 2;\n```';
    const s = sectionsFromMarkdown(md, 'D-4');
    expect(s[0].blocks).toHaveLength(1);
    expect(s[0].blocks[0].md).toBe('```js\nconst a = 1;\n\nconst b = 2;\n```');
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

describe('step blocks (Ship Notes task cards)', () => {
  const WIFI = [
    '## Reset the cabin wifi',
    '',
    '[!STEP] Open the aft left cabinet and locate the CMS router panel.',
    '![router panel](/img/n1pg-router.jpg)',
    '',
    '[!STEP] Hold the reset pin for 10 seconds until the amber light blinks twice.',
    '',
    '> [!CAUTION]',
    '> A shorter press reboots without clearing the stored password.',
    '',
    '[!STEP] Rejoin from a phone to confirm, then update the galley password card.',
  ].join('\n');

  it('classifies a [!STEP] chunk as a step and lifts its image into figureRef', () => {
    const c = classifyBlockMd('[!STEP] Open the panel.\n![panel](/img/x.jpg)');
    expect(c.type).toBe('step');
    expect(c.figureRef).toBe('/img/x.jpg');
  });

  it('classifies a step with no image, leaving figureRef unset', () => {
    const c = classifyBlockMd('[!STEP] Hold the reset pin for 10 seconds.');
    expect(c.type).toBe('step');
    expect(c.figureRef).toBeUndefined();
  });

  it('does not mistake an ordinary paragraph or an ordered list for a step', () => {
    expect(classifyBlockMd('Open the panel.').type).toBe('paragraph');
    expect(classifyBlockMd('1. Open the panel.\n2. Close it.').type).toBe('list');
  });

  it('numbers steps from position within the section, skipping non-step blocks', () => {
    const [section] = sectionsFromMarkdown(WIFI, 'TK-9');
    const nums = stepNumbers(section.blocks);
    const steps = section.blocks.filter((b) => b.type === 'step');
    expect(steps).toHaveLength(3);
    expect(steps.map((b) => nums.get(b.id))).toEqual([1, 2, 3]);
    // The caution between steps 2 and 3 is not a step and gets no number.
    const callout = section.blocks.find((b) => b.type === 'callout')!;
    expect(nums.get(callout.id)).toBeUndefined();
  });

  it('renumbers with no author action when a middle step is removed', () => {
    const [section] = sectionsFromMarkdown(WIFI, 'TK-9');
    const steps = section.blocks.filter((b) => b.type === 'step');
    const without = section.blocks.filter((b) => b.id !== steps[1].id);
    const nums = stepNumbers(without);
    const remaining = without.filter((b) => b.type === 'step');
    expect(remaining.map((b) => nums.get(b.id))).toEqual([1, 2]);
  });

  it('round-trips through markdown, keeping the step marker literal', () => {
    const [section] = sectionsFromMarkdown(WIFI, 'TK-9');
    const back = sectionsFromMarkdown(sectionsToMarkdown([section]), 'TK-9');
    expect(back[0].blocks.map((b) => b.type)).toEqual(section.blocks.map((b) => b.type));
  });

  it('leaves the canonical checksum shape unchanged — step adds no new field', () => {
    const [section] = sectionsFromMarkdown(WIFI, 'TK-9');
    const keys = Object.keys(JSON.parse(canonicalizeSections([section]))[0].blocks[0]);
    expect(keys.sort()).toEqual(
      ['calloutKind', 'effectivity', 'figureRef', 'id', 'md', 'splitFrom', 'type'].sort(),
    );
    expect(checksumForSections([section])).toMatch(/^[0-9a-f]+$/);
  });
});
