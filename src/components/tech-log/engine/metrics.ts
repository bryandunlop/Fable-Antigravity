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

/**
 * **Hands-on** diagnosis hours: the sum of the card's `DIAGNOSING` spans.
 *
 * D61 amendment (Bryan, 2026-07-30). Slice 6 shipped this as raised → first transition out of
 * `DIAGNOSING`, which meant a card raised Friday afternoon and picked up Monday morning reported a
 * three-day diagnosis for two hours of work. Bryan chose hands-on: the figure that answers "how
 * long does diagnosis take us" and is comparable between jobs.
 *
 * **The accepted cost, recorded on the decision so it is not rediscovered as a bug: this hides the
 * queue.** A card nobody opened for three days now reads identically to one picked up immediately.
 * That waiting is not lost — it is still in the timeline as spans, and elapsed remains derivable —
 * but it is not what this number reports, and this function must not try to compensate for it.
 *
 * Null when the card was never diagnosed, or when the diagnosis is still running (the last span is
 * `DIAGNOSING` on an open card): an unfinished diagnosis is not a duration, and reporting
 * elapsed-so-far would quietly depress the fleet median every time somebody is mid-troubleshoot.
 *
 * A gap needs no special handling here, which is the quiet benefit of the change: a `GAP` is its own
 * span, so an overnight in the middle of a diagnosis contributes nothing whether the enterer counted
 * it or not, and the include/exclude choice cannot move this figure at all.
 */
export function timeToDiagnose(card: WorkCard): number | null {
  const tags = [...(card.statusTags ?? [])].sort((a, b) => a.atUtc.localeCompare(b.atUtc));
  if (!tags.some(t => t.tag === 'DIAGNOSING')) return null;
  let total = 0;
  for (let i = 0; i < tags.length; i++) {
    if (tags[i].tag !== 'DIAGNOSING') continue;
    // The final span closes at sign-off; on an open card it has no end yet.
    const to = i + 1 < tags.length ? tags[i + 1].atUtc : card.completedAtUtc;
    if (!to) return null;
    total += hoursBetween(tags[i].atUtc, to);
  }
  return round1(total);
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
  /**
   * The fleet parts-lead figures, computed over the **delivered orders themselves** — never as a
   * median of the per-vendor medians.
   *
   * The page used to derive its headline from `byVendor.map(v => v.medianLeadHours)`, which weights
   * every vendor equally regardless of volume: one vendor with a single fast order moved the fleet
   * number as much as a vendor with fifty slow ones. Bryan's question is "how long does Gulfstream
   * take to send parts", and a median of medians does not answer it. Exposed here so the page cannot
   * reinvent the wrong aggregation.
   */
  medianLeadHours: number | null;
  avgLeadHours: number | null;
  deliveredOrders: number;
  openOrders: number;
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

  // Over the ORDERS, not over the per-vendor medians — see the FleetMetrics docstring.
  const deliveredLeads = allLeads.filter(l => !l.open).map(l => l.hours);

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
    medianLeadHours: median(deliveredLeads),
    avgLeadHours: average(deliveredLeads),
    deliveredOrders: deliveredLeads.length,
    openOrders: allLeads.filter(l => l.open).length,
  };
}
