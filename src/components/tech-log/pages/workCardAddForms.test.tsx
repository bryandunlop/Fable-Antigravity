import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { TechLogProvider } from '../TechLogContext';
import { STORAGE_KEY, VERSION_KEY, DATA_VERSION } from '../persistence';
import WorkCardDetail from './WorkCardDetail';
import type { WorkCard } from '../types';

/**
 * LG-159 — the parts and labor add-forms used to sit permanently expanded inside their list cards.
 * Collapsing them changed nothing that any test could see, because **no UI test drove either flow**:
 * `engine/labor.ts` had unit coverage, the forms that feed it had none. That gap is why the whole
 * suite stayed green while the interaction changed shape underneath it.
 *
 * These tests exist as much to close that gap as to pin the disclosure. They drive the real controls:
 * open, fill, submit, and assert the record actually landed — which is what would have caught a
 * collapse that broke submission.
 */
const OPEN_CARD: WorkCard = {
  id: 'wc-a1', cardNumber: 'WC-8001', aircraftId: 'ac-n1pg', title: 'Chip detector inspection',
  ataChapter: '79', description: 'Corrective.', source: 'MANUAL', headerStatusCode: 1,
  scheduled: false, riiRequired: false,
  createdAtUtc: '2026-07-28T10:00:00.000Z', status: 'IN_WORK',
  steps: [],
};

function renderCard() {
  localStorage.setItem(VERSION_KEY, DATA_VERSION);
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ workCards: [OPEN_CARD], defects: [] }));
  return render(
    <MemoryRouter initialEntries={['/tech-log/work-cards/wc-a1']}>
      <TechLogProvider userRole="maintenance">
        <Routes><Route path="/tech-log/work-cards/:id" element={<WorkCardDetail />} /></Routes>
      </TechLogProvider>
    </MemoryRouter>,
  );
}

describe('Work card add-forms are disclosed, not permanent (LG-159)', () => {
  beforeEach(() => localStorage.clear());

  it('shows no part or labor inputs until asked', () => {
    renderCard();
    expect(screen.queryByPlaceholderText(/part number/i)).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/^hours$/i)).not.toBeInTheDocument();
    // The doors themselves are visible — a collapsed form must not become a hidden feature.
    expect(screen.getByRole('button', { name: /^add part$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^add labor$/i })).toBeInTheDocument();
  });

  it('opens the parts form on demand and records the part', async () => {
    const user = userEvent.setup();
    renderCard();

    await user.click(screen.getByRole('button', { name: /^add part$/i }));
    await user.type(screen.getByPlaceholderText(/part number/i), '3214-99');
    await user.type(screen.getByPlaceholderText(/^description$/i), 'Chip detector');
    await user.click(screen.getByRole('button', { name: /add part/i }));

    expect(await screen.findByText(/3214-99/)).toBeInTheDocument();
  });

  it('closes the parts form again after a part is added, so the card returns to reading', async () => {
    const user = userEvent.setup();
    renderCard();

    await user.click(screen.getByRole('button', { name: /^add part$/i }));
    await user.type(screen.getByPlaceholderText(/part number/i), '3214-99');
    await user.type(screen.getByPlaceholderText(/^description$/i), 'Chip detector');
    await user.click(screen.getByRole('button', { name: /add part/i }));

    expect(screen.queryByPlaceholderText(/part number/i)).not.toBeInTheDocument();
  });

  it('lets a technician back out of the parts form without recording anything', async () => {
    const user = userEvent.setup();
    renderCard();

    await user.click(screen.getByRole('button', { name: /^add part$/i }));
    await user.type(screen.getByPlaceholderText(/part number/i), 'TYPO-1');
    await user.click(screen.getByRole('button', { name: /cancel/i }));

    expect(screen.queryByPlaceholderText(/part number/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/TYPO-1/)).not.toBeInTheDocument();
  });

  it('opens the labor form on demand and records the hours', async () => {
    const user = userEvent.setup();
    renderCard();

    await user.click(screen.getByRole('button', { name: /^add labor$/i }));
    await user.type(screen.getByPlaceholderText(/^hours$/i), '2.5');
    await user.type(screen.getByPlaceholderText(/^description$/i), 'Borescope');
    await user.click(screen.getByRole('button', { name: /add labor \(end of shift\)/i }));

    expect(await screen.findByText(/Borescope/)).toBeInTheDocument();
  });
});
