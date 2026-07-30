import React, { createContext, useContext, useEffect, useMemo, useReducer, useRef, useState, useCallback, ReactNode } from 'react';
import { toast } from 'sonner';
import type { TechLogState, TechLogAction, Personnel, AuditEntry, PendingApproval, SupersedeEntityType } from './types';
import { getDefaultState } from './mockData/scenarios';
import { SYSTEM_USERS } from '../../lib/mockUsers';
import { wouldFork, buildSupersedeConflict } from './engine/supersede';
import { canRecordPostflight } from './engine/custody';
import { isSelfApproval, applyApproval } from './engine/approvals';
import { newId } from './util/id';
import type { DisplayZoneMode } from './util/displayZone';
import { STORAGE_KEY, isDurableAction, loadPersistedState, persistState, type StorageLike } from './persistence';

// Persistence lives in ./persistence so the durability rules are testable in node (TL-26).
export { STORAGE_KEY, VERSION_KEY, DATA_VERSION } from './persistence';
const DISPLAY_ZONE_KEY = 'tech-log-display-zone'; // D24 UI preference, separate from domain state (survives demo reset)

const browserStorage = (): StorageLike | null => (typeof localStorage === 'undefined' ? null : localStorage);

function loadInitialState(): TechLogState {
  return loadPersistedState(browserStorage(), getDefaultState);
}

/** Defense-in-depth: every SUPERSEDE_* action funnels through here before being applied. If the
 * targeted parent already has a superseding row, the new row is rejected (not appended) and routed
 * to state.supersedeConflicts for human reconciliation (CLAUDE.md DM-2) instead of silently creating
 * a second "current" row for the same entity. Returns null when there is no fork (caller proceeds). */
function maybeRejectSupersede(
  state: TechLogState,
  existingRows: { id: string; supersedesId?: string }[],
  entityType: SupersedeEntityType,
  payload: { id: string; supersedesId?: string },
): TechLogState | null {
  if (!payload.supersedesId || !wouldFork(existingRows, payload.supersedesId)) return null;
  const { conflict, audit } = buildSupersedeConflict(entityType, payload.id, payload.supersedesId, state.currentUserOid, new Date().toISOString());
  return { ...state, supersedeConflicts: [conflict, ...state.supersedeConflicts], audit: [audit, ...state.audit].slice(0, 500) };
}

