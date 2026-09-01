import { describe, expect, it } from 'vitest';
import {
  timingOfLeg,
  expectedDeparture,
  departsPreviousDay,
  deriveDeparture,
  describeTiming,
  latitudeHours,
  isTimingComplete,
  FLEXIBLE_DAY_HOURS,
  type LegTiming,
} from './legTiming';

describe('timingOfLeg', () => {
  it('reads a legacy leg as a firm-ish departure', () => {
    expect(timingOfLeg({ departLocal: '07:30', flexHours: 2 })).toEqual({
      kind: 'depart', departLocal: '07:30', flexHours: 2,
    });
  });

  it('prefers an explicit timing over the legacy fields', () => {
    const timing: LegTiming = { kind: 'arrive', arriveByLocal: '09:00' };
    expect(timingOfLeg({ timing, departLocal: '07:30', flexHours: 2 })).toBe(timing);
  });

  it('defaults a leg carrying neither', () => {
    expect(timingOfLeg({})).toEqual({ kind: 'depart', departLocal: '08:00', flexHours: 0 });
  });
});

describe('expectedDeparture', () => {
  it('backs the flight time off an arrive-by time', () => {
    expect(expectedDeparture({ kind: 'arrive', arriveByLocal: '09:00' }, 165)).toBe('06:15');
  });

  it('wraps to the previous evening rather than printing a negative time', () => {
    const timing: LegTiming = { kind: 'arrive', arriveByLocal: '06:00' };
    expect(expectedDeparture(timing, 480)).toBe('22:00');
    expect(departsPreviousDay(timing, 480)).toBe(true);
  });

  it('does not claim a previous day when the maths stays inside the day', () => {
    expect(departsPreviousDay({ kind: 'arrive', arriveByLocal: '09:00' }, 165)).toBe(false);
  });

  it('echoes a stated departure and refuses to invent one for a flexible leg', () => {
    expect(expectedDeparture({ kind: 'depart', departLocal: '08:00', flexHours: 2 }, 165)).toBe('08:00');
    expect(expectedDeparture({ kind: 'flexible' }, 165)).toBeNull();
  });

  it('returns null rather than a wrong time when the input is malformed', () => {
    expect(expectedDeparture({ kind: 'arrive', arriveByLocal: '25:00' }, 165)).toBeNull();
    expect(expectedDeparture({ kind: 'arrive', arriveByLocal: '9am' }, 165)).toBeNull();
    expect(expectedDeparture({ kind: 'arrive', arriveByLocal: '09:00' }, Number.NaN)).toBeNull();
  });

  it('rounds a fractional flight time to the minute', () => {
    expect(expectedDeparture({ kind: 'arrive', arriveByLocal: '10:00' }, 90.4)).toBe('08:30');
  });
});

describe('describeTiming', () => {
  it('says what is fixed, in the EA’s words', () => {
    expect(describeTiming({ kind: 'depart', departLocal: '08:00', flexHours: 2 })).toBe('Depart 08:00 ± 2 h');
    expect(describeTiming({ kind: 'depart', departLocal: '08:00', flexHours: 0 })).toBe('Depart 08:00 firm');
    expect(describeTiming({ kind: 'arrive', arriveByLocal: '09:00' })).toBe('Be there by 09:00');
    expect(describeTiming({ kind: 'flexible' })).toBe('Any time that day');
  });
});

describe('latitudeHours', () => {
  it('grows as the ask loosens — the reason the three shapes exist', () => {
    const firm = latitudeHours({ kind: 'depart', departLocal: '08:00', flexHours: 0 });
    const flexed = latitudeHours({ kind: 'depart', departLocal: '08:00', flexHours: 2 });
    const arrive = latitudeHours({ kind: 'arrive', arriveByLocal: '09:00' });
    const any = latitudeHours({ kind: 'flexible' });
    expect(firm).toBe(0);
    expect(flexed).toBe(4);
    expect(arrive).toBe(FLEXIBLE_DAY_HOURS / 2);
    expect(any).toBe(FLEXIBLE_DAY_HOURS);
    expect(firm).toBeLessThan(flexed);
    expect(flexed).toBeLessThan(arrive);
    expect(arrive).toBeLessThan(any);
  });
});

describe('isTimingComplete', () => {
  it('accepts real times and a flexible leg, rejects nonsense', () => {
    expect(isTimingComplete({ kind: 'depart', departLocal: '08:00', flexHours: 0 })).toBe(true);
    expect(isTimingComplete({ kind: 'arrive', arriveByLocal: '23:59' })).toBe(true);
    expect(isTimingComplete({ kind: 'flexible' })).toBe(true);
    expect(isTimingComplete({ kind: 'depart', departLocal: '', flexHours: 0 })).toBe(false);
    expect(isTimingComplete({ kind: 'arrive', arriveByLocal: '24:00' })).toBe(false);
  });
});

