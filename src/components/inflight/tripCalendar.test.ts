import { describe, it, expect } from 'vitest';
import {
  monthGrid, dayKey, tripSpan, segmentsForWeek, monthSegments, tripsInMonth, nextTripAfterMonth, addMonths,
} from './tripCalendar';
import type { FaTrip } from './faTrips';

/** Local-time trip, matching how faTrips builds them (setHours, not UTC). */
function trip(id: string, name: string, from: [number, number, number], to: [number, number, number]): FaTrip {
  const dep = new Date(from[0], from[1], from[2], 9, 0, 0);
  const arr = new Date(to[0], to[1], to[2], 18, 0, 0);
  return {
    id, tripNumber: id, tripName: name, tail: 'N1PG', aircraftType: 'G650ER', cabinCrew: ['You'],
    legs: [{
      id: id + '-L1', legNumber: 1, flightNumber: 'PG1', origin: 'KTEB', destination: 'KLAX',
      departureUtc: dep.toISOString(), arrivalUtc: arr.toISOString(), passengerIds: ['PAX001'],
    }],
  };
}

// August 2026: the 1st is a Saturday.
const AUG = 7;
const TODAY = new Date(2026, AUG, 21, 22, 4);

describe('monthGrid', () => {
  const grid = monthGrid(2026, AUG, TODAY);

  it('is always six weeks, so the grid never changes height between months', () => {
    expect(grid).toHaveLength(6);
    for (const w of grid) expect(w).toHaveLength(7);
    expect(monthGrid(2026, 1, TODAY)).toHaveLength(6); // February
  });

  it('starts on a Sunday and puts Aug 1 (a Saturday) in the last column of week 1', () => {
    expect(grid[0][0].date.getDay()).toBe(0);
    expect(grid[0][6].day).toBe(1);
    expect(grid[0][6].inMonth).toBe(true);
    expect(grid[0][0].inMonth).toBe(false);
  });

  it('marks today, and only today', () => {
    const flagged = grid.flat().filter((d) => d.isToday);
    expect(flagged).toHaveLength(1);
    expect(flagged[0].day).toBe(21);
  });

  it('runs consecutively across the month boundary', () => {
    const days = grid.flat();
    for (let i = 1; i < days.length; i++) {
      const gap = days[i].date.getTime() - days[i - 1].date.getTime();
      expect(Math.round(gap / 86400000)).toBe(1);
    }
  });
});

describe('tripSpan', () => {
  it('runs from the first departure to the last arrival, as whole days', () => {
    const span = tripSpan(trip('T', 'x', [2026, AUG, 22], [2026, AUG, 26]))!;
    expect(dayKey(span.start)).toBe('2026-08-22');
    expect(dayKey(span.end)).toBe('2026-08-26');
    expect(span.start.getHours()).toBe(0);
  });
  it('is null for a legless trip rather than an invalid date', () => {
    expect(tripSpan({ ...trip('T', 'x', [2026, AUG, 1], [2026, AUG, 1]), legs: [] })).toBeNull();
  });
});

describe('segmentsForWeek', () => {
  const grid = monthGrid(2026, AUG, TODAY);
  // Aug 22 is Saturday (last column of week 4); 23-26 are Sun-Wed of week 5.
  const crossing = trip('T1', 'West coast rotation', [2026, AUG, 22], [2026, AUG, 26]);

  it('splits a trip that crosses a week boundary into one bar per week', () => {
    const w4 = segmentsForWeek(grid[3], [crossing]);
    const w5 = segmentsForWeek(grid[4], [crossing]);
    expect(w4).toHaveLength(1);
    expect(w5).toHaveLength(1);
    expect(w4[0]).toMatchObject({ startCol: 6, endCol: 6, continuesLeft: false, continuesRight: true });
    expect(w5[0]).toMatchObject({ startCol: 0, endCol: 3, continuesLeft: true, continuesRight: false });
  });

  it('leaves weeks the trip does not touch alone', () => {
    expect(segmentsForWeek(grid[0], [crossing])).toEqual([]);
    expect(segmentsForWeek(grid[5], [crossing])).toEqual([]);
  });

  it('squares off both edges for a trip that spans a whole week', () => {
    const long = trip('T2', 'Long one', [2026, AUG, 1], [2026, AUG, 31]);
    const seg = segmentsForWeek(grid[2], [long])[0];
    expect(seg).toMatchObject({ startCol: 0, endCol: 6, continuesLeft: true, continuesRight: true });
  });

  it('handles a single-day trip', () => {
    const oneDay = trip('T3', 'Day trip', [2026, AUG, 12], [2026, AUG, 12]);
    const seg = segmentsForWeek(grid[2], [oneDay])[0];
    expect(seg).toMatchObject({ startCol: 3, endCol: 3, continuesLeft: false, continuesRight: false });
  });

  it('returns a bar for every trip touching the week', () => {
    const a = trip('A', 'A', [2026, AUG, 10], [2026, AUG, 11]);
    const b = trip('B', 'B', [2026, AUG, 13], [2026, AUG, 14]);
    expect(segmentsForWeek(grid[2], [a, b]).map((s) => s.tripId)).toEqual(['A', 'B']);
  });
});

