import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNotificationContext } from '../components/contexts/NotificationContext';

export interface AuditChecklistItem {
    id: number;
    item: string;
    completed: boolean; // legacy - kept for compatibility
    status: 'Pass' | 'Fail' | 'Pending';
}

export interface AuditFinding {
    id: number;
    description: string;
    severity: string;
    status: string;
}

export interface Audit {
    id: string;
    title: string;
    type: string;
    category: string;
    status: string;
    priority: string;
    scheduledDate?: string;
    dueDate?: string;
    expirationDate?: string;
    protocolLink?: string;
    isbaoPart?: string; // e.g. "ISBAO Stage III §4.1" - displayed prominently on every card
    assignedTo: string;
    assignedRole: string;
    assignmentType: string;
    description: string;
    checklist: AuditChecklistItem[];
    findings: AuditFinding[];
    completionRate: number;
}

interface AuditContextType {
    audits: Audit[];
    getAuditById: (id: string) => Audit | undefined;
    getAuditsByMonth: (year: number, month: number) => Audit[]; // month is 0-indexed
    getPoolAudits: () => Audit[];
    addAudit: (audit: Omit<Audit, 'id'>) => void;
    updateAudit: (id: string, updates: Partial<Audit>) => void;
    deleteAudit: (id: string) => void;
}

const AuditContext = createContext<AuditContextType | undefined>(undefined);

