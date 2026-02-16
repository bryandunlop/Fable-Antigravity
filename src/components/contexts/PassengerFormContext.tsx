import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface FormField {
    id: string;
    label: string;
    type: 'text' | 'email' | 'phone' | 'date' | 'select' | 'checkbox' | 'textarea' | 'number' | 'file-upload' | 'address-lookup';
    required: boolean;
    placeholder?: string;
    options?: string[];
    helpText?: string;
    validation?: {
        pattern?: string;
        minLength?: number;
        maxLength?: number;
        min?: number;
        max?: number;
    };
    section?: string; // Group fields into sections
    isDocumentExpiration?: boolean; // Track if this field is a document expiration date
    documentType?: 'passport' | 'visa' | 'medical' | 'other';
    triggerEmail?: string; // Email to notify if this field has specific value
    triggerCondition?: any; // Value that triggers the email
}

export interface FormTemplate {
    id: string;
    name: string;
    type: 'domestic' | 'international' | 'sponsored-trip';
    description: string;
    fields: FormField[];
    version: number;
    createdAt: string;
    updatedAt: string;
    createdBy: string;
    isActive: boolean;
}

export interface DocumentExpiration {
    fieldId: string;
    fieldLabel: string;
    documentType: 'passport' | 'visa' | 'medical' | 'other';
    expirationDate: string;
    daysUntilExpiration: number;
    isExpiringSoon: boolean; // True if expires within 30 days
    isExpired: boolean;
}

export interface FormSubmission {
    id: string;
    templateId: string;
    templateVersion: number;
    formType: 'domestic' | 'international' | 'sponsored-trip';
    passengerInfo: {
        name: string;
        email: string;
        phone?: string;
    };
    responses: Record<string, any>;
    submittedAt: string;
    submittedVia: 'public-link' | 'admin-assistant' | 'scheduler';
    submittedBy?: string;
    status: 'new' | 'reviewed' | 'entered-myairops' | 'archived' | 'decommissioned';
    reviewedAt?: string;
    reviewedBy?: string;
    enteredAt?: string;
    enteredBy?: string;
    notes?: string;
    linkId?: string;

    // Expiration tracking
    dataAge: number;
    isOutdated: boolean;
    decommissionedAt?: string;
    documentExpirations?: DocumentExpiration[];
    hasExpiringDocuments: boolean;
    uploadedDocuments?: UploadedDocument[];
}

export interface UploadedDocument {
    id: string;
    fileName: string;
    documentName: string;
    expirationDate?: string;
    uploadedAt: string;
    fileUrl: string; // In production, this would be a cloud storage URL
}

export interface SharedFormLink {
    id: string;
    templateId: string;
    formType: 'domestic' | 'international' | 'sponsored-trip';
    createdBy: string;
    createdAt: string;
    expiresAt?: string;
    recipientEmail?: string;
    recipientName?: string;
    accessCount: number;
    lastAccessedAt?: string;
    submissionId?: string;
    status: 'active' | 'used' | 'expired';
}

interface PassengerFormContextType {
    // Templates
    templates: FormTemplate[];
    getTemplate: (type: 'domestic' | 'international' | 'sponsored-trip') => FormTemplate | undefined;
    updateTemplate: (templateId: string, updates: Partial<FormTemplate>) => void;

    // Submissions
    submissions: FormSubmission[];
    addSubmission: (submission: Omit<FormSubmission, 'id' | 'dataAge' | 'isOutdated' | 'hasExpiringDocuments' | 'documentExpirations'>) => void;
    updateSubmission: (submissionId: string, updates: Partial<FormSubmission>) => void;
    getSubmission: (submissionId: string) => FormSubmission | undefined;

    // Filtering
    getNewSubmissions: () => FormSubmission[];
    getExpiringDocuments: () => FormSubmission[];
    getOutdatedData: () => FormSubmission[];

