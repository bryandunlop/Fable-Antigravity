// Four-eyes reference-data approval (CLAUDE.md SE-2): updatable reference tables (Aircraft, Personnel,
// MelItem) require a proposer + a SEPARATE approver before a change takes effect. Pure + unit-tested;
// the reducer in TechLogContext.tsx is the sole caller and the final authority — pages never apply
// these mutations directly, only PROPOSE_CHANGE.
import type { Aircraft, MelItem, Personnel, PendingApproval } from '../types';
import { applyMelImport } from './melImport/apply';

/** A proposer may never decide their own proposal — checked here as defense-in-depth even though the
 * UI already hides the approve/reject buttons for the proposer (never trust a single call site). */
export function isSelfApproval(pending: PendingApproval, decidedByOid: string): boolean {
  return pending.proposedByOid === decidedByOid;
}

/**
 * WHO may decide — D23. Blocking self-approval was never enough on its own: these proposals set
 * `apCertificateNumber`, `riiAuthorizedAta`, `isProvisional` and `approvalState`, and whoever can
 * approve one can defeat the CRS-cert gate, the RII-authorisation check and the provisional-MEL
 * block. Any second pair of eyes is not a second pair of *qualified* eyes.
 *
 * The gate lived only in the panel's `user.role === 'MAINTENANCE'` check, which the panel itself
 * documents as convenience — so the reducer, the actual authority, admitted anyone.
 *
 * A decider must be a designated supervisor (DOM / Chief Inspector), the same `isSupervisor`
 * flag `canSupersede` already trusts for corrections against signed records.
 */
export function canDecideApproval(decider: Personnel | undefined): { ok: boolean; error?: string } {
  if (!decider) {
    return { ok: false, error: 'The approver is not on file as personnel.' };
  }
  if (!decider.isSupervisor) {
    return {
      ok: false,
      error: 'Only a designated supervisor (DOM / Chief Inspector) may approve a reference-data change.',
    };
  }
  return { ok: true };
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
    // D95 — a whole approved D195 revision. The payload was frozen when the document was
    // attested; nothing is re-derived here, so the approver's signature and what gets
    // written cannot drift apart.
    case 'MEL_REVISION_IMPORT':
      return {
        ...tables,
        melItems: applyMelImport({
          melItems: tables.melItems,
          aircraftType: pending.aircraftType,
          sections: pending.sections,
          payload: {
            added: pending.added,
            changed: pending.changed,
            removedIds: pending.removedIds,
            unchangedCount: pending.unchangedCount,
            stamps: pending.stamps,
          },
        }),
      };
  }
}
