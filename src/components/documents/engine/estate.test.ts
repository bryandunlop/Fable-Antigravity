import { describe, it, expect } from 'vitest';
import type { EstateEntry } from './estate';
import {
  ESTATE,
  estateGaps,
  estateGroups,
  isMisplaced,
  needsBryan,
  verdictLabel,
} from './estate';

function entry(overrides: Partial<EstateEntry> = {}): EstateEntry {
  return {
    id: 'test-thing',
    name: 'Test thing',
    verdict: 'document',
    home: 'document-centre',
    homeDetail: 'Documents module',
    controlled: true,
    acknowledged: true,
    offline: true,
    owner: 'Document manager',
    usage: 'confirmed',
    ...overrides,
  };
}

describe('the one-question verdict', () => {
  it('labels each verdict in the words of the test, not jargon', () => {
    expect(verdictLabel('document')).toBe('Read before');
    expect(verdictLabel('record')).toBe('Wrote after');
    expect(verdictLabel('report')).toBe('Assembled live');
  });
});

describe('isMisplaced', () => {
  it('flags a document that does not live in the document centre', () => {
    expect(isMisplaced(entry({ verdict: 'document', home: 'other-module' }))).toBe(true);
    expect(isMisplaced(entry({ verdict: 'document', home: 'nowhere' }))).toBe(true);
  });

  it('does not flag a document that is already in the centre', () => {
    expect(isMisplaced(entry({ verdict: 'document', home: 'document-centre' }))).toBe(false);
  });

  it('does not flag a document that is deliberately outside myGFO', () => {
    // The QRH is Gulfstream's. "Not here" is the correct answer, not a gap.
    expect(isMisplaced(entry({ verdict: 'document', home: 'outside-mygfo' }))).toBe(false);
  });

  it('never flags records or reports — they are not supposed to be in the centre', () => {
    expect(isMisplaced(entry({ verdict: 'record', home: 'other-module' }))).toBe(false);
    expect(isMisplaced(entry({ verdict: 'report', home: 'other-module' }))).toBe(false);
  });
});

describe('needsBryan', () => {
  it('flags a row whose real-world usage is not confirmed', () => {
    expect(needsBryan(entry({ usage: 'unknown' }))).toBe(true);
    expect(needsBryan(entry({ usage: 'assumed' }))).toBe(true);
    expect(needsBryan(entry({ usage: 'confirmed' }))).toBe(false);
  });

  it('flags a confirmed row that still has no named owner', () => {
    expect(needsBryan(entry({ usage: 'confirmed', owner: 'unknown' }))).toBe(true);
  });
});

describe('estateGroups', () => {
  it('groups by verdict and keeps document first — the test reads before/after', () => {
    const groups = estateGroups([
      entry({ id: 'a', verdict: 'record' }),
      entry({ id: 'b', verdict: 'document' }),
      entry({ id: 'c', verdict: 'report' }),
    ]);
    expect(groups.map((g) => g.verdict)).toEqual(['document', 'record', 'report']);
  });

  it('drops a verdict with no entries rather than showing an empty heading', () => {
    const groups = estateGroups([entry({ verdict: 'document' })]);
    expect(groups).toHaveLength(1);
  });

  it('sorts entries within a group by name', () => {
    const groups = estateGroups([
      entry({ id: 'z', name: 'Zulu' }),
      entry({ id: 'a', name: 'Alpha' }),
    ]);
    expect(groups[0].entries.map((e) => e.name)).toEqual(['Alpha', 'Zulu']);
  });
});

describe('estateGaps', () => {
  it('counts misplaced documents and rows needing Bryan separately', () => {
    const gaps = estateGaps([
      entry({ id: 'a', verdict: 'document', home: 'other-module', usage: 'confirmed' }),
      entry({ id: 'b', verdict: 'document', home: 'nowhere', usage: 'unknown' }),
      entry({ id: 'c', verdict: 'record', home: 'other-module', usage: 'confirmed' }),
    ]);
    expect(gaps.misplaced).toBe(2);
    expect(gaps.needsBryan).toBe(1);
  });
});

describe('the seeded estate', () => {
  it('has unique ids', () => {
    const ids = ESTATE.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('carries every document class that exists today', () => {
    const centred = ESTATE.filter((e) => e.home === 'document-centre').map((e) => e.classId);
    for (const classId of [
      'procedural-bulletin',
      'flight-ops-bulletin',
      'sop',
      'manual',
      'received-document',
      'tribal-knowledge',
      'cabin-knowledge',
    ]) {
      expect(centred).toContain(classId);
    }
  });

  it('claims nothing about real-world usage that Bryan has not confirmed', () => {
    // The register's whole job is to make the unknowns visible. A seeded
    // 'confirmed' would be me asserting what GFO does, which is exactly the
    // failure this page exists to prevent.
    const confirmedWithoutSource = ESTATE.filter((e) => e.usage === 'confirmed' && !e.confirmedBy);
    expect(confirmedWithoutSource).toEqual([]);
  });

  it('records the QRH as deliberately outside myGFO, not as a gap', () => {
    const qrh = ESTATE.find((e) => e.id === 'qrh');
    expect(qrh?.home).toBe('outside-mygfo');
    expect(isMisplaced(qrh!)).toBe(false);
  });
});
