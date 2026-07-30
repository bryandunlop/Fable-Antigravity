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

// Exact, not /day of discovery/i: the control now sits beside a zone indicator whose accessible
// name also contains the phrase.
const dayOfDiscoveryInput = () => screen.getByLabelText('Day of discovery');

const adjustDayOfDiscovery = (wall: string) => () =>
  fireEvent.change(dayOfDiscoveryInput(), { target: { value: wall } });

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

/**
 * The same control, read rather than signed.
 *
 * The digits in it are interpreted in the deferral's GOVERNING zone, so without a zone shown next to
 * them and the resulting instant read back, changing the governing zone silently reinterprets what
 * the signer already typed. `OccurredAtField` on the report form shows both; this one showed neither.
 */
describe('DeferralCreatePanel day-of-discovery control — zone context and adjustment hint', () => {
  beforeEach(() => { vi.useFakeTimers({ shouldAdvanceTime: true }); vi.setSystemTime(SIGNED_AT); });
  afterEach(() => { vi.useRealTimers(); });

  /** Render and select the seeded Cat C item, which is what reveals the review-and-sign column. */
  async function openPanel(defect: Defect = openDefect()) {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <TechLogProvider userRole="maintenance">
        <DeferralCreatePanel defect={defect} onDone={() => {}} onCancel={() => {}} />
      </TechLogProvider>,
    );
    await user.click(await screen.findByText('21-01-02'));
    return user;
  }

  const zoneIndicator = () => screen.getByLabelText('Day of discovery timezone');

  it('labels the digits with the governing zone the deferral will actually use', async () => {
    await openPanel();

    // 2330Z on Jul 15 under the Eastern default — DST-correct, so EDT rather than EST.
    expect(zoneIndicator()).toHaveTextContent('EDT');
    expect(dayOfDiscoveryInput()).toHaveValue('2026-07-15T19:30');
  });

  it('reads the stored instant back in UTC, so the digits are never the only record on screen', async () => {
    await openPanel();

    expect(screen.getByText(/Stored as Jul 15, 2026 · 23:30 UTC/)).toBeInTheDocument();
  });

  it('follows a governing-zone override — the digits are re-read, and say so', async () => {
    const user = await openPanel();
    await user.click(screen.getByRole('button', { name: /^override$/i }));
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'America/Los_Angeles' } });

    expect(zoneIndicator()).toHaveTextContent('PDT');
    expect(dayOfDiscoveryInput()).toHaveValue('2026-07-15T16:30');
    // Same instant throughout — only the lens moved.
    expect(screen.getByText(/Stored as Jul 15, 2026 · 23:30 UTC/)).toBeInTheDocument();
  });

  it('stays "defaulted" when the value is re-entered identically — the occurrence carries seconds the control cannot', async () => {
    // A real `occurredAtUtc` is stamped from `new Date()`, so it has seconds and milliseconds; a
    // `datetime-local` can only ever produce whole minutes. Comparing the two as raw ISO strings
    // therefore latched "Adjusted" permanently after any edit, however it ended up.
    await openPanel(openDefect({ occurredAtUtc: '2026-07-15T23:30:37.412Z' }));
    expect(screen.getByText(/Defaulted from when the defect was noticed/)).toBeInTheDocument();

    adjustDayOfDiscovery('2026-07-15T20:30')();
    expect(screen.getByText(/Adjusted — no longer the reported occurrence time/)).toBeInTheDocument();

    // Back to exactly what it was showing: 19:30 EDT is the same minute as the stored 23:30Z.
    adjustDayOfDiscovery('2026-07-15T19:30')();

    expect(screen.getByText(/Defaulted from when the defect was noticed/)).toBeInTheDocument();
    expect(screen.queryByText(/Adjusted — no longer the reported occurrence time/)).not.toBeInTheDocument();
  });

  it('says "adjusted" when the discovery day genuinely moves', async () => {
    await openPanel();

    adjustDayOfDiscovery('2026-07-10T08:00')();

    expect(screen.getByText(/Adjusted — no longer the reported occurrence time/)).toBeInTheDocument();
    expect(screen.queryByText(/Defaulted from when the defect was noticed/)).not.toBeInTheDocument();
  });
});
