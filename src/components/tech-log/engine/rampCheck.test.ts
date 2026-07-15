import { describe, it, expect } from 'vitest';
import { buildRampView } from './rampCheck';
import type { Aircraft, Deferral, MelItem } from '../types';

const AC: Aircraft = {
  id: 'ac-1', tailNumber: 'N512GF', type: 'G650ER', serialNumber: '6289',
  status: 'ACTIVE', isProvisional: false, homeBase: 'KCVG',
  airframeTotalHours: 4210, airframeTotalCycles: 1980,
};

function deferral(over: Partial<Deferral> = {}): Deferral {
  return {
    id: 'df-1', defectId: 'def-1', aircraftId: 'ac-1', melItemId: 'mel-1',
    governingMmelRevision: '14', governingEffectiveDate: '2026-03-01',
    melSubItemNumber: '24-02-02', melTitle: 'APU generator inoperative',
    category: 'C', dayOfDiscoveryUtc: '2026-07-05T18:00:00Z',
    clockStartDateUtc: '2026-07-06T04:00:00Z', governingTimezone: 'America/New_York',
    repairDueDateUtc: '2026-07-17T04:00:00Z',
    repairIntervalUnit: 'CALENDAR_DAY', repairIntervalValue: 10,
    placardRequired: true, placardInstalled: true, placardLocation: 'Overhead panel, adj. APU GEN',
    mProcedureRequired: false, extensionUsed: false, riiRequired: false,
    melReviewAcknowledged: true, signedByOid: 'oid-1', signatureId: 'sig-1',
    status: 'ACTIVE',
    ...over,
  };
}

const NOW = '2026-07-10T12:00:00Z';

describe('buildRampView — header, per FAA Order 8900.1 ¶6-101F5(a)', () => {
  it('carries tail and serial, which is exactly what the inspector matches the MEL against', () => {
    const v = buildRampView('ac-1', { aircraft: [AC], deferrals: [deferral()] }, NOW)!;
    expect(v.tailNumber).toBe('N512GF');
    expect(v.serialNumber).toBe('6289');
    expect(v.type).toBe('G650ER');
  });

  it('reports the LOA as not held — TL-25 is a visible gap on the screen, not a silent omission', () => {
    const v = buildRampView('ac-1', { aircraft: [AC], deferrals: [] }, NOW)!;
    expect(v.loaHeld).toBe(false);
  });

  it('returns null for an unknown tail rather than throwing at a regulator', () => {
    expect(buildRampView('nope', { aircraft: [AC], deferrals: [] }, NOW)).toBeNull();
  });
});

describe('buildRampView — point-in-time MEL identity (the reason this engine exists)', () => {
  it('reads MEL number and title from the frozen Deferral row', () => {
    const v = buildRampView('ac-1', { aircraft: [AC], deferrals: [deferral()] }, NOW)!;
    expect(v.deferrals[0].melSubItemNumber).toBe('24-02-02');
    expect(v.deferrals[0].melTitle).toBe('APU generator inoperative');
    expect(v.deferrals[0].governingMmelRevision).toBe('14');
  });

  // The regression that matters. buildRampView's state parameter deliberately has no `melItems`
  // key, so a live join is a compile error — but a future widening of that signature must not
  // silently reintroduce one. EDIT_MEL_ITEM (TechLogContext.tsx) replaces the MelItem row in
  // place under the same id, so a rev-15 edit would otherwise repaint a rev-14 deferral while
  // its governingMmelRevision still reads '14' — showing a regulator the wrong provision under
  // a correct-looking label. Invariant: "a deferral signed under revision N must read correctly
  // after revision N+1 ships."
  it('ignores a contradicting current MelItem — a later revision cannot repaint a signed deferral', () => {
    const revised: MelItem = {
      id: 'mel-1', aircraftType: 'G650ER', mmelRevision: '15', effectiveDate: '2026-08-01',
      approvalState: 'APPROVED', ataReference: '24', itemNumber: '24-02', subItemNumber: '24-99-99',
      title: 'REVISED UNDER REV 15 — MUST NOT APPEAR', category: 'B',
      numberInstalled: 1, numberRequired: 0,
    };
    const state = { aircraft: [AC], deferrals: [deferral()], melItems: [revised] };
    const v = buildRampView('ac-1', state, NOW)!;

    expect(v.deferrals[0].melSubItemNumber).toBe('24-02-02');
    expect(v.deferrals[0].melTitle).toBe('APU generator inoperative');
    expect(v.deferrals[0].category).toBe('C');
    expect(v.deferrals[0].governingMmelRevision).toBe('14');
  });

  it('reports a missing snapshot as null rather than falling back to a join', () => {
    const legacy = deferral({ melSubItemNumber: undefined, melTitle: undefined });
    const v = buildRampView('ac-1', { aircraft: [AC], deferrals: [legacy] }, NOW)!;
    expect(v.deferrals[0].melSubItemNumber).toBeNull();
    expect(v.deferrals[0].melTitle).toBeNull();
  });
});

