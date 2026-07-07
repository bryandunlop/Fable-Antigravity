import { describe, it, expect } from 'vitest';
import { SEED_TEMPLATES, seedTemplates } from './seed';
import { InMemorySchedulingStore } from './memory';
import { parseTemplate } from './validate';
import { instantiateRecurring, instantiatePerTrip } from '../engine';
import type { TripContext, DueContext, IdFactory } from '../engine';

describe('SEED_TEMPLATES', () => {
  it('every seed template passes validation (valid scope/triggerType/rules)', () => {
    for (const t of SEED_TEMPLATES) expect(() => parseTemplate(t)).not.toThrow();
  });
  it('includes the daily/monthly/quarterly recurring + domestic/international/dassp per-trip checklists', () => {
    const byScope = SEED_TEMPLATES.map((t) => `${t.triggerType}:${t.scope}`);
    expect(byScope).toEqual(expect.arrayContaining([
      'recurring:daily', 'recurring:monthly', 'recurring:quarterly',
      'per_trip:domestic', 'per_trip:international', 'per_trip:dca_dassp',
    ]));
  });
  it('seedTemplates loads them and they instantiate', async () => {
    const store = new InMemorySchedulingStore();
    await seedTemplates(store);
    const published = await store.listPublishedTemplates();
    expect(published.length).toBe(SEED_TEMPLATES.length);
    const daily = published.find((t) => t.scope === 'daily')!;
    expect(instantiateRecurring(daily, { nowUtc: '2026-06-29T12:00:00.000Z', officeTzOffsetMinutes: -240 }, (s) => s).length)
      .toBeGreaterThan(0);
  });
});

describe('international per-trip template — country-conditional tasks', () => {
  const idf: IdFactory = (seed) => `id:${seed}`;
  const ctx: DueContext = { nowUtc: '2026-06-29T12:00:00.000Z', officeTzOffsetMinutes: -240 };
  const internationalTemplate = SEED_TEMPLATES.find(
    (t) => t.triggerType === 'per_trip' && t.scope === 'international',
  )!;

  const trip = (over: Partial<TripContext> = {}): TripContext => ({
    tripId: 'T-intl', tripType: 'international', tail: 'N1PG', aircraftType: 'G650ER',
    etdUtc: '2026-07-10T14:00:00.000Z', maxPaxCount: 4, isWeekendDeparture: false,
    routeIcaos: [], ...over,
  });

  it('includes the China-conditional task when the route touches a China ICAO', () => {
    const out = instantiatePerTrip(
      [internationalTemplate],
      trip({ routeIcaos: ['KLUK', 'ZBAA'] }),
      { ...ctx, etdUtc: trip().etdUtc },
      idf,
    );
    expect(out.some((t) => t.taskDefId === 'intl-china-arrival-card')).toBe(true);
  });

  it('excludes the China-conditional task for a domestic-only route', () => {
    const out = instantiatePerTrip(
      [internationalTemplate],
      trip({ routeIcaos: ['KLUK', 'KASE'] }),
      { ...ctx, etdUtc: trip().etdUtc },
      idf,
    );
    expect(out.some((t) => t.taskDefId === 'intl-china-arrival-card')).toBe(false);
  });

  it('includes the international-only tasks from the department checklist', () => {
    const out = instantiatePerTrip(
      [internationalTemplate],
      trip({ routeIcaos: ['KLUK', 'EGLL'] }),
      { ...ctx, etdUtc: trip().etdUtc },
      idf,
    );
    const ids = out.map((t) => t.taskDefId);
    expect(ids).toEqual(expect.arrayContaining([
      'intl-schedule-brief', 'intl-mark-post-rest-off', 'intl-trip-binder-printed',
    ]));
  });
});

describe('all-trips tasks — shared across every per-trip template', () => {
  const idf: IdFactory = (seed) => `id:${seed}`;
  const ctx: DueContext = { nowUtc: '2026-06-29T12:00:00.000Z', officeTzOffsetMinutes: -240 };
  const ALL_TRIPS_IDS = [
    'confirm-catering-needs', 'push-to-foreflight', 'final-trip-confirmation-admin',
    'passenger-itinerary-received', 'crew-hotel-information-obtained',
  ];
  const perTripTemplates = SEED_TEMPLATES.filter((t) => t.triggerType === 'per_trip');

  it('every per-trip template defines all five all-trips tasks', () => {
    expect(perTripTemplates.length).toBe(3); // domestic / international / dca_dassp
    for (const t of perTripTemplates) {
      const ids = t.taskDefinitions.map((d) => d.id);
      expect(ids).toEqual(expect.arrayContaining(ALL_TRIPS_IDS));
    }
  });

  it('a domestic trip instantiates all five all-trips tasks', () => {
    const domestic = SEED_TEMPLATES.find((t) => t.triggerType === 'per_trip' && t.scope === 'domestic')!;
    const trip: TripContext = {
      tripId: 'T-dom', tripType: 'domestic', tail: 'N1PG', aircraftType: 'G650ER',
      etdUtc: '2026-07-10T14:00:00.000Z', maxPaxCount: 4, isWeekendDeparture: false,
      routeIcaos: ['KLUK', 'KTEB'],
    };
    const ids = instantiatePerTrip([domestic], trip, { ...ctx, etdUtc: trip.etdUtc }, idf)
      .map((t) => t.taskDefId);
    expect(ids).toEqual(expect.arrayContaining(ALL_TRIPS_IDS));
  });
});
