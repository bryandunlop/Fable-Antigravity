/**
 * What the PIC was actually shown on a flight briefing — the disclosure projection (TL-16).
 *
 * A signed document that rewrites itself defeats the point of signing it. Before this engine
 * existed, `BriefingPanel` derived the deferral list, open defects, watch items, recurring checks
 * and the CAMP coming-due block live on every render, and BOTH the readout for a RELEASED /
 * ACKNOWLEDGED briefing and `printBriefing()` consumed those live values — while `FlightBriefing`
 * froze only the headline serviceability and the acknowledged deferral ids. So a briefing printed
 * at T3 could show an item that was watchlisted at T2.5, on a document bearing the PIC's signature
 * and content hash, and the hash still verified because the disclosed content was never in the
 * hashed payload. Bryan ruled on 2026-07-14 that the spirit of the DM-3/IN-4 rule governs and this
 * is a schema-freeze gate; the narrow "the rule's list doesn't enumerate defect content" reading is
 * closed.
 *
 * Two of the leaks were unconditional, not races:
 *   - `campForecast(serial, airframe, nowMs = Date.now())` computes every due date as an offset from
 *     *now*, so the "Coming due (CAMP)" block rendered different dates on every print with no state
 *     change whatsoever. Those rows are therefore an INPUT to this function, frozen by the caller at
 *     release, never re-fetched at print time.
 *   - The PIC's per-item MEL acknowledge checkboxes rendered the live `MelItem`, so the crew ticked
 *     boxes against text a later revision could rewrite underneath them.
 *
 * NOTE ON THE STATE PARAMETER — this is the load-bearing design choice, mirroring `rampCheck.ts`
 * (D36). `BriefingDisclosureState` excludes `melItems` and `personnel`, so a live foreign-key join
 * into either is a COMPILE ERROR rather than something a reviewer has to notice. That instrument is
 * chosen deliberately: two independent verifiers read this very defect as PASS, so a guarantee
 * resting on review attention is the wrong tool. Every MEL field below is read from the frozen
 * `Deferral` row (D36's `melSubItemNumber`/`melTitle`), and a row predating that snapshot reads
 * `null` rather than being silently backfilled by a join — an absent value must look absent.
 * Signer, preparer and acknowledger names come from the frozen `Signature` rows at the call site,
 * never from `Personnel`.
 *
 * `aircraft` is read live and that is correct: tail, serial and airframe totals describe the
 * physical aircraft, not a historical assertion. `recurringChecks` / `recurringAccomplishments` are
 * REQUIRED even though `deriveServiceability` takes them optionally — an expired recurring check
 * grounds an aircraft, so omitting them silently downgrades RED to GREEN, and on a crew-facing
 * dispatch document under-reporting must be a compile error (the same reasoning as `RampState`).
 */

import type {
  BriefingComingDueRow, BriefingDefectRow, BriefingDeferralRow, BriefingDisclosure,
  Defect, Deferral, DeferralStatus, TechLogState,
} from '../types';
import { currentRows } from './supersede';
import { isDeferralExpired } from './pl25';
import { deriveServiceability } from './serviceability';
import { watchItemsFor } from './watchlist';
import { projectCheck } from './recurringChecks';

// The persisted disclosure shapes live in `../types` because they are stored on a signed
// FlightBriefing row; re-exported here so callers can import the projection and its result together.
export type {
  BriefingCheckRow, BriefingComingDueRow, BriefingDefectRow, BriefingDeferralRow, BriefingDisclosure,
} from '../types';

/** Everything the disclosure may see — note the absence of `melItems` and `personnel`. */
export type BriefingDisclosureState = Pick<
  TechLogState,
  'aircraft' | 'deferrals' | 'defects' | 'recurringChecks' | 'recurringAccomplishments'
>;

const defectRow = (d: Defect): BriefingDefectRow => ({
  defectId: d.id,
  ataChapter: d.ataChapter,
  description: d.description,
});

