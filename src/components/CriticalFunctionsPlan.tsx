import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Progress } from './ui/progress';
import { Switch } from './ui/switch';
import { Alert, AlertDescription } from './ui/alert';
import { 
  Shield, 
  Users, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Plus,
  Edit,
  X,
  UserCheck,
  FileText,
  Bell,
  MessageSquare,
  TrendingUp,
  Calendar,
  Flag,
  Target,
  Mail
} from 'lucide-react';

interface CriticalFunction {
  id: string;
  name: string;
  category: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  primaryRole: string;
  backupRoles: string[];
  procedures: string;
  status: 'active' | 'backup' | 'unavailable';
  assignedTo: string[];
  taggedPersons: string[];
  dueDate?: string;
  reviewDate?: string;
  reminders: {
    enabled: boolean;
    daysBefore: number;
    frequency: 'once' | 'daily' | 'weekly';
    lastSent?: string;
  };
  createdDate: string;
  lastUpdated: string;
}

interface ActionItem {
  id: string;
  title: string;
  description: string;
  assignedTo: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'not-started' | 'in-progress' | 'on-hold' | 'completed' | 'overdue';
  progress: number;
  createdDate: string;
  dueDate: string;
  estimatedCompletion: string;
  reminders: {
    enabled: boolean;
    frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly';
    lastSent?: string;
  };
  updates: ActionItemUpdate[];
  category: string;
}

interface ActionItemUpdate {
  id: string;
  date: string;
  author: string;
  message: string;
  progressChange?: number;
}

interface SuggestionBoxItem {
  id: string;
  title: string;
  description: string;
  submittedBy: string;
  submittedDate: string;
  category: string;
  targetRole: string; // Which manager should handle this
  priority: 'high' | 'medium' | 'low';
  status: 'new' | 'under-review' | 'approved' | 'implemented' | 'rejected';
  assignedTo?: string;
  response?: string;
  responseDate?: string;
}

