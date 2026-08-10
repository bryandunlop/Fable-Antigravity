// D73 — ingesting a received document, and confirming where its source lives.
//
// The two facts are deliberately separate actions on separate rows: the bytes
// are an append-only claim that rides four-eyes, the link is updatable reference
// data. Re-pointing a link must never change what a signed revision says about
// its own content.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { documentsReducer, type DocumentsAction } from './DocumentsContext';
import type { Doc, DocRevision, DocumentsState, DocSource, RevisionStatus } from './types';

const NOW = '2026-08-08T12:00:00.000Z';
const SHA = 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';

function doc(overrides: Partial<Doc> = {}): Doc {
  return {
    id: 'RCV-001',
    classId: 'received-document',
    title: 'D195 MEL',
    category: 'Airworthiness',
    roles: ['all'],
    ownerUserId: 'USR005',
    ownerName: 'Lisa Anderson',
    tags: [],
    isPinned: false,
    isArchived: false,
    createdDate: '2026-01-01',
    ...overrides,
  };
}

function rev(overrides: Partial<DocRevision> = {}): DocRevision {
  return {
    id: 'RCV-001-r1',
    docId: 'RCV-001',
    revision: '15',
    status: 'draft',
    sections: [{
      id: 'RCV-001::received', level: 1, number: '', title: '',
      blocks: [{ id: 'RCV-001::received::b0', type: 'paragraph', md: 'D195-MEL-rev15.pdf' }],
    }],
    changeSummary: '',
    effectiveDate: '2026-08-08',
    authorUserId: 'USR005',
    authorName: 'Lisa Anderson',
    requireAcknowledgment: false,
    ackLevel: 'none',
    mockChecksum: 'placeholder',
    provenance: {
      origin: 'received-copy',
      attachment: {
        blobKey: 'blob-1', filename: 'D195-MEL-rev15.pdf',
        mimeType: 'application/pdf', byteLength: 2_400_000, sha256: SHA,
      },
      ingestedAtUtc: NOW,
      sourceLabel: 'P&G SharePoint — Flight Ops / MEL',
      carriageReason: 'required-onboard',
    },
    ...overrides,
  };
}

function state(revisions: DocRevision[] = []): DocumentsState {
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

const ingest = (revision = rev(), actorRoles = ['document-manager']): DocumentsAction => ({
  type: 'INGEST_RECEIVED_REVISION',
  payload: { revision, actorRoles },
});

const source: DocSource = {
  kind: 'sharepoint',
  driveId: 'b!drive-abc',
  itemId: '01ITEMXYZ',
  webUrl: 'https://pg.sharepoint.com/sites/flightops/MEL/D195.pdf',
  label: 'P&G SharePoint — Flight Ops / MEL',
};

const mute = () => vi.spyOn(console, 'warn').mockImplementation(() => {});
afterEach(() => vi.restoreAllMocks());

describe('INGEST_RECEIVED_REVISION', () => {
  it('lands as a DRAFT, never as a published revision', () => {
    // D73 step G: a changed source file does not become the effective revision
    // on its own, or an external edit button is an unsigned publish path.
    const after = documentsReducer(state(), ingest(rev({ status: 'published' })));

    expect(after.revisions).toHaveLength(1);
    expect(after.revisions[0].status).toBe('draft');
    expect(after.revisions[0].provenance?.attachment?.sha256).toBe(SHA);
  });

  it('requires a document-control role — same gate as every other manager action', () => {
    mute();
    const before = state();
    for (const role of ['pilot', 'maintenance', 'inflight', 'scheduling']) {
      expect(documentsReducer(before, ingest(rev(), [role]))).toBe(before);
    }
    // DOC_MANAGER_ROLES is the project's existing document-control set, and this
    // action uses it unchanged rather than inventing a narrower one.
    expect(documentsReducer(before, ingest(rev(), ['procedural-specialist'])).revisions).toHaveLength(1);
  });

  it('refuses a received claim with no myGFO-computed digest', () => {
    mute();
    const before = state();
    const noHash = rev({
      provenance: {
        origin: 'received-copy',
        attachment: { blobKey: 'b', filename: 'f.pdf', mimeType: 'application/pdf', byteLength: 1, sha256: '' },
      },
    });
    expect(documentsReducer(before, ingest(noHash))).toBe(before);
  });

  it('refuses a received claim with no frozen bytes', () => {
    mute();
    const before = state();
    expect(documentsReducer(before, ingest(rev({ provenance: { origin: 'received-copy' } })))).toBe(before);
  });

  it('refuses a revision that is not claiming to be a received copy', () => {
    mute();
    const before = state();
    expect(documentsReducer(before, ingest(rev({ provenance: undefined })))).toBe(before);
    expect(documentsReducer(before, ingest(rev({ provenance: { origin: 'external-pointer' } })))).toBe(before);
  });

  for (const busy of ['draft', 'rejected', 'pending-approval'] as RevisionStatus[]) {
    it(`respects the one-working-draft rule (${busy} already in flight)`, () => {
      mute();
      const before = state([rev({ id: 'RCV-001-r0', status: busy })]);
      const after = documentsReducer(before, ingest());
      expect(after).toBe(before);
    });
  }

  it('refuses a colliding revision id', () => {
    mute();
    const before = state([rev({ id: 'RCV-001-r1', status: 'published' })]);
    expect(documentsReducer(before, ingest())).toBe(before);
  });

  it('refuses when the document does not exist', () => {
    mute();
    const before = { ...state(), docs: [] };
    expect(documentsReducer(before, ingest())).toBe(before);
  });
});

describe('CONFIRM_SOURCE', () => {
  const confirm = (byRoles = ['document-manager']): DocumentsAction => ({
    type: 'CONFIRM_SOURCE',
    payload: { docId: 'RCV-001', source, byUserId: 'USR005', byName: 'Lisa Anderson', byRoles, atUtc: NOW },
  });

  it('records the link and who confirmed it, when', () => {
    const after = documentsReducer(state(), confirm());

    expect(after.docs[0].source).toMatchObject({
      driveId: 'b!drive-abc',
      itemId: '01ITEMXYZ',
      lastConfirmedByName: 'Lisa Anderson',
      lastConfirmedAtUtc: NOW,
    });
  });

  it('MUTATES NO REVISION — re-pointing a link is not a new revision', () => {
    // The counterfactual this design exists to prevent: if the hash lived on the
    // Doc, correcting a URL would silently change what an already-signed
    // revision claims about its own bytes.
    const before = state([rev({ status: 'published' })]);
    const after = documentsReducer(before, confirm());

    expect(after.revisions).toBe(before.revisions);
  });

  it('requires a document manager', () => {
    mute();
    const before = state();
    expect(documentsReducer(before, confirm(['pilot']))).toBe(before);
  });

  it('refuses an unknown document', () => {
    mute();
    const before = { ...state(), docs: [] };
    expect(documentsReducer(before, confirm())).toBe(before);
  });
});
