import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DayOfPane } from './panels/DayOfPane';

/**
 * RED grounding beats custody, on the button as well as in the heading.
 *
 * Caught by driving the real app: with N2PG grounded AND released to the crew, the day-of hero read
 * "Aircraft grounded" above a primary button labelled "Review & sign" — the words said stop and the
 * control invited a PIC signature on an aircraft that may not be dispatched. The precedence is
 * stated in CLAUDE.md and already encoded in `moduleStatus.handoverModule`; this pins it here too,
 * because a heading and its own button disagreeing is worse than either being wrong alone.
 */
const base = {
  nowUtc: '2026-08-18T12:00:00.000Z',
  nextDepartureUtc: '2026-08-18T14:20:00.000Z',
  route: { from: 'KLUK', to: 'KTEB' },
  legSequence: 1,
  legCount: 1,
  progress: { done: 0, total: 3 },
  queue: [],
  onOpenHandover: vi.fn(),
  onOpenItem: vi.fn(),
};

describe('day-of hero precedence (D84 slice 3)', () => {
  it('never offers to sign for a grounded aircraft, even when custody is offered to the crew', () => {
    render(<DayOfPane {...base} serviceability="RED" custody="OFFERED" deferralCount={0} />);

    expect(screen.getByText('Aircraft grounded')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /review & sign/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /open handover/i })).toBeInTheDocument();
  });

  it('offers the signature when the aircraft is actually dispatchable', () => {
    render(<DayOfPane {...base} serviceability="AMBER" custody="OFFERED" deferralCount={1} />);

    expect(screen.getByText('Accept the aircraft')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /review & sign/i })).toBeInTheDocument();
  });

  it('drops to a read-only briefing once the crew holds it', () => {
    render(<DayOfPane {...base} serviceability="GREEN" custody="WITH_CREW" deferralCount={0} />);

    expect(screen.getByText('Aircraft accepted')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /view briefing/i })).toBeInTheDocument();
  });

  it('offers nothing to accept while maintenance holds the aircraft', () => {
    render(<DayOfPane {...base} serviceability="GREEN" custody="IN_MAINTENANCE" deferralCount={0} />);

    expect(screen.getByText('With maintenance')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /sign|briefing|handover/i })).not.toBeInTheDocument();
  });
});
