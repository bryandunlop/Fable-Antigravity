/**
 * Scheduling's queue: every live trip sorted into who is holding it up (D109 slice 5, canvas
 * artboard 2).
 *
 * This is the same question the trip workspace's header strip asks about one trip, and it is
 * deliberately the SAME CODE — `workspaceSummary` decides `waitingOn`, and this file only groups and
 * explains. If the queue said a trip was waiting on scheduling while the trip's own page said it was
 * waiting on the EA, a scheduler would stop believing either, and the bands would be decoration.
 *
 * The queue replaces the old booking portal's `SchedulingQueue` — that page asked the same question
 * against a separate data model, which is precisely the duplication Phase 5 exists to end.
 *
 * Pure. No React, no storage; the caller passes the clock, the register and the settings.
 */

import { documentGates } from './documentGates';
import type { Person } from './people';
import { workspaceSummary, type SummarySettings } from './workspaceSummary';
import { pendingChanges, type Trip } from './trip';

export type QueueBand = 'you' | 'ea' | 'freezing' | 'nobody';

export const BAND_LABEL: Record<QueueBand, string> = {
  you: 'Waiting on you',
  ea: 'Waiting on the EA',
  freezing: 'Freezing this week',
  nobody: 'Waiting on nobody',
};

export const BAND_NOTE: Record<QueueBand, string> = {
  you: 'Nothing moves on these until scheduling does something.',
  ea: 'Asked and not yet answered. Chase, or let the cutoff do it.',
  freezing: 'Settled, and the sheet freezes inside seven days.',
  nobody: 'Aircraft on, crew set, everyone named. Nothing owed either way.',
};

/** Freeze inside this many days is worth its own band. */
export const FREEZING_WINDOW_DAYS = 7;

export interface QueueRow {
  trip: Trip;
  band: QueueBand;
  /** Why it is in this band, in the order a scheduler would want to read them. */
  reasons: string[];
  /** Hours since the last thing that happened on the trip. */
  ageHours: number;
  freezesInHours: number | null;
}

export type SchedulingQueue = Record<QueueBand, QueueRow[]>;

const HOUR = 3_600_000;

function reasonsFor(trip: Trip, summary: ReturnType<typeof workspaceSummary>, freezesInHours: number | null): string[] {
  const out: string[] = [];
  if (!trip.tail) out.push('No aircraft yet');
  const changes = pendingChanges(trip).length;
  if (changes > 0) out.push(`${changes} change request${changes === 1 ? '' : 's'} to decide`);
  if (summary.people.gates > 0) out.push(`${summary.people.gates} document gate${summary.people.gates === 1 ? '' : 's'} unresolved`);
  if (summary.counts.sheet > 0) out.push('Passenger email drafted and unsent');
  if (summary.messages > 0) out.push(`${summary.messages} message${summary.messages === 1 ? '' : 's'} from the EA unanswered`);
  const questions = summary.counts.record - summary.messages;
  if (questions > 0) out.push(`${questions} question${questions === 1 ? '' : 's'} unanswered`);
  if (summary.people.unnamed > 0) out.push(`${summary.people.unnamed} seat${summary.people.unnamed === 1 ? '' : 's'} unnamed`);
  if (trip.tail && !trip.crew) out.push('No crew set');
  // The freeze rides along as a reason rather than moving the trip to the freezing band: a trip
  // scheduling must act on is scheduling's, and losing that to a softer heading is how the urgent
  // thing ends up in the calm list.
  if (freezesInHours !== null && freezesInHours > 0 && freezesInHours <= FREEZING_WINDOW_DAYS * 24) {
    const days = Math.floor(freezesInHours / 24);
    out.push(days >= 1 ? `Freezes in ${days} day${days === 1 ? '' : 's'}` : 'Freezes today');
  }
  return out;
}

/**
 * Every live trip, in exactly one band.
 *
 * Drafts, declined and cancelled trips are absent on purpose: a queue is a list of things somebody
 * can act on, and a draft nobody has submitted is not one of them. They stay on the trips list.
 */
export function schedulingQueue(
  trips: Trip[],
  people: Person[],
  settings: SummarySettings,
  nowUtc: string,
): SchedulingQueue {
  const out: SchedulingQueue = { you: [], ea: [], freezing: [], nobody: [] };
  const nowMs = Date.parse(nowUtc);

  for (const trip of trips) {
    if (trip.status !== 'submitted' && trip.status !== 'confirmed') continue;

    const gates = documentGates(trip, people, settings.documentPolicy, nowUtc);
    const summary = workspaceSummary(trip, people, settings, gates, nowUtc);

    const freezesInHours = summary.freeze && !summary.freeze.frozen
      ? (Date.parse(summary.freeze.dueUtc) - nowMs) / HOUR
      : null;

    const freezingSoon = freezesInHours !== null && freezesInHours > 0 && freezesInHours <= FREEZING_WINDOW_DAYS * 24;

    const band: QueueBand =
      summary.waitingOn === 'scheduling' ? 'you'
        : summary.waitingOn === 'ea' ? 'ea'
          : freezingSoon ? 'freezing'
            : 'nobody';

    out[band].push({
      trip,
      band,
      reasons: reasonsFor(trip, summary, freezesInHours),
      ageHours: summary.waitingSinceUtc ? (nowMs - Date.parse(summary.waitingSinceUtc)) / HOUR : 0,
      freezesInHours,
    });
  }

  // Oldest first inside every band: the thing that has been waiting longest is the thing most likely
  // to have been forgotten.
  for (const band of Object.keys(out) as QueueBand[]) {
    out[band].sort((a, b) => b.ageHours - a.ageHours);
  }
  return out;
}
