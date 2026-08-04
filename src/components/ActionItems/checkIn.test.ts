import { describe, it, expect } from 'vitest';
import { ActionItem, ProjectCheckIn } from './types';
import { getCurrentCheckInDueDate, getOutstandingCheckIns, getCheckInCompliance } from './checkIn';

const makeItem = (checkIn: ProjectCheckIn | undefined, contributorIds: string[] = ['c1', 'c2']): ActionItem => ({
  id: 'ACTION-TEST',
  title: 'Fleet Wi-Fi rollout',
  description: 'Retrofit the fleet',
  department: 'Flight Operations',
  assignedBy: 'Lead Team',
  assignedDate: '2026-01-01',
  dueDate: '2026-12-31',
  priority: 'High',
  status: 'In Progress',
  progress: 20,
  contributors: contributorIds.map(id => ({ id, name: `Person ${id}`, role: 'Contributor', avatar: id.toUpperCase() })),
  recentActivity: [],
  sections: [],
  sectionsComplete: 0,
  totalSections: 0,
  checkIn,
});

describe('getCurrentCheckInDueDate', () => {
  it('returns null when the project has no cadence', () => {
    expect(getCurrentCheckInDueDate(makeItem(undefined), '2026-08-03')).toBeNull();
    expect(getCurrentCheckInDueDate(makeItem({ cadence: 'none', reports: [] }), '2026-08-03')).toBeNull();
  });

  it('does not ask for a report before the first full interval has elapsed', () => {
    const item = makeItem({ cadence: 'weekly', startedOn: '2026-08-01', reports: [] });
    expect(getCurrentCheckInDueDate(item, '2026-08-01')).toBeNull();
    expect(getCurrentCheckInDueDate(item, '2026-08-07')).toBeNull();
    expect(getCurrentCheckInDueDate(item, '2026-08-08')).toBe('2026-08-08');
  });

  it('returns the most recent window, not the first one missed', () => {
    const item = makeItem({ cadence: 'weekly', startedOn: '2026-08-01', reports: [] });
    // Three intervals in: 08-01 + 21 days.
    expect(getCurrentCheckInDueDate(item, '2026-08-24')).toBe('2026-08-22');
  });

  it('honours each cadence length', () => {
    const anchor = '2026-01-01';
    expect(getCurrentCheckInDueDate(makeItem({ cadence: 'weekly', startedOn: anchor, reports: [] }), '2026-01-15')).toBe('2026-01-15');
    expect(getCurrentCheckInDueDate(makeItem({ cadence: 'biweekly', startedOn: anchor, reports: [] }), '2026-01-15')).toBe('2026-01-15');
    expect(getCurrentCheckInDueDate(makeItem({ cadence: 'monthly', startedOn: anchor, reports: [] }), '2026-01-15')).toBeNull();
    // A month is a calendar month, so the 31st is not yet a month after the 1st.
    expect(getCurrentCheckInDueDate(makeItem({ cadence: 'monthly', startedOn: anchor, reports: [] }), '2026-01-31')).toBeNull();
    expect(getCurrentCheckInDueDate(makeItem({ cadence: 'monthly', startedOn: anchor, reports: [] }), '2026-02-01')).toBe('2026-02-01');
  });

  it('keeps a monthly project on the same day of the month instead of drifting', () => {
    const item = makeItem({ cadence: 'monthly', startedOn: '2026-01-15', reports: [] });
    expect(getCurrentCheckInDueDate(item, '2026-02-15')).toBe('2026-02-15');
    expect(getCurrentCheckInDueDate(item, '2026-04-20')).toBe('2026-04-15');
    // Under 30-day arithmetic this would have slipped to the 11th by April.
    expect(getCurrentCheckInDueDate(item, '2026-06-15')).toBe('2026-06-15');
  });

  it('clamps to the end of a short month rather than spilling into the next', () => {
    const item = makeItem({ cadence: 'monthly', startedOn: '2026-01-31', reports: [] });
    expect(getCurrentCheckInDueDate(item, '2026-03-01')).toBe('2026-02-28');
  });

  it('falls back to assignedDate when no explicit anchor is set', () => {
    const item = makeItem({ cadence: 'weekly', reports: [] });
    // assignedDate is 2026-01-01.
    expect(getCurrentCheckInDueDate(item, '2026-01-08')).toBe('2026-01-08');
  });
});

describe('getOutstandingCheckIns', () => {
  it('lists every contributor when nobody has reported', () => {
    const item = makeItem({ cadence: 'weekly', startedOn: '2026-08-01', reports: [] });
    const outstanding = getOutstandingCheckIns(item, '2026-08-08');
    expect(outstanding?.dueOn).toBe('2026-08-08');
    expect(outstanding?.contributors.map(c => c.id)).toEqual(['c1', 'c2']);
  });

  it('drops a contributor once they report for that window', () => {
    const item = makeItem({
      cadence: 'weekly',
      startedOn: '2026-08-01',
      reports: [{ contributorId: 'c1', dueOn: '2026-08-08', reportedOn: '2026-08-08', progress: 40, note: 'done' }],
    });
    expect(getOutstandingCheckIns(item, '2026-08-08')?.contributors.map(c => c.id)).toEqual(['c2']);
  });

  it('re-asks everyone when a new window opens — a stale report does not satisfy it', () => {
    const item = makeItem({
      cadence: 'weekly',
      startedOn: '2026-08-01',
      reports: [{ contributorId: 'c1', dueOn: '2026-08-08', reportedOn: '2026-08-08', progress: 40, note: 'done' }],
    });
    const outstanding = getOutstandingCheckIns(item, '2026-08-15');
    expect(outstanding?.dueOn).toBe('2026-08-15');
    expect(outstanding?.contributors.map(c => c.id)).toEqual(['c1', 'c2']);
  });
});

describe('getCheckInCompliance', () => {
  it('reports how many of the team have filed this cycle', () => {
    const item = makeItem({
      cadence: 'weekly',
      startedOn: '2026-08-01',
      reports: [{ contributorId: 'c1', dueOn: '2026-08-08', reportedOn: '2026-08-08', progress: 40, note: 'done' }],
    });
    expect(getCheckInCompliance(item, '2026-08-08')).toEqual({ dueOn: '2026-08-08', reported: 1, total: 2 });
  });

  it('is null for a project nobody is being chased on', () => {
    expect(getCheckInCompliance(makeItem({ cadence: 'none', reports: [] }), '2026-08-08')).toBeNull();
  });
});
