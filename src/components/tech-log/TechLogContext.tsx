import React, { createContext, useContext, useEffect, useReducer, useState, useCallback, ReactNode } from 'react';
import { toast } from 'sonner';
import type { TechLogState, TechLogAction } from './types';
import { getDefaultState } from './mockData/scenarios';

const STORAGE_KEY = 'tech-log-state';
const VERSION_KEY = 'tech-log-data-version';
const DATA_VERSION = '2026-06-21-v1';

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

function reducer(state: TechLogState, action: TechLogAction): TechLogState {
  switch (action.type) {
    case 'ADD_DEFECT':
    case 'SUPERSEDE_DEFECT':
      return { ...state, defects: [...state.defects, action.payload] };
    case 'ADD_DEFERRAL':
    case 'SUPERSEDE_DEFERRAL':
      return { ...state, deferrals: [...state.deferrals, action.payload] };
    case 'ADD_RELEASE':
      return { ...state, releases: [...state.releases, action.payload] };
    case 'ADD_FLIGHTLOG':
      return { ...state, flightLogs: [...state.flightLogs, action.payload] };
    case 'ADD_SIGNATURE':
      return { ...state, signatures: [...state.signatures, action.payload] };
    case 'ADD_AUDIT':
      return { ...state, audit: [action.payload, ...state.audit].slice(0, 500) };
    case 'SET_PERSONA':
      return { ...state, currentUserOid: action.payload };
    case 'EDIT_AIRCRAFT':
      return { ...state, aircraft: state.aircraft.map(a => (a.id === action.payload.id ? action.payload : a)) };
    case 'RESET_STATE':
      return action.payload;
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

export function TechLogProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadInitialState);
  const [loading] = useState(false);

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
