import { describe, it, expect } from 'vitest';
import { buildTechLogFeed } from './techLog';
import { memoryStorage } from '../storage';
import { STORAGE_KEY, VERSION_KEY, DATA_VERSION } from '../../components/tech-log/TechLogContext';
import { getDefaultState } from '../../components/tech-log/mockData/scenarios';

const NOW = '2026-07-04T12:00:00.000Z';

function seededCurrent() {
  const s = memoryStorage();
  s.setItem(VERSION_KEY, DATA_VERSION);
  s.setItem(STORAGE_KEY, JSON.stringify(getDefaultState()));
  return s;
}

describe('buildTechLogFeed', () => {
  it('produces maintenance-lens items for the maintenance role, namespaced and module-tagged', () => {
    const items = buildTechLogFeed('maintenance', NOW, seededCurrent());
    expect(items.length).toBeGreaterThan(0);
    for (const i of items) {
      expect(i.id.startsWith('techlog:')).toBe(true);
      expect(i.module).toBe('Tech Log');
      expect(['critical', 'warn', 'info']).toContain(i.severity);
    }
  });

  it('gives pilots the pilot lens (no raw new-squawk items)', () => {
    const maint = buildTechLogFeed('maintenance', NOW, seededCurrent());
    const pilot = buildTechLogFeed('pilot', NOW, seededCurrent());
    expect(pilot.some(i => i.id.startsWith('techlog:sq:'))).toBe(false);
    expect(maint.map(i => i.id)).not.toEqual(pilot.map(i => i.id));
  });

  it('returns nothing for roles with no tech-log persona', () => {
    expect(buildTechLogFeed('fa', NOW, seededCurrent())).toEqual([]);
  });

  it('falls back to the default scenario when the stored version is stale', () => {
    const s = memoryStorage();
    s.setItem(VERSION_KEY, 'ancient');
    s.setItem(STORAGE_KEY, '{"garbage":true}');
    expect(buildTechLogFeed('maintenance', NOW, s).length).toBeGreaterThan(0);
  });
});
