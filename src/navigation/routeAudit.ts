// Shared route-table reader for link-audit tests.
//
// The sidebar manifest has been route-audited since nav v2 (navConfig.test.ts),
// but the OTHER link producers — mobile tabs, notification deep links, command
// palette results — were not, and that is exactly where dead links accumulated
// (LG-19 / D37 Wave 1: a permanent 404 on the mobile "Messages" tab, an
// /internal-audits notification link, a fabricated inspection-review path).
//
// Node-only (reads App.tsx from disk); import from *.test.ts, never from app code.
import { readFileSync } from 'node:fs';

export interface RouteTable {
  exact: Set<string>;
  wildcards: string[];
}

// Wildcard mounts in App.tsx (path="/tech-log/*") delegate to a nested router, so
// App.tsx alone cannot say whether /tech-log/aircrafts/N1PG is real. Without these,
// "starts with a wildcard mount" is a blanket pass and a typo'd nested link audits
// clean. Explicit map rather than parsing the element's import: it is test-only
// code, and a missing entry degrades to the old blanket pass rather than breaking.
const NESTED_ROUTERS: Record<string, string> = {
  '/tech-log': 'src/components/tech-log/TechLogRoutes.tsx',
  '/fir': 'src/components/fir/FirRoutes.tsx',
};

function readNested(mount: string, file: string): string[] {
  let src: string;
  try {
    src = readFileSync(file, 'utf8');
  } catch {
    return [];
  }
  const live = src.replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, '');
  return [...live.matchAll(/path="([^"]+)"/g)]
    .map((m) => m[1])
    .filter((p) => p !== '*')
    .map((p) => (p === '/' ? mount : `${mount}/${p.replace(/^\//, '')}`));
}

export function readRouteTable(appPath = 'src/App.tsx'): RouteTable {
  const src = readFileSync(appPath, 'utf8');
  // Route elements inside a JSX comment are not registered — strip them first, or a
  // commented-out <Route path="/flight-family"> looks live. Match the {/* … */} form
  // specifically: a bare /* … */ strip would treat the `/*` inside a wildcard path
  // (path="/tech-log/*") as a comment opener and swallow every route after it.
  const live = src.replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, '');
  const exact = new Set([...live.matchAll(/path="([^"*]+)"/g)].map((m) => m[1]));
  const wildcards = [...live.matchAll(/path="([^"]+)\/\*"/g)].map((m) => m[1]);

  // Expand the mounts we can read, and drop them from `wildcards` so their nested
  // paths are checked properly instead of waved through by prefix.
  const expanded: string[] = [];
  for (const mount of wildcards) {
    const file = NESTED_ROUTERS[mount];
    if (!file) { expanded.push(mount); continue; }
    const nested = readNested(mount, file);
    if (nested.length === 0) { expanded.push(mount); continue; }
    nested.forEach((p) => exact.add(p));
  }
  return { exact, wildcards: expanded };
}

/**
 * Does `href` resolve to a registered route? Query strings and hashes are
 * stripped; ':param' segments in the route table match any single segment.
 */
export function resolvesToRoute(href: string, table: RouteTable): boolean {
  const path = href.split(/[?#]/)[0];
  if (path === '/') return true;
  if (table.exact.has(path)) return true;
  if (table.wildcards.some((w) => path === w || path.startsWith(`${w}/`))) return true;

  const segs = path.split('/').filter(Boolean);
  return [...table.exact].some((route) => {
    const rsegs = route.split('/').filter(Boolean);
    // A trailing optional param (path="/trip-builder/:tripId?") matches both with
    // and without that segment, so accept one fewer segment than the route has.
    const optionalTail = rsegs.length > 0 && rsegs[rsegs.length - 1].endsWith('?');
    if (rsegs.length !== segs.length && !(optionalTail && rsegs.length - 1 === segs.length)) return false;
    return segs.every((s, i) => rsegs[i].startsWith(':') || rsegs[i] === s);
  });
}

/**
 * `link:`/`href:` values that are expressions rather than literals — a
 * pass-through (`link: n.link`) or a builder call (`link: linkFor(...)`).
 * A literal-only audit skips these silently, which is worse than not auditing:
 * the test named after the file goes green having asserted nothing. Callers must
 * account for each one, so the gap is visible.
 */
export function findDynamicLinks(source: string): { expression: string; line: number }[] {
  return source.split('\n').flatMap((text, i) => {
    // Capture to end of line rather than to the first comma: a builder call
    // (linkFor(a, b)) contains commas, and truncating it makes the failure
    // message name a function that does not exist.
    const m = text.match(/\b(?:link|href):\s*([^'"`\s][^\n]*)/);
    return m ? [{ expression: m[1].trim().replace(/,$/, ''), line: i + 1 }] : [];
  });
}
