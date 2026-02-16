export type Priority = 'AOG' | 'CRITICAL' | 'ROUTINE' | 'DEFERRAL';

export type JobStatus = 'PENDING' | 'IN_PROGRESS' | 'PAUSED' | 'COMPLETED' | 'VERIFIED';

export type PauseReason = 'WAITING_PARTS' | 'WAITING_TOOLING' | 'WAITING_INSPECTOR' | 'SHIFT_CHANGE' | 'OTHER';

export interface Technician {
    id: string;
    name: string;
    certifications: string[]; // e.g., ['A&P', 'Avionics']
    shift: 'DAYS' | 'NIGHTS' | 'ROTATION';
}

export interface JobCard {
    id: string;
    workOrderNumber: string;
    aircraftTailNumber: string;
    title: string; // e.g., "CMP Item 12345: Main Battery Capacity Test"
    ataChapter: string; // e.g., "24-30"
    priority: Priority;
    status: JobStatus;
    assignedTechnicianId?: string;

    // Time Tracking
    estimatedHours: number;
    actualHours: number;
    lastStartedAt?: string; // ISO string

    // Details
    description: string;
    ammReference?: string; // Link to manual

    // Pause Info
    pauseReason?: PauseReason;
    pauseNotes?: string;
}

export interface TimeEntry {
    id: string;
    jobCardId: string;
    technicianId: string;
    startTime: string;
    endTime?: string;
    durationMinutes: number;
}
