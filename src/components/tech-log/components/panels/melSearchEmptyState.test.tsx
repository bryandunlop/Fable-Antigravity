import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TechLogProvider } from '../../TechLogContext';
import { DeferralCreatePanel } from './DeferralCreatePanel';
import type { Defect } from '../../types';

/**
 * LG-211 — the MEL search's empty state must RECOVER, not shrug.
 *
 * "No matching MEL items." was the same sentence for three unrelated situations, and the one that
 * matters most is the one it hid: a pilot searching a G500 sees nothing because the ~41 items the
 * MEL reserves to maintenance are filtered out (TL-37) — not because the MEL is missing. A shrug
 * there sends a crew member down-route to phone maintenance and ask why the MEL is empty.
 */

const openDefect = (p: Partial<Defect> = {}): Defect => ({
  id: 'd-empty', aircraftId: 'ac-n5pg', source: 'PIREP', ataChapter: '35',
  description: 'Cabin oxygen ON warning inoperative.', airworthinessAffecting: true,
  status: 'OPEN', reportedByOid: 'USR001',
  occurredAtUtc: '2026-07-20T12:00:00.000Z', reportedAtUtc: '2026-07-20T12:30:00.000Z',
  signatureId: 'sig-d-empty', ...p,
});

const renderPanel = (role: 'maintenance' | 'pilot') =>
  render(
    <TechLogProvider userRole={role}>
      <DeferralCreatePanel defect={openDefect()} onDone={() => {}} onCancel={() => {}} />
    </TechLogProvider>,
  );

describe('MEL search empty state (LG-211)', () => {
  it('a query that matches nothing says HOW the search works, not just that it failed', async () => {
    const user = userEvent.setup();
    renderPanel('maintenance');
    const box = screen.getByPlaceholderText(/Search by item number/i);
    await user.clear(box);
    await user.type(box, 'zzzznotanmelitem');

    // Names the fields it searches AND the ATA exact-match rule, so the next keystroke can succeed.
    const help = await screen.findByText(/item number or title/i);
    expect(help.textContent).toMatch(/ATA reference must be the exact chapter/i);
  });

  it('offers a way back: clearing the search is an action, not an instruction to guess', async () => {
    const user = userEvent.setup();
    renderPanel('maintenance');
    const box = screen.getByPlaceholderText(/Search by item number/i) as HTMLInputElement;
    await user.clear(box);
    await user.type(box, 'zzzznotanmelitem');

    await user.click(await screen.findByRole('button', { name: /clear the search/i }));
    expect(box.value).toBe('');
  });
});
