import { describe, it, expect } from 'vitest';
import { ActionItem, CheckInReport, ProjectCheckIn } from './types';
import {
  getLastReportDate,
  getDaysSinceLastReport,
  getStallState,
  getProgressTrend,
  isTrendFlat,
  getReportingRate,
  getStallSummary,
  bySilenceDesc,
} from './stall';

const report = (on: string, progress: number, contributorId = 'c1'): CheckInReport => ({
  contributorId,
  dueOn: on,
  reportedOn: on,
  progress,
  note: 'update',
});

const makeItem = (
  overrides: Partial<ActionItem> & { checkIn?: ProjectCheckIn } = {},
): ActionItem => ({
  id: 'ACTION-TEST',
  title: 'Ground ops safety audit',
  description: 'Audit the ground handling procedures',
  module: 'Safety',
  assignedBy: 'Safety Manager',
  assignedDate: '2026-01-01',
  dueDate: '2026-12-31',
  priority: 'High',
  status: 'In Progress',
  progress: 75,
  contributors: [
    { id: 'c1', name: 'David Brown', role: 'Contributor', avatar: 'DB' },
    { id: 'c2', name: 'Carlos Martinez', role: 'Contributor', avatar: 'CM' },
  ],
  recentActivity: [],
  sections: [],
  sectionsComplete: 0,
  totalSections: 0,
  ...overrides,
});

describe('silence', () => {
  it('counts from the last report anyone filed', () => {
    const item = makeItem({
      checkIn: { cadence: 'monthly', startedOn: '2026-06-01', reports: [report('2026-06-15', 50), report('2026-07-01', 75)] },
    });
    expect(getLastReportDate(item)).toBe('2026-07-01');
    expect(getDaysSinceLastReport(item, '2026-08-04')).toBe(34);
  });

  it('counts from the anchor when nobody has ever reported', () => {
    const item = makeItem({ checkIn: { cadence: 'weekly', startedOn: '2026-07-28', reports: [] } });
    expect(getLastReportDate(item)).toBeNull();
    expect(getDaysSinceLastReport(item, '2026-08-04')).toBe(7);
  });
});

describe('getStallState', () => {
  it('calls a project quiet once a whole cycle passes with nothing filed', () => {
    // Monthly cadence, 34 days of silence — one full window missed.
    const item = makeItem({
      checkIn: { cadence: 'monthly', startedOn: '2026-06-01', reports: [report('2026-07-01', 75)] },
    });
    expect(getStallState(item, '2026-08-04')).toBe('quiet');
  });

  it('does not call a project quiet inside its cycle', () => {
    const item = makeItem({
      checkIn: { cadence: 'monthly', startedOn: '2026-06-01', reports: [report('2026-07-20', 75)] },
    });
    expect(getStallState(item, '2026-08-04')).toBe('moving');
  });

  it('is the point: 75% and silent outranks 20% and reporting', () => {
    const stuck = makeItem({
      id: 'STUCK',
      progress: 75,
      checkIn: { cadence: 'weekly', startedOn: '2026-06-01', reports: [report('2026-07-01', 75)] },
    });
    const moving = makeItem({
      id: 'MOVING',
      progress: 20,
      checkIn: { cadence: 'weekly', startedOn: '2026-06-01', reports: [report('2026-08-03', 20)] },
    });
    expect(getStallState(stuck, '2026-08-04')).toBe('quiet');
    expect(getStallState(moving, '2026-08-04')).toBe('moving');
    expect([moving, stuck].sort(bySilenceDesc('2026-08-04')).map(i => i.id)).toEqual(['STUCK', 'MOVING']);
  });

  it('is new when tracked but not yet due for a first report', () => {
    const item = makeItem({
      assignedDate: '2026-08-02',
      checkIn: { cadence: 'weekly', startedOn: '2026-08-02', reports: [] },
    });
    expect(getStallState(item, '2026-08-04')).toBe('new');
  });

  it('never calls a project with no cadence quiet — nobody agreed to report', () => {
    const item = makeItem({ checkIn: { cadence: 'none', startedOn: '2026-01-01', reports: [] } });
    expect(getStallState(item, '2026-08-04')).toBe('moving');
  });

  it('is landed once complete, however long the silence', () => {
    const item = makeItem({
      status: 'Completed',
      checkIn: { cadence: 'weekly', startedOn: '2026-01-01', reports: [] },
    });
    expect(getStallState(item, '2026-08-04')).toBe('landed');
  });
});

describe('progress trend', () => {
  it('reads oldest first', () => {
    const item = makeItem({
      checkIn: { cadence: 'weekly', reports: [report('2026-07-20', 55), report('2026-07-06', 15), report('2026-07-13', 30)] },
    });
    expect(getProgressTrend(item)).toEqual([15, 30, 55]);
    expect(isTrendFlat(item)).toBe(false);
  });

  it('flags a flat line — the stuck-at-75% case a progress bar hides', () => {
    const item = makeItem({
      checkIn: { cadence: 'weekly', reports: [report('2026-06-01', 75), report('2026-07-01', 75)] },
    });
    expect(isTrendFlat(item)).toBe(true);
  });

  it('pads a single report so it still draws a line', () => {
    const item = makeItem({ checkIn: { cadence: 'weekly', reports: [report('2026-07-01', 40)] } });
    expect(getProgressTrend(item)).toEqual([0, 40]);
  });
});

describe('getReportingRate', () => {
  it('measures whether the check-in habit is landing at all', () => {
    const dueOn = '2026-08-01';
    const filed = makeItem({
      id: 'A',
      checkIn: { cadence: 'weekly', startedOn: '2026-07-25', reports: [report(dueOn, 60, 'c1')] },
    });
    const silent = makeItem({
      id: 'B',
      checkIn: { cadence: 'weekly', startedOn: '2026-07-25', reports: [] },
    });
    // 1 of 4 owed reports filed across the two projects.
    expect(getReportingRate([filed, silent], dueOn)).toEqual({ reported: 1, owed: 4, rate: 25 });
  });

  it('is zero, not NaN, when nothing is being tracked', () => {
    expect(getReportingRate([makeItem({ checkIn: { cadence: 'none', reports: [] } })], '2026-08-04')).toEqual({
      reported: 0,
      owed: 0,
      rate: 0,
    });
  });
});

describe('getStallSummary', () => {
  it('reports the quiet count and the worst silence', () => {
    const quietLong = makeItem({
      id: 'A',
      checkIn: { cadence: 'monthly', startedOn: '2026-06-01', reports: [report('2026-07-01', 75)] },
    });
    const quietShort = makeItem({
      id: 'B',
      checkIn: { cadence: 'weekly', startedOn: '2026-07-01', reports: [report('2026-07-25', 40)] },
    });
    const fine = makeItem({
      id: 'C',
      checkIn: { cadence: 'weekly', startedOn: '2026-07-01', reports: [report('2026-08-03', 40)] },
    });

    const summary = getStallSummary([quietLong, quietShort, fine], '2026-08-04');
    expect(summary.quietCount).toBe(2);
    expect(summary.longestSilence).toBe(34);
  });

  it('has nothing to report on an empty board', () => {
    expect(getStallSummary([], '2026-08-04')).toEqual({ quietCount: 0, longestSilence: 0, reported: 0, owed: 0, rate: 0 });
  });
});