    // Shared Links
    sharedLinks: SharedFormLink[];
    createSharedLink: (link: Omit<SharedFormLink, 'id' | 'createdAt' | 'accessCount' | 'status'>) => SharedFormLink;
    getSharedLink: (linkId: string) => SharedFormLink | undefined;

    // Notifications
    newSubmissionCount: number;
    expiringDocumentCount: number;
    outdatedDataCount: number;
}

const PassengerFormContext = createContext<PassengerFormContextType | undefined>(undefined);

// ============================================================================
// FORM TEMPLATES
// ============================================================================

const DOMESTIC_TEMPLATE: FormTemplate = {
    id: 'TPL-DOMESTIC-001',
    name: 'Domestic Travel Form',
    type: 'domestic',
    description: 'Required information for domestic travel on company aircraft',
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'system',
    isActive: true,
    fields: [
        // Basic Information
        { id: 'tripDate', label: 'Trip Date', type: 'date', required: true, section: 'Basic Information' },
        { id: 'firstName', label: 'First Name', type: 'text', required: true, section: 'Basic Information' },
        { id: 'middleName', label: 'Middle Name', type: 'text', required: true, helpText: 'Enter NMN if no middle name', section: 'Basic Information' },
        { id: 'lastName', label: 'Last Name', type: 'text', required: true, section: 'Basic Information' },
        { id: 'gender', label: 'Gender', type: 'select', required: true, options: ['Male', 'Female'], section: 'Basic Information' },
        { id: 'tNumber', label: 'T Number', type: 'text', required: true, section: 'Basic Information' },
        { id: 'companyEmail', label: 'Company Email', type: 'email', required: true, section: 'Basic Information' },
        { id: 'companyPhone', label: 'Company Phone Number', type: 'phone', required: true, section: 'Basic Information' },
        { id: 'dietaryRestrictions', label: 'Dietary Restrictions or Food Allergies', type: 'textarea', required: false, section: 'Basic Information' },

        // Emergency Contact
        { id: 'emergencyContactName', label: 'Emergency Contact - Full Name', type: 'text', required: true, section: 'Emergency Contact', helpText: 'If your primary emergency contact is also an employee who may fly on the company aircraft, please provide an alternate emergency contact' },
        { id: 'emergencyContactPhone', label: 'Emergency Contact - Phone Number', type: 'phone', required: true, section: 'Emergency Contact' },
        { id: 'emergencyContactRelationship', label: 'Emergency Contact - Relationship', type: 'text', required: true, section: 'Emergency Contact' },
        { id: 'emergencyContactLanguage', label: 'Emergency Contact Primary Language', type: 'text', required: false, section: 'Emergency Contact', helpText: 'If your emergency contact is unable to speak and/or understand English, please specify their primary language' },

        // Special Needs
        { id: 'canHearEnglish', label: 'Can you hear and understand commands from the crew in English?', type: 'select', required: true, options: ['Yes', 'No'], section: 'Special Needs and Additional Support' },
        { id: 'canSeeVisualCommands', label: 'Can you see and understand visual commands from the crew?', type: 'select', required: true, options: ['Yes', 'No'], section: 'Special Needs and Additional Support' },
        { id: 'canWalkUnassisted', label: 'Can you stand, walk, and get in and out of a chair without assistance?', type: 'select', required: true, options: ['Yes', 'No'], section: 'Special Needs and Additional Support' },
        { id: 'canUseStairs', label: 'Can you ascend and descend a flight of stairs without assistance?', type: 'select', required: true, options: ['Yes', 'No'], section: 'Special Needs and Additional Support' },
        { id: 'needsSeatbeltExtender', label: 'Do you need a seat belt extender?', type: 'select', required: true, options: ['Yes', 'No'], section: 'Special Needs and Additional Support' },
        { id: 'wantsMedicalConsult', label: 'Prior to travel would you like to speak to someone from Medical to address any specific medical concerns?', type: 'select', required: true, options: ['Yes', 'No'], section: 'Special Needs and Additional Support', triggerEmail: 'medical@company.com', triggerCondition: 'Yes', helpText: 'NOTE: Update medical@company.com to actual medical team email' },
        { id: 'otherSpecialNeeds', label: 'Do you have any other special needs of which we should be made aware?', type: 'textarea', required: false, section: 'Special Needs and Additional Support' },
        { id: 'assistiveEquipment', label: 'Will you be bringing any assistive equipment with you when you fly?', type: 'textarea', required: false, section: 'Special Needs and Additional Support', helpText: 'Examples: wheelchairs, scooters, walkers, canes, crutches, portable oxygen, etc.' },
    ]
};

