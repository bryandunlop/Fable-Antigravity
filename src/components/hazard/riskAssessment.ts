/**
 * The GFO Risk Assessment Matrix — "has a human actually assessed this?" and the score.
 *
 * Extracted from HazardWorkflow.tsx to fix two defects that shared one root cause:
 * the component had no value meaning "nobody has answered yet". It defaulted both axes
 * to 3, then asked two different truthiness questions of those numbers:
 *
 *   1. `(riskSeverity + riskLikelihood) > 0`  — used as "assessed?". From mount that is
 *      6 > 0 = true, so an untouched hazard rendered a green tick and a score of 6,
 *      which the legend calls "High (Undesirable) — Mgmt decision required". The SMS
 *      asserted a management-decision-required rating that no human had entered.
 *
 *   2. `if (!riskSeverity || !riskLikelihood)` — used to gate stage advance. The
 *      likelihood scale legitimately starts at ZERO ("0 Rarely"), which is falsy, so a
 *      safety manager who correctly assessed a hazard as Rarely was told the assessment
 *      was incomplete and could never advance the stage.
 *
 * The fix is to make "unassessed" explicit and separate from "assessed as zero".
 * Never infer assessment from a sum, and never test these axes for truthiness — the
 * valid domain includes 0.
 *
 * NOT unified here: the three disagreeing score-to-band bucketings in HazardWorkflow
 * (and the fact that this additive model rates Catastrophic+Rarely the same as
 * Moderate+Possibly, which ICAO-style matrices generally do not). That is a domain
 * question for the DOM / safety owner, not something to guess at. See TL-17.
 */

/** No answer yet. Distinct from a real answer of 0, which the likelihood scale allows. */
export const UNASSESSED = null;
export type RiskAxis = number | typeof UNASSESSED;

/** True only when a human has answered BOTH axes. A likelihood of 0 is an answer. */
export function isRiskAssessed(severity: RiskAxis, likelihood: RiskAxis): boolean {
  return severity !== null && likelihood !== null;
}

/** The additive score, or null while either axis is unanswered — so callers cannot render a phantom number. */
export function riskScore(severity: RiskAxis, likelihood: RiskAxis): number | null {
  if (!isRiskAssessed(severity, likelihood)) return null;
  return (severity as number) + (likelihood as number);
}
