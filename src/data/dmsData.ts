import { DMSDocument, Revision, Suggestion, SuggestionComment, DMSUser } from '../types/dmsTypes';

// Sample Users
export const dmsUsers: DMSUser[] = [
    { id: 'u1', email: 'john.smith@aviation.com', fullName: 'Capt. John Smith', role: 'PILOT' },
    { id: 'u2', email: 'sarah.jones@aviation.com', fullName: 'Sarah Jones', role: 'SAFETY_OFFICER' },
    { id: 'u3', email: 'mike.wilson@aviation.com', fullName: 'Mike Wilson', role: 'DMS_MANAGER' },
    { id: 'u4', email: 'lisa.chen@aviation.com', fullName: 'Lisa Chen', role: 'MAINTENANCE' },
    { id: 'u5', email: 'tom.davis@aviation.com', fullName: 'F/O Tom Davis', role: 'PILOT' },
];

// Sample Documents
export const dmsDocuments: DMSDocument[] = [
    {
        id: 'doc1',
        title: 'G650 General Operations Manual',
        category: 'GOM',
        s3KeyPrefix: 'manuals/G650/GOM',
        createdBy: 'u3',
        createdAt: new Date('2024-01-15'),
    },
    {
        id: 'doc2',
        title: 'G650 Minimum Equipment List',
        category: 'MEL',
        s3KeyPrefix: 'manuals/G650/MEL',
        createdBy: 'u3',
        createdAt: new Date('2024-02-01'),
    },
    {
        id: 'doc3',
        title: 'Normal Procedures Checklist',
        category: 'CHECKLIST',
        s3KeyPrefix: 'manuals/checklists/normal',
        createdBy: 'u3',
        createdAt: new Date('2024-03-10'),
    },
];

// Sample Revisions
export const dmsRevisions: Revision[] = [
    {
        id: 'rev1',
        documentId: 'doc1',
        versionLabel: 'Rev 5.2',
        fileUrl: 'https://www.faa.gov/documentLibrary/media/Advisory_Circular/AC_91-78.pdf',
        fileChecksum: 'abc123hash',
        effectiveDate: new Date('2024-06-01'),
        isActive: true,
        changeLogSummary: 'Updated APU start procedures, revised international operations section.',
    },
    {
        id: 'rev2',
        documentId: 'doc2',
        versionLabel: 'Rev 2.1',
        fileUrl: 'https://www.faa.gov/documentLibrary/media/Advisory_Circular/AC_120-76E.pdf',
        fileChecksum: 'def456hash',
        effectiveDate: new Date('2024-05-15'),
        isActive: true,
        changeLogSummary: 'Added new dispatch deviations for AHRS system.',
    },
];

