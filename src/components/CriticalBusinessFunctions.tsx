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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { toast } from 'sonner';
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

interface NewFunctionForm {
  name: string;
  category: string;
  priority: CriticalFunction['priority'];
  primaryRole: string;
  procedures: string;
}

const EMPTY_FUNCTION_FORM: NewFunctionForm = {
  name: '', category: 'Operations', priority: 'high', primaryRole: '', procedures: '',
};

const CATEGORIES = ['Operations', 'Maintenance', 'Safety', 'Administration'];
const PRIORITIES: CriticalFunction['priority'][] = ['critical', 'high', 'medium', 'low'];
const BACKUP_ROLE_POOL = [
  'Assistant Chief Pilot', 'Senior Captain', 'Senior Dispatcher', 'Operations Manager',
  'Lead Technician', 'Avionics Specialist', 'Safety Officer', 'Chief Inspector',
];

const todayIso = () => new Date().toISOString().split('T')[0];

/** Add-one-from-a-list, used by the three "add" affordances in the editor. */
function AddFromList({ label, options, onPick }: { label: string; options: string[]; onPick: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  if (!options.length) return null;

  return open ? (
    <Select onValueChange={(value: string) => { onPick(value); setOpen(false); }}>
      <SelectTrigger className="w-56 h-8"><SelectValue placeholder={label} /></SelectTrigger>
      <SelectContent>
        {options.map(option => <SelectItem key={option} value={option}>{option}</SelectItem>)}
      </SelectContent>
    </Select>
  ) : (
    <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
      <Plus className="w-3 h-3 mr-1" />
      {label}
    </Button>
  );
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
  /** The function being edited, as an editable COPY — Cancel must discard. */
  const [draft, setDraft] = useState<CriticalFunction | null>(null);
  const [newFunction, setNewFunction] = useState<NewFunctionForm>(EMPTY_FUNCTION_FORM);

  const saveDraft = (edited: CriticalFunction) => {
    setCriticalFunctions(prev =>
      prev.map(func => (func.id === edited.id ? { ...edited, lastUpdated: todayIso() } : func)),
    );
    setDraft(null);
    toast.success('Saved', { description: `"${edited.name}" updated.` });
  };

  const sendReminder = (func: CriticalFunction) => {
    const sentOn = todayIso();
    const withStamp = { ...func, reminders: { ...func.reminders, lastSent: sentOn } };
    setCriticalFunctions(prev => prev.map(f => (f.id === func.id ? { ...f, reminders: withStamp.reminders } : f)));
    setDraft(current => (current && current.id === func.id ? withStamp : current));
    toast.success('Reminder sent', {
      description: `${func.assignedTo.join(', ') || func.primaryRole} reminded about "${func.name}".`,
    });
  };

  const addFunction = () => {
    if (!newFunction.name.trim() || !newFunction.primaryRole) return;
    const created: CriticalFunction = {
      id: `CF-${Date.now()}`,
      name: newFunction.name.trim(),
      category: newFunction.category,
      priority: newFunction.priority,
      primaryRole: newFunction.primaryRole,
      backupRoles: [],
      procedures: newFunction.procedures.trim(),
      // A function with no backup is exactly the gap this register exists to
      // surface, so it starts there rather than being quietly marked active.
      status: 'unavailable',
      assignedTo: [],
      taggedPersons: [],
      reminders: { enabled: false, daysBefore: 7, frequency: 'once' },
      createdDate: todayIso(),
      lastUpdated: todayIso(),
    };
    setCriticalFunctions(prev => [created, ...prev]);
    setShowAddFunction(false);
    setNewFunction(EMPTY_FUNCTION_FORM);
    toast.success('Function added', {
      description: `"${created.name}" has no backup yet — open it to assign one.`,
    });
  };

  // Mock list of available personnel for assignment/tagging
  const availablePersonnel = [
    'John Smith', 'Sarah Davis', 'Mike Johnson', 'Lisa Wilson', 'Robert Brown',
    'Jennifer White', 'David Clark', 'Michael Peterson', 'Lisa Chen', 'Tom Anderson',
    'Captain Rodriguez', 'Chief Pilot', 'Assistant Chief Pilot', 'Senior Captain',
    'Dispatcher', 'Senior Dispatcher', 'Operations Manager', 'Maintenance Manager',
    'Lead Technician', 'Avionics Specialist', 'Safety Officer Davis'
  ];

  // Mock data for Critical Functions
  const [criticalFunctions, setCriticalFunctions] = useState<CriticalFunction[]>([
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
  ]);

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
                        onClick={() => setDraft({ ...func })}
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
      <Dialog open={showAddFunction} onOpenChange={open => { if (!open) { setShowAddFunction(false); setNewFunction(EMPTY_FUNCTION_FORM); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add a critical function</DialogTitle>
            <DialogDescription>
              Something the department cannot operate without. Name who owns it; backups come after.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="function-name" className="text-sm font-medium mb-2 block">
                Function name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="function-name"
                placeholder="Aircraft dispatch"
                value={newFunction.name}
                onChange={e => setNewFunction({ ...newFunction, name: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium mb-2 block">Category</Label>
                <Select value={newFunction.category} onValueChange={(value: string) => setNewFunction({ ...newFunction, category: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(category => <SelectItem key={category} value={category}>{category}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium mb-2 block">Priority</Label>
                <Select value={newFunction.priority} onValueChange={(value: string) => setNewFunction({ ...newFunction, priority: value as CriticalFunction['priority'] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map(priority => <SelectItem key={priority} value={priority}>{priority}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">
                Primary role <span className="text-red-500">*</span>
              </Label>
              <Select value={newFunction.primaryRole} onValueChange={(value: string) => setNewFunction({ ...newFunction, primaryRole: value })}>
                <SelectTrigger><SelectValue placeholder="Who owns this function?" /></SelectTrigger>
                <SelectContent>
                  {availablePersonnel.map(person => <SelectItem key={person} value={person}>{person}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="function-procedures" className="text-sm font-medium mb-2 block">Procedures</Label>
              <Textarea
                id="function-procedures"
                rows={3}
                placeholder="What this function covers, and what the holder is expected to do."
                value={newFunction.procedures}
                onChange={e => setNewFunction({ ...newFunction, procedures: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setShowAddFunction(false); setNewFunction(EMPTY_FUNCTION_FORM); }}>
              Cancel
            </Button>
            <Button disabled={!newFunction.name.trim() || !newFunction.primaryRole} onClick={addFunction}>
              <Plus className="w-4 h-4 mr-2" />
              Add function
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {draft && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Edit Critical Function - {draft.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label>Function Name</Label>
                    <Input value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} />
                  </div>
                  <div>
                    <Label>Category</Label>
                    <Select value={draft.category} onValueChange={(value: string) => setDraft({ ...draft, category: value })}>
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
                    <Select value={draft.priority} onValueChange={(value: string) => setDraft({ ...draft, priority: value as CriticalFunction['priority'] })}>
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
                    <Select value={draft.status} onValueChange={(value: string) => setDraft({ ...draft, status: value as CriticalFunction['status'] })}>
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
                    <Input type="date" value={draft.dueDate ?? ''} onChange={e => setDraft({ ...draft, dueDate: e.target.value })} />
                  </div>
                  <div>
                    <Label>Review Date</Label>
                    <Input type="date" value={draft.reviewDate ?? ''} onChange={e => setDraft({ ...draft, reviewDate: e.target.value })} />
                  </div>
                  <div>
                    <Label>Primary Role</Label>
                    <Select value={draft.primaryRole} onValueChange={(value: string) => setDraft({ ...draft, primaryRole: value })}>
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
                    {draft.assignedTo.map((person) => (
                      <Badge key={person} variant="default" className="text-xs">
                        <UserCheck className="w-3 h-3 mr-1" />
                        {person}
                        <button
                          aria-label={`Remove ${person}`}
                          onClick={() => setDraft({ ...draft, assignedTo: draft.assignedTo.filter(p => p !== person) })}
                        >
                          <X className="w-3 h-3 ml-1 cursor-pointer" />
                        </button>
                      </Badge>
                    ))}
                    <AddFromList
                      label="Add Person"
                      options={availablePersonnel.filter(p => !draft.assignedTo.includes(p))}
                      onPick={person => setDraft({ ...draft, assignedTo: [...draft.assignedTo, person] })}
                    />
                  </div>
                </div>

                <div>
                  <Label>Tagged Personnel</Label>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {draft.taggedPersons.map((person) => (
                      <Badge key={person} variant="outline" className="text-xs">
                        <Users className="w-3 h-3 mr-1" />
                        {person}
                        <button
                          aria-label={`Untag ${person}`}
                          onClick={() => setDraft({ ...draft, taggedPersons: draft.taggedPersons.filter(p => p !== person) })}
                        >
                          <X className="w-3 h-3 ml-1 cursor-pointer" />
                        </button>
                      </Badge>
                    ))}
                    <AddFromList
                      label="Tag Person"
                      options={availablePersonnel.filter(p => !draft.taggedPersons.includes(p))}
                      onPick={person => setDraft({ ...draft, taggedPersons: [...draft.taggedPersons, person] })}
                    />
                  </div>
                </div>

                <div>
                  <Label>Backup Roles</Label>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {draft.backupRoles.map((role) => (
                      <Badge key={role} variant="secondary" className="text-xs">
                        {role}
                        <button
                          aria-label={`Remove ${role}`}
                          onClick={() => setDraft({ ...draft, backupRoles: draft.backupRoles.filter(r => r !== role) })}
                        >
                          <X className="w-3 h-3 ml-1 cursor-pointer" />
                        </button>
                      </Badge>
                    ))}
                    <AddFromList
                      label="Add Role"
                      options={BACKUP_ROLE_POOL.filter(r => !draft.backupRoles.includes(r))}
                      onPick={role => setDraft({ ...draft, backupRoles: [...draft.backupRoles, role] })}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label>Procedures</Label>
                  <Textarea value={draft.procedures} onChange={e => setDraft({ ...draft, procedures: e.target.value })} rows={3} />
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
                    <Switch id="reminders-enabled" checked={draft.reminders.enabled} onCheckedChange={(on: boolean) => setDraft({ ...draft, reminders: { ...draft.reminders, enabled: on } })} />
                    <Label htmlFor="reminders-enabled">Enable Reminders</Label>
                  </div>
                  
                  {draft.reminders.enabled && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Days Before Due Date</Label>
                        <Input type="number" min="1" max="365" value={draft.reminders.daysBefore} onChange={e => setDraft({ ...draft, reminders: { ...draft.reminders, daysBefore: Number(e.target.value) || 1 } })} />
                      </div>
                      <div>
                        <Label>Reminder Frequency</Label>
                        <Select value={draft.reminders.frequency} onValueChange={(value: string) => setDraft({ ...draft, reminders: { ...draft.reminders, frequency: value as CriticalFunction['reminders']['frequency'] } })}>
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

                  {draft.reminders.lastSent && (
                    <Alert>
                      <Bell className="h-4 w-4" />
                      <AlertDescription>
                        Last reminder sent: {formatDate(draft.reminders.lastSent)}
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>

              <div className="flex justify-between">
                <div className="text-sm text-muted-foreground">
                  <p>Created: {formatDate(draft.createdDate)}</p>
                  <p>Last Updated: {formatDate(draft.lastUpdated)}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setDraft(null)}>Cancel</Button>
                  <Button onClick={() => saveDraft(draft)}>Save Changes</Button>
                  <Button
                    variant="outline"
                    disabled={!draft.reminders.enabled}
                    title={draft.reminders.enabled ? undefined : 'Reminders are switched off for this function'}
                    onClick={() => sendReminder(draft)}
                  >
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
