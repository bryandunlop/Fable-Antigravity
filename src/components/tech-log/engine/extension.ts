import type { Deferral, Personnel } from '../types';
import { canSupersede, type SupersedeAuth } from './authz';
import { computeRepairDue } from './pl25';

/** A keyed justification must say something real — not a placeholder tap-through. */
const MIN_JUSTIFICATION_CHARS = 10;

export interface ExtensionValidation {
  ok: boolean;
  error?: string;
  auth?: SupersedeAuth;
}

/**
 * One-tap extension, fully rails-guarded (TL-1 / DOM 2026-07-09): Cat B/C only, once-only,
 * substantive keyed justification, and SE-1 supersede authorization — the corrector must be the
 * original deferral signer or a designated supervisor (third-party, relationship recorded).
 */
export function validateExtension(d: Deferral, corrector: Personnel, justification: string): ExtensionValidation {
  if (d.category === 'A' || d.category === 'D') {
    return { ok: false, error: `Cat ${d.category} deferrals can never be extended (PL-25).` };
  }
  if (d.extensionUsed) {
    return { ok: false, error: 'This deferral has already used its one extension.' };
  }
  if (justification.trim().length < MIN_JUSTIFICATION_CHARS) {
    return { ok: false, error: 'A substantive justification is required to extend (why the repair cannot be completed in the original interval).' };
  }
  const auth = canSupersede(d.signedByOid, corrector);
  if (!auth.ok) {
    return { ok: false, error: auth.error, auth };
  }
  return { ok: true, auth };
}

export interface BuiltExtension {
  row: Deferral;
  auditSummary: string;
}

/**
 * Builds the superseding extension row. Assumes validateExtension passed. The extension is for
 * EQUAL duration in the deferral's own repair-interval unit (D24 — never a hardcoded calendar-day):
 * calendar units recompute the due date from clock start with the doubled interval; usage units
 * advance the existing threshold by the original interval value.
 *
 * The row carries a FRESH signature id (from the extension sign ceremony) and the corrector as
 * signer — a superseding row whose content changed must never reuse the original signature.
 */
export function buildExtension(
  d: Deferral,
  corrector: Personnel,
  justification: string,
  nowUtc: string,
  ids: { rowId: string; signatureId: string },
): BuiltExtension {
  const auth = canSupersede(d.signedByOid, corrector);
  const doubled = d.repairIntervalValue * 2;

  let repairDueDateUtc = d.repairDueDateUtc;
  let usageDueThreshold = d.usageDueThreshold;
  // A clockless deferral (NEF, D69) has neither a due date nor a usage threshold, so both branches
  // fall through and there is nothing to extend — which is correct: you cannot extend an interval
  // that was never running. The `canExtend` gate above already refuses it.
  if (d.repairDueDateUtc && d.category) {
    repairDueDateUtc = computeRepairDue(
      d.category, d.clockStartDateUtc,
      { repairIntervalUnit: d.repairIntervalUnit, repairIntervalValue: doubled },
      { hours: 0, cycles: 0 }, // calendar path ignores airframe
      d.governingTimezone, // D24: recompute in the deferral's own governing zone, not the default
    ).repairDueDateUtc;
  } else if (d.usageDueThreshold != null) {
    usageDueThreshold = d.usageDueThreshold + d.repairIntervalValue;
  }

  const row: Deferral = {
    ...d,
    id: ids.rowId,
    supersedesId: d.id,
    extensionUsed: true,
    extensionTsUtc: nowUtc,
    extensionJustification: justification.trim(),
    repairIntervalValue: doubled,
    repairDueDateUtc,
    usageDueThreshold,
    signedByOid: corrector.oid,
    signatureId: ids.signatureId,
  };

  const thirdParty = auth.thirdParty ? ` — third-party extension by ${auth.relationship ?? corrector.role}` : '';
  const newDue = repairDueDateUtc
    ? `due ${new Date(repairDueDateUtc).toISOString().slice(0, 10)}`
    : `due at ${usageDueThreshold} ${d.repairIntervalUnit === 'HOUR' ? 'h' : 'cyc'}`;
  return {
    row,
    auditSummary: `Cat ${d.category} deferral extended once (equal duration, ${newDue}): ${justification.trim()}${thirdParty}`,
  };
}
