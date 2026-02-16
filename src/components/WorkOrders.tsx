import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  Plus, 
  Search, 
  Filter, 
  Wrench, 
  Clock, 
  AlertCircle,
  CheckCircle,
  Users,
  Plane,
  Calendar,
  BarChart3,
  Eye,
  Edit,
  Trash2,
  Cloud,
  AlertTriangle,
  ArrowUpDown
} from 'lucide-react';
import { mockWorkOrders, mockTechnicians } from './WorkOrders/mockData';
import { WorkOrder } from './WorkOrders/types';
import WorkOrderDetails from './WorkOrderDetails';
import { useMaintenanceContext } from './contexts/MaintenanceContext';

export default function WorkOrders() {
  // Use MaintenanceContext instead of local state
  const { workOrders: contextWorkOrders, updateWorkOrder: contextUpdateWorkOrder } = useMaintenanceContext();
  
  // Convert context work orders to legacy format for display
  const workOrders = contextWorkOrders.map((wo): WorkOrder => ({
    id: wo.id,
    title: wo.title,
    description: wo.description,
    aircraft: wo.aircraft,
    tailNumber: wo.tailNumber,
    priority: wo.priority,
    status: wo.status,
    type: wo.type,
    category: wo.category,
    assignedTo: wo.assignedTo,
    assignedShift: wo.assignedShift,
    cmpJobCard: wo.cmpJobCard,
    cmpSyncRequired: wo.cmpSyncRequired,
    cmpLastSync: wo.cmpLastSync,
    estimatedHours: wo.estimatedHours,
    actualHours: wo.actualHours,
    startDate: wo.startDate,
    completedDate: wo.completedDate,
    dueDate: wo.dueDate,
    subTasks: wo.subTasks,
    createdBy: wo.createdBy,
    createdAt: wo.createdAt,
    updatedAt: wo.updatedAt,
    location: wo.location,
    notes: wo.notes
  }));
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<WorkOrder | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [sortField, setSortField] = useState<'dueDate' | 'priority' | 'status'>('dueDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Filter work orders
  const filteredWorkOrders = workOrders.filter(wo => {
    const matchesSearch = 
      wo.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      wo.tailNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      wo.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || wo.status === filterStatus;
    const matchesPriority = filterPriority === 'all' || wo.priority === filterPriority;
    const matchesCategory = filterCategory === 'all' || wo.category === filterCategory;

    return matchesSearch && matchesStatus && matchesPriority && matchesCategory;
  });

  // Sort work orders
  const sortedWorkOrders = [...filteredWorkOrders].sort((a, b) => {
    let comparison = 0;
    
    if (sortField === 'dueDate') {
      comparison = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    } else if (sortField === 'priority') {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      comparison = priorityOrder[a.priority] - priorityOrder[b.priority];
    } else if (sortField === 'status') {
      const statusOrder = { 'aog': 0, 'critical': 1, 'in-progress': 2, 'assigned': 3, 'pending': 4, 'on-hold': 5, 'completed': 6, 'cancelled': 7 };
      comparison = statusOrder[a.status] - statusOrder[b.status];
    }
    
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  // Statistics
  const stats = {
    total: workOrders.length,
    pending: workOrders.filter(wo => wo.status === 'pending').length,
    assigned: workOrders.filter(wo => wo.status === 'assigned').length,
    inProgress: workOrders.filter(wo => wo.status === 'in-progress').length,
    completed: workOrders.filter(wo => wo.status === 'completed').length,
    critical: workOrders.filter(wo => wo.priority === 'critical').length,
    cmpSync: workOrders.filter(wo => wo.cmpSyncRequired).length,
  };

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
      case 'on-hold': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const handleViewDetails = (workOrder: WorkOrder) => {
    setSelectedWorkOrder(workOrder);
    setIsDetailsOpen(true);
  };

  const handleUpdateWorkOrder = (updatedWorkOrder: WorkOrder) => {
    setWorkOrders(workOrders.map(wo => 
      wo.id === updatedWorkOrder.id ? updatedWorkOrder : wo
    ));
  };

  const toggleSort = (field: 'dueDate' | 'priority' | 'status') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6">
        <div>
          <h1>Work Order Management</h1>
          <p className="text-muted-foreground">Manage maintenance work orders and track progress</p>
        </div>
        
        <div className="flex items-center gap-2 mt-4 lg:mt-0">
          <Button variant="outline">
            <BarChart3 className="w-4 h-4 mr-2" />
            Analytics
          </Button>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            New Work Order
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-7 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Wrench className="w-4 h-4 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-600" />
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl">{stats.pending}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-600" />
              <div>
                <p className="text-sm text-muted-foreground">Assigned</p>
                <p className="text-2xl">{stats.assigned}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Wrench className="w-4 h-4 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">In Progress</p>
                <p className="text-2xl">{stats.inProgress}</p>
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
                <p className="text-2xl">{stats.completed}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <div>
                <p className="text-sm text-red-700">Critical</p>
                <p className="text-2xl text-red-700">{stats.critical}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Cloud className="w-4 h-4 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">CMP Sync</p>
                <p className="text-2xl">{stats.cmpSync}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search work orders..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="assigned">Assigned</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="on-hold">On Hold</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="major">Major</SelectItem>
                <SelectItem value="minor">Minor</SelectItem>
                <SelectItem value="ancillary">Ancillary</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Work Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Work Orders ({sortedWorkOrders.length})</span>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Filter className="w-4 h-4" />
              {filterStatus !== 'all' || filterPriority !== 'all' || filterCategory !== 'all' ? (
                <span>Filtered</span>
              ) : null}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>WO #</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Aircraft</TableHead>
                  <TableHead>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => toggleSort('priority')}
                      className="h-8 p-0"
                    >
                      Priority
                      <ArrowUpDown className="ml-2 w-3 h-3" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => toggleSort('status')}
                      className="h-8 p-0"
                    >
                      Status
                      <ArrowUpDown className="ml-2 w-3 h-3" />
                    </Button>
                  </TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => toggleSort('dueDate')}
                      className="h-8 p-0"
                    >
                      Due Date
                      <ArrowUpDown className="ml-2 w-3 h-3" />
                    </Button>
                  </TableHead>
                  <TableHead>CMP</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedWorkOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center text-muted-foreground py-8">
                      No work orders found
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedWorkOrders.map((wo) => {
                    const completedSubTasks = wo.subTasks.filter(st => st.status === 'completed').length;
                    const totalSubTasks = wo.subTasks.length;
                    const progress = totalSubTasks > 0 ? (completedSubTasks / totalSubTasks) * 100 : 0;

                    return (
                      <TableRow 
                        key={wo.id} 
                        className={`
                          ${wo.type === 'aog' ? 'bg-red-50 border-l-4 border-l-red-500' : ''}
                          ${wo.priority === 'critical' && wo.type !== 'aog' ? 'bg-orange-50 border-l-4 border-l-orange-500' : ''}
                          hover:bg-muted/50 cursor-pointer
                        `}
                        onClick={() => handleViewDetails(wo)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {wo.type === 'aog' && (
                              <AlertTriangle className="w-4 h-4 text-red-600" />
                            )}
                            <span className="font-mono text-sm">{wo.id}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div>{wo.title}</div>
                            <div className="text-sm text-muted-foreground truncate max-w-xs">
                              {wo.description}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Plane className="w-3 h-3" />
                            <div>
                              <div>{wo.tailNumber}</div>
                              <div className="text-xs text-muted-foreground">{wo.location}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getPriorityColor(wo.priority)}>
                            {wo.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(wo.status)}>
                            {wo.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getCategoryColor(wo.category)}>
                            {wo.category}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {wo.assignedTo.length > 0 ? (
                            <div className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              <span className="text-sm">
                                {wo.assignedTo.length} tech{wo.assignedTo.length !== 1 ? 's' : ''}
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">Unassigned</span>
                          )}
                          {wo.assignedShift && (
                            <div className="text-xs text-muted-foreground">{wo.assignedShift} Shift</div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-sm">
                              <span>{Math.round(progress)}%</span>
                              <span className="text-muted-foreground">
                                ({completedSubTasks}/{totalSubTasks})
                              </span>
                            </div>
                            <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-blue-600 transition-all" 
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {formatDateTime(wo.dueDate)}
                          </div>
                          {wo.startDate && (
                            <div className="text-xs text-muted-foreground">
                              Started: {formatDate(wo.startDate)}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {wo.cmpSyncRequired ? (
                            <div className="flex items-center gap-1">
                              <Cloud className="w-4 h-4 text-blue-600" />
                              <span className="text-xs text-blue-600">Synced</span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">Local</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewDetails(wo);
                            }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Work Order Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-6xl h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
            <DialogTitle>Work Order Details</DialogTitle>
            <DialogDescription>
              View and manage work order information
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6 pb-6">
            {selectedWorkOrder && (
              <WorkOrderDetails 
                workOrder={selectedWorkOrder} 
                onUpdate={handleUpdateWorkOrder}
                onClose={() => setIsDetailsOpen(false)}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
