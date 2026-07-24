// LG-19 / D37 Wave 1 — every notification deep link must land on a real route.
//
// Notification contributors each hand NotificationCenter a `link`, which it feeds
// straight to navigate(). Nothing checked those strings, so a critical "Audit
// expired" notification pointed at /internal-audits — a route that has never
// existed — and dropped the user on the 404 page instead of the expiring audit.
//
// This is a static audit of the literals in the contributor sources rather than a
// render test: it needs no DOM, and it catches a bad link the moment it is typed.
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { readRouteTable, resolvesToRoute, findDynamicLinks } from '../navigation/routeAudit';

const DIR = 'src/notifications/contributors';

// Contributors that hand through a link built elsewhere. A literal scan cannot see
// these, so each must name the source file whose literals ARE audited below —
// otherwise the deepest, most parameterised links in the app (tech-log query deep
// links, per-document reader routes) would be silently unprotected while the test
// for that file reported green.
const DYNAMIC_LINK_SOURCES: Record<string, string> = {
  'techLog.ts': 'src/components/tech-log/engine/notifications.ts',
  'documents.ts': 'src/notifications/contributors/documents.ts',
};

/**
 * Every route-looking literal on a `link:` line. Taking all of them (not just the
 * first) matters: a ternary picks between two literal routes, and auditing only
 * the first would leave the other branch unchecked. Template holes become a
 * ':param' segment.
 */
export function linkLiteralsIn(source: string): { link: string; line: number }[] {
  return source.split('\n').flatMap((text, i) => {
    if (!/\blink:/.test(text)) return [];
    const after = text.slice(text.indexOf('link:'));
    return [...after.matchAll(/['"`](\/[^'"`]*)['"`]/g)]
      .map((m) => ({ link: m[1].replace(/\$\{[^}]*\}/g, ':param'), line: i + 1 }));
  });
}

function linkLiterals(file: string): { link: string; line: number }[] {
  return linkLiteralsIn(readFileSync(join(DIR, file), 'utf8'));
}

describe('notification deep links resolve to registered routes', () => {
  const table = readRouteTable();
  const files = readdirSync(DIR).filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts'));

  it('there are contributors to audit', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it.each(files)('%s', (file) => {
    for (const { link, line } of linkLiterals(file)) {
      expect(resolvesToRoute(link, table), `${file}:${line} link "${link}" has no registered route`).toBe(true);
    }
  });

  // Guards against this suite quietly becoming decorative: a contributor whose
  // links are all expressions passes the loop above having checked nothing.
  it.each(files)('%s: any non-literal link is accounted for', (file) => {
    const source = readFileSync(join(DIR, file), 'utf8');
    const literalLines = new Set(linkLiteralsIn(source).map((l) => l.line));
    // Only a link line yielding NO route literal is unauditable — a ternary
    // between two literal routes is fully covered by the loop above.
    const dynamic = findDynamicLinks(source).filter((d) => !literalLines.has(d.line));
    if (dynamic.length === 0) return;
    expect(
      DYNAMIC_LINK_SOURCES[file],
      `${file} builds links dynamically (${dynamic.map((d) => `line ${d.line}: ${d.expression}`).join('; ')}) ` +
      `but names no audited source — add it to DYNAMIC_LINK_SOURCES so its links are actually checked`,
    ).toBeTruthy();
  });

  // The literals behind those pass-throughs, audited for real.
  it.each(Object.entries(DYNAMIC_LINK_SOURCES))('%s links resolve (built in %s)', (_contributor, sourceFile) => {
    const links = linkLiteralsIn(readFileSync(sourceFile, 'utf8'));
    expect(links.length, `${sourceFile} produced no auditable links — has it moved?`).toBeGreaterThan(0);
    for (const { link, line } of links) {
      expect(resolvesToRoute(link, table), `${sourceFile}:${line} link "${link}" has no registered route`).toBe(true);
    }
  });
});

// Same class, different producer: command-palette results also navigate() straight
// to an href they build themselves. One of them pointed at a fabricated
// /inventory-v2/inspection/:id/review path that no route ever registered.
describe('command-palette result hrefs resolve to registered routes', () => {
  const table = readRouteTable();
  const src = readFileSync('src/components/CommandPalette.tsx', 'utf8').split('\n');

  const hrefs = src.flatMap((text, i) => {
    const m = text.match(/\bhref:\s*[`'"]([^`'"]+)[`'"]/);
    return m ? [{ href: m[1].replace(/\$\{[^}]*\}/g, ':param'), line: i + 1 }] : [];
  });

  it('finds hrefs to audit', () => {
    expect(hrefs.length).toBeGreaterThan(0);
  });

  it('every result href has a live route', () => {
    for (const { href, line } of hrefs) {
      expect(resolvesToRoute(href, table), `CommandPalette.tsx:${line} href "${href}" has no registered route`).toBe(true);
    }
  });
});
