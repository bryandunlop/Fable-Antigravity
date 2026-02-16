import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Alert, AlertDescription } from './ui/alert';
import { Textarea } from './ui/textarea';
import { Progress } from './ui/progress';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { Checkbox } from './ui/checkbox';
import { 
  Calendar, 
  Clock, 
  Users, 
  CheckCircle, 
  AlertTriangle, 
  Plane, 
  MapPin,
  MessageSquare,
  User,
  Plus,
  Filter,
  Search,
  RefreshCw,
  FileText,
  Phone,
  Mail,
  Globe,
  Utensils,
  Car,
  Bed,
  Fuel,
  Settings,
  Eye,
  Edit,
  Send,
  ArrowLeft,
  MoreHorizontal,
  CheckSquare,
  X,
  Bell,
  Calendar as CalendarIcon
} from 'lucide-react';
import { toast } from 'sonner';
import { useNotifications } from './hooks/useNotifications';

interface TripLeg {
  id: string;
  departure: string;
  arrival: string;
  departureTime: string;
  arrivalTime: string;
  aircraft: string;
  flightNumber: string;
  passengers: number;
  duration: number;
}

interface TripRequirement {
  id: string;
  category: 'catering' | 'ground-transport' | 'hotel' | 'fuel' | 'permits' | 'handling' | 'customs' | 'weather' | 'other';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'not-started' | 'in-progress' | 'pending-confirmation' | 'completed' | 'blocked';
  assignedTo: string;
  assignedScheduler: string;
  dueDate: string;
  completedDate?: string;
  notes: string;
  legId?: string;
  vendor?: string;
  cost?: number;
  confirmationNumber?: string;
}

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  dueDate?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignedTo: string;
  category: 'pre-flight' | 'catering' | 'ground-ops' | 'permits' | 'passenger-services' | 'fuel' | 'customs' | 'post-flight' | 'other';
  createdDate: string;
  completedDate?: string;
  notes: string;
}

interface Trip {
  id: string;
  tripNumber: string;
  clientName: string;
  leadScheduler: string;
  status: 'planning' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled';
  departureDate: string;
  returnDate: string;
  totalLegs: number;
  passengers: Array<{
    name: string;
    type: 'principal' | 'guest' | 'staff';
    specialRequests?: string;
  }>;
  legs: TripLeg[];
  requirements: TripRequirement[];
  checklist: ChecklistItem[];
  priority: 'standard' | 'vip' | 'urgent';
  budget?: number;
  notes: string;
  createdBy: string;
  createdDate: string;
  lastUpdated: string;
  activeSchedulers: string[];
}

interface SchedulerActivity {
  schedulerId: string;
  schedulerName: string;
  avatar: string;
  status: 'online' | 'away' | 'offline';
  currentTrip?: string;
  lastSeen: string;
}

interface TripComment {
  id: string;
  tripId: string;
  schedulerId: string;
  schedulerName: string;
  message: string;
  timestamp: string;
  requirementId?: string;
}

