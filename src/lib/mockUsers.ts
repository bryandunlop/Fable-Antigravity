// src/lib/mockUsers.ts

export const SYSTEM_USERS = [
  {
    id: 'USR001',
    name: 'Captain John Smith',
    email: 'j.smith@flightops.com',
    roles: ['pilot', 'chief-pilot', 'airport-evaluator'],
    status: 'Active',
    lastLogin: '2025-02-01 14:30',
    certifications: ['ATP', 'Type Rating G650', 'Medical Class 1'],
    department: 'Flight Operations',
    hireDate: '2018-03-15'
  },
  {
    id: 'USR002',
    name: 'Sarah Wilson',
    email: 's.wilson@flightops.com',
    roles: ['maintenance', 'dom'],
    status: 'Active',
    lastLogin: '2025-02-02 09:15',
    department: 'Maintenance',
    hireDate: '2020-06-10'
  },
  {
    id: 'USR003',
    name: 'Mike Johnson',
    email: 'm.johnson@flightops.com',
    // D75 — the cabin ROLES used to sit on one persona, so `resolveUserId('inflight')` and
    // `resolveUserId('fa-manager')` returned the same user. With cabin knowledge on four-eyes that
    // made the happy path unreachable in the demo: every FA submission came back "awaiting another
    // approver", because the author and the only approver were literally the same person.
    roles: ['inflight', 'lead-fa'],
    status: 'Active',
    lastLogin: '2025-02-01 16:45',
    department: 'Cabin Services',
    hireDate: '2019-11-22'
  },
  {
    id: 'USR014',
    name: 'Elena Marsh',
    email: 'e.marsh@flightops.com',
    roles: ['fa-manager', 'commissary-manager'],
    status: 'Active',
    lastLogin: '2025-02-02 08:30',
    department: 'Cabin Services',
    hireDate: '2018-03-05'
  },
  {
    id: 'USR004',
    name: 'David Brown',
    email: 'd.brown@flightops.com',
    roles: ['lead', 'vp'],
    status: 'Active',
    lastLogin: '2025-02-02 11:00',
    department: 'Operations',
    hireDate: '2016-01-08'
  },
  // D85 — Lead Team is the waiver chain's final approver, and naming an
  // individual EXCLUDES the rest of the role. One lead user made both the person
  // picker and the reassignment path undemonstrable: there was nobody else to
  // pick, and nowhere to reassign to. Same fix D75 applied to the cabin roles.
  // Added AFTER David Brown so resolveUserId('lead') still resolves to him.
  {
    id: 'USR015',
    name: 'Priya Raman',
    email: 'p.raman@flightops.com',
    roles: ['lead'],
    status: 'Active',
    lastLogin: '2025-02-02 07:50',
    department: 'Operations',
    hireDate: '2017-09-12'
  },
  {
    id: 'USR016',
    name: 'Marcus Webb',
    email: 'm.webb@flightops.com',
    roles: ['lead'],
    status: 'Active',
    lastLogin: '2025-02-01 19:20',
    department: 'Operations',
    hireDate: '2021-04-26'
  },
  {
    id: 'USR005',
    name: 'Lisa Anderson',
    email: 'l.anderson@flightops.com',
    roles: ['admin'],
    status: 'Inactive',
    lastLogin: '2025-01-28 13:20',
    department: 'IT',
    hireDate: '2017-09-12'
  },
  {
    id: 'USR006',
    name: 'Robert Garcia',
    email: 'r.garcia@flightops.com',
    roles: ['safety', 'vp'],
    status: 'Active',
    lastLogin: '2025-02-02 08:00',
    department: 'Safety',
    hireDate: '2019-04-01'
  },
  {
    id: 'USR007',
    name: 'First Officer Emily Chen',
    email: 'e.chen@flightops.com',
    roles: ['pilot', 'standards'],
    status: 'Active',
    lastLogin: '2025-02-01 18:00',
    department: 'Flight Operations',
    hireDate: '2021-08-15'
  },
  {
    id: 'USR008',
    name: 'Tom Parker',
    email: 't.parker@flightops.com',
    roles: ['maintenance'],
    status: 'Active',
    lastLogin: '2025-02-02 07:30',
    department: 'Maintenance',
    hireDate: '2022-02-14'
  },
  {
    id: 'USR009',
    name: 'Kevin Miller',
    email: 'k.miller@flightops.com',
    roles: ['maintenance', 'maintenance-coordinator'],
    status: 'Active',
    lastLogin: '2025-02-02 10:00',
    department: 'Maintenance',
    hireDate: '2021-03-20'
  },
  {
    id: 'USR010',
    name: 'Amanda Brooks',
    email: 'a.brooks@flightops.com',
    roles: ['maintenance', 'chief-inspector', 'shift-lead'],
    status: 'Active',
    lastLogin: '2025-02-02 11:30',
    department: 'Maintenance',
    hireDate: '2020-05-15'
  },
  // D99 — the executive persona. A principal, not an operator: reads the fleet
  // week view, never works a queue. resolveUserId('executive') lands here.
  {
    id: 'USR017',
    name: 'Victoria Hale',
    email: 'v.hale@corp.com',
    roles: ['executive'],
    status: 'Active',
    lastLogin: '2025-02-02 07:15',
    department: 'Corporate',
    hireDate: '2015-02-02'
  },
  // D100 — the executive administrator: the EA who books and manages travel on a
  // principal's behalf. Named to match the booking portal's own EA fixture
  // (booking-portal/mockData EA_NAME) so one person runs through both.
  {
    id: 'USR018',
    name: 'Dana Whitfield',
    email: 'd.whitfield@corp.com',
    roles: ['admin-assistant'],
    status: 'Active',
    lastLogin: '2025-02-02 08:05',
    department: 'Corporate',
    hireDate: '2019-06-03'
  },
  // Added AFTER Victoria Hale so resolveUserId('executive') still resolves to her. She is the
  // plain executive; he holds the per-person 'full-schedule' grant, so the two side by side show
  // exactly what that grant changes on the fleet week (Bryan, 2026-08-31).
  // USR019, not USR018: the availability branch and the D100 booking branch each minted an
  // USR018 in parallel. Dana shipped first, so she keeps the number (Bryan, 2026-08-31).
  {
    id: 'USR019',
    name: 'Gordon Reyes',
    email: 'g.reyes@corp.com',
    roles: ['executive', 'full-schedule'],
    status: 'Active',
    lastLogin: '2025-02-02 06:40',
    department: 'Corporate',
    hireDate: '2013-06-17'
  }
];

