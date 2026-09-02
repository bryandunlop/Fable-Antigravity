/**
 * The four things the trip workspace's header strip always says, and the counts on its tabs.
 *
 * Tabs hide. That is their whole cost, and Bryan accepted it on 2026-09-02 by choosing Option A from
 * the layout canvas — on the condition that the strip is the counter-measure. So this is the file
 * that has to be right: if something needing a decision is not counted here, it sits behind a tab
 * and nobody sees it. (Phase 5 slice 4, D109, LG-365.)
 *
 * `waitingOn` is deliberately the same question slice 5's queue asks across every trip. Keeping the
 * answer in one pure function means the band on the Trips home and the cell on this page cannot
 * drift into disagreeing about who is holding a trip up.
 *
 * Pure. No React, no storage; the caller passes the clock, the register, the settings and the gates
 * it already computed.
 */

import { cutoffsFor, type CutoffDefaults, type CutoffDue } from './cutoffs';
import { blockingGates, type DocumentGate, type DocumentPolicy } from './documentGates';
import type { Person } from './people';
import { emailDraftOf } from './briefingEmail';
import { latestSheet } from './tripSheet';
import { pendingChanges, type Trip } from './trip';

export type WaitingOn = 'scheduling' | 'ea' | 'nobody';

export const WAITING_LABEL: Record<WaitingOn, string> = {
  scheduling: 'Scheduling',
  ea: 'The EA',
  nobody: 'Nobody',
};

export interface WorkspaceCounts {
  itinerary: number;
  people: number;
  record: number;
  documents: number;
  sheet: number;
  ops: number;
}

export interface WorkspaceSummary {
  /** The soonest cutoff still ahead. Null when no leg has a date, or all of them have passed. */
  nextCutoff: CutoffDue | null;
  people: { named: number; seats: number; unnamed: number; gates: number };
  freeze: { dueUtc: string; blocked: boolean; frozen: boolean } | null;
  waitingOn: WaitingOn;
  /** When the wait started — the last thing that happened on the trip. */
  waitingSinceUtc: string | null;
  counts: WorkspaceCounts;
}

export interface SummarySettings {
  cutoffs: CutoffDefaults;
  documentPolicy: DocumentPolicy;
}

/** Questions scheduling asked that the EA has not answered. A question is answered by any later message. */
function openQuestions(trip: Trip): number {
  let open = 0;
  for (const e of trip.events) {
    if (e.kind === 'question' && e.by.role === 'scheduling') open += 1;
    else if (e.kind === 'message' && e.by.role === 'ea') open = 0;
  }
  return open;
}

export function workspaceSummary(
  trip: Trip,
  people: Person[],
  settings: SummarySettings,
  gates: DocumentGate[],
  nowUtc: string,
): WorkspaceSummary {
  const cutoffs = cutoffsFor(trip, settings.cutoffs);
  const nextCutoff = cutoffs.find(c => c.dueUtc > nowUtc) ?? null;

  const unresolvedGates = blockingGates(trip, gates);
  const sheet = latestSheet(trip);
  const freezeDue = cutoffs.find(c => c.kind === 'freeze');
  const freeze = freezeDue
    ? { dueUtc: freezeDue.dueUtc, blocked: !sheet && unresolvedGates.length > 0, frozen: !!sheet }
    : null;

  const named = trip.passengerNames.length;
  const unnamed = Math.max(0, trip.seatsHeld - named);
  const changes = pendingChanges(trip).length;
  const questions = openQuestions(trip);

  const live = trip.status === 'submitted' || trip.status === 'confirmed';
  const draftEmail = emailDraftOf(trip);
  const emailWaiting = live && !!draftEmail && !draftEmail.sentAtUtc;

  // Highest claim first: anything scheduling must act on outranks anything the EA must, because a
  // trip with no aircraft is not the EA's to fix. `nobody` is only reached when neither side owes
  // the other anything — it is the quiet state, not the default.
  const waitingOn: WaitingOn =
    !live ? (trip.status === 'draft' ? 'ea' : 'nobody')
      : !trip.tail || changes > 0 || unresolvedGates.length > 0 || emailWaiting ? 'scheduling'
        : questions > 0 || unnamed > 0 ? 'ea'
          : 'nobody';

  const lastEvent = trip.events[trip.events.length - 1];

  return {
    nextCutoff,
    people: { named, seats: trip.seatsHeld, unnamed, gates: unresolvedGates.length },
    freeze,
    waitingOn,
    waitingSinceUtc: lastEvent?.at ?? null,
    counts: {
      // Only things a person has to DECIDE get a count. A leg without a date is a blocker the
      // Itinerary tab already shows in full; a number on the tab for it would be noise.
      itinerary: changes,
      people: live ? unnamed : 0,
      record: questions,
      documents: unresolvedGates.length,
      sheet: emailWaiting ? 1 : 0,
      // A confirmed aircraft with nobody flying it is a decision scheduling owes, and it was the one
      // tab that could never raise its hand (fresh review, 2026-09-02) — the same "hides a real
      // decision" hole this file exists to close.
      ops: live && trip.tail && !trip.crew ? 1 : 0,
    },
  };
}
