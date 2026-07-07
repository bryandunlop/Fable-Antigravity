import { describe, it, expect } from 'vitest';
import { buildBulletinFeed } from './bulletins';
import { memoryStorage } from '../storage';
import type { Bulletin, BulletinsState } from '../../components/bulletins/types';

function bulletin(overrides: Partial<Bulletin> = {}): Bulletin {
  return {
    id: 'PB-001', bulletinType: 'procedural', title: 'Winter Ops', content: '',
    category: 'Flight Operations', roles: ['pilot'], effectiveDate: '2026-01-01',
    author: 'Author', createdDate: '2026-01-01', version: '1.0', isPinned: false,
    isArchived: false, requireAcknowledgment: true, tags: [], ...overrides,
  };
}

function seed(state: BulletinsState) {
  const s = memoryStorage();
  s.setItem('bulletins-state', JSON.stringify(state));
  return s;
}

const NOW = '2026-02-01T00:00:00.000Z';

describe('buildBulletinFeed', () => {
  it('returns nothing when storage is empty', () => {
    expect(buildBulletinFeed('pilot', NOW, memoryStorage())).toEqual([]);
  });

  it('emits a warn item for an unacknowledged must-read targeting the role', () => {
    const s = seed({ bulletins: [bulletin()], acknowledgments: [] });
    const feed = buildBulletinFeed('pilot', NOW, s);
    expect(feed).toHaveLength(1);
    expect(feed[0].severity).toBe('warn');
    expect(feed[0].module).toBe('Bulletins');
    expect(feed[0].link).toBe('/procedural-bulletins');
    expect(feed[0].id).toBe('bulletin-ack:PB-001:1.0');
  });

  it('does not target a role outside the audience', () => {
    const s = seed({ bulletins: [bulletin({ roles: ['maintenance'] })], acknowledgments: [] });
    expect(buildBulletinFeed('pilot', NOW, s)).toEqual([]);
  });

  it('clears once the user has acknowledged the current version', () => {
    const s = seed({
      bulletins: [bulletin()],
      acknowledgments: [{
        bulletinId: 'PB-001', bulletinVersion: '1.0', userId: 'USR001',
        userName: 'Captain John Smith', role: 'pilot', initials: 'JS',
        acknowledgedAtUtc: NOW,
      }],
    });
    expect(buildBulletinFeed('pilot', NOW, s)).toEqual([]);
  });

  it('links flight-ops bulletins to their own page', () => {
    const s = seed({ bulletins: [bulletin({ id: 'FOB-001', bulletinType: 'flight-ops' })], acknowledgments: [] });
    const feed = buildBulletinFeed('pilot', NOW, s);
    expect(feed[0].link).toBe('/flight-operations-bulletins');
  });
});
