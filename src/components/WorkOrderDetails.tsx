import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from './ui/dialog';
import { Separator } from './ui/separator';
import { 
  Clock, 
  User, 
  Plane, 
  Calendar, 
  AlertTriangle,
  CheckCircle,
  Plus,
  Play,
  Pause,
  Save,
  Cloud,
  Users,
  MapPin,
  Edit,
  Trash2,
  FileText,
  Timer,
  CheckSquare,
  Circle,
  BarChart3
} from 'lucide-react';
import { WorkOrder, SubTask, TimeEntry } from './WorkOrders/types';
import { mockTechnicians, mockTimeEntries } from './WorkOrders/mockData';

interface WorkOrderDetailsProps {
  workOrder: WorkOrder;
  onUpdate: (workOrder: WorkOrder) => void;
  onClose: () => void;
}

export default function WorkOrderDetails({ workOrder, onUpdate, onClose }: WorkOrderDetailsProps) {
  const [editedWorkOrder, setEditedWorkOrder] = useState<WorkOrder>(workOrder);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>(
    mockTimeEntries.filter(te => te.workOrderId === workOrder.id)
  );
  const [isAddSubTaskOpen, setIsAddSubTaskOpen] = useState(false);
  const [isAddTimeOpen, setIsAddTimeOpen] = useState(false);
  const [newSubTask, setNewSubTask] = useState<Partial<SubTask>>({
    title: '',
    description: '',
    estimatedHours: 0,
    actualHours: 0,
    status: 'pending'
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'in-progress': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'assigned': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'pending': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'major': return 'bg-red-100 text-red-800 border-red-200';
      case 'minor': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'ancillary': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const handleAddSubTask = () => {
    if (!newSubTask.title) return;

    const subTask: SubTask = {
      id: `ST-${Date.now()}`,
      title: newSubTask.title,
      description: newSubTask.description,
      status: 'pending',
      estimatedHours: newSubTask.estimatedHours || 0,
      actualHours: 0
    };

    const updated = {
      ...editedWorkOrder,
      subTasks: [...editedWorkOrder.subTasks, subTask],
      updatedAt: new Date().toISOString()
    };

    setEditedWorkOrder(updated);
    setNewSubTask({ title: '', description: '', estimatedHours: 0, actualHours: 0, status: 'pending' });
    setIsAddSubTaskOpen(false);
  };

  const handleToggleSubTaskStatus = (subTaskId: string) => {
    const updated = {
      ...editedWorkOrder,
      subTasks: editedWorkOrder.subTasks.map(st => {
        if (st.id === subTaskId) {
          const newStatus = st.status === 'completed' ? 'pending' : 'completed';
          return {
            ...st,
            status: newStatus,
            completedAt: newStatus === 'completed' ? new Date().toISOString() : undefined,
            completedBy: newStatus === 'completed' ? 'Current User' : undefined
          };
        }
        return st;
      }),
      updatedAt: new Date().toISOString()
    };

    setEditedWorkOrder(updated);
  };

  const handleSave = () => {
    onUpdate(editedWorkOrder);
    onClose();
  };

  const getTechnicianName = (techId: string) => {
    const tech = mockTechnicians.find(t => t.id === techId);
    return tech?.name || techId;
  };

  const totalEstimatedHours = editedWorkOrder.subTasks.reduce((sum, st) => sum + st.estimatedHours, 0);
  const totalActualHours = editedWorkOrder.subTasks.reduce((sum, st) => sum + st.actualHours, 0);
  const completedSubTasks = editedWorkOrder.subTasks.filter(st => st.status === 'completed').length;
  const progressPercentage = editedWorkOrder.subTasks.length > 0 
    ? (completedSubTasks / editedWorkOrder.subTasks.length) * 100 
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-2xl">{editedWorkOrder.title}</h2>
              {editedWorkOrder.type === 'aog' && (
                <Badge className="bg-red-500 text-white">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  AOG
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground">{editedWorkOrder.description}</p>
          </div>
          
          <div className="flex items-center gap-2">
            {editedWorkOrder.cmpSyncRequired && (
              <Button variant="outline" size="sm">
                <Cloud className="w-4 h-4 mr-2" />
                Sync to CMP
              </Button>
            )}
            <Button onClick={handleSave}>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </div>

        {/* Key Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Plane className="w-4 h-4 text-blue-600" />
                <span className="text-sm text-muted-foreground">Aircraft</span>
              </div>
              <div>
                <div>{editedWorkOrder.tailNumber}</div>
                <div className="text-sm text-muted-foreground">{editedWorkOrder.aircraft}</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-4 h-4 text-blue-600" />
                <span className="text-sm text-muted-foreground">Location</span>
              </div>
              <div>{editedWorkOrder.location}</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span className="text-sm text-muted-foreground">Due Date</span>
              </div>
              <div>{formatDateTime(editedWorkOrder.dueDate)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-blue-600" />
                <span className="text-sm text-muted-foreground">Hours</span>
              </div>
              <div className="flex items-center gap-2">
                <span>{totalActualHours.toFixed(1)}</span>
                <span className="text-muted-foreground">/</span>
                <span className="text-muted-foreground">{totalEstimatedHours.toFixed(1)}h</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Status and Classification */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-sm">Priority:</span>
          <Badge className={getPriorityColor(editedWorkOrder.priority)}>
            {editedWorkOrder.priority}
          </Badge>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-sm">Status:</span>
          <Badge className={getStatusColor(editedWorkOrder.status)}>
            {editedWorkOrder.status}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm">Category:</span>
          <Badge className={getCategoryColor(editedWorkOrder.category)}>
            {editedWorkOrder.category}
          </Badge>
        </div>

        {editedWorkOrder.cmpJobCard && (
          <div className="flex items-center gap-2">
            <span className="text-sm">CMP Job Card:</span>
            <Badge variant="outline">
              <FileText className="w-3 h-3 mr-1" />
              {editedWorkOrder.cmpJobCard}
            </Badge>
          </div>
        )}
      </div>

      <Separator />

      {/* Main Tabs */}
      <Tabs defaultValue="subtasks" className="w-full">
        <TabsList>
          <TabsTrigger value="subtasks">
            <CheckSquare className="w-4 h-4 mr-2" />
            Sub-Tasks ({editedWorkOrder.subTasks.length})
          </TabsTrigger>
          <TabsTrigger value="time">
            <Timer className="w-4 h-4 mr-2" />
            Time Tracking ({timeEntries.length})
          </TabsTrigger>
          <TabsTrigger value="assignment">
            <Users className="w-4 h-4 mr-2" />
            Assignment
          </TabsTrigger>
          <TabsTrigger value="details">
            <FileText className="w-4 h-4 mr-2" />
            Details
          </TabsTrigger>
        </TabsList>

        {/* Sub-Tasks Tab */}
        <TabsContent value="subtasks" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Work Breakdown</CardTitle>
                <Button size="sm" onClick={() => setIsAddSubTaskOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Sub-Task
                </Button>
              </div>
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm">Overall Progress</span>
                  <span className="text-sm">
                    {completedSubTasks} / {editedWorkOrder.subTasks.length} completed ({Math.round(progressPercentage)}%)
                  </span>
                </div>
                <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-600 transition-all" 
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {editedWorkOrder.subTasks.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    No sub-tasks defined. Add sub-tasks to break down the work.
                  </div>
                ) : (
                  editedWorkOrder.subTasks.map((subTask) => (
                    <Card key={subTask.id} className={subTask.status === 'completed' ? 'bg-green-50' : ''}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="p-0 h-6 w-6 mt-1"
                            onClick={() => handleToggleSubTaskStatus(subTask.id)}
                          >
                            {subTask.status === 'completed' ? (
                              <CheckCircle className="w-5 h-5 text-green-600" />
                            ) : (
                              <Circle className="w-5 h-5 text-gray-400" />
                            )}
                          </Button>
                          
                          <div className="flex-1">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <h4 className={subTask.status === 'completed' ? 'line-through text-muted-foreground' : ''}>
                                  {subTask.title}
                                </h4>
                                {subTask.description && (
                                  <p className="text-sm text-muted-foreground mt-1">{subTask.description}</p>
                                )}
                              </div>
                              <Badge className={getStatusColor(subTask.status)}>
                                {subTask.status}
                              </Badge>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              {subTask.assignedTo && (
                                <div className="flex items-center gap-1">
                                  <User className="w-3 h-3" />
                                  <span>{getTechnicianName(subTask.assignedTo)}</span>
                                </div>
                              )}
                              
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                <span>
                                  {subTask.actualHours.toFixed(1)}h / {subTask.estimatedHours.toFixed(1)}h
                                </span>
                              </div>

                              {subTask.completedBy && (
                                <div className="flex items-center gap-1 text-green-600">
                                  <CheckCircle className="w-3 h-3" />
                                  <span>{subTask.completedBy}</span>
                                </div>
                              )}

                              {subTask.completedAt && (
                                <div className="text-muted-foreground">
                                  {new Date(subTask.completedAt).toLocaleString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </div>
                              )}
                            </div>

                            {subTask.notes && (
                              <div className="mt-2 p-2 bg-muted rounded text-sm">
                                <strong>Notes:</strong> {subTask.notes}
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Time Tracking Tab */}
        <TabsContent value="time" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Time Entries</CardTitle>
                <Button size="sm" onClick={() => setIsAddTimeOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Log Time
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm text-muted-foreground mb-1">Total Hours Logged</div>
                    <div className="text-2xl">{totalActualHours.toFixed(1)}h</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm text-muted-foreground mb-1">Estimated Hours</div>
                    <div className="text-2xl">{totalEstimatedHours.toFixed(1)}h</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm text-muted-foreground mb-1">Variance</div>
                    <div className="text-2xl">
                      {totalActualHours > totalEstimatedHours ? '+' : ''}
                      {(totalActualHours - totalEstimatedHours).toFixed(1)}h
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Time Entries Table */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Technician</TableHead>
                    <TableHead>Sub-Task</TableHead>
                    <TableHead>Start Time</TableHead>
                    <TableHead>End Time</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {timeEntries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No time entries logged yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    timeEntries.map((entry) => {
                      const subTask = editedWorkOrder.subTasks.find(st => st.id === entry.subTaskId);
                      return (
                        <TableRow key={entry.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4" />
                              {entry.technicianName}
                            </div>
                          </TableCell>
                          <TableCell>{subTask?.title || 'General'}</TableCell>
                          <TableCell>
                            {new Date(entry.startTime).toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </TableCell>
                          <TableCell>
                            {entry.endTime ? (
                              new Date(entry.endTime).toLocaleString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })
                            ) : (
                              <Badge variant="outline" className="text-blue-600">In Progress</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {entry.duration.toFixed(1)}h
                            </div>
                          </TableCell>
                          <TableCell className="max-w-xs truncate">
                            {entry.notes || '-'}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Assignment Tab */}
        <TabsContent value="assignment" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Assigned Technicians</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {editedWorkOrder.assignedShift && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="w-5 h-5 text-blue-600" />
                      <span>Assigned to {editedWorkOrder.assignedShift} Shift</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      All technicians on the {editedWorkOrder.assignedShift} shift can work on this job
                    </p>
                  </div>
                )}

                {editedWorkOrder.assignedTo.length > 0 ? (
                  <div className="space-y-2">
                    {editedWorkOrder.assignedTo.map((techId) => {
                      const tech = mockTechnicians.find(t => t.id === techId);
                      if (!tech) return null;

                      return (
                        <Card key={techId}>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="flex items-center gap-2">
                                  <User className="w-4 h-4" />
                                  <span>{tech.name}</span>
                                  <Badge variant="outline">{tech.shift} Shift</Badge>
                                </div>
                                <div className="text-sm text-muted-foreground mt-1">
                                  Certifications: {tech.certifications.join(', ')}
                                </div>
                              </div>
                              <Button variant="outline" size="sm">
                                Remove
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    No technicians assigned individually
                  </div>
                )}

                <Button variant="outline" className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Assign Technician
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Details Tab */}
        <TabsContent value="details" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Work Order Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Work Order ID</Label>
                  <div>{editedWorkOrder.id}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Type</Label>
                  <div className="capitalize">{editedWorkOrder.type}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Created By</Label>
                  <div>{editedWorkOrder.createdBy}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Created At</Label>
                  <div>{formatDateTime(editedWorkOrder.createdAt)}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Last Updated</Label>
                  <div>{formatDateTime(editedWorkOrder.updatedAt)}</div>
                </div>
                {editedWorkOrder.startDate && (
                  <div>
                    <Label className="text-muted-foreground">Start Date</Label>
                    <div>{formatDateTime(editedWorkOrder.startDate)}</div>
                  </div>
                )}
                {editedWorkOrder.completedDate && (
                  <div>
                    <Label className="text-muted-foreground">Completed Date</Label>
                    <div>{formatDateTime(editedWorkOrder.completedDate)}</div>
                  </div>
                )}
              </div>

              {editedWorkOrder.notes && (
                <div>
                  <Label className="text-muted-foreground">Notes</Label>
                  <div className="mt-2 p-3 bg-muted rounded">
                    {editedWorkOrder.notes}
                  </div>
                </div>
              )}

              {editedWorkOrder.cmpSyncRequired && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Cloud className="w-5 h-5 text-blue-600" />
                    <span>CMP Integration</span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div>This work order syncs with CMP for official record keeping</div>
                    <div className="text-muted-foreground">
                      Last synced: {editedWorkOrder.cmpLastSync ? formatDateTime(editedWorkOrder.cmpLastSync) : 'Never'}
                    </div>
                    {editedWorkOrder.cmpJobCard && (
                      <div>CMP Job Card: {editedWorkOrder.cmpJobCard}</div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Sub-Task Dialog */}
      <Dialog open={isAddSubTaskOpen} onOpenChange={setIsAddSubTaskOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Sub-Task</DialogTitle>
            <DialogDescription>
              Break down the work order into manageable sub-tasks
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Title *</Label>
              <Input
                value={newSubTask.title}
                onChange={(e) => setNewSubTask({ ...newSubTask, title: e.target.value })}
                placeholder="e.g., Engine inspection - left side"
              />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={newSubTask.description}
                onChange={(e) => setNewSubTask({ ...newSubTask, description: e.target.value })}
                placeholder="Detailed description of the sub-task"
                rows={3}
              />
            </div>

            <div>
              <Label>Estimated Hours</Label>
              <Input
                type="number"
                step="0.5"
                min="0"
                value={newSubTask.estimatedHours}
                onChange={(e) => setNewSubTask({ ...newSubTask, estimatedHours: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddSubTaskOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddSubTask}>
              Add Sub-Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
