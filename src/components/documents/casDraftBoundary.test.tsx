import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { TechLogProvider } from '../tech-log/TechLogContext';
import { ReportDefectDialog } from '../tech-log/components/panels/ReportDefectDialog';
import { DocumentsProvider, STORAGE_KEY, VERSION_KEY, DATA_VERSION } from './DocumentsContext';
import { DocEditorDialog } from './components/DocEditorDialog';
import { CAS_KNOWLEDGE_CLASS_ID } from './engine/casKnowledge';
import { classFor } from './classes';
import type { Doc, DocRevision, DocumentsState } from './types';

/**
 * D60 fix pass — **the CAS catalog derives from CURRENT-REVISION content only.**
 *
 * Unpublished knowledge must not reach the intake form for a signed record: a curator halfway
 * through writing "GEAR UNSAFE means X" has not yet said anything the fleet is told to rely on, and
 * the defect form is where a pilot commits an annunciation to an airworthiness record.
 *
 * The review that prompted this file asserted the boundary was already broken — that "Save draft"
 * on a tribal-knowledge entry applied `fleetTypes`/`casMeta` to the live doc through
 * `UPDATE_DOC_META`. That is NOT reachable, and it is worth writing down why, because the reason is
 * thinner than it looks:
 *
 *   - `updateDocMeta` has exactly one caller, `DocEditorDialog.persistDraft`.
 *   - `persistDraft` is reached from `saveDraft`, `submit` and `publish` only.
 *   - The footer renders "Save draft"/"Submit for approval" for `cfg.controlled` classes and
 *     "Publish" otherwise, and tribal knowledge is `controlled: false` (`classes.ts`).
 *   - The CAS fields are only built at all when the class IS tribal knowledge (`casEnabled` in
 *     `buildRecords`), so the two sets are disjoint: for this class the only path that writes
 *     doc-level CAS meta is `publish()`.
 *
 * So the invariant currently holds by the shape of one ternary in a footer, not by anything the
 * engine enforces — `casCatalog` reads `casMeta` off the mutable `Doc` row and only checks that
 * SOME published revision exists. These two tests pin both halves so the accident is guarded:
 * the end-to-end boundary (a draft-only entry is not offered), and the footer property the
 * boundary rests on. Moving the CAS facts onto the revision (the `proposedMeta`/`applyPublish`
 * mechanism) would make it structural; that is a change to the four-eyes revision type and is
 * escalated rather than made here.
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

const revision = (docId: string, status: DocRevision['status']): DocRevision => ({
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
});

/** A CAS entry a curator is still writing: doc-level facts in place, revision not published. */
const IN_PROGRESS = tkDoc({
  id: 'TK-920',
  title: 'WSHLD HEAT FAIL — first draft, not checked with Gulfstream yet',
  fleetTypes: ['G650ER'],
  casMeta: { casMessage: 'WSHLD HEAT FAIL', casColor: 'RED' },
});

function seed(status: DocRevision['status']) {
  const state: Partial<DocumentsState> = {
    docs: [IN_PROGRESS],
    revisions: [revision(IN_PROGRESS.id, status)],
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

describe('D60 — the CAS picker offers published knowledge only', () => {
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
   * The property the boundary above actually rests on. If a "Save draft" ever appears on an
   * uncontrolled class, `persistDraft` will write `fleetTypes`/`casMeta` straight onto the live
   * `Doc` while the published revision stays where it was — and the picker, which reads those
   * fields off the doc row, will start offering unpublished knowledge. Read the file header before
   * changing this footer.
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
