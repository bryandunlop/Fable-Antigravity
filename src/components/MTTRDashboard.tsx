import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  Clock, 
  TrendingUp, 
  Plane, 
  Users, 
  AlertTriangle, 
  CheckCircle,
  Activity,
  Target
} from 'lucide-react';
import { useMaintenanceContext } from './contexts/MaintenanceContext';

export default function MTTRDashboard() {
  const { mttrData, workOrders, aircraftAvailability } = useMaintenanceContext();

  // Prepare data for charts
  const aircraftMTTRData = Object.entries(mttrData.byAircraft).map(([aircraft, mttr]) => ({
    aircraft,
    mttr: Number(mttr.toFixed(2)),
    name: aircraft
  }));

  const categoryMTTRData = Object.entries(mttrData.byCategory).map(([category, mttr]) => ({
    category: category.charAt(0).toUpperCase() + category.slice(1),
    mttr: Number(mttr.toFixed(2)),
    name: category.charAt(0).toUpperCase() + category.slice(1)
  }));

  const technicianMTTRData = Object.entries(mttrData.byTechnician).map(([tech, mttr]) => ({
    technician: tech,
    mttr: Number(mttr.toFixed(2)),
    name: tech
  }));

  // Aircraft availability stats
  const availabilityStats = {
    available: aircraftAvailability.filter(a => a.status === 'available').length,
    grounded: aircraftAvailability.filter(a => a.status === 'grounded').length,
    limited: aircraftAvailability.filter(a => a.status === 'limited').length,
    total: aircraftAvailability.length
  };

  const availabilityPercentage = availabilityStats.total > 0 
    ? (availabilityStats.available / availabilityStats.total) * 100 
    : 0;

  // Work order completion stats
  const completedWOs = workOrders.filter(wo => wo.status === 'completed');
  const avgCompletionTime = completedWOs.length > 0
    ? completedWOs.reduce((sum, wo) => {
        if (wo.startDate && wo.completedDate) {
          const hours = (new Date(wo.completedDate).getTime() - new Date(wo.startDate).getTime()) / (1000 * 60 * 60);
          return sum + hours;
        }
        return sum;
      }, 0) / completedWOs.length
    : 0;

  const onTimeCompletions = completedWOs.filter(wo => {
    if (wo.completedDate && wo.dueDate) {
      return new Date(wo.completedDate) <= new Date(wo.dueDate);
    }
    return false;
  }).length;

  const onTimePercentage = completedWOs.length > 0
    ? (onTimeCompletions / completedWOs.length) * 100
    : 0;

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1>MTTR & Aircraft Availability Dashboard</h1>
        <p className="text-muted-foreground">
          Mean Time To Repair analytics and fleet availability tracking
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Overall MTTR</p>
                <p className="text-2xl">{mttrData.overall.toFixed(1)}h</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Plane className="w-5 h-5 text-green-600" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Fleet Availability</p>
                <p className="text-2xl">{availabilityPercentage.toFixed(0)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-purple-600" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">On-Time Completion</p>
                <p className="text-2xl">{onTimePercentage.toFixed(0)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-orange-600" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Avg Completion</p>
                <p className="text-2xl">{avgCompletionTime.toFixed(1)}h</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="mttr" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="mttr">MTTR Analysis</TabsTrigger>
          <TabsTrigger value="availability">Aircraft Availability</TabsTrigger>
          <TabsTrigger value="performance">Performance Metrics</TabsTrigger>
        </TabsList>

        {/* MTTR Analysis Tab */}
        <TabsContent value="mttr" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* MTTR by Aircraft */}
            <Card>
              <CardHeader>
                <CardTitle>MTTR by Aircraft</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={aircraftMTTRData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="aircraft" />
                    <YAxis label={{ value: 'Hours', angle: -90, position: 'insideLeft' }} />
                    <Tooltip />
                    <Bar dataKey="mttr" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* MTTR by Category */}
            <Card>
              <CardHeader>
                <CardTitle>MTTR by Work Order Category</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={categoryMTTRData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="category" />
                    <YAxis label={{ value: 'Hours', angle: -90, position: 'insideLeft' }} />
                    <Tooltip />
                    <Bar dataKey="mttr" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* MTTR by Technician */}
          <Card>
            <CardHeader>
              <CardTitle>MTTR by Technician</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={technicianMTTRData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="technician" />
                  <YAxis label={{ value: 'Hours', angle: -90, position: 'insideLeft' }} />
                  <Tooltip />
                  <Bar dataKey="mttr" fill="#f59e0b" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aircraft Availability Tab */}
        <TabsContent value="availability" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Availability Overview */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>Fleet Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span>Available</span>
                    </div>
                    <Badge className="bg-green-100 text-green-800">
                      {availabilityStats.available} / {availabilityStats.total}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-yellow-600" />
                      <span>Limited</span>
                    </div>
                    <Badge className="bg-yellow-100 text-yellow-800">
                      {availabilityStats.limited}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-600" />
                      <span>Grounded</span>
                    </div>
                    <Badge className="bg-red-100 text-red-800">
                      {availabilityStats.grounded}
                    </Badge>
                  </div>
                </div>

                <div className="mt-6">
                  <div className="text-center mb-2">
                    <div className="text-3xl">{availabilityPercentage.toFixed(0)}%</div>
                    <div className="text-sm text-muted-foreground">Fleet Availability</div>
                  </div>
                  <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-600 transition-all"
                      style={{ width: `${availabilityPercentage}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Aircraft Details */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Aircraft Status Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {aircraftAvailability.map(aircraft => (
                    <Card key={aircraft.aircraftId} className={`
                      ${aircraft.status === 'grounded' ? 'border-red-300 bg-red-50' : ''}
                      ${aircraft.status === 'limited' ? 'border-yellow-300 bg-yellow-50' : ''}
                    `}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <Plane className="w-5 h-5" />
                              <h4 className="font-medium">{aircraft.tail}</h4>
                              <Badge className={
                                aircraft.status === 'available' ? 'bg-green-100 text-green-800' :
                                aircraft.status === 'limited' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }>
                                {aircraft.status.toUpperCase()}
                              </Badge>
                            </div>
                            
                            <div className="grid grid-cols-3 gap-4 text-sm">
                              <div>
                                <span className="text-muted-foreground">Open Squawks: </span>
                                <span className="font-medium">{aircraft.openSquawks}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Critical: </span>
                                <span className="font-medium text-red-600">{aircraft.criticalSquawks}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Deferred: </span>
                                <span className="font-medium">{aircraft.deferredSquawks}</span>
                              </div>
                            </div>

                            {aircraft.currentLimitations.length > 0 && (
                              <div className="mt-3">
                                <p className="text-sm font-medium mb-1">Operational Limitations:</p>
                                <ul className="text-sm text-muted-foreground list-disc list-inside">
                                  {aircraft.currentLimitations.map((limit, idx) => (
                                    <li key={idx}>{limit}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {aircraft.estimatedReturnToService && (
                              <div className="mt-3 flex items-center gap-2 text-sm">
                                <Clock className="w-4 h-4" />
                                <span>Est. RTS: {aircraft.estimatedReturnToService.toLocaleString()}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {aircraftAvailability.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Plane className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No aircraft data available</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Performance Metrics Tab */}
        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Completion Rate */}
            <Card>
              <CardHeader>
                <CardTitle>Work Order Completion Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm">On-Time Completion Rate</span>
                      <span className="text-sm font-medium">{onTimePercentage.toFixed(1)}%</span>
                    </div>
                    <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-green-600 transition-all"
                        style={{ width: `${onTimePercentage}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-medium">{completedWOs.length}</div>
                      <div className="text-sm text-muted-foreground">Completed WOs</div>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-2xl font-medium">{onTimeCompletions}</div>
                      <div className="text-sm text-muted-foreground">On-Time</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Avg Completion Time Trend */}
            <Card>
              <CardHeader>
                <CardTitle>Performance Insights</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
                    <div>
                      <div className="text-sm text-muted-foreground">Average Completion Time</div>
                      <div className="text-2xl font-medium">{avgCompletionTime.toFixed(1)}h</div>
                    </div>
                    <TrendingUp className="w-8 h-8 text-purple-600" />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                    <div>
                      <div className="text-sm text-muted-foreground">Overall MTTR</div>
                      <div className="text-2xl font-medium">{mttrData.overall.toFixed(1)}h</div>
                    </div>
                    <Clock className="w-8 h-8 text-blue-600" />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                    <div>
                      <div className="text-sm text-muted-foreground">Fleet Availability</div>
                      <div className="text-2xl font-medium">{availabilityPercentage.toFixed(0)}%</div>
                    </div>
                    <Plane className="w-8 h-8 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Last Updated */}
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground text-center">
                Last updated: {mttrData.lastCalculated.toLocaleString()}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
