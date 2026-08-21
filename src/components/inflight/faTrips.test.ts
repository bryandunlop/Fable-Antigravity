import { describe, it, expect } from 'vitest';
import { buildFaTrips } from './faTrips';

const NOW = new Date('2026-08-21T12:00:00Z');

describe('buildFaTrips', () => {
  it('returns more than one upcoming trip', () => {
    // The screen exists to answer "what have I got after this one" as well as
    // "who is on the next flight".
    expect(buildFaTrips(NOW).length).toBeGreaterThan(1);
  });

  it('is ordered nearest-first', () => {
    // FlightAttendantFlights opens trips[0] and folds the rest, so the order IS the
    // "next trip" rule. If this ever stops holding, the screen silently opens the
    // wrong one rather than failing.
    const firstDepartures = buildFaTrips(NOW).map((t) => new Date(t.legs[0].departureUtc).getTime());
    expect([...firstDepartures].sort((a, b) => a - b)).toEqual(firstDepartures);
  });

  it('gives every leg an ascending leg number and a manifest', () => {
    for (const trip of buildFaTrips(NOW)) {
      expect(trip.legs.length).toBeGreaterThan(0);
      expect(trip.legs.map((l) => l.legNumber)).toEqual(trip.legs.map((_, i) => i + 1));
      for (const leg of trip.legs) expect(leg.passengerIds.length).toBeGreaterThan(0);
    }
  });

  it('keeps every leg arriving after it departs', () => {
    for (const trip of buildFaTrips(NOW)) {
      for (const leg of trip.legs) {
        expect(new Date(leg.arrivalUtc).getTime()).toBeGreaterThan(new Date(leg.departureUtc).getTime());
      }
    }
  });
});
