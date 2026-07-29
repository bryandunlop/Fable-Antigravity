import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TechLogProvider } from '../../TechLogContext';
import { ReportDefectDialog } from './ReportDefectDialog';
import type { Defect } from '../../types';

/**
 * D56 — the report form captures when the defect was NOTICED, separately from when it was FILED.
 *
 * The two used to be one hoisted constant, which meant a defect seen at 2330Z and written up the
 * next morning carried the morning as its occurrence — and therefore started its MEL repair clock a
 * calendar day late. These tests drive the real dialog and inspect the signed `Defect`.
 *
 * The clock is pinned so the "not in the future" guard is judged against a fixed instant rather than
 * whenever the suite happens to run.
 */

const NOW = new Date('2026-07-20T15:00:00.000Z');

function renderDialog(): { reported: () => Defect | undefined; user: ReturnType<typeof userEvent.setup> } {
  let defect: Defect | undefined;
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  render(
    <TechLogProvider userRole="pilot">
      <ReportDefectDialog open onOpenChange={() => {}} onReported={d => { defect = d; }} />
    </TechLogProvider>,
  );
  return { reported: () => defect, user };
}

const setOccurrence = (wall: string) =>
  fireEvent.change(screen.getByLabelText(/when was it noticed/i), { target: { value: wall } });

const setZoneMode = (mode: 'UTC' | 'EASTERN' | 'LOCAL') =>
  fireEvent.change(screen.getByLabelText(/occurrence entry timezone/i), { target: { value: mode } });

describe('OccurredAtField in the report-defect form (D56)', () => {
  beforeEach(() => { vi.useFakeTimers({ shouldAdvanceTime: true }); vi.setSystemTime(NOW); });
  afterEach(() => { vi.useRealTimers(); });

  it('offers UTC, Eastern and device-local entry', () => {
    renderDialog();
    const select = screen.getByLabelText(/occurrence entry timezone/i);
    expect([...select.querySelectorAll('option')].map(o => o.textContent)).toEqual([
      'UTC (Z)', 'Eastern (ET)', 'Device local',
    ]);
  });

  it('defaults to now', () => {
    renderDialog();
    // Rendered in UTC (the default entry mode) — 15:00Z on Jul 20.
    expect(screen.getByLabelText(/when was it noticed/i)).toHaveValue('2026-07-20T15:00');
  });

  it('stores a back-dated Eastern entry as the right UTC instant, distinct from the filing stamp', async () => {
    const { reported, user } = renderDialog();
    setZoneMode('EASTERN');
    // 19:30 EDT on Jul 15 — noticed on a previous flight, written up now.
    setOccurrence('2026-07-15T19:30');

    await user.type(screen.getByPlaceholderText(/what was observed/i), 'Cabin pressure controller intermittent.');
    await user.click(screen.getByRole('button', { name: /continue to sign/i }));
    await user.click(await screen.findByRole('button', { name: 'Sign' }));

    const d = reported()!;
    expect(d.occurredAtUtc).toBe('2026-07-15T23:30:00.000Z');
    // The filing stamp is taken at signing — five days after the occurrence, not equal to it.
    expect(d.reportedAtUtc).not.toBe(d.occurredAtUtc);
    expect(Math.abs(new Date(d.reportedAtUtc).getTime() - NOW.getTime())).toBeLessThan(5_000);
  });

  it('changing the entry zone re-reads the same instant — it does not move it', () => {
    renderDialog();
    setZoneMode('EASTERN');
    setOccurrence('2026-07-15T19:30');

    setZoneMode('UTC');
    expect(screen.getByLabelText(/when was it noticed/i)).toHaveValue('2026-07-15T23:30');
    setZoneMode('EASTERN');
    expect(screen.getByLabelText(/when was it noticed/i)).toHaveValue('2026-07-15T19:30');
  });

  it('refuses to sign a defect that was noticed in the future', async () => {
    const { reported, user } = renderDialog();
    setOccurrence('2026-08-01T09:00');

    await user.type(screen.getByPlaceholderText(/what was observed/i), 'Time traveller.');
    await user.click(screen.getByRole('button', { name: /continue to sign/i }));

    expect(screen.queryByRole('button', { name: 'Sign' })).not.toBeInTheDocument();
    expect(reported()).toBeUndefined();
  });
});
