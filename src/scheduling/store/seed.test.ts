import { describe, it, expect } from 'vitest';
import { SEED_TEMPLATES, seedTemplates } from './seed';
import { InMemorySchedulingStore } from './memory';
import { parseTemplate } from './validate';
import { instantiateRecurring, instantiatePerTrip } from '../engine';

describe('SEED_TEMPLATES', () => {
  it('every seed template passes validation (valid scope/triggerType/rules)', () => {
    for (const t of SEED_TEMPLATES) expect(() => parseTemplate(t)).not.toThrow();
  });
  it('includes the daily/monthly/quarterly recurring + domestic per-trip checklists', () => {
    const byScope = SEED_TEMPLATES.map((t) => `${t.triggerType}:${t.scope}`);
    expect(byScope).toEqual(expect.arrayContaining([
      'recurring:daily', 'recurring:monthly', 'recurring:quarterly', 'per_trip:domestic',
    ]));
  });
  it('seedTemplates loads them and they instantiate', async () => {
    const store = new InMemorySchedulingStore();
    await seedTemplates(store);
    const published = await store.listPublishedTemplates();
    expect(published.length).toBe(SEED_TEMPLATES.length);
    const daily = published.find((t) => t.scope === 'daily')!;
    expect(instantiateRecurring(daily, { nowUtc: '2026-06-29T12:00:00.000Z', officeTzOffsetMinutes: -240 }, (s) => s).length)
      .toBeGreaterThan(0);
  });
});
