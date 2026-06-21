import type { MelCategory, RepairIntervalUnit, Deferral, MelItem } from '../types';
import { CATEGORY_DAYS } from '../constants';

const DAY_MS = 24 * 60 * 60 * 1000;
const CALENDAR_UNITS: RepairIntervalUnit[] = ['CALENDAR_DAY', 'FLIGHT_DAY'];

/** PL-25: day of discovery excluded; clock starts at the next UTC midnight. */
export function computeClockStart(dayOfDiscoveryUtc: string): string {
  const d = new Date(dayOfDiscoveryUtc);
  const next = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1, 0, 0, 0, 0),
  );
  return next.toISOString();
}

export interface RepairDue {
  repairDueDateUtc?: string;   // calendar units
  usageDueThreshold?: number;  // usage units
  repairIntervalUnit: RepairIntervalUnit;
  repairIntervalValue: number;
}

export function computeRepairDue(
  category: MelCategory,
  clockStartDateUtc: string,
  item: Pick<MelItem, 'repairIntervalUnit' | 'repairIntervalValue'>,
  airframeAtStart: { hours: number; cycles: number },
): RepairDue {
  const unit: RepairIntervalUnit = item.repairIntervalUnit ?? 'CALENDAR_DAY';
  const value = item.repairIntervalValue ?? CATEGORY_DAYS[category] ?? 0;

  if (CALENDAR_UNITS.includes(unit)) {
    // Per the working agreement's PL-25 acceptance example (Cat C discovered Jan 26 -> due Feb 5 00:00 UTC):
    // day 1 is clock_start (midnight after discovery); the deferral is overdue from 00:00 of the interval-th day,
    // i.e. repair_due = clock_start + (interval - 1) days  (== midnight(day_of_discovery) + interval days).
    // FLAGGED: true PL-25 may instead ground at the END of the final day (Feb 6 00:00). Confirm with the DOM
    // before production; the demo follows the documented spec/acceptance example (Feb 5).
    const start = new Date(clockStartDateUtc).getTime();
    const days = value > 0 ? value - 1 : 0;
    const repairDueDateUtc = new Date(start + days * DAY_MS).toISOString();
    return { repairDueDateUtc, repairIntervalUnit: unit, repairIntervalValue: value };
  }
  // usage-based (FLIGHT / CYCLE / HOUR)
  const base = unit === 'HOUR' ? airframeAtStart.hours : airframeAtStart.cycles;
  return { usageDueThreshold: base + value, repairIntervalUnit: unit, repairIntervalValue: value };
}

export function isDeferralExpired(
  d: Pick<Deferral, 'repairIntervalUnit' | 'repairDueDateUtc' | 'usageDueThreshold'>,
  asOfUtc: string,
  airframeNow: { hours: number; cycles: number },
): boolean {
  if (d.repairDueDateUtc) {
    return new Date(asOfUtc).getTime() >= new Date(d.repairDueDateUtc).getTime();
  }
  if (d.usageDueThreshold != null) {
    const usage = d.repairIntervalUnit === 'HOUR' ? airframeNow.hours : airframeNow.cycles;
    return usage >= d.usageDueThreshold;
  }
  return false;
}
