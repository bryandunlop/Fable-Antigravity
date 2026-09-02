// The React seam for the trip module: who the viewer is, the trips they may see, the places
// register, and one `update` that runs an engine function and persists. No rules live here.

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { actingUser } from '../safety-center/actingUser';
import { loadTrips, saveTrips } from './data/tripsStore';
import { loadPlaces, savePlaces } from './data/placesStore';
import { loadSettings, saveSettings, type TripSettings } from './data/settingsStore';
import { getDemoForecast } from '../../services/weatherMockData';
import type { WeatherByIcao } from './engine/briefingEmail';
import type { SheetContext } from './engine/tripSheet';
import { visibleToScheduling, type Actor, type ActorRole, type Trip } from './engine/trip';
import type { PlaceRecord } from './engine/places';

export function actorRoleFor(userRole: string, additionalRoles: string[] = []): ActorRole {
  const roles = [userRole, ...additionalRoles];
  if (roles.some(r => r === 'scheduling' || r === 'admin' || r === 'lead')) return 'scheduling';
  if (roles.includes('executive')) return 'executive';
  return 'ea';
}

interface TripsContextValue {
  actor: Actor;
  /** Every trip this viewer is allowed to see. */
  trips: Trip[];
  allTrips: Trip[];
  places: PlaceRecord[];
  settings: TripSettings;
  setSettings: (next: TripSettings) => void;
  /** Places + crew blurbs, the inputs a frozen sheet needs. */
  sheetCtx: SheetContext;
  /** Demo forecast keyed by destination ICAO — the NWS service's seed, labelled as such in the UI. */
  weatherFor: (icaos: string[]) => WeatherByIcao;
  nowUtc: () => string;
  create: (trip: Trip) => void;
  update: (tripId: string, fn: (t: Trip) => Trip) => void;
  setPlaces: (next: PlaceRecord[]) => void;
}

const Ctx = createContext<TripsContextValue | null>(null);

export function TripsProvider({ userRole, additionalRoles = [], children }: { userRole: string; additionalRoles?: string[]; children: ReactNode }) {
  const [allTrips, setAllTrips] = useState<Trip[]>(() => loadTrips());
  const [places, setPlacesState] = useState<PlaceRecord[]>(() => loadPlaces());
  const [settings, setSettingsState] = useState<TripSettings>(() => loadSettings());

  const actor = useMemo<Actor>(() => {
    const role = actorRoleFor(userRole, additionalRoles);
    const resolved = actingUser(userRole).name;
    // The demo scheduler has no system user of their own; the record must still carry a name.
    const name = resolved === 'You' && role === 'scheduling' ? 'R. Calloway' : resolved;
    return { name, role };
  }, [userRole, additionalRoles]);
  const nowUtc = useCallback(() => new Date().toISOString(), []);

  const trips = useMemo(() => {
    if (actor.role === 'scheduling') return allTrips.filter(visibleToScheduling);
    return allTrips;
  }, [allTrips, actor.role]);

  const create = useCallback((trip: Trip) => {
    setAllTrips(prev => { const next = [trip, ...prev]; saveTrips(next); return next; });
  }, []);

  const update = useCallback((tripId: string, fn: (t: Trip) => Trip) => {
    setAllTrips(prev => { const next = prev.map(t => (t.id === tripId ? fn(t) : t)); saveTrips(next); return next; });
  }, []);

  const setPlaces = useCallback((next: PlaceRecord[]) => { savePlaces(next); setPlacesState(next); }, []);
  const setSettings = useCallback((next: TripSettings) => { saveSettings(next); setSettingsState(next); }, []);
  const sheetCtx = useMemo<SheetContext>(() => ({ places, blurbs: settings.blurbs }), [places, settings.blurbs]);
  const weatherFor = useCallback((icaos: string[]): WeatherByIcao => {
    // One demo forecast for every destination: the NWS seed is not per-field. Phase 2 swaps in
    // fetchForecast(icao) behind the same shape.
    const periods = getDemoForecast();
    const out: WeatherByIcao = {};
    for (const i of icaos) out[i] = periods[1] ?? periods[0];
    return out;
  }, []);

  const value = useMemo(() => ({ actor, trips, allTrips, places, settings, setSettings, sheetCtx, weatherFor, nowUtc, create, update, setPlaces }), [actor, trips, allTrips, places, settings, setSettings, sheetCtx, weatherFor, nowUtc, create, update, setPlaces]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTripsModule(): TripsContextValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useTripsModule outside TripsProvider');
  return v;
}
