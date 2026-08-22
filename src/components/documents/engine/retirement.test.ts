import { describe, it, expect } from 'vitest';
import type { Doc, DocRevision } from '../types';
import type { AmendmentResolution } from './amendments';
import { applyRetirements, retirementFor } from './retirement';

const TODAY = '2026-08-22';

function doc(id: string, classId = 'procedural-bulletin'): Doc {
  return {
    id,
    classId,
    title: id,
    category: 'Flight Operations',
    roles: ['pilot'],
    ownerUserId: 'U1',
    ownerName: 'Owner',
    tags: [],
    isPinned: false,
    isArchived: false,
    createdDate: '2026-01-01',
  };
}

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
    ...overrides,
  } as DocRevision;
}

/** A bulletin amending one manual section. */
function bulletin(amendments = 1): DocRevision {
  return rev({
    amendments: Array.from({ length: amendments }, (_, i) => ({
      id: `PB-014-r1::am${i}`,
      targetDocId: i === 0 ? 'GOM-3' : 'SOP-004',
      targetSectionId: `t${i}`,
      summary: 'Change.',
    })),
  });
}

const manualPublished = rev({ id: 'GOM-3-r2', docId: 'GOM-3', status: 'published' });

function foldedInto(amendmentId: string, revisionId: string): AmendmentResolution {
  return { amendmentId, resolvedInRevisionId: revisionId, resolvedBy: 'Chief Pilot', resolvedOn: TODAY };
}

describe('applyRetirements', () => {
  it('retires a bulletin once its only amendment is folded in and published', () => {
    const docs = [doc('PB-014'), doc('GOM-3', 'manual')];
    const revisions = [bulletin(), manualPublished];
    const out = applyRetirements(docs, revisions, [foldedInto('PB-014-r1::am0', 'GOM-3-r2')], TODAY);
    expect(retirementFor(out.find((d) => d.id === 'PB-014')!)).toMatchObject({
      intoDocId: 'GOM-3',
      intoRevisionId: 'GOM-3-r2',
      retiredOn: TODAY,
    });
  });

  it('does NOT retire while the folding revision is still a draft', () => {
    // The manual has not changed yet, so the bulletin is still the operative
    // instruction. Retiring now would remove the only correct wording in the system.
    const docs = [doc('PB-014')];
    const revisions = [bulletin(), rev({ id: 'GOM-3-r2', docId: 'GOM-3', status: 'draft' })];
    const out = applyRetirements(docs, revisions, [foldedInto('PB-014-r1::am0', 'GOM-3-r2')], TODAY);
    expect(retirementFor(out[0])).toBeUndefined();
  });

  it('does NOT retire a bulletin whose other amendment is still outstanding', () => {
    const docs = [doc('PB-014')];
    const revisions = [bulletin(2), manualPublished];
    const out = applyRetirements(docs, revisions, [foldedInto('PB-014-r1::am0', 'GOM-3-r2')], TODAY);
    expect(retirementFor(out[0])).toBeUndefined();
  });

  it('retires once the LAST outstanding amendment lands', () => {
    const docs = [doc('PB-014')];
    const sop = rev({ id: 'SOP-004-r3', docId: 'SOP-004', status: 'published' });
    const out = applyRetirements(
      docs,
      [bulletin(2), manualPublished, sop],
      [foldedInto('PB-014-r1::am0', 'GOM-3-r2'), foldedInto('PB-014-r1::am1', 'SOP-004-r3')],
      TODAY,
    );
    expect(retirementFor(out[0])).toBeDefined();
  });

  it('does NOT retire on a dismissal — a bulletin nobody folded in still stands', () => {
    // "This does not need folding into the GOM" leaves the bulletin as the
    // operative instruction. Retiring it would silently withdraw live guidance.
    const dismissed: AmendmentResolution[] = [
      { amendmentId: 'PB-014-r1::am0', resolvedInRevisionId: '', resolvedBy: 'U', resolvedOn: TODAY, note: 'Stands alone.' },
    ];
    const out = applyRetirements([doc('PB-014')], [bulletin()], dismissed, TODAY);
    expect(retirementFor(out[0])).toBeUndefined();
  });

  it('leaves a document that amends nothing completely alone', () => {
    const docs = [doc('GOM-3', 'manual')];
    const out = applyRetirements(docs, [manualPublished], [], TODAY);
    expect(out).toBe(docs);
  });

  it('is idempotent — a retired bulletin keeps its original retirement record', () => {
    const docs = [doc('PB-014')];
    const resolutions = [foldedInto('PB-014-r1::am0', 'GOM-3-r2')];
    const once = applyRetirements(docs, [bulletin(), manualPublished], resolutions, '2026-08-01');
    const twice = applyRetirements(once, [bulletin(), manualPublished], resolutions, TODAY);
    expect(retirementFor(twice[0])!.retiredOn).toBe('2026-08-01');
    expect(twice).toBe(once);
  });

  it('never touches the bulletin’s published revision or its content', () => {
    const revisions = [bulletin(), manualPublished];
    const before = structuredClone(revisions);
    applyRetirements([doc('PB-014')], revisions, [foldedInto('PB-014-r1::am0', 'GOM-3-r2')], TODAY);
    // Retirement is a state change on the Doc. The revision is a published,
    // acknowledged record and must read identically afterwards.
    expect(revisions).toEqual(before);
  });

  it('does not archive — retirement and archiving are different things', () => {
    const out = applyRetirements(
      [doc('PB-014')],
      [bulletin(), manualPublished],
      [foldedInto('PB-014-r1::am0', 'GOM-3-r2')],
      TODAY,
    );
    // `isArchived` is somebody choosing to hide a document. Retirement is the
    // system recording that its content now lives somewhere else. Conflating them
    // would make an un-archive look like un-retiring.
    expect(out[0].isArchived).toBe(false);
    expect(retirementFor(out[0])).toBeDefined();
  });
});
