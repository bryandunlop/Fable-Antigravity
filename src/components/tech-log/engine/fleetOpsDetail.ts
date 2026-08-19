// Per-tail ops-wall detail — D88.
//
// The landing page's tail cards need one line of "why" beside the RAG state: the driving
// defect for a RED tail, the governing MEL clock for an AMBER one. This stays a pure
// projection over the same state deriveServiceability reads — never a stored status.

import type { AircraftType, MelCategory, Serviceability, TechLogState } from '../types';
import { deriveServiceability } from './serviceability';
import { currentRows } from './supersede';

export interface FleetOpsDeferralClock {
  category: MelCategory | null;
  repairDueDateUtc: string | null;
  /** D24 — the IANA zone the PL-25 clock is anchored to; display renders the boundary through it. */
  governingTimezone: string;
  /** Whole days between asOf and the due boundary (floor); null when the deferral has no date clock. */
  daysRemaining: number | null;
  /** The signed interval length in days when the clock is calendar-based; null otherwise. */
  intervalDays: number | null;
}

/** Superset of FleetAirworthinessEntry — existing consumers keep working unchanged. */
export interface FleetOpsTailDetail {
  tailNumber: string;
  type: AircraftType;
  isProvisional: boolean;
  status: Serviceability;
  openAffectingDefects: number;
  activeDeferrals: number;
  /** One line of "why": driving defect description (RED) or MEL title (AMBER). Null when GREEN. */
  headline: string | null;
  ataChapter: string | null;
  deferralClock: FleetOpsDeferralClock | null;
}

const DAY_MS = 86_400_000;

type OpsState = Pick<TechLogState, 'aircraft' | 'defects' | 'deferrals'> &
  Partial<Pick<TechLogState, 'recurringChecks' | 'recurringAccomplishments'>>;

export function summarizeFleetOpsDetail(state: OpsState, asOfUtc: string): FleetOpsTailDetail[] {
  const asOfMs = Date.parse(asOfUtc);

  return state.aircraft.map(ac => {
    const r = deriveServiceability(ac.id, state, asOfUtc);

    let headline: string | null = null;
    let ataChapter: string | null = null;
    let deferralClock: FleetOpsDeferralClock | null = null;

    if (r.status === 'RED') {
      const driving =
        state.defects.find(d => d.id === r.drivingDefectId) ??
        // Rule-2 RED (expired deferral): surface the deferral's underlying defect.
        state.defects.find(d => d.id === state.deferrals.find(df => df.id === r.drivingDeferralId)?.defectId);
      if (driving) {
        headline = driving.description;
        ataChapter = driving.ataChapter ?? null;
      } else {
        // Rule-3 RED: an expired/never-done recurring dispatch-gating check (§17.4)
        // grounds with no defect row at all — surface the check, not a generic label.
        const check = (state.recurringChecks ?? []).find(c => c.id === r.drivingCheckId);
        headline = check?.name ?? null;
        ataChapter = check?.ataChapter ?? null;
      }
    } else if (r.status === 'AMBER') {
      // The governing clock is the soonest-due ACTIVE deferral for this tail.
      // currentRows first: an extension supersedes with a same-status row, and the
      // raw array would hand the stale pre-extension clock to every card and wall.
      const active = currentRows(state.deferrals)
        .filter(df => df.aircraftId === ac.id && df.status === 'ACTIVE')
        .sort((a, b) => Date.parse(a.repairDueDateUtc ?? '9999-12-31') - Date.parse(b.repairDueDateUtc ?? '9999-12-31'));
      const governing = active[0];
      if (governing) {
        const dueMs = governing.repairDueDateUtc ? Date.parse(governing.repairDueDateUtc) : null;
        headline =
          governing.melTitle ??
          state.defects.find(d => d.id === governing.defectId)?.description ??
          null;
        ataChapter = state.defects.find(d => d.id === governing.defectId)?.ataChapter ?? null;
        deferralClock = {
          category: governing.category,
          repairDueDateUtc: governing.repairDueDateUtc ?? null,
          governingTimezone: governing.governingTimezone,
          daysRemaining: dueMs === null ? null : Math.floor((dueMs - asOfMs) / DAY_MS),
          intervalDays: governing.repairIntervalUnit === 'CALENDAR_DAY' ? governing.repairIntervalValue : null,
        };
      }
    }

    return {
      tailNumber: ac.tailNumber,
      type: ac.type,
      isProvisional: ac.isProvisional,
      status: r.status,
      openAffectingDefects: r.openAffectingDefects,
      activeDeferrals: r.activeDeferrals,
      headline,
      ataChapter,
      deferralClock,
    };
  });
}
