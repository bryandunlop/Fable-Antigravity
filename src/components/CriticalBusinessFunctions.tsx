import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
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
  Bell,
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

/**
 * Critical Business Functions — who owns each function the department cannot
 * operate without, and who backs them up.
 *
 * Split out of the old three-tab CriticalFunctionsPlan page: the lead team's
 * Rolling Action Items grew into a surface that has to hold 20+ projects, and
 * sharing a route with two unrelated registries capped it at a third of a
 * screen. Each of the three is now its own space.
 */
export default function CriticalBusinessFunctions() {
  const [showAddFunction, setShowAddFunction] = useState(false);
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
          Critical Business Functions
        </h1>
        <p className="text-muted-foreground">Who owns each critical function, and who backs them up</p>
      </div>

      <div className="space-y-6">
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
      </div>

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
