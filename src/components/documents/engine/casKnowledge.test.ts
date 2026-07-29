import { describe, it, expect } from 'vitest';
import type { Doc, DocRevision } from '../types';
import {
  appliesToFleet, casCatalog, fleetArticles, isCasEntry, matchCasCatalog, catalogEntryForMessage,
} from './casKnowledge';

/**
 * D60 — the per-fleet CAS catalog derived from the tribal-knowledge class.
 *
 * The catalog did not exist before this slice (D57's defect form deferred it in a code comment), so
 * these tests define it rather than pin an existing shape. The properties that matter:
 *   1. a tail is only ever offered knowledge tagged for its OWN fleet type (a G500 CAS message must
 *      never appear on a G650ER intake form — that is a wrong-type annunciation being suggested to a
 *      pilot on a signed record's form);
 *   2. only a PUBLISHED revision counts (a draft entry a curator is still writing is not knowledge);
 *   3. an archived entry drops out;
 *   4. structured CAS entries and freeform articles are disjoint sets, split on `casMeta`.
 */

const doc = (over: Partial<Doc> & { id: string }): Doc => ({
  classId: 'tribal-knowledge',
  title: `Entry ${over.id}`,
  category: 'Aircraft Quirks',
  roles: ['all'],
  ownerUserId: 'USR002',
  ownerName: 'Sarah Wilson',
  tags: [],
  isPinned: false,
  isArchived: false,
  createdDate: '2026-07-01',
  ...over,
});

const rev = (docId: string, status: DocRevision['status'] = 'published'): DocRevision => ({
  id: `${docId}-r1`,
  docId,
  revision: '1.0',
  status,
  sections: [],
  changeSummary: '',
  effectiveDate: '2026-07-01',
  authorUserId: 'USR002',
  authorName: 'Sarah Wilson',
  requireAcknowledgment: false,
  ackLevel: 'none',
  mockChecksum: 'abc',
});

const CAS_650 = doc({
  id: 'TK-100',
  title: 'R ENG CHIP — what it means and what it does not',
  fleetTypes: ['G650ER'],
  casMeta: { casMessage: 'R ENG CHIP', casColor: 'RED', cmcCodes: ['79-3100-02'] },
});
const CAS_500 = doc({
  id: 'TK-101',
  title: 'GPS 1 ADVISORY nuisance behaviour',
  fleetTypes: ['G500'],
  casMeta: { casMessage: 'GPS 1 ADVISORY', casColor: 'WHITE' },
});
const CAS_BOTH = doc({
  id: 'TK-102',
  title: 'CABIN TEMP — zone controller quirks',
  fleetTypes: ['G650ER', 'G500'],
  casMeta: { casMessage: 'CABIN TEMP', casColor: 'CYAN' },
});
const ARTICLE_650 = doc({ id: 'TK-103', title: 'Normal startup CAS stack', fleetTypes: ['G650ER'] });
const UNTAGGED = doc({ id: 'TK-104', title: 'KTEB ramp construction' });

const REVS = [CAS_650, CAS_500, CAS_BOTH, ARTICLE_650, UNTAGGED].map((d) => rev(d.id));
const DOCS = [CAS_650, CAS_500, CAS_BOTH, ARTICLE_650, UNTAGGED];

describe('appliesToFleet', () => {
  it('matches on the canonical type string', () => {
    expect(appliesToFleet(CAS_650, 'G650ER')).toBe(true);
    expect(appliesToFleet(CAS_650, 'G500')).toBe(false);
  });

  it('a multi-type entry applies to every type it names', () => {
    expect(appliesToFleet(CAS_BOTH, 'G650ER')).toBe(true);
    expect(appliesToFleet(CAS_BOTH, 'G500')).toBe(true);
    expect(appliesToFleet(CAS_BOTH, 'G800')).toBe(false);
  });

  it('an untagged entry is not fleet-scoped and never matches a fleet filter', () => {
    expect(appliesToFleet(UNTAGGED, 'G650ER')).toBe(false);
    expect(appliesToFleet(doc({ id: 'TK-105', fleetTypes: [] }), 'G650ER')).toBe(false);
  });
});

