import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  BarChart3, 
  Clock, 
  CheckCircle, 
  User, 
  TrendingUp,
  TrendingDown,
  Calendar,
  Wrench,
  Users,
  Activity
} from 'lucide-react';
import { mockWorkOrders, mockTechnicians, mockTimeEntries } from './WorkOrders/mockData';

export default function TechWorkAnalytics() {
  const [selectedTech, setSelectedTech] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<string>('week');

  // Calculate technician statistics
  const getTechStats = (techId: string) => {
    const techTimeEntries = techId === 'all' 
      ? mockTimeEntries 
      : mockTimeEntries.filter(te => te.technicianId === techId);
    
    const techWorkOrders = techId === 'all'
      ? mockWorkOrders
      : mockWorkOrders.filter(wo => wo.assignedTo.includes(techId));

    const totalHours = techTimeEntries.reduce((sum, te) => sum + te.duration, 0);
    const completedWorkOrders = techWorkOrders.filter(wo => wo.status === 'completed').length;
    const inProgressWorkOrders = techWorkOrders.filter(wo => wo.status === 'in-progress').length;
    
    // Calculate work by category
    const workByCategory = {
      major: techWorkOrders.filter(wo => wo.category === 'major').length,
      minor: techWorkOrders.filter(wo => wo.category === 'minor').length,
      ancillary: techWorkOrders.filter(wo => wo.category === 'ancillary').length
    };

    // Calculate average completion time for completed work orders
    const completedWOs = techWorkOrders.filter(wo => wo.status === 'completed' && wo.startDate && wo.completedDate);
    const avgCompletionTime = completedWOs.length > 0
      ? completedWOs.reduce((sum, wo) => {
          const start = new Date(wo.startDate!).getTime();
          const end = new Date(wo.completedDate!).getTime();
          return sum + (end - start) / (1000 * 60 * 60); // Convert to hours
        }, 0) / completedWOs.length
      : 0;

    return {
      totalHours,
      completedWorkOrders,
      inProgressWorkOrders,
      totalWorkOrders: techWorkOrders.length,
      workByCategory,
      avgCompletionTime,
      efficiency: totalHours > 0 ? (completedWorkOrders / totalHours * 100) : 0
    };
  };

  // Get all tech stats for tracking
  const techTracking = mockTechnicians.map(tech => {
    const stats = getTechStats(tech.id);
    return {
      ...tech,
      stats
    };
  });

  const selectedStats = getTechStats(selectedTech);

  // Category distribution
  const categoryData = [
    { name: 'Major', value: selectedStats.workByCategory.major, color: 'bg-red-500' },
    { name: 'Minor', value: selectedStats.workByCategory.minor, color: 'bg-blue-500' },
    { name: 'Ancillary', value: selectedStats.workByCategory.ancillary, color: 'bg-gray-500' }
  ];

  const totalCategoryWork = categoryData.reduce((sum, cat) => sum + cat.value, 0);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6">
        <div>
          <h1>Technician Work Analytics</h1>
          <p className="text-muted-foreground">Track technician performance and workload</p>
        </div>
        
        <div className="flex items-center gap-2 mt-4 lg:mt-0">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedTech} onValueChange={setSelectedTech}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Technicians</SelectItem>
              {mockTechnicians.map(tech => (
                <SelectItem key={tech.id} value={tech.id}>
                  {tech.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Total Hours</p>
                <p className="text-2xl">{selectedStats.totalHours.toFixed(1)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Wrench className="w-4 h-4 text-purple-600" />
              <div>
                <p className="text-sm text-muted-foreground">Total Work Orders</p>
                <p className="text-2xl">{selectedStats.totalWorkOrders}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl">{selectedStats.completedWorkOrders}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-orange-600" />
              <div>
                <p className="text-sm text-muted-foreground">In Progress</p>
                <p className="text-2xl">{selectedStats.inProgressWorkOrders}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tracking">Tracking</TabsTrigger>
          <TabsTrigger value="breakdown">Work Breakdown</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Work Category Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Work by Category</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {categoryData.map((category) => {
                    const percentage = totalCategoryWork > 0 
                      ? (category.value / totalCategoryWork) * 100 
                      : 0;
                    
                    return (
                      <div key={category.name}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded ${category.color}`} />
                            <span>{category.name}</span>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {category.value} ({percentage.toFixed(0)}%)
                          </span>
                        </div>
                        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${category.color} transition-all`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {totalCategoryWork === 0 && (
                  <div className="text-center text-muted-foreground py-8">
                    No work orders to display
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Performance Metrics */}
            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-muted rounded">
                    <div>
                      <div className="text-sm text-muted-foreground">Avg Completion Time</div>
                      <div className="text-xl">
                        {selectedStats.avgCompletionTime > 0 
                          ? `${selectedStats.avgCompletionTime.toFixed(1)} hours`
                          : 'N/A'
                        }
                      </div>
                    </div>
                    <TrendingDown className="w-5 h-5 text-green-600" />
                  </div>

                  <div className="flex items-center justify-between p-3 bg-muted rounded">
                    <div>
                      <div className="text-sm text-muted-foreground">Hours per Work Order</div>
                      <div className="text-xl">
                        {selectedStats.totalWorkOrders > 0
                          ? (selectedStats.totalHours / selectedStats.totalWorkOrders).toFixed(1)
                          : '0.0'
                        }
                      </div>
                    </div>
                    <Clock className="w-5 h-5 text-blue-600" />
                  </div>

                  <div className="flex items-center justify-between p-3 bg-muted rounded">
                    <div>
                      <div className="text-sm text-muted-foreground">Completion Rate</div>
                      <div className="text-xl">
                        {selectedStats.totalWorkOrders > 0
                          ? `${((selectedStats.completedWorkOrders / selectedStats.totalWorkOrders) * 100).toFixed(0)}%`
                          : '0%'
                        }
                      </div>
                    </div>
                    <TrendingUp className="w-5 h-5 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Time Entries */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Time Entries</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Technician</TableHead>
                    <TableHead>Work Order</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockTimeEntries
                    .filter(te => selectedTech === 'all' || te.technicianId === selectedTech)
                    .slice(0, 10)
                    .map((entry) => {
                      const workOrder = mockWorkOrders.find(wo => wo.id === entry.workOrderId);
                      return (
                        <TableRow key={entry.id}>
                          <TableCell>
                            {new Date(entry.startTime).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric'
                            })}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4" />
                              {entry.technicianName}
                            </div>
                          </TableCell>
                          <TableCell>
                            {workOrder?.title || entry.workOrderId}
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
                    })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tracking Tab */}
        <TabsContent value="tracking" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-600" />
                Technician Hour Tracking
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Technician</TableHead>
                    <TableHead>Shift</TableHead>
                    <TableHead>Total Hours</TableHead>
                    <TableHead>Work Orders</TableHead>
                    <TableHead>Completed</TableHead>
                    <TableHead>In Progress</TableHead>
                    <TableHead>Completion Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {techTracking.map((tech) => {
                    const completionRate = tech.stats.totalWorkOrders > 0
                      ? (tech.stats.completedWorkOrders / tech.stats.totalWorkOrders) * 100
                      : 0;

                    return (
                      <TableRow key={tech.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4" />
                            {tech.name}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{tech.shift}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {tech.stats.totalHours.toFixed(1)}h
                          </div>
                        </TableCell>
                        <TableCell>{tech.stats.totalWorkOrders}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-green-600">
                            <CheckCircle className="w-3 h-3" />
                            {tech.stats.completedWorkOrders}
                          </div>
                        </TableCell>
                        <TableCell>{tech.stats.inProgressWorkOrders}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span>{completionRate.toFixed(0)}%</span>
                            <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-green-600 transition-all"
                                style={{ width: `${completionRate}%` }}
                              />
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Work Breakdown Tab */}
        <TabsContent value="breakdown" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Major Work */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-red-500" />
                  Major Work
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl mb-2">{selectedStats.workByCategory.major}</div>
                <p className="text-sm text-muted-foreground">
                  Complex repairs and overhauls requiring extensive labor
                </p>
              </CardContent>
            </Card>

            {/* Minor Work */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-blue-500" />
                  Minor Work
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl mb-2">{selectedStats.workByCategory.minor}</div>
                <p className="text-sm text-muted-foreground">
                  Routine maintenance and minor repairs
                </p>
              </CardContent>
            </Card>

            {/* Ancillary Work */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-gray-500" />
                  Ancillary Work
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl mb-2">{selectedStats.workByCategory.ancillary}</div>
                <p className="text-sm text-muted-foreground">
                  Supporting tasks and administrative work
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Work Distribution by Technician */}
          <Card>
            <CardHeader>
              <CardTitle>Work Distribution by Technician</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockTechnicians.map((tech) => {
                  const stats = getTechStats(tech.id);
                  const maxHours = Math.max(...techTracking.map(t => t.stats.totalHours));
                  const percentage = maxHours > 0 ? (stats.totalHours / maxHours) * 100 : 0;

                  return (
                    <div key={tech.id}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4" />
                          <span>{tech.name}</span>
                          <Badge variant="outline" className="text-xs">{tech.shift}</Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {stats.totalHours.toFixed(1)}h ({stats.totalWorkOrders} WOs)
                        </div>
                      </div>
                      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-600 transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
