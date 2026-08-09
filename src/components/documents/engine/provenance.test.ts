import { describe, it, expect } from 'vitest';
import {
  displayDigest,
  formatBytes,
  isReceived,
  originLabel,
  originOf,
  provenanceLabel,
  receivedPlaceholderSections,
} from './provenance';
import { sectionsPlainText } from './blocks';
import type { Doc, DocAttachment, DocRevision } from '../types';

const BYTES_SHA = 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';

const att: DocAttachment = {
  blobKey: 'blob-1',
  filename: 'D195-MEL-rev15.pdf',
  mimeType: 'application/pdf',
  byteLength: 2_400_000,
  sha256: BYTES_SHA,
};

function doc(overrides: Partial<Doc> = {}): Doc {
  return {
    id: 'MEL-001',
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
    id: 'MEL-001-r1',
    docId: 'MEL-001',
    revision: '15',
    status: 'published',
    sections: [],
    changeSummary: '',
    effectiveDate: '2026-06-01',
    authorUserId: 'USR005',
    authorName: 'Lisa Anderson',
    requireAcknowledgment: false,
    ackLevel: 'none',
    mockChecksum: 'deadbeefcafe0000',
    ...overrides,
  };
}

const received = rev({
  provenance: {
    origin: 'received-copy',
    attachment: att,
    sourceLabel: 'P&G SharePoint — Flight Ops / MEL',
    ingestedAtUtc: '2026-08-08T09:00:00.000Z',
    carriageReason: 'required-onboard',
  },
});

describe('originOf', () => {
  it('reads absent provenance as authored — every pre-existing revision', () => {
    expect(originOf(rev())).toBe('authored');
    expect(originOf(undefined)).toBe('authored');
    expect(originLabel(rev())).toBe('Authored in myGFO');
  });

  it('distinguishes a held copy from a pointer', () => {
    expect(originOf(received)).toBe('received-copy');
    expect(isReceived(received)).toBe(true);
    const pointer = rev({ provenance: { origin: 'external-pointer' } });
    expect(isReceived(pointer)).toBe(false);
  });

  it('is not "received" without actual bytes — the claim requires the attachment', () => {
    expect(isReceived(rev({ provenance: { origin: 'received-copy' } }))).toBe(false);
  });
});

describe('displayDigest — the two-digest trap', () => {
  // A received revision carries BOTH mockChecksum (over a generated placeholder,
  // meaningless) and the real SHA-256 over its bytes. Showing the placeholder
  // digest beside a document a signature attests would be a lie on the record.
  it('returns the BYTES hash for a received revision, never the mock checksum', () => {
    const d = displayDigest(received);
    expect(d.hex).toBe(BYTES_SHA);
    expect(d.hex).not.toBe(received.mockChecksum);
    expect(d.label).toBe('SHA-256');
    expect(d.real).toBe(true);
  });

  it('returns the mock checksum for an authored revision, and says so', () => {
    const d = displayDigest(rev());
    expect(d.hex).toBe('deadbeefcafe0000');
    expect(d.label).toBe('digest (demo)');
    expect(d.real).toBe(false);
  });

  it('does not claim a real digest for a pointer — there are no bytes to hash', () => {
    const d = displayDigest(rev({ provenance: { origin: 'external-pointer' } }));
    expect(d.real).toBe(false);
  });

  it('shortens to 12 characters for display', () => {
    expect(displayDigest(received).short).toBe(BYTES_SHA.slice(0, 12));
  });
});

describe('provenanceLabel', () => {
  it('tells a received document\'s reader it works offline', () => {
    const line = provenanceLabel(doc(), received);
    expect(line).toContain('frozen copy');
    expect(line).toContain('P&G SharePoint — Flight Ops / MEL');
    expect(line).toContain('offline');
  });

  it('tells a pointer\'s reader plainly that it is NOT available offline', () => {
    const line = provenanceLabel(
      doc({ source: { kind: 'sharepoint', label: 'the OEM portal' } }),
      rev({ provenance: { origin: 'external-pointer' } }),
    );
    expect(line).toContain('link only');
    expect(line).toContain('not available offline');
  });

  it('says an authored document is the original', () => {
    expect(provenanceLabel(doc(), rev())).toContain('original');
  });
});

describe('receivedPlaceholderSections', () => {
  const sections = receivedPlaceholderSections('MEL-001', att, {
    sourceLabel: 'P&G SharePoint',
    ingestedAtUtc: '2026-08-08T09:00:00.000Z',
    carriageReason: 'required-onboard',
  });

  it('satisfies the non-empty-content rule, so four-eyes needs no special case', () => {
    expect(sectionsPlainText(sections).trim()).not.toBe('');
  });

  it('states the filename, the real digest, and WHY the bytes are held', () => {
    const text = sectionsPlainText(sections);
    expect(text).toContain('D195-MEL-rev15.pdf');
    expect(text).toContain(BYTES_SHA);
    expect(text).toContain('producible onboard');
  });

  it('reads as a description of what myGFO holds, not as the document', () => {
    expect(sectionsPlainText(sections)).toContain('myGFO holds the bytes');
  });
});

describe('formatBytes', () => {
  it('scales to a unit a person can read', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(2048)).toBe('2 KB');
    expect(formatBytes(2_400_000)).toBe('2.3 MB');
  });
});

describe('provenance survives an ordinary draft edit', () => {
  // Found in review: DocEditorDialog rebuilds the revision object from scratch,
  // and provenance is optional — so omitting it compiled cleanly and silently
  // turned a received MEL into an "authored in myGFO" document, dropping it back
  // to the meaningless placeholder digest. A fabricated provenance claim on the
  // exact record D73 exists to protect.
  it('an edited revision that keeps its provenance is still a received copy', () => {
    const edited = { ...received, sections: [], changeSummary: 'Typo in the summary.' };
    expect(isReceived(edited)).toBe(true);
    expect(displayDigest(edited).hex).toBe(BYTES_SHA);
  });

  it('dropping provenance is what the bug looked like — it reverts to authored', () => {
    const stripped = { ...received, provenance: undefined };
    expect(originOf(stripped)).toBe('authored');
    expect(displayDigest(stripped).hex).toBe(stripped.mockChecksum);
  });
});
