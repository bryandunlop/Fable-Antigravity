// What a trip request costs the requesting cost centre, and why.
//
// Grounded in `docs/booking-portal/chargeback-demand-model.md`. Three rules from
// that work are load-bearing here and are enforced, not merely documented:
//
//  1. 14 CFR 91.501(b)(5) caps an internal charge at the cost of owning, operating
//     and maintaining the airplane. `ceilingPerHour` is that cap; the quote is
//     clamped to it and reports how much of it is used.
//  2. There is no floor. Every modulation in this engine is a CREDIT — it can only
//     ever reduce the charge. Nothing here raises a price.
//  3. The same rule bars ANY charge for carrying a guest outside the scope of the
//     business. A non-business guest is surfaced as a no-charge line, never as a
//     larger number.
//
// Repositioning is billed to whoever caused the deadhead, so it is quoted openly
// as its own line rather than buried in the hourly figure.

export interface RateCard {
  /** Published chargeback rate, $/flight hour. */
  publishedPerHour: number;
  /** Full allocable cost, $/flight hour — the 91.501(b)(5) ceiling. */
  ceilingPerHour: number;
  /** Share of billable hours that are repositioning, as a planning assumption. */
  repositioningShare: number;
  /** Book this many days ahead or more to earn the early credit. */
  earlyBookingDays: number;
  earlyBookingCredit: number;
  /** Give scheduling at least this much flex on a leg to earn the flex credit. */
  flexThresholdHours: number;
  flexCredit: number;
  /** Credit against the repositioning portion when another trip can share the leg. */
  sharedRepoCredit: number;
  /** Change/cancel exposure, as a share of the quote, by days before departure. */
  cancelLadder: Array<{ daysBefore: number; share: number }>;
}

export const GFO_RATE_CARD: RateCard = {
  publishedPerHour: 10_000,
  ceilingPerHour: 20_000,
  repositioningShare: 0.3,
  earlyBookingDays: 30,
  earlyBookingCredit: 0.15,
  flexThresholdHours: 4,
  flexCredit: 0.1,
  sharedRepoCredit: 0.5,
  cancelLadder: [
    { daysBefore: 30, share: 0 },
    { daysBefore: 14, share: 0.15 },
    { daysBefore: 7, share: 0.4 },
    { daysBefore: 3, share: 0.75 },
    { daysBefore: 0, share: 1 },
  ],
};

export interface QuoteLegInput {
  /** Planning estimate for the leg, minutes. */
  estMinutes: number;
  /** Requestor-local date, YYYY-MM-DD. */
  date: string;
  /** Hours of departure flexibility given to scheduling. 0 = firm. */
  flexHours: number;
  /** Purposes of everyone aboard this leg, in manifest order. */
  purposes: string[];
  /** True when scheduling has matched this leg's deadhead to another trip. */
  sharedRepositioning?: boolean;
}

export type QuoteLineKind = 'charge' | 'credit' | 'note';

export interface QuoteLine {
  kind: QuoteLineKind;
  label: string;
  detail: string;
  /** Positive for a charge, negative for a credit, zero for a note. */
  amount: number;
}

export interface CancelStep {
  daysBefore: number;
  label: string;
  amount: number;
}

export interface Quote {
  flightHours: number;
  repositioningHours: number;
  billableHours: number;
  lines: QuoteLine[];
  subtotal: number;
  credits: number;
  total: number;
  effectivePerHour: number;
  ceilingPerHour: number;
  /** Share of the regulatory ceiling this quote uses. 1.0 = at the cap. */
  ceilingUsed: number;
  /** Set when the manifest carries someone whose purpose is not business. */
  nonBusinessNote?: string;
  cancelSchedule: CancelStep[];
}

const round = (n: number) => Math.round(n);

/**
 * Hours as "1 h 45 m", matching how the rest of the portal states flight time.
 * Decimal hours were tried first and read as an arithmetic error: "1.8 h at
 * $10,000/h" next to $17,500 looks wrong even though 1.75 h is right.
 */
export function hm(hours: number): string {
  const mins = Math.round(hours * 60);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m} m`;
  return m === 0 ? `${h} h` : `${h} h ${m} m`;
}

/** Whole days from `asOfIso` (YYYY-MM-DD) to the earliest leg date. Negative if past. */
export function daysUntil(asOfIso: string, dateIso: string): number {
  const a = Date.parse(`${asOfIso}T00:00:00Z`);
  const b = Date.parse(`${dateIso}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.round((b - a) / 86_400_000);
}

