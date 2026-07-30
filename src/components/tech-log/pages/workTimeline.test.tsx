import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { TechLogProvider } from '../TechLogContext';
import { STORAGE_KEY, VERSION_KEY, DATA_VERSION } from '../persistence';
import WorkCardDetail from './WorkCardDetail';
import type { WorkCard } from '../types';

/**
 * D61 — the retrospective timeline is the PRIMARY time-entry surface, and D62 — it stays open on a
 * complied-with card, with every edit named and stamped.
 *
 * These are DOM tests rather than engine tests on purpose: the engine already refuses a bad
 * timeline (`engine/statusTags.test.ts`), and what these pin is that a technician can actually
 * reach the thing after the fact, and can read back what they entered — including the audit trail,
 * which would otherwise be a write-only field.
 */

const IN_WORK_CARD: WorkCard = {
  id: 'wc-t1', cardNumber: 'WC-9001', aircraftId: 'ac-n1pg', title: 'LMLG unsafe — troubleshoot',
  ataChapter: '32', description: 'Corrective.', source: 'MANUAL', headerStatusCode: 1,
  scheduled: false, riiRequired: false, status: 'IN_WORK',
  createdAtUtc: '2026-07-28T10:00:00.000Z',
  steps: [{ id: 'wc-t1-s1', seq: 1, text: 'Interrogate MAU fault history', done: false }],
  statusTags: [
    { tag: 'DIAGNOSING', atUtc: '2026-07-28T10:00:00.000Z', byOid: 'USR010' },
    { tag: 'GAP', atUtc: '2026-07-28T18:00:00.000Z', byOid: 'USR010', gapReason: 'END_OF_SHIFT', includeInTotals: false },
    { tag: 'IN_WORK', atUtc: '2026-07-29T08:00:00.000Z', byOid: 'USR010' },
  ],
};

const COMPLETED_CARD: WorkCard = {
  ...IN_WORK_CARD,
  id: 'wc-t2', cardNumber: 'WC-9002', status: 'COMPLETED', headerStatusCode: 0,
  completedAtUtc: '2026-07-29T12:00:00.000Z',
  statusTags: [{ tag: 'IN_WORK', atUtc: '2026-07-29T08:00:00.000Z', byOid: 'USR010' }],
};

/** The suite does not pin a timezone, and `datetime-local` inputs are in the viewer's own zone.
 * These helpers keep the assertions honest wherever the suite runs. */
const localToIso = (local: string) => new Date(local).toISOString();
const shiftLocal = (local: string, hours: number) => {
  const d = new Date(local);
  d.setHours(d.getHours() + hours);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

function renderCard(cardId: string, cards: WorkCard[] = [IN_WORK_CARD, COMPLETED_CARD]) {
  localStorage.setItem(VERSION_KEY, DATA_VERSION);
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ workCards: cards }));
  return render(
    <MemoryRouter initialEntries={[`/tech-log/work-cards/${cardId}`]}>
      <TechLogProvider userRole="maintenance">
        <Routes><Route path="/tech-log/work-cards/:id" element={<WorkCardDetail />} /></Routes>
      </TechLogProvider>
    </MemoryRouter>,
  );
}

