import React, { createContext, useContext, useState, useEffect } from 'react';
import { daysAgo, daysAhead, today } from '../lib/demoDates';
import { eventStore } from '../notifications/events';
import { dedupeHazardsById, loadStoredHazards } from './hazardPersistence';

// Define types based on existing components
export const WORKFLOW_STAGES = {
    SUBMITTED: 'Submitted',
    // Safety Manager Phase 1
    SM_INVESTIGATION: 'Safety Manger Investigation', // Includes 5 Whys
    // Mitigation Assignment Phase
    ASSIGN_MITIGATION: 'Assign Mitigation Task',
    // Process Owner Phase
    MITIGATION_DEVELOPMENT: 'Mitigation Development',
    // Safety Manager Phase 2
    SM_MITIGATION_REVIEW: 'Safety Manager Mitigation Review',
    // Approvals
    MANAGER_APPROVAL: 'Manager Approval', 
    SM_POST_MANAGER: 'Post-Manager Review', // NEW: SM intercept
    EXEC_APPROVAL: 'Accountable Executive Approval',
    SM_POST_EXEC: 'Post-Executive Review', // NEW: SM intercept
    // Execution Phase — corrective actions implemented after approvals, before final report.
    // Referenced by HazardWorkflow/HazardReporting/UnifiedTasks; sits here so Object.values()
    // index ordering stays EXEC_APPROVAL -> IMPLEMENTATION -> FINAL_REPORT.
    IMPLEMENTATION: 'Implementation',
    FINAL_REPORT: 'Final Report & Publication',
    // Effectiveness Phase
    EFFECTIVENESS_REVIEW: 'Review for Effectiveness', 
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

/** One message in a hazard's secure two-way follow-up thread. Only available for
 * known (non-anonymous) submitters — anonymous reports have no thread. */
export interface HazardMessage {
    id: string;
    authorId: string;              // stable per-browser id of the author
    authorRole: 'safety' | 'submitter';
    authorName: string;
    body: string;
    atUtc: string;
}

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
    suggestedCorrectiveAction?: string; // NEW: field on submission
    smMitigationReviewNotes?: string; // NEW
    deidentifiedMitigationSummary?: string; // NEW
    finalReportRaw?: string; // NEW
    finalReportPublished?: string; // NEW
    isDeleted?: boolean; // NEW: for double-confirm delete

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

    // Mitigation Model Assignments & Responses
    mitigationAssignments?: {
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

    // Secure two-way follow-up thread (known submitters only)
    messages?: HazardMessage[];

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
    postHazardMessage: (hazardId: string, body: string, authorRole: 'safety' | 'submitter', authorName: string) => void;
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
        id: 'HZ-010',
        title: 'Loose Tooling Found Near APU',
        category: 'Maintenance',
        severity: 'Medium',
        workflowStage: WORKFLOW_STAGES.SUBMITTED,
        location: 'Hangar Bay 2',
        reportedBy: 'Demo Line Mechanic',
        submitterLineManager: 'Lead Tech',
        reportedDate: today(),
        description: 'During a post-flight walkaround, a loose wrench was found abandoned near the APU exhaust panel.',
        immediateActions: 'Tool recovered and handed to shift lead for tool control inventory.',
        potentialConsequences: 'FOD damage to APU if ingested or blown across ramp.',
        priority: 'Medium',
        isPublished: false,
        submitterId: 'demo_user'
    },
    {
        id: 'HZ-001',
        title: 'Runway Surface Contamination - LAX Runway 24L',
        category: 'Airport Infrastructure',
        severity: 'Critical',
        workflowStage: WORKFLOW_STAGES.MANAGER_APPROVAL,
        location: 'LAX - Runway 24L',
        reportedBy: 'John Smith',
        submitterLineManager: 'Sarah Johnson',
        reportedDate: daysAgo(11),
        description: 'Standing water and oil contamination observed on runway 24L during pre-flight inspection',
        immediateActions: 'Runway closed to traffic, maintenance notified',
        potentialConsequences: 'Reduced braking effectiveness, potential aircraft damage or incident',
        assignedTo: 'Mike Johnson',
        dueDate: daysAhead(4),
        effectivenessReviewDate: daysAhead(25),
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
        reportedDate: daysAgo(38),
        description: 'Large flock of birds observed consistently in approach path during morning operations',
        immediateActions: 'Crew advised to use alternative approach path, wildlife control notified',
        potentialConsequences: 'Bird strike damage to aircraft, potential engine failure',
        assignedTo: 'David Brown',
        dueDate: daysAgo(6),
        effectivenessReviewDate: daysAhead(12),
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
        reportedDate: daysAgo(63),
        description: 'Ground power unit malfunctioned during aircraft servicing, caused brief power interruption',
        immediateActions: 'GPU taken out of service, backup unit deployed',
        potentialConsequences: 'Avionics damage, flight delays',
        assignedTo: 'Tom Wilson',
        dueDate: daysAgo(58),
        effectivenessReviewDate: daysAgo(40),
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
        reportedDate: daysAgo(4),
        description: 'Small fuel leak detected at base of fuel tank 2 during routine inspection',
        immediateActions: 'Area cordoned off, fuel operations suspended for tank 2',
        potentialConsequences: 'Environmental contamination, fire hazard, fuel shortage',
        assignedTo: 'Lisa Chen',
        dueDate: daysAhead(19),
        effectivenessReviewDate: daysAhead(45),
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
        reportedDate: daysAgo(24),
        description: 'Lighting on FBO ramp is insufficient for night operations.',
        immediateActions: 'Portable lighting requested.',
        potentialConsequences: 'Trip hazard, vehicle collision.',
        effectivenessReviewDate: daysAhead(45),
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
        reportedDate: daysAgo(2),
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
        reportedDate: daysAgo(75),
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
        reportedDate: daysAgo(96),
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
        reportedDate: daysAgo(120),
        description: 'Large metal bolt found on center line of Taxiway Romeo.',
        immediateActions: 'FOD removed, taxiway swept by operations.',
        potentialConsequences: 'Tire damage, engine ingestion.',
        isPublished: true,
        correctiveActionDetails: 'Daily FOD walks increased. Local construction crews reminded of tool accountability.',
        submitterId: 'legacy_user'
    },
    {
        // HZ-010 was accidentally reused here and by 'Loose Tooling Found Near APU'
        // above — a fresh seed then stored a duplicate id. Loose Tooling keeps
        // HZ-010 (what dedup-repaired stores already resolve to); this is HZ-011.
        id: 'HZ-011',
        title: 'New Published Safety Bulletin - Ramp Speeding',
        category: 'Ground Operations',
        severity: 'High',
        workflowStage: WORKFLOW_STAGES.PUBLISHED,
        location: 'All Hubs',
        reportedBy: 'Safety Department',
        reportedDate: today(),
        description: 'Multiple reports of ground vehicles exceeding 15mph limit near terminal gates. This is a recent safety bulletin regarding the enforcement of speed limits on the active ramp.',
        immediateActions: 'Speed radar enforcement initiated on all active ramps this week.',
        potentialConsequences: 'Vehicle collision, aircraft damage, personnel injury.',
        isPublished: true,
        finalReportRaw: 'Safety Bulletin 2026-03-21:\n\nRecent trending data shows an unacceptable number of ramp vehicles exceeding the 15mph limit near aircraft gates. Effective immediately, ground managers will be conducting radar spot checks. All personnel are reminded that safety is the first priority.',
        submitterId: 'safety_manager',
        effectivenessReviewDate: new Date(new Date().setMonth(new Date().getMonth() + 6)).toISOString().split('T')[0],
    }
];

