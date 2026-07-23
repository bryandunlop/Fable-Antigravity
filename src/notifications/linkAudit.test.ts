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
import { readRouteTable, resolvesToRoute } from '../navigation/routeAudit';

const DIR = 'src/notifications/contributors';

function linkLiterals(file: string): { link: string; line: number }[] {
  const out: { link: string; line: number }[] = [];
  readFileSync(join(DIR, file), 'utf8').split('\n').forEach((text, i) => {
    // link: '/path' or link: `/path/${id}` — template holes become a ':param' segment
    const m = text.match(/\blink:\s*['"`]([^'"`]+)['"`]/) ?? text.match(/\blink:\s*`([^`]+)`/);
    if (m) out.push({ link: m[1].replace(/\$\{[^}]*\}/g, ':param'), line: i + 1 });
  });
  return out;
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
