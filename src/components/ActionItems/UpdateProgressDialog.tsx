import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { CheckCircle, Clock, MessageSquare, Plus, X, Loader2 } from 'lucide-react';
import { ActionItem } from './types';
import { calculateProgress } from './utils';

interface UpdateProgressDialogProps {
  isOpen: boolean;
  onClose: () => void;
  selectedItem: ActionItem | null;
  updatedSections: Array<{ name: string; status: string }>;
  setUpdatedSections: (sections: Array<{ name: string; status: string }>) => void;
  updateComment: string;
  setUpdateComment: (comment: string) => void;
  newSectionName: string;
  setNewSectionName: (name: string) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

export default function UpdateProgressDialog({
  isOpen,
  onClose,
  selectedItem,
  updatedSections,
  setUpdatedSections,
  updateComment,
  setUpdateComment,
  newSectionName,
  setNewSectionName,
  onSubmit,
  isSubmitting
}: UpdateProgressDialogProps) {
  const handleSectionStatusChange = (sectionIndex: number, newStatus: string) => {
    const updated = [...updatedSections];
    updated[sectionIndex] = { ...updated[sectionIndex], status: newStatus };
    setUpdatedSections(updated);
  };

  const handleAddNewSection = () => {
    if (!newSectionName.trim()) return;

    setUpdatedSections([...updatedSections, {
      name: newSectionName.trim(),
      status: 'pending'
    }]);
    setNewSectionName('');
  };

  const handleRemoveSection = (index: number) => {
    const updated = updatedSections.filter((_, i) => i !== index);
    setUpdatedSections(updated);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Update Progress</DialogTitle>
          <DialogDescription>
            Update section statuses, add new sections, and provide progress comments for this action item.
          </DialogDescription>
        </DialogHeader>
        
        {selectedItem && (
          <div className="space-y-6">
            {/* Item Info */}
            <div className="pb-4 border-b">
              <h3 className="font-medium mb-2">{selectedItem.title}</h3>
              <p className="text-sm text-muted-foreground">{selectedItem.description}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className="text-xs">
                  {selectedItem.module}
                </Badge>
                <Badge className={`text-xs ${
                  selectedItem.priority === 'Critical' ? 'bg-red-100 text-red-800' :
                  selectedItem.priority === 'High' ? 'bg-orange-100 text-orange-800' :
                  selectedItem.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {selectedItem.priority}
                </Badge>
              </div>
            </div>

            {/* Section Progress */}
            <div>
              <Label className="text-sm font-medium mb-3 block">Update Section Status</Label>
              <div className="space-y-3">
                {updatedSections.map((section, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm font-medium flex-1">{section.name}</span>
                    <div className="flex items-center gap-2">
                      <Select 
                        value={section.status} 
                        onValueChange={(value) => handleSectionStatusChange(index, value)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">
                            <div className="flex items-center gap-2">
                              <MessageSquare className="w-4 h-4 text-blue-500" />
                              Pending
                            </div>
                          </SelectItem>
                          <SelectItem value="in-progress">
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-yellow-500" />
                              In Progress
                            </div>
                          </SelectItem>
                          <SelectItem value="completed">
                            <div className="flex items-center gap-2">
                              <CheckCircle className="w-4 h-4 text-green-500" />
                              Completed
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      {updatedSections.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveSection(index)}
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                
                {/* Add new section */}
                <div className="flex items-center gap-2 p-3 border-2 border-dashed border-muted-foreground/30 rounded-lg">
                  <Input
                    placeholder="Add new section..."
                    value={newSectionName}
                    onChange={(e) => setNewSectionName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddNewSection()}
                    className="flex-1 border-none bg-transparent"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleAddNewSection}
                    disabled={!newSectionName.trim()}
                    className="h-8 px-3"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Progress Preview */}
            <div className="bg-blue-50 rounded-lg p-4">
              <Label className="text-sm font-medium mb-2 block text-blue-800">Updated Progress</Label>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-blue-700">
                  {updatedSections.filter(s => s.status === 'completed').length} of {updatedSections.length} sections complete
                </span>
                <span className="text-sm font-medium text-blue-800">
                  {calculateProgress(updatedSections)}%
                </span>
              </div>
              <Progress 
                value={calculateProgress(updatedSections)} 
                className="h-2"
              />
            </div>

            {/* Update Comment */}
            <div>
              <Label htmlFor="update-comment" className="text-sm font-medium mb-2 block">
                Progress Update Comment <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="update-comment"
                placeholder="Describe the work completed, any blockers encountered, or next steps..."
                value={updateComment}
                onChange={(e) => setUpdateComment(e.target.value)}
                rows={4}
              />
              <p className="text-xs text-muted-foreground mt-1">
                This comment will be added to the activity feed and visible to all contributors.
              </p>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button 
            variant="outline" 
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button 
            onClick={onSubmit}
            disabled={!updateComment.trim() || isSubmitting}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <MessageSquare className="w-4 h-4 mr-2" />
                Submit Update
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}