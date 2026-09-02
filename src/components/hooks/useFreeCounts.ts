// The React seam between the hub's month and the availability engine.
//
// Thin on purpose, like useFleetAvailability: it works out how many days the engine has
// to compute to cover the month on screen, then hands the grid to freeCount. The count
// itself is pure and tested; nothing here decides anything.

import { useMemo } from 'react';
import { readFleetAvailability } from '../../availability/source';
import { freeCountIndex, averageFreePerDay, freeCountByDay, type DayFreeCount } from '../../availability/engine/freeCount';
import { useSchedulingWorkspace } from '../scheduling-workspace/SchedulingWorkspaceContext';
import type { TripRecord } from '../../scheduling/store/types';

const DAY_MS = 86_400_000;
/** A month grid is always six weeks, and the strip looks a year and a bit ahead. */
const MAX_HORIZON_DAYS = 500;

export interface MonthFreeCounts {
  /** 'YYYY-MM-DD' → the day's count. Days outside the engine's horizon are absent. */
  byDate: Record<string, DayFreeCount>;
  /** For the month strip: what a month averages, so she can aim before she arrives. */
  average: number;
  /** True when any day in the month rests on an unpublished crew roster. */
  provisional: boolean;
}

function horizonFor(nowUtc: string, throughDateUtc: string): number {
  const from = Date.parse(`${nowUtc.slice(0, 10)}T00:00:00.000Z`);
  const to = Date.parse(`${throughDateUtc}T00:00:00.000Z`);
  if (Number.isNaN(from) || Number.isNaN(to)) return 1;
  return Math.min(MAX_HORIZON_DAYS, Math.max(1, Math.floor((to - from) / DAY_MS) + 1));
}

/**
 * Free-per-day for every month the strip offers, computed once from one grid — the month
 * on screen and the strip above it must never be able to disagree about the same week.
 */
export function useFreeCounts(
  trips: TripRecord[],
  nowUtc: string,
  months: { year: number; month: number }[],
): Record<string, MonthFreeCounts> {
  return useMemo(() => {
    if (months.length === 0) return {};
    // The last day the strip can ask about — six weeks past the final month's start covers
    // the trailing days a six-week grid borrows from the next month.
    const last = months[months.length - 1];
    const through = new Date(Date.UTC(last.year, last.month + 1, 7)).toISOString().slice(0, 10);
    const fleet = readFleetAvailability({ trips }, nowUtc, horizonFor(nowUtc, through));
    const all = freeCountByDay(fleet);
    const index = freeCountIndex(fleet);

    const out: Record<string, MonthFreeCounts> = {};
    for (const m of months) {
      const key = monthKey(m.year, m.month);
      const inMonth = all.filter(c => c.dateUtc.startsWith(key));
      out[key] = {
        byDate: index,
        average: averageFreePerDay(inMonth),
        provisional: inMonth.some(c => c.confidence === 'provisional'),
      };
    }
    return out;
  }, [trips, nowUtc, months]);
}

export const monthKey = (year: number, month: number): string =>
  `${year}-${String(month + 1).padStart(2, '0')}`;
