import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { TechLogProvider } from '../tech-log/TechLogContext';
import { ReportDefectDialog } from '../tech-log/components/panels/ReportDefectDialog';
import { DocumentsProvider, STORAGE_KEY, VERSION_KEY, DATA_VERSION } from './DocumentsContext';
import { DocEditorDialog } from './components/DocEditorDialog';
import { casCatalog, CAS_KNOWLEDGE_CLASS_ID } from './engine/casKnowledge';
import { applyPublish } from './engine/revisions';
import { classFor } from './classes';
import type { Doc, DocRevision, DocumentsState } from './types';

/**
 * D65 — **the CAS catalog derives from the CURRENT PUBLISHED REVISION, and the engine says so.**
 *
 * Unpublished knowledge must not reach the intake form for a signed record: a curator halfway
 * through writing "GEAR UNSAFE means X" has not yet said anything the fleet is told to rely on, and
 * the defect form is where a pilot commits an annunciation — and the colour the FIR safety fast path
 * reads — to an airworthiness record.
 *
 * **What this file used to pin, and why that was not enough.** D60 hung `fleetTypes`/`casMeta` off
 * the mutable `Doc` row. The published-only property then held only because the tribal-knowledge
 * class is `controlled: false` and `DocEditorDialog`'s footer renders "Save draft" solely in the
 * `cfg?.controlled` branch — so for this class `persistDraft` (and its `updateDocMeta` call) was
 * reachable only from `publish()`. That chain was verified with the files open and it was real; but
 * it was an invariant about a signed-record intake surface living in a ternary in a dialog footer.
 * Flipping tribal knowledge to `controlled: true`, or adding a second editor path, would have
 * silently started feeding unpublished CAS values to the picker.
 *
 * The facts now ride `DocRevision`. `casCatalog` reads them through `currentRevision()`, which
 * returns a `status === 'published'` revision or nothing at all — so a draft's CAS message is not
 * "filtered out" of the catalog, it is **unreachable from it**. The first three tests below are the
 * ones that were impossible to write against the old shape: they put DIFFERENT CAS facts on a
 * published revision and on a draft of the SAME doc, which the one-value-per-doc model could not
 * express.
 */

