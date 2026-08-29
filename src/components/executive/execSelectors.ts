// Pure derivations for the Executive fleet week view — no React, no store reads.
//
// The page's spine is availability: a per-tail day grid where trip blocks show
// where each aircraft is going and the white space IS the open time (D99).
// Everything here only reshapes what it is handed so it stays unit-testable
// with a pinned clock, same discipline as leadSelectors.

import type { TripRecord } from '../../scheduling/store/types';

const DAY_MS = 86_400_000;
const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export interface FleetWeekDay {
  /** 'YYYY-MM-DD' (UTC) — stable key. */
  dateUtc: string;
  /** e.g. 'Wed 19' */
  dateLabel: string;
}

export type FleetWeekCellKind = 'trip' | 'away' | 'down' | 'no-crew' | 'open';

export interface FleetWeekCell {
  dateUtc: string;
  kind: FleetWeekCellKind;
  /**
   * 'KCVG → KTEB' on a departure day, 'away' mid-trip, the grounding headline
   * on a 'down' day (or null), null when open / no-crew.
   */
  label: string | null;
  tripId: string | null;
}

export interface FleetWeekRow {
  tail: string;
  cells: FleetWeekCell[];
}

export interface FleetWeek {
  days: FleetWeekDay[];
  rows: FleetWeekRow[];
}

