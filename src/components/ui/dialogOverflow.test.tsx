import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './dialog';
import { Button } from './button';

afterEach(cleanup);

/**
 * TL-39 — DialogContent was `fixed top-1/2 -translate-y-1/2` with no max-height and no
 * overflow. Measured live on /tech-log/aircraft/N5PG in an 800px viewport: the report-defect
 * dialog rendered 1059px tall at top:-130 / bottom:930 — clipped 130px off the TOP and 130px
 * off the BOTTOM at once, with `document.body` scroll-locked by Radix and ZERO scrollable
 * ancestors. Nothing to scroll, and the submit button off-screen.
 *
 * jsdom performs no layout, so a height assertion here would be theatre. What is actually
 * load-bearing and machine-checkable is the class contract on the shared primitive: a bounded
 * height and its own scroll container. Losing either reintroduces the bug for every dialog in
 * the app at once, which is why the guard lives on the primitive and not on one form.
 */
describe('DialogContent overflow contract (TL-39)', () => {
  function openTallDialog() {
    return render(
      <Dialog open>
        {/* Layout fixtures, not real surfaces — nothing to describe, so they take LG-55's
            explicit opt-out rather than inventing copy no user will ever hear. */}
        <DialogContent aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Report defect</DialogTitle>
          </DialogHeader>
          {Array.from({ length: 40 }, (_, i) => (
            <p key={i}>field {i}</p>
          ))}
          <DialogFooter>
            <Button>Continue to sign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>,
    );
  }

  it('bounds its height against the viewport', () => {
    openTallDialog();
    const content = screen.getByRole('dialog');
    // dvh, not vh: on mobile Safari the dynamic toolbar makes 100vh taller than what is
    // actually visible, which would leave the footer under the browser chrome.
    expect(content.className).toMatch(/max-h-\[calc\(100dvh/);
  });

  it('gives itself a scroll container so a clipped region stays reachable', () => {
    openTallDialog();
    expect(screen.getByRole('dialog').className).toMatch(/overflow-y-auto/);
  });

  it('lets its children shrink below their min-content instead of overflowing sideways', () => {
    openTallDialog();
    const content = screen.getByRole('dialog');
    // A grid item's default min-width:auto is what forced 412px children into a 333px box
    // at phone width. Both halves are needed: the column must be allowed to shrink AND the
    // items must be told they may.
    expect(content.className).toMatch(/grid-cols-\[minmax\(0,1fr\)\]/);
    expect(content.className).toMatch(/\[&>\*\]:min-w-0/);
  });

  it('still renders the footer action when the body overflows', () => {
    openTallDialog();
    expect(screen.getByRole('button', { name: /continue to sign/i })).toBeTruthy();
  });

  it('lets a caller override the cap without losing the scroll container', () => {
    render(
      <Dialog open>
        <DialogContent className="max-h-[50dvh]" aria-describedby={undefined}>
          <DialogTitle>Short</DialogTitle>
        </DialogContent>
      </Dialog>,
    );
    const content = screen.getByRole('dialog');
    // tailwind-merge resolves the conflicting max-h in the caller's favour; overflow survives.
    expect(content.className).toContain('max-h-[50dvh]');
    expect(content.className).toMatch(/overflow-y-auto/);
  });
});
