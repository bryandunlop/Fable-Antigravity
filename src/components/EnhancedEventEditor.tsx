import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { Badge } from './ui/badge';
import { Switch } from './ui/switch';
import { Card, CardContent } from './ui/card';
import {
  Save,
  Plus,
  Trash2,
  Plane,
  Building,
  Phone,
  Mail,
  MapPin,
  LinkIcon,
  UserPlus,
  Navigation,
  ExternalLink,
  Cloud
} from 'lucide-react';

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
  amenities?: string[];
  
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

interface EnhancedEventEditorProps {
  open: boolean;
  event: ItineraryEvent | null;
  onClose: () => void;
  onSave: () => void;
  onEventChange: (event: ItineraryEvent) => void;
  availableCompanyFlights?: any[];
  onLinkCompanyFlight?: (flightId: string) => void;
}

export default function EnhancedEventEditor({ 
  open, 
  event, 
  onClose, 
  onSave, 
  onEventChange,
  availableCompanyFlights = [],
  onLinkCompanyFlight
}: EnhancedEventEditorProps) {
  const [showCompanyFlights, setShowCompanyFlights] = useState(false);

  if (!event) return null;

  const addAttendee = () => {
    const newAttendee: MeetingAttendee = {
      id: `attendee-${Date.now()}`,
      name: '',
      email: '',
      role: '',
      company: ''
    };
    onEventChange({
      ...event,
      attendees: [...(event.attendees || []), newAttendee]
    });
  };

  const updateAttendee = (id: string, updates: Partial<MeetingAttendee>) => {
    onEventChange({
      ...event,
      attendees: (event.attendees || []).map(a => 
        a.id === id ? { ...a, ...updates } : a
      )
    });
  };

  const removeAttendee = (id: string) => {
    onEventChange({
      ...event,
      attendees: (event.attendees || []).filter(a => a.id !== id)
    });
  };

  const addTransportLeg = () => {
    const newLeg: TransportLeg = {
      id: `leg-${Date.now()}`,
      from: '',
      to: '',
      pickupTime: '09:00',
      notes: ''
    };
    onEventChange({
      ...event,
      transportLegs: [...(event.transportLegs || []), newLeg]
    });
  };

  const updateTransportLeg = (id: string, updates: Partial<TransportLeg>) => {
    onEventChange({
      ...event,
      transportLegs: (event.transportLegs || []).map(l => 
        l.id === id ? { ...l, ...updates } : l
      )
    });
  };

  const removeTransportLeg = (id: string) => {
    onEventChange({
      ...event,
      transportLegs: (event.transportLegs || []).filter(l => l.id !== id)
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <span>{event.id.startsWith('event-') ? 'Add' : 'Edit'} Event</span>
            {event.weather && (
              <Badge variant="outline" className="ml-2">
                <Cloud className="h-3 w-3 mr-1" />
                {event.weather.temp}°F
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Configure event details, contacts, and scheduling information
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-200px)]">
          <div className="space-y-6 pr-4">
            {/* Basic Information */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Event Type *</Label>
                <Select
                  value={event.type}
                  onValueChange={(value: EventType) => onEventChange({ ...event, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="flight">✈️ Flight</SelectItem>
                    <SelectItem value="hotel">🏨 Hotel</SelectItem>
                    <SelectItem value="meeting">💼 Meeting</SelectItem>
                    <SelectItem value="dining">🍽️ Dining</SelectItem>
                    <SelectItem value="ground-transport">🚗 Ground Transport</SelectItem>
                    <SelectItem value="activity">🎯 Activity</SelectItem>
                    <SelectItem value="other">📋 Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Event Title *</Label>
                <Input
                  value={event.title}
                  onChange={(e) => onEventChange({ ...event, title: e.target.value })}
                  placeholder="e.g., Flight to NYC"
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
                <Label>Location *</Label>
                <Input
                  value={event.location}
                  onChange={(e) => onEventChange({ ...event, location: e.target.value })}
                  placeholder="e.g., JFK Airport"
                />
              </div>

              <div className="space-y-2 col-span-2">
                <Label>Address</Label>
                <Input
                  value={event.address || ''}
                  onChange={(e) => onEventChange({ ...event, address: e.target.value })}
                  placeholder="Full address"
                />
              </div>
            </div>

            <Separator />

            {/* Flight-Specific Fields */}
            {event.type === 'flight' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Flight Details</h4>
                  <div className="flex items-center space-x-2">
                    <Label className="text-sm">Company Flight</Label>
                    <Switch
                      checked={event.isCompanyFlight}
                      onCheckedChange={(checked) => {
                        onEventChange({ ...event, isCompanyFlight: checked });
                        if (checked) setShowCompanyFlights(true);
                      }}
                    />
                  </div>
                </div>

                {event.isCompanyFlight && availableCompanyFlights.length > 0 && (
                  <Card className="bg-primary/5">
                    <CardContent className="py-3">
                      <Label className="text-sm mb-2 block">Link to Company Flight</Label>
                      <Select
                        value={event.linkedFlightId || ''}
                        onValueChange={(value) => onLinkCompanyFlight?.(value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a company flight" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableCompanyFlights.map(flight => (
                            <SelectItem key={flight.id} value={flight.id}>
                              {flight.flightNumber}: {flight.departure} → {flight.arrival} ({flight.date} at {flight.time})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </CardContent>
                  </Card>
                )}

                <div className="grid grid-cols-2 gap-4">
                  {!event.isCompanyFlight && (
                    <div className="space-y-2">
                      <Label>Airline</Label>
                      <Input
                        value={event.airline || ''}
                        onChange={(e) => onEventChange({ ...event, airline: e.target.value })}
                        placeholder="e.g., United Airlines"
                      />
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <Label>Flight Number</Label>
                    <Input
                      value={event.flightNumber || ''}
                      onChange={(e) => onEventChange({ ...event, flightNumber: e.target.value })}
                      placeholder={event.isCompanyFlight ? "G650-001" : "UA1234"}
                      disabled={!!event.linkedFlightId}
                    />
                  </div>

                  {event.isCompanyFlight && (
                    <div className="space-y-2">
                      <Label>Aircraft</Label>
                      <Input
                        value={event.aircraft || ''}
                        onChange={(e) => onEventChange({ ...event, aircraft: e.target.value })}
                        placeholder="e.g., N123GS"
                        disabled={!!event.linkedFlightId}
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Departure Airport</Label>
                    <Input
                      value={event.departure || ''}
                      onChange={(e) => onEventChange({ ...event, departure: e.target.value })}
                      placeholder="ICAO/IATA code"
                      disabled={!!event.linkedFlightId}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Arrival Airport</Label>
                    <Input
                      value={event.arrival || ''}
                      onChange={(e) => onEventChange({ ...event, arrival: e.target.value })}
                      placeholder="ICAO/IATA code"
                      disabled={!!event.linkedFlightId}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Departure Terminal</Label>
                    <Input
                      value={event.departureTerminal || ''}
                      onChange={(e) => onEventChange({ ...event, departureTerminal: e.target.value })}
                      placeholder="e.g., Terminal 3"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Arrival Terminal</Label>
                    <Input
                      value={event.arrivalTerminal || ''}
                      onChange={(e) => onEventChange({ ...event, arrivalTerminal: e.target.value })}
                      placeholder="e.g., Terminal 1"
                    />
                  </div>

                  {!event.isCompanyFlight && (
                    <div className="space-y-2">
                      <Label>Seat Number</Label>
                      <Input
                        value={event.seatNumber || ''}
                        onChange={(e) => onEventChange({ ...event, seatNumber: e.target.value })}
                        placeholder="e.g., 3A"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Hotel-Specific Fields */}
            {event.type === 'hotel' && (
              <div className="space-y-4">
                <h4 className="font-medium">Hotel Details</h4>
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
                    <Label>Hotel Phone</Label>
                    <Input
                      type="tel"
                      value={event.hotelPhone || ''}
                      onChange={(e) => onEventChange({ ...event, hotelPhone: e.target.value })}
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>

                  <div className="space-y-2 col-span-2">
                    <Label>Hotel Address</Label>
                    <Input
                      value={event.hotelAddress || ''}
                      onChange={(e) => onEventChange({ ...event, hotelAddress: e.target.value })}
                      placeholder="Full hotel address"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Hotel Website</Label>
                    <Input
                      value={event.hotelWebsite || ''}
                      onChange={(e) => onEventChange({ ...event, hotelWebsite: e.target.value })}
                      placeholder="https://..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Room Type</Label>
                    <Input
                      value={event.roomType || ''}
                      onChange={(e) => onEventChange({ ...event, roomType: e.target.value })}
                      placeholder="e.g., Executive Suite"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Room Number</Label>
                    <Input
                      value={event.roomNumber || ''}
                      onChange={(e) => onEventChange({ ...event, roomNumber: e.target.value })}
                      placeholder="e.g., 1205"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Check-in Date</Label>
                    <Input
                      type="date"
                      value={event.checkIn || ''}
                      onChange={(e) => onEventChange({ ...event, checkIn: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Check-in Time</Label>
                    <Input
                      type="time"
                      value={event.startTime || '15:00'}
                      onChange={(e) => onEventChange({ ...event, startTime: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Check-out Date</Label>
                    <Input
                      type="date"
                      value={event.checkOut || ''}
                      onChange={(e) => onEventChange({ ...event, checkOut: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Check-out Time</Label>
                    <Input
                      type="time"
                      value={event.endTime || '11:00'}
                      onChange={(e) => onEventChange({ ...event, endTime: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Meeting-Specific Fields */}
            {event.type === 'meeting' && (
              <div className="space-y-4">
                <h4 className="font-medium">Meeting Details</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Meeting Type</Label>
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
                    <Label>Meeting Room</Label>
                    <Input
                      value={event.meetingRoom || ''}
                      onChange={(e) => onEventChange({ ...event, meetingRoom: e.target.value })}
                      placeholder="e.g., Conference Room A"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Dial-in Number</Label>
                    <Input
                      type="tel"
                      value={event.dialInNumber || ''}
                      onChange={(e) => onEventChange({ ...event, dialInNumber: e.target.value })}
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Meeting Link</Label>
                    <Input
                      value={event.meetingLink || ''}
                      onChange={(e) => onEventChange({ ...event, meetingLink: e.target.value })}
                      placeholder="https://zoom.us/..."
                    />
                  </div>

                  <div className="space-y-2 col-span-2">
                    <Label>Agenda</Label>
                    <Textarea
                      value={event.agenda || ''}
                      onChange={(e) => onEventChange({ ...event, agenda: e.target.value })}
                      placeholder="Meeting agenda and topics"
                      rows={3}
                    />
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <Label>Attendees</Label>
                    <Button type="button" size="sm" onClick={addAttendee}>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add Attendee
                    </Button>
                  </div>

                  {event.attendees && event.attendees.length > 0 && (
                    <div className="space-y-3">
                      {event.attendees.map((attendee) => (
                        <Card key={attendee.id}>
                          <CardContent className="py-3">
                            <div className="grid grid-cols-2 gap-3">
                              <Input
                                placeholder="Name *"
                                value={attendee.name}
                                onChange={(e) => updateAttendee(attendee.id, { name: e.target.value })}
                              />
                              <Input
                                placeholder="Email"
                                value={attendee.email || ''}
                                onChange={(e) => updateAttendee(attendee.id, { email: e.target.value })}
                              />
                              <Input
                                placeholder="Role/Title"
                                value={attendee.role || ''}
                                onChange={(e) => updateAttendee(attendee.id, { role: e.target.value })}
                              />
                              <div className="flex space-x-2">
                                <Input
                                  placeholder="Company"
                                  value={attendee.company || ''}
                                  onChange={(e) => updateAttendee(attendee.id, { company: e.target.value })}
                                  className="flex-1"
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeAttendee(attendee.id)}
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
                </div>
              </div>
            )}

            {/* Ground Transport-Specific Fields */}
            {event.type === 'ground-transport' && (
              <div className="space-y-4">
                <h4 className="font-medium">Transportation Details</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Transport Type</Label>
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
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Company Name</Label>
                    <Input
                      value={event.companyName || ''}
                      onChange={(e) => onEventChange({ ...event, companyName: e.target.value })}
                      placeholder="Transportation company"
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

                  <div className="space-y-2">
                    <Label>Vehicle Info</Label>
                    <Input
                      value={event.vehicleInfo || ''}
                      onChange={(e) => onEventChange({ ...event, vehicleInfo: e.target.value })}
                      placeholder="e.g., Black Suburban"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Vehicle Plate</Label>
                    <Input
                      value={event.vehiclePlate || ''}
                      onChange={(e) => onEventChange({ ...event, vehiclePlate: e.target.value })}
                      placeholder="License plate"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Pickup Location</Label>
                    <Input
                      value={event.pickupLocation || ''}
                      onChange={(e) => onEventChange({ ...event, pickupLocation: e.target.value })}
                      placeholder="Pickup address"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Dropoff Location</Label>
                    <Input
                      value={event.dropoffLocation || ''}
                      onChange={(e) => onEventChange({ ...event, dropoffLocation: e.target.value })}
                      placeholder="Dropoff address"
                    />
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <Label>Multiple Stops/Legs</Label>
                    <Button type="button" size="sm" onClick={addTransportLeg}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Leg
                    </Button>
                  </div>

                  {event.transportLegs && event.transportLegs.length > 0 && (
                    <div className="space-y-3">
                      {event.transportLegs.map((leg, index) => (
                        <Card key={leg.id}>
                          <CardContent className="py-3">
                            <div className="flex items-center space-x-2 mb-2">
                              <Badge variant="outline">Leg {index + 1}</Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <Input
                                placeholder="From *"
                                value={leg.from}
                                onChange={(e) => updateTransportLeg(leg.id, { from: e.target.value })}
                              />
                              <Input
                                placeholder="To *"
                                value={leg.to}
                                onChange={(e) => updateTransportLeg(leg.id, { to: e.target.value })}
                              />
                              <Input
                                type="time"
                                placeholder="Pickup Time"
                                value={leg.pickupTime}
                                onChange={(e) => updateTransportLeg(leg.id, { pickupTime: e.target.value })}
                              />
                              <div className="flex space-x-2">
                                <Input
                                  placeholder="Notes"
                                  value={leg.notes || ''}
                                  onChange={(e) => updateTransportLeg(leg.id, { notes: e.target.value })}
                                  className="flex-1"
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeTransportLeg(leg.id)}
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
                </div>
              </div>
            )}

            {/* Contact & Confirmation */}
            <Separator />

            <div className="space-y-4">
              <h4 className="font-medium">Contact & Confirmation</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Confirmation Number</Label>
                  <Input
                    value={event.confirmationNumber || ''}
                    onChange={(e) => onEventChange({ ...event, confirmationNumber: e.target.value })}
                    placeholder="Booking/Confirmation #"
                  />
                </div>

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

                <div className="space-y-2">
                  <Label>Contact Email</Label>
                  <Input
                    type="email"
                    value={event.contactEmail || ''}
                    onChange={(e) => onEventChange({ ...event, contactEmail: e.target.value })}
                    placeholder="contact@example.com"
                  />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>Additional Notes</Label>
              <Textarea
                value={event.notes || ''}
                onChange={(e) => onEventChange({ ...event, notes: e.target.value })}
                placeholder="Any special instructions, requirements, or important information..."
                rows={4}
              />
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={onSave}
            disabled={!event.title || !event.date || !event.startTime || !event.location}
          >
            <Save className="h-4 w-4 mr-2" />
            Save Event
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
