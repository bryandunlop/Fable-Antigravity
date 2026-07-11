import { describe, it, expect } from 'vitest';
import type { Doc, DocRevision, DocAcknowledgment } from '../types';
import { DOC_CLASSES, classFor, hasAnyRole } from '../classes';
import {
  currentRevision,
  revisionsFor,
  nextRevisionLabel,
  nextDocId,
  nextRevisionId,
  applyPublish,
  promoteScheduled,
} from './revisions';
import {
  canAuthor,
  canApprove,
  isSelfApproval,
  validateSubmit,
  validateDecision,
  validateDirectPublish,
} from './lifecycle';
import {
  isTargetRole,
  isAcknowledged,
  outstandingReaders,
  isOverdue,
  unacknowledgedRequiredReads,
  type Reader,
} from './acknowledgments';
import {
  readersFor,
  rosterFor,
  complianceSummary,
  overdueChaseList,
  complianceCsvRows,
  COMPLIANCE_CSV_HEADERS,
} from './compliance';
import { reviewStatus, computeNextReviewDate, docsDueForReview } from './review';
import { openSuggestionsForOwner, suggestionCounts } from './suggestions';

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
    status: 'published',
    sections: [{ id: 'SOP-001::preamble', level: 1, number: '', title: '', blocks: [{ id: 'SOP-001::preamble::b0', type: 'paragraph', md: 'Body' }] }],
    changeSummary: '',
    effectiveDate: '2026-01-01',
    authorUserId: 'USR007',
    authorName: 'Emily Chen',
    requireAcknowledgment: true,
    ackLevel: 'initials',
    mockChecksum: 'abc',
    ...overrides,
  };
}

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
    acknowledgedAtUtc: '2026-07-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('classes config', () => {
  it('bulletins and SOPs/manuals are controlled; tribal knowledge is not', () => {
    expect(DOC_CLASSES['procedural-bulletin'].controlled).toBe(true);
    expect(DOC_CLASSES['flight-ops-bulletin'].controlled).toBe(true);
    expect(DOC_CLASSES.sop.controlled).toBe(true);
    expect(DOC_CLASSES.manual.controlled).toBe(true);
    expect(DOC_CLASSES['tribal-knowledge'].controlled).toBe(false);
  });
  it('tribal knowledge locks ackLevel none and enables comments', () => {
    const tk = DOC_CLASSES['tribal-knowledge'];
    expect(tk.defaultAckLevel).toBe('none');
    expect(tk.ackLevelLocked).toBe(true);
    expect(tk.commentsEnabled).toBe(true);
  });
  it('classFor throws on unknown class', () => {
    expect(() => classFor('nope')).toThrow();
  });
  it('hasAnyRole accepts a single role or a role set', () => {
    expect(hasAnyRole(['a', 'b'], 'b')).toBe(true);
    expect(hasAnyRole(['a', 'b'], ['c', 'a'])).toBe(true);
    expect(hasAnyRole(['a', 'b'], ['c'])).toBe(false);
  });
});

