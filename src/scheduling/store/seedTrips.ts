// Demo trip seeding for the Scheduling Workspace prototype.
//
// The in-memory store starts empty, so demo users would otherwise land on an empty
// Trips tab (and an empty ForeFlight push dropdown). These four trips give every
// demo role something to look at immediately, and between them exercise every
// per-trip checklist path:
//   1. Domestic single-leg (baseline domestic checklist; shown partially worked) — N2PG
//   2. Domestic 7-pax G650ER round-trip (triggers the 7-pax special-handling item;
//      multi-leg, so the ForeFlight push delivers docs to two flights) — N1PG
//   3. International to London (international checklist + the UK-ETA country-conditional
//      item, since EGLL resolves to GB) — left on a non-fleet tail (N650GS)
//   4. DCA/DASSP (the critical TSA/security checklist) — N6PG
//
// Tails match the tech-log seed fleet (src/components/tech-log/mockData/fleet.ts) so the
// pilot Flight Hub's Aircraft & acceptance and preflight-by-leg panels populate on a
// cold-open demo — before any scheduler "Release to preflight" — with each aircraft's
// real serviceability/custody/deferral state: N2PG G650ER = GREEN, N1PG G650ER = RED
// (open defect), N6PG G500 = AMBER (active deferral). The international trip is left on a
// NON-fleet tail (N650GS) so the release -> placeholder-aircraft path (tech-log/bridge.ts)
// stays demonstrable.
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
      tail: 'N2PG',
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
      tail: 'N1PG',
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
      tail: 'N6PG',
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
    {
      // Northeast round-trip that exercises the Phase-2 per-airport tasks (KLGA ARO, KBOS PPR,
      // FBO/hangar at every K airport except KLUK, fuel at the KLUK departure) and, with a few
      // re-triggerable tasks pre-completed below, demonstrates re-flag-on-change from the UI.
      id: 'demo-trip-northeast',
      tripNumber: 'T-2026-0716',
      sourceSystem: 'myairops',
      sourceTripRef: 'MAO-4479',
      tail: 'N2PG',
      aircraftType: 'G650ER',
      tripType: 'domestic',
      priority: 'standard',
      status: 'confirmed',
      startDate: iso(base, 3 * DAY_MS),
      endDate: iso(base, 3 * DAY_MS + 10 * HOUR_MS),
      legs: buildLegs('demo-trip-northeast', [
        { from: 'KLUK', to: 'KLGA', depOffsetMs: 3 * DAY_MS, durationMs: 105 * MIN_MS, pax: 4 },
        { from: 'KLGA', to: 'KBOS', depOffsetMs: 3 * DAY_MS + 5 * HOUR_MS, durationMs: 55 * MIN_MS, pax: 4 },
        { from: 'KBOS', to: 'KLUK', depOffsetMs: 3 * DAY_MS + 8 * HOUR_MS, durationMs: 110 * MIN_MS, pax: 4 },
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

    // Pre-complete a few re-triggerable tasks on the northeast trip so the inline-edit re-flag is
    // immediately demoable: pax-forms re-flags on "Add passenger", the KBOS PPR / FBO / hangar
    // re-flag on "Reschedule leg" or "Swap aircraft".
    if (trip.id === 'demo-trip-northeast') {
      const reTriggerable = new Set(['pax-forms', 'kbos-ppr', 'fbo-handling', 'hangar-needed', 'confirm-catering-needs']);
      for (const inst of instances) {
        if (!reTriggerable.has(inst.taskDefId)) continue;
        if (inst.requiresAck) await service.applyAction(inst.id, { kind: 'ack' }, 'demo-seed', nowUtcIso);
        await service.applyAction(inst.id, { kind: 'complete' }, 'demo-seed', nowUtcIso);
      }
    }
  }
}

// ─── Volume seeding (command-center scale) ─────────────────────────────────────────────────────
// The four curated demo trips prove the checklist paths; the command center's plan/run boards
// additionally need month-scale volume to be believable. These trips are generated
// DETERMINISTICALLY (seeded PRNG, stable ids/dates relative to now) and created through
// service.createTripMirror so every one carries a real instantiated checklist, then worked to a
// proximity-correlated depth via real TaskActions — readiness on the boards is genuinely derived.

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = <T,>(arr: T[], rng: () => number): T => arr[Math.floor(rng() * arr.length)];
const int = (min: number, max: number, rng: () => number) => min + Math.floor(rng() * (max - min + 1));

const VOLUME_FLEET = [
  { tail: 'N2PG', aircraftType: 'G650ER' },
  { tail: 'N1PG', aircraftType: 'G650ER' },
  { tail: 'N650GS', aircraftType: 'G650ER' },
  { tail: 'N6PG', aircraftType: 'G500' },
] as const;
const DOM_DESTS = ['KTEB', 'KPBI', 'KASE', 'KDAL', 'KMDW', 'KLAX', 'KMVY', 'KDEN'];
const INTL_DESTS = ['EGLL', 'LFPG', 'LSGG', 'MYNN', 'EGGW'];
const BLOCK_REASONS = ['FBO hangar waitlisted', 'Slot unconfirmed', 'Catering unconfirmed', 'Crew duty limit risk', 'Need pax passports'];

export function buildVolumeTrips(nowUtcIso: string): TripRecord[] {
  const rng = mulberry32(0x5eed_2026);
  const base = new Date(nowUtcIso).getTime();
  const trips: TripRecord[] = [];
  let n = 0;

  for (const ac of VOLUME_FLEET) {
    let offsetDays = -10 + int(0, 3, rng);
    let perTail = 0;
    while (offsetDays < 65 && perTail++ < 8) {
      n++;
      const r = rng();
      const tripType: TripRecord['tripType'] = r < 0.22 ? 'international' : r < 0.3 ? 'dca_dassp' : 'domestic';
      const dest = tripType === 'international' ? pick(INTL_DESTS, rng) : tripType === 'dca_dassp' ? 'KDCA' : pick(DOM_DESTS, rng);
      const durationDays = tripType === 'international' ? int(3, 6, rng) : int(1, 3, rng);
      const pax = int(2, 8, rng);
      const id = `vol-trip-${n}`;
      const depMs = offsetDays * DAY_MS + int(12, 21, rng) * HOUR_MS; // 07:00–16:00 EDT-ish in UTC
      const retMs = depMs + (durationDays * DAY_MS) - int(3, 6, rng) * HOUR_MS;
      const legDur = tripType === 'international' ? 7 * HOUR_MS : 100 * MIN_MS;

      trips.push({
        id,
        tripNumber: `T-2026-8${String(n).padStart(3, '0')}`,
        sourceSystem: 'myairops',
        sourceTripRef: `MAO-8${String(n).padStart(3, '0')}`,
        tail: ac.tail,
        aircraftType: ac.aircraftType,
        tripType,
        priority: rng() < 0.15 ? 'vip' : 'standard',
        status: offsetDays < 0 ? 'completed' : offsetDays <= 2 ? 'confirmed' : 'planning',
        startDate: iso(base, depMs),
        endDate: iso(base, retMs + legDur),
        legs: buildLegs(id, [
          { from: 'KLUK', to: dest, depOffsetMs: depMs, durationMs: legDur, pax },
          { from: dest, to: 'KLUK', depOffsetMs: retMs, durationMs: legDur, pax },
        ], base),
        createdBy: 'volume-seed',
        createdAtUtc: nowUtcIso,
      });
      offsetDays += durationDays + int(2, 5, rng);
    }
  }
  return trips;
}

/** Create the volume trips and work each checklist to a proximity-correlated depth (real actions). */
export async function seedVolumeTrips(service: SchedulingService, nowUtcIso: string): Promise<void> {
  const rng = mulberry32(0x770a2026);
  const base = new Date(nowUtcIso).getTime();
  let blockedCount = 0;

  for (const trip of buildVolumeTrips(nowUtcIso)) {
    const { instances } = await service.createTripMirror(trip, nowUtcIso);
    if (instances.length === 0) continue;

    const offsetDays = (new Date(trip.startDate).getTime() - base) / DAY_MS;
    let workPct: number;
    if (offsetDays < 0) workPct = 1;
    else if (offsetDays <= 5) workPct = 0.85 + rng() * 0.15;
    else if (offsetDays <= 14) workPct = 0.4 + rng() * 0.4;
    else workPct = rng() < 0.5 ? 0 : rng() * 0.3;

    const ordered = instances.slice().sort((a, b) => a.order - b.order);
    const toComplete = Math.round(workPct * ordered.length);
    for (const inst of ordered.slice(0, toComplete)) {
      if (inst.requiresAck) await service.applyAction(inst.id, { kind: 'ack' }, 'volume-seed', nowUtcIso);
      await service.applyAction(inst.id, { kind: 'complete' }, 'volume-seed', nowUtcIso);
    }
    // A few believable blockers on future, incompletely-worked trips.
    if (offsetDays > 0 && workPct < 0.85 && toComplete < ordered.length && blockedCount < 4 && rng() < 0.3) {
      blockedCount++;
      await service.applyAction(ordered[toComplete].id, { kind: 'block', reason: pick(BLOCK_REASONS, rng) }, 'volume-seed', nowUtcIso);
    }
  }
}
