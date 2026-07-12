import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { documentsReducer, type DocumentsAction } from './DocumentsContext';
import type { Doc, DocRevision, DocAcknowledgment, DocumentsState } from './types';

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

function ack(overrides: Partial<DocAcknowledgment> = {}): DocAcknowledgment {
  return {
    docId: 'SOP-001',
    revisionId: 'SOP-001-r1',
    revision: '1.0',
    userId: 'USR001',
    userName: 'Captain John Smith',
    role: 'pilot',
    level: 'initials',
    initials: 'JS',
    acknowledgedAtUtc: NOW,
    ...overrides,
  };
}

/** A published, initials-level revision for a pilot-audience doc — the valid ack target. */
function ackableState(overrides: Partial<DocumentsState> = {}): DocumentsState {
  return state({ revisions: [rev({ status: 'published', ackLevel: 'initials' })], ...overrides });
}

describe('documentsReducer acknowledgments (C2 — guarded, append-with-supersede)', () => {
  it('a re-acknowledgment appends and flags the prior record superseded — never dropped', () => {
    let s = documentsReducer(ackableState(), { type: 'ACKNOWLEDGE', payload: { ack: ack() } });
    s = documentsReducer(s, { type: 'ACKNOWLEDGE', payload: { ack: ack({ initials: 'JAS' }) } });
    expect(s.acknowledgments).toHaveLength(2);
    expect(s.acknowledgments[0].initials).toBe('JS');
    expect(s.acknowledgments[0].superseded).toBe(true);
    expect(s.acknowledgments[1].initials).toBe('JAS');
    expect(s.acknowledgments[1].superseded).toBeUndefined();
  });

  it('superseding an ack preserves the prior signature record', () => {
    const sig = { id: 'sig-1', signedEntity: 'DOC_ACK', signedEntityId: 'SOP-001-r1' } as any;
    const sigState = state({ revisions: [rev({ status: 'published', ackLevel: 'signature' })] });
    let s = documentsReducer(sigState, {
      type: 'ACKNOWLEDGE',
      payload: { ack: ack({ level: 'signature', initials: undefined, signatureId: 'sig-1' }), signature: sig },
    });
    const sig2 = { ...sig, id: 'sig-2' };
    s = documentsReducer(s, {
      type: 'ACKNOWLEDGE',
      payload: { ack: ack({ level: 'signature', initials: undefined, signatureId: 'sig-2' }), signature: sig2 },
    });
    expect(s.signatures).toHaveLength(2);
    expect(s.acknowledgments.map((a) => a.signatureId)).toEqual(['sig-1', 'sig-2']);
    expect(s.acknowledgments[0].superseded).toBe(true);
  });

  it('signature acks store the signature record', () => {
    const sig = { id: 'sig-1', signedEntity: 'DOC_ACK', signedEntityId: 'SOP-001-r1' } as any;
    const s = documentsReducer(state({ revisions: [rev({ status: 'published' })] }), {
      type: 'ACKNOWLEDGE',
      payload: { ack: ack({ level: 'signature', initials: undefined, signatureId: 'sig-1' }), signature: sig },
    });
    expect(s.signatures).toHaveLength(1);
    expect(s.acknowledgments[0].signatureId).toBe('sig-1');
  });

  it('an ack against a non-published revision is a no-op', () => {
    const s = documentsReducer(state(), { type: 'ACKNOWLEDGE', payload: { ack: ack() } }); // fixture rev is pending-approval
    expect(s.acknowledgments).toHaveLength(0);
  });

  it('an ack from outside the doc audience is a no-op', () => {
    const s = documentsReducer(ackableState(), {
      type: 'ACKNOWLEDGE',
      payload: { ack: ack({ role: 'maintenance', userId: 'USR003' }) },
    });
    expect(s.acknowledgments).toHaveLength(0);
  });

  it('an ack whose level does not match the revision ackLevel is a no-op', () => {
    const sigLevel = state({ revisions: [rev({ status: 'published', ackLevel: 'signature' })] });
    const s = documentsReducer(sigLevel, { type: 'ACKNOWLEDGE', payload: { ack: ack() } }); // initials vs signature
    expect(s.acknowledgments).toHaveLength(0);
  });

  it('an initials-level ack with blank initials is a no-op', () => {
    const s = documentsReducer(ackableState(), { type: 'ACKNOWLEDGE', payload: { ack: ack({ initials: '  ' }) } });
    expect(s.acknowledgments).toHaveLength(0);
  });

  it('a signature-level ack without a signature record is a no-op', () => {
    const sigLevel = state({ revisions: [rev({ status: 'published', ackLevel: 'signature' })] });
    const s = documentsReducer(sigLevel, {
      type: 'ACKNOWLEDGE',
      payload: { ack: ack({ level: 'signature', initials: undefined, signatureId: undefined }) },
    });
    expect(s.acknowledgments).toHaveLength(0);
  });

  it("an 'all' audience accepts any role", () => {
    const s = documentsReducer(
      state({ docs: [doc({ roles: ['all'] })], revisions: [rev({ status: 'published', ackLevel: 'initials' })] }),
      { type: 'ACKNOWLEDGE', payload: { ack: ack({ role: 'maintenance', userId: 'USR003' }) } },
    );
    expect(s.acknowledgments).toHaveLength(1);
  });
});