export default function TripCoordination() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'detail'>('grid');
  const [schedulerActivity, setSchedulerActivity] = useState<SchedulerActivity[]>([]);
  const [comments, setComments] = useState<TripComment[]>([]);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [newComment, setNewComment] = useState('');
  const [newChecklistItem, setNewChecklistItem] = useState({
    title: '',
    description: '',
    dueDate: '',
    priority: 'medium' as const,
    assignedTo: '',
    category: 'other' as const,
    notes: ''
  });
  const [showAddChecklist, setShowAddChecklist] = useState(false);
  const [showSetReminder, setShowSetReminder] = useState(false);
  const [newReminder, setNewReminder] = useState({
    title: '',
    message: '',
    reminderDate: '',
    reminderTime: '',
    priority: 'medium' as const,
    type: 'general' as 'general' | 'checklist' | 'deadline' | 'milestone'
  });
  
  // Get notification system functions
  const { addNotification } = useNotifications({ userRole: 'scheduling' });

  useEffect(() => {
    // Initialize with mock data
    const mockTrips: Trip[] = [
      {
        id: '1',
        tripNumber: 'TRP-2025-001',
        clientName: 'Johnson Executive Group',
        leadScheduler: 'Sarah Chen',
        status: 'planning',
        departureDate: '2025-02-15',
        returnDate: '2025-02-18',
        totalLegs: 4,
        passengers: [
          { name: 'Robert Johnson', type: 'principal', specialRequests: 'Vegetarian meals' },
          { name: 'Maria Johnson', type: 'principal', specialRequests: 'Wheelchair assistance' },
          { name: 'David Smith', type: 'staff' }
        ],
        legs: [
          {
            id: '1a',
            departure: 'KATL',
            arrival: 'LFPG',
            departureTime: '2025-02-15T14:00:00',
            arrivalTime: '2025-02-16T07:30:00',
            aircraft: 'N123GS (G650)',
            flightNumber: 'GS101',
            passengers: 3,
            duration: 8.5
          },
          {
            id: '1b',
            departure: 'LFPG',
            arrival: 'EGLL',
            departureTime: '2025-02-16T10:00:00',
            arrivalTime: '2025-02-16T10:30:00',
            aircraft: 'N123GS (G650)',
            flightNumber: 'GS102',
            passengers: 3,
            duration: 1.5
          },
          {
            id: '1c',
            departure: 'EGLL',
            arrival: 'EDDF',
            departureTime: '2025-02-17T15:00:00',
            arrivalTime: '2025-02-17T17:30:00',
            aircraft: 'N123GS (G650)',
            flightNumber: 'GS103',
            passengers: 3,
            duration: 2.5
          },
          {
            id: '1d',
            departure: 'EDDF',
            arrival: 'KATL',
            departureTime: '2025-02-18T09:00:00',
            arrivalTime: '2025-02-18T14:30:00',
            aircraft: 'N123GS (G650)',
            flightNumber: 'GS104',
            passengers: 3,
            duration: 10.5
          }
        ],
        requirements: [
          {
            id: 'req1',
            category: 'catering',
            title: 'Catering for KATL-LFPG',
            description: 'Dinner service for 3 passengers, vegetarian option required',
            priority: 'high',
            status: 'in-progress',
            assignedTo: 'Elite Catering Services',
            assignedScheduler: 'Sarah Chen',
            dueDate: '2025-02-13T17:00:00',
            notes: 'Confirmed vegetarian meal. Need final count.',
            legId: '1a',
            vendor: 'Elite Catering Services',
            cost: 450
          }
        ],
        checklist: [
          {
            id: 'check1',
            title: 'Confirm passenger dietary requirements',
            description: 'Contact passengers to confirm all dietary restrictions and preferences',
            completed: true,
            dueDate: '2025-02-10T12:00:00',
            priority: 'high',
            assignedTo: 'Sarah Chen',
            category: 'passenger-services',
            createdDate: '2025-02-05T09:00:00',
            completedDate: '2025-02-09T16:30:00',
            notes: 'Confirmed vegetarian for Robert, wheelchair assistance for Maria'
          },
          {
            id: 'check2',
            title: 'File international flight plans',
            description: 'Submit and confirm flight plans for all international legs',
            completed: false,
            dueDate: '2025-02-12T15:00:00',
            priority: 'critical',
            assignedTo: 'Mike Rodriguez',
            category: 'permits',
            createdDate: '2025-01-05T09:00:00',
            notes: 'Need to coordinate with European ATC'
          },
          {
            id: 'check3',
            title: 'Arrange VIP ground handling',
            description: 'Coordinate premium ground handling services at all airports',
            completed: false,
            dueDate: '2025-02-14T10:00:00',
            priority: 'medium',
            assignedTo: 'Lisa Thompson',
            category: 'ground-ops',
            createdDate: '2025-02-05T09:00:00',
            notes: 'Focus on wheelchair accessibility'
          }
        ],
        priority: 'vip',
        budget: 50000,
        notes: 'VIP clients with accessibility requirements. Handle with care.',
        createdBy: 'Sarah Chen',
        createdDate: '2025-02-05T09:00:00',
        lastUpdated: '2025-02-08T16:30:00',
        activeSchedulers: ['Sarah Chen', 'Mike Rodriguez', 'Lisa Thompson']
      },
      {
        id: '2',
        tripNumber: 'TRP-2025-002',
        clientName: 'Tech Innovations Inc',
        leadScheduler: 'Mike Rodriguez',
        status: 'confirmed',
        departureDate: '2025-02-20',
        returnDate: '2025-02-22',
        totalLegs: 2,
        passengers: [
          { name: 'Jennifer Liu', type: 'principal' },
          { name: 'Kevin Park', type: 'principal' },
          { name: 'Alex Chen', type: 'staff' },
          { name: 'Sarah Kim', type: 'staff' }
        ],
        legs: [
          {
            id: '2a',
            departure: 'KSFO',
            arrival: 'KJFK',
            departureTime: '2025-02-20T08:00:00',
            arrivalTime: '2025-02-20T16:30:00',
            aircraft: 'N456GS (G650)',
            flightNumber: 'GS201',
            passengers: 4,
            duration: 5.5
          },
          {
            id: '2b',
            departure: 'KJFK',
            arrival: 'KSFO',
            departureTime: '2025-02-22T14:00:00',
            arrivalTime: '2025-02-22T17:30:00',
            aircraft: 'N456GS (G650)',
            flightNumber: 'GS202',
            passengers: 4,
            duration: 6.5
          }
        ],
        requirements: [],
        checklist: [
          {
            id: 'check4',
            title: 'Confirm breakfast catering',
            description: 'Light breakfast service for morning departure',
            completed: true,
            priority: 'medium',
            assignedTo: 'Lisa Thompson',
            category: 'catering',
            createdDate: '2025-02-06T14:00:00',
            completedDate: '2025-02-07T10:00:00',
            notes: 'Continental breakfast confirmed with Sky Gourmet'
          }
        ],
        priority: 'standard',
        budget: 25000,
        notes: 'Regular business trip, standard service level.',
        createdBy: 'Mike Rodriguez',
        createdDate: '2025-02-06T14:00:00',
        lastUpdated: '2025-02-08T10:15:00',
        activeSchedulers: ['Mike Rodriguez', 'Lisa Thompson']
      },
      {
        id: '3',
        tripNumber: 'TRP-2025-003',
        clientName: 'Global Healthcare Partners',
        leadScheduler: 'Lisa Thompson',
        status: 'planning',
        departureDate: '2025-02-25',
        returnDate: '2025-02-27',
        totalLegs: 3,
        passengers: [
          { name: 'Dr. Michael Chen', type: 'principal' },
          { name: 'Dr. Sarah Williams', type: 'principal' }
        ],
        legs: [
          {
            id: '3a',
            departure: 'KJFK',
            arrival: 'LFPG',
            departureTime: '2025-02-25T18:00:00',
            arrivalTime: '2025-02-26T07:00:00',
            aircraft: 'N789GS (G650)',
            flightNumber: 'GS301',
            passengers: 2,
            duration: 8.0
          }
        ],
        requirements: [],
        checklist: [
          {
            id: 'check5',
            title: 'Medical equipment clearance',
            description: 'Ensure all medical equipment is properly cleared for transport',
            completed: false,
            dueDate: '2025-02-20T12:00:00',
            priority: 'critical',
            assignedTo: 'David Kim',
            category: 'customs',
            createdDate: '2025-02-08T09:00:00',
            notes: 'Special medical devices require customs pre-clearance'
          }
        ],
        priority: 'urgent',
        budget: 35000,
        notes: 'Medical professionals with specialized equipment.',
        createdBy: 'Lisa Thompson',
        createdDate: '2025-02-08T09:00:00',
        lastUpdated: '2025-02-08T16:00:00',
        activeSchedulers: ['Lisa Thompson', 'David Kim']
      }
    ];

    setTrips(mockTrips);

    // Mock scheduler activity
    const mockActivity: SchedulerActivity[] = [
      {
        schedulerId: '1',
        schedulerName: 'Sarah Chen',
        avatar: '/avatars/sarah.jpg',
        status: 'online',
        currentTrip: 'TRP-2025-001',
        lastSeen: 'now'
      },
      {
        schedulerId: '2',
        schedulerName: 'Mike Rodriguez',
        avatar: '/avatars/mike.jpg',
        status: 'online',
        currentTrip: 'TRP-2025-002',
        lastSeen: '2 minutes ago'
      },
      {
        schedulerId: '3',
        schedulerName: 'Lisa Thompson',
        avatar: '/avatars/lisa.jpg',
        status: 'away',
        lastSeen: '15 minutes ago'
      },
      {
        schedulerId: '4',
        schedulerName: 'David Kim',
        avatar: '/avatars/david.jpg',
        status: 'offline',
        lastSeen: '2 hours ago'
      }
    ];

    setSchedulerActivity(mockActivity);
  }, []);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      'planning': 'bg-purple-100 text-purple-800',
      'confirmed': 'bg-green-100 text-green-800',
      'in-progress': 'bg-blue-100 text-blue-800',
      'completed': 'bg-green-100 text-green-800',
      'cancelled': 'bg-red-100 text-red-800'
    };
    
    return <Badge className={variants[status] || 'bg-gray-100 text-gray-800'}>{status.replace('-', ' ')}</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, string> = {
      'low': 'bg-gray-100 text-gray-800',
      'medium': 'bg-yellow-100 text-yellow-800',
      'high': 'bg-orange-100 text-orange-800',
      'critical': 'bg-red-100 text-red-800',
      'standard': 'bg-blue-100 text-blue-800',
      'vip': 'bg-purple-100 text-purple-800',
      'urgent': 'bg-red-100 text-red-800'
    };
    
    return <Badge className={variants[priority]}>{priority}</Badge>;
  };

  const getChecklistProgress = (checklist: ChecklistItem[]) => {
    if (checklist.length === 0) return 100;
    const completed = checklist.filter(item => item.completed).length;
    return Math.round((completed / checklist.length) * 100);
  };

  const getUpcomingDeadlines = (trip: Trip) => {
    const now = new Date();
    const upcoming = trip.checklist
      .filter(item => !item.completed && item.dueDate)
      .filter(item => new Date(item.dueDate!) > now)
      .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
      .slice(0, 3);
    
    return upcoming;
  };

  const addChecklistItem = () => {
    if (!selectedTrip || !newChecklistItem.title.trim()) return;

    const checklistItem: ChecklistItem = {
      id: Date.now().toString(),
      title: newChecklistItem.title,
      description: newChecklistItem.description,
      completed: false,
      dueDate: newChecklistItem.dueDate || undefined,
      priority: newChecklistItem.priority,
      assignedTo: newChecklistItem.assignedTo,
      category: newChecklistItem.category,
      createdDate: new Date().toISOString(),
      notes: newChecklistItem.notes
    };

    const updatedTrip = {
      ...selectedTrip,
      checklist: [...selectedTrip.checklist, checklistItem],
      lastUpdated: new Date().toISOString()
    };

    setSelectedTrip(updatedTrip);
    setTrips(prev => prev.map(trip => 
      trip.id === selectedTrip.id ? updatedTrip : trip
    ));

    // Reset form
    setNewChecklistItem({
      title: '',
      description: '',
      dueDate: '',
      priority: 'medium',
      assignedTo: '',
      category: 'other',
      notes: ''
    });
    
    setShowAddChecklist(false);
    toast.success('Checklist item added');

    // Send notification if due date is set
    if (newChecklistItem.dueDate) {
      // This would integrate with the notification system
      console.log('Notification scheduled for:', newChecklistItem.dueDate);
    }
  };

  const toggleChecklistItem = (itemId: string) => {
    if (!selectedTrip) return;

    const updatedTrip = {
      ...selectedTrip,
      checklist: selectedTrip.checklist.map(item => 
        item.id === itemId 
          ? { 
              ...item, 
              completed: !item.completed,
              completedDate: !item.completed ? new Date().toISOString() : undefined
            }
          : item
      ),
      lastUpdated: new Date().toISOString()
    };

    setSelectedTrip(updatedTrip);
    setTrips(prev => prev.map(trip => 
      trip.id === selectedTrip.id ? updatedTrip : trip
    ));

    toast.success('Checklist item updated');
  };

  const setChecklistItemReminder = (item: ChecklistItem) => {
    if (!selectedTrip) return;

    // Auto-populate reminder form with checklist item details
    const reminderDate = item.dueDate 
      ? new Date(new Date(item.dueDate).getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 1 day before due date
      : new Date().toISOString().split('T')[0];

    setNewReminder({
      title: `Reminder: ${item.title}`,
      message: `Don't forget to complete: ${item.description || item.title}`,
      reminderDate: reminderDate,
      reminderTime: '09:00',
      priority: item.priority,
      type: 'checklist'
    });

    setShowSetReminder(true);
  };

  const createReminder = () => {
    if (!selectedTrip || !newReminder.title.trim() || !newReminder.reminderDate) return;

    // Combine date and time
    const reminderDateTime = newReminder.reminderTime 
      ? `${newReminder.reminderDate}T${newReminder.reminderTime}:00`
      : `${newReminder.reminderDate}T09:00:00`;

    const reminder = {
      title: newReminder.title,
      message: newReminder.message || `Reminder for ${selectedTrip.tripNumber}: ${newReminder.title}`,
      type: 'trip' as const,
      priority: newReminder.priority,
      timestamp: reminderDateTime,
      isRead: false,
      actionUrl: '/trip-coordination',
      actionText: 'View Trip',
      module: 'Trip Coordination',
      relatedId: selectedTrip.id,
      assignedBy: selectedTrip.leadScheduler
    };

    // Add to notification system
    addNotification(reminder);

    // Reset form
    setNewReminder({
      title: '',
      message: '',
      reminderDate: '',
      reminderTime: '',
      priority: 'medium',
      type: 'general'
    });
    
    setShowSetReminder(false);
    toast.success('Reminder set successfully');
  };

  const filteredTrips = trips.filter(trip => {
    const matchesStatus = filterStatus === 'all' || trip.status === filterStatus;
    const matchesSearch = trip.tripNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         trip.clientName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const enterTrip = (trip: Trip) => {
    setSelectedTrip(trip);
    setViewMode('detail');
  };

  const exitTrip = () => {
    setSelectedTrip(null);
    setViewMode('grid');
  };

  if (viewMode === 'detail' && selectedTrip) {
    return (
      <div className="p-6 space-y-6">
        {/* Header with back button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="outline" onClick={exitTrip}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Trips
            </Button>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-2xl font-semibold">{selectedTrip.tripNumber}</h1>
                {getPriorityBadge(selectedTrip.priority)}
                {getStatusBadge(selectedTrip.status)}
              </div>
              <p className="text-muted-foreground">
                {selectedTrip.clientName} • Lead: {selectedTrip.leadScheduler}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" onClick={() => setShowSetReminder(true)}>
              <Bell className="h-4 w-4 mr-2" />
              Set Reminder
            </Button>
            <Button>
              <Edit className="h-4 w-4 mr-2" />
              Edit Trip
            </Button>
          </div>
        </div>

        {/* Trip Overview Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{selectedTrip.totalLegs}</div>
              <div className="text-sm text-muted-foreground">Flight Legs</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{selectedTrip.passengers.length}</div>
              <div className="text-sm text-muted-foreground">Passengers</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{getChecklistProgress(selectedTrip.checklist)}%</div>
              <div className="text-sm text-muted-foreground">Complete</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{selectedTrip.checklist.length}</div>
              <div className="text-sm text-muted-foreground">Checklist Items</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{selectedTrip.activeSchedulers.length}</div>
              <div className="text-sm text-muted-foreground">Active Staff</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="checklist" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="checklist">Checklist</TabsTrigger>
            <TabsTrigger value="itinerary">Itinerary</TabsTrigger>
            <TabsTrigger value="passengers">Passengers</TabsTrigger>
            <TabsTrigger value="team">Team</TabsTrigger>
          </TabsList>

          <TabsContent value="checklist" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Trip Checklist</CardTitle>
                    <CardDescription>
                      Track and manage all tasks for this trip
                    </CardDescription>
                  </div>
                  <Button onClick={() => setShowAddChecklist(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Item
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {selectedTrip.checklist.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <CheckSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No checklist items yet</p>
                      <p className="text-sm">Add items to track trip preparation</p>
                    </div>
                  ) : (
                    selectedTrip.checklist.map((item) => (
                      <div key={item.id} className={`border rounded-lg p-4 ${item.completed ? 'bg-muted/50' : ''}`}>
                        <div className="flex items-start space-x-3">
                          <Checkbox
                            checked={item.completed}
                            onCheckedChange={() => toggleChecklistItem(item.id)}
                            className="mt-1"
                          />
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center justify-between">
                              <h4 className={`font-medium ${item.completed ? 'line-through text-muted-foreground' : ''}`}>
                                {item.title}
                              </h4>
                              <div className="flex items-center space-x-2">
                                {getPriorityBadge(item.priority)}
                                <Badge variant="outline" className="text-xs">
                                  {item.category.replace('-', ' ')}
                                </Badge>
                              </div>
                            </div>
                            {item.description && (
                              <p className={`text-sm ${item.completed ? 'line-through text-muted-foreground' : 'text-muted-foreground'}`}>
                                {item.description}
                              </p>
                            )}
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>Assigned to: {item.assignedTo}</span>
                              <div className="flex items-center space-x-2">
                                {item.dueDate && (
                                  <span className={new Date(item.dueDate) < new Date() && !item.completed ? 'text-red-600' : ''}>
                                    Due: {new Date(item.dueDate).toLocaleDateString()}
                                  </span>
                                )}
                                {!item.completed && item.dueDate && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 px-2 text-xs"
                                    onClick={() => setChecklistItemReminder(item)}
                                    title="Set reminder for this task"
                                  >
                                    <Bell className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            </div>
                            {item.notes && (
                              <div className="text-sm text-muted-foreground italic">
                                Note: {item.notes}
                              </div>
                            )}
                            {item.completed && item.completedDate && (
                              <div className="text-xs text-green-600">
                                Completed: {new Date(item.completedDate).toLocaleString()}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="itinerary" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Flight Itinerary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {selectedTrip.legs.map((leg, index) => (
                    <div key={leg.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline">Leg {index + 1}</Badge>
                          <span className="font-medium">{leg.flightNumber}</span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {leg.duration} hours
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center space-x-2">
                          <Plane className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium">{leg.departure}</div>
                            <div className="text-sm text-muted-foreground">
                              {new Date(leg.departureTime).toLocaleString()}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium">{leg.arrival}</div>
                            <div className="text-sm text-muted-foreground">
                              {new Date(leg.arrivalTime).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 text-sm text-muted-foreground">
                        Aircraft: {leg.aircraft} • Passengers: {leg.passengers}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="passengers" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Passenger Manifest</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {selectedTrip.passengers.map((passenger, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Avatar>
                          <AvatarFallback>
                            {passenger.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{passenger.name}</div>
                          <div className="text-sm text-muted-foreground capitalize">
                            {passenger.type.replace('-', ' ')}
                          </div>
                        </div>
                      </div>
                      {passenger.specialRequests && (
                        <Badge variant="outline">{passenger.specialRequests}</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="team" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Trip Team</CardTitle>
                <CardDescription>
                  Schedulers and staff working on this trip
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {selectedTrip.activeSchedulers.map((schedulerName, index) => {
                    const scheduler = schedulerActivity.find(s => s.schedulerName === schedulerName);
                    return (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="relative">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={scheduler?.avatar} />
                              <AvatarFallback>
                                {schedulerName.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            {scheduler && (
                              <div className={`absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-white ${
                                scheduler.status === 'online' ? 'bg-green-500' : 
                                scheduler.status === 'away' ? 'bg-yellow-500' : 'bg-gray-400'
                              }`} />
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-sm">{schedulerName}</div>
                            <div className="text-xs text-muted-foreground">
                              {scheduler?.status || 'offline'}
                            </div>
                          </div>
                        </div>
                        {schedulerName === selectedTrip.leadScheduler && (
                          <Badge variant="outline">Lead</Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Add Checklist Item Dialog */}
        <Dialog open={showAddChecklist} onOpenChange={setShowAddChecklist}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Checklist Item</DialogTitle>
              <DialogDescription>
                Create a new task for this trip
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Title</Label>
                <Input
                  value={newChecklistItem.title}
                  onChange={(e) => setNewChecklistItem(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter task title"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={newChecklistItem.description}
                  onChange={(e) => setNewChecklistItem(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe the task"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Priority</Label>
                  <Select 
                    value={newChecklistItem.priority} 
                    onValueChange={(value) => setNewChecklistItem(prev => ({ ...prev, priority: value as any }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Category</Label>
                  <Select 
                    value={newChecklistItem.category} 
                    onValueChange={(value) => setNewChecklistItem(prev => ({ ...prev, category: value as any }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pre-flight">Pre-flight</SelectItem>
                      <SelectItem value="catering">Catering</SelectItem>
                      <SelectItem value="ground-ops">Ground Operations</SelectItem>
                      <SelectItem value="permits">Permits</SelectItem>
                      <SelectItem value="passenger-services">Passenger Services</SelectItem>
                      <SelectItem value="fuel">Fuel</SelectItem>
                      <SelectItem value="customs">Customs</SelectItem>
                      <SelectItem value="post-flight">Post-flight</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Assigned To</Label>
                <Input
                  value={newChecklistItem.assignedTo}
                  onChange={(e) => setNewChecklistItem(prev => ({ ...prev, assignedTo: e.target.value }))}
                  placeholder="Assign to scheduler"
                />
              </div>
              <div>
                <Label>Due Date (Optional)</Label>
                <Input
                  type="datetime-local"
                  value={newChecklistItem.dueDate}
                  onChange={(e) => setNewChecklistItem(prev => ({ ...prev, dueDate: e.target.value }))}
                />
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea
                  value={newChecklistItem.notes}
                  onChange={(e) => setNewChecklistItem(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional notes"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowAddChecklist(false)}>
                  Cancel
                </Button>
                <Button onClick={addChecklistItem} disabled={!newChecklistItem.title.trim()}>
                  Add Item
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Set Reminder Dialog */}
        <Dialog open={showSetReminder} onOpenChange={setShowSetReminder}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Set Trip Reminder</DialogTitle>
              <DialogDescription>
                Create a reminder notification for {selectedTrip?.tripNumber}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {/* Quick Preset Options */}
              {selectedTrip && (
                <div>
                  <Label>Quick Reminders</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const depDate = new Date(selectedTrip.departureDate);
                        const reminderDate = new Date(depDate.getTime() - 24 * 60 * 60 * 1000);
                        setNewReminder({
                          title: 'Trip departure tomorrow',
                          message: `${selectedTrip.tripNumber} departs tomorrow. Final preparations needed.`,
                          reminderDate: reminderDate.toISOString().split('T')[0],
                          reminderTime: '09:00',
                          priority: 'high',
                          type: 'deadline'
                        });
                      }}
                      className="text-xs"
                    >
                      <Clock className="h-3 w-3 mr-1" />
                      1 Day Before
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const depDate = new Date(selectedTrip.departureDate);
                        const reminderDate = new Date(depDate.getTime() - 7 * 24 * 60 * 60 * 1000);
                        setNewReminder({
                          title: 'Trip preparation week',
                          message: `${selectedTrip.tripNumber} departs in one week. Begin final preparations.`,
                          reminderDate: reminderDate.toISOString().split('T')[0],
                          reminderTime: '09:00',
                          priority: 'medium',
                          type: 'milestone'
                        });
                      }}
                      className="text-xs"
                    >
                      <Calendar className="h-3 w-3 mr-1" />
                      1 Week Before
                    </Button>
                  </div>
                </div>
              )}
              
              <div>
                <Label>Reminder Title</Label>
                <Input
                  value={newReminder.title}
                  onChange={(e) => setNewReminder(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter reminder title"
                />
              </div>
              <div>
                <Label>Message (Optional)</Label>
                <Textarea
                  value={newReminder.message}
                  onChange={(e) => setNewReminder(prev => ({ ...prev, message: e.target.value }))}
                  placeholder="Additional reminder details"
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Reminder Date</Label>
                  <Input
                    type="date"
                    value={newReminder.reminderDate}
                    onChange={(e) => setNewReminder(prev => ({ ...prev, reminderDate: e.target.value }))}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div>
                  <Label>Reminder Time</Label>
                  <Input
                    type="time"
                    value={newReminder.reminderTime}
                    onChange={(e) => setNewReminder(prev => ({ ...prev, reminderTime: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Priority</Label>
                  <Select 
                    value={newReminder.priority} 
                    onValueChange={(value) => setNewReminder(prev => ({ ...prev, priority: value as any }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Reminder Type</Label>
                  <Select 
                    value={newReminder.type} 
                    onValueChange={(value) => setNewReminder(prev => ({ ...prev, type: value as any }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="checklist">Checklist</SelectItem>
                      <SelectItem value="deadline">Deadline</SelectItem>
                      <SelectItem value="milestone">Milestone</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {newReminder.title && newReminder.reminderDate && (
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                  <div className="flex items-start space-x-2">
                    <CalendarIcon className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-blue-800">
                      <p className="font-medium">Reminder Preview:</p>
                      <p>{newReminder.title}</p>
                      <p className="text-xs mt-1">
                        Scheduled for: {new Date(`${newReminder.reminderDate}T${newReminder.reminderTime || '09:00'}`).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowSetReminder(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={createReminder} 
                  disabled={!newReminder.title.trim() || !newReminder.reminderDate}
                >
                  <Bell className="h-4 w-4 mr-2" />
                  Set Reminder
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Grid view - main trip tiles
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Trip Coordination</h1>
          <p className="text-muted-foreground">
            Manage and coordinate upcoming trips
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Trip
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search trips..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="planning">Planning</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="in-progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Active Schedulers Bar */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Active Schedulers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            {schedulerActivity.map((scheduler) => (
              <div key={scheduler.schedulerId} className="flex items-center space-x-2">
                <div className="relative">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={scheduler.avatar} alt={scheduler.schedulerName} />
                    <AvatarFallback>{scheduler.schedulerName.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                  </Avatar>
                  <div className={`absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-white ${
                    scheduler.status === 'online' ? 'bg-green-500' : 
                    scheduler.status === 'away' ? 'bg-yellow-500' : 'bg-gray-400'
                  }`} />
                </div>
                <div className="text-sm">
                  <div className="font-medium">{scheduler.schedulerName}</div>
                  <div className="text-muted-foreground text-xs">
                    {scheduler.currentTrip ? `Working on ${scheduler.currentTrip}` : scheduler.lastSeen}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Trip Tiles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTrips.map((trip) => {
          const checklistProgress = getChecklistProgress(trip.checklist);
          const upcomingDeadlines = getUpcomingDeadlines(trip);
          
          return (
            <Card 
              key={trip.id} 
              className="aviation-card hover:aviation-shadow cursor-pointer transition-all duration-200 hover:scale-[1.02]"
              onClick={() => enterTrip(trip)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <h3 className="font-semibold">{trip.tripNumber}</h3>
                    {getPriorityBadge(trip.priority)}
                  </div>
                  {getStatusBadge(trip.status)}
                </div>
                <p className="text-sm text-muted-foreground">{trip.clientName}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Trip Stats */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="text-lg font-bold">{trip.totalLegs}</div>
                    <div className="text-xs text-muted-foreground">Legs</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold">{trip.passengers.length}</div>
                    <div className="text-xs text-muted-foreground">PAX</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold">{trip.checklist.length}</div>
                    <div className="text-xs text-muted-foreground">Tasks</div>
                  </div>
                </div>

                {/* Dates */}
                <div className="text-sm">
                  <div className="flex items-center space-x-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {new Date(trip.departureDate).toLocaleDateString()} - {new Date(trip.returnDate).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Checklist Progress */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Checklist Progress</span>
                    <span>{checklistProgress}%</span>
                  </div>
                  <Progress value={checklistProgress} className="h-2" />
                </div>

                {/* Upcoming Deadlines */}
                {upcomingDeadlines.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-orange-600 flex items-center">
                      <Bell className="h-3 w-3 mr-1" />
                      Upcoming Deadlines
                    </div>
                    <div className="space-y-1">
                      {upcomingDeadlines.map((deadline) => (
                        <div key={deadline.id} className="text-xs bg-orange-50 p-2 rounded">
                          <div className="font-medium">{deadline.title}</div>
                          <div className="text-muted-foreground">
                            Due: {new Date(deadline.dueDate!).toLocaleDateString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Team */}
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <div className="flex -space-x-1">
                    {trip.activeSchedulers.slice(0, 3).map((scheduler, index) => (
                      <Avatar key={index} className="h-6 w-6 border border-background">
                        <AvatarFallback className="text-xs">
                          {scheduler.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                    {trip.activeSchedulers.length > 3 && (
                      <div className="h-6 w-6 rounded-full bg-muted border border-background flex items-center justify-center text-xs">
                        +{trip.activeSchedulers.length - 3}
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Lead: {trip.leadScheduler.split(' ')[0]}
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredTrips.length === 0 && (
        <Card>
          <CardContent className="flex items-center justify-center h-32">
            <div className="text-center text-muted-foreground">
              <Plane className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No trips found</p>
              <p className="text-sm">Try adjusting your filters</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}