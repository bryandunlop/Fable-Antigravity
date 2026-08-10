// ACCEPT_SUGGESTION_INTO_DRAFT — the batched-triage transition.
//
// The invariant it exists to make unrepresentable: a suggestion is 'accepted'
// IFF some revision carries a block staged from it. Before this action those
// were two dispatches in two components, coordinated by a pending flag in
// engine/acceptFlow.ts; the coordination could and did diverge, and accepting
// two suggestions on one document produced two drafts, one of them orphaned.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { documentsReducer, type DocumentsAction } from './DocumentsContext';
import { checksumForSections } from './engine/blocks';
import { stagedBlocks } from './engine/workbench';
import type { Doc, DocRevision, DocSuggestion, DocumentsState, RevisionStatus } from './types';

const NOW = '2026-08-08T12:00:00.000Z';

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

function rev(id: string, status: RevisionStatus, overrides: Partial<DocRevision> = {}): DocRevision {
  return {
    id,
    docId: 'SOP-001',
    revision: '3.0',
    status,
    sections: [
      {
        id: 'SOP-001::s1',
        level: 2,
        number: '1',
        title: 'Crosswind limits',
        blocks: [
          { id: 'b1', type: 'paragraph', md: 'Maximum demonstrated crosswind is 28 kt.' },
          { id: 'b2', type: 'paragraph', md: 'Refer to the AFM for gust factors.' },
        ],
      },
    ],
    changeSummary: '',
    effectiveDate: '2026-07-01',
    authorUserId: 'USR007',
    authorName: 'Emily Chen',
    requireAcknowledgment: true,
    ackLevel: 'signature',
    mockChecksum: 'stale-on-purpose',
    ...overrides,
  };
}

function sug(overrides: Partial<DocSuggestion> = {}): DocSuggestion {
  return {
    id: 'sug-001',
    docId: 'SOP-001',
    revisionId: 'SOP-001-r1',
    docTitle: 'Test SOP',
    authorUserId: 'USR010',
    authorName: 'Marco Diaz',
    role: 'pilot',
    blockId: 'b1',
    proposedChange: 'Add a gusty crosswind note',
    rationale: 'It bit us in ABQ',
    status: 'open',
    createdAtUtc: '2026-08-01T09:00:00.000Z',
    ...overrides,
  };
}

function state(
  revisions: DocRevision[] = [rev('SOP-001-r1', 'published')],
  suggestions: DocSuggestion[] = [sug()],
): DocumentsState {
  return {
    docs: [doc()],
    revisions,
    acknowledgments: [],
    comments: [],
    suggestions,
    suggestionReplies: [],
    reviews: [],
    signatures: [],
  };
}

function accept(
  suggestionId = 'sug-001',
  overrides: Partial<Extract<DocumentsAction, { type: 'ACCEPT_SUGGESTION_INTO_DRAFT' }>['payload']> = {},
): DocumentsAction {
  return {
    type: 'ACCEPT_SUGGESTION_INTO_DRAFT',
    payload: {
      suggestionId,
      byUserId: 'USR005',
      byName: 'Lisa Anderson',
      byRoles: ['document-manager'],
      atUtc: NOW,
      newRevisionSeed: { id: 'SOP-001-r2', revision: '3.1', effectiveDate: '2026-08-08' },
      newBlockId: 'staged-1',
      ...overrides,
    },
  };
}

const mute = () => vi.spyOn(console, 'warn').mockImplementation(() => {});
afterEach(() => vi.restoreAllMocks());

describe('accepting into a fresh draft', () => {
  it('creates exactly one draft and links the suggestion to it', () => {
    const after = documentsReducer(state(), accept());

    const drafts = after.revisions.filter((r) => r.status === 'draft');
    expect(drafts).toHaveLength(1);
    expect(drafts[0].id).toBe('SOP-001-r2');
    expect(after.suggestions[0]).toMatchObject({
      status: 'accepted',
      resolvedIntoRevisionId: 'SOP-001-r2',
      resolvedByName: 'Lisa Anderson',
      resolvedAtUtc: NOW,
    });
  });

  it('stages the proposal immediately after its anchor, verbatim', () => {
    const after = documentsReducer(state(), accept());
    const draft = after.revisions.find((r) => r.id === 'SOP-001-r2')!;

    expect(draft.sections[0].blocks.map((b) => b.id)).toEqual(['b1', 'staged-1', 'b2']);
    expect(draft.sections[0].blocks[1]).toMatchObject({
      md: 'Add a gusty crosswind note',
      stagedFromSuggestionId: 'sug-001',
    });
  });

  it('leaves the published revision untouched', () => {
    const before = state();
    const after = documentsReducer(before, accept());
    const published = after.revisions.find((r) => r.id === 'SOP-001-r1')!;

    expect(published.sections[0].blocks).toHaveLength(2);
    expect(published.status).toBe('published');
  });

  it('carries no approval history onto the new draft', () => {
    const before = state([
      rev('SOP-001-r1', 'published', {
        submittedAtUtc: NOW, decidedAtUtc: NOW, decidedByUserId: 'USR005',
        decidedByName: 'Lisa Anderson', publishedAtUtc: NOW,
      }),
    ]);
    const draft = documentsReducer(before, accept()).revisions.find((r) => r.id === 'SOP-001-r2')!;

    expect(draft.submittedAtUtc).toBeUndefined();
    expect(draft.decidedAtUtc).toBeUndefined();
    expect(draft.decidedByUserId).toBeUndefined();
    expect(draft.publishedAtUtc).toBeUndefined();
  });
});

