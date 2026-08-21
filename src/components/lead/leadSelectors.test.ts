import { describe, expect, it } from 'vitest';
import {
  buildWeekAhead,
  fleetExceptions,
  buildWaitingOnYou,
  todaysLegs,
  tripsFlownThisMonth,
  type FleetExceptionSource,
} from './leadSelectors';
import type { TripRecord, TripLegRecord } from '../../scheduling/store/types';

const NOW = '2026-08-19T15:00:00.000Z'; // a Wednesday, mid-day UTC
const DAY_MS = 86_400_000;

let tripSeq = 0;

function leg(departureTimeUtc: string, overrides: Partial<TripLegRecord> = {}): TripLegRecord {
  return {
    id: `leg-${++tripSeq}`,
    sequence: 1,
    departureIcao: 'KLUK',
    arrivalIcao: 'KTEB',
    departureTimeUtc,
    arrivalTimeUtc: new Date(Date.parse(departureTimeUtc) + 2 * 3_600_000).toISOString(),
    paxCount: 4,
    filedStatus: 'unfiled',
    ...overrides,
  };
}

function trip(legs: TripLegRecord[], overrides: Partial<TripRecord> = {}): TripRecord {
  const id = `trip-${++tripSeq}`;
  return {
    id,
    tripNumber: `T-${tripSeq}`,
    sourceSystem: 'manual',
    sourceTripRef: null,
    tail: 'N1PG',
    aircraftType: 'G650ER',
    tripType: 'domestic' as TripRecord['tripType'],
    priority: 'standard',
    status: 'confirmed',
    startDate: legs[0]?.departureTimeUtc ?? NOW,
    endDate: legs[legs.length - 1]?.arrivalTimeUtc ?? NOW,
    legs,
    createdBy: 'test',
    createdAtUtc: NOW,
    ...overrides,
  };
}

function exceptionSource(overrides: {
  tailNumber?: string;
  status: string;
  headline?: string | null;
  daysRemaining?: number | null;
  hasClock?: boolean;
}): FleetExceptionSource {
  return {
    tailNumber: overrides.tailNumber ?? 'N1PG',
    airworthiness: {
      status: overrides.status as FleetExceptionSource['airworthiness']['status'],
      headline: overrides.headline ?? null,
      deferralClock:
        overrides.hasClock === false
          ? null
          : { daysRemaining: overrides.daysRemaining ?? null },
    },
  };
}

describe('buildWeekAhead', () => {
  it('returns 7 UTC-day buckets starting today', () => {
    const week = buildWeekAhead([], 5, NOW);
    expect(week).toHaveLength(7);
    expect(week[0].dateUtc).toBe('2026-08-19');
    expect(week[6].dateUtc).toBe('2026-08-25');
    for (const day of week) {
      expect(day.tripCount).toBe(0);
      expect(day.tailsAvailable).toBe(5);
      expect(day.oversubscribed).toBe(false);
    }
  });

  it('counts a trip once per day even with two legs the same day', () => {
    const t = trip([
      leg('2026-08-20T10:00:00.000Z'),
      leg('2026-08-20T18:00:00.000Z'),
    ]);
    const week = buildWeekAhead([t], 5, NOW);
    expect(week[1].tripCount).toBe(1);
  });

  it('counts a multi-leg trip once per each day it touches', () => {
    const t = trip([
      leg('2026-08-20T10:00:00.000Z'),
      leg('2026-08-22T09:00:00.000Z'),
    ]);
    const week = buildWeekAhead([t], 5, NOW);
    expect(week[1].tripCount).toBe(1); // Aug 20
    expect(week[2].tripCount).toBe(0); // Aug 21 — no departing leg
    expect(week[3].tripCount).toBe(1); // Aug 22
  });

  it('flags oversubscribed only when demand exceeds dispatchable (boundary)', () => {
    const sameDay = (n: number) =>
      Array.from({ length: n }, () => trip([leg('2026-08-21T12:00:00.000Z')]));
    const atLimit = buildWeekAhead(sameDay(2), 2, NOW);
    expect(atLimit[2].tripCount).toBe(2);
    expect(atLimit[2].oversubscribed).toBe(false);
    const over = buildWeekAhead(sameDay(3), 2, NOW);
    expect(over[2].oversubscribed).toBe(true);
  });

  it('excludes legs outside the 7-day window and cancelled trips', () => {
    const past = trip([leg(new Date(Date.parse(NOW) - DAY_MS).toISOString())]);
    const beyond = trip([leg(new Date(Date.parse(NOW) + 8 * DAY_MS).toISOString())]);
    const cancelled = trip([leg('2026-08-20T10:00:00.000Z')], { status: 'cancelled' });
    const week = buildWeekAhead([past, beyond, cancelled], 5, NOW);
    expect(week.every(d => d.tripCount === 0)).toBe(true);
  });
});

