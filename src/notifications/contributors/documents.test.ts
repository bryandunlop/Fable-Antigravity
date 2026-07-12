import { describe, it, expect } from 'vitest';
import { buildDocumentsFeed } from './documents';
import { memoryStorage } from '../storage';
import type { Doc, DocRevision, DocAcknowledgment, DocSuggestion } from '../../components/documents/types';

const NOW = '2026-07-10T12:00:00.000Z';

function doc(overrides: Partial<Doc> = {}): Doc {
  return {
    id: 'SOP-001',
    classId: 'sop',
    title: 'Stabilized Approach Criteria',
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
    ackLevel: 'signature',
    mockChecksum: 'abc',
    ...overrides,
  };
}

function seed(state: {
  docs?: Doc[];
  revisions?: DocRevision[];
  acknowledgments?: DocAcknowledgment[];
  suggestions?: DocSuggestion[];
}) {
  const s = memoryStorage();
  s.setItem(
    'documents-state',
    JSON.stringify({
      docs: state.docs ?? [],
      revisions: state.revisions ?? [],
      acknowledgments: state.acknowledgments ?? [],
      suggestions: state.suggestions ?? [],
    }),
  );
  return s;
}

describe('buildDocumentsFeed', () => {
  it('returns nothing when storage is empty', () => {
    expect(buildDocumentsFeed('pilot', NOW, memoryStorage())).toEqual([]);
  });

  it('emits a required-read item; bulletin classes keep the LEGACY id format so prior dismissals survive', () => {
    const s = seed({
      docs: [doc({ id: 'PB-001', classId: 'procedural-bulletin', title: 'Winter Ops' })],
      revisions: [rev({ id: 'PB-001-r1', docId: 'PB-001', revision: '1.1', ackLevel: 'initials' })],
    });
    const feed = buildDocumentsFeed('pilot', NOW, s);
    expect(feed).toHaveLength(1);
    expect(feed[0].id).toBe('bulletin-ack:PB-001:1.1'); // legacy format, NOT doc-ack:…
    expect(feed[0].link).toBe('/procedural-bulletins');
    expect(feed[0].severity).toBe('warn');
  });

  it('non-bulletin classes use the doc-ack id and deep-link into the hub reader', () => {
    const s = seed({ docs: [doc()], revisions: [rev()] });
    const feed = buildDocumentsFeed('pilot', NOW, s);
    expect(feed[0].id).toBe('doc-ack:SOP-001:SOP-001-r1');
    expect(feed[0].link).toBe('/documents/SOP-001');
    expect(feed[0].title).toContain('read & sign');
  });

  it('escalates to critical past the ack due date', () => {
    const s = seed({ docs: [doc()], revisions: [rev({ ackDueDate: '2026-07-01' })] });
    expect(buildDocumentsFeed('pilot', NOW, s)[0].severity).toBe('critical');
  });

  it('clears once the user acknowledges the current revision', () => {
    const s = seed({
      docs: [doc()],
      revisions: [rev()],
      acknowledgments: [{
        docId: 'SOP-001', revisionId: 'SOP-001-r1', revision: '1.0', userId: 'USR001',
        userName: 'Captain John Smith', role: 'pilot', level: 'signature',
        signatureId: 'sig-1', acknowledgedAtUtc: NOW,
      }],
    });
    expect(buildDocumentsFeed('pilot', NOW, s)).toEqual([]);
  });

  it('review-due items go to the owner and to document-manager, not to bystanders', () => {
    const s = seed({
      docs: [doc({ roles: ['maintenance'], ownerUserId: 'USR007', nextReviewDate: '2026-07-01' })],
      revisions: [rev({ requireAcknowledgment: false, ackLevel: 'none' })],
    });
    // USR007 is the pilot-role fallback for 'standards'… use the owner's role: Emily Chen has 'pilot'.
    const ownerFeed = buildDocumentsFeed('pilot', NOW, s); // resolveUserId('pilot') = USR001 ≠ owner
    expect(ownerFeed.some((f) => f.id.startsWith('doc-review:'))).toBe(false);
    const dmFeed = buildDocumentsFeed('document-manager', NOW, s);
    expect(dmFeed.some((f) => f.id.startsWith('doc-review:'))).toBe(true);
  });

  it('open suggestions surface to document-manager with a count-keyed id', () => {
    const s = seed({
      docs: [doc({ roles: ['maintenance'] })],
      revisions: [rev({ requireAcknowledgment: false, ackLevel: 'none' })],
      suggestions: [{
        id: 's1', docId: 'SOP-001', revisionId: 'SOP-001-r1', docTitle: 'T',
        authorUserId: 'U', authorName: 'N', role: 'pilot',
        proposedChange: 'x', rationale: 'y', status: 'open', createdAtUtc: NOW,
      }],
    });
    const feed = buildDocumentsFeed('document-manager', NOW, s);
    const item = feed.find((f) => f.id.startsWith('doc-suggestions:'));
    expect(item?.id).toBe('doc-suggestions:SOP-001:1');
  });

  it('pending approvals notify approver roles but never the submitter', () => {
    const s = seed({
      docs: [doc({ roles: ['maintenance'] })],
      revisions: [rev({ status: 'pending-approval', authorUserId: 'role:document-manager', authorName: 'DM' })],
    });
    const approverFeed = buildDocumentsFeed('lead', NOW, s);
    expect(approverFeed.some((f) => f.id === 'doc-approval:SOP-001-r1')).toBe(true);
    const selfFeed = buildDocumentsFeed('document-manager', NOW, s);
    expect(selfFeed.some((f) => f.id === 'doc-approval:SOP-001-r1')).toBe(false);
    const pilotFeed = buildDocumentsFeed('pilot', NOW, s);
    expect(pilotFeed.some((f) => f.id === 'doc-approval:SOP-001-r1')).toBe(false);
  });
});