function reducer(state: TechLogState, action: TechLogAction): TechLogState {
  switch (action.type) {
    case 'ADD_DEFECT':
      return { ...state, defects: [...state.defects, action.payload] };
    case 'SUPERSEDE_DEFECT': {
      const rejected = maybeRejectSupersede(state, state.defects, 'Defect', action.payload);
      return rejected ?? { ...state, defects: [...state.defects, action.payload] };
    }
    case 'ADD_DEFERRAL':
      return { ...state, deferrals: [...state.deferrals, action.payload] };
    case 'SUPERSEDE_DEFERRAL': {
      const rejected = maybeRejectSupersede(state, state.deferrals, 'Deferral', action.payload);
      return rejected ?? { ...state, deferrals: [...state.deferrals, action.payload] };
    }
    case 'ADD_RELEASE':
      return { ...state, releases: [...state.releases, action.payload] };
    case 'ADD_FLIGHTLOG':
      return { ...state, flightLogs: [...state.flightLogs, action.payload] };
    case 'SUPERSEDE_FLIGHTLOG': {
      const rejected = maybeRejectSupersede(state, state.flightLogs, 'FlightLog', action.payload);
      return rejected ?? { ...state, flightLogs: [...state.flightLogs, action.payload] };
    }
    case 'ADD_SIGNATURE':
      return { ...state, signatures: [...state.signatures, action.payload] };
    case 'ADD_AUDIT':
      return { ...state, audit: [action.payload, ...state.audit].slice(0, 500) };
    case 'ADD_WORK_CARD':
      return { ...state, workCards: [...state.workCards, action.payload] };
    case 'EDIT_WORK_CARD':
      return { ...state, workCards: state.workCards.map(w => (w.id === action.payload.id ? action.payload : w)) };
    case 'ADD_PART_USAGE':
      return { ...state, partUsages: [...state.partUsages, action.payload] };
    case 'DELETE_PART_USAGE':
      return { ...state, partUsages: state.partUsages.filter(p => p.id !== action.payload) };
    case 'ADD_LABOR_ENTRY':
      return { ...state, laborEntries: [...state.laborEntries, action.payload] };
    case 'DELETE_LABOR_ENTRY':
      return { ...state, laborEntries: state.laborEntries.filter(l => l.id !== action.payload) };
    case 'ADD_PROJECT':
      return { ...state, projects: [...state.projects, action.payload] };
    case 'EDIT_PROJECT':
      return { ...state, projects: state.projects.map(p => (p.id === action.payload.id ? action.payload : p)) };
    case 'ADD_RECURRING_CHECK':
      return { ...state, recurringChecks: [...state.recurringChecks, action.payload] };
    case 'EDIT_RECURRING_CHECK':
      return { ...state, recurringChecks: state.recurringChecks.map(c => (c.id === action.payload.id ? action.payload : c)) };
    case 'ADD_RECURRING_ACCOMPLISHMENT':
      return { ...state, recurringAccomplishments: [...state.recurringAccomplishments, action.payload] };
    case 'ADD_INTERMITTENT_FAULT':
      return { ...state, intermittentFaults: [...state.intermittentFaults, action.payload] };
    case 'EDIT_INTERMITTENT_FAULT':
      return { ...state, intermittentFaults: state.intermittentFaults.map(f => (f.id === action.payload.id ? action.payload : f)) };
    case 'ADD_INTERMITTENT_OCCURRENCE':
      return { ...state, intermittentOccurrences: [...state.intermittentOccurrences, action.payload] };
    case 'ADD_TRIP':
      return { ...state, trips: [...state.trips, action.payload] };
    case 'EDIT_TRIP':
      return { ...state, trips: state.trips.map(t => (t.id === action.payload.id ? action.payload : t)) };
    case 'ADD_BRIEFING':
      return { ...state, briefings: [...state.briefings, action.payload] };
    case 'EDIT_BRIEFING':
      return { ...state, briefings: state.briefings.map(b => (b.id === action.payload.id ? action.payload : b)) };
    case 'ADD_POSTFLIGHT': {
      // Defense-in-depth: reject a reclaim recorded while custody isn't actually WITH_CREW (stale
      // UI, retried dispatch, second device) instead of silently accepting an out-of-order reclaim.
      const gate = canRecordPostflight(action.payload.aircraftId, state, action.payload.performedAtUtc);
      if (!gate.ok) {
        const audit = {
          id: `aud-${action.payload.id}-rejected`, actorOid: action.payload.performedByOid, action: 'POSTFLIGHT_REJECTED_CUSTODY' as const,
          entityType: 'Postflight' as const, entityId: action.payload.aircraftId, atUtc: action.payload.performedAtUtc,
          summary: `Rejected postflight on ${action.payload.aircraftId}: ${gate.reason}`,
        };
        return { ...state, audit: [audit, ...state.audit].slice(0, 500) };
      }
      return { ...state, postflights: [...state.postflights, action.payload] };
    }
    case 'SUPERSEDE_POSTFLIGHT': {
      const rejected = maybeRejectSupersede(state, state.postflights, 'Postflight', action.payload);
      return rejected ?? { ...state, postflights: [...state.postflights, action.payload] };
    }
    case 'ADD_CHECKLIST_TEMPLATE':
      return { ...state, checklistTemplates: [...state.checklistTemplates, action.payload] };
    case 'ADD_CHECKLIST_INSTANCE':
      return { ...state, checklistInstances: [...state.checklistInstances, action.payload] };
    case 'EDIT_CHECKLIST_INSTANCE':
      return { ...state, checklistInstances: state.checklistInstances.map(i => (i.id === action.payload.id ? action.payload : i)) };
    case 'ADD_COORDINATION_MESSAGE':
      return { ...state, coordinationMessages: [...state.coordinationMessages, action.payload] };
    case 'EDIT_COORDINATION_MESSAGE':
      return { ...state, coordinationMessages: state.coordinationMessages.map(m => (m.id === action.payload.id ? action.payload : m)) };
    case 'DELETE_COORDINATION_MESSAGE':
      return { ...state, coordinationMessages: state.coordinationMessages.filter(m => m.id !== action.payload) };
    case 'ADD_RECORD_NOTE':
      return { ...state, recordNotes: [...state.recordNotes, action.payload] };
    case 'SUPERSEDE_RECORD_NOTE': {
      const rejected = maybeRejectSupersede(state, state.recordNotes, 'RecordNote', action.payload);
      return rejected ?? { ...state, recordNotes: [...state.recordNotes, action.payload] };
    }
    case 'DISMISS_NOTIFICATION':
      return state.dismissedNotifications.includes(action.payload)
        ? state
        : { ...state, dismissedNotifications: [...state.dismissedNotifications, action.payload] };
    case 'SET_PERSONA':
      return { ...state, currentUserOid: action.payload };
    // EDIT_AIRCRAFT / EDIT_PERSONNEL / EDIT_MEL_ITEM are the raw apply-mechanism applyApproval uses
    // after DECIDE_APPROVAL clears the four-eyes gate (SE-2) — they stay reachable as reducer
    // primitives, but any NEW external dispatch of these three actions for a discretionary
    // cert/provisional-status/RII edit should route through PROPOSE_CHANGE instead. The one
    // existing exception is JourneyLog.tsx's EDIT_AIRCRAFT, which updates cumulative airframe
    // totals as a byproduct of signing a flight leg, not a deliberate reference-data edit.
    case 'EDIT_AIRCRAFT':
      return { ...state, aircraft: state.aircraft.map(a => (a.id === action.payload.id ? action.payload : a)) };
    case 'EDIT_PERSONNEL':
      return { ...state, personnel: state.personnel.map(p => (p.oid === action.payload.oid ? action.payload : p)) };
    case 'UPSERT_PERSONNEL':
      return state.personnel.some(p => p.oid === action.payload.oid)
        ? state
        : { ...state, personnel: [...state.personnel, action.payload] };
    case 'EDIT_MEL_ITEM':
      return { ...state, melItems: state.melItems.map(m => (m.id === action.payload.id ? action.payload : m)) };
    case 'UPSERT_CAMP_CORRELATION':
      return {
        ...state,
        campCorrelation: state.campCorrelation.some(c => c.mygfoEntityId === action.payload.mygfoEntityId)
          ? state.campCorrelation.map(c => (c.mygfoEntityId === action.payload.mygfoEntityId ? action.payload : c))
          : [...state.campCorrelation, action.payload],
      };
    case 'ADD_INTEGRATION_EVENT':
      return { ...state, integrationEvents: [action.payload, ...state.integrationEvents].slice(0, 200) };
    case 'ACK_AOG':
      return { ...state, aogAcks: [action.payload, ...(state.aogAcks ?? [])].slice(0, 200) };
    case 'PROPOSE_CHANGE':
      return { ...state, pendingApprovals: [...state.pendingApprovals, action.payload] };
    case 'DECIDE_APPROVAL': {
      const { id, approve, decidedByOid, decidedAtUtc, rejectionReason } = action.payload;
      const pending = state.pendingApprovals.find(p => p.id === id && p.status === 'PENDING');
      if (!pending || isSelfApproval(pending, decidedByOid)) return state; // self-approval is never valid, defense-in-depth
      const decided: PendingApproval = { ...pending, status: approve ? 'APPROVED' : 'REJECTED', decidedByOid, decidedAtUtc, rejectionReason };
      const entityId = (() => {
        switch (pending.kind) {
          case 'MEL_TYPE_ACTIVATION': return pending.aircraftId;
          case 'AIRCRAFT_EDIT': return pending.after.id;
          case 'PERSONNEL_EDIT': return pending.after.oid;
          case 'MEL_ITEM_APPROVAL': return pending.melItemId;
        }
      })();
      const audit: AuditEntry = {
        id: newId('aud'),
        actorOid: decidedByOid,
        action: approve ? 'REFERENCE_CHANGE_APPROVED' : 'REFERENCE_CHANGE_REJECTED',
        entityType: pending.kind,
        entityId,
        atUtc: decidedAtUtc,
        summary: `${approve ? 'Approved' : 'Rejected'} (proposed by ${pending.proposedByOid}): ${pending.summary}`,
      };
      const next: TechLogState = {
        ...state,
        pendingApprovals: state.pendingApprovals.map(p => (p.id === id ? decided : p)),
        audit: [audit, ...state.audit].slice(0, 500),
      };
      if (!approve) return next;
      const applied = applyApproval({ aircraft: next.aircraft, personnel: next.personnel, melItems: next.melItems }, pending);
      return { ...next, ...applied };
    }
    case 'RESET_STATE':
      // Reseed everything but keep whoever is currently signed in (don't snap back to the seed pilot),
      // as long as that person still exists in the reseeded personnel.
      return action.payload.personnel.some(p => p.oid === state.currentUserOid)
        ? { ...action.payload, currentUserOid: state.currentUserOid }
        : action.payload;
    default:
      return state;
  }
}

