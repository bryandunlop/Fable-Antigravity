import type { Defect, Deferral, WorkCard, RecurringCheck, TechLogState } from '../types';
import { currentRows } from './supersede';
import { watchItemsFor } from './watchlist';
import { isDeferralExpired } from './pl25';
import { expiredChecksFor } from './recurringChecks';

const DAY_MS = 86400000;

export interface DueDeferral {
  deferral: Deferral;
  dueState: 'EXPIRED' | 'DUE_SOON';
}
export interface ExpiredCheck {
  aircraftId: string;
  check: RecurringCheck;
}

export interface WorkQueue {
  newSquawks: Defect[];          // OPEN defects = reported, not yet triaged (the pilot→maint handoff)
  pendingPlacard: Deferral[];    // deferrals awaiting their (M)/placard gating release (still RED)
  deferralsDue: DueDeferral[];   // ACTIVE deferrals expired or due within the soon-window
  expiredChecks: ExpiredCheck[]; // expired / never-done recurring dispatch-gating checks
  openWorkCards: WorkCard[];     // work cards not yet completed
  watchItems: Defect[];          // WATCHLISTED non-airworthiness items under maintenance watch
  counts: {
    newSquawks: number;
    pendingPlacard: number;
    deferralsDue: number;
    expiredChecks: number;
    openWorkCards: number;
    watchItems: number;
    urgent: number;              // things grounding or overdue right now (nav badge)
  };
}

type Slice = Pick<TechLogState, 'aircraft' | 'defects' | 'deferrals' | 'workCards' | 'recurringChecks' | 'recurringAccomplishments'>;

/** Cross-aircraft "what needs a human" — all derived from the ledger; no stored queue. */
export function buildWorkQueue(state: Slice, asOfUtc: string, soonDays = 3): WorkQueue {
  const now = new Date(asOfUtc).getTime();
  const airframeOf = (aircraftId: string) => {
    const ac = state.aircraft.find(a => a.id === aircraftId);
    return { hours: ac?.airframeTotalHours ?? 0, cycles: ac?.airframeTotalCycles ?? 0 };
  };

  const defects = currentRows(state.defects);
  const deferrals = currentRows(state.deferrals);

  const newSquawks = defects
    .filter(d => d.status === 'OPEN')
    .sort((a, b) => b.reportedAtUtc.localeCompare(a.reportedAtUtc));

  const pendingPlacard = deferrals.filter(d => d.status === 'PENDING_PLACARD');

  const deferralsDue: DueDeferral[] = [];
  for (const d of deferrals.filter(x => x.status === 'ACTIVE')) {
    const expired = isDeferralExpired(d, asOfUtc, airframeOf(d.aircraftId));
    if (expired) { deferralsDue.push({ deferral: d, dueState: 'EXPIRED' }); continue; }
    if (d.repairDueDateUtc && new Date(d.repairDueDateUtc).getTime() - now <= soonDays * DAY_MS) {
      deferralsDue.push({ deferral: d, dueState: 'DUE_SOON' });
    }
  }

  const expiredChecks: ExpiredCheck[] = state.aircraft.flatMap(ac =>
    expiredChecksFor(ac.id, state, asOfUtc).map(check => ({ aircraftId: ac.id, check })),
  );

  const openWorkCards = state.workCards
    .filter(w => w.status !== 'COMPLETED')
    .sort((a, b) => b.createdAtUtc.localeCompare(a.createdAtUtc));

  const watchItems = watchItemsFor(state.defects);

  const expiredDue = deferralsDue.filter(d => d.dueState === 'EXPIRED').length;
  return {
    newSquawks, pendingPlacard, deferralsDue, expiredChecks, openWorkCards, watchItems,
    counts: {
      newSquawks: newSquawks.length,
      pendingPlacard: pendingPlacard.length,
      deferralsDue: deferralsDue.length,
      expiredChecks: expiredChecks.length,
      openWorkCards: openWorkCards.length,
      watchItems: watchItems.length,
      // watch items are deliberately excluded — they neither ground nor age out
      urgent: newSquawks.length + pendingPlacard.length + expiredChecks.length + expiredDue,
    },
  };
}
