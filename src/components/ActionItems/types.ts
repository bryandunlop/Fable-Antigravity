/**
 * How often the lead team wants a status report from each contributor on a
 * project. `none` means the project is tracked but nobody is chased.
 */
export type CheckInCadence = 'none' | 'weekly' | 'biweekly' | 'monthly';

/** One contributor's answer to a scheduled check-in. */
export interface CheckInReport {
  contributorId: string;
  /** ISO date (YYYY-MM-DD) of the check-in window this report answers. */
  dueOn: string;
  reportedOn: string;
  progress: number;
  note: string;
}

export interface ProjectCheckIn {
  cadence: CheckInCadence;
  /**
   * ISO date the cadence counts from. Defaults to the item's assignedDate when
   * absent, so an item created without an explicit anchor still schedules.
   */
  startedOn?: string;
  reports: CheckInReport[];
  /**
   * ISO date a lead last poked this project outside its cadence. Silence is the
   * signal the board ranks on, so the ability to break it on demand — rather
   * than wait for the next window — is part of the model, not a UI nicety.
   */
  lastNudgedOn?: string;
}

/**
 * Phase 2 (declared, not yet editable): a named data point the lead team wants
 * tracked over the life of the project, e.g. "aircraft converted".
 */
export interface ProjectMetric {
  id: string;
  label: string;
  unit?: string;
  target?: number;
  history: Array<{ recordedOn: string; value: number }>;
}

/**
 * Phase 3 (declared, not yet wired): projects whose status can be computed from
 * records already in another module rather than reported by hand.
 */
export interface ProjectModuleLink {
  module: 'Audit' | 'Hazard' | 'Waiver' | 'Document';
  recordId: string;
}

export interface ActionItem {
  id: string;
  title: string;
  description: string;
  module: string;
  assignedBy: string;
  assignedDate: string;
  dueDate: string;
  priority: string;
  status: string;
  progress: number;
  contributors: Array<{
    id: string;
    name: string;
    role: string;
    avatar: string;
  }>;
  recentActivity: Array<{
    id: number;
    user: { name: string; avatar: string };
    action: string;
    time: string;
  }>;
  sections: Array<{
    name: string;
    status: string;
  }>;
  sectionsComplete: number;
  totalSections: number;
  /** Lead-team project tracking. Absent on items derived from other modules. */
  checkIn?: ProjectCheckIn;
  metrics?: ProjectMetric[];
  linkedRecords?: ProjectModuleLink[];
}

export interface NewItemForm {
  title: string;
  description: string;
  module: string;
  priority: string;
  dueDate: string;
  sections: string[];
  checkInCadence: CheckInCadence;
}

export interface ActionItemsProps {
  userRole: string;
}