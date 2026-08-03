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
import { ActionItem, NewItemForm } from './ActionItems/types';
import { CHECK_IN_CADENCE_OPTIONS } from './ActionItems/constants';
import { getCheckInCompliance } from './ActionItems/checkIn';
import {
  getDaysSinceLastReport,
  getProgressTrend,
  getStallState,
  getStallSummary,
  isTrendFlat,
  bySilenceDesc,
} from './ActionItems/stall';
import NewItemDialog from './ActionItems/NewItemDialog';
import { useActionItems } from '../contexts/ActionItemContext';
import { toast } from 'sonner';

const EMPTY_NEW_ITEM_FORM: NewItemForm = {
  title: '',
  description: '',
  module: 'Flight Operations',
  priority: 'Medium',
  dueDate: '',
  sections: [''],
  checkInCadence: 'weekly',
};

/** The shared store uses title-case labels; the local colour helpers key off slugs. */
const toSlug = (value: string) => value.toLowerCase().replace(/\s+/g, '-');

/**
 * How long a project has been silent, drawn to the same scale across the board
 * so two bars can be compared by eye. Length is the message; the number beside
 * it is the confirmation.
 */
function SilenceBar({ days, max }: { days: number; max: number }) {
  const pct = max <= 0 ? 0 : Math.min(100, Math.round((days / max) * 100));
  return (
    <div className="h-3 w-full rounded bg-muted overflow-hidden" role="presentation">
      <div className="h-full bg-red-500/70" style={{ width: `${pct}%` }} />
    </div>
  );
}

/**
 * Reported progress over successive check-ins. A flat line at 75% reads as
 * stuck, which a 75%-full progress bar never does — that is the entire reason
 * this replaced the progress bar on the board.
 */
