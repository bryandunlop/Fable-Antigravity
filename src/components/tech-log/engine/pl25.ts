import { TZDate } from '@date-fns/tz';
import type { MelCategory, RepairIntervalUnit, Deferral, MelItem } from '../types';
import { CATEGORY_DAYS } from '../constants';

const CALENDAR_UNITS: RepairIntervalUnit[] = ['CALENDAR_DAY', 'FLIGHT_DAY'];

/** D24: the operator reference zone the PL-25 calendar-day clock is anchored to by default. */
export const DEFAULT_GOVERNING_TIMEZONE = 'America/New_York';

/**
 * D24 primitive: the UTC instant of the zone-local midnight `dayOffset` calendar days from the
 * zone-local date of `instantUtc`. DST-aware — built from wall-clock components interpreted in
 * `zone` (never fixed offsets, never host-local). NOTE: use the multi-arg TZDate constructor, NOT
 * date-fns startOfDay/addDays — in date-fns 3.6.0 those strip the TZDate zone and fall back to
 * host-local time (see [[ref-date-fns-tz-dst]]).
 */
function localMidnightUtc(instantUtc: string, dayOffset: number, zone: string): string {
  const z = TZDate.tz(zone, new Date(instantUtc));
  const mid = new TZDate(z.getFullYear(), z.getMonth(), z.getDate() + dayOffset, 0, 0, 0, 0, zone);
  return new Date(mid.getTime()).toISOString();
}

/**
 * PL-25: day of discovery excluded; clock starts at the next midnight in the governing zone
 * (default Eastern, per-deferral override — D24). DST-aware.
 */
export function computeClockStart(
  dayOfDiscoveryUtc: string,
  zone: string = DEFAULT_GOVERNING_TIMEZONE,
): string {
  return localMidnightUtc(dayOfDiscoveryUtc, 1, zone);
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
  zone: string = DEFAULT_GOVERNING_TIMEZONE,
): RepairDue {
  const unit: RepairIntervalUnit = item.repairIntervalUnit ?? 'CALENDAR_DAY';
  const value = item.repairIntervalValue ?? CATEGORY_DAYS[category] ?? 0;

  if (CALENDAR_UNITS.includes(unit)) {
    // True PL-25 (confirmed by SME/DOM 2026-06-21): day 1 is clock_start (midnight after discovery); the item
    // gets `interval` FULL calendar days and is overdue at the END of the final day.
    //   repair_due = clock_start + interval days, in the governing zone (D24 — DST-aware).
    // Worked check: Cat C discovered Jan 26 10:00 -> clock_start Jan 27 00:00 ET -> due Feb 6 00:00 ET
    // (10 full dispatchable days Jan 27..Feb 5; grounded from Feb 6 00:00 ET = 2026-02-06T05:00Z).
    // NOTE: the source spec §5.4/§15.4 worked example said "Feb 5" — that is an off-by-one; corrected to Feb 6.
    // A window crossing a DST transition (e.g. 2026-03-08) shifts the stored UTC offset accordingly.
    const repairDueDateUtc = localMidnightUtc(clockStartDateUtc, value, zone);
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
