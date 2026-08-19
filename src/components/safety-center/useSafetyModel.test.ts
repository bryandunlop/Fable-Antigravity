import { describe, it, expect } from 'vitest';
import type { AsapReport } from './asapReports';
import { buildSafetyModel, hazardToItem, phaseIndexOf, ageInStage, asapToItem } from './useSafetyModel';
import { WORKFLOW_STAGES, type Hazard } from '../../contexts/HazardContext';

function makeHazard(over: Partial<Hazard>): Hazard {
  return {
    id: 'H-1', title: 'Test hazard', severity: 'Medium',
    workflowStage: WORKFLOW_STAGES.SUBMITTED, location: 'KTEB',
    reportedBy: 'Crew', reportedDate: '2026-07-01',
    description: 'desc', immediateActions: '', potentialConsequences: '',
    ...over,
  } as Hazard;
}

describe('phaseIndexOf', () => {
  it('collapses 14 workflow stages into the 5-phase spine', () => {
    expect(phaseIndexOf(WORKFLOW_STAGES.SUBMITTED)).toBe(0);
    expect(phaseIndexOf(WORKFLOW_STAGES.SM_INVESTIGATION)).toBe(1);
    expect(phaseIndexOf(WORKFLOW_STAGES.MITIGATION_DEVELOPMENT)).toBe(2);
    expect(phaseIndexOf(WORKFLOW_STAGES.EXEC_APPROVAL)).toBe(2);
    expect(phaseIndexOf(WORKFLOW_STAGES.IMPLEMENTATION)).toBe(2);
    expect(phaseIndexOf(WORKFLOW_STAGES.EFFECTIVENESS_REVIEW)).toBe(3);
    expect(phaseIndexOf(WORKFLOW_STAGES.CLOSED)).toBe(4);
    expect(phaseIndexOf(WORKFLOW_STAGES.PUBLISHED)).toBe(4);
  });

  it('defaults unknown stages to Investigate rather than crashing', () => {
    expect(phaseIndexOf('not-a-real-stage')).toBe(1);
  });
});

describe('ageInStage', () => {
  it('prefers an explicit daysInStage', () => {
    expect(ageInStage(makeHazard({ daysInStage: 42 }))).toBe(42);
  });
  it('falls back to 0 on a missing/invalid reportedDate', () => {
    expect(ageInStage(makeHazard({ reportedDate: '', daysInStage: undefined }))).toBe(0);
    expect(ageInStage(makeHazard({ reportedDate: 'garbage', daysInStage: undefined }))).toBe(0);
  });
});

describe('hazardToItem — bucket routing', () => {
  it('routes a freshly submitted hazard to Your move (mine, Triage, phase 0)', () => {
    const item = hazardToItem(makeHazard({ workflowStage: WORKFLOW_STAGES.SUBMITTED }));
    expect(item.bucket).toBe('move');
    expect(item.mine).toBe(true);
    expect(item.phaseIndex).toBe(0);
    expect(item.nextAction).toBe('Triage');
  });

  it('routes an in-progress hazard to Track and flags >30 days as stalled', () => {
    const item = hazardToItem(makeHazard({
      workflowStage: WORKFLOW_STAGES.MITIGATION_DEVELOPMENT, daysInStage: 42, assignedTo: 'Engineering',
    }));
    expect(item.bucket).toBe('track');
    expect(item.mine).toBe(false);
    expect(item.phaseIndex).toBe(2);
    expect(item.stalled).toBe(true);
    expect(item.owner).toBe('Engineering');
    expect(item.status?.label).toBe('Accepted · mitigation open');
  });

  it('does NOT flag a fresh in-progress hazard as stalled', () => {
    const item = hazardToItem(makeHazard({
      workflowStage: WORKFLOW_STAGES.MITIGATION_DEVELOPMENT, daysInStage: 5,
    }));
    expect(item.stalled).toBe(false);
    expect(item.status?.label).toBe('Mitigation in work');
  });

  it('routes a closed/published hazard to Done, never stalled', () => {
    const closed = hazardToItem(makeHazard({ workflowStage: WORKFLOW_STAGES.CLOSED, daysInStage: 999 }));
    expect(closed.bucket).toBe('done');
    expect(closed.stalled).toBe(false);
    expect(closed.status?.tone).toBe('green');
  });

  it('carries the raw hazard id + stage so actions can write back', () => {
    const item = hazardToItem(makeHazard({ id: 'HZ-042', workflowStage: WORKFLOW_STAGES.SM_INVESTIGATION }));
    expect(item.sourceId).toBe('HZ-042');
    expect(item.rawStage).toBe(WORKFLOW_STAGES.SM_INVESTIGATION);
  });

  it('advances one granular stage using the WORKFLOW_STAGES order', () => {
    // Mirrors SafetyCenter.advanceHazard — the ordered stage list is the contract.
    const order = Object.values(WORKFLOW_STAGES);
    const i = order.indexOf(WORKFLOW_STAGES.SUBMITTED);
    expect(order[i + 1]).toBe(WORKFLOW_STAGES.SM_INVESTIGATION);
  });
});

