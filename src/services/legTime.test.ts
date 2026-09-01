import { describe, it, expect } from 'vitest';
import { legTimes, formatClockShift, formatElapsed } from './legTime';

describe('legTimes — the long eastbound case (KLUK -> OMDB)', () => {
  const leg = legTimes({
    departureIcao: 'KLUK',
    arrivalIcao: 'OMDB',
    departureUtc: '2026-09-04T22:15:00.000Z',
    arrivalUtc: '2026-09-05T11:40:00.000Z',
  });

  it('renders each end in its own field-local wall clock', () => {
    expect(leg.departure.wallTime).toBe('18:15');
    expect(leg.departure.wallDate).toBe('2026-09-04');
    expect(leg.arrival.wallTime).toBe('15:40');
    expect(leg.arrival.wallDate).toBe('2026-09-05');
  });

  it('reports the local calendar day shift', () => {
    expect(leg.dayShift).toBe(1);
  });

  it('reports true elapsed time from the UTC instants, not the wall clocks', () => {
    expect(leg.elapsedMinutes).toBe(13 * 60 + 25);
    expect(formatElapsed(leg.elapsedMinutes)).toBe('13h 25m');
  });

  it('reports how far the crew resets their watch', () => {
    expect(leg.clockShiftMinutes).toBe(8 * 60); // EDT (-4) -> +04
    expect(formatClockShift(leg.clockShiftMinutes)).toBe('+8h');
  });

  it('labels each zone as the field itself abbreviates it at that instant', () => {
    expect(leg.departure.zoneLabel).toBe('EDT');
    expect(leg.arrival.zoneLabel).toBe('GMT+4');
  });
});

describe('legTimes — the westbound "lands before it left" case (RJTT -> KLAX)', () => {
  const leg = legTimes({
    departureIcao: 'RJTT',
    arrivalIcao: 'KLAX',
    departureUtc: '2026-09-06T08:00:00.000Z',   // 17:00 JST, Sun 6 Sep
    arrivalUtc: '2026-09-06T18:00:00.000Z',     // 11:00 PDT, Sun 6 Sep
  });

  it('lands on the same local calendar day after 10h airborne', () => {
    expect(leg.departure.wallTime).toBe('17:00');
    expect(leg.arrival.wallTime).toBe('11:00');
    expect(leg.dayShift).toBe(0);
    expect(leg.elapsedMinutes).toBe(600);
  });

  it('reports a negative clock shift', () => {
    expect(leg.clockShiftMinutes).toBe(-16 * 60); // JST (+9) -> PDT (-7)
    expect(formatClockShift(leg.clockShiftMinutes)).toBe('-16h');
  });

  it('flags that the arrival wall clock reads earlier than the departure wall clock', () => {
    expect(leg.arrivesBeforeItDeparts).toBe(true);
  });
});

describe('legTimes — an ordinary eastbound leg does not trip the same-day flag', () => {
  it('is false when the arrival wall clock is simply later', () => {
    const leg = legTimes({
      departureIcao: 'OMDB', arrivalIcao: 'KLUK',
      departureUtc: '2026-09-06T03:00:00.000Z',  // 07:00 local Dubai
      arrivalUtc: '2026-09-06T17:30:00.000Z',    // 13:30 local Cincinnati
    });
    expect(leg.dayShift).toBe(0);
    expect(leg.elapsedMinutes).toBe(14 * 60 + 30);
    expect(leg.clockShiftMinutes).toBe(-8 * 60);
    expect(leg.arrivesBeforeItDeparts).toBe(false);
  });
});

describe('legTimes — DST', () => {
  it('uses the offset in force at each end at its own instant', () => {
    // Departs while Eastern is still on EDT, arrives after the fall-back to EST.
    const leg = legTimes({
      departureIcao: 'KLAX',
      arrivalIcao: 'KLUK',
      departureUtc: '2026-11-01T05:00:00.000Z',  // 22:00 PDT, Sat 31 Oct
      arrivalUtc: '2026-11-01T09:00:00.000Z',    // 04:00 EST, Sun 1 Nov
    });
    expect(leg.departure.wallTime).toBe('22:00');
    expect(leg.departure.wallDate).toBe('2026-10-31');
    expect(leg.arrival.wallTime).toBe('04:00');
    expect(leg.arrival.zoneLabel).toBe('EST');
    expect(leg.dayShift).toBe(1);
    expect(leg.elapsedMinutes).toBe(240);
  });

  it('does not let a DST change inside the flight corrupt elapsed time', () => {
    // 01:30 -> 01:30 local across the US fall-back is two real hours.
    const leg = legTimes({
      departureIcao: 'KLUK',
      arrivalIcao: 'KLUK',
      departureUtc: '2026-11-01T05:30:00.000Z',
      arrivalUtc: '2026-11-01T07:30:00.000Z',
    });
    expect(leg.departure.wallTime).toBe('01:30');
    expect(leg.arrival.wallTime).toBe('02:30');
    expect(leg.elapsedMinutes).toBe(120);
  });
});

describe('legTimes — unknown fields never produce a plausible wrong time', () => {
  const leg = legTimes({
    departureIcao: 'KLUK',
    arrivalIcao: 'OTHH', // Doha: no coordinates in the table
    departureUtc: '2026-09-04T22:15:00.000Z',
    arrivalUtc: '2026-09-05T11:40:00.000Z',
  });

  it('returns nulls for the unknown end rather than falling back to UTC', () => {
    expect(leg.arrival.zone).toBeNull();
    expect(leg.arrival.wallTime).toBeNull();
    expect(leg.arrival.zoneLabel).toBeNull();
  });

  it('still reports elapsed time, which needs no zone at all', () => {
    expect(leg.elapsedMinutes).toBe(13 * 60 + 25);
  });

  it('withholds day shift and clock shift, which are meaningless without both zones', () => {
    expect(leg.dayShift).toBeNull();
    expect(leg.clockShiftMinutes).toBeNull();
    expect(leg.arrivesBeforeItDeparts).toBeNull();
  });
});

describe('legTimes — bad input', () => {
  it('returns a null elapsed for an unparseable instant rather than NaN', () => {
    const leg = legTimes({
      departureIcao: 'KLUK', arrivalIcao: 'OMDB',
      departureUtc: 'not a date', arrivalUtc: '2026-09-05T11:40:00.000Z',
    });
    expect(leg.elapsedMinutes).toBeNull();
    expect(leg.departure.wallTime).toBeNull();
  });

  it('reports a negative elapsed time rather than hiding a bad schedule', () => {
    const leg = legTimes({
      departureIcao: 'KLUK', arrivalIcao: 'OMDB',
      departureUtc: '2026-09-05T11:40:00.000Z', arrivalUtc: '2026-09-04T22:15:00.000Z',
    });
    expect(leg.elapsedMinutes).toBe(-(13 * 60 + 25));
  });
});

describe('formatters', () => {
  it('formats elapsed minutes', () => {
    expect(formatElapsed(0)).toBe('0h 00m');
    expect(formatElapsed(65)).toBe('1h 05m');
    expect(formatElapsed(null)).toBe('—');
    expect(formatElapsed(-90)).toBe('-1h 30m');
  });

  it('formats a clock shift, including half-hour zones and no shift at all', () => {
    expect(formatClockShift(0)).toBe('no change');
    expect(formatClockShift(330)).toBe('+5h30m');
    expect(formatClockShift(-570)).toBe('-9h30m');
    expect(formatClockShift(null)).toBe('—');
  });
});