function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return <div className="w-14" />;

  const width = 56;
  const height = 18;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const flat = max === min;

  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * width;
      const y = height - 2 - ((value - min) / span) * (height - 4);
      return `${x.toFixed(1)},${flat ? height / 2 : y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg width={width} height={height} className="shrink-0" aria-hidden="true">
      <polyline
        points={points}
        fill="none"
        strokeWidth="1.5"
        className={flat ? 'stroke-muted-foreground' : 'stroke-green-500'}
      />
    </svg>
  );
}

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
  const [selectedActionItemId, setSelectedActionItemId] = useState<string | null>(null);
  const [selectedFunction, setSelectedFunction] = useState<CriticalFunction | null>(null);

  // Rolling Action Items read the same store as Tasks & Action Items — one list of
  // projects, two views. Raising an item in either surface puts it on both.
  const { actionItems, addActionItem, setCheckInCadence, nudge } = useActionItems();
  const [newItemForm, setNewItemForm] = useState<NewItemForm>(EMPTY_NEW_ITEM_FORM);
  const [isCreatingActionItem, setIsCreatingActionItem] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  const selectedActionItem = actionItems.find(item => item.id === selectedActionItemId) ?? null;

  // The board is ranked by silence, not by creation order or percent complete:
  // a project stuck at 75% for a month is the one that needs a lead, and a
  // three-quarters-full progress bar is the last thing that would say so.
  const stallSummary = getStallSummary(actionItems, today);
  const ranked = [...actionItems].sort(bySilenceDesc(today));
  const zones = {
    quiet: ranked.filter(item => getStallState(item, today) === 'quiet'),
    moving: ranked.filter(item => getStallState(item, today) === 'moving'),
    fresh: ranked.filter(item => getStallState(item, today) === 'new'),
    landed: ranked.filter(item => getStallState(item, today) === 'landed'),
  };
  // One scale for every bar, so their lengths are comparable at a glance.
  const silenceScale = Math.max(1, stallSummary.longestSilence);

  const handleNudge = (item: ActionItem) => {
    nudge(item.id);
    toast.success('Nudge Sent', {
      description: `${item.contributors.map(c => c.name).join(', ') || 'The owner'} will see a status request on their task list.`,
    });
  };

  const handleCreateActionItem = () => {
    if (!newItemForm.title.trim() || !newItemForm.description.trim()) return;
    setIsCreatingActionItem(true);
    addActionItem(newItemForm, 'Lead Team');
    setIsCreatingActionItem(false);
    setShowAddActionItem(false);
    setNewItemForm(EMPTY_NEW_ITEM_FORM);
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
          {/* The stall radar: is the reporting habit landing, and what has gone dark. */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Went Quiet</CardTitle>
                <AlertTriangle className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{stallSummary.quietCount}</div>
                <p className="text-xs text-muted-foreground">Missed a whole check-in cycle</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Longest Silence</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stallSummary.longestSilence > 0 ? `${stallSummary.longestSilence}d` : '—'}
                </div>
                <p className="text-xs text-muted-foreground">Since anyone last reported</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Reporting Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stallSummary.rate}%</div>
                <p className="text-xs text-muted-foreground">
                  {stallSummary.reported} of {stallSummary.owed} filed this cycle
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-between items-center">
            <div>
              <h2>Rolling Action Items</h2>
              <p className="text-sm text-muted-foreground">
                Ranked by silence, not by percent complete. Every item here is the same record its
                owner sees on their Tasks &amp; Action Items list.
              </p>
            </div>
            <Button onClick={() => setShowAddActionItem(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Action Item
            </Button>
          </div>

          {actionItems.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Target className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="font-medium mb-2">No Projects Tracked</h3>
                <p className="text-muted-foreground">
                  Add an action item to start tracking a project and collecting status updates.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-8">
              {/* Needs you — the reason the board exists. */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  <h3 className="font-medium text-red-600">Needs You</h3>
                  <span className="text-sm text-muted-foreground">
                    {zones.quiet.length === 0
                      ? 'Nothing has gone quiet'
                      : `${zones.quiet.length} ${zones.quiet.length === 1 ? 'project has' : 'projects have'} gone quiet`}
                  </span>
                </div>

                {zones.quiet.length === 0 ? (
                  <Card>
                    <CardContent className="p-6 flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <p className="text-sm text-muted-foreground">
                        Every tracked project has reported inside its cycle.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {zones.quiet.map(item => {
                      const silence = getDaysSinceLastReport(item, today) ?? 0;
                      const nudged = item.checkIn?.lastNudgedOn;
                      return (
                        <Card key={item.id} className="border-red-200">
                          <CardContent className="p-4 space-y-3">
                            <div className="flex items-start justify-between gap-4">
                              <div className="min-w-0">
                                <button
                                  className="font-medium text-left hover:underline"
                                  onClick={() => setSelectedActionItemId(item.id)}
                                >
                                  {item.title}
                                </button>
                                <p className="text-sm text-muted-foreground">
                                  {item.contributors.map(c => c.name).join(', ') || 'Nobody assigned'}
                                  {' · '}
                                  {isTrendFlat(item) ? 'stuck at' : 'last reported'} {item.progress}%
                                </p>
                              </div>
                              <Badge variant="outline" className="text-xs shrink-0">
                                {item.priority}
                              </Badge>
                            </div>

                            <div className="flex items-center gap-3">
                              <div className="flex-1">
                                <SilenceBar days={silence} max={silenceScale} />
                              </div>
                              <span className="text-sm text-red-600 whitespace-nowrap">
                                silent {silence}d
                              </span>
                              {nudged ? (
                                <Badge variant="outline" className="text-xs whitespace-nowrap">
                                  <Bell className="w-3 h-3 mr-1" />
                                  Nudged {formatDate(nudged)}
                                </Badge>
                              ) : (
                                <Button size="sm" variant="outline" onClick={() => handleNudge(item)}>
                                  <Bell className="w-4 h-4 mr-2" />
                                  Nudge
                                </Button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Moving — compact, because it needs no decision. */}
              {zones.moving.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="w-4 h-4 text-green-500" />
                    <h3 className="font-medium text-green-600">Moving</h3>
                  </div>
                  <Card>
                    <CardContent className="p-0 divide-y">
                      {zones.moving.map(item => {
                        const silence = getDaysSinceLastReport(item, today);
                        const trend = getProgressTrend(item);
                        return (
                          <div key={item.id} className="flex items-center gap-4 px-4 py-3">
                            <button
                              className="flex-1 min-w-0 text-left text-sm hover:underline truncate"
                              onClick={() => setSelectedActionItemId(item.id)}
                            >
                              {item.title}
                            </button>
                            <Sparkline values={trend} />
                            <span className="text-sm text-muted-foreground w-24 text-right whitespace-nowrap">
                              {trend.length > 1 && trend[0] !== trend[trend.length - 1]
                                ? `${trend[0]} → ${item.progress}%`
                                : `${item.progress}%`}
                            </span>
                            <span className="text-sm text-muted-foreground w-24 text-right whitespace-nowrap">
                              {silence === null ? '—' : silence === 0 ? 'today' : `silent ${silence}d`}
                            </span>
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* New — tracked, but not yet due for a first report. */}
              {zones.fresh.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Plus className="w-4 h-4 text-muted-foreground" />
                    <h3 className="font-medium text-muted-foreground">Just Started</h3>
                  </div>
                  <Card>
                    <CardContent className="p-0 divide-y">
                      {zones.fresh.map(item => (
                        <div key={item.id} className="flex items-center gap-4 px-4 py-3">
                          <button
                            className="flex-1 min-w-0 text-left text-sm hover:underline truncate"
                            onClick={() => setSelectedActionItemId(item.id)}
                          >
                            {item.title}
                          </button>
                          <span className="text-sm text-muted-foreground whitespace-nowrap">
                            {item.checkIn && item.checkIn.cadence !== 'none'
                              ? `first ${item.checkIn.cadence} check-in pending`
                              : 'no check-ins scheduled'}
                          </span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              )}

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle className="w-4 h-4" />
                Landed · {zones.landed.length} complete
              </div>
            </div>
          )}
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
                    <Label>Responsible</Label>
                    <p>{selectedActionItem.assignedBy}</p>
                  </div>
                  <div>
                    <Label>Working On It</Label>
                    <div className="space-y-1">
                      {selectedActionItem.contributors.length > 0 ? (
                        selectedActionItem.contributors.map((contributor) => (
                          <p key={contributor.id} className="text-sm">
                            {contributor.name} <span className="text-muted-foreground">— {contributor.role}</span>
                          </p>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">Nobody assigned yet</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label>Priority</Label>
                    <Badge className={getPriorityColor(toSlug(selectedActionItem.priority))}>
                      {selectedActionItem.priority}
                    </Badge>
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Badge className={getStatusColor(toSlug(selectedActionItem.status))}>
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
                    <Label>Module</Label>
                    <p>{selectedActionItem.module}</p>
                  </div>
                  <div>
                    <Label>Progress</Label>
                    <div className="space-y-2">
                      <Progress value={selectedActionItem.progress} className="h-3" />
                      <span className="text-sm font-medium">{selectedActionItem.progress}%</span>
                    </div>
                  </div>
                  {/* The automatic-collection control: set the rhythm once and every
                      contributor is asked on schedule from their own task list. */}
                  <div>
                    <Label htmlFor="rolling-cadence">Status Check-In Cadence</Label>
                    <Select
                      value={selectedActionItem.checkIn?.cadence ?? 'none'}
                      onValueChange={(value: string) => setCheckInCadence(selectedActionItem.id, value as NewItemForm['checkInCadence'])}
                    >
                      <SelectTrigger id="rolling-cadence">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CHECK_IN_CADENCE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {(() => {
                      const compliance = getCheckInCompliance(selectedActionItem, today);
                      return compliance ? (
                        <p className="text-xs text-muted-foreground mt-2">
                          Cycle due {formatDate(compliance.dueOn)} — {compliance.reported} of {compliance.total} reported.
                        </p>
                      ) : null;
                    })()}
                  </div>
                </div>
              </div>

              <div>
                <Label>Check-In History</Label>
                <div className="space-y-3 mt-2">
                  {selectedActionItem.checkIn && selectedActionItem.checkIn.reports.length > 0 ? (
                    [...selectedActionItem.checkIn.reports]
                      .sort((a, b) => b.reportedOn.localeCompare(a.reportedOn))
                      .map((report) => {
                        const contributor = selectedActionItem.contributors.find(c => c.id === report.contributorId);
                        return (
                          <div key={`${report.contributorId}-${report.dueOn}`} className="p-4 border rounded-lg">
                            <div className="flex justify-between items-center mb-2">
                              <span className="font-medium">{contributor?.name ?? report.contributorId}</span>
                              <span className="text-sm text-muted-foreground">{formatDate(report.reportedOn)}</span>
                            </div>
                            <p className="text-sm">{report.note}</p>
                            <p className="text-sm text-green-600 mt-1">Reported progress: {report.progress}%</p>
                          </div>
                        );
                      })
                  ) : (
                    <p className="text-sm text-muted-foreground">No status updates filed yet</p>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setSelectedActionItemId(null)}>Close</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Create a project on the Rolling list — the same dialog Tasks & Action Items uses. */}
      <NewItemDialog
        isOpen={showAddActionItem}
        onClose={() => {
          setShowAddActionItem(false);
          setNewItemForm(EMPTY_NEW_ITEM_FORM);
        }}
        newItemForm={newItemForm}
        setNewItemForm={setNewItemForm}
        onSubmit={handleCreateActionItem}
        isSubmitting={isCreatingActionItem}
      />

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