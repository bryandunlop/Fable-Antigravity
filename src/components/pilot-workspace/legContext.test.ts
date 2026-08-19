import { describe, it, expect } from 'vitest';
import {
  currentLegIndex, groupLegsByDay, partitionOutstanding, fratEarlySubmitWarning,
  selectedLegIndex, FRAT_EARLY_SUBMIT_WARN_HOURS,
} from './legContext';
import { FUEL_LOCK_HOURS_BEFORE_ETD } from '../tech-log/preflightActions';
import { DAY_OF_THRESHOLD_HOURS } from './paneMode';

const leg = (dep: string) => ({ departureTimeUtc: dep });
const idLeg = (id: string) => ({ id });

describe('currentLegIndex', () => {
  const NOW = '2026-07-09T12:00:00.000Z';
  it('picks the first leg not yet departed', () => {
    const legs = [leg('2026-07-09T06:00:00.000Z'), leg('2026-07-09T18:00:00.000Z'), leg('2026-07-10T06:00:00.000Z')];
    expect(currentLegIndex(legs, NOW)).toBe(1);
  });
  it('returns the last leg when all have departed', () => {
    const legs = [leg('2026-07-08T06:00:00.000Z'), leg('2026-07-09T06:00:00.000Z')];
    expect(currentLegIndex(legs, NOW)).toBe(1);
  });
  it('returns -1 for no legs; treats a leg departing exactly now as current', () => {
    expect(currentLegIndex([], NOW)).toBe(-1);
    expect(currentLegIndex([leg(NOW)], NOW)).toBe(0);
  });
});

describe('selectedLegIndex', () => {
  const legs = [idLeg('l1'), idLeg('l2'), idLeg('l3')];
  it('honours a ?leg param that matches a leg id, overriding the current leg', () => {
    expect(selectedLegIndex(legs, 'l3', 0)).toBe(2);
    expect(selectedLegIndex(legs, 'l1', 2)).toBe(0);
  });
  it('follows the current leg when there is no ?leg param', () => {
    expect(selectedLegIndex(legs, null, 1)).toBe(1);
    expect(selectedLegIndex(legs, undefined, 2)).toBe(2);
  });
  it('ignores a stale/unknown ?leg id and falls back to the current leg', () => {
    expect(selectedLegIndex(legs, 'gone', 1)).toBe(1);
  });
  it('treats a negative current index as leg 0 and clamps out-of-range', () => {
    expect(selectedLegIndex(legs, null, -1)).toBe(0);
    expect(selectedLegIndex(legs, null, 99)).toBe(2);
  });
  it('returns 0 for an empty leg list (caller guards on the leg existing)', () => {
    expect(selectedLegIndex([], 'l1', -1)).toBe(0);
  });
});

describe('groupLegsByDay', () => {
  it('groups by office-local departure date and keeps the original index', () => {
    // office offset -240 (EDT): 2026-07-10T02:00Z is still Jul 9 local
    const legs = [leg('2026-07-09T18:00:00.000Z'), leg('2026-07-10T02:00:00.000Z'), leg('2026-07-10T18:00:00.000Z')];
    const groups = groupLegsByDay(legs, -240);
    expect(groups.map(g => g.dayKey)).toEqual(['2026-07-09', '2026-07-10']);
    expect(groups[0].legs.map(x => x.index)).toEqual([0, 1]); // first two are the same local day
    expect(groups[1].legs.map(x => x.index)).toEqual([2]);
  });
});

describe('partitionOutstanding', () => {
  it('splits not-done (outstanding) from done, preserving order', () => {
    const items = [{ id: 'a', done: false }, { id: 'b', done: true }, { id: 'c', done: false }];
    const { outstanding, done } = partitionOutstanding(items);
    expect(outstanding.map(i => i.id)).toEqual(['a', 'c']);
    expect(done.map(i => i.id)).toEqual(['b']);
  });
});

describe('fratEarlySubmitWarning', () => {
  const NOW = '2026-07-09T12:00:00.000Z';
  it('warns when submitting more than the threshold before ETD, not within it', () => {
    // Crews fill the FRAT ahead of time but REVIEW AND SUBMIT it at the crew brief, which is
    // typically inside four hours. So prep produces a draft; a submission from prep is the case
    // this warning exists to catch, and it now does — where 24h let a whole prep pass through.
    expect(fratEarlySubmitWarning(NOW, '2026-07-11T12:00:00.000Z')).toBe(true);  // 48h out
    expect(fratEarlySubmitWarning(NOW, '2026-07-09T20:00:00.000Z')).toBe(true);  // 8h out — was false at 24h
    expect(fratEarlySubmitWarning(NOW, '2026-07-09T14:00:00.000Z')).toBe(false); // 2h out — at the brief
    expect(fratEarlySubmitWarning(NOW, '2026-07-09T16:00:00.000Z')).toBe(false); // exactly 4h → not > threshold
  });
});

describe('one boundary (Bryan, 2026-08-19)', () => {
  it('keeps the FRAT warning, the fuel lock and the pane switch on the same clock', () => {
    // Asserted against each other rather than against 4, so this fails on DIVERGENCE — which is
    // the property that was asked for — and not merely on someone changing the agreed number.
    expect(FRAT_EARLY_SUBMIT_WARN_HOURS).toBe(FUEL_LOCK_HOURS_BEFORE_ETD);
    expect(DAY_OF_THRESHOLD_HOURS).toBe(FUEL_LOCK_HOURS_BEFORE_ETD);
  });
});
