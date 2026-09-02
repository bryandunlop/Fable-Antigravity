/**
 * A leg's two ends, each on its own field's clock, with the UTC beside them:
 * "09:20 EDT → 12:35 PDT · 13:20Z → 19:35Z".
 *
 * Bryan, 2026-09-02: "show the arrival time in Seattle as accurate even though it's a different
 * time in Cincinnati." The EA types one number — a departure wall clock at the departure field —
 * and every other time on the trip is derived from it. Showing only what they typed hides the
 * answer they actually need.
 *
 * Rendered under a leg wherever a leg appears: the editor (so the EA sees it while choosing the
 * time), the read-only row, and the new-trip preview. The arrival is a planning estimate until
 * scheduling assigns a tail, and says so. Cutoffs are NOT shown here — those stay in the operator
 * reference zone and are labelled "ET" (D106).
 */

import { legClock, formatLegClock } from '../engine/legClock';
import type { TripLeg } from '../engine/trip';

export function LegClockLine({ leg, className = '' }: { leg: TripLeg; className?: string }) {
  const clock = legClock(leg);
  if (!clock) return null;
  return (
    <div className={`mt-1 text-xs text-muted-foreground/90 ${className}`}>
      <span className="font-mono">{formatLegClock(clock)}</span>
      <span className="ml-1.5">· arrival estimated</span>
    </div>
  );
}