describe('D61 — the reconstructed timeline is the primary surface', () => {
  beforeEach(() => localStorage.clear());

  it('renders each logged span with its state, and marks an excluded gap as not counted', () => {
    renderCard('wc-t1');
    expect(screen.getByText('Diagnosing (on aircraft)')).toBeInTheDocument();
    expect(screen.getByText('Nobody working (gap)')).toBeInTheDocument();
    expect(screen.getByText(/Went home for the night/)).toBeInTheDocument();
    expect(screen.getByText('not counted')).toBeInTheDocument();
  });

  it('reports the excluded hours separately rather than folding them away silently', () => {
    renderCard('wc-t1');
    // 18:00 → 08:00 next day = 14 h, excluded by the enterer.
    expect(screen.getByText(/14 h excluded by the enterer/)).toBeInTheDocument();
  });

  it('the one-tap chips are presented as the optional path, not the source of truth', () => {
    renderCard('wc-t1');
    expect(screen.getByText(/the timeline above is what the numbers come from/i)).toBeInTheDocument();
  });

  it('lets a technician edit a span after the fact and the derived hours follow', async () => {
    const user = userEvent.setup();
    renderCard('wc-t1');
    expect(screen.getByText(/14 h excluded by the enterer/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /edit timeline/i }));
    const started = screen.getAllByLabelText('Started') as HTMLInputElement[];
    // The tech remembers coming back two hours later than they first wrote down: the overnight
    // gap grows by two hours, and because it is excluded the counted hours shrink by two.
    const later = shiftLocal(started[2].value, 2);
    await user.clear(started[2]);
    await user.type(started[2], later);
    await user.click(screen.getByRole('button', { name: /save timeline/i }));
    expect(screen.queryByRole('button', { name: /save timeline/i })).not.toBeInTheDocument();
    expect(screen.getByText(/16 h excluded by the enterer/)).toBeInTheDocument();
  });

  it('a datetime field accepts a full typed value — nothing is normalized per keystroke', async () => {
    const user = userEvent.setup();
    renderCard('wc-t1');
    await user.click(screen.getByRole('button', { name: /edit timeline/i }));
    const started = screen.getAllByLabelText('Started')[0] as HTMLInputElement;
    await user.clear(started);
    await user.type(started, '2026-07-28T06:30');
    expect(started.value).toBe('2026-07-28T06:30');
  });

  it('refuses an invalid timeline and keeps the editor open — nothing is silently discarded', async () => {
    const user = userEvent.setup();
    renderCard('wc-t1');
    await user.click(screen.getByRole('button', { name: /edit timeline/i }));
    const started = screen.getAllByLabelText('Started') as HTMLInputElement[];
    const collide = started[0].value;
    await user.clear(started[1]);
    await user.type(started[1], collide);   // two spans now start at the same instant
    await user.click(screen.getByRole('button', { name: /save timeline/i }));
    expect(screen.getByRole('button', { name: /save timeline/i })).toBeInTheDocument();
    expect(started[1].value).toBe(collide); // the rejected draft is still there to correct
  });
});

describe('D62 — a complied-with card still accepts the end-of-shift write-up, named and stamped', () => {
  beforeEach(() => localStorage.clear());

  it('offers the timeline editor on a COMPLETED card', () => {
    renderCard('wc-t2');
    expect(screen.getByRole('button', { name: /edit timeline/i })).toBeInTheDocument();
  });

  it('records the edit in a trail the technician can read back, flagged as post-sign-off', async () => {
    const user = userEvent.setup();
    renderCard('wc-t2');
    await user.click(screen.getByRole('button', { name: /edit timeline/i }));
    const started = screen.getAllByLabelText('Started')[0] as HTMLInputElement;
    const earlier = shiftLocal(started.value, -1);
    await user.clear(started);
    await user.type(started, earlier);
    await user.click(screen.getByRole('button', { name: /save timeline/i }));

    const trail = screen.getByText(/Time-history edits \(1\)/);
    const details = trail.closest('details')!;
    expect(within(details).getByText(/after the card was signed off/i)).toBeInTheDocument();
    expect(within(details).getByText(new RegExp(`before: .*${'2026-07-29T08:00:00.000Z'}`))).toBeInTheDocument();
    expect(within(details).getByText(new RegExp(`after: .*${localToIso(earlier).replace(/[.]/g, '[.]')}`))).toBeInTheDocument();
  });

  it('editing the time history never un-completes the card', async () => {
    const user = userEvent.setup();
    renderCard('wc-t2');
    await user.click(screen.getByRole('button', { name: /edit timeline/i }));
    const started = screen.getAllByLabelText('Started')[0] as HTMLInputElement;
    await user.clear(started);
    await user.type(started, shiftLocal(started.value, -1));
    await user.click(screen.getByRole('button', { name: /save timeline/i }));
    // The one-tap chip row is gated on the card NOT being complied with; its absence is the proof.
    expect(screen.queryByText(/the timeline above is what the numbers come from/i)).not.toBeInTheDocument();
  });
});