describe('buildSafetyModel — work lists carry no mock rows (D38)', () => {
  const REPORTER = 'Capt. Dunlop';

  it('derives every work-list row from the hazards passed in — empty in, empty out', () => {
    const m = buildSafetyModel([]);
    expect(m.my.move).toEqual([]);
    expect(m.my.waiting).toEqual([]);
    expect(m.my.done).toEqual([]);
    expect(m.ops.move).toEqual([]);
    expect(m.ops.track).toEqual([]);
    expect(m.ops.done).toEqual([]);
  });

  it("puts the reporter's own open hazard in my.waiting and the ops inbox", () => {
    const m = buildSafetyModel([
      makeHazard({ id: 'H-9', reportedBy: REPORTER, workflowStage: WORKFLOW_STAGES.SUBMITTED }),
    ]);
    expect(m.my.waiting).toHaveLength(1);
    expect(m.my.waiting[0].sourceId).toBe('H-9');
    expect(m.ops.move).toHaveLength(1);
  });

  it("excludes anonymous and other people's hazards from my.waiting", () => {
    const m = buildSafetyModel([
      makeHazard({ id: 'H-1', reportedBy: REPORTER, isAnonymous: true }),
      makeHazard({ id: 'H-2', reportedBy: 'Someone Else' }),
    ]);
    expect(m.my.waiting).toEqual([]);
  });

  it("routes the reporter's closed hazard to my.done, not my.waiting", () => {
    const m = buildSafetyModel([
      makeHazard({ id: 'H-3', reportedBy: REPORTER, workflowStage: WORKFLOW_STAGES.CLOSED }),
    ]);
    expect(m.my.waiting).toEqual([]);
    expect(m.my.done).toHaveLength(1);
  });

  it('dedups duplicate hazard ids from a corrupted persisted store', () => {
    const m = buildSafetyModel([
      makeHazard({ id: 'HZ-010', reportedBy: REPORTER }),
      makeHazard({ id: 'HZ-010', reportedBy: REPORTER }),
    ]);
    expect(m.ops.move).toHaveLength(1);
    expect(m.submissions.filter((s) => s.sourceId === 'HZ-010')).toHaveLength(1);
  });

  it('skips deleted hazards everywhere', () => {
    const m = buildSafetyModel([
      makeHazard({ id: 'H-4', reportedBy: REPORTER, isDeleted: true } as Partial<Hazard>),
    ]);
    expect(m.ops.move).toEqual([]);
    expect(m.submissions.filter((s) => s.sourceId === 'H-4')).toEqual([]);
  });

  it('keeps archive/library seeds out of the work lists but present in submissions/published', () => {
    const m = buildSafetyModel([]);
    // History seeds are allowed in the archive and library only.
    expect(m.submissions.length).toBeGreaterThan(0);
    expect(m.published.length).toBeGreaterThan(0);
    expect(m.submissions.every((s) => s.bucket === 'done')).toBe(true);
  });
});

