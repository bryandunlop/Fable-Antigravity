import type { BoardTrip, BoardTask } from './adapter';

// Pure projection for the "Upcoming" view: forward triage lanes keyed by WHEN THE WORK IS DUE.
// A trip lands in the lane of its soonest open, due-dated, non-overdue task. Overdue tasks are
// demoted to a separate strip; trips with nothing pending show as quiet cards laned by departure.
// All time inputs are explicit (nowMs) so window edges are unit-testable.

const DAY_MS = 86400000;

export const UPCOMING_WINDOWS = { thisWeekDays: 7, nextWeekDays: 14, laterDays: 30 } as const;

export type UpcomingLane = 'this-week' | 'next-week' | 'later';

export interface UpcomingAction {
  key: string; // TaskInstance id — the applyAction / focus key
  title: string;
  ownerRole: string;
  dueMs: number;
  dueLabel: string; // 'Due today' | 'Due in 31h' | 'Due in 4d'
}

export interface UpcomingTrip {
  trip: BoardTrip;
  lane: UpcomingLane;
  soonest?: UpcomingAction; // headline action; undefined => quiet card
  countInWindow: number;    // open, due-dated actions falling inside this lane's window
  quiet: boolean;           // nothing pending → laned by departure, rendered muted
}

export interface OverdueItem {
  tripId: string;
  tail: string;
  route: string;
  tripNumber: string;
  actionTitle: string; // the oldest overdue action's title
  dueLabel: string;    // 'Overdue 4d'
  overdueCount: number;
}

export interface UpcomingModel {
  overdue: OverdueItem[]; // oldest-overdue first
  lanes: Record<UpcomingLane, UpcomingTrip[]>; // loud (by soonest due) then quiet (by departure)
  totalTrips: number; // non-departed trips considered
}

const isOpen = (t: BoardTask) => t.status !== 'done' && t.status !== 'n_a';

function upcomingLabel(dueMs: number, nowMs: number, endOfTodayMs: number): string {
  if (dueMs <= endOfTodayMs) return 'Due today';
  const hours = Math.round((dueMs - nowMs) / 3600000);
  return hours <= 48 ? `Due in ${hours}h` : `Due in ${Math.ceil((dueMs - nowMs) / DAY_MS)}d`;
}

function overdueLabel(dueMs: number, startOfTodayMs: number): string {
  const days = Math.max(1, Math.ceil((startOfTodayMs - dueMs) / DAY_MS));
  return `Overdue ${days}d`;
}

export function buildUpcomingBoard(
  trips: BoardTrip[],
  nowMs: number,
  horizonDays: number,
): UpcomingModel {
  const startOfToday = new Date(nowMs);
  startOfToday.setHours(0, 0, 0, 0);
  const startOfTodayMs = startOfToday.getTime();
  const endOfTodayMs = startOfTodayMs + DAY_MS - 1;

  const thisWeekEndMs = endOfTodayMs + UPCOMING_WINDOWS.thisWeekDays * DAY_MS;
  const nextWeekEndMs = endOfTodayMs + UPCOMING_WINDOWS.nextWeekDays * DAY_MS;
  const laterEndMs = endOfTodayMs + Math.min(UPCOMING_WINDOWS.laterDays, horizonDays) * DAY_MS;

  const laneFor = (dueMs: number): UpcomingLane | null => {
    if (dueMs > laterEndMs) return null;
    if (dueMs <= thisWeekEndMs) return 'this-week';
    if (dueMs <= nextWeekEndMs) return 'next-week';
    return 'later';
  };
  const laneEndMs = (lane: UpcomingLane): number =>
    lane === 'this-week' ? thisWeekEndMs : lane === 'next-week' ? nextWeekEndMs : laterEndMs;

  const overdueRaw: (OverdueItem & { worstMs: number })[] = [];
  const lanes: Record<UpcomingLane, UpcomingTrip[]> = { 'this-week': [], 'next-week': [], later: [] };
  let totalTrips = 0;

  for (const trip of trips) {
    const depMs = new Date(trip.departureDate).getTime();
    if (depMs <= nowMs) continue; // departed — its pre-departure checklist is moot (mirrors runBoard)
    totalTrips++;

    const open = trip.tasks
      .filter(isOpen)
      .map(t => ({ t, dueMs: new Date(t.dueAtUtc).getTime() }))
      .filter(o => Number.isFinite(o.dueMs));
    const overdue = open.filter(o => o.dueMs < startOfTodayMs).sort((a, b) => a.dueMs - b.dueMs);
    const upcoming = open.filter(o => o.dueMs >= startOfTodayMs).sort((a, b) => a.dueMs - b.dueMs);

    if (overdue.length) {
      const worst = overdue[0];
      overdueRaw.push({
        tripId: trip.id, tail: trip.aircraft, route: trip.route, tripNumber: trip.tripNumber,
        actionTitle: worst.t.title, dueLabel: overdueLabel(worst.dueMs, startOfTodayMs),
        overdueCount: overdue.length, worstMs: worst.dueMs,
      });
    }

    const soonest = upcoming[0];
    if (soonest) {
      const lane = laneFor(soonest.dueMs);
      if (!lane) continue; // soonest work is beyond the horizon — not upcoming yet
      const end = laneEndMs(lane);
      lanes[lane].push({
        trip, lane,
        soonest: {
          key: soonest.t.id, title: soonest.t.title, ownerRole: soonest.t.ownerRole,
          dueMs: soonest.dueMs, dueLabel: upcomingLabel(soonest.dueMs, nowMs, endOfTodayMs),
        },
        countInWindow: upcoming.filter(o => o.dueMs <= end).length,
        quiet: false,
      });
    } else if (overdue.length === 0 && depMs <= laterEndMs) {
      const lane = laneFor(depMs); // nothing pending → quiet card laned by departure
      if (lane) lanes[lane].push({ trip, lane, countInWindow: 0, quiet: true });
    }
    // overdue-only trips are represented in the strip, never as a lane card
  }

  overdueRaw.sort((a, b) => a.worstMs - b.worstMs || a.tripNumber.localeCompare(b.tripNumber));
  const overdueItems = overdueRaw.map(({ worstMs, ...rest }) => rest);

  for (const key of Object.keys(lanes) as UpcomingLane[]) {
    lanes[key].sort((a, b) => {
      if (a.quiet !== b.quiet) return a.quiet ? 1 : -1;
      if (!a.quiet && !b.quiet) return a.soonest!.dueMs - b.soonest!.dueMs;
      return new Date(a.trip.departureDate).getTime() - new Date(b.trip.departureDate).getTime();
    });
  }

  return { overdue: overdueItems, lanes, totalTrips };
}
