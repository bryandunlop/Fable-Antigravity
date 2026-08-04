import React, { createContext, useContext, useEffect, useState } from 'react';
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
  setCheckInCadence: (id: string, cadence: CheckInCadence, on?: string) => void;
  /** Poke a project that has gone quiet, without waiting for the next window. */
  nudge: (id: string, on?: string) => void;
  /** Chase a whole group in one pass — one owner, or every quiet project. */
  nudgeMany: (ids: string[], on?: string) => void;
  /** Close a project with the reason it was closed, so it can be answered for later. */
  closeActionItem: (id: string, reason: string, closedBy: string, on?: string) => void;
  /** Undo a close — the project returns to whatever state its silence says it is. */
  reopenActionItem: (id: string) => void;
  /** File one contributor's report for a check-in window. */
  recordCheckIn: (
    id: string,
    report: { contributorId: string; dueOn: string; progress: number; note: string; reportedOn?: string },
  ) => void;
}

const ActionItemContext = createContext<ActionItemContextType | undefined>(undefined);

const STORAGE_KEY = 'antigravity_action_items';
const STORAGE_VERSION_KEY = 'antigravity_action_items_version';
/** Bump to discard stored projects when the seed or the shape changes. */
const STORAGE_VERSION = 'v1';

/**
 * Read synchronously in the state initialiser rather than in an effect, so the
 * board never renders once with an empty list and then again with the real one.
 * A corrupt or stale blob falls back to the seed instead of throwing — losing
 * demo state is annoying; a white screen is worse.
 */
const loadActionItems = (): ActionItem[] => {
  try {
    if (localStorage.getItem(STORAGE_VERSION_KEY) !== STORAGE_VERSION) return buildSeedActionItems();
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return buildSeedActionItems();
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) && parsed.length ? (parsed as ActionItem[]) : buildSeedActionItems();
  } catch {
    return buildSeedActionItems();
  }
};

const todayIso = () => new Date().toISOString().split('T')[0];

const initialsOf = (name: string) =>
  name.split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase();

export const ActionItemProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [actionItems, setActionItems] = useState<ActionItem[]>(loadActionItems);

  // Persist unconditionally, including an empty list — "I closed everything"
  // is a real state and must survive a reload like any other.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(actionItems));
      localStorage.setItem(STORAGE_VERSION_KEY, STORAGE_VERSION);
    } catch {
      // Quota or a locked-down browser: the session still works in memory.
    }
  }, [actionItems]);

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
      department: form.department,
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

  const setCheckInCadence = (id: string, cadence: CheckInCadence, on?: string) => {
    const from = on ?? todayIso();
    setActionItems(prev =>
      prev.map(item => {
        if (item.id !== id) return item;
        const existing = item.checkIn;
        if (existing?.cadence === cadence) return item;

        // Keep the rhythm that was in force before this change, so a stretch of
        // silence is still judged against what was expected at the time.
        const history = existing?.cadenceHistory ?? (
          existing ? [{ cadence: existing.cadence, from: existing.startedOn ?? item.assignedDate }] : []
        );

        return {
          ...item,
          checkIn: {
            startedOn: existing?.startedOn ?? item.assignedDate,
            reports: existing?.reports ?? [],
            lastNudgedOn: existing?.lastNudgedOn,
            cadenceHistory: [...history, { cadence, from }],
            cadence,
          },
        };
      }),
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

  const closeActionItem = (id: string, reason: string, closedBy: string, on?: string) => {
    const closedOn = on ?? todayIso();
    setActionItems(prev =>
      prev.map(item =>
        item.id === id
          ? {
              ...item,
              status: 'Completed',
              closure: { reason, closedOn, closedBy, progressAtClose: item.progress },
              recentActivity: [
                {
                  id: Date.now(),
                  user: { name: closedBy, avatar: initialsOf(closedBy) },
                  action: `closed this project at ${item.progress}%: ${reason}`,
                  time: 'just now',
                },
                ...item.recentActivity,
              ].slice(0, 10),
            }
          : item,
      ),
    );
  };

  const reopenActionItem = (id: string) => {
    setActionItems(prev =>
      prev.map(item => {
        if (item.id !== id) return item;
        const { closure, ...rest } = item;
        return {
          ...rest,
          // Back to In Progress — the stall helpers re-derive quiet from silence.
          status: 'In Progress',
          recentActivity: [
            {
              id: Date.now(),
              user: { name: 'Lead Team', avatar: 'LT' },
              action: 'reopened this project',
              time: 'just now',
            },
            ...item.recentActivity,
          ].slice(0, 10),
        };
      }),
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
        closeActionItem,
        reopenActionItem,
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
