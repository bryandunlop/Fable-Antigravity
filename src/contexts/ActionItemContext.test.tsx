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
  department: 'Flight Operations',
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

  it('stamps a nudge so the contributor sees the lead reached past the cadence', () => {
    const { result } = renderHook(() => useActionItems(), { wrapper });
    act(() => {
      result.current.addActionItem(form(), 'Lead Team');
    });
    const id = result.current.actionItems[0].id;

    act(() => {
      result.current.nudge(id, '2026-08-04');
    });

    expect(result.current.getActionItemById(id)!.checkIn?.lastNudgedOn).toBe('2026-08-04');
  });

  it('clears the nudge once the silence is broken', () => {
    const { result } = renderHook(() => useActionItems(), { wrapper });
    act(() => {
      result.current.addActionItem(form(), 'Lead Team');
    });
    const id = result.current.actionItems[0].id;

    act(() => {
      result.current.nudge(id, '2026-08-04');
    });
    act(() => {
      result.current.recordCheckIn(id, { contributorId: 'creator', dueOn: '2026-08-08', progress: 40, note: 'moving again' });
    });

    expect(result.current.getActionItemById(id)!.checkIn?.lastNudgedOn).toBeUndefined();
  });

  it('seeds reporting history so the board opens on a real stalled project', () => {
    const { result } = renderHook(() => useActionItems(), { wrapper });
    const withHistory = result.current.actionItems.filter(item => (item.checkIn?.reports.length ?? 0) > 0);
    expect(withHistory.length).toBeGreaterThan(0);
    // At least one seeded project reports the same figure twice — the flat
    // trend the board exists to expose.
    expect(
      result.current.actionItems.some(item => (item.checkIn?.reports.length ?? 0) >= 2),
    ).toBe(true);
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

describe('ActionItemContext at scale', () => {
  it('seeds a roster big enough to exercise the chase list', () => {
    const { result } = renderHook(() => useActionItems(), { wrapper });
    expect(result.current.actionItems.length).toBeGreaterThanOrEqual(20);
  });

  it('nudges a whole group in one pass', () => {
    const { result } = renderHook(() => useActionItems(), { wrapper });
    const ids = result.current.actionItems.slice(0, 3).map(item => item.id);

    act(() => {
      result.current.nudgeMany(ids, '2026-08-04');
    });

    ids.forEach(id => {
      expect(result.current.getActionItemById(id)!.checkIn?.lastNudgedOn).toBe('2026-08-04');
    });
    // Everything outside the group is left alone.
    const untouched = result.current.actionItems.find(item => !ids.includes(item.id))!;
    expect(untouched.checkIn?.lastNudgedOn).toBeUndefined();
  });

  it('does nothing on an empty id list rather than stamping the board', () => {
    const { result } = renderHook(() => useActionItems(), { wrapper });
    act(() => {
      result.current.nudgeMany([], '2026-08-04');
    });
    expect(result.current.actionItems.every(item => !item.checkIn?.lastNudgedOn)).toBe(true);
  });
});

describe('closing and reopening', () => {
  it('records why a project was closed, and at what progress', () => {
    const { result } = renderHook(() => useActionItems(), { wrapper });
    act(() => { result.current.addActionItem(form(), 'Lead Team'); });
    const id = result.current.actionItems[0].id;
    act(() => { result.current.recordCheckIn(id, { contributorId: 'creator', dueOn: '2026-08-08', progress: 55, note: 'halfway' }); });

    act(() => { result.current.closeActionItem(id, 'Superseded by another project', 'Lead Team', '2026-08-04'); });

    const item = result.current.getActionItemById(id)!;
    expect(item.status).toBe('Completed');
    expect(item.closure).toEqual({
      reason: 'Superseded by another project',
      closedOn: '2026-08-04',
      closedBy: 'Lead Team',
      progressAtClose: 55,
      // Recorded so reopening restores what it was rather than guessing.
      previousStatus: 'In Progress',
    });
    // The reason is also in the feed, so it reads in context later.
    expect(item.recentActivity[0].action).toContain('closed this project at 55%');
  });

  it('reopens cleanly — the closure is gone, not just overwritten', () => {
    const { result } = renderHook(() => useActionItems(), { wrapper });
    act(() => { result.current.addActionItem(form(), 'Lead Team'); });
    const id = result.current.actionItems[0].id;

    act(() => { result.current.closeActionItem(id, 'No longer a priority', 'Lead Team'); });
    act(() => { result.current.reopenActionItem(id); });

    const item = result.current.getActionItemById(id)!;
    // Restored to what it actually was before the close — a project created
    // and closed without ever starting comes back as Pending, not promoted.
    expect(item.status).toBe('Pending');
    expect(item.closure).toBeUndefined();
    expect(item.recentActivity[0].action).toContain('reopened');
  });

  it('leaves filed reports intact through a close and reopen', () => {
    const { result } = renderHook(() => useActionItems(), { wrapper });
    act(() => { result.current.addActionItem(form(), 'Lead Team'); });
    const id = result.current.actionItems[0].id;
    act(() => { result.current.recordCheckIn(id, { contributorId: 'creator', dueOn: '2026-08-08', progress: 40, note: 'progress' }); });

    act(() => { result.current.closeActionItem(id, 'Cancelled', 'Lead Team'); });
    act(() => { result.current.reopenActionItem(id); });

    expect(result.current.getActionItemById(id)!.checkIn?.reports).toHaveLength(1);
  });
});

describe('ownership and completion consistency', () => {
  it('gives a new project an explicit owner rather than relying on array order', () => {
    const { result } = renderHook(() => useActionItems(), { wrapper });
    act(() => { result.current.addActionItem(form(), 'Lead Team'); });
    expect(result.current.actionItems[0].ownerId).toBe('creator');
  });

  it('hands a project over explicitly', () => {
    const { result } = renderHook(() => useActionItems(), { wrapper });
    const seeded = result.current.actionItems.find(i => i.contributors.length > 1)!;
    const second = seeded.contributors[1].id;

    act(() => { result.current.setOwner(seeded.id, second); });
    expect(result.current.getActionItemById(seeded.id)!.ownerId).toBe(second);
  });

  it('closes with a reason when a check-in reports 100%, so Completed always means one thing', () => {
    const { result } = renderHook(() => useActionItems(), { wrapper });
    act(() => { result.current.addActionItem(form(), 'Lead Team'); });
    const id = result.current.actionItems[0].id;

    act(() => {
      result.current.recordCheckIn(id, { contributorId: 'creator', dueOn: '2026-08-08', progress: 100, note: 'shipped' });
    });

    const item = result.current.getActionItemById(id)!;
    expect(item.status).toBe('Completed');
    expect(item.closure?.reason).toContain('shipped');
    expect(item.closure?.progressAtClose).toBe(100);
  });

  it('restores the status a project actually had, rather than promoting it', () => {
    const { result } = renderHook(() => useActionItems(), { wrapper });
    act(() => { result.current.addActionItem(form(), 'Lead Team'); });
    const id = result.current.actionItems[0].id;
    expect(result.current.getActionItemById(id)!.status).toBe('Pending');

    act(() => { result.current.closeActionItem(id, 'Cancelled', 'Lead Team'); });
    act(() => { result.current.reopenActionItem(id); });

    // Was Pending before the close, so it is Pending again — not In Progress.
    expect(result.current.getActionItemById(id)!.status).toBe('Pending');
  });

  it('keeps the cadence history through a nudge', () => {
    const { result } = renderHook(() => useActionItems(), { wrapper });
    act(() => { result.current.addActionItem(form(), 'Lead Team'); });
    const id = result.current.actionItems[0].id;

    act(() => { result.current.setCheckInCadence(id, 'monthly', '2026-08-04'); });
    act(() => { result.current.nudge(id, '2026-08-05'); });

    const item = result.current.getActionItemById(id)!;
    expect(item.checkIn?.cadenceHistory?.length).toBe(2);
    expect(item.checkIn?.lastNudgedOn).toBe('2026-08-05');
  });
});
