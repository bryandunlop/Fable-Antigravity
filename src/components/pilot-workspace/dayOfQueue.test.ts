import { describe, it, expect } from 'vitest';
import { deriveDayOfQueue, beforePushProgress, formatCountdown } from './dayOfQueue';
import type { Trip, TripLeg, Aircraft } from '../tech-log/types';

const leg = (over: Partial<TripLeg> & { sequence: number; departureTimeUtc: string }): TripLeg => ({
  id: `leg-${over.sequence}`,
  departureIcao: 'KLUK',
  arrivalIcao: 'KTEB',
  arrivalTimeUtc: '2026-08-18T16:00:00.000Z',
  fratStatus: 'NOT_STARTED',
  airportReviewed: false,
  ...over,
} as TripLeg);

const AC = { id: 'ac-1', tailNumber: 'N6PG', homeBase: 'KLUK' } as Aircraft;
const trip = (legs: TripLeg[]) => ({ id: 't1', tripNumber: 'T-2026-0718', legs } as Trip);

// Inside the T-4h window for a 14:20Z departure.
const NOW = '2026-08-18T12:00:00.000Z';

describe('day-of queue (D84 slice 3)', () => {
  it('is ordered by when each item is DUE, not by which module owns it', () => {
    const q = deriveDayOfQueue(
      trip([
        leg({ sequence: 1, departureTimeUtc: '2026-08-18T14:20:00.000Z' }),
        leg({ sequence: 2, departureIcao: 'KTEB', departureTimeUtc: '2026-08-18T19:05:00.000Z' }),
      ]),
      AC,
      NOW,
    );
    // Leg 1's FRAT and airport are due at 14:20; leg 2's at 19:05. Ordering is by dueUtc.
    expect(q.map((i) => i.dueUtc)).toEqual([...q.map((i) => i.dueUtc)].sort());
    expect(q[0].legSequence).toBe(1);
    expect(q[q.length - 1].legSequence).toBe(2);
  });

  it('drops what is already done', () => {
    const q = deriveDayOfQueue(
      trip([leg({ sequence: 1, departureTimeUtc: '2026-08-18T14:20:00.000Z', fratStatus: 'COMPLETED', airportReviewed: true, fuelRequestId: 'fr-1' })]),
      AC,
      NOW,
    );
    expect(q).toEqual([]);
  });

  it('carries a FRAT draft through as resumable rather than as untouched', () => {
    const q = deriveDayOfQueue(
      trip([leg({ sequence: 1, departureTimeUtc: '2026-08-18T14:20:00.000Z', fratStatus: 'IN_PROGRESS', airportReviewed: true })]),
      AC,
      NOW,
    );
    expect(q.find((i) => i.kind === 'frat')?.state).toBe('draft');
  });

  it('still shows a missed home-base fuel request, and marks it locked', () => {
    // The whole reason day-of starts AT the fuel lock: if the pilot missed it, day-of is where they
    // find out. Dropping it because it is no longer actionable would hide the miss.
    const q = deriveDayOfQueue(
      trip([leg({ sequence: 1, departureTimeUtc: '2026-08-18T14:20:00.000Z', airportReviewed: true, fratStatus: 'COMPLETED' })]),
      AC,
      NOW,
    );
    expect(q.map((i) => i.kind)).toEqual(['fuel']);
    expect(q[0].state).toBe('locked');
    expect(q[0].dueUtc).toBe('2026-08-18T10:20:00.000Z'); // the lock, not the ETD
  });

  it('ignores legs that have already departed', () => {
    const q = deriveDayOfQueue(
      trip([
        leg({ sequence: 1, departureTimeUtc: '2026-08-18T06:00:00.000Z' }),
        leg({ sequence: 2, departureIcao: 'KTEB', departureTimeUtc: '2026-08-18T19:05:00.000Z' }),
      ]),
      AC,
      NOW,
    );
    expect(q.every((i) => i.legSequence === 2)).toBe(true);
  });

  it('is empty for a trip with no legs rather than throwing', () => {
    expect(deriveDayOfQueue(trip([]), AC, NOW)).toEqual([]);
    expect(deriveDayOfQueue(null, undefined, NOW)).toEqual([]);
  });
});

describe('before-push progress (D84 slice 3)', () => {
  const LEGS = [
    leg({ sequence: 1, departureTimeUtc: '2026-08-18T14:20:00.000Z' }),
    leg({ sequence: 2, departureIcao: 'KTEB', departureTimeUtc: '2026-08-18T19:05:00.000Z' }),
  ];

  it('counts only the NEXT leg — "before push" is about this departure, not the whole trip', () => {
    const p = beforePushProgress(trip(LEGS), AC, NOW);
    expect(p.total).toBe(3); // frat + airport + home-base fuel
    expect(p.done).toBe(0);
  });

  it('counts a locked-and-unsubmitted fuel request as NOT done', () => {
    const p = beforePushProgress(trip(LEGS), AC, NOW);
    expect(p.done).toBe(0);
  });

  it('reaches full once the next leg is prepped', () => {
    const p = beforePushProgress(
      trip([leg({ sequence: 1, departureTimeUtc: '2026-08-18T14:20:00.000Z', fratStatus: 'COMPLETED', airportReviewed: true, fuelRequestId: 'fr-1' })]),
      AC,
      NOW,
    );
    expect(p).toEqual({ done: 3, total: 3 });
  });

  it('is zero-of-zero when there is no next leg, not a divide by nothing', () => {
    expect(beforePushProgress(trip([]), AC, NOW)).toEqual({ done: 0, total: 0 });
  });
});

describe('countdown formatting', () => {
  const now = '2026-08-18T08:33:00.000Z';
  it('reads hours and zero-padded minutes down to the departure', () => {
    expect(formatCountdown(now, '2026-08-18T14:20:00.000Z')).toBe('T−5:47');
    expect(formatCountdown(now, '2026-08-18T08:42:00.000Z')).toBe('T−0:09');
  });

  it('flips the sign rather than rendering a negative', () => {
    expect(formatCountdown(now, '2026-08-18T08:21:00.000Z')).toBe('T+0:12');
  });

  it('pads single-digit minutes, so 5:07 never reads as 5:7', () => {
    expect(formatCountdown(now, '2026-08-18T13:40:00.000Z')).toBe('T−5:07');
  });

  it('is undefined with no target, rather than NaN on screen', () => {
    expect(formatCountdown(now, undefined)).toBeUndefined();
    expect(formatCountdown(now, 'not-a-date')).toBeUndefined();
  });
});
