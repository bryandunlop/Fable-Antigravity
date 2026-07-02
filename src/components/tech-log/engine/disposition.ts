import type { Personnel, MelItem, Deferral } from '../types';
import { isDeferralExpired } from './pl25';

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
