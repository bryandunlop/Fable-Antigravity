import type { RecurringCheck, RecurringCheckAccomplishment, RecurringCheckState, TechLogState } from '../types';
import { currentRows } from './supersede';

const DAY_MS = 86400000;

/** Single source of truth is `RecurringCheckState` in ../types: a briefing's frozen disclosure
 *  persists this value (TL-16), so the union must not be able to drift between the two modules. */
export type CheckState = RecurringCheckState;

export interface CheckProjection {
  check: RecurringCheck;
  latest?: RecurringCheckAccomplishment;
  state: CheckState;
  dueUtc?: string;          // calendar-based due
  dueUsage?: number;        // usage-based due threshold
  remainingDays?: number;   // for calendar checks (can be negative when overdue)
  remainingUsage?: number;  // for usage checks
}

const isCalendar = (u: RecurringCheck['intervalUnit']) => u === 'CALENDAR_DAY' || u === 'MONTH';

/** Most recent accomplishment for a check (current ledger rows, newest first). */
export function latestAccomplishment(
  checkId: string,
  accomplishments: RecurringCheckAccomplishment[],
): RecurringCheckAccomplishment | undefined {
  return currentRows(accomplishments)
    .filter(a => a.checkId === checkId)
    .sort((a, b) => b.accomplishedAtUtc.localeCompare(a.accomplishedAtUtc))[0];
}

/** Project a check's current state from its latest accomplishment (derived, never stored). */
export function projectCheck(
  check: RecurringCheck,
  accomplishments: RecurringCheckAccomplishment[],
  asOfUtc: string,
  airframeNow: { hours: number; cycles: number },
): CheckProjection {
  const latest = latestAccomplishment(check.id, accomplishments);
  if (!latest) return { check, state: 'NEVER_DONE' };

  if (isCalendar(check.intervalUnit)) {
    const days = check.intervalUnit === 'MONTH' ? check.intervalValue * 30 : check.intervalValue;
    const dueMs = new Date(latest.accomplishedAtUtc).getTime() + days * DAY_MS;
    const remainingDays = Math.floor((dueMs - new Date(asOfUtc).getTime()) / DAY_MS);
    const dueUtc = new Date(dueMs).toISOString();
    const state: CheckState = remainingDays < 0 ? 'EXPIRED' : remainingDays <= 7 ? 'DUE_SOON' : 'CURRENT';
    return { check, latest, state, dueUtc, remainingDays };
  }

  // usage-based
  const base = check.intervalUnit === 'FLIGHT_HOUR' ? latest.airframeHours : latest.airframeCycles;
  const now = check.intervalUnit === 'FLIGHT_HOUR' ? airframeNow.hours : airframeNow.cycles;
  const dueUsage = base + check.intervalValue;
  const remainingUsage = Math.round((dueUsage - now) * 10) / 10;
  const state: CheckState = remainingUsage < 0 ? 'EXPIRED' : remainingUsage <= check.intervalValue * 0.1 ? 'DUE_SOON' : 'CURRENT';
  return { check, latest, state, dueUsage, remainingUsage };
}

/** Active recurring checks for an aircraft that are currently grounding (EXPIRED or never done). */
export function expiredChecksFor(
  aircraftId: string,
  state: Pick<TechLogState, 'aircraft'> &
    Partial<Pick<TechLogState, 'recurringChecks' | 'recurringAccomplishments'>>,
  asOfUtc: string,
): RecurringCheck[] {
  const ac = state.aircraft.find(a => a.id === aircraftId);
  const airframe = { hours: ac?.airframeTotalHours ?? 0, cycles: ac?.airframeTotalCycles ?? 0 };
  return (state.recurringChecks ?? [])
    .filter(c => c.active && c.aircraftId === aircraftId)
    .map(c => projectCheck(c, state.recurringAccomplishments ?? [], asOfUtc, airframe))
    .filter(p => p.state === 'EXPIRED' || p.state === 'NEVER_DONE')
    .map(p => p.check);
}
