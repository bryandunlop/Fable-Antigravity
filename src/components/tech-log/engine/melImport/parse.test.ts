import { describe, it, expect } from 'vitest';
import { parseMelDocument } from './parse';
import { G500_NEF_PAGE } from './fixture.g500Nef';

// Column geometry mirroring the real Section Two tables: the parser reads these positions
// off the header pair itself, so the fixtures build rows by column rather than by eye.
const CAS_CAT = ' '.repeat(60) + 'Repair Category';
const CAS_HDR = 'Item #'.padEnd(10) + 'Item'.padEnd(74) + 'Dispatch Consideration';
const cas = (item: string, name: string, cat: string, disp: string) =>
  item.padEnd(10) + name.padEnd(50) + cat.padEnd(24) + disp;

const NEF_HDR = 'Item #'.padEnd(12) + 'Item Name'.padEnd(48) + '(M)(O) Procedures';
const nef = (item: string, name: string, proc: string) =>
  item.padEnd(12) + name.padEnd(48) + proc;

const REV = 'Revision No: 1                    Date: 04-27-26';
const FOOTER = 'Aircraft: G650ER';

describe('parseMelDocument — Section Two', () => {
  it('reads an item verbatim from its columns', () => {
    const { items, warnings } = parseMelDocument(
      [REV, CAS_CAT, CAS_HDR, cas('2-31', 'Wing Anti-Ice Maint Reqd, L-R (Blue – Advisory)', 'C', 'One may be inoperative.'), FOOTER],
      'G650ER',
    );

    expect(warnings).toEqual([]);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      id: 'mel-g650er-cas-2-31',
      itemNumber: '2-31',
      melSection: 'TWO',
      title: 'Wing Anti-Ice Maint Reqd, L-R',
      casMessage: 'Wing Anti-Ice Maint Reqd, L-R',
      category: 'C',
      provisos: 'One may be inoperative.',
      mmelRevision: 'Rev 1',
      effectiveDate: '2026-04-27',
      // Section Two is keyed by CAS message, never by ATA — not inferred.
      ataReference: '',
    });
  });

  it('never approves an item — a parser cannot approve a MEL (D95)', () => {
    const { items } = parseMelDocument(
      [REV, CAS_CAT, CAS_HDR, cas('2-31', 'Wing Anti-Ice (Blue – Advisory)', 'C', 'One may be inoperative.'), FOOTER],
      'G650ER',
    );
    expect(items[0].approvalState).toBe('DRAFT');
  });

  it('lifts the annunciation colour and tier out of the message text', () => {
    const { items } = parseMelDocument(
      [REV, CAS_CAT, CAS_HDR, cas('2-14', 'Cabin Temp Fail (Amber – Caution)', 'B', 'May be inoperative.'), FOOTER],
      'G650ER',
    );

    expect(items[0].casColor).toBe('AMBER');
    expect(items[0].casLevel).toBe('CAUTION');
    expect(items[0].title).toBe('Cabin Temp Fail');
  });

  it('gives a sub-variant row the message above it, but never that row\'s category or proviso', () => {
    const { items } = parseMelDocument(
      [
        REV,
        CAS_CAT,
        CAS_HDR,
        cas('2-31', 'Wing Anti-Ice Maint Reqd, L-R (Blue – Advisory)', 'C', 'One may be inoperative.'),
        cas('2-32', '', 'B', 'Both may be inoperative.'),
        FOOTER,
      ],
      'G650ER',
    );

    expect(items).toHaveLength(2);
    expect(items[1].itemNumber).toBe('2-32');
    expect(items[1].title).toBe('Wing Anti-Ice Maint Reqd, L-R');
    expect(items[1].category).toBe('B');
    expect(items[1].provisos).toBe('Both may be inoperative.');
  });

  it('warns rather than guessing when the column geometry is unreadable', () => {
    // Header present, but no "Repair Category" line above it to place the middle column.
    const { items, warnings } = parseMelDocument(
      [REV, CAS_HDR, cas('2-31', 'Wing Anti-Ice (Blue – Advisory)', 'C', 'One may be inoperative.'), FOOTER],
      'G650ER',
    );

    expect(items).toEqual([]);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('unreadable column geometry');
  });

  it('attaches a shared (O)/(M) block to the one item that references it', () => {
    const { items, warnings } = parseMelDocument(
      [
        REV,
        CAS_CAT,
        CAS_HDR,
        cas('2-40', 'Galley Chiller Fail (Cyan – Advisory)', 'C', 'May be inoperative.'),
        cas('2-41', 'Galley Oven Fail (Cyan – Advisory)', 'C', 'May be inoperative provided (M) is accomplished.'),
        'Maintenance (M)',
        'Deactivate and secure the oven.',
        FOOTER,
      ],
      'G650ER',
    );

    expect(warnings).toEqual([]);
    expect(items.find(i => i.itemNumber === '2-41')?.mProcedure).toBe('Deactivate and secure the oven.');
    expect(items.find(i => i.itemNumber === '2-40')?.mProcedure).toBeUndefined();
  });

  it('warns when a shared (O)/(M) block cannot be attributed to exactly one item', () => {
    const { warnings } = parseMelDocument(
      [
        REV,
        CAS_CAT,
        CAS_HDR,
        cas('2-40', 'Galley Chiller Fail (Cyan – Advisory)', 'C', 'May be inoperative provided (M) is accomplished.'),
        cas('2-41', 'Galley Oven Fail (Cyan – Advisory)', 'C', 'May be inoperative provided (M) is accomplished.'),
        'Maintenance (M)',
        'Deactivate and secure.',
        FOOTER,
      ],
      'G650ER',
    );

    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('shares an (O)/(M) block');
  });

  it('folds an item split across a page break back into one row', () => {
    const { items, warnings } = parseMelDocument(
      [
        REV,
        CAS_CAT,
        CAS_HDR,
        cas('2-14', 'Cabin Temp Fail (Amber – Caution)', 'B', 'May be inoperative provided'),
        FOOTER,
        CAS_CAT,
        CAS_HDR,
        cas('2-14', '(Continued)', '', 'the affected zone is placarded.'),
        FOOTER,
      ],
      'G650ER',
    );

    expect(warnings).toEqual([]);
    expect(items).toHaveLength(1);
    expect(items[0].provisos).toBe('May be inoperative provided the affected zone is placarded.');
    // The fragment carried no category or colour; the first half's survive.
    expect(items[0].category).toBe('B');
    expect(items[0].casColor).toBe('AMBER');
  });
});