interface Ctx {
  state: TechLogState;
  dispatch: React.Dispatch<TechLogAction>;
  loading: boolean;
  displayZone: DisplayZoneMode;                       // D24: lens for regulatory times (default GOVERNING)
  setDisplayZone: (mode: DisplayZoneMode) => void;
  /**
   * The roles the user actually signed in with — `[userRole, ...additionalRoles]` exactly as
   * `LoginScreen` produced them, deduped and in that order (so `loginRoles[0]` is the primary
   * login role). `[]` when the provider is mounted without a role.
   *
   * SEPARATE FROM `state.currentUserOid` / `useCurrentUser()` ON PURPOSE. The persona is a
   * `Personnel` record whose role vocabulary is `PILOT | MAINTENANCE`, and `resolveFromLogin`
   * FALLS BACK to `personnel[0]` for any login role no `SYSTEM_USERS` entry holds (`scheduling`,
   * `hr`, `document-manager`, `procedural-specialist`, `training`, `assistant-chief-pilot`,
   * `reg-comp`, `scheduling-manager`, `lead-scheduler` — all offered by `LoginScreen`). That
   * fallback is fine for "who is standing here", but it is NOT an authority claim: reading the
   * fallback persona's roles handed ~10 logins Captain John Smith's `chief-pilot`. Any authority
   * decision on a tech-log surface must read THIS, never the persona.
   */
  loginRoles: string[];
}
const TechLogContext = createContext<Ctx | undefined>(undefined);

