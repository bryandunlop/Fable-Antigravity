import { describe, it, expect } from 'vitest';
import { resolveNav, GROUPS_PILOT } from './nav';

describe('nav model', () => {
  it('pilot nav is trip-first: Trips, then Fleet, then Work Queue', () => {
    expect(GROUPS_PILOT.map(g => g.key)).toEqual(['trips', 'fleet', 'workqueue']);
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
  it('maintenance root still resolves to Fleet (no regression)', () => {
    expect(resolveNav('MAINTENANCE', '/tech-log').activeGroup.key).toBe('fleet');
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