export function buildBriefingDisclosure(
  aircraftId: string,
  state: BriefingDisclosureState,
  asOfUtc: string,
  comingDue: BriefingComingDueRow[] = [],
): BriefingDisclosure | null {
  const ac = state.aircraft.find(a => a.id === aircraftId);
  // No aircraft means no disclosure. Returning an empty all-clear object here would print
  // "None / None / None" on a briefing for an aircraft we know nothing about — the exact
  // blank-screen-implying-fine failure the "absence of a status is RED, never GREEN" rule forbids.
  if (!ac) return null;

  const airframe = { hours: ac.airframeTotalHours, cycles: ac.airframeTotalCycles };

  // Mirrors deriveServiceability and buildRampView: expiry is derived from the due condition, never
  // trusted from the stored status alone. A deferral can sit at ACTIVE in the ledger and be expired
  // in fact, and the brief the crew accepts must say so.
  const effectiveStatus = (d: Deferral): DeferralStatus => {
    if (d.status === 'CLEARED' || d.status === 'EXPIRED') return d.status;
    if ((d.status === 'ACTIVE' || d.status === 'PENDING_PLACARD') && isDeferralExpired(d, asOfUtc, airframe)) {
      return 'EXPIRED';
    }
    return d.status;
  };

  const deferrals: BriefingDeferralRow[] = currentRows(state.deferrals)
    .filter(d => d.aircraftId === aircraftId)
    .map(d => ({ d, status: effectiveStatus(d) }))
    .filter(({ status }) => status !== 'CLEARED')
    .map(({ d, status }) => ({
      deferralId: d.id,
      melSubItemNumber: d.melSubItemNumber ?? null,
      melTitle: d.melTitle ?? null,
      category: d.category,
      status,
      isExpired: status === 'EXPIRED',
      restrictionText: d.restrictionText ?? null,
      placardRequired: d.placardRequired,
    }))
    .sort((a, b) => Number(b.isExpired) - Number(a.isExpired) || a.deferralId.localeCompare(b.deferralId));

  const openDefects = currentRows(state.defects)
    .filter(d => d.aircraftId === aircraftId && (d.status === 'OPEN' || d.status === 'DEFERRED'))
    .map(defectRow);

  const checksDue = state.recurringChecks
    .filter(c => c.aircraftId === aircraftId)
    .map(c => projectCheck(c, state.recurringAccomplishments, asOfUtc, airframe))
    .filter(p => p.state !== 'CURRENT')
    .map(p => ({ checkId: p.check.id, name: p.check.name, state: p.state }));

  return {
    aircraftId,
    serviceability: deriveServiceability(aircraftId, state, asOfUtc).status,
    deferrals,
    openDefects,
    // The shared definition, so a watch item cannot be shown on one surface and hidden on another.
    watchItems: watchItemsFor(state.defects, aircraftId).map(defectRow),
    checksDue,
    comingDue,
    computedAtUtc: asOfUtc,
  };
}

/**
 * A stable fingerprint of the airworthiness-relevant content of a disclosure, used to detect that a
 * RELEASED briefing no longer matches the aircraft.
 *
 * This exists because freezing the disclosure, on its own, would trade one safety bug for a worse
 * one: if maintenance opens a grounding defect after release, a frozen brief would show the PIC a
 * clean aircraft. So the frozen copy is what the signature covers, and this digest is what forces a
 * re-release when reality has moved. Deliberately EXCLUDED from the fingerprint:
 *   - `computedAtUtc`, which is just when we looked;
 *   - `comingDue`, whose mock dates drift every millisecond (`campForecast` offsets from now) and
 *     which is advisory maintenance forecasting, not a dispatch decision — including it would mark
 *     every briefing stale within a millisecond and train the crew to ignore the warning;
 *   - a check's remaining days/usage, for the same drift reason — its `state` is carried instead.
 */
export function disclosureDigest(d: BriefingDisclosure): string {
  // Every list is sorted by id before hashing. Row ORDER is a presentation concern, not content:
  // `currentRows` appends superseding rows at the end, so correcting an unrelated defect reorders
  // `openDefects` without changing a word of it. Digesting that order would mark the briefing stale
  // for a non-change — and a divergence warning that cries wolf is worse than none, because the crew
  // learns to click past it. Ordering must never be the reason a briefing is re-released.
  const byId = <T,>(rows: T[], key: (r: T) => string): T[] =>
    rows.slice().sort((a, b) => key(a).localeCompare(key(b)));
  return JSON.stringify([
    d.aircraftId,
    d.serviceability,
    byId(d.deferrals, r => r.deferralId).map(r => [r.deferralId, r.melSubItemNumber, r.melTitle, r.category, r.status, r.isExpired, r.restrictionText, r.placardRequired]),
    byId(d.openDefects, r => r.defectId).map(r => [r.defectId, r.ataChapter, r.description]),
    byId(d.watchItems, r => r.defectId).map(r => [r.defectId, r.ataChapter, r.description]),
    byId(d.checksDue, r => r.checkId).map(r => [r.checkId, r.state]),
  ]);
}
