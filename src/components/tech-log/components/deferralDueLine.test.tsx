import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { DeferralDueLine } from './DeferralDueLine';
import { DeferralClock } from './DeferralClock';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

/**
 * LG-155 — the drain ring existed but rendered on exactly one surface (the FleetStatus
 * tile). Every other deferral surface date-diffed a string into "· 3d left". These tests
 * pin the shared line so the ring cannot silently fall back out of the other four.
 */
describe('DeferralDueLine', () => {
  const CAT_C = {
    clockStartUtc: '2026-07-25T04:00:00.000Z',
    repairDueUtc: '2026-08-04T04:00:00.000Z',
    category: 'C' as const,
    dueLabel: 'due 04 Aug',
  };

  it('renders the drain ring alongside the due label', () => {
    vi.setSystemTime(new Date('2026-08-02T00:00:00.000Z'));
    const { container } = render(<DeferralDueLine {...CAT_C} />);

    expect(container.querySelector('svg')).not.toBeNull();
    expect(screen.getByText('due 04 Aug')).toBeTruthy();
  });

  it('lets the ring carry the remaining time so it is not stated twice', () => {
    vi.setSystemTime(new Date('2026-08-02T00:00:00.000Z'));
    const { container } = render(<DeferralDueLine {...CAT_C} />);

    // The ring's own label is the only place remaining time appears.
    expect(container.textContent).toContain('left');
    expect(container.textContent!.match(/left/g)).toHaveLength(1);
  });

  it('falls back to an iconed text line when there is no calendar interval to drain', () => {
    // Usage-based: no repairDueUtc, so readDeferralClock yields nothing.
    const { container } = render(
      <DeferralDueLine
        clockStartUtc={CAT_C.clockStartUtc}
        repairDueUtc={undefined}
        category="A"
        dueLabel="due per proviso"
      />,
    );

    expect(container.querySelector('svg')).not.toBeNull(); // the lucide Clock icon
    expect(screen.getByText(/due per proviso/)).toBeTruthy();
    expect(container.textContent).not.toContain('left');
  });

  it('surfaces a used extension without hiding it behind the ring', () => {
    vi.setSystemTime(new Date('2026-08-02T00:00:00.000Z'));
    render(<DeferralDueLine {...CAT_C} extended />);
    expect(screen.getByText(/extended/)).toBeTruthy();
  });

  it('reads overdue rather than a negative remaining time', () => {
    vi.setSystemTime(new Date('2026-08-09T00:00:00.000Z'));
    const { container } = render(<DeferralDueLine {...CAT_C} />);
    expect(container.textContent).toContain('overdue');
    expect(container.textContent).not.toMatch(/-\d/);
  });
});

/**
 * LG-155 second half — the ring was made present on every surface, then found to be still whispering:
 * 16px ring, 12px label, inside a muted row. A size variant exists so exactly one clock per screen can
 * carry the weight the number deserves. These pin that the variant is real and that the default is not
 * quietly promoted along with it.
 */
describe('DeferralClock prominence (LG-155)', () => {
  const props = {
    clockStartUtc: '2026-07-25T04:00:00.000Z',
    repairDueUtc: '2026-08-04T04:00:00.000Z',
    category: 'C' as const,
  };

  it('defaults to the inline size so list rows stay calm', () => {
    vi.setSystemTime(new Date('2026-08-02T00:00:00.000Z'));
    const { container } = render(<DeferralClock {...props} />);
    expect(container.querySelector('svg')!.getAttribute('class')).toContain('h-4');
  });

  it('renders a larger ring and label at size lg', () => {
    vi.setSystemTime(new Date('2026-08-02T00:00:00.000Z'));
    const { container } = render(<DeferralClock {...props} size="lg" />);
    expect(container.querySelector('svg')!.getAttribute('class')).toContain('h-8');
    expect(container.textContent).toContain('left');
    expect(container.querySelector('span.text-lg')).not.toBeNull();
  });

  it('keeps the tone colour on the label when prominent — size must not flatten urgency', () => {
    // 15h left on a Cat C (urgent window 2 days) is URGENT, so the label must not read as muted.
    vi.setSystemTime(new Date('2026-08-03T13:00:00.000Z'));
    const { container } = render(<DeferralClock {...props} size="lg" />);
    const label = container.querySelector('span.text-lg')!;
    expect(label.getAttribute('class')).toContain('gfo-warning');
  });
});
