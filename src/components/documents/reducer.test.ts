import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { documentsReducer, type DocumentsAction } from './DocumentsContext';
import type { Doc, DocRevision, DocumentsState } from './types';

const TODAY = '2026-07-10';
const NOW = '2026-07-10T12:00:00.000Z';

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
    status: 'pending-approval',
    content: 'Body',
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

function state(overrides: Partial<DocumentsState> = {}): DocumentsState {
  return {
    docs: [doc()],
    revisions: [rev()],
    acknowledgments: [],
    comments: [],
    suggestions: [],
    reviews: [],
    signatures: [],
    ...overrides,
  };
}

function decide(overrides: Partial<Extract<DocumentsAction, { type: 'DECIDE_APPROVAL' }>['payload']> = {}): DocumentsAction {
  return {
    type: 'DECIDE_APPROVAL',
    payload: {
      revisionId: 'SOP-001-r1',
      deciderUserId: 'USR005',
      deciderName: 'Lisa Anderson',
      deciderRoles: ['document-manager'],
      approve: true,
      atUtc: NOW,
      today: TODAY,
      ...overrides,
    },
  };
}

beforeEach(() => vi.spyOn(console, 'warn').mockImplementation(() => {}));
afterEach(() => vi.restoreAllMocks());

describe('documentsReducer four-eyes guards (no-ops on invalid transitions)', () => {
  it('approve publishes when effectiveDate has arrived, superseding the prior published rev', () => {
    const s = state({ revisions: [rev({ id: 'r0', status: 'published' }), rev()] });
    const out = documentsReducer(s, decide());
    expect(out.revisions.find((r) => r.id === 'SOP-001-r1')?.status).toBe('published');
    expect(out.revisions.find((r) => r.id === 'r0')?.status).toBe('superseded');
  });

  it('approve with a future effectiveDate schedules (status approved), not published', () => {
    const s = state({ revisions: [rev({ effectiveDate: '2026-08-01' })] });
    const out = documentsReducer(s, decide());
    expect(out.revisions[0].status).toBe('approved');
  });

  it('self-approval is a no-op', () => {
    const s = state();
    const out = documentsReducer(s, decide({ deciderUserId: 'USR007' }));
    expect(out).toBe(s); // rejected in the reducer, not just hidden in the UI
    expect(out.revisions[0].status).toBe('pending-approval');
  });

  it('decide by a non-approver role is a no-op', () => {
    const out = documentsReducer(state(), decide({ deciderRoles: ['pilot'] }));
    expect(out.revisions[0].status).toBe('pending-approval');
  });

  it('reject records the reason and allows resubmit after edit', () => {
    let s = documentsReducer(state(), decide({ approve: false, reason: 'Gate table conflicts with FOM 4.2.' }));
    expect(s.revisions[0].status).toBe('rejected');
    expect(s.revisions[0].rejectionReason).toBe('Gate table conflicts with FOM 4.2.');
    s = documentsReducer(s, { type: 'UPDATE_DRAFT', payload: { ...s.revisions[0], content: 'Fixed' } });
    expect(s.revisions[0].status).toBe('draft');
    s = documentsReducer(s, { type: 'SUBMIT_FOR_APPROVAL', payload: { revisionId: 'SOP-001-r1', atUtc: NOW } });
    expect(s.revisions[0].status).toBe('pending-approval');
  });

  it('PUBLISH_DIRECT on a controlled class is a no-op', () => {
    const s = state({ revisions: [rev({ status: 'draft' })] });
    const out = documentsReducer(s, { type: 'PUBLISH_DIRECT', payload: { revisionId: 'SOP-001-r1', atUtc: NOW, today: TODAY } });
    expect(out.revisions[0].status).toBe('draft');
  });

  it('PUBLISH_DIRECT works for tribal knowledge', () => {
    const s = state({
      docs: [doc({ id: 'TK-009', classId: 'tribal-knowledge' })],
      revisions: [rev({ id: 'TK-009-r1', docId: 'TK-009', status: 'draft', ackLevel: 'none', requireAcknowledgment: false })],
    });
    const out = documentsReducer(s, { type: 'PUBLISH_DIRECT', payload: { revisionId: 'TK-009-r1', atUtc: NOW, today: TODAY } });
    expect(out.revisions[0].status).toBe('published');
  });

  it('SUBMIT_FOR_APPROVAL without a changeSummary on a re-issue is a no-op', () => {
    const s = state({
      revisions: [rev({ id: 'r0', status: 'superseded' }), rev({ id: 'r2', status: 'draft', changeSummary: '' })],
    });
    const out = documentsReducer(s, { type: 'SUBMIT_FOR_APPROVAL', payload: { revisionId: 'r2', atUtc: NOW } });
    expect(out.revisions.find((r) => r.id === 'r2')?.status).toBe('draft');
  });
});

