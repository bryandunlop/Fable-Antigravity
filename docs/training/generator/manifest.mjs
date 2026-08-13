// Screens to capture per role.
// Excluded by decision: Safety domain (/safety, /asap-report), /tech-log, /fir, /scheduling-command.
// Role labels are the exact strings in the login role picker.

export const SHARED = ['/', '/tasks-action-items', '/approvals', '/documents', '/vacation-request'];

export const ROLES = [
  {
    key: 'pilot', label: 'Pilot', kind: 'base',
    paths: ['/pilot-workspace', '/frat', '/frat/standalone', '/frat/my-submissions',
            '/currency-dashboard', '/schedule', '/upcoming-flights', '/fuel-load-request',
            '/airport-evaluations', '/aircraft-cleaning', ...SHARED],
  },
  {
    key: 'chief-pilot', label: 'Chief Pilot', kind: 'manager', base: 'pilot',
    paths: ['/pilot-workspace', '/approvals', '/airport-evaluations',
            '/airport-evaluations/worklist', '/airport-evaluations/review',
            '/airport-evaluations/flags', '/admin/airport-evaluation-officer',
            '/currency-dashboard', '/crew-scheduling-workload'],
  },
  {
    key: 'inflight', label: 'Flight Attendant', kind: 'base',
    paths: ['/upcoming-flights', '/passenger-database', '/catering-tracker',
            '/post-flight-checklist', '/aircraft-inventory', '/aircraft-cleaning',
            '/inventory-v2/trips', '/inventory-v2/inspections', '/inventory-v2/commissary',
            '/inventory-v2/replenish', '/inventory-v2/unit-requests', ...SHARED],
  },
  {
    key: 'fa-manager', label: 'Flight Attendant Manager', kind: 'manager', base: 'inflight',
    paths: ['/', '/approvals', '/inventory-v2/commissary', '/inventory-v2/settings',
            '/inventory-v2/inspections', '/inventory-v2/trips', '/documents'],
  },
  {
    key: 'scheduling', label: 'Scheduling', kind: 'base',
    paths: ['/scheduling-dashboard', '/crew-scheduling-workload', '/trip-coordination',
            '/passenger-forms', '/passenger-currency', '/currency-dashboard', ...SHARED],
  },
  {
    key: 'scheduling-manager', label: 'Scheduling Manager', kind: 'manager', base: 'scheduling',
    paths: ['/', '/approvals', '/crew-scheduling-workload', '/scheduling-dashboard', '/documents'],
  },
  {
    key: 'maintenance', label: 'Maintenance', kind: 'base',
    paths: ['/parts-inventory', '/tech-work-analytics', '/turndown-reports', '/turndown-form',
            '/car-tracking', '/airport-services', '/fuel-farm', '/grat/standalone',
            '/aircraft-cleaning', ...SHARED],
  },
  {
    key: 'chief-inspector', label: 'Chief Inspector', kind: 'manager', base: 'maintenance',
    paths: ['/', '/approvals', '/turndown-reports', '/tech-work-analytics',
            '/parts-inventory', '/documents'],
  },
  {
    key: 'dom', label: 'Director of Maintenance', kind: 'manager', base: 'maintenance',
    paths: ['/', '/approvals', '/tech-work-analytics', '/turndown-reports',
            '/parts-inventory', '/car-tracking', '/airport-services', '/documents'],
  },
  {
    key: 'lead', label: 'Lead Team', kind: 'base',
    paths: ['/lead-dashboard', '/manager-insights', '/live-metrics', '/critical-functions',
            '/crew-scheduling-workload', '/currency-dashboard', '/turndown-reports',
            '/', '/tasks-action-items', '/approvals', '/documents'],
  },
];
