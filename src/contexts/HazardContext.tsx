import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNotificationContext } from '../components/contexts/NotificationContext';

// Define types based on existing components
export const WORKFLOW_STAGES = {
    SUBMITTED: 'Submitted',
    // Safety Manager Phase 1
    SM_INVESTIGATION: 'Safety Manger Investigation', // Includes Risk Assessment & 5 Whys
    // PACE Assignment Phase
    ASSIGN_MITIGATION: 'Assign Mitigation Task',
    // Process Owner Phase
    MITIGATION_DEVELOPMENT: 'Mitigation Development',
    // Safety Manager Phase 2
    SM_REVIEW: 'Safety Manager Review',
    // Approvals
    LINE_MANAGER_APPROVAL: 'Line Manager Approval',
    EXEC_APPROVAL: 'Accountable Executive Approval',
    // Implementation Phase
    IMPLEMENTATION: 'Implementation', // Send Info & R&I
    // Effectiveness Phase
    EFFECTIVENESS_REVIEW: 'Review for Effectiveness', // 6 months later
    PUBLISHED: 'Published',
    CLOSED: 'Closed'
};

export const HAZARD_CATEGORIES = [
    'Flight Operations',
    'Ground Operations',
    'Maintenance',
    'Cabin/Inflight',
    'Security',
    'Airport Infrastructure',
    'Wildlife',
    'Equipment',
    'Fuel System',
    'Cargo Handling',
    'Other'
];

export const SEVERITY_LEVELS = ['Low', 'Medium', 'High', 'Critical'];

export interface Hazard {
    id: string;
    title: string;
    category?: string;
    severity: string; // 'Critical' | 'High' | 'Medium' | 'Low'
    workflowStage: string;
    location: string;
    reportedBy: string; // or submittedBy
    submitterLineManager?: string;
    reportedDate: string; // or submitDate
    description: string;
    immediateActions: string;
    potentialConsequences: string;
    assignedTo?: string | null;
    dueDate?: string;
    effectivenessReviewDate?: string;
    priority?: string;
    daysInStage?: number;
    isAnonymous?: boolean;
    isPublished?: boolean; // Controls visibility to general users
    submitterId?: string; // Tracks who submitted it for "My Hazards" view

    // Workflow specifics
    riskFactors?: string[];
    riskAnalysis?: {
        severity: number; // 1-5
        likelihood: number; // 0-4
    };

    // 5 Whys Analysis
    // Index 0: "Why did this make sense for the person to do what they did?"
    // Index 1-4: Subsequent Whys
    whyAnalysis?: string[];

    investigationNotes?: string;

    // Evidence / Attachments
    attachments?: Array<{
        id: string;
        name: string;
        type: string;
        size: number;
        url?: string; // Mock URL
        uploadedBy: string;
        uploadedDate: string;
    }>;

    // PACE Model Assignments & Responses
    paceAssignments?: {
        processOwner: Array<{ // Changed to Array
            id: string; // Added ID
            type: string;
            value: string;
            customName?: string;
            customEmail?: string;
            customMessage?: string; // Message from Safety Team to Process Owner
            response?: string; // Input from Process Owner (Proposed Mitigation)
            responseDate?: string;
            status?: 'pending' | 'submitted';
        }>;
        approver: Array<{ // Changed to Array
            id: string; // Added ID
            type: string;
            value: string;
            customName?: string;
            customEmail?: string;
            customMessage?: string;
            response?: string;
            responseDate?: string;
            status?: 'pending' | 'approved' | 'rejected';
        }>;
        contributors: Array<{
            id: string; // added ID for easier tracking
            type: string;
            value: string;
            customName?: string;
            customEmail?: string;
            customMessage?: string;
            response?: string;
            responseDate?: string;
            status?: 'pending' | 'submitted';
        }>;
        executers: Array<{ // Used for implementation tasks
            id: string;
            type: string;
            value: string;
            customName?: string;
            customEmail?: string;
            customMessage?: string;
            response?: string; // Confirmation of implementation
            responseDate?: string;
            status?: 'pending' | 'completed';
        }>;
    };

    correctiveActionComponents?: {
        communications: boolean;
        training: boolean;
        policy: boolean;
        equipment: boolean;
    };
    // Final Corrective Action (Curated by SM after receiving input from Process Owner)
    finalCorrectiveAction?: string;

    // Approvals
    approvals?: {
        lineManager?: {
            approved: boolean;
            approvedBy?: string;
            approvedDate?: string;
            comments?: string;
        };
        executive?: {
            approved: boolean;
            approvedBy?: string;
            approvedDate?: string;
            comments?: string;
        };
        finalSafetyClosure?: {
            approved: boolean;
            approvedBy?: string;
            date?: string;
            comments?: string;
        };
    };

