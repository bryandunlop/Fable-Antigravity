import { describe, it, expect } from 'vitest';
import {
  buildBriefingDisclosure as build,
  disclosureDigest,
  type BriefingDisclosureState,
  type BriefingChecklistRow,
  type BriefingComingDueRow,
} from './briefingDisclosure';
import type { Aircraft, Defect, Deferral, MelItem, RecurringCheck } from '../types';

/** Widen the required-collection signature so individual cases only state what they care about. */
const buildBriefingDisclosure = (
  aircraftId: string,
  s: Partial<BriefingDisclosureState> & Pick<BriefingDisclosureState, 'aircraft'>,
  now: string,
  comingDue?: BriefingComingDueRow[],
  checklist?: BriefingChecklistRow[],
) =>
  build(
    aircraftId,
    { deferrals: [], defects: [], recurringChecks: [], recurringAccomplishments: [], ...s },
    now,
    comingDue,
    checklist,
  );

const NOW = '2026-07-10T12:00:00Z';

const AC: Aircraft = {
  id: 'ac-1',
  tailNumber: 'N512GF',
  serialNumber: '6501',
  type: 'G650ER',
  airframeTotalHours: 1200,
  airframeTotalCycles: 640,
  isProvisional: false,
  status: 'ACTIVE',
  homeBase: 'KCVG',
};

function deferral(over: Partial<Deferral> = {}): Deferral {
  return {
    id: 'df-1',
    defectId: 'dfx-1',
    aircraftId: 'ac-1',
    melItemId: 'mel-1',
    governingMmelRevision: '14',
    governingEffectiveDate: '2025-01-01',
    melSubItemNumber: '24-02-02',
    melTitle: 'APU generator inoperative',
    category: 'C',
    dayOfDiscoveryUtc: '2026-07-01T10:00:00Z',
    clockStartDateUtc: '2026-07-02T04:00:00Z',
    governingTimezone: 'America/New_York',
    repairDueDateUtc: '2026-07-12T03:59:59Z',
    repairIntervalUnit: 'CALENDAR_DAY',
    repairIntervalValue: 10,
    restrictionText: 'APU inop — ground power required for start',
    placardRequired: true,
    mProcedureRequired: false,
    placardInstalled: true,
    extensionUsed: false,
    riiRequired: false,
    melReviewAcknowledged: true,
    signedByOid: 'p-maint',
    signatureId: 'sig-1',
    status: 'ACTIVE',
    ...over,
  };
}

function defect(over: Partial<Defect> = {}): Defect {
  return {
    id: 'dfx-1',
    aircraftId: 'ac-1',
    source: 'PIREP',
    ataChapter: '24',
    description: 'APU will not start',
    severity: 'HIGH',
    airworthinessAffecting: true,
    status: 'DEFERRED',
    reportedByOid: 'p-pilot',
    reportedAtUtc: '2026-07-01T10:00:00Z',
    signatureId: 'sig-0',
    ...over,
  };
}

const CHECK: RecurringCheck = {
  id: 'rc-1',
  aircraftId: 'ac-1',
  name: 'Emergency equipment check',
  intervalUnit: 'CALENDAR_DAY',
  intervalValue: 30,
  active: true,
  createdAtUtc: '2026-01-01T00:00:00Z',
};

