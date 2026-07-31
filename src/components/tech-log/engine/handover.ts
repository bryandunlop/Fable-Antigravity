import type { TechLogState, Deferral } from '../types';
import { currentRows } from './supersede';
import { deriveServiceability } from './serviceability';

/**
 * The ACTIVE deferrals the PIC must acknowledge item-by-item before accepting (design §A):
 * those carrying an (O) operational procedure, a restriction, or a placard the crew must observe.
 *
 * TL-16 — NOTE THE STATE PARAMETER. `melItems` is deliberately absent, so a live foreign-key join is
 * a compile error. This function does not merely *render* a signed record: it decides which
 * acknowledgements the PIC is REQUIRED to make, and its result is written into the signed briefing
 * (`acknowledgedDeferralIds`) and into the acknowledgement signature's hashed payload. It used to
 * test the live `MelItem.oProcedure`, so an edit to a MelItem could make a mandatory crew
 * acknowledgement appear — or, far worse, silently VANISH — on an already-signed briefing, while the
 * disclosure digest stayed identical because the change lay outside the disclosure. An adversarial
 * verifier proved both directions on 2026-07-26. The (O) procedure is now frozen onto the Deferral
 * at signing, alongside the rest of the MEL identity.
 *
 * A row predating that snapshot reads `melOProcedure === undefined`, treated as "no (O) procedure" —
 * the restriction and placard limbs still apply, and a briefing whose disclosure was never
 * snapshotted is separately barred from acceptance by the gate in `BriefingPanel`.
 */
export function deferralsRequiringAck(
  aircraftId: string,
  state: Pick<TechLogState, 'deferrals'>,
  _asOfUtc: string,
): Deferral[] {
  return currentRows(state.deferrals)
    .filter(d => d.aircraftId === aircraftId && d.status === 'ACTIVE')
    .filter(d => Boolean(d.restrictionText || d.placardRequired || d.melOProcedure));
}

/**
 * Dispatch acceptance gate (design §A): a RED aircraft cannot be accepted.
 *
 * LG-143 — nor can a PROVISIONAL one, and that limb is not a refinement of the RED test: it sits
 * outside the serviceability projection entirely. `deriveServiceability` has no notion of
 * `isProvisional`, so the G800 in onboarding — no defects, D195 MEL still PENDING_FSDO — read GREEN
 * and passed this gate. The PIC was shown "Serviceable — no open items" and could sign acceptance,
 * freezing `serviceability: 'GREEN'` into the signed FlightBriefing disclosure for an aircraft
 * whose MEL the FSDO has not approved. Bryan ruled block-outright on 2026-07-31: myGFO has no
 * dispatch answer for a tail in onboarding, and absence of an answer is never a green light.
 */
export function canAcceptDispatch(
  aircraftId: string,
  state: Parameters<typeof deriveServiceability>[1],
  asOfUtc: string,
): { ok: boolean; reason?: string } {
  if (state.aircraft.find(a => a.id === aircraftId)?.isProvisional) {
    return { ok: false, reason: 'Aircraft is in onboarding — its D195 MEL is pending FSDO approval, so dispatch cannot be accepted against it.' };
  }
  if (deriveServiceability(aircraftId, state, asOfUtc).status === 'RED') {
    return { ok: false, reason: 'Aircraft is RED — resolve or defer the grounding item before acceptance (a special flight permit is out of scope).' };
  }
  return { ok: true };
}
