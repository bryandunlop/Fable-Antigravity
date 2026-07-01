import { describe, it, expect } from 'vitest';
import { InMemorySchedulingStore } from './memory';
import { SchedulingService } from './service';
import { seedTemplates } from './seed';
import { seedDemoTrips, buildDemoTrips } from './seedTrips';

const NOW = '2026-07-01T12:00:00.000Z';

function makeService() {
  const store = new InMemorySchedulingStore();
  const service = new SchedulingService({
    store,
    idFactory: (seed) => seed,
    officeTzOffsetMinutes: -240,
  });
  return { store, service };
}

describe('buildDemoTrips', () => {
  it('covers all three per-trip checklist types', () => {
    const trips = buildDemoTrips(NOW);
    const types = trips.map((t) => t.tripType);
    expect(types).toContain('domestic');
    expect(types).toContain('international');
    expect(types).toContain('dca_dassp');
  });

  it('places every trip in the future relative to now', () => {
    const base = new Date(NOW).getTime();
    for (const trip of buildDemoTrips(NOW)) {
      for (const leg of trip.legs) {
        expect(new Date(leg.departureTimeUtc).getTime()).toBeGreaterThan(base);
      }
    }
  });

  it('includes a 7-pax G650ER trip and an EGLL (UK) international leg', () => {
    const trips = buildDemoTrips(NOW);
    expect(trips.some((t) => t.aircraftType === 'G650ER' && t.legs.some((l) => l.paxCount >= 7))).toBe(true);
    expect(trips.some((t) => t.tripType === 'international' && t.legs.some((l) => l.arrivalIcao === 'EGLL'))).toBe(true);
  });
});

describe('seedDemoTrips', () => {
  it('persists every demo trip with an instantiated checklist', async () => {
    const { store, service } = makeService();
    await seedTemplates(store);
    await seedDemoTrips(service, NOW);

    const trips = await store.listTrips();
    expect(trips).toHaveLength(4);
    for (const trip of trips) {
      const instances = await store.listInstancesForTrip(trip.id);
      expect(instances.length).toBeGreaterThan(0);
    }
  });

  it('triggers the UK-ETA country-conditional item on the international trip', async () => {
    const { store, service } = makeService();
    await seedTemplates(store);
    await seedDemoTrips(service, NOW);

    const intl = (await store.listTrips()).find((t) => t.tripType === 'international')!;
    const instances = await store.listInstancesForTrip(intl.id);
    expect(instances.some((i) => i.taskDefId === 'intl-uk-eta')).toBe(true);
  });

  it('triggers the 7-pax G650ER special-handling item', async () => {
    const { store, service } = makeService();
    await seedTemplates(store);
    await seedDemoTrips(service, NOW);

    const trip = (await store.listTrips()).find((t) => t.id === 'demo-trip-7pax')!;
    const instances = await store.listInstancesForTrip(trip.id);
    expect(instances.some((i) => i.taskDefId === 'seven-pax-g650-handling')).toBe(true);
  });

  it('marks the first two domestic tasks done (partial-progress example)', async () => {
    const { store, service } = makeService();
    await seedTemplates(store);
    await seedDemoTrips(service, NOW);

    const instances = await store.listInstancesForTrip('demo-trip-domestic');
    expect(instances.filter((i) => i.status === 'done')).toHaveLength(2);
  });

  it('is idempotent — re-seeding does not duplicate trips', async () => {
    const { store, service } = makeService();
    await seedTemplates(store);
    await seedDemoTrips(service, NOW);
    await seedDemoTrips(service, NOW);

    expect(await store.listTrips()).toHaveLength(4);
  });
});
