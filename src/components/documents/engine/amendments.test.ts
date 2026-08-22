import { describe, it, expect } from 'vitest';
import type { DocRevision } from '../types';
import type { ExternalAlert, AmendmentResolution } from './amendments';
import {
  amendmentsInForce,
  amendmentsForSection,
  daysOutstanding,
  isResolved,
  outstandingWork,
  replacementSection,
  resolutionFor,
} from './amendments';

const TODAY = '2026-08-22';

function rev(overrides: Partial<DocRevision> = {}): DocRevision {
  return {
    id: 'PB-014-r1',
    docId: 'PB-014',
    revision: '1.0',
    status: 'published',
    sections: [],
    changeSummary: '',
    effectiveDate: '2026-06-12',
    ackLevel: 'initials',
    createdBy: 'U1',
    createdByName: 'Author',
    createdDate: '2026-06-10',
    ...overrides,
  } as DocRevision;
}

function amending(overrides: Partial<DocRevision> = {}): DocRevision {
  return rev({
    amendments: [
      {
        id: 'PB-014-r1::am0',
        targetDocId: 'GOM-001',
        targetSectionId: 'GOM-001::4-2',
        summary: 'Requires two qualified crew rather than one.',
      },
    ],
    ...overrides,
  });
}

function alert(overrides: Partial<ExternalAlert> = {}): ExternalAlert {
  return {
    id: 'ALERT-001',
    origin: 'Nimbl reg watch',
    title: 'NAV CANADA — Gander OCA procedure clarification',
    receivedOn: '2026-08-14',
    targetDocIds: ['GOM-001'],
    summary: 'Oceanic clearance wording changed.',
    ...overrides,
  };
}

describe('amendmentsInForce', () => {
  it('finds an amendment a published revision declares against a document', () => {
    const found = amendmentsInForce('GOM-001', [amending()], []);
    expect(found).toHaveLength(1);
    expect(found[0].sourceDocId).toBe('PB-014');
    expect(found[0].summary).toContain('two qualified crew');
  });

  it('ignores an amendment declared by a revision that is not published', () => {
    // A draft bulletin has not been through four-eyes. It cannot govern anything.
    for (const status of ['draft', 'pending-approval', 'rejected', 'withdrawn'] as const) {
      expect(amendmentsInForce('GOM-001', [amending({ status })], [])).toEqual([]);
    }
  });

  it('ignores a superseded revision — the superseding one carries its own amendments', () => {
    expect(amendmentsInForce('GOM-001', [amending({ status: 'superseded' })], [])).toEqual([]);
  });

  it('does not return an amendment aimed at a different document', () => {
    expect(amendmentsInForce('SOP-004', [amending()], [])).toEqual([]);
  });

  it('drops an amendment once it has been folded in', () => {
    const resolutions: AmendmentResolution[] = [
      {
        amendmentId: 'PB-014-r1::am0',
        resolvedInRevisionId: 'GOM-001-r15',
        resolvedBy: 'Chief Pilot',
        resolvedOn: '2026-08-20',
      },
    ];
    expect(amendmentsInForce('GOM-001', [amending()], resolutions)).toEqual([]);
  });
});

describe('amendmentsForSection', () => {
  it('matches on the section it names', () => {
    const found = amendmentsForSection('GOM-001::4-2', [amending()], []);
    expect(found).toHaveLength(1);
  });

  it('does not leak onto a neighbouring section', () => {
    expect(amendmentsForSection('GOM-001::4-3', [amending()], [])).toEqual([]);
  });

  it('a document-wide amendment names no section and so matches none', () => {
    // It still shows in the document header strip; it just has no anchor to sit at.
    const wide = amending({
      amendments: [{ id: 'a', targetDocId: 'GOM-001', summary: 'Whole-document change.' }],
    });
    expect(amendmentsForSection('GOM-001::4-2', [wide], [])).toEqual([]);
    expect(amendmentsInForce('GOM-001', [wide], [])).toHaveLength(1);
  });
});

describe('daysOutstanding', () => {
  it('counts from the effective date, not the date it was drafted', () => {
    expect(daysOutstanding('2026-06-12', TODAY)).toBe(71);
  });

  it('is zero on the day it takes effect', () => {
    expect(daysOutstanding(TODAY, TODAY)).toBe(0);
  });

  it('never goes negative for an amendment that takes effect in the future', () => {
    expect(daysOutstanding('2026-09-01', TODAY)).toBe(0);
  });

  it('is not thrown off by a timezone west of Greenwich', () => {
    // Date-only strings must not be parsed as UTC midnight and then rendered
    // local — that reads a day early in Cincinnati (LG-118).
    expect(daysOutstanding('2026-08-21', TODAY)).toBe(1);
  });
});

