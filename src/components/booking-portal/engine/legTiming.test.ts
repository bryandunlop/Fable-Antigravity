import { describe, expect, it } from 'vitest';
import {
  timingOfLeg,
  expectedDeparture,
  departsPreviousDay,
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