// ── D85 · C7: ASAP reports ride the same surfaces as hazards ────────────────
// They used to be reachable only from a sub-tab, so a safety manager had to
// remember to go and look. The confidentiality rule travels with them.

describe('asapToItem', () => {
  const rep = (over: Partial<AsapReport> = {}): AsapReport => ({
    id: 'ASAP-2026-014', phase: 'Approach', airport: 'KTEB',
    description: 'Went around.', contributing: '', severity: 'Medium',
    submittedAt: new Date().toISOString(), status: 'Open', deidentified: true,
    ...over,
  });

  it('never carries a reporter identity — ASAP is non-punitive and confidential', () => {
    const i = asapToItem(rep());
    expect(i.submittedBy).toBe('Confidential');
    // and nothing else on the item may leak one
    expect(JSON.stringify(i)).not.toMatch(/Dunlop|Ellis|Smith/);
  });

  it('routes Open to triage, Under review to the tracked phase, Resolved to done', () => {
    expect(asapToItem(rep({ status: 'Open' })).bucket).toBe('move');
    expect(asapToItem(rep({ status: 'Under review' })).bucket).toBe('track');
    expect(asapToItem(rep({ status: 'Resolved' })).bucket).toBe('done');
  });

  it('lands on the same phase indices the hazard board groups by', () => {
    expect(asapToItem(rep({ status: 'Open' })).phaseIndex).toBe(0);
    expect(asapToItem(rep({ status: 'Under review' })).phaseIndex).toBe(1);
  });

  it('titles the card by phase and airport, not by a person', () => {
    expect(asapToItem(rep()).title).toBe('Approach · KTEB');
  });

  it('carries a numeric age so the board can bucket it', () => {
    const old = asapToItem(rep({ submittedAt: '2026-01-01T00:00:00Z' }));
    expect(typeof old.ageDays).toBe('number');
    expect(old.ageDays!).toBeGreaterThan(0);
  });

  it('marks a long-open report stalled, the same as a hazard', () => {
    const old = rep({ submittedAt: new Date(Date.now() - 45 * 86_400_000).toISOString() });
    expect(asapToItem(old).stalled).toBe(true);
  });

  it('never marks a resolved report stalled, however old', () => {
    const old = rep({ status: 'Resolved', submittedAt: '2020-01-01T00:00:00Z' });
    expect(asapToItem(old).stalled).toBe(false);
  });

  it('keeps its own id so the card can open the ASAP sheet', () => {
    expect(asapToItem(rep()).sourceId).toBe('ASAP-2026-014');
    expect(asapToItem(rep()).type).toBe('ASAP');
  });
});

describe('buildSafetyModel with ASAP', () => {
  const asap = (id: string, status: AsapReport['status']): AsapReport => ({
    id, phase: 'Cruise', airport: 'KTEB', description: 'x', contributing: '',
    severity: 'Low', submittedAt: new Date().toISOString(), status, deidentified: true,
  });

  it('puts open ASAP reports in the triage bucket beside hazards', () => {
    const m = buildSafetyModel([], [asap('A1', 'Open'), asap('A2', 'Under review')]);
    expect(m.ops.move.map((i) => i.sourceId)).toContain('A1');
    expect(m.ops.track.map((i) => i.sourceId)).toContain('A2');
  });

  it('includes them in the records archive', () => {
    const m = buildSafetyModel([], [asap('A1', 'Resolved')]);
    expect(m.submissions.some((i) => i.sourceId === 'A1')).toBe(true);
  });

  it('still works when no ASAP reports are passed at all', () => {
    expect(() => buildSafetyModel([], [])).not.toThrow();
    expect(buildSafetyModel([]).ops.move).toEqual([]);
  });
});
