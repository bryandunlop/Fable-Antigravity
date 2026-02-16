import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Plus, X, Loader2, Target, Wrench, Shield, Users, Building } from 'lucide-react';
import { NewItemForm } from './types';
import { MODULE_OPTIONS, PRIORITY_OPTIONS } from './constants';

interface NewItemDialogProps {
  isOpen: boolean;
  onClose: () => void;
  newItemForm: NewItemForm;
  setNewItemForm: (form: NewItemForm) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

export default function NewItemDialog({ 
  isOpen, 
  onClose, 
  newItemForm, 
  setNewItemForm, 
  onSubmit, 
  isSubmitting 
}: NewItemDialogProps) {
  const handleAddFormSection = () => {
    setNewItemForm({
      ...newItemForm,
      sections: [...newItemForm.sections, '']
    });
  };

  const handleUpdateFormSection = (index: number, value: string) => {
    const updated = [...newItemForm.sections];
    updated[index] = value;
    setNewItemForm({
      ...newItemForm,
      sections: updated
    });
  };

  const handleRemoveFormSection = (index: number) => {
    if (newItemForm.sections.length <= 1) return;
    const updated = newItemForm.sections.filter((_, i) => i !== index);
    setNewItemForm({
      ...newItemForm,
      sections: updated
    });
  };

  const getModuleIcon = (module: string) => {
    switch (module) {
      case 'Flight Operations': return <Target className="w-4 h-4" />;
      case 'Maintenance': return <Wrench className="w-4 h-4" />;
      case 'Safety': return <Shield className="w-4 h-4" />;
      case 'Passenger Services': return <Users className="w-4 h-4" />;
      case 'Ground Operations': return <Building className="w-4 h-4" />;
      default: return <Target className="w-4 h-4" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Action Item</DialogTitle>
          <DialogDescription>
            Create a new collaborative action item with sections, assignments, and due dates.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="title" className="text-sm font-medium mb-2 block">
                Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                placeholder="Enter action item title..."
                value={newItemForm.title}
                onChange={(e) => setNewItemForm({...newItemForm, title: e.target.value})}
              />
            </div>
            
            <div>
              <Label htmlFor="description" className="text-sm font-medium mb-2 block">
                Description <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="description"
                placeholder="Describe what needs to be accomplished..."
                value={newItemForm.description}
                onChange={(e) => setNewItemForm({...newItemForm, description: e.target.value})}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="module" className="text-sm font-medium mb-2 block">
                  Module
                </Label>
                <Select value={newItemForm.module} onValueChange={(value) => setNewItemForm({...newItemForm, module: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select module" />
                  </SelectTrigger>
                  <SelectContent>
                    {MODULE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center gap-2">
                          {getModuleIcon(option.value)}
                          {option.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="priority" className="text-sm font-medium mb-2 block">
                  Priority
                </Label>
                <Select value={newItemForm.priority} onValueChange={(value) => setNewItemForm({...newItemForm, priority: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITY_OPTIONS.map((priority) => (
                      <SelectItem key={priority} value={priority}>{priority}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="due-date" className="text-sm font-medium mb-2 block">
                  Due Date
                </Label>
                <Input
                  id="due-date"
                  type="date"
                  value={newItemForm.dueDate}
                  onChange={(e) => setNewItemForm({...newItemForm, dueDate: e.target.value})}
                />
              </div>
            </div>
          </div>

          {/* Sections */}
          <div>
            <Label className="text-sm font-medium mb-3 block">Sections/Tasks</Label>
            <div className="space-y-2">
              {newItemForm.sections.map((section, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    placeholder={`Section ${index + 1}...`}
                    value={section}
                    onChange={(e) => handleUpdateFormSection(index, e.target.value)}
                  />
                  {newItemForm.sections.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveFormSection(index)}
                      className="h-10 w-10 p-0 text-muted-foreground hover:text-destructive"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleAddFormSection}
                className="text-muted-foreground hover:text-foreground"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Section
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button 
            variant="outline" 
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button 
            onClick={onSubmit}
            disabled={!newItemForm.title.trim() || !newItemForm.description.trim() || isSubmitting}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                Create Action Item
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}