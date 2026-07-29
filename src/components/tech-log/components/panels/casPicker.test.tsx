import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { TechLogProvider } from '../../TechLogContext';
import {
  DocumentsProvider,
  STORAGE_KEY as DOCS_KEY,
  VERSION_KEY as DOCS_VERSION_KEY,
  DATA_VERSION as DOCS_DATA_VERSION,
} from '../../../documents/DocumentsContext';
import type { Doc, DocRevision, DocumentsState } from '../../../documents/types';
import { ReportDefectDialog } from './ReportDefectDialog';

/**
 * D60 — the defect form's CAS message input, fed by the per-fleet catalog.
 *
 * Two properties carry the risk here:
 *  1. **Picking fills the COLOUR as well as the message.** The point of a curated catalog is that a
 *     pilot does not have to remember whether GEAR UNSAFE is amber or red; if the picker filled only
 *     the text, the form's AMBER default would silently mis-tier a red annunciation on a signed
 *     record.
 *  2. **Free entry survives.** The catalog will be incomplete for a long time and a pilot must be
 *     able to report an annunciation nobody has curated. A picker that constrained the field would
 *     make the form lie about what the crew saw.
 *
 * The last test pins the degrade path: no documents provider ⇒ no picker, plain free text, no crash.
 * The form is mounted from five places and is the intake surface for a signed record, so it must not
 * depend on the knowledge store being present.
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
    id: 'TK-910',
    title: 'GEAR UNSAFE on the 650 — the squat-switch case',
    fleetTypes: ['G650ER'],
    casMeta: { casMessage: 'GEAR UNSAFE', casColor: 'RED', cmcCodes: ['32-3120-04'] },
  }),
  tkDoc({
    id: 'TK-911',
    title: 'GPS 1 ADVISORY on the 500 — nuisance behaviour',
    fleetTypes: ['G500'],
    casMeta: { casMessage: 'GPS 1 ADVISORY', casColor: 'WHITE' },
  }),
];

function seedDocs() {
  const seed: Partial<DocumentsState> = { docs: DOCS, revisions: DOCS.map((d) => published(d.id)), comments: [] };
  localStorage.setItem(DOCS_VERSION_KEY, DOCS_DATA_VERSION);
  localStorage.setItem(DOCS_KEY, JSON.stringify(seed));
}

/** N1PG is a G650ER in the seeded fleet. */
function renderForm({ withDocuments = true, lockTail = 'N1PG' }: { withDocuments?: boolean; lockTail?: string } = {}) {
  if (withDocuments) seedDocs();
  const form = (
    <TechLogProvider userRole="pilot">
      <ReportDefectDialog open onOpenChange={() => {}} lockTail={lockTail} />
    </TechLogProvider>
  );
  return render(
    <MemoryRouter>
      {withDocuments ? <DocumentsProvider>{form}</DocumentsProvider> : form}
    </MemoryRouter>,
  );
}

const chooseMessageMode = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole('button', { name: 'CAS message' }));
};

describe('defect form CAS picker (D60)', () => {
  it('offers the tail fleet type’s curated messages and not another type’s', async () => {
    const user = userEvent.setup();
    renderForm();
    await chooseMessageMode(user);

    expect(screen.getByText('GEAR UNSAFE on the 650 — the squat-switch case')).toBeInTheDocument();
    expect(screen.queryByText('GPS 1 ADVISORY on the 500 — nuisance behaviour')).not.toBeInTheDocument();
  });

  it('picking an entry fills BOTH the message and its colour', async () => {
    const user = userEvent.setup();
    renderForm();
    await chooseMessageMode(user);

    expect(screen.getByLabelText('CAS color')).toHaveValue('AMBER'); // the form's entry default
    await user.click(screen.getByText('GEAR UNSAFE on the 650 — the squat-switch case'));

    expect(screen.getByLabelText('CAS message')).toHaveValue('GEAR UNSAFE');
    expect(screen.getByLabelText('CAS color')).toHaveValue('RED');
  });

  it('filters the list by message, entry title or curated CMC code', async () => {
    const user = userEvent.setup();
    renderForm();
    await chooseMessageMode(user);
    const search = screen.getByLabelText(/curated messages/i);

    await user.type(search, '32-3120');
    expect(screen.getByText('GEAR UNSAFE on the 650 — the squat-switch case')).toBeInTheDocument();

    await user.clear(search);
    await user.type(search, 'nothing like this');
    expect(screen.queryByText('GEAR UNSAFE on the 650 — the squat-switch case')).not.toBeInTheDocument();
    expect(screen.getByText(/the catalog is not the limit of what you can report/i)).toBeInTheDocument();
  });

  it('free entry still works for a message nobody has curated', async () => {
    const user = userEvent.setup();
    renderForm();
    await chooseMessageMode(user);
    const input = screen.getByLabelText('CAS message');

    await user.type(input, 'L PACK FAIL');
    expect(input).toHaveValue('L PACK FAIL');
    // No curated entry matches, so no deep link is offered — and nothing blocks the entry.
    expect(screen.queryByText(/what maintenance knows/i)).not.toBeInTheDocument();
  });

  it('deep-links what maintenance knows once the message matches a curated entry', async () => {
    const user = userEvent.setup();
    renderForm();
    await chooseMessageMode(user);
    await user.type(screen.getByLabelText('CAS message'), 'gear unsafe'); // case-insensitive match

    const link = screen.getByRole('link', { name: /what maintenance knows about GEAR UNSAFE/i });
    expect(link).toHaveAttribute('href', '/documents/TK-910');
  });

  it('re-scopes to the other fleet type on a tail of that type', async () => {
    const user = userEvent.setup();
    renderForm({ lockTail: 'N5PG' }); // G500
    await chooseMessageMode(user);

    expect(screen.getByText('GPS 1 ADVISORY on the 500 — nuisance behaviour')).toBeInTheDocument();
    expect(screen.queryByText('GEAR UNSAFE on the 650 — the squat-switch case')).not.toBeInTheDocument();
  });

  it('degrades to plain free text with no documents store mounted', async () => {
    const user = userEvent.setup();
    renderForm({ withDocuments: false });
    await chooseMessageMode(user);

    expect(screen.queryByLabelText(/curated messages/i)).not.toBeInTheDocument();
    const input = screen.getByLabelText('CAS message');
    await user.type(input, 'R ENG CHIP');
    expect(input).toHaveValue('R ENG CHIP');
  });
});
