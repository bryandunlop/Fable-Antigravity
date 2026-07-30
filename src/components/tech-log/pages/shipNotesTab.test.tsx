import { describe, it, expect } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { TechLogProvider } from '../TechLogContext';
import {
  DocumentsProvider,
  identityFor,
  STORAGE_KEY as DOCS_KEY,
  VERSION_KEY as DOCS_VERSION_KEY,
  DATA_VERSION as DOCS_DATA_VERSION,
} from '../../documents/DocumentsContext';
import type { Doc, DocRevision, DocumentsState } from '../../documents/types';
import AircraftDetail from './AircraftDetail';

/**
 * D60/D64 — the tail page's Ship Notes tab.
 *
 * The property that matters most here is the FILTER: a pilot on a G650ER must not be shown a G500
 * CAS message. This is content that feeds an intake form for a signed record, so offering the wrong
 * fleet's annunciation is not a cosmetic mistake.
 *
 * Also pinned: the reference-only labelling D60 requires (this content sits adjacent to airworthiness
 * records, never inside one), the tab's PLACEMENT outside the Records row, and the curator gate.
 *
 * **The curator gate is the reason this file exists in its current form.** It originally exercised
 * only logins that `SYSTEM_USERS` happens to hold a persona for (`maintenance`, `standards`), and so
 * missed an authority bypass: the gate read the roles of the persona `TechLogContext` resolved, and
 * `resolveFromLogin` falls back to `personnel[0]` — Captain John Smith, a `chief-pilot` and
 * therefore a tribal-knowledge curator — for EVERY login role no `SYSTEM_USERS` entry holds.
 * `LoginScreen` offers about ten of those. A Scheduling login could publish fleet CAS knowledge
 * attributed to a captain, which the defect-form picker then offered on a signed-record intake form.
 * The `scheduling` / `hr` cases below are that regression; the `document-manager` case is the other
 * direction, because a fix that locks out real curators is not a fix.
 */

/** D65 — the CAS facts ride the revision, so a fixture entry is a (doc, published revision) pair. */
const entry = (over: {
  id: string;
  title: string;
  fleetTypes?: DocRevision['fleetTypes'];
  casMeta?: DocRevision['casMeta'];
}): { doc: Doc; rev: DocRevision } => ({
  doc: {
    id: over.id,
    classId: 'tribal-knowledge',
    title: over.title,
    category: 'Messages & faults',
    roles: ['all'],
    ownerUserId: 'USR002',
    ownerName: 'Sarah Wilson',
    tags: [],
    isPinned: false,
    isArchived: false,
    createdDate: '2026-07-01',
  },
  rev: {
    id: `${over.id}-r1`,
    docId: over.id,
    revision: '1.0',
    status: 'published',
    sections: [],
    changeSummary: '',
    effectiveDate: '2026-07-01',
    authorUserId: 'USR002',
    authorName: 'Sarah Wilson',
    requireAcknowledgment: false,
    ackLevel: 'none',
    mockChecksum: 'abc',
    fleetTypes: over.fleetTypes,
    casMeta: over.casMeta,
  },
});

const ENTRIES = [
  entry({
    id: 'TK-900',
    title: 'R ENG CHIP on the 650 — what it means',
    fleetTypes: ['G650ER'],
    casMeta: { casMessage: 'R ENG CHIP', casColor: 'RED', cmcCodes: ['79-3100-02'] },
  }),
  entry({
    id: 'TK-901',
    title: 'GPS 1 ADVISORY on the 500 — nuisance behaviour',
    fleetTypes: ['G500'],
    casMeta: { casMessage: 'GPS 1 ADVISORY', casColor: 'WHITE' },
  }),
  entry({ id: 'TK-902', title: 'Normal startup CAS stack — G650ER', fleetTypes: ['G650ER'] }),
  entry({ id: 'TK-903', title: 'Normal startup CAS stack — G500', fleetTypes: ['G500'] }),
];

function renderTail(tail: string, loginRole = 'maintenance', additionalRoles: string[] = ['dom']) {
  const seed: Partial<DocumentsState> = {
    docs: ENTRIES.map((e) => e.doc),
    revisions: ENTRIES.map((e) => e.rev),
    comments: [],
  };
  localStorage.setItem(DOCS_VERSION_KEY, DOCS_DATA_VERSION);
  localStorage.setItem(DOCS_KEY, JSON.stringify(seed));
  return render(
    <MemoryRouter initialEntries={[`/tech-log/aircraft/${tail}?tab=shipnotes`]}>
      <DocumentsProvider>
        {/* Both props, exactly as `App` passes them — `additionalRoles` is what makes the gate read
            the SESSION's roles instead of the resolved persona's. */}
        <TechLogProvider userRole={loginRole} additionalRoles={additionalRoles}>
          <Routes><Route path="/tech-log/aircraft/:tail" element={<AircraftDetail />} /></Routes>
        </TechLogProvider>
      </DocumentsProvider>
    </MemoryRouter>,
  );
}

