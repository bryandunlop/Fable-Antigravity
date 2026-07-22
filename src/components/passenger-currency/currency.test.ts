import { describe, it, expect } from 'vitest';
import { assessTripPassengerCurrency, type TripManifestInput } from './currency';
import { buildMyairopsBookingFixtures } from '../../integration/myairops/fixtures/bookingTrips';
import { buildCrmContactFixtures } from '../../integration/myairops/fixtures/crmContacts';
import { mapBookingTripToTripRecord } from '../../integration/myairops/bookingAdapter';
import { mapCrmContactToSnapshot } from '../../integration/myairops/crmAdapter';

const NOW = '2026-07-21T12:00:00.000Z';

function fixtureManifests(): TripManifestInput[] {
  return buildMyairopsBookingFixtures(NOW).map(f => {
    const rec = mapBookingTripToTripRecord(f.trip, { nowUtc: NOW });
    return {
      tripId: rec.id,
      tripNumber: rec.tripNumber,
      tail: rec.tail,
      firstEtdUtc: rec.startDate,
      tripEndUtc: rec.endDate,
      passengers: f.passengers.map(p => ({
        name: p.details?.fullName ?? 'Unknown',
        crmPassengerId: p.crmPassengerId ?? null,
      })),
    };
  });
}

function fixtureSnapshots() {
  return buildCrmContactFixtures(NOW).map(mapCrmContactToSnapshot);
}

describe('assessTripPassengerCurrency × myairops fixtures (end-to-end pure)', () => {
  const groups = assessTripPassengerCurrency(fixtureManifests(), fixtureSnapshots(), NOW);
  const byTrip = (n: string) => groups.find(g => g.tripNumber === n)!;
  const byName = (n: string, name: string) => byTrip(n).passengers.find(p => p.name.includes(name))!;

  it('orders trips by first departure and keeps only future trips', () => {
    expect(groups.map(g => g.tripNumber)).toEqual(['MAO-7301', 'MAO-7310', 'MAO-7305']);
  });

  it('marks a fresh CRM record with a valid passport CURRENT (Marcus Webb)', () => {
    expect(byName('MAO-7301', 'Webb').status).toBe('CURRENT');
  });

  it('marks a >2-year-old CRM record STALE (Dana Whitfield)', () => {
    const p = byName('MAO-7301', 'Whitfield');
    expect(p.status).toBe('STALE');
    expect(p.reasons.join(' ')).toMatch(/not updated in over 2 years/);
  });

  it('marks a manifest-only passenger with no CRM link UNMATCHED (R. Castellanos)', () => {
    const p = byName('MAO-7301', 'Castellanos');
    expect(p.status).toBe('UNMATCHED');
    expect(p.crmContactId).toBeUndefined();
  });

  it('flags a passport expiring before trip end as DOC_EXPIRING (Priya Raman on the London trip)', () => {
    const p = byName('MAO-7305', 'Raman');
    expect(p.status).toBe('DOC_EXPIRING');
    expect(p.docExpiresUtc! <= byTrip('MAO-7305').tripEndUtc).toBe(true);
    // Fresh record — staleness is NOT the problem; the document is.
    expect(p.reasons.join(' ')).toMatch(/expires before the trip ends/);
  });

  it('does not flag the same passport on a trip that ends before it expires', () => {
    // Priya's passport (expires now+8d) would be fine on a trip ending tomorrow.
    const shortTrip: TripManifestInput = {
      tripId: 't-short', tripNumber: 'T-SHORT', tail: 'N5PG',
      firstEtdUtc: '2026-07-22T10:00:00.000Z', tripEndUtc: '2026-07-22T18:00:00.000Z',
      passengers: [{ name: 'Priya Raman', crmPassengerId: 503 }],
    };
    const [g] = assessTripPassengerCurrency([shortTrip], fixtureSnapshots(), NOW);
    expect(g.passengers[0].status).toBe('CURRENT');
  });

  it('sorts findings inside a trip by severity and counts needs-action', () => {
    const g = byTrip('MAO-7301');
    expect(g.passengers[0].status).not.toBe('CURRENT');
    expect(g.needsActionCount).toBe(2); // Whitfield STALE + Castellanos UNMATCHED
  });

  it('masks document numbers to the 3-char tail end-to-end', () => {
    const p = byName('MAO-7305', 'Raman');
    expect(p.docTail).toBe('…984');
  });
});
