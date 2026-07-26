import { describe, it, expect } from 'vitest';
import { buildAuditFeed } from './audits';
import { memoryStorage } from '../storage';

const NOW = '2026-07-04T12:00:00.000Z';

function seeded(audits: unknown[]) {
  const s = memoryStorage();
  s.setItem('antigravity_audits', JSON.stringify(audits));
  return s;
}

describe('buildAuditFeed', () => {
  it('derives expired (critical), imminent (warn) and upcoming (info) audits', () => {
    const s = seeded([
      { id: 'A1', title: 'Fuel Farm', expirationDate: '2026-07-01', assignedTo: 'Sarah Wilson' },
      { id: 'A2', title: 'Ramp Ops', expirationDate: '2026-07-08' },
      { id: 'A3', title: 'SMS Manual', expirationDate: '2026-07-30' },
      { id: 'A4', title: 'Far Future', expirationDate: '2026-12-01' },
      { id: 'A5', title: 'No Expiry' },
    ]);
    const items = buildAuditFeed('safety', NOW, s);
    expect(items.map(i => [i.id, i.severity])).toEqual([
      ['audit-expired:A1', 'critical'],
      ['audit-due:A2', 'warn'],
      ['audit-due:A3', 'info'],
    ]);
    expect(items[0].module).toBe('Audit Management');
    // Was '/internal-audits' — a route that never existed, so a critical "audit
    // expired" notification dropped the user on the 404 page. This assertion had
    // locked the bug in; linkAudit.test.ts now guards the whole class.
    expect(items[0].link).toBe('/safety/audits');
    expect(items[0].detail).toContain('Sarah Wilson');
  });

  it('self-clears: a renewed audit produces nothing', () => {
    const s = seeded([{ id: 'A1', title: 'Fuel Farm', expirationDate: '2027-01-01' }]);
    expect(buildAuditFeed('safety', NOW, s)).toEqual([]);
  });

  it('returns nothing for roles outside the audience', () => {
    const s = seeded([{ id: 'A1', title: 'Fuel Farm', expirationDate: '2026-07-01' }]);
    expect(buildAuditFeed('fa', NOW, s)).toEqual([]);
  });

  it('is safe on missing or corrupt storage', () => {
    expect(buildAuditFeed('safety', NOW, memoryStorage())).toEqual([]);
    const s = memoryStorage();
    s.setItem('antigravity_audits', '{not json');
    expect(buildAuditFeed('safety', NOW, s)).toEqual([]);
    const s2 = memoryStorage();
    s2.setItem('antigravity_audits', '{}');
    expect(buildAuditFeed('safety', NOW, s2)).toEqual([]);
    expect(buildAuditFeed('safety', NOW, null)).toEqual([]);
  });
});
