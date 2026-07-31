import type { Deferral } from '../types';
import { crewActionPending } from './crewAction';

/**
 * LG-170 — what a `PENDING_PLACARD` deferral is actually waiting for, in words.
 *
 * The surfaces used to render the bare enum: a red badge reading `PENDING_PLACARD`. That is a state
 * name, not an instruction, and it sits on the single most expensive misunderstanding available in
 * this product — a deferral can be **signed** and the aircraft still **grounded**, because where the
 * MEL item carries a placard or an (M) procedure a second, separate MaintenanceRelease must be signed
 * before the deferral becomes ACTIVE (see the CLAUDE.md NEVER rule and §15).
 *
 * Every word this returns is read from the FROZEN deferral row — `placardLocation`,
 * `placardRequired`, `mProcedureRequired`, `crewActionRequired` were all snapshotted at signing
 * precisely so a later `EDIT_MEL_ITEM` cannot repaint a signed record. Nothing here may resolve
 * through `melItemId`, and nothing here may read the clock.
 *
 * This is presentation only. It does NOT decide the gate — `engine/crewAction.ts` and the release
 * flow own that — and it must never be used to weaken the RED serviceability claim: an aircraft in
 * this state is grounded, and the copy says so.
 */
export interface PendingPlacardStep {
  /** The imperative, e.g. "Install the placard, then sign the release". */
  action: string;
  /** Where, when the signed row recorded it. Omitted rather than guessed. */
  where?: string;
  /** Always true while PENDING_PLACARD — stated so no caller has to infer it. */
  stillGrounded: true;
}

export function pendingPlacardStep(d: Deferral): PendingPlacardStep | null {
  if (d.status !== 'PENDING_PLACARD') return null;

  // D59 — the crew action gates the discharge release, so when it is outstanding it is genuinely the
  // NEXT step and naming the placard first would send a technician to the wrong job.
  if (crewActionPending(d)) {
    return {
      action: 'Mark the crew action complied, then sign the release',
      stillGrounded: true,
    };
  }

  const needsPlacard = d.placardRequired && !d.placardInstalled;

  if (needsPlacard && d.mProcedureRequired) {
    return {
      action: 'Install the placard and complete the (M) procedure, then sign the release',
      where: d.placardLocation,
      stillGrounded: true,
    };
  }
  if (needsPlacard) {
    return {
      action: 'Install the placard, then sign the release',
      where: d.placardLocation,
      stillGrounded: true,
    };
  }
  if (d.mProcedureRequired) {
    return {
      action: 'Complete the (M) procedure, then sign the release',
      stillGrounded: true,
    };
  }

  // PENDING_PLACARD with nothing named outstanding: the release itself is the remaining act. Say that
  // rather than falling back to the enum, which is the behaviour this module exists to remove.
  return { action: 'Sign the (M) / placard release', stillGrounded: true };
}
