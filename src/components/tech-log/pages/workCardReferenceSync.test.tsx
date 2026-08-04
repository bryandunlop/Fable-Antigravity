import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { TechLogProvider } from '../TechLogContext';
import { SyncContext } from '../sync/useSync';
import { STORAGE_KEY, VERSION_KEY, DATA_VERSION } from '../persistence';
import WorkCardDetail from './WorkCardDetail';
import type { WorkCard } from '../types';

/**
 * D68 + TL-38 — the AMM reference a tech worked to must LEAVE THE BROWSER.
 *
 * These two features were built on separate branches and collided at the merge. D68 introduced the
 * multi-value `references` list with a plain `dispatch`; TL-38 had meanwhile made every other
 * card-level edit go through `patch`, which dispatches locally *and* queues a server op. Taking
 * either side wholesale gave a working-looking UI in which the reference was the one field that
 * existed nowhere but the browser that typed it — invisible to the next tech, and (via
 * `correctiveActionNotes`) missing from what eventually reaches CAMP.
 *
 * Nothing in the suite could see that: `cardReferences` is unit-tested, the add/remove UI renders
 * identically either way, and the sync contract's own `SyncOpKind` comment claimed "references"
 * while its payload type still said `ammReference`. So the assertion here is deliberately about the
 * QUEUED OP, not the on-screen chip — the chip was never the part at risk.
 */
const OPEN_CARD: WorkCard = {
  id: 'wc-r1', cardNumber: 'WC-8100', aircraftId: 'ac-n1pg', title: 'Chip detector inspection',
  ataChapter: '79', description: 'Corrective.', source: 'MANUAL', headerStatusCode: 1,
  scheduled: false, riiRequired: false,
  createdAtUtc: '2026-07-28T10:00:00.000Z', status: 'IN_WORK',
  references: [{ id: 'ref-seed', ref: 'AMM 05-10-00' }],
};

function renderCard(submit: ReturnType<typeof vi.fn>) {
  localStorage.setItem(VERSION_KEY, DATA_VERSION);
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ workCards: [OPEN_CARD], defects: [] }));
  const sync = {
    summary: { pending: 0, inFlight: 0, conflicts: 0 },
    online: true,
    transportName: 'test',
    stampFor: () => undefined,
    conflictsFor: () => [],
    presenceFor: () => [],
    submit,
    watchCard: vi.fn(),
    resolveConflict: vi.fn(),
    refresh: vi.fn(),
  };
  return render(
    <MemoryRouter initialEntries={['/tech-log/work-cards/wc-r1']}>
      <TechLogProvider userRole="maintenance">
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <SyncContext.Provider value={sync as any}>
          <Routes><Route path="/tech-log/work-cards/:id" element={<WorkCardDetail />} /></Routes>
        </SyncContext.Provider>
      </TechLogProvider>
    </MemoryRouter>,
  );
}

describe('a work-card AMM reference syncs, it does not just render (D68 + TL-38)', () => {
  beforeEach(() => localStorage.clear());

  it('queues a server op when a reference is added', async () => {
    const submit = vi.fn();
    const user = userEvent.setup();
    renderCard(submit);

    // Typed, not set in one shot: the Add button is disabled until the draft is non-empty, and a
    // one-shot value assignment fires a single change event where a human fires many.
    await user.type(screen.getByPlaceholderText(/AMM 32-30-00/i), 'AMM 79-20-01');
    await user.click(screen.getByRole('button', { name: /^add$/i }));

    expect(await screen.findByText('AMM 79-20-01')).toBeInTheDocument();

    const [kind, cardId, payload] = submit.mock.calls.at(-1)!;
    expect(kind).toBe('workcard.patch');
    expect(cardId).toBe('wc-r1');
    // The whole list, not a delta — `applyOp` spreads the payload onto the card, so a partial
    // list here would silently drop the references it omitted.
    expect(payload.references.map((r: { ref: string }) => r.ref)).toEqual(['AMM 05-10-00', 'AMM 79-20-01']);
  });

  it('queues a server op when a reference is removed', async () => {
    const submit = vi.fn();
    const user = userEvent.setup();
    renderCard(submit);

    await user.click(screen.getByRole('button', { name: /remove AMM 05-10-00/i }));

    const [kind, , payload] = submit.mock.calls.at(-1)!;
    expect(kind).toBe('workcard.patch');
    // An empty list, not an absent key: `{...card, ...payload}` would leave the removed reference
    // in place if the payload simply omitted the field.
    expect(payload.references).toEqual([]);
  });
});
