import type { WorkCard, WorkCardStatusTag } from '../types';
import { statusDurations, STATUS_TAG_ORDER } from './statusTags';

/**
 * LG-100 rollups — the three questions Bryan named: how long to **diagnose**, how long the vendor
 * takes to **send parts**, how long to **install**. Pure derivation over the `statusTags` axis
 * (elapsed wall clock). Man-hours live on the other axis (`LaborEntry` / `engine/labor.ts`) and are
 * deliberately not mixed in here — see the note on `WorkCardStatusTag`.
 */

const round1 = (n: number) => Math.round(n * 10) / 10;
const hoursBetween = (from: string, to: string) =>
  Math.max(0, (new Date(to).getTime() - new Date(from).getTime()) / 3600000);

export function median(xs: number[]): number | null {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return round1(s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2);
}

function average(xs: number[]): number | null {
  return xs.length ? round1(xs.reduce((a, b) => a + b, 0) / xs.length) : null;
}

/** Gap hours the enterer excluded that fall inside [from, to). Used to keep a derived window
 * honest: an overnight nobody counts should not inflate "how long did this take". */
function excludedGapHoursWithin(card: WorkCard, fromUtc: string, toUtc: string): number {
  const tags = [...(card.statusTags ?? [])].sort((a, b) => a.atUtc.localeCompare(b.atUtc));
  let total = 0;
  for (let i = 0; i < tags.length; i++) {
    if (tags[i].tag !== 'GAP' || tags[i].includeInTotals !== false) continue;
    const spanFrom = tags[i].atUtc;
    const spanTo = i + 1 < tags.length ? tags[i + 1].atUtc : (card.completedAtUtc ?? toUtc);
    const lo = spanFrom > fromUtc ? spanFrom : fromUtc;
    const hi = spanTo < toUtc ? spanTo : toUtc;
    if (hi > lo) total += hoursBetween(lo, hi);
  }
  return total;
}

/**
 * How long it took to work out what was wrong: the card being raised → the first transition **out
 * of** `DIAGNOSING`. Null when the card was never diagnosed, or is still in diagnosis — an
 * unfinished diagnosis is not a duration, and reporting the elapsed-so-far here would quietly
 * depress the fleet median every time somebody is mid-troubleshoot.
 *
 * The window deliberately starts at `createdAtUtc`, not at the first `DIAGNOSING` tag: the question
 * is asked from when the job landed, so the wait before anyone picked it up is part of the answer.
 * Gaps the enterer excluded are subtracted (D61 §4).
 */
export function timeToDiagnose(card: WorkCard): number | null {
  const tags = [...(card.statusTags ?? [])].sort((a, b) => a.atUtc.localeCompare(b.atUtc));
  const first = tags.findIndex(t => t.tag === 'DIAGNOSING');
  if (first < 0) return null;
  const exit = tags.slice(first + 1).find(t => t.tag !== 'DIAGNOSING' && t.tag !== 'GAP');
  if (!exit) return null;
  const gross = hoursBetween(card.createdAtUtc, exit.atUtc);
  return round1(Math.max(0, gross - excludedGapHoursWithin(card, card.createdAtUtc, exit.atUtc)));
}

export interface PartsLead {
  orderId: string;
  cardId: string;
  cardNumber: string;
  aircraftId: string;
  vendor: string;
  description: string;
  partNumber?: string;
  orderedAtUtc: string;
  receivedAtUtc?: string;
  /** Ordered → received, or ordered → asOf while still open. */
  hours: number;
  open: boolean;
}

/** Per-order lead time. An open order reports elapsed-so-far and says so — an order still in
 * transit is not evidence of a fast vendor, and folding it into a delivered average would say so. */
export function partsLeadTimes(card: WorkCard, asOfUtc: string): PartsLead[] {
  return (card.partsOrders ?? []).map(o => ({
    orderId: o.id,
    cardId: card.id,
    cardNumber: card.cardNumber,
    aircraftId: card.aircraftId,
    vendor: o.vendor,
    description: o.description,
    partNumber: o.partNumber,
    orderedAtUtc: o.orderedAtUtc,
    receivedAtUtc: o.receivedAtUtc,
    hours: round1(hoursBetween(o.orderedAtUtc, o.receivedAtUtc ?? asOfUtc)),
    open: !o.receivedAtUtc,
  }));
}

/** Hands-on hours — the `IN_WORK` total. A logged gap no longer lands here (D61 §4). */
export function installTime(card: WorkCard, asOfUtc: string): number {
  return statusDurations(card, asOfUtc).hours.IN_WORK;
}

