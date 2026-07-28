// Four-eyes reference-data approval (CLAUDE.md SE-2): updatable reference tables (Aircraft, Personnel,
// MelItem) require a proposer + a SEPARATE approver before a change takes effect. Pure + unit-tested;
// the reducer in TechLogContext.tsx is the sole caller and the final authority — pages never apply
// these mutations directly, only PROPOSE_CHANGE.
import type { Aircraft, MelItem, Personnel, PendingApproval } from '../types';

/** A proposer may never decide their own proposal — checked here as defense-in-depth even though the
 * UI already hides the approve/reject buttons for the proposer (never trust a single call site). */
export function isSelfApproval(pending: PendingApproval, decidedByOid: string): boolean {
  return pending.proposedByOid === decidedByOid;
}

/**
 * A deferral may only be written against an MEL item the FAA has actually approved. An item still
 * in DRAFT or awaiting FSDO sign-off — the G800 provisional case — carries no dispatch relief, so
 * deferring against it produces a record asserting authority that does not exist.
 *
 * This existed only as a filter on the MEL picker in `DeferralCreatePanel`, which is not a control:
 * it shapes what the UI offers and does nothing about a payload that arrives by any other path.
 * Same reasoning as `isSelfApproval` above — never trust a single call site.
 *
 * In production this check belongs at the API and must return 409/422; the UI filter and this guard
 * are the friendly error paths in front of it, not a substitute for it.
 */
export function validateMelDeferrable(mel: Pick<MelItem, 'approvalState' | 'subItemNumber'>): { ok: boolean; error?: string } {
  if (mel.approvalState === 'APPROVED') return { ok: true };
  if (mel.approvalState === 'SUPERSEDED') {
    return { ok: false, error: `MEL ${mel.subItemNumber} has been superseded by a later revision — defer against the current item.` };
  }
  return {
    ok: false,
    error: `MEL ${mel.subItemNumber} is ${mel.approvalState === 'DRAFT' ? 'still in draft' : 'awaiting FSDO approval'} and cannot be used for a deferral.`,
  };
}

export interface ReferenceTables {
  aircraft: Aircraft[];
  personnel: Personnel[];
  melItems: MelItem[];
}

/** Applies an APPROVED pending change to the reference tables. Caller must have already rejected
 * self-approval via isSelfApproval before calling this. */
export function applyApproval(tables: ReferenceTables, pending: PendingApproval): ReferenceTables {
  switch (pending.kind) {
    case 'AIRCRAFT_EDIT':
      return { ...tables, aircraft: tables.aircraft.map(a => (a.id === pending.after.id ? pending.after : a)) };
    case 'PERSONNEL_EDIT':
      return { ...tables, personnel: tables.personnel.map(p => (p.oid === pending.after.oid ? pending.after : p)) };
    case 'MEL_TYPE_ACTIVATION': {
      const idSet = new Set(pending.melItemIds);
      return {
        ...tables,
        aircraft: tables.aircraft.map(a => (a.id === pending.aircraftId ? { ...a, isProvisional: false, status: 'ACTIVE' } : a)),
        melItems: tables.melItems.map(m => (idSet.has(m.id) ? { ...m, approvalState: 'APPROVED' } : m)),
      };
    }
    case 'MEL_ITEM_APPROVAL':
      return { ...tables, melItems: tables.melItems.map(m => (m.id === pending.melItemId ? { ...m, approvalState: 'APPROVED' } : m)) };
  }
}