describe('revisions', () => {
  it('currentRevision returns the single published revision', () => {
    const revs = [rev({ id: 'r1', status: 'superseded' }), rev({ id: 'r2', status: 'published' })];
    expect(currentRevision('SOP-001', revs)?.id).toBe('r2');
  });
  it('revisionsFor lists newest first', () => {
    const revs = [rev({ id: 'a' }), rev({ id: 'b' })];
    expect(revisionsFor('SOP-001', revs).map((r) => r.id)).toEqual(['b', 'a']);
  });
  it('nextRevisionLabel handles major/minor and non-numeric labels', () => {
    expect(nextRevisionLabel(undefined)).toBe('1.0');
    expect(nextRevisionLabel('1.0', 'major')).toBe('2.0');
    expect(nextRevisionLabel('1.0', 'minor')).toBe('1.1');
    expect(nextRevisionLabel('Rev C')).toBe('1.0');
  });
  it('nextDocId pads and increments per class prefix', () => {
    expect(nextDocId({ idPrefix: 'SOP' }, [{ id: 'SOP-001' }, { id: 'SOP-007' }, { id: 'PB-020' }])).toBe('SOP-008');
    expect(nextDocId({ idPrefix: 'TK' }, [])).toBe('TK-001');
  });
  it('nextRevisionId is monotonic over all of the doc revisions', () => {
    expect(nextRevisionId('SOP-001', [rev(), rev({ id: 'x' })])).toBe('SOP-001-r3');
  });
  it('applyPublish supersedes the prior published revision — single-published invariant', () => {
    const state = {
      docs: [doc()],
      revisions: [rev({ id: 'r1', status: 'published' }), rev({ id: 'r2', status: 'pending-approval' })],
    };
    const out = applyPublish(state, 'r2', NOW, TODAY);
    expect(out.revisions.find((r) => r.id === 'r1')?.status).toBe('superseded');
    expect(out.revisions.find((r) => r.id === 'r2')?.status).toBe('published');
    expect(out.revisions.filter((r) => r.status === 'published')).toHaveLength(1);
  });
  it('applyPublish resets the doc review clock when a cycle is set', () => {
    const state = {
      docs: [doc({ reviewCycleDays: 100, nextReviewDate: '2026-01-01' })],
      revisions: [rev({ id: 'r2', status: 'approved' })],
    };
    const out = applyPublish(state, 'r2', NOW, TODAY);
    expect(out.docs[0].nextReviewDate).toBe('2026-10-18'); // 2026-07-10 + 100d
  });
  it('promoteScheduled publishes approved revisions whose effective date arrived', () => {
    const state = {
      docs: [doc()],
      revisions: [
        rev({ id: 'r1', status: 'published' }),
        rev({ id: 'r2', status: 'approved', effectiveDate: '2026-07-10' }),
        rev({ id: 'r3', docId: 'SOP-001', status: 'approved', effectiveDate: '2026-08-01' }),
      ],
    };
    const out = promoteScheduled(state, NOW, TODAY);
    expect(out.revisions.find((r) => r.id === 'r2')?.status).toBe('published');
    expect(out.revisions.find((r) => r.id === 'r1')?.status).toBe('superseded');
    expect(out.revisions.find((r) => r.id === 'r3')?.status).toBe('approved'); // still scheduled
  });
});

describe('lifecycle (four-eyes)', () => {
  const sop = DOC_CLASSES.sop;
  it('canAuthor / canApprove honor class role lists', () => {
    expect(canAuthor(sop, 'procedural-specialist')).toBe(true);
    expect(canAuthor(sop, 'pilot')).toBe(false);
    expect(canApprove(sop, 'document-manager')).toBe(true);
    expect(canApprove(sop, 'procedural-specialist')).toBe(false);
  });
  it('canApprove is always false for uncontrolled classes', () => {
    expect(canApprove(DOC_CLASSES['tribal-knowledge'], 'admin')).toBe(false);
  });
  it('validateSubmit requires changeSummary only on re-issue', () => {
    expect(validateSubmit(rev({ status: 'draft', changeSummary: '' }), false).ok).toBe(true);
    expect(validateSubmit(rev({ status: 'draft', changeSummary: '' }), true).ok).toBe(false);
    expect(validateSubmit(rev({ status: 'draft', changeSummary: 'Gates changed.' }), true).ok).toBe(true);
  });
  it('validateSubmit rejects empty content and non-draft states', () => {
    expect(validateSubmit(rev({ status: 'draft', sections: [{ id: 'SOP-001::preamble', level: 1, number: '', title: '', blocks: [{ id: 'SOP-001::preamble::b0', type: 'paragraph', md: '  ' }] }] }), false).ok).toBe(false);
    expect(validateSubmit(rev({ status: 'published' }), false).ok).toBe(false);
    expect(validateSubmit(rev({ status: 'rejected' }), false).ok).toBe(true); // resubmit after reject
  });
  it('validateDecision blocks self-approval', () => {
    const pending = rev({ status: 'pending-approval', authorUserId: 'USR007' });
    expect(isSelfApproval(pending, 'USR007')).toBe(true);
    expect(validateDecision(sop, pending, 'USR007', 'document-manager').ok).toBe(false);
    expect(validateDecision(sop, pending, 'USR005', 'document-manager').ok).toBe(true);
  });
  it('validateDecision blocks non-approver roles and non-pending revisions', () => {
    const pending = rev({ status: 'pending-approval' });
    expect(validateDecision(sop, pending, 'USR005', 'pilot').ok).toBe(false);
    expect(validateDecision(sop, rev({ status: 'draft' }), 'USR005', 'document-manager').ok).toBe(false);
  });
  it('validateDirectPublish rejects controlled classes, allows tribal knowledge drafts', () => {
    expect(validateDirectPublish(sop, rev({ status: 'draft' })).ok).toBe(false);
    expect(validateDirectPublish(DOC_CLASSES['tribal-knowledge'], rev({ status: 'draft' })).ok).toBe(true);
    expect(validateDirectPublish(DOC_CLASSES['tribal-knowledge'], rev({ status: 'published' })).ok).toBe(false);
  });
});

