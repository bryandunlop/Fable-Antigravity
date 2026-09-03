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
import { newsForEa, outstandingAdminMessages } from './adminMessages';

export type WaitingOn = 'scheduling' | 'ea' | 'nobody';

export const WAITING_LABEL: Record<WaitingOn, string> = {
  scheduling: 'Scheduling',
  ea: 'The EA',
  nobody: 'Nobody',
};

export interface WorkspaceCounts {
  itinerary: number;
  people: number;
  /** Open checklist items. The engine does not hold the items; the page fills this in (D110 slice 2). */
  checklist: number;
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
  /** Messages from the EA that scheduling has not answered (LG-398). */
  messages: number;
  /** When the wait started — the last thing that happened on the trip. */
  waitingSinceUtc: string | null;
  counts: WorkspaceCounts;
}

export interface SummarySettings {
  cutoffs: CutoffDefaults;
  documentPolicy: DocumentPolicy;
}

/**
 * Questions scheduling asked that the EA has not answered. A question is answered by anything she
 * says next — which is `newsForEa`'s rule, so this reads it rather than keeping a second copy. Two
 * loops with subtly different ideas of "she has spoken" is how a band and a reason line end up
 * contradicting each other on the same row (fresh review, 2026-09-03).
 */
function openQuestions(trip: Trip): number {
  return newsForEa(trip).filter(e => e.kind === 'question').length;
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
  const messages = live ? outstandingAdminMessages(trip).length : 0;
  const draftEmail = emailDraftOf(trip);
  const emailWaiting = live && !!draftEmail && !draftEmail.sentAtUtc;

  // Highest claim first: anything scheduling must act on outranks anything the EA must, because a
  // trip with no aircraft is not the EA's to fix. `nobody` is only reached when neither side owes
  // the other anything — it is the quiet state, not the default.
  const waitingOn: WaitingOn =
    !live ? (trip.status === 'draft' ? 'ea' : 'nobody')
      // `!trip.crew` belongs here for the same reason it earns a count on the Ops tab: assigning
      // crew is a decision scheduling owes. Without it a tailed, crewless trip read as "Waiting on
      // nobody · Aircraft on, crew set, everyone named" on a row that simultaneously said "No crew
      // set" (fresh review, 2026-09-02).
      // An unanswered message from the EA is scheduling's to answer (LG-398).
      : !trip.tail || !trip.crew || changes > 0 || unresolvedGates.length > 0 || emailWaiting || messages > 0 ? 'scheduling'
        : questions > 0 || unnamed > 0 ? 'ea'
          : 'nobody';

  const lastEvent = trip.events[trip.events.length - 1];

  return {
    nextCutoff,
    people: { named, seats: trip.seatsHeld, unnamed, gates: unresolvedGates.length },
    freeze,
    waitingOn,
    messages,
    waitingSinceUtc: lastEvent?.at ?? null,
    counts: {
      // Only things a person has to DECIDE get a count. A leg without a date is a blocker the
      // Itinerary tab already shows in full; a number on the tab for it would be noise.
      itinerary: changes,
      people: live ? unnamed : 0,
      checklist: 0,
      record: questions + messages,
      documents: unresolvedGates.length,
      sheet: emailWaiting ? 1 : 0,
      // A confirmed aircraft with nobody flying it is a decision scheduling owes, and it was the one
      // tab that could never raise its hand (fresh review, 2026-09-02) — the same "hides a real
      // decision" hole this file exists to close.
      ops: live && trip.tail && !trip.crew ? 1 : 0,
    },
  };
}
