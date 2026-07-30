import { describe, it, expect } from 'vitest';
import type { AircraftType } from '../../tech-log/types';
import type { Doc, DocCasMeta, DocRevision } from '../types';
import {
  appliesToFleet, casCatalog, fleetArticles, isCasEntry, matchCasCatalog, catalogEntryForMessage,
  catalogEntriesForMessage, duplicateCasMessages,
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
 *
 * D65 — the CAS facts moved from the `Doc` row onto `DocRevision`, so an entry here is a
 * (doc, revision) PAIR and every fixture below builds both. `casDraftBoundary.test.tsx` holds the
 * property that shape exists for; these tests keep asserting the catalog's behaviour.
 */

interface EntrySpec {
  id: string;
  title?: string;
  classId?: string;
  isArchived?: boolean;
  status?: DocRevision['status'];
  fleetTypes?: AircraftType[];
  casMeta?: DocCasMeta;
}

const entry = ({ id, title, classId, isArchived, status, fleetTypes, casMeta }: EntrySpec): {
  doc: Doc;
  rev: DocRevision;
} => ({
  doc: {
    id,
    classId: classId ?? 'tribal-knowledge',
    title: title ?? `Entry ${id}`,
    category: 'Aircraft Quirks',
    roles: ['all'],
    ownerUserId: 'USR002',
    ownerName: 'Sarah Wilson',
    tags: [],
    isPinned: false,
    isArchived: isArchived ?? false,
    createdDate: '2026-07-01',
  },
  rev: {
    id: `${id}-r1`,
    docId: id,
    revision: '1.0',
    status: status ?? 'published',
    sections: [],
    changeSummary: '',
    effectiveDate: '2026-07-01',
    authorUserId: 'USR002',
    authorName: 'Sarah Wilson',
    requireAcknowledgment: false,
    ackLevel: 'none',
    mockChecksum: 'abc',
    fleetTypes,
    casMeta,
  },
});

const CAS_650 = entry({
  id: 'TK-100',
  title: 'R ENG CHIP — what it means and what it does not',
  fleetTypes: ['G650ER'],
  casMeta: { casMessage: 'R ENG CHIP', casColor: 'RED', cmcCodes: ['79-3100-02'] },
});
const CAS_500 = entry({
  id: 'TK-101',
  title: 'GPS 1 ADVISORY nuisance behaviour',
  fleetTypes: ['G500'],
  casMeta: { casMessage: 'GPS 1 ADVISORY', casColor: 'WHITE' },
});
const CAS_BOTH = entry({
  id: 'TK-102',
  title: 'CABIN TEMP — zone controller quirks',
  fleetTypes: ['G650ER', 'G500'],
  casMeta: { casMessage: 'CABIN TEMP', casColor: 'CYAN' },
});
const ARTICLE_650 = entry({ id: 'TK-103', title: 'Normal startup CAS stack', fleetTypes: ['G650ER'] });
const UNTAGGED = entry({ id: 'TK-104', title: 'KTEB ramp construction' });

const ALL = [CAS_650, CAS_500, CAS_BOTH, ARTICLE_650, UNTAGGED];
const DOCS = ALL.map((e) => e.doc);
const REVS = ALL.map((e) => e.rev);

describe('appliesToFleet', () => {
  it('matches on the canonical type string', () => {
    expect(appliesToFleet(CAS_650.rev, 'G650ER')).toBe(true);
    expect(appliesToFleet(CAS_650.rev, 'G500')).toBe(false);
  });

  it('a multi-type entry applies to every type it names', () => {
    expect(appliesToFleet(CAS_BOTH.rev, 'G650ER')).toBe(true);
    expect(appliesToFleet(CAS_BOTH.rev, 'G500')).toBe(true);
    expect(appliesToFleet(CAS_BOTH.rev, 'G800')).toBe(false);
  });

  it('an untagged entry is not fleet-scoped and never matches a fleet filter', () => {
    expect(appliesToFleet(UNTAGGED.rev, 'G650ER')).toBe(false);
    expect(appliesToFleet(entry({ id: 'TK-105', fleetTypes: [] }).rev, 'G650ER')).toBe(false);
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
    const draftOnly = REVS.map((r) => (r.docId === 'TK-100' ? { ...r, status: 'draft' as const } : r));
    expect(casCatalog(DOCS, draftOnly, 'G650ER').map((e) => e.docId)).not.toContain('TK-100');
  });

  it('excludes archived entries', () => {
    const docs = DOCS.map((d) => (d.id === 'TK-100' ? { ...d, isArchived: true } : d));
    expect(casCatalog(docs, REVS, 'G650ER').map((e) => e.docId)).not.toContain('TK-100');
  });

  it('ignores docs from other classes even if they somehow carry casMeta', () => {
    const foreign = entry({
      id: 'SOP-900',
      classId: 'sop',
      fleetTypes: ['G650ER'],
      casMeta: { casMessage: 'SHOULD NOT APPEAR', casColor: 'AMBER' },
    });
    const entries = casCatalog([...DOCS, foreign.doc], [...REVS, foreign.rev], 'G650ER');
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
    const drafted = REVS.map((r) => (r.docId === 'TK-103' ? { ...r, status: 'draft' as const } : r));
    expect(fleetArticles(DOCS, drafted, 'G650ER')).toEqual([]);
  });

  it('excludes untagged entries — they belong to the library, not to a fleet', () => {
    expect(fleetArticles(DOCS, REVS, 'G500').map((d) => d.id)).not.toContain('TK-104');
  });
});

describe('isCasEntry', () => {
  it('splits the two kinds on casMeta', () => {
    expect(isCasEntry(CAS_650.rev)).toBe(true);
    expect(isCasEntry(ARTICLE_650.rev)).toBe(false);
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
      entry({
        id: `TK-2${String(i).padStart(2, '0')}`,
        fleetTypes: ['G800'],
        casMeta: { casMessage: `MSG ${i}`, casColor: 'AMBER' },
      }),
    );
    const built = casCatalog(many.map((e) => e.doc), many.map((e) => e.rev), 'G800');
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

/**
 * A CAS message is NOT a key. The tribal-knowledge class is uncontrolled direct-publish (D60), so
 * there is no approval step at which a second entry for `R ENG CHIP` would be caught, and dropping
 * one silently would hide a curator's work behind an entry they cannot see is shadowing it. So the
 * engine keeps both, resolves the singular lookup by a STATED tie-break, and offers callers a way
 * to detect the duplication instead of guessing.
 */
describe('duplicate CAS messages across entries', () => {
  // Deliberately a HIGHER doc id than TK-100 and a DIFFERENT colour: if the tie-break were
  // accidental, or if a caller silently adopted a colour, this is the entry that would show it.
  const DUPE = entry({
    id: 'TK-199',
    title: 'R ENG CHIP — second opinion from the night shift',
    fleetTypes: ['G650ER'],
    casMeta: { casMessage: 'r eng chip', casColor: 'AMBER' },
  });
  const docs = [...DOCS, DUPE.doc];
  const revs = [...REVS, DUPE.rev];
  const dupEntries = casCatalog(docs, revs, 'G650ER');

  it('keeps BOTH entries in the catalog — neither curator is silently dropped', () => {
    expect(catalogEntriesForMessage(dupEntries, 'R ENG CHIP').map((e) => e.docId)).toEqual(['TK-100', 'TK-199']);
  });

  it('resolves the singular lookup to the earliest-curated entry (lowest doc id), always', () => {
    expect(catalogEntryForMessage(dupEntries, 'R ENG CHIP')?.docId).toBe('TK-100');
    // Deterministic for the catalog, not for the order the docs happened to arrive in.
    const reversed = casCatalog([...docs].reverse(), [...revs].reverse(), 'G650ER');
    expect(catalogEntryForMessage(reversed, 'R ENG CHIP')?.docId).toBe('TK-100');
  });

  it('reports the duplicated messages so a guard can refuse to ship them', () => {
    expect(duplicateCasMessages(dupEntries)).toEqual(['r eng chip']);
    expect(duplicateCasMessages(casCatalog(DOCS, REVS, 'G650ER'))).toEqual([]);
  });

  it('matches case-insensitively and ignores padding on the plural lookup too', () => {
    expect(catalogEntriesForMessage(dupEntries, '  R Eng Chip ')).toHaveLength(2);
    expect(catalogEntriesForMessage(dupEntries, '')).toEqual([]);
  });
});
