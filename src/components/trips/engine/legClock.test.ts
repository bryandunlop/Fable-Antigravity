import { describe, it, expect } from 'vitest';
import { legClock, formatLegClock, formatLegWall, estimateMinutes } from './legClock';
import type { TripLeg } from './trip';

const leg = (over: Partial<TripLeg> = {}): TripLeg => ({
  id: 'l1',
  date: '2026-10-16',
  from: { placeName: 'Cincinnati', placeId: null, airport: 'KLUK' },
  to: { placeName: 'Seattle', placeId: null, airport: 'KBFI' },
  timing: { kind: 'depart', departLocal: '09:20', flexHours: 0 },
  positioning: false,
  catering: null,
  ...over,
} as TripLeg);

describe('legClock', () => {
  it('derives departure and arrival instants from the departure field local clock', () => {
    const c = legClock(leg())!;
    // 09:20 at KLUK in October is EDT (UTC-4) -> 13:20Z.
    expect(c.depUtc).toBe('2026-10-16T13:20:00.000Z');
    expect(Date.parse(c.arrUtc)).toBeGreaterThan(Date.parse(c.depUtc));
  });

  it('reads each end in its OWN field clock, not the departure field clock', () => {
    const c = legClock(leg())!;
    expect(c.times.departure.zoneLabel).toBe('EDT');
    expect(c.times.arrival.zoneLabel).toBe('PDT');
    expect(c.times.departure.wallTime).toBe('09:20');
    // Seattle is three hours behind Cincinnati: the arrival wall clock must reflect that.
    expect(c.times.clockShiftMinutes).toBe(-180);
  });

  it('is null when the leg has no date — a leg without a day has no instant', () => {
    expect(legClock(leg({ date: null }))).toBeNull();
  });

  it('still places the departure when the arrival field is scheduling-decides', () => {
    const c = legClock(leg({ to: { placeName: 'Somewhere', placeId: null, airport: null } }))!;
    expect(c.depUtc).toBe('2026-10-16T13:20:00.000Z');
    expect(c.times.arrival.zone).toBeNull();
    expect(c.times.arrival.wallTime).toBeNull();
  });

  it('marks a be-there-by leg as planned — the departure is our number, not scheduling’s', () => {
    expect(legClock(leg())!.planned).toBe(false);
    expect(legClock(leg({ timing: { kind: 'arrive', arriveByLocal: '15:00' } }))!.planned).toBe(true);
    expect(legClock(leg({ timing: { kind: 'flexible' } }))!.planned).toBe(true);
  });
});

describe('formatLegClock', () => {
  it('prints both field clocks with the UTC beside them', () => {
    const s = formatLegClock(legClock(leg())!);
    expect(s).toMatch(/^09:20 EDT → \d{2}:\d{2} PDT · 13:20Z → \d{2}:\d{2}Z$/);
  });

  it('carries the day badge when the arrival lands on another local day', () => {
    // Cincinnati to Dubai overnight: arrives the next local day.
    const s = formatLegClock(legClock(leg({
      to: { placeName: 'Dubai', placeId: null, airport: 'OMDB' },
      timing: { kind: 'depart', departLocal: '22:15', flexHours: 0 },
    }))!);
    expect(s).toContain('+1 day');
  });

  it('falls back to UTC only when a field cannot be placed', () => {
    const s = formatLegClock(legClock(leg({ to: { placeName: 'Somewhere', placeId: null, airport: null } }))!);
    expect(s).toContain('13:20Z');
    expect(s).not.toContain('undefined');
    expect(s).not.toContain('null');
  });
});

describe('formatLegWall', () => {
  it('is the short form for one end: wall clock and zone', () => {
    const c = legClock(leg())!;
    expect(formatLegWall(c.times.departure)).toBe('09:20 EDT');
  });

  it('gives the UTC when the field is unplaced, never a bare number that reads as local', () => {
    const c = legClock(leg({ to: { placeName: 'Somewhere', placeId: null, airport: null } }))!;
    expect(formatLegWall(c.times.arrival)).toMatch(/Z$/);
  });
});

describe('estimateMinutes', () => {
  it('is distance-based when both fields are known', () => {
    expect(estimateMinutes('KLUK', 'KBFI')).toBeGreaterThan(240);
  });
  it('states 120 rather than hiding an unknown', () => {
    expect(estimateMinutes('KLUK', null)).toBe(120);
  });
});
