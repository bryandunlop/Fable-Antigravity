// RII (Required Inspection Item) helpers, at CARD level.
//
// D68 moved the gate here from `WorkStep`. Steps are gone — the procedure lives in the AMM and the
// card records which reference the tech worked to — so the per-step RII signature had nowhere left
// to attach. A card flagged `riiRequired` needs ONE independent inspector signature before it can
// be completed / returned to service.
//
// The separation rule itself is NOT here: `engine/signing.validateRii` enforces performer ≠
// inspector and the inspector's ATA authorization, and it runs inside the signing ceremony. These
// helpers answer only "is the gate satisfied", never "may this person satisfy it".
//
// Records signed before D68 carry their inspector signature on a step. They are immutable and must
// keep reading correctly, which is what `riiSatisfiedByLegacySteps` is for — it reads the old shape
// and nothing writes it.
import type { MaintenanceRelease, WorkCard } from '../types';

/** Does this card need an independent inspector signature at all? */
export function riiRequiredFor(card: Pick<WorkCard, 'riiRequired'>): boolean {
  return Boolean(card.riiRequired);
}

/**
 * Is the card's RII gate satisfied? `inspectorSignatureId` is the signature collected in the
 * completion ceremony — the gate is open only when the card needs no RII, or one exists.
 */
export function riiSatisfied(
  card: Pick<WorkCard, 'riiRequired'>,
  inspectorSignatureId?: string,
): boolean {
  return !riiRequiredFor(card) || Boolean(inspectorSignatureId);
}

/**
 * The inspector attribution on a release signed under the OLD per-step model. Reads
 * `card.steps[].riiSignatureId`, which no longer exists on the type — a pre-D68 stored card still
 * carries it, and a signed `MaintenanceRelease` points at that card by `linkedWorkCardId`.
 *
 * Never used to satisfy the gate for new work. It exists so a historic release still renders the
 * inspector who actually signed it, rather than silently reading blank.
 */
export function legacyStepRii(
  card: unknown,
): { riiInspectorOid?: string; riiSignatureId?: string } | null {
  const steps = (card as { steps?: unknown })?.steps;
  if (!Array.isArray(steps)) return null;
  const signed = steps.find(
    (s): s is { riiRequired?: boolean; riiInspectorOid?: string; riiSignatureId?: string } =>
      Boolean(s && typeof s === 'object' && (s as { riiRequired?: boolean }).riiRequired
        && (s as { riiSignatureId?: string }).riiSignatureId),
  );
  return signed
    ? { riiInspectorOid: signed.riiInspectorOid, riiSignatureId: signed.riiSignatureId }
    : null;
}

/** Did this release actually record an independent inspector? Used for rendering, not gating. */
export function releaseHasInspector(release: Pick<MaintenanceRelease, 'riiRequired' | 'riiSignatureId'>): boolean {
  return !release.riiRequired || Boolean(release.riiSignatureId);
}
