import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Separator } from './ui/separator';
import { Alert, AlertDescription } from './ui/alert';
import { toast } from "sonner";
import {
  Plus,
  Calendar,
  Users,
  Clock,
  MessageSquare,
  Send,
  CheckCircle,
  Plane,
  Hotel,
  Car,
  Building,
  Coffee,
  X,
  Mail,
  UserMinus,
  CalendarDays,
  Download,
  Upload,
  ChevronLeft,
  ChevronRight,
  Filter,
  MapPin,
  Eye,
  Edit,
  Bell,
  AlertTriangle,
  DollarSign,
  Navigation,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { format, addDays, differenceInDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek } from 'date-fns';

interface Trip {
  id: string;
  tripName: string;
  clientName: string;
  status: 'requested' | 'approved' | 'in-progress' | 'completed' | 'cancelled';
  requestedDate: Date;
  departureDate: Date;
  returnDate: Date;
  passengers: Passenger[];
  itinerary: ItineraryItem[];
  messages: Message[];
  priority: 'low' | 'medium' | 'high';
  estimatedCost?: number;
  actualCost?: number;
  notes: string;
  approvedBy?: string;
  approvedDate?: Date;
  lockoutDays: number;
  isLocked: boolean;
}

interface Passenger {
  id: string;
  name: string;
  email: string;
  phone: string;
  dietaryRestrictions?: string;
  specialRequests?: string;
  formSent?: boolean;
  formCompleted?: boolean;
  inDatabase?: boolean;
}

interface ItineraryItem {
  id: string;
  type: 'flight' | 'meeting' | 'hotel' | 'transportation' | 'meal' | 'activity';
  title: string;
  description: string;
  startTime: Date;
  endTime: Date;
  location: string;
  notes?: string;
  confirmed: boolean;
  cost?: number;
  vendor?: string;
}

interface Message {
  id: string;
  sender: string;
  senderRole: string;
  content: string;
  timestamp: Date;
  isRead: boolean;
}

interface OutlookEvent {
  id: string;
  subject: string;
  start: Date;
  end: Date;
  location?: string;
  attendees: string[];
  body: string;
  isAllDay: boolean;
}

export default function BookingProfile() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'agenda'>('month');
  const [isCreateTripOpen, setIsCreateTripOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isTripDetailOpen, setIsTripDetailOpen] = useState(false);
  const [isFloatingCardOpen, setIsFloatingCardOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'requested' | 'approved' | 'in-progress' | 'completed'>('all');
  const [outlookEvents, setOutlookEvents] = useState<OutlookEvent[]>([]);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [newPassengerEmails, setNewPassengerEmails] = useState<{ [key: string]: string }>({});
  const [newMessages, setNewMessages] = useState<{ [key: string]: string }>({});
  const [newItineraryItems, setNewItineraryItems] = useState<{ [key: string]: any }>({});

  const [newTrip, setNewTrip] = useState({
    tripName: '',
    clientName: '',
    departureDate: '',
    returnDate: '',
    priority: 'medium' as const,
    notes: '',
    lockoutDays: 3
  });

  const [newPassengerEmail, setNewPassengerEmail] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [newItineraryItem, setNewItineraryItem] = useState({
    type: 'meeting' as const,
    title: '',
    startTime: '',
    endTime: '',
    location: '',
    cost: ''
  });

  // Mock passenger database
  const mockPassengerDatabase = [
    { email: 'john@techcorp.com', name: 'John Smith', phone: '+1-555-0123' },
    { email: 'sarah@techcorp.com', name: 'Sarah Johnson', phone: '+1-555-0124' },
    { email: 'mchen@dataflow.com', name: 'Michael Chen', phone: '+1-555-0125' }
  ];

  // Mock data
  useEffect(() => {
    const mockTrips: Trip[] = [
      {
        id: 'trip-1',
        tripName: 'Executive Board Meeting',
        clientName: 'TechCorp Inc.',
        status: 'approved',
        requestedDate: new Date('2025-01-25T10:00:00'),
        departureDate: new Date('2025-02-15T08:00:00'),
        returnDate: new Date('2025-02-17T18:00:00'),
        passengers: [
          { id: 'p1', name: 'John Smith', email: 'john@techcorp.com', phone: '+1-555-0123', inDatabase: true, formCompleted: true },
          { id: 'p2', name: 'Sarah Johnson', email: 'sarah@techcorp.com', phone: '+1-555-0124', inDatabase: true, formCompleted: true }
        ],
        itinerary: [
          {
            id: 'i1', type: 'flight', title: 'Departure Flight - Gulfstream G650', description: 'LAX to MIA via G650',
            startTime: new Date('2025-02-15T08:00:00'), endTime: new Date('2025-02-15T13:30:00'),
            location: 'LAX Terminal 4', confirmed: true, cost: 25000, vendor: 'Flight Operations'
          },
          {
            id: 'i2', type: 'hotel', title: 'Four Seasons Miami', description: '2 Ocean View Suites',
            startTime: new Date('2025-02-15T15:00:00'), endTime: new Date('2025-02-17T11:00:00'),
            location: '1435 Brickell Ave, Miami, FL', confirmed: true, cost: 1200, vendor: 'Four Seasons'
          },
          {
            id: 'i3', type: 'meeting', title: 'Board Meeting', description: 'Q4 Strategy Session',
            startTime: new Date('2025-02-16T09:00:00'), endTime: new Date('2025-02-16T17:00:00'),
            location: 'Four Seasons Conference Room A', confirmed: true, cost: 500
          }
        ],
        messages: [
          {
            id: 'm1', sender: 'Sarah Wilson', senderRole: 'admin-assistant',
            content: 'Trip approved and ready for execution.',
            timestamp: new Date('2025-01-25T10:30:00'), isRead: true
          },
          {
            id: 'm2', sender: 'Mike Johnson', senderRole: 'scheduling',
            content: 'Gulfstream G650 (N1PG) confirmed and ready. All systems go!',
            timestamp: new Date('2025-01-26T14:15:00'), isRead: true
          }
        ],
        priority: 'high',
        estimatedCost: 30000,
        actualCost: 26850,
        notes: 'VIP client - premium service required',
        approvedBy: 'Mike Johnson',
        approvedDate: new Date('2025-01-26T14:15:00'),
        lockoutDays: 3,
        isLocked: false
      },
      {
        id: 'trip-2',
        tripName: 'Site Visit Austin',
        clientName: 'DataFlow Solutions',
        status: 'requested',
        requestedDate: new Date('2025-02-01T09:00:00'),
        departureDate: new Date('2025-03-05T10:00:00'),
        returnDate: new Date('2025-03-06T16:00:00'),
        passengers: [
          { id: 'p3', name: 'Michael Chen', email: 'mchen@dataflow.com', phone: '+1-555-0125', inDatabase: true, formCompleted: false, formSent: true }
        ],
        itinerary: [],
        messages: [
          {
            id: 'm3', sender: 'Sarah Wilson', senderRole: 'admin-assistant',
            content: 'Awaiting scheduling approval for single-day G650 trip.',
            timestamp: new Date('2025-02-01T09:15:00'), isRead: false
          }
        ],
        priority: 'medium',
        notes: 'Simple day trip',
        lockoutDays: 3,
        isLocked: false
      },
      {
        id: 'trip-3',
        tripName: 'Client Presentation',
        clientName: 'Innovation Labs',
        status: 'in-progress',
        requestedDate: new Date('2025-01-20T14:00:00'),
        departureDate: new Date('2025-02-10T09:00:00'),
        returnDate: new Date('2025-02-11T20:00:00'),
        passengers: [
          { id: 'p4', name: 'Emily Davis', email: 'emily@innovationlabs.com', phone: '+1-555-0126', inDatabase: false, formCompleted: true, formSent: true }
        ],
        itinerary: [
          {
            id: 'i4', type: 'flight', title: 'Morning Departure - Gulfstream G650', description: 'LAX to SFO via G650',
            startTime: new Date('2025-02-10T09:00:00'), endTime: new Date('2025-02-10T10:30:00'),
            location: 'LAX Terminal 4', confirmed: true, cost: 8500
          },
          {
            id: 'i5', type: 'meeting', title: 'Client Presentation', description: 'New Product Demo',
            startTime: new Date('2025-02-10T14:00:00'), endTime: new Date('2025-02-10T17:00:00'),
            location: 'Innovation Labs HQ', confirmed: true, cost: 0
          }
        ],
        messages: [],
        priority: 'high',
        estimatedCost: 15000,
        notes: 'Important new client',
        approvedBy: 'Mike Johnson',
        approvedDate: new Date('2025-01-21T09:00:00'),
        lockoutDays: 3,
        isLocked: true
      }
    ];
    setTrips(mockTrips);

    // Mock Outlook events
    const mockOutlookEvents: OutlookEvent[] = [
      {
        id: 'outlook-1',
        subject: 'Team Meeting',
        start: new Date('2025-02-12T10:00:00'),
        end: new Date('2025-02-12T11:00:00'),
        location: 'Conference Room A',
        attendees: ['team@company.com'],
        body: 'Weekly team sync',
        isAllDay: false
      },
      {
        id: 'outlook-2',
        subject: 'Client Call',
        start: new Date('2025-02-14T14:00:00'),
        end: new Date('2025-02-14T15:00:00'),
        location: 'Remote',
        attendees: ['client@company.com'],
        body: 'Project status update',
        isAllDay: false
      }
    ];
    setOutlookEvents(mockOutlookEvents);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-500';
      case 'in-progress': return 'bg-blue-500';
      case 'completed': return 'bg-gray-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-yellow-500';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-l-red-500';
      case 'medium': return 'border-l-yellow-500';
      default: return 'border-l-blue-500';
    }
  };

  const getCalendarDays = () => {
    const start = startOfWeek(startOfMonth(currentDate));
    const end = endOfWeek(endOfMonth(currentDate));
    return eachDayOfInterval({ start, end });
  };

  const getTripsForDay = (day: Date) => {
    return trips.filter(trip => {
      if (filter !== 'all' && trip.status !== filter) return false;

      const tripStart = new Date(trip.departureDate);
      const tripEnd = new Date(trip.returnDate);

      return day >= new Date(tripStart.getFullYear(), tripStart.getMonth(), tripStart.getDate()) &&
        day <= new Date(tripEnd.getFullYear(), tripEnd.getMonth(), tripEnd.getDate());
    });
  };

  const getOutlookEventsForDay = (day: Date) => {
    return outlookEvents.filter(event =>
      isSameDay(event.start, day)
    );
  };

  const handleTripClick = (trip: Trip) => {
    setSelectedTrip(trip);
    setIsFloatingCardOpen(true);
    toast(`Opening ${trip.tripName}`, {
      description: "Managing trip details and itinerary",
      duration: 2000
    });
  };

  const checkPassengerInDatabase = (email: string) => {
    return mockPassengerDatabase.find(p => p.email.toLowerCase() === email.toLowerCase());
  };

  const toggleCardExpansion = (tripId: string) => {
    const newExpanded = new Set(expandedCards);
    if (newExpanded.has(tripId)) {
      newExpanded.delete(tripId);
    } else {
      newExpanded.add(tripId);
    }
    setExpandedCards(newExpanded);
  };

  const handleAddPassenger = (tripId: string) => {
    const email = newPassengerEmails[tripId];
    if (!email) return;

    const existingPassenger = checkPassengerInDatabase(email);
    const passenger: Passenger = {
      id: `passenger-${Date.now()}`,
      email: email,
      name: existingPassenger?.name || email.split('@')[0],
      phone: existingPassenger?.phone || '',
      inDatabase: !!existingPassenger,
      formSent: !existingPassenger,
      formCompleted: !!existingPassenger
    };

    setTrips(trips.map(trip =>
      trip.id === tripId
        ? { ...trip, passengers: [...trip.passengers, passenger] }
        : trip
    ));

    setNewPassengerEmails({ ...newPassengerEmails, [tripId]: '' });

    toast(existingPassenger ? "Passenger added from database" : "Passenger added - form sent", {
      description: existingPassenger
        ? `${passenger.name} was found in the database`
        : `Passenger information form sent to ${email}`
    });

    // Update selected trip if it's the same one
    if (selectedTrip?.id === tripId) {
      setSelectedTrip({
        ...selectedTrip,
        passengers: [...selectedTrip.passengers, passenger]
      });
    }
  };

  const handleRemovePassenger = (tripId: string, passengerId: string) => {
    setTrips(trips.map(trip =>
      trip.id === tripId
        ? { ...trip, passengers: trip.passengers.filter(p => p.id !== passengerId) }
        : trip
    ));
    toast("Passenger removed", { description: "Passenger has been removed from the trip" });

    // Update selected trip if it's the same one
    if (selectedTrip?.id === tripId) {
      setSelectedTrip({
        ...selectedTrip,
        passengers: selectedTrip.passengers.filter(p => p.id !== passengerId)
      });
    }
  };

  const handleAddItineraryItem = (tripId: string) => {
    const newItem = newItineraryItems[tripId];
    if (!newItem?.title || !newItem?.startTime || !newItem?.endTime) return;

    const item: ItineraryItem = {
      id: `item-${Date.now()}`,
      type: newItem.type || 'meeting',
      title: newItem.title,
      description: newItem.description || '',
      startTime: new Date(newItem.startTime),
      endTime: new Date(newItem.endTime),
      location: newItem.location || '',
      confirmed: false,
      cost: newItem.cost ? parseFloat(newItem.cost) : undefined,
      vendor: newItem.vendor || undefined
    };

    const updatedItinerary = [...trips.find(t => t.id === tripId)!.itinerary, item].sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

    setTrips(trips.map(trip =>
      trip.id === tripId
        ? { ...trip, itinerary: updatedItinerary }
        : trip
    ));

    setNewItineraryItems({ ...newItineraryItems, [tripId]: {} });
    toast("Itinerary item added", { description: `${item.title} added to itinerary` });

    // Update selected trip if it's the same one
    if (selectedTrip?.id === tripId) {
      setSelectedTrip({
        ...selectedTrip,
        itinerary: updatedItinerary
      });
    }
  };

  const handleSendMessage = (tripId: string) => {
    const message = newMessages[tripId];
    if (!message?.trim()) return;

    const newMessageObj: Message = {
      id: `msg-${Date.now()}`,
      sender: 'Sarah Wilson',
      senderRole: 'admin-assistant',
      content: message,
      timestamp: new Date(),
      isRead: true
    };

    setTrips(trips.map(trip =>
      trip.id === tripId
        ? { ...trip, messages: [...trip.messages, newMessageObj] }
        : trip
    ));

    setNewMessages({ ...newMessages, [tripId]: '' });
    toast("Message sent", { description: "Your message has been sent to scheduling" });

    // Update selected trip if it's the same one
    if (selectedTrip?.id === tripId) {
      setSelectedTrip({
        ...selectedTrip,
        messages: [...selectedTrip.messages, newMessageObj]
      });
    }
  };

  const handleCreateTrip = () => {
    if (!newTrip.tripName || !newTrip.clientName || !newTrip.departureDate || !newTrip.returnDate) {
      toast("Missing information", { description: "Please fill in all required fields" });
      return;
    }

    const trip: Trip = {
      id: `trip-${Date.now()}`,
      tripName: newTrip.tripName,
      clientName: newTrip.clientName,
      status: 'requested',
      requestedDate: new Date(),
      departureDate: new Date(newTrip.departureDate),
      returnDate: new Date(newTrip.returnDate),
      passengers: [],
      itinerary: [],
      messages: [{
        id: `msg-${Date.now()}`,
        sender: 'Sarah Wilson',
        senderRole: 'admin-assistant',
        content: `New trip request: ${newTrip.tripName}`,
        timestamp: new Date(),
        isRead: true
      }],
      priority: newTrip.priority,
      notes: newTrip.notes,
      lockoutDays: newTrip.lockoutDays,
      isLocked: false
    };

    setTrips([...trips, trip]);
    setNewTrip({
      tripName: '', clientName: '', departureDate: '', returnDate: '',
      priority: 'medium', notes: '', lockoutDays: 3
    });
    setIsCreateTripOpen(false);
    toast("Trip request created", { description: "Your trip request has been submitted" });
  };

  const handleImportOutlook = async () => {
    toast("Importing from Outlook...", { description: "Connecting to Microsoft Graph API" });

    setTimeout(() => {
      const importedEvent: OutlookEvent = {
        id: `outlook-${Date.now()}`,
        subject: 'Imported Meeting',
        start: new Date('2025-02-20T10:00:00'),
        end: new Date('2025-02-20T12:00:00'),
        location: 'New York Office',
        attendees: ['imported@company.com'],
        body: 'Imported from Outlook calendar',
        isAllDay: false
      };

      setOutlookEvents([...outlookEvents, importedEvent]);
      setIsImportOpen(false);
      toast("Import successful", { description: "Calendar events imported from Outlook" });
    }, 2000);
  };

  const handleExportToOutlook = (trip: Trip) => {
    const startDate = format(trip.departureDate, "yyyyMMdd'T'HHmmss");
    const endDate = format(trip.returnDate, "yyyyMMdd'T'HHmmss");
    const title = encodeURIComponent(trip.tripName);
    const description = encodeURIComponent(`Client: ${trip.clientName}\n\nPassengers: ${trip.passengers.map(p => p.name).join(', ')}\n\nItinerary:\n${trip.itinerary.map(item => `${format(item.startTime, 'MMM dd, HH:mm')} - ${item.title}`).join('\n')}`);

    const outlookUrl = `https://outlook.live.com/calendar/0/deeplink/compose?subject=${title}&startdt=${startDate}&enddt=${endDate}&body=${description}`;
    window.open(outlookUrl, '_blank');
    toast("Export initiated", { description: "Opening Outlook calendar" });
  };

  const getUnreadCount = (trip: Trip) => {
    return trip.messages.filter(m => !m.isRead && m.senderRole !== 'admin-assistant').length;
  };

  const getItemIcon = (type: string) => {
    switch (type) {
      case 'flight': return <Plane className="w-3 h-3" />;
      case 'hotel': return <Hotel className="w-3 h-3" />;
      case 'transportation': return <Car className="w-3 h-3" />;
      case 'meeting': return <Building className="w-3 h-3" />;
      case 'meal': return <Coffee className="w-3 h-3" />;
      default: return <Calendar className="w-3 h-3" />;
    }
  };

  const renderCalendarView = () => {
    const days = getCalendarDays();

    return (
      <div className="grid grid-cols-7 gap-1">
        {/* Header */}
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="p-2 text-center font-medium text-sm bg-muted">
            {day}
          </div>
        ))}

        {/* Days */}
        {days.map(day => {
          const dayTrips = getTripsForDay(day);
          const outlookEvents = getOutlookEventsForDay(day);
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isToday = isSameDay(day, new Date());

          return (
            <div
              key={day.toString()}
              className={`min-h-24 p-1 border border-border/50 ${!isCurrentMonth ? 'bg-muted/30 text-muted-foreground' : 'bg-background'
                } ${isToday ? 'ring-2 ring-primary/50' : ''}`}
            >
              <div className={`text-sm mb-1 ${isToday ? 'font-bold' : ''}`}>
                {format(day, 'd')}
              </div>

              {/* Trip Events */}
              {dayTrips.map(trip => {
                const isStartDay = isSameDay(day, trip.departureDate);
                const isEndDay = isSameDay(day, trip.returnDate);

                return (
                  <div
                    key={trip.id}
                    className={`text-xs p-1 mb-1 rounded cursor-pointer border-l-2 ${getPriorityColor(trip.priority)} bg-white hover:bg-blue-50 hover:shadow-sm transition-all group transform hover:scale-105`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTripClick(trip);
                    }}
                    title={`Click to manage ${trip.tripName}`}
                  >
                    <div className="flex items-center gap-1">
                      <div className={`w-2 h-2 rounded-full ${getStatusColor(trip.status)} group-hover:scale-110 transition-transform`}></div>
                      <Plane className="w-3 h-3 text-blue-600 group-hover:text-blue-700" />
                      <span className="font-medium truncate flex-1 group-hover:text-blue-800">{trip.tripName}</span>
                    </div>
                    <div className="text-muted-foreground truncate group-hover:text-blue-600">{trip.clientName}</div>
                    <div className="flex items-center gap-1 text-muted-foreground group-hover:text-blue-600">
                      {isStartDay && <span className="text-xs font-medium">✈️ Depart</span>}
                      {isEndDay && <span className="text-xs font-medium">🛬 Return</span>}
                      {!isStartDay && !isEndDay && <span className="text-xs">✈️ Travel</span>}
                      <span className="ml-auto font-medium">{trip.passengers.length}p</span>
                    </div>
                  </div>
                );
              })}

              {/* Outlook Events */}
              {outlookEvents.map(event => (
                <div
                  key={event.id}
                  className="text-xs p-1 mb-1 rounded bg-blue-50 border-l-2 border-l-blue-300"
                >
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-blue-500" />
                    <span className="font-medium truncate">{event.subject}</span>
                  </div>
                  <span className="text-muted-foreground truncate block">
                    {format(event.start, 'HH:mm')} - Outlook
                  </span>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    );
  };

  const filteredTrips = trips.filter(trip =>
    filter === 'all' || trip.status === filter
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-medium">Trip Calendar</h1>
          <p className="text-sm text-muted-foreground">
            Manage client trips and sync with Outlook calendar
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Select value={filter} onValueChange={(value: any) => setFilter(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Trips</SelectItem>
              <SelectItem value="requested">Requested</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="in-progress">Active</SelectItem>
              <SelectItem value="completed">Complete</SelectItem>
            </SelectContent>
          </Select>

          <Select value={viewMode} onValueChange={(value: any) => setViewMode(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">Month</SelectItem>
              <SelectItem value="week">Week</SelectItem>
              <SelectItem value="agenda">Agenda</SelectItem>
            </SelectContent>
          </Select>

          <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Upload className="w-4 h-4 mr-1" />
                Import Outlook
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Import from Outlook Calendar</DialogTitle>
                <DialogDescription>
                  Connect to your Outlook calendar to import existing events and meetings
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <Alert>
                  <Calendar className="h-4 w-4" />
                  <AlertDescription>
                    This will connect to your Microsoft 365 account using Microsoft Graph API to import calendar events.
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <Label>Import Options</Label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" id="meetings" defaultChecked />
                      <label htmlFor="meetings" className="text-sm">Import meetings and appointments</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" id="travel" defaultChecked />
                      <label htmlFor="travel" className="text-sm">Import travel-related events</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" id="recurring" />
                      <label htmlFor="recurring" className="text-sm">Import recurring events</label>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Date Range</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input type="date" placeholder="Start date" />
                    <Input type="date" placeholder="End date" />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsImportOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleImportOutlook}>
                  <Upload className="w-4 h-4 mr-1" />
                  Import from Outlook
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isCreateTripOpen} onOpenChange={setIsCreateTripOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-1" />
                New Trip
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Trip Request</DialogTitle>
                <DialogDescription>Submit new trip for scheduling approval</DialogDescription>
              </DialogHeader>
              <div className="space-y-3 py-4">
                <div className="space-y-1">
                  <Label htmlFor="tripName">Trip Name</Label>
                  <Input
                    id="tripName"
                    value={newTrip.tripName}
                    onChange={(e) => setNewTrip({ ...newTrip, tripName: e.target.value })}
                    placeholder="Executive Meeting - Miami"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="clientName">Client Name</Label>
                  <Input
                    id="clientName"
                    value={newTrip.clientName}
                    onChange={(e) => setNewTrip({ ...newTrip, clientName: e.target.value })}
                    placeholder="Company or Individual"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="departureDate">Departure</Label>
                    <Input
                      id="departureDate"
                      type="datetime-local"
                      value={newTrip.departureDate}
                      onChange={(e) => setNewTrip({ ...newTrip, departureDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="returnDate">Return</Label>
                    <Input
                      id="returnDate"
                      type="datetime-local"
                      value={newTrip.returnDate}
                      onChange={(e) => setNewTrip({ ...newTrip, returnDate: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Priority</Label>
                  <Select value={newTrip.priority} onValueChange={(value: any) => setNewTrip({ ...newTrip, priority: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Notes</Label>
                  <Textarea
                    value={newTrip.notes}
                    onChange={(e) => setNewTrip({ ...newTrip, notes: e.target.value })}
                    placeholder="Special requirements..."
                    rows={2}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateTripOpen(false)}>Cancel</Button>
                <Button onClick={handleCreateTrip}>Submit Request</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Calendar Navigation */}
      {viewMode === 'month' && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentDate(subMonths(currentDate, 1))}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <h2 className="font-medium">
              {format(currentDate, 'MMMM yyyy')}
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentDate(addMonths(currentDate, 1))}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentDate(new Date())}
          >
            Today
          </Button>
        </div>
      )}

      {/* Calendar View */}
      <div className="bg-white rounded-lg border">
        {viewMode === 'month' && renderCalendarView()}
      </div>

      {/* Trip Cards Below Calendar */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium">Trip Cards</h2>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Plane className="w-4 h-4 text-blue-500" />
              <span>Click calendar events or cards to manage trips</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTrips.map((trip) => {
            const isExpanded = expandedCards.has(trip.id);
            const unreadCount = getUnreadCount(trip);

            return (
              <Card
                key={trip.id}
                className="relative cursor-pointer hover:shadow-lg hover:shadow-blue-100 transition-all transform hover:scale-[1.02] border-l-4 border-l-transparent hover:border-l-blue-500"
                onClick={(e) => {
                  e.stopPropagation();
                  handleTripClick(trip);
                }}
                title={`Click to manage ${trip.tripName}`}
              >
                <CardContent className="p-4">
                  {/* Header Row */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Plane className="w-4 h-4 text-blue-600" />
                        <h3 className="font-medium text-sm">{trip.tripName}</h3>
                        <Badge className={`text-xs ${getStatusColor(trip.status)} text-white`}>{trip.status}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{trip.clientName}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge className={`text-xs ${getPriorityColor(trip.priority).replace('border-l-', 'border-')}`} variant="outline">
                        {trip.priority}
                      </Badge>
                      {unreadCount > 0 && (
                        <Badge variant="outline" className="text-red-600 text-xs">{unreadCount}</Badge>
                      )}
                    </div>
                  </div>

                  {/* Summary Info */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-muted-foreground" />
                      <span>{format(trip.departureDate, 'MMM dd')} - {format(trip.returnDate, 'MMM dd')}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="w-3 h-3 text-muted-foreground" />
                      <span>{trip.passengers.length} passengers</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-muted-foreground" />
                      <span>{trip.itinerary.length} items</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageSquare className="w-3 h-3 text-muted-foreground" />
                      <span>{trip.messages.length} messages</span>
                    </div>
                  </div>

                  {trip.estimatedCost && (
                    <div className="mt-2 pt-2 border-t">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Estimated Cost</span>
                        <span className="font-medium">${trip.estimatedCost.toLocaleString()}</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {filteredTrips.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Plane className="w-12 h-12 text-muted-foreground mb-3 opacity-50" />
              <h3 className="font-medium mb-2">No trips found</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {filter === 'all'
                  ? 'Create your first trip request to get started'
                  : `No trips with status "${filter}"`
                }
              </p>
              {filter === 'all' && (
                <Button onClick={() => setIsCreateTripOpen(true)}>
                  <Plus className="w-4 h-4 mr-1" />
                  Create Trip Request
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Floating Trip Detail Card */}
      {isFloatingCardOpen && selectedTrip && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in-0 duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsFloatingCardOpen(false);
            }
          }}
        >
          <div className="bg-white rounded-lg shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-in slide-in-from-bottom-4 duration-300">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-50 to-blue-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500 rounded-full">
                  <Plane className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="font-medium text-lg">{selectedTrip.tripName}</h2>
                  <p className="text-sm text-muted-foreground">{selectedTrip.clientName}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={`${getStatusColor(selectedTrip.status)} text-white`}>
                    {selectedTrip.status}
                  </Badge>
                  <Badge variant="outline" className={getPriorityColor(selectedTrip.priority).replace('border-l-', 'border-')}>
                    {selectedTrip.priority}
                  </Badge>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExportToOutlook(selectedTrip)}
                  className="bg-white"
                >
                  <CalendarDays className="w-4 h-4 mr-1" />
                  Export to Outlook
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsFloatingCardOpen(false)}
                  className="bg-white/50 hover:bg-white"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Trip Overview Banner */}
            <div className="p-4 bg-gray-50 border-b">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  <div>
                    <p className="font-medium text-xs text-muted-foreground">DEPARTURE - G650</p>
                    <p className="font-medium">{format(selectedTrip.departureDate, 'MMM dd, HH:mm')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-green-600" />
                  <div>
                    <p className="font-medium text-xs text-muted-foreground">RETURN - G650</p>
                    <p className="font-medium">{format(selectedTrip.returnDate, 'MMM dd, HH:mm')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-purple-600" />
                  <div>
                    <p className="font-medium text-xs text-muted-foreground">PASSENGERS</p>
                    <p className="font-medium">{selectedTrip.passengers.length} travelers</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-orange-600" />
                  <div>
                    <p className="font-medium text-xs text-muted-foreground">ESTIMATED COST</p>
                    <p className="font-medium">{selectedTrip.estimatedCost ? `${selectedTrip.estimatedCost.toLocaleString()}` : 'TBD'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Content Tabs */}
            <div className="flex-1 overflow-y-auto">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
                {/* Left Column - Passengers & Messages */}
                <div className="space-y-6">
                  {/* Passengers Management */}
                  <div className="bg-white border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium flex items-center gap-2">
                        <Users className="w-4 h-4 text-blue-600" />
                        Passenger Management
                      </h4>
                      <Badge variant="outline" className="text-xs">
                        {selectedTrip.passengers.length} passengers
                      </Badge>
                    </div>

                    {selectedTrip.status === 'approved' && (
                      <div className="mb-3 p-2 bg-blue-50 rounded border">
                        <div className="flex gap-2">
                          <Input
                            placeholder="passenger@company.com"
                            value={newPassengerEmails[selectedTrip.id] || ''}
                            onChange={(e) => setNewPassengerEmails({ ...newPassengerEmails, [selectedTrip.id]: e.target.value })}
                            className="h-8 text-sm"
                          />
                          <Button
                            size="sm"
                            onClick={() => handleAddPassenger(selectedTrip.id)}
                            disabled={!newPassengerEmails[selectedTrip.id]}
                            className="h-8 px-3"
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            Add
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Add passengers for G650 flight. Forms will be sent automatically.
                        </p>
                      </div>
                    )}

                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {selectedTrip.passengers.map((passenger) => (
                        <div key={passenger.id} className="flex items-center justify-between p-3 bg-gray-50 rounded border">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                              <span className="text-white text-xs font-medium">
                                {passenger.name.split(' ').map(n => n[0]).join('')}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-sm">{passenger.name}</p>
                              <p className="text-xs text-muted-foreground">{passenger.email}</p>
                              <div className="flex gap-1 mt-1">
                                {passenger.inDatabase ? (
                                  <Badge className="bg-green-100 text-green-800 text-xs">Database</Badge>
                                ) : passenger.formCompleted ? (
                                  <Badge className="bg-green-100 text-green-800 text-xs">Form Complete</Badge>
                                ) : passenger.formSent ? (
                                  <Badge className="bg-yellow-100 text-yellow-800 text-xs">Form Sent</Badge>
                                ) : (
                                  <Badge variant="outline" className="text-xs">New</Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          {selectedTrip.status === 'approved' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemovePassenger(selectedTrip.id, passenger.id)}
                              className="h-8 w-8 p-0 text-red-500 hover:bg-red-50"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      ))}

                      {selectedTrip.passengers.length === 0 && (
                        <div className="text-center py-6 text-muted-foreground">
                          <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No passengers added yet</p>
                          <p className="text-xs">Add passengers to get started</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="bg-white border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-green-600" />
                        Team Messages
                      </h4>
                      <Badge variant="outline" className="text-xs">
                        {selectedTrip.messages.length} messages
                      </Badge>
                    </div>

                    <div className="space-y-2 mb-3 max-h-40 overflow-y-auto">
                      {selectedTrip.messages.map((message) => (
                        <div
                          key={message.id}
                          className={`p-3 rounded text-sm ${message.senderRole === 'admin-assistant'
                            ? 'bg-blue-50 border-l-2 border-l-blue-500'
                            : 'bg-gray-50 border-l-2 border-l-gray-400'
                            }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-xs">{message.sender}</span>
                            <span className="text-xs text-muted-foreground">
                              {format(message.timestamp, 'MMM dd, HH:mm')}
                            </span>
                          </div>
                          <p className="text-sm">{message.content}</p>
                        </div>
                      ))}

                      {selectedTrip.messages.length === 0 && (
                        <div className="text-center py-4 text-muted-foreground">
                          <MessageSquare className="w-6 h-6 mx-auto mb-2 opacity-50" />
                          <p className="text-xs">No messages yet</p>
                        </div>
                      )}
                    </div>

                    <div className="border-t pt-3">
                      <div className="flex gap-2">
                        <Input
                          placeholder="Message to scheduling team..."
                          value={newMessages[selectedTrip.id] || ''}
                          onChange={(e) => setNewMessages({ ...newMessages, [selectedTrip.id]: e.target.value })}
                          className="h-8 text-sm"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              handleSendMessage(selectedTrip.id);
                            }
                          }}
                        />
                        <Button
                          size="sm"
                          onClick={() => handleSendMessage(selectedTrip.id)}
                          disabled={!newMessages[selectedTrip.id]?.trim()}
                          className="h-8 px-3"
                        >
                          <Send className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Middle & Right Columns - Itinerary Timeline */}
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-white border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-medium flex items-center gap-2">
                        <Navigation className="w-4 h-4 text-purple-600" />
                        Trip Itinerary Timeline
                      </h4>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {selectedTrip.itinerary.length} items
                        </Badge>
                        {selectedTrip.status === 'approved' && (
                          <Button
                            size="sm"
                            onClick={() => handleAddItineraryItem(selectedTrip.id)}
                            disabled={!newItineraryItems[selectedTrip.id]?.title || !newItineraryItems[selectedTrip.id]?.startTime || !newItineraryItems[selectedTrip.id]?.endTime}
                            className="h-7 px-2 text-xs"
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            Add Item
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Quick Add Form */}
                    {selectedTrip.status === 'approved' && (
                      <div className="mb-4 p-3 bg-purple-50 rounded border">
                        <p className="text-xs font-medium text-purple-800 mb-2">Quick Add G650 Trip Item</p>
                        <div className="grid grid-cols-3 gap-2 mb-2">
                          <Select
                            value={newItineraryItems[selectedTrip.id]?.type || 'meeting'}
                            onValueChange={(value: string) => setNewItineraryItems({
                              ...newItineraryItems,
                              [selectedTrip.id]: { ...(newItineraryItems[selectedTrip.id] || {}), type: value }
                            })}
                          >
                            <SelectTrigger className="h-7 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="flight">✈️ G650 Flight</SelectItem>
                              <SelectItem value="hotel">🏨 Hotel</SelectItem>
                              <SelectItem value="transportation">🚗 Transport</SelectItem>
                              <SelectItem value="meeting">🏢 Meeting</SelectItem>
                              <SelectItem value="meal">🍽️ Meal</SelectItem>
                              <SelectItem value="activity">🎯 Activity</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input
                            placeholder="Event title"
                            value={newItineraryItems[selectedTrip.id]?.title || ''}
                            onChange={(e) => setNewItineraryItems({
                              ...newItineraryItems,
                              [selectedTrip.id]: { ...(newItineraryItems[selectedTrip.id] || {}), title: e.target.value }
                            })}
                            className="h-7 text-xs"
                          />
                          <Input
                            placeholder="Location"
                            value={newItineraryItems[selectedTrip.id]?.location || ''}
                            onChange={(e) => setNewItineraryItems({
                              ...newItineraryItems,
                              [selectedTrip.id]: { ...(newItineraryItems[selectedTrip.id] || {}), location: e.target.value }
                            })}
                            className="h-7 text-xs"
                          />
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <Input
                            type="datetime-local"
                            value={newItineraryItems[selectedTrip.id]?.startTime || ''}
                            onChange={(e) => setNewItineraryItems({
                              ...newItineraryItems,
                              [selectedTrip.id]: { ...(newItineraryItems[selectedTrip.id] || {}), startTime: e.target.value }
                            })}
                            className="h-7 text-xs"
                          />
                          <Input
                            type="datetime-local"
                            value={newItineraryItems[selectedTrip.id]?.endTime || ''}
                            onChange={(e) => setNewItineraryItems({
                              ...newItineraryItems,
                              [selectedTrip.id]: { ...(newItineraryItems[selectedTrip.id] || {}), endTime: e.target.value }
                            })}
                            className="h-7 text-xs"
                          />
                          <Input
                            placeholder="Cost ($)"
                            type="number"
                            value={newItineraryItems[selectedTrip.id]?.cost || ''}
                            onChange={(e) => setNewItineraryItems({
                              ...newItineraryItems,
                              [selectedTrip.id]: { ...(newItineraryItems[selectedTrip.id] || {}), cost: e.target.value }
                            })}
                            className="h-7 text-xs"
                          />
                        </div>
                      </div>
                    )}

                    {/* Timeline */}
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {selectedTrip.itinerary.map((item, index) => (
                        <div key={item.id} className="relative flex items-start gap-4">
                          {/* Timeline line */}
                          {index < selectedTrip.itinerary.length - 1 && (
                            <div className="absolute left-4 top-8 w-0.5 h-12 bg-gray-200"></div>
                          )}

                          {/* Icon */}
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white border-2 border-gray-300 flex items-center justify-center">
                            {getItemIcon(item.type)}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0 bg-gray-50 rounded-lg p-3 border">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h5 className="font-medium text-sm">{item.title}</h5>
                                  {item.confirmed ? (
                                    <CheckCircle className="w-4 h-4 text-green-500" />
                                  ) : (
                                    <Clock className="w-4 h-4 text-orange-500" />
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground mb-1">
                                  📅 {format(item.startTime, 'MMM dd, HH:mm')} - {format(item.endTime, 'HH:mm')}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  📍 {item.location || 'Location TBD'}
                                </p>
                                {item.description && (
                                  <p className="text-xs text-gray-600 mt-1">{item.description}</p>
                                )}
                              </div>

                              <div className="flex items-center gap-2">
                                {item.cost && (
                                  <Badge variant="outline" className="text-xs">
                                    ${item.cost.toLocaleString()}
                                  </Badge>
                                )}
                                <Badge variant={item.confirmed ? "default" : "secondary"} className="text-xs">
                                  {item.confirmed ? "Confirmed" : "Pending"}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}

                      {selectedTrip.itinerary.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                          <Navigation className="w-12 h-12 mx-auto mb-3 opacity-50" />
                          <p className="font-medium mb-1">No itinerary items yet</p>
                          <p className="text-xs">Add G650 flights, hotels, meetings and activities</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Trip Notes */}
                  {selectedTrip.notes && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <h5 className="font-medium text-sm flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-4 h-4 text-yellow-600" />
                        Special Notes
                      </h5>
                      <p className="text-sm text-yellow-800">{selectedTrip.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}