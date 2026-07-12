import { describe, it, expect } from 'vitest';
import { getDefaultState } from './mockData/scenarios';
import { projectTripIntoTechLogState, summarizePreflight, summarizeTripLifecycle, summarizeFleetServiceability } from './bridge';
import type { PreflightTripInput } from './bridge';
import type { Defect, Postflight, Trip } from './types';

// Deterministic id generator for tests. Prefixed with "test-" so generated ids
// never collide with the fixture's seeded ids (e.g. 'trip-3').
function makeCounterId() {
  let n = 0;
  return (p: string) => `test-${p}-${++n}`;
}

const baseInput: PreflightTripInput = {
  tripNumber: 'TRP-100',
  name: 'KLUK-KTEB',
  tail: 'N5PG', // seeded in getDefaultState()
  aircraftType: 'G650ER',
  createdByOid: 'USR001',
  nowUtc: '2026-06-30T12:00:00Z',
  legs: [
    { sequence: 1, departureIcao: 'KLUK', arrivalIcao: 'KTEB', departureTimeUtc: '2026-07-01T12:00:00Z' },
    { sequence: 2, departureIcao: 'KTEB', arrivalIcao: 'KLUK', departureTimeUtc: '2026-07-02T12:00:00Z', arrivalTimeUtc: '2026-07-02T15:00:00Z' },
  ],
};

describe('projectTripIntoTechLogState', () => {
  it('creates trip + legs with expected defaults', () => {
    const state = getDefaultState();
    const newId = makeCounterId();
    const { state: next, techLogTripId, createdAircraft } = projectTripIntoTechLogState(state, baseInput, newId);

    const trip = next.trips.find(t => t.id === techLogTripId);
    expect(trip).toBeTruthy();
    expect(trip!.tripNumber).toBe('TRP-100');
    expect(trip!.status).toBe('OPEN');
    expect(trip!.flightLogIds).toEqual([]);
    expect(trip!.createdByOid).toBe('USR001');
    expect(trip!.createdAtUtc).toBe('2026-06-30T12:00:00Z');
    expect(createdAircraft).toBe(false); // N5PG is seeded

    expect(trip!.legs).toHaveLength(2);
    expect(trip!.legs![0]).toMatchObject({
      sequence: 1,
      departureIcao: 'KLUK',
      arrivalIcao: 'KTEB',
      departureTimeUtc: '2026-07-01T12:00:00Z',
      arrivalTimeUtc: '2026-07-01T12:00:00Z', // defaults to departureTimeUtc
      fratStatus: 'NOT_STARTED',
      airportReviewed: false,
    });
    expect(trip!.legs![0].fuelRequestId).toBeUndefined();
    expect(trip!.legs![1]).toMatchObject({
      sequence: 2,
      arrivalTimeUtc: '2026-07-02T15:00:00Z', // explicit value preserved
      fratStatus: 'NOT_STARTED',
      airportReviewed: false,
    });
  });

  it('is idempotent by tripNumber — second call returns unchanged state + existing id', () => {
    const state = getDefaultState();
    const newId = makeCounterId();
    const first = projectTripIntoTechLogState(state, baseInput, newId);
    const second = projectTripIntoTechLogState(first.state, baseInput, newId);

    expect(second.techLogTripId).toBe(first.techLogTripId);
    expect(second.createdAircraft).toBe(false);
    expect(second.state).toBe(first.state); // unchanged reference
    expect(second.state.trips.filter(t => t.tripNumber === 'TRP-100')).toHaveLength(1);
  });

  it('matches an existing aircraft by exact tailNumber (no placeholder created)', () => {
    const state = getDefaultState();
    const newId = makeCounterId();
    const aircraftCountBefore = state.aircraft.length;
    const { state: next, createdAircraft } = projectTripIntoTechLogState(state, baseInput, newId);

    expect(createdAircraft).toBe(false);
    expect(next.aircraft).toHaveLength(aircraftCountBefore);
  });

  it('creates a placeholder aircraft when the tail is absent, with a valid type fallback', () => {
    const state = getDefaultState();
    const newId = makeCounterId();
    const input: PreflightTripInput = {
      ...baseInput,
      tripNumber: 'TRP-200',
      tail: 'N999ZZ',
      aircraftType: 'NOT_A_REAL_TYPE', // invalid -> should fall back
    };
    const { state: next, createdAircraft } = projectTripIntoTechLogState(state, input, newId);

    expect(createdAircraft).toBe(true);
    const created = next.aircraft.find(a => a.tailNumber === 'N999ZZ');
    expect(created).toBeTruthy();
    expect(created!.type).toBe('G650ER'); // fallback
    expect(created!.status).toBe('ACTIVE');
    expect(created!.isProvisional).toBe(false);
    expect(created!.serialNumber).toBe('UNSPEC-N999ZZ');
    expect(created!.homeBase).toBe('KLUK'); // from first leg's departureIcao
    expect(created!.airframeTotalHours).toBe(0);
    expect(created!.airframeTotalCycles).toBe(0);

    const trip = next.trips.find(t => t.tripNumber === 'TRP-200');
    expect(trip!.aircraftId).toBe(created!.id);
  });

  it('uses the requested aircraftType when it is a valid enum value', () => {
    const state = getDefaultState();
    const newId = makeCounterId();
    const input: PreflightTripInput = {
      ...baseInput,
      tripNumber: 'TRP-300',
      tail: 'N888ZZ',
      aircraftType: 'G800',
    };
    const { state: next } = projectTripIntoTechLogState(state, input, newId);
    const created = next.aircraft.find(a => a.tailNumber === 'N888ZZ');
    expect(created!.type).toBe('G800');
  });
});

