import { describe, it, expect } from 'vitest';
import { generateTrips, FLEET } from '../mockData';

const ANCHOR = new Date('2026-07-03T00:00:00Z');

describe('scheduling mock trip generator', () => {
  const trips = generateTrips(ANCHOR);

  it('is deterministic — same anchor produces byte-identical output', () => {
    expect(JSON.stringify(generateTrips(ANCHOR))).toBe(JSON.stringify(trips));
  });

  it('produces a realistic month-scale volume (30–50 trips) across the real fleet', () => {
    expect(trips.length).toBeGreaterThanOrEqual(30);
    expect(trips.length).toBeLessThanOrEqual(50);
    const tails = new Set(trips.map(t => t.aircraft));
    for (const ac of FLEET) expect(tails.has(ac.tail)).toBe(true);
  });

  it('derives readinessScore from the checklist — the two can never disagree', () => {
    for (const t of trips) {
      const ready = t.checklist.filter(i => i.status === 'ready').length;
      expect(t.readinessScore).toBe(Math.round((ready / t.checklist.length) * 100));
    }
  });

  it('attaches a blocked item carrying the critical blocker text', () => {
    const blocked = trips.filter(t => t.criticalBlocker);
    expect(blocked.length).toBeGreaterThan(0);
    for (const t of blocked) {
      expect(t.checklist.some(i => i.status === 'blocked' && i.lastComment === t.criticalBlocker)).toBe(true);
    }
  });

  it('seeds at least one same-tail date overlap so the conflict treatment is demonstrable', () => {
    const overlaps = trips.some(a => trips.some(b => {
      if (a.id === b.id || a.aircraft !== b.aircraft) return false;
      const aStart = new Date(a.departureDate).getTime();
      const aEnd = aStart + a.durationDays * 86400000;
      const bStart = new Date(b.departureDate).getTime();
      const bEnd = bStart + b.durationDays * 86400000;
      return aStart < bEnd && bStart < aEnd;
    }));
    expect(overlaps).toBe(true);
  });

  it('correlates readiness with proximity — imminent (not departed) trips are mostly worked', () => {
    const anchorMs = ANCHOR.getTime();
    const near = trips.filter(t => {
      const dep = new Date(t.departureDate).getTime();
      return dep >= anchorMs && dep - anchorMs <= 5 * 86400000 && !t.criticalBlocker;
    });
    expect(near.length).toBeGreaterThan(0);
    const avg = near.reduce((s, t) => s + t.readinessScore, 0) / near.length;
    expect(avg).toBeGreaterThanOrEqual(70);
  });

  it('gives every checklist item a non-negative due offset before departure', () => {
    for (const t of trips) for (const i of t.checklist) {
      expect(i.dueOffsetDays).toBeGreaterThanOrEqual(0);
    }
  });
});
