import { ActionItem, CheckInCadence } from './types';

/**
 * Scheduled status collection for lead-team projects.
 *
 * A project with a cadence generates a check-in window on a fixed rhythm from
 * its anchor date. Each contributor owes one report per window; anyone who has
 * not filed one is "outstanding", which is what turns into a task on their own
 * Tasks & Action Items list. Leads never have to chase — the ask schedules
 * itself and the absence is visible.
 *
 * All arithmetic is UTC day-based so a check-in never slips a window because
 * of the viewer's timezone.
 */

const CADENCE_DAYS: Record<Exclude<CheckInCadence, 'none'>, number> = {
  weekly: 7,
  biweekly: 14,
  monthly: 30,
};

const MS_PER_DAY = 86_400_000;

/** Parse a YYYY-MM-DD date as UTC midnight. Returns NaN-safe null on garbage. */
const parseUtcDate = (iso: string): number | null => {
  const ms = Date.parse(`${iso.slice(0, 10)}T00:00:00Z`);
  return Number.isNaN(ms) ? null : ms;
};

export const toIsoDate = (ms: number): string =>
  new Date(ms).toISOString().slice(0, 10);

/**
 * The most recent check-in date that has come due on or before `today`.
 * Returns null when the project has no cadence, has no usable anchor, or has
 * not yet reached its first window.
 */
/**
 * Add whole calendar months, clamping to the end of a short month so the 31st
 * lands on the 30th (or the 28th) rather than spilling into the next month.
 */
const addCalendarMonths = (iso: string, months: number): string => {
  const [year, month, day] = iso.slice(0, 10).split('-').map(Number);
  const target = new Date(Date.UTC(year, month - 1 + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(day, lastDay));
  return toIsoDate(target.getTime());
};

export const getCurrentCheckInDueDate = (
  item: ActionItem,
  today: string,
): string | null => {
  const cadence = item.checkIn?.cadence;
  if (!cadence || cadence === 'none') return null;

  const anchorIso = item.checkIn?.startedOn || item.assignedDate;
  const anchor = anchorIso ? parseUtcDate(anchorIso) : null;
  const now = parseUtcDate(today);
  if (anchor === null || now === null) return null;

  // Monthly means a calendar month, not 30 days — otherwise a project that
  // reports on the 1st drifts backwards through the month until it is due
  // twice in a January and never in a February.
  if (cadence === 'monthly') {
    let months = 0;
    let due: string | null = null;
    for (;;) {
      const candidate = addCalendarMonths(anchorIso!, months + 1);
      const candidateMs = parseUtcDate(candidate);
      if (candidateMs === null || candidateMs > now) break;
      due = candidate;
      months += 1;
      if (months > 600) break; // a half-century of windows is a data error, not a project
    }
    return due;
  }

  const interval = CADENCE_DAYS[cadence];
  const elapsedDays = Math.floor((now - anchor) / MS_PER_DAY);
  // The first window falls one full interval after the anchor — a project is
  // not overdue for a status report on the day it is created.
  if (elapsedDays < interval) return null;

  const windows = Math.floor(elapsedDays / interval);
  return toIsoDate(anchor + windows * interval * MS_PER_DAY);
};

/**
 * Contributors who owe a report for the current window, plus the window date.
 * An empty `contributors` array means everyone has reported.
 */
export const getOutstandingCheckIns = (
  item: ActionItem,
  today: string,
): { dueOn: string; contributors: ActionItem['contributors'] } | null => {
  const dueOn = getCurrentCheckInDueDate(item, today);
  if (!dueOn) return null;

  const reported = new Set(
    (item.checkIn?.reports ?? [])
      .filter(r => r.dueOn === dueOn)
      .map(r => r.contributorId),
  );

  return {
    dueOn,
    contributors: item.contributors.filter(c => !reported.has(c.id)),
  };
};

/** Reporting compliance for the current window, for the lead-team view. */
export const getCheckInCompliance = (
  item: ActionItem,
  today: string,
): { dueOn: string; reported: number; total: number } | null => {
  const outstanding = getOutstandingCheckIns(item, today);
  if (!outstanding) return null;
  const total = item.contributors.length;
  return {
    dueOn: outstanding.dueOn,
    reported: total - outstanding.contributors.length,
    total,
  };
};