describe('AircraftDetail — Ship Notes tab (D60/D64)', () => {
  it('shows only the tail fleet type’s CAS entries — N1PG is a G650ER', () => {
    renderTail('N1PG');
    expect(screen.getByText('R ENG CHIP on the 650 — what it means')).toBeInTheDocument();
    expect(screen.queryByText('GPS 1 ADVISORY on the 500 — nuisance behaviour')).not.toBeInTheDocument();
    // The message renders as the flight-deck annunciator chip, not as a status pill.
    expect(screen.getByTestId('cas-chip')).toHaveTextContent('R ENG CHIP');
  });

  it('and the other type’s knowledge on a tail of that type — N5PG is a G500', () => {
    renderTail('N5PG');
    expect(screen.getByText('GPS 1 ADVISORY on the 500 — nuisance behaviour')).toBeInTheDocument();
    expect(screen.queryByText('R ENG CHIP on the 650 — what it means')).not.toBeInTheDocument();
  });

  it('lists the fleet type’s freeform articles separately from the CAS entries', () => {
    renderTail('N1PG');
    expect(screen.getByText('Normal startup CAS stack — G650ER')).toBeInTheDocument();
    expect(screen.queryByText('Normal startup CAS stack — G500')).not.toBeInTheDocument();
  });

  it('labels the whole surface reference-only — it is adjacent to the record, never part of it', () => {
    renderTail('N1PG');
    const banner = screen.getByText(/Reference only\./).closest('p');
    expect(banner).toBeInTheDocument();
    // The sentence is split across <strong> runs, so assert on the banner's whole text.
    expect(banner?.textContent).toMatch(/not\s+an\s+airworthiness record/i);
    expect(banner?.textContent).toMatch(/nothing here defers, clears or releases N1PG/i);
  });

  it('links each entry to its document so the reader can open what maintenance knows', () => {
    renderTail('N1PG');
    const link = screen.getByText('R ENG CHIP on the 650 — what it means').closest('a');
    expect(link).toHaveAttribute('href', '/documents/TK-900');
  });

  it('offers the create affordance to a curator (the maintenance login is also DOM)', () => {
    renderTail('N1PG', 'maintenance');
    expect(screen.getByRole('button', { name: /new cas entry/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /new note/i })).toBeInTheDocument();
  });

  it('withholds it from a non-curator login (standards → FO Chen: pilot + standards)', () => {
    renderTail('N1PG', 'standards', ['pilot']);
    expect(screen.queryByRole('button', { name: /new cas entry/i })).not.toBeInTheDocument();
    // Reading is unrestricted — the knowledge is for whoever is standing at the aircraft.
    expect(screen.getByText('R ENG CHIP on the 650 — what it means')).toBeInTheDocument();
  });

  it('offers it to a plain ["maintenance"] login — a line tech, per Bryan on D60', () => {
    renderTail('N1PG', 'maintenance', []);
    expect(screen.getByRole('button', { name: /new cas entry/i })).toBeInTheDocument();
  });

  // ── the authority bypass: a login with NO SYSTEM_USERS persona ──
  //
  // `scheduling` and `hr` are real `LoginScreen` options that no `SYSTEM_USERS` entry holds, so
  // `resolveFromLogin` seats them on `personnel[0]` — Captain John Smith, a `chief-pilot`. Reading
  // that persona's roles handed them the curator gate. The tab must be READ-ONLY for both.
  it.each([['scheduling'], ['hr']])(
    'a %s login gets the Ship Notes tab READ-ONLY — no persona fallback grants curator authority',
    (role) => {
      renderTail('N1PG', role, []);
      expect(screen.queryByRole('button', { name: /new cas entry/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /new note/i })).not.toBeInTheDocument();
      // Reading is still unrestricted — this is a gate on authoring, not on knowledge.
      expect(screen.getByText('R ENG CHIP on the 650 — what it means')).toBeInTheDocument();
    },
  );

  it('a document-manager login CAN author from the tail page — the fix must not lock out real curators', () => {
    renderTail('N1PG', 'document-manager', []);
    expect(screen.getByRole('button', { name: /new cas entry/i })).toBeInTheDocument();
  });

  it('attributes an entry authored here to the LOGIN, identically to /documents', async () => {
    // One curator, one identity. The tail page used to pass the resolved persona's first role into
    // `identityFor`, so a Document Manager authoring from a tail wrote `USR001 / Captain John Smith`
    // while the same person authoring from /documents wrote `role:document-manager` — two authors in
    // the store for one curator. Both surfaces now key off the primary LOGIN role.
    const user = userEvent.setup();
    renderTail('N1PG', 'document-manager', []);

    await user.click(screen.getByRole('button', { name: /new cas entry/i }));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText('Title'), 'WSHLD HEAT — 650 note');
    await user.click(within(dialog).getByLabelText('Everyone'));
    await user.type(within(dialog).getByLabelText('Block 1 content'), 'What the fleet has seen.');
    await user.type(within(dialog).getByLabelText('CAS message'), 'WSHLD HEAT');
    await user.click(within(dialog).getByRole('button', { name: /^Publish$/ }));

    const expected = identityFor('document-manager');
    // Sanity: this login has no SYSTEM_USERS persona, so its identity is role-keyed — which is
    // exactly why the persona-derived version wrote a different author.
    expect(expected.userId).toBe('role:document-manager');

    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem(DOCS_KEY) ?? '{}') as DocumentsState;
      const created = stored.docs?.find((d) => d.title === 'WSHLD HEAT — 650 note');
      expect(created).toBeDefined();
      expect(created!.ownerUserId).toBe(expected.userId);
      expect(created!.ownerName).toBe(expected.userName);
    });
  });

  /**
   * D65 — the write half of the boundary, through the real editor rather than a fixture.
   *
   * `casDraftBoundary.test.tsx` pins that the catalog cannot READ an unpublished revision. This pins
   * that the editor WRITES to the revision in the first place: if `buildRecords` put the CAS facts
   * back on the doc they would still reach the picker (the doc is live the moment it is written) and
   * every read-side test would stay green while the invariant was gone.
   */
  it('a CAS entry authored here lands its facts on the published revision, and is offered at once', async () => {
    const user = userEvent.setup();
    renderTail('N1PG', 'document-manager', []);

    await user.click(screen.getByRole('button', { name: /new cas entry/i }));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText('Title'), 'WSHLD HEAT — 650 note');
    await user.click(within(dialog).getByLabelText('Everyone'));
    await user.type(within(dialog).getByLabelText('Block 1 content'), 'What the fleet has seen.');
    await user.type(within(dialog).getByLabelText('CAS message'), 'WSHLD HEAT');
    await user.selectOptions(within(dialog).getByLabelText('CAS colour'), 'RED');
    await user.click(within(dialog).getByRole('button', { name: /^Publish$/ }));

    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem(DOCS_KEY) ?? '{}') as DocumentsState;
      const created = stored.docs?.find((d) => d.title === 'WSHLD HEAT — 650 note');
      expect(created).toBeDefined();
      const rev = stored.revisions?.find((r) => r.docId === created!.id);
      expect(rev?.status).toBe('published');
      // The facts are on the revision…
      expect(rev?.casMeta).toEqual({ casMessage: 'WSHLD HEAT', casColor: 'RED', cmcCodes: undefined });
      expect(rev?.fleetTypes).toEqual(['G650ER']); // prefilled from the tail the curator stood on
      // …and NOT on the doc row, which is what would make them live before publication.
      const asLegacy = created as unknown as { casMeta?: unknown; fleetTypes?: unknown };
      expect(asLegacy.casMeta).toBeUndefined();
      expect(asLegacy.fleetTypes).toBeUndefined();
    });

    // Published directly, so the tab it was authored from offers it with no sync step.
    expect(await screen.findByText('WSHLD HEAT — 650 note')).toBeInTheDocument();
  });

  it('the tab is not filed under Records — Ship Notes is reference, not a record', async () => {
    const user = userEvent.setup();
    renderTail('N1PG');
    // PLACEMENT, asserted rather than asserted-about. The tab row is one flex container: the
    // "Records" caption divides it, everything before the caption is a non-record tab, and the
    // record lists follow. Reference must be on the left of that caption — filing it under Records
    // would blur the line D60 rests on (tribal knowledge sits ADJACENT to the airworthiness record).
    const reference = screen.getByRole('button', { name: 'Ship Notes' });
    const row = reference.parentElement!;
    // Scoped to the tab row — "Records" also appears in the shell's own navigation.
    const caption = within(row).getByText('Records');
    const order = Array.from(row.children);
    expect(order.indexOf(reference)).toBeLessThan(order.indexOf(caption));
    // Everything AFTER the caption is a record list, and Reference is not among them.
    const afterCaption = order.slice(order.indexOf(caption) + 1).map((el) => el.textContent);
    expect(afterCaption.some((t) => /Ship Notes/.test(t ?? ''))).toBe(false);
    expect(afterCaption.some((t) => /^Defects/.test(t ?? ''))).toBe(true);

    // …and it really is a different panel, not a section of the records view.
    await user.click(screen.getByRole('button', { name: /^Defects/ }));
    expect(screen.queryByText(/Reference only\./)).not.toBeInTheDocument();
  });
});
