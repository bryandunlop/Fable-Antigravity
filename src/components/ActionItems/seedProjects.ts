import { ActionItem, CheckInCadence } from './types';
import { MOCK_ACTION_ITEMS } from './constants';
import { getCurrentCheckInDueDate } from './checkIn';

/**
 * The demo roster for Rolling Action Items.
 *
 * The lead team tracks 20+ projects at once, and a surface that only ever holds
 * four looks fine while hiding every problem scale creates — so the seed carries
 * a realistic load, spread across owners, with reporting history attached.
 *
 * `daysSilent` is how long since that project's last status report, and `trend`
 * is the reported progress across successive check-ins, oldest last-first. A
 * repeated figure is a FLAT trend — a project that has stopped moving while
 * still reading as three-quarters done, which is the case the board exists to
 * expose. Several are deliberately flat.
 */

interface ProjectSeed {
  id: string;
  title: string;
  description: string;
  department: string;
  priority: string;
  /** First name is the owner — the person the chase list groups under. */
  people: string[];
  assignedBy: string;
  cadence: CheckInCadence;
  daysSilent: number;
  trend: number[];
  dueInDays: number;
}

const SEEDS: ProjectSeed[] = [
  { id: 'ACTION010', title: 'Ramp lighting survey', description: 'Survey and cost the apron lighting replacement across both bases', department: 'Ground Operations', priority: 'Medium', people: ['David Brown', 'Carlos Martinez'], assignedBy: 'Safety Manager', cadence: 'weekly', daysSilent: 22, trend: [40, 40], dueInDays: 30 },
  { id: 'ACTION011', title: 'De-ice contract review', description: 'Re-tender the winter de-icing contract before the season', department: 'Ground Operations', priority: 'High', people: ['David Brown'], assignedBy: 'Operations Manager', cadence: 'biweekly', daysSilent: 15, trend: [15, 15], dueInDays: 45 },
  { id: 'ACTION012', title: 'Hangar door actuator replacement', description: 'Replace the failing actuator on hangar door 2', department: 'Maintenance', priority: 'High', people: ['John Smith', 'Tom Wilson'], assignedBy: 'Maintenance Manager', cadence: 'weekly', daysSilent: 9, trend: [30, 55], dueInDays: 14 },
  { id: 'ACTION013', title: 'G800 entry-into-service plan', description: 'Build the operational readiness plan for the incoming G800s', department: 'Flight Operations', priority: 'Critical', people: ['Sarah Wilson', 'Lisa Chen', 'Michael Peterson'], assignedBy: 'Chief Pilot', cadence: 'weekly', daysSilent: 2, trend: [10, 25, 45], dueInDays: 120 },
  { id: 'ACTION014', title: 'Crew rest facility refit', description: 'Refit the crew rest area at the main base', department: 'Passenger Services', priority: 'Low', people: ['Sarah Wilson'], assignedBy: 'Operations Manager', cadence: 'monthly', daysSilent: 12, trend: [60, 70], dueInDays: 90 },
  { id: 'ACTION015', title: 'Emergency procedures manual revision', description: 'Align the emergency procedures manual with the current regulation set', department: 'Safety', priority: 'Critical', people: ['Lisa Chen', 'David Brown'], assignedBy: 'Safety Manager', cadence: 'weekly', daysSilent: 4, trend: [35, 50, 65], dueInDays: 21 },
  { id: 'ACTION016', title: 'Fuel tracking system rollout', description: 'Deploy automated fuel tracking across the fleet', department: 'Flight Operations', priority: 'Medium', people: ['Michael Peterson', 'Robert Brown'], assignedBy: 'Operations Manager', cadence: 'biweekly', daysSilent: 31, trend: [40, 40], dueInDays: 60 },
  { id: 'ACTION017', title: 'Recurrent training schedule rebuild', description: 'Rebuild the recurrent training calendar around the new fleet mix', department: 'Flight Operations', priority: 'High', people: ['Lisa Chen'], assignedBy: 'Chief Pilot', cadence: 'weekly', daysSilent: 6, trend: [20, 35], dueInDays: 40 },
  { id: 'ACTION018', title: 'Tooling calibration audit', description: 'Audit calibration records for all shop tooling', department: 'Maintenance', priority: 'Medium', people: ['Tom Wilson', 'Mike Johnson'], assignedBy: 'Chief Inspector', cadence: 'monthly', daysSilent: 41, trend: [55, 55], dueInDays: 25 },
  { id: 'ACTION019', title: 'Passenger wifi upgrade', description: 'Retrofit the fleet with the new Ka-band terminals', department: 'Passenger Services', priority: 'Medium', people: ['Robert Brown', 'Jennifer Park'], assignedBy: 'Operations Manager', cadence: 'biweekly', daysSilent: 3, trend: [5, 20], dueInDays: 150 },
  { id: 'ACTION020', title: 'Ground handling SOP refresh', description: 'Refresh the ground handling standard procedures after the ramp incident', department: 'Ground Operations', priority: 'High', people: ['Carlos Martinez'], assignedBy: 'Safety Manager', cadence: 'weekly', daysSilent: 17, trend: [45, 45], dueInDays: 20 },
  { id: 'ACTION021', title: 'Parts inventory reconciliation', description: 'Reconcile the parts store against the system of record', department: 'Maintenance', priority: 'Medium', people: ['Mike Johnson'], assignedBy: 'Maintenance Manager', cadence: 'biweekly', daysSilent: 5, trend: [25, 40], dueInDays: 35 },
  { id: 'ACTION022', title: 'Catering vendor review', description: 'Review catering vendor performance across all stations', department: 'Passenger Services', priority: 'Low', people: ['Jennifer Park'], assignedBy: 'Operations Manager', cadence: 'monthly', daysSilent: 8, trend: [30, 45], dueInDays: 75 },
  { id: 'ACTION023', title: 'ISBAO Stage III preparation', description: 'Prepare evidence and gap closure for the Stage III audit', department: 'Safety', priority: 'Critical', people: ['David Brown', 'Lisa Chen', 'Sarah Wilson'], assignedBy: 'Safety Manager', cadence: 'weekly', daysSilent: 1, trend: [30, 45, 60], dueInDays: 55 },
  { id: 'ACTION024', title: 'Hangar security access review', description: 'Review badge access lists for the hangar and shop areas', department: 'Ground Operations', priority: 'Medium', people: ['Carlos Martinez', 'Robert Brown'], assignedBy: 'Operations Manager', cadence: 'monthly', daysSilent: 24, trend: [50, 50], dueInDays: 30 },
  { id: 'ACTION025', title: 'Winter operations readiness', description: 'Confirm winter operations readiness across both bases', department: 'Ground Operations', priority: 'High', people: ['Michael Peterson'], assignedBy: 'Operations Manager', cadence: 'weekly', daysSilent: 0, trend: [15, 30], dueInDays: 65 },
  { id: 'ACTION026', title: 'Cabin knowledge library build-out', description: 'Populate the cabin knowledge library for both fleet types', department: 'Passenger Services', priority: 'Medium', people: ['Sarah Wilson', 'Jennifer Park'], assignedBy: 'Chief Pilot', cadence: 'biweekly', daysSilent: 11, trend: [20, 35], dueInDays: 80 },
  { id: 'ACTION027', title: 'MEL revision adoption', description: 'Adopt the latest MMEL revision and re-baseline the operator MEL', department: 'Maintenance', priority: 'Critical', people: ['Tom Wilson'], assignedBy: 'Chief Inspector', cadence: 'weekly', daysSilent: 13, trend: [70, 70], dueInDays: 10 },
  { id: 'ACTION028', title: 'Dispatch console refresh', description: 'Replace the dispatch console hardware and displays', department: 'Flight Operations', priority: 'Low', people: ['Robert Brown'], assignedBy: 'Operations Manager', cadence: 'monthly', daysSilent: 19, trend: [10, 25], dueInDays: 110 },
  { id: 'ACTION029', title: 'Fatigue risk policy update', description: 'Update the fatigue risk management policy for the longer G800 legs', department: 'Safety', priority: 'High', people: ['Lisa Chen', 'Michael Peterson'], assignedBy: 'Safety Manager', cadence: 'biweekly', daysSilent: 7, trend: [40, 55], dueInDays: 50 },
];