    // Implementation tracking
    implementationNotes?: string;
    publicationContent?: string; // Content sent to group
    correctiveActionDetails?: string; // Manual details for bulletin
    documentComplianceId?: string; // Link to R&I
    effectivenessReviewNotes?: string;

    // Audit trail
    workflowHistory?: Array<{ stage: string; date: string; user: string; action: string }>;
    notificationsSent?: Array<{ recipient: string; type: string; date: string }>;
    duties?: Array<any>;
}

interface HazardContextType {
    hazards: Hazard[];
    getHazardById: (id: string) => Hazard | undefined;
    submitHazard: (hazard: Omit<Hazard, 'id' | 'workflowStage' | 'reportedDate'> & { isAnonymous?: boolean }) => void;
    updateHazard: (id: string, updates: Partial<Hazard>) => void;
    deleteHazard: (id: string) => void;
    publishHazard: (id: string) => void;
    currentUserId: string;
}

const HazardContext = createContext<HazardContextType | undefined>(undefined);

// Helper to get or create a stable user ID for this browser session
// In a real app, this would come from the AuthContext
const getStoredUserId = () => {
    let uid = localStorage.getItem('aviation_user_id');
    if (!uid) {
        uid = 'user_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('aviation_user_id', uid);
    }
    return uid;
};