describe('casCatalog', () => {
  it('offers only the requested fleet type', () => {
    const g650 = casCatalog(DOCS, REVS, 'G650ER').map((e) => e.casMessage);
    expect(g650).toContain('R ENG CHIP');
    expect(g650).toContain('CABIN TEMP');
    expect(g650).not.toContain('GPS 1 ADVISORY');

    const g500 = casCatalog(DOCS, REVS, 'G500').map((e) => e.casMessage);
    expect(g500).toContain('GPS 1 ADVISORY');
    expect(g500).toContain('CABIN TEMP');
    expect(g500).not.toContain('R ENG CHIP');
  });

  it('is empty for a type with no curated entries', () => {
    expect(casCatalog(DOCS, REVS, 'G800')).toEqual([]);
  });

  it('excludes freeform articles — no casMeta, nothing to offer as an annunciation', () => {
    expect(casCatalog(DOCS, REVS, 'G650ER').map((e) => e.docId)).not.toContain('TK-103');
  });

  it('excludes entries whose only revision is a draft', () => {
    const draftOnly = [...REVS.filter((r) => r.docId !== 'TK-100'), rev('TK-100', 'draft')];
    expect(casCatalog(DOCS, draftOnly, 'G650ER').map((e) => e.docId)).not.toContain('TK-100');
  });

  it('excludes archived entries', () => {
    const docs = DOCS.map((d) => (d.id === 'TK-100' ? { ...d, isArchived: true } : d));
    expect(casCatalog(docs, REVS, 'G650ER').map((e) => e.docId)).not.toContain('TK-100');
  });

  it('ignores docs from other classes even if they somehow carry casMeta', () => {
    const foreign = doc({
      id: 'SOP-900',
      classId: 'sop',
      fleetTypes: ['G650ER'],
      casMeta: { casMessage: 'SHOULD NOT APPEAR', casColor: 'AMBER' },
    });
    const entries = casCatalog([...DOCS, foreign], [...REVS, rev('SOP-900')], 'G650ER');
    expect(entries.map((e) => e.casMessage)).not.toContain('SHOULD NOT APPEAR');
  });

  it('carries the doc + revision identity and the curated codes through', () => {
    const entry = casCatalog(DOCS, REVS, 'G650ER').find((e) => e.casMessage === 'R ENG CHIP')!;
    expect(entry).toMatchObject({
      docId: 'TK-100',
      revisionId: 'TK-100-r1',
      casColor: 'RED',
      cmcCodes: ['79-3100-02'],
      title: 'R ENG CHIP — what it means and what it does not',
    });
    // Absent codes normalize to an empty array so call sites need no null check.
    expect(casCatalog(DOCS, REVS, 'G500').find((e) => e.docId === 'TK-101')!.cmcCodes).toEqual([]);
  });

  it('sorts by message so the picker order is stable regardless of doc order', () => {
    const forward = casCatalog(DOCS, REVS, 'G650ER').map((e) => e.casMessage);
    const reversed = casCatalog([...DOCS].reverse(), REVS, 'G650ER').map((e) => e.casMessage);
    expect(forward).toEqual(reversed);
    expect(forward).toEqual([...forward].sort((a, b) => a.localeCompare(b)));
  });
});

describe('fleetArticles', () => {
  it('returns the freeform entries for the type and none of the structured CAS ones', () => {
    const ids = fleetArticles(DOCS, REVS, 'G650ER').map((d) => d.id);
    expect(ids).toEqual(['TK-103']);
  });

  it('excludes an unpublished article', () => {
    const drafted = [...REVS.filter((r) => r.docId !== 'TK-103'), rev('TK-103', 'draft')];
    expect(fleetArticles(DOCS, drafted, 'G650ER')).toEqual([]);
  });

  it('excludes untagged entries — they belong to the library, not to a fleet', () => {
    expect(fleetArticles(DOCS, REVS, 'G500').map((d) => d.id)).not.toContain('TK-104');
  });
});

describe('isCasEntry', () => {
  it('splits the two kinds on casMeta', () => {
    expect(isCasEntry(CAS_650)).toBe(true);
    expect(isCasEntry(ARTICLE_650)).toBe(false);
  });
});

describe('matchCasCatalog', () => {
  const entries = casCatalog(DOCS, REVS, 'G650ER');

  it('an empty query returns everything', () => {
    expect(matchCasCatalog(entries, '   ').length).toBe(entries.length);
  });

  it('matches the message case-insensitively on a substring', () => {
    expect(matchCasCatalog(entries, 'eng ch').map((e) => e.casMessage)).toEqual(['R ENG CHIP']);
  });

  it('matches the entry title as well as the message', () => {
    expect(matchCasCatalog(entries, 'zone controller').map((e) => e.docId)).toEqual(['TK-102']);
  });

  it('matches a curated CMC code', () => {
    expect(matchCasCatalog(entries, '79-3100').map((e) => e.docId)).toEqual(['TK-100']);
  });

  it('caps the list the way the MEL picker does', () => {
    const many = Array.from({ length: 40 }, (_, i) =>
      doc({
        id: `TK-2${String(i).padStart(2, '0')}`,
        fleetTypes: ['G800'],
        casMeta: { casMessage: `MSG ${i}`, casColor: 'AMBER' },
      }),
    );
    const built = casCatalog(many, many.map((d) => rev(d.id)), 'G800');
    expect(built.length).toBe(40);
    expect(matchCasCatalog(built, '').length).toBe(25);
  });
});

describe('catalogEntryForMessage', () => {
  const entries = casCatalog(DOCS, REVS, 'G650ER');

  it('finds the entry a typed message corresponds to, ignoring case and padding', () => {
    expect(catalogEntryForMessage(entries, '  r eng chip ')?.docId).toBe('TK-100');
  });

  it('returns undefined for free text that is not in the catalog', () => {
    expect(catalogEntryForMessage(entries, 'SOMETHING NEW')).toBeUndefined();
    expect(catalogEntryForMessage(entries, '')).toBeUndefined();
  });
});
