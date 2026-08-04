import { ActionItem } from './types';
import { getCheckInCompliance, getCurrentCheckInDueDate } from './checkIn';

/**
 * Staleness, not percent-complete, is what the lead team actually needs to see.
 *
 * A project sitting at 75% that nobody has touched in 34 days renders as a
 * healthy three-quarters-full progress bar, which is exactly backwards. These
 * helpers derive the silence signal — how long since anyone reported, and
 * whether that counts as gone quiet for this project's cadence — so the Rolling
 * Action Items board can rank by risk instead of by creation order.
 *
 * Nothing here is stored: it is all derived from the check-in reports the
 * contributors already file.
 */

const MS_PER_DAY = 86_400_000;

/**
 * Intervals of silence before a project counts as quiet. One means a project
 * goes quiet the moment a whole window passes with nothing filed — which is
 * the point at which the lead team would otherwise have to notice by hand.
 */
const QUIET_AFTER_INTERVALS = 1;

const CADENCE_DAYS: Record<string, number> = {
  weekly: 7,
  biweekly: 14,
  monthly: 30,
};

const parseUtcDate = (iso: string): number | null => {
  const ms = Date.parse(`${iso.slice(0, 10)}T00:00:00Z`);
  return Number.isNaN(ms) ? null : ms;
};

const daysBetween = (fromIso: string, toIso: string): number | null => {
  const from = parseUtcDate(fromIso);
  const to = parseUtcDate(toIso);
  if (from === null || to === null) return null;
  return Math.floor((to - from) / MS_PER_DAY);
};

/** ISO date of the most recent report from anyone, or null if nobody has reported. */
export const getLastReportDate = (item: ActionItem): string | null => {
  const reports = item.checkIn?.reports ?? [];
  if (!reports.length) return null;
  return reports.reduce((latest, r) => (r.reportedOn > latest ? r.reportedOn : latest), reports[0].reportedOn);
};

/**
 * Days of silence. Counts from the last report; if nobody has ever reported it
 * counts from the project's anchor, because "never said anything since day one"
 * is the loudest silence there is.
 */
export const getDaysSinceLastReport = (item: ActionItem, today: string): number | null => {
  const from = getLastReportDate(item) ?? item.checkIn?.startedOn ?? item.assignedDate;
  if (!from) return null;
  const days = daysBetween(from, today);
  return days === null ? null : Math.max(0, days);
};

export type StallState = 'landed' | 'quiet' | 'new' | 'moving';

export const getStallState = (item: ActionItem, today: string): StallState => {
  if (item.status === 'Completed') return 'landed';

  const cadence = item.checkIn?.cadence;
  const interval = cadence ? CADENCE_DAYS[cadence] : undefined;
  const silence = getDaysSinceLastReport(item, today);

  // No cadence means nobody agreed to report on it — it cannot be "quiet".
  if (!interval || silence === null) return 'moving';

  if (silence > interval * QUIET_AFTER_INTERVALS) return 'quiet';

  // Not yet due for its first report, and nothing filed: it is simply new.
  if (!getLastReportDate(item) && !getCurrentCheckInDueDate(item, today)) return 'new';

  return 'moving';
};

/**
 * Reported progress over time, oldest first, for the sparkline. Prefixed with a
 * zero so a single report still draws a line rather than a dot.
 */
export const getProgressTrend = (item: ActionItem): number[] => {
  const reports = [...(item.checkIn?.reports ?? [])].sort((a, b) => a.reportedOn.localeCompare(b.reportedOn));
  const values = reports.map(r => r.progress);
  return values.length >= 2 ? values : [0, ...values];
};

/** True when the trend has moved at all. A flat line at 75% is stuck, not fine. */
export const isTrendFlat = (item: ActionItem): boolean => {
  const trend = getProgressTrend(item);
  return trend.every(v => v === trend[0]);
};

/**
 * Whether the check-in habit is landing at all: of everyone who owes a report
 * this cycle across every tracked project, how many have filed.
 */
export const getReportingRate = (
  items: ActionItem[],
  today: string,
): { reported: number; owed: number; rate: number } => {
  let reported = 0;
  let owed = 0;

  items.forEach(item => {
    const compliance = getCheckInCompliance(item, today);
    if (!compliance) return;
    reported += compliance.reported;
    owed += compliance.total;
  });

  return { reported, owed, rate: owed === 0 ? 0 : Math.round((reported / owed) * 100) };
};

/** Board-level summary for the header strip. */
export const getStallSummary = (items: ActionItem[], today: string) => {
  const quiet = items.filter(item => getStallState(item, today) === 'quiet');
  const longestSilence = quiet.reduce((max, item) => {
    const days = getDaysSinceLastReport(item, today) ?? 0;
    return days > max ? days : max;
  }, 0);

  return { quietCount: quiet.length, longestSilence, ...getReportingRate(items, today) };
};

/** Most silent first — the ranking the whole board hangs off. */
export const bySilenceDesc = (today: string) => (a: ActionItem, b: ActionItem) =>
  (getDaysSinceLastReport(b, today) ?? 0) - (getDaysSinceLastReport(a, today) ?? 0);

/**
 * The first contributor is the project's owner — the person a lead or a VP's
 * admin actually chases. Everyone else on the project is a contributor.
 */
export const getOwner = (item: ActionItem) => item.contributors[0] ?? null;

export type ChaseAxis = 'owner' | 'department' | 'status';

export interface ChaseGroup {
  key: string;
  label: string;
  items: ActionItem[];
  quietCount: number;
  worstSilence: number;
}

const axisKey = (item: ActionItem, axis: ChaseAxis): string => {
  if (axis === 'department') return item.department || 'Unassigned';
  if (axis === 'status') return item.status || 'Unknown';
  return getOwner(item)?.name ?? 'Unassigned';
};

/**
 * Group projects for the chase list.
 *
 * An admin holding twenty projects does not chase projects, they chase people:
 * one owner with three stalled projects is ONE conversation, and a
 * project-ranked list would make them start it three times. Groups sort by how
 * many have gone quiet, then by the worst silence in the group, so the person
 * to call first is at the top.
 */
export const groupForChase = (
  items: ActionItem[],
  today: string,
  axis: ChaseAxis = 'owner',
): ChaseGroup[] => {
  const groups = new Map<string, ActionItem[]>();

  items.forEach(item => {
    const key = axisKey(item, axis);
    const existing = groups.get(key);
    if (existing) existing.push(item);
    else groups.set(key, [item]);
  });

  return [...groups.entries()]
    .map(([key, groupItems]) => {
      const sorted = [...groupItems].sort(bySilenceDesc(today));
      const quiet = sorted.filter(item => getStallState(item, today) === 'quiet');
      return {
        key,
        label: key,
        items: sorted,
        quietCount: quiet.length,
        worstSilence: quiet.reduce((max, item) => Math.max(max, getDaysSinceLastReport(item, today) ?? 0), 0),
      };
    })
    .sort((a, b) => b.quietCount - a.quietCount || b.worstSilence - a.worstSilence || a.label.localeCompare(b.label));
};