const CADENCE_DAYS: Record<CheckInCadence, number> = {
  none: 14,
  weekly: 7,
  biweekly: 14,
  monthly: 30,
};

/** Cadence and reporting history for the three richer originals. */
const ORIGINAL_HISTORY: Record<
  string,
  { cadence: CheckInCadence; daysSilent: number; trend: number[]; notes: string[] }
> = {
  ACTION001: {
    cadence: 'weekly',
    daysSilent: 21,
    trend: [65, 65],
    notes: ['Engine section opened up', 'Structural inspection still outstanding'],
  },
  ACTION002: {
    cadence: 'biweekly',
    daysSilent: 1,
    trend: [15, 30, 55],
    notes: ['Started the VIP file review', 'Half the files re-checked', 'Emergency protocols redrafted'],
  },
  ACTION003: {
    cadence: 'monthly',
    daysSilent: 34,
    trend: [75, 75],
    notes: ['Equipment inspection done', 'Final report still outstanding'],
  },
};

const todayIso = () => new Date().toISOString().split('T')[0];

const daysFromNow = (days: number) =>
  new Date(Date.now() + days * 86_400_000).toISOString().split('T')[0];

const initialsOf = (name: string) =>
  name.split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase();

/**
 * Attach a cadence and a run of historical reports to an item, spaced one
 * cadence apart so it reads like a project that reported on schedule and then
 * (in the silent cases) stopped.
 */
