import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadTrips, saveTrip, submitTrip, deleteTrip, resetTrips, STORAGE_KEY, type BuiltTrip } from './builtTripStore';

beforeEach(() => {
  const map = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
    clear: () => map.clear(),
  } as unknown as Storage);
});

const trip = (over: Partial<BuiltTrip> = {}) => ({
  id: 'trip-1',
  tripName: 'Teterboro → Aspen',
  clientName: 'P&G Executive',
  status: 'draft' as const,
  tripData: { legs: 2 },
  passengers: [{ name: 'A. Passenger' }],
  itinerary: [{ item: 'Car' }],
  ...over,
});

describe('built-trip store — Save must not throw the work away', () => {
  it('a saved trip is there on the next load', () => {
    saveTrip(trip());
    expect(loadTrips()).toHaveLength(1);
    expect(loadTrips()[0].tripName).toBe('Teterboro → Aspen');
  });

  it('keeps the builder payload intact', () => {
    saveTrip(trip());
    const [loaded] = loadTrips();
    expect(loaded.passengers).toEqual([{ name: 'A. Passenger' }]);
    expect(loaded.itinerary).toEqual([{ item: 'Car' }]);
  });

  it('saving twice updates in place instead of stacking duplicates', () => {
    saveTrip(trip());
    saveTrip(trip({ tripName: 'Teterboro → Vail' }));
    const all = loadTrips();
    expect(all).toHaveLength(1);
    expect(all[0].tripName).toBe('Teterboro → Vail');
  });

  it('distinct trips coexist', () => {
    saveTrip(trip());
    saveTrip(trip({ id: 'trip-2', tripName: 'Second' }));
    expect(loadTrips().map((t) => t.id)).toEqual(['trip-1', 'trip-2']);
  });

  it('stamps a save time and rehydrates it as a Date', () => {
    saveTrip(trip());
    expect(loadTrips()[0].savedAt).toBeInstanceOf(Date);
  });

  it('submit moves the status and records when, keeping the content', () => {
    saveTrip(trip());
    const at = new Date('2026-07-22T15:00:00Z');
    const updated = submitTrip('trip-1', at);
    expect(updated?.status).toBe('submitted');
    const [loaded] = loadTrips();
    expect(loaded.status).toBe('submitted');
    expect(loaded.submittedAt).toEqual(at);
    expect(loaded.tripData).toEqual({ legs: 2 });
  });

  it('submitting an unknown trip reports failure rather than inventing one', () => {
    expect(submitTrip('nope')).toBeUndefined();
    expect(loadTrips()).toHaveLength(0);
  });

  it('delete removes only its own trip', () => {
    saveTrip(trip());
    saveTrip(trip({ id: 'trip-2' }));
    deleteTrip('trip-1');
    expect(loadTrips().map((t) => t.id)).toEqual(['trip-2']);
  });

  it('survives corrupt storage rather than throwing', () => {
    localStorage.setItem(STORAGE_KEY, 'not json at all');
    expect(loadTrips()).toEqual([]);
  });

  it('reset clears everything', () => {
    saveTrip(trip());
    resetTrips();
    expect(loadTrips()).toEqual([]);
  });
});