describe('documentsReducer doc-meta guards (C1)', () => {
  function metaAction(
    docOverrides: Partial<Doc>,
    actor: { userId?: string; roles?: string[] } = {},
  ): DocumentsAction {
    return {
      type: 'UPDATE_DOC_META',
      payload: {
        doc: doc(docOverrides),
        actorUserId: actor.userId ?? 'USR005',
        actorRoles: actor.roles ?? ['document-manager'],
      },
    };
  }

  it('a non-authoring role cannot update doc meta', () => {
    const s = documentsReducer(state(), metaAction({ title: 'Renamed' }, { roles: ['pilot'] }));
    expect(s.docs[0].title).toBe('Test SOP');
  });

  it('identity fields of a published controlled doc do not change outside a revision', () => {
    const live = state({ revisions: [rev({ status: 'published' })] });
    const s = documentsReducer(live, metaAction({ title: 'Renamed' }));
    expect(s.docs[0].title).toBe('Test SOP');
  });

  it('audience changes on a published controlled doc are rejected (compliance roster integrity)', () => {
    const live = state({ revisions: [rev({ status: 'published' })] });
    const s = documentsReducer(live, metaAction({ roles: ['pilot', 'maintenance'] }));
    expect(s.docs[0].roles).toEqual(['pilot']);
  });

  it('non-identity fields (tags) still update on a published doc for an authoring role', () => {
    const live = state({ revisions: [rev({ status: 'published' })] });
    const s = documentsReducer(live, metaAction({ tags: ['ops', 'approach'] }));
    expect(s.docs[0].tags).toEqual(['ops', 'approach']);
  });

  it('identity fields may change while the doc has never been published', () => {
    const draftOnly = state({ revisions: [rev({ status: 'draft' })] });
    const s = documentsReducer(draftOnly, metaAction({ title: 'Renamed' }));
    expect(s.docs[0].title).toBe('Renamed');
  });

  it('classId is immutable', () => {
    const draftOnly = state({ revisions: [rev({ status: 'draft' })] });
    const s = documentsReducer(draftOnly, metaAction({ classId: 'tribal-knowledge' }));
    expect(s.docs[0].classId).toBe('sop');
  });

  it('proposedMeta on an approved revision applies to the doc at publish (meta rides four-eyes)', () => {
    const s = state({
      revisions: [
        rev({ id: 'r0', status: 'published' }),
        rev({
          id: 'SOP-001-r2',
          changeSummary: 'Title + audience change',
          proposedMeta: { title: 'Stabilized Approach & Go-Around', category: 'Flight Operations', roles: ['pilot', 'maintenance'], tags: ['approach'] },
        }),
      ],
    });
    const out = documentsReducer(s, decide({ revisionId: 'SOP-001-r2' }));
    expect(out.revisions.find((r) => r.id === 'SOP-001-r2')?.status).toBe('published');
    expect(out.docs[0].title).toBe('Stabilized Approach & Go-Around');
    expect(out.docs[0].roles).toEqual(['pilot', 'maintenance']);
    expect(out.docs[0].tags).toEqual(['approach']);
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
