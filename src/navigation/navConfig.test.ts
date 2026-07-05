import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { NAV_ENTRIES, entriesForRoles, matchEntry, domainsForRole, FRONT_DOORS } from './navConfig';

const appSrc = readFileSync('src/App.tsx', 'utf8');
const exactPaths = new Set([...appSrc.matchAll(/path="([^"*]+)"/g)].map((m) => m[1]));
const wildcards = [...appSrc.matchAll(/path="([^"]+)\/\*"/g)].map((m) => m[1]);

describe('route audit — every manifest path is registered in App.tsx', () => {
  it.each(NAV_ENTRIES.map((e) => [e.path, e.label]))('%s (%s)', (path) => {
    const ok = path === '/' || exactPaths.has(path) || wildcards.some((w) => path === w || path.startsWith(`${w}/`));
    expect(ok, `${path} has no registered route`).toBe(true);
  });
});

describe('role filtering', () => {
  it('pilot sees the workspace but not scheduling-only pages', () => {
    const paths = entriesForRoles('pilot').map((e) => e.path);
    expect(paths).toContain('/pilot-workspace');
    expect(paths).not.toContain('/scheduling-workspace');
  });
  it('additionalRoles widen visibility', () => {
    expect(entriesForRoles('pilot', ['scheduling']).map((e) => e.path)).toContain('/scheduling-workspace');
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
      expect(exactPaths.has(target) || wildcards.some((w) => target === w), `${target} unregistered`).toBe(true);
    }
  });
});
