import React, { createContext, useCallback, useContext, useEffect, useReducer, ReactNode } from 'react';
import type { Bulletin, BulletinAcknowledgment, BulletinsState } from './types';
import { SEED_BULLETINS } from './mockData';
import { SYSTEM_USERS } from '../../lib/mockUsers';
import { resolveUserId } from '../../notifications/identity';

export const STORAGE_KEY = 'bulletins-state';
export const VERSION_KEY = 'bulletins-data-version';
export const DATA_VERSION = '2026-07-07-v1';

function getDefaultState(): BulletinsState {
  return { bulletins: SEED_BULLETINS, acknowledgments: [] };
}

function loadInitialState(): BulletinsState {
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

type BulletinsAction =
  | { type: 'ADD_BULLETIN'; payload: Bulletin }
  | { type: 'UPDATE_BULLETIN'; payload: Bulletin }
  | { type: 'DELETE_BULLETIN'; payload: string }
  | { type: 'TOGGLE_PIN'; payload: string }
  | { type: 'TOGGLE_ARCHIVE'; payload: string }
  | { type: 'ACKNOWLEDGE'; payload: BulletinAcknowledgment };

function reducer(state: BulletinsState, action: BulletinsAction): BulletinsState {
  switch (action.type) {
    case 'ADD_BULLETIN':
      return { ...state, bulletins: [action.payload, ...state.bulletins] };
    case 'UPDATE_BULLETIN':
      return {
        ...state,
        bulletins: state.bulletins.map((b) => (b.id === action.payload.id ? action.payload : b)),
      };
    case 'DELETE_BULLETIN':
      return {
        ...state,
        bulletins: state.bulletins.filter((b) => b.id !== action.payload),
        // Read receipts for a deleted bulletin are no longer meaningful.
        acknowledgments: state.acknowledgments.filter((a) => a.bulletinId !== action.payload),
      };
    case 'TOGGLE_PIN':
      return {
        ...state,
        bulletins: state.bulletins.map((b) =>
          b.id === action.payload ? { ...b, isPinned: !b.isPinned } : b,
        ),
      };
    case 'TOGGLE_ARCHIVE':
      return {
        ...state,
        bulletins: state.bulletins.map((b) =>
          b.id === action.payload ? { ...b, isArchived: !b.isArchived } : b,
        ),
      };
    case 'ACKNOWLEDGE': {
      const a = action.payload;
      // One ack per (bulletin, version, user): replace any prior record.
      const kept = state.acknowledgments.filter(
        (x) => !(x.bulletinId === a.bulletinId && x.bulletinVersion === a.bulletinVersion && x.userId === a.userId),
      );
      return { ...state, acknowledgments: [...kept, a] };
    }
    default:
      return state;
  }
}

interface Ctx {
  state: BulletinsState;
  addBulletin: (b: Bulletin) => void;
  updateBulletin: (b: Bulletin) => void;
  deleteBulletin: (id: string) => void;
  togglePin: (id: string) => void;
  toggleArchive: (id: string) => void;
  /** Record a Read-and-Initial for the current user (resolved from their login role). */
  acknowledge: (bulletin: Pick<Bulletin, 'id' | 'version'>, initials: string, userRole: string) => void;
}

const BulletinContext = createContext<Ctx | undefined>(undefined);

export function BulletinProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadInitialState);

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

  const acknowledge = useCallback(
    (bulletin: Pick<Bulletin, 'id' | 'version'>, initials: string, userRole: string) => {
      const userId = resolveUserId(userRole);
      const userName = SYSTEM_USERS.find((u) => u.id === userId)?.name ?? userRole;
      dispatch({
        type: 'ACKNOWLEDGE',
        payload: {
          bulletinId: bulletin.id,
          bulletinVersion: bulletin.version,
          userId,
          userName,
          role: userRole,
          initials: initials.trim().toUpperCase(),
          acknowledgedAtUtc: new Date().toISOString(),
        },
      });
    },
    [],
  );

  const value: Ctx = {
    state,
    addBulletin: useCallback((b) => dispatch({ type: 'ADD_BULLETIN', payload: b }), []),
    updateBulletin: useCallback((b) => dispatch({ type: 'UPDATE_BULLETIN', payload: b }), []),
    deleteBulletin: useCallback((id) => dispatch({ type: 'DELETE_BULLETIN', payload: id }), []),
    togglePin: useCallback((id) => dispatch({ type: 'TOGGLE_PIN', payload: id }), []),
    toggleArchive: useCallback((id) => dispatch({ type: 'TOGGLE_ARCHIVE', payload: id }), []),
    acknowledge,
  };

  return <BulletinContext.Provider value={value}>{children}</BulletinContext.Provider>;
}

export function useBulletins(): Ctx {
  const c = useContext(BulletinContext);
  if (!c) throw new Error('useBulletins must be used within BulletinProvider');
  return c;
}
