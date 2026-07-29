import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TechLogProvider } from '../../TechLogContext';
import { ReportDefectDialog } from './ReportDefectDialog';
import { casValueFor, type CasMode } from './DefectFields';
import type { CasColor, Defect } from '../../types';

/**
 * D57 — the old single free-text "Symptom / CAS" field is split into a free-text **Symptom**
 * (the narrative) and a structured **CAS annunciation**.
 *
 * The invariant these tests exist for: `casMessage`+`casColor` and `casObserved` are MUTUALLY
 * EXCLUSIVE. "Observed (no CAS)" is a third state — the defect was seen with no annunciation at
 * all — not a fifth color. A row carrying both would claim the crew saw an annunciation AND saw
 * none, and nothing downstream (the FIR RED-CAS fast path, the slice-5 CAS catalog) can resolve
 * that. `casValueFor` is the single place the exclusion is enforced, so it is tested directly and
 * then again through the real dialog.
 */

const NOW = new Date('2026-07-20T15:00:00.000Z');

describe('casValueFor — the D57 mutual-exclusion rule', () => {
  it('a CAS message carries its color and never casObserved', () => {
    expect(casValueFor('MESSAGE', 'R ENG CHIP', 'RED')).toEqual({
      casMessage: 'R ENG CHIP', casColor: 'RED', casObserved: undefined,
    });
  });

  it('"observed, no CAS" carries no message and no color', () => {
    expect(casValueFor('OBSERVED', 'R ENG CHIP', 'RED')).toEqual({
      casMessage: undefined, casColor: undefined, casObserved: true,
    });
  });

  it('"none" clears all three — a defect may have no CAS aspect at all', () => {
    expect(casValueFor('NONE', 'R ENG CHIP', 'RED')).toEqual({
      casMessage: undefined, casColor: undefined, casObserved: undefined,
    });
  });

  it('a blank message is no CAS, not a colored empty one', () => {
    expect(casValueFor('MESSAGE', '   ', 'AMBER')).toEqual({
      casMessage: undefined, casColor: undefined, casObserved: undefined,
    });
  });

  it('trims the message but does not rewrite it — the chip uppercases at render', () => {
    expect(casValueFor('MESSAGE', '  gear unsafe  ', 'AMBER')).toMatchObject({
      casMessage: 'gear unsafe', casColor: 'AMBER',
    });
  });

  /**
   * Every key is always present, so spreading the result over an existing defect (the correction
   * dialog does exactly that) CLEARS the other branch rather than leaving it behind. A partial
   * object would let a correction that switches to "observed" keep the old casMessage.
   */
  it('no mode, message or color combination can produce both a CAS message and casObserved', () => {
    const modes: CasMode[] = ['NONE', 'MESSAGE', 'OBSERVED'];
    const colors: CasColor[] = ['WHITE', 'CYAN', 'AMBER', 'RED'];
    for (const mode of modes) {
      for (const message of ['', '   ', 'GEAR UNSAFE']) {
        for (const color of colors) {
          const v = casValueFor(mode, message, color);
          expect(Object.keys(v).sort()).toEqual(['casColor', 'casMessage', 'casObserved']);
          expect(v.casMessage !== undefined && v.casObserved !== undefined).toBe(false);
          // a color is only ever recorded alongside the message it colors
          expect(v.casColor !== undefined).toBe(v.casMessage !== undefined);
        }
      }
    }
  });
});

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

const pickMode = async (user: ReturnType<typeof userEvent.setup>, name: RegExp) =>
  user.click(screen.getByRole('radio', { name }));

const setColor = (color: CasColor) =>
  fireEvent.change(screen.getByLabelText(/cas color/i), { target: { value: color } });

const signIt = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole('button', { name: /continue to sign/i }));
  const sign = screen.queryByRole('button', { name: 'Sign' }) ?? await screen.findByRole('button', { name: 'Sign' });
  await user.click(sign);
};

describe('CAS annunciation in the report-defect form (D57)', () => {
  beforeEach(() => { vi.useFakeTimers({ shouldAdvanceTime: true }); vi.setSystemTime(NOW); });
  afterEach(() => { vi.useRealTimers(); });

  it('Symptom is its own free-text field — the label no longer conflates it with CAS', () => {
    renderDialog();
    expect(screen.getByText(/^symptom/i)).toBeInTheDocument();
    expect(screen.queryByText(/symptom \/ cas/i)).not.toBeInTheDocument();
  });

  it('defaults to no CAS annunciation, and offers the message input only when asked for', async () => {
    const { user } = renderDialog();
    expect(screen.getByRole('radio', { name: /^none$/i })).toHaveAttribute('aria-checked', 'true');
    expect(screen.queryByLabelText(/cas color/i)).not.toBeInTheDocument();

    await pickMode(user, /cas message/i);
    expect(screen.getByLabelText(/cas color/i)).toBeInTheDocument();
  });

  it('records a CAS message with its color, and nothing else', async () => {
    const { reported, user } = renderDialog();
    await user.type(screen.getByPlaceholderText(/what was observed/i), 'No. 2 engine chip detector.');
    await pickMode(user, /cas message/i);
    await user.type(screen.getByPlaceholderText(/cas message/i), 'R ENG CHIP');
    setColor('RED');
    await signIt(user);

    const d = reported()!;
    expect(d.casMessage).toBe('R ENG CHIP');
    expect(d.casColor).toBe('RED');
    expect(d.casObserved).toBeUndefined();
  });

  it('records "observed, no CAS" as a state — not as a fifth color', async () => {
    const { reported, user } = renderDialog();
    await user.type(screen.getByPlaceholderText(/what was observed/i), 'Nosewheel steering stiff.');
    await pickMode(user, /observed/i);
    await signIt(user);

    const d = reported()!;
    expect(d.casObserved).toBe(true);
    expect(d.casMessage).toBeUndefined();
    expect(d.casColor).toBeUndefined();
  });

  /** The form control itself must make the pair unreachable — not merely discourage it. */
  it('switching to "observed" after typing a message discards the message', async () => {
    const { reported, user } = renderDialog();
    await user.type(screen.getByPlaceholderText(/what was observed/i), 'Cabin temp erratic.');
    await pickMode(user, /cas message/i);
    await user.type(screen.getByPlaceholderText(/cas message/i), 'CABIN TEMP');
    setColor('AMBER');
    await pickMode(user, /observed/i);
    await signIt(user);

    const d = reported()!;
    expect(d.casObserved).toBe(true);
    expect(d.casMessage).toBeUndefined();
    expect(d.casColor).toBeUndefined();
  });

  it('refuses to sign "CAS message" with no message typed', async () => {
    const { reported, user } = renderDialog();
    await user.type(screen.getByPlaceholderText(/what was observed/i), 'Something happened.');
    await pickMode(user, /cas message/i);
    setColor('AMBER');
    await user.click(screen.getByRole('button', { name: /continue to sign/i }));

    expect(screen.queryByRole('button', { name: 'Sign' })).not.toBeInTheDocument();
    expect(reported()).toBeUndefined();
  });
});
