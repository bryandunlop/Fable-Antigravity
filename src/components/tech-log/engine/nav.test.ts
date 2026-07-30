import { describe, it, expect } from 'vitest';
import { resolveNav, GROUPS_PILOT, GROUPS_MAINT } from './nav';

describe('nav model', () => {
  it('pilot nav is trip-first: Trips, then Fleet, then Work Queue, then Metrics', () => {
    expect(GROUPS_PILOT.map(g => g.key)).toEqual(['trips', 'fleet', 'workqueue', 'metrics']);
  });

  /** D61 §5 — Bryan on who sees the maintenance-time rollup: "I think all." Nav is where "all"
   * becomes visible; the route itself is ungated, so a missing link hides the page rather than
   * blocking it, which is the worse failure — nobody reports a page they never saw. */
  it('BOTH roles can reach the maintenance-time rollup from the nav', () => {
    const reaches = (gs: typeof GROUPS_PILOT) =>
      gs.some(g => g.to === '/tech-log/metrics' || g.sub?.some(s => s.to === '/tech-log/metrics'));
    expect(reaches(GROUPS_PILOT)).toBe(true);
    expect(reaches(GROUPS_MAINT)).toBe(true);
  });

  it('the metrics route resolves to its own group for a pilot and to Records for maintenance', () => {
    expect(resolveNav('PILOT', '/tech-log/metrics').activeGroup.key).toBe('metrics');
    const maint = resolveNav('MAINTENANCE', '/tech-log/metrics');
    expect(maint.activeGroup.key).toBe('records');
    expect(maint.activeSub?.label).toBe('Maintenance time');
  });
  it('pilot root resolves to the Trips group', () => {
    expect(resolveNav('PILOT', '/tech-log').activeGroup.key).toBe('trips');
  });
  it('a trip sub-route stays on Trips', () => {
    expect(resolveNav('PILOT', '/tech-log/trips/abc').activeGroup.key).toBe('trips');
  });
  it('the pilot Fleet link lives at /tech-log/fleet and resolves to Fleet', () => {
    expect(resolveNav('PILOT', '/tech-log/fleet').activeGroup.key).toBe('fleet');
  });
  it('an aircraft detail route resolves to Fleet', () => {
    expect(resolveNav('PILOT', '/tech-log/aircraft/N1PG').activeGroup.key).toBe('fleet');
  });
  it('maintenance root is the Work Queue; Fleet keeps aircraft pages', () => {
    expect(resolveNav('MAINTENANCE', '/tech-log').activeGroup.key).toBe('workqueue');
    expect(resolveNav('MAINTENANCE', '/tech-log/aircraft/N1PG').activeGroup.key).toBe('fleet');
    expect(resolveNav('MAINTENANCE', '/tech-log/fleet').activeGroup.key).toBe('fleet');
  });
  it('pilot Trips group exposes Nuisance items and stays active on /tech-log/intermittent', () => {
    const r = resolveNav('PILOT', '/tech-log/intermittent');
    expect(r.activeGroup.key).toBe('trips');
    expect(r.activeSub?.label).toBe('Nuisance items');
  });
  it('an unknown path falls back to the role home group (first group)', () => {
    expect(resolveNav('PILOT', '/tech-log/zzz').activeGroup.key).toBe('trips');
    expect(resolveNav('MAINTENANCE', '/tech-log/zzz').activeGroup.key).toBe('fleet');
  });
});
