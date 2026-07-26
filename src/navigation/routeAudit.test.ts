import { describe, it, expect } from 'vitest';
import { readRouteTable, resolvesToRoute, findDynamicLinks } from './routeAudit';

const table = readRouteTable();

describe('readRouteTable', () => {
  it('reads top-level routes', () => {
    expect(table.exact.has('/vacation-request')).toBe(true);
    expect(table.exact.has('/safety/audits')).toBe(true);
  });

  it('excludes routes disabled behind a JSX comment', () => {
    // /flight-family is commented out in App.tsx — treating it as live is exactly
    // how the mobile "Messages" 404 tab passed unnoticed.
    expect(table.exact.has('/flight-family')).toBe(false);
  });

  it('does not let the /* inside a wildcard path swallow later routes', () => {
    // Regression: a naive block-comment strip ate everything after the first
    // path="/tech-log/*", hiding most of the route table.
    expect(table.exact.has('/tasks-action-items')).toBe(true);
  });

  it('expands nested routers instead of trusting the mount prefix', () => {
    expect(table.exact.has('/tech-log/deferrals')).toBe(true);
    expect(table.exact.has('/fir/published')).toBe(true);
    // Expanded mounts must leave the blanket wildcard behind.
    expect(table.wildcards).not.toContain('/tech-log');
  });
});

describe('resolvesToRoute', () => {
  it('accepts real routes, including nested and parameterised ones', () => {
    expect(resolvesToRoute('/vacation-request', table)).toBe(true);
    expect(resolvesToRoute('/tech-log/aircraft/N1PG', table)).toBe(true);
    expect(resolvesToRoute('/fir/published/FIR-2026-001', table)).toBe(true);
  });

  it('ignores query strings and hashes', () => {
    expect(resolvesToRoute('/tech-log/aircraft/N1PG?tab=deferrals&gating=1', table)).toBe(true);
  });

  it('rejects a typo under a nested mount — the blanket-prefix pass is closed', () => {
    // Before nested expansion this returned true for anything under /tech-log/,
    // so a misspelled deep link audited clean.
    expect(resolvesToRoute('/tech-log/aircrafts/N1PG', table)).toBe(false);
    expect(resolvesToRoute('/tech-log/no-such-page', table)).toBe(false);
  });

  it('rejects routes that do not exist at all', () => {
    expect(resolvesToRoute('/internal-audits', table)).toBe(false);
    expect(resolvesToRoute('/inventory-v2/inspection/abc/review', table)).toBe(false);
  });

  it('matches an optional trailing param with and without the segment', () => {
    expect(resolvesToRoute('/trip-builder', table)).toBe(true);
    expect(resolvesToRoute('/trip-builder/TRIP-1', table)).toBe(true);
  });

  it('does not match a shorter path against a longer route', () => {
    expect(resolvesToRoute('/tech-log/trips/T1/legs', table)).toBe(false);
  });
});

describe('findDynamicLinks', () => {
  it('spots pass-throughs and builder calls that a literal scan cannot check', () => {
    const found = findDynamicLinks('  link: n.link,\n  link: linkFor(doc.id, doc.classId),\n');
    expect(found.map((f) => f.expression)).toEqual(['n.link', 'linkFor(doc.id, doc.classId)']);
  });

  it('does not flag a plain literal', () => {
    expect(findDynamicLinks("  link: '/safety/audits',")).toEqual([]);
  });
});
