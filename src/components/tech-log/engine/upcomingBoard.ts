import type { TechLogState, WorkCard } from '../types';
import type { CampForecastItem } from '../integration/campClient';
import { currentRows } from './supersede';
import { isDeferralExpired } from './pl25';
import { projectCheck } from './recurringChecks';

const DAY_MS = 86400000;
const HORIZON_DAYS = 90;            // CAMP's own 3-month projection cap
const USAGE_ESCALATION_HOURS = 40;  // same rule as the forecast amber highlight

export type DueBucket = 'OVERDUE' | 'DUE_7D' | 'DUE_30D' | 'HORIZON';
export type UpcomingKind = 'CAMP_FORECAST' | 'DEFERRAL' | 'RECURRING_CHECK';

export interface UpcomingItem {
  key: string;                // `${aircraftId}:${kind}:${refId}` — stable row key
  aircraftId: string;
  tailNumber: string;
  kind: UpcomingKind;
  refId: string;              // forecast ref | deferral id | check id
  title: string;
  ataChapter?: string;
  category?: string;          // AD / SB / INSPECTION / COMPONENT / MEL C / CHECK
  bucket: DueBucket;
  dueDateUtc?: string;
  dueInDays?: number;         // negative when overdue; undefined for pure-usage clocks
  dueHoursRemaining?: number; // usage-clocked items (airframe hours)
  grounding: boolean;         // expired deferral / expired or never-done check
  workCardId?: string;        // open card already covering this item
  workCardNumber?: string;
  linkedDeferralId?: string;  // deferral rows deep-link to the aircraft deferrals tab
}

export interface UpcomingBoard {
  perAircraft: { aircraftId: string; tailNumber: string; counts: Record<DueBucket, number>; total: number }[];
  buckets: Record<DueBucket, UpcomingItem[]>;
  totals: Record<DueBucket, number>;
}

export const BUCKET_ORDER: DueBucket[] = ['OVERDUE', 'DUE_7D', 'DUE_30D', 'HORIZON'];

type Slice = Pick<
  TechLogState,
  'aircraft' | 'defects' | 'deferrals' | 'workCards' | 'recurringChecks' | 'recurringAccomplishments'
>;

const bucketOf = (dueInDays: number): DueBucket =>
  dueInDays < 0 ? 'OVERDUE' : dueInDays <= 7 ? 'DUE_7D' : dueInDays <= 30 ? 'DUE_30D' : 'HORIZON';

/** One board from the three due sources: CAMP due list, MEL repair clocks, recurring checks.
 * All derived — reuses pl25 / recurringChecks / supersede math; nothing re-derived, nothing stored. */
