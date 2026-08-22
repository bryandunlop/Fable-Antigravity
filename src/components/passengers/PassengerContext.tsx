import React, { createContext, useCallback, useContext, useEffect, useReducer, ReactNode } from 'react';
import type { Passenger, PassengerPhoto } from './passengerData';
import { SEED_PASSENGERS } from './passengerData';
import { addPhotoTo, removePhotoFrom } from './engine/flights';

export const STORAGE_KEY = 'passengers-state';
export const VERSION_KEY = 'passengers-data-version';
export const DATA_VERSION = '2026-08-22-v4';

interface PassengersState {
  passengers: Passenger[];
}

function getDefaultState(): PassengersState {
  return { passengers: SEED_PASSENGERS };
}

function loadInitialState(): PassengersState {
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

type Action =
  | { type: 'ADD'; payload: Passenger }
  | { type: 'UPDATE'; payload: Passenger }
  | { type: 'DELETE'; payload: string }
  | { type: 'ADD_PHOTO'; payload: { passengerId: string; photo: PassengerPhoto } }
  | { type: 'REMOVE_PHOTO'; payload: { passengerId: string; photoId: string } };

function reducer(state: PassengersState, action: Action): PassengersState {
  switch (action.type) {
    case 'ADD':
      return { ...state, passengers: [...state.passengers, action.payload] };
    case 'UPDATE':
      return { ...state, passengers: state.passengers.map((p) => (p.id === action.payload.id ? action.payload : p)) };
    case 'DELETE':
      return { ...state, passengers: state.passengers.filter((p) => p.id !== action.payload) };
    case 'ADD_PHOTO':
      return {
        ...state,
        passengers: state.passengers.map((p) => (p.id === action.payload.passengerId ? addPhotoTo(p, action.payload.photo) : p)),
      };
    case 'REMOVE_PHOTO':
      return {
        ...state,
        passengers: state.passengers.map((p) => (p.id === action.payload.passengerId ? removePhotoFrom(p, action.payload.photoId) : p)),
      };
    default:
      return state;
  }
}

interface Ctx {
  passengers: Passenger[];
  getById: (id: string) => Passenger | undefined;
  addPassenger: (p: Passenger) => void;
  updatePassenger: (p: Passenger) => void;
  deletePassenger: (id: string) => void;
  addPhoto: (passengerId: string, photo: PassengerPhoto) => void;
  removePhoto: (passengerId: string, photoId: string) => void;
}

const PassengerContext = createContext<Ctx | undefined>(undefined);

export function PassengerProvider({ children }: { children: ReactNode }) {
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

  const value: Ctx = {
    passengers: state.passengers,
    getById: useCallback((id: string) => state.passengers.find((p) => p.id === id), [state.passengers]),
    addPassenger: useCallback((p) => dispatch({ type: 'ADD', payload: p }), []),
    updatePassenger: useCallback((p) => dispatch({ type: 'UPDATE', payload: p }), []),
    deletePassenger: useCallback((id) => dispatch({ type: 'DELETE', payload: id }), []),
    addPhoto: useCallback((passengerId, photo) => dispatch({ type: 'ADD_PHOTO', payload: { passengerId, photo } }), []),
    removePhoto: useCallback((passengerId, photoId) => dispatch({ type: 'REMOVE_PHOTO', payload: { passengerId, photoId } }), []),
  };

  return <PassengerContext.Provider value={value}>{children}</PassengerContext.Provider>;
}

export function usePassengers(): Ctx {
  const c = useContext(PassengerContext);
  if (!c) throw new Error('usePassengers must be used within PassengerProvider');
  return c;
}