describe('tripsInMonth', () => {
  const inAug = trip('A', 'Aug', [2026, AUG, 22], [2026, AUG, 26]);
  const inSep = trip('B', 'Sep', [2026, 8, 3], [2026, 8, 5]);
  const straddling = trip('C', 'Straddle', [2026, AUG, 30], [2026, 8, 2]);

  it('counts a trip in every month it touches', () => {
    expect(tripsInMonth([inAug, inSep, straddling], 2026, AUG).map((t) => t.id)).toEqual(['A', 'C']);
    expect(tripsInMonth([inAug, inSep, straddling], 2026, 8).map((t) => t.id)).toEqual(['B', 'C']);
  });
  it('is empty for a quiet month', () => {
    expect(tripsInMonth([inAug], 2026, 6)).toEqual([]);
  });
});

describe('nextTripAfterMonth', () => {
  const aug = trip('A', 'Aug', [2026, AUG, 22], [2026, AUG, 26]);
  const sep = trip('B', 'Sep', [2026, 8, 3], [2026, 8, 5]);
  const oct = trip('C', 'Oct', [2026, 9, 9], [2026, 9, 9]);

  it('finds the soonest trip after the month, so an empty month is not a dead end', () => {
    expect(nextTripAfterMonth([oct, sep, aug], 2026, AUG)?.id).toBe('B');
    expect(nextTripAfterMonth([oct, sep, aug], 2026, 8)?.id).toBe('C');
  });
  it('is null once there is nothing further out', () => {
    expect(nextTripAfterMonth([aug], 2026, 9)).toBeNull();
  });
});

describe('addMonths', () => {
  it('rolls the year over in both directions', () => {
    expect(addMonths(2026, 11, 1)).toEqual({ year: 2027, month: 0 });
    expect(addMonths(2026, 0, -1)).toEqual({ year: 2025, month: 11 });
  });
});

describe('monthSegments', () => {
  const grid = monthGrid(2026, AUG, TODAY);
  // Aug 22 is a lone Saturday stub; 23-26 is the four-day body of the same trip.
  const crossing = trip('T1', 'West coast rotation', [2026, AUG, 22], [2026, AUG, 26]);

  it('labels only the widest segment of a trip', () => {
    const weeks = monthSegments(grid, [crossing]);
    const stub = weeks[3][0];
    const body = weeks[4][0];
    expect(stub).toMatchObject({ startCol: 6, endCol: 6, showLabel: false });
    expect(body).toMatchObject({ startCol: 0, endCol: 3, showLabel: true });
  });

  it('labels the only segment when a trip sits inside one week', () => {
    const inside = trip('T2', 'Short', [2026, AUG, 10], [2026, AUG, 12]);
    const labelled = monthSegments(grid, [inside]).flat().filter((s) => s.showLabel);
    expect(labelled).toHaveLength(1);
  });

  it('labels each trip exactly once across the whole month', () => {
    const a = trip('A', 'A', [2026, AUG, 22], [2026, AUG, 26]);
    const b = trip('B', 'B', [2026, AUG, 5], [2026, AUG, 6]);
    const labelled = monthSegments(grid, [a, b]).flat().filter((s) => s.showLabel);
    expect(labelled.map((s) => s.tripId).sort()).toEqual(['A', 'B']);
  });

  it('returns one entry per week, matching the grid', () => {
    expect(monthSegments(grid, [crossing])).toHaveLength(6);
  });
});
