import { describe, it, expect } from 'vitest';
import { htmlToMarkdown, titleFromMarkdown } from './docxImport';
import { sectionsFromMarkdown } from './blocks';

describe('htmlToMarkdown', () => {
  it('converts headings to ATX markdown', () => {
    const md = htmlToMarkdown('<h1>Manual</h1><h2>Purpose</h2><h3>Detail</h3>');
    expect(md).toContain('# Manual');
    expect(md).toContain('## Purpose');
    expect(md).toContain('### Detail');
  });

  it('converts paragraphs and inline emphasis', () => {
    const md = htmlToMarkdown('<p>The <strong>PIC</strong> is <em>responsible</em>.</p>');
    expect(md).toBe('The **PIC** is _responsible_.');
  });

  it('converts unordered and ordered lists', () => {
    const ul = htmlToMarkdown('<ul><li>first</li><li>second</li></ul>');
    expect(ul).toBe('- first\n- second');
    const ol = htmlToMarkdown('<ol><li>step one</li><li>step two</li></ol>');
    expect(ol).toContain('1. step one');
    expect(ol).toContain('2. step two');
  });

  it('converts a table to GFM (via the gfm plugin)', () => {
    const md = htmlToMarkdown(
      '<table><thead><tr><th>Item</th><th>Value</th></tr></thead><tbody><tr><td>Vref</td><td>120</td></tr></tbody></table>',
    );
    expect(md).toContain('| Item | Value |');
    expect(md).toMatch(/\|\s*-+\s*\|/); // separator row
    expect(md).toContain('| Vref | 120 |');
  });

  it('collapses excess blank lines and trims', () => {
    expect(htmlToMarkdown('<p>a</p><p></p><p></p><p>b</p>')).toBe('a\n\nb');
  });

  it('is empty for empty/whitespace input', () => {
    expect(htmlToMarkdown('')).toBe('');
    expect(htmlToMarkdown('<p> </p>')).toBe('');
  });
});

describe('titleFromMarkdown', () => {
  it('extracts the first H1 as the title', () => {
    expect(titleFromMarkdown('# Ground Icing Ops\n\n## Purpose\nText')).toBe('Ground Icing Ops');
  });
  it('is empty when there is no H1', () => {
    expect(titleFromMarkdown('## Section only\n\nbody')).toBe('');
  });
  it('ignores an H2 that precedes no H1', () => {
    expect(titleFromMarkdown('## Not a title\n# Real Title')).toBe('Real Title');
  });
});

describe('import → block model round-trip', () => {
  it('imported .docx markdown parses into a correct section/block tree', () => {
    const html = '<h1>GOM Ch.4</h1><h2>4.1 Deicing</h2><p>Apply Type IV.</p><ul><li>check holdover</li></ul>';
    const md = htmlToMarkdown(html);
    const title = titleFromMarkdown(md);
    const sections = sectionsFromMarkdown(md, 'GOM-4');
    expect(title).toBe('GOM Ch.4');
    expect(sections.map((s) => s.title)).toEqual(['GOM Ch.4', 'Deicing']);
    expect(sections[1].number).toBe('4.1');
    // the H2 section has a paragraph then a list block
    expect(sections[1].blocks.map((b) => b.type)).toEqual(['paragraph', 'list']);
  });
});