// ── Cross-zone arrive-by (TL-47). ────────────────────────────────────────────
// The zone-blind derivation subtracts flight minutes from the ARRIVAL's wall clock and
// presents the answer as the DEPARTURE's local time. Same-zone that is exact; across zones
// it is wrong by the zone difference, and the previous-day flag can flip outright.
describe('deriveDeparture — with both fields known', () => {
  it('is unchanged for a same-zone leg (the case the zone-blind maths was written for)', () => {
    const d = deriveDeparture({ kind: 'arrive', arriveByLocal: '09:00' }, 105, {
      from: 'KLUK', to: 'KTEB', date: '2026-09-05',
    });
    expect(d.clock).toBe('07:15');
    expect(d.previousDay).toBe(false);
    expect(d.zoned).toBe(true);
    expect(d.zoneLabel).toBe('EDT');
  });

  it('crosses the Atlantic correctly — the zone-blind answer was 5h off and on the wrong day', () => {
    const timing = { kind: 'arrive', arriveByLocal: '09:00' } as const;
    const d = deriveDeparture(timing, 420, { from: 'KTEB', to: 'EGLL', date: '2026-09-05' });
    expect(d.clock).toBe('21:00');       // zone-blind said 02:00
    expect(d.previousDay).toBe(true);    // zone-blind said false
    expect(d.zoned).toBe(true);
    expect(d.zoneLabel).toBe('EDT');
  });

  it('crosses to Dubai correctly — the zone-blind answer was 8h off', () => {
    const d = deriveDeparture({ kind: 'arrive', arriveByLocal: '09:00' }, 805, {
      from: 'KLUK', to: 'OMDB', date: '2026-09-05',
    });
    expect(d.clock).toBe('11:35');       // zone-blind said 19:35
    expect(d.previousDay).toBe(true);
    expect(d.zoned).toBe(true);
  });

  it('uses the offset in force on the leg date, not a fixed one', () => {
    const place = { from: 'KLUK', to: 'EGLL' } as const;
    // January: Eastern is EST (-5), London is GMT (+0) -> 5h apart.
    const winter = deriveDeparture({ kind: 'arrive', arriveByLocal: '09:00' }, 420, { ...place, date: '2026-01-15' });
    expect(winter.clock).toBe('21:00');
    expect(winter.zoneLabel).toBe('EST');
    // July: EDT (-4), BST (+1) -> still 5h apart, but both labels moved.
    const summer = deriveDeparture({ kind: 'arrive', arriveByLocal: '09:00' }, 420, { ...place, date: '2026-07-15' });
    expect(summer.clock).toBe('21:00');
    expect(summer.zoneLabel).toBe('EDT');
  });
});

describe('deriveDeparture — when a field cannot be placed', () => {
  it('falls back to the zone-blind clock but says so, rather than claiming a zoned answer', () => {
    const d = deriveDeparture({ kind: 'arrive', arriveByLocal: '09:00' }, 105, {
      from: 'KLUK', to: 'ZZZZ', date: '2026-09-05',
    });
    expect(d.clock).toBe('07:15');
    expect(d.zoned).toBe(false);
    expect(d.zoneLabel).toBeNull();
  });

  it('does the same when no place is supplied at all', () => {
    const d = deriveDeparture({ kind: 'arrive', arriveByLocal: '09:00' }, 420);
    expect(d.clock).toBe('02:00');
    expect(d.zoned).toBe(false);
  });

  it('has nothing to derive for a firm departure or a flexible leg', () => {
    expect(deriveDeparture({ kind: 'depart', departLocal: '08:00', flexHours: 2 }, 120).clock).toBe('08:00');
    expect(deriveDeparture({ kind: 'flexible' }, 120).clock).toBeNull();
  });
});

describe('expectedDeparture / departsPreviousDay stay in step with deriveDeparture', () => {
  it('routes through the same maths when a place is given', () => {
    const timing = { kind: 'arrive', arriveByLocal: '09:00' } as const;
    const place = { from: 'KTEB', to: 'EGLL', date: '2026-09-05' };
    expect(expectedDeparture(timing, 420, place)).toBe('21:00');
    expect(departsPreviousDay(timing, 420, place)).toBe(true);
  });

  it('keeps the old zone-blind behaviour when no place is given', () => {
    const timing = { kind: 'arrive', arriveByLocal: '09:00' } as const;
    expect(expectedDeparture(timing, 420)).toBe('02:00');
    expect(departsPreviousDay(timing, 420)).toBe(false);
  });
});
