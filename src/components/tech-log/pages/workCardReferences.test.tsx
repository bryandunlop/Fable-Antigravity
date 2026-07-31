import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { TechLogProvider } from '../TechLogContext';
import { STORAGE_KEY, VERSION_KEY, DATA_VERSION } from '../persistence';
import WorkCardDetail from './WorkCardDetail';
import type { Defect, WorkCard } from '../types';

/**
 * LG-98/99/108 — the work card's troubleshooting references (AMM + CMC), and the pilot's narrative
 * on the header a tech reads before starting.
 *
 * THE PATTERN BEING ESTABLISHED. Before this slice the work card had no editable card-level scalar
 * at all: everything editable on `WorkCardDetail` was a collection (steps, parts, labor) or a status
 * tag. So these two fields set the precedent, and the precedent is the page's own read-only gate —
 * `{!completed && isMaint && …}` — with the completed rendering being plain text, never a disabled
 * input. A complied-with card must not look like something you could still type into.
 *
 * The CMC list is a real add/remove chip list, NOT the comma-separated-string-in-an-`<Input>` that
 * `AdminPersonnel` uses for `riiAuthorizedAta`. That divergence is deliberate and is asserted here:
 * a chip has a remove control, a comma-separated string does not.
 */

const OPEN_CARD: WorkCard = {
  id: 'wc-t1', cardNumber: 'WC-9001', aircraftId: 'ac-n1pg', title: 'LMLG unsafe — troubleshoot',
  ataChapter: '32', description: 'Corrective.', source: 'MANUAL', headerStatusCode: 1,
  scheduled: false, riiRequired: false, linkedDefectId: 'd-t1',
  createdAtUtc: '2026-07-28T10:00:00.000Z', status: 'IN_WORK',
};

const COMPLETED_CARD: WorkCard = {
  ...OPEN_CARD,
  id: 'wc-t2', cardNumber: 'WC-9002', status: 'COMPLETED', headerStatusCode: 0,
  linkedDefectId: undefined,
  completedAtUtc: '2026-07-28T18:00:00.000Z',
  ammReference: 'AMM 32-30-00', cmcFaultCodes: ['32-3120-04', '32-3120-11'],
};

const LINKED_DEFECT: Defect = {
  id: 'd-t1', aircraftId: 'ac-n1pg', source: 'PIREP', ataChapter: '32',
  description: 'Left main landing gear unsafe indication intermittent on retraction.',
  symptom: 'Started as a flicker on taxi, went solid after rotation.',
  cmcFaultCode: '32-3120-04',
  airworthinessAffecting: true, status: 'OPEN', reportedByOid: 'USR001',
  occurredAtUtc: '2026-07-28T09:00:00.000Z', reportedAtUtc: '2026-07-28T09:30:00.000Z',
  signatureId: 'sig-d-t1',
};

function renderCard(cardId: string, defects: Defect[] = [LINKED_DEFECT], cards: WorkCard[] = [OPEN_CARD, COMPLETED_CARD]) {
  localStorage.setItem(VERSION_KEY, DATA_VERSION);
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ workCards: cards, defects }));
  return render(
    <MemoryRouter initialEntries={[`/tech-log/work-cards/${cardId}`]}>
      <TechLogProvider userRole="maintenance">
        <Routes><Route path="/tech-log/work-cards/:id" element={<WorkCardDetail />} /></Routes>
      </TechLogProvider>
    </MemoryRouter>,
  );
}

const refBox = () => screen.getByTestId('work-card-references');

describe('Work card references — the documents worked to (D68, was LG-98)', () => {
  beforeEach(() => localStorage.clear());

  it('adds a reference as a chip on a card that is not complied with', async () => {
    const user = userEvent.setup();
    renderCard('wc-t1');

    await user.type(within(refBox()).getByPlaceholderText(/AMM 32-30-00/i), 'AMM 32-30-00');
    await user.click(within(refBox()).getByRole('button', { name: /^Add$/i }));

    expect(within(refBox()).getByText('AMM 32-30-00')).toBeInTheDocument();
  });

  it('holds SEVERAL references, because one card routinely spans several procedures', async () => {
    const user = userEvent.setup();
    renderCard('wc-t1');
    const box = refBox();

    for (const ref of ['AMM 32-30-00', 'CMM 32-31-14']) {
      await user.type(within(box).getByPlaceholderText(/AMM 32-30-00/i), ref);
      await user.click(within(box).getByRole('button', { name: /^Add$/i }));
    }

    expect(within(refBox()).getByText('AMM 32-30-00')).toBeInTheDocument();
    expect(within(refBox()).getByText('CMM 32-31-14')).toBeInTheDocument();
  });

  it('refuses a duplicate rather than listing the same document twice', async () => {
    const user = userEvent.setup();
    renderCard('wc-t1');
    const box = refBox();

    for (let i = 0; i < 2; i++) {
      await user.type(within(box).getByPlaceholderText(/AMM 32-30-00/i), 'AMM 32-30-00');
      await user.click(within(box).getByRole('button', { name: /^Add$/i }));
    }

    expect(within(refBox()).getAllByText('AMM 32-30-00')).toHaveLength(1);
  });

  it('is read-only text — no input at all — once the card is complied with', () => {
    renderCard('wc-t2');

    expect(within(refBox()).queryByPlaceholderText(/AMM 32-30-00/i)).not.toBeInTheDocument();
    expect(within(refBox()).getByText('AMM 32-30-00')).toBeInTheDocument();
  });

  /**
   * wc-t2 carries the pre-D68 single `ammReference` string, which is exactly why the assertion above
   * passes. A signed release points at its card and the CRS print reads through to it, so reading
   * only the new `references` list would blank the reference on a release that already printed one.
   */
  it('still renders a pre-D68 card’s single ammReference, and offers no way to delete it', () => {
    renderCard('wc-t2');
    expect(within(refBox()).getByText('AMM 32-30-00')).toBeInTheDocument();
    expect(within(refBox()).queryByRole('button', { name: /Remove AMM 32-30-00/i })).not.toBeInTheDocument();
  });
});

