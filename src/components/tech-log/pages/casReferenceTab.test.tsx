import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { TechLogProvider } from '../TechLogContext';
import {
  DocumentsProvider,
  STORAGE_KEY as DOCS_KEY,
  VERSION_KEY as DOCS_VERSION_KEY,
  DATA_VERSION as DOCS_DATA_VERSION,
} from '../../documents/DocumentsContext';
import type { Doc, DocRevision, DocumentsState } from '../../documents/types';
import AircraftDetail from './AircraftDetail';

/**
 * D60 — the tail page's Reference tab.
 *
 * The property that matters most here is the FILTER: a pilot on a G650ER must not be shown a G500
 * CAS message. This is content that feeds an intake form for a signed record, so offering the wrong
 * fleet's annunciation is not a cosmetic mistake.
 *
 * Also pinned: the reference-only labelling D60 requires (this content sits adjacent to airworthiness
 * records, never inside one), and the curator gate on the create affordance — which is the class's
 * EXISTING gate, so a maintenance persona who is also DOM curates and a line pilot does not.
 */

const tkDoc = (over: Partial<Doc> & { id: string }): Doc => ({
  classId: 'tribal-knowledge',
  title: `Entry ${over.id}`,
  category: 'Aircraft Quirks',
  roles: ['all'],
  ownerUserId: 'USR002',
  ownerName: 'Sarah Wilson',
  tags: [],
  isPinned: false,
  isArchived: false,
  createdDate: '2026-07-01',
  ...over,
});

const published = (docId: string): DocRevision => ({
  id: `${docId}-r1`,
  docId,
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
});

const DOCS: Doc[] = [
  tkDoc({
    id: 'TK-900',
    title: 'R ENG CHIP on the 650 — what it means',
    fleetTypes: ['G650ER'],
    casMeta: { casMessage: 'R ENG CHIP', casColor: 'RED', cmcCodes: ['79-3100-02'] },
  }),
  tkDoc({
    id: 'TK-901',
    title: 'GPS 1 ADVISORY on the 500 — nuisance behaviour',
    fleetTypes: ['G500'],
    casMeta: { casMessage: 'GPS 1 ADVISORY', casColor: 'WHITE' },
  }),
  tkDoc({ id: 'TK-902', title: 'Normal startup CAS stack — G650ER', fleetTypes: ['G650ER'] }),
  tkDoc({ id: 'TK-903', title: 'Normal startup CAS stack — G500', fleetTypes: ['G500'] }),
];

function renderTail(tail: string, loginRole = 'maintenance') {
  const seed: Partial<DocumentsState> = {
    docs: DOCS,
    revisions: DOCS.map((d) => published(d.id)),
    comments: [],
  };
  localStorage.setItem(DOCS_VERSION_KEY, DOCS_DATA_VERSION);
  localStorage.setItem(DOCS_KEY, JSON.stringify(seed));
  return render(
    <MemoryRouter initialEntries={[`/tech-log/aircraft/${tail}?tab=reference`]}>
      <DocumentsProvider>
        <TechLogProvider userRole={loginRole}>
          <Routes><Route path="/tech-log/aircraft/:tail" element={<AircraftDetail />} /></Routes>
        </TechLogProvider>
      </DocumentsProvider>
    </MemoryRouter>,
  );
}

describe('AircraftDetail — Reference tab (D60)', () => {
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
    expect(screen.getByRole('button', { name: /new article/i })).toBeInTheDocument();
  });

  it('withholds it from a non-curator login (standards → FO Chen: pilot + standards)', () => {
    renderTail('N1PG', 'standards');
    expect(screen.queryByRole('button', { name: /new cas entry/i })).not.toBeInTheDocument();
    // Reading is unrestricted — the knowledge is for whoever is standing at the aircraft.
    expect(screen.getByText('R ENG CHIP on the 650 — what it means')).toBeInTheDocument();
  });

  it('the tab is not filed under Records — reference content is not a record', async () => {
    const user = userEvent.setup();
    renderTail('N1PG');
    // Reference sits before the Records caption; the tabs after it are the record lists.
    const reference = screen.getByRole('button', { name: 'Reference' });
    expect(reference).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^Defects/ }));
    expect(screen.queryByText(/Reference only\./)).not.toBeInTheDocument();
  });
});