describe('documentsReducer acknowledgments', () => {
  it('ACKNOWLEDGE replaces a prior (revision, user) record — dedupe-replace', () => {
    const base = {
      docId: 'SOP-001',
      revisionId: 'SOP-001-r1',
      revision: '1.0',
      userId: 'USR001',
      userName: 'Captain John Smith',
      role: 'pilot',
      level: 'initials' as const,
      initials: 'JS',
      acknowledgedAtUtc: NOW,
    };
    let s = documentsReducer(state(), { type: 'ACKNOWLEDGE', payload: { ack: base } });
    s = documentsReducer(s, { type: 'ACKNOWLEDGE', payload: { ack: { ...base, initials: 'JAS' } } });
    expect(s.acknowledgments).toHaveLength(1);
    expect(s.acknowledgments[0].initials).toBe('JAS');
  });

  it('signature acks store the signature record', () => {
    const sig = { id: 'sig-1', signedEntity: 'DOC_ACK', signedEntityId: 'SOP-001-r1' } as any;
    const s = documentsReducer(state(), {
      type: 'ACKNOWLEDGE',
      payload: {
        ack: {
          docId: 'SOP-001',
          revisionId: 'SOP-001-r1',
          revision: '1.0',
          userId: 'USR001',
          userName: 'Captain John Smith',
          role: 'pilot',
          level: 'signature',
          signatureId: 'sig-1',
          acknowledgedAtUtc: NOW,
        },
        signature: sig,
      },
    });
    expect(s.signatures).toHaveLength(1);
    expect(s.acknowledgments[0].signatureId).toBe('sig-1');
  });
});

describe('documentsReducer misc guards', () => {
  it('ADD_COMMENT is a no-op for classes without comments', () => {
    const s = documentsReducer(state(), {
      type: 'ADD_COMMENT',
      payload: { id: 'c1', docId: 'SOP-001', authorUserId: 'U', authorName: 'N', role: 'pilot', text: 'hi', createdAtUtc: NOW },
    });
    expect(s.comments).toHaveLength(0);
  });

  it('COMPLETE_REVIEW appends a record and advances nextReviewDate', () => {
    const s = documentsReducer(state({ docs: [doc({ reviewCycleDays: 100, nextReviewDate: '2026-07-01' })] }), {
      type: 'COMPLETE_REVIEW',
      payload: {
        record: { id: 'r1', docId: 'SOP-001', reviewedByUserId: 'U', reviewedByName: 'N', reviewedAtUtc: NOW, outcome: 'reaffirmed' },
        today: TODAY,
      },
    });
    expect(s.reviews).toHaveLength(1);
    expect(s.docs[0].nextReviewDate).toBe('2026-10-18');
  });

  it('WITHDRAW_DRAFT removes an orphaned doc with its last revision', () => {
    const s = state({ revisions: [rev({ status: 'draft' })] });
    const out = documentsReducer(s, { type: 'WITHDRAW_DRAFT', payload: 'SOP-001-r1' });
    expect(out.revisions).toHaveLength(0);
    expect(out.docs).toHaveLength(0);
  });

  it('RESOLVE_SUGGESTION only resolves open suggestions', () => {
    const sug = {
      id: 's1', docId: 'SOP-001', revisionId: 'SOP-001-r1', docTitle: 'T',
      authorUserId: 'U', authorName: 'N', role: 'pilot',
      proposedChange: 'x', rationale: 'y', status: 'declined' as const, createdAtUtc: NOW,
    };
    const out = documentsReducer(state({ suggestions: [sug] }), {
      type: 'RESOLVE_SUGGESTION',
      payload: { id: 's1', status: 'accepted', byUserId: 'U2', byName: 'N2', atUtc: NOW },
    });
    expect(out.suggestions[0].status).toBe('declined'); // unchanged
  });
});