const INTERNATIONAL_TEMPLATE: FormTemplate = {
    id: 'TPL-INTERNATIONAL-001',
    name: 'International Travel Form',
    type: 'international',
    description: 'Required information for international travel on company aircraft',
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'system',
    isActive: true,
    fields: [
        // All Domestic fields
        ...DOMESTIC_TEMPLATE.fields,

        // International Traveler Information
        { id: 'countryOfCitizenship', label: 'Country of Citizenship', type: 'text', required: true, section: 'International Traveler Information' },
        { id: 'countryOfResidence', label: 'Country of Residence', type: 'text', required: true, section: 'International Traveler Information' },
        { id: 'placeOfBirth', label: 'Place of Birth (City, State, Country)', type: 'text', required: true, section: 'International Traveler Information' },
        { id: 'usAddress', label: 'Temporary or Permanent Address in U.S.', type: 'address-lookup', required: false, section: 'International Traveler Information', helpText: 'Leave blank if not flying to or from U.S.' },
        { id: 'passportNumber', label: 'Passport Number', type: 'text', required: true, section: 'International Traveler Information' },
        { id: 'passportIssueDate', label: 'Passport Issue Date', type: 'date', required: true, section: 'International Traveler Information' },
        { id: 'passportExpirationDate', label: 'Passport Expiration Date', type: 'date', required: true, section: 'International Traveler Information', isDocumentExpiration: true, documentType: 'passport' },
        { id: 'visaNumber', label: 'Visa Number (if applicable)', type: 'text', required: false, section: 'International Traveler Information' },
        { id: 'visaIssueDate', label: 'Visa Issue Date', type: 'date', required: false, section: 'International Traveler Information' },
        { id: 'visaExpirationDate', label: 'Visa Expiration Date', type: 'date', required: false, section: 'International Traveler Information', isDocumentExpiration: true, documentType: 'visa' },
        { id: 'travelDocuments', label: 'Upload Travel Documents', type: 'file-upload', required: true, section: 'International Traveler Information', helpText: 'Upload ALL trip relevant travel documents including: Passports, permanent residence cards, and visas.' },
    ]
};

