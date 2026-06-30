import { newId } from '../util/id';
import type { AuditEntry, SupersedeConflict, SupersedeEntityType } from '../types';

export function currentRows<T extends { id: string; supersedesId?: string }>(rows: T[]): T[] {
  const superseded = new Set(rows.map(r => r.supersedesId).filter(Boolean) as string[]);
  return rows.filter(r => !superseded.has(r.id));
}

export function latestFor<T extends { id: string; supersedesId?: string }>(
  rows: T[],
  originId: string,
): T | undefined {
  const byId = new Map(rows.map(r => [r.id, r]));
  for (const head of currentRows(rows)) {
    let cur: T | undefined = head;
    while (cur) {
      if (cur.id === originId) return head;
      cur = cur.supersedesId ? byId.get(cur.supersedesId) : undefined;
    }
  }
  return byId.get(originId);
}

/** True once `supersedesId` already has a superseding row — inserting a second row pointing at the
 * same parent would fork the chain (DM-2): two rows would both read as "current" for one entity. */
export function wouldFork<T extends { supersedesId?: string }>(rows: T[], supersedesId: string): boolean {
  return rows.some(r => r.supersedesId === supersedesId);
}

/** Builds the conflict + audit records for a rejected forked supersede. Pure — caller supplies the
 * clock value so this stays unit-testable without mocking Date. */
export function buildSupersedeConflict(
  entityType: SupersedeEntityType,
  attemptedRowId: string,
  supersedesId: string,
  actorOid: string,
  nowUtc: string,
): { conflict: SupersedeConflict; audit: AuditEntry } {
  return {
    conflict: { id: newId('cfl'), entityType, attemptedRowId, supersedesId, rejectedAtUtc: nowUtc, rejectedActorOid: actorOid },
    audit: {
      id: newId('aud'),
      actorOid,
      action: 'SUPERSEDE_CONFLICT_REJECTED',
      entityType,
      entityId: supersedesId,
      atUtc: nowUtc,
      summary: `Rejected forked correction on ${entityType} ${supersedesId} — already superseded. Routed to reconciliation.`,
    },
  };
}
