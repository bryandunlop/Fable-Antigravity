import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TechLogProvider } from '../../TechLogContext';
import { DeferralCreatePanel } from './DeferralCreatePanel';
import type { Defect, Deferral } from '../../types';

/**
 * D56 — the MEL repair clock starts from when the defect was *noticed*, not when it was *filed*.
 *
 * A defect seen at 2330Z and written up the next morning used to take the filing stamp as its day
 * of discovery, pushing the PL-25 clock a full calendar day late. `Defect.occurredAtUtc` now carries
 * the occurrence instant, and this panel defaults the deferral's day of discovery from it —
 * interpreted in the deferral's governing timezone (D24), maintenance-adjustable before signing.
 *
 * The PL-25 math itself is untouched: day of discovery excluded, clock starts the next midnight in
 * the governing zone. These tests assert the *instant the math is fed*, and are written as absolute
 * expected values rather than by re-calling `computeClockStart` so a regression in the engine cannot
 * quietly move the goalposts.
 */

// The clock is pinned so the deferral is always signed at a known instant *after* the occurrence —
// which is the whole point: the day of discovery must not follow the signing moment.
const SIGNED_AT = new Date('2026-07-20T15:00:00.000Z');

// Noticed 19:30 EDT Jul 15; written up 09:00 EDT Jul 16.
const OCCURRED_2330Z = '2026-07-15T23:30:00.000Z';
const FILED_NEXT_MORNING = '2026-07-16T13:00:00.000Z';

// Eastern day of discovery Jul 15 -> clock starts Jul 16 00:00 EDT.
const CLOCK_START_FROM_OCCURRENCE = '2026-07-16T04:00:00.000Z';
// What the filing stamp would have produced: Eastern day Jul 16 -> Jul 17 00:00 EDT. A day late.
const CLOCK_START_FROM_FILING = '2026-07-17T04:00:00.000Z';

const openDefect = (p: Partial<Defect> = {}): Defect => ({
  id: 'd-clock', aircraftId: 'ac-n5pg', source: 'PIREP', ataChapter: '21',
  description: 'Cabin pressure controller intermittent.', airworthinessAffecting: true,
  status: 'OPEN', reportedByOid: 'USR001',
  occurredAtUtc: OCCURRED_2330Z, reportedAtUtc: FILED_NEXT_MORNING, signatureId: 'sig-d-clock',
  ...p,
});

/** Drive the real panel through MEL select -> ack -> sign and return the deferral it emitted. */
async function signDeferral(defect: Defect, adjust?: () => void): Promise<Deferral | undefined> {
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  let signed: Deferral | undefined;
  render(
    <TechLogProvider userRole="maintenance">
      <DeferralCreatePanel defect={defect} onDone={d => { signed = d; }} onCancel={() => {}} />
    </TechLogProvider>,
  );

  // '21-01-02' is a seeded APPROVED G500 Cat C item; ac-n5pg is a G500.
  await user.click(await screen.findByText('21-01-02'));
  adjust?.();
  await user.click(screen.getByRole('checkbox'));
  await user.click(screen.getByRole('button', { name: /sign deferral/i }));
  // Absent when a pre-sign guard blocked the ceremony from opening.
  const ceremony = screen.queryByRole('button', { name: 'Sign' });
  if (ceremony) await user.click(ceremony);

  return signed;
}

const adjustDayOfDiscovery = (wall: string) => () =>
  fireEvent.change(screen.getByLabelText(/day of discovery/i), { target: { value: wall } });

describe('DeferralCreatePanel day-of-discovery default (D56)', () => {
  beforeEach(() => { vi.useFakeTimers({ shouldAdvanceTime: true }); vi.setSystemTime(SIGNED_AT); });
  afterEach(() => { vi.useRealTimers(); });

  it('defaults the clock from when the defect was noticed, not when it was filed', async () => {
    const deferral = (await signDeferral(openDefect()))!;

    expect(deferral.dayOfDiscoveryUtc).toBe(OCCURRED_2330Z);
    expect(deferral.dayOfDiscoveryUtc).not.toBe(FILED_NEXT_MORNING);
    expect(deferral.clockStartDateUtc).toBe(CLOCK_START_FROM_OCCURRENCE);
    expect(deferral.clockStartDateUtc).not.toBe(CLOCK_START_FROM_FILING);
  });

  it('a 2330Z occurrence under an Eastern governing zone lands on the Eastern calendar day', async () => {
    const deferral = (await signDeferral(openDefect()))!;

    expect(deferral.governingTimezone).toBe('America/New_York');
    // 2330Z Jul 15 is 19:30 EDT on Jul 15 — the discovery day is Jul 15 ET, so the clock starts at
    // Jul 16 00:00 EDT. (Had the panel anchored to UTC midnight it would read 2026-07-16T00:00:00Z.)
    expect(deferral.clockStartDateUtc).toBe('2026-07-16T04:00:00.000Z');
    // And emphatically not the signing moment, five days later.
    expect(deferral.clockStartDateUtc).not.toBe('2026-07-21T04:00:00.000Z');
  });

  it('reads the calendar day in the governing zone, not in UTC, when the two differ', async () => {
    // 0230Z Jul 16 is 22:30 EDT on Jul 15: the UTC date and the Eastern date disagree. Eastern wins.
    const deferral = (await signDeferral(openDefect({ occurredAtUtc: '2026-07-16T02:30:00.000Z' })))!;

    expect(deferral.clockStartDateUtc).toBe('2026-07-16T04:00:00.000Z');
    expect(deferral.clockStartDateUtc).not.toBe('2026-07-17T04:00:00.000Z');
  });

  it('a maintenance adjustment at creation overrides the occurrence default', async () => {
    // The control is rendered in the governing zone; 08:00 EDT on Jul 10 = 12:00Z.
    const deferral = (await signDeferral(openDefect(), adjustDayOfDiscovery('2026-07-10T08:00')))!;

    expect(deferral.dayOfDiscoveryUtc).toBe('2026-07-10T12:00:00.000Z');
    expect(deferral.dayOfDiscoveryUtc).not.toBe(OCCURRED_2330Z);
    expect(deferral.clockStartDateUtc).toBe('2026-07-11T04:00:00.000Z');
  });

  it('refuses to sign a day of discovery in the future — a mistyped year, never a real adjustment', async () => {
    const deferral = await signDeferral(openDefect(), adjustDayOfDiscovery('2062-07-10T08:00'));

    expect(deferral).toBeUndefined();
  });
});
