import React, { createContext, useContext, useState } from 'react';
import { ActionItem, NewItemForm, CheckInCadence } from '../components/ActionItems/types';
import { calculateProgress } from '../components/ActionItems/utils';
import { buildSeedActionItems } from '../components/ActionItems/seedProjects';

/**
 * The single store behind both action-item surfaces:
 *  - Tasks & Action Items (`/tasks-action-items`) — the current user's slice.
 *  - Rolling Action Items (`/rolling-action-items`) — the lead team's project
 *    tracker across everyone.
 *
 * Before this existed the two rendered unrelated mock arrays, so an item raised
 * in one was invisible in the other. Mirrors AuditContext/HazardContext so the
 * derivation helpers in UnifiedTasksActionItems can consume it the same way.
 */

interface ActionItemContextType {
  actionItems: ActionItem[];
  getActionItemById: (id: string) => ActionItem | undefined;
  addActionItem: (form: NewItemForm, createdBy: string) => ActionItem;
  updateActionItem: (id: string, updates: Partial<ActionItem>) => void;
  setCheckInCadence: (id: string, cadence: CheckInCadence) => void;
  /** Poke a project that has gone quiet, without waiting for the next window. */
  nudge: (id: string, on?: string) => void;
  /** Chase a whole group in one pass — one owner, or every quiet project. */
  nudgeMany: (ids: string[], on?: string) => void;
  /** File one contributor's report for a check-in window. */
  recordCheckIn: (
    id: string,
    report: { contributorId: string; dueOn: string; progress: number; note: string; reportedOn?: string },
  ) => void;
}

const ActionItemContext = createContext<ActionItemContextType | undefined>(undefined);

const todayIso = () => new Date().toISOString().split('T')[0];

const initialsOf = (name: string) =>
  name.split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase();

export const ActionItemProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [actionItems, setActionItems] = useState<ActionItem[]>(buildSeedActionItems);

  const getActionItemById = (id: string) => actionItems.find(item => item.id === id);

  const addActionItem = (form: NewItemForm, createdBy: string): ActionItem => {
    const sections = form.sections
      .map(name => name.trim())
      .filter(Boolean)
      .map(name => ({ name, status: 'pending' }));

    const created = todayIso();
    const item: ActionItem = {
      id: `ACTION-${Date.now()}`,
      title: form.title.trim(),
      description: form.description.trim(),
      module: form.module,
      assignedBy: createdBy,
      assignedDate: created,
      dueDate: form.dueDate || created,
      priority: form.priority,
      status: 'Pending',
      progress: sections.length ? calculateProgress(sections) : 0,
      contributors: [
        { id: 'creator', name: createdBy, role: 'Owner', avatar: initialsOf(createdBy) },
      ],
      recentActivity: [],
      sections,
      sectionsComplete: 0,
      totalSections: sections.length,
      checkIn: { cadence: form.checkInCadence, startedOn: created, reports: [] },
    };

    setActionItems(prev => [item, ...prev]);
    return item;
  };

  const updateActionItem = (id: string, updates: Partial<ActionItem>) => {
    setActionItems(prev => prev.map(item => (item.id === id ? { ...item, ...updates } : item)));
  };

  const setCheckInCadence = (id: string, cadence: CheckInCadence) => {
    setActionItems(prev =>
      prev.map(item =>
        item.id === id
          ? {
              ...item,
              checkIn: {
                startedOn: item.checkIn?.startedOn ?? item.assignedDate,
                reports: item.checkIn?.reports ?? [],
                cadence,
              },
            }
          : item,
      ),
    );
  };

  const nudge = (id: string, on?: string) => {
    setActionItems(prev =>
      prev.map(item =>
        item.id === id
          ? {
              ...item,
              checkIn: {
                cadence: item.checkIn?.cadence ?? 'none',
                startedOn: item.checkIn?.startedOn ?? item.assignedDate,
                reports: item.checkIn?.reports ?? [],
                lastNudgedOn: on ?? todayIso(),
              },
            }
          : item,
      ),
    );
  };

  const nudgeMany = (ids: string[], on?: string) => {
    const stamped = on ?? todayIso();
    const targets = new Set(ids);
    setActionItems(prev =>
      prev.map(item =>
        targets.has(item.id)
          ? {
              ...item,
              checkIn: {
                cadence: item.checkIn?.cadence ?? 'none',
                startedOn: item.checkIn?.startedOn ?? item.assignedDate,
                reports: item.checkIn?.reports ?? [],
                lastNudgedOn: stamped,
              },
            }
          : item,
      ),
    );
  };

  const recordCheckIn: ActionItemContextType['recordCheckIn'] = (id, report) => {
    setActionItems(prev =>
      prev.map(item => {
        if (item.id !== id) return item;
        const existing = item.checkIn ?? { cadence: 'none' as CheckInCadence, reports: [] };
        // One report per contributor per window — a re-filed report supersedes.
        const reports = existing.reports.filter(
          r => !(r.contributorId === report.contributorId && r.dueOn === report.dueOn),
        );
        const contributor = item.contributors.find(c => c.id === report.contributorId);
        return {
          ...item,
          progress: report.progress,
          status: report.progress >= 100 ? 'Completed' : 'In Progress',
          checkIn: {
            ...existing,
            // The silence is broken; a standing nudge has served its purpose.
            lastNudgedOn: undefined,
            reports: [
              ...reports,
              { ...report, reportedOn: report.reportedOn ?? todayIso() },
            ],
          },
          recentActivity: [
            {
              id: Date.now(),
              user: {
                name: contributor?.name ?? report.contributorId,
                avatar: contributor?.avatar ?? '??',
              },
              action: `filed a status check-in: ${report.note}`,
              time: 'just now',
            },
            ...item.recentActivity,
          ].slice(0, 10),
        };
      }),
    );
  };

  return (
    <ActionItemContext.Provider
      value={{
        actionItems,
        getActionItemById,
        addActionItem,
        updateActionItem,
        setCheckInCadence,
        nudge,
        nudgeMany,
        recordCheckIn,
      }}
    >
      {children}
    </ActionItemContext.Provider>
  );
};

export const useActionItems = (): ActionItemContextType => {
  const ctx = useContext(ActionItemContext);
  if (!ctx) {
    throw new Error('useActionItems must be used within an ActionItemProvider');
  }
  return ctx;
};