describe('summarizePreflight', () => {
  it('returns null for an unknown tripNumber', () => {
    const state = getDefaultState();
    expect(summarizePreflight(state, 'DOES-NOT-EXIST')).toBeNull();
  });

  it('returns per-leg status and overall NOT_READY initially', () => {
    const state = getDefaultState();
    const newId = makeCounterId();
    const { state: next } = projectTripIntoTechLogState(state, baseInput, newId);

    const summary = summarizePreflight(next, 'TRP-100');
    expect(summary).toBeTruthy();
    expect(summary!.overall).toBe('NOT_READY');
    expect(summary!.legs).toHaveLength(2);
    expect(summary!.legs[0]).toMatchObject({
      sequence: 1,
      departureIcao: 'KLUK',
      arrivalIcao: 'KTEB',
      fratStatus: 'NOT_STARTED',
      airportReviewed: false,
      fuelSubmitted: false,
    });
  });

  it('returns overall READY when every leg is COMPLETED + reviewed', () => {
    const state = getDefaultState();
    const newId = makeCounterId();
    const { state: projected } = projectTripIntoTechLogState(state, baseInput, newId);

    const trip = projected.trips.find(t => t.tripNumber === 'TRP-100')!;
    const readyTrip = {
      ...trip,
      legs: trip.legs!.map(leg => ({ ...leg, fratStatus: 'COMPLETED' as const, airportReviewed: true })),
    };
    const readyState = {
      ...projected,
      trips: projected.trips.map(t => (t.id === trip.id ? readyTrip : t)),
    };

    const summary = summarizePreflight(readyState, 'TRP-100');
    expect(summary!.overall).toBe('READY');
    expect(summary!.legs.every(l => l.fratStatus === 'COMPLETED' && l.airportReviewed)).toBe(true);
  });

  it('reports fuelSubmitted based on presence of fuelRequestId', () => {
    const state = getDefaultState();
    const newId = makeCounterId();
    const { state: projected } = projectTripIntoTechLogState(state, baseInput, newId);
    const trip = projected.trips.find(t => t.tripNumber === 'TRP-100')!;
    const withFuel = {
      ...projected,
      trips: projected.trips.map(t =>
        t.id === trip.id
          ? { ...t, legs: t.legs!.map((leg, i) => (i === 0 ? { ...leg, fuelRequestId: 'fr-1' } : leg)) }
          : t
      ),
    };

    const summary = summarizePreflight(withFuel, 'TRP-100');
    expect(summary!.legs[0].fuelSubmitted).toBe(true);
    expect(summary!.legs[1].fuelSubmitted).toBe(false);
  });
});

