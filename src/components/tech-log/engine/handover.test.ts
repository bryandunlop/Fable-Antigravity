import { describe, it, expect } from 'vitest';
import { deferralsRequiringAck, canAcceptDispatch, canPrepareBriefing } from './handover';
import type { Aircraft, Defect, Deferral, MelItem } from '../types';

const NOW = '2026-06-22T00:00:00Z';
const ac: Aircraft = { id: 'ac1', tailNumber: 'N5PG', type: 'G500', serialNumber: '72157', status: 'ACTIVE', isProvisional: false, homeBase: 'KLUK', airframeTotalHours: 1200, airframeTotalCycles: 800 };
const mel = (p: Partial<MelItem> = {}): MelItem => ({ id: 'm1', aircraftType: 'G500', mmelRevision: 'Rev 1', effectiveDate: NOW, approvalState: 'APPROVED', ataReference: '24', itemNumber: '24-01', subItemNumber: '24-01-01', title: 'x', category: 'C', numberInstalled: null, numberRequired: null, ...p });
const deferral = (p: Partial<Deferral> = {}): Deferral => ({ id: 'df1', defectId: 'd1', aircraftId: 'ac1', melItemId: 'm1', governingMmelRevision: 'Rev 1', governingEffectiveDate: NOW, category: 'C', dayOfDiscoveryUtc: NOW, clockStartDateUtc: NOW, governingTimezone: 'America/New_York', repairIntervalUnit: 'CALENDAR_DAY', repairIntervalValue: 10, placardRequired: false, mProcedureRequired: false, extensionUsed: false, riiRequired: false, melReviewAcknowledged: true, signedByOid: 'u', signatureId: 's', status: 'ACTIVE', ...p });
const open = (p: Partial<Defect> = {}): Defect => ({ id: 'd1', aircraftId: 'ac1', source: 'PIREP', ataChapter: '24', description: 'x', airworthinessAffecting: true, status: 'OPEN', reportedByOid: 'u', occurredAtUtc: NOW, reportedAtUtc: NOW, signatureId: 's', ...p });

describe('deferralsRequiringAck', () => {
  it('includes an ACTIVE deferral with a restriction', () => {
    const r = deferralsRequiringAck('ac1', { deferrals: [deferral({ restrictionText: 'Day VMC only' })] }, NOW);
    expect(r.map(d => d.id)).toEqual(['df1']);
  });
  it('includes an ACTIVE deferral whose FROZEN (O) procedure is set', () => {
    expect(deferralsRequiringAck('ac1', { deferrals: [deferral({ melOProcedure: 'Pull CB' })] }, NOW)).toHaveLength(1);
  });
  it('excludes a deferral with no (O)/restriction/placard', () => {
    expect(deferralsRequiringAck('ac1', { deferrals: [deferral()] }, NOW)).toHaveLength(0);
  });
  it('excludes non-ACTIVE deferrals', () => {
    expect(deferralsRequiringAck('ac1', { deferrals: [deferral({ status: 'PENDING_PLACARD', restrictionText: 'x' })] }, NOW)).toHaveLength(0);
  });
  it('excludes ACTIVE deferrals on a different aircraft', () => {
    const otherDeferral = deferral({ id: 'df2', aircraftId: 'ac2', restrictionText: 'Day VMC only' });
    expect(deferralsRequiringAck('ac1', { deferrals: [otherDeferral] }, NOW)).toHaveLength(0);
  });

  // TL-16 regression: an adversarial verifier proved (2026-07-26) that editing the MelItem could
  // make a mandatory PIC acknowledgement appear or VANISH on an already-signed briefing, invisibly
  // to the disclosure digest. The decision must rest on the frozen row, and the live table must be
  // unreachable from here.
  it('ignores a contradicting live MelItem — the (O) procedure is read from the frozen deferral', () => {
    const frozen = deferral({ melOProcedure: 'Pull CB 3-J14 before each flight' });
    // The MelItem that once carried it has since had the (O) procedure removed entirely.
    expect(deferralsRequiringAck('ac1', { deferrals: [frozen] }, NOW)).toHaveLength(1);
  });

  it('cannot be handed melItems — deciding a required acknowledgement from live data is a compile error', () => {
    deferralsRequiringAck(
      'ac1',
      {
        deferrals: [deferral()],
        // @ts-expect-error — melItems is deliberately absent from this signature (TL-16). If this
        // stops erroring, the live join that could delete a required crew acknowledgement is back.
        melItems: [mel({ oProcedure: 'Pull CB' })],
      },
      NOW,
    );
  });
});

