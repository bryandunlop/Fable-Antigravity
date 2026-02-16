import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Separator } from './ui/separator';
import { ScrollArea } from './ui/scroll-area';
import { Switch } from './ui/switch';
import {
  Plus,
  Trash2,
  Edit,
  Save,
  X,
  Download,
  Send,
  Calendar,
  Plane,
  Hotel,
  Car,
  Utensils,
  Clock,
  MapPin,
  Users,
  FileText,
  Copy,
  CheckCircle,
  AlertTriangle,
  GripVertical,
  ChevronUp,
  ChevronDown,
  Settings,
  Mail,
  Share2,
  Briefcase,
  CheckSquare,
  Eye,
  Upload,
  Cloud,
  CloudRain,
  Sun,
  CloudSnow,
  Wind,
  Navigation,
  Phone,
  ExternalLink,
  Link as LinkIcon,
  Bell,
  UserPlus,
  Building
} from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import EnhancedEventEditor from './EnhancedEventEditor';

type EventType = 'flight' | 'hotel' | 'meeting' | 'dining' | 'ground-transport' | 'activity' | 'other';

interface WeatherData {
  temp: number;
  condition: string;
  icon: string;
  high: number;
  low: number;
  humidity: number;
  windSpeed: number;
  lastUpdated: string;
}

interface ItineraryEvent {
  id: string;
  type: EventType;
  title: string;
  date: string;
  startTime: string;
  endTime?: string;
  location: string;
  address?: string;
  confirmationNumber?: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  notes?: string;
  order: number;
  weather?: WeatherData;
  
  // Flight specific
  isCompanyFlight?: boolean;
  linkedFlightId?: string; // Link to company flight in system
  flightNumber?: string;
  airline?: string;
  departure?: string;
  arrival?: string;
  aircraft?: string;
  departureTerminal?: string;
  arrivalTerminal?: string;
  seatNumber?: string;
  
  // Hotel specific
  hotelName?: string;
  checkIn?: string;
  checkOut?: string;
  roomType?: string;
  hotelPhone?: string;
  hotelWebsite?: string;
  hotelAddress?: string;
  mapLink?: string;
  roomNumber?: string;
  amenities?: string[];
  
  // Meeting specific
  meetingType?: string;
  attendees?: MeetingAttendee[];
  meetingRoom?: string;
  dialInNumber?: string;
  meetingLink?: string;
  agenda?: string;
  
  // Ground transport specific
  transportType?: string; // rental-car, car-service, uber, other
  pickupLocation?: string;
  dropoffLocation?: string;
  driverName?: string;
  driverPhone?: string;
  vehicleInfo?: string;
  vehiclePlate?: string;
  companyName?: string;
  transportLegs?: TransportLeg[];
}

interface MeetingAttendee {
  id: string;
  name: string;
  email?: string;
  role?: string;
  company?: string;
}

interface TransportLeg {
  id: string;
  from: string;
  to: string;
  pickupTime: string;
  notes?: string;
}

interface Itinerary {
  id: string;
  title: string;
  description?: string;
  travelerName: string;
  travelerEmail?: string;
  travelerPhone?: string;
  startDate: string;
  endDate: string;
  events: ItineraryEvent[];
  status: 'draft' | 'finalized' | 'sent';
  createdAt: string;
  updatedAt: string;
  lastModified?: string;
  modificationLog?: ItineraryChange[];
  tags?: string[];
  isCorporateJetTrip: boolean;
  linkedTripId?: string;
  notificationsEnabled: boolean;
}

interface ItineraryChange {
  id: string;
  timestamp: string;
  changeType: 'event-added' | 'event-modified' | 'event-deleted' | 'details-modified';
  description: string;
  eventId?: string;
}