// Sample Suggestions with different workflow states
export const dmsSuggestions: Suggestion[] = [
    {
        id: 'sug1',
        revisionId: 'rev1',
        documentId: 'doc1',
        documentTitle: 'G650 General Operations Manual',
        authorId: 'u1',
        authorName: 'Capt. John Smith',
        pageNumber: 14,
        selectionRect: { x: 72, y: 340, width: 468, height: 45 },
        originalText: 'The APU must be started before engine start to ensure adequate electrical power.',
        proposedText: 'The APU should be started before engine start to ensure adequate electrical power and conserve battery life during ground operations.',
        rationale: 'Adding clarification based on new OEM guidance from Gulfstream Service Bulletin 2024-03. This better explains the reasoning behind the procedure.',
        status: 'UNDER_REVIEW',
        createdAt: new Date('2024-11-20'),
        updatedAt: new Date('2024-11-20'),
    },
    {
        id: 'sug2',
        revisionId: 'rev1',
        documentId: 'doc1',
        documentTitle: 'G650 General Operations Manual',
        authorId: 'u5',
        authorName: 'F/O Tom Davis',
        pageNumber: 28,
        selectionRect: { x: 72, y: 180, width: 468, height: 60 },
        originalText: 'Minimum fuel reserve for domestic operations is 45 minutes.',
        proposedText: 'Minimum fuel reserve for domestic operations is 45 minutes at normal cruise power settings. For international operations, refer to Section 7.4.',
        rationale: 'Pilots have requested clarification on whether this applies to international ops. Adding cross-reference to avoid confusion.',
        status: 'ASSIGNED',
        assignedDepartment: 'SAFETY',
        createdAt: new Date('2024-11-18'),
        updatedAt: new Date('2024-11-22'),
    },
    {
        id: 'sug3',
        revisionId: 'rev2',
        documentId: 'doc2',
        documentTitle: 'G650 Minimum Equipment List',
        authorId: 'u4',
        authorName: 'Lisa Chen',
        pageNumber: 5,
        selectionRect: { x: 72, y: 420, width: 468, height: 30 },
        originalText: 'Item may be inoperative for a maximum of 3 days.',
        proposedText: 'Item may be inoperative for a maximum of 10 days per MMEL revision.',
        rationale: 'FAA approved MMEL change extends the rectification interval. Current manual is out of date.',
        status: 'APPROVED',
        assignedDepartment: 'MAINTENANCE',
        createdAt: new Date('2024-10-05'),
        updatedAt: new Date('2024-10-15'),
    },
    {
        id: 'sug4',
        revisionId: 'rev1',
        documentId: 'doc1',
        documentTitle: 'G650 General Operations Manual',
        authorId: 'u1',
        authorName: 'Capt. John Smith',
        pageNumber: 42,
        selectionRect: { x: 72, y: 280, width: 468, height: 40 },
        originalText: 'Contact dispatch via SATCOM or ACARS.',
        proposedText: 'Contact dispatch via SATCOM, ACARS, or company frequency 131.95.',
        rationale: 'Adding the company frequency as an option when transitioning from domestic to oceanic.',
        status: 'REJECTED',
        createdAt: new Date('2024-09-12'),
        updatedAt: new Date('2024-09-20'),
    },
    {
        id: 'sug5',
        revisionId: 'rev1',
        documentId: 'doc1',
        documentTitle: 'G650 General Operations Manual',
        authorId: 'u5',
        authorName: 'F/O Tom Davis',
        pageNumber: 8,
        selectionRect: { x: 72, y: 520, width: 468, height: 35 },
        originalText: 'Weather minimums for takeoff are 300ft ceiling and 1SM visibility.',
        proposedText: 'Weather minimums for takeoff are 300ft ceiling and 1SM visibility, or as authorized by OpSpec C077.',
        rationale: 'We have lower takeoff minimums authorized. This should be referenced.',
        status: 'DRAFT',
        createdAt: new Date('2024-11-25'),
        updatedAt: new Date('2024-11-25'),
    },
];

// Sample Comments
export const dmsSuggestionComments: SuggestionComment[] = [
    {
        id: 'com1',
        suggestionId: 'sug1',
        userId: 'u2',
        userName: 'Sarah Jones',
        commentText: 'Good catch. I verified this aligns with the new Gulfstream guidance. Recommend approval.',
        createdAt: new Date('2024-11-21'),
    },
    {
        id: 'com2',
        suggestionId: 'sug2',
        userId: 'u2',
        userName: 'Sarah Jones',
        commentText: 'Assigned to Safety for review. Please verify the cross-reference to Section 7.4 is accurate.',
        createdAt: new Date('2024-11-22'),
    },
    {
        id: 'com3',
        suggestionId: 'sug2',
        userId: 'u3',
        userName: 'Mike Wilson',
        commentText: 'Section 7.4 confirmed. This is a valid improvement to clarity.',
        createdAt: new Date('2024-11-23'),
    },
    {
        id: 'com4',
        suggestionId: 'sug3',
        userId: 'u4',
        userName: 'Lisa Chen',
        commentText: 'Attached the FAA MMEL approval letter as supporting documentation.',
        createdAt: new Date('2024-10-08'),
    },
    {
        id: 'com5',
        suggestionId: 'sug4',
        userId: 'u2',
        userName: 'Sarah Jones',
        commentText: 'Rejected: Company frequency is already listed in the Communications chapter. Adding it here would create redundancy and potential update conflicts.',
        createdAt: new Date('2024-09-20'),
    },
];

// Helper functions
export const getSuggestionsByStatus = (status?: string) => {
    if (!status || status === 'ALL') return dmsSuggestions;
    return dmsSuggestions.filter(s => s.status === status);
};

export const getSuggestionById = (id: string) => {
    return dmsSuggestions.find(s => s.id === id);
};

export const getCommentsBySuggestionId = (suggestionId: string) => {
    return dmsSuggestionComments.filter(c => c.suggestionId === suggestionId);
};

export const getDocumentById = (id: string) => {
    return dmsDocuments.find(d => d.id === id);
};

export const getRevisionById = (id: string) => {
    return dmsRevisions.find(r => r.id === id);
};
