// DMS (Document Management System) Types

export type SuggestionStatus =
    | 'DRAFT'
    | 'UNDER_REVIEW'
    | 'ASSIGNED'
    | 'APPROVED'
    | 'REJECTED';

export interface SelectionRect {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface DMSUser {
    id: string;
    email: string;
    fullName: string;
    role: 'PILOT' | 'ADMIN' | 'SAFETY_OFFICER' | 'DMS_MANAGER' | 'MAINTENANCE';
}

export interface UserGroup {
    id: string;
    name: string;
    description: string;
}

export interface DMSDocument {
    id: string;
    title: string;
    category: 'GOM' | 'MEL' | 'CHECKLIST' | 'SOP' | 'TRAINING';
    s3KeyPrefix: string;
    createdBy: string;
    createdAt: Date;
}

export interface Revision {
    id: string;
    documentId: string;
    versionLabel: string;
    fileUrl: string;
    fileChecksum: string;
    verificationPinHash?: string;
    effectiveDate: Date;
    expirationDate?: Date;
    isActive: boolean;
    changeLogSummary: string;
}

export interface Suggestion {
    id: string;
    revisionId: string;
    documentId: string;
    documentTitle: string;
    authorId: string;
    authorName: string;
    pageNumber: number;
    selectionRect: SelectionRect;
    originalText: string;
    proposedText: string;
    rationale: string;
    status: SuggestionStatus;
    assignedDepartment?: 'SAFETY' | 'MAINTENANCE' | 'OPERATIONS' | 'TRAINING';
    createdAt: Date;
    updatedAt: Date;
}

export interface SuggestionComment {
    id: string;
    suggestionId: string;
    userId: string;
    userName: string;
    commentText: string;
    createdAt: Date;
}

export interface ComplianceLog {
    id: string;
    userId: string;
    revisionId: string;
    actionType: 'DOWNLOAD_COMPLETE' | 'PIN_VERIFIED' | 'DOCUMENT_VIEWED';
    actionTimestamp: Date;
    deviceId: string;
    ipAddress: string;
    metadata?: Record<string, unknown>;
}
