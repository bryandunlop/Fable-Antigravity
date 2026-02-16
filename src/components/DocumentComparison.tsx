import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { ScrollArea } from './ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Alert, AlertDescription } from './ui/alert';
import { 
  GitCompare, 
  FileText, 
  User, 
  Calendar, 
  CheckCircle, 
  XCircle, 
  MessageSquare,
  Eye,
  Download,
  ArrowLeft,
  ArrowRight,
  Info,
  Plus,
  Minus,
  Edit,
  AlertTriangle
} from 'lucide-react';

interface DocumentComparisonProps {
  isOpen: boolean;
  onClose: () => void;
  onApprove: (proposalId: string, comments: string) => void;
  onReject: (proposalId: string, comments: string) => void;
  proposal: {
    id: string;
    documentId: string;
    documentTitle: string;
    proposedBy: string;
    proposedByRole: string;
    proposalType: string;
    title: string;
    description: string;
    justification: string;
    proposedChanges: string;
    urgency: string;
    status: string;
    submittedAt: Date;
    impactedSections: string[];
  };
  originalDocument: {
    title: string;
    content: string;
    version: string;
    lastUpdated: string;
  };
  userRole: string;
}

const mockOriginalContent = `# Flight Operations Manual v2.3

## Section 3.2.1 - Weather Minimums

### Category II Approach Minimums
- Decision Height: 100 feet AGL
- Runway Visual Range: 1200 feet
- Autopilot: Required for approach
- Go-around: Manual or autopilot-assisted

### Equipment Requirements
- ILS receiver with glide slope
- Radio altimeter
- Autopilot with approach coupling
- Flight director system

### Operational Procedures
1. Brief approach procedures during pre-flight
2. Verify equipment functionality
3. Set minimums in flight management system
4. Monitor approach parameters continuously
5. Execute missed approach if minimums not met`;

const mockProposedContent = `# Flight Operations Manual v2.4

## Section 3.2.1 - Weather Minimums

### Category II Approach Minimums
- Decision Height: 100 feet AGL
- Runway Visual Range: **1000 feet** *(CHANGED FROM 1200)*
- Autopilot: **Required for approach and go-around** *(UPDATED)*
- Go-around: **Autopilot-assisted mandatory** *(CHANGED)*

### Equipment Requirements
- ILS receiver with glide slope
- Radio altimeter
- Autopilot with approach coupling
- Flight director system
- **Enhanced flight vision system (EFVS) - NEW REQUIREMENT** *(ADDED)*

### Operational Procedures
1. Brief approach procedures during pre-flight
2. Verify equipment functionality
3. Set minimums in flight management system
4. Monitor approach parameters continuously
5. Execute missed approach if minimums not met
6. **Verify EFVS functionality during approach briefing** *(NEW STEP)*

### **NEW SECTION 3.2.2 - Enhanced Approach Procedures** *(ADDED)*
**Effective Date: March 1, 2025**
- All Cat II approaches must use EFVS when available
- Autopilot engagement required below 500 feet AGL
- Manual go-around procedures updated per FAA Notice 2025-001`;

