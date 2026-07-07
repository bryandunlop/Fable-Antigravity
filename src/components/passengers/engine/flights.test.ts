import { describe, it, expect } from 'vitest';
import {
  getFlightPassengers, flightAllergyAlerts, countCriticalAllergies, addPhotoTo, removePhotoFrom,
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

describe('getFlightPassengers', () => {
  it('resolves ids in order and skips unknowns', () => {
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
