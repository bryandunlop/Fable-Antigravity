import type {
  FirImpact,
  FirImpactSnapshot,
  FirPublishedDraft,
  FirState,
  FirTimelineEntry,
  FlightIrregularityReport,
  PerspectiveStatement,
} from './types';
import {
  canReopen,
  canCloseInternal,
  nextRevision,
  validateApprove,
  validateRequestChanges,
  validateSubmitForReview,
} from './engine/lifecycle';

/** Payload common to the publish-lifecycle transitions (who acted, with what roles). */
interface Actor {
  firId: string;
  byOid: string;
  byName?: string;
  byRoles: string[];
  atUtc: string;
}

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
  | { type: 'UPDATE_PUBLISHED_DRAFT'; payload: { firId: string; draft: FirPublishedDraft } }
  | { type: 'SUBMIT_FOR_REVIEW'; payload: Omit<Actor, 'byRoles'> }
  /** D63 — the approver's UI computes the impact snapshot from live tech-log state at the instant
   *  of approval and hands it in. The reducer cannot derive it: FIR state has no tech-log slice,
   *  and "at the instant of approval" is the whole point of the freeze. */
  | { type: 'APPROVE_PUBLISH'; payload: Actor & { impactSnapshot?: FirImpactSnapshot } }
  | { type: 'REQUEST_CHANGES'; payload: Actor & { note: string } }
  | { type: 'CLOSE_INTERNAL'; payload: Actor }
  | { type: 'REOPEN_FIR'; payload: Actor }
  | { type: 'ACKNOWLEDGE_PUBLISHED'; payload: { firId: string; oid: string; initials: string; atUtc: string } }
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

/** Replace one FIR by id via a pure updater; no-op (same state) if not found. */
function mapFir(
  state: FirState,
  firId: string,
  fn: (fir: FlightIrregularityReport) => FlightIrregularityReport,
): FirState {
  if (!state.firs.some(f => f.id === firId)) return state;
  return { ...state, firs: state.firs.map(f => (f.id === firId ? fn(f) : f)) };
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
    case 'UPDATE_PUBLISHED_DRAFT': {
      // The curation working draft — editable only while OPEN (frozen once submitted).
      const { firId, draft } = action.payload;
      if (!openFir(state, firId)) return state;
      return mapFir(state, firId, f => ({ ...f, pendingPublished: draft }));
    }
    case 'SUBMIT_FOR_REVIEW': {
      const p = action.payload;
      const fir = state.firs.find(f => f.id === p.firId);
      if (!fir) return warnNoop(`no FIR ${p.firId}`), state;
      const check = validateSubmitForReview(fir);
      if (!check.ok) return warnNoop(check.error), state;
      return mapFir(state, p.firId, f => ({
        ...f,
        status: 'IN_REVIEW',
        reviewSubmittedByOid: p.byOid,
        audit: [...f.audit, { kind: 'SUBMITTED_FOR_REVIEW', atUtc: p.atUtc, byOid: p.byOid, byName: p.byName, detail: 'Submitted the published version for review' }],
      }));
    }
    case 'APPROVE_PUBLISH': {
      const p = action.payload;
      const fir = state.firs.find(f => f.id === p.firId);
      if (!fir) return warnNoop(`no FIR ${p.firId}`), state;
      const check = validateApprove(fir, p.byOid, p.byRoles);
      if (!check.ok) return warnNoop(check.error), state;
      const draft = fir.pendingPublished;
      if (!draft) return warnNoop('no pending draft to publish'), state;
      const revision = nextRevision(fir);
      return mapFir(state, p.firId, f => ({
        ...f,
        status: 'PUBLISHED',
        reviewSubmittedByOid: undefined,
        publishedRevision: {
          ...draft, revision, approvedByOid: p.byOid, publishedAtUtc: p.atUtc,
          impactSnapshot: p.impactSnapshot,
        },
        publishedAcks: [],
        audit: [...f.audit, { kind: 'PUBLISHED', atUtc: p.atUtc, byOid: p.byOid, byName: p.byName, detail: `Approved and published revision ${revision}` }],
      }));
    }
    case 'REQUEST_CHANGES': {
      const p = action.payload;
      const fir = state.firs.find(f => f.id === p.firId);
      if (!fir) return warnNoop(`no FIR ${p.firId}`), state;
      const check = validateRequestChanges(fir, p.byRoles, p.note);
      if (!check.ok) return warnNoop(check.error), state;
      // Back to OPEN; the draft is kept so the owner can revise it.
      return mapFir(state, p.firId, f => ({
        ...f,
        status: 'OPEN',
        reviewSubmittedByOid: undefined,
        audit: [...f.audit, { kind: 'CHANGES_REQUESTED', atUtc: p.atUtc, byOid: p.byOid, byName: p.byName, detail: p.note.trim() }],
      }));
    }
    case 'CLOSE_INTERNAL': {
      const p = action.payload;
      const fir = state.firs.find(f => f.id === p.firId);
      if (!fir) return warnNoop(`no FIR ${p.firId}`), state;
      if (!canCloseInternal(fir, { oid: p.byOid, roles: p.byRoles })) {
        return warnNoop('not authorized to close this FIR internally'), state;
      }
      return mapFir(state, p.firId, f => ({
        ...f,
        status: 'CLOSED_INTERNAL',
        audit: [...f.audit, { kind: 'CLOSED_INTERNAL', atUtc: p.atUtc, byOid: p.byOid, byName: p.byName, detail: 'Closed internal — not published company-wide' }],
      }));
    }
    case 'REOPEN_FIR': {
      const p = action.payload;
      const fir = state.firs.find(f => f.id === p.firId);
      if (!fir) return warnNoop(`no FIR ${p.firId}`), state;
      if (!canReopen(fir, p.byRoles)) return warnNoop('only leadership can reopen a published or closed FIR'), state;
      return mapFir(state, p.firId, f => ({
        ...f,
        status: 'OPEN',
        audit: [...f.audit, { kind: 'REOPENED', atUtc: p.atUtc, byOid: p.byOid, byName: p.byName, detail: 'Reopened for revision' }],
      }));
    }
    case 'ACKNOWLEDGE_PUBLISHED': {
      const { firId, oid, initials, atUtc } = action.payload;
      const fir = state.firs.find(f => f.id === firId);
      if (!fir) return warnNoop(`no FIR ${firId}`), state;
      if (fir.status !== 'PUBLISHED' || fir.publishedRevision?.ackLevel !== 'initials') {
        return warnNoop('this report does not request acknowledgement'), state;
      }
      if ((fir.publishedAcks ?? []).some(a => a.oid === oid)) return state; // idempotent
      return mapFir(state, firId, f => ({
        ...f,
        publishedAcks: [...(f.publishedAcks ?? []), { oid, initials: initials.trim().toUpperCase(), atUtc }],
      }));
    }
    case 'RESET_STATE':
      return action.payload;
    default:
      return state;
  }
}
