import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { CheckCircle, Clock, MessageSquare } from 'lucide-react';
import { ActionItem } from './types';

interface DetailsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  item: ActionItem | null;
}

// Simple Avatar components
const Avatar = ({ className, children }: { className?: string; children: React.ReactNode }) => (
  <div className={`${className} rounded-full bg-gray-200 flex items-center justify-center`}>
    {children}
  </div>
);

const AvatarFallback = ({ className, children }: { className?: string; children: React.ReactNode }) => (
  <span className={className}>{children}</span>
);

export default function DetailsDialog({ isOpen, onClose, item }: DetailsDialogProps) {
  if (!item) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Action Item Details</DialogTitle>
          <DialogDescription>
            View comprehensive details, progress breakdown, contributors, and activity history for this action item.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Header */}
          <div className="pb-4 border-b">
            <h3 className="font-medium mb-2">{item.title}</h3>
            <p className="text-muted-foreground mb-3">{item.description}</p>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-xs">
                {item.module}
              </Badge>
              <Badge className={`text-xs ${
                item.priority === 'Critical' ? 'bg-red-100 text-red-800' :
                item.priority === 'High' ? 'bg-orange-100 text-orange-800' :
                item.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                'bg-green-100 text-green-800'
              }`}>
                {item.priority}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {item.status}
              </Badge>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-lg font-bold">{item.progress}%</div>
              <div className="text-xs text-muted-foreground">Complete</div>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-lg font-bold">{item.contributors.length}</div>
              <div className="text-xs text-muted-foreground">Contributors</div>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-lg font-bold">{item.sectionsComplete}/{item.totalSections}</div>
              <div className="text-xs text-muted-foreground">Sections</div>
            </div>
          </div>

          {/* Progress */}
          <div>
            <h4 className="font-medium mb-3">Progress Breakdown</h4>
            <div className="space-y-2">
              {item.sections.map((section, index) => (
                <div key={index} className="flex items-center gap-3 p-2 bg-muted/30 rounded">
                  {section.status === 'completed' && <CheckCircle className="w-4 h-4 text-green-500" />}
                  {section.status === 'in-progress' && <Clock className="w-4 h-4 text-yellow-500" />}
                  {section.status === 'pending' && <MessageSquare className="w-4 h-4 text-blue-500" />}
                  <span className="text-sm">{section.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Contributors */}
          <div>
            <h4 className="font-medium mb-3">Contributors</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {item.contributors.map((contributor) => (
                <div key={contributor.id} className="flex items-center gap-3 p-3 border rounded-lg">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback>{contributor.avatar}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium text-sm">{contributor.name}</div>
                    <div className="text-xs text-muted-foreground">{contributor.role}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div>
            <h4 className="font-medium mb-3">Recent Activity</h4>
            <div className="space-y-3">
              {item.recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="text-xs">{activity.user.avatar}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <span className="text-sm">
                      <strong>{activity.user.name}</strong> {activity.action}
                    </span>
                    <div className="text-xs text-muted-foreground mt-1">{activity.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={onClose}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}