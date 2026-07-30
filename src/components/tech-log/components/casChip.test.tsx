import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CasChip } from './CasChip';
import { ServiceabilityChip } from './ServiceabilityChip';
import { SERVICEABILITY_CLASS } from '../constants';
import type { CasColor } from '../types';

/**
 * D57 CAS chip vs D33 RAG serviceability chip — two axes that must not be confusable.
 *
 * D33 reserves amber for **airworthiness serviceability**. The custody axis already had a gold dot
 * retired for colliding with it (see `.gfo-dot-maint` in `index.css`), so a CAS amber rendered in
 * the RAG chip's own language would recreate exactly the collision that decision exists to prevent.
 * The CAS chip is therefore a flight-deck annunciator — a squared dark tile with uppercase
 * monospace glyph text — and shares no class with the serviceability chip. These tests fail if
 * anyone re-skins it as a status pill.
 */

describe('CasChip', () => {
  it('renders the CAS message annunciator-style: uppercase, on a dark tile', () => {
    render(<CasChip message="r eng chip" color="RED" />);
    const chip = screen.getByTestId('cas-chip');
    expect(chip).toHaveTextContent(/r eng chip/i);
    expect(chip.className).toContain('cas-tile');
    expect(chip.className).toContain('cas-red');
    // uppercase is a render-time transform; the stored message is not rewritten
    expect(chip.textContent).toContain('r eng chip');
  });

  it('carries a distinct class per CAS color', () => {
    const { rerender } = render(<CasChip message="X" color="WHITE" />);
    expect(screen.getByTestId('cas-chip').className).toContain('cas-white');
    rerender(<CasChip message="X" color="CYAN" />);
    expect(screen.getByTestId('cas-chip').className).toContain('cas-cyan');
    rerender(<CasChip message="X" color="AMBER" />);
    expect(screen.getByTestId('cas-chip').className).toContain('cas-amber');
    rerender(<CasChip message="X" color="RED" />);
    expect(screen.getByTestId('cas-chip').className).toContain('cas-red');
  });

  /**
   * The tier is the point on a flight deck, and ~8% of men have a colour-vision deficiency — so
   * hue may not be the ONLY thing separating WHITE / CYAN / AMBER / RED. Each tile names its tier
   * in visually-hidden text, and the two act-now tiers additionally carry a shape. These tests
   * pass only while the tier survives with every colour stripped out.
   */
  it('names its tier in text, so the tier is announced and not merely coloured', () => {
    const { rerender } = render(<CasChip message="X" color="AMBER" />);
    expect(screen.getByTestId('cas-chip')).toHaveTextContent(/amber/i);
    rerender(<CasChip message="X" color="RED" />);
    expect(screen.getByTestId('cas-chip')).toHaveTextContent(/red/i);
    rerender(<CasChip message="X" color="CYAN" />);
    expect(screen.getByTestId('cas-chip')).toHaveTextContent(/cyan/i);
    rerender(<CasChip message="X" color="WHITE" />);
    expect(screen.getByTestId('cas-chip')).toHaveTextContent(/white/i);
  });

  it('distinguishes all four tiers with colour removed entirely', () => {
    const colors: CasColor[] = ['WHITE', 'CYAN', 'AMBER', 'RED'];
    // Same message on every tile: anything that tells them apart here is non-hue by construction,
    // because textContent carries no class and no colour.
    const texts = colors.map(c => {
      const { container, unmount } = render(<CasChip message="CABIN TEMP" color={c} />);
      const text = container.textContent ?? '';
      unmount();
      return text;
    });
    expect(new Set(texts).size).toBe(4);
  });

  it('marks the two act-now tiers with a shape as well as a colour', () => {
    const glyphOf = (c: CasColor) => {
      const { container, unmount } = render(<CasChip message="X" color={c} />);
      const g = container.querySelector('[data-testid="cas-glyph"]')?.textContent;
      unmount();
      return g;
    };
    expect(glyphOf('RED')).toBeTruthy();
    expect(glyphOf('AMBER')).toBeTruthy();
    expect(glyphOf('RED')).not.toBe(glyphOf('AMBER'));
    // The glyph is a tier mark, not decoration — the advisory tiers get none.
    expect(glyphOf('WHITE')).toBeUndefined();
    expect(glyphOf('CYAN')).toBeUndefined();
  });

  /**
   * "OBSERVED" alone read as a triage state ("someone has looked at this"), especially in the
   * defects-tab run `ATA 21 · DEFERRED · OBSERVED`. The meaning lived only in a `title` tooltip,
   * which never fires on the Capacitor touch build.
   */
  it('renders "observed, no CAS" as a muted outline chip labeled NO CAS — not as a fifth color', () => {
    render(<CasChip observed />);
    const chip = screen.getByTestId('cas-chip');
    expect(chip).toHaveTextContent('NO CAS');
    expect(chip.textContent).not.toMatch(/^OBSERVED$/);
    expect(chip.className).toContain('cas-observed');
    expect(chip.className).not.toContain('cas-tile');
    expect(chip.className).not.toMatch(/cas-(white|cyan|amber|red)/);
  });

  it('renders nothing when the defect has no CAS aspect at all', () => {
    const { container } = render(<CasChip />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shares no styling language with the RAG serviceability chip (D33)', () => {
    const { container: cas } = render(<CasChip message="CABIN TEMP" color="AMBER" />);
    const { container: rag } = render(<ServiceabilityChip status="AMBER" pulse={false} />);
    const casClasses = new Set(cas.firstElementChild!.className.split(/\s+/));
    const ragClasses = rag.firstElementChild!.className.split(/\s+/);

    // The serviceability chip's own vocabulary — pill shape, tinted status utility — must not leak
    // into the CAS chip, and vice versa.
    expect(ragClasses).toContain('status-badge');
    expect(ragClasses).toContain(SERVICEABILITY_CLASS.AMBER);
    for (const c of ragClasses) expect(casClasses.has(c)).toBe(false);
  });
});