// Initial Mock Data
const INITIAL_HAZARDS: Hazard[] = [
    {
        id: 'HZ-001',
        title: 'Runway Surface Contamination - LAX Runway 24L',
        category: 'Airport Infrastructure',
        severity: 'Critical',
        workflowStage: WORKFLOW_STAGES.LINE_MANAGER_APPROVAL,
        location: 'LAX - Runway 24L',
        reportedBy: 'John Smith',
        submitterLineManager: 'Sarah Johnson',
        reportedDate: '2024-02-06',
        description: 'Standing water and oil contamination observed on runway 24L during pre-flight inspection',
        immediateActions: 'Runway closed to traffic, maintenance notified',
        potentialConsequences: 'Reduced braking effectiveness, potential aircraft damage or incident',
        assignedTo: 'Mike Johnson',
        dueDate: '2024-02-07',
        effectivenessReviewDate: '2024-02-15',
        riskFactors: ['Lack of Awareness'],
        priority: 'High',
        isPublished: true, // Legacy/Mock data should be visible
        submitterId: 'legacy_user'
    },
    {
        id: 'HZ-002',
        title: 'Bird Strike Risk - Approach Path DEN',
        category: 'Wildlife',
        severity: 'High',
        workflowStage: WORKFLOW_STAGES.EXEC_APPROVAL,
        location: 'DEN - Approach Path Runway 16R',
        reportedBy: 'Sarah Wilson',
        submitterLineManager: 'Tom Anderson',
        reportedDate: '2024-02-05',
        description: 'Large flock of birds observed consistently in approach path during morning operations',
        immediateActions: 'Crew advised to use alternative approach path, wildlife control notified',
        potentialConsequences: 'Bird strike damage to aircraft, potential engine failure',
        assignedTo: 'David Brown',
        dueDate: '2024-02-08',
        effectivenessReviewDate: '2024-02-12',
        riskFactors: ['Lack of Resources'],
        priority: 'High',
        isPublished: true,
        submitterId: 'legacy_user'
    },
    {
        id: 'HZ-003',
        title: 'Ground Equipment Malfunction - N1PG',
        category: 'Equipment',
        severity: 'Medium',
        workflowStage: WORKFLOW_STAGES.CLOSED,
        location: 'Main Hangar - Bay 3',
        reportedBy: 'Emily Davis',
        submitterLineManager: 'Mike Roberts',
        reportedDate: '2024-02-04',
        description: 'Ground power unit malfunctioned during aircraft servicing, caused brief power interruption',
        immediateActions: 'GPU taken out of service, backup unit deployed',
        potentialConsequences: 'Avionics damage, flight delays',
        assignedTo: 'Tom Wilson',
        dueDate: '2024-02-05',
        effectivenessReviewDate: '2024-03-04',
        priority: 'Medium',
        isPublished: true,
        submitterId: 'legacy_user'
    },
    {
        id: 'HZ-004',
        title: 'Fuel System Leak - Fuel Farm',
        category: 'Fuel System',
        severity: 'High',
        workflowStage: WORKFLOW_STAGES.SM_INVESTIGATION, // Was SM_INITIAL_REVIEW
        location: 'Fuel Farm - Tank 2',
        reportedBy: 'Mark Anderson',
        submitterLineManager: 'Lisa Martinez',
        reportedDate: '2024-02-06',
        description: 'Small fuel leak detected at base of fuel tank 2 during routine inspection',
        immediateActions: 'Area cordoned off, fuel operations suspended for tank 2',
        potentialConsequences: 'Environmental contamination, fire hazard, fuel shortage',
        assignedTo: 'Lisa Chen',
        dueDate: '2024-02-07',
        effectivenessReviewDate: '2024-02-20',
        priority: 'High',
        isPublished: true,
        submitterId: 'legacy_user'
    },
    {
        id: 'HZ-005',
        title: 'Inadequate Ramp Lighting',
        category: 'Infrastructure',
        severity: 'Low',
        workflowStage: WORKFLOW_STAGES.EFFECTIVENESS_REVIEW,
        location: 'Regional Airport - FBO Ramp',
        reportedBy: 'Chris Brown',
        reportedDate: '2024-01-15',
        description: 'Lighting on FBO ramp is insufficient for night operations.',
        immediateActions: 'Portable lighting requested.',
        potentialConsequences: 'Trip hazard, vehicle collision.',
        effectivenessReviewDate: '2024-07-15',
        priority: 'Low',
        isPublished: true,
        submitterId: 'legacy_user'
    },
    {
        id: 'HZ-006',
        title: 'Unsecured Cargo Pallet - Flight 303',
        category: 'Cargo Handling',
        severity: 'Medium',
        workflowStage: WORKFLOW_STAGES.SUBMITTED,
        location: 'Cargo Apron - Spot 4',
        reportedBy: 'Mike Johnson',
        submitterLineManager: 'David Wilson',
        reportedDate: new Date().toISOString().split('T')[0],
        description: 'Cargo pallet observed without proper netting during transport to aircraft.',
        immediateActions: 'Transport stopped, netting secured before proceeding.',
        potentialConsequences: 'Cargo falling during transport, injury to personnel or damage to aircraft.',
        priority: 'Medium',
        riskFactors: ['Complacency'],
        isPublished: true,
        submitterId: 'legacy_user'
    },
    {
        id: 'HZ-007',
        title: 'Hydraulic Fluid Spill - Gate B12',
        category: 'Ground Operations',
        severity: 'Medium',
        workflowStage: WORKFLOW_STAGES.PUBLISHED,
        location: 'DFW - Gate B12',
        reportedBy: 'Kevin Adams',
        reportedDate: '2024-01-20',
        description: 'Significant hydraulic fluid leak from regional jet during engine start.',
        immediateActions: 'Spill kit deployed, fire department stood by.',
        potentialConsequences: 'Environmental hazard, slip risk, equipment damage.',
        isPublished: true,
        correctiveActionDetails: 'All ground crews retrained on spill response. Maintenance procedures updated for hydraulic line inspections.',
        submitterId: 'legacy_user'
    },
    {
        id: 'HZ-008',
        title: 'Unauthorized Drone Activity - VNY',
        category: 'Security',
        severity: 'High',
        workflowStage: WORKFLOW_STAGES.PUBLISHED,
        location: 'VNY - North Perimeter',
        reportedBy: 'Jennifer Wu',
        reportedDate: '2024-01-25',
        description: 'Small commercial drone observed hovering near the approach end of Runway 16R.',
        immediateActions: 'Tower notified, local law enforcement dispatched.',
        potentialConsequences: 'Mid-air collision, security breach.',
        isPublished: true,
        correctiveActionDetails: 'Enhanced perimeter monitoring implemented. Local "No Drone Zone" signage increased.',
        submitterId: 'legacy_user'
    },
    {
        id: 'HZ-009',
        title: 'FOD Found on Taxiway Romeo',
        category: 'Airport Infrastructure',
        severity: 'Low',
        workflowStage: WORKFLOW_STAGES.PUBLISHED,
        location: 'ASE - Taxiway Romeo',
        reportedBy: 'Robert Taylor',
        reportedDate: '2024-02-01',
        description: 'Large metal bolt found on center line of Taxiway Romeo.',
        immediateActions: 'FOD removed, taxiway swept by operations.',
        potentialConsequences: 'Tire damage, engine ingestion.',
        isPublished: true,
        correctiveActionDetails: 'Daily FOD walks increased. Local construction crews reminded of tool accountability.',
        submitterId: 'legacy_user'
    }
];

