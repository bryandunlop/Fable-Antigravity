import { TZDate } from '@date-fns/tz';
import type { MaintenanceProject, ProjectPauseReason, ProjectStatus, TechVacation, Trip } from '../types';
import { DEFAULT_GOVERNING_TIMEZONE } from './pl25';

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
// D24 / TL-4: the month grid is anchored to the operator reference zone (Eastern), so each cell is a
// zone-local calendar day and every project/leg/vacation lands on its EASTERN day — consistent with
// the MEL clock. DST-aware via the multi-arg TZDate constructor (never fixed 24h ms). Callers pass a
// first-of-month anchor in the zone (…T04:00Z = Aug 1 00:00 EDT).
export const PLANNER_ZONE = DEFAULT_GOVERNING_TIMEZONE;

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
  iso: string;         // YYYY-MM-DD in the planner zone (Eastern)
  inMonth: boolean;
  projects: MaintenanceProject[];
  legs: PlannerLeg[];
  vacations: TechVacation[];
  campWos: PlannerCampWo[];
}

type CalendarSlice = { projects: MaintenanceProject[]; trips: Trip[]; techVacations: TechVacation[]; campWos?: PlannerCampWo[] };

/** UTC ms of the zone-local midnight `dayOffset` calendar days from the 1st of (year, monthIdx). Day
 * numbers may be <= 0 or overflow the month; TZDate normalizes them (DST-aware). */
const zoneDayMs = (year: number, monthIdx: number, dayNum: number, zone: string): number =>
  new TZDate(year, monthIdx, dayNum, 0, 0, 0, 0, zone).getTime();
const zoneIso = (instantMs: number, zone: string): string => {
  const z = TZDate.tz(zone, new Date(instantMs));
  return `${z.getFullYear()}-${String(z.getMonth() + 1).padStart(2, '0')}-${String(z.getDate()).padStart(2, '0')}`;
};
const overlapsWindow = (startUtc: string, endUtc: string, dayStartMs: number, dayEndMs: number): boolean =>
  new Date(startUtc).getTime() < dayEndMs && new Date(endUtc).getTime() >= dayStartMs;

/** Month grid of full Sunday-start weeks in the operator zone (Eastern): each day carries the projects
 * spanning it, the flight legs departing on it (myairops overlay), and the technicians off that day.
 * DST-aware — every day boundary is a real zone-local midnight, so 23h/25h transition days are exact. */
export function buildPlannerCalendar(monthAnchorUtc: string, slice: CalendarSlice, zone: string = PLANNER_ZONE): PlannerDay[][] {
  const anchor = TZDate.tz(zone, new Date(monthAnchorUtc));
  const year = anchor.getFullYear();
  const monthIdx = anchor.getMonth();
  const firstDow = new TZDate(year, monthIdx, 1, 0, 0, 0, 0, zone).getDay(); // 0=Sun, zone-local
  const nextMonthMs = zoneDayMs(year, monthIdx + 1, 1, zone);

  const legs: PlannerLeg[] = slice.trips.flatMap(t =>
    (t.legs ?? []).map(l => ({
      aircraftId: t.aircraftId,
      label: `${l.departureIcao}→${l.arrivalIcao}`,
      atUtc: l.departureTimeUtc,
      tripNumber: t.tripNumber,
    })),
  );

  const weeks: PlannerDay[][] = [];
  let dayNum = 1 - firstDow; // the Sunday on/before the 1st (zone-local day number, may be <= 0)
  while (zoneDayMs(year, monthIdx, dayNum, zone) < nextMonthMs) {
    const week: PlannerDay[] = [];
    for (let i = 0; i < 7; i++) {
      const dayStartMs = zoneDayMs(year, monthIdx, dayNum + i, zone);
      const dayEndMs = zoneDayMs(year, monthIdx, dayNum + i + 1, zone);
      const dz = TZDate.tz(zone, new Date(dayStartMs));
      week.push({
        iso: zoneIso(dayStartMs, zone),
        inMonth: dz.getMonth() === monthIdx && dz.getFullYear() === year,
        projects: slice.projects.filter(p => overlapsWindow(p.plannedStartUtc, p.plannedEndUtc, dayStartMs, dayEndMs)),
        legs: legs.filter(l => { const t = new Date(l.atUtc).getTime(); return t >= dayStartMs && t < dayEndMs; }),
        vacations: slice.techVacations.filter(v => overlapsWindow(v.startUtc, v.endUtc, dayStartMs, dayEndMs)),
        campWos: (slice.campWos ?? []).filter(w => overlapsWindow(w.startUtc, w.endUtc, dayStartMs, dayEndMs)),
      });
    }
    weeks.push(week);
    dayNum += 7;
  }
  return weeks;
}

/** ISO of the first-of-month (zone-local midnight, as a UTC instant) for the month containing
 * `instantUtc`, shifted by `monthDelta`. The planner UI uses this for init + prev/next so the whole
 * surface stays in the operator zone and agrees with the grid. */
export function plannerMonthAnchor(instantUtc: string, monthDelta = 0, zone: string = PLANNER_ZONE): string {
  const z = TZDate.tz(zone, new Date(instantUtc));
  return new Date(zoneDayMs(z.getFullYear(), z.getMonth() + monthDelta, 1, zone)).toISOString();
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
