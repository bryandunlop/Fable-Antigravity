import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { TechLogProvider } from '../../TechLogContext';
import { STORAGE_KEY, VERSION_KEY, DATA_VERSION } from '../../persistence';
import { ReportDefectDialog } from './ReportDefectDialog';
import Defects from '../../pages/Defects';
import type { Defect, Signature } from '../../types';

/**
 * LG-99 — `Defect.cmcFaultCode` gets the input it never had.
 *
 * The field was added to the type by an earlier slice of this batch and shipped with **zero writers
 * and zero readers**: nothing could set it, so the work card's "start from the code the pilot read
 * off the CMC page" hint had nothing to start from. This file pins the input at both write surfaces
 * so it cannot fall dead again.
 *
 * BOTH surfaces, deliberately. A defect is written in two places — `ReportDefectDialog` (a new
 * signed defect) and the correction/supersede dialog on the Defects page — and only *some* of the
 * field internals are shared between them (see the `DefectFields` docstring). A field added to one
 * dialog only is a field a correction silently drops.
 */

const NOW = new Date('2026-07-20T15:00:00.000Z');

function renderReportDialog() {
  let defect: Defect | undefined;
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  render(
    <TechLogProvider userRole="pilot">
      <ReportDefectDialog open onOpenChange={() => {}} onReported={d => { defect = d; }} />
    </TechLogProvider>,
  );
  return { reported: () => defect, user };
}

const signIt = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole('button', { name: /continue to sign/i }));
  await user.click(await screen.findByRole('button', { name: 'Sign' }));
};

describe('CMC fault code on the report-defect form', () => {
  beforeEach(() => { vi.useFakeTimers({ shouldAdvanceTime: true }); vi.setSystemTime(NOW); });
  afterEach(() => { vi.useRealTimers(); });

  it('records the code the pilot read off the CMC page', async () => {
    const { reported, user } = renderReportDialog();
    await user.type(screen.getByPlaceholderText(/what was observed/i), 'Gear unsafe on retraction.');
    await user.type(screen.getByLabelText(/CMC fault code/i), '32-3120-04');
    await signIt(user);

    expect(reported()!.cmcFaultCode).toBe('32-3120-04');
  });

  it('leaves the field absent rather than empty when nothing is typed', async () => {
    const { reported, user } = renderReportDialog();
    await user.type(screen.getByPlaceholderText(/what was observed/i), 'Gear unsafe on retraction.');
    await signIt(user);

    expect(reported()!.cmcFaultCode).toBeUndefined();
  });
});

// ── correction dialog (pages/Defects.tsx) ──

const SIG: Signature = {
  id: 'sig-d-c1', signedEntity: 'DEFECT', signedEntityId: 'd-c1', signerOid: 'USR001',
  signerName: 'Capt. Dana Reyes', signerRole: 'PILOT', intentStatement: 'seed',
  amr: ['pwd'], authTimeUtc: '2026-07-20T12:00:00.000Z', signedAtUtc: '2026-07-20T12:00:00.000Z',
  mockContentHash: 'hash-d-c1',
};

const DEFECT: Defect = {
  id: 'd-c1', aircraftId: 'ac-n1pg', source: 'PIREP', ataChapter: '32',
  description: 'Left main landing gear unsafe indication.',
  airworthinessAffecting: true, status: 'OPEN', reportedByOid: 'USR001',
  occurredAtUtc: '2026-07-20T11:00:00.000Z', reportedAtUtc: '2026-07-20T12:00:00.000Z',
  signatureId: 'sig-d-c1',
};

function renderDefectsPage(defect: Defect) {
  localStorage.setItem(VERSION_KEY, DATA_VERSION);
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ defects: [defect], signatures: [SIG], deferrals: [] }));
  const user = userEvent.setup();
  render(
    <MemoryRouter initialEntries={['/tech-log/defects']}>
      <TechLogProvider userRole="pilot"><Defects /></TechLogProvider>
    </MemoryRouter>,
  );
  return user;
}

describe('CMC fault code on the correction (supersede) dialog', () => {
  beforeEach(() => localStorage.clear());

  it('shows the stored code so a correction can fix a mistyped one', async () => {
    const user = renderDefectsPage({ ...DEFECT, cmcFaultCode: '32-3120-99' });
    await user.click(screen.getByRole('button', { name: /correct/i }));

    expect(screen.getByLabelText(/CMC fault code/i)).toHaveValue('32-3120-99');
  });

  it('carries an edited code onto the superseding row', async () => {
    const user = renderDefectsPage({ ...DEFECT, cmcFaultCode: '32-3120-99' });
    await user.click(screen.getByRole('button', { name: /correct/i }));
    const input = screen.getByLabelText(/CMC fault code/i);
    await user.clear(input);
    await user.type(input, '32-3120-04');
    await user.click(screen.getByRole('button', { name: /continue to sign/i }));
    await user.click(await screen.findByRole('button', { name: 'Sign' }));

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    const head = stored.defects.find((d: Defect) => d.supersedesId === 'd-c1');
    expect(head.cmcFaultCode).toBe('32-3120-04');
  });
});

/**
 * Regression — found by review, reproduced, fixed.
 *
 * The correction dialog originally normalized inside `onChange` (`v.trim() || undefined`) on a
 * CONTROLLED input. Because the trim made the new state equal the old one on a trailing space, React
 * restored the previous DOM value and the keystroke vanished: a code containing a space was
 * untypeable HERE while `ReportDefectDialog` — which keeps raw local state and trims once at submit —
 * accepted it. So the same fact was enterable on one write surface and not the other, and a
 * correction could not reproduce what the report dialog had captured.
 *
 * The fix moves normalization to the signing step. These tests pin both halves: the raw value must
 * survive typing, and the stored record must still be trimmed.
 */
describe('CMC code normalization happens at signing, not per keystroke', () => {
  beforeEach(() => localStorage.clear());

  it('lets a space be typed into the correction dialog', async () => {
    const user = renderDefectsPage({ ...DEFECT, cmcFaultCode: undefined });
    await user.click(screen.getByRole('button', { name: /correct/i }));
    const input = screen.getByLabelText(/CMC fault code/i);
    await user.type(input, '32-3120-04 CH A');

    // Pre-fix this was '32-3120-04CHA' — every space keystroke was swallowed.
    expect(input).toHaveValue('32-3120-04 CH A');
  });

  it('still trims the stored value, so the signed row carries no stray whitespace', async () => {
    const user = renderDefectsPage({ ...DEFECT, cmcFaultCode: undefined });
    await user.click(screen.getByRole('button', { name: /correct/i }));
    await user.type(screen.getByLabelText(/CMC fault code/i), '  32-3120-04  ');
    await user.click(screen.getByRole('button', { name: /continue to sign/i }));
    await user.click(await screen.findByRole('button', { name: 'Sign' }));

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    const head = stored.defects.find((d: Defect) => d.supersedesId === 'd-c1');
    expect(head.cmcFaultCode).toBe('32-3120-04');
  });
});
