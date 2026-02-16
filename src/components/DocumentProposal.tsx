import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ScrollArea } from './ui/scroll-area';
import { mockDocuments, type Document } from './data/documentData';
import { 
  FileEdit, 
  Send, 
  User, 
  Calendar, 
  AlertTriangle,
  FileText,
  Eye,
  MessageSquare,
  CheckCircle,
  XCircle,
  Clock,
  Upload,
  Download,
  GitCompare
} from 'lucide-react';

interface DocumentProposalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (proposal: DocumentProposal) => void;
  userInfo: {
    name: string;
    role: string;
    email: string;
  };
  selectedDocument?: {
    id: string;
    title: string;
    type: string;
    version?: string;
  } | null;
}

interface DocumentProposal {
  id: string;
  documentId: string;
  documentTitle: string;
  proposedBy: string;
  proposedByEmail: string;
  proposedByRole: string;
  proposalType: 'content-update' | 'new-section' | 'removal' | 'revision' | 'formatting';
  title: string;
  description: string;
  justification: string;
  proposedChanges: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  status: 'draft' | 'submitted' | 'under-review' | 'approved' | 'rejected' | 'implemented';
  submittedAt: Date;
  reviewedBy?: string;
  reviewedAt?: Date;
  reviewComments?: string;
  attachments?: File[];
  impactedSections: string[];
  implementationNotes?: string;
}

// Mock proposals for demonstration
const mockProposals: DocumentProposal[] = [
  {
    id: 'PROP001',
    documentId: 'DOC001',
    documentTitle: 'Flight Operations Manual v2.3',
    proposedBy: 'Captain Sarah Mitchell',
    proposedByEmail: 's.mitchell@airline.com',
    proposedByRole: 'Pilot',
    proposalType: 'content-update',
    title: 'Update Weather Minimums for Cat II Approaches',
    description: 'Propose updating weather minimums to align with new FAA regulations',
    justification: 'Recent FAA regulation changes require updates to approach minimums for enhanced safety',
    proposedChanges: 'Update Section 3.2.1 - Weather Minimums:\n- Change Cat II minimums from 100ft/1200RVR to 100ft/1000RVR\n- Add new autopilot requirements\n- Update go-around procedures',
    urgency: 'high',
    status: 'under-review',
    submittedAt: new Date('2025-01-25'),
    impactedSections: ['Section 3.2.1', 'Appendix B'],
    reviewComments: 'Under review by safety team. Awaiting regulatory compliance verification.'
  },
  {
    id: 'PROP002',
    documentId: 'DOC003',
    documentTitle: 'Emergency Response Checklist',
    proposedBy: 'Emma Davis',
    proposedByEmail: 'e.davis@airline.com',
    proposedByRole: 'Flight Attendant',
    proposalType: 'new-section',
    title: 'Add COVID-19 Medical Emergency Procedures',
    description: 'Add comprehensive procedures for handling COVID-19 related medical emergencies',
    justification: 'Need standardized procedures for pandemic-related medical situations during flight',
    proposedChanges: 'Add new Section 4.7 - Infectious Disease Emergency Response:\n- Isolation procedures\n- PPE requirements\n- Communication protocols\n- Diversion decision matrix',
    urgency: 'medium',
    status: 'approved',
    submittedAt: new Date('2025-01-20'),
    reviewedBy: 'Safety Manager',
    reviewedAt: new Date('2025-01-28'),
    impactedSections: ['Section 4', 'Medical Emergency Protocols'],
    reviewComments: 'Approved for implementation. Excellent addition to emergency procedures.'
  }
];