const SPONSORED_TRIP_TEMPLATE: FormTemplate = {
    id: 'TPL-SPONSORED-001',
    name: 'Sponsored Trip Request Form',
    type: 'sponsored-trip',
    description: 'Request form for sponsored trips requiring CHRO approval',
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'system',
    isActive: true,
    fields: [
        { id: 'approvingUser', label: 'Approving Authorized User', type: 'text', required: true, section: 'Authorization', helpText: 'Note: Executives in positions at Band 7 or higher are considered "Authorized Users"' },
        { id: 'costCenter', label: 'Cost Center Number', type: 'text', required: true, section: 'Authorization' },
        { id: 'requestDate', label: 'Trip Request Date', type: 'date', required: true, section: 'Authorization' },

        { id: 'regionsOrCities', label: 'Regions or Cities to be Visited', type: 'textarea', required: true, section: 'Itinerary', helpText: 'Changes other than Departure Date/Times must be approved by the Approving Authorized User and CHRO' },
        { id: 'businessPurpose', label: 'Business Purpose', type: 'textarea', required: true, section: 'Itinerary' },

        { id: 'passengerList', label: 'Full Name(s) and T-Number(s)', type: 'textarea', required: true, section: 'Passengers', helpText: 'Please indicate a lead passenger. Final manifest is required 3 working days prior to the trip. Additional information is required for international flights.' },
    ]
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function calculateDataAge(submittedAt: string): number {
    const submitted = new Date(submittedAt);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - submitted.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
}

function calculateDaysUntilExpiration(expirationDate: string): number {
    const expiration = new Date(expirationDate);
    const now = new Date();
    const diffTime = expiration.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
}

function extractDocumentExpirations(template: FormTemplate, responses: Record<string, any>): DocumentExpiration[] {
    const expirations: DocumentExpiration[] = [];

    template.fields.forEach(field => {
        if (field.isDocumentExpiration && responses[field.id]) {
            const expirationDate = responses[field.id];
            const daysUntil = calculateDaysUntilExpiration(expirationDate);

            expirations.push({
                fieldId: field.id,
                fieldLabel: field.label,
                documentType: field.documentType || 'other',
                expirationDate,
                daysUntilExpiration: daysUntil,
                isExpiringSoon: daysUntil <= 30 && daysUntil >= 0,
                isExpired: daysUntil < 0
            });
        }
    });

    return expirations;
}

// ============================================================================
// PROVIDER COMPONENT
// ============================================================================

export function PassengerFormProvider({ children }: { children: ReactNode }) {
    const [templates, setTemplates] = useState<FormTemplate[]>([
        DOMESTIC_TEMPLATE,
        INTERNATIONAL_TEMPLATE,
        SPONSORED_TRIP_TEMPLATE
    ]);

    const [submissions, setSubmissions] = useState<FormSubmission[]>([
        // Mock submission 1 - New domestic submission
        {
            id: 'SUB-001',
            templateId: 'TPL-DOMESTIC-001',
            templateVersion: 1,
            formType: 'domestic',
            passengerInfo: {
                name: 'John Smith',
                email: 'john.smith@company.com',
                phone: '+1-555-0123'
            },
            responses: {
                tripDate: '2025-01-15',
                firstName: 'John',
                middleName: 'Michael',
                lastName: 'Smith',
                gender: 'Male',
                tNumber: 'T12345',
                companyEmail: 'john.smith@company.com',
                companyPhone: '+1-555-0123',
                dietaryRestrictions: 'No shellfish',
                emergencyContactName: 'Jane Smith',
                emergencyContactPhone: '+1-555-0124',
                emergencyContactRelationship: 'Spouse',
                canHearEnglish: 'Yes',
                canSeeVisualCommands: 'Yes',
                canWalkUnassisted: 'Yes',
                canUseStairs: 'Yes',
                needsSeatbeltExtender: 'No',
                wantsMedicalConsult: 'No'
            },
            submittedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
            submittedVia: 'public-link',
            status: 'new',
            dataAge: 0,
            isOutdated: false,
            hasExpiringDocuments: false
        },
        // Mock submission 2 - International with expiring passport
        {
            id: 'SUB-002',
            templateId: 'TPL-INTERNATIONAL-001',
            templateVersion: 1,
            formType: 'international',
            passengerInfo: {
                name: 'Maria Garcia',
                email: 'maria.garcia@company.com',
                phone: '+1-555-0234'
            },
            responses: {
                tripDate: '2025-02-01',
                firstName: 'Maria',
                middleName: 'Elena',
                lastName: 'Garcia',
                gender: 'Female',
                tNumber: 'T67890',
                companyEmail: 'maria.garcia@company.com',
                companyPhone: '+1-555-0234',
                emergencyContactName: 'Carlos Garcia',
                emergencyContactPhone: '+1-555-0235',
                emergencyContactRelationship: 'Brother',
                canHearEnglish: 'Yes',
                canSeeVisualCommands: 'Yes',
                canWalkUnassisted: 'Yes',
                canUseStairs: 'Yes',
                needsSeatbeltExtender: 'No',
                wantsMedicalConsult: 'No',
                countryOfCitizenship: 'Mexico',
                countryOfResidence: 'United States',
                placeOfBirth: 'Mexico City, Mexico',
                passportNumber: 'M12345678',
                passportIssueDate: '2020-01-15',
                passportExpirationDate: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 25 days from now
                visaNumber: 'V987654',
                visaIssueDate: '2023-06-01',
                visaExpirationDate: '2026-06-01'
            },
            submittedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
            submittedVia: 'admin-assistant',
            status: 'reviewed',
            reviewedAt: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString(),
            reviewedBy: 'Scheduler-001',
            dataAge: 0,
            isOutdated: false,
            hasExpiringDocuments: false
        },
        // Mock submission 3 - Outdated data (over 2 years old)
        {
            id: 'SUB-003',
            templateId: 'TPL-DOMESTIC-001',
            templateVersion: 1,
            formType: 'domestic',
            passengerInfo: {
                name: 'Robert Johnson',
                email: 'robert.johnson@company.com',
                phone: '+1-555-0345'
            },
            responses: {
                tripDate: '2022-06-15',
                firstName: 'Robert',
                middleName: 'James',
                lastName: 'Johnson',
                gender: 'Male',
                tNumber: 'T11111',
                companyEmail: 'robert.johnson@company.com',
                companyPhone: '+1-555-0345',
                emergencyContactName: 'Sarah Johnson',
                emergencyContactPhone: '+1-555-0346',
                emergencyContactRelationship: 'Wife',
                canHearEnglish: 'Yes',
                canSeeVisualCommands: 'Yes',
                canWalkUnassisted: 'Yes',
                canUseStairs: 'Yes',
                needsSeatbeltExtender: 'No',
                wantsMedicalConsult: 'No'
            },
            submittedAt: new Date(Date.now() - 800 * 24 * 60 * 60 * 1000).toISOString(), // Over 2 years ago
            submittedVia: 'public-link',
            status: 'entered-myairops',
            enteredAt: new Date(Date.now() - 795 * 24 * 60 * 60 * 1000).toISOString(),
            enteredBy: 'Scheduler-001',
            dataAge: 0,
            isOutdated: false,
            hasExpiringDocuments: false
        },
        // Mock submission 4 - Sponsored trip request
        {
            id: 'SUB-004',
            templateId: 'TPL-SPONSORED-001',
            templateVersion: 1,
            formType: 'sponsored-trip',
            passengerInfo: {
                name: 'Executive Team',
                email: 'exec.team@company.com'
            },
            responses: {
                approvingUser: 'Jane Doe - VP Operations',
                costCenter: 'CC-12345',
                requestDate: new Date().toISOString().split('T')[0],
                regionsOrCities: 'London, UK; Paris, France; Berlin, Germany',
                businessPurpose: 'Q1 2025 European Sales Strategy Meeting',
                passengerList: 'Jane Doe (T99999) - Lead\nJohn Smith (T12345)\nMaria Garcia (T67890)'
            },
            submittedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
            submittedVia: 'admin-assistant',
            submittedBy: 'Admin-Assistant-001',
            status: 'new',
            dataAge: 0,
            isOutdated: false,
            hasExpiringDocuments: false
        }
    ]);
    const [sharedLinks, setSharedLinks] = useState<SharedFormLink[]>([]);

    // Calculate expiration data for all submissions
    useEffect(() => {
        setSubmissions(prev => prev.map(submission => {
            const dataAge = calculateDataAge(submission.submittedAt);
            const isOutdated = dataAge > 730; // 2 years = 730 days

            const template = templates.find(t => t.id === submission.templateId);
            const documentExpirations = template ? extractDocumentExpirations(template, submission.responses) : [];
            const hasExpiringDocuments = documentExpirations.some(doc => doc.isExpiringSoon);

            return {
                ...submission,
                dataAge,
                isOutdated,
                documentExpirations,
                hasExpiringDocuments,
                status: isOutdated && submission.status !== 'decommissioned' ? 'decommissioned' : submission.status,
                decommissionedAt: isOutdated && !submission.decommissionedAt ? new Date().toISOString() : submission.decommissionedAt
            };
        }));
    }, [templates]);

    const getTemplate = (type: 'domestic' | 'international' | 'sponsored-trip') => {
        return templates.find(t => t.type === type && t.isActive);
    };

    const updateTemplate = (templateId: string, updates: Partial<FormTemplate>) => {
        setTemplates(prev => prev.map(t =>
            t.id === templateId ? { ...t, ...updates, updatedAt: new Date().toISOString(), version: t.version + 1 } : t
        ));
    };

    const addSubmission = (submission: Omit<FormSubmission, 'id' | 'dataAge' | 'isOutdated' | 'hasExpiringDocuments' | 'documentExpirations'>) => {
        const template = templates.find(t => t.id === submission.templateId);
        const documentExpirations = template ? extractDocumentExpirations(template, submission.responses) : [];

        const newSubmission: FormSubmission = {
            ...submission,
            id: `SUB-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            dataAge: 0,
            isOutdated: false,
            hasExpiringDocuments: documentExpirations.some(doc => doc.isExpiringSoon),
            documentExpirations
        };

        setSubmissions(prev => [newSubmission, ...prev]);

        // Check for email triggers
        if (template) {
            template.fields.forEach(field => {
                if (field.triggerEmail && submission.responses[field.id] === field.triggerCondition) {
                    console.log(`[TRIGGER] Email notification to ${field.triggerEmail} for ${field.label}`);
                    // In production, this would send an actual email
                }
            });
        }

        return newSubmission;
    };

    const updateSubmission = (submissionId: string, updates: Partial<FormSubmission>) => {
        setSubmissions(prev => prev.map(s =>
            s.id === submissionId ? { ...s, ...updates } : s
        ));
    };

    const getSubmission = (submissionId: string) => {
        return submissions.find(s => s.id === submissionId);
    };

    const getNewSubmissions = () => {
        return submissions.filter(s => s.status === 'new');
    };

    const getExpiringDocuments = () => {
        return submissions.filter(s => s.hasExpiringDocuments);
    };

    const getOutdatedData = () => {
        return submissions.filter(s => s.isOutdated);
    };

    const createSharedLink = (link: Omit<SharedFormLink, 'id' | 'createdAt' | 'accessCount' | 'status'>) => {
        const newLink: SharedFormLink = {
            ...link,
            id: `LINK-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            createdAt: new Date().toISOString(),
            accessCount: 0,
            status: 'active'
        };

        setSharedLinks(prev => [newLink, ...prev]);
        return newLink;
    };

    const getSharedLink = (linkId: string) => {
        return sharedLinks.find(l => l.id === linkId);
    };

    const value: PassengerFormContextType = {
        templates,
        getTemplate,
        updateTemplate,
        submissions,
        addSubmission,
        updateSubmission,
        getSubmission,
        getNewSubmissions,
        getExpiringDocuments,
        getOutdatedData,
        sharedLinks,
        createSharedLink,
        getSharedLink,
        newSubmissionCount: getNewSubmissions().length,
        expiringDocumentCount: getExpiringDocuments().length,
        outdatedDataCount: getOutdatedData().length
    };

    return (
        <PassengerFormContext.Provider value={value}>
            {children}
        </PassengerFormContext.Provider>
    );
}

export function usePassengerForms() {
    const context = useContext(PassengerFormContext);
    if (!context) {
        throw new Error('usePassengerForms must be used within PassengerFormProvider');
    }
    return context;
}
