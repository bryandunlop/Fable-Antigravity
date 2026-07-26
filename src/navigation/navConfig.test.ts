import { describe, it, expect } from 'vitest';
import { NAV_ENTRIES, entriesForRoles, matchEntry, domainsForRole, FRONT_DOORS } from './navConfig';
import { readAppRoutePaths, readRouteTable, resolvesToRoute } from './routeAudit';

// One hardened route-table reader for every link audit. This file used to carry
// its own copy of the regex, which did not strip JSX comments — so a route
// disabled behind {/* … */} with its sidebar entry left in place would have
// false-PASSED here, the very bug class LG-19 is about.
const table = readRouteTable();

describe('route audit — every manifest path is registered in App.tsx', () => {
  it.each(NAV_ENTRIES.map((e) => [e.path, e.label]))('%s (%s)', (path) => {
    expect(resolvesToRoute(path as string, table), `${path} has no registered route`).toBe(true);
  });
});

// The REVERSE audit (Work Ledger design §7 / review finding #14): a route that
// lives in App.tsx but not in the manifest is invisible to ⌘K, breadcrumbs and
// this file — /safety/classic drifted that way, and /ops would have been the
// third instance. Every App route must have an EXACT manifest entry (after
// stripping wildcards and :params) OR be enumerated below. No prefix coverage:
// a sub-path rule would have waved /safety/classic through — the very route
// this audit is named for. The list is FROZEN DEBT: adding a new unregistered
// route fails the first assertion; registering one of these fails the second
// until it's removed here.
const KNOWN_UNREGISTERED = [
  '/public/passenger-form', // public infra — deliberately outside the nav
  '/commissary-kiosk', // public infra — kiosk persona, no nav shell
  '/aircraft-cleaning/workflow/:id',
  '/aircraft-cleaning/manager-dashboard',
  '/aircraft-cleaning/new-workflow',
  '/pilot/elb',
  // D36 ramp mode: reached by the "Ramp check" button on a specific tail, never from
  // nav — the path has no meaning without a :tail, so a manifest entry would be a link
  // to nowhere. Same shape as the other parameterised workflow routes in this list.
  '/tech-log/aircraft/:tail/ramp',
  '/grat/form-builder',
  '/grat/form-fields',
  // Removed 2026-07-26 when this audit moved onto the comment-stripping reader:
  // '/safety/classic' no longer exists in App.tsx at all, and '/restaurant-database'
  // and '/flight-family' are both inside {/* … */}. The old raw regex counted all
  // three as live routes, which is what kept them looking like justified debt.
  '/safety/waivers',
  '/safety/hazards',
  '/safety/hazards/:id',
  '/safety/audits',
  '/safety/compliance',
  '/safety/frat-builder',
  '/safety/grat-builder',
  '/safety/risk-profile',
  '/safety/manager-dashboard',
  '/safety/hazard-workflow/:id',
  '/safety/preflight-workflow/:id',
  '/inventory-v2',
  '/inventory-v2/inspection/review',
  '/inventory-v2/commissary/location/:locationId',
  '/inventory-v2/commissary/item/:itemId',
  '/scheduling-workspace', // redirect stub
  '/tax-compliance',
  '/booking-profile',
  '/trip-builder/:tripId?',
  '/itinerary-builder',
  '/maintenance-workflow',
  '/maintenance-workflow/tech-log',
  '/maintenance-workflow/mel',
  '/maintenance-workflow/work-orders',
  '/maintenance-workflow/technician',
  '/maintenance-workflow/handover',
  '/maintenance-workflow/analytics',
  '/experimental/scheduling-command', // redirect stub
];

