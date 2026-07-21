import { describe, it, expect } from 'vitest';
import { deriveTripServiceabilityAlerts, type TripForAlerts } from './tripAlerts';
import { getDefaultState } from '../mockData/scenarios';
import { buildMyairopsBookingFixtures } from '../../../integration/myairops/fixtures/bookingTrips';
import { mapBookingTripToTripRecord } from '../../../integration/myairops/bookingAdapter';

const NOW = '2026-07-21T12:00:00.000Z';
const NOW_MS = new Date(NOW).getTime();

/** The myairops fixtures, through the real adapter, into the alert engine's shape. */
function fixtureTrips(): TripForAlerts[] {
  return buildMyairopsBookingFixtures(NOW).map(f => {
    const rec = mapBookingTripToTripRecord(f.trip, { nowUtc: NOW });
    return {
      tripId: rec.id,
      tripNumber: rec.tripNumber,
      tail: rec.tail,
      legs: rec.legs.map(l => ({
        legId: l.id,
        departureTimeUtc: l.departureTimeUtc,
        ...(l.arrivalTimeUtc ? { arrivalTimeUtc: l.arrivalTimeUtc } : {}),
      })),
    };
  });
}

describe('deriveTripServiceabilityAlerts × seeded fleet × myairops fixtures (end-to-end pure)', () => {
  const state = getDefaultState(NOW_MS);
  const alerts = deriveTripServiceabilityAlerts(state, fixtureTrips(), NOW);

  it('flags the trip on the RED aircraft (N1PG open gear defect) at its ETD', () => {
    const a = alerts.find(x => x.tripNumber === 'MAO-7301');
    expect(a).toBeDefined();
    expect(a!.kind).toBe('RED_AT_ETD');
    expect(a!.severity).toBe('red');
    expect(a!.tail).toBe('N1PG');
    expect(a!.drivingDefectId).toBe('d-n1pg');
    expect(a!.detail).toMatch(/landing gear/i);
  });

  it('flags the N6PG trip whose Cat-C deferral clock runs out mid-trip', () => {
    const a = alerts.find(x => x.tripNumber === 'MAO-7305');
    expect(a).toBeDefined();
    expect(a!.kind).toBe('DEFERRAL_EXPIRES_MID_TRIP');
    expect(a!.severity).toBe('red');
    expect(a!.tail).toBe('N6PG');
    expect(a!.drivingDeferralId).toBe('df-n6pg');
    // The due boundary must genuinely sit inside the trip window.
    const trip = fixtureTrips().find(t => t.tripNumber === 'MAO-7305')!;
    const tripEnd = trip.legs[trip.legs.length - 1].arrivalTimeUtc!;
    expect(a!.dueUtc! > trip.legs[0].departureTimeUtc).toBe(true);
    expect(a!.dueUtc! <= tripEnd).toBe(true);
  });

  it('raises nothing for the GREEN aircraft trip (N5PG)', () => {
    expect(alerts.find(x => x.tripNumber === 'MAO-7310')).toBeUndefined();
  });

  it('sorts RED findings ahead of amber and by ETD within a kind', () => {
    const kinds = alerts.map(a => a.kind);
    const redIdx = kinds.indexOf('RED_AT_ETD');
    const midIdx = kinds.indexOf('DEFERRAL_EXPIRES_MID_TRIP');
    expect(redIdx).toBeGreaterThanOrEqual(0);
    expect(midIdx).toBeGreaterThan(redIdx);
  });
});

describe('deriveTripServiceabilityAlerts unit behaviours', () => {
  const state = getDefaultState(NOW_MS);
  const day = (n: number, h = 0) => new Date(NOW_MS + n * 86400000 + h * 3600000).toISOString();

  const trip = (tail: string, tripNumber: string, depDay: number, retDay: number): TripForAlerts => ({
    tripId: `t-${tripNumber}`, tripNumber, tail,
    legs: [
      { legId: 'l1', departureTimeUtc: day(depDay), arrivalTimeUtc: day(depDay, 3) },
      { legId: 'l2', departureTimeUtc: day(retDay), arrivalTimeUtc: day(retDay, 3) },
    ],
  });

  it('reports ACTIVE_DEFERRAL_INFO (amber) for a short trip inside the N6PG clock', () => {
    const alerts = deriveTripServiceabilityAlerts(state, [trip('N6PG', 'T-SHORT', 1, 2)], NOW);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].kind).toBe('ACTIVE_DEFERRAL_INFO');
    expect(alerts[0].severity).toBe('amber');
    expect(alerts[0].drivingDeferralId).toBe('df-n6pg');
    expect(alerts[0].dueUtc).toBeDefined();
  });

  it('skips non-fleet tails silently (nothing derivable)', () => {
    const alerts = deriveTripServiceabilityAlerts(state, [trip('N650GS', 'T-PLACEHOLDER', 1, 2)], NOW);
    expect(alerts).toHaveLength(0);
  });

  it('skips trips already fully in the past', () => {
    const alerts = deriveTripServiceabilityAlerts(state, [trip('N1PG', 'T-PAST', -5, -4)], NOW);
    expect(alerts).toHaveLength(0);
  });

  it('reports the N6PG deferral as RED_AT_ETD when the departure itself is past the due boundary', () => {
    // Departure at +20d is far beyond the Cat-C clock (due ≈ +8d).
    const alerts = deriveTripServiceabilityAlerts(state, [trip('N6PG', 'T-LATE', 20, 21)], NOW);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].kind).toBe('RED_AT_ETD');
    expect(alerts[0].drivingDeferralId).toBe('df-n6pg');
  });
});
