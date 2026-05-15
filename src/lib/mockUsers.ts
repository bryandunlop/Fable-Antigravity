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
    roles: ['inflight', 'lead-fa', 'fa-manager', 'commissary-manager'],
    status: 'Active',
    lastLogin: '2025-02-01 16:45',
    department: 'Cabin Services',
    hireDate: '2019-11-22'
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
