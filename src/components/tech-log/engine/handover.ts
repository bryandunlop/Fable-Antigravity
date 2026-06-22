import type { TechLogState, Deferral } from '../types';
import { currentRows } from './supersede';
import { deriveServiceability } from './serviceability';

/**
 * The ACTIVE deferrals the PIC must acknowledge item-by-item before accepting (design §A):
 * those carrying an (O) operational procedure, a restriction, or a placard the crew must observe.
 */
export function deferralsRequiringAck(
  aircraftId: string,
  state: Pick<TechLogState, 'deferrals' | 'melItems'>,
  _asOfUtc: string,
): Deferral[] {
  return currentRows(state.deferrals)
    .filter(d => d.aircraftId === aircraftId && d.status === 'ACTIVE')
    .filter(d => {
      const mel = state.melItems.find(m => m.id === d.melItemId);
      return Boolean(d.restrictionText || d.placardRequired || mel?.oProcedure);
    });
}

/** Dispatch acceptance gate (design §A): a RED aircraft cannot be accepted. */
export function canAcceptDispatch(
  aircraftId: string,
  state: Parameters<typeof deriveServiceability>[1],
  asOfUtc: string,
): { ok: boolean; reason?: string } {
  if (deriveServiceability(aircraftId, state, asOfUtc).status === 'RED') {
    return { ok: false, reason: 'Aircraft is RED — resolve or defer the grounding item before acceptance (a special flight permit is out of scope).' };
  }
  return { ok: true };
}
