import { ActionItem, CheckInCadence } from './types';
import { getDaysSinceLastReport, getStallState } from './stall';

/**
 * The chase run turns "manage 23 projects" into a task that can be finished.
 *
 * A list is a standing obligation — there is no point at which an admin has
 * dealt with it. The run bounds the work: it takes the projects that have gone
 * quiet, hands them over one at a time, and ends. Each one gets a decision, and
 * "skip" is a decision.
 */

/**
 * Snapshot the queue at the moment the run starts.
 *
 * Deliberately a snapshot rather than a live derivation: closing a project or
 * slowing its cadence changes whether it still counts as quiet, so a live
 * queue would reshuffle under the admin mid-run and could drop a project they
 * had not yet seen. Worst silence first, so the run front-loads the damage.
 */
export const buildRunQueue = (items: ActionItem[], today: string): string[] =>
  items
    .filter(item => getStallState(item, today) === 'quiet')
    .sort((a, b) => (getDaysSinceLastReport(b, today) ?? 0) - (getDaysSinceLastReport(a, today) ?? 0))
    .map(item => item.id);

const SLOWER: Record<CheckInCadence, CheckInCadence | null> = {
  weekly: 'biweekly',
  biweekly: 'monthly',
  monthly: null,
  none: null,
};

/**
 * The next step down the cadence ladder, or null when there is nowhere slower
 * to go. Slowing a cadence is the honest answer when a project keeps going
 * quiet because the rhythm was always too fast for it — better than a standing
 * ask nobody ever meets.
 */
export const nextSlowerCadence = (cadence: CheckInCadence | undefined): CheckInCadence | null =>
  cadence ? SLOWER[cadence] : null;

export type ChaseVerb = 'nudged' | 'reassigned' | 'slowed' | 'closed' | 'skipped';

export const VERB_LABEL: Record<ChaseVerb, string> = {
  nudged: 'Nudged',
  reassigned: 'Reassigned',
  slowed: 'Cadence slowed',
  closed: 'Closed',
  skipped: 'Skipped',
};

/** Everyone who appears on any project, for the reassign picker. */
export const getPeopleRoster = (items: ActionItem[]): string[] =>
  [...new Set(items.flatMap(item => item.contributors.map(c => c.name)))].sort();
