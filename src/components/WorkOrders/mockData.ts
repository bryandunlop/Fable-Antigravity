import { WorkOrder, Technician, TimeEntry } from './types';

export const mockTechnicians: Technician[] = [
  {
    id: 'TECH-001',
    name: 'John Smith',
    shift: 'AM',
    certifications: ['A&P', 'IA', 'Avionics'],
    active: true
  },
  {
    id: 'TECH-002',
    name: 'Mike Johnson',
    shift: 'AM',
    certifications: ['A&P', 'IA'],
    active: true
  },
  {
    id: 'TECH-003',
    name: 'Sarah Wilson',
    shift: 'PM',
    certifications: ['A&P', 'Structures'],
    active: true
  },
  {
    id: 'TECH-004',
    name: 'David Martinez',
    shift: 'PM',
    certifications: ['A&P', 'Avionics', 'Engine'],
    active: true
  },
  {
    id: 'TECH-005',
    name: 'Lisa Anderson',
    shift: 'Night',
    certifications: ['A&P'],
    active: true
  },
  {
    id: 'TECH-006',
    name: 'Robert Taylor',
    shift: 'AM',
    certifications: ['A&P', 'IA', 'Engine'],
    active: true
  }
];

export const mockWorkOrders: WorkOrder[] = [
  {
    id: 'WO-001',
    title: '100-Hour Inspection',
    description: 'Comprehensive 100-hour inspection including engine, avionics, and structural checks per manufacturer specifications',
    aircraft: 'Gulfstream G650',
    tailNumber: 'N1PG',
    priority: 'high',
    status: 'in-progress',
    type: 'scheduled',
    category: 'major',
    assignedTo: ['TECH-001', 'TECH-002'],
    assignedShift: 'AM',
    cmpJobCard: 'CMP-2025-001',
    cmpSyncRequired: true,
    cmpLastSync: '2025-10-28T08:00:00',
    estimatedHours: 16,
    actualHours: 8.5,
    startDate: '2025-10-27T07:00:00',
    dueDate: '2025-10-29T17:00:00',
    location: 'Hangar 1',
    createdBy: 'Maintenance Manager',
    createdAt: '2025-10-25T10:00:00',
    updatedAt: '2025-10-28T09:30:00',
    notes: 'Aircraft must be ready for departure on Oct 30. Priority job.',
    subTasks: [
      {
        id: 'ST-001',
        title: 'Engine Inspection - Left',
        description: 'Detailed engine inspection including borescope',
        status: 'completed',
        assignedTo: 'TECH-002',
        estimatedHours: 4,
        actualHours: 4.5,
        completedBy: 'Mike Johnson',
        completedAt: '2025-10-27T15:30:00',
        notes: 'Oil pressure within normal range'
      },
      {
        id: 'ST-002',
        title: 'Engine Inspection - Right',
        description: 'Detailed engine inspection including borescope',
        status: 'in-progress',
        assignedTo: 'TECH-002',
        estimatedHours: 4,
        actualHours: 2,
        notes: 'In progress'
      },
      {
        id: 'ST-003',
        title: 'Avionics System Check',
        description: 'Test all avionics systems and navigation equipment',
        status: 'completed',
        assignedTo: 'TECH-001',
        estimatedHours: 3,
        actualHours: 2,
        completedBy: 'John Smith',
        completedAt: '2025-10-27T12:00:00'
      },
      {
        id: 'ST-004',
        title: 'Structural Inspection',
        description: 'Visual and NDT inspection of airframe',
        status: 'pending',
        assignedTo: 'TECH-001',
        estimatedHours: 5,
        actualHours: 0
      }
    ]
  },
  {
    id: 'WO-002',
    title: 'Landing Gear Actuator Replacement',
    description: 'Replace main landing gear actuator assembly due to intermittent gear warning lights. Aircraft AOG until completion.',
    aircraft: 'Gulfstream G650',
    tailNumber: 'N2PG',
    priority: 'critical',
    status: 'in-progress',
    type: 'aog',
    category: 'major',
    assignedTo: ['TECH-003', 'TECH-004'],
    assignedShift: 'PM',
    cmpJobCard: undefined,
    cmpSyncRequired: false,
    estimatedHours: 12,
    actualHours: 9,
    startDate: '2025-10-27T13:00:00',
    dueDate: '2025-10-28T20:00:00',
    location: 'Hangar 3',
    createdBy: 'Chief Technician',
    createdAt: '2025-10-27T12:00:00',
    updatedAt: '2025-10-28T10:00:00',
    notes: 'AIRCRAFT ON GROUND - Priority 1. Parts received from vendor.',
    subTasks: [
      {
        id: 'ST-005',
        title: 'Remove Old Actuator',
        status: 'completed',
        assignedTo: 'TECH-003',
        estimatedHours: 4,
        actualHours: 5,
        completedBy: 'Sarah Wilson',
        completedAt: '2025-10-27T18:00:00',
        notes: 'Old actuator showed signs of hydraulic fluid leak'
      },
      {
        id: 'ST-006',
        title: 'Install New Actuator',
        status: 'in-progress',
        assignedTo: 'TECH-004',
        estimatedHours: 4,
        actualHours: 3
      },
      {
        id: 'ST-007',
        title: 'System Testing & Rigging',
        status: 'pending',
        estimatedHours: 4,
        actualHours: 0
      }
    ]
  },
  {
    id: 'WO-003',
    title: 'Cabin Pressure Warning Repair',
    description: 'Investigate and repair cabin pressure warning light malfunction reported by crew',
    aircraft: 'Gulfstream G500',
    tailNumber: 'N5PG',
    priority: 'high',
    status: 'assigned',
    type: 'unscheduled',
    category: 'minor',
    assignedTo: ['TECH-006'],
    cmpJobCard: 'CMP-2025-002',
    cmpSyncRequired: true,
    estimatedHours: 6,
    actualHours: 0,
    dueDate: '2025-10-29T12:00:00',
    location: 'Hangar 2',
    createdBy: 'Operations',
    createdAt: '2025-10-28T06:00:00',
    updatedAt: '2025-10-28T08:00:00',
    notes: 'Reported by crew after FO046 arrival. Pressure check needed.',
    subTasks: [
      {
        id: 'ST-008',
        title: 'Diagnostic Check',
        status: 'pending',
        assignedTo: 'TECH-006',
        estimatedHours: 2,
        actualHours: 0
      },
      {
        id: 'ST-009',
        title: 'Repair/Replace Components',
        status: 'pending',
        estimatedHours: 3,
        actualHours: 0
      },
      {
        id: 'ST-010',
        title: 'System Test',
        status: 'pending',
        estimatedHours: 1,
        actualHours: 0
      }
    ]
  },
  {
    id: 'WO-004',
    title: 'Avionics Software Update',
    description: 'Update flight management system software to latest version v8.2.1',
    aircraft: 'Gulfstream G500',
    tailNumber: 'N6PG',
    priority: 'medium',
    status: 'pending',
    type: 'scheduled',
    category: 'ancillary',
    assignedTo: [],
    cmpJobCard: 'CMP-2025-003',
    cmpSyncRequired: true,
    estimatedHours: 4,
    actualHours: 0,
    dueDate: '2025-10-30T17:00:00',
    location: 'Ramp',
    createdBy: 'Avionics Manager',
    createdAt: '2025-10-26T14:00:00',
    updatedAt: '2025-10-26T14:00:00',
    notes: 'Software release scheduled for Oct 29. Update when available.',
    subTasks: [
      {
        id: 'ST-011',
        title: 'Download Software Package',
        status: 'pending',
        estimatedHours: 0.5,
        actualHours: 0
      },
      {
        id: 'ST-012',
        title: 'Backup Current Configuration',
        status: 'pending',
        estimatedHours: 1,
        actualHours: 0
      },
      {
        id: 'ST-013',
        title: 'Install Software Update',
        status: 'pending',
        estimatedHours: 2,
        actualHours: 0
      },
      {
        id: 'ST-014',
        title: 'System Testing',
        status: 'pending',
        estimatedHours: 0.5,
        actualHours: 0
      }
    ]
  },
  {
    id: 'WO-005',
    title: 'Oil Change & Filter Replacement',
    description: 'Routine oil change and filter replacement for both engines',
    aircraft: 'Gulfstream G650',
    tailNumber: 'N1PG',
    priority: 'low',
    status: 'completed',
    type: 'scheduled',
    category: 'minor',
    assignedTo: ['TECH-005'],
    assignedShift: 'Night',
    cmpJobCard: undefined,
    cmpSyncRequired: false,
    estimatedHours: 3,
    actualHours: 2.5,
    startDate: '2025-10-26T23:00:00',
    completedDate: '2025-10-27T01:30:00',
    dueDate: '2025-10-27T06:00:00',
    location: 'Hangar 1',
    createdBy: 'Maintenance Scheduler',
    createdAt: '2025-10-25T16:00:00',
    updatedAt: '2025-10-27T01:30:00',
    notes: 'Completed during night shift. Aircraft ready for service.',
    subTasks: [
      {
        id: 'ST-015',
        title: 'Drain Oil - Engine 1',
        status: 'completed',
        assignedTo: 'TECH-005',
        estimatedHours: 0.5,
        actualHours: 0.5,
        completedBy: 'Lisa Anderson',
        completedAt: '2025-10-26T23:30:00'
      },
      {
        id: 'ST-016',
        title: 'Drain Oil - Engine 2',
        status: 'completed',
        assignedTo: 'TECH-005',
        estimatedHours: 0.5,
        actualHours: 0.5,
        completedBy: 'Lisa Anderson',
        completedAt: '2025-10-27T00:00:00'
      },
      {
        id: 'ST-017',
        title: 'Replace Filters',
        status: 'completed',
        assignedTo: 'TECH-005',
        estimatedHours: 1,
        actualHours: 0.5,
        completedBy: 'Lisa Anderson',
        completedAt: '2025-10-27T00:30:00'
      },
      {
        id: 'ST-018',
        title: 'Refill Oil & Run-up Test',
        status: 'completed',
        assignedTo: 'TECH-005',
        estimatedHours: 1,
        actualHours: 1,
        completedBy: 'Lisa Anderson',
        completedAt: '2025-10-27T01:30:00'
      }
    ]
  }
];

