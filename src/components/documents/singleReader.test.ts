// D66 — one place, all documents.
//
// Bulletins were already unified as a STORE under D29 (procedural-bulletin and
// flight-ops-bulletin are document classes, seeded as Doc + DocRevision, listed in
// DocumentHub's library). What survived was a second READER: /procedural-bulletins
// and /flight-operations-bulletins rendered a bespoke card list and view dialog over
// the same data, and the two surfaces had already drifted (raw markdown in the card
// excerpt; effective dates a day apart — LG-117).
//
// This file holds that door shut. Adding a class with its own reader route, or
// re-adding a bulletin sidebar entry, fails here rather than quietly reintroducing
// "two places to read one document".
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { DOC_CLASS_LIST, docReaderPath } from './classes';
import { NAV_ENTRIES } from '../../navigation/navConfig';
import { readAppRoutePaths } from '../../navigation/routeAudit';

/** The reader surfaces D66 retired. Bookmarks and pre-D66 notification links still
 *  carry them, so they must resolve — as redirects, never as a second reader. */
const RETIRED_ROUTES = ['/procedural-bulletins', '/flight-operations-bulletins'];

describe('D66 — the Document Center is the only reader', () => {
  it('no class carries its own reader route', () => {
    // The escape hatch itself is gone, not just unused: a per-class readerRoute is how
    // the library got two readers in the first place. Reintroducing the key is the
    // thing to catch — a stray value would only be the symptom.
    const strays = DOC_CLASS_LIST.filter((c) => 'readerRoute' in c).map((c) => c.id);
    expect(strays, 'a class with its own reader route re-splits the library').toEqual([]);
  });

  it('every document reads at /documents/<id>', () => {
    expect(docReaderPath('PB-001')).toBe('/documents/PB-001');
    expect(docReaderPath('SOP-001')).toBe('/documents/SOP-001');
  });

  it.each(RETIRED_ROUTES)('%s has no sidebar entry', (path) => {
    const entry = NAV_ENTRIES.find((e) => e.path === path);
    expect(entry, `nav still offers "${entry?.label}" as a separate door`).toBeUndefined();
  });

  it.each(RETIRED_ROUTES)('%s is still registered, so old links do not 404', (path) => {
    expect(readAppRoutePaths()).toContain(path);
  });

  it.each(RETIRED_ROUTES)('%s redirects to /documents', (path) => {
    const src = readFileSync('src/App.tsx', 'utf8').replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, '');
    const route = new RegExp(`path="${path}"[^>]*element=\\{<Navigate to="/documents"`);
    expect(route.test(src), `${path} must be a <Navigate> stub, not a second reader`).toBe(true);
  });

  it('the bespoke bulletin reader is gone from the tree', () => {
    const gone = [
      'src/components/bulletins/BulletinsPage.tsx',
      'src/components/bulletins/FlightOperationsBulletins.tsx',
      'src/components/ProceduralBulletins.tsx',
    ];
    for (const f of gone) {
      expect(() => readFileSync(f, 'utf8'), `${f} still exists`).toThrow();
    }
  });
});
