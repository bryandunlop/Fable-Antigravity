import type { FirState, FirTimelineEntry, FlightIrregularityReport } from './types';

export type FirAction =
  | { type: 'OPEN_FIR'; payload: { fir: FlightIrregularityReport } }
  | { type: 'ADD_MANUAL_ENTRY'; payload: { firId: string; entry: FirTimelineEntry } }
  | {
      type: 'REASSIGN_OWNER';
      payload: { firId: string; newOwnerOid: string; newOwnerName?: string; byOid: string; byName?: string; atUtc: string };
    }
  | { type: 'RESET_STATE'; payload: FirState };

function warnNoop(reason: string): void {
  if (typeof console !== 'undefined') console.warn(`[fir] action rejected: ${reason}`);
}

export function firReducer(state: FirState, action: FirAction): FirState {
  switch (action.type) {
    case 'OPEN_FIR': {
      const { fir } = action.payload;
      if (state.firs.some(f => f.id === fir.id)) {
        warnNoop(`FIR ${fir.id} already exists`);
        return state;
      }
      return { ...state, firs: [fir, ...state.firs] };
    }
    case 'ADD_MANUAL_ENTRY': {
      const { firId, entry } = action.payload;
      const fir = state.firs.find(f => f.id === firId);
      if (!fir) {
        warnNoop(`no FIR ${firId}`);
        return state;
      }
      if (fir.status !== 'OPEN') {
        warnNoop(`FIR ${fir.ref} is ${fir.status} — assembly happens in OPEN`);
        return state;
      }
      // SYSTEM entries are derived at render, never stored (§5).
      const manual: FirTimelineEntry = { ...entry, source: 'MANUAL' };
      return {
        ...state,
        firs: state.firs.map(f => (f.id === firId ? { ...f, manualTimeline: [...f.manualTimeline, manual] } : f)),
      };
    }
    case 'REASSIGN_OWNER': {
      const p = action.payload;
      const fir = state.firs.find(f => f.id === p.firId);
      if (!fir || fir.ownerOid === p.newOwnerOid) return state;
      return {
        ...state,
        firs: state.firs.map(f =>
          f.id === p.firId
            ? {
                ...f,
                ownerOid: p.newOwnerOid,
                ownerName: p.newOwnerName,
                audit: [
                  ...f.audit,
                  {
                    kind: 'OWNER_REASSIGNED' as const,
                    atUtc: p.atUtc,
                    byOid: p.byOid,
                    byName: p.byName,
                    detail: `Owner reassigned to ${p.newOwnerName ?? p.newOwnerOid}`,
                  },
                ],
              }
            : f,
        ),
      };
    }
    case 'RESET_STATE':
      return action.payload;
    default:
      return state;
  }
}
