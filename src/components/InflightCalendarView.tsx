import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plane, 
  Users, 
  Calendar,
  Clock,
  MapPin,
  ShieldAlert,
  AlertTriangle,
  AlertCircle,
  Cake,
  User,
  Phone,
  Mail,
  Utensils,
  Eye
} from 'lucide-react';

interface Passenger {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  vipLevel: 'Standard' | 'VIP' | 'VVIP';
  birthDate?: string;
  dietaryRestrictions: string[];
  beveragePreferences: string[];
  allergies: Array<{
    allergen: string;
    severity: 'Critical' | 'Moderate' | 'Mild';
    reaction?: string;
    medication?: string;
  }>;
  notes: string;
  preferences: {
    temperature: string;
    music: string;
    newspaper: string[];
    specialRequests: string;
  };
  emergencyContact?: {
    name: string;
    relationship: string;
    phone: string;
  };
}

interface FlightLeg {
  id: string;
  flightNumber: string;
  legNumber: number;
  date: string;
  departureTime: string;
  arrivalTime: string;
  departureAirport: string;
  arrivalAirport: string;
  aircraft: string;
  passengerIds: string[];
  status: 'Scheduled' | 'Boarding' | 'Departed' | 'Delayed' | 'Cancelled';
  crewAssignment?: {
    captain: string;
    firstOfficer: string;
    flightAttendants: string[];
  };
}

interface CalendarDay {
  date: Date;
  flights: FlightLeg[];
  isCurrentMonth: boolean;
  isToday: boolean;
}

interface InflightCalendarViewProps {
  userRole: string;
}

