import { describe, it, expect } from 'vitest';
import { buildRampView as build, type RampState } from './rampCheck';
import { deriveServiceability } from './serviceability';
import type { Aircraft, Defect, Deferral, MelItem } from '../types';

/**
 * Defaults the recurring-check arrays so each test states only what it is about. `RampState` requires
 * them deliberately — omitting them silently downgrades RED to GREEN — so this helper supplies empty
 * ones rather than the type going Partial. The production call site (RampMode.tsx) still has to pass
 * the real arrays, and tsc enforces that.
 */
const buildRampView = (
  aircraftId: string,
  s: Omit<RampState, 'recurringChecks' | 'recurringAccomplishments'> & Partial<RampState>,
  now: string,
) => build(aircraftId, { recurringChecks: [], recurringAccomplishments: [], ...s }, now);

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

function defect(over: Partial<Defect> = {}): Defect {
  return {
    id: 'def-1', aircraftId: 'ac-1', source: 'PIREP', ataChapter: '24',
    description: 'APU generator inoperative',
    airworthinessAffecting: true, status: 'DEFERRED',
    reportedByOid: 'oid-1', occurredAtUtc: '2026-07-05T18:00:00Z',
    reportedAtUtc: '2026-07-05T18:00:00Z', signatureId: 'sig-0',
    ...over,
  };
}

const NOW = '2026-07-10T12:00:00Z';

describe('buildRampView — header, per FAA Order 8900.1 ¶6-101F5(a)', () => {
  it('carries tail and serial, which is exactly what the inspector matches the MEL against', () => {
    const v = buildRampView('ac-1', { aircraft: [AC], deferrals: [deferral()], defects: [defect()] }, NOW)!;
    expect(v.tailNumber).toBe('N512GF');
    expect(v.serialNumber).toBe('6289');
    expect(v.type).toBe('G650ER');
  });

  it('reports the LOA as not held — TL-25 is a visible gap on the screen, not a silent omission', () => {
    const v = buildRampView('ac-1', { aircraft: [AC], deferrals: [], defects: [] }, NOW)!;
    expect(v.loaHeld).toBe(false);
  });

  it('returns null for an unknown tail rather than throwing at a regulator', () => {
    expect(buildRampView('nope', { aircraft: [AC], deferrals: [], defects: [] }, NOW)).toBeNull();
  });
});

describe('buildRampView — point-in-time MEL identity (the reason this engine exists)', () => {
  it('reads MEL number and title from the frozen Deferral row', () => {
    const v = buildRampView('ac-1', { aircraft: [AC], deferrals: [deferral()], defects: [defect()] }, NOW)!;
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
    const state = { aircraft: [AC], deferrals: [deferral()], defects: [defect()], melItems: [revised] };
    const v = buildRampView('ac-1', state, NOW)!;

    expect(v.deferrals[0].melSubItemNumber).toBe('24-02-02');
    expect(v.deferrals[0].melTitle).toBe('APU generator inoperative');
    expect(v.deferrals[0].category).toBe('C');
    expect(v.deferrals[0].governingMmelRevision).toBe('14');
  });

  it('reports a missing snapshot as null rather than falling back to a join', () => {
    const legacy = deferral({ melSubItemNumber: undefined, melTitle: undefined });
    const v = buildRampView('ac-1', { aircraft: [AC], deferrals: [legacy], defects: [defect()] }, NOW)!;
    expect(v.deferrals[0].melSubItemNumber).toBeNull();
    expect(v.deferrals[0].melTitle).toBeNull();
  });
});

describe('buildRampView — expiry, the finding a ramp check is looking for', () => {
  it('flags a calendar deferral past its due boundary as expired', () => {
    const v = buildRampView('ac-1', { aircraft: [AC], deferrals: [deferral()], defects: [defect()] }, '2026-07-18T00:00:00Z')!;
    expect(v.deferrals[0].status).toBe('EXPIRED');
    expect(v.deferrals[0].isExpired).toBe(true);
    expect(v.hasMelFinding).toBe(true);
  });

  it('flags a usage-based deferral past its threshold, read against live airframe totals', () => {
    const usage = deferral({
      repairDueDateUtc: undefined, usageDueThreshold: 4200,
      repairIntervalUnit: 'HOUR', category: 'A',
    });
    const v = buildRampView('ac-1', { aircraft: [AC], deferrals: [usage], defects: [defect()] }, NOW)!;
    expect(v.deferrals[0].isExpired).toBe(true);
  });

  it('leaves an in-clock deferral active and raises no finding', () => {
    const v = buildRampView('ac-1', { aircraft: [AC], deferrals: [deferral()], defects: [defect()] }, NOW)!;
    expect(v.deferrals[0].status).toBe('ACTIVE');
    expect(v.deferrals[0].isExpired).toBe(false);
    expect(v.hasMelFinding).toBe(false);
  });

  it('treats a placard-pending deferral as a finding — the aircraft is RED, not dispatchable', () => {
    const pending = deferral({ status: 'PENDING_PLACARD', placardInstalled: false });
    const v = buildRampView('ac-1', { aircraft: [AC], deferrals: [pending], defects: [defect()] }, NOW)!;
    expect(v.deferrals[0].status).toBe('PENDING_PLACARD');
    expect(v.hasMelFinding).toBe(true);
  });
});

