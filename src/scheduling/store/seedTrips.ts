// Demo trip seeding for the Scheduling Workspace prototype.
//
// The in-memory store starts empty, so demo users would otherwise land on an empty
// Trips tab (and an empty ForeFlight push dropdown). These four trips give every
// demo role something to look at immediately, and between them exercise every
// per-trip checklist path:
//   1. Domestic single-leg (baseline domestic checklist; shown partially worked)
//   2. Domestic 7-pax G650ER round-trip (triggers the 7-pax special-handling item;
//      multi-leg, so the ForeFlight push delivers docs to two flights)
//   3. International to London (international checklist + the UK-ETA country-conditional
//      item, since EGLL resolves to GB)
//   4. DCA/DASSP (the critical TSA/security checklist)
//
// Dates are computed RELATIVE TO now so the trips are always upcoming whenever the
// demo runs. Seeding goes through service.createTripMirror (not store.saveTrip
// directly) so each trip arrives with its per-trip checklist instantiated and its
// readiness derivable — exactly as if a scheduler had mirrored it from myairops.
// Stable trip ids keep re-seeding idempotent (safe under React StrictMode remounts).

import type { SchedulingService } from './service';
import type { TripRecord, TripLegRecord } from './types';

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const MIN_MS = 60 * 1000;

function iso(base: number, offsetMs: number): string {
  return new Date(base + offsetMs).toISOString();
}

interface DemoLegSpec {
  from: string;
  to: string;
  depOffsetMs: number; // relative to base (now)
  durationMs: number;
  pax: number;
}

function buildLegs(tripId: string, specs: DemoLegSpec[], base: number): TripLegRecord[] {
  return specs.map((s, i) => ({
    id: `${tripId}-leg-${i + 1}`,
    sequence: i + 1,
    departureIcao: s.from,
    arrivalIcao: s.to,
    departureTimeUtc: iso(base, s.depOffsetMs),
    arrivalTimeUtc: iso(base, s.depOffsetMs + s.durationMs),
    paxCount: s.pax,
    filedStatus: 'unfiled',
  }));
}

export function buildDemoTrips(nowUtcIso: string): TripRecord[] {
  const base = new Date(nowUtcIso).getTime();
  const common = { createdBy: 'demo-seed', createdAtUtc: nowUtcIso } as const;

  return [
    {
      id: 'demo-trip-domestic',
      tripNumber: 'T-2026-0714',
      sourceSystem: 'myairops',
      sourceTripRef: 'MAO-4471',
      tail: 'N650GS',
      aircraftType: 'G650ER',
      tripType: 'domestic',
      priority: 'standard',
      status: 'confirmed',
      startDate: iso(base, 2 * DAY_MS),
      endDate: iso(base, 2 * DAY_MS + 3 * HOUR_MS),
      legs: buildLegs('demo-trip-domestic', [
        { from: 'KLUK', to: 'KTEB', depOffsetMs: 2 * DAY_MS, durationMs: 100 * MIN_MS, pax: 3 },
      ], base),
      ...common,
    },
    {
      id: 'demo-trip-7pax',
      tripNumber: 'T-2026-0718',
      sourceSystem: 'myairops',
      sourceTripRef: 'MAO-4488',
      tail: 'N800PG',
      aircraftType: 'G650ER',
      tripType: 'domestic',
      priority: 'vip',
      status: 'confirmed',
      startDate: iso(base, 4 * DAY_MS),
      endDate: iso(base, 4 * DAY_MS + 8 * HOUR_MS),
      legs: buildLegs('demo-trip-7pax', [
        { from: 'KLUK', to: 'KMVY', depOffsetMs: 4 * DAY_MS, durationMs: 110 * MIN_MS, pax: 7 },
        { from: 'KMVY', to: 'KLUK', depOffsetMs: 4 * DAY_MS + 6 * HOUR_MS, durationMs: 115 * MIN_MS, pax: 7 },
      ], base),
      ...common,
    },
    {
      id: 'demo-trip-intl',
      tripNumber: 'T-2026-0725',
      sourceSystem: 'myairops',
      sourceTripRef: 'MAO-4502',
      tail: 'N650GS',
      aircraftType: 'G650ER',
      tripType: 'international',
      priority: 'vip',
      status: 'planning',
      startDate: iso(base, 9 * DAY_MS),
      endDate: iso(base, 9 * DAY_MS + 8 * HOUR_MS),
      legs: buildLegs('demo-trip-intl', [
        { from: 'KTEB', to: 'EGLL', depOffsetMs: 9 * DAY_MS, durationMs: 7 * HOUR_MS, pax: 4 },
      ], base),
      ...common,
    },
    {
      id: 'demo-trip-dassp',
      tripNumber: 'T-2026-0731',
      sourceSystem: 'myairops',
      sourceTripRef: 'MAO-4519',
      tail: 'N500PG',
      aircraftType: 'G500',
      tripType: 'dca_dassp',
      priority: 'urgent',
      status: 'confirmed',
      startDate: iso(base, 6 * DAY_MS),
      endDate: iso(base, 6 * DAY_MS + 2 * HOUR_MS),
      legs: buildLegs('demo-trip-dassp', [
        { from: 'KLUK', to: 'KDCA', depOffsetMs: 6 * DAY_MS, durationMs: 95 * MIN_MS, pax: 3 },
      ], base),
      ...common,
    },
  ];
}

export async function seedDemoTrips(service: SchedulingService, nowUtcIso: string): Promise<void> {
  for (const trip of buildDemoTrips(nowUtcIso)) {
    const { instances } = await service.createTripMirror(trip, nowUtcIso);

    // Leave most checklists all-open (that's the "here's your work" state), but show
    // the domestic trip partially worked so the demo has a progressed example too:
    // ack (where required) then complete the first two tasks by display order.
    if (trip.id === 'demo-trip-domestic') {
      const firstTwo = instances.slice().sort((a, b) => a.order - b.order).slice(0, 2);
      for (const inst of firstTwo) {
        if (inst.requiresAck) await service.applyAction(inst.id, { kind: 'ack' }, 'demo-seed', nowUtcIso);
        await service.applyAction(inst.id, { kind: 'complete' }, 'demo-seed', nowUtcIso);
      }
    }
  }
}
