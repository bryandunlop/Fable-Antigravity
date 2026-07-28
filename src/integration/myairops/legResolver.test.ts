import { describe, it, expect } from 'vitest';
import { resolveLegForTail, UNKNOWN_ARRIVAL_GRACE_HOURS, RESOLUTION_WINDOW_HOURS } from './legResolver';
import type { TripRecord, TripLegRecord } from '../../scheduling/store/types';

const NOW = '2026-07-28T12:00:00.000Z';
const NOW_MS = Date.parse(NOW);
const H = 60 * 60 * 1000;
const at = (hoursFromNow: number) => new Date(NOW_MS + hoursFromNow * H).toISOString();

function leg(over: Partial<TripLegRecord> & Pick<TripLegRecord, 'id' | 'sequence'>): TripLegRecord {
  return {
    departureIcao: 'KLUK',
    arrivalIcao: 'KTEB',
    departureTimeUtc: at(-4),
    arrivalTimeUtc: at(-2),
    paxCount: 3,
    filedStatus: 'unfiled',
    ...over,
  };
}

function trip(over: Partial<TripRecord> & Pick<TripRecord, 'legs'>): TripRecord {
  return {
    id: 'mao-trip-7315',
    tripNumber: 'MAO-7315',
    sourceSystem: 'myairops',
    sourceTripRef: 'MAO-7315',
    tail: 'N2PG',
    aircraftType: 'G650ER',
    tripType: 'domestic',
    priority: 'standard',
    status: 'in_progress',
    startDate: at(-4),
    endDate: at(5),
    createdBy: 'myairops-sync',
    createdAtUtc: NOW,
    ...over,
  };
}