// Two independent fresh reviewers caught this on 2026-07-15 and it reproduced live: N1PG is seeded
// RED by an open airworthiness defect with ZERO deferrals, and the ramp screen read completely clean
// ("No inoperative equipment is carried under the MEL", neutral header, no warning) while the fleet
// board said Grounded. buildRampView could not see `defects`, so its dispatchability signal was
// computed from a fraction of the inputs that decide it. The "Default-RED on open defect" invariant
// is explicit that absence of a status is RED, never GREEN — a blank screen implying "fine" in front
// of an inspector is exactly what it forbids.
describe('buildRampView — serviceability must never read clean on a grounded aircraft', () => {
  it('reports RED when an open airworthiness defect grounds the aircraft, even with no deferrals', () => {
    const v = buildRampView('ac-1', {
      aircraft: [AC], deferrals: [], defects: [defect({ status: 'OPEN' })],
    }, NOW)!;
    expect(v.deferrals).toHaveLength(0);
    expect(v.serviceability).toBe('RED');
  });

  it('agrees with deriveServiceability — the fleet board and the ramp screen cannot diverge', () => {
    const state = { aircraft: [AC], deferrals: [deferral()], defects: [defect()] };
    expect(buildRampView('ac-1', state, NOW)!.serviceability)
      .toBe(deriveServiceability('ac-1', state, NOW).status);

    const grounded = { aircraft: [AC], deferrals: [], defects: [defect({ status: 'OPEN' })] };
    expect(buildRampView('ac-1', grounded, NOW)!.serviceability)
      .toBe(deriveServiceability('ac-1', grounded, NOW).status);
  });

  it('reads AMBER when a deferral is active and covering its defect', () => {
    const v = buildRampView('ac-1', {
      aircraft: [AC], deferrals: [deferral()], defects: [defect()],
    }, NOW)!;
    expect(v.serviceability).toBe('AMBER');
  });

  it('reads GREEN only when nothing is open and nothing is deferred', () => {
    const v = buildRampView('ac-1', { aircraft: [AC], deferrals: [], defects: [] }, NOW)!;
    expect(v.serviceability).toBe('GREEN');
  });

  it('scopes the MEL finding flag to deferrals, and keeps it separate from serviceability', () => {
    // A grounding defect is NOT a MEL finding — the two signals answer different questions and
    // conflating them is what produced the original bug.
    const v = buildRampView('ac-1', {
      aircraft: [AC], deferrals: [], defects: [defect({ status: 'OPEN' })],
    }, NOW)!;
    expect(v.serviceability).toBe('RED');
    expect(v.hasMelFinding).toBe(false);
  });
});

// An adversarial verifier refuted the first serviceability fix with this, 2026-07-15. N3PG (G800) is
// seeded provisional — its D195 is PENDING_FSDO — and ramp mode rendered GREEN "Serviceable" plus
// "Minimum equipment list: D195 · G800", presenting an FSDO-unapproved MEL as the governing MEL to an
// inspector whose ¶6-101F5(b) job is literally to check the LOA. deriveServiceability has no concept
// of isProvisional (it returns GREEN, rule 5); every OTHER consumer gates on it —
// AircraftDetail.tsx:276 renders a "Provisional" badge INSTEAD of the chip. Ramp mode was the only
// unconditional render, on the only regulator-facing screen. An omission had become an assertion.
describe('buildRampView — a provisional MEL may never read as an approved one', () => {
  const PROV: Aircraft = { ...AC, id: 'ac-g800', tailNumber: 'N3PG', type: 'G800', isProvisional: true, status: 'PROVISIONAL' };

  it('flags the MEL as provisional rather than asserting it governs', () => {
    const v = buildRampView('ac-g800', { aircraft: [PROV], deferrals: [], defects: [], recurringChecks: [], recurringAccomplishments: [] }, NOW)!;
    expect(v.melProvisional).toBe(true);
  });

  it('never reports GREEN for a provisional aircraft, even with nothing else wrong', () => {
    const v = buildRampView('ac-g800', { aircraft: [PROV], deferrals: [], defects: [], recurringChecks: [], recurringAccomplishments: [] }, NOW)!;
    expect(v.serviceability).not.toBe('GREEN');
  });

  it('leaves a normal aircraft unflagged', () => {
    const v = buildRampView('ac-1', { aircraft: [AC], deferrals: [], defects: [], recurringChecks: [], recurringAccomplishments: [] }, NOW)!;
    expect(v.melProvisional).toBe(false);
    expect(v.serviceability).toBe('GREEN');
  });
});