describe('buildBriefingDisclosure — what the PIC was actually shown (TL-16)', () => {
  it('reports the MEL identity frozen on the deferral, not a live MelItem', () => {
    const d = buildBriefingDisclosure('ac-1', { aircraft: [AC], deferrals: [deferral()], defects: [defect()] }, NOW)!;
    expect(d.deferrals).toHaveLength(1);
    expect(d.deferrals[0].melSubItemNumber).toBe('24-02-02');
    expect(d.deferrals[0].melTitle).toBe('APU generator inoperative');
  });

  it('reports a missing MEL snapshot as null rather than falling back to a join', () => {
    const legacy = deferral({ melSubItemNumber: undefined, melTitle: undefined });
    const d = buildBriefingDisclosure('ac-1', { aircraft: [AC], deferrals: [legacy], defects: [defect()] }, NOW)!;
    expect(d.deferrals[0].melSubItemNumber).toBeNull();
    expect(d.deferrals[0].melTitle).toBeNull();
  });

  it('cannot be handed melItems — reopening the live MEL join is a compile error, not a review miss', () => {
    const revised: MelItem = {
      id: 'mel-1',
      aircraftType: 'G650ER',
      mmelRevision: '15',
      effectiveDate: '2026-07-01',
      ataReference: '99',
      itemNumber: '99-99',
      subItemNumber: '99-99-99',
      title: 'REV 15 REWRITE — MUST NOT APPEAR ON A SIGNED BRIEFING',
      category: 'B',
      numberInstalled: 1,
      numberRequired: 0,
      repairIntervalUnit: 'CALENDAR_DAY',
      repairIntervalValue: 3,
      approvalState: 'APPROVED',
    };
    build(
      'ac-1',
      {
        aircraft: [AC],
        deferrals: [deferral()],
        defects: [defect()],
        recurringChecks: [],
        recurringAccomplishments: [],
        // @ts-expect-error — melItems is deliberately absent from BriefingDisclosureState (the D36
        // instrument). If this line ever stops erroring, the structural guard has been removed.
        melItems: [revised],
      },
      NOW,
    );
  });

  it('cannot be handed personnel — signer/preparer names come from frozen Signature rows', () => {
    build(
      'ac-1',
      {
        aircraft: [AC],
        deferrals: [],
        defects: [],
        recurringChecks: [],
        recurringAccomplishments: [],
        // @ts-expect-error — personnel is deliberately absent from BriefingDisclosureState.
        personnel: [],
      },
      NOW,
    );
  });

  it('separates open defects from watch items, so a cabin item is never printed as an airworthiness defect', () => {
    const open = defect({ id: 'dfx-2', status: 'OPEN', ataChapter: '27', description: 'Aileron trim stiff' });
    const watched = defect({
      id: 'dfx-3',
      status: 'WATCHLISTED',
      airworthinessAffecting: false,
      ataChapter: '25',
      description: 'Seat 4A recline slow',
    });
    const d = buildBriefingDisclosure('ac-1', { aircraft: [AC], defects: [open, watched] }, NOW)!;
    expect(d.openDefects.map(r => r.defectId)).toEqual(['dfx-2']);
    expect(d.watchItems.map(r => r.defectId)).toEqual(['dfx-3']);
  });

  it('agrees with deriveServiceability rather than deciding airworthiness itself', () => {
    const grounding = defect({ id: 'dfx-9', status: 'OPEN', airworthinessAffecting: true });
    const d = buildBriefingDisclosure('ac-1', { aircraft: [AC], defects: [grounding] }, NOW)!;
    expect(d.serviceability).toBe('RED');
  });

  it('carries the coming-due forecast it was given, so a signed brief cannot re-fetch it at print time', () => {
    // campForecast() computes every dueDateUtc as an offset from Date.now(), so a live call renders
    // different dates on every print with no state change at all. The rows must be frozen inputs.
    const rows: BriefingComingDueRow[] = [
      { ref: 'FC-05-PHASEA', description: 'Phase A inspection', dueDateUtc: '2026-07-22T00:00:00Z' },
    ];
    const d = buildBriefingDisclosure('ac-1', { aircraft: [AC] }, NOW, rows)!;
    expect(d.comingDue).toEqual(rows);
  });

  it('carries the preflight checklist it was given — it is the body of a signed printed document', () => {
    // An adversarial verifier proved (2026-07-26) that reading the checklist live let an
    // ACKNOWLEDGED briefing print an item unticked: EDIT_CHECKLIST_INSTANCE replaces the whole
    // instance row. The template was always version-pinned; the mutable instance was the hole.
    const lines = [{ label: 'Remove protective covers', done: true }, { label: 'Tire pressure', done: false }];
    const d = buildBriefingDisclosure('ac-1', { aircraft: [AC] }, NOW, [], lines)!;
    expect(d.checklist).toEqual(lines);
  });

  it('freezes the (O) procedure, which is what makes an item a mandatory crew acknowledgement', () => {
    const d = buildBriefingDisclosure(
      'ac-1',
      { aircraft: [AC], deferrals: [deferral({ melOProcedure: 'Pull CB 3-J14 before each flight' })], defects: [defect()] },
      NOW,
    )!;
    expect(d.deferrals[0].melOProcedure).toBe('Pull CB 3-J14 before each flight');
  });

  it('omits a cleared deferral — history is the audit ledger\'s job', () => {
    const d = buildBriefingDisclosure(
      'ac-1',
      { aircraft: [AC], deferrals: [deferral({ status: 'CLEARED' })], defects: [defect()] },
      NOW,
    )!;
    expect(d.deferrals).toEqual([]);
  });

  it('derives expiry from the due boundary rather than trusting the stored status', () => {
    const past = deferral({ repairDueDateUtc: '2026-07-01T03:59:59Z', status: 'ACTIVE' });
    const d = buildBriefingDisclosure('ac-1', { aircraft: [AC], deferrals: [past], defects: [defect()] }, NOW)!;
    expect(d.deferrals[0].isExpired).toBe(true);
    expect(d.deferrals[0].status).toBe('EXPIRED');
  });

  it('returns null for an unknown aircraft rather than an empty all-clear disclosure', () => {
    expect(buildBriefingDisclosure('ac-nope', { aircraft: [AC] }, NOW)).toBeNull();
  });

  it('reports only non-current recurring checks', () => {
    const d = buildBriefingDisclosure(
      'ac-1',
      { aircraft: [AC], recurringChecks: [CHECK], recurringAccomplishments: [] },
      NOW,
    )!;
    expect(d.checksDue.map(c => [c.checkId, c.state])).toEqual([['rc-1', 'NEVER_DONE']]);
  });
});

