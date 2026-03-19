import React, { createContext, useContext, useState, useEffect } from 'react';

export interface AuditChecklistItem {
    id: number;
    item: string;
    completed: boolean;
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
    scheduledDate: string;
    dueDate: string;
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
    addAudit: (audit: Omit<Audit, 'id'>) => void;
    updateAudit: (id: string, updates: Partial<Audit>) => void;
    deleteAudit: (id: string) => void;
}

const AuditContext = createContext<AuditContextType | undefined>(undefined);

// Initial Mock Data (used if localStorage is empty)
const INITIAL_AUDITS: Audit[] = [
    {
        id: 'AUD-001',
        title: 'Monthly Safety Audit - February 2024',
        type: 'Scheduled',
        category: 'Safety Management',
        status: 'In Progress',
        priority: 'High',
        scheduledDate: '2024-02-15',
        dueDate: '2024-02-28',
        assignedTo: 'Sarah Wilson',
        assignedRole: 'Safety',
        assignmentType: 'Manual',
        description: 'Comprehensive monthly safety audit covering all operational areas',
        checklist: [
            { id: 1, item: 'Review incident reports from previous month', completed: true },
            { id: 2, item: 'Inspect emergency equipment', completed: true },
            { id: 3, item: 'Verify crew training records', completed: false },
            { id: 4, item: 'Check fuel handling procedures', completed: false },
            { id: 5, item: 'Review maintenance compliance', completed: false }
        ],
        findings: [],
        completionRate: 40
    },
    {
        id: 'AUD-002',
        title: 'Ground Operations Audit',
        type: 'Ad-hoc',
        category: 'Ground Operations',
        status: 'Scheduled',
        priority: 'Medium',
        scheduledDate: '2024-02-20',
        dueDate: '2024-02-25',
        assignedTo: 'Mike Johnson',
        assignedRole: 'Pilot',
        assignmentType: 'Random (Pilot)',
        description: 'Audit of ground handling procedures and equipment maintenance',
        checklist: [
            { id: 6, item: 'Inspect ground support equipment', completed: false },
            { id: 7, item: 'Review baggage handling procedures', completed: false },
            { id: 8, item: 'Check aircraft positioning protocols', completed: false },
            { id: 9, item: 'Verify safety zone compliance', completed: false }
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
        scheduledDate: '2024-01-30',
        dueDate: '2024-02-05',
        assignedTo: 'Emily Davis',
        assignedRole: 'Document Manager',
        assignmentType: 'Random (Any)',
        description: 'Audit of document management and version control processes',
        checklist: [
            { id: 10, item: 'Verify document version control', completed: true },
            { id: 11, item: 'Check distribution records', completed: true },
            { id: 12, item: 'Review archive procedures', completed: true },
            { id: 13, item: 'Validate electronic signatures', completed: true }
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
        scheduledDate: '2024-02-25',
        dueDate: '2024-03-05',
        assignedTo: 'Robert Martinez',
        assignedRole: 'Maintenance',
        assignmentType: 'Random (Maintenance)',
        description: 'Review maintenance procedures and quality assurance processes',
        checklist: [
            { id: 14, item: 'Review maintenance logs and records', completed: false },
            { id: 15, item: 'Inspect tool calibration records', completed: false },
            { id: 16, item: 'Check parts inventory management', completed: false },
            { id: 17, item: 'Verify mechanic certifications', completed: false },
            { id: 18, item: 'Review work order completion', completed: false }
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
        const storedAudits = localStorage.getItem('antigravity_audits');
        if (storedAudits) {
            setAudits(JSON.parse(storedAudits));
        } else {
            setAudits(INITIAL_AUDITS);
            localStorage.setItem('antigravity_audits', JSON.stringify(INITIAL_AUDITS));
        }
    }, []);

    // Save strictly to local storage after any updates.
    useEffect(() => {
        if (audits.length > 0) {
            localStorage.setItem('antigravity_audits', JSON.stringify(audits));
        }
    }, [audits]);

    const getAuditById = (id: string) => audits.find(a => a.id === id);

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
        <AuditContext.Provider value={{ audits, getAuditById, addAudit, updateAudit, deleteAudit }}>
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
