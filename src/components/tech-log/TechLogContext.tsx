import React, { createContext, useContext, useEffect, useReducer, useRef, useState, useCallback, ReactNode } from 'react';
import { toast } from 'sonner';
import type { TechLogState, TechLogAction, Personnel } from './types';
import type { SupersedeEntityType } from './types';
import { getDefaultState } from './mockData/scenarios';
import { SYSTEM_USERS } from '../../lib/mockUsers';
import { wouldFork, buildSupersedeConflict } from './engine/supersede';
import { canRecordPostflight } from './engine/custody';

const STORAGE_KEY = 'tech-log-state';
const VERSION_KEY = 'tech-log-data-version';
const DATA_VERSION = '2026-06-22-v7';

function loadInitialState(): TechLogState {
  try {
    if (localStorage.getItem(VERSION_KEY) !== DATA_VERSION) {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.setItem(VERSION_KEY, DATA_VERSION);
      return getDefaultState();
    }
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...getDefaultState(), ...JSON.parse(raw) } : getDefaultState();
  } catch {
    return getDefaultState();
  }
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

export function TechLogProvider({ children, userRole }: { children: ReactNode; userRole?: string }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadInitialState);
  const [loading] = useState(false);

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

  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch {
        /* storage full/unavailable — ignore for the demo */
      }
    }, 300);
    return () => clearTimeout(t);
  }, [state]);

  return <TechLogContext.Provider value={{ state, dispatch, loading }}>{children}</TechLogContext.Provider>;
}

export function useTechLog(): Ctx {
  const c = useContext(TechLogContext);
  if (!c) throw new Error('useTechLog must be used within TechLogProvider');
  return c;
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
