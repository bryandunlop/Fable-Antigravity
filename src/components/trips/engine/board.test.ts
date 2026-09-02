import { describe, expect, it } from 'vitest';
import { createDraft, newLeg, type Actor } from './trip';
import { desiredBoardHolds, reconcileBoardHolds, activeBoardHolds, releaseAllBoardHolds } from './board';
import type { SchedulerOverlay } from '../../../availability/types';

const EA: Actor = { name: 'Board EA', role: 'ea' };
const T = '2026-09-01T00:00:00.000Z';
function boardTrip(legDates: string[]) {
  return createDraft({ title: 'Q4 board meeting', leadPassengerId: 'P', leadPassengerName: 'J. Lindqvist', by: EA, nowUtc: T,
    legs: legDates.map(d => newLeg({ from: { placeName: 'a', placeId: null, airport: 'KLUK' }, to: { placeName: 'b', placeId: null, airport: 'KTEB' }, date: d })) });
}
const W = { fromDate: '2026-11-09', toDate: '2026-11-14', tailsNeeded: 4 };

describe('a board trip blocks its own window', () => {
  it('six days × four tails when the legs are not yet set', () => {
    expect(desiredBoardHolds(boardTrip([]), W)).toHaveLength(24);
  });
  it('on leg days only the tails needed are held; the other window days keep all four', () => {
    const want = desiredBoardHolds(boardTrip(['2026-11-10', '2026-11-12']), { ...W, tailsNeeded: 2 });
    expect(want.filter(x => x.dateUtc === '2026-11-10')).toHaveLength(2);
    expect(want.filter(x => x.dateUtc === '2026-11-09')).toHaveLength(4);
  });
  it('reconcile is idempotent, and narrowing releases exactly the days that left the window', () => {
    const t = boardTrip([]);
    let overlays: SchedulerOverlay[] = reconcileBoardHolds(t, W, [], EA, T);
    expect(overlays).toHaveLength(24);
    expect(reconcileBoardHolds(t, W, overlays, EA, T)).toEqual([]);
    const narrowed = reconcileBoardHolds(t, { ...W, fromDate: '2026-11-10', toDate: '2026-11-12' }, overlays, EA, '2026-09-02T00:00:00.000Z');
    expect(narrowed.every(o => o.kind === 'release')).toBe(true);
    expect(narrowed).toHaveLength(12); // 9, 13, 14 Nov × 4
    overlays = [...overlays, ...narrowed];
    expect(activeBoardHolds(overlays, t.id)).toHaveLength(12);
  });
  it('releasing everything retires every active hold and nothing twice', () => {
    const t = boardTrip([]);
    const overlays = reconcileBoardHolds(t, W, [], EA, T);
    const rel = releaseAllBoardHolds(t, overlays, EA, T);
    expect(rel).toHaveLength(24);
    expect(releaseAllBoardHolds(t, [...overlays, ...rel], EA, T)).toEqual([]);
  });
});
