import { describe, it, expect } from 'vitest';
import { buildItineraries, fboFor, LOCKOUT_HOURS } from './itinerary';
import type { PortalState } from '../types';

const NOW = Date.parse('2026-08-04T12:00:00Z');
const day = (n: number) => new Date(NOW + n * 86_400_000).toISOString().slice(0, 10);

function state(partial: Partial<PortalState>): PortalState {
  return {
    persona: 'ea',
    requests: [],
    flights: [],
    seatAsks: [],
    watches: [],
    passengers: [
      { id: 'P1', name: 'A. Reyes', kind: 'principal', docs: [], hasFlown: true },
      { id: 'P2', name: 'K. Tanaka', kind: 'staff', docs: [], hasFlown: true },
    ],
    inbox: [],
    tripSeenAt: {},
    nextRequestNumber: 1,
    ...partial,
  };
}

const leg = (over: Partial<{ from: string; to: string; date: string }> = {}) => ({
  id: 'L1', from: 'KCVG', to: 'KTEB', date: day(10), departLocal: '08:00',
  flexHours: 0, estMinutes: 105, estNm: 570,
  passengers: [
    { passengerId: 'P1', lead: true, purpose: 'business' as const },
    { passengerId: 'P2', purpose: 'business' as const },
  ],
  ...over,
});

const confirmedRequest = (over = {}) => ({
  id: 'R-1', status: 'confirmed' as const, tier: 1 as const, principalId: 'P1',
  requestedBy: 'Dana (EA)', createdAt: '2026-07-28T09:00:00Z',
  legs: [leg()], extras: ['Catering — light'], messages: [], ...over,
});

describe('buildItineraries — what Confirmed turns into', () => {
  it('includes only confirmed requests', () => {
    const s = state({
      requests: [
        confirmedRequest(),
        { ...confirmedRequest({ id: 'R-2' }), status: 'pending' as const },
        { ...confirmedRequest({ id: 'R-3' }), status: 'approved' as const },
      ],
    });
    expect(buildItineraries(s, NOW).map((i) => i.id)).toEqual(['R-1']);
  });

  it('names the FBO at both ends of every leg', () => {
    const [it] = buildItineraries(state({ requests: [confirmedRequest()] }), NOW);
    expect(it.legs[0].fbo).toEqual({ from: fboFor('KCVG'), to: fboFor('KTEB') });
  });

  it('carries the manifest with the lead passenger marked', () => {
    const [it] = buildItineraries(state({ requests: [confirmedRequest()] }), NOW);
    expect(it.legs[0].passengers).toEqual([
      { name: 'A. Reyes', lead: true, purpose: 'business' },
      { name: 'K. Tanaka', lead: false, purpose: 'business' },
    ]);
  });

  it('uses the 72-hour lockout for an international trip and 24 for domestic', () => {
    const domestic = buildItineraries(state({ requests: [confirmedRequest()] }), NOW)[0];
    const intl = buildItineraries(
      state({ requests: [confirmedRequest({ legs: [leg({ to: 'EGGW' })] })] }),
      NOW,
    )[0];
    expect(domestic.international).toBe(false);
    expect(intl.international).toBe(true);
    // Same departure, so the international window bites 48 h earlier.
    expect(domestic.hoursToLockout - intl.hoursToLockout).toBeCloseTo(
      LOCKOUT_HOURS.international - LOCKOUT_HOURS.domestic,
      5,
    );
  });

  it('reports a negative lockout once the manifest is locked', () => {
    const soon = buildItineraries(
      state({ requests: [confirmedRequest({ legs: [leg({ date: day(0) })] })] }),
      NOW,
    )[0];
    expect(soon.hoursToLockout).toBeLessThan(0);
  });

  it('turns a confirmed seat into an itinerary that names only the claimant', () => {
    const s = state({
      flights: [{
        id: 'F1', date: day(3), from: 'KCVG', to: 'KTEB', depart: '08:00', arrive: '09:45',
        aircraft: 'G650ER', seatsOpen: 1, ownPrincipalIds: [],
      }],
      seatAsks: [{
        id: 'S1', flightId: 'F1', passengerId: 'P2', purpose: 'business',
        status: 'confirmed', createdAt: '2026-08-01T00:00:00Z',
      }],
    });
    const [it] = buildItineraries(s, NOW);
    expect(it.kind).toBe('seat');
    expect(it.ridesOnScheduledTrip).toBe(true);
    // The host trip's manifest is not the claimant's to see.
    expect(it.legs[0].passengers.map((p) => p.name)).toEqual(['K. Tanaka']);
    expect(it.legs[0].aircraft).toBe('G650ER');
  });

  it('drops a confirmed seat whose flight has vanished rather than inventing one', () => {
    const s = state({
      flights: [],
      seatAsks: [{
        id: 'S1', flightId: 'gone', passengerId: 'P2', purpose: 'business',
        status: 'confirmed', createdAt: '2026-08-01T00:00:00Z',
      }],
    });
    expect(buildItineraries(s, NOW)).toEqual([]);
  });

  it('orders trips and seats together, soonest first', () => {
    const s = state({
      requests: [confirmedRequest({ id: 'later', legs: [leg({ date: day(20) })] })],
      flights: [{
        id: 'F1', date: day(2), from: 'KCVG', to: 'KTEB', depart: '08:00', arrive: '09:45',
        aircraft: 'G500', seatsOpen: 1, ownPrincipalIds: [],
      }],
      seatAsks: [{
        id: 'sooner', flightId: 'F1', passengerId: 'P2', purpose: 'business',
        status: 'confirmed', createdAt: '2026-08-01T00:00:00Z',
      }],
    });
    expect(buildItineraries(s, NOW).map((i) => i.id)).toEqual(['sooner', 'later']);
  });
});