describe('accepting a SECOND suggestion — the headline invariant', () => {
  it('produces exactly ONE draft carrying both staged changes', () => {
    const before = state(
      [rev('SOP-001-r1', 'published')],
      [sug(), sug({ id: 'sug-002', blockId: 'b2', proposedChange: 'Cite AFM 5-3 explicitly', authorName: 'Ana Reyes' })],
    );

    const once = documentsReducer(before, accept('sug-001'));
    const twice = documentsReducer(once, accept('sug-002', { newBlockId: 'staged-2' }));

    expect(twice.revisions.filter((r) => r.status === 'draft')).toHaveLength(1);
    const draft = twice.revisions.find((r) => r.id === 'SOP-001-r2')!;
    expect(stagedBlocks(draft.sections)).toHaveLength(2);
    expect(twice.suggestions.every((s) => s.resolvedIntoRevisionId === 'SOP-001-r2')).toBe(true);
  });

  it('credits both readers in the change summary', () => {
    const before = state(
      [rev('SOP-001-r1', 'published')],
      [sug(), sug({ id: 'sug-002', blockId: 'b2', proposedChange: 'Cite AFM 5-3', authorName: 'Ana Reyes' })],
    );

    const twice = documentsReducer(
      documentsReducer(before, accept('sug-001')),
      accept('sug-002', { newBlockId: 'staged-2' }),
    );
    const summary = twice.revisions.find((r) => r.id === 'SOP-001-r2')!.changeSummary;

    expect(summary).toContain('Marco Diaz');
    expect(summary).toContain('Ana Reyes');
  });

  it('is idempotent under a replayed action — no duplicated credit line', () => {
    const once = documentsReducer(state(), accept());
    const draft = once.revisions.find((r) => r.id === 'SOP-001-r2')!;
    // Replay against a state where the suggestion is open again but the draft
    // already holds its credit — the shape a retried dispatch would produce.
    const replayed = documentsReducer(
      { ...once, suggestions: [sug()] },
      accept('sug-001', { newBlockId: 'staged-2' }),
    );
    const after = replayed.revisions.find((r) => r.id === 'SOP-001-r2')!;

    expect(after.changeSummary).toBe(draft.changeSummary);
  });

  it('returns a rejected draft to draft when it gains new content', () => {
    const before = state([rev('SOP-001-r1', 'published'), rev('SOP-001-r2', 'rejected')]);
    const after = documentsReducer(before, accept());

    expect(after.revisions.find((r) => r.id === 'SOP-001-r2')!.status).toBe('draft');
  });
});

describe('the checksum never drifts from the content', () => {
  it('recomputes mockChecksum on every accept', () => {
    const once = documentsReducer(state(), accept());
    const draft = once.revisions.find((r) => r.id === 'SOP-001-r2')!;
    expect(draft.mockChecksum).toBe(checksumForSections(draft.sections));

    const twice = documentsReducer(
      { ...once, suggestions: [sug({ id: 'sug-002', blockId: 'b2' })] },
      accept('sug-002', { newBlockId: 'staged-2' }),
    );
    const after = twice.revisions.find((r) => r.id === 'SOP-001-r2')!;
    expect(after.mockChecksum).toBe(checksumForSections(after.sections));
  });
});

describe('refusals — each leaves the store exactly as it was', () => {
  it('refuses while the in-flight revision is pending approval', () => {
    mute();
    const before = state([rev('SOP-001-r1', 'published'), rev('SOP-001-r2', 'pending-approval')]);

    const after = documentsReducer(before, accept());

    expect(after).toBe(before);
    expect(after.suggestions[0].status).toBe('open');
  });

  it('refuses a caller who is neither a manager nor an author of the class', () => {
    mute();
    const before = state();

    const after = documentsReducer(before, accept('sug-001', { byRoles: ['pilot'] }));

    expect(after).toBe(before);
    expect(after.suggestions[0].status).toBe('open');
  });

  it('refuses an already-resolved suggestion — no resurrection, no double-accept', () => {
    mute();
    for (const status of ['accepted', 'declined'] as const) {
      const before = state([rev('SOP-001-r1', 'published')], [sug({ status })]);
      expect(documentsReducer(before, accept())).toBe(before);
    }
  });

  it('refuses when there is no published revision to base a draft on', () => {
    mute();
    const before = state([rev('SOP-001-r1', 'superseded')]);

    const after = documentsReducer(before, accept());

    expect(after).toBe(before);
    expect(after.suggestions[0].status).toBe('open');
  });

  it('refuses a revision id that already exists (C8 collision)', () => {
    mute();
    const before = state([rev('SOP-001-r1', 'published'), rev('SOP-001-r2', 'withdrawn')]);

    expect(documentsReducer(before, accept())).toBe(before);
  });

  it('refuses a suggestion whose document is gone', () => {
    mute();
    const before = { ...state(), docs: [] };

    expect(documentsReducer(before, accept())).toBe(before);
  });
});

describe('a suggestion whose anchor block no longer exists', () => {
  it('is staged at the end rather than dropped', () => {
    const before = state([rev('SOP-001-r1', 'published')], [sug({ blockId: 'deleted-in-r1' })]);

    const draft = documentsReducer(before, accept()).revisions.find((r) => r.id === 'SOP-001-r2')!;

    expect(draft.sections[0].blocks.map((b) => b.id)).toEqual(['b1', 'b2', 'staged-1']);
    expect(stagedBlocks(draft.sections)).toHaveLength(1);
  });
});
