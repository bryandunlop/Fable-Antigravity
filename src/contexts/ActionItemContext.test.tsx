import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { ActionItemProvider, useActionItems } from './ActionItemContext';
import { NewItemForm } from '../components/ActionItems/types';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ActionItemProvider>{children}</ActionItemProvider>
);

const form = (overrides: Partial<NewItemForm> = {}): NewItemForm => ({
  title: 'Fleet Wi-Fi rollout',
  description: 'Retrofit all four tails',
  module: 'Flight Operations',
  priority: 'High',
  dueDate: '2026-12-31',
  sections: ['Survey', 'Install', ''],
  checkInCadence: 'weekly',
  ...overrides,
});

describe('ActionItemContext', () => {
  it('seeds the demo projects so both surfaces open with the same list', () => {
    const { result } = renderHook(() => useActionItems(), { wrapper });
    expect(result.current.actionItems.length).toBeGreaterThan(0);
    expect(result.current.actionItems.every(item => item.checkIn)).toBe(true);
  });

  it('adds an action item that both surfaces can then read', () => {
    const { result } = renderHook(() => useActionItems(), { wrapper });
    const before = result.current.actionItems.length;

    act(() => {
      result.current.addActionItem(form(), 'Lead Team');
    });

    expect(result.current.actionItems).toHaveLength(before + 1);
    const created = result.current.actionItems[0];
    expect(created.title).toBe('Fleet Wi-Fi rollout');
    expect(created.assignedBy).toBe('Lead Team');
    // Blank section rows from the form are dropped, not stored as empty tasks.
    expect(created.sections.map(s => s.name)).toEqual(['Survey', 'Install']);
    expect(created.totalSections).toBe(2);
    expect(created.checkIn?.cadence).toBe('weekly');
  });

  it('defaults the due date to today when the form leaves it blank', () => {
    const { result } = renderHook(() => useActionItems(), { wrapper });
    act(() => {
      result.current.addActionItem(form({ dueDate: '' }), 'Lead Team');
    });
    const created = result.current.actionItems[0];
    expect(created.dueDate).toBe(created.assignedDate);
  });

  it('records a check-in and rolls the project progress and activity feed', () => {
    const { result } = renderHook(() => useActionItems(), { wrapper });
    act(() => {
      result.current.addActionItem(form(), 'Lead Team');
    });
    const id = result.current.actionItems[0].id;

    act(() => {
      result.current.recordCheckIn(id, {
        contributorId: 'creator',
        dueOn: '2026-08-08',
        progress: 55,
        note: 'Two tails surveyed',
        reportedOn: '2026-08-08',
      });
    });

    const item = result.current.getActionItemById(id)!;
    expect(item.progress).toBe(55);
    expect(item.status).toBe('In Progress');
    expect(item.checkIn?.reports).toHaveLength(1);
    expect(item.recentActivity[0].action).toContain('Two tails surveyed');
  });

  it('supersedes rather than duplicates a re-filed report for the same window', () => {
    const { result } = renderHook(() => useActionItems(), { wrapper });
    act(() => {
      result.current.addActionItem(form(), 'Lead Team');
    });
    const id = result.current.actionItems[0].id;

    act(() => {
      result.current.recordCheckIn(id, { contributorId: 'creator', dueOn: '2026-08-08', progress: 30, note: 'first' });
    });
    act(() => {
      result.current.recordCheckIn(id, { contributorId: 'creator', dueOn: '2026-08-08', progress: 60, note: 'corrected' });
    });

    const item = result.current.getActionItemById(id)!;
    expect(item.checkIn?.reports).toHaveLength(1);
    expect(item.checkIn?.reports[0].note).toBe('corrected');
    expect(item.progress).toBe(60);
  });

  it('marks a project complete when a check-in reports 100%', () => {
    const { result } = renderHook(() => useActionItems(), { wrapper });
    act(() => {
      result.current.addActionItem(form(), 'Lead Team');
    });
    const id = result.current.actionItems[0].id;

    act(() => {
      result.current.recordCheckIn(id, { contributorId: 'creator', dueOn: '2026-08-08', progress: 100, note: 'shipped' });
    });

    expect(result.current.getActionItemById(id)!.status).toBe('Completed');
  });

  it('changes the cadence without losing filed reports', () => {
    const { result } = renderHook(() => useActionItems(), { wrapper });
    act(() => {
      result.current.addActionItem(form(), 'Lead Team');
    });
    const id = result.current.actionItems[0].id;

    act(() => {
      result.current.recordCheckIn(id, { contributorId: 'creator', dueOn: '2026-08-08', progress: 40, note: 'ok' });
    });
    act(() => {
      result.current.setCheckInCadence(id, 'monthly');
    });

    const item = result.current.getActionItemById(id)!;
    expect(item.checkIn?.cadence).toBe('monthly');
    expect(item.checkIn?.reports).toHaveLength(1);
  });
});