export default function DocumentComparison({ 
  isOpen, 
  onClose, 
  onApprove, 
  onReject, 
  proposal, 
  originalDocument,
  userRole 
}: DocumentComparisonProps) {
  const [reviewComments, setReviewComments] = useState('');
  const [activeView, setActiveView] = useState('side-by-side');

  const handleApprove = () => {
    onApprove(proposal.id, reviewComments);
    onClose();
  };

  const handleReject = () => {
    onReject(proposal.id, reviewComments);
    onClose();
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

  const renderOriginalContent = () => (
    <div className="h-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200 gap-2">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-blue-600" />
          <span className="font-medium text-blue-900">Current Version</span>
          <Badge variant="outline">{originalDocument.version}</Badge>
        </div>
        <span className="text-sm text-blue-700">Last updated: {originalDocument.lastUpdated}</span>
      </div>
      <ScrollArea className="h-[300px] lg:h-[400px]">
        <div className="p-4 bg-white border rounded-lg font-mono text-xs lg:text-sm whitespace-pre-wrap">
          {mockOriginalContent}
        </div>
      </ScrollArea>
    </div>
  );

  const renderProposedContent = () => (
    <div className="h-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 p-3 bg-green-50 rounded-lg border border-green-200 gap-2">
        <div className="flex items-center gap-2">
          <Edit className="w-4 h-4 text-green-600" />
          <span className="font-medium text-green-900">Proposed Changes</span>
          <Badge className="bg-green-100 text-green-800">Draft</Badge>
        </div>
        <span className="text-sm text-green-700">
          Proposed by: {proposal.proposedBy}
        </span>
      </div>
      <ScrollArea className="h-[300px] lg:h-[400px]">
        <div className="p-4 bg-white border rounded-lg font-mono text-xs lg:text-sm whitespace-pre-wrap">
          {mockProposedContent}
        </div>
      </ScrollArea>
    </div>
  );

  const renderChangeHighlights = () => (
    <div className="space-y-4">
      <Alert>
        <Info className="w-4 h-4" />
        <AlertDescription>
          <strong>Legend:</strong> 
          <span className="ml-2 inline-flex items-center gap-1">
            <Plus className="w-3 h-3 text-green-600" />
            <span className="text-green-600">Added</span>
          </span>
          <span className="ml-4 inline-flex items-center gap-1">
            <Minus className="w-3 h-3 text-red-600" />
            <span className="text-red-600">Removed</span>
          </span>
          <span className="ml-4 inline-flex items-center gap-1">
            <Edit className="w-3 h-3 text-blue-600" />
            <span className="text-blue-600">Modified</span>
          </span>
        </AlertDescription>
      </Alert>

      <div className="space-y-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Edit className="w-4 h-4 text-blue-600" />
              Modified: Section 3.2.1 - Weather Minimums
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-start gap-2 text-sm">
              <Minus className="w-3 h-3 text-red-600 mt-0.5 flex-shrink-0" />
              <span className="text-red-600 line-through">Runway Visual Range: 1200 feet</span>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <Plus className="w-3 h-3 text-green-600 mt-0.5 flex-shrink-0" />
              <span className="text-green-600">Runway Visual Range: 1000 feet</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Plus className="w-4 h-4 text-green-600" />
              Added: Equipment Requirements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-2 text-sm">
              <Plus className="w-3 h-3 text-green-600 mt-0.5 flex-shrink-0" />
              <span className="text-green-600">Enhanced flight vision system (EFVS) - NEW REQUIREMENT</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Plus className="w-4 h-4 text-green-600" />
              Added: Section 3.2.2 - Enhanced Approach Procedures
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-green-600">
              <p>Complete new section with:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>EFVS usage requirements</li>
                <li>Autopilot engagement procedures</li>
                <li>Updated go-around procedures</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl w-[95vw] max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitCompare className="w-5 h-5 text-blue-600" />
            Document Comparison - {proposal.title}
          </DialogTitle>
          <DialogDescription>
            Review proposed changes and provide feedback for approval or rejection
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Proposal Info */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-4 gap-4 text-sm">
                <div>
                  <Label className="text-muted-foreground">Proposed By</Label>
                  <p className="font-medium">{proposal.proposedBy} ({proposal.proposedByRole})</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Proposal Type</Label>
                  <p className="font-medium capitalize">{proposal.proposalType.replace('-', ' ')}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Urgency</Label>
                  <Badge className={getUrgencyColor(proposal.urgency)}>
                    {proposal.urgency.toUpperCase()}
                  </Badge>
                </div>
                <div>
                  <Label className="text-muted-foreground">Submitted</Label>
                  <p className="font-medium">{proposal.submittedAt.toLocaleDateString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* View Selector */}
          <Tabs value={activeView} onValueChange={setActiveView}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="side-by-side">Side by Side</TabsTrigger>
              <TabsTrigger value="changes-only">Changes Only</TabsTrigger>
              <TabsTrigger value="proposal-details">Proposal Details</TabsTrigger>
            </TabsList>

            <TabsContent value="side-by-side" className="h-[400px] lg:h-[500px]">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
                {renderOriginalContent()}
                {renderProposedContent()}
              </div>
            </TabsContent>

            <TabsContent value="changes-only" className="h-[400px] lg:h-[500px]">
              <ScrollArea className="h-full pr-4">
                {renderChangeHighlights()}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="proposal-details" className="h-[400px] lg:h-[500px]">
              <ScrollArea className="h-full pr-4">
                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Description</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p>{proposal.description}</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Justification</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p>{proposal.justification}</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Proposed Changes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <pre className="whitespace-pre-wrap text-sm">{proposal.proposedChanges}</pre>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Impacted Sections</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {proposal.impactedSections.map((section, index) => (
                          <Badge key={index} variant="outline">{section}</Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>

          {/* Review Comments */}
          {userRole === 'document-manager' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Review Comments
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="reviewComments">
                    Provide feedback for the proposer and implementation team
                  </Label>
                  <Textarea
                    id="reviewComments"
                    value={reviewComments}
                    onChange={(e) => setReviewComments(e.target.value)}
                    placeholder="Enter your review comments, suggestions for improvement, or implementation notes..."
                    rows={4}
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertTriangle className="w-4 h-4" />
            <span>This comparison shows proposed changes that require approval</span>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            
            {userRole === 'document-manager' && (
              <>
                <Button
                  variant="destructive"
                  onClick={handleReject}
                  className="flex items-center gap-2"
                >
                  <XCircle className="w-4 h-4" />
                  Reject Proposal
                </Button>
                <Button
                  onClick={handleApprove}
                  className="flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  Approve Changes
                </Button>
              </>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}