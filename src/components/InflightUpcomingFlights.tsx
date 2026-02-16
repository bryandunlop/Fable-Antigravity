import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Link } from 'react-router-dom';
import { 
  Plane, 
  Users, 
  Search, 
  Eye,
  Calendar,
  Clock,
  MapPin,
  Phone,
  Mail,
  AlertTriangle,
  ShieldAlert,
  AlertCircle,
  ChefHat,
  Gift,
  Cake,
  ChevronDown,
  ChevronRight,
  User,
  Utensils,
  Heart,
  ArrowRight
} from 'lucide-react';

interface Passenger {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  vipLevel: 'Standard' | 'VIP' | 'VVIP';
  birthDate?: string;
  address?: string;
  dietaryRestrictions: string[];
  beveragePreferences: string[];
  seatPreferences: string[];
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

interface InflightUpcomingFlightsProps {
  compact?: boolean;
}

export default function InflightUpcomingFlights({ compact = false }: InflightUpcomingFlightsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedFlight, setExpandedFlight] = useState<string | null>(null);
  const [selectedPassenger, setSelectedPassenger] = useState<Passenger | null>(null);

  // Mock upcoming flight legs data - updated for September 2025
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
      aircraft: 'N123AB',
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
      aircraft: 'N123AB',
      passengerIds: ['PAX003'],
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
      aircraft: 'N456CD',
      passengerIds: ['PAX001', 'PAX004'],
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
      date: '2025-09-18',
      departureTime: '16:45',
      arrivalTime: '19:15',
      departureAirport: 'EWR',
      arrivalAirport: 'ATL',
      aircraft: 'N789EF',
      passengerIds: ['PAX002', 'PAX003'],
      status: 'Scheduled',
      crewAssignment: {
        captain: 'David Lee',
        firstOfficer: 'Anna Martinez',
        flightAttendants: ['You', 'James Taylor']
      }
    }
  ];

  // Mock passengers data - updated birth dates for September 2025 birthdays
  const passengers: Passenger[] = [
    {
      id: 'PAX001',
      firstName: 'Robert',
      lastName: 'Johnson',
      email: 'robert.johnson@email.com',
      phone: '+1 (555) 123-4567',
      vipLevel: 'VVIP',
      birthDate: '1975-09-16', // Birthday during trip!
      address: '123 Park Avenue, New York, NY 10021',
      dietaryRestrictions: ['Gluten-free', 'No shellfish'],
      beveragePreferences: ['Dom Pérignon', 'Macallan 18', 'Perrier'],
      seatPreferences: ['Forward-facing', 'Window seat', 'Extra legroom'],
      allergies: [
        { 
          allergen: 'Shellfish', 
          severity: 'Critical', 
          reaction: 'Anaphylaxis', 
          medication: 'EpiPen - seat pocket' 
        },
        { 
          allergen: 'Tree nuts', 
          severity: 'Moderate', 
          reaction: 'Hives, swelling', 
          medication: 'Benadryl' 
        }
      ],
      notes: 'Prefers to board last for privacy. Always travels with personal security. Enjoys discussing business and golf.',
      preferences: {
        temperature: '72°F',
        music: 'Classical',
        newspaper: ['Wall Street Journal', 'Financial Times'],
        specialRequests: 'Fresh orchids for cabin, specific brand of water (Evian)'
      },
      emergencyContact: {
        name: 'Margaret Johnson',
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
      dietaryRestrictions: ['Vegetarian'],
      beveragePreferences: ['Green tea', 'Kombucha', 'Sparkling water'],
      seatPreferences: ['Aisle seat', 'Near power outlet'],
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
      birthDate: '1990-09-17', // Birthday during trip!
      dietaryRestrictions: ['Keto diet'],
      beveragePreferences: ['Coffee (black)', 'Whiskey neat'],
      seatPreferences: ['Window seat'],
      allergies: [
        { 
          allergen: 'Peanuts', 
          severity: 'Critical', 
          reaction: 'Severe breathing difficulty', 
          medication: 'EpiPen required immediately' 
        }
      ],
      notes: 'Young entrepreneur, first-time private jet passenger. Very interested in the aircraft and flight operations.',
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
      seatPreferences: ['Aisle seat'],
      allergies: [
        { 
          allergen: 'Bee stings', 
          severity: 'Moderate', 
          reaction: 'Localized swelling', 
          medication: 'Antihistamine' 
        },
        { 
          allergen: 'Latex', 
          severity: 'Mild', 
          reaction: 'Skin irritation', 
          medication: 'Avoid latex gloves' 
        }
      ],
      notes: 'Frequent business traveler. Prefers minimal conversation during flights.',
      preferences: {
        temperature: '71°F',
        music: 'None - prefers silence',
        newspaper: ['Business Week'],
        specialRequests: 'No latex materials, dairy-free meal options'
      },
      emergencyContact: {
        name: 'James Watson',
        relationship: 'Husband',
        phone: '+1 (555) 234-5679'
      }
    }
  ];

  // Filter flights based on search and only show next few flights
  const filteredFlightLegs = upcomingFlightLegs
    .filter(leg => {
      const matchesSearch = 
        leg.flightNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        leg.departureAirport.toLowerCase().includes(searchTerm.toLowerCase()) ||
        leg.arrivalAirport.toLowerCase().includes(searchTerm.toLowerCase());
      
      return matchesSearch;
    })
    .slice(0, compact ? 3 : 10); // Show only 3 in compact mode

  // Function to get passengers for a specific flight leg
  const getFlightPassengers = (leg: FlightLeg) => {
    return passengers.filter(passenger => leg.passengerIds.includes(passenger.id));
  };

  // Function to check if birthday occurs during flight period (enhanced for highlighting)
  const isBirthdayDuringTrip = (birthDate: string, flightDate: string) => {
    if (!birthDate) return false;
    
    const birth = new Date(birthDate);
    const flight = new Date(flightDate);
    
    // Check if birthday occurs on flight date or within 7 days of flight
    const flightStart = new Date(flight);
    const flightEnd = new Date(flight.getTime() + (7 * 24 * 60 * 60 * 1000)); // 7 days after
    
    // Create birthday this year
    const birthdayThisYear = new Date(flight.getFullYear(), birth.getMonth(), birth.getDate());
    
    return birthdayThisYear >= flightStart && birthdayThisYear <= flightEnd;
  };

  // Enhanced birthday checking - check if birthday is exactly on flight date
  const isBirthdayOnFlightDate = (birthDate: string, flightDate: string) => {
    if (!birthDate) return false;
    
    const birth = new Date(birthDate);
    const flight = new Date(flightDate);
    
    // Create birthday this year
    const birthdayThisYear = new Date(flight.getFullYear(), birth.getMonth(), birth.getDate());
    
    return birthdayThisYear.toDateString() === flight.toDateString();
  };

  // Function to get flight status color
  const getFlightStatusColor = (status: string) => {
    switch (status) {
      case 'Scheduled': return 'bg-blue-100 text-blue-800';
      case 'Boarding': return 'bg-green-100 text-green-800';
      case 'Departed': return 'bg-gray-100 text-gray-800';
      case 'Delayed': return 'bg-orange-100 text-orange-800';
      case 'Cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getVipColor = (level: string) => {
    switch (level) {
      case 'VVIP': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'VIP': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Standard': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getAllergySeverityColor = (severity: string) => {
    switch (severity) {
      case 'Critical': return 'bg-red-500 text-white border-red-600';
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

  const hasAllergies = (passenger: Passenger) => passenger.allergies.length > 0;
  const hasCriticalAllergies = (passenger: Passenger) => 
    passenger.allergies.some(allergy => allergy.severity === 'Critical');

  // Get stats for the header
  const stats = {
    totalFlights: filteredFlightLegs.length,
    totalPassengers: filteredFlightLegs.reduce((sum, leg) => sum + leg.passengerIds.length, 0),
    criticalAllergies: filteredFlightLegs.reduce((count, leg) => {
      const legPassengers = getFlightPassengers(leg);
      return count + legPassengers.filter(p => hasCriticalAllergies(p)).length;
    }, 0),
    birthdays: filteredFlightLegs.reduce((count, leg) => {
      const legPassengers = getFlightPassengers(leg);
      return count + legPassengers.filter(p => 
        p.birthDate && isBirthdayDuringTrip(p.birthDate, leg.date)
      ).length;
    }, 0)
  };

  if (compact) {
    return (
      <Card className="aviation-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-accent" />
                Your Upcoming Flights
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {stats.birthdays > 0 && (
                  <span className="text-purple-600 font-medium">
                    🎂 {stats.birthdays} birthday{stats.birthdays > 1 ? 's' : ''} to celebrate • 
                  </span>
                )}
                {stats.criticalAllergies > 0 && (
                  <span className="text-red-600 font-medium">
                    ⚠️ {stats.criticalAllergies} critical allergies • 
                  </span>
                )}
                Next {stats.totalFlights} flights with {stats.totalPassengers} passengers
              </p>
            </div>
            <Link to="/upcoming-flights">
              <Button variant="outline" size="sm">
                <ArrowRight className="w-4 h-4 mr-2" />
                View All
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredFlightLegs.map((leg) => {
              const legPassengers = getFlightPassengers(leg);
              const hasBirthdayPassengers = legPassengers.some(p => 
                p.birthDate && isBirthdayDuringTrip(p.birthDate, leg.date)
              );
              const hasCriticalAllergyPassengers = legPassengers.some(p => hasCriticalAllergies(p));
              
              return (
                <div 
                  key={leg.id} 
                  className={`p-4 border rounded-lg transition-colors hover:bg-accent/5 ${
                    hasBirthdayPassengers ? 'border-purple-300 bg-purple-50/50' : ''
                  } ${
                    hasCriticalAllergyPassengers ? 'border-red-300 bg-red-50/50' : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{leg.flightNumber}</span>
                      <Badge variant="outline">{leg.aircraft}</Badge>
                      <Badge className={getFlightStatusColor(leg.status)}>
                        {leg.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      {hasBirthdayPassengers && (
                        <Badge className="bg-purple-100 text-purple-800">
                          <Cake className="w-3 h-3 mr-1" />
                          Birthday
                        </Badge>
                      )}
                      {hasCriticalAllergyPassengers && (
                        <Badge className="bg-red-100 text-red-800">
                          <ShieldAlert className="w-3 h-3 mr-1" />
                          Critical
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>{leg.departureAirport} → {leg.arrivalAirport}</span>
                    <span>{new Date(leg.date).toLocaleDateString()}</span>
                    <span>{leg.departureTime} - {leg.arrivalTime}</span>
                    <span>{legPassengers.length} passengers</span>
                  </div>
                  
                  {/* Birthday/Allergy Highlights */}
                  {(hasBirthdayPassengers || hasCriticalAllergyPassengers) && (
                    <div className="mt-2 pt-2 border-t space-y-1">
                      {legPassengers.map((passenger) => {
                        const hasBirthday = passenger.birthDate && isBirthdayDuringTrip(passenger.birthDate, leg.date);
                        const isExactBirthday = passenger.birthDate && isBirthdayOnFlightDate(passenger.birthDate, leg.date);
                        const hasCritical = hasCriticalAllergies(passenger);
                        
                        if (!hasBirthday && !hasCritical) return null;
                        
                        return (
                          <div key={passenger.id} className="flex items-center gap-2 text-xs">
                            <span className="font-medium">{passenger.firstName} {passenger.lastName}</span>
                            {hasBirthday && (
                              <Badge className="bg-purple-100 text-purple-800 text-xs">
                                <Cake className="w-2 h-2 mr-1" />
                                {isExactBirthday ? 'Birthday Today!' : 'Birthday Trip'}
                              </Badge>
                            )}
                            {hasCritical && (
                              <Badge className="bg-red-100 text-red-800 text-xs">
                                <ShieldAlert className="w-2 h-2 mr-1" />
                                {passenger.allergies.filter(a => a.severity === 'Critical')[0]?.allergen}
                              </Badge>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Full view (for dedicated page)
  return (
    <div className="space-y-6">
      {/* Search */}
      {!compact && (
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by flight number or airport code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Plane className="w-4 h-4 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Flight Legs</p>
                <p className="text-2xl font-bold">{stats.totalFlights}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Total Passengers</p>
                <p className="text-2xl font-bold">{stats.totalPassengers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-red-600" />
              <div>
                <p className="text-sm text-red-700 font-medium">Critical Allergies</p>
                <p className="text-2xl font-bold text-red-700">{stats.criticalAllergies}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-purple-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Cake className="w-4 h-4 text-purple-600" />
              <div>
                <p className="text-sm text-purple-700 font-medium">🎂 Birthdays</p>
                <p className="text-2xl font-bold text-purple-700">{stats.birthdays}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Flight Legs List */}
      <div className="space-y-4">
        {filteredFlightLegs.map((leg) => {
          const legPassengers = getFlightPassengers(leg);
          const isExpanded = expandedFlight === leg.id;
          const hasBirthdayPassengers = legPassengers.some(p => 
            p.birthDate && isBirthdayDuringTrip(p.birthDate, leg.date)
          );
          
          return (
            <Card key={leg.id} className="overflow-hidden">
              <Collapsible 
                open={isExpanded} 
                onOpenChange={() => setExpandedFlight(isExpanded ? null : leg.id)}
              >
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Plane className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <CardTitle className="text-lg">
                              {leg.flightNumber} - Leg {leg.legNumber}
                            </CardTitle>
                            <Badge className={getFlightStatusColor(leg.status)}>
                              {leg.status}
                            </Badge>
                            {hasBirthdayPassengers && (
                              <Badge className="bg-purple-100 text-purple-800 animate-pulse">
                                <Cake className="w-3 h-3 mr-1" />
                                🎂 Birthday Flight!
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {leg.departureAirport} → {leg.arrivalAirport}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(leg.date).toLocaleDateString()}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {leg.departureTime} - {leg.arrivalTime}
                            </span>
                            <span>{leg.aircraft}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="flex items-center gap-2 mb-1">
                            <Users className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">{legPassengers.length} passengers</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            {legPassengers.some(p => hasCriticalAllergies(p)) && (
                              <div className="flex items-center gap-1 text-red-600">
                                <ShieldAlert className="w-4 h-4" />
                                <span>Critical Allergies</span>
                              </div>
                            )}
                            {legPassengers.some(p => p.birthDate && isBirthdayDuringTrip(p.birthDate, leg.date)) && (
                              <div className="flex items-center gap-1 text-purple-600">
                                <Cake className="w-4 h-4" />
                                <span>Birthday</span>
                              </div>
                            )}
                          </div>
                        </div>
                        {isExpanded ? (
                          <ChevronDown className="w-5 h-5 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <div className="space-y-4">
                      {legPassengers.map((passenger) => {
                        const hasBirthday = passenger.birthDate && isBirthdayDuringTrip(passenger.birthDate, leg.date);
                        const isExactBirthday = passenger.birthDate && isBirthdayOnFlightDate(passenger.birthDate, leg.date);
                        
                        return (
                          <Card 
                            key={passenger.id}
                            className={`p-4 ${
                              isExactBirthday 
                                ? 'border-purple-500 border-2 bg-purple-50 shadow-lg' 
                                : hasBirthday 
                                  ? 'border-purple-300 bg-purple-50' 
                                  : hasCriticalAllergies(passenger) 
                                    ? 'border-red-500 border-2 bg-red-50' 
                                    : hasAllergies(passenger) 
                                      ? 'border-orange-300 border-2 bg-orange-50' 
                                      : ''
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <h4 className="font-medium">{passenger.firstName} {passenger.lastName}</h4>
                                      {isExactBirthday && (
                                        <div className="flex items-center gap-1 text-purple-600 animate-bounce">
                                          <Cake className="w-5 h-5" />
                                          <span className="font-bold text-sm">🎉 BIRTHDAY TODAY! 🎉</span>
                                        </div>
                                      )}
                                      {!isExactBirthday && hasBirthday && (
                                        <div className="flex items-center gap-1 text-purple-600">
                                          <Gift className="w-4 h-4" />
                                          <span className="text-sm font-bold">BIRTHDAY DURING TRIP!</span>
                                        </div>
                                      )}
                                      {hasCriticalAllergies(passenger) && (
                                        <div className="flex items-center gap-1 text-red-600">
                                          <ShieldAlert className="w-4 h-4" />
                                          <span className="text-sm font-bold">CRITICAL ALLERGY</span>
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                      <span>{passenger.email}</span>
                                      {passenger.birthDate && (
                                        <span className="flex items-center gap-1">
                                          <Calendar className="w-3 h-3" />
                                          {new Date(passenger.birthDate).toLocaleDateString()}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <Badge className={getVipColor(passenger.vipLevel)}>
                                    {passenger.vipLevel}
                                  </Badge>
                                </div>

                                {/* Enhanced Birthday Alert */}
                                {hasBirthday && (
                                  <div className={`mb-3 p-3 rounded-lg border ${
                                    isExactBirthday 
                                      ? 'bg-purple-100 border-purple-300 shadow-md' 
                                      : 'bg-purple-50 border-purple-200'
                                  }`}>
                                    <div className="flex items-center gap-2 mb-1">
                                      <Gift className="w-4 h-4 text-purple-600" />
                                      <span className={`font-semibold text-purple-700 ${isExactBirthday ? 'text-lg' : 'text-sm'}`}>
                                        {isExactBirthday ? '🎂🎉 HAPPY BIRTHDAY! 🎉🎂' : '🎉 BIRTHDAY CELEBRATION'}
                                      </span>
                                    </div>
                                    <p className="text-xs text-purple-700">
                                      {isExactBirthday 
                                        ? `Today is ${passenger.firstName}'s birthday! Make this flight extra special!`
                                        : `Birthday on ${new Date(passenger.birthDate!).toLocaleDateString()} - Consider special arrangements!`
                                      }
                                    </p>
                                  </div>
                                )}

                                {/* Allergy Alerts */}
                                {hasAllergies(passenger) && (
                                  <div className="mb-3 p-2 rounded-lg bg-white border border-red-200">
                                    <div className="flex items-center gap-2 mb-2">
                                      <AlertTriangle className="w-4 h-4 text-red-600" />
                                      <span className="text-sm font-semibold text-red-700">⚠️ ALLERGY ALERT</span>
                                    </div>
                                    <div className="space-y-1">
                                      {passenger.allergies.map((allergy, index) => (
                                        <div key={index} className="flex items-center gap-2">
                                          {getAllergySeverityIcon(allergy.severity)}
                                          <Badge className={`${getAllergySeverityColor(allergy.severity)} text-xs`}>
                                            {allergy.allergen} - {allergy.severity}
                                          </Badge>
                                          {allergy.medication && (
                                            <span className="text-xs text-red-700">{allergy.medication}</span>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Preferences Summary */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                                  <div>
                                    <div className="flex items-center gap-1 text-muted-foreground mb-1">
                                      <Utensils className="w-3 h-3" />
                                      <span className="font-medium">Beverages:</span>
                                    </div>
                                    <div className="text-xs">
                                      {passenger.beveragePreferences.slice(0, 2).join(', ')}
                                      {passenger.beveragePreferences.length > 2 && '...'}
                                    </div>
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-1 text-muted-foreground mb-1">
                                      <Heart className="w-3 h-3" />
                                      <span className="font-medium">Comfort:</span>
                                    </div>
                                    <div className="text-xs">{passenger.preferences.temperature}</div>
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-1 text-muted-foreground mb-1">
                                      <User className="w-3 h-3" />
                                      <span className="font-medium">Dietary:</span>
                                    </div>
                                    <div className="text-xs">
                                      {passenger.dietaryRestrictions.length > 0 
                                        ? passenger.dietaryRestrictions.join(', ') 
                                        : 'None'
                                      }
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="flex gap-2 ml-4">
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button variant="outline" size="sm">
                                      <Eye className="w-4 h-4" />
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-2xl">
                                    <DialogHeader>
                                      <DialogTitle>Passenger Details - {passenger.firstName} {passenger.lastName}</DialogTitle>
                                      <DialogDescription>
                                        Complete passenger information for personalized service
                                      </DialogDescription>
                                    </DialogHeader>
                                    {/* Passenger details would go here */}
                                    <div className="space-y-4">
                                      <p>Full passenger details would be displayed here...</p>
                                    </div>
                                  </DialogContent>
                                </Dialog>
                              </div>
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          );
        })}
      </div>
    </div>
  );
}