describe('LG-100 — parts orders are structured, and offered rather than forced', () => {
  beforeEach(() => localStorage.clear());

  it('raises an order and reports its open lead time, then closes it on receipt', async () => {
    const user = userEvent.setup();
    renderCard('wc-t1');
    await user.type(screen.getByLabelText('Part'), 'Main ship battery');
    await user.click(screen.getByRole('button', { name: /raise order/i }));

    expect(screen.getByText('Main ship battery')).toBeInTheDocument();
    expect(screen.getByText(/0 h and counting/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /mark received/i }));
    expect(screen.getByText(/0 h lead time/)).toBeInTheDocument();
  });

  it('offers the WAITING_PARTS tag on raising an order — and declining leaves the state alone', async () => {
    const user = userEvent.setup();
    renderCard('wc-t1');
    await user.type(screen.getByLabelText('Part'), 'Main ship battery');
    await user.click(screen.getByRole('button', { name: /raise order/i }));

    expect(screen.getByText(/Tag the card/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /keep the current state/i }));
    expect(screen.queryByText('Waiting on parts (POO)')).not.toBeInTheDocument();
  });

  it('accepting the offer tags the card, and the order satisfies the POO note by reference', async () => {
    const user = userEvent.setup();
    renderCard('wc-t1');
    await user.type(screen.getByLabelText('Part'), 'Main ship battery');
    await user.click(screen.getByRole('button', { name: /raise order/i }));
    await user.click(screen.getByRole('button', { name: /^Tag waiting on parts$/ }));

    expect(screen.getByText('Waiting on parts (POO)')).toBeInTheDocument();
    // Exact text, not a substring: the D62 audit string now quotes the note too (it has to — an
    // entry that omits a field records that something changed without recording what), so a regex
    // would match the trail as well as the span this is asserting about.
    expect(screen.getByText('Main ship battery — ordered from Gulfstream')).toBeInTheDocument();
  });
});

/**
 * Review findings F and I.
 *
 * F: `PartsOrdersPanel` was gated `!completed && isMaint` while the timeline beside it was gated on
 * `isMaint` alone. An order nobody marked received before the card was signed off could therefore
 * never be closed — its lead time stayed wrong permanently and the vendor metric inherited the
 * error. Under D62 a parts order belongs to the same retrospective record as the timeline.
 *
 * I: the audit row read `nameOf(a.byOid) || a.byName`, and `nameOf` returns the raw oid on a miss
 * rather than undefined — so the `||` could never fire and the FROZEN name, added precisely so the
 * actor survives a roster change (the TL-16 precedent), was unreachable code.
 */
const SIGNED_OFF_WITH_OPEN_ORDER: WorkCard = {
  ...COMPLETED_CARD,
  id: 'wc-t3', cardNumber: 'WC-9003',
  partsOrders: [{
    id: 'po-t3', description: 'Air data module No. 1', partNumber: '1159SCT204-1',
    vendor: 'Gulfstream', orderedAtUtc: '2026-07-28T09:00:00.000Z',
  }],
};

const SIGNED_OFF_WITH_AUDIT: WorkCard = {
  ...COMPLETED_CARD,
  id: 'wc-t4', cardNumber: 'WC-9004',
  timeAudit: [{
    atUtc: '2026-07-29T18:00:00.000Z',
    byOid: 'USR-GONE',            // deliberately absent from state.personnel
    byName: 'Ghost Tech',          // frozen at the edit, per TL-16
    before: '2026-07-29T08:00:00.000Z IN_WORK',
    after: '2026-07-29T07:00:00.000Z IN_WORK',
    afterCompletion: true,
  }],
};

describe('D62 — the retrospective record stays open on a complied-with card', () => {
  beforeEach(() => localStorage.clear());

  it('lets a parts order be closed after the card was signed off', async () => {
    const user = userEvent.setup();
    renderCard('wc-t3', [SIGNED_OFF_WITH_OPEN_ORDER]);
    expect(screen.getByText(/Air data module/)).toBeInTheDocument();

    // Open, so the lead time is still running.
    expect(screen.getByText(/and counting/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /mark received/i }));

    // Closed: a settled lead time, and the control flips to Undo. Asserted through the DOM rather
    // than localStorage because EDIT_WORK_CARD is not a durable action — its write is debounced.
    expect(await screen.findByText(/lead time/)).toBeInTheDocument();
    expect(screen.queryByText(/and counting/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /undo received/i })).toBeInTheDocument();
  });

  it('shows the frozen editor name rather than resolving it live against personnel', async () => {
    const user = userEvent.setup();
    renderCard('wc-t4', [SIGNED_OFF_WITH_AUDIT]);
    await user.click(screen.getByText(/Time-history edits/));
    // A live join would print the raw oid, because nameOf falls back to it.
    expect(screen.getByText(/Ghost Tech/)).toBeInTheDocument();
    expect(screen.queryByText(/USR-GONE/)).not.toBeInTheDocument();
  });
});
