import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Progress } from './ui/progress';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import { 
  CheckCircle,
  Clock,
  AlertTriangle,
  AlertCircle,
  Plus,
  Search,
  Calendar,
  User,
  FileText,
  MessageSquare,
  Eye,
  Edit,
  Wrench,
  Shield,
  Users,
  Building2,
  Fuel,
  Target,
  RefreshCw,
  Activity,
  TrendingUp,
  ArrowRight,
  Plane,
  CheckCheck,
  Star,
  Share2,
  Bell,
  History,
  Pause
} from 'lucide-react';
import { mockWorkOrders, mockTechnicians } from './WorkOrders/mockData';
import { WorkOrder } from './WorkOrders/types';

interface AssignedTasksProps {
  userRole: string;
}

export default function AssignedTasks({ userRole }: AssignedTasksProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [isAddingPersonalTask, setIsAddingPersonalTask] = useState(false);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>(mockWorkOrders);
  const [pauseDialogOpen, setPauseDialogOpen] = useState(false);
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<WorkOrder | null>(null);
  const [pauseReason, setPauseReason] = useState('');

  // Simple Avatar components
  const Avatar = ({ className, children }: { className?: string; children: React.ReactNode }) => (
    <div className={`${className} rounded-full bg-gray-200 flex items-center justify-center`}>
      {children}
    </div>
  );
  
  const AvatarFallback = ({ className, children }: { className?: string; children: React.ReactNode }) => (
    <span className={className}>{children}</span>
  );

  // Enhanced mock task data with collaboration-style information
  const allTasks = [
    {
      id: 'TASK001',
      title: 'Complete 100-hour inspection on N123AB',
      description: 'Comprehensive 100-hour inspection including engine, avionics, and structural checks',
      module: 'Maintenance',
      assignedBy: 'Chief Maintenance Officer',
      assignedTo: 'John Smith',
      assignedDate: '2025-02-01',
      dueDate: '2025-02-15',
      priority: 'High',
      status: 'In Progress',
      progress: 65,
      estimatedHours: 8,
      actualHours: 5.2,
      aircraft: 'N123AB',
      tags: ['Inspection', 'Critical'],
      contributors: [
        { id: '1', name: 'John Smith', role: 'Lead Mechanic', avatar: 'JS' },
        { id: '2', name: 'Mike Johnson', role: 'Avionics Tech', avatar: 'MJ' },
        { id: '3', name: 'Tom Wilson', role: 'Inspector', avatar: 'TW' }
      ],
      recentActivity: [
        {
          id: 1,
          user: { name: 'John Smith', avatar: 'JS' },
          action: 'completed engine oil pressure check',
          time: '2 hours ago',
          type: 'progress'
        },
        {
          id: 2,
          user: { name: 'Mike Johnson', avatar: 'MJ' },
          action: 'verified avionics system functionality',
          time: '4 hours ago',
          type: 'update'
        }
      ],
      sections: [
        { name: 'Engine Inspection', status: 'completed', progress: 100 },
        { name: 'Avionics Check', status: 'completed', progress: 100 },
        { name: 'Structural Inspection', status: 'in-progress', progress: 60 },
        { name: 'Documentation Review', status: 'pending', progress: 0 }
      ],
      sectionsComplete: 2,
      totalSections: 4,
      isPersonal: false
    },
    {
      id: 'TASK002',
      title: 'Update passenger allergy database',
      description: 'Review and update allergy information for VIP passengers, ensure emergency protocols are current',
      module: 'Passenger Services',
      assignedBy: 'Head of Passenger Services',
      assignedTo: 'Sarah Wilson',
      assignedDate: '2025-02-02',
      dueDate: '2025-02-08',
      priority: 'Critical',
      status: 'In Progress',
      progress: 30,
      estimatedHours: 3,
      actualHours: 0.9,
      tags: ['Safety', 'VIP', 'Medical'],
      contributors: [
        { id: '1', name: 'Sarah Wilson', role: 'Flight Attendant', avatar: 'SW' },
        { id: '2', name: 'Dr. Lisa Chen', role: 'Medical Advisor', avatar: 'LC' }
      ],
      recentActivity: [
        {
          id: 1,
          user: { name: 'Sarah Wilson', avatar: 'SW' },
          action: 'reviewed passenger files for allergies',
          time: '1 hour ago',
          type: 'progress'
        },
        {
          id: 2,
          user: { name: 'Dr. Lisa Chen', avatar: 'LC' },
          action: 'provided updated medical protocols',
          time: '6 hours ago',
          type: 'update'
        }
      ],
      sections: [
        { name: 'Current Database Review', status: 'completed', progress: 100 },
        { name: 'Medical Protocol Updates', status: 'in-progress', progress: 40 },
        { name: 'Emergency Response Plans', status: 'pending', progress: 0 },
        { name: 'Training Documentation', status: 'pending', progress: 0 }
      ],
      sectionsComplete: 1,
      totalSections: 4,
      isPersonal: false
    },
    {
      id: 'TASK003',
      title: 'Safety audit for ground operations',
      description: 'Perform comprehensive safety audit of ground handling procedures and equipment',
      module: 'Safety',
      assignedBy: 'Safety Manager',
      assignedTo: 'David Brown',
      assignedDate: '2025-01-28',
      dueDate: '2025-02-10',
      priority: 'High',
      status: 'In Progress',
      progress: 75,
      estimatedHours: 12,
      actualHours: 9.2,
      tags: ['Audit', 'Ground Operations', 'Compliance'],
      contributors: [
        { id: '1', name: 'David Brown', role: 'Safety Inspector', avatar: 'DB' },
        { id: '2', name: 'Carlos Martinez', role: 'Ground Crew Lead', avatar: 'CM' },
        { id: '3', name: 'Jennifer Park', role: 'Compliance Officer', avatar: 'JP' }
      ],
      recentActivity: [
        {
          id: 1,
          user: { name: 'David Brown', avatar: 'DB' },
          action: 'completed equipment inspection checklist',
          time: '3 hours ago',
          type: 'progress'
        },
        {
          id: 2,
          user: { name: 'Carlos Martinez', avatar: 'CM' },
          action: 'provided ground crew feedback and recommendations',
          time: '1 day ago',
          type: 'update'
        }
      ],
      sections: [
        { name: 'Equipment Inspection', status: 'completed', progress: 100 },
        { name: 'Procedure Review', status: 'completed', progress: 100 },
        { name: 'Staff Interviews', status: 'completed', progress: 100 },
        { name: 'Final Report', status: 'in-progress', progress: 25 }
      ],
      sectionsComplete: 3,
      totalSections: 4,
      isPersonal: false
    }
  ];

  // Personal tasks
  const [personalTasks, setPersonalTasks] = useState([
    {
      id: 'PERSONAL001',
      title: 'Review updated safety procedures manual',
      description: 'Study the new safety procedures manual and complete online quiz',
      module: 'Personal Development',
      assignedBy: 'Self',
      assignedTo: 'Current User',
      assignedDate: '2025-02-01',
      dueDate: '2025-02-10',
      priority: 'Medium',
      status: 'In Progress',
      progress: 45,
      estimatedHours: 2,
      actualHours: 0.9,
      tags: ['Training', 'Safety', 'Self-Study'],
      contributors: [
        { id: '1', name: 'You', role: userRole, avatar: 'ME' }
      ],
      recentActivity: [
        {
          id: 1,
          user: { name: 'You', avatar: 'ME' },
          action: 'completed chapters 1-3 of safety manual',
          time: '2 days ago',
          type: 'progress'
        }
      ],
      sections: [
        { name: 'Chapters 1-3', status: 'completed', progress: 100 },
        { name: 'Chapters 4-6', status: 'in-progress', progress: 60 },
        { name: 'Online Quiz', status: 'pending', progress: 0 },
        { name: 'Completion Certificate', status: 'pending', progress: 0 }
      ],
      sectionsComplete: 1,
      totalSections: 4,
      isPersonal: true
    }
  ]);

  // Convert work orders to task format for maintenance users
  const convertWorkOrderToTask = (wo: WorkOrder) => {
    const progress = wo.subTasks.length > 0 
      ? (wo.subTasks.filter(st => st.status === 'completed').length / wo.subTasks.length) * 100
      : 0;
    
    const assignedTechs = mockTechnicians.filter(t => wo.assignedTo.includes(t.id));
    
    return {
      id: wo.id,
      title: wo.title,
      description: wo.description,
      module: 'Maintenance',
      assignedBy: wo.createdBy,
      assignedTo: wo.assignedTo.join(', '),
      assignedDate: wo.createdAt,
      dueDate: wo.dueDate,
      priority: wo.priority.charAt(0).toUpperCase() + wo.priority.slice(1),
      status: wo.status === 'in-progress' ? 'In Progress' : 
              wo.status === 'completed' ? 'Completed' : 
              wo.status === 'on-hold' ? 'Paused' :
              wo.status === 'pending' ? 'Pending' : 'In Progress',
      progress: progress,
      estimatedHours: wo.estimatedHours,
      actualHours: wo.actualHours,
      aircraft: wo.tailNumber,
      tags: [wo.category.charAt(0).toUpperCase() + wo.category.slice(1), wo.type],
      contributors: assignedTechs.map(t => ({
        id: t.id,
        name: t.name,
        role: `Technician - ${t.shift} Shift`,
        avatar: t.name.split(' ').map(n => n[0]).join('')
      })),
      recentActivity: [],
      sections: wo.subTasks.map(st => ({
        name: st.title,
        status: st.status === 'completed' ? 'completed' : 
                st.status === 'in-progress' ? 'in-progress' : 'pending',
        progress: st.status === 'completed' ? 100 : st.status === 'in-progress' ? 50 : 0
      })),
      sectionsComplete: wo.subTasks.filter(st => st.status === 'completed').length,
      totalSections: wo.subTasks.length,
      isPersonal: false,
      workOrderData: wo // Keep original work order data
    };
  };

  // Handle pausing a work order
  const handlePauseWorkOrder = () => {
    if (!selectedWorkOrder) return;
    
    setWorkOrders(prev => prev.map(wo => 
      wo.id === selectedWorkOrder.id 
        ? { ...wo, status: 'on-hold' as const, notes: `${wo.notes || ''}\n\nPaused: ${pauseReason}`.trim() }
        : wo
    ));
    
    setPauseDialogOpen(false);
    setPauseReason('');
    setSelectedWorkOrder(null);
  };

  const handleResumeWorkOrder = (woId: string) => {
    setWorkOrders(prev => prev.map(wo => 
      wo.id === woId 
        ? { ...wo, status: 'in-progress' as const }
        : wo
    ));
  };

  // Filter tasks based on current user role
  const getUserTasks = () => {
    const roleTaskMapping = {
      'pilot': ['TASK003'],
      'maintenance': ['TASK001'],
      'inflight': ['TASK002'],
      'safety': ['TASK003'],
      'scheduling': [],
      'lead': allTasks.map(t => t.id),
      'admin': allTasks.map(t => t.id)
    };

    const userTaskIds = roleTaskMapping[userRole as keyof typeof roleTaskMapping] || [];
    const assignedTasks = allTasks.filter(task => userTaskIds.includes(task.id));
    
    // Add work orders for maintenance users
    let workOrderTasks: any[] = [];
    if (userRole === 'maintenance') {
      // Filter work orders assigned to current user (for demo, showing all active work orders)
      workOrderTasks = workOrders
        .filter(wo => wo.status !== 'cancelled')
        .map(wo => convertWorkOrderToTask(wo));
    }
    
    return [...assignedTasks, ...workOrderTasks, ...personalTasks];
  };

  const userTasks = getUserTasks();

  // Apply filters
  const filteredTasks = userTasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.tags.some((tag: string) => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || 
                         task.status.toLowerCase().replace(' ', '') === statusFilter ||
                         (statusFilter === 'paused' && task.status === 'Paused');
    const matchesPriority = priorityFilter === 'all' || task.priority.toLowerCase() === priorityFilter;
    
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const getBorderColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'critical': return 'border-l-red-500';
      case 'high': return 'border-l-orange-500';
      case 'medium': return 'border-l-yellow-500';
      case 'low': return 'border-l-green-500';
      default: return 'border-l-gray-500';
    }
  };

  const getDaysUntilDue = (dueDate: string) => {
    const due = new Date(dueDate);
    const today = new Date();
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const getTaskStats = () => {
    const total = userTasks.length;
    const active = userTasks.filter(t => t.status === 'In Progress').length;
    const paused = userTasks.filter(t => t.status === 'Paused').length;
    const completed = userTasks.filter(t => t.status === 'Completed').length;
    const totalContributors = new Set(userTasks.flatMap(t => t.contributors.map(c => c.id))).size;
    
    return { total, active, paused, completed, totalContributors };
  };

  const stats = getTaskStats();

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1>My Action Items</h1>
          <p className="text-muted-foreground">Track progress on assigned tasks and personal development goals</p>
        </div>
        <Button className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Personal Task
        </Button>
      </div>

      {/* Task Overview */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="text-center">
          <CardContent className="p-4">
            <Activity className="w-8 h-8 mx-auto mb-2 text-blue-600" />
            <div className="text-2xl font-bold">{stats.active}</div>
            <div className="text-sm text-muted-foreground">Active Tasks</div>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="p-4">
            <Pause className="w-8 h-8 mx-auto mb-2 text-yellow-600" />
            <div className="text-2xl font-bold">{stats.paused}</div>
            <div className="text-sm text-muted-foreground">Paused</div>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="p-4">
            <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-600" />
            <div className="text-2xl font-bold">{stats.completed}</div>
            <div className="text-sm text-muted-foreground">Completed This Month</div>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="p-4">
            <Users className="w-8 h-8 mx-auto mb-2 text-purple-600" />
            <div className="text-2xl font-bold">{stats.totalContributors}</div>
            <div className="text-sm text-muted-foreground">Total Contributors</div>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="p-4">
            <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-red-600" />
            <div className="text-2xl font-bold">0</div>
            <div className="text-sm text-muted-foreground">Overdue</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
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
              <SelectItem value="paused">Paused</SelectItem>
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
        </div>
      </div>

      {/* Pause Work Order Dialog */}
      <Dialog open={pauseDialogOpen} onOpenChange={setPauseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pause Work Order</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Reason for pausing</Label>
              <Textarea
                placeholder="Enter reason (e.g., waiting for parts, need additional tools, shift change...)"
                value={pauseReason}
                onChange={(e) => setPauseReason(e.target.value)}
                rows={4}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setPauseDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handlePauseWorkOrder} disabled={!pauseReason.trim()}>
                Pause Work Order
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Active Tasks - Exact Collaboration Style */}
      <div className="space-y-6">
        <h2>Active Tasks</h2>
        
        {filteredTasks.filter(task => task.status === 'In Progress').map((task) => (
          <Card key={task.id} className={`border-l-4 ${getBorderColor(task.priority)}`}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="font-medium">{task.title}</h3>
                    <Badge className="bg-blue-100 text-blue-800">ACTIVE</Badge>
                    <Badge variant="outline" className="text-xs flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {task.contributors.length} contributors
                    </Badge>
                  </div>
                  <p className="text-muted-foreground mb-3">
                    {task.module} • Assigned by {task.assignedBy}
                  </p>
                  <p className="text-sm mb-4">
                    {task.description}
                  </p>
                  
                  {/* Contributors */}
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-sm font-medium">Contributors:</span>
                    <div className="flex -space-x-2">
                      {task.contributors.map((contributor) => (
                        <Avatar key={contributor.id} className="w-8 h-8 border-2 border-white">
                          <AvatarFallback className="text-xs">{contributor.avatar}</AvatarFallback>
                        </Avatar>
                      ))}
                    </div>
                    <Button variant="ghost" size="sm" className="text-xs h-8 px-3">
                      <Plus className="w-3 h-3 mr-1" />
                      Invite
                    </Button>
                  </div>
                </div>
                <div className="ml-6 text-right">
                  <div className="text-xs text-muted-foreground">Started {formatDate(task.assignedDate)}</div>
                  <div className="text-xs text-muted-foreground">Target: {formatDate(task.dueDate)}</div>
                </div>
              </div>

              {/* Progress Overview */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium">Overall Progress</h4>
                  <Badge variant="outline" className="text-xs">{task.sectionsComplete} of {task.totalSections} sections complete</Badge>
                </div>
                <Progress value={task.progress} className="mb-3" />
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  {task.sections.map((section, index) => (
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
                  {task.recentActivity.map((activity) => (
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
                    Target: {formatDate(task.dueDate)}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageSquare className="w-4 h-4" />
                    {task.recentActivity.length} updates
                  </span>
                  <span className="flex items-center gap-1">
                    <TrendingUp className="w-4 h-4" />
                    On track
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Eye className="w-4 h-4 mr-2" />
                    View Details
                  </Button>
                  {task.workOrderData && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setSelectedWorkOrder(task.workOrderData);
                        setPauseDialogOpen(true);
                      }}
                    >
                      <Pause className="w-4 h-4 mr-2" />
                      Pause
                    </Button>
                  )}
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Update Progress
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Paused Tasks */}
      {filteredTasks.filter(task => task.status === 'Paused').length > 0 && (
        <div className="space-y-6">
          <h2>Paused Tasks</h2>
          
          {filteredTasks.filter(task => task.status === 'Paused').map((task) => (
            <Card key={task.id} className="border-l-4 border-l-yellow-500">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="font-medium">{task.title}</h3>
                      <Badge className="bg-yellow-100 text-yellow-800">PAUSED</Badge>
                      {task.aircraft && (
                        <Badge variant="outline" className="text-xs flex items-center gap-1">
                          <Plane className="w-3 h-3" />
                          {task.aircraft}
                        </Badge>
                      )}
                    </div>
                    <p className="text-muted-foreground mb-3">
                      {task.module} • Assigned by {task.assignedBy}
                    </p>
                    <p className="text-sm mb-4">
                      {task.description}
                    </p>
                    
                    {task.workOrderData?.notes && (
                      <Alert className="mb-4">
                        <Pause className="w-4 h-4" />
                        <AlertDescription>
                          <div className="text-sm">
                            <strong>Pause Reason:</strong>
                            <div className="mt-1">{task.workOrderData.notes.split('Paused:').pop()?.trim()}</div>
                          </div>
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                  <div className="ml-6 text-right">
                    <div className="text-xs text-muted-foreground">Paused on {formatDate(task.assignedDate)}</div>
                    <div className="text-xs text-muted-foreground">Due: {formatDate(task.dueDate)}</div>
                  </div>
                </div>

                <div className="bg-yellow-50 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">Progress Before Pause</h4>
                    <span className="text-sm">{task.progress.toFixed(0)}%</span>
                  </div>
                  <Progress value={task.progress} className="mb-2" />
                  <div className="text-xs text-muted-foreground">
                    {task.sectionsComplete} of {task.totalSections} sections completed
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-6 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {task.actualHours}h / {task.estimatedHours}h
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Eye className="w-4 h-4 mr-2" />
                      View Details
                    </Button>
                    {task.workOrderData && (
                      <Button 
                        size="sm" 
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => handleResumeWorkOrder(task.workOrderData.id)}
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Resume Work
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Recently Completed */}
      <div className="space-y-4">
        <h2>Recently Completed</h2>
        
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <h3 className="font-medium">Aircraft pre-flight checklist automation</h3>
                  <Badge className="bg-green-100 text-green-800">COMPLETED</Badge>
                  <Badge variant="outline" className="text-xs flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    3 contributors
                  </Badge>
                </div>
                <p className="text-muted-foreground mb-3">
                  Operations • Led by Captain Jennifer Smith
                </p>
                <p className="text-sm mb-4">
                  Implemented digital pre-flight checklist system for Gulfstream G650 operations
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
                <span className="text-sm font-medium text-green-800">Task completed successfully</span>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="text-center">
                  <div className="font-bold text-lg">5/5</div>
                  <div className="text-xs text-muted-foreground">Sections completed</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-lg">8/8</div>
                  <div className="text-xs text-muted-foreground">Tests passed</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-lg">100%</div>
                  <div className="text-xs text-muted-foreground">Requirements met</div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" />
                  Implemented in production
                </span>
                <span className="flex items-center gap-1">
                  <Bell className="w-4 h-4" />
                  All stakeholders notified
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
    </div>
  );
}