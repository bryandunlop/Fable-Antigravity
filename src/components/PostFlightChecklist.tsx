import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Checkbox } from './ui/checkbox';
import { Progress } from './ui/progress';
import { 
  ClipboardCheck,
  Plus, 
  Search, 
  Filter, 
  Plane,
  User,
  Calendar,
  Clock,
  CheckCircle,
  AlertTriangle,
  Users,
  Wrench
} from 'lucide-react';
import { toast } from 'sonner';

interface PostFlightChecklistProps {
  userRole: string;
}

export default function PostFlightChecklist({ userRole }: PostFlightChecklistProps) {
  const [selectedFlight, setSelectedFlight] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showAddItemDialog, setShowAddItemDialog] = useState(false);

  // Mock data - in real app this would come from backend
  const flights = [
    {
      id: 'FO001',
      aircraft: 'N123AB',
      route: 'LAX → JFK',
      date: '2024-02-06',
      status: 'landed',
      completionRate: 75
    },
    {
      id: 'FO002',
      aircraft: 'N456CD',
      route: 'JFK → MIA',
      date: '2024-02-06',
      status: 'landed',
      completionRate: 100
    },
    {
      id: 'FO003',
      aircraft: 'N789EF',
      route: 'MIA → LAX',
      date: '2024-02-05',
      status: 'complete',
      completionRate: 100
    }
  ];

  const checklistItems = {
    'FO001': [
      {
        id: 1,
        category: 'Cabin Reset',
        task: 'Remove all passenger items from seat pockets',
        assignedTo: 'both',
        priority: 'high',
        completed: true,
        completedBy: 'Sarah Wilson',
        completedAt: '2024-02-06 11:45 AM',
        role: 'inflight',
        notes: 'Found one magazine left in 4A'
      },
      {
        id: 2,
        category: 'Cabin Reset',
        task: 'Replace headrest covers',
        assignedTo: 'inflight',
        priority: 'medium',
        completed: true,
        completedBy: 'Mike Johnson',
        completedAt: '2024-02-06 11:50 AM',
        role: 'inflight',
        notes: 'All covers replaced with fresh ones'
      },
      {
        id: 3,
        category: 'Safety Equipment',
        task: 'Check and reset emergency equipment',
        assignedTo: 'both',
        priority: 'critical',
        completed: false,
        completedBy: null,
        completedAt: null,
        role: null,
        notes: ''
      },
      {
        id: 4,
        category: 'Galley',
        task: 'Empty and clean coffee makers',
        assignedTo: 'inflight',
        priority: 'medium',
        completed: true,
        completedBy: 'Sarah Wilson',
        completedAt: '2024-02-06 12:00 PM',
        role: 'inflight',
        notes: 'Deep cleaned and descaled'
      },
      {
        id: 5,
        category: 'Systems',
        task: 'Reset cabin lighting to default',
        assignedTo: 'maintenance',
        priority: 'low',
        completed: false,
        completedBy: null,
        completedAt: null,
        role: null,
        notes: ''
      },
      {
        id: 6,
        category: 'Cleaning',
        task: 'Vacuum all carpeted areas',
        assignedTo: 'both',
        priority: 'medium',
        completed: true,
        completedBy: 'Tom Anderson',
        completedAt: '2024-02-06 12:15 PM',
        role: 'maintenance',
        notes: 'Used HEPA vacuum, extra attention to galley area'
      }
    ],
    'FO002': [
      {
        id: 7,
        category: 'Cabin Reset',
        task: 'Remove all passenger items from seat pockets',
        assignedTo: 'both',
        priority: 'high',
        completed: true,
        completedBy: 'Emily Davis',
        completedAt: '2024-02-06 6:30 PM',
        role: 'inflight',
        notes: ''
      },
      {
        id: 8,
        category: 'Safety Equipment',
        task: 'Check and reset emergency equipment',
        assignedTo: 'both',
        priority: 'critical',
        completed: true,
        completedBy: 'Lisa Chen',
        completedAt: '2024-02-06 6:45 PM',
        role: 'maintenance',
        notes: 'All equipment functional and in place'
      }
    ]
  };

  const currentChecklist = selectedFlight ? checklistItems[selectedFlight] || [] : [];
  
  const filteredChecklist = currentChecklist.filter(item => {
    const matchesSearch = item.task.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'completed' && item.completed) ||
                         (statusFilter === 'pending' && !item.completed) ||
                         (statusFilter === 'my-role' && (item.assignedTo === userRole || item.assignedTo === 'both'));
    return matchesSearch && matchesStatus;
  });

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getAssignmentColor = (assignedTo: string) => {
    switch (assignedTo) {
      case 'inflight': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'maintenance': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'both': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getAssignmentIcon = (assignedTo: string) => {
    switch (assignedTo) {
      case 'inflight': return <Users className="w-3 h-3" />;
      case 'maintenance': return <Wrench className="w-3 h-3" />;
      case 'both': return <Users className="w-3 h-3" />;
      default: return null;
    }
  };

  const canCompleteTask = (item: any) => {
    return item.assignedTo === userRole || item.assignedTo === 'both';
  };

  const handleCompleteTask = (itemId: number, notes: string = '') => {
    const item = currentChecklist.find(i => i.id === itemId);
    if (item && canCompleteTask(item)) {
      toast.success(`Task "${item.task}" marked as complete`);
    }
  };

  const handleAddChecklistItem = () => {
    toast.success('Checklist item added successfully');
    setShowAddItemDialog(false);
  };

  const getFlightStatus = (flight: any) => {
    if (flight.completionRate === 100) return 'Complete';
    if (flight.status === 'landed') return 'In Progress';
    return 'Pending';
  };

  const getFlightStatusColor = (flight: any) => {
    if (flight.completionRate === 100) return 'bg-green-100 text-green-800';
    if (flight.status === 'landed') return 'bg-yellow-100 text-yellow-800';
    return 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6">
        <div>
          <h1 className="flex items-center gap-2">
            <ClipboardCheck className="w-6 h-6" />
            Post-Flight Checklist
          </h1>
          <p className="text-muted-foreground">Shared checklist system for flight reset procedures</p>
        </div>
        
        <Dialog open={showAddItemDialog} onOpenChange={setShowAddItemDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Checklist Item
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add Checklist Item</DialogTitle>
              <DialogDescription>
                Create a new checklist item for post-flight procedures
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Flight</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select flight" />
                    </SelectTrigger>
                    <SelectContent>
                      {flights.map(flight => (
                        <SelectItem key={flight.id} value={flight.id}>
                          {flight.id} - {flight.route}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Category</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cabin-reset">Cabin Reset</SelectItem>
                      <SelectItem value="safety-equipment">Safety Equipment</SelectItem>
                      <SelectItem value="galley">Galley</SelectItem>
                      <SelectItem value="systems">Systems</SelectItem>
                      <SelectItem value="cleaning">Cleaning</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <Label>Task Description</Label>
                <Textarea placeholder="Detailed description of the task..." rows={3} />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Assigned To</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select assignment" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="inflight">Inflight Crew</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                      <SelectItem value="both">Both Teams</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Priority</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button onClick={handleAddChecklistItem}>Add Item</Button>
                <Button variant="outline" onClick={() => setShowAddItemDialog(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Flight Selection */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Select value={selectedFlight} onValueChange={setSelectedFlight}>
                <SelectTrigger>
                  <Plane className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Select flight to view checklist" />
                </SelectTrigger>
                <SelectContent>
                  {flights.map(flight => (
                    <SelectItem key={flight.id} value={flight.id}>
                      {flight.id} - {flight.aircraft} - {flight.route} ({new Date(flight.date).toLocaleDateString()})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex-1">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search checklist items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Items</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="my-role">My Assignments</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Flights Overview */}
      {!selectedFlight && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Recent Flights</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Flight ID</TableHead>
                  <TableHead>Aircraft</TableHead>
                  <TableHead>Route</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {flights.map((flight) => (
                  <TableRow key={flight.id}>
                    <TableCell className="font-medium">{flight.id}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{flight.aircraft}</Badge>
                    </TableCell>
                    <TableCell>{flight.route}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        {new Date(flight.date).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getFlightStatusColor(flight)}>
                        {getFlightStatus(flight)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 min-w-32">
                        <Progress value={flight.completionRate} className="flex-1" />
                        <span className="text-sm">{flight.completionRate}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setSelectedFlight(flight.id)}
                      >
                        View Checklist
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {selectedFlight && (
        <>
          {/* Selected Flight Info */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div>
                    <h3 className="font-medium">
                      Flight {selectedFlight} - {flights.find(f => f.id === selectedFlight)?.aircraft}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {flights.find(f => f.id === selectedFlight)?.route} - 
                      {new Date(flights.find(f => f.id === selectedFlight)?.date || '').toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">Progress</div>
                    <div className="flex items-center gap-2">
                      <Progress value={flights.find(f => f.id === selectedFlight)?.completionRate || 0} className="w-32" />
                      <span className="text-sm font-medium">
                        {flights.find(f => f.id === selectedFlight)?.completionRate || 0}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <ClipboardCheck className="w-4 h-4 text-blue-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Total Items</p>
                    <p className="text-2xl">{currentChecklist.length}</p>
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
                    <p className="text-2xl">
                      {currentChecklist.filter(item => item.completed).length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-yellow-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Pending</p>
                    <p className="text-2xl">
                      {currentChecklist.filter(item => !item.completed).length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Critical</p>
                    <p className="text-2xl">
                      {currentChecklist.filter(item => item.priority === 'critical' && !item.completed).length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Checklist Items */}
          <Card>
            <CardHeader>
              <CardTitle>Checklist Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredChecklist.map((item) => (
                  <div key={item.id} className={`p-4 border rounded-lg ${item.completed ? 'bg-green-50' : ''}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <Checkbox
                          checked={item.completed}
                          disabled={!canCompleteTask(item)}
                          onCheckedChange={() => handleCompleteTask(item.id)}
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`font-medium ${item.completed ? 'line-through text-muted-foreground' : ''}`}>
                              {item.task}
                            </span>
                            <Badge variant="outline" className="text-xs">{item.category}</Badge>
                          </div>
                          
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className={getPriorityColor(item.priority)}>
                              {item.priority}
                            </Badge>
                            <Badge className={getAssignmentColor(item.assignedTo)}>
                              {getAssignmentIcon(item.assignedTo)}
                              <span className="ml-1 capitalize">
                                {item.assignedTo === 'both' ? 'Both Teams' : item.assignedTo}
                              </span>
                            </Badge>
                          </div>
                          
                          {item.completed && (
                            <div className="text-sm text-muted-foreground">
                              <div className="flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-green-600" />
                                Completed by {item.completedBy} ({item.role}) at {item.completedAt}
                              </div>
                              {item.notes && (
                                <p className="mt-1 text-xs">Notes: {item.notes}</p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {!item.completed && canCompleteTask(item) && (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button size="sm">Complete</Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Complete Task</DialogTitle>
                              <DialogDescription>
                                Confirm completion and add any notes
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label>Task</Label>
                                <p className="text-sm">{item.task}</p>
                              </div>
                              <div>
                                <Label>Notes (Optional)</Label>
                                <Textarea 
                                  placeholder="Add any notes about completing this task..."
                                  rows={3}
                                />
                              </div>
                              <Button onClick={() => handleCompleteTask(item.id)}>
                                Mark as Complete
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {filteredChecklist.length === 0 && (
                <div className="text-center py-8">
                  <ClipboardCheck className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No checklist items found matching your criteria.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {!selectedFlight && (
        <div className="text-center py-12">
          <ClipboardCheck className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Select a Flight</h3>
          <p className="text-muted-foreground">Choose a flight from the table above to view and manage its post-flight checklist.</p>
        </div>
      )}
    </div>
  );
}