export default function CriticalFunctionsPlan() {
  const [activeTab, setActiveTab] = useState('functions');
  const [showAddFunction, setShowAddFunction] = useState(false);
  const [showAddActionItem, setShowAddActionItem] = useState(false);
  const [selectedActionItem, setSelectedActionItem] = useState<ActionItem | null>(null);
  const [selectedFunction, setSelectedFunction] = useState<CriticalFunction | null>(null);

  // Mock list of available personnel for assignment/tagging
  const availablePersonnel = [
    'John Smith', 'Sarah Davis', 'Mike Johnson', 'Lisa Wilson', 'Robert Brown',
    'Jennifer White', 'David Clark', 'Michael Peterson', 'Lisa Chen', 'Tom Anderson',
    'Captain Rodriguez', 'Chief Pilot', 'Assistant Chief Pilot', 'Senior Captain',
    'Dispatcher', 'Senior Dispatcher', 'Operations Manager', 'Maintenance Manager',
    'Lead Technician', 'Avionics Specialist', 'Safety Officer Davis'
  ];

  // Mock data for Critical Functions
  const criticalFunctions: CriticalFunction[] = [
    {
      id: 'CF001',
      name: 'Flight Operations Management',
      category: 'Operations',
      priority: 'critical',
      primaryRole: 'Chief Pilot',
      backupRoles: ['Assistant Chief Pilot', 'Senior Captain'],
      procedures: 'Oversee all flight operations, crew scheduling, and safety compliance',
      status: 'active',
      assignedTo: ['John Smith', 'Sarah Davis'],
      taggedPersons: ['Mike Johnson', 'Lisa Wilson'],
      dueDate: '2024-03-15',
      reviewDate: '2024-02-15',
      reminders: {
        enabled: true,
        daysBefore: 7,
        frequency: 'weekly',
        lastSent: '2024-01-15'
      },
      createdDate: '2024-01-01',
      lastUpdated: '2024-01-15'
    },
    {
      id: 'CF002',
      name: 'Aircraft Dispatch',
      category: 'Operations',
      priority: 'critical',
      primaryRole: 'Dispatcher',
      backupRoles: ['Senior Dispatcher', 'Operations Manager'],
      procedures: 'Release aircraft for departure, monitor flight progress, handle diversions',
      status: 'active',
      assignedTo: ['Robert Brown'],
      taggedPersons: ['Jennifer White', 'David Clark'],
      dueDate: '2024-02-28',
      reviewDate: '2024-02-01',
      reminders: {
        enabled: true,
        daysBefore: 3,
        frequency: 'daily',
        lastSent: '2024-01-18'
      },
      createdDate: '2024-01-05',
      lastUpdated: '2024-01-18'
    },
    {
      id: 'CF003',
      name: 'Maintenance Coordination',
      category: 'Maintenance',
      priority: 'high',
      primaryRole: 'Maintenance Manager',
      backupRoles: ['Lead Technician', 'Avionics Specialist'],
      procedures: 'Coordinate maintenance activities, approve return to service',
      status: 'backup',
      assignedTo: ['Michael Peterson'],
      taggedPersons: ['Lisa Chen', 'Tom Anderson'],
      dueDate: '2024-04-10',
      reviewDate: '2024-03-10',
      reminders: {
        enabled: false,
        daysBefore: 14,
        frequency: 'once'
      },
      createdDate: '2024-01-03',
      lastUpdated: '2024-01-10'
    }
  ];

  // Mock data for Rolling Action Items
  const actionItems: ActionItem[] = [
    {
      id: 'AI001',
      title: 'Update Emergency Procedures Manual',
      description: 'Revise emergency procedures manual to align with new FAA regulations',
      assignedTo: 'Sarah Johnson',
      priority: 'high',
      status: 'in-progress',
      progress: 65,
      createdDate: '2024-01-10',
      dueDate: '2024-02-15',
      estimatedCompletion: '2024-02-10',
      reminders: {
        enabled: true,
        frequency: 'weekly',
        lastSent: '2024-01-15'
      },
      updates: [
        {
          id: 'U001',
          date: '2024-01-15',
          author: 'Sarah Johnson',
          message: 'Completed review of sections 1-3. Working on section 4.',
          progressChange: 25
        }
      ],
      category: 'Safety'
    },
    {
      id: 'AI002',
      title: 'Implement New Fuel Tracking System',
      description: 'Deploy new automated fuel tracking system across all aircraft',
      assignedTo: 'Mike Peterson',
      priority: 'medium',
      status: 'in-progress',
      progress: 40,
      createdDate: '2024-01-05',
      dueDate: '2024-03-01',
      estimatedCompletion: '2024-02-25',
      reminders: {
        enabled: true,
        frequency: 'biweekly'
      },
      updates: [
        {
          id: 'U002',
          date: '2024-01-12',
          author: 'Mike Peterson',
          message: 'Hardware installation complete on 3 of 8 aircraft.',
          progressChange: 15
        }
      ],
      category: 'Operations'
    },
    {
      id: 'AI003',
      title: 'Training Program Development',
      description: 'Develop comprehensive training program for new inflight crew',
      assignedTo: 'Lisa Chen',
      priority: 'critical',
      status: 'overdue',
      progress: 20,
      createdDate: '2024-01-01',
      dueDate: '2024-01-30',
      estimatedCompletion: '2024-02-05',
      reminders: {
        enabled: true,
        frequency: 'daily',
        lastSent: '2024-01-20'
      },
      updates: [],
      category: 'Training'
    }
  ];

  // Mock data for Suggestion Box
  const suggestionBoxItems: SuggestionBoxItem[] = [
    {
      id: 'SB001',
      title: 'Improve Pre-Flight Inspection Process',
      description: 'Suggestion to add digital checklist for pre-flight inspections to reduce paperwork and improve accuracy',
      submittedBy: 'Captain Rodriguez',
      submittedDate: '2024-01-18',
      category: 'Process Improvement',
      targetRole: 'Chief Pilot',
      priority: 'medium',
      status: 'under-review',
      assignedTo: 'Chief Pilot'
    },
    {
      id: 'SB002',
      title: 'Maintenance Schedule Optimization',
      description: 'Propose using predictive analytics to optimize maintenance schedules and reduce aircraft downtime',
      submittedBy: 'John Mechanic',
      submittedDate: '2024-01-16',
      category: 'Maintenance',
      targetRole: 'Maintenance Manager',
      priority: 'high',
      status: 'approved',
      assignedTo: 'Maintenance Manager',
      response: 'Excellent suggestion. We will evaluate predictive analytics solutions.',
      responseDate: '2024-01-17'
    },
    {
      id: 'SB003',
      title: 'Passenger Service Enhancement',
      description: 'Add tablet-based entertainment system to improve passenger experience on longer flights',
      submittedBy: 'Flight Attendant Smith',
      submittedDate: '2024-01-15',
      category: 'Passenger Experience',
      targetRole: 'Inflight Manager',
      priority: 'low',
      status: 'new'
    },
    {
      id: 'SB004',
      title: 'Safety Reporting System Update',
      description: 'Modernize the hazard reporting system with mobile app integration for faster reporting',
      submittedBy: 'Safety Officer Davis',
      submittedDate: '2024-01-12',
      category: 'Safety',
      targetRole: 'Safety Manager',
      priority: 'high',
      status: 'implemented',
      assignedTo: 'Safety Manager',
      response: 'Implemented mobile reporting feature. Great suggestion!',
      responseDate: '2024-01-14'
    }
  ];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': case 'completed': case 'implemented': return 'bg-green-500';
      case 'in-progress': case 'under-review': return 'bg-blue-500';
      case 'backup': case 'approved': return 'bg-yellow-500';
      case 'unavailable': case 'overdue': case 'rejected': return 'bg-red-500';
      case 'on-hold': case 'new': return 'bg-gray-500';
      case 'not-started': return 'bg-slate-400';
      default: return 'bg-gray-500';
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch (error) {
      return dateString;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="flex items-center gap-2">
          <Shield className="w-6 h-6" />
          Critical Functions & Leadership Management
        </h1>
        <p className="text-muted-foreground">Manage critical functions, action items, and team suggestions</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="functions">Critical Functions</TabsTrigger>
          <TabsTrigger value="actions">Rolling Action Items</TabsTrigger>
          <TabsTrigger value="suggestions">Suggestion Box</TabsTrigger>
        </TabsList>

        {/* Critical Functions Tab */}
        <TabsContent value="functions" className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Functions</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{criticalFunctions.length}</div>
                <p className="text-xs text-muted-foreground">Active critical functions</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Critical Priority</CardTitle>
                <AlertTriangle className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {criticalFunctions.filter(func => func.priority === 'critical').length}
                </div>
                <p className="text-xs text-muted-foreground">Highest priority</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Reminders</CardTitle>
                <Bell className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {criticalFunctions.filter(func => func.reminders.enabled).length}
                </div>
                <p className="text-xs text-muted-foreground">With reminder alerts</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Personnel Assigned</CardTitle>
                <UserCheck className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {criticalFunctions.reduce((total, func) => total + func.assignedTo.length, 0)}
                </div>
                <p className="text-xs text-muted-foreground">Total assignments</p>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-between items-center">
            <h2>Critical Functions Registry</h2>
            <Button onClick={() => setShowAddFunction(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Function
            </Button>
          </div>

          <div className="grid gap-4">
            {criticalFunctions.map((func) => (
              <Card key={func.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {func.name}
                        <Badge variant="outline" className="text-xs">
                          <div className={`w-2 h-2 rounded-full ${getPriorityColor(func.priority)} mr-1`}></div>
                          {func.priority}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          <div className={`w-2 h-2 rounded-full ${getStatusColor(func.status)} mr-1`}></div>
                          {func.status}
                        </Badge>
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">{func.category}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setSelectedFunction(func)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium">Primary Role</Label>
                        <p className="text-sm">{func.primaryRole}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Assigned To</Label>
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {func.assignedTo.map((person, index) => (
                            <Badge key={index} variant="default" className="text-xs">
                              <UserCheck className="w-3 h-3 mr-1" />
                              {person}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium">Backup Roles</Label>
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {func.backupRoles.map((role, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">{role}</Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Tagged Personnel</Label>
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {func.taggedPersons.map((person, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              <Users className="w-3 h-3 mr-1" />
                              {person}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {func.dueDate && (
                        <div>
                          <Label className="text-sm font-medium">Due Date</Label>
                          <p className="text-sm">{formatDate(func.dueDate)}</p>
                        </div>
                      )}
                      {func.reviewDate && (
                        <div>
                          <Label className="text-sm font-medium">Review Date</Label>
                          <p className="text-sm">{formatDate(func.reviewDate)}</p>
                        </div>
                      )}
                      <div>
                        <Label className="text-sm font-medium">Reminders</Label>
                        <div className="flex items-center gap-1">
                          {func.reminders.enabled ? (
                            <>
                              <Bell className="w-3 h-3 text-green-500" />
                              <span className="text-xs text-green-600">
                                {func.reminders.daysBefore} days before
                              </span>
                            </>
                          ) : (
                            <span className="text-xs text-muted-foreground">Disabled</span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <Label className="text-sm font-medium">Procedures</Label>
                      <p className="text-sm text-muted-foreground">{func.procedures}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Rolling Action Items Tab */}
        <TabsContent value="actions" className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Actions</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{actionItems.length}</div>
                <p className="text-xs text-muted-foreground">Active items</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">In Progress</CardTitle>
                <TrendingUp className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {actionItems.filter(item => item.status === 'in-progress').length}
                </div>
                <p className="text-xs text-muted-foreground">Currently active</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Overdue</CardTitle>
                <AlertTriangle className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {actionItems.filter(item => item.status === 'overdue').length}
                </div>
                <p className="text-xs text-muted-foreground">Need attention</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completed</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {actionItems.filter(item => item.status === 'completed').length}
                </div>
                <p className="text-xs text-muted-foreground">This month</p>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-between items-center">
            <h2>Rolling Action Items</h2>
            <Button onClick={() => setShowAddActionItem(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Action Item
            </Button>
          </div>

          <div className="grid gap-4">
            {actionItems.map((item) => (
              <Card key={item.id} className={item.status === 'overdue' ? 'border-red-200' : ''}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        {item.title}
                        <Badge variant="outline" className="text-xs">
                          <div className={`w-2 h-2 rounded-full ${getPriorityColor(item.priority)} mr-1`}></div>
                          {item.priority}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          <div className={`w-2 h-2 rounded-full ${getStatusColor(item.status)} mr-1`}></div>
                          {item.status}
                        </Badge>
                        {item.reminders.enabled && (
                          <Badge variant="outline" className="text-xs">
                            <Bell className="w-3 h-3 mr-1" />
                            {item.reminders.frequency}
                          </Badge>
                        )}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setSelectedActionItem(item)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <Label className="text-xs font-medium text-muted-foreground">Assigned To</Label>
                        <p>{item.assignedTo}</p>
                      </div>
                      <div>
                        <Label className="text-xs font-medium text-muted-foreground">Due Date</Label>
                        <p>{formatDate(item.dueDate)}</p>
                      </div>
                      <div>
                        <Label className="text-xs font-medium text-muted-foreground">Estimated Completion</Label>
                        <p>{formatDate(item.estimatedCompletion)}</p>
                      </div>
                      <div>
                        <Label className="text-xs font-medium text-muted-foreground">Category</Label>
                        <p>{item.category}</p>
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <Label className="text-sm font-medium">Progress</Label>
                        <span className="text-sm font-medium">{item.progress}%</span>
                      </div>
                      <Progress value={item.progress} className="h-2" />
                    </div>

                    {item.updates.length > 0 && (
                      <div>
                        <Label className="text-sm font-medium">Latest Update</Label>
                        <div className="mt-2 p-3 bg-muted rounded-lg">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm font-medium">{item.updates[0].author}</span>
                            <span className="text-xs text-muted-foreground">{formatDate(item.updates[0].date)}</span>
                          </div>
                          <p className="text-sm">{item.updates[0].message}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Suggestion Box Tab */}
        <TabsContent value="suggestions" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2>Suggestion Box Inbox</h2>
            <div className="flex gap-2">
              <Select defaultValue="all">
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Managers</SelectItem>
                  <SelectItem value="Chief Pilot">Chief Pilot</SelectItem>
                  <SelectItem value="Maintenance Manager">Maintenance Manager</SelectItem>
                  <SelectItem value="Inflight Manager">Inflight Manager</SelectItem>
                  <SelectItem value="Safety Manager">Safety Manager</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">New Suggestions</CardTitle>
                <MessageSquare className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {suggestionBoxItems.filter(item => item.status === 'new').length}
                </div>
                <p className="text-xs text-muted-foreground">Awaiting review</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Under Review</CardTitle>
                <Clock className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">
                  {suggestionBoxItems.filter(item => item.status === 'under-review').length}
                </div>
                <p className="text-xs text-muted-foreground">In progress</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Implemented</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {suggestionBoxItems.filter(item => item.status === 'implemented').length}
                </div>
                <p className="text-xs text-muted-foreground">This quarter</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">High Priority</CardTitle>
                <Flag className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {suggestionBoxItems.filter(item => item.priority === 'high').length}
                </div>
                <p className="text-xs text-muted-foreground">Need attention</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4">
            {suggestionBoxItems.map((suggestion) => (
              <Card key={suggestion.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        {suggestion.title}
                        <Badge variant="outline" className="text-xs">
                          <div className={`w-2 h-2 rounded-full ${getPriorityColor(suggestion.priority)} mr-1`}></div>
                          {suggestion.priority}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          <div className={`w-2 h-2 rounded-full ${getStatusColor(suggestion.status)} mr-1`}></div>
                          {suggestion.status}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {suggestion.targetRole}
                        </Badge>
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">{suggestion.description}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Mail className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <Label className="text-xs font-medium text-muted-foreground">Submitted By</Label>
                        <p>{suggestion.submittedBy}</p>
                      </div>
                      <div>
                        <Label className="text-xs font-medium text-muted-foreground">Date</Label>
                        <p>{formatDate(suggestion.submittedDate)}</p>
                      </div>
                      <div>
                        <Label className="text-xs font-medium text-muted-foreground">Category</Label>
                        <p>{suggestion.category}</p>
                      </div>
                      {suggestion.assignedTo && (
                        <div>
                          <Label className="text-xs font-medium text-muted-foreground">Assigned To</Label>
                          <p>{suggestion.assignedTo}</p>
                        </div>
                      )}
                    </div>

                    {suggestion.response && (
                      <div>
                        <Label className="text-sm font-medium">Management Response</Label>
                        <div className="mt-2 p-3 bg-muted rounded-lg">
                          <p className="text-sm">{suggestion.response}</p>
                          {suggestion.responseDate && (
                            <p className="text-xs text-muted-foreground mt-2">
                              Response date: {formatDate(suggestion.responseDate)}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {suggestion.status === 'new' && (
                      <div className="flex gap-2">
                        <Button size="sm">Accept for Review</Button>
                        <Button variant="outline" size="sm">Request More Info</Button>
                        <Button variant="destructive" size="sm">Decline</Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Action Item Detail Modal */}
      {selectedActionItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Action Item Details - {selectedActionItem.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label>Description</Label>
                    <p className="text-sm">{selectedActionItem.description}</p>
                  </div>
                  <div>
                    <Label>Assigned To</Label>
                    <p>{selectedActionItem.assignedTo}</p>
                  </div>
                  <div>
                    <Label>Priority</Label>
                    <Badge className={getPriorityColor(selectedActionItem.priority)}>
                      {selectedActionItem.priority}
                    </Badge>
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Badge className={getStatusColor(selectedActionItem.status)}>
                      {selectedActionItem.status}
                    </Badge>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <Label>Due Date</Label>
                    <p>{formatDate(selectedActionItem.dueDate)}</p>
                  </div>
                  <div>
                    <Label>Estimated Completion</Label>
                    <p>{formatDate(selectedActionItem.estimatedCompletion)}</p>
                  </div>
                  <div>
                    <Label>Progress</Label>
                    <div className="space-y-2">
                      <Progress value={selectedActionItem.progress} className="h-3" />
                      <span className="text-sm font-medium">{selectedActionItem.progress}%</span>
                    </div>
                  </div>
                  <div>
                    <Label>Reminders</Label>
                    <div className="flex items-center gap-2">
                      <Switch checked={selectedActionItem.reminders.enabled} />
                      <span className="text-sm">
                        {selectedActionItem.reminders.enabled ? selectedActionItem.reminders.frequency : 'Disabled'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <Label>Updates History</Label>
                <div className="space-y-3 mt-2">
                  {selectedActionItem.updates.length > 0 ? (
                    selectedActionItem.updates.map((update) => (
                      <div key={update.id} className="p-4 border rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-medium">{update.author}</span>
                          <span className="text-sm text-muted-foreground">{formatDate(update.date)}</span>
                        </div>
                        <p className="text-sm">{update.message}</p>
                        {update.progressChange && (
                          <p className="text-sm text-green-600 mt-1">
                            Progress increased by {update.progressChange}%
                          </p>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No updates yet</p>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setSelectedActionItem(null)}>Close</Button>
                <Button>Update Progress</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Critical Function Detail/Edit Modal */}
      {selectedFunction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Edit Critical Function - {selectedFunction.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label>Function Name</Label>
                    <Input defaultValue={selectedFunction.name} />
                  </div>
                  <div>
                    <Label>Category</Label>
                    <Select defaultValue={selectedFunction.category}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Operations">Operations</SelectItem>
                        <SelectItem value="Maintenance">Maintenance</SelectItem>
                        <SelectItem value="Safety">Safety</SelectItem>
                        <SelectItem value="Administration">Administration</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Priority</Label>
                    <Select defaultValue={selectedFunction.priority}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="critical">Critical</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Select defaultValue={selectedFunction.status}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="backup">Backup</SelectItem>
                        <SelectItem value="unavailable">Unavailable</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <Label>Due Date</Label>
                    <Input 
                      type="date" 
                      defaultValue={selectedFunction.dueDate} 
                    />
                  </div>
                  <div>
                    <Label>Review Date</Label>
                    <Input 
                      type="date" 
                      defaultValue={selectedFunction.reviewDate} 
                    />
                  </div>
                  <div>
                    <Label>Primary Role</Label>
                    <Select defaultValue={selectedFunction.primaryRole}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {availablePersonnel.map((person) => (
                          <SelectItem key={person} value={person}>{person}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label>Assigned Personnel</Label>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {selectedFunction.assignedTo.map((person, index) => (
                      <Badge key={index} variant="default" className="text-xs">
                        <UserCheck className="w-3 h-3 mr-1" />
                        {person}
                        <X className="w-3 h-3 ml-1 cursor-pointer" />
                      </Badge>
                    ))}
                    <Button variant="outline" size="sm">
                      <Plus className="w-3 h-3 mr-1" />
                      Add Person
                    </Button>
                  </div>
                </div>

                <div>
                  <Label>Tagged Personnel</Label>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {selectedFunction.taggedPersons.map((person, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        <Users className="w-3 h-3 mr-1" />
                        {person}
                        <X className="w-3 h-3 ml-1 cursor-pointer" />
                      </Badge>
                    ))}
                    <Button variant="outline" size="sm">
                      <Plus className="w-3 h-3 mr-1" />
                      Tag Person
                    </Button>
                  </div>
                </div>

                <div>
                  <Label>Backup Roles</Label>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {selectedFunction.backupRoles.map((role, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {role}
                        <X className="w-3 h-3 ml-1 cursor-pointer" />
                      </Badge>
                    ))}
                    <Button variant="outline" size="sm">
                      <Plus className="w-3 h-3 mr-1" />
                      Add Role
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label>Procedures</Label>
                  <Textarea 
                    defaultValue={selectedFunction.procedures}
                    rows={3}
                  />
                </div>
              </div>

              {/* Reminder Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="w-5 h-5" />
                    Reminder Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id="reminders-enabled" 
                      defaultChecked={selectedFunction.reminders.enabled}
                    />
                    <Label htmlFor="reminders-enabled">Enable Reminders</Label>
                  </div>
                  
                  {selectedFunction.reminders.enabled && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Days Before Due Date</Label>
                        <Input 
                          type="number" 
                          defaultValue={selectedFunction.reminders.daysBefore}
                          min="1"
                          max="365"
                        />
                      </div>
                      <div>
                        <Label>Reminder Frequency</Label>
                        <Select defaultValue={selectedFunction.reminders.frequency}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="once">Once</SelectItem>
                            <SelectItem value="daily">Daily</SelectItem>
                            <SelectItem value="weekly">Weekly</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  {selectedFunction.reminders.lastSent && (
                    <Alert>
                      <Bell className="h-4 w-4" />
                      <AlertDescription>
                        Last reminder sent: {formatDate(selectedFunction.reminders.lastSent)}
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>

              <div className="flex justify-between">
                <div className="text-sm text-muted-foreground">
                  <p>Created: {formatDate(selectedFunction.createdDate)}</p>
                  <p>Last Updated: {formatDate(selectedFunction.lastUpdated)}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setSelectedFunction(null)}>Cancel</Button>
                  <Button>Save Changes</Button>
                  <Button variant="outline">
                    <Bell className="w-4 h-4 mr-2" />
                    Send Reminder Now
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}