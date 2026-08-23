import { describe, it, expect } from 'vitest';
import { buildImportPayload, applyMelImport } from './apply';
import { diffCatalog } from './checks';
import type { MelItem } from '../../types';

const item = (over: Partial<MelItem> = {}): MelItem => ({
  id: 'x',
  aircraftType: 'G500',
  mmelRevision: 'Rev 1',
  effectiveDate: '2025-09-03',
  approvalState: 'APPROVED',
  ataReference: '25',
  itemNumber: 'N100-1',
  title: 'Ashtrays',
  category: null,
  numberInstalled: null,
  numberRequired: null,
  melSection: 'NEF',
  ...over,
  subItemNumber: over.subItemNumber ?? over.itemNumber ?? 'N100-1',
});

const catalog = [
  item({ id: 'keep', itemNumber: 'N100-1', title: 'Ashtrays' }),
  item({ id: 'edit', itemNumber: 'N100-2', title: 'Carpet' }),
  item({ id: 'gone', itemNumber: 'N100-3', title: 'Coat Hooks' }),
  item({ id: 'sec1', itemNumber: '24-02', melSection: 'ONE', title: 'Bleed valve' }),
];

// The parser derives its own ids and knows nothing of the catalog's.
const parsedRev2 = [
  item({ id: 'parsed-1', itemNumber: 'N100-1', title: 'Ashtrays', approvalState: 'DRAFT', mmelRevision: 'Rev 2', effectiveDate: '2026-08-14' }),
  item({ id: 'parsed-2', itemNumber: 'N100-2', title: 'Carpet and underlay', approvalState: 'DRAFT', mmelRevision: 'Rev 2', effectiveDate: '2026-08-14' }),
  item({ id: 'parsed-4', itemNumber: 'N100-4', title: 'Cup Holders', approvalState: 'DRAFT', mmelRevision: 'Rev 2', effectiveDate: '2026-08-14' }),
];

const payload = buildImportPayload(diffCatalog(parsedRev2, catalog, 'G500'), parsedRev2);

const applied = () =>
  applyMelImport({
    melItems: catalog,
    aircraftType: 'G500',
    sections: ['NEF'],
    payload,
  });

const find = (id: string) => applied().find(m => m.id === id)!;

describe('buildImportPayload', () => {
  it('keeps the id the catalog already knows a changed row by', () => {
    // A silently changed id would orphan every record pointing at it.
    expect(payload.changed).toHaveLength(1);
    expect(payload.changed[0].id).toBe('edit');
    expect(payload.changed[0].title).toBe('Carpet and underlay');
  });

  it('approves what it will write, and keeps each row\'s own page revision', () => {
    // A MEL revises page by page. Forcing the document revision onto every row would claim
    // every item was revised — the G650ER R1 leaves 24 of its pages at Original.
    for (const m of [...payload.added, ...payload.changed]) {
      expect(m.approvalState).toBe('APPROVED');
      expect(m.mmelRevision).toBe('Rev 2');
    }
  });

  it('carries a revision stamp for every row the document contained but did not change', () => {
    expect(payload.stamps.map(s => s.subItemNumber)).toEqual(['N100-1']);
    expect(payload.stamps[0].mmelRevision).toBe('Rev 2');
  });
});

describe('applyMelImport', () => {
  it('adds, replaces and counts as the payload says', () => {
    const next = applied();
    expect(next.find(m => m.subItemNumber === 'N100-4')?.title).toBe('Cup Holders');
    expect(find('edit').title).toBe('Carpet and underlay');
    expect(payload.unchangedCount).toBe(1);
  });

  it('supersedes a withdrawn item rather than deleting it', () => {
    // A deferral signed against it must still resolve; DeferralCreatePanel offers only
    // APPROVED items, so nobody can cite it again.
    const gone = find('gone');
    expect(gone.approvalState).toBe('SUPERSEDED');
    expect(gone.title).toBe('Coat Hooks');
  });

  it('does not restamp a withdrawn item — it is not in this revision', () => {
    expect(find('gone').mmelRevision).toBe('Rev 1');
  });

  it('restamps an unchanged item to the revision of the page it appeared on', () => {
    // Otherwise the catalog still reads Rev 1 after Rev 2 was approved, and a deferral
    // would snapshot a revision the aircraft is no longer operating under.
    expect(find('keep').mmelRevision).toBe('Rev 2');
    expect(find('keep').effectiveDate).toBe('2026-08-14');
    expect(find('keep').title).toBe('Ashtrays');
  });

  it('leaves sections the document did not contain completely alone', () => {
    expect(find('sec1')).toEqual(catalog.find(m => m.id === 'sec1'));
  });

  it('leaves other fleets completely alone', () => {
    const other = item({ id: 'g650', aircraftType: 'G650ER', itemNumber: 'N100-1' });
    const next = applyMelImport({
      melItems: [...catalog, other],
      aircraftType: 'G500',
      sections: ['NEF'],
      payload,
    });
    expect(next.find(m => m.id === 'g650')).toEqual(other);
  });

  it('applies the frozen payload, not a diff re-derived at approval time', () => {
    // The catalog moved after the proposal: another item appeared. The approver signed a
    // payload that said nothing about it, so it must be untouched.
    const moved = [...catalog, item({ id: 'late', itemNumber: 'N100-9', title: 'Late arrival' })];
    const next = applyMelImport({
      melItems: moved,
      aircraftType: 'G500',
      sections: ['NEF'],
      payload,
    });
    const late = next.find(m => m.id === 'late')!;
    expect(late.approvalState).not.toBe('SUPERSEDED');
    expect(late.title).toBe('Late arrival');
  });
});
