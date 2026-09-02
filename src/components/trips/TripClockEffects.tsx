/**
 * Everything the trips module does on its own, on one clock, for every trip — not just the one
 * on screen. Mounted once inside `TripsProvider`; renders nothing.
 *
 * Three rules run here (all pure engine functions; this file only supplies the clock and the store):
 *   1. T-72 — the trip sheet freezes and the passenger email is drafted.
 *   2. The dead-man timer — a drafted email nobody sent goes anyway, recorded as such.
 *   3. Watches — a cabin that comes free in someone's window fires their pre-filled request.
 *
 * Why this exists: rules 1 and 2 used to live in `TripWorkspace` and rule 3 in `WatchesPage`, so
 * each only ran while its own page was open. See `useTripClock.ts` for the production note.
 */

import { useEffect, useMemo } from 'react';
import { useTripsModule } from './TripsContext';
import { useMinuteTick } from './useTripClock';
import { useTrips } from '../hooks/useFleetAvailability';
import { readFleetAvailability } from '../../availability/source';
import { autoSendIfDue, draftEmail, emailDraftOf } from './engine/briefingEmail';
import { freezeDue } from './engine/cutoffs';
import { blockingGates, documentGates } from './engine/documentGates';
import { freezeSheet, latestSheet } from './engine/tripSheet';
import { evaluateWatches, freeByCabin } from './engine/watches';

/** The clock is not a person: what it does is recorded under its own name, never a user's. */
const CLOCK_ACTOR = { name: 'T-72 clock', role: 'system' as const };

export default function TripClockEffects() {
  const { trips, settings, sheetCtx, weatherFor, update, setWatches, people, nowUtc } = useTripsModule();
  const tick = useMinuteTick();
  const schedTrips = useTrips();

  // Trips the clock has anything to do with. Keyed so the effect re-runs when a trip's state
  // changes under it (a manual freeze, a send) as well as on the tick.
  const live = useMemo(
    () => trips.filter(t => t.status === 'submitted' || t.status === 'confirmed'),
    [trips],
  );
  const liveKey = live.map(t => `${t.id}:${t.status}:${t.events.length}`).join('|');

  useEffect(() => {
    if (live.length === 0) return;
    const now = nowUtc();
    for (const trip of live) {
      update(trip.id, t => {
        let next = t;
        if (!latestSheet(next) && freezeDue(next, settings.cutoffs, now)) {
          // The clock must not freeze past an unresolved document gate. It re-runs every minute, so
          // the sheet freezes by itself the moment the gate clears or scheduling overrides it.
          const blocking = blockingGates(next, documentGates(next, people, settings.documentPolicy, now));
          next = freezeSheet(next, sheetCtx, now, CLOCK_ACTOR, blocking);
          const sheet = latestSheet(next);
          if (sheet && !emailDraftOf(next)) {
            next = draftEmail(
              next, sheet, settings.email, people,
              weatherFor(sheet.legs.map(l => l.to.icao).filter((x): x is string => !!x)),
              CLOCK_ACTOR, now,
            );
          }
        }
        return autoSendIfDue(next, now);
      });
    }
    // `liveKey` stands in for the trips themselves: identity changes on every store write, which
    // would loop. Settings and context are read fresh inside the updater.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveKey, tick]);

  // Watches: evaluated against the fleet picture, on the same clock, from wherever you are.
  const free = useMemo(
    () => freeByCabin(readFleetAvailability({ trips: schedTrips }, nowUtc(), 400)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [schedTrips, tick],
  );
  useEffect(() => {
    setWatches(ws => evaluateWatches(ws, free, nowUtc()));
  }, [free, nowUtc, setWatches]);

  return null;
}
