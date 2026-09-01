import { describe, expect, it } from 'vitest';
import { monthGrid, monthSegments } from '../../inflight/tripCalendar';
import {
  bandFor, barStyle, bumpLineFor, drawable, hasDates, railFor,
  requestDates, toCalTrip, toHubTrip, toHubTrips, monthsTouched,
} from './hubMonth';
import type { RequestLeg, RequestStatus, TripRequest } from '../types';

const leg = (over: Partial<RequestLeg> = {}): RequestLeg => ({
  id: 'L1', from: 'KCVG', to: 'KTEB', date: '2026-09-10', departLocal: '08:00',
  flexHours: 0, estMinutes: 95, estNm: 480, passengers: [], ...over,
});

const req = (over: Partial<TripRequest> = {}): TripRequest => ({
  id: 'R-1', status: 'pending', tier: 1, principalId: 'P1', requestedBy: 'Dana (EA)',
  createdAt: '2026-09-01T12:00:00.000Z', legs: [leg()], extras: [], messages: [], ...over,
});

describe('what gets drawn', () => {
  it('draws a trip with dates and does not draw one without', () => {
    expect(hasDates(req())).toBe(true);
    expect(hasDates(req({ legs: [leg({ date: '' })] }))).toBe(false);
    expect(hasDates(req({ legs: [] }))).toBe(false);
    expect(drawable(toHubTrips([req({ id: 'R-1' }), req({ id: 'R-2', legs: [] })]))).toHaveLength(1);
  });

  it('never puts a tail on a bar — she is never shown one and never picks one', () => {
    expect(toCalTrip(req())!.tail).toBe('');
    const weeks = monthGrid(2026, 8, new Date(2026, 8, 1));
    const segs = monthSegments(weeks, [toCalTrip(req())!]).flat();
    expect(segs.length).toBeGreaterThan(0);
    for (const s of segs) expect(s.label).not.toMatch(/N\d[A-Z]{2}/);
  });

  it('spans first date to last across a multi-day trip', () => {
    const r = req({ legs: [leg({ date: '2026-09-10' }), leg({ id: 'L2', date: '2026-09-14' })] });
    expect(toHubTrip(r).span).toEqual({ start: '2026-09-10', end: '2026-09-14' });
  });

  it('ignores blank leg dates when working out the span', () => {
    const r = req({ legs: [leg({ date: '' }), leg({ id: 'L2', date: '2026-09-12' })] });
    expect(requestDates(r)).toEqual(['2026-09-12']);
  });
});

describe('solid means approved, dashed means asked for', () => {
  const cases: [RequestStatus, string][] = [
    ['draft', 'dashed'], ['requested', 'dashed'], ['pending', 'dashed'],
    ['approved', 'solid'], ['confirmed', 'solid'], ['declined', 'dashed'],
  ];
  for (const [status, style] of cases) {
    it(`${status} is ${style}`, () => expect(barStyle(req({ status }))).toBe(style));
  }
});

describe('the right rail', () => {
  it('sorts trips into the three bands', () => {
    const rail = railFor([
      req({ id: 'R-1', status: 'approved' }),
      req({ id: 'R-2', status: 'pending' }),
      req({ id: 'R-3', status: 'draft', legs: [] }),
      req({ id: 'R-4', status: 'declined' }),
    ]);
    expect(rail.approved.map(t => t.id)).toEqual(['R-1']);
    expect(rail.needsYou.map(t => t.id).sort()).toEqual(['R-2', 'R-4']);
    expect(rail.noDatesYet.map(t => t.id)).toEqual(['R-3']);
  });

  it('a dateless trip is "not on the calendar yet" whatever its status', () => {
    expect(bandFor(req({ status: 'approved', legs: [] }))).toBe('no-dates-yet');
  });

  it('a trip drops onto a week the moment it earns dates — no mode switch', () => {
    const dateless = req({ id: 'R-9', legs: [leg({ date: '' })] });
    expect(bandFor(dateless)).toBe('no-dates-yet');
    const dated = { ...dateless, legs: [leg({ date: '2026-10-02' })] };
    expect(bandFor(dated)).toBe('needs-you');
    expect(drawable(toHubTrips([dated]))).toHaveLength(1);
  });
});

describe('a bump', () => {
  const bumped = (reasonVisibleAt: string | null) => req({
    id: 'R-5', status: 'pending',
    bumpedBy: { id: 'B-1', authorizedBy: 'M. Alvarez, Chief of Staff', reason: 'Board trip took the aircraft', atUtc: '2026-09-02T09:00:00.000Z', reasonVisibleAt },
  });

  it('reads as "working" until a human has actually made the call', () => {
    expect(bumpLineFor(bumped(null))).toBe('Working — scheduling will call you.');
  });

  it('never leaks the reason before the call is marked made', () => {
    expect(bumpLineFor(bumped(null))).not.toContain('Board trip');
  });

  it('names the authoriser and the reason once the call has been made', () => {
    const line = bumpLineFor(bumped('2026-09-02T10:00:00.000Z'))!;
    expect(line).toContain('M. Alvarez');
    expect(line).toContain('Board trip took the aircraft');
  });

  it('is nothing at all on a trip nobody bumped', () => {
    expect(bumpLineFor(req())).toBeNull();
  });

  it('puts the bumped trip in front of her, and draws it dashed again', () => {
    const t = toHubTrip(bumped(null));
    expect(t.band).toBe('needs-you');
    expect(t.style).toBe('dashed');
  });
});

describe('the month strip', () => {
  it('offers every month her trips touch, earliest first', () => {
    expect(monthsTouched([
      req({ id: 'R-1', legs: [leg({ date: '2027-01-04' })] }),
      req({ id: 'R-2', legs: [leg({ date: '2026-09-10' })] }),
    ])).toEqual([{ year: 2026, month: 8 }, { year: 2027, month: 0 }]);
  });
});
