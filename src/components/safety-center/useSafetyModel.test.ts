import { describe, it, expect } from 'vitest';
import { buildSafetyModel, hazardToItem, phaseIndexOf, ageInStage } from './useSafetyModel';
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
    expect(m.know).toEqual([]);
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