function utcDayKey(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/** Trips still consuming a tail — cancelled and flown trips make no demand. */
function demandTrips(trips: TripRecord[]): TripRecord[] {
  return trips.filter(t => t.status !== 'cancelled' && t.status !== 'completed');
}

/**
 * Crews the department can field at once, until a real roster model exists.
 * The crewRecords seed is a readiness *sample* (1 PIC + 1 SIC), not the
 * pilot roster, so fleet capacity cannot honestly be derived from it — this
 * is a labeled demo constant instead. Real crew-availability integration is
 * tracked as its own ledger row.
 */
export const DEMO_CREW_CAPACITY = 4;

export interface FleetWeekOptions {
  /** Current serviceability per tail (GREEN/AMBER/RED) — a RED tail's unscheduled days read 'down'. */
  tailStatus?: Record<string, string>;
  /** The grounding headline per tail, shown on 'down' cells. */
  tailHeadline?: Record<string, string | null>;
  /** Concurrent crews the department can field; a day that commits them all has no 'open' cells. */
  crewCapacity?: number;
}

/**
 * A per-tail day grid over `days` UTC days starting today. A trip occupies its
 * tail from startDate through endDate inclusive; a day with a departing leg is
 * a 'trip' cell labeled first-departure → last-arrival for that day, a spanned
 * day with no departure is 'away'. Where two trips overlap on one tail-day the
 * earlier-starting trip keeps the cell — the grid shows occupancy, not conflict
 * (conflicts are scheduling's problem, not the executive's).
 *
 * An unoccupied tail-day is 'open' only when the plane is airworthy AND a crew
 * is free (D99, tightened 2026-08-29): a currently-RED tail reads 'down' for
 * the window (there is no estimated-return date to project against — the cell
 * clears when the serviceability projection does), and a day whose flying
 * trips already commit every crew reads 'no-crew'. Serviceability is the
 * derived projection, never a stored flag.
 */
export function buildFleetWeek(
  trips: TripRecord[],
  tails: string[],
  nowUtc: string,
  days = 14,
  options: FleetWeekOptions = {},
): FleetWeek {
  const todayStartMs = Date.parse(`${utcDayKey(Date.parse(nowUtc))}T00:00:00.000Z`);

  const dayList: FleetWeekDay[] = Array.from({ length: days }, (_, i) => {
    const date = new Date(todayStartMs + i * DAY_MS);
    return {
      dateUtc: utcDayKey(todayStartMs + i * DAY_MS),
      dateLabel: `${WEEKDAY[date.getUTCDay()]} ${date.getUTCDate()}`,
    };
  });

  const sorted = demandTrips(trips)
    .slice()
    .sort((a, b) => Date.parse(a.startDate) - Date.parse(b.startDate));

  // Crews committed per day: every demand trip whose span touches the day holds
  // its crew for the whole span (the crew is wherever the plane is) — counted
  // across ALL trips, including tails not on the roster passed in.
  const crewsByDay = new Map<string, Set<string>>();
  for (const t of sorted) {
    const startMs = Date.parse(t.startDate);
    const endMs = Date.parse(t.endDate);
    if (Number.isNaN(startMs) || Number.isNaN(endMs)) continue;
    for (let ms = Date.parse(`${utcDayKey(startMs)}T00:00:00.000Z`); ms <= endMs; ms += DAY_MS) {
      const key = utcDayKey(ms);
      let set = crewsByDay.get(key);
      if (!set) crewsByDay.set(key, (set = new Set()));
      set.add(t.id);
    }
  }
  const crewCapacity = options.crewCapacity;
  const crewExhausted = (dateUtc: string): boolean =>
    crewCapacity !== undefined && (crewsByDay.get(dateUtc)?.size ?? 0) >= crewCapacity;

  const rows: FleetWeekRow[] = tails.map(tail => {
    const cells = new Map<string, FleetWeekCell>();
    for (const t of sorted) {
      if (t.tail !== tail) continue;
      const startMs = Date.parse(t.startDate);
      const endMs = Date.parse(t.endDate);
      if (Number.isNaN(startMs) || Number.isNaN(endMs)) continue;
      for (let ms = Date.parse(`${utcDayKey(startMs)}T00:00:00.000Z`); ms <= endMs; ms += DAY_MS) {
        const key = utcDayKey(ms);
        if (cells.has(key)) continue;
        const dayLegs = t.legs
          .filter(l => utcDayKey(Date.parse(l.departureTimeUtc)) === key)
          .sort((a, b) => Date.parse(a.departureTimeUtc) - Date.parse(b.departureTimeUtc));
        cells.set(key, dayLegs.length > 0
          ? {
              dateUtc: key,
              kind: 'trip',
              label: `${dayLegs[0].departureIcao} → ${dayLegs[dayLegs.length - 1].arrivalIcao}`,
              tripId: t.id,
            }
          : { dateUtc: key, kind: 'away', label: 'away', tripId: t.id });
      }
    }
    const isDown = options.tailStatus?.[tail] === 'RED';
    const headline = options.tailHeadline?.[tail] ?? null;
    return {
      tail,
      cells: dayList.map(d => {
        const occupied = cells.get(d.dateUtc);
        if (occupied) return occupied;
        if (isDown) return { dateUtc: d.dateUtc, kind: 'down' as const, label: headline, tripId: null };
        if (crewExhausted(d.dateUtc)) return { dateUtc: d.dateUtc, kind: 'no-crew' as const, label: null, tripId: null };
        return { dateUtc: d.dateUtc, kind: 'open' as const, label: null, tripId: null };
      }),
    };
  });

  return { days: dayList, rows };
}

export interface TailDayStats {
  openTailDays: number;
  totalTailDays: number;
}

/** How much of the window is uncommitted — the executive's headline number. */
export function tailDayStats(week: FleetWeek): TailDayStats {
  let open = 0;
  let total = 0;
  for (const row of week.rows) {
    for (const cell of row.cells) {
      total += 1;
      if (cell.kind === 'open') open += 1;
    }
  }
  return { openTailDays: open, totalTailDays: total };
}

export interface OpenSlot {
  dateUtc: string;
  tail: string;
}

/**
 * The earliest open tail-day in the window — what the ask-my-EA handoff
 * pre-fills. Ties on date go to the earlier row (fleet display order).
 */
export function firstOpenSlot(week: FleetWeek): OpenSlot | null {
  for (const day of week.days) {
    for (const row of week.rows) {
      const cell = row.cells.find(c => c.dateUtc === day.dateUtc);
      if (cell?.kind === 'open') return { dateUtc: day.dateUtc, tail: row.tail };
    }
  }
  return null;
}
