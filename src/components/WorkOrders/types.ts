export interface WorkOrder {
  id: string;
  title: string;
  description: string;
  aircraft: string;
  tailNumber: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'assigned' | 'in-progress' | 'on-hold' | 'completed' | 'cancelled';
  type: 'scheduled' | 'unscheduled' | 'aog';
  category: 'minor' | 'major' | 'ancillary';
  
  // Assignment
  assignedTo: string[]; // Array of tech IDs or names
  assignedShift?: 'AM' | 'PM' | 'Night';
  
  // CMP Integration
  cmpJobCard?: string;
  cmpSyncRequired: boolean;
  cmpLastSync?: string;
  
  // Time tracking
  estimatedHours: number;
  actualHours: number;
  startDate?: string;
  completedDate?: string;
  dueDate: string;
  
  // Sub-tasks
  subTasks: SubTask[];
  
  // Metadata
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  location: string;
  notes?: string;
}

export interface SubTask {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in-progress' | 'completed';
  assignedTo?: string;
  estimatedHours: number;
  actualHours: number;
  completedBy?: string;
  completedAt?: string;
  notes?: string;
}

export interface TimeEntry {
  id: string;
  workOrderId: string;
  subTaskId?: string;
  technicianId: string;
  technicianName: string;
  startTime: string;
  endTime?: string;
  duration: number; // in hours
  notes?: string;
  createdAt: string;
}

export interface Technician {
  id: string;
  name: string;
  shift: 'AM' | 'PM' | 'Night';
  certifications: string[];
  active: boolean;
}

export interface WorkOrderStats {
  totalWorkOrders: number;
  pending: number;
  inProgress: number;
  completed: number;
  totalHours: number;
  avgCompletionTime: number;
  byCategory: {
    minor: number;
    major: number;
    ancillary: number;
  };
  byPriority: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
}
