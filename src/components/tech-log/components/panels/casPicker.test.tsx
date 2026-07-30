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

/** D65 — the CAS facts ride the revision, so a fixture entry is a (doc, published revision) pair. */
type Entry = { doc: Doc; rev: DocRevision };

const entry = (over: {
  id: string;
  title: string;
  fleetTypes?: DocRevision['fleetTypes'];
  casMeta?: DocRevision['casMeta'];
}): Entry => ({
  doc: {
    id: over.id,
    classId: 'tribal-knowledge',
    title: over.title,
    category: 'Aircraft Quirks',
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

const ENTRIES: Entry[] = [
  entry({
    id: 'TK-910',
    title: 'GEAR UNSAFE on the 650 — the squat-switch case',
    fleetTypes: ['G650ER'],
    casMeta: { casMessage: 'GEAR UNSAFE', casColor: 'RED', cmcCodes: ['32-3120-04'] },
  }),
  entry({
    id: 'TK-911',
    title: 'GPS 1 ADVISORY on the 500 — nuisance behaviour',
    fleetTypes: ['G500'],
    casMeta: { casMessage: 'GPS 1 ADVISORY', casColor: 'WHITE' },
  }),
  // A SECOND G650ER entry, at a different tier — without one, "the colour follows the message"
  // cannot be told apart from "the colour never changes after the first pick".
  entry({
    id: 'TK-912',
    title: 'CABIN TEMP on the 650 — nuisance in the descent',
    fleetTypes: ['G650ER'],
    casMeta: { casMessage: 'CABIN TEMP', casColor: 'CYAN' },
  }),
];

function seedDocs(entries: Entry[] = ENTRIES) {
  const seed: Partial<DocumentsState> = {
    docs: entries.map((e) => e.doc),
    revisions: entries.map((e) => e.rev),
    comments: [],
  };
  localStorage.setItem(DOCS_VERSION_KEY, DOCS_DATA_VERSION);
  localStorage.setItem(DOCS_KEY, JSON.stringify(seed));
}

/** N1PG is a G650ER in the seeded fleet. `lockTail: null` leaves the Aircraft select enabled —
 *  note a plain `undefined` cannot express that, since it would take the default below. */
function renderForm(opts: { withDocuments?: boolean; lockTail?: string | null; entries?: Entry[] } = {}) {
  const { withDocuments = true, entries } = opts;
  const lockTail = 'lockTail' in opts ? opts.lockTail ?? undefined : 'N1PG';
  if (withDocuments) seedDocs(entries);
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

/**
 * Radix's `Select` calls pointer-capture APIs and `scrollIntoView`, none of which jsdom implements.
 * Stubbed here rather than in the shared `src/test/setup.ts` so the rest of the suite keeps running
 * against jsdom's real element surface. Without these the aircraft select cannot be opened at all,
 * which is why the tail-switch behaviour below had no coverage in the first place.
 */
function installRadixSelectStubs() {
  const proto = Element.prototype as unknown as Record<string, unknown>;
  proto.hasPointerCapture = () => false;
  proto.setPointerCapture = () => {};
  proto.releasePointerCapture = () => {};
  proto.scrollIntoView = () => {};
}

/** Move the (unlocked) Aircraft select to `tail`. */
const chooseAircraft = async (user: ReturnType<typeof userEvent.setup>, tail: string) => {
  await user.click(screen.getAllByRole('combobox')[0]);
  await user.click(await screen.findByRole('option', { name: new RegExp(`^${tail}`) }));
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

  it('re-scopes the offered list when the aircraft select moves to another fleet type', async () => {
    installRadixSelectStubs();
    const user = userEvent.setup();
    renderForm({ lockTail: null }); // N1PG (G650ER) by default, select enabled
    await chooseMessageMode(user);
    expect(screen.getByText('GEAR UNSAFE on the 650 — the squat-switch case')).toBeInTheDocument();

    await chooseAircraft(user, 'N5PG'); // G500

    expect(screen.getByText('GPS 1 ADVISORY on the 500 — nuisance behaviour')).toBeInTheDocument();
    expect(screen.queryByText('GEAR UNSAFE on the 650 — the squat-switch case')).not.toBeInTheDocument();
  });

  it('drops a curated message and its colour when the aircraft moves to another fleet type', async () => {
    installRadixSelectStubs();
    const user = userEvent.setup();
    renderForm({ lockTail: null });
    await chooseMessageMode(user);
    await user.click(screen.getByText('GEAR UNSAFE on the 650 — the squat-switch case'));
    expect(screen.getByLabelText('CAS message')).toHaveValue('GEAR UNSAFE');
    expect(screen.getByLabelText('CAS color')).toHaveValue('RED');

    await chooseAircraft(user, 'N5PG'); // G500 — GEAR UNSAFE is not this type's knowledge

    // The whole risk: a RED tier borrowed from a G650ER entry, signed onto a G500 defect. `casColor`
    // is read by the FIR safety fast path, so this is not cosmetic.
    expect(screen.getByLabelText('CAS message')).toHaveValue('');
    expect(screen.getByLabelText('CAS color')).toHaveValue('AMBER');
    // …and the deep link to the other fleet's entry goes with it.
    expect(screen.queryByText(/what maintenance knows/i)).not.toBeInTheDocument();
  });

  it('keeps the entry when the new tail is the SAME fleet type — the catalog is identical', async () => {
    installRadixSelectStubs();
    const user = userEvent.setup();
    renderForm({ lockTail: null });
    await chooseMessageMode(user);
    await user.click(screen.getByText('GEAR UNSAFE on the 650 — the squat-switch case'));

    await chooseAircraft(user, 'N2PG'); // also G650ER

    expect(screen.getByLabelText('CAS message')).toHaveValue('GEAR UNSAFE');
    expect(screen.getByLabelText('CAS color')).toHaveValue('RED');
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

/**
 * D60 fix pass — `casColor` is what the FIR safety fast path reads (`fir/engine/suggestions.ts`) and
 * what `casValueFor` writes onto a signed defect, so a colour that does not belong to the message
 * beside it is a wrong tier on the record, not a cosmetic slip. The rule under test: while the
 * message matches a catalog entry the colour is that entry's; otherwise it is the reporter's own.
 */
describe('defect form CAS colour follows the message (D60)', () => {
  const messageInput = () => screen.getByLabelText('CAS message');
  const colorSelect = () => screen.getByLabelText('CAS color');

  it('adopts the curated colour for a message TYPED to match an entry', async () => {
    const user = userEvent.setup();
    renderForm();
    await chooseMessageMode(user);
    expect(colorSelect()).toHaveValue('AMBER');

    await user.type(messageInput(), 'CABIN TEMP');

    // The form already knew enough to render the deep link; it now uses the same knowledge for the
    // tier instead of leaving the AMBER default on a cyan advisory.
    expect(colorSelect()).toHaveValue('CYAN');
    expect(screen.getByRole('link', { name: /what maintenance knows about CABIN TEMP/i })).toBeInTheDocument();
  });

  it('gives the colour back when the message is hand-edited away from the picked entry', async () => {
    const user = userEvent.setup();
    renderForm();
    await chooseMessageMode(user);
    await user.click(screen.getByText('GEAR UNSAFE on the 650 — the squat-switch case'));
    expect(colorSelect()).toHaveValue('RED');

    await user.type(messageInput(), '{backspace}'); // "GEAR UNSAF" — no longer that annunciation

    expect(messageInput()).toHaveValue('GEAR UNSAF');
    expect(colorSelect()).toHaveValue('AMBER'); // the reporter's own colour, not RED borrowed
    expect(screen.queryByText(/what maintenance knows/i)).not.toBeInTheDocument();
  });

  it('re-derives when the message is edited onto a DIFFERENT curated entry', async () => {
    const user = userEvent.setup();
    renderForm();
    await chooseMessageMode(user);
    await user.click(screen.getByText('GEAR UNSAFE on the 650 — the squat-switch case'));
    expect(colorSelect()).toHaveValue('RED');

    await user.clear(messageInput());
    await user.type(messageInput(), 'CABIN TEMP');

    expect(colorSelect()).toHaveValue('CYAN');
  });

  it('restores the colour the REPORTER chose, not the module default', async () => {
    const user = userEvent.setup();
    renderForm();
    await chooseMessageMode(user);
    await user.selectOptions(colorSelect(), 'WHITE'); // an explicit choice, before any picking
    await user.click(screen.getByText('GEAR UNSAFE on the 650 — the squat-switch case'));
    expect(colorSelect()).toHaveValue('RED');

    await user.type(messageInput(), '{backspace}');

    // Resetting to the AMBER default here would silently overwrite a colour the reporter set.
    expect(colorSelect()).toHaveValue('WHITE');
  });

  it('leaves a deliberate override alone while the message still names the same entry', async () => {
    const user = userEvent.setup();
    renderForm();
    await chooseMessageMode(user);
    await user.click(screen.getByText('GEAR UNSAFE on the 650 — the squat-switch case'));
    await user.selectOptions(colorSelect(), 'AMBER'); // "the deck showed amber, whatever the entry says"

    await user.type(messageInput(), ' '); // trailing space — still the same message once trimmed

    expect(colorSelect()).toHaveValue('AMBER');
  });

  /**
   * Two entries curating one annunciation is a curation defect the class cannot prevent (uncontrolled
   * direct publish, no approval step). The engine refuses to resolve it silently, and so does the
   * form: every entry is linked, and a colour the curators disagree on is left to the reporter
   * rather than guessed onto a signed record.
   */
  it('links every entry and adopts no colour when two curators disagree', async () => {
    const user = userEvent.setup();
    renderForm({
      entries: [
        ...ENTRIES,
        entry({
          id: 'TK-913',
          title: 'GEAR UNSAFE — second opinion from the night shift',
          fleetTypes: ['G650ER'],
          casMeta: { casMessage: 'GEAR UNSAFE', casColor: 'AMBER' },
        }),
      ],
    });
    await chooseMessageMode(user);
    await user.type(messageInput(), 'GEAR UNSAFE');

    expect(screen.getAllByRole('link', { name: /what maintenance knows about GEAR UNSAFE/i })).toHaveLength(2);
    expect(screen.getByText(/2 entries curate this message/)).toBeInTheDocument();
    expect(colorSelect()).toHaveValue('AMBER'); // the reporter's, untouched — RED was not guessed
  });

  it('does not touch the colour for a message nobody has curated', async () => {
    const user = userEvent.setup();
    renderForm();
    await chooseMessageMode(user);
    await user.selectOptions(colorSelect(), 'RED');

    await user.type(messageInput(), 'WINDSHIELD HEAT FAIL');

    expect(colorSelect()).toHaveValue('RED');
  });
});

/**
 * The list is capped at `CAS_PICKER_LIMIT`. The header used to print the full catalog size beside
 * it, so a curated message past the 25th was both invisible and uncounted — the number claimed the
 * list was complete when it was not.
 */
describe('defect form CAS picker cap (D60)', () => {
  /** 30 G650ER entries. Zero-padded messages so `casCatalog`'s localeCompare order matches the
   *  index — entry 29 is genuinely the one past the cap. */
  const MANY: Entry[] = Array.from({ length: 30 }, (_, i) =>
    entry({
      id: `TK-9${String(i + 20).padStart(2, '0')}`,
      title: `Entry number ${i}`,
      fleetTypes: ['G650ER'],
      casMeta: { casMessage: `MSG ${String(i).padStart(2, '0')}`, casColor: 'AMBER' },
    }),
  );
  const lastMessage = 'MSG 29';

  it('says how many of how many it is showing, and flags the truncation', async () => {
    const user = userEvent.setup();
    renderForm({ entries: MANY });
    await chooseMessageMode(user);

    expect(screen.getByText(/curated messages \(25 of 30\)/)).toBeInTheDocument();
    expect(screen.getByText(/Showing the first 25 of 30 matches/)).toBeInTheDocument();
    expect(screen.queryByText('Entry number 29')).not.toBeInTheDocument();
  });

  it('search reaches an entry past the cap', async () => {
    const user = userEvent.setup();
    renderForm({ entries: MANY });
    await chooseMessageMode(user);

    await user.type(screen.getByLabelText(/curated messages/i), lastMessage);

    expect(screen.getByText('Entry number 29')).toBeInTheDocument();
    expect(screen.queryByText(/Showing the first/)).not.toBeInTheDocument();
  });
});
