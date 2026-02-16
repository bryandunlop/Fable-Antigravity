import React, { useState, useEffect, useRef } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Separator } from './ui/separator';
import { ScrollArea } from './ui/scroll-area';
import { Switch } from './ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import {
  Plus,
  Save,
  X,
  Download,
  Send,
  Calendar,
  Plane,
  Hotel,
  Car,
  Utensils,
  Briefcase,
  MapPin,
  Clock,
  Edit,
  Trash2,
  GripVertical,
  Eye,
  Share2,
  CheckCircle,
  Cloud,
  Phone,
  Mail,
  ExternalLink,
  Bell,
  ChevronDown,
  ChevronUp,
  Copy,
  Upload,
  Activity,
  FileText,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

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
  linkedFlightId?: string;
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
  
  // Meeting specific
  meetingType?: string;
  attendees?: MeetingAttendee[];
  meetingRoom?: string;
  dialInNumber?: string;
  meetingLink?: string;
  agenda?: string;
  
  // Ground transport specific
  transportType?: string;
  pickupLocation?: string;
  dropoffLocation?: string;
  driverName?: string;
  driverPhone?: string;
  vehicleInfo?: string;
  vehiclePlate?: string;
  companyName?: string;
  transportLegs?: TransportLeg[];
}

interface ItineraryChange {
  id: string;
  timestamp: string;
  changeType: 'event-added' | 'event-modified' | 'event-deleted' | 'details-modified';
  description: string;
  eventId?: string;
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

interface DraggableEventCardProps {
  event: ItineraryEvent;
  index: number;
  onMove: (dragIndex: number, hoverIndex: number) => void;
  onEdit: (event: ItineraryEvent) => void;
  onDelete: (id: string) => void;
  onDuplicate: (event: ItineraryEvent) => void;
}

const EventTypeConfig = {
  flight: { icon: Plane, color: 'bg-blue-500', label: 'Flight', emoji: '✈️' },
  hotel: { icon: Hotel, color: 'bg-purple-500', label: 'Hotel', emoji: '🏨' },
  meeting: { icon: Briefcase, color: 'bg-green-500', label: 'Meeting', emoji: '💼' },
  dining: { icon: Utensils, color: 'bg-orange-500', label: 'Dining', emoji: '🍽️' },
  'ground-transport': { icon: Car, color: 'bg-yellow-500', label: 'Transport', emoji: '🚗' },
  activity: { icon: Activity, color: 'bg-pink-500', label: 'Activity', emoji: '🎯' },
  other: { icon: FileText, color: 'bg-gray-500', label: 'Other', emoji: '📋' }
};

// Draggable Event Card Component
function DraggableEventCard({ event, index, onMove, onEdit, onDelete, onDuplicate }: DraggableEventCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);

