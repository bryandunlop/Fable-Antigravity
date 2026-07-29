import type { Attachment, CrewActionCompliance, Deferral, MelItem, Personnel } from '../types';

/**
 * D59 — the crew-action compliance gate on MEL deferrals.
 *
 * The authority model this file encodes, in one paragraph, because getting it wrong authorizes an
 * illegal dispatch:
 *
 *   1. Maintenance defers a discrepancy under the MEL.
 *   2. If the deferral carries a CREW ACTION — the MEL's (O) procedure — the instructions go to the
 *      crew: the snapshotted (O) text plus an optional maintenance addendum.
 *   3. ANY pilot OR maintenance user marks it complied. On the road the pilots perform it; at base
 *      it is often maintenance. Either may mark. Optional photos, digests folded into the signed
 *      payload (D18). No step-up (D26).
 *   4. THAT MARK IS EVIDENCE, NOT AUTHORITY. It flips no state (D16: regulatory state is never
 *      client/crew-decided; D17: pilots do not self-certify airworthiness).
 *   5. Maintenance reviews and signs the EXISTING gating-discharge release, which alone flips
 *      PENDING_PLACARD → ACTIVE (D15's two-sign-off model, untouched).
 *
 * The same person may both mark complied and sign the release: an (O) action performed by
 * maintenance and then released by maintenance is normal work, not an RII inspection, so the RII
 * performer/inspector separation rule does NOT apply here.
 */

/**
 * Is a crew action required on a deferral raised against this MEL item?
 *
 * Provenance matters: the flag is AUTHORED on the MEL item by the DOM or Chief Inspector at MEL
 * entry (D59 second pass) — it is not a per-deferral judgement by line maintenance. An authored
 * `false` therefore wins over the mere presence of (O) text: the DOM has looked at the item and
 * said no crew action is required.
 *
 * Only the ABSENT case falls back to `Boolean(oProcedure)`. That covers the 984 auto-extracted seed
 * items and any row predating the column, and it errs toward gating — the safe direction.
 */
export function crewActionRequiredForMelItem(mel: Pick<MelItem, 'crewActionRequired' | 'oProcedure'>): boolean {
  if (typeof mel.crewActionRequired === 'boolean') return mel.crewActionRequired;
  return Boolean(mel.oProcedure?.trim());
}

/**
 * The add-only override at the deferral. Line maintenance may ADD a crew-action requirement to a
 * deferral whose MEL item lacks the flag; it may NEVER remove an inherited one — a wrongly-flagged
 * item is corrected through MEL management (D23 four-eyes), not by an unlogged click on one
 * deferral. `overrideRejected` lets the caller say so out loud rather than silently ignoring it.
 */
export function resolveDeferralCrewAction(
  inherited: boolean,
  requested: boolean,
): { crewActionRequired: boolean; overrideRejected: boolean } {
  if (inherited) return { crewActionRequired: true, overrideRejected: requested === false };
  return { crewActionRequired: requested, overrideRejected: false };
}

/**
 * D59 — no new deferral status. A deferral enters PENDING_PLACARD when ANY of the three
 * before-first-flight obligations is outstanding. This closes a real hole: before D59 a deferral
 * whose only requirement was an (O) procedure went straight to ACTIVE, untouched, so the aircraft
 * was dispatchable with a mandatory crew action nobody had done. Serviceability is unchanged —
 * PENDING_PLACARD already contributes RED.
 */
export function entersPendingPlacard(
  d: Pick<Deferral, 'mProcedureRequired' | 'placardRequired' | 'crewActionRequired'>,
): boolean {
  return Boolean(d.mProcedureRequired || d.placardRequired || d.crewActionRequired);
}

/** A required crew action with no compliance record yet. */
export function crewActionPending(d: Pick<Deferral, 'crewActionRequired' | 'crewActionCompliance'>): boolean {
  return Boolean(d.crewActionRequired) && !d.crewActionCompliance;
}

/** The release-gate limb: satisfied when no crew action is required, or one has been marked. */
export function crewActionSatisfied(d: Pick<Deferral, 'crewActionRequired' | 'crewActionCompliance'>): boolean {
  return !crewActionPending(d);
}

/**
 * Who may mark the action complied: **any pilot or maintenance user**. Bryan, 2026-07-28: "if its
 * on the road the pilots do it but mx is the real and only sign off." No authorization tier and no
 * step-up, because the mark carries no authority — it is a statement that the action was done, and
 * maintenance's signature on the gating release is what acts on it.
 *
 * `person` is taken deliberately: it keeps the "any role" decision stated in one place instead of
 * implied by its absence, and gives the deactivated-account limb somewhere to live.
 */
export function canMarkCrewAction(
  person: Personnel,
  d: Pick<Deferral, 'status' | 'crewActionRequired' | 'crewActionCompliance'>,
): boolean {
  if (person.active === false) return false;
  return crewActionPending(d);
}

/**
 * Builds the SUPERSEDING deferral row that carries the complied mark. Pure — the caller supplies
 * the ids, the clock and the frozen signer name, so this stays testable and so the freeze-at-mark
 * discipline (TL-16) is visible at the call site.
 *
 * Note what it does NOT do: it does not touch `status`, and it does not set `gatingReleaseId`. That
 * is the whole point of D59 §3 — the mark is evidence. Only the gating-discharge release flips the
 * deferral to ACTIVE.
 */
export function markCrewActionComplied(
  deferral: Deferral,
  input: {
    rowId: string;                    // id of the new (superseding) Deferral row
    complianceId: string;             // id of the compliance record itself
    byOid: string;
    byName: string;                   // frozen here, never re-joined from Personnel (TL-16)
    atUtc: string;
    note?: string;
    attachments?: Attachment[];
    signatureId: string;
    supersedesComplianceId?: string;  // set when correcting a mistaken mark
  },
): Deferral {
  const compliance: CrewActionCompliance = {
    id: input.complianceId,
    byOid: input.byOid,
    byName: input.byName,
    atUtc: input.atUtc,
    note: input.note,
    attachments: input.attachments?.length ? input.attachments : undefined,
    signatureId: input.signatureId,
    supersedesId: input.supersedesComplianceId,
  };
  return { ...deferral, id: input.rowId, supersedesId: deferral.id, crewActionCompliance: compliance };
}

/** The attachment digests folded into the mark's signed payload (D18) — same shape the defect
 *  report form uses, so a photo cannot be swapped after the fact without invalidating the hash. */
export function crewActionPayloadExtra(attachments: Attachment[]): string | undefined {
  return attachments.length ? attachments.map(a => a.sha256).join(',') : undefined;
}