export default function DocumentProposal({ isOpen, onClose, onSubmit, userInfo, selectedDocument: preSelectedDocument }: DocumentProposalProps) {
  const [activeTab, setActiveTab] = useState('create');
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(
    preSelectedDocument ? mockDocuments.find(d => d.id === preSelectedDocument.id) || null : null
  );
  const [proposalForm, setProposalForm] = useState({
    proposalType: '',
    title: '',
    description: '',
    justification: '',
    proposedChanges: '',
    urgency: 'medium',
    impactedSections: [] as string[],
    implementationNotes: ''
  });

  const handleSubmit = () => {
    if (!selectedDocument) return;

    const newProposal: DocumentProposal = {
      id: `PROP${String(mockProposals.length + 1).padStart(3, '0')}`,
      documentId: selectedDocument.id,
      documentTitle: selectedDocument.title,
      proposedBy: userInfo.name,
      proposedByEmail: userInfo.email,
      proposedByRole: userInfo.role,
      proposalType: proposalForm.proposalType as any,
      title: proposalForm.title,
      description: proposalForm.description,
      justification: proposalForm.justification,
      proposedChanges: proposalForm.proposedChanges,
      urgency: proposalForm.urgency as any,
      status: 'submitted',
      submittedAt: new Date(),
      impactedSections: proposalForm.impactedSections,
      implementationNotes: proposalForm.implementationNotes
    };

    onSubmit(newProposal);
    onClose();

    // Reset form
    setProposalForm({
      proposalType: '',
      title: '',
      description: '',
      justification: '',
      proposedChanges: '',
      urgency: 'medium',
      impactedSections: [],
      implementationNotes: ''
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'submitted': return 'bg-blue-100 text-blue-800';
      case 'under-review': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'implemented': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'critical': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-[95vw] max-h-[85vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileEdit className="w-5 h-5 text-blue-600" />
            Document Improvement Proposals
          </DialogTitle>
          <DialogDescription>
            Suggest improvements, updates, or corrections to existing documents
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-[500px] lg:h-[600px]">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="create">Create Proposal</TabsTrigger>
            <TabsTrigger value="my-proposals">My Proposals</TabsTrigger>
            <TabsTrigger value="all-proposals">All Proposals</TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="h-full">
            <ScrollArea className="h-[420px] lg:h-[520px] pr-4">
              <div className="space-y-6">
                {/* Document Selection */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Select Document</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <Select 
                        value={selectedDocument?.id || ''} 
                        onValueChange={(value) => {
                          const doc = mockDocuments.find(d => d.id === value);
                          setSelectedDocument(doc || null);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a document to propose changes" />
                        </SelectTrigger>
                        <SelectContent>
                          {mockDocuments.map((doc) => (
                            <SelectItem key={doc.id} value={doc.id}>
                              <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4" />
                                <span>{doc.title}</span>
                                <Badge variant="outline" className="ml-2">{doc.type}</Badge>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {selectedDocument && (
                        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                          <h4 className="font-medium mb-2">{selectedDocument.title}</h4>
                          <p className="text-sm text-muted-foreground mb-2">{selectedDocument.description}</p>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{selectedDocument.type}</Badge>
                            <Badge className={selectedDocument.compliance === 'Critical' ? 'bg-red-100 text-red-800' : 'bg-orange-100 text-orange-800'}>
                              {selectedDocument.compliance}
                            </Badge>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {selectedDocument && (
                  <>
                    {/* Proposal Details */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Proposal Details</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="proposalType">Proposal Type</Label>
                            <Select 
                              value={proposalForm.proposalType} 
                              onValueChange={(value) => setProposalForm({...proposalForm, proposalType: value})}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select proposal type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="content-update">Content Update</SelectItem>
                                <SelectItem value="new-section">New Section</SelectItem>
                                <SelectItem value="removal">Content Removal</SelectItem>
                                <SelectItem value="revision">Major Revision</SelectItem>
                                <SelectItem value="formatting">Formatting/Layout</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="urgency">Urgency Level</Label>
                            <Select 
                              value={proposalForm.urgency} 
                              onValueChange={(value) => setProposalForm({...proposalForm, urgency: value})}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="low">Low</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="high">High</SelectItem>
                                <SelectItem value="critical">Critical</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="title">Proposal Title</Label>
                          <Input
                            id="title"
                            value={proposalForm.title}
                            onChange={(e) => setProposalForm({...proposalForm, title: e.target.value})}
                            placeholder="Brief, descriptive title for your proposal"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="description">Description</Label>
                          <Textarea
                            id="description"
                            value={proposalForm.description}
                            onChange={(e) => setProposalForm({...proposalForm, description: e.target.value})}
                            placeholder="Detailed description of the proposed changes"
                            rows={3}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="justification">Justification</Label>
                          <Textarea
                            id="justification"
                            value={proposalForm.justification}
                            onChange={(e) => setProposalForm({...proposalForm, justification: e.target.value})}
                            placeholder="Why is this change necessary? What problem does it solve?"
                            rows={3}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="proposedChanges">Specific Proposed Changes</Label>
                          <Textarea
                            id="proposedChanges"
                            value={proposalForm.proposedChanges}
                            onChange={(e) => setProposalForm({...proposalForm, proposedChanges: e.target.value})}
                            placeholder="Detailed description of exactly what should be changed, added, or removed"
                            rows={4}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="implementationNotes">Implementation Notes (Optional)</Label>
                          <Textarea
                            id="implementationNotes"
                            value={proposalForm.implementationNotes}
                            onChange={(e) => setProposalForm({...proposalForm, implementationNotes: e.target.value})}
                            placeholder="Any additional notes for implementation, training requirements, etc."
                            rows={2}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="my-proposals" className="h-full">
            <ScrollArea className="h-[420px] lg:h-[520px] pr-4">
              <div className="space-y-4">
                {mockProposals
                  .filter(proposal => proposal.proposedByEmail === userInfo.email)
                  .map((proposal) => (
                    <Card key={proposal.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h4 className="font-medium mb-1">{proposal.title}</h4>
                            <p className="text-sm text-muted-foreground mb-2">
                              Document: {proposal.documentTitle}
                            </p>
                            <p className="text-sm mb-3">{proposal.description}</p>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <Badge className={getStatusColor(proposal.status)}>
                              {proposal.status.replace('-', ' ').toUpperCase()}
                            </Badge>
                            <Badge className={getUrgencyColor(proposal.urgency)}>
                              {proposal.urgency.toUpperCase()}
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <div className="flex items-center gap-4">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Submitted: {proposal.submittedAt.toLocaleDateString()}
                            </span>
                            <span className="flex items-center gap-1">
                              <FileEdit className="w-3 h-3" />
                              Type: {proposal.proposalType.replace('-', ' ')}
                            </span>
                          </div>
                          {proposal.reviewComments && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-xs"
                              onClick={() => {
                                alert(`Review Comments: ${proposal.reviewComments}`);
                              }}
                            >
                              <MessageSquare className="w-3 h-3 mr-1" />
                              View Comments
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="all-proposals" className="h-full">
            <ScrollArea className="h-[420px] lg:h-[520px] pr-4">
              <div className="space-y-4">
                {mockProposals.map((proposal) => (
                  <Card key={proposal.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="font-medium mb-1">{proposal.title}</h4>
                          <p className="text-sm text-muted-foreground mb-2">
                            Document: {proposal.documentTitle}
                          </p>
                          <p className="text-sm mb-3">{proposal.description}</p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <Badge className={getStatusColor(proposal.status)}>
                            {proposal.status.replace('-', ' ').toUpperCase()}
                          </Badge>
                          <Badge className={getUrgencyColor(proposal.urgency)}>
                            {proposal.urgency.toUpperCase()}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-4">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {proposal.proposedBy} ({proposal.proposedByRole})
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {proposal.submittedAt.toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex gap-1">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-xs"
                            onClick={() => {
                              alert(`Viewing proposal: ${proposal.title}`);
                            }}
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            View
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-xs"
                            onClick={() => {
                              alert(`Opening comparison for: ${proposal.title}`);
                            }}
                          >
                            <GitCompare className="w-3 h-3 mr-1" />
                            Compare
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          {activeTab === 'create' && (
            <div className="flex items-center justify-between w-full">
              <Alert className="max-w-md">
                <AlertTriangle className="w-4 h-4" />
                <AlertDescription className="text-xs">
                  All proposals are reviewed by document managers and subject matter experts
                </AlertDescription>
              </Alert>
              
              <div className="flex gap-2">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={!selectedDocument || !proposalForm.title || !proposalForm.description}
                  className="flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  Submit Proposal
                </Button>
              </div>
            </div>
          )}
          
          {activeTab !== 'create' && (
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}