export const HazardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [hazards, setHazards] = useState<Hazard[]>([]);
    const [currentUserId] = useState<string>(getStoredUserId());

    // Load from local storage on mount. loadStoredHazards repairs the stored
    // list (duplicate ids from concurrent instances interleaving this
    // read-merge-write cycle, malformed entries) and merges in any missing
    // INITIAL_HAZARDS; only write back when the repair actually changed it.
    useEffect(() => {
        const { hazards: loaded, changed } = loadStoredHazards(
            localStorage.getItem('aviation_hazards'),
            INITIAL_HAZARDS
        );
        setHazards(loaded);
        if (changed) {
            localStorage.setItem('aviation_hazards', JSON.stringify(loaded));
        }

        // Converge concurrent instances on the same origin: adopt writes made
        // by other tabs (the storage event only fires in non-writing tabs).
        const onStorage = (e: StorageEvent) => {
            if (e.key !== 'aviation_hazards' || e.newValue === null) return;
            setHazards(loadStoredHazards(e.newValue, INITIAL_HAZARDS).hazards);
        };
        window.addEventListener('storage', onStorage);
        return () => window.removeEventListener('storage', onStorage);
    }, []);

    // Save to local storage whenever hazards change, deduped by id so a bad
    // in-memory state can never re-corrupt the store.
    useEffect(() => {
        if (hazards.length > 0) {
            localStorage.setItem('aviation_hazards', JSON.stringify(dedupeHazardsById(hazards)));
        }
    }, [hazards]);

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

        // Trigger notification for the Safety Manager
        eventStore.publish({
            id: `hazard:${newId}`,
            severity: newHazard.severity.toLowerCase() === 'critical' ? 'critical' : 'warn',
            title: `New hazard reported: ${newHazard.severity} severity`,
            detail: `${newHazard.title} (${newHazard.location})`,
            module: 'Safety Systems',
            link: '/safety/hazards',
            audienceRoles: ['safety', 'admin', 'lead'],
        });
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

    const postHazardMessage = (hazardId: string, body: string, authorRole: 'safety' | 'submitter', authorName: string) => {
        const trimmed = body.trim();
        if (!trimmed) return;
        setHazards(prev => prev.map(h => {
            if (h.id !== hazardId) return h;
            // Guard: anonymous reports have no secure back-channel.
            if (h.isAnonymous) return h;
            const message: HazardMessage = {
                id: `msg-${hazardId}-${(h.messages?.length ?? 0) + 1}-${Math.random().toString(36).slice(2, 8)}`,
                authorId: currentUserId,
                authorRole,
                authorName,
                body: trimmed,
                atUtc: new Date().toISOString(),
            };
            return { ...h, messages: [...(h.messages ?? []), message] };
        }));
        // Notifications for both directions are derived client-side by
        // buildHazardMessageFeed (a message awaiting reply clears itself once answered).
    };

    return (
        <HazardContext.Provider value={{ hazards, getHazardById, submitHazard, updateHazard, deleteHazard, publishHazard, postHazardMessage, currentUserId }}>
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
