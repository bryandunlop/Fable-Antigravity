// Per-step RII (Required Inspection Item) helpers. A step flagged riiRequired must carry an
// INDEPENDENT inspector signature (performer/inspector separation is enforced at signing by
// engine/signing.validateRii). A work card cannot be completed/returned-to-service until every
// RII step is inspector-signed. Pure + unit-tested.
import type { WorkStep } from '../types';

export function riiSteps(steps: WorkStep[]): WorkStep[] {
  return steps.filter(s => s.riiRequired);
}

/** RII steps that still need an independent inspector signature. */
export function pendingRiiSteps(steps: WorkStep[]): WorkStep[] {
  return steps.filter(s => s.riiRequired && !s.riiSignatureId);
}

/** True when every RII-flagged step has been independently inspector-signed. */
export function riiStepsComplete(steps: WorkStep[]): boolean {
  return pendingRiiSteps(steps).length === 0;
}
