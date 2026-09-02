import { describe, expect, it } from 'vitest';
import { createDraft, newLeg, submitItinerary, assignTail, setCrew, setCatering, setPassengers, updateLeg, type Actor } from './trip';
import { buildSheet, freezeSheet, latestSheet, changedSinceFreeze, sendSheetToCrew, estimateMinutes } from './tripSheet';
import { SEED_PLACES } from './places';

const EA: Actor = { name: 'Dana Whitfield', role: 'ea' };
const SCHED: Actor = { name: 'R. Calloway', role: 'scheduling' };
const CTX = { places: SEED_PLACES, blurbs: { 'Capt. John Smith': 'Twenty years on Gulfstreams.' } };
const T = '2026-10-11T13:20:00.000Z';

function confirmedTrip() {
  let t = createDraft({
    title: 'Seattle plant visit', leadPassengerId: 'P-REYES', leadPassengerName: 'A. Reyes', seatsHeld: 3, by: EA, nowUtc: '2026-09-01T00:00:00.000Z',
    legs: [
      newLeg({ from: { placeName: 'Cincinnati', placeId: 'pl-cvg', airport: 'KLUK' }, to: { placeName: 'Seattle', placeId: 'pl-sea', airport: 'KBFI' }, date: '2026-10-14', timing: { kind: 'depart', departLocal: '09:20', flexHours: 0 } }),
      newLeg({ from: { placeName: 'Seattle', placeId: 'pl-sea', airport: 'KBFI' }, to: { placeName: 'Cincinnati', placeId: 'pl-cvg', airport: 'KLUK' }, date: '2026-10-16', timing: { kind: 'depart', departLocal: '16:00', flexHours: 0 } }),
    ],
  });
  t = submitItinerary(t, EA, '2026-09-02T00:00:00.000Z');
  t = assignTail(t, 'N5PG', SCHED, '2026-09-03T00:00:00.000Z');
  t = setCrew(t, { pic: 'Capt. John Smith', sic: 'FO Emily Chen', fa: 'Lena Nguyen' }, SCHED, '2026-09-03T00:00:00.000Z');
  t = setPassengers(t, ['A. Reyes', 'S. Reyes', 'K. Tanaka'], EA, '2026-09-04T00:00:00.000Z');
  t = setCatering(t, t.legs[0].id, 'Light breakfast, no shellfish', EA, '2026-09-05T00:00:00.000Z');
  return t;
}

describe('the sheet is generated, never typed', () => {
  it('renders both ends in field-local wall clocks with the UTC instant, and the crew with blurbs', () => {
    const s = buildSheet(confirmedTrip(), CTX, T, SCHED);
    expect(s.legs).toHaveLength(2);
    expect(s.legs[0].from.wall).toBe('09:20 EDT');
    expect(s.legs[0].from.utc).toBe('2026-10-14T13:20:00.000Z');
    expect(s.legs[0].to.icao).toBe('KBFI');
    expect(s.legs[0].to.wall).toMatch(/PDT$/);
    expect(s.legs[0].aboard).toEqual(['A. Reyes', 'S. Reyes', 'K. Tanaka']);
    expect(s.legs[0].catering).toBe('Light breakfast, no shellfish');
    expect(s.legs[1].catering).toBeNull();
    expect(s.crew.map(c => c.role)).toEqual(['PIC', 'SIC', 'FA']);
    expect(s.crew[0].blurb).toBe('Twenty years on Gulfstreams.');
    expect(s.tail).toBe('N5PG');
  });

  it('a transcontinental block is hours, not the 120-minute fallback; an unknown field is the fallback, said plainly', () => {
    const m = estimateMinutes('KLUK', 'KBFI');
    expect(m).toBeGreaterThan(200);
    expect(m).toBeLessThan(330);
    expect(estimateMinutes('KLUK', null)).toBe(120);
  });
});

describe('freezing is a snapshot with a version', () => {
  it('refuses on a draft', () => {
    const d = createDraft({ title: 'x', leadPassengerId: 'P', leadPassengerName: 'P', by: EA, nowUtc: T });
    expect(latestSheet(freezeSheet(d, CTX, T, SCHED, []))).toBeNull();
  });

  it('v1 does not change when the trip changes afterwards; a refreeze makes v2', () => {
    let t = freezeSheet(confirmedTrip(), CTX, T, SCHED, []);
    const v1 = latestSheet(t)!;
    expect(v1.version).toBe(1);
    expect(t.events.at(-1)).toMatchObject({ kind: 'sheet-frozen', version: 1 });
    // No change → no second version
    expect(freezeSheet(t, CTX, '2026-10-11T14:00:00.000Z', SCHED, []).frozenSheets).toHaveLength(1);
    // A change after the freeze
    t = setCatering(t, t.legs[1].id, 'Dinner for 3', EA, '2026-10-12T00:00:00.000Z');
    expect(changedSinceFreeze(t, CTX, '2026-10-12T00:00:00.000Z', SCHED)).toBe(true);
    expect(latestSheet(t)!.legs[1].catering).toBeNull(); // v1 untouched
    t = freezeSheet(t, CTX, '2026-10-12T00:05:00.000Z', SCHED, []);
    expect(latestSheet(t)!.version).toBe(2);
    expect(latestSheet(t)!.legs[1].catering).toBe('Dinner for 3');
    expect(t.frozenSheets).toHaveLength(2);
  });

  it('send to crew records the version, scheduling only, and needs a frozen sheet', () => {
    const t0 = confirmedTrip();
    expect(sendSheetToCrew(t0, SCHED, T)).toBe(t0);
    const t = freezeSheet(t0, CTX, T, SCHED, []);
    expect(sendSheetToCrew(t, EA, T)).toBe(t);
    expect(sendSheetToCrew(t, SCHED, T).events.at(-1)).toMatchObject({ kind: 'sent-to-crew', version: 1 });
  });

  it('a leg edit on a confirmed trip is refused by updateLeg, so a frozen sheet cannot be undercut by silent edits', () => {
    const t = confirmedTrip();
    expect(updateLeg(t, t.legs[0].id, { date: '2026-10-15' })).toBe(t);
  });
});
