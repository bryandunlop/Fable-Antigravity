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