export default function ItineraryBuilder() {
  const navigate = useNavigate();
  const [itineraries, setItineraries] = useState<Itinerary[]>([]);
  const [currentItinerary, setCurrentItinerary] = useState<Itinerary | null>(null);
  const [editingEvent, setEditingEvent] = useState<ItineraryEvent | null>(null);
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showFlightLinkDialog, setShowFlightLinkDialog] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  const [selectedItineraryId, setSelectedItineraryId] = useState<string | null>(null);
  const [loadingWeather, setLoadingWeather] = useState<string | null>(null);
  const [availableCompanyFlights, setAvailableCompanyFlights] = useState<any[]>([]);

  useEffect(() => {
    loadItineraries();
    loadCompanyFlights();
  }, []);

  const loadCompanyFlights = () => {
    // Load company flights from localStorage or API
    // This would integrate with your flight operations system
    const mockFlights = [
      { id: 'cf-1', flightNumber: 'G650-001', departure: 'KTEB', arrival: 'KMIA', date: '2025-11-15', time: '08:00', aircraft: 'N123GS' },
      { id: 'cf-2', flightNumber: 'G650-002', departure: 'KMIA', arrival: 'KTEB', date: '2025-11-17', time: '16:00', aircraft: 'N123GS' },
      { id: 'cf-3', flightNumber: 'G650-003', departure: 'KLAS', arrival: 'KSFO', date: '2025-11-20', time: '10:30', aircraft: 'N456GS' },
    ];
    setAvailableCompanyFlights(mockFlights);
  };

  const loadItineraries = () => {
    const saved = localStorage.getItem('itineraries');
    if (saved) {
      const parsed = JSON.parse(saved);
      setItineraries(parsed);
    }
  };

  const saveItineraries = (itins: Itinerary[]) => {
    localStorage.setItem('itineraries', JSON.stringify(itins));
    setItineraries(itins);
  };

  const fetchWeatherForLocation = async (location: string, date: string): Promise<WeatherData | null> => {
    try {
      // Mock weather data - in production, integrate with weather API
      // You could use OpenWeatherMap, WeatherAPI, or another service
      const mockWeather: WeatherData = {
        temp: Math.floor(Math.random() * 30) + 60,
        condition: ['Clear', 'Cloudy', 'Rainy', 'Partly Cloudy'][Math.floor(Math.random() * 4)],
        icon: 'sun',
        high: Math.floor(Math.random() * 30) + 70,
        low: Math.floor(Math.random() * 20) + 50,
        humidity: Math.floor(Math.random() * 40) + 40,
        windSpeed: Math.floor(Math.random() * 15) + 5,
        lastUpdated: new Date().toISOString()
      };
      
      return mockWeather;
    } catch (error) {
      console.error('Error fetching weather:', error);
      return null;
    }
  };

  const generateMapLink = (address: string, hotelName?: string): string => {
    const query = hotelName ? `${hotelName}, ${address}` : address;
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  };

  const createNewItinerary = () => {
    const newItinerary: Itinerary = {
      id: `itin-${Date.now()}`,
      title: 'New Itinerary',
      travelerName: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      events: [],
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isCorporateJetTrip: false,
      notificationsEnabled: true,
      modificationLog: []
    };
    
    setCurrentItinerary(newItinerary);
    setActiveTab('details');
  };

  const logChange = (itinerary: Itinerary, changeType: ItineraryChange['changeType'], description: string, eventId?: string) => {
    const change: ItineraryChange = {
      id: `change-${Date.now()}`,
      timestamp: new Date().toISOString(),
      changeType,
      description,
      eventId
    };
    
    return {
      ...itinerary,
      modificationLog: [...(itinerary.modificationLog || []), change],
      lastModified: new Date().toISOString()
    };
  };

  const sendChangeNotification = (itinerary: Itinerary, change: ItineraryChange) => {
    // This is a placeholder for future notification system integration
    // When the traveler's app is built, this will send push notifications/emails
    
    if (itinerary.status === 'finalized' && itinerary.notificationsEnabled && itinerary.travelerEmail) {
      // Future: Send notification via email or push notification system
      console.log('NOTIFICATION QUEUED:', {
        to: itinerary.travelerEmail,
        subject: `Itinerary Update: ${itinerary.title}`,
        message: change.description,
        timestamp: change.timestamp
      });
      
      toast.info('Change notification queued for traveler', {
        description: 'Traveler will be notified via their app (feature in development)'
      });
    }
  };

  const saveCurrentItinerary = (trackChanges: boolean = false) => {
    if (!currentItinerary) return;
    
    let updatedItinerary = {
      ...currentItinerary,
      updatedAt: new Date().toISOString()
    };
    
    // Track modifications if itinerary was finalized
    if (trackChanges && currentItinerary.status === 'finalized') {
      updatedItinerary = logChange(updatedItinerary, 'details-modified', 'Itinerary details updated');
      sendChangeNotification(updatedItinerary, updatedItinerary.modificationLog![updatedItinerary.modificationLog!.length - 1]);
    }
    
    const existingIndex = itineraries.findIndex(i => i.id === currentItinerary.id);
    let updatedItineraries;
    
    if (existingIndex >= 0) {
      updatedItineraries = itineraries.map((i, idx) => 
        idx === existingIndex ? updatedItinerary : i
      );
    } else {
      updatedItineraries = [...itineraries, updatedItinerary];
    }
    
    saveItineraries(updatedItineraries);
    setCurrentItinerary(updatedItinerary);
    toast.success('Itinerary saved successfully');
  };

  const deleteItinerary = (id: string) => {
    if (!confirm('Are you sure you want to delete this itinerary?')) return;
    
    const updated = itineraries.filter(i => i.id !== id);
    saveItineraries(updated);
    
    if (currentItinerary?.id === id) {
      setCurrentItinerary(null);
    }
    
    toast.success('Itinerary deleted');
  };

  const addEvent = () => {
    setEditingEvent({
      id: `event-${Date.now()}`,
      type: 'flight',
      title: '',
      date: currentItinerary?.startDate || new Date().toISOString().split('T')[0],
      startTime: '09:00',
      location: '',
      order: currentItinerary?.events.length || 0
    });
    setShowEventDialog(true);
  };

  const editEvent = (event: ItineraryEvent) => {
    setEditingEvent({ ...event });
    setShowEventDialog(true);
  };

  const saveEvent = async () => {
    if (!editingEvent || !currentItinerary) return;
    
    // Fetch weather for the event location
    if (editingEvent.location && editingEvent.date) {
      setLoadingWeather(editingEvent.id);
      const weather = await fetchWeatherForLocation(editingEvent.location, editingEvent.date);
      if (weather) {
        editingEvent.weather = weather;
      }
      setLoadingWeather(null);
    }
    
    // Generate map link for hotels
    if (editingEvent.type === 'hotel' && editingEvent.hotelAddress) {
      editingEvent.mapLink = generateMapLink(editingEvent.hotelAddress, editingEvent.hotelName);
    }
    
    const existingIndex = currentItinerary.events.findIndex(e => e.id === editingEvent.id);
    let updatedEvents;
    let changeDescription = '';
    
    if (existingIndex >= 0) {
      updatedEvents = currentItinerary.events.map((e, idx) => 
        idx === existingIndex ? editingEvent : e
      );
      changeDescription = `Modified event: ${editingEvent.title}`;
    } else {
      updatedEvents = [...currentItinerary.events, editingEvent];
      changeDescription = `Added event: ${editingEvent.title}`;
    }
    
    // Sort events by date and time
    updatedEvents.sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      return a.startTime.localeCompare(b.startTime);
    });
    
    // Update order
    updatedEvents = updatedEvents.map((e, idx) => ({ ...e, order: idx }));
    
    let updatedItinerary = {
      ...currentItinerary,
      events: updatedEvents
    };
    
    // Track change if finalized
    if (currentItinerary.status === 'finalized') {
      const changeType = existingIndex >= 0 ? 'event-modified' : 'event-added';
      updatedItinerary = logChange(updatedItinerary, changeType as any, changeDescription, editingEvent.id);
      sendChangeNotification(updatedItinerary, updatedItinerary.modificationLog![updatedItinerary.modificationLog!.length - 1]);
    }
    
    setCurrentItinerary(updatedItinerary);
    
    setShowEventDialog(false);
    setEditingEvent(null);
    toast.success('Event saved');
  };

  const deleteEvent = (eventId: string) => {
    if (!currentItinerary) return;
    if (!confirm('Are you sure you want to delete this event?')) return;
    
    const deletedEvent = currentItinerary.events.find(e => e.id === eventId);
    const updatedEvents = currentItinerary.events
      .filter(e => e.id !== eventId)
      .map((e, idx) => ({ ...e, order: idx }));
    
    let updatedItinerary = {
      ...currentItinerary,
      events: updatedEvents
    };
    
    // Track change if finalized
    if (currentItinerary.status === 'finalized' && deletedEvent) {
      updatedItinerary = logChange(updatedItinerary, 'event-deleted', `Deleted event: ${deletedEvent.title}`, eventId);
      sendChangeNotification(updatedItinerary, updatedItinerary.modificationLog![updatedItinerary.modificationLog!.length - 1]);
    }
    
    setCurrentItinerary(updatedItinerary);
    
    toast.success('Event deleted');
  };

  const moveEvent = (index: number, direction: 'up' | 'down') => {
    if (!currentItinerary) return;
    
    const events = [...currentItinerary.events];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (newIndex < 0 || newIndex >= events.length) return;
    
    [events[index], events[newIndex]] = [events[newIndex], events[index]];
    const reorderedEvents = events.map((e, idx) => ({ ...e, order: idx }));
    
    setCurrentItinerary({
      ...currentItinerary,
      events: reorderedEvents
    });
  };

  const duplicateEvent = (event: ItineraryEvent) => {
    if (!currentItinerary) return;
    
    const newEvent: ItineraryEvent = {
      ...event,
      id: `event-${Date.now()}`,
      title: `${event.title} (Copy)`,
      order: currentItinerary.events.length
    };
    
    setCurrentItinerary({
      ...currentItinerary,
      events: [...currentItinerary.events, newEvent]
    });
    
    toast.success('Event duplicated');
  };

  const refreshAllWeather = async () => {
    if (!currentItinerary) return;
    
    toast.info('Refreshing weather data...');
    
    const updatedEvents = await Promise.all(
      currentItinerary.events.map(async (event) => {
        if (event.location && event.date) {
          const weather = await fetchWeatherForLocation(event.location, event.date);
          return { ...event, weather: weather || event.weather };
        }
        return event;
      })
    );
    
    setCurrentItinerary({
      ...currentItinerary,
      events: updatedEvents
    });
    
    toast.success('Weather data updated');
  };

  const linkCompanyFlight = (flightId: string) => {
    if (!editingEvent) return;
    
    const companyFlight = availableCompanyFlights.find(f => f.id === flightId);
    if (companyFlight) {
      setEditingEvent({
        ...editingEvent,
        isCompanyFlight: true,
        linkedFlightId: flightId,
        flightNumber: companyFlight.flightNumber,
        departure: companyFlight.departure,
        arrival: companyFlight.arrival,
        aircraft: companyFlight.aircraft,
        date: companyFlight.date,
        startTime: companyFlight.time
      });
      setShowFlightLinkDialog(false);
      toast.success('Company flight linked');
    }
  };

  const getEventIcon = (type: EventType) => {
    switch (type) {
      case 'flight': return <Plane className="h-4 w-4" />;
      case 'hotel': return <Hotel className="h-4 w-4" />;
      case 'meeting': return <Briefcase className="h-4 w-4" />;
      case 'dining': return <Utensils className="h-4 w-4" />;
      case 'ground-transport': return <Car className="h-4 w-4" />;
      case 'activity': return <MapPin className="h-4 w-4" />;
      default: return <Calendar className="h-4 w-4" />;
    }
  };

  const exportToPDF = () => {
    if (!currentItinerary) return;
    
    // Generate HTML for PDF
    const html = generateItineraryHTML(currentItinerary);
    
    // In a real implementation, you would use a library like jsPDF or send to backend
    // For now, we'll create a printable version
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.print();
    }
    
    toast.success('Opening print dialog for PDF export');
    setShowExportDialog(false);
  };

  const generateItineraryHTML = (itinerary: Itinerary) => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${itinerary.title}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; }
          h1 { color: #1a1a1a; border-bottom: 3px solid #2563eb; padding-bottom: 10px; }
          h2 { color: #2563eb; margin-top: 30px; }
          .header { margin-bottom: 30px; }
          .event { margin: 20px 0; padding: 15px; border-left: 4px solid #2563eb; background: #f8f9fa; }
          .event-title { font-weight: bold; font-size: 16px; margin-bottom: 5px; }
          .event-time { color: #666; margin-bottom: 10px; }
          .event-details { margin-top: 10px; }
          .detail-row { margin: 5px 0; }
          .label { font-weight: bold; display: inline-block; width: 150px; }
          @media print { body { margin: 20px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${itinerary.title}</h1>
          <p><strong>Traveler:</strong> ${itinerary.travelerName}</p>
          <p><strong>Dates:</strong> ${formatDate(itinerary.startDate)} - ${formatDate(itinerary.endDate)}</p>
          ${itinerary.description ? `<p><strong>Description:</strong> ${itinerary.description}</p>` : ''}
        </div>
        
        <h2>Itinerary</h2>
        ${itinerary.events.map(event => `
          <div class="event">
            <div class="event-title">${event.title}</div>
            <div class="event-time">${formatDate(event.date)} • ${event.startTime}${event.endTime ? ' - ' + event.endTime : ''}</div>
            <div class="event-details">
              ${event.location ? `<div class="detail-row"><span class="label">Location:</span> ${event.location}</div>` : ''}
              ${event.address ? `<div class="detail-row"><span class="label">Address:</span> ${event.address}</div>` : ''}
              ${event.confirmationNumber ? `<div class="detail-row"><span class="label">Confirmation #:</span> ${event.confirmationNumber}</div>` : ''}
              ${event.flightNumber ? `<div class="detail-row"><span class="label">Flight:</span> ${event.flightNumber}</div>` : ''}
              ${event.departure ? `<div class="detail-row"><span class="label">Departure:</span> ${event.departure}</div>` : ''}
              ${event.arrival ? `<div class="detail-row"><span class="label">Arrival:</span> ${event.arrival}</div>` : ''}
              ${event.contactName ? `<div class="detail-row"><span class="label">Contact:</span> ${event.contactName}</div>` : ''}
              ${event.contactPhone ? `<div class="detail-row"><span class="label">Phone:</span> ${event.contactPhone}</div>` : ''}
              ${event.notes ? `<div class="detail-row"><span class="label">Notes:</span> ${event.notes}</div>` : ''}
            </div>
          </div>
        `).join('')}
        
        <div style="margin-top: 50px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px;">
          Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}
        </div>
      </body>
      </html>
    `;
  };

  const sendToOutlookCalendar = () => {
    if (!currentItinerary) return;
    
    // Generate .ics file for Outlook/Calendar import
    const icsContent = generateICSFile(currentItinerary);
    
    // Create blob and download
    const blob = new Blob([icsContent], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${currentItinerary.title.replace(/\s+/g, '-')}.ics`;
    link.click();
    URL.revokeObjectURL(url);
    
    toast.success('Calendar file downloaded - Import into Outlook');
    setShowShareDialog(false);
  };

  const generateICSFile = (itinerary: Itinerary) => {
    const formatICSDate = (date: string, time: string) => {
      const [year, month, day] = date.split('-');
      const [hour, minute] = time.split(':');
      return `${year}${month}${day}T${hour}${minute}00`;
    };
    
    const events = itinerary.events.map(event => {
      const startDateTime = formatICSDate(event.date, event.startTime);
      const endTime = event.endTime || event.startTime;
      const endDateTime = formatICSDate(event.date, endTime);
      
      return `BEGIN:VEVENT
UID:${event.id}@itinerarybuilder
DTSTAMP:${formatICSDate(new Date().toISOString().split('T')[0], new Date().toTimeString().split(':').slice(0, 2).join(':'))}
DTSTART:${startDateTime}
DTEND:${endDateTime}
SUMMARY:${event.title}
LOCATION:${event.location}
DESCRIPTION:${event.notes || ''}${event.confirmationNumber ? '\\nConfirmation: ' + event.confirmationNumber : ''}
STATUS:CONFIRMED
END:VEVENT`;
    }).join('\n');
    
    return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Itinerary Builder//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:${itinerary.title}
X-WR-TIMEZONE:UTC
${events}
END:VCALENDAR`;
  };

  const pushToTripManagement = () => {
    if (!currentItinerary) return;
    
    // Store itinerary data for trip builder
    localStorage.setItem('itinerary_to_trip', JSON.stringify(currentItinerary));
    
    toast.success('Redirecting to Trip Management...');
    setShowShareDialog(false);
    
    // Navigate to trip builder
    setTimeout(() => {
      navigate('/trip-builder');
    }, 500);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-3xl font-bold flex items-center space-x-2">
            <Calendar className="h-8 w-8 text-primary" />
            <span>Itinerary Builder</span>
          </h1>
          <p className="text-muted-foreground mt-2">
            Create detailed travel itineraries for business trips and corporate jet operations
          </p>
        </div>

        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => setSelectedItineraryId(null)}>
            <FileText className="h-4 w-4 mr-2" />
            View All
          </Button>
          <Button onClick={createNewItinerary}>
            <Plus className="h-4 w-4 mr-2" />
            New Itinerary
          </Button>
        </div>
      </div>

      {/* Main Content */}
      {!currentItinerary && !selectedItineraryId ? (
        // Itinerary List
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {itineraries.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="py-12">
                <div className="text-center">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No itineraries yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Create your first travel itinerary to get started
                  </p>
                  <Button onClick={createNewItinerary}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Itinerary
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            itineraries.map(itinerary => (
              <Card key={itinerary.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start mb-2">
                    <CardTitle className="text-lg">{itinerary.title}</CardTitle>
                    <Badge variant={
                      itinerary.status === 'finalized' ? 'default' :
                      itinerary.status === 'sent' ? 'secondary' : 'outline'
                    }>
                      {itinerary.status}
                    </Badge>
                  </div>
                  <CardDescription>
                    {itinerary.travelerName}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4 mr-2" />
                    {formatDate(itinerary.startDate)} - {formatDate(itinerary.endDate)}
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <CheckSquare className="h-4 w-4 mr-2" />
                    {itinerary.events.length} event{itinerary.events.length !== 1 ? 's' : ''}
                  </div>
                  {itinerary.isCorporateJetTrip && (
                    <Badge variant="outline" className="w-fit">
                      <Plane className="h-3 w-3 mr-1" />
                      Corporate Jet
                    </Badge>
                  )}
                  
                  <div className="flex space-x-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => setCurrentItinerary(itinerary)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteItinerary(itinerary.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      ) : currentItinerary ? (
        // Itinerary Editor
        <div className="space-y-4">
          {/* Action Buttons */}
          <Card>
            <CardContent className="py-4">
              <div className="flex flex-wrap gap-2">
                <Button onClick={saveCurrentItinerary}>
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </Button>
                <Button variant="outline" onClick={() => setShowExportDialog(true)}>
                  <Download className="h-4 w-4 mr-2" />
                  Export PDF
                </Button>
                <Button variant="outline" onClick={() => setShowShareDialog(true)}>
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setCurrentItinerary({
                      ...currentItinerary,
                      status: 'finalized'
                    });
                    toast.success('Itinerary finalized');
                  }}
                  disabled={currentItinerary.status === 'finalized'}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Finalize
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    if (confirm('Discard changes?')) {
                      setCurrentItinerary(null);
                    }
                  }}
                >
                  <X className="h-4 w-4 mr-2" />
                  Close
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="events">Events ({currentItinerary.events.length})</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
            </TabsList>

            {/* Details Tab */}
            <TabsContent value="details" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Itinerary Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Itinerary Title *</Label>
                      <Input
                        value={currentItinerary.title}
                        onChange={(e) => setCurrentItinerary({
                          ...currentItinerary,
                          title: e.target.value
                        })}
                        placeholder="e.g., NYC Business Trip"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Traveler Name *</Label>
                      <Input
                        value={currentItinerary.travelerName}
                        onChange={(e) => setCurrentItinerary({
                          ...currentItinerary,
                          travelerName: e.target.value
                        })}
                        placeholder="Full name"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Start Date *</Label>
                      <Input
                        type="date"
                        value={currentItinerary.startDate}
                        onChange={(e) => setCurrentItinerary({
                          ...currentItinerary,
                          startDate: e.target.value
                        })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>End Date *</Label>
                      <Input
                        type="date"
                        value={currentItinerary.endDate}
                        onChange={(e) => setCurrentItinerary({
                          ...currentItinerary,
                          endDate: e.target.value
                        })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Traveler Email</Label>
                      <Input
                        type="email"
                        value={currentItinerary.travelerEmail || ''}
                        onChange={(e) => setCurrentItinerary({
                          ...currentItinerary,
                          travelerEmail: e.target.value
                        })}
                        placeholder="email@company.com"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Traveler Phone</Label>
                      <Input
                        type="tel"
                        value={currentItinerary.travelerPhone || ''}
                        onChange={(e) => setCurrentItinerary({
                          ...currentItinerary,
                          travelerPhone: e.target.value
                        })}
                        placeholder="+1 (555) 123-4567"
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label>Description</Label>
                      <Textarea
                        value={currentItinerary.description || ''}
                        onChange={(e) => setCurrentItinerary({
                          ...currentItinerary,
                          description: e.target.value
                        })}
                        placeholder="Brief description of the trip purpose"
                        rows={3}
                      />
                    </div>

                    <div className="md:col-span-2 space-y-3">
                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <Label>Corporate Jet Trip</Label>
                          <p className="text-sm text-muted-foreground">
                            Mark if this trip uses company aircraft
                          </p>
                        </div>
                        <Switch
                          checked={currentItinerary.isCorporateJetTrip}
                          onCheckedChange={(checked) => setCurrentItinerary({
                            ...currentItinerary,
                            isCorporateJetTrip: checked
                          })}
                        />
                      </div>

                      <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
                        <div className="flex items-center space-x-2">
                          <Bell className="h-5 w-5 text-primary" />
                          <div>
                            <Label>Change Notifications</Label>
                            <p className="text-sm text-muted-foreground">
                              Send notifications when finalized itinerary changes
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Note: Traveler app notifications coming soon
                            </p>
                          </div>
                        </div>
                        <Switch
                          checked={currentItinerary.notificationsEnabled}
                          onCheckedChange={(checked) => setCurrentItinerary({
                            ...currentItinerary,
                            notificationsEnabled: checked
                          })}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Events Tab */}
            <TabsContent value="events" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Event Schedule</h3>
                <div className="flex space-x-2">
                  <Button variant="outline" onClick={refreshAllWeather} size="sm">
                    <Cloud className="h-4 w-4 mr-2" />
                    Refresh Weather
                  </Button>
                  <Button onClick={addEvent}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Event
                  </Button>
                </div>
              </div>

              {currentItinerary.events.length === 0 ? (
                <Card>
                  <CardContent className="py-12">
                    <div className="text-center">
                      <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium mb-2">No events scheduled</h3>
                      <p className="text-muted-foreground mb-4">
                        Add flights, hotels, meetings, and other events
                      </p>
                      <Button onClick={addEvent}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add First Event
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {currentItinerary.events.map((event, index) => (
                    <Card key={event.id}>
                      <CardContent className="py-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3 flex-1">
                            <div className="flex flex-col space-y-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => moveEvent(index, 'up')}
                                disabled={index === 0}
                                className="h-6 w-6 p-0"
                              >
                                <ChevronUp className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => moveEvent(index, 'down')}
                                disabled={index === currentItinerary.events.length - 1}
                                className="h-6 w-6 p-0"
                              >
                                <ChevronDown className="h-4 w-4" />
                              </Button>
                            </div>

                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-2">
                                {getEventIcon(event.type)}
                                <h4 className="font-medium">{event.title}</h4>
                                <Badge variant="outline" className="text-xs">
                                  {event.type}
                                </Badge>
                              </div>
                              
                              <div className="space-y-1 text-sm text-muted-foreground">
                                <div className="flex items-center">
                                  <Calendar className="h-3 w-3 mr-2" />
                                  {formatDate(event.date)}
                                </div>
                                <div className="flex items-center">
                                  <Clock className="h-3 w-3 mr-2" />
                                  {formatTime(event.startTime)}
                                  {event.endTime && ` - ${formatTime(event.endTime)}`}
                                </div>
                                {event.location && (
                                  <div className="flex items-center">
                                    <MapPin className="h-3 w-3 mr-2" />
                                    {event.location}
                                  </div>
                                )}
                                {event.confirmationNumber && (
                                  <div className="flex items-center">
                                    <FileText className="h-3 w-3 mr-2" />
                                    Conf: {event.confirmationNumber}
                                  </div>
                                )}
                                {event.weather && (
                                  <div className="flex items-center text-primary">
                                    <Cloud className="h-3 w-3 mr-2" />
                                    {event.weather.temp}°F, {event.weather.condition}
                                  </div>
                                )}
                                {event.isCompanyFlight && (
                                  <div className="flex items-center text-primary font-medium">
                                    <Plane className="h-3 w-3 mr-2" />
                                    Company Flight
                                  </div>
                                )}
                                {event.mapLink && (
                                  <a 
                                    href={event.mapLink} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="flex items-center text-primary hover:underline"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <ExternalLink className="h-3 w-3 mr-2" />
                                    View on Map
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex space-x-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => duplicateEvent(event)}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => editEvent(event)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteEvent(event.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Preview Tab */}
            <TabsContent value="preview">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-2xl">{currentItinerary.title}</CardTitle>
                      <CardDescription className="mt-2">
                        {currentItinerary.travelerName}
                      </CardDescription>
                    </div>
                    {currentItinerary.isCorporateJetTrip && (
                      <Badge>
                        <Plane className="h-3 w-3 mr-1" />
                        Corporate Jet
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                    <div>
                      <p className="text-sm text-muted-foreground">Start Date</p>
                      <p className="font-medium">{formatDate(currentItinerary.startDate)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">End Date</p>
                      <p className="font-medium">{formatDate(currentItinerary.endDate)}</p>
                    </div>
                  </div>

                  {currentItinerary.description && (
                    <div>
                      <h3 className="font-medium mb-2">Description</h3>
                      <p className="text-muted-foreground">{currentItinerary.description}</p>
                    </div>
                  )}

                  <Separator />

                  <div>
                    <h3 className="font-medium mb-4">Schedule</h3>
                    <div className="space-y-4">
                      {currentItinerary.events.map((event) => (
                        <div key={event.id} className="border-l-4 border-primary pl-4 py-2">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              {getEventIcon(event.type)}
                              <h4 className="font-medium">{event.title}</h4>
                            </div>
                            <Badge variant="outline">{event.type}</Badge>
                          </div>
                          
                          <div className="space-y-1 text-sm">
                            <p className="text-muted-foreground">
                              {formatDate(event.date)} • {formatTime(event.startTime)}
                              {event.endTime && ` - ${formatTime(event.endTime)}`}
                            </p>
                            {event.location && (
                              <p className="flex items-center text-muted-foreground">
                                <MapPin className="h-3 w-3 mr-1" />
                                {event.location}
                              </p>
                            )}
                            {event.address && (
                              <p className="text-muted-foreground ml-4">{event.address}</p>
                            )}
                            {event.confirmationNumber && (
                              <p className="text-muted-foreground">
                                <span className="font-medium">Confirmation:</span> {event.confirmationNumber}
                              </p>
                            )}
                            {event.notes && (
                              <p className="text-muted-foreground italic mt-2">{event.notes}</p>
                            )}
                            {event.weather && (
                              <p className="flex items-center text-primary mt-2">
                                <Cloud className="h-3 w-3 mr-1" />
                                {event.weather.temp}°F, {event.weather.condition} (H: {event.weather.high}° L: {event.weather.low}°)
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {currentItinerary.status === 'finalized' && currentItinerary.modificationLog && currentItinerary.modificationLog.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <div className="flex items-center space-x-2 mb-4">
                          <Bell className="h-5 w-5 text-primary" />
                          <h3 className="font-medium">Change History</h3>
                          <Badge variant="outline" className="text-xs">
                            {currentItinerary.modificationLog.length} change{currentItinerary.modificationLog.length !== 1 ? 's' : ''}
                          </Badge>
                        </div>
                        <Alert className="mb-3">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>
                            Changes made after finalization {currentItinerary.notificationsEnabled ? 'will be sent' : 'are logged but notifications are disabled'} to traveler via their app (feature in development)
                          </AlertDescription>
                        </Alert>
                        <div className="space-y-2">
                          {currentItinerary.modificationLog.map((change) => (
                            <div key={change.id} className="p-3 border rounded-lg bg-muted/30">
                              <div className="flex items-start justify-between">
                                <div>
                                  <p className="text-sm font-medium">{change.description}</p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {new Date(change.timestamp).toLocaleString()}
                                  </p>
                                </div>
                                <Badge variant="secondary" className="text-xs">
                                  {change.changeType.replace('-', ' ')}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      ) : null}

      {/* Event Dialog */}
      <EnhancedEventEditor
        open={showEventDialog}
        event={editingEvent}
        onClose={() => {
          setShowEventDialog(false);
          setEditingEvent(null);
        }}
        onSave={saveEvent}
        onEventChange={setEditingEvent}
        availableCompanyFlights={availableCompanyFlights}
        onLinkCompanyFlight={linkCompanyFlight}
      />

      {/* Export Dialog */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export Itinerary</DialogTitle>
            <DialogDescription>
              Choose how you want to export this itinerary
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3">
            <Button className="w-full justify-start" onClick={exportToPDF}>
              <Download className="h-4 w-4 mr-2" />
              Export as PDF
            </Button>
            <p className="text-xs text-muted-foreground px-4">
              Generate a printable PDF document of the full itinerary
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Share Dialog */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Itinerary</DialogTitle>
            <DialogDescription>
              Share this itinerary with others or integrate with other systems
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Button className="w-full justify-start" onClick={sendToOutlookCalendar}>
                <Calendar className="h-4 w-4 mr-2" />
                Send to Outlook Calendar
              </Button>
              <p className="text-xs text-muted-foreground mt-2 px-4">
                Download .ics file to import all events into Outlook or other calendar apps
              </p>
            </div>

            <Separator />

            {currentItinerary?.isCorporateJetTrip && (
              <div>
                <Button className="w-full justify-start" onClick={pushToTripManagement}>
                  <Upload className="h-4 w-4 mr-2" />
                  Push to Trip Management
                </Button>
                <p className="text-xs text-muted-foreground mt-2 px-4">
                  Transfer this itinerary to Trip Management for corporate jet coordination
                </p>
              </div>
            )}

            <Separator />

            <div>
              <Label className="mb-2 block">Email Itinerary</Label>
              <div className="flex space-x-2">
                <Input
                  type="email"
                  placeholder="recipient@email.com"
                  value={currentItinerary?.travelerEmail || ''}
                />
                <Button>
                  <Send className="h-4 w-4 mr-2" />
                  Send
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Send PDF via email (feature coming soon)
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}


