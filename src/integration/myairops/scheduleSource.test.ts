import { describe, it, expect } from 'vitest';
import { loadMyairopsTripMirrors } from './scheduleSource';
import { resolveLegForTail } from './legResolver';

const NOW = '2026-07-28T12:00:00.000Z';

describe('loadMyairopsTripMirrors', () => {
  it('maps the fixture trips into myairops-sourced mirrors', () => {
    const mirrors = loadMyairopsTripMirrors(NOW);

    expect(mirrors.length).toBeGreaterThan(0);
    expect(mirrors.every(m => m.sourceSystem === 'myairops')).toBe(true);
    expect(mirrors.map(m => m.tripNumber)).toContain('MAO-7315');
  });

  it('gives inventory v2 a tail whose leg resolves mid-turn — otherwise the feature has nothing to show', () => {
    const r = resolveLegForTail(loadMyairopsTripMirrors(NOW), 'N2PG', NOW);

    expect(r.primary).toMatchObject({ kind: 'just_landed' });
    expect(r.primary?.leg.departureIcao).toBe('KLUK');
    expect(r.primary?.leg.arrivalIcao).toBe('KTEB');
    expect(r.alternate).toMatchObject({ kind: 'next_departure' });
    expect(r.alternate?.leg.arrivalIcao).toBe('KLUK');
  });

  it('leaves the days-out scenario tails unresolvable, so nothing is silently invented', () => {
    const mirrors = loadMyairopsTripMirrors(NOW);

    // MAO-7301/7305/7310 sit 1-9 days out for the scheduling-hub alert scenarios.
    expect(resolveLegForTail(mirrors, 'N6PG', NOW).primary).toBeNull();
    expect(resolveLegForTail(mirrors, 'N5PG', NOW).primary).toBeNull();
  });

  it('is stable — the same instant yields the same mirrors', () => {
    expect(loadMyairopsTripMirrors(NOW)).toEqual(loadMyairopsTripMirrors(NOW));
  });
});