  const [{ isDragging }, drag] = useDrag({
    type: 'EVENT',
    item: { index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    })
  });

  const [, drop] = useDrop({
    accept: 'EVENT',
    hover: (item: { index: number }) => {
      if (!ref.current) return;
      const dragIndex = item.index;
      const hoverIndex = index;
      if (dragIndex === hoverIndex) return;
      onMove(dragIndex, hoverIndex);
      item.index = hoverIndex;
    }
  });

  drag(drop(ref));

  const config = EventTypeConfig[event.type];
  const Icon = config.icon;

  return (
    <div
      ref={ref}
      className={`group ${isDragging ? 'opacity-50' : 'opacity-100'}`}
    >
      <Card className="hover:shadow-md transition-shadow cursor-move border-l-4" style={{ borderLeftColor: config.color.replace('bg-', '#') }}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            {/* Drag Handle */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <GripVertical className="h-5 w-5 text-muted-foreground shrink-0 cursor-grab active:cursor-grabbing" />
              
              <div className={`${config.color} p-2 rounded-lg shrink-0`}>
                <Icon className="h-5 w-5 text-white" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium truncate">{event.title}</h4>
                  {event.isCompanyFlight && (
                    <Badge variant="secondary" className="text-xs">Company</Badge>
                  )}
                </div>
                
                <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>{event.startTime}{event.endTime && ` - ${event.endTime}`}</span>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    <span className="truncate">{event.location}</span>
                  </div>

                  {event.weather && (
                    <div className="flex items-center gap-1 text-primary">
                      <Cloud className="h-3 w-3" />
                      <span>{event.weather.temp}°F</span>
                    </div>
                  )}

                  {/* Teams Meeting Link - Show in collapsed view */}
                  {event.type === 'meeting' && event.meetingLink && (event.meetingType === 'virtual' || event.meetingType === 'hybrid' || event.meetingLink.toLowerCase().includes('teams')) && (
                    <a
                      href={event.meetingLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1 text-primary hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      <span>Join Meeting</span>
                    </a>
                  )}
                </div>

                {/* Expanded Details */}
                {expanded && (
                  <div className="mt-3 pt-3 border-t space-y-2 text-sm">
                    {event.address && (
                      <p className="text-muted-foreground">{event.address}</p>
                    )}
                    
                    {event.type === 'flight' && (
                      <div className="flex flex-wrap gap-4">
                        {event.airline && <span>✈️ {event.airline}</span>}
                        {event.flightNumber && <span>#{event.flightNumber}</span>}
                        {event.departure && event.arrival && (
                          <span>{event.departure} → {event.arrival}</span>
                        )}
                      </div>
                    )}

                    {event.type === 'hotel' && (
                      <div className="flex flex-wrap gap-4">
                        {event.hotelName && <span>🏨 {event.hotelName}</span>}
                        {event.roomType && <span>🛏️ {event.roomType}</span>}
                        {event.hotelPhone && (
                          <a href={`tel:${event.hotelPhone}`} className="text-primary hover:underline">
                            📞 {event.hotelPhone}
                          </a>
                        )}
                      </div>
                    )}

                    {event.type === 'ground-transport' && (
                      <div className="space-y-1">
                        {event.driverName && <div>🚗 Driver: {event.driverName}</div>}
                        {event.driverPhone && (
                          <a href={`tel:${event.driverPhone}`} className="text-primary hover:underline block">
                            📞 {event.driverPhone}
                          </a>
                        )}
                      </div>
                    )}

                    {event.type === 'meeting' && (
                      <div className="space-y-2">
                        {event.meetingType && (
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {event.meetingType === 'in-person' ? '🏢 In Person' : 
                               event.meetingType === 'virtual' ? '💻 Virtual' : 
                               '🔀 Hybrid'}
                            </Badge>
                          </div>
                        )}
                        {event.meetingRoom && (
                          <div>📍 Room: {event.meetingRoom}</div>
                        )}
                        {event.meetingLink && (
                          <div className="flex items-start gap-2">
                            {event.meetingLink.toLowerCase().includes('teams') ? (
                              <Button
                                size="sm"
                                className="w-full justify-start"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.open(event.meetingLink, '_blank');
                                }}
                              >
                                <ExternalLink className="h-4 w-4 mr-2" />
                                Join Teams Meeting
                              </Button>
                            ) : event.meetingLink.toLowerCase().includes('zoom') ? (
                              <Button
                                size="sm"
                                className="w-full justify-start"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.open(event.meetingLink, '_blank');
                                }}
                              >
                                <ExternalLink className="h-4 w-4 mr-2" />
                                Join Zoom Meeting
                              </Button>
                            ) : event.meetingLink.startsWith('http') ? (
                              <a
                                href={event.meetingLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-primary hover:underline text-sm flex items-center gap-1"
                              >
                                <ExternalLink className="h-3 w-3" />
                                Join Meeting: {event.meetingLink.substring(0, 40)}...
                              </a>
                            ) : (
                              <div className="text-sm">
                                <Phone className="h-3 w-3 inline mr-1" />
                                Dial-in: {event.meetingLink}
                              </div>
                            )}
                          </div>
                        )}
                        {event.attendees && event.attendees.length > 0 && (
                          <div className="text-sm">
                            <div className="font-medium mb-1">Attendees:</div>
                            <div className="flex flex-wrap gap-1">
                              {event.attendees.slice(0, 3).map((attendee) => (
                                <Badge key={attendee.id} variant="secondary" className="text-xs">
                                  {attendee.name}
                                </Badge>
                              ))}
                              {event.attendees.length > 3 && (
                                <Badge variant="secondary" className="text-xs">
                                  +{event.attendees.length - 3} more
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {event.confirmationNumber && (
                      <div className="flex items-center gap-2">
                        <FileText className="h-3 w-3" />
                        <span>Conf: {event.confirmationNumber}</span>
                      </div>
                    )}

                    {event.notes && (
                      <p className="text-muted-foreground italic bg-muted/30 p-2 rounded">
                        {event.notes}
                      </p>
                    )}

                    {event.mapLink && (
                      <a
                        href={event.mapLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-primary hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" />
                        View on Map
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setExpanded(!expanded)}
                className="h-8 w-8 p-0"
              >
                {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(event)}
                className="h-8 w-8 p-0"
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDuplicate(event)}
                className="h-8 w-8 p-0"
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(event.id)}
                className="h-8 w-8 p-0 text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Quick Add Event Type Selector
function QuickAddEventMenu({ onSelectType }: { onSelectType: (type: EventType) => void }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
      {(Object.entries(EventTypeConfig) as [EventType, typeof EventTypeConfig[EventType]][]).map(([type, config]) => {
        const Icon = config.icon;
        return (
          <button
            key={type}
            onClick={() => onSelectType(type)}
            className="flex flex-col items-center gap-2 p-4 rounded-lg border-2 border-dashed hover:border-primary hover:bg-primary/5 transition-all group"
          >
            <div className={`${config.color} p-3 rounded-lg group-hover:scale-110 transition-transform`}>
              <Icon className="h-6 w-6 text-white" />
            </div>
            <span className="text-sm font-medium">{config.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// Compact Event Editor Dialog
interface CompactEventEditorProps {
  open: boolean;
  event: ItineraryEvent | null;
  onClose: () => void;
  onSave: () => void;
  onEventChange: (event: ItineraryEvent) => void;
  availableCompanyFlights: any[];
}

function CompactEventEditor({ open, event, onClose, onSave, onEventChange, availableCompanyFlights }: CompactEventEditorProps) {
  const [currentStep, setCurrentStep] = useState(0);
  
  // Reset currentStep when dialog opens/closes or event changes
  useEffect(() => {
    setCurrentStep(0);
  }, [open, event?.id, event?.type]);
  
  if (!event) return null;

  const config = EventTypeConfig[event.type];
  const Icon = config.icon;

  // Basic info step for all events
  const steps = [
    {
      title: 'Basic Info',
      fields: (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                value={event.title}
                onChange={(e) => onEventChange({ ...event, title: e.target.value })}
                placeholder="Event title"
              />
            </div>
            <div className="space-y-2">
              <Label>Location *</Label>
              <Input
                value={event.location}
                onChange={(e) => onEventChange({ ...event, location: e.target.value })}
                placeholder="Location"
              />
            </div>
            <div className="space-y-2">
              <Label>Date *</Label>
              <Input
                type="date"
                value={event.date}
                onChange={(e) => onEventChange({ ...event, date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Start Time *</Label>
              <Input
                type="time"
                value={event.startTime}
                onChange={(e) => onEventChange({ ...event, startTime: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>End Time</Label>
              <Input
                type="time"
                value={event.endTime || ''}
                onChange={(e) => onEventChange({ ...event, endTime: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Confirmation #</Label>
              <Input
                value={event.confirmationNumber || ''}
                onChange={(e) => onEventChange({ ...event, confirmationNumber: e.target.value })}
                placeholder="Optional"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Address</Label>
            <Input
              value={event.address || ''}
              onChange={(e) => onEventChange({ ...event, address: e.target.value })}
              placeholder="Full address (optional)"
            />
          </div>
        </div>
      )
    }
  ];

  // Add type-specific step
  if (event.type === 'flight') {
    steps.push({
      title: 'Flight Details',
      fields: (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <Label>Company Flight</Label>
            <Switch
              checked={event.isCompanyFlight}
              onCheckedChange={(checked) => onEventChange({ ...event, isCompanyFlight: checked })}
            />
          </div>
          
          {event.isCompanyFlight && availableCompanyFlights.length > 0 && (
            <div className="space-y-2">
              <Label>Link Company Flight</Label>
              <Select
                value={event.linkedFlightId || ''}
                onValueChange={(value) => {
                  const flight = availableCompanyFlights.find(f => f.id === value);
                  if (flight) {
                    onEventChange({
                      ...event,
                      linkedFlightId: value,
                      flightNumber: flight.flightNumber,
                      departure: flight.departure,
                      arrival: flight.arrival,
                      aircraft: flight.aircraft
                    });
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select flight" />
                </SelectTrigger>
                <SelectContent>
                  {availableCompanyFlights.map(flight => (
                    <SelectItem key={flight.id} value={flight.id}>
                      {flight.flightNumber}: {flight.departure} → {flight.arrival}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {!event.isCompanyFlight && (
              <div className="space-y-2">
                <Label>Airline</Label>
                <Input
                  value={event.airline || ''}
                  onChange={(e) => onEventChange({ ...event, airline: e.target.value })}
                  placeholder="e.g., United"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>Flight #</Label>
              <Input
                value={event.flightNumber || ''}
                onChange={(e) => onEventChange({ ...event, flightNumber: e.target.value })}
                placeholder="Flight number"
                disabled={!!event.linkedFlightId}
              />
            </div>
            <div className="space-y-2">
              <Label>From</Label>
              <Input
                value={event.departure || ''}
                onChange={(e) => onEventChange({ ...event, departure: e.target.value })}
                placeholder="Airport code"
                disabled={!!event.linkedFlightId}
              />
            </div>
            <div className="space-y-2">
              <Label>To</Label>
              <Input
                value={event.arrival || ''}
                onChange={(e) => onEventChange({ ...event, arrival: e.target.value })}
                placeholder="Airport code"
                disabled={!!event.linkedFlightId}
              />
            </div>
          </div>
        </div>
      )
    });
  } else if (event.type === 'hotel') {
    steps.push({
      title: 'Hotel Details',
      fields: (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Hotel Name</Label>
              <Input
                value={event.hotelName || ''}
                onChange={(e) => onEventChange({ ...event, hotelName: e.target.value })}
                placeholder="Hotel name"
              />
            </div>
            <div className="space-y-2">
              <Label>Room Type</Label>
              <Input
                value={event.roomType || ''}
                onChange={(e) => onEventChange({ ...event, roomType: e.target.value })}
                placeholder="e.g., Suite"
              />
            </div>
            <div className="space-y-2">
              <Label>Check-in</Label>
              <Input
                type="date"
                value={event.checkIn || ''}
                onChange={(e) => onEventChange({ ...event, checkIn: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Check-out</Label>
              <Input
                type="date"
                value={event.checkOut || ''}
                onChange={(e) => onEventChange({ ...event, checkOut: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                type="tel"
                value={event.hotelPhone || ''}
                onChange={(e) => onEventChange({ ...event, hotelPhone: e.target.value })}
                placeholder="+1 (555) 123-4567"
              />
            </div>
            <div className="space-y-2">
              <Label>Website</Label>
              <Input
                value={event.hotelWebsite || ''}
                onChange={(e) => onEventChange({ ...event, hotelWebsite: e.target.value })}
                placeholder="https://..."
              />
            </div>
          </div>
        </div>
      )
    });
  } else if (event.type === 'ground-transport') {
    steps.push({
      title: 'Transport Details',
      fields: (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={event.transportType || 'car-service'}
                onValueChange={(value) => onEventChange({ ...event, transportType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="car-service">Car Service</SelectItem>
                  <SelectItem value="rental-car">Rental Car</SelectItem>
                  <SelectItem value="uber">Uber/Lyft</SelectItem>
                  <SelectItem value="shuttle">Shuttle</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Company</Label>
              <Input
                value={event.companyName || ''}
                onChange={(e) => onEventChange({ ...event, companyName: e.target.value })}
                placeholder="Company name"
              />
            </div>
            <div className="space-y-2">
              <Label>Driver Name</Label>
              <Input
                value={event.driverName || ''}
                onChange={(e) => onEventChange({ ...event, driverName: e.target.value })}
                placeholder="Driver's name"
              />
            </div>
            <div className="space-y-2">
              <Label>Driver Phone</Label>
              <Input
                type="tel"
                value={event.driverPhone || ''}
                onChange={(e) => onEventChange({ ...event, driverPhone: e.target.value })}
                placeholder="+1 (555) 123-4567"
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Vehicle Info</Label>
              <Input
                value={event.vehicleInfo || ''}
                onChange={(e) => onEventChange({ ...event, vehicleInfo: e.target.value })}
                placeholder="e.g., Black SUV"
              />
            </div>
          </div>
        </div>
      )
    });
  } else if (event.type === 'meeting') {
    steps.push({
      title: 'Meeting Details',
      fields: (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={event.meetingType || 'in-person'}
                onValueChange={(value) => onEventChange({ ...event, meetingType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="in-person">In Person</SelectItem>
                  <SelectItem value="virtual">Virtual</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Room</Label>
              <Input
                value={event.meetingRoom || ''}
                onChange={(e) => onEventChange({ ...event, meetingRoom: e.target.value })}
                placeholder="Conference room"
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label>
                {event.meetingType === 'virtual' || event.meetingType === 'hybrid' 
                  ? 'Meeting Link (Teams/Zoom)' 
                  : 'Meeting Link/Dial-in'}
              </Label>
              <Input
                value={event.meetingLink || ''}
                onChange={(e) => onEventChange({ ...event, meetingLink: e.target.value })}
                placeholder={
                  event.meetingType === 'virtual' || event.meetingType === 'hybrid'
                    ? 'https://teams.microsoft.com/... or https://zoom.us/...'
                    : 'Meeting link, Zoom, Teams, or phone number'
                }
              />
              {event.meetingLink && event.meetingLink.startsWith('http') && (
                <p className="text-xs text-muted-foreground mt-1">
                  ✓ A "Join Meeting" button will be added to this event
                </p>
              )}
            </div>
          </div>
        </div>
      )
    });
  }

  // Contact & Notes step
  steps.push({
    title: 'Contact & Notes',
    fields: (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Contact Name</Label>
            <Input
              value={event.contactName || ''}
              onChange={(e) => onEventChange({ ...event, contactName: e.target.value })}
              placeholder="Primary contact"
            />
          </div>
          <div className="space-y-2">
            <Label>Contact Phone</Label>
            <Input
              type="tel"
              value={event.contactPhone || ''}
              onChange={(e) => onEventChange({ ...event, contactPhone: e.target.value })}
              placeholder="+1 (555) 123-4567"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Notes</Label>
          <Textarea
            value={event.notes || ''}
            onChange={(e) => onEventChange({ ...event, notes: e.target.value })}
            placeholder="Additional notes, instructions, or important information..."
            rows={4}
          />
        </div>
      </div>
    )
  });

  // Safety check: ensure currentStep is within bounds
  const safeCurrentStep = Math.max(0, Math.min(currentStep, steps.length - 1));
  const currentStepData = steps[safeCurrentStep];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className={`${config.color} p-2 rounded-lg`}>
              <Icon className="h-5 w-5 text-white" />
            </div>
            <div>
              <DialogTitle>{event.id.startsWith('event-') ? 'Add' : 'Edit'} {config.label}</DialogTitle>
              <DialogDescription>
                Step {safeCurrentStep + 1} of {steps.length}: {currentStepData?.title || 'Loading...'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-4">
          {/* Progress Indicator */}
          <div className="flex gap-2 mb-6">
            {steps.map((_, idx) => (
              <div
                key={idx}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  idx === safeCurrentStep ? 'bg-primary' : idx < safeCurrentStep ? 'bg-primary/50' : 'bg-muted'
                }`}
              />
            ))}
          </div>

          {/* Current Step Content */}
          <ScrollArea className="max-h-[50vh]">
            {currentStepData?.fields}
          </ScrollArea>
        </div>

        <DialogFooter className="flex justify-between">
          <div className="flex gap-2">
            {safeCurrentStep > 0 && (
              <Button variant="outline" onClick={() => setCurrentStep(Math.max(0, safeCurrentStep - 1))}>
                Back
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            {safeCurrentStep < steps.length - 1 ? (
              <Button onClick={() => setCurrentStep(Math.min(steps.length - 1, safeCurrentStep + 1))}>
                Next
              </Button>
            ) : (
              <Button
                onClick={() => {
                  onSave();
                  setCurrentStep(0);
                }}
                disabled={!event.title || !event.date || !event.startTime || !event.location}
              >
                <Save className="h-4 w-4 mr-2" />
                Save Event
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Main Component
export default function ItineraryBuilderV2() {
  const navigate = useNavigate();
  const [itineraries, setItineraries] = useState<Itinerary[]>([]);
  const [currentItinerary, setCurrentItinerary] = useState<Itinerary | null>(null);
  const [editingEvent, setEditingEvent] = useState<ItineraryEvent | null>(null);
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [availableCompanyFlights, setAvailableCompanyFlights] = useState<any[]>([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    loadItineraries();
    loadCompanyFlights();
  }, []);

  const loadItineraries = () => {
    const saved = localStorage.getItem('itineraries_v2');
    if (saved) {
      setItineraries(JSON.parse(saved));
    }
  };

  const saveItineraries = (updated: Itinerary[]) => {
    localStorage.setItem('itineraries_v2', JSON.stringify(updated));
    setItineraries(updated);
  };

  const loadCompanyFlights = () => {
    const mockFlights = [
      { id: 'cf-1', flightNumber: 'G650-001', departure: 'KTEB', arrival: 'KMIA', date: '2025-11-15', time: '08:00', aircraft: 'N123GS' },
      { id: 'cf-2', flightNumber: 'G650-002', departure: 'KMIA', arrival: 'KTEB', date: '2025-11-17', time: '16:00', aircraft: 'N123GS' },
      { id: 'cf-3', flightNumber: 'G650-003', departure: 'KLAS', arrival: 'KSFO', date: '2025-11-20', time: '10:30', aircraft: 'N456GS' },
    ];
    setAvailableCompanyFlights(mockFlights);
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
  };

  const saveCurrentItinerary = () => {
    if (!currentItinerary) return;
    
    const updatedItinerary = {
      ...currentItinerary,
      updatedAt: new Date().toISOString()
    };
    
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

  const addEventOfType = (type: EventType) => {
    if (!currentItinerary) return;
    
    const newEvent: ItineraryEvent = {
      id: `event-${Date.now()}`,
      type,
      title: '',
      date: currentItinerary.startDate,
      startTime: '09:00',
      location: '',
      order: currentItinerary.events.length
    };
    
    setEditingEvent(newEvent);
    setShowEventDialog(true);
    setShowQuickAdd(false);
  };

  const saveEvent = () => {
    if (!editingEvent || !currentItinerary) return;
    
    const existingIndex = currentItinerary.events.findIndex(e => e.id === editingEvent.id);
    let updatedEvents;
    
    if (existingIndex >= 0) {
      updatedEvents = currentItinerary.events.map((e, idx) => 
        idx === existingIndex ? editingEvent : e
      );
    } else {
      updatedEvents = [...currentItinerary.events, editingEvent];
    }
    
    updatedEvents.sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      return a.startTime.localeCompare(b.startTime);
    });
    
    updatedEvents = updatedEvents.map((e, idx) => ({ ...e, order: idx }));
    
    setCurrentItinerary({
      ...currentItinerary,
      events: updatedEvents
    });
    
    setShowEventDialog(false);
    setEditingEvent(null);
    toast.success('Event saved');
  };

  const moveEvent = (dragIndex: number, hoverIndex: number) => {
    if (!currentItinerary) return;
    
    const updatedEvents = [...currentItinerary.events];
    const [removed] = updatedEvents.splice(dragIndex, 1);
    updatedEvents.splice(hoverIndex, 0, removed);
    
    const reorderedEvents = updatedEvents.map((e, idx) => ({ ...e, order: idx }));
    
    setCurrentItinerary({
      ...currentItinerary,
      events: reorderedEvents
    });
  };

  const deleteEvent = (eventId: string) => {
    if (!currentItinerary) return;
    if (!confirm('Delete this event?')) return;
    
    const updatedEvents = currentItinerary.events
      .filter(e => e.id !== eventId)
      .map((e, idx) => ({ ...e, order: idx }));
    
    setCurrentItinerary({
      ...currentItinerary,
      events: updatedEvents
    });
    
    toast.success('Event deleted');
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

  const editEvent = (event: ItineraryEvent) => {
    setEditingEvent(event);
    setShowEventDialog(true);
  };

  // Group events by date
  const groupEventsByDate = (events: ItineraryEvent[]) => {
    const grouped: { [date: string]: ItineraryEvent[] } = {};
    events.forEach(event => {
      if (!grouped[event.date]) {
        grouped[event.date] = [];
      }
      grouped[event.date].push(event);
    });
    return grouped;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const exportToPDF = () => {
    toast.info('PDF export feature coming soon');
  };

  const sendToOutlook = () => {
    toast.info('Outlook calendar export coming soon');
  };

  if (!currentItinerary) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Itinerary Builder</h1>
          <p className="text-muted-foreground mt-2">
            Create and manage travel itineraries for executives
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card className="border-2 border-dashed hover:border-primary cursor-pointer transition-colors" onClick={createNewItinerary}>
            <CardContent className="flex flex-col items-center justify-center h-48">
              <Plus className="h-12 w-12 text-muted-foreground mb-3" />
              <h3 className="font-medium">Create New Itinerary</h3>
              <p className="text-sm text-muted-foreground">Start from scratch</p>
            </CardContent>
          </Card>

          {itineraries.map(itinerary => (
            <Card key={itinerary.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setCurrentItinerary(itinerary)}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{itinerary.title}</CardTitle>
                    <CardDescription>{itinerary.travelerName}</CardDescription>
                  </div>
                  <Badge variant={itinerary.status === 'finalized' ? 'default' : 'secondary'}>
                    {itinerary.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>{formatDate(itinerary.startDate)} - {formatDate(itinerary.endDate)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <FileText className="h-4 w-4" />
                    <span>{itinerary.events.length} event{itinerary.events.length !== 1 ? 's' : ''}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const groupedEvents = groupEventsByDate(currentItinerary.events);
  const sortedDates = Object.keys(groupedEvents).sort();

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex h-screen overflow-hidden">
        {/* Sidebar - Itinerary Details */}
        <div className={`${sidebarCollapsed ? 'w-0' : 'w-80'} border-r bg-muted/30 flex-shrink-0 transition-all overflow-hidden`}>
          {!sidebarCollapsed && (
            <div className="h-full flex flex-col">
              <div className="p-4 border-b bg-background">
                <h2 className="font-semibold mb-3">Itinerary Details</h2>
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs">Title</Label>
                    <Input
                      value={currentItinerary.title}
                      onChange={(e) => setCurrentItinerary({ ...currentItinerary, title: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Traveler</Label>
                    <Input
                      value={currentItinerary.travelerName}
                      onChange={(e) => setCurrentItinerary({ ...currentItinerary, travelerName: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Start</Label>
                      <Input
                        type="date"
                        value={currentItinerary.startDate}
                        onChange={(e) => setCurrentItinerary({ ...currentItinerary, startDate: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">End</Label>
                      <Input
                        type="date"
                        value={currentItinerary.endDate}
                        onChange={(e) => setCurrentItinerary({ ...currentItinerary, endDate: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-muted rounded">
                    <Label className="text-xs">Corporate Jet</Label>
                    <Switch
                      checked={currentItinerary.isCorporateJetTrip}
                      onCheckedChange={(checked) => setCurrentItinerary({ ...currentItinerary, isCorporateJetTrip: checked })}
                    />
                  </div>
                </div>
              </div>

              <ScrollArea className="flex-1 p-4">
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs mb-2 block">Contact</Label>
                    <Input
                      placeholder="Email"
                      type="email"
                      value={currentItinerary.travelerEmail || ''}
                      onChange={(e) => setCurrentItinerary({ ...currentItinerary, travelerEmail: e.target.value })}
                      className="mb-2"
                    />
                    <Input
                      placeholder="Phone"
                      type="tel"
                      value={currentItinerary.travelerPhone || ''}
                      onChange={(e) => setCurrentItinerary({ ...currentItinerary, travelerPhone: e.target.value })}
                    />
                  </div>
                  
                  <div>
                    <Label className="text-xs mb-2 block">Description</Label>
                    <Textarea
                      placeholder="Trip notes..."
                      value={currentItinerary.description || ''}
                      onChange={(e) => setCurrentItinerary({ ...currentItinerary, description: e.target.value })}
                      rows={4}
                    />
                  </div>

                  <div className="flex items-center justify-between p-2 bg-muted rounded">
                    <div className="flex items-center gap-2">
                      <Bell className="h-4 w-4" />
                      <Label className="text-xs">Notifications</Label>
                    </div>
                    <Switch
                      checked={currentItinerary.notificationsEnabled}
                      onCheckedChange={(checked) => setCurrentItinerary({ ...currentItinerary, notificationsEnabled: checked })}
                    />
                  </div>
                </div>
              </ScrollArea>
            </div>
          )}
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top Bar */}
          <div className="border-b p-4 bg-background">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                >
                  {sidebarCollapsed ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
                </Button>
                <div>
                  <h1 className="text-xl font-semibold">{currentItinerary.title}</h1>
                  <p className="text-sm text-muted-foreground">{currentItinerary.events.length} events</p>
                </div>
                <Badge variant={currentItinerary.status === 'finalized' ? 'default' : 'secondary'}>
                  {currentItinerary.status}
                </Badge>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowExportDialog(true)}>
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
                <Button variant="outline" size="sm" onClick={saveCurrentItinerary}>
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    setCurrentItinerary({ ...currentItinerary, status: 'finalized' });
                    toast.success('Itinerary finalized');
                  }}
                  disabled={currentItinerary.status === 'finalized'}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Finalize
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setCurrentItinerary(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Events Area */}
          <ScrollArea className="flex-1 p-6">
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Quick Add Section */}
              <Card className="border-2 border-dashed">
                <CardContent className="py-4">
                  {!showQuickAdd ? (
                    <Button
                      variant="ghost"
                      className="w-full h-20 border-2 border-dashed"
                      onClick={() => setShowQuickAdd(true)}
                    >
                      <Plus className="h-6 w-6 mr-2" />
                      Add Event
                    </Button>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium">Add New Event</h3>
                        <Button variant="ghost" size="sm" onClick={() => setShowQuickAdd(false)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <QuickAddEventMenu onSelectType={addEventOfType} />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Events Timeline */}
              {sortedDates.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No events yet. Add your first event above.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-8">
                  {sortedDates.map(date => (
                    <div key={date}>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium">
                          {formatDate(date)}
                        </div>
                        <Separator className="flex-1" />
                        <Badge variant="outline">
                          {groupedEvents[date].length} event{groupedEvents[date].length !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                      
                      <div className="space-y-3">
                        {groupedEvents[date].map((event, index) => (
                          <DraggableEventCard
                            key={event.id}
                            event={event}
                            index={currentItinerary.events.indexOf(event)}
                            onMove={moveEvent}
                            onEdit={editEvent}
                            onDelete={deleteEvent}
                            onDuplicate={duplicateEvent}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Event Editor Dialog */}
      <CompactEventEditor
        open={showEventDialog}
        event={editingEvent}
        onClose={() => {
          setShowEventDialog(false);
          setEditingEvent(null);
        }}
        onSave={saveEvent}
        onEventChange={setEditingEvent}
        availableCompanyFlights={availableCompanyFlights}
      />

      {/* Export Dialog */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export Itinerary</DialogTitle>
            <DialogDescription>Choose export format</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Button className="w-full justify-start" onClick={exportToPDF}>
              <Download className="h-4 w-4 mr-2" />
              Export as PDF
            </Button>
            <Button className="w-full justify-start" onClick={sendToOutlook}>
              <Calendar className="h-4 w-4 mr-2" />
              Send to Outlook Calendar
            </Button>
            {currentItinerary.isCorporateJetTrip && (
              <Button className="w-full justify-start">
                <Upload className="h-4 w-4 mr-2" />
                Push to Trip Management
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </DndProvider>
  );
}
