export type Role = 'PILOT' | 'MAINTENANCE';
export type SubItem = { label: string; to: string; match?: (p: string) => boolean };
export type NavGroup = { key: string; label: string; to: string; match: (p: string) => boolean; sub?: SubItem[]; badge?: 'red' | 'urgent' };

const sw = (prefix: string) => (p: string) => p.startsWith(prefix);
const melReadMatch = (p: string) => p.startsWith('/tech-log/mel') && !p.startsWith('/tech-log/admin');

const tripsMatch = (p: string) =>
  p === '/tech-log' || p.startsWith('/tech-log/trips') || p.startsWith('/tech-log/journey') || p.startsWith('/tech-log/intermittent');
const pilotFleetMatch = (p: string) => p.startsWith('/tech-log/fleet') || p.startsWith('/tech-log/aircraft');

export const GROUPS_PILOT: NavGroup[] = [
  {
    key: 'trips', label: 'Trips', to: '/tech-log', match: tripsMatch,
    sub: [
      { label: 'My trips', to: '/tech-log/trips', match: (p) => p === '/tech-log' || p.startsWith('/tech-log/trips') },
      { label: 'Journey log', to: '/tech-log/journey' },
      { label: 'Nuisance items', to: '/tech-log/intermittent' },
    ],
  },
  { key: 'fleet', label: 'Fleet', to: '/tech-log/fleet', match: pilotFleetMatch, badge: 'red' },
  { key: 'workqueue', label: 'Work Queue', to: '/tech-log/work-queue', match: sw('/tech-log/work-queue'), badge: 'urgent' },
  // D61 §5 — Bryan on who sees the maintenance-time rollup: "I think all." Pilots get it as a
  // top-level link because the pilot nav has no records group to hang it under.
  { key: 'metrics', label: 'Metrics', to: '/tech-log/metrics', match: sw('/tech-log/metrics') },
];

export const GROUPS_MAINT: NavGroup[] = [
  // Maintenance lands on the Work Queue ("what needs me"); Fleet stays one click away.
  { key: 'fleet', label: 'Fleet', to: '/tech-log/fleet', match: pilotFleetMatch, badge: 'red' },
  { key: 'workqueue', label: 'Work Queue', to: '/tech-log/work-queue', match: (p) => p === '/tech-log' || p.startsWith('/tech-log/work-queue') || p.startsWith('/tech-log/work-cards'), badge: 'urgent' },
  // D28 maintenance planners — plan packages of work per tail (board + calendar with overlays).
  { key: 'planners', label: 'Planners', to: '/tech-log/planners', match: sw('/tech-log/planners') },
  {
    key: 'airworthiness', label: 'Airworthiness', to: '/tech-log/airworthiness/forecast',
    match: (p) => p.startsWith('/tech-log/airworthiness'),
    sub: [
      { label: 'Coming due', to: '/tech-log/airworthiness/forecast' },
      { label: 'Times', to: '/tech-log/airworthiness/times' },
      { label: 'AD / SB', to: '/tech-log/airworthiness/adsb' },
      { label: 'Work Orders', to: '/tech-log/airworthiness/workorders' },
    ],
  },
  {
    key: 'records', label: 'Records', to: '/tech-log/mel',
    match: (p) => melReadMatch(p) || ['/tech-log/releases', '/tech-log/analytics', '/tech-log/metrics', '/tech-log/audit', '/tech-log/trips', '/tech-log/intermittent', '/tech-log/defects', '/tech-log/deferrals'].some(r => p.startsWith(r)),
    sub: [
      { label: 'MEL', to: '/tech-log/mel', match: melReadMatch },
      { label: 'Releases', to: '/tech-log/releases' },
      { label: 'Audit', to: '/tech-log/audit' },
      { label: 'Analytics', to: '/tech-log/analytics' },
      { label: 'Maintenance time', to: '/tech-log/metrics' },
      { label: 'Trips', to: '/tech-log/trips' },
      { label: 'Intermittent', to: '/tech-log/intermittent' },
    ],
  },
  {
    key: 'admin', label: 'Admin', to: '/tech-log/admin/fleet',
    match: (p) => p.startsWith('/tech-log/admin') || p.startsWith('/tech-log/integration'),
    sub: [
      { label: 'Fleet admin', to: '/tech-log/admin/fleet' },
      { label: 'Personnel', to: '/tech-log/admin/personnel' },
      { label: 'MEL admin', to: '/tech-log/admin/mel' },
      { label: 'Import MEL revision', to: '/tech-log/admin/mel/import' },
      { label: 'Checklists', to: '/tech-log/admin/checklists' },
      { label: 'Integration', to: '/tech-log/integration' },
    ],
  },
];

export function resolveNav(role: Role, pathname: string): { groups: NavGroup[]; activeGroup: NavGroup; activeSub?: SubItem } {
  const groups = role === 'MAINTENANCE' ? GROUPS_MAINT : GROUPS_PILOT;
  const activeGroup = groups.find(g => g.match(pathname)) ?? groups[0];
  const activeSub = activeGroup.sub?.find(s => (s.match ? s.match(pathname) : pathname.startsWith(s.to)));
  return { groups, activeGroup, activeSub };
}