describe('canAcceptDispatch', () => {
  it('blocks a RED aircraft', () => {
    expect(canAcceptDispatch('ac1', { aircraft: [ac], defects: [open()], deferrals: [] }, NOW).ok).toBe(false);
  });
  it('returns a non-empty reason string when RED', () => {
    const result = canAcceptDispatch('ac1', { aircraft: [ac], defects: [open()], deferrals: [] }, NOW);
    expect(result.ok).toBe(false);
    expect(typeof result.reason).toBe('string');
    expect(result.reason!.length).toBeGreaterThan(0);
  });
  it('reason is undefined when ok is true', () => {
    const result = canAcceptDispatch('ac1', { aircraft: [ac], defects: [], deferrals: [] }, NOW);
    expect(result.ok).toBe(true);
    expect(result.reason).toBeUndefined();
  });
  it('allows GREEN', () => {
    expect(canAcceptDispatch('ac1', { aircraft: [ac], defects: [], deferrals: [] }, NOW).ok).toBe(true);
  });
  it('allows AMBER (active deferral covers the defect)', () => {
    expect(canAcceptDispatch('ac1', { aircraft: [ac], defects: [open({ status: 'DEFERRED' })], deferrals: [deferral()] }, NOW).ok).toBe(true);
  });

  /**
   * LG-143 — a provisional tail cannot be accepted, whatever its RAG state says.
   *
   * This is a GATE, not copy. `deriveServiceability` has no notion of `isProvisional`, so the G800
   * in onboarding — no defects, D195 MEL still PENDING_FSDO — read GREEN and passed this gate. The
   * PIC was shown "Serviceable — no open items" and could sign acceptance, freezing
   * `serviceability: 'GREEN'` into the signed FlightBriefing disclosure for an aircraft whose MEL
   * the FSDO has not approved.
   *
   * Bryan ruled block-outright on 2026-07-31, the conservative reading: myGFO has no dispatch
   * answer for a tail in onboarding, and the default-RED invariant says absence of an answer is
   * never a green light.
   */
  it('blocks a provisional aircraft even when it is otherwise clean (LG-143)', () => {
    const prov = { ...ac, id: 'ac2', tailNumber: 'N3PG', isProvisional: true };
    const r = canAcceptDispatch('ac2', { aircraft: [ac, prov], defects: [], deferrals: [] }, NOW);

    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/MEL/);
  });

  it('the provisional block is about the aircraft, not the defects — it holds with a clean board (control)', () => {
    const prov = { ...ac, id: 'ac2', tailNumber: 'N3PG', isProvisional: true };
    // Same state that returns ok for the non-provisional tail in the sibling test above.
    expect(canAcceptDispatch('ac1', { aircraft: [ac, prov], defects: [], deferrals: [] }, NOW).ok).toBe(true);
    expect(canAcceptDispatch('ac2', { aircraft: [ac, prov], defects: [], deferrals: [] }, NOW).ok).toBe(false);
  });
});

/**
 * LG-143 — blocking acceptance alone left the signed record behind.
 *
 * `buildBriefingDisclosure` freezes `serviceability` from the projection, which reads GREEN for a
 * clean provisional tail, and the maintenance release signature covers that frozen disclosure. So a
 * briefing nobody could ever accept still produced a signed record, an on-screen readout and a
 * printed flight briefing all saying "Serviceability: GREEN" for an aircraft whose D195 MEL the
 * FSDO has not approved. Bryan ruled block-release, 2026-07-31.
 */
describe('canPrepareBriefing (LG-143)', () => {
  const prov = { ...ac, id: 'ac2', tailNumber: 'N3PG', isProvisional: true };

  it('blocks preparing or releasing a briefing on a provisional aircraft', () => {
    const r = canPrepareBriefing('ac2', { aircraft: [ac, prov] });
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/MEL/);
  });

  it('leaves an ordinary aircraft alone', () => {
    const r = canPrepareBriefing('ac1', { aircraft: [ac, prov] });
    expect(r.ok).toBe(true);
    expect(r.reason).toBeUndefined();
  });
});