const withHistory = (
  item: ActionItem,
  spec: { cadence: CheckInCadence; daysSilent: number; trend: number[]; notes?: string[] },
): ActionItem => {
  const spacing = CADENCE_DAYS[spec.cadence];
  const reporterId = item.contributors[0]?.id ?? 'owner';

  const reports = spec.trend.map((progress, index) => {
    const age = spec.daysSilent + (spec.trend.length - 1 - index) * spacing;
    const on = daysFromNow(-age);
    return {
      contributorId: reporterId,
      dueOn: on,
      reportedOn: on,
      progress,
      note: spec.notes?.[index] ?? 'Status update filed',
    };
  });

  const seeded: ActionItem = {
    ...item,
    progress: spec.trend[spec.trend.length - 1],
    checkIn: {
      cadence: spec.cadence,
      startedOn: daysFromNow(-(spec.daysSilent + spec.trend.length * spacing)),
      reports,
    },
  };

  // Point the newest report at the window that is actually open, so a project
  // reported on yesterday counts toward the reporting rate.
  const currentWindow = getCurrentCheckInDueDate(seeded, todayIso());
  const newest = reports[reports.length - 1];
  if (currentWindow && newest && newest.reportedOn >= currentWindow) {
    newest.dueOn = currentWindow;
  }

  return seeded;
};

const fromSeed = (seed: ProjectSeed): ActionItem =>
  withHistory(
    {
      id: seed.id,
      title: seed.title,
      description: seed.description,
      department: seed.department,
      assignedBy: seed.assignedBy,
      assignedDate: daysFromNow(-90),
      dueDate: daysFromNow(seed.dueInDays),
      priority: seed.priority,
      status: 'In Progress',
      progress: seed.trend[seed.trend.length - 1],
      contributors: seed.people.map((name, index) => ({
        id: `${seed.id}-c${index}`,
        name,
        role: index === 0 ? 'Owner' : 'Contributor',
        avatar: initialsOf(name),
      })),
      recentActivity: [],
      sections: [],
      sectionsComplete: 0,
      totalSections: 0,
    },
    seed,
  );

/** Every project the Rolling Action Items board opens with. */
export const buildSeedActionItems = (): ActionItem[] => [
  ...MOCK_ACTION_ITEMS.map(item => {
    if (item.checkIn) return item;
    const spec = ORIGINAL_HISTORY[item.id];
    return spec ? withHistory(item, spec) : { ...item, checkIn: { cadence: 'none' as CheckInCadence, reports: [] } };
  }),
  ...SEEDS.map(fromSeed),
];
