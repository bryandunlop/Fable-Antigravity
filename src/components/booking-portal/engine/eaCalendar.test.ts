import { describe, expect, it } from 'vitest';
import { toCalTrip, defaultSelectedId, initialMonth, isRevised, itineraryToIcs } from './eaCalendar';
import { monthGrid, monthSegments } from '../../inflight/tripCalendar';
import type { Itinerary, ItineraryLeg } from './itinerary';

function leg(over: Partial<ItineraryLeg> = {}): ItineraryLeg {
  return {
    id: 'L1',
    from: 'KCVG',
    to: 'KTEB',
    date: '2026-09-02',
    depart: '08:00',
    fbo: { from: 'Signature CVG', to: 'Meridian TEB' },
    passengers: [{ name: 'A. Reyes', lead: true, purpose: 'business' }],
    ...over,
  };
}

function itin(over: Partial<Itinerary> = {}): Itinerary {
  return {
    id: 'R-1',
    kind: 'trip',
    title: 'KCVG → KTEB',
    dates: '2026-09-02',
    status: 'confirmed',
    legs: [leg()],
    extras: [],
    hoursToLockout: 100,
    international: false,
    ...over,
  };
}

describe('toCalTrip', () => {
  it('names the aircraft on a trip and "seat" on a claimed seat', () => {
    expect(toCalTrip(itin({ legs: [leg({ aircraft: 'N1PG' })] })).tail).toBe('N1PG');
    expect(toCalTrip(itin({ kind: 'seat', legs: [leg({ aircraft: 'N2PG' })] })).tail).toBe('seat');
  });

  it('falls back to TBD when no aircraft is assigned yet', () => {
    expect(toCalTrip(itin()).tail).toBe('TBD');
  });

  it('spans first departure to last leg, so a multi-day trip draws one bar', () => {
    const trip = toCalTrip(
      itin({
        legs: [
          leg({ id: 'L1', date: '2026-09-01', depart: '08:00' }),
          leg({ id: 'L2', date: '2026-09-04', depart: '19:30', from: 'LSGG', to: 'KCVG' }),
        ],
      }),
    );
    const weeks = monthGrid(2026, 8, new Date(2026, 8, 1)); // September 2026
    const segs = monthSegments(weeks, [trip]).flat();
    expect(segs.length).toBeGreaterThan(0);
    const covered = segs.reduce((n, s) => n + (s.endCol - s.startCol + 1), 0);
    expect(covered).toBe(4); // Sep 1,2,3,4
    expect(segs.filter((s) => s.showLabel)).toHaveLength(1);
  });
});

describe('defaultSelectedId', () => {
  const now = Date.parse('2026-09-03T12:00:00');

  it('picks the next trip that has not departed', () => {
    const past = itin({ id: 'R-past', legs: [leg({ date: '2026-09-01' })] });
    const next = itin({ id: 'R-next', legs: [leg({ date: '2026-09-05' })] });
    expect(defaultSelectedId([past, next], now)).toBe('R-next');
  });

  it('falls back to the most recent when everything has departed', () => {
    const a = itin({ id: 'R-a', legs: [leg({ date: '2026-08-20' })] });
    const b = itin({ id: 'R-b', legs: [leg({ date: '2026-09-01' })] });
    expect(defaultSelectedId([a, b], now)).toBe('R-b');
  });

  it('returns null only when there are no itineraries', () => {
    expect(defaultSelectedId([], now)).toBeNull();
  });
});

describe('initialMonth', () => {
  const now = new Date(2026, 7, 28); // 28 Aug 2026

  it('opens on the selected trip’s month, not today’s', () => {
    const sept = itin({ id: 'R-s', legs: [leg({ date: '2026-09-02' })] });
    expect(initialMonth([sept], 'R-s', now)).toEqual({ year: 2026, month: 8 });
  });

  it('falls back to today when nothing is selected', () => {
    expect(initialMonth([], null, now)).toEqual({ year: 2026, month: 7 });
  });

  it('crosses a year boundary correctly', () => {
    const jan = itin({ id: 'R-j', legs: [leg({ date: '2027-01-06' })] });
    expect(initialMonth([jan], 'R-j', now)).toEqual({ year: 2027, month: 0 });
  });
});

describe('isRevised', () => {
  it('is false when nothing was revised', () => {
    expect(isRevised(undefined, '2026-09-01T10:00:00Z')).toBe(false);
  });

  it('is true when revised after the EA last looked, false once she has seen it', () => {
    expect(isRevised('2026-09-02T10:00:00Z', '2026-09-01T09:00:00Z')).toBe(true);
    expect(isRevised('2026-09-02T10:00:00Z', '2026-09-02T11:00:00Z')).toBe(false);
  });

  it('is true when she has never opened it', () => {
    expect(isRevised('2026-09-02T10:00:00Z', undefined)).toBe(true);
  });
});

describe('itineraryToIcs', () => {
  const ics = itineraryToIcs(
    itin({
      legs: [
        leg({ id: 'L1', date: '2026-09-02', depart: '08:00', arrive: '10:15', aircraft: 'N1PG' }),
        leg({ id: 'L2', date: '2026-09-04', depart: '19:30', arrive: '21:40', from: 'KTEB', to: 'KCVG' }),
      ],
    }),
  );

  it('emits one VEVENT per leg with local-time stamps', () => {
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2);
    expect(ics).toContain('DTSTART:20260902T080000');
    expect(ics).toContain('DTEND:20260904T214000');
    expect(ics).not.toContain('Z\r\n'); // local time, never pretend UTC
  });

  it('wraps the calendar and carries route, FBO and passengers', () => {
    expect(ics.startsWith('BEGIN:VCALENDAR')).toBe(true);
    expect(ics.trimEnd().endsWith('END:VCALENDAR')).toBe(true);
    expect(ics).toContain('KCVG → KTEB · N1PG');
    expect(ics).toContain('LOCATION:Signature CVG');
    expect(ics).toContain('Passengers: A. Reyes');
  });

  it('escapes commas in passenger lists so the file stays parseable', () => {
    const two = itineraryToIcs(
      itin({ legs: [leg({ passengers: [{ name: 'A. Reyes', lead: true, purpose: 'business' }, { name: 'M. Osei', lead: false, purpose: 'business' }] })] }),
    );
    expect(two).toContain('Passengers: A. Reyes\\, M. Osei');
  });
});
