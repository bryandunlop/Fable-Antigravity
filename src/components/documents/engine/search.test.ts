import { describe, it, expect } from 'vitest';
import type { Doc, DocRevision } from '../types';
import { searchDocuments } from './search';
import { expandQuery, tokenize } from './aviationTerms';

function doc(id: string, title: string, over: Partial<Doc> = {}): Doc {
  return {
    id,
    classId: 'manual',
    title,
    category: 'General Operations',
    roles: ['pilot'],
    ownerUserId: 'U1',
    ownerName: 'Owner',
    tags: [],
    isPinned: false,
    isArchived: false,
    createdDate: '2026-01-01',
    ...over,
  };
}

function rev(docId: string, id: string, sections: Array<[string, string, string]>, over: Partial<DocRevision> = {}): DocRevision {
  return {
    id,
    docId,
    revision: '14',
    status: 'published',
    sections: sections.map(([num, title, md]) => ({
      id: `${docId}::${title.toLowerCase().replace(/\W+/g, '-')}`,
      level: 2,
      number: num,
      title,
      blocks: [{ id: `${docId}::b0`, type: 'paragraph', md }],
    })),
    changeSummary: '',
    effectiveDate: '2026-02-01',
    ackLevel: 'initials',
    ...over,
  } as DocRevision;
}

const GOM = doc('GOM-3', 'General Operations Manual');
const gomRev = rev('GOM-3', 'GOM-3-r1', [
  ['3.3', 'Flight Planning', 'Verify chart currency before each flight.'],
  ['3.5', 'Fuel Policy', 'Carry a 45-minute reserve. Fuelling with passengers aboard requires two crew.'],
]);

describe('tokenize', () => {
  it('keeps regulation numbers intact — 91.213 is one term, not two', () => {
    expect(tokenize('see 91.213 and 91.417')).toEqual(['see', '91.213', 'and', '91.417']);
  });

  it('strips punctuation but not internal hyphens', () => {
    expect(tokenize('de-ice, then go!')).toEqual(['de-ice', 'then', 'go']);
  });
});

describe('expandQuery', () => {
  it('widens an acronym to its long form and back', () => {
    expect(expandQuery('pax').terms).toEqual(expect.arrayContaining(['pax', 'passenger', 'passengers']));
    expect(expandQuery('passengers').terms).toContain('pax');
  });

  it('widens a whole phrase that single tokens could not see', () => {
    // "minimum equipment list" only means MEL as a phrase — expanding its words
    // individually would make a MEL search match anything mentioning "equipment".
    expect(expandQuery('minimum equipment list').terms).toContain('mel');
  });

  it('reports what it widened so the UI can say so', () => {
    expect(expandQuery('pax').expandedFrom.get('pax')).toEqual(expect.arrayContaining(['passengers']));
  });

  it('leaves an unknown word alone', () => {
    expect(expandQuery('windsock').expandedFrom.size).toBe(0);
  });
});

describe('searchDocuments', () => {
  const run = (q: string, docs = [GOM], revs = [gomRev], res = []) =>
    searchDocuments(q, docs, revs, res);

  it('finds a phrase in block content — the thing the hub could never do', () => {
    const { hits } = run('reserve');
    expect(hits).toHaveLength(1);
    expect(hits[0].sectionLabel).toBe('3.5 Fuel Policy');
  });

  it('ignores a query too short to mean anything', () => {
    expect(run('a').hits).toEqual([]);
  });

  it('matches through the synonym table', () => {
    // The manual says "passengers"; the pilot types "pax".
    const { hits, expandedFrom } = run('pax');
    expect(hits).toHaveLength(1);
    expect(expandedFrom.get('pax')).toContain('passengers');
  });

  it('matches whole words only', () => {
    // Without this, "ad" (airworthiness directive) hits "additional" and an AD
    // search returns most of the library.
    const withAdditional = rev('X-1', 'X-1-r1', [['1', 'Scope', 'Additional guidance applies.']]);
    expect(run('ad', [doc('X-1', 'X')], [withAdditional]).hits).toEqual([]);
  });

  it('ranks a heading match above a body mention', () => {
    const revs = [
      rev('A-1', 'A-1-r1', [['1', 'Fuelling', 'General provisions.']]),
      rev('B-1', 'B-1-r1', [['1', 'Scope', 'This covers fuelling in passing.']]),
    ];
    const { hits } = run('fuelling', [doc('A-1', 'A'), doc('B-1', 'B')], revs);
    expect(hits[0].docId).toBe('A-1');
  });

  it('highlights the matched run inside the snippet', () => {
    const { hits } = run('reserve');
    const matched = hits[0].snippet.filter((s) => s.match).map((s) => s.text.toLowerCase());
    expect(matched).toContain('reserve');
  });

  it('NEVER returns a superseded revision', () => {
    // Not ranked lower — absent. A plausible hit on last year's wording, read in a
    // hurry, is worse than no hit at all.
    const old = rev('GOM-3', 'GOM-3-r0', [['3.5', 'Fuel Policy', 'Carry a 30-minute reserve.']], {
      status: 'superseded',
      revision: '13',
    });
    const { hits } = run('reserve', [GOM], [old, gomRev]);
    expect(hits).toHaveLength(1);
    expect(hits[0].revisionLabel).toBe('14');
    expect(hits.some((h) => /30-minute/.test(h.snippet.map((s) => s.text).join('')))).toBe(false);
  });

  it('skips archived and retired documents', () => {
    expect(run('reserve', [doc('GOM-3', 'G', { isArchived: true })]).hits).toEqual([]);
    expect(
      run('reserve', [
        doc('GOM-3', 'G', { retirement: { intoDocId: 'X', intoRevisionId: 'X-r1', retiredOn: '2026-08-22' } }),
      ]).hits,
    ).toEqual([]);
  });

  it('searches an amended section as it GOVERNS, not as the manual wrote it', () => {
    const bulletin = rev('PB-014', 'PB-014-r1', [['', 'Procedure', 'Carry a 60-minute reserve.']], {
      effectiveDate: '2026-06-12',
      amendments: [
        {
          id: 'PB-014-r1::am0',
          targetDocId: 'GOM-3',
          targetSectionId: 'GOM-3::fuel-policy',
          summary: 'Reserve raised.',
          replacementSectionId: 'PB-014::procedure',
        },
      ],
    });
    const { hits } = run('60-minute', [GOM], [gomRev, bulletin]);
    expect(hits).toHaveLength(1);
    expect(hits[0].amendedBy).toBe('PB-014');

    // And the wording it replaced is no longer findable in the manual.
    expect(run('45-minute', [GOM], [gomRev, bulletin]).hits).toEqual([]);
  });

  it('counts distinct documents, not hits', () => {
    const revs = [
      rev('A-1', 'A-1-r1', [['1', 'One', 'reserve here'], ['2', 'Two', 'reserve again']]),
      rev('B-1', 'B-1-r1', [['1', 'One', 'reserve too']]),
    ];
    const out = run('reserve', [doc('A-1', 'A'), doc('B-1', 'B')], revs);
    expect(out.hits).toHaveLength(3);
    expect(out.docCount).toBe(2);
  });
});
