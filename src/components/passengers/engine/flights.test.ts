import { describe, it, expect } from 'vitest';
import {
  getFlightPassengers, resolveTripGuests, dietaryState, flightAllergyAlerts, countCriticalAllergies,
  addPhotoTo, removePhotoFrom,
} from './flights';
import type { Passenger, PassengerPhoto } from '../passengerData';

function pax(id: string, name: string, allergies: Passenger['allergies'] = []): Passenger {
  return {
    id, name, info: {}, role: 'Guest', allergies, birthday: '1990-01-01',
    beverage: [], food: [], passengerComfort: {}, additionalNotes: '',
  };
}

const A = pax('PAX001', 'Robert', [{ allergen: 'Shellfish', severity: 'Critical' }, { allergen: 'Tree nuts', severity: 'Moderate' }]);
const B = pax('PAX002', 'Sarah');
const C = pax('PAX003', 'Michael', [{ allergen: 'Shellfish', severity: 'Mild' }]);
const ALL = [A, B, C];

describe('resolveTripGuests', () => {
  // The whole point: an id with no record is a GUEST WE KNOW NOTHING ABOUT, not an
  // absent guest. Dropping it understates the manifest — on a screen whose job is
  // "who is on board", a silently shorter list is the worst failure available.
  it('keeps every id, in order, with null for the ones it cannot resolve', () => {
    const guests = resolveTripGuests(['PAX003', 'NOPE', 'PAX001'], ALL);
    expect(guests.map((g) => g.id)).toEqual(['PAX003', 'NOPE', 'PAX001']);
    expect(guests.map((g) => g.passenger?.name ?? null)).toEqual(['Michael', null, 'Robert']);
  });
  it('does not shrink the count when nothing resolves', () => {
    expect(resolveTripGuests(['GHOST1', 'GHOST2'], ALL)).toHaveLength(2);
  });
  it('returns empty for no ids', () => {
    expect(resolveTripGuests([], ALL)).toEqual([]);
  });
});

describe('dietaryState', () => {
  it('is ALLERGIES when a structured allergen is recorded', () => {
    expect(dietaryState({ id: 'PAX001', passenger: A })).toBe('ALLERGIES');
  });
  it('is FLAGGED_NO_DETAIL when the booking flag is set but no allergen is named', () => {
    expect(dietaryState({ id: 'x', passenger: { ...B, allergyFlagged: true } })).toBe('FLAGGED_NO_DETAIL');
  });
  it('prefers named allergens over the bare flag', () => {
    expect(dietaryState({ id: 'x', passenger: { ...A, allergyFlagged: true } })).toBe('ALLERGIES');
  });
  it('is CONFIRMED_NONE only when someone asked and dated it', () => {
    expect(dietaryState({ id: 'x', passenger: { ...B, dietaryConfirmedAtUtc: '2026-08-12T00:00:00Z' } }))
      .toBe('CONFIRMED_NONE');
  });
  it('never lets a confirmation date outrank a recorded allergen', () => {
    expect(dietaryState({ id: 'x', passenger: { ...A, dietaryConfirmedAtUtc: '2026-08-12T00:00:00Z' } }))
      .toBe('ALLERGIES');
  });
  it('is NONE_ON_FILE for an empty record — an empty array is not a confirmation', () => {
    expect(dietaryState({ id: 'PAX002', passenger: B })).toBe('NONE_ON_FILE');
  });
  it('is NONE_ON_FILE for a guest with no record at all', () => {
    expect(dietaryState({ id: 'GHOST', passenger: null })).toBe('NONE_ON_FILE');
  });
});

describe('getFlightPassengers', () => {
  // Deliberately lossy, and now derived from resolveTripGuests: this one answers
  // "which records do we have", so callers that need the full manifest must use
  // resolveTripGuests instead.
  it('drops unknown ids by design, keeping order', () => {
    expect(getFlightPassengers(['PAX003', 'PAX001', 'NOPE'], ALL).map((p) => p.name)).toEqual(['Michael', 'Robert']);
  });
  it('returns empty for no ids', () => {
    expect(getFlightPassengers([], ALL)).toEqual([]);
  });
});

describe('flightAllergyAlerts', () => {
  it('dedups by allergen, keeps most-severe, lists affected passengers, sorts by severity', () => {
    const alerts = flightAllergyAlerts([A, C]);
    // Shellfish (Critical from A, Mild from C) then Tree nuts (Moderate)
    expect(alerts.map((a) => a.allergen)).toEqual(['Shellfish', 'Tree nuts']);
    expect(alerts[0]).toMatchObject({ allergen: 'Shellfish', severity: 'Critical' });
    expect(alerts[0].passengers.sort()).toEqual(['Michael', 'Robert']);
    expect(alerts[1]).toMatchObject({ allergen: 'Tree nuts', severity: 'Moderate', passengers: ['Robert'] });
  });
  it('is empty when nobody has allergies', () => {
    expect(flightAllergyAlerts([B])).toEqual([]);
  });
});

describe('countCriticalAllergies', () => {
  it('counts only critical entries', () => {
    expect(countCriticalAllergies(ALL)).toBe(1);
  });
});

describe('photo helpers', () => {
  const photo: PassengerPhoto = { id: 'ph1', url: 'data:image/png;base64,xxx', caption: 'Plating', addedAtUtc: '2026-07-07T00:00:00Z' };
  it('adds a photo immutably', () => {
    const updated = addPhotoTo(B, photo);
    expect(updated.photos).toHaveLength(1);
    expect(B.photos).toBeUndefined(); // original untouched
  });
  it('removes a photo by id', () => {
    const withPhoto = addPhotoTo(B, photo);
    expect(removePhotoFrom(withPhoto, 'ph1').photos).toEqual([]);
    expect(removePhotoFrom(withPhoto, 'other').photos).toHaveLength(1);
  });
});
