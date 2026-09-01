// Scheduling's side: who owes the next move.
//
// The queue already bands by urgency (engine/queueBands.ts), which answers "what do I do
// first". This answers a different question — "what is waiting, and on whom" — because the
// requests that go wrong are not the urgent ones, they are the ones where each side
// believes the other is thinking about it.
//
// The third band is deliberate. "Nobody" is not an empty state and not a bug: a confirmed
// trip nine months out is correctly waiting on no one. Showing it, rather than hiding it,
// is what makes the difference between parked-and-fine and parked-and-forgotten legible —
// and a two-band list would silently drop everything in it.

import type { TripRequest } from '../types';
import { isInquiry } from './likeOneOfThese';

export type OwedBy = 'me' | 'them' | 'nobody';

export interface OwedAnswer {
  request: TripRequest;
  owedBy: OwedBy;
  /** The one line saying what is actually owed. Operator-facing. */
  what: string;
  /** Days since the thing became owed, for the ageing that makes silence visible. */
  ageDays: number;
}

export interface OwedBoard {
  me: OwedAnswer[];
  them: OwedAnswer[];
  nobody: OwedAnswer[];
}

const DAY_MS = 86_400_000;

/** When the ball last changed hands: the newest message, else when it was asked. */
function lastMoveAt(request: TripRequest): string {
  const last = request.messages[request.messages.length - 1];
  return last?.at ?? request.createdAt;
}

const ageInDays = (iso: string, nowMs: number): number =>
  Math.max(0, Math.floor((nowMs - Date.parse(iso)) / DAY_MS));

/**
 * Who owes the next move on this request.
 *
 * Ordering matters: an unanswered counter-offer is hers to answer even though the request
 * is still pending, and an approved request with no aircraft on it is scheduling's problem
 * even though the EA has been told yes. Approving currently binds no aircraft, which is
 * exactly the gap this band exists to make visible.
 */
export function owedFor(request: TripRequest, nowMs: number): OwedAnswer {
  const at = lastMoveAt(request);
  const ageDays = ageInDays(at, nowMs);
  const mk = (owedBy: OwedBy, what: string): OwedAnswer => ({ request, owedBy, what, ageDays });

  if (request.counter && !request.counter.answeredAt) {
    return mk('them', `Countered ${request.counter.dates[0] ?? ''} — waiting on her answer`);
  }
  if (request.status === 'declined') return mk('them', 'Declined — hers to change or drop');
  if (request.status === 'draft') return mk('them', 'Still a draft on her side');

  if (request.status === 'pending' || request.status === 'requested') {
    return isInquiry(request)
      ? mk('me', 'Enquiry — days held, no route yet. Owes her an answer.')
      : mk('me', 'Undecided');
  }

  // Approved and no aircraft on it. The EA has been told yes and nothing is holding metal.
  if (request.status === 'approved' && !request.assignedTail) {
    return mk('me', 'Approved with no aircraft assigned');
  }
  if (request.status === 'approved') return mk('me', 'Approved — not yet confirmed');

  if (request.status === 'confirmed' && !request.assignedTail) {
    return mk('me', 'Confirmed with no aircraft assigned');
  }

  return mk('nobody', 'Confirmed and placed');
}

/** Oldest first inside each band: silence is the thing this list is for. */
export function buildOwedBoard(requests: TripRequest[], nowMs: number): OwedBoard {
  const all = requests.map(r => owedFor(r, nowMs)).sort((a, b) => b.ageDays - a.ageDays);
  return {
    me: all.filter(a => a.owedBy === 'me'),
    them: all.filter(a => a.owedBy === 'them'),
    nobody: all.filter(a => a.owedBy === 'nobody'),
  };
}

export const OWED_LABELS: Record<OwedBy, string> = {
  me: 'Waiting on me',
  them: 'Waiting on them',
  nobody: 'Waiting on nobody',
};
