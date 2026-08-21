import { describe, expect, it } from 'vitest';
import {
  getPendingTripRequests,
  getTurndownsThisMonth,
  getOnTimeLegStats,
  getTrackedPassengers,
  DEFAULT_TRACKED_PASSENGER_IDS,
} from './bookingQueueSeed';
import { SEED_AIRCRAFT } from '../tech-log/mockData/fleet';

const NOW = '2026-08-19T12:00:00.000Z';

describe('bookingQueueSeed', () => {
  it('every seeded tail is in the canonical fleet', () => {
    const canonical = new Set(SEED_AIRCRAFT.map(a => a.tailNumber));
    for (const req of getPendingTripRequests(NOW)) {
      if (req.preferredTail) {
        expect(canonical, `${req.preferredTail} not in SEED_AIRCRAFT`).toContain(req.preferredTail);
      }
    }
  });

  it('pending requests derive dates from now — no hardcoded years', () => {
    const a = getPendingTripRequests(NOW);
    const later = '2031-03-05T12:00:00.000Z';
    const b = getPendingTripRequests(later);
    const shift = Date.parse(later) - Date.parse(NOW);
    for (let i = 0; i < a.length; i++) {
      expect(Date.parse(b[i].startUtc) - Date.parse(a[i].startUtc)).toBe(shift);
      expect(Date.parse(b[i].requestedAtUtc) - Date.parse(a[i].requestedAtUtc)).toBe(shift);
      // Trip windows are upcoming relative to the supplied now.
      expect(Date.parse(a[i].startUtc)).toBeGreaterThan(Date.parse(NOW));
      expect(Date.parse(a[i].endUtc)).toBeGreaterThan(Date.parse(a[i].startUtc));
    }
  });

  it('serves 2 pending requests, one carrying a conflict note', () => {
    const reqs = getPendingTripRequests(NOW);
    expect(reqs).toHaveLength(2);
    expect(reqs.filter(r => r.conflictNote !== null)).toHaveLength(1);
  });

  it('serves 3 turndowns this month, 2 for availability, all dated before now', () => {
    const t = getTurndownsThisMonth(NOW);
    expect(t).toHaveLength(3);
    expect(t.filter(x => x.reason === 'availability')).toHaveLength(2);
    for (const x of t) {
      expect(Date.parse(x.turnedDownAtUtc)).toBeLessThan(Date.parse(NOW));
    }
  });

  it('turndown dates derive from now — no hardcoded years', () => {
    const later = '2031-03-05T12:00:00.000Z';
    const shift = Date.parse(later) - Date.parse(NOW);
    const a = getTurndownsThisMonth(NOW);
    const b = getTurndownsThisMonth(later);
    for (let i = 0; i < a.length; i++) {
      expect(Date.parse(b[i].turnedDownAtUtc) - Date.parse(a[i].turnedDownAtUtc)).toBe(shift);
    }
  });

  it('reports 46/48 on-time legs with 2 weather delays', () => {
    expect(getOnTimeLegStats()).toEqual({ onTimeLegs: 46, totalLegs: 48, weatherDelays: 2 });
  });

  it('tracked passengers include the three named principals, default-tracked', () => {
    const pax = getTrackedPassengers();
    const byName = Object.fromEntries(pax.map(p => [p.name, p]));
    expect(byName['Robert Johnson'].role).toBe('Board Chairman');
    expect(byName['Jennifer Martinez'].role).toBe('CFO');
    expect(byName['Michael Chen'].role).toBe('CEO');
    const ids = new Set(pax.map(p => p.id));
    for (const id of DEFAULT_TRACKED_PASSENGER_IDS) expect(ids).toContain(id);
  });
});
