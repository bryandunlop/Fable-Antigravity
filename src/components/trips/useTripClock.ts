/**
 * The trips module's clock — one tick, mounted once, driving everything that happens on its own.
 *
 * Before this, the T-72 freeze and the dead-man auto-send lived in a `useEffect` inside
 * `TripWorkspace`, and watches were evaluated only in `WatchesPage`'s own effect. So the rules
 * only ran while you happened to be looking at the page that owned them: a scheduler sitting on
 * the Trips home all afternoon watched nothing freeze and no watch fire. Bryan, 2026-09-02: "the
 * shared clock needs to also be shipped and hardened." (Phase 5 slice 1, LG-365.)
 *
 * Mounted in `TripsProvider`, so it runs whenever ANY trips page is open, and evaluates every
 * visible trip rather than the one on screen.
 *
 * This is a demo stand-in for a scheduled job. In production the freeze, the auto-send and the
 * watch evaluation are server-side work that does not depend on a browser being open — and the
 * engine functions here are already pure and clock-injected so that move is a wiring change.
 */

import { useEffect, useState } from 'react';

/** One minute. Fine enough for a T-72 boundary; coarse enough to cost nothing. */
export const TICK_MS = 60_000;

/**
 * A counter that advances every minute. Depend on it to re-run work on the clock; it deliberately
 * carries no timestamp so a component cannot accidentally freeze `now` into a render.
 */
export function useMinuteTick(): number {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const h = window.setInterval(() => setTick(t => t + 1), TICK_MS);
    return () => window.clearInterval(h);
  }, []);
  return tick;
}
