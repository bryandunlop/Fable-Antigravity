/**
 * The EA's queue: every live trip sorted into who is holding it up, read from her end (D111).
 *
 * This is the mirror of `queue.ts` and it deliberately shares `workspaceSummary.waitingOn` with it,
 * for the reason that file already gives: if the two sides computed "who owes what" separately they
 * would eventually disagree, and a scheduler and an EA reading opposite answers about the same trip
 * stop believing either. Only the bands, the wording and the ordering differ — because "waiting on
 * you" means different work depending on which chair you are in.
 *
 * The one thing this adds that the scheduler's queue has no use for: scheduling's plain replies.
 * Those are news, never a debt, so they earn a reason line without moving the trip into her band
 * (Bryan, 2026-09-03).
 *
 * Pure. No React, no storage; the caller passes the clock, the register and the settings.
 */

import { documentGates } from './documentGates';
import type { Person } from './people';
import { workspaceSummary, type SummarySettings } from './workspaceSummary';
import { pendingChanges, type Trip } from './trip';
import { newsForEa } from './adminMessages';
import { FREEZING_WINDOW_DAYS } from './queue';

export type EaBand = 'you' | 'scheduling' | 'freezing' | 'nobody';

export const EA_BAND_LABEL: Record<EaBand, string> = {
  you: 'Waiting on you',
  scheduling: 'With scheduling',
  freezing: 'Freezing this week',
  nobody: 'Settled',
};

export const EA_BAND_NOTE: Record<EaBand, string> = {
  you: 'Nothing moves on these until you answer.',
  scheduling: 'Asked and with scheduling. Chase in the trip if it has gone quiet.',
  freezing: 'Settled, and the passenger list closes inside seven days.',
  nobody: 'Aircraft on, crew set, everyone named. Nothing owed either way.',
};

export interface EaQueueRow {
  trip: Trip;
  band: EaBand;
  /** Why it is in this band, in the order she would want to read them. */
  reasons: string[];
  /** Hours since the last thing that happened on the trip. */
  ageHours: number;
  freezesInHours: number | null;
  /** Scheduling's messages and questions since she last spoke — the ✉ count on her row. */
  news: number;
}

export type EaQueue = Record<EaBand, EaQueueRow[]>;

const HOUR = 3_600_000;

function reasonsFor(
  trip: Trip,
  summary: ReturnType<typeof workspaceSummary>,
  news: ReturnType<typeof newsForEa>,
  freezesInHours: number | null,
): string[] {
  const out: string[] = [];
  // Her own debts first — everything below this is somebody else's move.
  const questions = news.filter(m => m.kind === 'question').length;
  if (questions > 0) out.push(`Scheduling asked ${questions} question${questions === 1 ? '' : 's'}`);
  if (summary.people.unnamed > 0) out.push(`${summary.people.unnamed} seat${summary.people.unnamed === 1 ? '' : 's'} unnamed`);
  if (summary.people.gates > 0) out.push(`${summary.people.gates} document gate${summary.people.gates === 1 ? '' : 's'} unresolved`);
  // News: said, not owed. Quieter than a question on purpose.
  if (news.length > questions) out.push('Scheduling replied');
  if (!trip.tail) out.push('No aircraft yet');
  const changes = pendingChanges(trip).length;
  if (changes > 0) out.push(`${changes} change request${changes === 1 ? '' : 's'} with scheduling`);
  if (summary.messages > 0) out.push(`${summary.messages} of your message${summary.messages === 1 ? '' : 's'} unanswered`);
  if (trip.tail && !trip.crew) out.push('No crew set');
  if (freezesInHours !== null && freezesInHours > 0 && freezesInHours <= FREEZING_WINDOW_DAYS * 24) {
    const days = Math.floor(freezesInHours / 24);
    out.push(days >= 1 ? `Freezes in ${days} day${days === 1 ? '' : 's'}` : 'Freezes today');
  }
  return out;
}

/**
 * Every live trip of hers, in exactly one band.
 *
 * Drafts are absent for the same reason they are absent from the scheduler's queue — nobody can act
 * on a trip that has not been submitted. They keep their own list on the trips page.
 */
export function eaQueue(trips: Trip[], people: Person[], settings: SummarySettings, nowUtc: string): EaQueue {
  const out: EaQueue = { you: [], scheduling: [], freezing: [], nobody: [] };
  const nowMs = Date.parse(nowUtc);

  for (const trip of trips) {
    if (trip.status !== 'submitted' && trip.status !== 'confirmed') continue;

    const gates = documentGates(trip, people, settings.documentPolicy, nowUtc);
    const summary = workspaceSummary(trip, people, settings, gates, nowUtc);
    const news = newsForEa(trip);

    const freezesInHours = summary.freeze && !summary.freeze.frozen
      ? (Date.parse(summary.freeze.dueUtc) - nowMs) / HOUR
      : null;
    const freezingSoon = freezesInHours !== null && freezesInHours > 0 && freezesInHours <= FREEZING_WINDOW_DAYS * 24;

    const band: EaBand =
      summary.waitingOn === 'ea' ? 'you'
        : summary.waitingOn === 'scheduling' ? 'scheduling'
          : freezingSoon ? 'freezing'
            : 'nobody';

    out[band].push({
      trip,
      band,
      reasons: reasonsFor(trip, summary, news, freezesInHours),
      ageHours: summary.waitingSinceUtc ? (nowMs - Date.parse(summary.waitingSinceUtc)) / HOUR : 0,
      freezesInHours,
      news: news.length,
    });
  }

  for (const band of Object.keys(out) as EaBand[]) out[band].sort((a, b) => b.ageHours - a.ageHours);
  return out;
}