describe('buildRampView — expiry, the finding a ramp check is looking for', () => {
  it('flags a calendar deferral past its due boundary as expired', () => {
    const v = buildRampView('ac-1', { aircraft: [AC], deferrals: [deferral()] }, '2026-07-18T00:00:00Z')!;
    expect(v.deferrals[0].status).toBe('EXPIRED');
    expect(v.deferrals[0].isExpired).toBe(true);
    expect(v.hasFinding).toBe(true);
  });

  it('flags a usage-based deferral past its threshold, read against live airframe totals', () => {
    const usage = deferral({
      repairDueDateUtc: undefined, usageDueThreshold: 4200,
      repairIntervalUnit: 'HOUR', category: 'A',
    });
    const v = buildRampView('ac-1', { aircraft: [AC], deferrals: [usage] }, NOW)!;
    expect(v.deferrals[0].isExpired).toBe(true);
  });

  it('leaves an in-clock deferral active and raises no finding', () => {
    const v = buildRampView('ac-1', { aircraft: [AC], deferrals: [deferral()] }, NOW)!;
    expect(v.deferrals[0].status).toBe('ACTIVE');
    expect(v.deferrals[0].isExpired).toBe(false);
    expect(v.hasFinding).toBe(false);
  });

  it('treats a placard-pending deferral as a finding — the aircraft is RED, not dispatchable', () => {
    const pending = deferral({ status: 'PENDING_PLACARD', placardInstalled: false });
    const v = buildRampView('ac-1', { aircraft: [AC], deferrals: [pending] }, NOW)!;
    expect(v.deferrals[0].status).toBe('PENDING_PLACARD');
    expect(v.hasFinding).toBe(true);
  });
});

describe('buildRampView — which rows an inspector is shown', () => {
  it('excludes cleared deferrals — "deferred items" means currently deferred', () => {
    const v = buildRampView('ac-1', {
      aircraft: [AC],
      deferrals: [deferral({ id: 'df-1', status: 'CLEARED' }), deferral({ id: 'df-2' })],
    }, NOW)!;
    expect(v.deferrals.map(d => d.deferralId)).toEqual(['df-2']);
  });

  it('excludes superseded rows so a corrected deferral is not double-counted', () => {
    const original = deferral({ id: 'df-1' });
    const correction = deferral({ id: 'df-2', supersedesId: 'df-1', melTitle: 'Corrected title' });
    const v = buildRampView('ac-1', { aircraft: [AC], deferrals: [original, correction] }, NOW)!;
    expect(v.deferrals).toHaveLength(1);
    expect(v.deferrals[0].melTitle).toBe('Corrected title');
  });

  it('shows only the requested tail — a ramp check is about the aircraft in front of the inspector', () => {
    const other = deferral({ id: 'df-9', aircraftId: 'ac-2' });
    const v = buildRampView('ac-1', { aircraft: [AC], deferrals: [deferral(), other] }, NOW)!;
    expect(v.deferrals).toHaveLength(1);
    expect(v.deferrals[0].deferralId).toBe('df-1');
  });

  it('sorts expired first, then soonest due — the finding is never below the fold', () => {
    const far = deferral({ id: 'far', repairDueDateUtc: '2026-10-01T04:00:00Z', category: 'D' });
    const soon = deferral({ id: 'soon', repairDueDateUtc: '2026-07-12T04:00:00Z' });
    const dead = deferral({ id: 'dead', repairDueDateUtc: '2026-07-01T04:00:00Z' });
    const v = buildRampView('ac-1', { aircraft: [AC], deferrals: [far, soon, dead] }, NOW)!;
    expect(v.deferrals.map(d => d.deferralId)).toEqual(['dead', 'soon', 'far']);
  });
});

describe('buildRampView — placard, per ¶6-101G6 "present and legible"', () => {
  it('carries the placard location so the inspector knows where to physically look', () => {
    const v = buildRampView('ac-1', { aircraft: [AC], deferrals: [deferral()] }, NOW)!;
    expect(v.deferrals[0].placardRequired).toBe(true);
    expect(v.deferrals[0].placardInstalled).toBe(true);
    expect(v.deferrals[0].placardLocation).toBe('Overhead panel, adj. APU GEN');
  });

  it('carries whether the once-only extension is spent — it moved the due date the inspector reads', () => {
    const plain = buildRampView('ac-1', { aircraft: [AC], deferrals: [deferral()] }, NOW)!;
    expect(plain.deferrals[0].extensionUsed).toBe(false);

    const extended = buildRampView('ac-1', {
      aircraft: [AC], deferrals: [deferral({ extensionUsed: true, extensionJustification: 'part on order' })],
    }, NOW)!;
    expect(extended.deferrals[0].extensionUsed).toBe(true);
    // The justification prose is deliberately not surfaced — not asked for by ¶6-101F5.
    expect(Object.keys(extended.deferrals[0])).not.toContain('extensionJustification');
  });

  it('reports an uninstalled required placard as not installed', () => {
    const v = buildRampView('ac-1', {
      aircraft: [AC], deferrals: [deferral({ placardInstalled: undefined })],
    }, NOW)!;
    expect(v.deferrals[0].placardInstalled).toBe(false);
  });
});
