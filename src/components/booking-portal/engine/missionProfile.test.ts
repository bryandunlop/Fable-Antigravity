import { describe, expect, it } from 'vitest';
import {
  suggestProfile, needsCustoms, isUsPoint, isUsTerritoryPoint,
  isWaterCrossing, landmassGroup, distanceNm, OCEAN_MIN_NM,
} from './missionProfile';

describe('customs is its own question', () => {
  it('a US-to-US leg needs no customs', () => {
    expect(needsCustoms([{ from: 'KCVG', to: 'KTEB' }]).needsCustoms).toBe(false);
  });

  it('London does', () => {
    expect(needsCustoms([{ from: 'KTEB', to: 'EGLL' }]).needsCustoms).toBe(true);
  });

  it('Honolulu does NOT — it is a US state, and the old regex said it did', () => {
    expect(isUsPoint('PHNL')).toBe(true);
    expect(needsCustoms([{ from: 'KLAX', to: 'PHNL' }]).needsCustoms).toBe(false);
  });

  it('Anchorage does not either', () => {
    expect(needsCustoms([{ from: 'KSEA', to: 'PANC' }]).needsCustoms).toBe(false);
  });

  it('a US territory is flagged as uncertain rather than guessed', () => {
    expect(isUsTerritoryPoint('TJSJ')).toBe(true);
    const v = needsCustoms([{ from: 'KMIA', to: 'TJSJ' }]);
    expect(v.uncertain).toBe(true);
  });
});

describe('an ocean crossing is its own question', () => {
  it('KLAX → PHNL is a water crossing — the trip the sleeping rule exists for', () => {
    expect(isWaterCrossing('KLAX', 'PHNL')).toBe(true);
  });

  it('and the old international test would have called it domestic-shaped nonsense', () => {
    // The bug in one line: customs says no, water says yes. One boolean cannot carry both.
    expect(needsCustoms([{ from: 'KLAX', to: 'PHNL' }]).needsCustoms).toBe(false);
    expect(isWaterCrossing('KLAX', 'PHNL')).toBe(true);
  });

  it('Alaska is North America, not the Pacific — the longest prefix wins', () => {
    expect(landmassGroup('PANC')).toBe('north-america');
    expect(landmassGroup('PHNL')).toBe('pacific');
    expect(isWaterCrossing('KSEA', 'PANC')).toBe(false);
  });

  it('KTEB → EGLL crosses the Atlantic', () => {
    expect(isWaterCrossing('KTEB', 'EGLL')).toBe(true);
  });

  it('a long flight within one landmass is not a crossing', () => {
    expect(isWaterCrossing('KTEB', 'KLAX')).toBe(false);
  });

  it('North America to South America is continuous land — nobody sleeps in a berth for it', () => {
    expect(isWaterCrossing('KMIA', 'SBGR')).toBe(false);
  });
});

describe('the suggested profile', () => {
  it('a domestic day trip is domestic, and that much is settled', () => {
    const s = suggestProfile([{ from: 'KCVG', to: 'KTEB', departLocal: '08:00' }]);
    expect(s.profile).toBe('domestic');
    expect(s.settled).toBe(true);
  });

  it('an evening ocean crossing suggests overnight — and admits it is guessing', () => {
    const s = suggestProfile([{ from: 'KTEB', to: 'EGLL', departLocal: '21:30' }]);
    expect(s.profile).toBe('ocean-overnight');
    expect(s.settled).toBe(false);
  });

  it('a morning ocean crossing suggests a day crossing', () => {
    expect(suggestProfile([{ from: 'KTEB', to: 'EGLL', departLocal: '09:00' }]).profile).toBe('ocean-day');
  });

  it('one ocean leg makes the whole trip an ocean trip', () => {
    const s = suggestProfile([
      { from: 'KCVG', to: 'KTEB', departLocal: '08:00' },
      { from: 'KTEB', to: 'EGLL', departLocal: '20:00' },
    ]);
    expect(s.profile).toBe('ocean-overnight');
  });

  it('says which rule fired, so she can argue with it rather than obey it', () => {
    expect(suggestProfile([{ from: 'KTEB', to: 'EGLL', departLocal: '21:30' }]).why).toContain('21:30');
  });

  it('nothing asked yet is not an ocean crossing', () => {
    expect(suggestProfile([]).profile).toBe('domestic');
  });
});

describe('distance', () => {
  it('measures a known pair and is silent about an unknown one', () => {
    const nm = distanceNm('KTEB', 'EGLL');
    expect(nm).not.toBeNull();
    expect(nm!).toBeGreaterThan(2800);
    expect(nm!).toBeLessThan(3200);
    expect(distanceNm('KTEB', 'ZZZZ')).toBeNull();
    expect(OCEAN_MIN_NM).toBe(1800);
  });
});
