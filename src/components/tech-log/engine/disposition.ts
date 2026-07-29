import type { Personnel, MelItem, Deferral } from '../types';
import { isDeferralExpired } from './pl25';
import { latestFor } from './supersede';
import { crewActionSatisfied } from './crewAction';

/** Who may DEFER a defect under a given MEL item (design §D). Maintenance: any. Crew: only an
 *  FC-deferrable item, and only if authorized. */
export function canDeferDefect(person: Personnel, melItem: MelItem): boolean {
  if (person.role === 'MAINTENANCE') return true;
  return person.crewDeferralAuthorized === true && melItem.flightCrewDeferral === true;
}

/** Who may sign the discharge that flips a PENDING_PLACARD deferral to ACTIVE. Maintenance: any (CRS).
 *  Authorized crew: placard-ONLY (no (M) procedure) — a non-CRS attestation. */
export function canSignPlacardDischarge(person: Personnel, deferral: Deferral): boolean {
  if (person.role === 'MAINTENANCE') return true;
  return person.placardAuthorized === true && deferral.placardRequired === true && deferral.mProcedureRequired !== true;
}

/** A gating-discharge release must not resurrect a deferral that already met its repair-due
 *  condition (§15.1: EXPIRED is terminal) — signing the discharge late doesn't undo an overdue
 *  grounding; it must be re-routed (extension/correction), not silently flipped to ACTIVE. */
export function canDischargeGating(
  deferral: Pick<Deferral, 'repairIntervalUnit' | 'repairDueDateUtc' | 'usageDueThreshold'>,
  asOfUtc: string,
  airframeNow: { hours: number; cycles: number },
): boolean {
  return !isDeferralExpired(deferral, asOfUtc, airframeNow);
}

export type GatingBlockCode = 'NOT_FOUND' | 'NOT_PENDING' | 'EXPIRED' | 'CREW_ACTION_PENDING' | 'NOT_AUTHORIZED';
export type GatingSignability =
  | { ok: true; deferral: Deferral }
  | { ok: false; code: GatingBlockCode; reason: string; deferral?: Deferral };

/**
 * The single signability rule for the gating-discharge release, asked from a deferral **id** and
 * the ledger rows — never from a Deferral object the caller has been holding.
 *
 * Two things converge here:
 *
 * **The §1a double-discharge race (fixed by D59's bundled fix).** The panel used to gate on the
 * `deferral` prop captured at render, and never re-checked that it was STILL `PENDING_PLACARD` at
 * the moment of signing. Two actors looking at the same pending gate could therefore both sign it:
 * two gating-discharge releases, two superseding rows, one of them silently rejected by the
 * reducer's fork guard — after a CRS had already been signed against it. Resolving the CHAIN HEAD
 * (`latestFor`) here means a stale row on screen cannot be signed: whatever another actor did to it
 * is what gets judged.
 *
 * **The D59 crew-action hard gate.** While a crew action is required and unmarked, no gating
 * release may be signed — by maintenance or by an authorized crew placard attestation. The mark
 * itself remains non-authoritative; it merely stops being an obstacle.
 *
 * Order is deliberate: record-state first (what is true of the deferral), person last (who you
 * are), so the message a user sees names the real obstacle rather than their role.
 */
export function resolveGatingSignability(input: {
  deferralId: string;
  deferrals: Deferral[];
  person: Personnel;
  asOfUtc: string;
  airframeNow: { hours: number; cycles: number };
}): GatingSignability {
  const { deferralId, deferrals, person, asOfUtc, airframeNow } = input;
  const current = latestFor(deferrals, deferralId);
  if (!current) {
    return { ok: false, code: 'NOT_FOUND', reason: 'This deferral could not be found in the ledger.' };
  }
  if (current.status !== 'PENDING_PLACARD') {
    return {
      ok: false, code: 'NOT_PENDING', deferral: current,
      reason: `This deferral is no longer awaiting its gating release — it now reads ${current.status}. Someone else may have signed it. Reload before acting.`,
    };
  }
  if (!canDischargeGating(current, asOfUtc, airframeNow)) {
    return {
      ok: false, code: 'EXPIRED', deferral: current,
      reason: 'This deferral already passed its repair-due condition (EXPIRED) — it cannot be discharged to ACTIVE. Route via extension or correction.',
    };
  }
  if (!crewActionSatisfied(current)) {
    return {
      ok: false, code: 'CREW_ACTION_PENDING', deferral: current,
      reason: 'The crew action on this deferral has not been marked complied. A pilot or maintenance user must mark it before the aircraft can be released on this MEL.',
    };
  }
  if (!canSignPlacardDischarge(person, current)) {
    return {
      ok: false, code: 'NOT_AUTHORIZED', deferral: current,
      reason: person.role === 'MAINTENANCE'
        ? 'Cannot sign this discharge.'
        : 'An (M) procedure requires maintenance — crew may only attest a placard-only item.',
    };
  }
  return { ok: true, deferral: current };
}