describe('acknowledgments (re-arm on revision)', () => {
  it('isTargetRole supports all', () => {
    expect(isTargetRole(doc({ roles: ['all'] }), 'inflight')).toBe(true);
    expect(isTargetRole(doc({ roles: ['pilot'] }), 'inflight')).toBe(false);
  });
  it('an ack binds to the revision — a new revision re-arms', () => {
    const acks = [ack({ revisionId: 'SOP-001-r1' })];
    expect(isAcknowledged(rev({ id: 'SOP-001-r1' }), acks, 'USR001')).toBe(true);
    expect(isAcknowledged(rev({ id: 'SOP-001-r2' }), acks, 'USR001')).toBe(false);
  });
  it('outstandingReaders excludes users who acked this revision', () => {
    const readers: Reader[] = [
      { role: 'pilot', userId: 'USR001' },
      { role: 'lead', userId: 'USR004' },
    ];
    const out = outstandingReaders(rev(), readers, [ack({ userId: 'USR001' })]);
    expect(out.map((r) => r.userId)).toEqual(['USR004']);
  });
  it('isOverdue is strict-past on the ack due date', () => {
    expect(isOverdue(rev({ ackDueDate: '2026-07-09' }), TODAY)).toBe(true);
    expect(isOverdue(rev({ ackDueDate: '2026-07-10' }), TODAY)).toBe(false);
    expect(isOverdue(rev({}), TODAY)).toBe(false);
  });
  it('unacknowledgedRequiredReads: only published, ack-requiring, targeted, unacked, non-archived', () => {
    const docs = [
      doc({ id: 'A', roles: ['pilot'] }),
      doc({ id: 'B', roles: ['pilot'], isArchived: true }),
      doc({ id: 'C', roles: ['inflight'] }),
      doc({ id: 'D', roles: ['pilot'] }),
      doc({ id: 'E', roles: ['pilot'] }),
    ];
    const revisions = [
      rev({ id: 'A-r1', docId: 'A' }),
      rev({ id: 'B-r1', docId: 'B' }),
      rev({ id: 'C-r1', docId: 'C' }),
      rev({ id: 'D-r1', docId: 'D', requireAcknowledgment: false }),
      rev({ id: 'E-r1', docId: 'E', status: 'draft' }),
    ];
    const out = unacknowledgedRequiredReads(docs, revisions, [], 'pilot', 'USR001');
    expect(out.map((x) => x.doc.id)).toEqual(['A']);
  });
});

