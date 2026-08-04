import { describe, it, expect } from 'vitest';
import { ActionItem, CheckInReport, ProjectCheckIn } from './types';
import { buildRunQueue, nextSlowerCadence, getPeopleRoster } from './chaseRun';

const report = (on: string, progress: number, contributorId = 'c1'): CheckInReport => ({
  contributorId, dueOn: on, reportedOn: on, progress, note: 'update',
});

const makeItem = (
  id: string,
  checkIn: ProjectCheckIn,
  overrides: Partial<ActionItem> = {},
): ActionItem => ({
  id,
  title: `Project ${id}`,
  description: 'A project',
  module: 'Safety',
  assignedBy: 'Safety Manager',
  assignedDate: '2026-01-01',
  dueDate: '2026-12-31',
  priority: 'High',
  status: 'In Progress',
  progress: 50,
  contributors: [{ id: `${id}-c0`, name: 'David Brown', role: 'Owner', avatar: 'DB' }],
  recentActivity: [],
  sections: [],
  sectionsComplete: 0,
  totalSections: 0,
  checkIn,
  ...overrides,
});

describe('buildRunQueue', () => {
  it('queues only the quiet projects, worst silence first', () => {
    const queue = buildRunQueue(
      [
        makeItem('MILD', { cadence: 'weekly', startedOn: '2026-06-01', reports: [report('2026-07-20', 50)] }),
        makeItem('FINE', { cadence: 'weekly', startedOn: '2026-06-01', reports: [report('2026-08-03', 50)] }),
        makeItem('WORST', { cadence: 'weekly', startedOn: '2026-06-01', reports: [report('2026-07-01', 50)] }),
      ],
      '2026-08-04',
    );
    expect(queue).toEqual(['WORST', 'MILD']);
  });

  it('leaves out projects nobody agreed to report on', () => {
    const queue = buildRunQueue(
      [makeItem('NOCADENCE', { cadence: 'none', startedOn: '2026-01-01', reports: [] })],
      '2026-08-04',
    );
    expect(queue).toEqual([]);
  });

  it('leaves out completed projects however long the silence', () => {
    const queue = buildRunQueue(
      [makeItem('DONE', { cadence: 'weekly', startedOn: '2026-01-01', reports: [] }, { status: 'Completed' })],
      '2026-08-04',
    );
    expect(queue).toEqual([]);
  });

  it('is empty when nothing has gone quiet, so the run cannot start on nothing', () => {
    expect(buildRunQueue([], '2026-08-04')).toEqual([]);
  });
});

describe('nextSlowerCadence', () => {
  it('steps down one rung at a time', () => {
    expect(nextSlowerCadence('weekly')).toBe('biweekly');
    expect(nextSlowerCadence('biweekly')).toBe('monthly');
  });

  it('has nowhere to go from the slowest, or from no cadence at all', () => {
    expect(nextSlowerCadence('monthly')).toBeNull();
    expect(nextSlowerCadence('none')).toBeNull();
    expect(nextSlowerCadence(undefined)).toBeNull();
  });
});

describe('getPeopleRoster', () => {
  it('lists everyone on any project once, sorted', () => {
    const a = makeItem('A', { cadence: 'weekly', reports: [] });
    const b = makeItem('B', { cadence: 'weekly', reports: [] }, {
      contributors: [
        { id: 'b0', name: 'Alice Adams', role: 'Owner', avatar: 'AA' },
        { id: 'b1', name: 'David Brown', role: 'Contributor', avatar: 'DB' },
      ],
    });
    expect(getPeopleRoster([a, b])).toEqual(['Alice Adams', 'David Brown']);
  });
});
