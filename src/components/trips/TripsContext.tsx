// The React seam for the trip module: who the viewer is, the trips they may see, the places
// register, and one `update` that runs an engine function and persists. No rules live here.

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import TripClockEffects from './TripClockEffects';
import { actingUser } from '../safety-center/actingUser';
import { loadTrips, saveTrips } from './data/tripsStore';
import { loadPlaces, savePlaces } from './data/placesStore';
import { loadSettings, saveSettings, type TripSettings } from './data/settingsStore';
import { loadWatches, saveWatches } from './data/watchesStore';
import { loadPeople, savePeople, migrateSettingsOntoPeople, backfillPassengerIds } from './data/peopleStore';
import { resolvePassengers, type Person } from './engine/people';
import type { Watch } from './engine/watches';
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
  watches: Watch[];
  setWatches: (fn: (w: Watch[]) => Watch[]) => void;
  /** The people register (Phase 5 slice 2). `/people` owns it; other surfaces read it. */
  people: Person[];
  setPeople: (fn: (p: Person[]) => Person[]) => void;
  /**
   * Names in, ids out, creating an unverified guest for anyone new — and storing the register, so
   * a caller never has to remember to persist the people a trip just invented.
   */
  resolvePassengerIds: (names: string[]) => string[];
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
  // Load the trips and the register together, and link them once: a trip written before Phase 5
  // slice 2 carries only names, and a name is severed by the first rename. See
  // `backfillPassengerIds` — this must happen before anyone can be renamed, i.e. here.
  const initial = useMemo(() => {
    const s = loadSettings();
    const people = migrateSettingsOntoPeople(loadPeople(), s.passengerPrefs, s.principalReserve?.name);
    const linked = backfillPassengerIds(loadTrips(), people, new Date().toISOString());
    if (linked.trips !== undefined) saveTrips(linked.trips);
    savePeople(linked.people);
    return linked;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [allTrips, setAllTrips] = useState<Trip[]>(() => initial.trips);
  const [places, setPlacesState] = useState<PlaceRecord[]>(() => loadPlaces());
  const [settings, setSettingsState] = useState<TripSettings>(() => loadSettings());
  const [watches, setWatchesState] = useState<Watch[]>(() => loadWatches());
  const [people, setPeopleState] = useState<Person[]>(() => initial.people);
  const setPeople = useCallback((fn: (p: Person[]) => Person[]) => {
    setPeopleState(prev => { const next = fn(prev); if (next === prev) return prev; savePeople(next); return next; });
  }, []);
  const setWatches = useCallback((fn: (w: Watch[]) => Watch[]) => { setWatchesState(prev => { const next = fn(prev); saveWatches(next); return next; }); }, []);

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
    setAllTrips(prev => {
      const current = prev.find(t => t.id === tripId);
      if (!current) return prev;
      const updated = fn(current);
      // An engine function that declined to act returns the trip it was given. Writing anyway
      // would re-render every consumer and re-stringify the whole store — once a minute, forever,
      // now that the module clock calls this for every live trip on every tick (fresh review,
      // 2026-09-02). Identity is the engines' own signal; they are all written to return `t`.
      if (updated === current) return prev;
      const next = prev.map(t => (t.id === tripId ? updated : t));
      saveTrips(next);
      return next;
    });
  }, []);

  const setPlaces = useCallback((next: PlaceRecord[]) => { savePlaces(next); setPlacesState(next); }, []);
  const peopleRef = useRef(people);
  peopleRef.current = people;
  const resolvePassengerIds = useCallback((names: string[]) => {
    // Reads through a ref so the caller can resolve and act in one go without waiting a render for
    // the register to come back; the state write below is what persists any newly-created guest.
    const r = resolvePassengers(peopleRef.current, names, new Date().toISOString());
    if (r.created.length > 0) { peopleRef.current = r.people; setPeople(() => r.people); }
    return r.ids;
  }, [setPeople]);
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

  const value = useMemo(() => ({ actor, trips, allTrips, places, settings, setSettings, watches, setWatches, people, setPeople, resolvePassengerIds, sheetCtx, weatherFor, nowUtc, create, update, setPlaces }), [actor, trips, allTrips, places, settings, setSettings, watches, setWatches, people, setPeople, resolvePassengerIds, sheetCtx, weatherFor, nowUtc, create, update, setPlaces]);
  return (
    <Ctx.Provider value={value}>
      {/* The module's own clock: T-72 freeze, dead-man send and watches, for every trip, from
          whichever trips page happens to be open. */}
      <TripClockEffects />
      {children}
    </Ctx.Provider>
  );
}

export function useTripsModule(): TripsContextValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useTripsModule outside TripsProvider');
  return v;
}
