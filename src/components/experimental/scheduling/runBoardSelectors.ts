import type { MockTripData, MockChecklistItem } from '../mockData';
import { deriveTripStatus } from './tripStatus';

// Pure selectors for the run board ("what needs me now"): cross-trip task inbox grouped by due
// horizon. All time inputs are explicit (nowMs) so midnight/timezone edges are unit-testable.

const DAY_MS = 86400000;

export type RunGroup = 'blocked' | 'overdue' | 'due-today' | 'next-48';

export interface RunTask {
  key: string; // `${tripNumber}:${item.id}` — stable across rebuilds for override maps
  item: MockChecklistItem;
  tripNumber: string;
  route: string;
  tail: string;
  client: string;
  dueMs: number;
  dueLabel: string; // 'Overdue 2d' | 'Due today' | 'Due in 31h' | 'Due in 4d'
  group: RunGroup;
}

export interface RunBoardModel {
  groups: Record<RunGroup, RunTask[]>; // each sorted by dueMs ascending
  funnel: { blocked: number; inWork: number; ready: number; uninteracted: number; total: number }; // TRIP counts in horizon
}

function dueLabel(dueMs: number, nowMs: number, startOfTodayMs: number, endOfTodayMs: number): string {
  if (dueMs < startOfTodayMs) {
    const days = Math.max(1, Math.ceil((startOfTodayMs - dueMs) / DAY_MS));
    return `Overdue ${days}d`;
  }
  if (dueMs <= endOfTodayMs) return 'Due today';
  const hours = Math.round((dueMs - nowMs) / 3600000);
  return hours <= 48 ? `Due in ${hours}h` : `Due in ${Math.ceil((dueMs - nowMs) / DAY_MS)}d`;
}

/**
 * Build the run-board model: BLOCKED always surfaces; everything else buckets by due date
 * (departure − dueOffsetDays) into OVERDUE / DUE TODAY / upcoming-within-horizon. Ready items and
 * already-departed trips are out of scope. The funnel counts trips (not items) departing within
 * the horizon, bucketed by derived trip status.
 */
export function buildRunBoard(trips: MockTripData[], nowMs: number, horizonDays: number): RunBoardModel {
  const startOfToday = new Date(nowMs);
  startOfToday.setHours(0, 0, 0, 0);
  const startOfTodayMs = startOfToday.getTime();
  const endOfTodayMs = startOfTodayMs + DAY_MS - 1;
  const horizonEndMs = startOfTodayMs + horizonDays * DAY_MS;

  const groups: Record<RunGroup, RunTask[]> = { blocked: [], overdue: [], 'due-today': [], 'next-48': [] };
  const funnel = { blocked: 0, inWork: 0, ready: 0, uninteracted: 0, total: 0 };

  for (const trip of trips) {
    const depMs = new Date(trip.departureDate).getTime();
    if (depMs <= nowMs) continue; // departed — its pre-departure checklist is moot

    if (depMs <= horizonEndMs) {
      funnel.total++;
      const status = deriveTripStatus(trip, nowMs);
      if (status === 'blocked') funnel.blocked++;
      else if (status === 'ready' || status === 'airborne') funnel.ready++;
      else if (status === 'uninteracted') funnel.uninteracted++;
      else funnel.inWork++;
    }

    for (const item of trip.checklist) {
      if (item.status === 'ready') continue;
      const dueMs = depMs - item.dueOffsetDays * DAY_MS;
      const base: Omit<RunTask, 'group'> = {
        key: `${trip.tripNumber}:${item.id}`,
        item,
        tripNumber: trip.tripNumber,
        route: trip.route,
        tail: trip.aircraft,
        client: trip.client,
        dueMs,
        dueLabel: dueLabel(dueMs, nowMs, startOfTodayMs, endOfTodayMs),
      };
      if (item.status === 'blocked') { groups.blocked.push({ ...base, group: 'blocked' }); continue; }
      if (dueMs < startOfTodayMs) groups.overdue.push({ ...base, group: 'overdue' });
      else if (dueMs <= endOfTodayMs) groups['due-today'].push({ ...base, group: 'due-today' });
      else if (dueMs <= horizonEndMs) groups['next-48'].push({ ...base, group: 'next-48' });
    }
  }

  for (const g of Object.keys(groups) as RunGroup[]) groups[g].sort((a, b) => a.dueMs - b.dueMs);
  return { groups, funnel };
}
