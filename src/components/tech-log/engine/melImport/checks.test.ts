import { describe, it, expect } from 'vitest';
import { checkImport, diffCatalog } from './checks';
import type { MelItem } from '../../types';

// subItemNumber follows itemNumber unless a case sets it — it is the diff key, so a
// helper that pinned it would silently collide every fixture onto one row.
const item = (over: Partial<MelItem> = {}): MelItem => ({
  id: 'mel-g500-nef-n100-1',
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

const parsed = (items: MelItem[], warnings: string[] = []) => ({
  items,
  warnings,
  revision: '1',
  effectiveDate: '2025-09-03',
});

const footer = (token: string) => `Aircraft: ${token}   Revision No: 1   Date: 09-03-25   Page N-1`;

const run = (o: Partial<Parameters<typeof checkImport>[0]> = {}) =>
  checkImport({
    lines: [footer('G-500')],
    parsed: parsed([item()]),
    selectedType: 'G500',
    currentCatalog: [],
    ...o,
  });

const ids = (r: ReturnType<typeof checkImport>) => r.checks.map(c => c.id);

describe('checkImport', () => {
  it('passes a clean import', () => {
    const r = run();
    expect(r.checks).toEqual([]);
    expect(r.blocked).toBe(false);
  });

  it('blocks on any parser warning — warnings are never advisory (D95)', () => {
    const r = run({ parsed: parsed([item()], ['G500: unreadable column geometry at line 12']) });
    expect(ids(r)).toContain('parse-warnings');
    expect(r.blocked).toBe(true);
  });

  it('blocks when the document names a different aircraft than the one selected', () => {
    const r = run({ lines: [footer('G650ER')], selectedType: 'G500' });
    const check = r.checks.find(c => c.id === 'aircraft-mismatch');
    expect(check?.severity).toBe('BLOCK');
    expect(check?.detail).toContain('G650ER');
    expect(r.blocked).toBe(true);
  });

  it('accepts the G500 footer spelling, which is hyphenated where the G650ER is not', () => {
    expect(run({ lines: [footer('G-500')], selectedType: 'G500' }).checks).toEqual([]);
    expect(run({ lines: [footer('G650ER')], selectedType: 'G650ER' }).checks).toEqual([]);
  });

  it('asks for confirmation, not a block, when no footer names an aircraft at all', () => {
    // Unverifiable is not the same as wrong — a G800 MEL does not exist yet to learn from.
    const r = run({ lines: ['Revision No: 1   Date: 09-03-25'] });
    expect(r.checks.find(c => c.id === 'aircraft-unverified')?.severity).toBe('CONFIRM');
    expect(r.blocked).toBe(false);
  });

  it('blocks when no revision identity could be read from the document body', () => {
    const r = run({ parsed: { ...parsed([item()]), revision: null, effectiveDate: null } });
    expect(ids(r)).toContain('no-revision');
    expect(r.blocked).toBe(true);
  });

  it('blocks an empty parse', () => {
    const r = run({ parsed: parsed([]) });
    expect(ids(r)).toContain('no-items');
    expect(r.blocked).toBe(true);
  });

  it('blocks on a gap in the page sequence — a page physically missing from the parse', () => {
    const r = run({
      lines: ['Aircraft: G-500  Page N-1', 'Aircraft: G-500  Page N-2', 'Aircraft: G-500  Page N-4'],
    });
    const check = r.checks.find(c => c.id === 'page-gap');
    expect(check?.severity).toBe('BLOCK');
    expect(check?.detail).toContain('N-3');
  });

  it('only asks about a gap in item numbering, which a revision may legitimately leave', () => {
    const r = run({
      parsed: parsed([
        item({ id: 'a', itemNumber: 'N100-1' }),
        item({ id: 'b', itemNumber: 'N100-3' }),
      ]),
    });
    const check = r.checks.find(c => c.id === 'item-gap');
    expect(check?.severity).toBe('CONFIRM');
    expect(check?.detail).toContain('N100-2');
    expect(r.blocked).toBe(false);
  });
});

describe('diffCatalog', () => {
  const current = [
    item({ id: 'a', itemNumber: 'N100-1', title: 'Ashtrays' }),
    item({ id: 'b', itemNumber: 'N100-2', title: 'Carpet' }),
    // Section One is not part of a Section Two / NEF import and must not read as removed.
    item({ id: 'one', itemNumber: '24-02', melSection: 'ONE', title: 'Bleed valve' }),
  ];

  it('classifies added, changed, removed and unchanged', () => {
    const d = diffCatalog(
      [
        item({ id: 'a', itemNumber: 'N100-1', title: 'Ashtrays' }),
        item({ id: 'b', itemNumber: 'N100-2', title: 'Carpet and underlay' }),
        item({ id: 'c', itemNumber: 'N100-3', title: 'Coat Hooks' }),
      ],
      current,
      'G500',
    );

    expect(d.added.map(i => i.itemNumber)).toEqual(['N100-3']);
    expect(d.changed.map(c => c.after.itemNumber)).toEqual(['N100-2']);
    expect(d.changed[0].fields).toEqual(['title']);
    expect(d.removed).toEqual([]);
    expect(d.unchanged).toBe(1);
  });

  it('leaves sections the document did not contain out of the diff entirely', () => {
    const d = diffCatalog([item({ id: 'a', itemNumber: 'N100-1' })], current, 'G500');
    // 'one' is Section One; this was an NEF import and says nothing about it.
    expect(d.removed.map(i => i.itemNumber)).toEqual(['N100-2']);
  });

  it('does not call every item changed just because the revision moved on', () => {
    // A new revision restamps mmelRevision on all 495 rows. If that counted as a change the
    // diff would read "495 changed" every time and stop being a check on anything.
    const d = diffCatalog(
      [item({ id: 'a', itemNumber: 'N100-1', mmelRevision: 'Rev 2', effectiveDate: '2026-04-27' })],
      [item({ id: 'a', itemNumber: 'N100-1' })],
      'G500',
    );
    expect(d.changed).toEqual([]);
    expect(d.unchanged).toBe(1);
  });

  it('ignores the approval state the parser could not set', () => {
    const d = diffCatalog(
      [item({ id: 'a', itemNumber: 'N100-1', approvalState: 'DRAFT' })],
      [item({ id: 'a', itemNumber: 'N100-1', approvalState: 'APPROVED' })],
      'G500',
    );
    expect(d.changed).toEqual([]);
  });
});

describe('item-gap is scoped to NEF, where contiguity is actually a property', () => {
  const nefItem = (n: string, section: 'NEF' | 'TWO') =>
    item({ id: n, itemNumber: n, melSection: section });

  it('does not fire on Section Two, whose numbering is sparse in the document itself', () => {
    // The G650ER's Section Two really does jump 2-14 to 2-31: most of its CAS messages sit
    // under their Section One item instead. Checked here because the unscoped version
    // fired on every clean import of both real MELs.
    const r = checkImport({
      lines: [footer('G-500')],
      parsed: parsed([nefItem('2-14', 'TWO'), nefItem('2-31', 'TWO'), nefItem('2-32', 'TWO')]),
      selectedType: 'G500',
      currentCatalog: [],
    });
    expect(r.checks).toEqual([]);
  });

  it('still fires on a gap in an NEF area', () => {
    const r = checkImport({
      lines: [footer('G-500')],
      parsed: parsed([nefItem('N100-1', 'NEF'), nefItem('N100-3', 'NEF')]),
      selectedType: 'G500',
      currentCatalog: [],
    });
    expect(r.checks.map(c => c.id)).toEqual(['item-gap']);
  });
});

describe('withdrawn items that an aircraft is still flying on', () => {
  it('asks about a removed item that has a live deferral against it', () => {
    const current = [item({ id: 'gone', itemNumber: 'N100-9', title: 'Foot Rests' })];
    const r = checkImport({
      lines: [footer('G-500')],
      parsed: parsed([item({ id: 'p1', itemNumber: 'N100-1' })]),
      selectedType: 'G500',
      currentCatalog: current,
      melItemIdsWithLiveDeferrals: ['gone'],
    });
    const c = r.checks.find(x => x.id === 'withdrawn-in-use');
    expect(c?.severity).toBe('CONFIRM');
    expect(c?.detail).toContain('N100-9');
    // It must never silently block an approved revision from being loaded.
    expect(r.blocked).toBe(false);
  });

  it('stays quiet when the withdrawn item is not deferred anywhere', () => {
    const r = checkImport({
      lines: [footer('G-500')],
      parsed: parsed([item({ id: 'p1', itemNumber: 'N100-1' })]),
      selectedType: 'G500',
      currentCatalog: [item({ id: 'gone', itemNumber: 'N100-9' })],
    });
    expect(r.checks.find(x => x.id === 'withdrawn-in-use')).toBeUndefined();
  });
});

describe('cosmetic spacing is not a MEL change', () => {
  it('does not report a proviso as changed when only its spacing moved', () => {
    // pdftotext and pdf.js disagree on the gap after a list marker; nine real G650ER items
    // read as changed on a re-import of the identical document before this.
    const d = diffCatalog(
      [item({ id: 'a', itemNumber: 'N100-1', provisos: 'a) One,  b)  Two' })],
      [item({ id: 'a', itemNumber: 'N100-1', provisos: 'a) One, b) Two' })],
      'G500',
    );
    expect(d.changed).toEqual([]);
    expect(d.unchanged).toBe(1);
  });

  it('still reports a real wording change', () => {
    const d = diffCatalog(
      [item({ id: 'a', itemNumber: 'N100-1', provisos: 'a) One, b) Three' })],
      [item({ id: 'a', itemNumber: 'N100-1', provisos: 'a) One, b) Two' })],
      'G500',
    );
    expect(d.changed[0].fields).toEqual(['provisos']);
  });
});

describe('what the document says about itself is reported back', () => {
  it('reports the aircraft the document names, not the one that was selected', () => {
    // The panel heading claims these fields are read from the document; showing the
    // operator's own selection back to them under that heading would be a lie.
    const r = checkImport({
      lines: [footer('G650ER')],
      parsed: parsed([item()]),
      selectedType: 'G650ER',
      currentCatalog: [],
    });
    expect(r.detectedAircraft).toEqual(['G650ER']);
  });

  it('reports none when the document names no aircraft it recognises', () => {
    const r = checkImport({ lines: ['no footer here'], parsed: parsed([item()]), selectedType: 'G500', currentCatalog: [] });
    expect(r.detectedAircraft).toEqual([]);
  });
});
