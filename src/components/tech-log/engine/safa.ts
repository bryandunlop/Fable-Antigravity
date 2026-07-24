// SAFA ramp-check readiness — pure derivations. The item DEFINITION is compliance-owned myGFO
// reference data (curated by Reg & Comp under four-eyes); the per-aircraft STATUS is a read-only view
// of CAMP. This module joins the two and gates who may edit the definition. Advisory only — SAFA never
// feeds the serviceability engine (EASA ramp-inspection readiness, not a US Part 91 dispatch gate).
import type { Personnel, SafaCheckItem, SafaCheckStatus } from '../types';

export type SafaRowStatus = 'READY' | 'DUE_SOON' | 'ACTION' | 'UNKNOWN';

export interface SafaReadinessRow {
  item: SafaCheckItem;
  status: SafaRowStatus;
  expiryUtc?: string;
  note?: string;
}

/** Only a Regulatory & Compliance user may curate the SAFA check definition. */
export function canEditSafaChecklist(user: Pick<Personnel, 'regComplianceAuthorized'>): boolean {
  return user.regComplianceAuthorized === true;
}

/** Join the active compliance-owned item definitions with the read-only CAMP status overlay (by code).
 * An item with no matching CAMP code reads UNKNOWN until CAMP provides a status. */
export function deriveSafaReadiness(items: SafaCheckItem[], campStatuses: SafaCheckStatus[]): SafaReadinessRow[] {
  const byCode = new Map(campStatuses.map(s => [s.code, s]));
  return items
    .filter(i => i.active)
    .map(item => {
      const s = byCode.get(item.code);
      return { item, status: (s?.status ?? 'UNKNOWN') as SafaRowStatus, expiryUtc: s?.expiryUtc, note: s?.note };
    });
}

/** Rows needing attention before an international leg (advisory — never a dispatch gate). */
export function safaAttentionRows(rows: SafaReadinessRow[]): SafaReadinessRow[] {
  return rows.filter(r => r.status === 'DUE_SOON' || r.status === 'ACTION');
}
