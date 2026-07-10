import type { MaintenanceProject, ProjectPauseReason, ProjectStatus, TechVacation, Trip } from '../types';

/** D28 project lifecycle: planning → in work ⇄ paused → closed (closed also directly from
 * planning = package cancelled/absorbed). CLOSED is terminal. */
const ALLOWED: Record<ProjectStatus, ProjectStatus[]> = {
  PLANNING: ['IN_WORK', 'CLOSED'],
  IN_WORK: ['PAUSED', 'CLOSED'],
  PAUSED: ['IN_WORK', 'CLOSED'],
  CLOSED: [],
};

export type TransitionResult = { ok: true; project: MaintenanceProject } | { ok: false; error: string };

export function transitionProject(
  p: MaintenanceProject,
  to: ProjectStatus,
  byOid: string,
  nowUtc: string,
  opts: { pauseReason?: ProjectPauseReason; note?: string; openLinkedCards?: number } = {},
): TransitionResult {
  if (!ALLOWED[p.status].includes(to)) {
    return { ok: false, error: `A ${p.status.toLowerCase().replace('_', ' ')} project cannot move to ${to.toLowerCase().replace('_', ' ')}.` };
  }
  if (to === 'PAUSED') {
    if (!opts.pauseReason) return { ok: false, error: 'Pausing needs a reason (waiting on parts / hangar / vendor / aircraft away).' };
    if (opts.pauseReason === 'WAITING_PARTS' && !opts.note?.trim()) {
      return { ok: false, error: 'Waiting-on-parts (POO) needs a note — what part, ordered from whom.' };
    }
  }
  if (to === 'CLOSED' && (opts.openLinkedCards ?? 0) > 0) {
    return { ok: false, error: `Cannot close — ${opts.openLinkedCards} linked open work card(s) remain.` };
  }
  return {
    ok: true,
    project: {
      ...p,
      status: to,
      pauseReason: to === 'PAUSED' ? opts.pauseReason : undefined,
      pauseNote: to === 'PAUSED' ? opts.note?.trim() || undefined : undefined,
      closedAtUtc: to === 'CLOSED' ? nowUtc : p.closedAtUtc,
      statusHistory: [...p.statusHistory, { status: to, atUtc: nowUtc, byOid, note: opts.note?.trim() || undefined }],
    },
  };
}

/** Readiness = every prep item done ("aircraft comes home, ready to execute"). Empty prep is
 * NOT ready — readiness must be earned, never true by absence. */
export function prepReadiness(p: MaintenanceProject): { done: number; total: number; ready: boolean } {
  const done = p.prepItems.filter(i => i.done).length;
  const total = p.prepItems.length;
  return { done, total, ready: total > 0 && done === total };
}

// ── Planning calendar ─────────────────────────────────────────────────────────
// UTC day boundaries, matching the demo's existing pl25 behavior. The D24 IANA-timezone pass
// (TL-2) will move both together.

export interface PlannerLeg { aircraftId: string; label: string; atUtc: string; tripNumber: string; }
/** A mirrored CAMP work order's scheduled window (WRK header: in/out, ICAO, service center). */
export interface PlannerCampWo {
  woNumber: string;
  aircraftId: string;
  title: string;
  startUtc: string;
  endUtc: string;
  icao?: string;
  serviceCenter?: string;
}
export interface PlannerDay {
  iso: string;         // YYYY-MM-DD (UTC)
  inMonth: boolean;
  projects: MaintenanceProject[];
  legs: PlannerLeg[];
  vacations: TechVacation[];
  campWos: PlannerCampWo[];
}

const DAY_MS = 86400000;
const dayStartMs = (iso: string) => new Date(`${iso}T00:00:00.000Z`).getTime();
const isoOf = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const overlapsDay = (startUtc: string, endUtc: string, dayMs: number) =>
  new Date(startUtc).getTime() < dayMs + DAY_MS && new Date(endUtc).getTime() >= dayMs;

type CalendarSlice = { projects: MaintenanceProject[]; trips: Trip[]; techVacations: TechVacation[]; campWos?: PlannerCampWo[] };

/** Month grid of full Sunday-start weeks: each day carries the projects spanning it, the flight
 * legs departing on it (myairops overlay), and the technicians off that day (vacation overlay). */
export function buildPlannerCalendar(monthAnchorUtc: string, slice: CalendarSlice): PlannerDay[][] {
  const anchor = new Date(monthAnchorUtc);
  const first = Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), 1);
  const nextMonth = Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + 1, 1);
  const gridStart = first - new Date(first).getUTCDay() * DAY_MS;
  const gridEndExclusive = nextMonth + ((7 - new Date(nextMonth).getUTCDay()) % 7) * DAY_MS;

  const legs: PlannerLeg[] = slice.trips.flatMap(t =>
    (t.legs ?? []).map(l => ({
      aircraftId: t.aircraftId,
      label: `${l.departureIcao}→${l.arrivalIcao}`,
      atUtc: l.departureTimeUtc,
      tripNumber: t.tripNumber,
    })),
  );

  const weeks: PlannerDay[][] = [];
  for (let ws = gridStart; ws < gridEndExclusive; ws += 7 * DAY_MS) {
    const week: PlannerDay[] = [];
    for (let i = 0; i < 7; i++) {
      const dayMs = ws + i * DAY_MS;
      const iso = isoOf(dayMs);
      week.push({
        iso,
        inMonth: dayMs >= first && dayMs < nextMonth,
        projects: slice.projects.filter(p => overlapsDay(p.plannedStartUtc, p.plannedEndUtc, dayMs)),
        legs: legs.filter(l => dayStartMs(l.atUtc.slice(0, 10)) === dayMs),
        vacations: slice.techVacations.filter(v => overlapsDay(v.startUtc, v.endUtc, dayMs)),
        campWos: (slice.campWos ?? []).filter(w => overlapsDay(w.startUtc, w.endUtc, dayMs)),
      });
    }
    weeks.push(week);
  }
  return weeks;
}

/** Flight legs of the project's own tail inside its planned window — the aircraft is scheduled to
 * be AWAY while the work is planned. Surfaced as a planning warning, never a hard block. */
export function aircraftAwayConflicts(p: MaintenanceProject, trips: Trip[]): PlannerLeg[] {
  const start = new Date(p.plannedStartUtc).getTime();
  const end = new Date(p.plannedEndUtc).getTime();
  return trips
    .filter(t => t.aircraftId === p.aircraftId)
    .flatMap(t => (t.legs ?? []).map(l => ({
      aircraftId: t.aircraftId, label: `${l.departureIcao}→${l.arrivalIcao}`, atUtc: l.departureTimeUtc, tripNumber: t.tripNumber,
    })))
    .filter(l => { const ms = new Date(l.atUtc).getTime(); return ms >= start && ms <= end; });
}
