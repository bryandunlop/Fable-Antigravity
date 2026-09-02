// THIN localStorage wrapper for the places register. Same idiom as availabilityStore.ts.
// Its own key: a scheduler-curated reference list is not trip state and not tech-log state.

import { SEED_PLACES, type PlaceRecord } from '../engine/places';

export const PLACES_KEY = 'trip-places-state';
const VERSION_KEY = 'trip-places-version';
const VERSION = '1';

export function loadPlaces(): PlaceRecord[] {
  if (typeof localStorage === 'undefined') return SEED_PLACES;
  try {
    if (localStorage.getItem(VERSION_KEY) !== VERSION) return SEED_PLACES;
    const raw = localStorage.getItem(PLACES_KEY);
    return raw ? (JSON.parse(raw) as PlaceRecord[]) : SEED_PLACES;
  } catch {
    return SEED_PLACES;
  }
}

export function savePlaces(places: PlaceRecord[]): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(PLACES_KEY, JSON.stringify(places));
  localStorage.setItem(VERSION_KEY, VERSION);
}