describe('compliance', () => {
  const universe: Reader[] = [
    { role: 'pilot', userId: 'USR001' },
    { role: 'lead', userId: 'USR004' },
    { role: 'inflight', userId: 'USR003' },
  ];
  it('readersFor expands audience and dedupes by userId', () => {
    expect(readersFor(doc({ roles: ['all'] }), universe)).toHaveLength(3);
    expect(readersFor(doc({ roles: ['pilot', 'lead'] }), universe)).toHaveLength(2);
    const dup: Reader[] = [
      { role: 'pilot', userId: 'USR001' },
      { role: 'chief-pilot', userId: 'USR001' },
    ];
    expect(readersFor(doc({ roles: ['all'] }), dup)).toHaveLength(1);
  });
  it('complianceSummary computes counts, pct, and overdue', () => {
    const readers = readersFor(doc({ roles: ['pilot', 'lead'] }), universe);
    const s = complianceSummary(rev({ ackDueDate: '2026-07-01' }), readers, [ack({ userId: 'USR001' })], TODAY);
    expect(s).toEqual({ total: 2, read: 1, outstanding: 1, pct: 50, overdue: true });
  });
  it('fully-read doc is never overdue', () => {
    const readers: Reader[] = [{ role: 'pilot', userId: 'USR001' }];
    const s = complianceSummary(rev({ ackDueDate: '2026-07-01' }), readers, [ack({ userId: 'USR001' })], TODAY);
    expect(s.overdue).toBe(false);
    expect(s.pct).toBe(100);
  });
  it('overdueChaseList lists reader×doc rows past due only', () => {
    const docs = [doc({ id: 'A', roles: ['pilot', 'lead'] }), doc({ id: 'B', roles: ['pilot'] })];
    const revisions = [
      rev({ id: 'A-r1', docId: 'A', ackDueDate: '2026-07-01' }),
      rev({ id: 'B-r1', docId: 'B', ackDueDate: '2026-08-01' }),
    ];
    const rows = overdueChaseList(docs, revisions, [ack({ revisionId: 'A-r1', userId: 'USR001' })], universe, TODAY);
    expect(rows).toHaveLength(1);
    expect(rows[0].doc.id).toBe('A');
    expect(rows[0].reader.userId).toBe('USR004');
  });
  it('complianceCsvRows emits the stable column set', () => {
    const docs = [doc({ id: 'A', roles: ['pilot'] })];
    const revisions = [rev({ id: 'A-r1', docId: 'A', ackDueDate: '2026-07-20' })];
    const rows = complianceCsvRows(docs, revisions, [], universe, () => 'SOP', (id, role) => `${role}:${id}`);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveLength(COMPLIANCE_CSV_HEADERS.length);
    expect(rows[0][8]).toBe('Outstanding');
  });
});

describe('review cycles', () => {
  it('reviewStatus thresholds', () => {
    expect(reviewStatus(doc({ nextReviewDate: undefined }), TODAY)).toBe('none');
    expect(reviewStatus(doc({ nextReviewDate: '2026-07-09' }), TODAY)).toBe('overdue');
    expect(reviewStatus(doc({ nextReviewDate: '2026-07-20' }), TODAY)).toBe('due-soon');
    expect(reviewStatus(doc({ nextReviewDate: '2026-08-09' }), TODAY)).toBe('due-soon'); // day 30
    expect(reviewStatus(doc({ nextReviewDate: '2026-08-10' }), TODAY)).toBe('ok');
  });
  it('computeNextReviewDate adds the cycle', () => {
    expect(computeNextReviewDate(TODAY, 180)).toBe('2027-01-06');
  });
  it('docsDueForReview skips archived docs', () => {
    const docs = [
      doc({ id: 'A', nextReviewDate: '2026-07-01' }),
      doc({ id: 'B', nextReviewDate: '2026-07-01', isArchived: true }),
      doc({ id: 'C', nextReviewDate: '2027-01-01' }),
    ];
    expect(docsDueForReview(docs, TODAY).map((d) => d.id)).toEqual(['A']);
  });
});

describe('suggestions', () => {
  it('openSuggestionsForOwner filters by ownership and open status, newest first', () => {
    const docs = [doc({ id: 'A', ownerUserId: 'U1' }), doc({ id: 'B', ownerUserId: 'U2' })];
    const sugs = [
      { id: 's1', docId: 'A', status: 'open', createdAtUtc: '2026-07-01T00:00:00Z' },
      { id: 's2', docId: 'A', status: 'accepted', createdAtUtc: '2026-07-02T00:00:00Z' },
      { id: 's3', docId: 'B', status: 'open', createdAtUtc: '2026-07-03T00:00:00Z' },
      { id: 's4', docId: 'A', status: 'open', createdAtUtc: '2026-07-04T00:00:00Z' },
    ] as any;
    expect(openSuggestionsForOwner(sugs, docs, 'U1').map((s: any) => s.id)).toEqual(['s4', 's1']);
  });
  it('suggestionCounts splits open vs resolved', () => {
    const sugs = [
      { id: 's1', docId: 'A', status: 'open' },
      { id: 's2', docId: 'A', status: 'declined' },
    ] as any;
    expect(suggestionCounts(sugs, 'A')).toEqual({ open: 1, resolved: 1 });
  });
});
