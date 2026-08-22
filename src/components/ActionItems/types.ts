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

/** A cadence and the date it came into force. */
export interface CadencePeriod {
  cadence: CheckInCadence;
  from: string;
}

export interface ProjectCheckIn {
  cadence: CheckInCadence;
  /**
   * Every cadence this project has run on, oldest first.
   *
   * Without it, slowing a cadence rewrote the past: silence was judged against
   * the CURRENT rhythm, so moving a weekly project to monthly made twenty days
   * of silence stop counting instantly. A lead could make a stalled project
   * disappear from the board by agreeing to hear from it less often.
   */
  cadenceHistory?: CadencePeriod[];
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

export interface ProjectClosure {
  reason: string;
  closedOn: string;
  closedBy: string;
  /** Progress at the moment of closing — a project closed at 55% says so. */
  progressAtClose: number;
  /** What it was before, so reopening restores rather than guesses. */
  previousStatus: string;
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

/**
 * Where a derived task came from. Separate from `department` because the two
 * are different questions: a check-in on a Ground Operations project belongs to
 * Ground Operations AND is a check-in. One field answering both meant the UI
 * read a department name to decide what a task was.
 */
export type ActionItemSource = 'waiver' | 'audit' | 'hazard' | 'check-in';

export interface ActionItem {
  id: string;
  title: string;
  description: string;
  /** The department that owns this work. */
  department: string;
  /** Set only on tasks derived from another surface; absent on real projects. */
  source?: ActionItemSource;
  /**
   * Who owns this project. Ownership used to be positional — whoever happened
   * to sit at contributors[0] — so any code that reordered the array silently
   * handed the project to someone else.
   */
  ownerId?: string;
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
  /**
   * Why a project was closed. Closing one at 55% is a real decision someone
   * will ask about later, so the reason is captured at the moment it is made
   * rather than reconstructed from memory.
   */
  closure?: ProjectClosure;
  metrics?: ProjectMetric[];
  linkedRecords?: ProjectModuleLink[];
}

export interface NewItemForm {
  title: string;
  description: string;
  department: string;
  priority: string;
  dueDate: string;
  sections: string[];
  checkInCadence: CheckInCadence;
}

export interface ActionItemsProps {
  userRole: string;
}