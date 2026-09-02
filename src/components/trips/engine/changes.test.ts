import { describe, expect, it } from 'vitest';
import { createDraft, newLeg, submitItinerary, requestChange, decideChange, pendingChanges, passengerEditPolicy, type Actor } from './trip';

const EA: Actor = { name: 'Dana', role: 'ea' };
const SCHED: Actor = { name: 'R. Calloway', role: 'scheduling' };
const T = '2026-09-01T00:00:00.000Z';
function submitted() {
  const t = createDraft({ title: 't', leadPassengerId: 'P', leadPassengerName: 'A. Reyes', by: EA, nowUtc: T,
    legs: [newLeg({ from: { placeName: 'Cincinnati', placeId: null, airport: 'KLUK' }, to: { placeName: 'Seattle', placeId: null, airport: 'KBFI' }, date: '2026-10-14', timing: { kind: 'arrive', arriveByLocal: '15:00' } })] });
  return submitItinerary(t, EA, T);
}

describe('changes after submission need scheduling', () => {
  it('the EA asks to move the date; nothing moves until scheduling approves; then it does', () => {
    let t = submitted();
    const legId = t.legs[0].id;
    t = requestChange(t, legId, { date: '2026-10-15' }, 'Meeting moved a day', EA, T);
    expect(t.legs[0].date).toBe('2026-10-14');
    expect(pendingChanges(t)).toHaveLength(1);
    expect(t.events.at(-1)).toMatchObject({ kind: 'change-requested' });
    // the EA cannot decide
    expect(decideChange(t, pendingChanges(t)[0].id, true, '', EA, T)).toBe(t);
    t = decideChange(t, pendingChanges(t)[0].id, true, 'Fine, crew works', SCHED, T);
    expect(t.legs[0].date).toBe('2026-10-15');
    expect(pendingChanges(t)).toHaveLength(0);
    expect(t.changeRequests[0]).toMatchObject({ status: 'approved', decidedBy: 'R. Calloway' });
  });
  it('a rejected change leaves the itinerary alone; only one pending per leg; a draft does not use this path', () => {
    let t = submitted();
    const legId = t.legs[0].id;
    t = requestChange(t, legId, { timing: { kind: 'arrive', arriveByLocal: '12:00' } }, 'earlier', EA, T);
    expect(requestChange(t, legId, { date: '2026-10-20' }, 'again', EA, T)).toBe(t);
    t = decideChange(t, pendingChanges(t)[0].id, false, 'No crew earlier', SCHED, T);
    expect(t.legs[0].timing).toEqual({ kind: 'arrive', arriveByLocal: '15:00' });
    const d = createDraft({ title: 'd', leadPassengerId: 'P', leadPassengerName: 'x', by: EA, nowUtc: T });
    expect(requestChange(d, d.legs[0].id, { date: '2026-10-01' }, 'x', EA, T)).toBe(d);
  });
  it('passengers: free far out; approval inside the names cutoff; international hits the wall at 72 h, domestic at 24 h', () => {
    expect(passengerEditPolicy(200, false, 24, 72)).toBe('free');
    expect(passengerEditPolicy(48, false, 24, 72)).toBe('free');
    expect(passengerEditPolicy(48, true, 24, 72)).toBe('approval');
    expect(passengerEditPolicy(12, false, 24, 72)).toBe('approval');
    expect(passengerEditPolicy(-1, true, 24, 72)).toBe('locked');
    expect(passengerEditPolicy(null, true, 24, 72)).toBe('free');
  });
});