describe('resolveLegForTail', () => {
  it('names the leg in the air and offers no alternate — you are on it', () => {
    const t = trip({
      legs: [leg({ id: 'L1', sequence: 1, departureTimeUtc: at(-1), arrivalTimeUtc: at(1) })],
    });

    const r = resolveLegForTail([t], 'N2PG', NOW);

    expect(r.primary).toMatchObject({ kind: 'in_flight', offsetMs: 0 });
    expect(r.primary?.leg.id).toBe('L1');
    expect(r.alternate).toBeNull();
  });

  it('on the ground mid-turn, defaults to the nearer leg and offers the other', () => {
    // Landed 2h ago; next departure is 3h out -> the leg just flown is nearer.
    const t = trip({
      legs: [
        leg({ id: 'L1', sequence: 1, departureTimeUtc: at(-4), arrivalTimeUtc: at(-2) }),
        leg({ id: 'L2', sequence: 2, departureTimeUtc: at(3), arrivalTimeUtc: at(5) }),
      ],
    });

    const r = resolveLegForTail([t], 'N2PG', NOW);

    expect(r.primary).toMatchObject({ kind: 'just_landed', offsetMs: 2 * H });
    expect(r.primary?.leg.id).toBe('L1');
    expect(r.alternate).toMatchObject({ kind: 'next_departure', offsetMs: 3 * H });
    expect(r.alternate?.leg.id).toBe('L2');
  });

  it('flips the default when the next departure is the nearer of the two', () => {
    const t = trip({
      legs: [
        leg({ id: 'L1', sequence: 1, departureTimeUtc: at(-7), arrivalTimeUtc: at(-5) }),
        leg({ id: 'L2', sequence: 2, departureTimeUtc: at(1), arrivalTimeUtc: at(3) }),
      ],
    });

    const r = resolveLegForTail([t], 'N2PG', NOW);

    expect(r.primary).toMatchObject({ kind: 'next_departure', offsetMs: 1 * H });
    expect(r.primary?.leg.id).toBe('L2');
    expect(r.alternate).toMatchObject({ kind: 'just_landed', offsetMs: 5 * H });
    expect(r.alternate?.leg.id).toBe('L1');
  });

  it('resolves nothing when every leg is outside the window', () => {
    const beyond = RESOLUTION_WINDOW_HOURS + 6;
    const t = trip({
      legs: [leg({ id: 'L1', sequence: 1, departureTimeUtc: at(beyond), arrivalTimeUtc: at(beyond + 2) })],
    });

    const r = resolveLegForTail([t], 'N2PG', NOW);

    expect(r.primary).toBeNull();
    expect(r.alternate).toBeNull();
    expect(r.candidates).toEqual([]);
  });

  it('ignores other tails', () => {
    const t = trip({ tail: 'N1PG', legs: [leg({ id: 'L1', sequence: 1 })] });

    expect(resolveLegForTail([t], 'N2PG', NOW).primary).toBeNull();
    expect(resolveLegForTail([t], 'N1PG', NOW).primary?.leg.id).toBe('L1');
  });

  it('ignores cancelled trips — a cancelled leg is not the leg you are working', () => {
    const t = trip({ status: 'cancelled', legs: [leg({ id: 'L1', sequence: 1 })] });

    expect(resolveLegForTail([t], 'N2PG', NOW).primary).toBeNull();
  });

  it('treats a leg with no arrival time as airborne for the grace, then landed', () => {
    // myairops arrival times are calculated-not-pinned and can be absent.
    const airborne = trip({
      legs: [leg({ id: 'L1', sequence: 1, departureTimeUtc: at(-2), arrivalTimeUtc: undefined })],
    });
    expect(resolveLegForTail([airborne], 'N2PG', NOW).primary).toMatchObject({ kind: 'in_flight' });

    const landed = trip({
      legs: [leg({
        id: 'L1',
        sequence: 1,
        departureTimeUtc: at(-(UNKNOWN_ARRIVAL_GRACE_HOURS + 1)),
        arrivalTimeUtc: undefined,
      })],
    });
    expect(resolveLegForTail([landed], 'N2PG', NOW).primary).toMatchObject({ kind: 'just_landed' });
  });

  it('returns every in-window leg as a candidate so the resolution can be corrected', () => {
    const t = trip({
      legs: [
        leg({ id: 'L1', sequence: 1, departureTimeUtc: at(-6), arrivalTimeUtc: at(-4) }),
        leg({ id: 'L2', sequence: 2, departureTimeUtc: at(-3), arrivalTimeUtc: at(-1) }),
        leg({ id: 'L3', sequence: 3, departureTimeUtc: at(2), arrivalTimeUtc: at(4) }),
      ],
    });

    const r = resolveLegForTail([t], 'N2PG', NOW);

    // Nearest first: landed 1h ago, departs in 2h, landed 4h ago.
    expect(r.candidates.map(c => c.leg.id)).toEqual(['L2', 'L3', 'L1']);
  });

  it('skips legs with unparseable times instead of throwing', () => {
    const t = trip({
      legs: [
        leg({ id: 'BAD', sequence: 1, departureTimeUtc: 'not-a-date', arrivalTimeUtc: 'nope' }),
        leg({ id: 'L2', sequence: 2, departureTimeUtc: at(1), arrivalTimeUtc: at(3) }),
      ],
    });

    const r = resolveLegForTail([t], 'N2PG', NOW);

    expect(r.candidates.map(c => c.leg.id)).toEqual(['L2']);
  });

  it('picks the nearest leg across separate trips for the same tail', () => {
    const older = trip({
      id: 'mao-trip-1', tripNumber: 'MAO-1', sourceTripRef: 'MAO-1',
      legs: [leg({ id: 'OLD', sequence: 1, departureTimeUtc: at(-9), arrivalTimeUtc: at(-7) })],
    });
    const nearer = trip({
      id: 'mao-trip-2', tripNumber: 'MAO-2', sourceTripRef: 'MAO-2',
      legs: [leg({ id: 'NEW', sequence: 1, departureTimeUtc: at(-3), arrivalTimeUtc: at(-1) })],
    });

    const r = resolveLegForTail([older, nearer], 'N2PG', NOW);

    expect(r.primary?.leg.id).toBe('NEW');
    expect(r.primary?.trip.tripNumber).toBe('MAO-2');
  });
});