describe('parseMelDocument — NEF Deferral List', () => {
  it('reads an NEF item with its area, placard text and no repair category', () => {
    const { items, warnings } = parseMelDocument(
      [
        REV,
        'GALLEY ITEMS (300)',
        NEF_HDR,
        nef('N300-12', 'Galley drawer latch', 'Latch inoperative. (M) Secure the drawer. (O) None.'),
        FOOTER,
      ],
      'G500',
    );

    expect(warnings).toEqual([]);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      id: 'mel-g500-nef-n300-12',
      itemNumber: 'N300-12',
      melSection: 'NEF',
      title: 'Galley drawer latch',
      nefArea: 'Galley Items (300)',
      // D69 — the NEF program gives its items no repair category at all.
      category: null,
      ataReference: '25',
      flightCrewDeferral: true,
      provisos: 'Latch inoperative.',
      mProcedure: 'Secure the drawer.',
    });
    expect(items[0].placardText).toContain('Place MEL Placard');
    // "None." is the document saying there is no procedure, not a procedure called None.
    expect(items[0].oProcedure).toBeUndefined();
  });

  it('keeps the suffix letter that is part of an item number', () => {
    const { items } = parseMelDocument(
      [REV, 'CABIN ITEMS (200)', NEF_HDR, nef('N200-31N', 'Seat trim', 'Trim loose.'), FOOTER],
      'G500',
    );
    expect(items[0].itemNumber).toBe('N200-31N');
  });

  it('drops the blank N900 write-in slots — they are form furniture, not catalog rows', () => {
    const { items } = parseMelDocument(
      [
        REV,
        'CABIN ITEMS (200)',
        NEF_HDR,
        nef('N200-31', 'Seat trim', 'Trim loose.'),
        nef('N900-1', '', ''),
        nef('N900-2', '', ''),
        FOOTER,
      ],
      'G500',
    );

    expect(items.map(i => i.itemNumber)).toEqual(['N200-31']);
  });
});

describe('parseMelDocument — against a real page of the approved G500 MEL', () => {
  const { items, warnings, revision, effectiveDate } = parseMelDocument(G500_NEF_PAGE, 'G500');

  it('parses the page clean', () => {
    expect(warnings).toEqual([]);
    expect(revision).toBe('1');
    expect(effectiveDate).toBe('2025-09-03');
  });

  it('reads every item on the page, in document order', () => {
    expect(items.map(i => i.itemNumber)).toEqual([
      'N100-1', 'N100-2', 'N100-3', 'N100-4', 'N100-5', 'N100-6',
      'N100-7', 'N100-8', 'N100-9', 'N100-10', 'N100-11', 'N100-12',
    ]);
    expect(items.every(i => i.nefArea === 'Flight Deck Items (100)')).toBe(true);
  });

  it('rejoins an item name the PDF broke across two lines', () => {
    // "Decorative Trim / Trim" / "Strips" is one name in the document, split by the column.
    expect(items.find(i => i.itemNumber === 'N100-8')?.title).toBe('Decorative Trim / Trim Strips');
  });

  it('keeps a real (M) procedure and drops the ones the document writes as "None."', () => {
    const outlet = items.find(i => i.itemNumber === 'N100-9');
    expect(outlet?.mProcedure).toBe('Pull and secure circuit breaker(s) as required.');
    expect(outlet?.oProcedure).toBeUndefined();

    const ashtrays = items.find(i => i.itemNumber === 'N100-1');
    expect(ashtrays?.mProcedure).toBeUndefined();
    expect(ashtrays?.oProcedure).toBeUndefined();
  });

  it('carries the condition text that precedes the procedures as the proviso', () => {
    expect(items.find(i => i.itemNumber === 'N100-2')?.provisos).toBe(
      'May be worn, torn, or frayed as long as the item is otherwise serviceable.',
    );
  });
});