// ¶6-101G6: "Inspect to determine that all required placards are present and legible." An uninstalled
// required placard is the inspector's own check failing — but hasMelFinding keyed on status alone, so
// an ACTIVE row with placardRequired && !placardInstalled printed "Placard NOT installed" in red in
// the row body while the header said nothing. (Adversarial verifier, 2026-07-15.)
describe('buildRampView — an uninstalled required placard is a finding (¶6-101G6)', () => {
  it('raises a MEL finding when a required placard is not installed, even on an ACTIVE row', () => {
    const v = buildRampView('ac-1', {
      aircraft: [AC], defects: [defect()], recurringChecks: [], recurringAccomplishments: [],
      deferrals: [deferral({ status: 'ACTIVE', placardRequired: true, placardInstalled: false })],
    }, NOW)!;
    expect(v.deferrals[0].status).toBe('ACTIVE');
    expect(v.hasMelFinding).toBe(true);
  });

  it('does not raise one when no placard is required', () => {
    const v = buildRampView('ac-1', {
      aircraft: [AC], defects: [defect()], recurringChecks: [], recurringAccomplishments: [],
      deferrals: [deferral({ status: 'ACTIVE', placardRequired: false, placardInstalled: false })],
    }, NOW)!;
    expect(v.hasMelFinding).toBe(false);
  });
});

describe('buildRampView — which rows an inspector is shown', () => {
  it('excludes cleared deferrals — "deferred items" means currently deferred', () => {
    const v = buildRampView('ac-1', {
      aircraft: [AC], defects: [defect()],
      deferrals: [deferral({ id: 'df-1', status: 'CLEARED' }), deferral({ id: 'df-2' })],
    }, NOW)!;
    expect(v.deferrals.map(d => d.deferralId)).toEqual(['df-2']);
  });

  it('excludes superseded rows so a corrected deferral is not double-counted', () => {
    const original = deferral({ id: 'df-1' });
    const correction = deferral({ id: 'df-2', supersedesId: 'df-1', melTitle: 'Corrected title' });
    const v = buildRampView('ac-1', { aircraft: [AC], deferrals: [original, correction], defects: [defect()] }, NOW)!;
    expect(v.deferrals).toHaveLength(1);
    expect(v.deferrals[0].melTitle).toBe('Corrected title');
  });

  it('shows only the requested tail — a ramp check is about the aircraft in front of the inspector', () => {
    const other = deferral({ id: 'df-9', aircraftId: 'ac-2' });
    const v = buildRampView('ac-1', { aircraft: [AC], deferrals: [deferral(), other], defects: [defect()] }, NOW)!;
    expect(v.deferrals).toHaveLength(1);
    expect(v.deferrals[0].deferralId).toBe('df-1');
  });

  it('sorts expired first, then soonest due — the finding is never below the fold', () => {
    const far = deferral({ id: 'far', repairDueDateUtc: '2026-10-01T04:00:00Z', category: 'D' });
    const soon = deferral({ id: 'soon', repairDueDateUtc: '2026-07-12T04:00:00Z' });
    const dead = deferral({ id: 'dead', repairDueDateUtc: '2026-07-01T04:00:00Z' });
    const v = buildRampView('ac-1', { aircraft: [AC], deferrals: [far, soon, dead], defects: [defect()] }, NOW)!;
    expect(v.deferrals.map(d => d.deferralId)).toEqual(['dead', 'soon', 'far']);
  });
});

describe('buildRampView — placard, per ¶6-101G6 "present and legible"', () => {
  it('carries the placard location so the inspector knows where to physically look', () => {
    const v = buildRampView('ac-1', { aircraft: [AC], deferrals: [deferral()], defects: [defect()] }, NOW)!;
    expect(v.deferrals[0].placardRequired).toBe(true);
    expect(v.deferrals[0].placardInstalled).toBe(true);
    expect(v.deferrals[0].placardLocation).toBe('Overhead panel, adj. APU GEN');
  });

  it('carries whether the once-only extension is spent — it moved the due date the inspector reads', () => {
    const plain = buildRampView('ac-1', { aircraft: [AC], deferrals: [deferral()], defects: [defect()] }, NOW)!;
    expect(plain.deferrals[0].extensionUsed).toBe(false);

    const extended = buildRampView('ac-1', {
      aircraft: [AC], deferrals: [deferral({ extensionUsed: true, extensionJustification: 'part on order' })], defects: [defect()],
    }, NOW)!;
    expect(extended.deferrals[0].extensionUsed).toBe(true);
    // The justification prose is deliberately not surfaced — not asked for by ¶6-101F5.
    expect(Object.keys(extended.deferrals[0])).not.toContain('extensionJustification');
  });

  it('reports an uninstalled required placard as not installed', () => {
    const v = buildRampView('ac-1', {
      aircraft: [AC], deferrals: [deferral({ placardInstalled: undefined })], defects: [defect()],
    }, NOW)!;
    expect(v.deferrals[0].placardInstalled).toBe(false);
  });
});
