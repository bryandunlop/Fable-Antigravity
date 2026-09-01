// Why the submit button is off (D100 design pass, 2026-08-29).
//
// The old form disabled Submit on four truthiness checks and said nothing. An EA
// then stares at a dead button. Every blocker here is a sentence she can act on,
// and the list is the ONLY thing that decides whether the request can go — the
// button reads this, it does not repeat the logic.
//
// Deliberately NOT a blocker: unnamed seats. Not knowing the full party is the
// normal case, not an error.

import { isInquiry } from './likeOneOfThese';
import type { Passenger, Purpose } from '../types';
import { evaluateDoc } from './docExpiry';
import { isTimingComplete, type LegTiming } from './legTiming';

export interface DraftLeg {
  from: string;
  to: string;
  date: string;
  timing: LegTiming;
  /** People named so far, beyond the lead passenger (who is on every leg). */
  extraPassengerIds: string[];
  purposes: Record<string, Purpose>;
}

export interface Blocker {
  /** Stable handle so the UI can highlight the thing at fault. */
  code: 'route' | 'date' | 'timing' | 'lead' | 'document';
  message: string;
  legIndex?: number;
  passengerId?: string;
}

const ICAO = /^[A-Z]{3,4}$/;

/**
 * Everything stopping this request, in the order an EA would fix it. Empty means
 * ready to send.
 */
export function submitBlockers(
  draft: { legs: DraftLeg[]; leadPassengerId: string },
  passengers: Passenger[],
): Blocker[] {
  const blockers: Blocker[] = [];
  const byId = new Map(passengers.map((p) => [p.id, p]));

  if (!draft.leadPassengerId || !byId.has(draft.leadPassengerId)) {
    blockers.push({ code: 'lead', message: 'Name the lead passenger — scheduling needs one person to plan around.' });
  }

  // "Just hold some days" is a request with no route at all — an enquiry. It is NOT a
  // half-finished trip, so it is not blocked on the airports and times it deliberately
  // does not have. A PARTLY routed draft is still a mistake and still blocks.
  const enquiry = isInquiry(draft);

  draft.legs.forEach((leg, i) => {
    const label = draft.legs.length > 1 ? `Leg ${i + 1}` : 'The leg';
    if (!enquiry && (!ICAO.test(leg.from) || !ICAO.test(leg.to))) {
      blockers.push({ code: 'route', legIndex: i, message: `${label} needs both airports.` });
    }
    if (!leg.date) {
      blockers.push({ code: 'date', legIndex: i, message: `${label} needs a date.` });
    }
    if (!enquiry && !isTimingComplete(leg.timing)) {
      blockers.push({ code: 'timing', legIndex: i, message: `${label} has an incomplete time.` });
    }
  });

  // Documents, per person per leg — the check that lives one page away today.
  const travelDates = draft.legs.map((l) => l.date).filter(Boolean).sort();
  if (travelDates.length > 0) {
    const start = travelDates[0];
    const end = travelDates[travelDates.length - 1];
    const everyone = new Set<string>([draft.leadPassengerId, ...draft.legs.flatMap((l) => l.extraPassengerIds)]);

    for (const pid of everyone) {
      const person = byId.get(pid);
      if (!person) continue;
      for (const doc of person.docs) {
        if (evaluateDoc(doc.expires, start, end) !== 'block') continue;
        blockers.push({
          code: 'document',
          passengerId: pid,
          message: `${person.name}'s ${doc.label.toLowerCase()} expires ${doc.expires} — before this trip ends. Drop them from the affected leg, or update the document.`,
        });
        break;
      }
    }
  }

  return blockers;
}

/** Seats the EA is holding, never fewer than the people already named. */
export function clampSeats(requested: number, namedCount: number): number {
  if (!Number.isFinite(requested)) return namedCount;
  return Math.max(namedCount, Math.min(19, Math.round(requested)));
}
