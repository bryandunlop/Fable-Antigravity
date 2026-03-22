import React, { useState } from 'react';
import { useHazards } from '../../contexts/HazardContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Checkbox } from '../ui/checkbox';
import { Upload, Paperclip, Send } from 'lucide-react';
import { toast } from 'sonner';

interface NewHazardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userRole: string;
}

export default function NewHazardDialog({ open, onOpenChange, userRole }: NewHazardDialogProps) {
  const { submitHazard } = useHazards();
  
  const [newHazardTitle, setNewHazardTitle] = useState('');
  const [newHazardDescription, setNewHazardDescription] = useState('');
  const [newHazardImmediateAction, setNewHazardImmediateAction] = useState('');
  const [newHazardSuggestedAction, setNewHazardSuggestedAction] = useState('');
  const [newHazardConsequences, setNewHazardConsequences] = useState('');
  const [newHazardLocation, setNewHazardLocation] = useState('');
  const [newHazardSeverity, setNewHazardSeverity] = useState('Medium');
  const [selectedRiskFactors, setSelectedRiskFactors] = useState<string[]>([]);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [isAnonymous, setIsAnonymous] = useState(false);

  const riskFactors = [
    'Pressure', 'Lack of Awareness', 'Complacency', 'Lack of Communications',
    'Stress', 'Lack of Teamwork', 'Distractions', 'Lack of Knowledge',
    'Fatigue', 'Lack of Assertiveness', 'Normalization of Deviance', 'Lack of Resources'
  ];

  const handleSubmit = () => {
    if (!newHazardTitle || !newHazardDescription) {
      toast.error('Please fill in required fields');
      return;
    }

    submitHazard({
      title: newHazardTitle,
      description: newHazardDescription,
      immediateActions: newHazardImmediateAction,
      suggestedCorrectiveAction: newHazardSuggestedAction,
      potentialConsequences: newHazardConsequences,
      location: newHazardLocation || 'Unknown',
      severity: newHazardSeverity,
      reportedBy: isAnonymous ? 'Anonymous' : (userRole === 'pilot' ? 'John Smith (Pilot)' : `Current User`),
      category: 'Safety',
      riskFactors: selectedRiskFactors,
      isAnonymous
    });

    toast.success('Hazard report submitted to Safety Manager');
    onOpenChange(false);
    resetForm();
  };

  const resetForm = () => {
    setNewHazardTitle('');
    setNewHazardDescription('');
    setNewHazardImmediateAction('');
    setNewHazardSuggestedAction('');
    setNewHazardConsequences('');
    setNewHazardLocation('');
    setNewHazardSeverity('Medium');
    setSelectedRiskFactors([]);
    setAttachedFiles([]);
    setIsAnonymous(false);
  };

  return (
    <Dialog open={open} onOpenChange={(val) => {
        onOpenChange(val);
        if (!val) resetForm();
    }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Report New Hazard</DialogTitle>
          <DialogDescription>
            Submit a hazard report. It will be routed through the safety workflow for investigation and mitigation.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          {/* Date */}
          <div>
            <Label>Date</Label>
            <Input type="date" defaultValue={new Date().toISOString().split('T')[0]} />
          </div>

          {/* Title & Location */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Title / Summary</Label>
              <Input
                placeholder="Brief title of hazard"
                value={newHazardTitle}
                onChange={(e) => setNewHazardTitle(e.target.value)}
              />
            </div>
            <div>
              <Label>Location</Label>
              <Input
                placeholder="Where did this occur?"
                value={newHazardLocation}
                onChange={(e) => setNewHazardLocation(e.target.value)}
              />
            </div>
          </div>

          {/* Severity */}
          <div>
            <Label>Initial Severity Assessment</Label>
            <Select value={newHazardSeverity} onValueChange={setNewHazardSeverity}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low - Minor issue, low priority</SelectItem>
                <SelectItem value="medium">Medium - Standard safety concern</SelectItem>
                <SelectItem value="high">High - Significant risk, urgent attention</SelectItem>
                <SelectItem value="critical">Critical - Immediate danger, stop operations</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Risk Factors */}
          <div>
            <Label>Risk Factors</Label>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mt-2 p-4 border rounded-lg bg-gray-50">
              {riskFactors.map((factor) => (
                <div key={factor} className="flex items-center space-x-2">
                  <Checkbox
                    id={factor}
                    checked={selectedRiskFactors.includes(factor)}
                    onCheckedChange={(checked: boolean) => {
                      if (checked) setSelectedRiskFactors([...selectedRiskFactors, factor]);
                      else setSelectedRiskFactors(selectedRiskFactors.filter(f => f !== factor));
                    }}
                  />
                  <Label htmlFor={factor} className="text-sm cursor-pointer">{factor}</Label>
                </div>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <Label>Describe the Incident / Hazard</Label>
            <Textarea
              placeholder="Provide detailed description of what you observed..."
              rows={4}
              className="mt-1"
              value={newHazardDescription}
              onChange={(e) => setNewHazardDescription(e.target.value)}
            />
          </div>

          {/* Optional Textareas */}
          <div className="grid gap-4">
            <div>
              <Label>Immediate Actions Taken (if any)</Label>
              <Textarea
                rows={2}
                value={newHazardImmediateAction}
                onChange={(e) => setNewHazardImmediateAction(e.target.value)}
              />
            </div>
            <div>
              <Label>Suggested Corrective Action (Optional)</Label>
              <Textarea
                rows={2}
                value={newHazardSuggestedAction}
                onChange={(e) => setNewHazardSuggestedAction(e.target.value)}
              />
            </div>
            <div>
              <Label>Potential Consequences (if ignored)</Label>
              <Textarea
                rows={2}
                value={newHazardConsequences}
                onChange={(e) => setNewHazardConsequences(e.target.value)}
              />
            </div>
          </div>

          {/* Attachment */}
          <div>
            <Label>Attachment</Label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 cursor-pointer mt-1">
              <input
                type="file" multiple className="hidden" id="file-upload"
                onChange={(e) => {
                  if (e.target.files) setAttachedFiles(Array.from(e.target.files));
                }}
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                <p className="text-sm text-gray-600">Drop files here to upload</p>
                <p className="text-xs text-gray-500 mt-1">or click to browse</p>
              </label>
            </div>
            {attachedFiles.length > 0 && (
              <div className="mt-3 space-y-2">
                {attachedFiles.map((file, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded border">
                    <Paperclip className="w-4 h-4 text-gray-600" />
                    <span className="text-sm flex-1">{file.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Anonymous */}
          <div className="flex items-center space-x-2 pt-2">
            <Checkbox
              id="anonymous-submission"
              checked={isAnonymous}
              onCheckedChange={(checked: boolean) => setIsAnonymous(checked === true)}
            />
            <Label htmlFor="anonymous-submission" className="cursor-pointer">Submit Anonymously</Label>
          </div>

          {/* Submit Action */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSubmit}>
              <Send className="w-4 h-4 mr-2" />
              Submit Report
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