describe('Work card CMC fault codes (LG-99)', () => {
  beforeEach(() => localStorage.clear());

  it('adds a code as a chip and removes it again', async () => {
    const user = userEvent.setup();
    renderCard('wc-t1');

    await user.type(screen.getByLabelText(/Add CMC fault code/i), '34-1100-02');
    await user.click(within(refBox()).getByRole('button', { name: /^Add code$/i }));

    expect(within(refBox()).getByText('34-1100-02')).toBeInTheDocument();

    await user.click(within(refBox()).getByRole('button', { name: /Remove CMC code 34-1100-02/i }));

    expect(within(refBox()).queryByText('34-1100-02')).not.toBeInTheDocument();
  });

  it('refuses a duplicate rather than listing the same code twice', async () => {
    const user = userEvent.setup();
    renderCard('wc-t1');

    for (const _ of [0, 1]) {
      await user.type(screen.getByLabelText(/Add CMC fault code/i), '34-1100-02');
      await user.click(within(refBox()).getByRole('button', { name: /^Add code$/i }));
    }

    expect(within(refBox()).getAllByText('34-1100-02')).toHaveLength(1);
  });

  it('offers the pilot-reported code from the linked defect as a one-tap starting hint', async () => {
    const user = userEvent.setup();
    renderCard('wc-t1');

    const hint = within(refBox()).getByRole('button', { name: /Add pilot-reported code 32-3120-04/i });
    await user.click(hint);

    expect(within(refBox()).getByText('32-3120-04')).toBeInTheDocument();
    // Once it is on the card the hint has nothing left to offer.
    expect(within(refBox()).queryByRole('button', { name: /Add pilot-reported code/i })).not.toBeInTheDocument();
  });

  it('locks the list on a complied-with card — codes show, add and remove controls do not', () => {
    renderCard('wc-t2');

    expect(within(refBox()).getByText('32-3120-04')).toBeInTheDocument();
    expect(within(refBox()).getByText('32-3120-11')).toBeInTheDocument();
    expect(screen.queryByLabelText(/Add CMC fault code/i)).not.toBeInTheDocument();
    expect(within(refBox()).queryByRole('button', { name: /Remove CMC code/i })).not.toBeInTheDocument();
  });
});

describe("Pilot's narrative on the work-card header (LG-108)", () => {
  beforeEach(() => localStorage.clear());

  it('renders the linked defect symptom, labelled as the reporter account', () => {
    renderCard('wc-t1');

    const note = screen.getByTestId('symptom-note');
    expect(note).toHaveTextContent('Started as a flicker on taxi, went solid after rotation.');
    expect(note).toHaveTextContent(/pilot/i);
  });

  it('follows a superseding correction rather than reading the frozen original', () => {
    // Defects are an append-only superseding ledger: a correction is a NEW row with a NEW id
    // pointing back at the original. `card.linkedDefectId` still names the ORIGINAL, so resolving it
    // with a bare `.find()` over `currentRows` returns nothing at all once the defect is corrected —
    // the narrative would silently vanish from the card the moment a pilot fixed a typo. Chain
    // resolution (`latestFor`) is what makes this pass.
    const corrected: Defect = {
      ...LINKED_DEFECT,
      id: 'd-t1-corr', supersedesId: 'd-t1',
      symptom: 'Corrected: flickered on taxi, solid from rotation to gear-up selection.',
    };
    renderCard('wc-t1', [LINKED_DEFECT, corrected]);

    expect(screen.getByTestId('symptom-note')).toHaveTextContent(/^.*Corrected: flickered on taxi/);
  });

  it('renders nothing when the linked defect carries no narrative', () => {
    renderCard('wc-t1', [{ ...LINKED_DEFECT, symptom: undefined }]);

    expect(screen.queryByTestId('symptom-note')).not.toBeInTheDocument();
  });
});
