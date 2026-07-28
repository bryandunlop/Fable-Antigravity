/**
 * Who has to approve a company-page proposal (D46).
 *
 * The airport evaluation officer reviews and publishes on a single approval —
 * except for safety fields, which additionally require the chief pilot. The gate
 * is a property of the proposal's FIELD SET, not of the submitter's intent, so a
 * proposal touching both kinds routes down the safety path.
 *
 * Anything unrecognised fails closed onto the safety path. A field added later
 * that nobody classified must not inherit single-approval by default.
 */

export type ApproverRole = 'airport-evaluator' | 'chief-pilot';

/**
 * Fields an officer may publish alone. Everything else — PPR, curfews, ramp and
 * handling limits, and any annotation contradicting FAA reference data — is a
 * safety field, because an incorrect assertion there is the one most likely to
 * put an aircraft somewhere it should not be.
 */
const STANDARD_FIELDS: ReadonlySet<string> = new Set(['opsNotes', 'fboPreference']);

export function requiredApprovals(changedFields: readonly string[]): ApproverRole[] {
  const needsChiefPilot = changedFields.some((field) => !STANDARD_FIELDS.has(field));

  return needsChiefPilot ? ['airport-evaluator', 'chief-pilot'] : ['airport-evaluator'];
}