// Initial Mock Data (used if localStorage is empty)
const INITIAL_AUDITS: Audit[] = [
    {
        id: 'AUD-001',
        title: 'Monthly Safety Audit - February 2026',
        type: 'Scheduled',
        category: 'Safety Management',
        status: 'In Progress',
        priority: 'High',
        isbaoPart: 'ISBAO Stage III §2.1',
        scheduledDate: '2026-02-15',
        dueDate: '2026-02-28',
        assignedTo: 'Sarah Wilson',
        assignedRole: 'Safety',
        assignmentType: 'Manual',
        description: 'Comprehensive monthly safety audit covering all operational areas',
        checklist: [
            { id: 1, item: 'Review incident reports from previous month', completed: true, status: 'Pass' as const },
            { id: 2, item: 'Inspect emergency equipment', completed: true, status: 'Pass' as const },
            { id: 3, item: 'Verify crew training records', completed: false, status: 'Fail' as const },
            { id: 4, item: 'Check fuel handling procedures', completed: false, status: 'Pending' as const },
            { id: 5, item: 'Review maintenance compliance', completed: false, status: 'Pending' as const }
        ],
        findings: [],
        completionRate: 40
    },
    {
        id: 'AUD-002',
        title: 'Ground Operations Audit',
        type: 'Scheduled',
        category: 'Ground Operations',
        status: 'Scheduled',
        priority: 'Medium',
        isbaoPart: 'ISBAO Stage III §4.1',
        scheduledDate: '2026-03-10',
        dueDate: '2026-03-20',
        assignedTo: 'Mike Johnson',
        assignedRole: 'Pilot',
        assignmentType: 'Manual',
        description: 'Audit of ground handling procedures and equipment maintenance',
        expirationDate: '2027-03-10',
        checklist: [
            { id: 6, item: 'Inspect ground support equipment', completed: false, status: 'Pending' as const },
            { id: 7, item: 'Review baggage handling procedures', completed: false, status: 'Pending' as const },
            { id: 8, item: 'Check aircraft positioning protocols', completed: false, status: 'Pending' as const },
            { id: 9, item: 'Verify safety zone compliance', completed: false, status: 'Pass' as const }
        ],
        findings: [],
        completionRate: 0
    },
    {
        id: 'AUD-003',
        title: 'Document Control Audit',
        type: 'Compliance',
        category: 'Documentation',
        status: 'Complete',
        priority: 'Low',
        isbaoPart: 'ISBAO Stage III §8.3',
        scheduledDate: '2026-01-15',
        dueDate: '2026-01-30',
        assignedTo: 'Emily Davis',
        assignedRole: 'Document Manager',
        assignmentType: 'Manual',
        description: 'Audit of document management and version control processes',
        expirationDate: '2027-01-30',
        checklist: [
            { id: 10, item: 'Verify document version control', completed: true, status: 'Pass' as const },
            { id: 11, item: 'Check distribution records', completed: true, status: 'Pass' as const },
            { id: 12, item: 'Review archive procedures', completed: true, status: 'Pass' as const },
            { id: 13, item: 'Validate electronic signatures', completed: true, status: 'Pass' as const }
        ],
        findings: [
            { id: 1, description: 'Minor discrepancy in version numbering', severity: 'Low', status: 'Resolved' },
            { id: 2, description: 'Distribution list needs updating', severity: 'Medium', status: 'Open' }
        ],
        completionRate: 100
    },
    {
        id: 'AUD-004',
        title: 'Maintenance Quality Assurance Review',
        type: 'Scheduled',
        category: 'Maintenance',
        status: 'Scheduled',
        priority: 'High',
        isbaoPart: 'ISBAO Stage III §5.2',
        scheduledDate: '2026-03-25',
        dueDate: '2026-04-05',
        assignedTo: 'Robert Martinez',
        assignedRole: 'Maintenance',
        assignmentType: 'Manual',
        description: 'Review maintenance procedures and quality assurance processes',
        expirationDate: '2027-03-25',
        checklist: [
            { id: 14, item: 'Review maintenance logs and records', completed: false, status: 'Pending' as const },
            { id: 15, item: 'Inspect tool calibration records', completed: false, status: 'Pending' as const },
            { id: 16, item: 'Check parts inventory management', completed: false, status: 'Fail' as const },
            { id: 17, item: 'Verify mechanic certifications', completed: false, status: 'Pending' as const },
            { id: 18, item: 'Review work order completion', completed: false, status: 'Pending' as const }
        ],
        findings: [],
        completionRate: 0
    },
    {
        id: 'AUD-005',
        title: 'Flight Operations Safety Review',
        type: 'Scheduled',
        category: 'Flight Operations',
        status: 'Scheduled',
        priority: 'High',
        isbaoPart: 'ISBAO Stage III §3.2',
        scheduledDate: '2026-04-10',
        dueDate: '2026-04-20',
        assignedTo: 'Unassigned',
        assignedRole: '',
        assignmentType: 'None',
        description: 'Review of flight operations procedures and crew compliance',
        expirationDate: '2027-04-10',
        checklist: [
            { id: 19, item: 'Verify flight manual currency', completed: false, status: 'Pending' as const },
            { id: 20, item: 'Inspect cockpit safety equipment', completed: false, status: 'Pending' as const },
            { id: 21, item: 'Review recent flight logs', completed: false, status: 'Pending' as const },
            { id: 22, item: 'Check weight and balance calculations', completed: false, status: 'Pending' as const }
        ],
        findings: [],
        completionRate: 0
    },
    {
        id: 'AUD-006',
        title: 'Crew Training Records Audit',
        type: 'Scheduled',
        category: 'Training',
        status: 'Scheduled',
        priority: 'Medium',
        isbaoPart: 'ISBAO Stage III §6.1',
        scheduledDate: '2026-04-22',
        dueDate: '2026-04-30',
        assignedTo: 'Unassigned',
        assignedRole: '',
        assignmentType: 'None',
        description: 'Verification of crew training records and recurrency requirements',
        expirationDate: '2027-04-22',
        checklist: [
            { id: 23, item: 'Review pilot training records', completed: false, status: 'Pending' as const },
            { id: 24, item: 'Verify simulator session completions', completed: false, status: 'Pending' as const },
            { id: 25, item: 'Check instructor certifications', completed: false, status: 'Pending' as const }
        ],
        findings: [],
        completionRate: 0
    },
    {
        id: 'AUD-007',
        title: 'Emergency Response Procedures',
        type: 'Compliance',
        category: 'Safety Management',
        status: 'Scheduled',
        priority: 'High',
        isbaoPart: 'ISBAO Stage III §2.4',
        scheduledDate: '2026-05-05',
        dueDate: '2026-05-15',
        assignedTo: 'Lisa Chen',
        assignedRole: 'Safety',
        assignmentType: 'Manual',
        description: 'Review of emergency response procedures and team readiness',
        expirationDate: '2027-05-05',
        checklist: [
            { id: 26, item: 'Review emergency contact lists', completed: false, status: 'Pending' as const },
            { id: 27, item: 'Verify emergency equipment inspections', completed: false, status: 'Pending' as const },
            { id: 28, item: 'Check crew emergency training currency', completed: false, status: 'Pending' as const }
        ],
        findings: [],
        completionRate: 0
    }
];

export const AUDIT_TEMPLATES = {
    'Safety Management': [
        'Review incident reports from previous month',
        'Inspect emergency equipment',
        'Verify crew training records',
        'Check fuel handling procedures',
        'Review maintenance compliance'
    ],
    'Maintenance': [
        'Review maintenance logs and records',
        'Inspect tool calibration records',
        'Check parts inventory management',
        'Verify mechanic certifications',
        'Review work order completion'
    ],
    'Ground Operations': [
        'Inspect ground support equipment',
        'Review baggage handling procedures',
        'Check aircraft positioning protocols',
        'Verify safety zone compliance'
    ],
    'Documentation': [
        'Verify document version control',
        'Check distribution records',
        'Review archive procedures',
        'Validate electronic signatures'
    ],
    'Flight Operations': [
        'Verify flight manual currency',
        'Inspect cockpit safety equipment',
        'Review recent flight logs',
        'Check weight and balance calculations',
        'Verify oxygen system pressure'
    ],
    'Training': [
        'Review pilot training records',
        'Verify simulator session completions',
        'Check classroom attendance logs',
        'Inspect training materials versioning',
        'Verify instructor certifications'
    ]
};

