import { describe, it, expect } from 'vitest';
import { groupAlertsByAircraft } from './alertGroups';
import type { TripServiceabilityAlert } from '../tech-log/bridge';
import { deriveTripServiceabilityAlerts } from '../tech-log/engine/tripAlerts';
import { getDefaultState } from '../tech-log/mockData/scenarios';
import { buildMyairopsBookingFixtures } from '../../integration/myairops/fixtures/bookingTrips';
import { mapBookingTripToTripRecord } from '../../integration/myairops/bookingAdapter';
import { toTripsForAlerts } from './alertTrips';

const NOW = '2026-07-21T12:00:00.000Z';

function alert(over: Partial<TripServiceabilityAlert>): TripServiceabilityAlert {
  return {
    kind: 'RED_AT_ETD', severity: 'red', tripId: 't1', tripNumber: 'T-1', tail: 'N2PG',
    etdUtc: '2026-07-24T02:00:00.000Z', detail: 'No. 2 engine chip detector', ...over,
  };
}

describe('groupAlertsByAircraft (synthetic)', () => {
  it('collapses many trips on one grounded aircraft into a single card', () => {
    const groups = groupAlertsByAircraft([
      alert({ tripId: 'a', tripNumber: 'T-1', etdUtc: '2026-07-24T02:00:00.000Z' }),
      alert({ tripId: 'b', tripNumber: 'T-2', etdUtc: '2026-07-25T02:00:00.000Z' }),
      alert({ tripId: 'c', tripNumber: 'T-3', etdUtc: '2026-07-23T02:00:00.000Z' }),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].tail).toBe('N2PG');
    expect(groups[0].trips.map(t => t.tripNumber)).toEqual(['T-3', 'T-1', 'T-2']); // ETD order
    expect(groups[0].counts.redAtEtd).toBe(3);
    expect(groups[0].lastEtdUtc).toBe('2026-07-25T02:00:00.000Z');
  });

  it('keeps mixed kinds on one tail in one card with bucket counts and the worst headline', () => {
    const groups = groupAlertsByAircraft([
      alert({ tail: 'N6PG', kind: 'DEFERRAL_EXPIRES_MID_TRIP', tripId: 'm1', tripNumber: 'M-1',
        etdUtc: '2026-07-29T02:00:00.000Z', dueUtc: '2026-07-30T04:00:00.000Z',
        detail: 'Cat C deferral clock runs out during this trip' }),
      alert({ tail: 'N6PG', kind: 'RED_AT_ETD', tripId: 'r1', tripNumber: 'R-1',
        etdUtc: '2026-08-06T22:00:00.000Z', dueUtc: '2026-07-30T04:00:00.000Z',
        detail: 'Manual Pressurization Control System' }),
      alert({ tail: 'N6PG', kind: 'ACTIVE_DEFERRAL_INFO', severity: 'amber', tripId: 'i1',
        tripNumber: 'I-1', etdUtc: '2026-07-22T19:00:00.000Z', dueUtc: '2026-07-30T04:00:00.000Z',
        detail: 'Departing on an ACTIVE Cat C deferral' }),
    ]);
    expect(groups).toHaveLength(1);
    const g = groups[0];
    expect(g.severity).toBe('red');
    expect(g.headline).toBe('Manual Pressurization Control System'); // RED_AT_ETD outranks
    expect(g.dueUtc).toBe('2026-07-30T04:00:00.000Z');
    expect(g.counts).toEqual({ redAtEtd: 1, midTrip: 1, info: 1 });
  });

  it('sorts red groups before amber, then by earliest exposed ETD', () => {
    const groups = groupAlertsByAircraft([
      alert({ tail: 'N6PG', kind: 'ACTIVE_DEFERRAL_INFO', severity: 'amber',
        etdUtc: '2026-07-22T02:00:00.000Z', tripId: 'x', tripNumber: 'X' }),
      alert({ tail: 'N1PG', etdUtc: '2026-07-25T02:00:00.000Z', tripId: 'y', tripNumber: 'Y' }),
      alert({ tail: 'N2PG', etdUtc: '2026-07-23T02:00:00.000Z', tripId: 'z', tripNumber: 'Z' }),
    ]);
    expect(groups.map(g => g.tail)).toEqual(['N2PG', 'N1PG', 'N6PG']);
  });
});

describe('groupAlertsByAircraft × real engine output', () => {
  it('turns the seeded 3-tail alert flood into at most one card per tail', () => {
    const state = getDefaultState(new Date(NOW).getTime());
    const trips = toTripsForAlerts(
      buildMyairopsBookingFixtures(NOW).map(f => mapBookingTripToTripRecord(f.trip, { nowUtc: NOW })),
    );
    const alerts = deriveTripServiceabilityAlerts(state, trips, NOW);
    const groups = groupAlertsByAircraft(alerts);
    const tails = groups.map(g => g.tail);
    expect(new Set(tails).size).toBe(tails.length); // one card per tail
    expect(tails).toContain('N1PG');
    expect(tails).toContain('N6PG');
    const n6 = groups.find(g => g.tail === 'N6PG')!;
    expect(n6.counts.midTrip).toBe(1); // MAO-7305 crosses the boundary
    expect(n6.dueUtc).toBeDefined();
  });
});
