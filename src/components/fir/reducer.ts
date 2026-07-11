import type { FirImpact, FirState, FirTimelineEntry, FlightIrregularityReport, PerspectiveStatement } from './types';

export type FirAction =
  | { type: 'OPEN_FIR'; payload: { fir: FlightIrregularityReport } }
  | { type: 'ADD_MANUAL_ENTRY'; payload: { firId: string; entry: FirTimelineEntry } }
  | {
      type: 'REASSIGN_OWNER';
      payload: { firId: string; newOwnerOid: string; newOwnerName?: string; byOid: string; byName?: string; atUtc: string };
    }
  | { type: 'REQUEST_STATEMENT'; payload: { firId: string; statement: PerspectiveStatement } }
  | { type: 'SUBMIT_STATEMENT'; payload: { firId: string; statementId: string; text: string; atUtc: string } }
  | { type: 'DECLINE_STATEMENT'; payload: { firId: string; statementId: string; reason?: string; atUtc: string } }
  | { type: 'UPDATE_NARRATIVE'; payload: { firId: string; narrative: string } }
  | { type: 'UPDATE_IMPACT'; payload: { firId: string; impact: FirImpact } }
  | { type: 'RESET_STATE'; payload: FirState };

/** Slice-2 assembly actions all happen while OPEN. Returns the FIR if editable, else null. */
function openFir(state: FirState, firId: string): FlightIrregularityReport | null {
  const fir = state.firs.find(f => f.id === firId);
  if (!fir) {
    warnNoop(`no FIR ${firId}`);
    return null;
  }
  if (fir.status !== 'OPEN') {
    warnNoop(`FIR ${fir.ref} is ${fir.status} — assembly happens in OPEN`);
    return null;
  }
  return fir;
}

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
    case 'REQUEST_STATEMENT': {
      const { firId, statement } = action.payload;
      const fir = openFir(state, firId);
      if (!fir) return state;
      // One live ask per person: don't re-request someone with a pending/answered
      // request (a declined request may be re-issued).
      if (fir.statements.some(s => s.requestedOfOid === statement.requestedOfOid && s.status !== 'DECLINED')) {
        warnNoop(`${statement.requestedOfOid} already has a live statement request on ${fir.ref}`);
        return state;
      }
      if (fir.statements.some(s => s.id === statement.id)) return state;
      const requested: PerspectiveStatement = { ...statement, status: 'REQUESTED' };
      return {
        ...state,
        firs: state.firs.map(f => (f.id === firId ? { ...f, statements: [...f.statements, requested] } : f)),
      };
    }
    case 'SUBMIT_STATEMENT':
    case 'DECLINE_STATEMENT': {
      const { firId, statementId, atUtc } = action.payload;
      const fir = openFir(state, firId);
      if (!fir) return state;
      const stmt = fir.statements.find(s => s.id === statementId);
      if (!stmt || stmt.status !== 'REQUESTED') {
        warnNoop(`statement ${statementId} is not awaiting a response`);
        return state;
      }
      const responded: PerspectiveStatement =
        action.type === 'SUBMIT_STATEMENT'
          ? { ...stmt, status: 'SUBMITTED', text: action.payload.text, respondedAtUtc: atUtc }
          : { ...stmt, status: 'DECLINED', declineReason: action.payload.reason, respondedAtUtc: atUtc };
      return {
        ...state,
        firs: state.firs.map(f =>
          f.id === firId ? { ...f, statements: f.statements.map(s => (s.id === statementId ? responded : s)) } : f,
        ),
      };
    }
    case 'UPDATE_NARRATIVE': {
      const { firId, narrative } = action.payload;
      if (!openFir(state, firId)) return state;
      return { ...state, firs: state.firs.map(f => (f.id === firId ? { ...f, narrative } : f)) };
    }
    case 'UPDATE_IMPACT': {
      const { firId, impact } = action.payload;
      if (!openFir(state, firId)) return state;
      return { ...state, firs: state.firs.map(f => (f.id === firId ? { ...f, impact } : f)) };
    }
    case 'RESET_STATE':
      return action.payload;
    default:
      return state;
  }
}
