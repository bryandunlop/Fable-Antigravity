import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Progress } from './ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Label } from './ui/label';
import { toast } from 'sonner';
import { 
  CheckCircle,
  Clock,
  AlertTriangle,
  Plus,
  Search,
  MessageSquare,
  Eye,
  Users,
  Activity,
  TrendingUp,
  Target,
  Bell,
  History,
  ArrowRight,
  Calendar,
  Loader2
} from 'lucide-react';

// Import refactored components and utilities
import { ActionItemsProps, ActionItem, NewItemForm } from './ActionItems/types';
import { MOCK_ACTION_ITEMS } from './ActionItems/constants';
import { getBorderColor, formatDate, getUserActionItems, getStats } from './ActionItems/utils';
import NewItemDialog from './ActionItems/NewItemDialog';
import UpdateProgressDialog from './ActionItems/UpdateProgressDialog';
import DetailsDialog from './ActionItems/DetailsDialog';
import InviteDialog from './ActionItems/InviteDialog';

export default function ActionItems({ userRole }: ActionItemsProps) {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  
  // Dialog states
  const [selectedItem, setSelectedItem] = useState<ActionItem | null>(null);
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const [updateComment, setUpdateComment] = useState('');
  const [updatedSections, setUpdatedSections] = useState<Array<{ name: string; status: string }>>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');
  
  // New Item Dialog
  const [isNewItemDialogOpen, setIsNewItemDialogOpen] = useState(false);
  const [newItemForm, setNewItemForm] = useState<NewItemForm>({
    title: '',
    description: '',
    module: '',
    priority: 'Medium',
    dueDate: '',
    sections: ['']
  });
  
  // Details Dialog
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [detailsItem, setDetailsItem] = useState<ActionItem | null>(null);
  
  // Invite Dialog
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('');
  const [inviteItem, setInviteItem] = useState<ActionItem | null>(null);

  // Activity Dialog
  const [isActivityDialogOpen, setIsActivityDialogOpen] = useState(false);
  const [activityItem, setActivityItem] = useState<ActionItem | null>(null);

  // Track Status Dialog  
  const [isTrackStatusDialogOpen, setIsTrackStatusDialogOpen] = useState(false);
  const [trackStatusItem, setTrackStatusItem] = useState<ActionItem | null>(null);
  const [newTrackStatus, setNewTrackStatus] = useState('on-track');

  // Simple Avatar components
  const Avatar = ({ className, children }: { className?: string; children: React.ReactNode }) => (
    <div className={`${className} rounded-full bg-gray-200 flex items-center justify-center`}>
      {children}
    </div>
  );
  
  const AvatarFallback = ({ className, children }: { className?: string; children: React.ReactNode }) => (
    <span className={className}>{children}</span>
  );

  const userActionItems = getUserActionItems(MOCK_ACTION_ITEMS, userRole);

  // Apply filters
  const filteredItems = userActionItems.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || item.status.toLowerCase().replace(' ', '') === statusFilter;
    const matchesPriority = priorityFilter === 'all' || item.priority.toLowerCase() === priorityFilter;
    
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const stats = getStats(userActionItems);

  // Event handlers
  const handleUpdateProgress = (item: ActionItem) => {
    setSelectedItem(item);
    setUpdatedSections(item.sections);
    setUpdateComment('');
    setIsUpdateDialogOpen(true);
  };

  const handleSubmitUpdate = async () => {
    if (!selectedItem || !updateComment.trim()) return;

    setIsSubmitting(true);

    try {
      const completedCount = updatedSections.filter(section => section.status === 'completed').length;
      const newProgress = Math.round((completedCount / updatedSections.length) * 100);

      await new Promise(resolve => setTimeout(resolve, 1000));

      toast.success('Progress Updated', {
        description: `Your progress on "${selectedItem.title}" has been updated to ${newProgress}%`,
        action: {
          label: 'View Details',
          onClick: () => console.log('View details clicked')
        }
      });

      setIsUpdateDialogOpen(false);
      setSelectedItem(null);
      setUpdateComment('');
      setUpdatedSections([]);
      
    } catch (error) {
      toast.error('Update Failed', {
        description: 'Failed to update progress. Please try again.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateNewItem = async () => {
    if (!newItemForm.title.trim() || !newItemForm.description.trim()) return;

    setIsSubmitting(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 1000));

      toast.success('Action Item Created', {
        description: `"${newItemForm.title}" has been created and assigned.`
      });

      setNewItemForm({
        title: '',
        description: '',
        module: '',
        priority: 'Medium',
        dueDate: '',
        sections: ['']
      });
      setIsNewItemDialogOpen(false);

    } catch (error) {
      toast.error('Creation Failed', {
        description: 'Failed to create action item. Please try again.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewDetails = (item: ActionItem) => {
    setDetailsItem(item);
    setIsDetailsDialogOpen(true);
  };

  const handleInvite = (item: ActionItem) => {
    setInviteItem(item);
    setInviteEmail('');
    setInviteRole('');
    setIsInviteDialogOpen(true);
  };

  const handleSendInvite = async () => {
    if (!inviteEmail.trim() || !inviteRole.trim()) return;

    setIsSubmitting(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 800));

      toast.success('Invitation Sent', {
        description: `Invitation sent to ${inviteEmail} to join "${inviteItem?.title}".`
      });

      setIsInviteDialogOpen(false);
      setInviteEmail('');
      setInviteRole('');
      setInviteItem(null);

    } catch (error) {
      toast.error('Invite Failed', {
        description: 'Failed to send invitation. Please try again.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewActivity = (item: ActionItem) => {
    setActivityItem(item);
    setIsActivityDialogOpen(true);
  };

  const handleEditTrackStatus = (item: ActionItem) => {
    setTrackStatusItem(item);
    setNewTrackStatus('on-track'); // Default value
    setIsTrackStatusDialogOpen(true);
  };

  const handleUpdateTrackStatus = async () => {
    if (!trackStatusItem) return;

    setIsSubmitting(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 800));

      const statusText = newTrackStatus === 'on-track' ? 'On track' :
                        newTrackStatus === 'at-risk' ? 'At risk' :
                        newTrackStatus === 'behind' ? 'Behind schedule' : 'On track';

      toast.success('Status Updated', {
        description: `"${trackStatusItem.title}" is now marked as "${statusText}".`
      });

      setIsTrackStatusDialogOpen(false);
      setTrackStatusItem(null);

    } catch (error) {
      toast.error('Update Failed', {
        description: 'Failed to update tracking status. Please try again.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="text-center">
        <h1 className="mb-2">Action Items</h1>
        <p className="text-muted-foreground">
          Collaborate on tasks and track progress across all operations
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="text-center">
          <CardContent className="p-4">
            <Activity className="w-8 h-8 mx-auto mb-2 text-blue-600" />
            <div className="text-2xl font-bold">{stats.active}</div>
            <div className="text-sm text-muted-foreground">Active Items</div>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="p-4">
            <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-600" />
            <div className="text-2xl font-bold">{stats.completed}</div>
            <div className="text-sm text-muted-foreground">Completed</div>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="p-4">
            <Users className="w-8 h-8 mx-auto mb-2 text-purple-600" />
            <div className="text-2xl font-bold">{stats.totalContributors}</div>
            <div className="text-sm text-muted-foreground">Contributors</div>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="p-4">
            <Target className="w-8 h-8 mx-auto mb-2 text-orange-600" />
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-muted-foreground">Total Items</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search action items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="inprogress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => setIsNewItemDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Item
          </Button>
        </div>
      </div>

      {/* Active Action Items */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2>Active Action Items</h2>
          <Button variant="outline" size="sm" onClick={() => navigate('/assigned-tasks')}>
            <ArrowRight className="w-4 h-4 mr-2" />
            View All Tasks
          </Button>
        </div>
        
        {filteredItems.filter(item => item.status === 'In Progress').map((item) => (
          <Card key={item.id} className={`border-l-4 ${getBorderColor(item.priority)}`}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="font-medium">{item.title}</h3>
                    <Badge className="bg-blue-100 text-blue-800">ACTIVE</Badge>
                    <Badge variant="outline" className="text-xs flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {item.contributors.length} contributors
                    </Badge>
                  </div>
                  <p className="text-muted-foreground mb-3">
                    {item.module} • Assigned by {item.assignedBy}
                  </p>
                  <p className="text-sm mb-4">
                    {item.description}
                  </p>
                  
                  {/* Contributors */}
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-sm font-medium">Contributors:</span>
                    <div className="flex -space-x-2">
                      {item.contributors.map((contributor) => (
                        <Avatar key={contributor.id} className="w-8 h-8 border-2 border-white">
                          <AvatarFallback className="text-xs">{contributor.avatar}</AvatarFallback>
                        </Avatar>
                      ))}
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-xs h-8 px-3"
                      onClick={() => handleInvite(item)}
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Invite
                    </Button>
                  </div>
                </div>
                <div className="ml-6 text-right">
                  <div className="text-xs text-muted-foreground">Started {formatDate(item.assignedDate)}</div>
                  <div className="text-xs text-muted-foreground">Target: {formatDate(item.dueDate)}</div>
                </div>
              </div>

              {/* Progress Overview */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium">Overall Progress</h4>
                  <Badge variant="outline" className="text-xs">{item.sectionsComplete} of {item.totalSections} sections complete</Badge>
                </div>
                <Progress value={item.progress} className="mb-3" />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  {item.sections.map((section, index) => (
                    <div key={index} className="flex items-center gap-2">
                      {section.status === 'completed' && <CheckCircle className="w-4 h-4 text-green-500" />}
                      {section.status === 'in-progress' && <Clock className="w-4 h-4 text-yellow-500" />}
                      {section.status === 'pending' && <MessageSquare className="w-4 h-4 text-blue-500" />}
                      <span>{section.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-blue-50 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <Activity className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800">Recent Activity</span>
                </div>
                <div className="space-y-2">
                  {item.recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-center gap-3">
                      <Avatar className="w-6 h-6">
                        <AvatarFallback className="text-xs">{activity.user.avatar}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <span className="text-sm">{activity.user.name} {activity.action} • {activity.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Target className="w-4 h-4" />
                    Target: {formatDate(item.dueDate)}
                  </span>
                  <button 
                    className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => handleViewActivity(item)}
                  >
                    <MessageSquare className="w-4 h-4" />
                    {item.recentActivity.length} updates
                  </button>
                  <button 
                    className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => handleEditTrackStatus(item)}
                  >
                    <TrendingUp className="w-4 h-4" />
                    On track
                  </button>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleViewDetails(item)}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View Details
                  </Button>
                  <Button 
                    size="sm" 
                    className="bg-blue-600 hover:bg-blue-700"
                    onClick={() => handleUpdateProgress(item)}
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Update Progress
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recently Completed */}
      <div className="space-y-4">
        <h2>Recently Completed</h2>
        
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <h3 className="font-medium">Pre-flight checklist system implementation</h3>
                  <Badge className="bg-green-100 text-green-800">COMPLETED</Badge>
                  <Badge variant="outline" className="text-xs flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    4 contributors
                  </Badge>
                </div>
                <p className="text-muted-foreground mb-3">
                  Flight Operations • Led by Captain Jennifer Smith
                </p>
                <p className="text-sm mb-4">
                  Successfully implemented digital pre-flight checklist system for Gulfstream G650 fleet operations
                </p>
              </div>
              <div className="ml-6 text-right">
                <div className="text-xs text-muted-foreground">Completed Feb 1, 2025</div>
                <div className="text-xs text-muted-foreground">Duration: 3 weeks</div>
              </div>
            </div>

            {/* Success Metrics */}
            <div className="bg-green-50 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-800">Action item completed successfully</span>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="text-center">
                  <div className="font-bold text-lg">100%</div>
                  <div className="text-xs text-muted-foreground">Requirements met</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-lg">12</div>
                  <div className="text-xs text-muted-foreground">Pilots trained</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-lg">0</div>
                  <div className="text-xs text-muted-foreground">Issues reported</div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" />
                  Deployed to fleet
                </span>
                <span className="flex items-center gap-1">
                  <Bell className="w-4 h-4" />
                  All teams notified
                </span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Eye className="w-4 h-4 mr-2" />
                  View Results
                </Button>
                <Button variant="outline" size="sm">
                  <History className="w-4 h-4 mr-2" />
                  View History
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dialogs */}
      <NewItemDialog
        isOpen={isNewItemDialogOpen}
        onClose={() => setIsNewItemDialogOpen(false)}
        newItemForm={newItemForm}
        setNewItemForm={setNewItemForm}
        onSubmit={handleCreateNewItem}
        isSubmitting={isSubmitting}
      />

      <UpdateProgressDialog
        isOpen={isUpdateDialogOpen}
        onClose={() => setIsUpdateDialogOpen(false)}
        selectedItem={selectedItem}
        updatedSections={updatedSections}
        setUpdatedSections={setUpdatedSections}
        updateComment={updateComment}
        setUpdateComment={setUpdateComment}
        newSectionName={newSectionName}
        setNewSectionName={setNewSectionName}
        onSubmit={handleSubmitUpdate}
        isSubmitting={isSubmitting}
      />

      <DetailsDialog
        isOpen={isDetailsDialogOpen}
        onClose={() => setIsDetailsDialogOpen(false)}
        item={detailsItem}
      />

      <InviteDialog
        isOpen={isInviteDialogOpen}
        onClose={() => setIsInviteDialogOpen(false)}
        item={inviteItem}
        inviteEmail={inviteEmail}
        setInviteEmail={setInviteEmail}
        inviteRole={inviteRole}
        setInviteRole={setInviteRole}
        onSubmit={handleSendInvite}
        isSubmitting={isSubmitting}
      />

      {/* Activity Dialog */}
      <Dialog open={isActivityDialogOpen} onOpenChange={setIsActivityDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Activity & Updates</DialogTitle>
            <DialogDescription>
              View all activity, progress updates, and discussions for this action item.
            </DialogDescription>
          </DialogHeader>
          
          {activityItem && (
            <div className="space-y-4">
              <div className="pb-3 border-b">
                <h3 className="font-medium">{activityItem.title}</h3>
                <p className="text-sm text-muted-foreground">{activityItem.module}</p>
              </div>

              {/* Activity Timeline */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm">Activity Timeline</h4>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {activityItem.recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                      <Avatar className="w-8 h-8 mt-1">
                        <AvatarFallback className="text-xs">{activity.user.avatar}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">{activity.user.name}</span>
                          <span className="text-xs text-muted-foreground">{activity.time}</span>
                        </div>
                        <p className="text-sm">{activity.action}</p>
                      </div>
                    </div>
                  ))}
                  
                  {/* Sample additional activities */}
                  <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                    <Avatar className="w-8 h-8 mt-1">
                      <AvatarFallback className="text-xs">JS</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">John Smith</span>
                        <span className="text-xs text-muted-foreground">1 day ago</span>
                      </div>
                      <p className="text-sm">Updated section status: Engine Inspection marked as completed</p>
                      <div className="mt-2 p-2 bg-green-50 rounded text-xs">
                        Progress: Engine oil pressure check completed. All readings within normal parameters.
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                    <Avatar className="w-8 h-8 mt-1">
                      <AvatarFallback className="text-xs">MJ</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">Mike Johnson</span>
                        <span className="text-xs text-muted-foreground">2 days ago</span>
                      </div>
                      <p className="text-sm">Added comment and updated progress</p>
                      <div className="mt-2 p-2 bg-blue-50 rounded text-xs">
                        Avionics systems all green. Navigation and communication equipment tested and certified.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setIsActivityDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Track Status Dialog */}
      <Dialog open={isTrackStatusDialogOpen} onOpenChange={setIsTrackStatusDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Update Tracking Status</DialogTitle>
            <DialogDescription>
              Change the overall tracking status for this action item to reflect current progress.
            </DialogDescription>
          </DialogHeader>
          
          {trackStatusItem && (
            <div className="space-y-4">
              <div className="pb-3 border-b">
                <p className="text-sm text-muted-foreground">
                  Update tracking status for "{trackStatusItem.title}"
                </p>
              </div>
              
              <div>
                <Label htmlFor="track-status" className="text-sm font-medium mb-2 block">
                  Tracking Status
                </Label>
                <Select value={newTrackStatus} onValueChange={setNewTrackStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="on-track">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-green-500" />
                        On track
                      </div>
                    </SelectItem>
                    <SelectItem value="at-risk">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-yellow-500" />
                        At risk
                      </div>
                    </SelectItem>
                    <SelectItem value="behind">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-red-500" />
                        Behind schedule
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  This status helps team members understand the overall health of this action item.
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => setIsTrackStatusDialogOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleUpdateTrackStatus}
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Update Status
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}