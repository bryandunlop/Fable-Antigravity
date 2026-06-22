import type { Personnel, MelItem, Deferral } from '../types';

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
