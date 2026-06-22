import type { TechLogState } from '../types';
import { currentRows } from './supersede';

const DAY_MS = 86400000;
const round1 = (n: number) => Math.round(n * 10) / 10;

type Slice = Pick<TechLogState, 'defects' | 'deferrals' | 'flightLogs' | 'partUsages' | 'aircraft'>;

/** Defect count by ATA chapter (one per defect chain — current rows). */
export function defectsByAta(state: Pick<TechLogState, 'defects'>): { ata: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const d of currentRows(state.defects)) counts.set(d.ataChapter, (counts.get(d.ataChapter) ?? 0) + 1);
  return [...counts.entries()].map(([ata, count]) => ({ ata, count })).sort((a, b) => b.count - a.count);
}

/** Dispatch reliability — % of departures without a maintenance-caused (technical) delay. */
export function dispatchReliability(state: Pick<TechLogState, 'flightLogs'>): {
  total: number; techDelayed: number; reliabilityPct: number;
} {
  const flights = currentRows(state.flightLogs);
  const total = flights.length;
  const techDelayed = flights.filter(f => !!f.delayAtaChapter).length;
  const reliabilityPct = total === 0 ? 100 : round1(100 * (1 - techDelayed / total));
  return { total, techDelayed, reliabilityPct };
}

/** Open-deferral aging into buckets (days since discovery). */
export function deferralAging(state: Pick<TechLogState, 'deferrals'>, nowUtc: string): { bucket: string; count: number }[] {
  const now = new Date(nowUtc).getTime();
  const buckets = [
    { bucket: '0–3 d', max: 3, count: 0 },
    { bucket: '4–10 d', max: 10, count: 0 },
    { bucket: '11–30 d', max: 30, count: 0 },
    { bucket: '30+ d', max: Infinity, count: 0 },
  ];
  for (const d of currentRows(state.deferrals).filter(x => x.status !== 'CLEARED')) {
    const days = (now - new Date(d.dayOfDiscoveryUtc).getTime()) / DAY_MS;
    (buckets.find(b => days <= b.max) ?? buckets[buckets.length - 1]).count++;
  }
  return buckets.map(({ bucket, count }) => ({ bucket, count }));
}

/** AOG events from airworthiness-affecting defect chains, with downtime to clear (or ongoing). */
export function aogStats(state: Pick<TechLogState, 'defects'>, nowUtc: string): {
  events: number; ongoing: number; totalDowntimeH: number; avgDowntimeH: number;
} {
  const now = new Date(nowUtc).getTime();
  const affecting = currentRows(state.defects).filter(d => d.airworthinessAffecting === true || d.airworthinessAffecting === null);
  let totalH = 0;
  let ongoing = 0;
  for (const d of affecting) {
    const start = new Date(d.reportedAtUtc).getTime();
    const end = d.clearedTsUtc ? new Date(d.clearedTsUtc).getTime() : now;
    if (!d.clearedTsUtc) ongoing++;
    totalH += Math.max(0, (end - start) / 3600000);
  }
  const events = affecting.length;
  return { events, ongoing, totalDowntimeH: round1(totalH), avgDowntimeH: events ? round1(totalH / events) : 0 };
}

/**
 * MTBUR — mean flight hours between unscheduled removals, fleet-wide and per part number.
 * Fleet hours / unscheduled removals (a component-level approximation over the available ledger).
 */
export function mtbur(state: Slice): {
  fleetHours: number; removals: number; mtburOverall: number | null;
  byPart: { partNumber: string; removals: number; mtbur: number | null }[];
} {
  const fleetHours = round1(currentRows(state.flightLogs).reduce((s, f) => s + f.flightTime, 0));
  const unsched = state.partUsages.filter(p => p.removedPartNumber && /unsched/i.test(p.removedReason ?? ''));
  const removals = unsched.length;
  const byPartMap = new Map<string, number>();
  for (const p of unsched) byPartMap.set(p.removedPartNumber!, (byPartMap.get(p.removedPartNumber!) ?? 0) + 1);
  const byPart = [...byPartMap.entries()].map(([partNumber, n]) => ({
    partNumber, removals: n, mtbur: n ? round1(fleetHours / n) : null,
  })).sort((a, b) => b.removals - a.removals);
  return { fleetHours, removals, mtburOverall: removals ? round1(fleetHours / removals) : null, byPart };
}
