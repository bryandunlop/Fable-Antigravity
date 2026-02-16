import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { FileEdit, Send, CheckCircle, AlertTriangle, Clock } from 'lucide-react';

interface ProposalSubmissionFlowProps {
  isOpen: boolean;
  onClose: () => void;
  userRole: string;
  selectedDocument?: {
    id: string;
    title: string;
    type: string;
  } | null;
}

export default function ProposalSubmissionFlow({ 
  isOpen, 
  onClose, 
  userRole, 
  selectedDocument 
}: ProposalSubmissionFlowProps) {
  const [step, setStep] = useState<'form' | 'confirmation' | 'success'>('form');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    justification: '',
    urgency: 'medium',
    proposalType: 'content-update'
  });

  const handleSubmit = () => {
    // Simulate submission
    console.log('Submitting proposal:', {
      ...formData,
      documentId: selectedDocument?.id,
      documentTitle: selectedDocument?.title,
      submittedBy: userRole
    });
    
    setStep('success');
  };

  const handleSuccess = () => {
    setStep('form');
    setFormData({
      title: '',
      description: '',
      justification: '',
      urgency: 'medium',
      proposalType: 'content-update'
    });
    onClose();
  };

  const getStepContent = () => {
    switch (step) {
      case 'form':
        return (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileEdit className="w-5 h-5 text-blue-600" />
                Suggest Document Changes
              </DialogTitle>
              <DialogDescription>
                {selectedDocument 
                  ? `Suggest improvements for: ${selectedDocument.title}`
                  : 'Submit a proposal to improve our documentation'
                }
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {selectedDocument && (
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{selectedDocument.title}</h4>
                        <Badge variant="outline" className="mt-1">{selectedDocument.type}</Badge>
                      </div>
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Proposal Type</Label>
                  <Select 
                    value={formData.proposalType} 
                    onValueChange={(value) => setFormData({...formData, proposalType: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
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
                  <Label>Urgency Level</Label>
                  <Select 
                    value={formData.urgency} 
                    onValueChange={(value) => setFormData({...formData, urgency: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low Priority</SelectItem>
                      <SelectItem value="medium">Medium Priority</SelectItem>
                      <SelectItem value="high">High Priority</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Proposal Title</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  placeholder="Brief description of the proposed change"
                />
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Detailed description of what should be changed"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Justification</Label>
                <Textarea
                  value={formData.justification}
                  onChange={(e) => setFormData({...formData, justification: e.target.value})}
                  placeholder="Why is this change needed? What problem does it solve?"
                  rows={3}
                />
              </div>

              <Alert>
                <AlertTriangle className="w-4 h-4" />
                <AlertDescription>
                  Your proposal will be reviewed by the document management team and subject matter experts. 
                  You'll receive an email notification when there's an update.
                </AlertDescription>
              </Alert>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                onClick={() => setStep('confirmation')}
                disabled={!formData.title || !formData.description || !formData.justification}
                className="flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                Review Proposal
              </Button>
            </DialogFooter>
          </>
        );

      case 'confirmation':
        return (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
                Confirm Proposal Submission
              </DialogTitle>
              <DialogDescription>
                Please review your proposal before submitting
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{formData.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex gap-2">
                    <Badge variant="outline">{formData.proposalType.replace('-', ' ')}</Badge>
                    <Badge className={
                      formData.urgency === 'critical' ? 'bg-red-100 text-red-800' :
                      formData.urgency === 'high' ? 'bg-orange-100 text-orange-800' :
                      formData.urgency === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }>
                      {formData.urgency} priority
                    </Badge>
                  </div>
                  
                  <div>
                    <Label className="text-sm text-muted-foreground">Description</Label>
                    <p className="text-sm mt-1">{formData.description}</p>
                  </div>
                  
                  <div>
                    <Label className="text-sm text-muted-foreground">Justification</Label>
                    <p className="text-sm mt-1">{formData.justification}</p>
                  </div>

                  {selectedDocument && (
                    <div>
                      <Label className="text-sm text-muted-foreground">Target Document</Label>
                      <p className="text-sm mt-1">{selectedDocument.title}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Alert>
                <Clock className="w-4 h-4" />
                <AlertDescription>
                  <strong>Expected Review Time:</strong> {
                    formData.urgency === 'critical' ? '24-48 hours' :
                    formData.urgency === 'high' ? '3-5 business days' :
                    formData.urgency === 'medium' ? '1-2 weeks' :
                    '2-4 weeks'
                  }
                </AlertDescription>
              </Alert>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep('form')}>
                Back to Edit
              </Button>
              <Button onClick={handleSubmit} className="flex items-center gap-2">
                <Send className="w-4 h-4" />
                Submit Proposal
              </Button>
            </DialogFooter>
          </>
        );

      case 'success':
        return (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                Proposal Submitted Successfully
              </DialogTitle>
              <DialogDescription>
                Your proposal has been submitted and will be reviewed by our team
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <Card className="bg-green-50 border-green-200">
                <CardContent className="p-4">
                  <div className="text-center space-y-3">
                    <CheckCircle className="w-12 h-12 text-green-600 mx-auto" />
                    <h3 className="font-medium text-green-900">Proposal Submitted</h3>
                    <p className="text-sm text-green-700">
                      Proposal ID: PROP{String(Math.floor(Math.random() * 1000)).padStart(3, '0')}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Alert>
                <AlertTriangle className="w-4 h-4" />
                <AlertDescription>
                  <strong>What happens next?</strong>
                  <ul className="mt-2 space-y-1 text-sm list-disc list-inside">
                    <li>Document managers will review your proposal</li>
                    <li>Subject matter experts may be consulted</li>
                    <li>You'll receive email updates on the status</li>
                    <li>Track progress in your "My Proposals" section</li>
                  </ul>
                </AlertDescription>
              </Alert>
            </div>

            <DialogFooter>
              <Button onClick={handleSuccess} className="w-full">
                Close
              </Button>
            </DialogFooter>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl w-[95vw]">
        {getStepContent()}
      </DialogContent>
    </Dialog>
  );
}