describe('fleetExceptions', () => {
  it('RED tail yields a grounded pill carrying the headline', () => {
    const pills = fleetExceptions([
      exceptionSource({ tailNumber: 'N2PG', status: 'RED', headline: 'Chip detector — metal found', hasClock: false }),
    ]);
    expect(pills).toEqual([
      { tailNumber: 'N2PG', kind: 'grounded', headline: 'Chip detector — metal found', daysRemaining: null },
    ]);
  });

  it('AMBER with 3 or fewer days remaining yields an expiring pill', () => {
    const pills = fleetExceptions([
      exceptionSource({ tailNumber: 'N6PG', status: 'AMBER', headline: 'APU Generator', daysRemaining: 2 }),
    ]);
    expect(pills).toEqual([
      { tailNumber: 'N6PG', kind: 'deferral-expiring', headline: 'APU Generator', daysRemaining: 2 },
    ]);
  });

  it('AMBER with 10 days remaining yields no pill', () => {
    expect(
      fleetExceptions([exceptionSource({ status: 'AMBER', headline: 'APU Generator', daysRemaining: 10 })]),
    ).toEqual([]);
  });

  it('AMBER with no date clock and GREEN tails yield nothing', () => {
    expect(
      fleetExceptions([
        exceptionSource({ status: 'AMBER', daysRemaining: null }),
        exceptionSource({ status: 'GREEN', hasClock: false }),
      ]),
    ).toEqual([]);
  });
});

describe('buildWaitingOnYou', () => {
  it('merges approvals and FIR gates oldest-first with typed navigation targets', () => {
    const items = buildWaitingOnYou({
      approvals: [
        { id: 'AR-1', subjectTitle: 'Waiver — runway length', formLabel: 'Waiver', requestedAt: '2026-08-18T09:00:00.000Z' },
        { id: 'AR-2', subjectTitle: 'Waiver — duty extension', formLabel: 'Waiver', requestedAt: '2026-08-17T09:00:00.000Z' },
      ],
      firsInReview: [
        { id: 'fir-1', ref: 'FIR-2026-004', title: 'Diversion into KCVG', openedAtUtc: '2026-08-19T01:00:00.000Z' },
      ],
    });
    expect(items.map(i => i.kind)).toEqual(['approval', 'approval', 'fir']);
    expect(items[0].id).toBe('AR-2');
    expect(items[0].target).toBe('/approvals');
    expect(items[2].target).toBe('/fir/fir-1');
    expect(items.map(i => i.sinceUtc)).toEqual([
      '2026-08-17T09:00:00.000Z',
      '2026-08-18T09:00:00.000Z',
      '2026-08-19T01:00:00.000Z',
    ]);
  });

  it('returns empty for empty inputs', () => {
    expect(buildWaitingOnYou({ approvals: [], firsInReview: [] })).toEqual([]);
  });
});

describe('todaysLegs', () => {
  it('returns only legs departing in the current UTC day, sorted by departure', () => {
    const early = trip([leg('2026-08-19T08:00:00.000Z')], { tail: 'N5PG' });
    const late = trip([leg('2026-08-19T20:00:00.000Z')]);
    const tomorrow = trip([leg('2026-08-20T08:00:00.000Z')]);
    const cancelled = trip([leg('2026-08-19T10:00:00.000Z')], { status: 'cancelled' });
    const legs = todaysLegs([late, early, tomorrow, cancelled], NOW);
    expect(legs.map(l => l.departureTimeUtc)).toEqual([
      '2026-08-19T08:00:00.000Z',
      '2026-08-19T20:00:00.000Z',
    ]);
    expect(legs[0].tail).toBe('N5PG');
    expect(legs[0].from).toBe('KLUK');
  });
});

describe('tripsFlownThisMonth', () => {
  it('counts completed trips ending this UTC month, nothing else', () => {
    const doneThisMonth = trip([leg('2026-08-04T10:00:00.000Z')], {
      status: 'completed',
      endDate: '2026-08-05T10:00:00.000Z',
    });
    const doneLastMonth = trip([leg('2026-07-10T10:00:00.000Z')], {
      status: 'completed',
      endDate: '2026-07-11T10:00:00.000Z',
    });
    const stillConfirmed = trip([leg('2026-08-10T10:00:00.000Z')], {
      status: 'confirmed',
      endDate: '2026-08-11T10:00:00.000Z',
    });
    expect(tripsFlownThisMonth([doneThisMonth, doneLastMonth, stillConfirmed], NOW)).toBe(1);
  });
});
