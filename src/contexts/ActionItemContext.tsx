import React, { createContext, useContext, useState } from 'react';
import { ActionItem, NewItemForm, CheckInCadence } from '../components/ActionItems/types';
import { MOCK_ACTION_ITEMS } from '../components/ActionItems/constants';
import { calculateProgress } from '../components/ActionItems/utils';
import { getCurrentCheckInDueDate } from '../components/ActionItems/checkIn';

/**
 * The single store behind both action-item surfaces:
 *  - Tasks & Action Items (`/tasks-action-items`) — the current user's slice.
 *  - Rolling Action Items (`/critical-functions`, Actions tab) — the lead team's
 *    project tracker across everyone.
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
  /** File one contributor's report for a check-in window. */
  recordCheckIn: (
    id: string,
    report: { contributorId: string; dueOn: string; progress: number; note: string; reportedOn?: string },
  ) => void;
}

const ActionItemContext = createContext<ActionItemContextType | undefined>(undefined);

const todayIso = () => new Date().toISOString().split('T')[0];

const daysAgo = (days: number) =>
  new Date(Date.now() - days * 86_400_000).toISOString().split('T')[0];

/**
 * Seed the demo with cadences AND real reporting history, so the board opens on
 * the states it exists to surface: two projects that have gone quiet at high
 * percentages, and one that is genuinely moving. A seed with no history would
 * make every project look identically stalled, which teaches the wrong thing.
 *
 * `daysSilent` drives the last report's date; `trend` is the reported progress
 * over successive check-ins, oldest first.
 */
const CADENCE_SEED: Record<
  string,
  { cadence: CheckInCadence; contributorId: string; daysSilent: number; trend: number[]; notes: string[] }
> = {
  ACTION001: {
    cadence: 'weekly',
    contributorId: '1',
    daysSilent: 21,
    // Deliberately flat: reported the same figure twice, then went silent. This
    // is the case a percent-complete bar renders as two-thirds healthy.
    trend: [65, 65],
    notes: ['Engine section opened up', 'Structural inspection still outstanding'],
  },
  ACTION002: {
    cadence: 'biweekly',
    contributorId: '1',
    daysSilent: 1,
    trend: [15, 30, 55],
    notes: ['Started the VIP file review', 'Half the files re-checked', 'Emergency protocols redrafted'],
  },
  ACTION003: {
    cadence: 'monthly',
    contributorId: '1',
    daysSilent: 34,
    trend: [75, 75],
    notes: ['Equipment inspection done', 'Final report still outstanding'],
  },
};

const seedActionItems = (): ActionItem[] =>
  MOCK_ACTION_ITEMS.map(item => {
    if (item.checkIn) return item;

    const seed = CADENCE_SEED[item.id];
    if (!seed) return { ...item, checkIn: { cadence: 'none' as CheckInCadence, reports: [] } };

    // Space the historical reports one cadence apart — that is what a project
    // reporting on schedule and then falling silent actually looks like.
    const spacing = { weekly: 7, biweekly: 14, monthly: 30, none: 14 }[seed.cadence];
    const reports = seed.trend.map((progress, index) => {
      const age = seed.daysSilent + (seed.trend.length - 1 - index) * spacing;
      const on = daysAgo(age);
      return {
        contributorId: seed.contributorId,
        dueOn: on,
        reportedOn: on,
        progress,
        note: seed.notes[index] ?? 'Status update',
      };
    });

    const seeded: ActionItem = {
      ...item,
      progress: seed.trend[seed.trend.length - 1],
      checkIn: {
        cadence: seed.cadence,
        startedOn: daysAgo(seed.daysSilent + seed.trend.length * spacing),
        reports,
      },
    };

    // Re-point the newest report at the window that is actually open, so a
    // project someone reported on yesterday counts toward the reporting rate
    // rather than reading as silent-but-somehow-compliant.
    const currentWindow = getCurrentCheckInDueDate(seeded, todayIso());
    const newest = reports[reports.length - 1];
    if (currentWindow && newest && newest.reportedOn >= currentWindow) {
      newest.dueOn = currentWindow;
    }

    return seeded;
  });

const initialsOf = (name: string) =>
  name.split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase();

export const ActionItemProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [actionItems, setActionItems] = useState<ActionItem[]>(seedActionItems);

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