export const AuditProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [audits, setAudits] = useState<Audit[]>([]);

    useEffect(() => {
        const AUDIT_VERSION = 'v4'; // bump to clear stale localStorage
        const storedVersion = localStorage.getItem('antigravity_audits_version');
        const storedAudits = localStorage.getItem('antigravity_audits');
        if (storedAudits && storedVersion === AUDIT_VERSION) {
            setAudits(JSON.parse(storedAudits));
        } else {
            setAudits(INITIAL_AUDITS);
            localStorage.setItem('antigravity_audits', JSON.stringify(INITIAL_AUDITS));
            localStorage.setItem('antigravity_audits_version', AUDIT_VERSION);
        }
    }, []);

    const { addNotification } = useNotificationContext();

    // Check for audit expiry notifications (throttled to once per day)
    const checkExpiryNotifications = useCallback((auditList: Audit[]) => {
        const today = new Date();
        const todayKey = today.toISOString().split('T')[0];
        const lastChecked = localStorage.getItem('audit_expiry_checked');
        if (lastChecked === todayKey) return; // already ran today
        localStorage.setItem('audit_expiry_checked', todayKey);

        auditList.forEach(audit => {
            if (!audit.expirationDate) return;
            const exp = new Date(audit.expirationDate);
            const daysUntil = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 3600 * 24));

            if (daysUntil < 0) {
                addNotification({
                    title: `Audit Expired: ${audit.title}`,
                    message: `This audit expired ${Math.abs(daysUntil)} day(s) ago. Assigned to: ${audit.assignedTo}.`,
                    type: 'audit',
                    priority: 'critical',
                    actionUrl: '/internal-audits',
                    actionText: 'View Audit',
                    module: 'Audit Management',
                    relatedId: audit.id,
                    daysUntilDue: daysUntil
                });
            } else if (daysUntil <= 30) {
                addNotification({
                    title: `Audit Expiring Soon: ${audit.title}`,
                    message: `This audit expires in ${daysUntil} day(s). Assigned to: ${audit.assignedTo}.`,
                    type: 'audit',
                    priority: daysUntil <= 7 ? 'high' : 'medium',
                    actionUrl: '/safety/audits',
                    actionText: 'View Audit',
                    module: 'Audit Management',
                    relatedId: audit.id,
                    daysUntilDue: daysUntil
                });
            }
        });
    }, [addNotification]);

    useEffect(() => {
        if (audits.length > 0) {
            checkExpiryNotifications(audits);
        }
    }, [audits, checkExpiryNotifications]);

    // Save strictly to local storage after any updates.
    useEffect(() => {
        if (audits.length > 0) {
            localStorage.setItem('antigravity_audits', JSON.stringify(audits));
        }
    }, [audits]);

    const getAuditById = (id: string) => audits.find(a => a.id === id);

    // Returns all audits scheduled in a given year/month (month is 0-indexed, like Date)
    const getAuditsByMonth = (year: number, month: number): Audit[] => {
        return audits.filter(audit => {
            if (!audit.scheduledDate || audit.status === 'Draft') return false;
            const d = new Date(audit.scheduledDate + 'T00:00:00'); // force local parse
            return d.getFullYear() === year && d.getMonth() === month;
        });
    };

    // Returns all unscheduled draft audits
    const getPoolAudits = (): Audit[] => {
        return audits.filter(audit => audit.status === 'Draft');
    };

    const addAudit = (auditData: Omit<Audit, 'id'>) => {
        const maxId = audits.reduce((max, a) => {
            const numPart = a.id.split('-')[1];
            if (!numPart) return max;
            const num = parseInt(numPart, 10);
            return num > max ? num : max;
        }, 0);
        const newId = `AUD-${String(maxId + 1).padStart(3, '0')}`;

        const newAudit: Audit = {
            ...auditData,
            id: newId
        };
        setAudits(prev => [newAudit, ...prev]);
    };

    const updateAudit = (id: string, updates: Partial<Audit>) => {
        setAudits(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
    };

    const deleteAudit = (id: string) => {
        setAudits(prev => prev.filter(a => a.id !== id));
        // Note: If audits becomes empty, the generic effect might avoid updating localStorage to avoid losing initial.
        // So we explicitly set it here just in case.
        setAudits(prev => {
            const newAudits = prev.filter(a => a.id !== id);
            localStorage.setItem('antigravity_audits', JSON.stringify(newAudits));
            return newAudits;
        });
    };

    return (
        <AuditContext.Provider value={{ audits, getAuditById, getAuditsByMonth, getPoolAudits, addAudit, updateAudit, deleteAudit }}>
            {children}
        </AuditContext.Provider>
    );
};

export const useAudits = () => {
    const context = useContext(AuditContext);
    if (!context) {
        throw new Error('useAudits must be used within an AuditProvider');
    }
    return context;
};
