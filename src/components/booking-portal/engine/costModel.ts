// The economics behind the chargeback rate, as a testable model.
//
// Reasoning and provenance: docs/CHARGEBACK_DEMAND_MODEL.md in the Tech Log repo.
// The short version, because it changes what the numbers mean:
//
//   The flight department is a COST CENTRE THAT EXISTS TO BE USED, not a business.
//   A chargeback is an internal transfer between P&G cost centres, so it is not
//   income and nothing here is scored on the department's net — moving a dollar
//   between two internal budgets changes nothing at company level. What changes at
//   company level is whether an aircraft flew, and whether the fixed bill ended the
//   year attached to trips or to an empty ramp.
//
// KNOWN (Bryan, 2026-08-23): the rate is $10,000/flight hour, repositioning legs are
// billed to the requestor, the fleet flies ~2,500 h/yr, and the chargeback is roughly
// half the department budget.
// GUESSED: the fixed share of cost. It is an estimate, not GFO's accounting, and the
// entire argument rests on it — which is why `sweepFixedShare` exists.

export interface CostInputs {
  /** Published chargeback rate, $/flight hour. KNOWN. */
  ratePerHour: number;
  /** Hours the fleet is planned to fly in a year. KNOWN (~2,500). */
  plannedHours: number;
  /** Chargeback as a share of total department budget, 0–1. KNOWN, approximately. */
  chargebackShare: number;
  /** Share of cost that is fixed — aircraft, staff, building. GUESSED. */
  fixedShare: number;
}

export const GFO_COST_INPUTS: CostInputs = {
  ratePerHour: 10_000,
  plannedHours: 2_500,
  chargebackShare: 0.5,
  fixedShare: 0.8,
};

export interface CostPicture {
  /** Total department budget implied by the rate, hours and chargeback share. */
  budget: number;
  /** Aircraft, staff, building — spent whether or not anything flies. */
  fixedCost: number;
  /** What one more flight hour actually costs the company. */
  realCostPerHour: number;
  /** Full allocable cost per hour — the 14 CFR 91.501(b)(5) ceiling. */
  ceilingPerHour: number;
  /**
   * Rate ÷ real cost. Above 1 the charge exceeds what flying costs, so it is a
   * deterrent to the one activity the department exists to perform.
   */
  deterrentMultiple: number;
  /** Share of the regulatory ceiling the published rate uses. */
  ceilingUsed: number;
}

export function costPicture(input: CostInputs = GFO_COST_INPUTS): CostPicture {
  const { ratePerHour, plannedHours, chargebackShare, fixedShare } = input;
  const budget = (ratePerHour * plannedHours) / chargebackShare;
  const fixedCost = budget * fixedShare;
  const realCostPerHour = (budget - fixedCost) / plannedHours;
  const ceilingPerHour = budget / plannedHours;
  return {
    budget,
    fixedCost,
    realCostPerHour,
    ceilingPerHour,
    deterrentMultiple: realCostPerHour > 0 ? ratePerHour / realCostPerHour : Infinity,
    ceilingUsed: ratePerHour / ceilingPerHour,
  };
}

export interface IdlePicture {
  hoursFlown: number;
  /** Planned hours the fleet did not fly. */
  idleHours: number;
  /** Fixed cost that bought no trip at all. */
  idleFixedCost: number;
  /**
   * Total cost divided by hours actually delivered. Rises when the fleet sits —
   * not because flying got dearer, but because the same bill covers fewer trips.
   */
  costPerHourDelivered: number;
}

/** What a demand shortfall costs, given the fleet is paid for either way. */
export function idlePicture(hoursFlown: number, input: CostInputs = GFO_COST_INPUTS): IdlePicture {
  const { budget, fixedCost, realCostPerHour } = costPicture(input);
  const idleHours = Math.max(0, input.plannedHours - hoursFlown);
  const totalCost = fixedCost + realCostPerHour * hoursFlown;
  return {
    hoursFlown,
    idleHours,
    idleFixedCost: fixedCost * (idleHours / input.plannedHours),
    costPerHourDelivered: hoursFlown > 0 ? totalCost / hoursFlown : budget,
  };
}

export interface SensitivityRow {
  fixedShare: number;
  realCostPerHour: number;
  deterrentMultiple: number;
  /** True once the rate sits far enough above real cost to be worth acting on. */
  argumentHolds: boolean;
}

/**
 * Below this multiple the rate is close enough to cost-reflective that there is no
 * meaningful deterrent left to remove — and therefore nothing for a pricing change
 * to fix. Chosen as a judgement call, not derived; it is stated on the page so a
 * reader can disagree with it rather than having it buried.
 */
export const HOLDS_ABOVE_MULTIPLE = 1.5;

export const DEFAULT_SWEEP = [0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 0.95];

/**
 * The only question a proof of concept has to answer: does the conclusion survive
 * the fixed-share guess being wrong? Sweeps it across every plausible value.
 */
export function sweepFixedShare(
  input: CostInputs = GFO_COST_INPUTS,
  shares: number[] = DEFAULT_SWEEP,
): SensitivityRow[] {
  return shares.map((fixedShare) => {
    const p = costPicture({ ...input, fixedShare });
    return {
      fixedShare,
      realCostPerHour: p.realCostPerHour,
      deterrentMultiple: p.deterrentMultiple,
      argumentHolds: p.deterrentMultiple >= HOLDS_ABOVE_MULTIPLE,
    };
  });
}

/**
 * The lowest fixed share at which the argument holds — the turn, not the bottom of
 * the range. Returns null when it holds nowhere in the sweep.
 */
export function holdingThreshold(rows: SensitivityRow[]): SensitivityRow | null {
  return rows.find((r) => r.argumentHolds) ?? null;
}