export const HazardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [hazards, setHazards] = useState<Hazard[]>([]);
    const [currentUserId] = useState<string>(getStoredUserId());

    // Load from local storage on mount
    useEffect(() => {
        const storedHazards = localStorage.getItem('aviation_hazards');
        if (storedHazards) {
            const parsedStored = JSON.parse(storedHazards);
            // Merge any missing INITIAL_HAZARDS (helpful during development/demo)
            const missingInitialHazards = INITIAL_HAZARDS.filter(
                initial => !parsedStored.some((stored: Hazard) => stored.id === initial.id)
            );

            if (missingInitialHazards.length > 0) {
                const combined = [...missingInitialHazards, ...parsedStored];
                setHazards(combined);
                localStorage.setItem('aviation_hazards', JSON.stringify(combined));
            } else {
                setHazards(parsedStored);
            }
        } else {
            setHazards(INITIAL_HAZARDS);
            localStorage.setItem('aviation_hazards', JSON.stringify(INITIAL_HAZARDS));
        }
    }, []);

    // Save to local storage whenever hazards change
    useEffect(() => {
        if (hazards.length > 0) {
            localStorage.setItem('aviation_hazards', JSON.stringify(hazards));
        }
    }, [hazards]);

    const { addNotification } = useNotificationContext();

    // Check for 6-month effectiveness review reminders (throttled to once per day)
    const checkEffectivenessReviews = useCallback((hazardList: Hazard[]) => {
        const today = new Date();
        const todayKey = today.toISOString().split('T')[0];
        const lastChecked = localStorage.getItem('hazard_effectiveness_checked');
        if (lastChecked === todayKey) return;
        localStorage.setItem('hazard_effectiveness_checked', todayKey);

        hazardList.forEach(hazard => {
            if (!hazard.effectivenessReviewDate) return;
            const reviewDate = new Date(hazard.effectivenessReviewDate);
            const daysUntil = Math.ceil((reviewDate.getTime() - today.getTime()) / (1000 * 3600 * 24));

            // Fire if within 7 days or overdue
            if (daysUntil <= 7) {
                addNotification({
                    title: daysUntil < 0
                        ? `Effectiveness Review Overdue: ${hazard.title}`
                        : `Effectiveness Review Due: ${hazard.title}`,
                    message: daysUntil < 0
                        ? `6-month effectiveness review is ${Math.abs(daysUntil)} day(s) overdue.`
                        : daysUntil === 0
                            ? '6-month effectiveness review is due today.'
                            : `6-month effectiveness review is due in ${daysUntil} day(s).`,
                    type: 'safety',
                    priority: daysUntil < 0 ? 'high' : 'medium',
                    actionUrl: `/safety/hazard-workflow/${hazard.id}`,
                    actionText: 'Review Hazard',
                    module: 'Safety Systems',
                    relatedId: hazard.id,
                    daysUntilDue: daysUntil
                });
            }
        });
    }, [addNotification]);

    useEffect(() => {
        if (hazards.length > 0) {
            checkEffectivenessReviews(hazards);
        }
    }, [hazards, checkEffectivenessReviews]);

    const getHazardById = (id: string) => {
        return hazards.find(h => h.id === id);
    };

    const submitHazard = (newHazardData: Omit<Hazard, 'id' | 'workflowStage' | 'reportedDate'> & { isAnonymous?: boolean }) => {
        // Safe ID generation: Find max ID number and increment
        const maxId = hazards.reduce((max, h) => {
            const num = parseInt(h.id.split('-')[1] || '0');
            return num > max ? num : max;
        }, 0);
        const newId = `HZ-${String(maxId + 1).padStart(3, '0')}`;

        const today = new Date().toISOString().split('T')[0];

        const newHazard: Hazard = {
            ...newHazardData,
            id: newId,
            workflowStage: WORKFLOW_STAGES.SUBMITTED,
            reportedDate: today,
            daysInStage: 0,
            priority: newHazardData.severity, // Simple default mapping
            isAnonymous: newHazardData.isAnonymous || false,
            submitterId: newHazardData.isAnonymous ? undefined : currentUserId,
            isPublished: false // Hidden by default until published by Safety
        };

        setHazards(prev => [newHazard, ...prev]);
    };

    const updateHazard = (id: string, updates: Partial<Hazard>) => {
        setHazards(prev => prev.map(h => {
            if (h.id === id) {
                return { ...h, ...updates };
            }
            return h;
        }));
    };

    const deleteHazard = (id: string) => {
        setHazards(prev => prev.filter(h => h.id !== id));
    };

    const publishHazard = (id: string) => {
        updateHazard(id, { isPublished: true });
    };

    return (
        <HazardContext.Provider value={{ hazards, getHazardById, submitHazard, updateHazard, deleteHazard, publishHazard, currentUserId }}>
            {children}
        </HazardContext.Provider>
    );
};

export const useHazards = () => {
    const context = useContext(HazardContext);
    if (!context) {
        throw new Error('useHazards must be used within a HazardProvider');
    }
    return context;
};
