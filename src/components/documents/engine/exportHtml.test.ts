import { describe, it, expect } from 'vitest';
import { escapeHtml, inlineMd, blockToHtml, sectionsToHtml } from './exportHtml';
import type { DocBlock, DocSection } from '../types';

const b = (over: Partial<DocBlock>): DocBlock => ({ id: 'b', type: 'paragraph', md: '', ...over });

describe('escapeHtml', () => {
  it('escapes html-significant chars', () => {
    expect(escapeHtml('a < b & "c"')).toBe('a &lt; b &amp; &quot;c&quot;');
  });
});

describe('inlineMd', () => {
  it('applies bold, italic, code, link on escaped text', () => {
    expect(inlineMd('a **b** c')).toContain('<strong>b</strong>');
    expect(inlineMd('use `x`')).toContain('<code>x</code>');
    expect(inlineMd('[t](http://x)')).toContain('<a href="http://x">t</a>');
  });
});

describe('blockToHtml', () => {
  it('renders paragraph with inline formatting', () => {
    expect(blockToHtml(b({ md: 'Gate is **1,000** ft' }))).toBe('<p>Gate is <strong>1,000</strong> ft</p>');
  });
  it('renders a list', () => {
    expect(blockToHtml(b({ type: 'list', md: '- a\n- b' }))).toBe('<ul><li>a</li><li>b</li></ul>');
  });
  it('renders a warning callout with label', () => {
    const h = blockToHtml(b({ type: 'callout', calloutKind: 'warning', md: '> [!WARNING]\n> Do not exceed VMO.' }));
    expect(h).toContain('callout-warning');
    expect(h).toContain('Do not exceed VMO.');
  });
  it('renders a figure', () => {
    expect(blockToHtml(b({ type: 'figure', md: '![diagram](/x.png)' }))).toContain('<img src="/x.png" alt="diagram"');
  });
  it('escapes malicious content', () => {
    expect(blockToHtml(b({ md: '<script>alert(1)</script>' }))).not.toContain('<script>');
  });
});

describe('sectionsToHtml', () => {
  it('wraps sections with headings', () => {
    const sections: DocSection[] = [{ id: 's', level: 2, number: '3.1', title: 'Criteria', blocks: [b({ md: 'x' })] }];
    const h = sectionsToHtml(sections);
    expect(h).toContain('<h2 class="sec">3.1 Criteria</h2>');
    expect(h).toContain('<p>x</p>');
  });
});

describe('step blocks', () => {
  it('renders a step with its number and lifts the photo out of the prose', () => {
    const html = blockToHtml(b({ type: 'step', md: '[!STEP] Open the panel.\n![panel](/img/x.jpg)' }), 3);
    expect(html).toContain('class="step"');
    expect(html).toContain('<p class="step-n">3</p>');
    expect(html).toContain('Open the panel.');
    expect(html).not.toContain('[!STEP]');
    expect(html).toContain('src="/img/x.jpg"');
  });

  it('numbers steps per section, and a note between them consumes no number', () => {
    const s: DocSection[] = [{
      id: 's', level: 2, number: '', title: 'Reset the cabin wifi',
      blocks: [
        b({ id: 'b0', type: 'step', md: '[!STEP] One.' }),
        b({ id: 'b1', type: 'callout', calloutKind: 'caution', md: '> [!CAUTION]\n> Careful.' }),
        b({ id: 'b2', type: 'step', md: '[!STEP] Two.' }),
      ],
    }];
    const html = sectionsToHtml(s);
    expect(html).toContain('<p class="step-n">1</p>');
    expect(html).toContain('<p class="step-n">2</p>');
    expect(html).not.toContain('<p class="step-n">3</p>');
  });
});
