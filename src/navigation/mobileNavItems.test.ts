import { describe, it, expect } from 'vitest';
import { mobileNavItemsForRole } from './mobileNavItems';

// H1: every mobile "Documents" entry must point at the real /documents hub —
// never the dead legacy /document-management surface (no-op upload forms).
const DOCUMENT_ROLES = ['pilot', 'safety', 'document-manager', 'admin-assistant', 'unknown-role-falls-to-default'];

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