// Identity comes from how the user logged in (no persona switcher). Map the app role -> a Personnel record.
const MAINT_ROLES = ['maintenance', 'chief-inspector', 'shift-lead', 'maintenance-coordinator', 'dom'];
function resolveFromLogin(userRole: string | undefined, personnel: Personnel[]): { oid: string; ensure?: Personnel } {
  if (!userRole) return { oid: personnel[0]?.oid ?? 'USR001' };
  const sys = SYSTEM_USERS.find((u: { id: string; roles?: string[] }) => u.roles?.includes(userRole));
  if (!sys) return { oid: personnel[0]?.oid ?? 'USR001' };
  if (personnel.some(p => p.oid === sys.id)) return { oid: sys.id };
  const isMaint = (sys.roles ?? []).some((r: string) => MAINT_ROLES.includes(r));
  return {
    oid: sys.id,
    ensure: { oid: sys.id, displayName: (sys as { name?: string }).name ?? sys.id, role: isMaint ? 'MAINTENANCE' : 'PILOT', riiAuthorized: false, riiAuthorizedAta: [], active: true },
  };
}

export function TechLogProvider({
  children,
  userRole,
  additionalRoles,
}: {
  children: ReactNode;
  userRole?: string;
  /** The rest of the session's role set, as `LoginScreen` derived it. See `Ctx.loginRoles`. */
  additionalRoles?: string[];
}) {
  const [state, rawDispatch] = useReducer(reducer, undefined, loadInitialState);
  const [loading] = useState(false);
  const additionalKey = (additionalRoles ?? []).join('|');
  const loginRoles = useMemo(
    () => (userRole ? [...new Set([userRole, ...(additionalRoles ?? [])])] : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [userRole, additionalKey],
  );

  /**
   * TL-26 — set by a dispatch that produces a signed/regulated record, so the persistence effect
   * below writes in the SAME commit instead of on a 300 ms debounce. `CLAUDE.md`: "ALWAYS persist a
   * signed record to durable storage the instant it is signed, before attempting sync."
   */
  const durablePendingRef = useRef(false);
  const dispatch = useCallback((action: TechLogAction) => {
    if (isDurableAction(action.type)) durablePendingRef.current = true;
    rawDispatch(action);
  }, []);

  // D24 display-zone preference — a UI lens for regulatory times, kept out of the domain state so it
  // survives a demo reset. Never affects the grounding decision (that compares UTC instants).
  const [displayZone, setDisplayZoneState] = useState<DisplayZoneMode>(() => {
    try {
      const v = localStorage.getItem(DISPLAY_ZONE_KEY);
      return v === 'UTC' || v === 'LOCAL' ? v : 'GOVERNING';
    } catch {
      return 'GOVERNING';
    }
  });
  const setDisplayZone = useCallback((mode: DisplayZoneMode) => {
    setDisplayZoneState(mode);
    try { localStorage.setItem(DISPLAY_ZONE_KEY, mode); } catch { /* ignore */ }
  }, []);

  // Resolve the signed-in identity from the login role (overrides any persisted persona).
  useEffect(() => {
    const { oid, ensure } = resolveFromLogin(userRole, state.personnel);
    if (ensure) dispatch({ type: 'UPSERT_PERSONNEL', payload: ensure });
    dispatch({ type: 'SET_PERSONA', payload: oid });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userRole]);

  const conflictCountRef = useRef(0);
  useEffect(() => {
    if (state.supersedeConflicts.length > conflictCountRef.current) {
      const latest = state.supersedeConflicts[0];
      toast.error(`Correction rejected: ${latest.entityType} ${latest.supersedesId} was already corrected by someone else. Routed to reconciliation — see Audit & Ledger → Conflicts.`);
    }
    conflictCountRef.current = state.supersedeConflicts.length;
  }, [state.supersedeConflicts]);

  // TL-26 — durability. A regulated dispatch is written synchronously in the commit phase that
  // follows it, so there is no window in which navigating away can drop it. Everything else stays
  // debounced so a keystroke in a notes field does not stringify the whole state.
  const latestStateRef = useRef(state);
  latestStateRef.current = state;
  useEffect(() => {
    if (durablePendingRef.current) {
      durablePendingRef.current = false;
      persistState(browserStorage(), state);
      return;
    }
    const t = setTimeout(() => persistState(browserStorage(), state), 300);
    return () => clearTimeout(t);
  }, [state]);

  // Belt and braces for the non-regulated half: flush the latest state once, on real unmount, so a
  // pending debounce is not simply cancelled. This alone would NOT have fixed the bug — an incoming
  // provider's initialiser runs during render, before this cleanup runs in the commit phase — which
  // is why the synchronous write above, not this, is the actual fix.
  useEffect(() => () => persistState(browserStorage(), latestStateRef.current), []);

  return <TechLogContext.Provider value={{ state, dispatch, loading, displayZone, setDisplayZone, loginRoles }}>{children}</TechLogContext.Provider>;
}

/** D24 display-zone lens for regulatory times + its setter. */
export function useDisplayZone() {
  const { displayZone, setDisplayZone } = useTechLog();
  return { displayZone, setDisplayZone };
}

export function useTechLog(): Ctx {
  const c = useContext(TechLogContext);
  if (!c) throw new Error('useTechLog must be used within TechLogProvider');
  return c;
}

/**
 * The signed-in session's REAL role set (`[userRole, ...additionalRoles]`). Use this — never the
 * persona's roles — for any authority decision on a tech-log surface. See `Ctx.loginRoles`.
 */
export function useLoginRoles(): string[] {
  return useTechLog().loginRoles;
}

/** Current persona (Personnel record) derived from state.currentUserOid. */
export function useCurrentUser() {
  const { state } = useTechLog();
  return state.personnel.find(p => p.oid === state.currentUserOid) ?? state.personnel[0];
}

export function useResetTechLog() {
  const { dispatch } = useTechLog();
  return useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    dispatch({ type: 'RESET_STATE', payload: getDefaultState() });
    toast.success('Demo data reset to seed');
  }, [dispatch]);
}
