import { WorkOrder, SubTask } from './types';

// Utility functions for work order management

export const createWorkOrderFromSquawk = (
  squawkData: {
    id: string;
    description: string;
    aircraftTail: string;
    aircraftType?: string;
    ataChapter: string;
    priority: 'critical' | 'high' | 'medium' | 'low';
    reportedBy: string;
  },
  workOrderDetails: {
    title: string;
    estimatedHours: number;
    category: 'minor' | 'major' | 'ancillary';
    type: 'scheduled' | 'unscheduled' | 'aog';
    dueDate: string;
  },
  createdBy: string
): WorkOrder => {
  const workOrderId = `WO-${Date.now()}`;

  return {
    id: workOrderId,
    title: workOrderDetails.title,
    description: `${squawkData.description}\n\nOriginated from Squawk: ${squawkData.id}\nATA Chapter: ${squawkData.ataChapter}\nReported by: ${squawkData.reportedBy}`,
    aircraft: squawkData.aircraftType || 'Gulfstream G650',
    tailNumber: squawkData.aircraftTail,
    priority: squawkData.priority as any,
    status: 'pending',
    type: workOrderDetails.type,
    category: workOrderDetails.category,
    assignedTo: [],
    cmpSyncRequired: false,
    estimatedHours: workOrderDetails.estimatedHours,
    actualHours: 0,
    dueDate: workOrderDetails.dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    location: 'Hangar 1',
    createdBy: createdBy,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    notes: `Created from Tech Log Squawk ${squawkData.id}`,
    subTasks: []
  };
};

export const getWorkOrderStatus = (status: string): string => {
  switch (status) {
    case 'pending': return 'Pending Assignment';
    case 'assigned': return 'Assigned';
    case 'in-progress': return 'In Progress';
    case 'on-hold': return 'On Hold';
    case 'completed': return 'Completed';
    case 'cancelled': return 'Cancelled';
    default: return status;
  }
};

export const getPriorityColor = (priority: string): string => {
  switch (priority) {
    case 'critical': return 'bg-red-100 text-red-800 border-red-200';
    case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'low': return 'bg-green-100 text-green-800 border-green-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

export const getStatusColor = (status: string): string => {
  switch (status) {
    case 'completed': return 'bg-green-100 text-green-800 border-green-200';
    case 'in-progress': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'assigned': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
    case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'on-hold': return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'cancelled': return 'bg-gray-100 text-gray-800 border-gray-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

export const formatWorkOrderId = (id: string): string => {
  return id.toUpperCase();
};

export const calculateProgress = (workOrder: WorkOrder): number => {
  if (workOrder.subTasks.length === 0) {
    return 0;
  }
  
  const completedTasks = workOrder.subTasks.filter(st => st.status === 'completed').length;
  return (completedTasks / workOrder.subTasks.length) * 100;
};
