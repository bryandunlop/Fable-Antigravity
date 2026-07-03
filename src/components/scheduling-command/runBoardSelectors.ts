import type { BoardTrip, BoardTask } from './adapter';
import { deriveTripStatus } from './tripStatus';

// Pure selectors for the run board ("what needs me now"): cross-trip task inbox grouped by due
// horizon, on real TaskInstances (dueAtUtc from the engine's DueRule computation). Recurring
// office tasks fold into the same groups with an OFFICE tag. All time inputs are explicit (nowMs)
// so midnight/timezone edges are unit-testable.

const DAY_MS = 86400000;

export type RunGroup = 'blocked' | 'overdue' | 'due-today' | 'next-48';

export interface RunTask {
  key: string; // TaskInstance id — the applyAction key
  task: BoardTask;
  office: boolean; // recurring office task (no trip context)
  tripId?: string;
  tripNumber?: string;
  route?: string;
  tail?: string;
  client?: string;
  dueMs: number;
  dueLabel: string; // 'Overdue 2d' | 'Due today' | 'Due in 31h' | 'Due in 4d'
  group: RunGroup;
}

export interface RunBoardModel {
  groups: Record<RunGroup, RunTask[]>; // each sorted by dueMs ascending
  funnel: { blocked: number; inWork: number; ready: number; uninteracted: number; total: number }; // TRIP counts in horizon
}

const settled = (t: BoardTask) => t.status === 'done' || t.status === 'n_a';

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
 * BLOCKED always surfaces; everything else buckets by the instance's engine-computed dueAtUtc into
 * OVERDUE / DUE TODAY / upcoming-within-horizon. Settled (done/n_a) tasks and departed trips are
 * out of scope. The funnel counts trips (not tasks) departing within the horizon, by derived status.
 */
export function buildRunBoard(
  trips: BoardTrip[],
  officeTasks: BoardTask[],
  nowMs: number,
  horizonDays: number,
): RunBoardModel {
  const startOfToday = new Date(nowMs);
  startOfToday.setHours(0, 0, 0, 0);
  const startOfTodayMs = startOfToday.getTime();
  const endOfTodayMs = startOfTodayMs + DAY_MS - 1;
  const horizonEndMs = startOfTodayMs + horizonDays * DAY_MS;

  const groups: Record<RunGroup, RunTask[]> = { blocked: [], overdue: [], 'due-today': [], 'next-48': [] };
  const funnel = { blocked: 0, inWork: 0, ready: 0, uninteracted: 0, total: 0 };

  const push = (task: BoardTask, ctx: Partial<RunTask> & { office: boolean }) => {
    if (settled(task)) return;
    const dueMs = new Date(task.dueAtUtc).getTime();
    const base: Omit<RunTask, 'group'> = {
      key: task.id, task, dueMs,
      dueLabel: dueLabel(dueMs, nowMs, startOfTodayMs, endOfTodayMs),
      ...ctx,
    };
    if (task.status === 'blocked') { groups.blocked.push({ ...base, group: 'blocked' }); return; }
    if (dueMs < startOfTodayMs) groups.overdue.push({ ...base, group: 'overdue' });
    else if (dueMs <= endOfTodayMs) groups['due-today'].push({ ...base, group: 'due-today' });
    else if (dueMs <= horizonEndMs) groups['next-48'].push({ ...base, group: 'next-48' });
  };

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

    for (const task of trip.tasks) {
      push(task, {
        office: false,
        tripId: trip.id, tripNumber: trip.tripNumber, route: trip.route,
        tail: trip.aircraft, client: trip.client,
      });
    }
  }

  for (const task of officeTasks) push(task, { office: true });

  for (const g of Object.keys(groups) as RunGroup[]) groups[g].sort((a, b) => a.dueMs - b.dueMs);
  return { groups, funnel };
}

// ─── Trip clustering ───────────────────────────────────────────────────────────────────────────
// At tens of trips a month, a flat task list interleaves trips until nothing is recognizable.
// Cluster each urgency group's tasks under their trip (identity card in the UI), office tasks
// under one separate cluster, ordered by each cluster's most urgent task.

export interface RunCluster {
  office: boolean;
  tripId?: string;
  tripNumber?: string;
  route?: string;
  tail?: string;
  client?: string;
  tasks: RunTask[]; // sorted by dueMs
  earliestDueMs: number;
}

export function clusterRunTasks(tasks: RunTask[]): RunCluster[] {
  const byKey = new Map<string, RunCluster>();
  for (const t of tasks) {
    const key = t.office ? '__office__' : t.tripId ?? '__office__';
    let cluster = byKey.get(key);
    if (!cluster) {
      cluster = {
        office: t.office, tripId: t.tripId, tripNumber: t.tripNumber,
        route: t.route, tail: t.tail, client: t.client,
        tasks: [], earliestDueMs: t.dueMs,
      };
      byKey.set(key, cluster);
    }
    cluster.tasks.push(t);
    cluster.earliestDueMs = Math.min(cluster.earliestDueMs, t.dueMs);
  }
  const clusters = [...byKey.values()];
  for (const c of clusters) c.tasks.sort((a, b) => a.dueMs - b.dueMs);
  // Trips first (most urgent first); the office cluster always last.
  return clusters.sort((a, b) =>
    a.office === b.office ? a.earliestDueMs - b.earliestDueMs : a.office ? 1 : -1);
}
