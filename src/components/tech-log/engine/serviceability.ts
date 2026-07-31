import type { Serviceability, TechLogState, Deferral } from '../types';
import { currentRows } from './supersede';
import { isDeferralExpired } from './pl25';
import { expiredChecksFor } from './recurringChecks';

export interface ServiceabilityResult {
  status: Serviceability;
  governingRule: number;
  drivingDefectId?: string;
  drivingDeferralId?: string;
  drivingCheckId?: string;
  computedAtUtc: string;
  openAffectingDefects: number;
  activeDeferrals: number;
}

/** Derived serviceability projection — design §14.2, first-match-wins precedence. */
export function deriveServiceability(
  aircraftId: string,
  state: Pick<TechLogState, 'aircraft' | 'defects' | 'deferrals'> &
    Partial<Pick<TechLogState, 'recurringChecks' | 'recurringAccomplishments'>>,
  asOfUtc: string,
): ServiceabilityResult {
  const ac = state.aircraft.find(a => a.id === aircraftId);
  const airframe = { hours: ac?.airframeTotalHours ?? 0, cycles: ac?.airframeTotalCycles ?? 0 };

  const defects = currentRows(state.defects).filter(d => d.aircraftId === aircraftId);
  const deferrals = currentRows(state.deferrals).filter(d => d.aircraftId === aircraftId);

  const effectiveStatus = (d: Deferral): Deferral['status'] => {
    if (d.status === 'CLEARED' || d.status === 'EXPIRED') return d.status;
    if ((d.status === 'ACTIVE' || d.status === 'PENDING_PLACARD') && isDeferralExpired(d, asOfUtc, airframe)) {
      return 'EXPIRED';
    }
    return d.status;
  };

  // WATCHLISTED is included so neutrality derives solely from airworthinessAffecting === false —
  // a contract-violating watch row still marked affecting must ground (conservative default).
  const openAffecting = defects.filter(
    d =>
      (d.airworthinessAffecting === true || d.airworthinessAffecting === null) &&
      (d.status === 'OPEN' || d.status === 'DEFERRED' || d.status === 'WATCHLISTED') &&
      !d.clearedTsUtc,
  );

  const activeDeferralFor = (defectId: string) =>
    deferrals.find(df => df.defectId === defectId && effectiveStatus(df) === 'ACTIVE');

  const activeDeferralCount = deferrals.filter(df => effectiveStatus(df) === 'ACTIVE').length;

  const result = (
    status: Serviceability,
    governingRule: number,
    ids: { defect?: string; deferral?: string; check?: string } = {},
  ): ServiceabilityResult => ({
    status,
    governingRule,
    drivingDefectId: ids.defect,
    drivingDeferralId: ids.deferral,
    drivingCheckId: ids.check,
    computedAtUtc: asOfUtc,
    openAffectingDefects: openAffecting.length,
    activeDeferrals: activeDeferralCount,
  });

  // Rule 1: open airworthiness defect not covered by an ACTIVE deferral -> RED
  for (const d of openAffecting) {
    if (!activeDeferralFor(d.id)) return result('RED', 1, { defect: d.id });
  }
  // Rule 2: any deferral expired/overdue -> RED
  const expired = deferrals.find(df => effectiveStatus(df) === 'EXPIRED');
  if (expired) return result('RED', 2, { deferral: expired.id });
  // Rule 3: an expired (or never-accomplished) recurring dispatch-gating check -> RED (§17.4)
  const expiredCheck = expiredChecksFor(aircraftId, state, asOfUtc)[0];
  if (expiredCheck) return result('RED', 3, { check: expiredCheck.id });
  /* Rule 6 (LG-143): the tail is in onboarding — its D195 MEL is still PENDING_FSDO, so there is
     no dispatch answer to give. Placed AFTER the RED rules deliberately: a defect on a provisional
     tail is still a defect, and naming it is more useful than declining to answer. It comes before
     AMBER/GREEN because "nothing recorded against it" is not a green light. (Rule 4 is unreachable
     for such a tail anyway — a deferral cannot be raised against an unapproved MEL.) */
  if (ac?.isProvisional) return result('NOT_ASSESSED', 6);
  // Rule 4: any ACTIVE deferral -> AMBER
  const active = deferrals.find(df => effectiveStatus(df) === 'ACTIVE');
  if (active) return result('AMBER', 4, { deferral: active.id });
  // Rule 5: GREEN
  return result('GREEN', 5);
}
