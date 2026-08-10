import { describe, it, expect } from 'vitest';
import { primaryDomainsForRole, orderedGroupsForRole } from './navOrder';
import { domainsForRole } from './navConfig';

describe('primaryDomainsForRole', () => {
  it('gives each phone/iPad-primary role its own work domain', () => {
    expect(primaryDomainsForRole('pilot')).toEqual(['flight-ops']);
    expect(primaryDomainsForRole('maintenance')).toEqual(['maintenance']);
    expect(primaryDomainsForRole('scheduling')).toEqual(['scheduling']);
    expect(primaryDomainsForRole('inflight')).toEqual(['inflight', 'inventory']);
  });

  // The dev pilot login carries [chief-pilot, airport-evaluator]; a maintenance
  // user can hold dom. A primary role with no mapping should inherit from one.
  it('falls back to an additional role that has a mapping', () => {
    expect(primaryDomainsForRole('airport-evaluator', ['chief-pilot'])).toEqual(['flight-ops']);
  });

  it('falls back to home for the desktop-only long tail', () => {
    expect(primaryDomainsForRole('tax')).toEqual(['home']);
    expect(primaryDomainsForRole('document-manager')).toEqual(['home']);
  });
});

describe('orderedGroupsForRole — your own work comes first', () => {
  it("puts a technician's Maintenance group first, not fifth", () => {
    const before = domainsForRole('maintenance').map((g) => g.domain);
    const after = orderedGroupsForRole('maintenance').map((g) => g.domain);

    expect(before.indexOf('maintenance')).toBeGreaterThan(0); // it was buried
    expect(after[0]).toBe('maintenance');
  });

  it('puts Flight Ops first for a pilot and Scheduling first for a scheduler', () => {
    expect(orderedGroupsForRole('pilot')[0].domain).toBe('flight-ops');
    expect(orderedGroupsForRole('scheduling')[0].domain).toBe('scheduling');
  });

  it('keeps multi-domain roles in their own declared order', () => {
    const inflight = orderedGroupsForRole('inflight').map((g) => g.domain);
    expect(inflight.slice(0, 2)).toEqual(['inflight', 'inventory']);
  });

  it('leaves the remaining groups in the editorial DOMAIN_ORDER sequence', () => {
    const rest = orderedGroupsForRole('maintenance')
      .map((g) => g.domain)
      .filter((d) => d !== 'maintenance');
    expect(rest).toEqual([...rest].sort(
      (a, b) => ['home', 'flight-ops', 'scheduling', 'inflight', 'inventory',
        'maintenance', 'safety', 'documents', 'admin'].indexOf(a)
        - ['home', 'flight-ops', 'scheduling', 'inflight', 'inventory',
          'maintenance', 'safety', 'documents', 'admin'].indexOf(b),
    ));
  });

  // Reordering must not smuggle entries in or out — it is a sort, nothing else.
  it('is a pure reordering: same groups, same entries, no losses', () => {
    for (const role of ['pilot', 'maintenance', 'inflight', 'scheduling', 'admin', 'lead']) {
      const before = domainsForRole(role);
      const after = orderedGroupsForRole(role);
      expect(after.length).toBe(before.length);
      expect([...after.map((g) => g.domain)].sort()).toEqual([...before.map((g) => g.domain)].sort());

      const count = (gs: typeof before) => gs.reduce((n, g) => n + g.primary.length + g.more.length, 0);
      expect(count(after)).toBe(count(before));
    }
  });

  it('never hoists a domain the role cannot see', () => {
    // commissary-manager's own domains are ['inventory']; it has no flight-ops.
    const domains = orderedGroupsForRole('commissary-manager').map((g) => g.domain);
    expect(domains).not.toContain('flight-ops');
    expect(domains[0]).toBe('inventory');
  });
});