/**
 * Price a request. `asOfIso` is passed in rather than read from the clock so the
 * same input always produces the same quote — a quote shown to a requestor has to
 * be reproducible, and a render path that reads the clock is not.
 */
export function quoteRequest(
  legs: QuoteLegInput[],
  asOfIso: string,
  card: RateCard = GFO_RATE_CARD,
): Quote {
  const flightHours = legs.reduce((s, l) => s + l.estMinutes / 60, 0);
  const repositioningHours = flightHours * card.repositioningShare;
  const billableHours = flightHours + repositioningHours;

  const lines: QuoteLine[] = [];
  const base = billableHours * card.publishedPerHour;

  lines.push({
    kind: 'charge',
    label: 'Flight time',
    detail: `${hm(flightHours)} at $${card.publishedPerHour.toLocaleString()}/h`,
    amount: round(flightHours * card.publishedPerHour),
  });

  if (repositioningHours > 0) {
    lines.push({
      kind: 'charge',
      label: 'Repositioning',
      detail: `${hm(repositioningHours)} of deadhead, billed to the requesting trip`,
      amount: round(repositioningHours * card.publishedPerHour),
    });
  }

  // --- credits. Each one can only ever subtract. ---
  const lead = legs.map((l) => l.date).sort()[0];
  const lead_days = lead ? daysUntil(asOfIso, lead) : 0;
  if (legs.length > 0 && lead_days >= card.earlyBookingDays) {
    lines.push({
      kind: 'credit',
      label: 'Early-booking credit',
      detail: `booked ${lead_days} days out — ${Math.round(card.earlyBookingCredit * 100)}% off`,
      amount: -round(base * card.earlyBookingCredit),
    });
  }

  const flexHours = legs
    .filter((l) => l.flexHours >= card.flexThresholdHours)
    .reduce((s, l) => s + (l.estMinutes / 60) * (1 + card.repositioningShare), 0);
  if (flexHours > 0) {
    lines.push({
      kind: 'credit',
      label: 'Flex credit',
      detail: `${hm(flexHours)} given a ±${card.flexThresholdHours} h window scheduling can pair`,
      amount: -round(flexHours * card.publishedPerHour * card.flexCredit),
    });
  }

  const sharedHours = legs
    .filter((l) => l.sharedRepositioning)
    .reduce((s, l) => s + (l.estMinutes / 60) * card.repositioningShare, 0);
  if (sharedHours > 0) {
    lines.push({
      kind: 'credit',
      label: 'Shared repositioning',
      detail: `${hm(sharedHours)} of your deadhead is carrying another trip`,
      amount: -round(sharedHours * card.publishedPerHour * card.sharedRepoCredit),
    });
  }

  const nonBusiness = legs.some((l) => l.purposes.some((p) => p === 'personal' || p === 'entertainment'));
  let nonBusinessNote: string | undefined;
  if (nonBusiness) {
    nonBusinessNote =
      'Someone on this manifest is travelling outside the scope of the business. 14 CFR 91.501(b)(5) bars any charge for carrying a guest on that basis — it is not billed here, and imputed income is handled through SIFL.';
    lines.push({
      kind: 'note',
      label: 'Non-business carriage',
      detail: 'no charge may be made — routed to SIFL, not to the cost centre',
      amount: 0,
    });
  }

  const credits = lines.filter((l) => l.kind === 'credit').reduce((s, l) => s + l.amount, 0);
  const subtotal = lines.filter((l) => l.kind === 'charge').reduce((s, l) => s + l.amount, 0);

  // The ceiling is a hard cap, so the engine treats it as one rather than trusting
  // that the rate card was configured sensibly.
  const ceiling = billableHours * card.ceilingPerHour;
  const total = Math.min(Math.max(0, subtotal + credits), round(ceiling));

  const cancelSchedule: CancelStep[] = card.cancelLadder.map((step) => ({
    daysBefore: step.daysBefore,
    label:
      step.daysBefore === 0
        ? 'Day of departure'
        : step.daysBefore >= 30
          ? `${step.daysBefore}+ days out`
          : `Inside ${step.daysBefore} days`,
    amount: round(total * step.share),
  }));

  return {
    flightHours,
    repositioningHours,
    billableHours,
    lines,
    subtotal,
    credits,
    total,
    effectivePerHour: billableHours > 0 ? total / billableHours : 0,
    ceilingPerHour: card.ceilingPerHour,
    ceilingUsed: billableHours > 0 ? total / ceiling : 0,
    nonBusinessNote,
    cancelSchedule,
  };
}