describe('disclosureDigest — detecting that a released briefing no longer matches the aircraft', () => {
  const base = () =>
    buildBriefingDisclosure('ac-1', { aircraft: [AC], deferrals: [deferral()], defects: [defect()] }, NOW)!;

  it('is stable across two builds at different instants', () => {
    const a = base();
    const b = buildBriefingDisclosure(
      'ac-1',
      { aircraft: [AC], deferrals: [deferral()], defects: [defect()] },
      '2026-07-10T18:30:00Z',
    )!;
    expect(disclosureDigest(a)).toBe(disclosureDigest(b));
  });

  it('ignores the drifting CAMP forecast — its mock dates move every millisecond and are advisory', () => {
    const a = buildBriefingDisclosure('ac-1', { aircraft: [AC] }, NOW, [
      { ref: 'FC-05', description: 'Phase A', dueDateUtc: '2026-07-22T00:00:00Z' },
    ])!;
    const b = buildBriefingDisclosure('ac-1', { aircraft: [AC] }, NOW, [
      { ref: 'FC-05', description: 'Phase A', dueDateUtc: '2026-08-30T00:00:00Z' },
    ])!;
    expect(disclosureDigest(a)).toBe(disclosureDigest(b));
  });

  it('changes when a new grounding defect appears — freezing must never hide one from the PIC', () => {
    const before = base();
    const after = buildBriefingDisclosure(
      'ac-1',
      {
        aircraft: [AC],
        deferrals: [deferral()],
        defects: [defect(), defect({ id: 'dfx-new', status: 'OPEN', airworthinessAffecting: true })],
      },
      NOW,
    )!;
    expect(disclosureDigest(after)).not.toBe(disclosureDigest(before));
  });

  it('changes when maintenance watchlists an item after release', () => {
    const before = base();
    const after = buildBriefingDisclosure(
      'ac-1',
      {
        aircraft: [AC],
        deferrals: [deferral()],
        defects: [
          defect(),
          defect({ id: 'dfx-w', status: 'WATCHLISTED', airworthinessAffecting: false, description: 'Cabin light' }),
        ],
      },
      NOW,
    )!;
    expect(disclosureDigest(after)).not.toBe(disclosureDigest(before));
  });

  it('ignores row ORDER — a supersede elsewhere must not cry wolf', () => {
    // `currentRows` appends superseding rows at the end, so correcting an unrelated defect reorders
    // the list without changing its content. A warning that fires on a non-change gets clicked past.
    const a = buildBriefingDisclosure('ac-1', {
      aircraft: [AC],
      defects: [defect({ id: 'dfx-a', status: 'OPEN' }), defect({ id: 'dfx-b', status: 'OPEN' })],
    }, NOW)!;
    const b = buildBriefingDisclosure('ac-1', {
      aircraft: [AC],
      defects: [defect({ id: 'dfx-b', status: 'OPEN' }), defect({ id: 'dfx-a', status: 'OPEN' })],
    }, NOW)!;
    expect(a.openDefects.map(r => r.defectId)).not.toEqual(b.openDefects.map(r => r.defectId));
    expect(disclosureDigest(a)).toBe(disclosureDigest(b));
  });

  // Blind spots an adversarial verifier proved on 2026-07-26: each of these changed the aircraft's
  // real state while the digest stayed identical, so the briefing never went stale.
  it.each([
    ['the (O) procedure that makes an item a mandatory acknowledgement', { melOProcedure: 'Pull CB' }],
    ['the repair due date moving', { repairDueDateUtc: '2026-07-11T03:59:59Z' }],
    ['the placard being removed', { placardInstalled: false }],
    ['an (M) procedure becoming required', { mProcedureRequired: true }],
    ['an extension being taken', { extensionUsed: true }],
  ])('changes when %s', (_label, over) => {
    const before = base();
    const after = buildBriefingDisclosure(
      'ac-1',
      { aircraft: [AC], deferrals: [deferral(over)], defects: [defect()] },
      NOW,
    )!;
    expect(disclosureDigest(after)).not.toBe(disclosureDigest(before));
  });

  it('changes when a checklist item is un-ticked after release', () => {
    const withList = (done: boolean) =>
      buildBriefingDisclosure('ac-1', { aircraft: [AC] }, NOW, [], [{ label: 'Tire pressure', done }])!;
    expect(disclosureDigest(withList(false))).not.toBe(disclosureDigest(withList(true)));
  });

  it('changes when a recurring check is renamed — the printed briefing shows the name', () => {
    const named = (name: string) =>
      buildBriefingDisclosure('ac-1', { aircraft: [AC], recurringChecks: [{ ...CHECK, name }], recurringAccomplishments: [] }, NOW)!;
    expect(disclosureDigest(named('Emergency equipment check'))).not.toBe(disclosureDigest(named('RENAMED')));
  });

  it('changes when a deferral expires between release and acknowledgement', () => {
    const before = base();
    const after = buildBriefingDisclosure(
      'ac-1',
      { aircraft: [AC], deferrals: [deferral()], defects: [defect()] },
      '2026-07-20T12:00:00Z',
    )!;
    expect(disclosureDigest(after)).not.toBe(disclosureDigest(before));
  });
});
