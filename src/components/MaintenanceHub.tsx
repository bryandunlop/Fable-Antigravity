import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ScrollArea } from './ui/scroll-area';
import {
  AlertTriangle,
  AlertCircle,
  Clock,
  CheckCircle,
  Wrench,
  Plane,
  FileText,
  TrendingUp,
  TrendingDown,
  Calendar,
  Activity,
  Plus,
  ArrowRight,
  Bell,
  Target,
  Users,
  Settings,
  BarChart3,
  ClipboardList,
  Shield
} from 'lucide-react';
import { useMaintenanceContext } from './contexts/MaintenanceContext';
import {
  getPriorityConfig,
  getStatusConfig,
  formatRelativeTime,
  getDeferralAlertStatus,
  formatHours
} from './utils/maintenanceUtils';
import LifecycleProgress from './LifecycleProgress';
import ProactiveAlerts from './ProactiveAlerts';
import ResourceManagement from './ResourceManagement';

export default function MaintenanceHub() {
  const {
    squawks,
    workOrders,
    mttrData,
    aircraftAvailability,
    calculateMTTR,
    updateAircraftAvailability,
  } = useMaintenanceContext();
  const navigate = useNavigate();

  const [selectedView, setSelectedView] = useState<'overview' | 'by-aircraft' | 'alerts'>('overview');

  // Calculate real-time statistics
  useEffect(() => {
    calculateMTTR();
    updateAircraftAvailability();
  }, [squawks, workOrders]);

  // Critical metrics
  const openSquawks = squawks.filter(s => s.status === 'open').length;
  const criticalSquawks = squawks.filter(s => s.priority === 'critical' && s.status !== 'closed').length;
  const activeWorkOrders = workOrders.filter(wo => wo.status === 'in-progress' || wo.status === 'assigned').length;
  const overdueWorkOrders = workOrders.filter(wo => {
    if (wo.status === 'completed' || wo.status === 'cancelled') return false;
    return new Date(wo.dueDate) < new Date();
  }).length;

  // Deferral alerts
  const activeDeferrals = squawks.filter(s => s.status === 'deferred' && s.deferral);
  const expiringDeferrals = activeDeferrals.filter(s => {
    if (!s.deferral) return false;
    const expiryDate = new Date(s.deferral.expiryDate);
    const daysRemaining = Math.ceil((expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return daysRemaining <= 5 && daysRemaining >= 0;
  });
  const expiredDeferrals = activeDeferrals.filter(s => {
    if (!s.deferral) return false;
    return new Date(s.deferral.expiryDate) < new Date();
  });

  // Pattern alerts
  const patternsDetected = squawks.filter(s => s.patternDetected).length;

  // Aircraft status
  const groundedAircraft = aircraftAvailability.filter(a => a.status === 'grounded').length;
  const limitedAircraft = aircraftAvailability.filter(a => a.status === 'limited').length;

  // Recent activity (last 10 items)
  // Recent activity (last 10 items)
  const recentActivity = [
    ...squawks.map(s => ({ type: 'squawk', data: s, timestamp: new Date(s.reportedAt) })),
    ...workOrders.map(wo => ({ type: 'workorder', data: wo, timestamp: new Date(wo.createdAt) })),
  ]
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, 10);

  // Get items by lifecycle stage for workflow visualization
  const workflowPipeline = {
    reported: squawks.filter(s => s.lifecycleStage.current === 'reported').length,
    woCreated: squawks.filter(s => s.lifecycleStage.current === 'wo-created').length,
    assigned: workOrders.filter(wo => wo.status === 'assigned').length,
    inProgress: workOrders.filter(wo => wo.status === 'in-progress').length,
    inspection: squawks.filter(s => s.lifecycleStage.current === 'inspection-required' || s.lifecycleStage.current === 'inspection-completed').length,
    completed: [...squawks.filter(s => s.status === 'closed'), ...workOrders.filter(wo => wo.status === 'completed')].length,
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1>Maintenance Hub</h1>
          <p className="text-muted-foreground">Unified maintenance operations overview</p>
        </div>
        <div className="flex items-center gap-2 mt-4 lg:mt-0">
          <Button asChild>
            <Link to="/tech-log">
              <Plus className="w-4 h-4 mr-2" />
              Report Squawk
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/work-orders">
              <ClipboardList className="w-4 h-4 mr-2" />
              View All Work Orders
            </Link>
          </Button>
        </div>
      </div>

      {/* Proactive Alerts */}
      <ProactiveAlerts />



      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => window.location.href = '/tech-log'}>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Open Squawks</p>
                <p className="text-3xl font-bold">{openSquawks}</p>
                {criticalSquawks > 0 && (
                  <Badge className="bg-red-100 text-red-800 border-red-200">
                    {criticalSquawks} Critical
                  </Badge>
                )}
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => window.location.href = '/work-orders'}>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Active Work Orders</p>
                <p className="text-3xl font-bold">{activeWorkOrders}</p>
                {overdueWorkOrders > 0 && (
                  <Badge className="bg-red-100 text-red-800 border-red-200">
                    {overdueWorkOrders} Overdue
                  </Badge>
                )}
              </div>
              <div className="p-3 bg-violet-100 rounded-lg">
                <Wrench className="w-6 h-6 text-violet-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => window.location.href = '/mel-cdl'}>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Active Deferrals</p>
                <p className="text-3xl font-bold">{activeDeferrals.length}</p>
                {(expiredDeferrals.length + expiringDeferrals.length) > 0 && (
                  <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
                    {expiredDeferrals.length + expiringDeferrals.length} Need Action
                  </Badge>
                )}
              </div>
              <div className="p-3 bg-amber-100 rounded-lg">
                <Shield className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => window.location.href = '/mttr-dashboard'}>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Avg MTTR</p>
                <p className="text-3xl font-bold">{formatHours(mttrData.overall || 0)}</p>
                <div className="flex items-center gap-1 text-green-600 text-sm">
                  <TrendingDown className="w-4 h-4" />
                  <span>15% improvement</span>
                </div>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <BarChart3 className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="workflow" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="workflow">Workflow Pipeline</TabsTrigger>
          <TabsTrigger value="resources">Resources (New)</TabsTrigger>
          <TabsTrigger value="aircraft">By Aircraft</TabsTrigger>
          <TabsTrigger value="activity">Recent Activity</TabsTrigger>
          <TabsTrigger value="quick-actions">Quick Actions</TabsTrigger>
        </TabsList>

        <TabsContent value="workflow" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Maintenance Workflow Pipeline
              </CardTitle>
              <p className="text-sm text-muted-foreground">Visual overview of items in each lifecycle stage</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-6 gap-4">
                <Card className="bg-blue-50 border-blue-200 cursor-pointer hover:shadow-md transition-shadow" onClick={() => window.location.href = '/tech-log'}>
                  <CardContent className="p-4 text-center">
                    <div className="text-3xl font-bold text-blue-600 mb-2">{workflowPipeline.reported}</div>
                    <div className="text-sm font-medium text-blue-700">Reported</div>
                    <p className="text-xs text-muted-foreground mt-1">New squawks</p>
                  </CardContent>
                </Card>

                <Card className="bg-indigo-50 border-indigo-200 cursor-pointer hover:shadow-md transition-shadow" onClick={() => window.location.href = '/work-orders'}>
                  <CardContent className="p-4 text-center">
                    <div className="text-3xl font-bold text-indigo-600 mb-2">{workflowPipeline.woCreated}</div>
                    <div className="text-sm font-medium text-indigo-700">WO Created</div>
                    <p className="text-xs text-muted-foreground mt-1">Awaiting assignment</p>
                  </CardContent>
                </Card>

                <Card className="bg-violet-50 border-violet-200 cursor-pointer hover:shadow-md transition-shadow" onClick={() => window.location.href = '/work-orders'}>
                  <CardContent className="p-4 text-center">
                    <div className="text-3xl font-bold text-violet-600 mb-2">{workflowPipeline.assigned}</div>
                    <div className="text-sm font-medium text-violet-700">Assigned</div>
                    <p className="text-xs text-muted-foreground mt-1">Ready to start</p>
                  </CardContent>
                </Card>

                <Card className="bg-purple-50 border-purple-200 cursor-pointer hover:shadow-md transition-shadow" onClick={() => window.location.href = '/work-orders'}>
                  <CardContent className="p-4 text-center">
                    <div className="text-3xl font-bold text-purple-600 mb-2">{workflowPipeline.inProgress}</div>
                    <div className="text-sm font-medium text-purple-700">In Progress</div>
                    <div className="flex items-center justify-center gap-1 mt-1">
                      <div className="w-2 h-2 bg-purple-600 rounded-full animate-pulse"></div>
                      <p className="text-xs text-muted-foreground">Active work</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-amber-50 border-amber-200 cursor-pointer hover:shadow-md transition-shadow" onClick={() => window.location.href = '/work-orders'}>
                  <CardContent className="p-4 text-center">
                    <div className="text-3xl font-bold text-amber-600 mb-2">{workflowPipeline.inspection}</div>
                    <div className="text-sm font-medium text-amber-700">Inspection</div>
                    <p className="text-xs text-muted-foreground mt-1">QA review</p>
                  </CardContent>
                </Card>

                <Card className="bg-green-50 border-green-200 cursor-pointer hover:shadow-md transition-shadow" onClick={() => window.location.href = '/tech-work-analytics'}>
                  <CardContent className="p-4 text-center">
                    <div className="text-3xl font-bold text-green-600 mb-2">{workflowPipeline.completed}</div>
                    <div className="text-sm font-medium text-green-700">Completed</div>
                    <p className="text-xs text-muted-foreground mt-1">Last 7 days</p>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>

          {/* Items Needing Attention */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Critical Items</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-3">
                    {squawks
                      .filter(s => s.priority === 'critical' && s.status !== 'closed')
                      .slice(0, 5)
                      .map(squawk => (
                        <Card key={squawk.id} className="p-3 border-red-200 bg-red-50">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge className={getPriorityConfig('critical').badgeClass}>
                                  {getPriorityConfig('critical').icon} Critical
                                </Badge>
                                <span className="text-xs text-muted-foreground">{squawk.aircraftTail}</span>
                              </div>
                              <p className="text-sm font-medium line-clamp-2">{squawk.description}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Reported {formatRelativeTime(squawk.reportedAt)}
                              </p>
                            </div>
                            <Button variant="outline" size="sm" asChild>
                              <Link to="/tech-log">View</Link>
                            </Button>
                          </div>
                        </Card>
                      ))}
                    {squawks.filter(s => s.priority === 'critical' && s.status !== 'closed').length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
                        <p className="text-sm">No critical items</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">In Progress Work Orders</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-3">
                    {workOrders
                      .filter(wo => wo.status === 'in-progress')
                      .slice(0, 5)
                      .map(wo => (
                        <Card key={wo.id} className="p-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <div className="w-2 h-2 bg-violet-600 rounded-full animate-pulse"></div>
                                <span className="text-xs font-medium">{wo.id}</span>
                                <Badge className={getPriorityConfig(wo.priority as any).badgeClass}>
                                  {wo.priority}
                                </Badge>
                              </div>
                              <p className="text-sm font-medium line-clamp-2">{wo.title}</p>
                              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                <span>{wo.tailNumber}</span>
                                <span>•</span>
                                <span>{wo.assignedTo.length} tech{wo.assignedTo.length > 1 ? 's' : ''}</span>
                              </div>
                            </div>
                            <Button variant="outline" size="sm" asChild>
                              <Link to="/work-orders">View</Link>
                            </Button>
                          </div>
                          <div className="mt-2">
                            <LifecycleProgress lifecycle={wo.lifecycleStage} variant="compact" />
                          </div>
                        </Card>
                      ))}
                    {workOrders.filter(wo => wo.status === 'in-progress').length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <Wrench className="w-8 h-8 mx-auto mb-2" />
                        <p className="text-sm">No work orders in progress</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="aircraft" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Aircraft Status Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {aircraftAvailability.map(aircraft => (
                  <Card
                    key={aircraft.aircraftId}
                    className={`p-4 ${aircraft.status === 'grounded'
                      ? 'border-red-500 bg-red-50'
                      : aircraft.status === 'limited'
                        ? 'border-yellow-500 bg-yellow-50'
                        : 'border-green-500 bg-green-50'
                      }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <Plane className={`w-5 h-5 ${aircraft.status === 'grounded' ? 'text-red-600' :
                            aircraft.status === 'limited' ? 'text-yellow-600' :
                              'text-green-600'
                            }`} />
                          <div>
                            <h4 className="font-bold">{aircraft.tail}</h4>
                            <Badge
                              className={
                                aircraft.status === 'grounded'
                                  ? 'bg-red-100 text-red-800 border-red-200'
                                  : aircraft.status === 'limited'
                                    ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
                                    : 'bg-green-100 text-green-800 border-green-200'
                              }
                            >
                              {aircraft.status.toUpperCase()}
                            </Badge>
                          </div>
                        </div>

                        <div className="grid grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Open Squawks</p>
                            <p className="font-bold text-lg">{aircraft.openSquawks}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Critical</p>
                            <p className="font-bold text-lg text-red-600">{aircraft.criticalSquawks}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Deferred</p>
                            <p className="font-bold text-lg text-amber-600">{aircraft.deferredSquawks}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Limitations</p>
                            <p className="font-bold text-lg">{aircraft.currentLimitations.length}</p>
                          </div>
                        </div>

                        {aircraft.currentLimitations.length > 0 && (
                          <div className="mt-3 p-2 bg-white/50 rounded border">
                            <p className="text-xs font-medium mb-1">Active Limitations:</p>
                            {aircraft.currentLimitations.slice(0, 2).map((limitation, idx) => (
                              <p key={idx} className="text-xs text-muted-foreground">• {limitation}</p>
                            ))}
                            {aircraft.currentLimitations.length > 2 && (
                              <p className="text-xs text-blue-600 mt-1">+{aircraft.currentLimitations.length - 2} more</p>
                            )}
                          </div>
                        )}
                      </div>

                      <Button variant="outline" asChild>
                        <Link to="/tech-log">
                          View Details
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Link>
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Maintenance Activity</CardTitle>
              <p className="text-sm text-muted-foreground">Last 10 events across all systems</p>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <div className="space-y-3">
                  {recentActivity.map((activity, idx) => (
                    <div key={idx} className="flex gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                      <div className="flex flex-col items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${activity.type === 'squawk' ? 'bg-blue-100' : 'bg-violet-100'
                          }`}>
                          {activity.type === 'squawk' ? (
                            <FileText className="w-4 h-4 text-blue-600" />
                          ) : (
                            <Wrench className="w-4 h-4 text-violet-600" />
                          )}
                        </div>
                        {idx < recentActivity.length - 1 && (
                          <div className="w-0.5 h-full bg-border mt-2" />
                        )}
                      </div>

                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-sm">
                              {activity.type === 'squawk'
                                ? `Squawk ${(activity.data as any).id} reported`
                                : `Work Order ${(activity.data as any).id} created`
                              }
                            </p>
                            <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                              {activity.type === 'squawk'
                                ? (activity.data as any).description
                                : (activity.data as any).title
                              }
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="outline" className="text-xs">
                                {activity.type === 'squawk'
                                  ? (activity.data as any).aircraftTail
                                  : (activity.data as any).tailNumber
                                }
                              </Badge>
                              {activity.type === 'squawk' && (
                                <Badge className={getPriorityConfig((activity.data as any).priority).badgeClass}>
                                  {(activity.data as any).priority}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatRelativeTime(activity.timestamp)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quick-actions" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer group" onClick={() => window.location.href = '/tech-log'}>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                    <FileText className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-medium">Report Squawk</h4>
                    <p className="text-sm text-muted-foreground mt-1">Log new maintenance issue</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer group" onClick={() => window.location.href = '/work-orders'}>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-violet-100 rounded-lg group-hover:bg-violet-200 transition-colors">
                    <Wrench className="w-6 h-6 text-violet-600" />
                  </div>
                  <div>
                    <h4 className="font-medium">Create Work Order</h4>
                    <p className="text-sm text-muted-foreground mt-1">Start new maintenance task</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer group" onClick={() => window.location.href = '/mttr-dashboard'}>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors">
                    <BarChart3 className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-medium">View MTTR Analytics</h4>
                    <p className="text-sm text-muted-foreground mt-1">Performance metrics</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer group" onClick={() => window.location.href = '/mel-cdl'}>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-amber-100 rounded-lg group-hover:bg-amber-200 transition-colors">
                    <Shield className="w-6 h-6 text-amber-600" />
                  </div>
                  <div>
                    <h4 className="font-medium">Check MEL/CDL</h4>
                    <p className="text-sm text-muted-foreground mt-1">Manage deferrals</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer group" onClick={() => navigate('/maintenance/technician')}>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-cyan-100 rounded-lg group-hover:bg-cyan-200 transition-colors">
                    <Target className="w-6 h-6 text-cyan-600" />
                  </div>
                  <div>
                    <h4 className="font-medium">Technician Workspace</h4>
                    <p className="text-sm text-muted-foreground mt-1">My assigned jobs</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer group" onClick={() => window.location.href = '/tech-work-analytics'}>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-indigo-100 rounded-lg group-hover:bg-indigo-200 transition-colors">
                    <Activity className="w-6 h-6 text-indigo-600" />
                  </div>
                  <div>
                    <h4 className="font-medium">Work Analytics</h4>
                    <p className="text-sm text-muted-foreground mt-1">Team performance</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="resources" className="space-y-4">
          <ResourceManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
}
