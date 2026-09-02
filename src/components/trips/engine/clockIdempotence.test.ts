/**
 * The module clock (`TripClockEffects`) calls `update()` for every live trip on every minute tick.
 * `TripsContext.update` skips the write when the engine hands back the trip it was given — so a
 * quiet minute costs nothing instead of re-stringifying the store and re-rendering the module.
 *
 * That saving depends entirely on the engines returning the SAME OBJECT when they decline to act.
 * If one ever returns a fresh copy instead, the guard silently stops working and nothing fails.
 * This test is the tripwire. (Fresh review, 2026-09-02, Phase 5 slice 1.)
 */
import { describe, it, expect } from 'vitest';
import { freezeSheet, latestSheet } from './tripSheet';
import { autoSendIfDue, emailDraftOf } from './briefingEmail';
import { createDraft, newLeg, submitItinerary, type Actor } from './trip';
import { SEED_PLACES } from './places';

const by: Actor = { name: 'T-72 clock', role: 'system' };
const ea: Actor = { name: 'Dana Whitfield', role: 'ea' };
const ctx = { places: SEED_PLACES, blurbs: {} };
const NOW = '2026-09-02T12:00:00.000Z';

function liveTrip() {
  const draft = createDraft({
    title: 'Identity check', leadPassengerId: 'P-REYES', leadPassengerName: 'A. Reyes', seatsHeld: 1,
    by: ea, nowUtc: '2026-08-01T00:00:00.000Z',
    legs: [newLeg({
      from: { placeName: 'Cincinnati', placeId: 'pl-cvg', airport: 'KLUK' },
      to: { placeName: 'Seattle', placeId: 'pl-sea', airport: 'KBFI' },
      date: '2026-10-14', timing: { kind: 'depart', departLocal: '09:20', flexHours: 0 },
    })],
  });
  return submitItinerary(draft, ea, '2026-08-02T00:00:00.000Z');
}

describe('engine identity when nothing is due', () => {
  it('autoSendIfDue returns the very same trip when there is no draft to send', () => {
    const trip = liveTrip();
    expect(emailDraftOf(trip)).toBeFalsy();
    expect(autoSendIfDue(trip, NOW)).toBe(trip);
  });

  it('autoSendIfDue is idempotent — a second call on its own result changes nothing', () => {
    const trip = liveTrip();
    const once = autoSendIfDue(trip, NOW);
    expect(autoSendIfDue(once, NOW)).toBe(once);
  });

  it('freezeSheet is the one that DOES act, so the guard cannot swallow real work', () => {
    const trip = liveTrip();
    const frozen = freezeSheet(trip, ctx, NOW, by, []);
    expect(frozen).not.toBe(trip);
    expect(latestSheet(frozen)).toBeTruthy();
  });
});
