// Pure math for the tail × time plan board — window paging, bar geometry, and sub-lane packing.
// All functions take explicit times; nothing reads the clock, so everything is unit-testable.

const DAY_MS = 86400000;

export type ZoomPreset = '2w' | 'month' | 'quarter';
export const ZOOM_DAYS: Record<ZoomPreset, number> = { '2w': 14, month: 31, quarter: 91 };

export interface BoardWindow {
  start: Date; // local startOfDay
  days: number;
}

/** Window anchored 3 days before the anchor's day (a little history for context), paged in whole windows. */
export function buildWindow(anchor: Date, preset: ZoomPreset, page: number): BoardWindow {
  const days = ZOOM_DAYS[preset];
  const start = new Date(anchor);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - 3 + page * days);
  return { start, days };
}

export interface DayColumn {
  date: Date;
  isWeekend: boolean;
  isToday: boolean;
}

export function dayColumns(w: BoardWindow, nowMs: number): DayColumn[] {
  const today = new Date(nowMs);
  today.setHours(0, 0, 0, 0);
  const todayMs = today.getTime();
  return Array.from({ length: w.days }, (_, i) => {
    const date = new Date(w.start);
    date.setDate(date.getDate() + i);
    const dow = date.getDay();
    return { date, isWeekend: dow === 0 || dow === 6, isToday: date.getTime() === todayMs };
  });
}

export interface BarGeometry {
  startPct: number;
  widthPct: number;
  clippedStart: boolean; // bar begins before the window — render a flat edge/chevron
  clippedEnd: boolean;
}

/** Percent-position a duration bar inside the window; null when entirely outside. */
export function barGeometry(depMs: number, durationDays: number, w: BoardWindow): BarGeometry | null {
  const wStart = w.start.getTime();
  const wEnd = wStart + w.days * DAY_MS;
  const barStart = depMs;
  const barEnd = depMs + durationDays * DAY_MS;
  if (barEnd <= wStart || barStart >= wEnd) return null;
  const visStart = Math.max(barStart, wStart);
  const visEnd = Math.min(barEnd, wEnd);
  const span = w.days * DAY_MS;
  return {
    startPct: ((visStart - wStart) / span) * 100,
    widthPct: ((visEnd - visStart) / span) * 100,
    clippedStart: barStart < wStart,
    clippedEnd: barEnd > wEnd,
  };
}

export interface LaneBar {
  id: string;
  startMs: number;
  endMs: number;
}

export interface LaneResult {
  laneOf: Map<string, number>;
  laneCount: number;
  conflictIds: Set<string>; // every bar that overlaps another on the same tail (touching ends don't count)
}

/** Greedy interval packing: each bar takes the first lane free at its start. Overlaps = conflicts. */
export function packLanes(bars: LaneBar[]): LaneResult {
  const sorted = [...bars].sort((a, b) => a.startMs - b.startMs || a.endMs - b.endMs);
  const laneEnds: number[] = [];
  const laneOf = new Map<string, number>();
  const conflictIds = new Set<string>();

  for (const bar of sorted) {
    let lane = laneEnds.findIndex(end => end <= bar.startMs);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(bar.endMs);
    } else {
      laneEnds[lane] = bar.endMs;
    }
    laneOf.set(bar.id, lane);
  }

  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      if (sorted[j].startMs >= sorted[i].endMs) break; // sorted by start — no further overlap with i
      conflictIds.add(sorted[i].id);
      conflictIds.add(sorted[j].id);
    }
  }

  return { laneOf, laneCount: Math.max(1, laneEnds.length), conflictIds };
}

/** Bar union — the board renders trips today; 'downtime' is the reserved extension point for
 *  maintenance out-of-service blocks (tech-log integration, later pass — never produced yet). */
export type BoardBar =
  | { kind: 'trip'; id: string; startMs: number; endMs: number }
  | { kind: 'downtime'; id: string; tail: string; startMs: number; endMs: number; label: string };