export interface AircraftMetrics {
  aircraftId: string;
  cards: number;
  cardIds: string[];              // every number on the page links back to its cards
  diagnoseHours: number[];
  medianDiagnoseHours: number | null;
  avgDiagnoseHours: number | null;
  installHours: number;
  stateHours: Record<WorkCardStatusTag, number>;
  excludedGapHours: number;
  openPartsOrders: number;
}

export interface VendorMetrics {
  vendor: string;
  orders: number;
  openOrders: number;
  medianLeadHours: number | null;
  avgLeadHours: number | null;
  leads: PartsLead[];
}

export interface FleetMetrics {
  fromUtc: string;
  toUtc: string;
  cards: number;
  medianDiagnoseHours: number | null;
  avgDiagnoseHours: number | null;
  totalInstallHours: number;
  stateHours: Record<WorkCardStatusTag, number>;
  excludedGapHours: number;
  byAircraft: AircraftMetrics[];
  byVendor: VendorMetrics[];
}

const zeroStateHours = (): Record<WorkCardStatusTag, number> =>
  Object.fromEntries(STATUS_TAG_ORDER.map(t => [t, 0])) as Record<WorkCardStatusTag, number>;

export interface MetricsWindow {
  fromUtc: string;
  toUtc: string;
  asOfUtc: string;
}

/**
 * Per-tail and fleet rollups over the cards raised inside the window. Membership is by
 * `createdAtUtc` — a card belongs to the period it was raised in, so a long-running job does not
 * migrate between periods as it drags on, and the same card is never counted twice.
 */
export function fleetMetrics(cards: WorkCard[], w: MetricsWindow): FleetMetrics {
  const inWindow = cards.filter(c => c.createdAtUtc >= w.fromUtc && c.createdAtUtc < w.toUtc);

  const byAircraftId = new Map<string, WorkCard[]>();
  for (const c of inWindow) byAircraftId.set(c.aircraftId, [...(byAircraftId.get(c.aircraftId) ?? []), c]);

  const summarize = (group: WorkCard[]) => {
    const stateHours = zeroStateHours();
    let excludedGapHours = 0;
    let installHours = 0;
    const diagnoseHours: number[] = [];
    for (const c of group) {
      const d = statusDurations(c, w.asOfUtc);
      (Object.keys(stateHours) as WorkCardStatusTag[]).forEach(k => { stateHours[k] += d.hours[k]; });
      excludedGapHours += d.excludedGapHours;
      installHours += d.hours.IN_WORK;
      const ttd = timeToDiagnose(c);
      if (ttd != null) diagnoseHours.push(ttd);
    }
    (Object.keys(stateHours) as WorkCardStatusTag[]).forEach(k => { stateHours[k] = round1(stateHours[k]); });
    return { stateHours, excludedGapHours: round1(excludedGapHours), installHours: round1(installHours), diagnoseHours };
  };

  const byAircraft: AircraftMetrics[] = [...byAircraftId.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([aircraftId, group]) => {
      const s = summarize(group);
      return {
        aircraftId,
        cards: group.length,
        cardIds: group.map(c => c.id),
        diagnoseHours: s.diagnoseHours,
        medianDiagnoseHours: median(s.diagnoseHours),
        avgDiagnoseHours: average(s.diagnoseHours),
        installHours: s.installHours,
        stateHours: s.stateHours,
        excludedGapHours: s.excludedGapHours,
        openPartsOrders: group.reduce((n, c) => n + (c.partsOrders ?? []).filter(o => !o.receivedAtUtc).length, 0),
      };
    });

  const allLeads = inWindow.flatMap(c => partsLeadTimes(c, w.asOfUtc));
  const vendorNames = [...new Set(allLeads.map(l => l.vendor))].sort((a, b) => a.localeCompare(b));
  const byVendor: VendorMetrics[] = vendorNames.map(vendor => {
    const leads = allLeads.filter(l => l.vendor === vendor);
    // Median/average are over DELIVERED orders only; open ones are counted and shown, not averaged.
    const delivered = leads.filter(l => !l.open).map(l => l.hours);
    return {
      vendor,
      orders: leads.length,
      openOrders: leads.filter(l => l.open).length,
      medianLeadHours: median(delivered),
      avgLeadHours: average(delivered),
      leads,
    };
  });

  const fleet = summarize(inWindow);
  return {
    fromUtc: w.fromUtc,
    toUtc: w.toUtc,
    cards: inWindow.length,
    medianDiagnoseHours: median(fleet.diagnoseHours),
    avgDiagnoseHours: average(fleet.diagnoseHours),
    totalInstallHours: fleet.installHours,
    stateHours: fleet.stateHours,
    excludedGapHours: fleet.excludedGapHours,
    byAircraft,
    byVendor,
  };
}
