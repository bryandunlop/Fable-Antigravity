import { describe, expect, it } from 'vitest';
import { seedTrips } from './tripsStore';
import { tripsToRecords } from '../engine/projection';
import { seedMyairopsBookingTrips } from '../../../integration/myairops/seedMyairops';
import { InMemorySchedulingStore, SchedulingService, seedTemplates } from '../../../scheduling/store';

// Bryan, 2026-09-03: "there shouldn't be any trip overlaps on the board for a tail number. They
// aren't double booked." A tail flies one trip at a time; the demo seed must say so.
describe('the demo never double-books a tail', () => {
  it('no two trips on one tail overlap in time (bookings and the myairops fixtures together)', async () => {
    const now = new Date().toISOString();
    const store = new InMemorySchedulingStore();
    const service = new SchedulingService({ store, idFactory: s => s, officeTzOffsetMinutes: -240 });
    await seedTemplates(store);
    await seedMyairopsBookingTrips(service, now);
    const recs = [...tripsToRecords(seedTrips()), ...(await store.listTrips())];
    const spans = recs.map(r => ({ id: r.tripNumber, tail: r.tail, s: Date.parse(r.legs[0].departureTimeUtc), e: Date.parse(r.legs.at(-1)!.arrivalTimeUtc ?? r.legs.at(-1)!.departureTimeUtc) }));
    const clashes: string[] = [];
    for (let i = 0; i < spans.length; i++) for (let j = i + 1; j < spans.length; j++) {
      const a = spans[i], b = spans[j];
      if (a.tail === b.tail && a.s < b.e && b.s < a.e) clashes.push(`${a.tail}: ${a.id} × ${b.id}`);
    }
    expect(clashes).toEqual([]);
  });
});