const tkDoc = (over: Partial<Doc> & { id: string }): Doc => ({
  classId: CAS_KNOWLEDGE_CLASS_ID,
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

const revision = (
  docId: string,
  status: DocRevision['status'],
  over: Partial<DocRevision> = {},
): DocRevision => ({
  id: `${docId}-r1`,
  docId,
  revision: '1.0',
  status,
  sections: [],
  changeSummary: '',
  effectiveDate: '2026-07-01',
  authorUserId: 'USR002',
  authorName: 'Sarah Wilson',
  requireAcknowledgment: false,
  ackLevel: 'none',
  mockChecksum: 'abc',
  ...over,
});

/** A CAS entry a curator is still writing: the revision is not published. */
const IN_PROGRESS = tkDoc({
  id: 'TK-920',
  title: 'WSHLD HEAT FAIL — first draft, not checked with Gulfstream yet',
});
const IN_PROGRESS_META: Partial<DocRevision> = {
  fleetTypes: ['G650ER'],
  casMeta: { casMessage: 'WSHLD HEAT FAIL', casColor: 'RED' },
};

// ---------------------------------------------------------------------------
// Engine level — the property no dialog participates in.
// ---------------------------------------------------------------------------

describe('D65 — casCatalog can only see published revisions', () => {
  /** One doc, two revisions, DIFFERENT CAS facts on each. Unrepresentable before D65. */
  const DOC = tkDoc({ id: 'TK-930', title: 'Windshield heat — field notes' });
  const PUBLISHED = revision('TK-930', 'published', {
    id: 'TK-930-r1',
    fleetTypes: ['G650ER'],
    casMeta: { casMessage: 'WSHLD HEAT ON', casColor: 'WHITE' },
  });
  const DRAFT = revision('TK-930', 'draft', {
    id: 'TK-930-r2',
    revision: '2.0',
    fleetTypes: ['G500'],
    casMeta: { casMessage: 'WSHLD HEAT FAIL', casColor: 'RED' },
  });

  it('offers the published revision’s message and colour, never the draft’s', () => {
    const catalog = casCatalog([DOC], [PUBLISHED, DRAFT], 'G650ER');
    expect(catalog.map((e) => e.casMessage)).toEqual(['WSHLD HEAT ON']);
    expect(catalog[0].casColor).toBe('WHITE');
    expect(catalog[0].revisionId).toBe('TK-930-r1');
  });

  it('an unpublished RE-TAG does not move the entry between fleets', () => {
    // The draft re-scopes the entry to the G500. Until it publishes, a G500 tail is
    // offered nothing and the G650ER keeps what it was told.
    expect(casCatalog([DOC], [PUBLISHED, DRAFT], 'G500')).toEqual([]);
    expect(casCatalog([DOC], [PUBLISHED, DRAFT], 'G650ER')).toHaveLength(1);
  });

  it('publishing the draft is what moves the catalog — through the real publish path', () => {
    const after = applyPublish(
      { docs: [DOC], revisions: [PUBLISHED, DRAFT] },
      'TK-930-r2',
      '2026-07-30T10:00:00.000Z',
      '2026-07-30',
    );
    const g500 = casCatalog(after.docs, after.revisions, 'G500');
    expect(g500.map((e) => e.casMessage)).toEqual(['WSHLD HEAT FAIL']);
    expect(g500[0].casColor).toBe('RED');
    // …and the superseded revision's facts stop being offered on the old fleet.
    expect(casCatalog(after.docs, after.revisions, 'G650ER')).toEqual([]);
  });

  it('a doc whose ONLY revision is a draft is offered nothing at all', () => {
    const draftOnly = revision(IN_PROGRESS.id, 'draft', IN_PROGRESS_META);
    expect(casCatalog([IN_PROGRESS], [draftOnly], 'G650ER')).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// End to end — the same property through the real provider and the real form.
// ---------------------------------------------------------------------------

function seed(status: DocRevision['status']) {
  const state: Partial<DocumentsState> = {
    docs: [IN_PROGRESS],
    revisions: [revision(IN_PROGRESS.id, status, IN_PROGRESS_META)],
    comments: [],
  };
  localStorage.setItem(VERSION_KEY, DATA_VERSION);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/** N1PG is a G650ER, so this entry's fleet tag matches the tail. */
function renderDefectForm() {
  return render(
    <MemoryRouter>
      <DocumentsProvider>
        <TechLogProvider userRole="pilot">
          <ReportDefectDialog open onOpenChange={() => {}} lockTail="N1PG" />
        </TechLogProvider>
      </DocumentsProvider>
    </MemoryRouter>,
  );
}

describe('D60/D65 — the CAS picker offers published knowledge only', () => {
  it('does not offer a CAS entry whose revision is still a draft', async () => {
    const user = userEvent.setup();
    seed('draft');
    renderDefectForm();
    await user.click(screen.getByRole('button', { name: 'CAS message' }));

    // Nothing curated is offerable at all, so the picker box is not even rendered.
    expect(screen.queryByLabelText(/curated messages/i)).not.toBeInTheDocument();
    expect(screen.queryByText(IN_PROGRESS.title)).not.toBeInTheDocument();
    // ...and a pilot who types the draft's message gets no "what maintenance knows" pointer,
    // because there is nothing maintenance has yet said.
    await user.type(screen.getByLabelText('CAS message'), 'WSHLD HEAT FAIL');
    expect(screen.queryByText(/what maintenance knows/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText('CAS color')).toHaveValue('AMBER'); // no curated colour adopted
  });

  it('offers the same entry once its revision is published', async () => {
    const user = userEvent.setup();
    seed('published');
    renderDefectForm();
    await user.click(screen.getByRole('button', { name: 'CAS message' }));

    expect(screen.getByText(IN_PROGRESS.title)).toBeInTheDocument();
    await user.type(screen.getByLabelText('CAS message'), 'WSHLD HEAT FAIL');
    expect(screen.getByRole('link', { name: /what maintenance knows about WSHLD HEAT FAIL/i })).toBeInTheDocument();
    expect(screen.getByLabelText('CAS color')).toHaveValue('RED');
  });

  /**
   * Kept from the pre-D65 file, demoted from load-bearing to belt-and-braces.
   *
   * This footer used to BE the boundary; now it is only the reason the class has no draft state to
   * begin with. A "Save draft" appearing here would no longer leak anything to the picker — the
   * draft revision it writes is invisible to `casCatalog` — but it would still be a change to how
   * this class publishes, so it is worth failing loudly.
   */
  it('the tribal-knowledge editor has no draft-save path — publish is the only write', () => {
    expect(classFor(CAS_KNOWLEDGE_CLASS_ID).controlled).toBe(false);
    seed('published');
    render(
      <MemoryRouter>
        <DocumentsProvider>
          <DocEditorDialog
            open
            onOpenChange={() => {}}
            mode={{ kind: 'create', classId: CAS_KNOWLEDGE_CLASS_ID }}
            userRole="maintenance"
          />
        </DocumentsProvider>
      </MemoryRouter>,
    );

    expect(screen.getByRole('button', { name: /publish/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /save draft/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /submit for approval/i })).not.toBeInTheDocument();
  });
});

/**
 * Review finding (Important) — THE CARRY-FORWARD, which was the mechanism nobody asserted.
 *
 * Before D65 the CAS facts lived on the one mutable `Doc` row, so a new revision inherited them
 * **structurally**: there was nothing to carry, because there was only ever one value. After the
 * move they must be explicitly copied from the revision being worked on onto the revision being
 * built (`DocEditorDialog` lines ~152-156 seeding the form, and `...casFields` writing it back).
 *
 * That is new, load-bearing, and was covered by exactly nothing: the only test that drove the real
 * editor used the CREATE flow, and deleting `...casFields` turned just that one test red. The
 * failure it left open is quiet and bad — a curator revises "GEAR UNSAFE" to fix a typo in the
 * body, republishes, and the entry silently loses its message, colour and fleet tags, disappearing
 * from the tail Reference tab and the defect-form picker.
 */
describe('D65 — revising an entry carries its CAS facts onto the new revision', () => {
  const DOC = tkDoc({ id: 'TK-940', title: 'GEAR UNSAFE — what it means' });
  const PUBLISHED = revision('TK-940', 'published', {
    id: 'TK-940-r1',
    fleetTypes: ['G650ER'],
    casMeta: { casMessage: 'GEAR UNSAFE', casColor: 'AMBER', cmcCodes: ['32-31-14'] },
    sections: [{ id: 'TK-940::what-it-means', level: 2, number: '', title: 'What it means', blocks: [{ id: 'TK-940::what-it-means::b1', type: 'paragraph', md: 'Original body.' }] }],
  });

  const seedPublished = () => {
    localStorage.clear();
    localStorage.setItem(VERSION_KEY, DATA_VERSION);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ docs: [DOC], revisions: [PUBLISHED] } as Partial<DocumentsState>));
  };

  it('seeds the editor from the revision being revised, not from a doc row that no longer holds it', async () => {
    seedPublished();
    render(
      <MemoryRouter>
        <DocumentsProvider>
          <DocEditorDialog
            open
            onOpenChange={() => {}}
            mode={{ kind: 'revise', doc: DOC, baseRev: PUBLISHED }}
            userRole="maintenance"
          />
        </DocumentsProvider>
      </MemoryRouter>,
    );

    // If the editor still read the (now removed) doc-level fields these would be blank.
    expect(await screen.findByLabelText('CAS message')).toHaveValue('GEAR UNSAFE');
    expect(screen.getByLabelText('CAS colour')).toHaveValue('AMBER');
  });

  it('publishes a NEW revision that still carries the message, colour and fleet tags', async () => {
    const user = userEvent.setup();
    seedPublished();
    render(
      <MemoryRouter>
        <DocumentsProvider>
          <DocEditorDialog
            open
            onOpenChange={() => {}}
            mode={{ kind: 'revise', doc: DOC, baseRev: PUBLISHED }}
            userRole="maintenance"
          />
        </DocumentsProvider>
      </MemoryRouter>,
    );

    await user.click(await screen.findByRole('button', { name: /^Publish$/ }));

    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as DocumentsState;
      const published = (stored.revisions ?? []).filter(r => r.docId === 'TK-940' && r.status === 'published');
      expect(published).toHaveLength(1);          // the single-published invariant still holds
      const head = published[0];
      expect(head.id).not.toBe('TK-940-r1');      // and it IS a new revision
      expect(head.casMeta?.casMessage).toBe('GEAR UNSAFE');
      expect(head.casMeta?.casColor).toBe('AMBER');
      expect(head.casMeta?.cmcCodes).toEqual(['32-31-14']);
      expect(head.fleetTypes).toEqual(['G650ER']);

      // And the catalog — the thing that actually matters — still offers it.
      expect(casCatalog(stored.docs ?? [], stored.revisions ?? [], 'G650ER').map(e => e.casMessage))
        .toContain('GEAR UNSAFE');
    });
  });
});
