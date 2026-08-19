import type { BoardTrip } from './adapter';
import { deriveTripStatus, type TripDerivedStatus } from './tripStatus';

// Pure projection for the read-only SCHEDULING WALL (D87) — the TV in the ops area. Nobody works
// from the wall, so unlike the Horizon (which keys on when work is due), it may rank by urgency:
// what would the room want to know walking past. Serviceability collisions are rendered by the
// component from the alert groups; this selector covers what derives from trips alone.

const DAY_MS = 86400000;

export interface WallDeparture {
  trip: BoardTrip;
  status: TripDerivedStatus;
}

export interface WallAttentionRow {
  kind: 'blocked' | 'overdue';
  tripId: string;
  title: string;  // 'Overflight permit denied — KIAD → LFPB'
  detail: string; // 'N1PG · T-2026-0921 · departs Aug 22'
}

export interface WallModel {
  departingNext: WallDeparture[]; // soonest departure first, capped
  attention: WallAttentionRow[];  // blocked (soonest departure first), then overdue (worst first)
  quietCount: number; // non-departed trips with nothing blocked, overdue, or due today
  totalTrips: number; // non-departed trips
}

const isOpen = (s: string) => s !== 'done' && s !== 'n_a';
const fmtDay = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

export function buildWallModel(trips: BoardTrip[], nowMs: number, departureCap = 4): WallModel {
  const startOfToday = new Date(nowMs);
  startOfToday.setHours(0, 0, 0, 0);
  const startOfTodayMs = startOfToday.getTime();
  const endOfTodayMs = startOfTodayMs + DAY_MS - 1;

  const future = trips
    .map(t => ({ t, depMs: new Date(t.departureDate).getTime() }))
    .filter(x => x.depMs > nowMs)
    .sort((a, b) => a.depMs - b.depMs);

  const departingNext = future.slice(0, departureCap).map(({ t }) => ({ trip: t, status: deriveTripStatus(t, nowMs) }));

  const blocked: (WallAttentionRow & { sortMs: number })[] = [];
  const overdue: (WallAttentionRow & { sortMs: number })[] = [];
  let quietCount = 0;

  for (const { t, depMs } of future) {
    const openDue = t.tasks
      .filter(x => isOpen(x.status))
      .map(x => ({ x, dueMs: new Date(x.dueAtUtc).getTime() }))
      .filter(o => Number.isFinite(o.dueMs));
    const worstOverdue = openDue.filter(o => o.dueMs < startOfTodayMs).sort((a, b) => a.dueMs - b.dueMs)[0];
    const dueToday = openDue.some(o => o.dueMs >= startOfTodayMs && o.dueMs <= endOfTodayMs);

    if (t.criticalBlocker) {
      blocked.push({
        kind: 'blocked', tripId: t.id, sortMs: depMs,
        title: `${t.criticalBlocker} — ${t.route}`,
        detail: `${t.aircraft} · ${t.tripNumber} · departs ${fmtDay(t.departureDate)}`,
      });
    }
    if (worstOverdue) {
      const days = Math.max(1, Math.ceil((startOfTodayMs - worstOverdue.dueMs) / DAY_MS));
      overdue.push({
        kind: 'overdue', tripId: t.id, sortMs: worstOverdue.dueMs,
        title: `${worstOverdue.x.title} · ${days}d overdue — ${t.route}`,
        detail: `${t.aircraft} · ${t.tripNumber} · departs ${fmtDay(t.departureDate)}`,
      });
    }
    if (!t.criticalBlocker && !worstOverdue && !dueToday) quietCount++;
  }

  blocked.sort((a, b) => a.sortMs - b.sortMs);
  overdue.sort((a, b) => a.sortMs - b.sortMs);
  const attention = [...blocked, ...overdue].map(({ sortMs: _s, ...rest }) => rest);

  return { departingNext, attention, quietCount, totalTrips: future.length };
}
