import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * TL-41 — the RAG brand hues are PMS values drawn for print and for fills. As glyphs on a white
 * ground they fail WCAG: amber 1.86:1, green 2.85:1, red 4.02:1, against a 4.5:1 bar for body text.
 * LG-171 then put those hues onto the fleet count numerals, turning a long-standing weakness into an
 * unreadable number.
 *
 * The rule this pins: **fills and strokes keep the brand value, glyphs use the ink.** It is
 * enforceable as a grep because the violation has a single syntactic shape — `text-[var(--gfo-*)]`
 * pointing at a non-ink token — and because a reviewer will not recompute contrast by eye.
 */
const RATIO_FLOOR = 4.5;

function luminance(hex: string): number {
  const c = hex.replace('#', '').match(/../g)!.map(h => {
    const v = parseInt(h, 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
function contrast(a: string, b: string): number {
  const [l1, l2] = [luminance(a), luminance(b)];
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

describe('RAG ink variants clear the contrast bar (TL-41)', () => {
  const WHITE = '#FFFFFF';
  const NAVY = '#0D1F5C'; // the dark-mode ground, which is P&G navy rather than a neutral

  it('the light-mode inks are readable as body text on white', () => {
    for (const [name, hex] of Object.entries({ success: '#00803A', warning: '#8A6200', error: '#C81E2B' })) {
      expect(contrast(hex, WHITE), `${name} ink on white`).toBeGreaterThanOrEqual(RATIO_FLOOR);
    }
  });

  it('the raw brand hues would NOT pass — which is why the inks exist', () => {
    for (const hex of ['#00B140', '#F1B434', '#EF3340']) {
      expect(contrast(hex, WHITE)).toBeLessThan(RATIO_FLOOR);
    }
  });

  it('the dark-mode inks are readable on the navy ground', () => {
    for (const [name, hex] of Object.entries({ success: '#46D07C', warning: '#F1B434', error: '#FF6B76' })) {
      expect(contrast(hex, NAVY), `${name} ink on navy`).toBeGreaterThanOrEqual(RATIO_FLOOR);
    }
  });

  it('keeps the three inks within one perceptual band, so none reads as a heavier idea', () => {
    const ratios = ['#00803A', '#8A6200', '#C81E2B'].map(h => contrast(h, WHITE));
    expect(Math.max(...ratios) - Math.min(...ratios)).toBeLessThan(1.5);
  });
});

describe('no RAG brand hue is used as text (TL-41)', () => {
  it('every text- utility on the RAG axis points at an ink token', () => {
    // Hand-rolled walk rather than a glob helper: node:fs globSync is not in this TS lib version,
    // and pulling a dependency in for one directory walk is not worth it.
    const walk = (dir: string): string[] =>
      readdirSync(dir, { withFileTypes: true }).flatMap(e => {
        const full = join(dir, e.name);
        if (e.isDirectory()) return walk(full);
        return e.name.endsWith('.tsx') ? [full] : [];
      });
    const files = [...walk('src/components/tech-log'), ...walk('src/components/pilot-workspace')];
    expect(files.length).toBeGreaterThan(50); // guard against the glob silently matching nothing

    const offenders: string[] = [];
    for (const file of files) {
      const src = readFileSync(file, 'utf8');
      // `text-[var(--gfo-error,#EF3340)]` is the violation; `-ink` is the fix. bg-/border-/stroke
      // are deliberately untouched — the brand value is correct for a fill.
      for (const m of src.matchAll(/text-\[var\(--gfo-(success|warning|error)(-ink)?[,)]/g)) {
        if (!m[2]) offenders.push(`${file}: ${m[0]}`);
      }
    }
    expect(offenders, `use --gfo-*-ink for glyphs:\n${offenders.join('\n')}`).toEqual([]);
  });
});
