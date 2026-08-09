import { describe, it, expect } from 'vitest';
import {
  docInFlight,
  inFlightRevision,
  stagedBlocks,
  suggestionOutcome,
  workingDraft,
} from './workbench';
import { revisionsFor } from './revisions';
import type { Doc, DocRevision, DocSuggestion, RevisionStatus } from '../types';

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
    revision: '1.0',
    status,
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

function sug(overrides: Partial<DocSuggestion> = {}): DocSuggestion {
  return {
    id: 'sug-001',
    docId: 'SOP-001',
    revisionId: 'SOP-001-r1',
    docTitle: 'Test SOP',
    authorUserId: 'USR010',
    authorName: 'Marco Diaz',
    role: 'pilot',
    proposedChange: 'Add a gusty crosswind note',
    rationale: 'It bit us in ABQ',
    status: 'open',
    createdAtUtc: '2026-08-01T09:00:00.000Z',
    ...overrides,
  };
}

const TODAY = '2026-08-08';

describe('workingDraft / inFlightRevision', () => {
  it('finds nothing when every revision is settled', () => {
    const revs = [rev('SOP-001-r1', 'superseded'), rev('SOP-001-r2', 'published')];
    expect(workingDraft('SOP-001', revs)).toBeUndefined();
    expect(inFlightRevision('SOP-001', revs)).toBeUndefined();
  });

  it('treats a rejected revision as the working draft — it is still editable', () => {
    const revs = [rev('SOP-001-r1', 'published'), rev('SOP-001-r2', 'rejected')];
    expect(workingDraft('SOP-001', revs)?.id).toBe('SOP-001-r2');
  });

  it('does NOT treat pending-approval as editable, but does count it as in flight', () => {
    const revs = [rev('SOP-001-r1', 'published'), rev('SOP-001-r2', 'pending-approval')];
    expect(workingDraft('SOP-001', revs)).toBeUndefined();
    expect(inFlightRevision('SOP-001', revs)?.id).toBe('SOP-001-r2');
  });
});

describe('revisionsFor ordering', () => {
  it('orders by the -rN suffix, not by array position', () => {
    // Insertion order deliberately scrambled, and r10 must outrank r2.
    const revs = [rev('SOP-001-r2', 'superseded'), rev('SOP-001-r10', 'published'), rev('SOP-001-r1', 'superseded')];
    expect(revisionsFor('SOP-001', revs).map((r) => r.id)).toEqual([
      'SOP-001-r10',
      'SOP-001-r2',
      'SOP-001-r1',
    ]);
  });
});

describe('suggestionOutcome — derived from the carrying revision, never from status alone', () => {
  const carrier = (status: RevisionStatus) => [rev('SOP-001-r2', status)];
  const accepted = sug({ status: 'accepted', resolvedIntoRevisionId: 'SOP-001-r2' });

  it('reports open and declined straight through', () => {
    expect(suggestionOutcome(sug(), [])).toBe('open');
    expect(suggestionOutcome(sug({ status: 'declined' }), [])).toBe('declined');
  });

  it('reports published only when the carrying revision actually published', () => {
    expect(suggestionOutcome(accepted, carrier('published'))).toBe('published');
    expect(suggestionOutcome(accepted, carrier('superseded'))).toBe('published');
  });

  it('reports the in-between stages honestly', () => {
    expect(suggestionOutcome(accepted, carrier('draft'))).toBe('staged-in-draft');
    expect(suggestionOutcome(accepted, carrier('pending-approval'))).toBe('pending-approval');
    expect(suggestionOutcome(accepted, carrier('approved'))).toBe('scheduled');
  });

  it('reports dropped — never published — when the carrying revision died', () => {
    // The trap: status is still 'accepted'. Trusting it would tell a reader
    // their change shipped when the draft carrying it was pulled.
    expect(suggestionOutcome(accepted, carrier('withdrawn'))).toBe('dropped');
    expect(suggestionOutcome(accepted, carrier('rejected'))).toBe('dropped');
    expect(suggestionOutcome(accepted, [])).toBe('dropped');
  });

  it('does not invent a link for suggestions accepted before the field existed', () => {
    expect(suggestionOutcome(sug({ status: 'accepted' }), carrier('published'))).toBe('staged-in-draft');
  });
});

describe('stagedBlocks', () => {
  it('collects only blocks carrying a reader\'s unresolved words', () => {
    const r = rev('SOP-001-r2', 'draft');
    r.sections[0].blocks.push(
      { id: 'b1', type: 'paragraph', md: 'Reader words', stagedFromSuggestionId: 'sug-001' },
      { id: 'b2', type: 'paragraph', md: 'Real text' },
    );
    expect(stagedBlocks(r.sections).map((b) => b.id)).toEqual(['b1']);
  });
});

describe('docInFlight', () => {
  it('counts suggestions for THIS doc only', () => {
    const result = docInFlight(
      doc(),
      [rev('SOP-001-r1', 'published')],
      [sug(), sug({ id: 'sug-002', docId: 'SOP-002' }), sug({ id: 'sug-003', status: 'declined' })],
      TODAY,
    );
    expect(result.openSuggestionCount).toBe(1);
  });

  it('is quiet when nothing is happening', () => {
    const result = docInFlight(doc(), [rev('SOP-001-r1', 'published')], [], TODAY);
    expect(result.hasActivity).toBe(false);
    expect(result.stagedCount).toBe(0);
  });

  it('surfaces the draft, its staged count, and the scheduled revision', () => {
    const draft = rev('SOP-001-r2', 'draft');
    draft.sections[0].blocks.push({
      id: 'b1', type: 'paragraph', md: 'Reader words', stagedFromSuggestionId: 'sug-001',
    });
    const result = docInFlight(
      doc(),
      [rev('SOP-001-r1', 'published'), draft, rev('SOP-001-r3', 'approved')],
      [],
      TODAY,
    );
    expect(result.workingDraft?.id).toBe('SOP-001-r2');
    expect(result.stagedCount).toBe(1);
    expect(result.scheduled?.id).toBe('SOP-001-r3');
    expect(result.hasActivity).toBe(true);
  });

  it('flags an overdue review as activity even with no draft or suggestions', () => {
    const result = docInFlight(
      doc({ nextReviewDate: '2026-01-01' }),
      [rev('SOP-001-r1', 'published')],
      [],
      TODAY,
    );
    expect(result.review).toBe('overdue');
    expect(result.hasActivity).toBe(true);
  });
});