export default function InflightCalendarView({ userRole }: InflightCalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date(2025, 8, 1)); // September 2025 (month is 0-indexed)
  const [selectedFlight, setSelectedFlight] = useState<FlightLeg | null>(null);
  const [selectedPassenger, setSelectedPassenger] = useState<Passenger | null>(null);

  // Mock flight data
  const upcomingFlightLegs: FlightLeg[] = [
    {
      id: 'LEG001',
      flightNumber: 'FO001',
      legNumber: 1,
      date: '2025-09-15',
      departureTime: '08:00',
      arrivalTime: '13:30',
      departureAirport: 'LAX',
      arrivalAirport: 'JFK',
      aircraft: 'N123GS (Gulfstream G650)',
      passengerIds: ['PAX001', 'PAX002'],
      status: 'Scheduled',
      crewAssignment: {
        captain: 'John Smith',
        firstOfficer: 'Sarah Johnson',
        flightAttendants: ['Maria Garcia', 'You']
      }
    },
    {
      id: 'LEG002',
      flightNumber: 'FO001',
      legNumber: 2,
      date: '2025-09-15',
      departureTime: '15:00',
      arrivalTime: '18:30',
      departureAirport: 'JFK',
      arrivalAirport: 'MIA',
      aircraft: 'N123GS (Gulfstream G650)',
      passengerIds: ['PAX001'],
      status: 'Scheduled',
      crewAssignment: {
        captain: 'John Smith',
        firstOfficer: 'Sarah Johnson',
        flightAttendants: ['Maria Garcia', 'You']
      }
    },
    {
      id: 'LEG003',
      flightNumber: 'FO002',
      legNumber: 1,
      date: '2025-09-16',
      departureTime: '10:30',
      arrivalTime: '16:15',
      departureAirport: 'MIA',
      arrivalAirport: 'LAX',
      aircraft: 'N456GS (Gulfstream G650)',
      passengerIds: ['PAX003', 'PAX004'],
      status: 'Scheduled',
      crewAssignment: {
        captain: 'Michael Brown',
        firstOfficer: 'Lisa Davis',
        flightAttendants: ['You', 'Robert Wilson']
      }
    },
    {
      id: 'LEG004',
      flightNumber: 'FO003',
      legNumber: 1,
      date: '2025-09-20',
      departureTime: '09:45',
      arrivalTime: '14:15',
      departureAirport: 'KTEB',
      arrivalAirport: 'KLAX',
      aircraft: 'N789GS (Gulfstream G650)',
      passengerIds: ['PAX002', 'PAX003'],
      status: 'Scheduled',
      crewAssignment: {
        captain: 'David Lee',
        firstOfficer: 'Anna Martinez',
        flightAttendants: ['You', 'James Taylor']
      }
    }
  ];

  // Mock passengers data
  const passengers: Passenger[] = [
    {
      id: 'PAX001',
      firstName: 'Robert',
      lastName: 'Anderson',
      email: 'robert.anderson@email.com',
      phone: '+1 (555) 123-4567',
      vipLevel: 'VVIP',
      birthDate: '1975-03-15',
      dietaryRestrictions: ['Gluten-free', 'No shellfish'],
      beveragePreferences: ['Dom Pérignon', 'Macallan 18', 'Perrier'],
      allergies: [
        { 
          allergen: 'Shellfish', 
          severity: 'Critical', 
          reaction: 'Anaphylaxis - LIFE THREATENING', 
          medication: 'EpiPen required immediately - keep in seat pocket' 
        },
        { 
          allergen: 'Tree nuts', 
          severity: 'Moderate', 
          reaction: 'Hives, facial swelling', 
          medication: 'Benadryl available' 
        }
      ],
      notes: 'Prefers to board last for privacy. Always travels with personal security. Enjoys discussing business and golf.',
      preferences: {
        temperature: '72°F',
        music: 'Classical',
        newspaper: ['Wall Street Journal', 'Financial Times'],
        specialRequests: 'Fresh orchids for cabin, Evian water only'
      },
      emergencyContact: {
        name: 'Margaret Anderson',
        relationship: 'Spouse',
        phone: '+1 (555) 123-4568'
      }
    },
    {
      id: 'PAX002',
      firstName: 'Sarah',
      lastName: 'Chen',
      email: 'sarah.chen@techcorp.com',
      phone: '+1 (555) 987-6543',
      vipLevel: 'VIP',
      birthDate: '1985-08-22',
      dietaryRestrictions: ['Vegetarian', 'Organic only'],
      beveragePreferences: ['Green tea', 'Kombucha', 'Sparkling water'],
      allergies: [],
      notes: 'Tech executive, frequently works during flights. Prefers quiet environment. Very punctual.',
      preferences: {
        temperature: '70°F',
        music: 'Ambient',
        newspaper: ['TechCrunch', 'Wired'],
        specialRequests: 'Extra power outlets, noise-canceling headphones'
      },
      emergencyContact: {
        name: 'David Chen',
        relationship: 'Brother',
        phone: '+1 (555) 987-6544'
      }
    },
    {
      id: 'PAX003',
      firstName: 'Michael',
      lastName: 'Rodriguez',
      email: 'mrodriguez@email.com',
      phone: '+1 (555) 456-7890',
      vipLevel: 'Standard',
      birthDate: '1990-12-03',
      dietaryRestrictions: ['Keto diet'],
      beveragePreferences: ['Coffee (black)', 'Whiskey neat'],
      allergies: [
        { 
          allergen: 'Peanuts', 
          severity: 'Critical', 
          reaction: 'Severe breathing difficulty - EMERGENCY', 
          medication: 'EpiPen required immediately' 
        }
      ],
      notes: 'Young entrepreneur, first-time Gulfstream G650 passenger. Very interested in aircraft operations.',
      preferences: {
        temperature: '68°F',
        music: 'Jazz',
        newspaper: ['Entrepreneur Magazine'],
        specialRequests: 'Tour of cockpit if possible'
      }
    },
    {
      id: 'PAX004',
      firstName: 'Emily',
      lastName: 'Watson',
      email: 'emily.watson@email.com',
      phone: '+1 (555) 234-5678',
      vipLevel: 'VIP',
      birthDate: '1978-06-10',
      dietaryRestrictions: ['Lactose intolerant'],
      beveragePreferences: ['Oat milk latte', 'Sparkling water'],
      allergies: [
        { 
          allergen: 'Latex', 
          severity: 'Mild', 
          reaction: 'Skin irritation', 
          medication: 'Avoid latex gloves during service' 
        }
      ],
      notes: 'Frequent business traveler. Prefers minimal conversation during flights.',
      preferences: {
        temperature: '71°F',
        music: 'None - prefers silence',
        newspaper: ['Business Week'],
        specialRequests: 'No latex materials, dairy-free options'
      },
      emergencyContact: {
        name: 'James Watson',
        relationship: 'Husband',
        phone: '+1 (555) 234-5679'
      }
    }
  ];

  // Calendar utility functions
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days: CalendarDay[] = [];
    const today = new Date();
    
    for (let i = 0; i < 42; i++) {
      const currentDay = new Date(startDate);
      currentDay.setDate(startDate.getDate() + i);
      
      const dayFlights = upcomingFlightLegs.filter(flight => {
        const flightDate = new Date(flight.date);
        return flightDate.toDateString() === currentDay.toDateString();
      });
      
      days.push({
        date: currentDay,
        flights: dayFlights,
        isCurrentMonth: currentDay.getMonth() === month,
        isToday: currentDay.toDateString() === today.toDateString()
      });
    }
    
    return days;
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const getFlightPassengers = (flight: FlightLeg) => {
    return passengers.filter(passenger => flight.passengerIds.includes(passenger.id));
  };

  const getVipColor = (level: string) => {
    switch (level) {
      case 'VVIP': return 'bg-purple-600 text-white border-purple-700';
      case 'VIP': return 'bg-blue-600 text-white border-blue-700';
      case 'Standard': return 'bg-gray-500 text-white border-gray-600';
      default: return 'bg-gray-500 text-white border-gray-600';
    }
  };

  const getAllergySeverityColor = (severity: string) => {
    switch (severity) {
      case 'Critical': return 'bg-red-600 text-white border-red-700';
      case 'Moderate': return 'bg-orange-500 text-white border-orange-600';
      case 'Mild': return 'bg-yellow-500 text-white border-yellow-600';
      default: return 'bg-gray-500 text-white border-gray-600';
    }
  };

  const getAllergySeverityIcon = (severity: string) => {
    switch (severity) {
      case 'Critical': return <ShieldAlert className="w-3 h-3" />;
      case 'Moderate': return <AlertTriangle className="w-3 h-3" />;
      case 'Mild': return <AlertCircle className="w-3 h-3" />;
      default: return <AlertCircle className="w-3 h-3" />;
    }
  };

  const hasCriticalAllergies = (passenger: Passenger) => 
    passenger.allergies.some(allergy => allergy.severity === 'Critical');

  const isBirthdayDuringTrip = (birthDate: string, flightDate: string) => {
    if (!birthDate) return false;
    const birth = new Date(birthDate);
    const flight = new Date(flightDate);
    const birthdayThisYear = new Date(flight.getFullYear(), birth.getMonth(), birth.getDate());
    
    // Check if birthday is within 3 days of flight
    const diffTime = Math.abs(birthdayThisYear.getTime() - flight.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays <= 3;
  };

  const days = getDaysInMonth(currentDate);

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)));
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)));
  };

  const FlightSelectionDialog = ({ flights, date }: { flights: FlightLeg[], date: Date }) => (
    <Dialog>
      <DialogTrigger asChild>
        <div className="cursor-pointer">
          <div className="text-xs font-medium text-primary mb-1">
            {flights.length} flight{flights.length > 1 ? 's' : ''}
          </div>
          <div className="space-y-1">
            {flights.slice(0, 2).map((flight, index) => (
              <div key={index} className="bg-primary/10 text-primary px-1 py-0.5 rounded text-[10px] truncate">
                {flight.flightNumber}
              </div>
            ))}
            {flights.length > 2 && (
              <div className="text-[10px] text-muted-foreground">
                +{flights.length - 2} more
              </div>
            )}
          </div>
        </div>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Select Flight - {date.toLocaleDateString()}</DialogTitle>
          <DialogDescription>
            Choose a flight to view passenger details and service information
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {flights.map((flight) => {
            const flightPassengers = getFlightPassengers(flight);
            return (
              <Card key={flight.id} className="cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => setSelectedFlight(flight)}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <Plane className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-medium">{flight.flightNumber} - Leg {flight.legNumber}</h3>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {flight.departureAirport} → {flight.arrivalAirport}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {flight.departureTime} - {flight.arrivalTime}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2 mb-1">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">{flightPassengers.length} passengers</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        {flightPassengers.some(p => hasCriticalAllergies(p)) && (
                          <Badge variant="destructive" className="text-xs">
                            <ShieldAlert className="w-3 h-3 mr-1" />
                            Critical Allergies
                          </Badge>
                        )}
                        {flightPassengers.some(p => p.vipLevel === 'VVIP') && (
                          <Badge className="bg-purple-600 text-xs">VVIP</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="p-4 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2">
            <Calendar className="w-6 h-6 text-primary" />
            Flight Schedule Calendar
          </h1>
          <p className="text-muted-foreground">
            Your inflight crew assignments with passenger service details
          </p>
        </div>
      </div>

      {/* Calendar Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={prevMonth}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <CardTitle className="text-xl">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </CardTitle>
            <Button variant="outline" onClick={nextMonth}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Day Headers */}
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="p-2 text-center font-medium text-muted-foreground bg-muted rounded-md">
                {day}
              </div>
            ))}
            
            {/* Calendar Days */}
            {days.map((day, index) => (
              <div key={index} className={`
                p-2 h-24 border rounded-md transition-colors
                ${day.isCurrentMonth ? 'bg-background' : 'bg-muted/30'}
                ${day.isToday ? 'border-primary border-2 bg-primary/5' : 'border-border'}
                ${day.flights.length > 0 ? 'hover:bg-accent/50 cursor-pointer' : ''}
              `}>
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-sm ${day.isCurrentMonth ? 'text-foreground' : 'text-muted-foreground'} ${day.isToday ? 'font-bold text-primary' : ''}`}>
                    {day.date.getDate()}
                  </span>
                  {day.flights.length > 0 && day.flights.some(f => getFlightPassengers(f).some(p => hasCriticalAllergies(p))) && (
                    <ShieldAlert className="w-3 h-3 text-red-600" />
                  )}
                </div>
                
                {day.flights.length > 0 && (
                  <FlightSelectionDialog flights={day.flights} date={day.date} />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Flight Detail Dialog */}
      {selectedFlight && (
        <Dialog open={!!selectedFlight} onOpenChange={() => setSelectedFlight(null)}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Plane className="w-5 h-5" />
                {selectedFlight.flightNumber} - Leg {selectedFlight.legNumber}
                <Badge className="bg-primary/10 text-primary">
                  {new Date(selectedFlight.date).toLocaleDateString()}
                </Badge>
              </DialogTitle>
              <DialogDescription>
                Flight details and passenger service information for your crew assignment
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Flight Info */}
              <Card>
                <CardContent className="p-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-sm text-muted-foreground">Route</div>
                      <div className="font-medium">{selectedFlight.departureAirport} → {selectedFlight.arrivalAirport}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm text-muted-foreground">Time</div>
                      <div className="font-medium">{selectedFlight.departureTime} - {selectedFlight.arrivalTime}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm text-muted-foreground">Aircraft</div>
                      <div className="font-medium">{selectedFlight.aircraft}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm text-muted-foreground">Passengers</div>
                      <div className="font-medium">{getFlightPassengers(selectedFlight).length}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Passenger List */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Passenger Manifest & Service Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4">
                    {getFlightPassengers(selectedFlight).map((passenger) => (
                      <Card key={passenger.id} className={`${hasCriticalAllergies(passenger) ? 'border-red-500 border-2' : ''}`}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-4">
                              <div className="p-2 bg-accent/10 rounded-lg">
                                <User className="w-5 h-5 text-accent" />
                              </div>
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <h3 className="font-medium">{passenger.firstName} {passenger.lastName}</h3>
                                  <Badge className={getVipColor(passenger.vipLevel)}>
                                    {passenger.vipLevel}
                                  </Badge>
                                  {passenger.birthDate && isBirthdayDuringTrip(passenger.birthDate, selectedFlight.date) && (
                                    <Badge className="bg-purple-100 text-purple-800">
                                      <Cake className="w-3 h-3 mr-1" />
                                      Birthday Trip!
                                    </Badge>
                                  )}
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <span className="text-muted-foreground">Contact: </span>
                                    {passenger.phone}
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Temperature: </span>
                                    {passenger.preferences.temperature}
                                  </div>
                                </div>

                                {/* Allergies - Critical Section */}
                                {passenger.allergies.length > 0 && (
                                  <div className="space-y-2">
                                    <h4 className="font-medium text-red-700 flex items-center gap-1">
                                      <ShieldAlert className="w-4 h-4" />
                                      MEDICAL ALERTS - ALLERGIES
                                    </h4>
                                    <div className="space-y-2">
                                      {passenger.allergies.map((allergy, index) => (
                                        <div key={index} className={`p-2 rounded-md border-2 ${
                                          allergy.severity === 'Critical' ? 'bg-red-50 border-red-300' : 
                                          allergy.severity === 'Moderate' ? 'bg-orange-50 border-orange-300' : 
                                          'bg-yellow-50 border-yellow-300'
                                        }`}>
                                          <div className="flex items-center gap-2 mb-1">
                                            <Badge className={getAllergySeverityColor(allergy.severity)}>
                                              {getAllergySeverityIcon(allergy.severity)}
                                              {allergy.severity.toUpperCase()}
                                            </Badge>
                                            <span className="font-medium">{allergy.allergen}</span>
                                          </div>
                                          {allergy.reaction && (
                                            <p className="text-sm text-red-700 font-medium">
                                              Reaction: {allergy.reaction}
                                            </p>
                                          )}
                                          {allergy.medication && (
                                            <p className="text-sm text-red-700 font-medium">
                                              Emergency Action: {allergy.medication}
                                            </p>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Dietary Restrictions */}
                                {passenger.dietaryRestrictions.length > 0 && (
                                  <div>
                                    <h4 className="font-medium flex items-center gap-1 mb-2">
                                      <Utensils className="w-4 h-4" />
                                      Dietary Requirements
                                    </h4>
                                    <div className="flex flex-wrap gap-1">
                                      {passenger.dietaryRestrictions.map((restriction, index) => (
                                        <Badge key={index} variant="outline">{restriction}</Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Beverage Preferences */}
                                {passenger.beveragePreferences.length > 0 && (
                                  <div>
                                    <h4 className="font-medium mb-2">Preferred Beverages</h4>
                                    <div className="flex flex-wrap gap-1">
                                      {passenger.beveragePreferences.map((beverage, index) => (
                                        <Badge key={index} className="bg-blue-100 text-blue-800">{beverage}</Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Special Requests */}
                                {passenger.preferences.specialRequests && (
                                  <div>
                                    <h4 className="font-medium mb-1">Special Requests</h4>
                                    <p className="text-sm text-muted-foreground italic">
                                      {passenger.preferences.specialRequests}
                                    </p>
                                  </div>
                                )}

                                {/* Service Notes */}
                                {passenger.notes && (
                                  <div>
                                    <h4 className="font-medium mb-1">Service Notes</h4>
                                    <p className="text-sm text-muted-foreground italic">
                                      {passenger.notes}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => setSelectedPassenger(passenger)}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              Full Details
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Detailed Passenger Dialog */}
      {selectedPassenger && (
        <Dialog open={!!selectedPassenger} onOpenChange={() => setSelectedPassenger(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                {selectedPassenger.firstName} {selectedPassenger.lastName}
                <Badge className={getVipColor(selectedPassenger.vipLevel)}>
                  {selectedPassenger.vipLevel}
                </Badge>
              </DialogTitle>
              <DialogDescription>
                Complete passenger profile and service preferences
              </DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="overview" className="space-y-4">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="medical">Medical & Allergies</TabsTrigger>
                <TabsTrigger value="dining">Dining Preferences</TabsTrigger>
                <TabsTrigger value="contact">Contact & Notes</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Personal Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div><span className="font-medium">Name:</span> {selectedPassenger.firstName} {selectedPassenger.lastName}</div>
                      <div><span className="font-medium">VIP Level:</span> {selectedPassenger.vipLevel}</div>
                      {selectedPassenger.birthDate && (
                        <div><span className="font-medium">Birth Date:</span> {new Date(selectedPassenger.birthDate).toLocaleDateString()}</div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Service Preferences</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div><span className="font-medium">Temperature:</span> {selectedPassenger.preferences.temperature}</div>
                      <div><span className="font-medium">Music:</span> {selectedPassenger.preferences.music}</div>
                      <div><span className="font-medium">Reading Material:</span> {selectedPassenger.preferences.newspaper.join(', ')}</div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="medical" className="space-y-4">
                {selectedPassenger.allergies.length > 0 ? (
                  <div className="space-y-4">
                    {selectedPassenger.allergies.map((allergy, index) => (
                      <Card key={index} className={`border-2 ${
                        allergy.severity === 'Critical' ? 'border-red-500 bg-red-50' :
                        allergy.severity === 'Moderate' ? 'border-orange-500 bg-orange-50' :
                        'border-yellow-500 bg-yellow-50'
                      }`}>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Badge className={getAllergySeverityColor(allergy.severity)}>
                              {getAllergySeverityIcon(allergy.severity)}
                              {allergy.severity.toUpperCase()}
                            </Badge>
                            {allergy.allergen}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {allergy.reaction && (
                            <div className="mb-2">
                              <span className="font-medium">Reaction:</span> {allergy.reaction}
                            </div>
                          )}
                          {allergy.medication && (
                            <div>
                              <span className="font-medium">Emergency Action:</span> {allergy.medication}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="p-6 text-center">
                      <p className="text-muted-foreground">No known allergies on file</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="dining" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Dietary Restrictions</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {selectedPassenger.dietaryRestrictions.map((restriction, index) => (
                          <Badge key={index} variant="outline">{restriction}</Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Beverage Preferences</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {selectedPassenger.beveragePreferences.map((beverage, index) => (
                          <Badge key={index} className="bg-blue-100 text-blue-800">{beverage}</Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="contact" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Contact Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        {selectedPassenger.phone}
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        {selectedPassenger.email}
                      </div>
                    </CardContent>
                  </Card>

                  {selectedPassenger.emergencyContact && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Emergency Contact</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div><span className="font-medium">Name:</span> {selectedPassenger.emergencyContact.name}</div>
                        <div><span className="font-medium">Relationship:</span> {selectedPassenger.emergencyContact.relationship}</div>
                        <div><span className="font-medium">Phone:</span> {selectedPassenger.emergencyContact.phone}</div>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {selectedPassenger.notes && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Service Notes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm">{selectedPassenger.notes}</p>
                    </CardContent>
                  </Card>
                )}

                {selectedPassenger.preferences.specialRequests && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Special Requests</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm italic">{selectedPassenger.preferences.specialRequests}</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}