export function buildUpcomingBoard(
  state: Slice,
  forecastByAircraft: Record<string, CampForecastItem[]>,
  asOfUtc: string,
): UpcomingBoard {
  const nowMs = new Date(asOfUtc).getTime();
  const daysUntil = (iso: string) => Math.floor((new Date(iso).getTime() - nowMs) / DAY_MS);
  const items: UpcomingItem[] = [];

  const openCards = state.workCards.filter(w => w.status !== 'COMPLETED');
  const defects = currentRows(state.defects);

  for (const ac of state.aircraft) {
    const airframe = { hours: ac.airframeTotalHours, cycles: ac.airframeTotalCycles };

    // ── CAMP due list (read-view) ──
    for (const f of forecastByAircraft[ac.id] ?? []) {
      if (!f.dueDateUtc) continue;
      const dueInDays = daysUntil(f.dueDateUtc);
      if (dueInDays > HORIZON_DAYS) continue;
      const dueHoursRemaining = f.dueHours != null ? Math.round((f.dueHours - airframe.hours) * 10) / 10 : undefined;
      let bucket = bucketOf(dueInDays);
      if (bucket !== 'OVERDUE' && dueHoursRemaining != null && dueHoursRemaining <= USAGE_ESCALATION_HOURS) {
        bucket = 'DUE_7D'; // hour clock will beat the calendar — escalate
      }
      const card = openCards.find(w => w.aircraftId === ac.id && w.forecastRef === f.ref);
      items.push({
        key: `${ac.id}:CAMP_FORECAST:${f.ref}`, aircraftId: ac.id, tailNumber: ac.tailNumber,
        kind: 'CAMP_FORECAST', refId: f.ref, title: f.description, ataChapter: f.ata, category: f.category,
        bucket, dueDateUtc: f.dueDateUtc, dueInDays, dueHoursRemaining, grounding: false,
        workCardId: card?.id, workCardNumber: card?.cardNumber,
      });
    }

    // ── ACTIVE MEL deferral repair clocks ──
    for (const d of currentRows(state.deferrals).filter(x => x.aircraftId === ac.id && x.status === 'ACTIVE')) {
      const expired = isDeferralExpired(d, asOfUtc, airframe);
      const dueInDays = d.repairDueDateUtc ? daysUntil(d.repairDueDateUtc) : undefined;
      const dueHoursRemaining =
        d.usageDueThreshold != null && d.repairIntervalUnit === 'HOUR'
          ? Math.round((d.usageDueThreshold - airframe.hours) * 10) / 10
          : undefined;
      const bucket: DueBucket = expired
        ? 'OVERDUE'
        : dueInDays != null
          ? bucketOf(dueInDays)
          : dueHoursRemaining != null && dueHoursRemaining <= USAGE_ESCALATION_HOURS
            ? 'DUE_7D'
            : 'DUE_30D'; // usage clock with no calendar date: keep visible, never bury in horizon
      const defect = defects.find(x => x.id === d.defectId);
      const card = openCards.find(w => w.linkedDefectId === d.defectId);
      items.push({
        key: `${ac.id}:DEFERRAL:${d.id}`, aircraftId: ac.id, tailNumber: ac.tailNumber,
        kind: 'DEFERRAL', refId: d.id, title: defect?.description ?? 'MEL deferral repair',
        ataChapter: defect?.ataChapter, category: `MEL ${d.category}`,
        bucket, dueDateUtc: d.repairDueDateUtc, dueInDays, dueHoursRemaining, grounding: expired,
        workCardId: card?.id, workCardNumber: card?.cardNumber, linkedDeferralId: d.id,
      });
    }

    // ── recurring dispatch-gating checks ──
    for (const c of (state.recurringChecks ?? []).filter(x => x.active && x.aircraftId === ac.id)) {
      const p = projectCheck(c, state.recurringAccomplishments ?? [], asOfUtc, airframe);
      const grounding = p.state === 'EXPIRED' || p.state === 'NEVER_DONE';
      if (!grounding && p.remainingDays != null && p.remainingDays > HORIZON_DAYS) continue;
      const bucket: DueBucket = grounding
        ? 'OVERDUE'
        : p.remainingDays != null
          ? bucketOf(p.remainingDays)
          : p.state === 'DUE_SOON'
            ? 'DUE_7D'
            : 'HORIZON';
      items.push({
        key: `${ac.id}:RECURRING_CHECK:${c.id}`, aircraftId: ac.id, tailNumber: ac.tailNumber,
        kind: 'RECURRING_CHECK', refId: c.id, title: c.name, ataChapter: c.ataChapter, category: 'CHECK',
        bucket, dueDateUtc: p.dueUtc, dueInDays: p.remainingDays,
        dueHoursRemaining: c.intervalUnit === 'FLIGHT_HOUR' ? p.remainingUsage : undefined,
        grounding,
      });
    }
  }

  const emptyCounts = (): Record<DueBucket, number> => ({ OVERDUE: 0, DUE_7D: 0, DUE_30D: 0, HORIZON: 0 });
  const buckets: Record<DueBucket, UpcomingItem[]> = { OVERDUE: [], DUE_7D: [], DUE_30D: [], HORIZON: [] };
  const totals = emptyCounts();
  const byAircraft = new Map<string, Record<DueBucket, number>>();

  const sorted = [...items].sort((a, b) =>
    (a.dueInDays ?? Number.MAX_SAFE_INTEGER) - (b.dueInDays ?? Number.MAX_SAFE_INTEGER) ||
    a.tailNumber.localeCompare(b.tailNumber));
  for (const it of sorted) {
    buckets[it.bucket].push(it);
    totals[it.bucket] += 1;
    const c = byAircraft.get(it.aircraftId) ?? emptyCounts();
    c[it.bucket] += 1;
    byAircraft.set(it.aircraftId, c);
  }

  const perAircraft = state.aircraft
    .filter(ac => byAircraft.has(ac.id))
    .map(ac => {
      const counts = byAircraft.get(ac.id)!;
      return { aircraftId: ac.id, tailNumber: ac.tailNumber, counts, total: BUCKET_ORDER.reduce((n, b) => n + counts[b], 0) };
    })
    .sort((a, b) => a.tailNumber.localeCompare(b.tailNumber));

  return { perAircraft, buckets, totals };
}

/**
 * Build a scheduled work card from a CAMP due-list item — the "pull card from CAMP" bridge.
 * Mirrors createRectificationCard: minimal completable steps; the mechanic adds steps/labor/parts.
 * Carries forecastRef so the Coming Due board shows the card instead of offering another pull.
 */
export function createForecastCard(
  item: CampForecastItem,
  aircraftId: string,
  ids: { cardId: string; stepIds: [string, string] },
  nowUtc: string,
): WorkCard {
  return {
    id: ids.cardId,
    cardNumber: `WC-${ids.cardId.slice(-4).toUpperCase()}`,
    aircraftId,
    title: item.description,
    ataChapter: item.ata,
    description: `${item.category} due-list item ${item.ref} pulled from CAMP.`,
    steps: [
      { id: ids.stepIds[0], seq: 1, text: `Perform: ${item.description} per applicable AMM/AD/SB reference`, done: false },
      { id: ids.stepIds[1], seq: 2, text: 'Record compliance in CAMP (Phase 2: IntegrateDiscrepancies / WO update)', done: false },
    ],
    status: 'OPEN',
    source: 'CAMP',
    headerStatusCode: 1, // Open (CAMP WO header ladder)
    scheduled: true,     // due-list driven, not corrective
    forecastRef: item.ref,
    riiRequired: false,
    createdAtUtc: nowUtc,
  };
}
