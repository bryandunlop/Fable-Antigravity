/**
 * The view model behind ramp mode — what a pilot shows an FAA inspector at the aircraft (D36).
 *
 * This is not a generic deferral list. Its shape is dictated by FAA Order 8900.1 Vol 6 Ch 1
 * Sec 4 ¶6-101F5, which tells the inspector, verbatim: "check the MEL to determine that it
 * has: a) Been issued by N-number and serial number to the aircraft operator. b) An LOA from
 * a district office; check deferred items for placards and dates." Tail, serial, LOA,
 * deferred items, placards, dates — in that order, and nothing else. ¶6-101G6 adds "all
 * required placards are present and legible", which is why placardLocation is carried: the
 * inspector physically looks at the placard, and the screen's job is to say where.
 *
 * Deliberately absent: provisos and (M)/(O) procedure text. ¶6-101F5 does not ask for them,
 * and AOPA advises against volunteering digital material an inspector did not request. See
 * the D36 vault note.
 *
 * NOTE ON THE STATE PARAMETER — this is the load-bearing design choice, not an oversight.
 * `state` is Pick<TechLogState, 'aircraft' | 'deferrals'>. It has no `melItems` and no
 * `personnel`, so a live foreign-key join into either is a compile error rather than
 * something a reviewer has to notice. Every MEL field below is read from the frozen Deferral
 * row. That matters because EDIT_MEL_ITEM (TechLogContext.tsx) replaces a MelItem in place
 * under the same id: joining would let a rev-15 edit repaint a rev-14 deferral while its
 * governingMmelRevision still read '14' — showing a regulator the wrong provision under a
 * correct-looking label, and breaking the point-in-time MEL invariant ("a deferral signed
 * under revision N must read correctly after revision N+1 ships"). Widening this signature
 * reopens that hole; rampCheck.test.ts guards it.
 *
 * `aircraft` IS read live, and that is correct: tail, serial and airframe totals describe the
 * physical aircraft standing in front of the inspector, not a historical assertion.
 */

import type {
  AircraftType, Deferral, DeferralStatus, MelCategory, RepairIntervalUnit, TechLogState,
} from '../types';
import { currentRows } from './supersede';
import { isDeferralExpired } from './pl25';

export interface RampDeferralRow {
  deferralId: string;
  /** Frozen at signing. null on a row predating the D36 snapshot — never backfilled by a join. */
  melSubItemNumber: string | null;
  melTitle: string | null;
  governingMmelRevision: string;
  governingEffectiveDate: string;
  category: MelCategory;
  /** Effective status: the stored status, re-read against the due boundary (expiry is derived). */
  status: DeferralStatus;
  isExpired: boolean;
  placardRequired: boolean;
  placardInstalled: boolean;
  placardLocation?: string;
  restrictionText?: string;
  /**
   * An extension moves the due date, and ¶6-101F5(b) has the inspector checking dates — so the
   * fact of it is checklist material and is shown. The justification prose is not: it is a
   * maintenance-judgement narrative nobody asked for, and it stays in the full record.
   */
  extensionUsed: boolean;
  clockStartDateUtc: string;
  repairDueDateUtc?: string;
  usageDueThreshold?: number;
  repairIntervalUnit: RepairIntervalUnit;
  /** D24 — the IANA zone the PL-25 calendar-day clock was anchored to. Dates mean nothing without it. */
  governingTimezone: string;
  /** Resolves against the frozen Signature row for the drill-down. Never against Personnel. */
  signatureId: string;
}

export interface RampView {
  aircraftId: string;
  tailNumber: string;
  serialNumber: string;
  type: AircraftType;
  /**
   * ¶6-101F5(b) has the inspector look for the LOA, and 8900.1 ¶6-95D says the MEL and LOA
   * "must be on board" — but myGFO holds neither (TL-25). Hardcoded false so the gap renders
   * on the screen as a stated absence rather than disappearing. Flip this when TL-25 lands.
   */
  loaHeld: boolean;
  deferrals: RampDeferralRow[];
  /** True when any presented deferral is not cleanly ACTIVE — i.e. something an inspector would write up. */
  hasFinding: boolean;
  computedAtUtc: string;
}

export function buildRampView(
  aircraftId: string,
  state: Pick<TechLogState, 'aircraft' | 'deferrals'>,
  asOfUtc: string,
): RampView | null {
  const ac = state.aircraft.find(a => a.id === aircraftId);
  if (!ac) return null;

  const airframe = { hours: ac.airframeTotalHours, cycles: ac.airframeTotalCycles };

  // Mirrors deriveServiceability's reading: expiry is derived from the due condition, never
  // trusted from the stored status alone. A deferral can sit at ACTIVE in the ledger and be
  // expired in fact — that divergence is precisely what a ramp check catches.
  const effectiveStatus = (d: Deferral): DeferralStatus => {
    if (d.status === 'CLEARED' || d.status === 'EXPIRED') return d.status;
    if ((d.status === 'ACTIVE' || d.status === 'PENDING_PLACARD') && isDeferralExpired(d, asOfUtc, airframe)) {
      return 'EXPIRED';
    }
    return d.status;
  };

  const rows: RampDeferralRow[] = currentRows(state.deferrals)
    .filter(d => d.aircraftId === aircraftId)
    .map(d => ({ d, status: effectiveStatus(d) }))
    // "Deferred items" means currently deferred. A cleared deferral is history, and history is
    // the Audit ledger's job, not this screen's — showing it volunteers material nobody asked for.
    .filter(({ status }) => status !== 'CLEARED')
    .map(({ d, status }) => ({
      deferralId: d.id,
      melSubItemNumber: d.melSubItemNumber ?? null,
      melTitle: d.melTitle ?? null,
      governingMmelRevision: d.governingMmelRevision,
      governingEffectiveDate: d.governingEffectiveDate,
      category: d.category,
      status,
      isExpired: status === 'EXPIRED',
      placardRequired: d.placardRequired,
      placardInstalled: d.placardInstalled ?? false,
      placardLocation: d.placardLocation,
      restrictionText: d.restrictionText,
      extensionUsed: d.extensionUsed,
      clockStartDateUtc: d.clockStartDateUtc,
      repairDueDateUtc: d.repairDueDateUtc,
      usageDueThreshold: d.usageDueThreshold,
      repairIntervalUnit: d.repairIntervalUnit,
      governingTimezone: d.governingTimezone,
      signatureId: d.signatureId,
    }))
    .sort(compareRampRows);

  return {
    aircraftId,
    tailNumber: ac.tailNumber,
    serialNumber: ac.serialNumber,
    type: ac.type,
    loaHeld: false,
    deferrals: rows,
    // Anything still presented that is not ACTIVE is a finding: EXPIRED is out of time,
    // PENDING_PLACARD means the (M)/placard release is unsigned so the deferral never became
    // active and the aircraft is RED, and PROPOSED is not yet signed at all.
    hasFinding: rows.some(r => r.status !== 'ACTIVE'),
    computedAtUtc: asOfUtc,
  };
}

/** Expired first, then soonest due. The finding an inspector is looking for is never below the fold. */
function compareRampRows(a: RampDeferralRow, b: RampDeferralRow): number {
  if (a.isExpired !== b.isExpired) return a.isExpired ? -1 : 1;
  const ad = a.repairDueDateUtc ? Date.parse(a.repairDueDateUtc) : Infinity;
  const bd = b.repairDueDateUtc ? Date.parse(b.repairDueDateUtc) : Infinity;
  return ad - bd;
}