// Comprehensive aviation role definitions
export const ROLE_CATEGORIES = {
  'Flight Operations': [
    { value: 'pilot', label: 'Pilot', description: 'Flight crew member' },
    { value: 'chief-pilot', label: 'Chief Pilot', description: 'Head of flight operations' },
  ],
  'Cabin': [
    { value: 'inflight', label: 'Flight Attendant', description: 'Cabin crew member' },
    { value: 'fa-manager', label: 'Flight Attendant Manager', description: 'Manager of cabin services' },
    { value: 'commissary-manager', label: 'Commissary Manager', description: 'Stockroom and supply management' },
  ],
  'Maintenance': [
    { value: 'maintenance', label: 'Maintenance', description: 'Maintenance and engineering' },
    { value: 'chief-inspector', label: 'Chief Inspector', description: 'Quality control and inspections' },
    { value: 'shift-lead', label: 'Shift Lead', description: 'Maintenance shift leadership' },
  ],
  'Safety': [
    { value: 'safety', label: 'Safety', description: 'Safety reporting and compliance' },
  ],
  'Management & Administration': [
    { value: 'lead', label: 'Lead Team', description: 'Management and leadership' },
    { value: 'scheduling', label: 'Scheduling', description: 'Flight scheduling and dispatch' },
    { value: 'document-manager', label: 'Document Manager', description: 'Document and manual management' },
    { value: 'procedural-specialist', label: 'Procedural Specialist', description: 'Procedural bulletin management' },
    { value: 'hr', label: 'HR', description: 'Human resources' },
    { value: 'admin', label: 'Administrator', description: 'System administration' },
  ],
  // The principal and the person who books for them are one working pair, so
  // they sit together in their own group rather than buried at the bottom of
  // Management & Administration with HR and system admin.
  'Executive Office': [
    // D99 — executives are internal platform users (D77 Q-D, resolved 2026-08-29).
    { value: 'executive', label: 'Executive', description: 'Fleet visibility for principals' },
    // D100 — the EA who books and manages travel for a principal. The role id is
    // 'admin-assistant', which the booking portal and D77 already speak.
    { value: 'admin-assistant', label: 'Executive Administrator', description: 'Books and manages travel for a principal' },
  ]
};

export const ALL_ROLES = Object.values(ROLE_CATEGORIES).flat();

export const ADDITIONAL_ROLES = [
  { id: 'vp', label: 'VP' },
  { id: 'assistant-chief-pilot', label: 'Assistant Chief Pilot' },
  { id: 'dom', label: 'Director of Maintenance' },
  { id: 'maintenance-coordinator', label: 'Maintenance Coordinator' },
  { id: 'scheduling-manager', label: 'Scheduling Manager' },
  { id: 'lead-scheduler', label: 'Lead Scheduler' },
  { id: 'lead-fa', label: 'Lead Flight Attendant' },
  { id: 'full-schedule', label: 'Full Schedule Access' },
  { id: 'standards', label: 'Standards' },
  { id: 'training', label: 'Training' },
  { id: 'reg-comp', label: 'Reg & Comp' },
  { id: 'hr-role', label: 'HR' },
  { id: 'airport-evaluator', label: 'Airport Evaluation Officer' }
];

export const getRoleLabelByValue = (value: string) => 
  ALL_ROLES.find(r => r.value === value)?.label || 
  ADDITIONAL_ROLES.find(r => r.id === value)?.label || 
  value;
