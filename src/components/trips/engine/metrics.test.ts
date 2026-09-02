import { describe, expect, it } from 'vitest';
import { createDraft, newLeg, submitItinerary, assignTail, decline, bumpTrip, cancelTrip, type Actor } from './trip';
import { computeMetrics } from './metrics';

const EA: Actor = { name: 'Dana', role: 'ea' };
const SCHED: Actor = { name: 'R. Calloway', role: 'scheduling' };
const NOW = '2026-09-01T00:00:00.000Z';
function submitted(lead: string, at = '2026-08-20T00:00:00.000Z') {
  const t = createDraft({ title: 't', leadPassengerId: lead, leadPassengerName: lead, by: EA, nowUtc: at,
    legs: [newLeg({ from: { placeName: 'a', placeId: null, airport: 'KLUK' }, to: { placeName: 'b', placeId: null, airport: 'KTEB' }, date: '2026-10-01' })] });
  return submitItinerary(t, EA, at);
}

describe('metrics count events, and the reason is a category', () => {
  it('denied by category, bumped by lead, accepted and cancelled', () => {
    const a = assignTail(submitted('M. Osei'), 'N5PG', SCHED, '2026-08-21T00:00:00.000Z', { free: true, reason: null });
    const bumped = bumpTrip(a, SCHED, 'senior-conflict', 'Board moved', '2026-08-22T00:00:00.000Z');
    const d1 = decline(submitted('J. Lindqvist'), SCHED, 'nobody free', '2026-08-23T00:00:00.000Z', 'no-crew');
    const d2 = decline(submitted('M. Osei'), SCHED, '', '2026-08-24T00:00:00.000Z', 'no-crew');
    const d3 = decline(submitted('A. Reyes'), SCHED, 'ten people on a G500', '2026-08-25T00:00:00.000Z', 'not-a-fit');
    const c = cancelTrip(submitted('A. Reyes'), EA, 'meeting moved', '2026-08-26T00:00:00.000Z');
    const ok = assignTail(submitted('A. Reyes'), 'N1PG', SCHED, '2026-08-27T00:00:00.000Z', { free: true, reason: null });
    const m = computeMetrics([bumped, d1, d2, d3, c, ok], NOW);
    expect(m.requests).toBe(6);
    expect(m.accepted).toBe(2);
    expect(m.cancelled).toBe(1);
    expect(m.denied).toBe(3);
    expect(m.deniedByCategory).toEqual([{ category: 'no-crew', label: 'No crew', count: 2 }, { category: 'not-a-fit', label: 'Did not fit the aircraft', count: 1 }]);
    expect(m.bumpedByLead[0]).toEqual({ lead: 'M. Osei', bumped: 1, trips: 2 });
    expect(m.bumps).toBe(1);
  });
  it('a bump needs scheduling and a confirmed trip; it clears the tail and returns the trip to the queue', () => {
    const s = submitted('x');
    expect(bumpTrip(s, SCHED, 'other', '', NOW)).toBe(s);
    const a = assignTail(s, 'N5PG', SCHED, NOW, { free: true, reason: null });
    expect(bumpTrip(a, EA, 'other', '', NOW)).toBe(a);
    const b = bumpTrip(a, SCHED, 'maintenance', 'N5PG AOG', NOW);
    expect(b.status).toBe('submitted'); expect(b.tail).toBeNull();
    expect(b.events.at(-1)).toMatchObject({ kind: 'bumped', category: 'maintenance', tail: 'N5PG' });
  });
  it('events outside the window are not counted', () => {
    const old = decline(submitted('x', '2026-01-01T00:00:00.000Z'), SCHED, '', '2026-01-02T00:00:00.000Z', 'other');
    expect(computeMetrics([old], NOW).denied).toBe(0);
  });
});