describe('summarizeTripLifecycle', () => {
  const lifecycleTrip: Trip = {
    id: 'test-trip-1',
    tripNumber: 'TRP-LC-1',
    aircraftId: 'ac-n5pg', // seeded in getDefaultState()
    name: 'KLUK-KTEB',
    status: 'OPEN',
    flightLogIds: [],
    createdByOid: 'USR001',
    createdAtUtc: '2026-06-30T12:00:00Z',
  };

  function makeDefect(overrides: Partial<Defect>): Defect {
    return {
      id: 'test-defect-' + Math.random().toString(36).slice(2, 8),
      aircraftId: 'ac-n5pg',
      source: 'PIREP',
      ataChapter: '34',
      description: 'test defect',
      severity: 'LOW',
      airworthinessAffecting: false,
      status: 'OPEN',
      reportedByOid: 'USR001',
      reportedAtUtc: '2026-06-30T12:00:00Z',
      signatureId: 'sig-1',
      ...overrides,
    } as Defect;
  }

  function makePostflight(overrides: Partial<Postflight>): Postflight {
    return {
      id: 'test-postflight-' + Math.random().toString(36).slice(2, 8),
      aircraftId: 'ac-n5pg',
      performedByOid: 'USR002',
      performedAtUtc: '2026-06-30T12:00:00Z',
      checklist: [],
      gatheredDefectIds: [],
      signatureId: 'sig-2',
      ...overrides,
    } as Postflight;
  }

  it('returns null for an unknown tripNumber', () => {
    const state = getDefaultState();
    expect(summarizeTripLifecycle(state, 'DOES-NOT-EXIST')).toBeNull();
  });

  it('counts open squawks per-aircraft, excluding CLOSED and other aircraft', () => {
    const state = getDefaultState();
    const stateWithTrip = { ...state, trips: [...state.trips, lifecycleTrip] };
    const stateWithDefects = {
      ...stateWithTrip,
      defects: [
        ...stateWithTrip.defects,
        makeDefect({ id: 'd-1', aircraftId: 'ac-n5pg', status: 'OPEN' }),
        makeDefect({ id: 'd-2', aircraftId: 'ac-n5pg', status: 'OPEN' }),
        makeDefect({ id: 'd-3', aircraftId: 'ac-n5pg', status: 'CLOSED' }),
        makeDefect({ id: 'd-4', aircraftId: 'ac-n2pg', status: 'OPEN' }), // different aircraft
      ],
    };

    const summary = summarizeTripLifecycle(stateWithDefects, 'TRP-LC-1');
    expect(summary).toBeTruthy();
    expect(summary!.openSquawks).toBe(2);
  });

  it('counts groundingSquawks as OPEN defects with airworthinessAffecting null or true', () => {
    const state = getDefaultState();
    const stateWithTrip = { ...state, trips: [...state.trips, lifecycleTrip] };
    const stateWithDefects = {
      ...stateWithTrip,
      defects: [
        ...stateWithTrip.defects,
        makeDefect({ id: 'd-1', status: 'OPEN', airworthinessAffecting: true }),
        makeDefect({ id: 'd-2', status: 'OPEN', airworthinessAffecting: null }),
        makeDefect({ id: 'd-3', status: 'OPEN', airworthinessAffecting: false }),
      ],
    };

    const summary = summarizeTripLifecycle(stateWithDefects, 'TRP-LC-1');
    expect(summary!.openSquawks).toBe(3);
    expect(summary!.groundingSquawks).toBe(2); // true + null, not false
  });

  it('postflightDone is true only for a postflight at/after trip.createdAtUtc', () => {
    const state = getDefaultState();
    const stateWithTrip = { ...state, trips: [...state.trips, lifecycleTrip] };

    const beforeState = {
      ...stateWithTrip,
      postflights: [...stateWithTrip.postflights, makePostflight({ performedAtUtc: '2026-06-29T00:00:00Z' })],
    };
    expect(summarizeTripLifecycle(beforeState, 'TRP-LC-1')!.postflightDone).toBe(false);

    const afterState = {
      ...stateWithTrip,
      postflights: [...stateWithTrip.postflights, makePostflight({ performedAtUtc: '2026-07-01T00:00:00Z' })],
    };
    expect(summarizeTripLifecycle(afterState, 'TRP-LC-1')!.postflightDone).toBe(true);

    const atState = {
      ...stateWithTrip,
      postflights: [...stateWithTrip.postflights, makePostflight({ performedAtUtc: lifecycleTrip.createdAtUtc })],
    };
    expect(summarizeTripLifecycle(atState, 'TRP-LC-1')!.postflightDone).toBe(true);
  });

  it('flown reflects flightLogIds presence', () => {
    const state = getDefaultState();
    const notFlown = { ...state, trips: [...state.trips, lifecycleTrip] };
    expect(summarizeTripLifecycle(notFlown, 'TRP-LC-1')!.flown).toBe(false);

    const flownTrip: Trip = { ...lifecycleTrip, flightLogIds: ['fl-1'] };
    const flown = { ...state, trips: [...state.trips, flownTrip] };
    expect(summarizeTripLifecycle(flown, 'TRP-LC-1')!.flown).toBe(true);
  });

  it('returns aircraftTail from matched aircraft and tripStatus from the trip', () => {
    const state = getDefaultState();
    const stateWithTrip = { ...state, trips: [...state.trips, lifecycleTrip] };
    const summary = summarizeTripLifecycle(stateWithTrip, 'TRP-LC-1');
    expect(summary!.aircraftTail).toBe('N5PG');
    expect(summary!.tripStatus).toBe('OPEN');
  });
});

describe('summarizeFleetServiceability', () => {
  it('derives per-tail RAG from tech-log state — N1PG RED (open defect), N6PG AMBER (active deferral), N5PG GREEN', () => {
    const svc = summarizeFleetServiceability(getDefaultState(), new Date().toISOString());
    expect(svc['N1PG']).toBe('RED');
    expect(svc['N6PG']).toBe('AMBER');
    expect(svc['N5PG']).toBe('GREEN');
  });

  it('covers every aircraft in the fleet', () => {
    const state = getDefaultState();
    const svc = summarizeFleetServiceability(state, new Date().toISOString());
    for (const ac of state.aircraft) expect(svc[ac.tailNumber]).toMatch(/^(GREEN|AMBER|RED)$/);
  });
});
