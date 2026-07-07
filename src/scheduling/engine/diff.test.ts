import { describe, it, expect } from 'vitest';
import { diffTrip, type TripSnapshot } from './diff';

const leg = (over: Partial<TripSnapshot['legs'][number]> = {}) => ({
  id: 'L1', departureTimeUtc: '2026-07-10T14:00:00.000Z', arrivalTimeUtc: '2026-07-10T16:00:00.000Z', paxCount: 4, ...over,
});
const t = (over: Partial<TripSnapshot> = {}): TripSnapshot => ({
  tail: 'N1PG', aircraftType: 'G650ER', legs: [leg()], ...over,
});

describe('diffTrip', () => {
  it('detects an aircraft swap (tail or type)', () => {
    expect(diffTrip(t(), t({ tail: 'N2PG' })).aircraftChanged).toBe(true);
    expect(diffTrip(t(), t({ aircraftType: 'G500' })).aircraftChanged).toBe(true);
    expect(diffTrip(t(), t()).aircraftChanged).toBe(false);
  });

  it('flags a leg reschedule by leg id', () => {
    const d = diffTrip(t(), t({ legs: [leg({ departureTimeUtc: '2026-07-10T18:00:00.000Z' })] }));
    expect(d.legChanges.L1.rescheduled).toBe(true);
    expect(d.legChanges.L1.paxDelta).toBe(0);
  });

  it('computes paxDelta per leg', () => {
    const d = diffTrip(t(), t({ legs: [leg({ paxCount: 6 })] }));
    expect(d.legChanges.L1.paxDelta).toBe(2);
    expect(d.legChanges.L1.rescheduled).toBe(false);
  });

  it('leg reordering (same ids, swapped order) is NOT a reschedule', () => {
    const a = leg({ id: 'A' });
    const b = leg({ id: 'B', departureTimeUtc: '2026-07-12T14:00:00.000Z', arrivalTimeUtc: '2026-07-12T16:00:00.000Z' });
    const d = diffTrip(t({ legs: [a, b] }), t({ legs: [b, a] }));
    expect(d.legChanges.A.rescheduled).toBe(false);
    expect(d.legChanges.B.rescheduled).toBe(false);
  });

  it('added/removed legs do not appear in legChanges', () => {
    const added = diffTrip(t({ legs: [leg({ id: 'A' })] }), t({ legs: [leg({ id: 'A' }), leg({ id: 'B' })] }));
    expect(Object.keys(added.legChanges)).toEqual(['A']);
    const removed = diffTrip(t({ legs: [leg({ id: 'A' }), leg({ id: 'B' })] }), t({ legs: [leg({ id: 'A' })] }));
    expect(Object.keys(removed.legChanges)).toEqual(['A']);
  });
});