export const mockTimeEntries: TimeEntry[] = [
  {
    id: 'TE-001',
    workOrderId: 'WO-001',
    subTaskId: 'ST-001',
    technicianId: 'TECH-002',
    technicianName: 'Mike Johnson',
    startTime: '2025-10-27T07:00:00',
    endTime: '2025-10-27T11:30:00',
    duration: 4.5,
    notes: 'Engine inspection completed',
    createdAt: '2025-10-27T07:00:00'
  },
  {
    id: 'TE-002',
    workOrderId: 'WO-001',
    subTaskId: 'ST-003',
    technicianId: 'TECH-001',
    technicianName: 'John Smith',
    startTime: '2025-10-27T08:00:00',
    endTime: '2025-10-27T10:00:00',
    duration: 2,
    notes: 'Avionics check completed',
    createdAt: '2025-10-27T08:00:00'
  },
  {
    id: 'TE-003',
    workOrderId: 'WO-001',
    subTaskId: 'ST-002',
    technicianId: 'TECH-002',
    technicianName: 'Mike Johnson',
    startTime: '2025-10-28T07:00:00',
    endTime: '2025-10-28T09:00:00',
    duration: 2,
    notes: 'Continuing right engine inspection',
    createdAt: '2025-10-28T07:00:00'
  },
  {
    id: 'TE-004',
    workOrderId: 'WO-002',
    subTaskId: 'ST-005',
    technicianId: 'TECH-003',
    technicianName: 'Sarah Wilson',
    startTime: '2025-10-27T13:00:00',
    endTime: '2025-10-27T18:00:00',
    duration: 5,
    notes: 'Actuator removal completed',
    createdAt: '2025-10-27T13:00:00'
  },
  {
    id: 'TE-005',
    workOrderId: 'WO-002',
    subTaskId: 'ST-006',
    technicianId: 'TECH-004',
    technicianName: 'David Martinez',
    startTime: '2025-10-28T13:00:00',
    endTime: '2025-10-28T16:00:00',
    duration: 3,
    notes: 'Installing new actuator',
    createdAt: '2025-10-28T13:00:00'
  }
];
