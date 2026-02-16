import { ActionItem } from './types';

export const MOCK_ACTION_ITEMS: ActionItem[] = [
  {
    id: 'ACTION001',
    title: 'Complete 100-hour inspection on N123AB',
    description: 'Comprehensive 100-hour inspection including engine, avionics, and structural checks',
    module: 'Maintenance',
    assignedBy: 'Chief Maintenance Officer',
    assignedDate: '2025-02-01',
    dueDate: '2025-02-15',
    priority: 'High',
    status: 'In Progress',
    progress: 65,
    contributors: [
      { id: '1', name: 'John Smith', role: 'Lead Mechanic', avatar: 'JS' },
      { id: '2', name: 'Mike Johnson', role: 'Avionics Tech', avatar: 'MJ' },
      { id: '3', name: 'Tom Wilson', role: 'Inspector', avatar: 'TW' }
    ],
    recentActivity: [
      {
        id: 1,
        user: { name: 'John Smith', avatar: 'JS' },
        action: 'completed engine oil pressure check',
        time: '2 hours ago'
      },
      {
        id: 2,
        user: { name: 'Mike Johnson', avatar: 'MJ' },
        action: 'verified avionics system functionality',
        time: '4 hours ago'
      }
    ],
    sections: [
      { name: 'Engine Inspection', status: 'completed' },
      { name: 'Avionics Check', status: 'completed' },
      { name: 'Structural Inspection', status: 'in-progress' },
      { name: 'Documentation Review', status: 'pending' }
    ],
    sectionsComplete: 2,
    totalSections: 4
  },
  {
    id: 'ACTION002',
    title: 'Update passenger allergy database',
    description: 'Review and update allergy information for VIP passengers, ensure emergency protocols are current',
    module: 'Passenger Services',
    assignedBy: 'Head of Passenger Services',
    assignedDate: '2025-02-02',
    dueDate: '2025-02-08',
    priority: 'Critical',
    status: 'In Progress',
    progress: 30,
    contributors: [
      { id: '1', name: 'Sarah Wilson', role: 'Flight Attendant', avatar: 'SW' },
      { id: '2', name: 'Dr. Lisa Chen', role: 'Medical Advisor', avatar: 'LC' }
    ],
    recentActivity: [
      {
        id: 1,
        user: { name: 'Sarah Wilson', avatar: 'SW' },
        action: 'reviewed passenger files for allergies',
        time: '1 hour ago'
      },
      {
        id: 2,
        user: { name: 'Dr. Lisa Chen', avatar: 'LC' },
        action: 'provided updated medical protocols',
        time: '6 hours ago'
      }
    ],
    sections: [
      { name: 'Current Database Review', status: 'completed' },
      { name: 'Medical Protocol Updates', status: 'in-progress' },
      { name: 'Emergency Response Plans', status: 'pending' },
      { name: 'Training Documentation', status: 'pending' }
    ],
    sectionsComplete: 1,
    totalSections: 4
  },
  {
    id: 'ACTION003',
    title: 'Safety audit for ground operations',
    description: 'Perform comprehensive safety audit of ground handling procedures and equipment',
    module: 'Safety',
    assignedBy: 'Safety Manager',
    assignedDate: '2025-01-28',
    dueDate: '2025-02-10',
    priority: 'High',
    status: 'In Progress',
    progress: 75,
    contributors: [
      { id: '1', name: 'David Brown', role: 'Safety Inspector', avatar: 'DB' },
      { id: '2', name: 'Carlos Martinez', role: 'Ground Crew Lead', avatar: 'CM' },
      { id: '3', name: 'Jennifer Park', role: 'Compliance Officer', avatar: 'JP' }
    ],
    recentActivity: [
      {
        id: 1,
        user: { name: 'David Brown', avatar: 'DB' },
        action: 'completed equipment inspection checklist',
        time: '3 hours ago'
      },
      {
        id: 2,
        user: { name: 'Carlos Martinez', avatar: 'CM' },
        action: 'provided ground crew feedback',
        time: '1 day ago'
      }
    ],
    sections: [
      { name: 'Equipment Inspection', status: 'completed' },
      { name: 'Procedure Review', status: 'completed' },
      { name: 'Staff Interviews', status: 'completed' },
      { name: 'Final Report', status: 'in-progress' }
    ],
    sectionsComplete: 3,
    totalSections: 4
  }
];

export const MODULE_OPTIONS = [
  { value: 'Flight Operations', label: 'Flight Operations', icon: 'Target' },
  { value: 'Maintenance', label: 'Maintenance', icon: 'Wrench' },
  { value: 'Safety', label: 'Safety', icon: 'Shield' },
  { value: 'Passenger Services', label: 'Passenger Services', icon: 'Users' },
  { value: 'Ground Operations', label: 'Ground Operations', icon: 'Building' }
];

export const PRIORITY_OPTIONS = ['Critical', 'High', 'Medium', 'Low'];
export const STATUS_OPTIONS = ['pending', 'in-progress', 'completed'];
export const ROLE_OPTIONS = ['Contributor', 'Reviewer', 'Observer'];