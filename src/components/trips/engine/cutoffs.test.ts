import { describe, expect, it } from 'vitest';
import { createDraft, newLeg, type Actor } from './trip';
import { DEFAULT_CUTOFFS, cutoffsFor, firstDepartureUtc, isInternational, moveCutoff, zonedToUtc, freezeDue, plannedDepartureLocal } from './cutoffs';
import { SCHEDULING_DECIDES } from './places';

const EA: Actor = { name: 'Dana Whitfield', role: 'ea' };
const SCHED: Actor = { name: 'R. Calloway', role: 'scheduling' };

function trip(opts: { toAirport?: string; departLocal?: string } = {}) {
  return createDraft({
    title: 't', leadPassengerId: 'P-REYES', leadPassengerName: 'A. Reyes', by: EA, nowUtc: '2026-09-01T00:00:00.000Z',
    legs: [
      newLeg({ from: { placeName: 'Cincinnati', placeId: 'pl-cvg', airport: 'KLUK' }, to: { placeName: 'Seattle', placeId: 'pl-sea', airport: opts.toAirport ?? 'KBFI' }, date: '2026-10-14', timing: { kind: 'depart', departLocal: opts.departLocal ?? '09:20', flexHours: 0 } }),
      newLeg({ from: { placeName: 'Seattle', placeId: 'pl-sea', airport: opts.toAirport ?? 'KBFI' }, to: { placeName: 'Cincinnati', placeId: 'pl-cvg', airport: 'KLUK' }, date: '2026-10-16', timing: { kind: 'flexible' } }),
    ],
  });
}

describe('the anchor: first departure, DST-aware', () => {
  it('KLUK 09:20 on 14 Oct 2026 is 13:20Z (EDT)', () => {
    expect(firstDepartureUtc(trip())).toBe('2026-10-14T13:20:00.000Z');
  });
  it('the same wall clock in January is 14:20Z (EST) — the zone does the work, not a fixed offset', () => {
    expect(zonedToUtc('2026-01-14', '09:20', 'America/New_York')).toBe('2026-01-14T14:20:00.000Z');
  });
  it('a be-there-by leg plans to leave four hours earlier; a flexible one plans 09:00', () => {
    expect(plannedDepartureLocal(newLeg({ timing: { kind: 'arrive', arriveByLocal: '15:00' } }))).toBe('11:00');
    expect(plannedDepartureLocal(newLeg({ timing: { kind: 'arrive', arriveByLocal: '07:00' } }))).toBe('06:00');
    expect(plannedDepartureLocal(newLeg())).toBe('09:00');
  });
  it('no date, no cutoffs — never a guess', () => {
    const t = trip(); t.legs[0].date = null;
    expect(firstDepartureUtc(t)).toBeNull();
    expect(cutoffsFor(t, DEFAULT_CUTOFFS)).toEqual([]);
  });
});

describe('defaults, then an override with a reason', () => {
  it('T-72 freeze is exactly 72 h before 13:20Z; names are 24 h domestic', () => {
    const due = cutoffsFor(trip(), DEFAULT_CUTOFFS);
    expect(due.find(c => c.kind === 'freeze')!.dueUtc).toBe('2026-10-11T13:20:00.000Z');
    expect(due.find(c => c.kind === 'names')!.dueUtc).toBe('2026-10-13T13:20:00.000Z');
    expect(due.find(c => c.kind === 'forms')!.dueUtc).toBe('2026-09-23T13:20:00.000Z');
    expect(due.map(c => c.kind)).toEqual(['forms', 'freeze', 'catering', 'names']);
  });
  it('a leg touching a non-K field makes it international and names go to 72 h', () => {
    const t = trip({ toAirport: 'EGLF' });
    expect(isInternational(t)).toBe(true);
    expect(cutoffsFor(t, DEFAULT_CUTOFFS).find(c => c.kind === 'names')!.dueUtc).toBe('2026-10-11T13:20:00.000Z');
  });
  it('"scheduling decides" is not an airport and does not make a trip international', () => {
    expect(isInternational(trip({ toAirport: SCHEDULING_DECIDES }))).toBe(false);
  });
  it('scheduling moves one cutoff for this trip, with a reason; the EA cannot; no reason, no move', () => {
    const t = trip();
    const moved = moveCutoff(t, 'names', '2026-10-09T13:00:00.000Z', 'Badge list is due a week ahead', SCHED, '2026-09-02T00:00:00.000Z');
    const names = cutoffsFor(moved, DEFAULT_CUTOFFS).find(c => c.kind === 'names')!;
    expect(names).toMatchObject({ source: 'override', dueUtc: '2026-10-09T13:00:00.000Z', reason: 'Badge list is due a week ahead', movedBy: 'R. Calloway' });
    expect(moved.events.at(-1)).toMatchObject({ kind: 'cutoff-moved', cutoff: 'names' });
    expect(moveCutoff(t, 'names', '2026-10-09T13:00:00.000Z', 'x', EA, '2026-09-02T00:00:00.000Z')).toBe(t);
    expect(moveCutoff(t, 'names', '2026-10-09T13:00:00.000Z', '   ', SCHED, '2026-09-02T00:00:00.000Z')).toBe(t);
  });
  it('the other cutoffs keep their defaults when one is moved', () => {
    const moved = moveCutoff(trip(), 'catering', '2026-10-10T12:00:00.000Z', 'caterer closed Sunday', SCHED, '2026-09-02T00:00:00.000Z');
    expect(cutoffsFor(moved, DEFAULT_CUTOFFS).find(c => c.kind === 'freeze')!.source).toBe('default');
  });
  it('freezeDue flips at the instant', () => {
    expect(freezeDue(trip(), DEFAULT_CUTOFFS, '2026-10-11T13:19:00.000Z')).toBe(false);
    expect(freezeDue(trip(), DEFAULT_CUTOFFS, '2026-10-11T13:20:00.000Z')).toBe(true);
  });
});
