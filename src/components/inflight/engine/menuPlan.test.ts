import { describe, it, expect } from 'vitest';
import type { Passenger } from '../../passengers/passengerData';
import { legMenuPlan, tripWindow, groundMinutes, formatGround } from './menuPlan';
import type { FaTrip } from '../faTrips';

function pax(over: Partial<Passenger> & { id: string; name: string }): Passenger {
  return {
    info: {}, role: 'Guest', allergies: [], birthday: '', beverage: [], food: [],
    passengerComfort: {}, additionalNotes: '', ...over,
  };
}

describe('legMenuPlan', () => {
  it('rolls every allergy on the leg into one list, most severe first', () => {
    const plan = legMenuPlan([
      pax({ id: 'A', name: 'Ann', allergies: [{ allergen: 'Gluten', severity: 'Mild' }] }),
      pax({ id: 'B', name: 'Bob', allergies: [{ allergen: 'Tree nuts', severity: 'Critical', reaction: 'Anaphylaxis', medication: 'EpiPen' }] }),
    ]);
    expect(plan.allergens.map(a => a.allergen)).toEqual(['Tree nuts', 'Gluten']);
    expect(plan.allergens[0].carriers).toEqual([
      { name: 'Bob', severity: 'Critical', reaction: 'Anaphylaxis', medication: 'EpiPen' },
    ]);
  });

  it('merges the same allergen across passengers and keeps the worst severity', () => {
    const plan = legMenuPlan([
      pax({ id: 'A', name: 'Ann', allergies: [{ allergen: 'Shellfish', severity: 'Mild' }] }),
      pax({ id: 'B', name: 'Bob', allergies: [{ allergen: 'Shellfish', severity: 'Critical' }] }),
    ]);
    expect(plan.allergens).toHaveLength(1);
    expect(plan.allergens[0].severity).toBe('Critical');
    expect(plan.allergens[0].carriers.map(c => c.name)).toEqual(['Ann', 'Bob']);
  });

  it('reports the same person twice when they list one allergen twice', () => {
    const plan = legMenuPlan([
      pax({ id: 'A', name: 'Ann', allergies: [
        { allergen: 'Dairy', severity: 'Mild', reaction: 'Bloating' },
        { allergen: 'Dairy', severity: 'Moderate', reaction: 'Hives' },
      ] }),
    ]);
    expect(plan.allergens[0].carriers).toHaveLength(2);
    expect(plan.allergens[0].severity).toBe('Moderate');
  });

  it('tallies dislikes, food and beverage preferences with who wants them', () => {
    const plan = legMenuPlan([
      pax({ id: 'A', name: 'Ann', food: ['Caesar salad'], beverage: ['Espresso'], dislikes: ['Cilantro'] }),
      pax({ id: 'B', name: 'Bob', food: ['Caesar salad'], beverage: ['Still water'] }),
    ]);
    expect(plan.food).toEqual([
      { item: 'Caesar salad', passengers: ['Ann', 'Bob'] },
    ]);
    expect(plan.beverage.map(b => b.item).sort()).toEqual(['Espresso', 'Still water']);
    expect(plan.dislikes).toEqual([{ item: 'Cilantro', passengers: ['Ann'] }]);
  });

  it('is empty, not undefined, for a leg with no passengers', () => {
    const plan = legMenuPlan([]);
    expect(plan).toEqual({ allergens: [], dislikes: [], food: [], beverage: [], criticalCount: 0 });
  });

  it('counts critical allergens for the leg banner', () => {
    const plan = legMenuPlan([
      pax({ id: 'A', name: 'Ann', allergies: [
        { allergen: 'Shellfish', severity: 'Critical' },
        { allergen: 'Gluten', severity: 'Mild' },
      ] }),
      pax({ id: 'B', name: 'Bob', allergies: [{ allergen: 'Shellfish', severity: 'Critical' }] }),
    ]);
    expect(plan.criticalCount).toBe(1);
  });
});

const TRIP: FaTrip = {
  id: 't1', tripNumber: 'TRP-1', tripName: 'Test', tail: 'N1PG', aircraftType: 'G650ER',
  cabinCrew: ['You'],
  legs: [
    { id: 'l1', legNumber: 1, flightNumber: 'PG1', origin: 'KTEB', destination: 'KLAX', departureUtc: '2026-08-04T13:00:00Z', arrivalUtc: '2026-08-04T19:00:00Z', passengerIds: [] },
    { id: 'l2', legNumber: 2, flightNumber: 'PG2', origin: 'KLAX', destination: 'KTEB', departureUtc: '2026-08-06T18:00:00Z', arrivalUtc: '2026-08-07T02:00:00Z', passengerIds: [] },
  ],
};

describe('tripWindow', () => {
  it('spans first departure to last arrival', () => {
    expect(tripWindow(TRIP)).toEqual({ startUtc: '2026-08-04T13:00:00Z', endUtc: '2026-08-07T02:00:00Z' });
  });

  it('returns null for a trip with no legs rather than an invalid date', () => {
    expect(tripWindow({ ...TRIP, legs: [] })).toBeNull();
  });
});

describe('groundMinutes', () => {
  it('measures the gap between an arrival and the next departure', () => {
    expect(groundMinutes(TRIP.legs[0], TRIP.legs[1])).toBe(47 * 60);
  });

  it('formats sub-day ground time in hours and days beyond that', () => {
    expect(formatGround(90)).toBe('1 h 30 m');
    expect(formatGround(47 * 60)).toBe('2 d');
    expect(formatGround(0)).toBe('turn');
  });

  it('never reports negative ground time from out-of-order legs', () => {
    expect(groundMinutes(TRIP.legs[1], TRIP.legs[0])).toBe(0);
  });
});
