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

export function readRouteTable(appPath = 'src/App.tsx'): RouteTable {
  const src = readFileSync(appPath, 'utf8');
  // Route elements inside a JSX comment are not registered — strip them first, or a
  // commented-out <Route path="/flight-family"> looks live. Match the {/* … */} form
  // specifically: a bare /* … */ strip would treat the `/*` inside a wildcard path
  // (path="/tech-log/*") as a comment opener and swallow every route after it.
  const live = src.replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, '');
  return {
    exact: new Set([...live.matchAll(/path="([^"*]+)"/g)].map((m) => m[1])),
    wildcards: [...live.matchAll(/path="([^"]+)\/\*"/g)].map((m) => m[1]),
  };
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
    if (rsegs.length !== segs.length) return false;
    return rsegs.every((r, i) => r.startsWith(':') || r === segs[i]);
  });
}
