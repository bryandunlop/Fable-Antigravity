import { describe, it, expect } from 'vitest';
import { buildHazardFeed } from './hazards';
import { memoryStorage } from '../storage';

const NOW = '2026-07-04T12:00:00.000Z';

function seeded(hazards: unknown[]) {
  const s = memoryStorage();
  s.setItem('aviation_hazards', JSON.stringify(hazards));
  return s;
}

describe('buildHazardFeed', () => {
  it('derives overdue (warn) and upcoming (info) effectiveness reviews', () => {
    const s = seeded([
      { id: 'HZ-001', title: 'FOD on ramp', effectivenessReviewDate: '2026-06-30' },
      { id: 'HZ-002', title: 'Hangar door', effectivenessReviewDate: '2026-07-09' },
      { id: 'HZ-003', title: 'Far future', effectivenessReviewDate: '2026-09-01' },
      { id: 'HZ-004', title: 'No review date' },
    ]);
    const items = buildHazardFeed('safety', NOW, s);
    expect(items.map(i => [i.id, i.severity])).toEqual([
      ['hazard-review:HZ-001', 'warn'],
      ['hazard-review:HZ-002', 'info'],
    ]);
    expect(items[0].link).toBe('/safety/hazard-workflow/HZ-001');
    expect(items[0].title).toContain('overdue');
    expect(items[1].title).toContain('due');
  });

  it('returns nothing for roles outside the audience and on missing storage', () => {
    const s = seeded([{ id: 'HZ-001', title: 'x', effectivenessReviewDate: '2026-06-30' }]);
    expect(buildHazardFeed('pilot', NOW, s)).toEqual([]);
    expect(buildHazardFeed('safety', NOW, memoryStorage())).toEqual([]);
    expect(buildHazardFeed('safety', NOW, null)).toEqual([]);
  });

  it('is safe on corrupt storage', () => {
    const s = memoryStorage();
    s.setItem('aviation_hazards', '{}');
    expect(buildHazardFeed('safety', NOW, s)).toEqual([]);
  });

  it('skips malformed records (null entries, unparseable dates)', () => {
    const s = seeded([
      null,
      { id: 'HZ-010', title: 'Bad date', effectivenessReviewDate: 'not-a-date' },
      { id: 'HZ-011', title: 'Good', effectivenessReviewDate: '2026-06-30' },
    ]);
    expect(buildHazardFeed('safety', NOW, s).map(i => i.id)).toEqual(['hazard-review:HZ-011']);
  });
});
