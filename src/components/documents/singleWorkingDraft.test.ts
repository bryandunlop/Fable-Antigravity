// The one-working-draft invariant: a document may hold at most ONE revision in
// flight (draft | rejected | pending-approval).
//
// Before this guard, CREATE_DRAFT would happily append a second draft. Only one
// was ever reachable — DocReader's `find()` returned whichever came first — so
// the other was invisible AND uneditable: a maintainer's work silently lost.
// Accepting two suggestions on one document was the everyday way to hit it.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { documentsReducer, type DocumentsAction } from './DocumentsContext';
import type { Doc, DocRevision, DocumentsState, RevisionStatus } from './types';

function doc(overrides: Partial<Doc> = {}): Doc {
  return {
    id: 'SOP-001',
    classId: 'sop',
    title: 'Test SOP',
    category: 'Flight Operations',
    roles: ['pilot'],
    ownerUserId: 'USR007',
    ownerName: 'Emily Chen',
    tags: [],
    isPinned: false,
    isArchived: false,
    createdDate: '2026-01-01',
    ...overrides,
  };
}

function rev(overrides: Partial<DocRevision> = {}): DocRevision {
  return {
    id: 'SOP-001-r1',
    docId: 'SOP-001',
    revision: '1.0',
    status: 'published',
    sections: [
      {
        id: 'SOP-001::preamble',
        level: 1,
        number: '',
        title: '',
        blocks: [{ id: 'SOP-001::preamble::b0', type: 'paragraph', md: 'Body' }],
      },
    ],
    changeSummary: '',
    effectiveDate: '2026-07-01',
    authorUserId: 'USR007',
    authorName: 'Emily Chen',
    requireAcknowledgment: true,
    ackLevel: 'signature',
    mockChecksum: 'abc',
    ...overrides,
  };
}

function state(revisions: DocRevision[]): DocumentsState {
  return {
    docs: [doc()],
    revisions,
    acknowledgments: [],
    comments: [],
    suggestions: [],
    suggestionReplies: [],
    reviews: [],
    signatures: [],
  };
}

function createDraft(id = 'SOP-001-r9'): DocumentsAction {
  return {
    type: 'CREATE_DRAFT',
    payload: {
      revision: rev({ id, revision: '2.0', status: 'draft' }),
      actorRoles: ['document-manager'],
    },
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('one working draft per document', () => {
  for (const blocking of ['draft', 'rejected', 'pending-approval'] as RevisionStatus[]) {
    it(`refuses a new draft while a ${blocking} revision is in flight`, () => {
      vi.spyOn(console, 'warn').mockImplementation(() => {});
      const before = state([rev(), rev({ id: 'SOP-001-r2', revision: '2.0', status: blocking })]);

      const after = documentsReducer(before, createDraft());

      expect(after).toBe(before); // refused wholesale — nothing partial written
      expect(after.revisions).toHaveLength(2);
    });
  }

  for (const settled of ['published', 'superseded', 'withdrawn'] as RevisionStatus[]) {
    it(`allows a new draft when the only other revision is ${settled}`, () => {
      const before = state([rev({ id: 'SOP-001-r2', revision: '1.0', status: settled })]);

      const after = documentsReducer(before, createDraft());

      expect(after.revisions).toHaveLength(2);
      expect(after.revisions.find((r) => r.id === 'SOP-001-r9')?.status).toBe('draft');
    });
  }

  it('scopes the invariant to one document — another doc\'s draft does not block', () => {
    const before: DocumentsState = {
      ...state([rev(), rev({ id: 'SOP-002-r1', docId: 'SOP-002', status: 'draft' })]),
      docs: [doc(), doc({ id: 'SOP-002' })],
    };

    const after = documentsReducer(before, createDraft());

    expect(after.revisions).toHaveLength(3);
  });
});
