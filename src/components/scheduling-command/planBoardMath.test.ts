import { describe, it, expect } from 'vitest';
import { buildWindow, dayColumns, barGeometry, packLanes, ZOOM_DAYS } from './planBoardMath';

const DAY = 86400000;
const ANCHOR = new Date('2026-07-03T15:30:00Z'); // mid-day — window math must floor to local startOfDay

describe('buildWindow', () => {
  it('starts 3 days before the anchor day and spans the preset length', () => {
    const w = buildWindow(ANCHOR, 'month', 0);
    expect(w.days).toBe(ZOOM_DAYS.month);
    const expected = new Date(ANCHOR);
    expected.setHours(0, 0, 0, 0);
    expected.setDate(expected.getDate() - 3);
    expect(w.start.getTime()).toBe(expected.getTime());
  });

  it('pages by whole windows in both directions', () => {
    const w0 = buildWindow(ANCHOR, '2w', 0);
    const w1 = buildWindow(ANCHOR, '2w', 1);
    const wBack = buildWindow(ANCHOR, '2w', -1);
    expect(w1.start.getTime() - w0.start.getTime()).toBe(ZOOM_DAYS['2w'] * DAY);
    expect(w0.start.getTime() - wBack.start.getTime()).toBe(ZOOM_DAYS['2w'] * DAY);
  });
});

describe('dayColumns', () => {
  it('emits one column per day with weekend and today flags', () => {
    const w = buildWindow(ANCHOR, '2w', 0);
    const cols = dayColumns(w, ANCHOR.getTime());
    expect(cols).toHaveLength(14);
    expect(cols.filter(c => c.isToday)).toHaveLength(1);
    for (const c of cols) {
      expect(c.isWeekend).toBe(c.date.getDay() === 0 || c.date.getDay() === 6);
    }
  });
});

describe('barGeometry', () => {
  const w = { start: new Date('2026-07-01T00:00:00'), days: 10 };
  const ms = (d: string) => new Date(d).getTime();

  it('positions a fully-inside bar proportionally', () => {
    const g = barGeometry(ms('2026-07-03T00:00:00'), 2, w)!;
    expect(g.startPct).toBeCloseTo(20);
    expect(g.widthPct).toBeCloseTo(20);
    expect(g.clippedStart).toBe(false);
    expect(g.clippedEnd).toBe(false);
  });

  it('clips a bar straddling the window start', () => {
    const g = barGeometry(ms('2026-06-29T00:00:00'), 4, w)!;
    expect(g.startPct).toBe(0);
    expect(g.clippedStart).toBe(true);
    expect(g.widthPct).toBeCloseTo(20); // 2 of 4 days visible
  });

  it('clips a bar running past the window end', () => {
    const g = barGeometry(ms('2026-07-09T00:00:00'), 5, w)!;
    expect(g.clippedEnd).toBe(true);
    expect(g.startPct + g.widthPct).toBeCloseTo(100);
  });

  it('returns null for a bar entirely outside the window', () => {
    expect(barGeometry(ms('2026-07-20T00:00:00'), 2, w)).toBeNull();
    expect(barGeometry(ms('2026-06-20T00:00:00'), 2, w)).toBeNull();
  });
});

describe('packLanes', () => {
  const bar = (id: string, startDay: number, endDay: number) =>
    ({ id, startMs: startDay * DAY, endMs: endDay * DAY });

  it('non-overlapping bars share one lane with no conflicts', () => {
    const r = packLanes([bar('a', 0, 2), bar('b', 3, 5)]);
    expect(r.laneCount).toBe(1);
    expect(r.conflictIds.size).toBe(0);
  });

  it('two overlapping bars stack into two lanes and both flag as conflicts', () => {
    const r = packLanes([bar('a', 0, 3), bar('b', 2, 5)]);
    expect(r.laneCount).toBe(2);
    expect(r.laneOf.get('a')).not.toBe(r.laneOf.get('b'));
    expect(r.conflictIds).toEqual(new Set(['a', 'b']));
  });

  it('touching endpoints (back-to-back turnaround) is NOT a conflict', () => {
    const r = packLanes([bar('a', 0, 2), bar('b', 2, 4)]);
    expect(r.laneCount).toBe(1);
    expect(r.conflictIds.size).toBe(0);
  });

  it('a three-way chain packs greedily and flags every overlapping bar', () => {
    const r = packLanes([bar('a', 0, 4), bar('b', 1, 3), bar('c', 3, 6)]);
    expect(r.laneCount).toBe(2);
    expect(r.conflictIds).toEqual(new Set(['a', 'b', 'c']));
  });
});