describe('outstandingWork — the inbox', () => {
  it('unions bulletin amendments and external alerts into one queue', () => {
    const work = outstandingWork([amending()], [alert()], [], TODAY);
    expect(work).toHaveLength(2);
    expect(work.map((w) => w.source).sort()).toEqual(['bulletin', 'external']);
  });

  it('sorts oldest first — ageing is the point of the queue', () => {
    const older = amending({
      id: 'FOB-009-r1',
      docId: 'FOB-009',
      effectiveDate: '2026-05-09',
      amendments: [{ id: 'FOB-009-r1::am0', targetDocId: 'GOM-001', summary: 'Duty limits.' }],
    });
    const work = outstandingWork([amending(), older], [], [], TODAY);
    expect(work[0].sourceDocId).toBe('FOB-009');
    expect(work[0].daysOutstanding).toBeGreaterThan(work[1].daysOutstanding);
  });

  it('excludes anything already resolved, from either source', () => {
    const resolutions: AmendmentResolution[] = [
      { amendmentId: 'PB-014-r1::am0', resolvedInRevisionId: 'r', resolvedBy: 'U', resolvedOn: TODAY },
      { amendmentId: 'ALERT-001', resolvedInRevisionId: '', resolvedBy: 'U', resolvedOn: TODAY, note: 'Nimbl authors the IOPM — not ours.' },
    ];
    expect(outstandingWork([amending()], [alert()], resolutions, TODAY)).toEqual([]);
  });

  it('carries the target document so a row can say what it affects', () => {
    const work = outstandingWork([amending()], [], [], TODAY);
    expect(work[0].targetDocIds).toEqual(['GOM-001']);
  });

  it('an external alert against several documents stays one row, not several', () => {
    const work = outstandingWork([], [alert({ targetDocIds: ['GOM-001', 'SOP-004'] })], [], TODAY);
    expect(work).toHaveLength(1);
    expect(work[0].targetDocIds).toEqual(['GOM-001', 'SOP-004']);
  });
});

describe('resolution', () => {
  it('a dismissal is a resolution with a reason and no revision', () => {
    // "Not ours" — a Nimbl alert against a Nimbl-authored manual. It leaves the
    // queue, but it leaves a record of why, never a silent disappearance.
    const dismissal: AmendmentResolution = {
      amendmentId: 'ALERT-001',
      resolvedInRevisionId: '',
      resolvedBy: 'Document Manager',
      resolvedOn: TODAY,
      note: 'IOPM is Nimbl-authored; they will revise it.',
    };
    expect(isResolved('ALERT-001', [dismissal])).toBe(true);
    expect(resolutionFor('ALERT-001', [dismissal])?.note).toContain('Nimbl-authored');
  });

  it('reports nothing for an id that was never resolved', () => {
    expect(isResolved('ALERT-001', [])).toBe(false);
    expect(resolutionFor('ALERT-001', [])).toBeUndefined();
  });
});

describe('replacementSection', () => {
  const section = {
    id: 'PB-014::governing',
    level: 2,
    number: '',
    title: '',
    blocks: [{ id: 'PB-014::governing::b0', type: 'paragraph' as const, md: 'Two qualified crew are required.' }],
  };

  function withReplacement() {
    return rev({
      sections: [section],
      amendments: [
        {
          id: 'PB-014-r1::am0',
          targetDocId: 'GOM-001',
          targetSectionId: 'GOM-001::4-2',
          summary: 'Two crew.',
          replacementSectionId: 'PB-014::governing',
        },
      ],
    });
  }

  it('resolves the governing text out of the bulletin that published it', () => {
    const revisions = [withReplacement()];
    const [am] = amendmentsInForce('GOM-001', revisions, []);
    expect(replacementSection(am, revisions)?.blocks[0].md).toBe('Two qualified crew are required.');
  });

  it('returns nothing when the amendment restates nothing — the manual still governs', () => {
    const revisions = [amending()];
    const [am] = amendmentsInForce('GOM-001', revisions, []);
    expect(replacementSection(am, revisions)).toBeUndefined();
  });

  it('never resolves text out of a revision that is no longer published', () => {
    // Belt and braces: amendmentsInForce already excludes these, but a caller
    // holding a stale AmendmentInForce must not be able to render withdrawn text.
    const revisions = [withReplacement()];
    const [am] = amendmentsInForce('GOM-001', revisions, []);
    const withdrawn = [{ ...revisions[0], status: 'withdrawn' as const }];
    expect(replacementSection(am, withdrawn)).toBeUndefined();
  });
});