describe('route audit — every App.tsx route is manifest-covered or enumerated debt', () => {
  // Sourced from the shared reader, not a second raw regex over App.tsx. This block
  // originally carried its own `appSrc.matchAll(/path="…"/)`; that copy did not strip
  // JSX comments, so a route commented out behind {/* … */} still counted as live here
  // — and three such routes were sitting in KNOWN_UNREGISTERED as a result.
  const appRoutes = readAppRoutePaths()
    .filter((p) => p !== '*' && p !== '/*' && p !== '/login');
  const manifestPaths = NAV_ENTRIES.map((e) => e.path);
  const norm = (p: string) => p.replace(/\/\*$/, '').replace(/\/:.*$/, '');
  const covered = (p: string) => {
    const n = norm(p);
    return n === '/' || manifestPaths.includes(n);
  };

  it.each(appRoutes.map((p) => [p]))('%s is covered or known', (path) => {
    expect(
      covered(path) || KNOWN_UNREGISTERED.includes(path),
      `${path} is a NEW unregistered route — add a NAV_ENTRIES entry (hidden: true if it should render no link)`,
    ).toBe(true);
  });

  it('the known-debt list carries no stale entries', () => {
    const stale = KNOWN_UNREGISTERED.filter((p) => covered(p) || !appRoutes.includes(p));
    expect(stale, `now covered or gone — remove from KNOWN_UNREGISTERED: ${stale.join(', ')}`).toEqual([]);
  });
});

describe('hidden entries — a link is rendered nowhere, but the route is known', () => {
  it('/ops is manifest-registered, hidden, and unsearchable', () => {
    const ops = NAV_ENTRIES.find((e) => e.path === '/ops')!;
    expect(ops).toBeDefined();
    expect(ops.hidden).toBe(true);
    expect(ops.searchable).toBe(false); // CommandPalette checks both guards
    expect(ops.sidebar).toBe(false);
  });
  it('hidden entries never reach any sidebar group, even for their own role', () => {
    const allSidebarPaths = domainsForRole('admin').flatMap((d) => [...d.primary, ...d.more]).map((e) => e.path);
    expect(allSidebarPaths).not.toContain('/ops');
  });
});

describe('role filtering', () => {
  it('pilot sees the workspace but not scheduling-only pages', () => {
    const paths = entriesForRoles('pilot').map((e) => e.path);
    expect(paths).toContain('/pilot-workspace');
    expect(paths).not.toContain('/scheduling-command');
  });
  it('additionalRoles widen visibility', () => {
    expect(entriesForRoles('pilot', ['scheduling']).map((e) => e.path)).toContain('/scheduling-command');
  });
});

describe('domainsForRole', () => {
  it('maintenance domain shows exactly Tech Log + Parts Inventory as primary', () => {
    const mx = domainsForRole('maintenance').find((d) => d.domain === 'maintenance')!;
    expect(mx.primary.map((e) => e.label)).toEqual(['Tech Log', 'Parts Inventory']);
    expect(mx.more.map((e) => e.label)).toContain('Work Analytics');
    expect(mx.more.map((e) => e.label)).not.toContain('Maintenance Hub'); // sidebar: false
  });
  it('pilot Flight Ops: workspace primary, absorbed pages behind More', () => {
    const fo = domainsForRole('pilot').find((d) => d.domain === 'flight-ops')!;
    expect(fo.primary.map((e) => e.label)).toEqual(['Pilot Workspace']);
    expect(fo.more.map((e) => e.label)).toEqual(
      expect.arrayContaining(['Preflight Workflow', 'Standalone FRAT', 'My FRAT Submissions', 'Airport Information', 'Fuel Load Request']),
    );
  });
  it('non-admin roles get no admin domain', () => {
    expect(domainsForRole('pilot').map((d) => d.domain)).not.toContain('admin');
  });
});

describe('matchEntry', () => {
  it('longest-prefix, segment-aware, / exact-only', () => {
    expect(matchEntry('/inventory-v2/unit-request')?.label).toBe('New Unit Request');
    expect(matchEntry('/tech-log/aircraft/N1PG')?.path).toBe('/tech-log');
    expect(matchEntry('/anything-unknown')).toBeUndefined();
  });
  it('role-variant labels resolve per role', () => {
    expect(matchEntry('/upcoming-flights', entriesForRoles('pilot'))?.label).toBe('Flight Calendar');
    expect(matchEntry('/upcoming-flights', entriesForRoles('inflight'))?.label).toBe('Upcoming Trips');
  });
});

describe('front doors', () => {
  it('map to registered routes', () => {
    for (const target of Object.values(FRONT_DOORS)) {
      expect(resolvesToRoute(target, table), `${target} unregistered`).toBe(true);
    }
  });
});
