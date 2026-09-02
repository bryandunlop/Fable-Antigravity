import { describe, expect, it } from 'vitest';
import { freeCountByDay, freeCountIndex, averageFreePerDay, anyProvisional } from './freeCount';
import { CORE_TAILS, CORE_FLEET_SIZE } from '../../fleet/registry';
import type { AvailabilityReason, FleetAvailability, TailDayAvailability } from '../types';

const reason = (over: Partial<AvailabilityReason> = {}): AvailabilityReason => ({
  category: 'none', rank: 99, detail: '', untilUtc: null, ...over,
});

function cell(tail: string, dateUtc: string, over: Partial<TailDayAvailability> = {}): TailDayAvailability {
  return {
    tail, dateUtc, state: 'available', reason: reason(), reasons: [reason()],
    conflicts: [], overlay: null, tripId: null,
    crew: { crewsFormable: 2, crewsCommitted: 0, crewsFree: 2, rostered: true },
    ...over,
  };
}

/** A grid where every core tail is free on every given day, then poked at per test. */
function grid(dates: string[], poke: (tail: string, date: string) => Partial<TailDayAvailability> = () => ({})): FleetAvailability {
  return {
    days: dates.map(d => ({ dateUtc: d, dateLabel: d.slice(8) })),
    rows: CORE_TAILS.map(tail => ({
      tail, type: 'G650ER',
      cells: dates.map(d => cell(tail, d, poke(tail, d))),
    })),
    generatedAtUtc: '2026-09-01T12:00:00.000Z',
  };
}

const UNROSTERED: Partial<TailDayAvailability> = {
  state: 'available',
  reason: reason({ category: 'not-yet-rostered', rank: 6, detail: 'beyond the published crew roster' }),
  reasons: [reason({ category: 'not-yet-rostered', rank: 6 })],
  crew: { crewsFormable: 0, crewsCommitted: 0, crewsFree: 0, rostered: false },
};

const blocked = (category: AvailabilityReason['category']): Partial<TailDayAvailability> => ({
  state: 'unavailable',
  reason: reason({ category, rank: 1, detail: 'operator-only' }),
  reasons: [reason({ category, rank: 1 })],
});

describe('freeCountByDay', () => {
  it('counts the whole core fleet when nothing blocks a day', () => {
    const [day] = freeCountByDay(grid(['2026-09-10']));
    expect(day.free).toBe(CORE_FLEET_SIZE);
    expect(day.fleetSize).toBe(CORE_FLEET_SIZE);
    expect(day.confidence).toBe('confident');
  });

  it('does not count a grounded tail as free', () => {
    const [day] = freeCountByDay(grid(['2026-09-10'], (tail) => (tail === CORE_TAILS[0] ? blocked('maintenance') : {})));
    expect(day.free).toBe(CORE_FLEET_SIZE - 1);
  });

  it('does not count a booked tail as free', () => {
    const committed: Partial<TailDayAvailability> = {
      state: 'committed',
      reason: reason({ category: 'committed', rank: 3 }),
      reasons: [reason({ category: 'committed', rank: 3 })],
      tripId: 'T-1',
    };
    const [day] = freeCountByDay(grid(['2026-09-10'], (tail) => (tail === CORE_TAILS[1] ? committed : {})));
    expect(day.free).toBe(CORE_FLEET_SIZE - 1);
  });

  it('does not count a held tail as free', () => {
    const [day] = freeCountByDay(grid(['2026-09-10'], (tail) => (tail === CORE_TAILS[2] ? blocked('held') : {})));
    expect(day.free).toBe(CORE_FLEET_SIZE - 1);
  });

  it('reads a day beyond the crew roster as provisional, not confident', () => {
    const [day] = freeCountByDay(grid(['2027-06-10'], () => UNROSTERED));
    expect(day.free).toBe(CORE_FLEET_SIZE);
    expect(day.confidence).toBe('provisional');
    expect(day.restingOnUnrosteredDays).toBe(true);
  });

  it('a day the grid says nothing about counts as not free, never as free by default', () => {
    const g = grid(['2026-09-10']);
    g.rows[0].cells = []; // one tail simply absent from the grid
    expect(freeCountByDay(g)[0].free).toBe(CORE_FLEET_SIZE - 1);
  });

  it('ignores tails outside the core fleet entirely', () => {
    const g = grid(['2026-09-10']);
    g.rows.push({ tail: 'N7PG', type: 'G500', cells: [cell('N7PG', '2026-09-10')] });
    g.rows.push({ tail: 'N3PG', type: 'G800', cells: [cell('N3PG', '2026-09-10')] });
    expect(freeCountByDay(g)[0].free).toBe(CORE_FLEET_SIZE);
  });

  it('never leaks a tail number into what an EA is shown', () => {
    const json = JSON.stringify(freeCountByDay(grid(['2026-09-10'])));
    for (const tail of CORE_TAILS) expect(json).not.toContain(tail);
  });
});

describe('pending policy', () => {
  const pendingByDate = { '2026-09-10': [CORE_TAILS[0]] };

  it('defaults to approved-only — an unapproved ask does not shrink anyone else’s day', () => {
    const [day] = freeCountByDay(grid(['2026-09-10']), { pendingByDate });
    expect(day.free).toBe(CORE_FLEET_SIZE);
  });

  it('holds the aeroplane when the policy says pending-holds', () => {
    const [day] = freeCountByDay(grid(['2026-09-10']), { pendingPolicy: 'pending-holds', pendingByDate });
    expect(day.free).toBe(CORE_FLEET_SIZE - 1);
  });
});

describe('month strip figures', () => {
  it('averages free-per-day to one decimal', () => {
    const counts = freeCountByDay(grid(['2026-09-10', '2026-09-11'], (tail, date) =>
      date === '2026-09-11' && tail === CORE_TAILS[0] ? blocked('maintenance') : {}));
    expect(averageFreePerDay(counts)).toBe(3.5);
    expect(averageFreePerDay([])).toBe(0);
  });

  it('flags a range that rests on an unpublished roster', () => {
    expect(anyProvisional(freeCountByDay(grid(['2027-06-10'], () => UNROSTERED)))).toBe(true);
    expect(anyProvisional(freeCountByDay(grid(['2026-09-10'])))).toBe(false);
  });

  it('indexes by date for a day-by-day calendar', () => {
    expect(freeCountIndex(grid(['2026-09-10']))['2026-09-10'].free).toBe(CORE_FLEET_SIZE);
  });
});
