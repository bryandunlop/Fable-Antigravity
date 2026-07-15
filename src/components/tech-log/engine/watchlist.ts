import type { Defect, Personnel } from '../types';
import { currentRows } from './supersede';

/** Current watch items for an aircraft, newest-reported first — the same bucket the work queue
 *  shows maintenance (`buildWorkQueue().watchItems`), reused by the crew-facing briefing and
 *  postflight so a watch item cannot be disclosed on one surface and hidden on another. */
export function watchItemsFor(defects: Defect[], aircraftId: string): Defect[] {
  return currentRows(defects)
    .filter(d => d.aircraftId === aircraftId && d.status === 'WATCHLISTED')
    .sort((a, b) => b.reportedAtUtc.localeCompare(a.reportedAtUtc));
}

/** WATCH disposition (mirrors CAMP's DEFERRED-WATCHLIST discrepancy type): a non-airworthiness
 *  cabin/NEF item maintenance wants tracked without an MEL deferral. Maintenance-only, from OPEN
 *  only, and only when the superseding row will carry an explicit `airworthinessAffecting: false`
 *  assessment — `null` (grounding-by-default) is not an assessment and refuses. */
export function canWatchlistDefect(
  person: Pick<Personnel, 'role'>,
  defect: Pick<Defect, 'status'>,
  assessedAirworthinessAffecting: boolean | null,
): { ok: boolean; reason?: string } {
  if (person.role !== 'MAINTENANCE') {
    return { ok: false, reason: 'Only maintenance may place a defect on the watch list.' };
  }
  if (defect.status !== 'OPEN') {
    return { ok: false, reason: `Only an OPEN defect can be watchlisted (current status: ${defect.status}).` };
  }
  if (assessedAirworthinessAffecting !== false) {
    return { ok: false, reason: 'The watch disposition requires an explicit non-airworthiness assessment.' };
  }
  return { ok: true };
}

/** Escalation out of watch: the item is reassessed as airworthiness-affecting and returns to OPEN
 *  (grounding via the §14.2 rule-1 default). Maintenance-only, WATCHLISTED-only. */
export function canEscalateWatchedDefect(
  person: Pick<Personnel, 'role'>,
  defect: Pick<Defect, 'status'>,
): { ok: boolean; reason?: string } {
  if (person.role !== 'MAINTENANCE') {
    return { ok: false, reason: 'Only maintenance may escalate a watch-list item.' };
  }
  if (defect.status !== 'WATCHLISTED') {
    return { ok: false, reason: `Only a WATCHLISTED defect can be escalated (current status: ${defect.status}).` };
  }
  return { ok: true };
}
