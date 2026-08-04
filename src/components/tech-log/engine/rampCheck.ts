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
 * `state` excludes `melItems` and `personnel`, so a live foreign-key join into either is a
 * compile error rather than something a reviewer has to notice. Every MEL field below is read
 * from the frozen Deferral row. That matters because EDIT_MEL_ITEM (TechLogContext.tsx)
 * replaces a MelItem in place under the same id: joining would let a rev-15 edit repaint a
 * rev-14 deferral while its governingMmelRevision still read '14' — showing a regulator the
 * wrong provision under a correct-looking label, and breaking the point-in-time MEL invariant
 * ("a deferral signed under revision N must read correctly after revision N+1 ships").
 * Widening the signature to include either table reopens that hole; rampCheck.test.ts guards
 * it. `defects` is in, and must be — see below. `aircraft` is read live and that is correct:
 * tail, serial and airframe totals describe the physical aircraft in front of the inspector,
 * not a historical assertion.
 *
 * WHY `defects` IS IN THE SIGNATURE. It was not, and that was a serious bug (found by two
 * independent reviewers, 2026-07-15, reproduced live). Serviceability is decided by open
 * defects and recurring checks as much as by deferrals: N1PG is seeded RED by an open
 * airworthiness defect with zero deferrals, and a deferral-only view rendered it completely
 * clean — "No inoperative equipment is carried under the MEL", no warning — to an inspector
 * standing at a grounded aircraft. The "Default-RED on open defect" invariant says absence of
 * a status is RED, never GREEN; a blank screen implying "fine" is precisely what it forbids.
 * So this calls `deriveServiceability` — the same projection the fleet board reads — rather
 * than deciding anything itself. Calling it, not re-implementing it, is what makes divergence
 * impossible; a test asserts the two agree.
 *
 * Note the two signals are kept separate and are NOT the same question:
 *   `serviceability`  — is this aircraft airworthy? (whole-aircraft, all inputs)
 *   `hasMelFinding`   — is something wrong with a DEFERRED item? (MEL-scoped)
 * Collapsing them is what produced the original bug.
 */

import type {
  AircraftType, Deferral, DeferralStatus, MelCategory, RepairIntervalUnit, Serviceability,
  TechLogState,
} from '../types';
import { currentRows } from './supersede';
import { isDeferralExpired } from './pl25';
import { deriveServiceability } from './serviceability';

export interface RampDeferralRow {
  deferralId: string;
  /** Frozen at signing. null on a row predating the D36 snapshot — never backfilled by a join. */
  melSubItemNumber: string | null;
  melTitle: string | null;
  governingMmelRevision: string;
  governingEffectiveDate: string;
  /** `null` for an NEF deferral, which carries no repair category (D69). */
  category: MelCategory | null;
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
  /**
   * myGFO's authoritative whole-aircraft serviceability, from `deriveServiceability` — the same
   * projection the fleet board and the aircraft page read. NOT recomputed here.
   */
  serviceability: Serviceability;
  /**
   * MEL-scoped: some presented deferral is not cleanly ACTIVE (expired, placard outstanding, or
   * unsigned), OR carries a required placard that is not installed. Deliberately narrower than
   * `serviceability` — a grounding defect is not a MEL finding, and an aircraft can be RED with
   * this false. Never use it as a dispatch signal.
   */
  hasMelFinding: boolean;
  /**
   * The aircraft's D195 is not FSDO-approved (`Aircraft.isProvisional` — the G800 case). The screen
   * must NOT present the MEL as governing, and must not read Serviceable. See the note in
   * `buildRampView`.
   */
  melProvisional: boolean;
  computedAtUtc: string;
}

/**
 * Everything the ramp view may see — note the absence of `melItems` and `personnel`.
 *
 * `recurringChecks`/`recurringAccomplishments` are REQUIRED here even though `deriveServiceability`
 * takes them optionally. An expired recurring check grounds an aircraft (its Rule 3), so omitting
 * them silently downgrades RED to GREEN — and with `Partial` that omission is a type-clean call an
 * adversarial verifier proved reachable. On the one screen shown to a regulator, under-reporting
 * must be a compile error.
 */
export type RampState = Pick<
  TechLogState,
  'aircraft' | 'deferrals' | 'defects' | 'recurringChecks' | 'recurringAccomplishments'
>;

export function buildRampView(
  aircraftId: string,
  state: RampState,
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
    // `deriveServiceability` has no concept of isProvisional — legitimately, since it answers
    // "what do the records say about this airframe", and a pending FSDO approval is not a defect.
    // But it therefore returns GREEN for a provisional aircraft, and this screen must never print
    // "Serviceable" beside a D195 the FSDO has not approved. Every other consumer already refuses
    // that combination (AircraftDetail.tsx:276 shows a Provisional badge INSTEAD of the chip); ramp
    // mode was the sole exception, on the sole regulator-facing screen. Resolved conservatively —
    // consistent with "absence of an explicit status is RED, never GREEN".
    serviceability: ac.isProvisional ? 'RED' : deriveServiceability(aircraftId, state, asOfUtc).status,
    melProvisional: ac.isProvisional,
    // MEL-scoped only. A presented row that is not ACTIVE is a finding — EXPIRED is out of time,
    // PENDING_PLACARD means the (M)/placard release is unsigned so the deferral never became
    // active, PROPOSED is not yet signed at all — and so is an ACTIVE row whose required placard
    // is missing, because ¶6-101G6 ("all required placards are present and legible") is precisely
    // the check the inspector performs. Says nothing about defects or recurring checks;
    // `serviceability` above is the airworthiness answer.
    hasMelFinding: rows.some(r => r.status !== 'ACTIVE' || (r.placardRequired && !r.placardInstalled)),
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
