import type { BoardTrip, BoardTask } from './adapter';

// Pure projection for the HORIZON lens — the command center's default home view (D87). One
// forward time spine keyed by WHEN THE WORK IS DUE: Today is split out of the old this-week
// window so "due in 3 hours" and "due Thursday" never share a band. Overdue tasks demote to a
// strip; trips with nothing pending band by departure as quiet rows. Supersedes
// upcomingLanesSelectors (the Upcoming surface folded into this lens). All time inputs are
// explicit (nowMs) so window edges are unit-testable.

const DAY_MS = 86400000;

export const HORIZON_WINDOWS = { thisWeekDays: 7, nextWeekDays: 14, laterDays: 30 } as const;

export type HorizonBand = 'today' | 'this-week' | 'next-week' | 'later';
export const HORIZON_BANDS: readonly HorizonBand[] = ['today', 'this-week', 'next-week', 'later'];

export interface HorizonAction {
  key: string; // TaskInstance id — the applyAction / focus key
  title: string;
  ownerRole: string;
  dueMs: number;
  dueLabel: string; // 'Due today' | 'Due in 31h' | 'Due in 4d'
}

export interface HorizonRow {
  trip: BoardTrip;
  band: HorizonBand;
  soonest?: HorizonAction; // headline action; undefined => quiet row
  countInWindow: number;   // open, due-dated actions falling inside this band's window
  quiet: boolean;          // nothing pending → banded by departure, rendered muted
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

export interface HorizonModel {
  overdue: OverdueItem[]; // oldest-overdue first
  bands: Record<HorizonBand, HorizonRow[]>; // loud (by soonest due) then quiet (by departure)
  laterByTail: { tail: string; count: number }[]; // collapsed summary of the later band
  totalTrips: number; // non-departed trips considered
}

const isOpen = (t: BoardTask) => t.status !== 'done' && t.status !== 'n_a';

function dueLabelOf(dueMs: number, nowMs: number, endOfTodayMs: number): string {
  if (dueMs <= endOfTodayMs) return 'Due today';
  const hours = Math.round((dueMs - nowMs) / 3600000);
  return hours <= 48 ? `Due in ${hours}h` : `Due in ${Math.ceil((dueMs - nowMs) / DAY_MS)}d`;
}

function overdueLabel(dueMs: number, startOfTodayMs: number): string {
  const days = Math.max(1, Math.ceil((startOfTodayMs - dueMs) / DAY_MS));
  return `Overdue ${days}d`;
}

export function buildHorizonBoard(
  trips: BoardTrip[],
  nowMs: number,
  horizonDays: number,
): HorizonModel {
  const startOfToday = new Date(nowMs);
  startOfToday.setHours(0, 0, 0, 0);
  const startOfTodayMs = startOfToday.getTime();
  const endOfTodayMs = startOfTodayMs + DAY_MS - 1;

  const thisWeekEndMs = endOfTodayMs + HORIZON_WINDOWS.thisWeekDays * DAY_MS;
  const nextWeekEndMs = endOfTodayMs + HORIZON_WINDOWS.nextWeekDays * DAY_MS;
  const laterEndMs = endOfTodayMs + Math.min(HORIZON_WINDOWS.laterDays, horizonDays) * DAY_MS;

  const bandFor = (ms: number): HorizonBand | null => {
    if (ms > laterEndMs) return null;
    if (ms <= endOfTodayMs) return 'today';
    if (ms <= thisWeekEndMs) return 'this-week';
    if (ms <= nextWeekEndMs) return 'next-week';
    return 'later';
  };
  const bandEndMs = (band: HorizonBand): number =>
    band === 'today' ? endOfTodayMs
    : band === 'this-week' ? thisWeekEndMs
    : band === 'next-week' ? nextWeekEndMs
    : laterEndMs;

  const overdueRaw: (OverdueItem & { worstMs: number })[] = [];
  const bands: Record<HorizonBand, HorizonRow[]> = { today: [], 'this-week': [], 'next-week': [], later: [] };
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
      const band = bandFor(soonest.dueMs);
      if (!band) continue; // soonest work is beyond the horizon — not on the spine yet
      const end = bandEndMs(band);
      bands[band].push({
        trip, band,
        soonest: {
          key: soonest.t.id, title: soonest.t.title, ownerRole: soonest.t.ownerRole,
          dueMs: soonest.dueMs, dueLabel: dueLabelOf(soonest.dueMs, nowMs, endOfTodayMs),
        },
        countInWindow: upcoming.filter(o => o.dueMs <= end).length,
        quiet: false,
      });
    } else if (overdue.length === 0 && depMs <= laterEndMs) {
      const band = bandFor(depMs); // nothing pending → quiet row banded by departure
      if (band) bands[band].push({ trip, band, countInWindow: 0, quiet: true });
    }
    // overdue-only trips are represented in the strip, never as a band row
  }

  overdueRaw.sort((a, b) => a.worstMs - b.worstMs || a.tripNumber.localeCompare(b.tripNumber));
  const overdueItems = overdueRaw.map(({ worstMs, ...rest }) => rest);

  for (const key of HORIZON_BANDS) {
    bands[key].sort((a, b) => {
      if (a.quiet !== b.quiet) return a.quiet ? 1 : -1;
      if (!a.quiet && !b.quiet) return a.soonest!.dueMs - b.soonest!.dueMs;
      return new Date(a.trip.departureDate).getTime() - new Date(b.trip.departureDate).getTime();
    });
  }

  const laterCounts = new Map<string, number>();
  for (const row of bands.later) {
    laterCounts.set(row.trip.aircraft, (laterCounts.get(row.trip.aircraft) ?? 0) + 1);
  }
  const laterByTail = [...laterCounts.entries()]
    .map(([tail, count]) => ({ tail, count }))
    .sort((a, b) => a.tail.localeCompare(b.tail));

  return { overdue: overdueItems, bands, laterByTail, totalTrips };
}

/** Recurring office tasks that still need doing today (open, due by end of today — overdue included). */
export function officeTasksDueToday(officeTasks: BoardTask[], nowMs: number): BoardTask[] {
  const startOfToday = new Date(nowMs);
  startOfToday.setHours(0, 0, 0, 0);
  const endOfTodayMs = startOfToday.getTime() + DAY_MS - 1;
  return officeTasks
    .filter(isOpen)
    .map(t => ({ t, dueMs: new Date(t.dueAtUtc).getTime() }))
    .filter(o => Number.isFinite(o.dueMs) && o.dueMs <= endOfTodayMs)
    .sort((a, b) => a.dueMs - b.dueMs)
    .map(o => o.t);
}
