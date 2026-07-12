import React, { createContext, useContext, useEffect, useReducer, ReactNode } from 'react';
import type { FirState } from './types';
import { firReducer, type FirAction } from './reducer';
import { getSeedState } from './mockData';

export { STORAGE_KEY, VERSION_KEY, DATA_VERSION } from './storageKeys';
import { STORAGE_KEY, VERSION_KEY, DATA_VERSION } from './storageKeys';

function loadInitialState(): FirState {
  try {
    if (localStorage.getItem(VERSION_KEY) !== DATA_VERSION) {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.setItem(VERSION_KEY, DATA_VERSION);
      return getSeedState();
    }
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...getSeedState(), ...JSON.parse(raw) } : getSeedState();
  } catch {
    return getSeedState();
  }
}

interface Ctx {
  state: FirState;
  dispatch: React.Dispatch<FirAction>;
}

const FirContext = createContext<Ctx | undefined>(undefined);

export function FirProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(firReducer, undefined, loadInitialState);

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

  return <FirContext.Provider value={{ state, dispatch }}>{children}</FirContext.Provider>;
}

export function useFir(): Ctx {
  const c = useContext(FirContext);
  if (!c) throw new Error('useFir must be used within FirProvider');
  return c;
}
