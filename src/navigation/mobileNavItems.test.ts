import { describe, it, expect } from 'vitest';
import { mobileNavItemsForRole, MOBILE_NAV_ROLES, MAX_VISIBLE_TABS } from './mobileNavItems';
import { readRouteTable, resolvesToRoute } from './routeAudit';

// H1: every mobile "Documents" entry must point at the real /documents hub —
// never the dead legacy /document-management surface (no-op upload forms).
// (pilot, safety and admin-assistant dropped their Documents tab in the four-tab
// rebudget — pilot in Bryan's 2026-07-24 picks, the others in the LG-19 pass —
// their own work surfaces outrank the library; Documents stays in More.)
const DOCUMENT_ROLES = ['document-manager', 'unknown-role-falls-to-default'];

describe('mobileNavItemsForRole (H1 — mobile nav routes to the real Documents hub)', () => {
  it.each(DOCUMENT_ROLES)('%s: Documents points to /documents', (role) => {
    const items = mobileNavItemsForRole(role);
    const docs = items.find((i) => i.name === 'Documents');
    expect(docs?.href).toBe('/documents');
  });

  it.each(DOCUMENT_ROLES)('%s: no item links to the legacy /document-management surface', (role) => {
    expect(mobileNavItemsForRole(role).some((i) => i.href === '/document-management')).toBe(false);
  });

  it('document-manager has exactly one documents entry (duplicate "Center" removed)', () => {
    const items = mobileNavItemsForRole('document-manager');
    expect(items.filter((i) => i.href === '/documents')).toHaveLength(1);
    expect(items.some((i) => i.name === 'Center')).toBe(false);
  });

  it('roles without a documents tab are unchanged', () => {
    expect(mobileNavItemsForRole('maintenance').some((i) => i.href === '/tech-log')).toBe(true);
    expect(mobileNavItemsForRole('inflight').some((i) => i.href === '/upcoming-flights')).toBe(true);
    expect(mobileNavItemsForRole('scheduling').some((i) => i.href === '/schedule')).toBe(true);
  });
});

// LG-19 Wave 1: the sidebar manifest has been route-audited since nav v2, but the
// mobile tabs never were — so a tab pointing at the commented-out /flight-family
// route shipped a permanent 404 on every phone, for every role.
describe('mobile tabs resolve to registered routes', () => {
  const table = readRouteTable();

  it.each(MOBILE_NAV_ROLES)('%s: every tab href has a live route', (role) => {
    for (const item of mobileNavItemsForRole(role)) {
      expect(resolvesToRoute(item.href, table), `${role} tab "${item.name}" → ${item.href} has no registered route`).toBe(true);
    }
  });

  it('the default fallback role is audited too', () => {
    for (const item of mobileNavItemsForRole('unknown-role-falls-to-default')) {
      expect(resolvesToRoute(item.href, table), `default tab "${item.name}" → ${item.href} has no registered route`).toBe(true);
    }
  });

  // MobileBottomNav renders only slice(0, MAX_VISIBLE_TABS); a fifth entry is not a
  // harmless extra, it is an invisible tab. Safety used to define six and lost its
  // Safety and Hazards tabs to Documents and Tasks.
  it.each([...MOBILE_NAV_ROLES, 'unknown-role-falls-to-default'])('%s: defines no tab that would never render', (role) => {
    expect(mobileNavItemsForRole(role).length).toBeLessThanOrEqual(MAX_VISIBLE_TABS);
  });

  it('safety keeps its own board and hazards in the visible set', () => {
    const hrefs = mobileNavItemsForRole('safety').map((i) => i.href);
    expect(hrefs).toContain('/safety');
    expect(hrefs).toContain('/safety/hazards');
  });
});
