import type { Deferral, Defect, WorkCard } from '../types';
import { createRectificationCard } from './rectification';

export type FixFromDeferralPlan =
  | { kind: 'CREATE'; card: WorkCard }
  | { kind: 'OPEN_EXISTING'; cardId: string }
  | { kind: 'NO_DEFECT' };

/**
 * Decide how to start the fix for a deferred item: raise a corrective work card against the
 * deferral's underlying defect, or — if a non-completed card already covers that defect — open the
 * existing card instead of creating a duplicate. Pass `currentRows(state.defects)` for `defects`
 * (the caller resolves supersede chains). Pure, so the dedup + defect/deferral linkage is
 * unit-tested. Raising the card never touches the deferral; the completion sign-off later rectifies
 * the defect and clears the deferral through the existing `linkedDefectId` chain (WorkCardDetail).
 */
export function planFixFromDeferral(
  deferral: Deferral,
  defects: Defect[],
  workCards: WorkCard[],
  ids: { cardId: string },
  nowUtc: string,
): FixFromDeferralPlan {
  const defect = defects.find(d => d.id === deferral.defectId);
  if (!defect) return { kind: 'NO_DEFECT' };
  const existing = workCards.find(w => w.linkedDefectId === defect.id && w.status !== 'COMPLETED');
  if (existing) return { kind: 'OPEN_EXISTING', cardId: existing.id };
  const card = createRectificationCard(defect, ids, nowUtc, deferral.id);
  return { kind: 'CREATE', card };
}
