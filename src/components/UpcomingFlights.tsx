import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
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
  Utensils
} from 'lucide-react';

interface FoodPreferences {
  favoriteCuisines: string[];
  favoriteDishes: string[];
  preferredMealTimes: {
    breakfast?: string;
    lunch?: string;
    dinner?: string;
    snacks?: boolean;
  };
  cookingPreferences: string[];
  spiceLevel: 'None' | 'Mild' | 'Medium' | 'Hot' | 'Very Hot';
  foodTemperature: string[];
  preferredBrands: string[];
  avoidedFoods: string[];
  cateringStyle: 'Formal' | 'Casual' | 'Family Style' | 'Buffet' | 'Tasting Menu';
  presentationStyle: string[];
  culturalDietary: string[];
  specialOccasionFoods?: string;
  chefNotes?: string;
}

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
  foodPreferences: FoodPreferences;
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

import InflightCalendarView from './InflightCalendarView';

interface UpcomingFlightsProps {
  userRole?: string;
}

export default function UpcomingFlights({ userRole = 'inflight' }: UpcomingFlightsProps) {
  // If user is inflight crew, show calendar view
  if (userRole === 'inflight') {
    return <InflightCalendarView userRole={userRole} />;
  }
  
  // Original list view for other roles
  const [searchTerm, setSearchTerm] = useState('');
  const [airportFilter, setAirportFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedFlight, setSelectedFlight] = useState<FlightLeg | null>(null);
  const [expandedFlight, setExpandedFlight] = useState<string | null>(null);
  const [selectedPassenger, setSelectedPassenger] = useState<Passenger | null>(null);

  // Mock upcoming flight legs data
  const upcomingFlightLegs: FlightLeg[] = [
    {
      id: 'LEG001',
      flightNumber: 'FO001',
      legNumber: 1,
      date: '2025-02-05',
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
      date: '2025-02-05',
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
      date: '2025-02-06',
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
      date: '2025-02-07',
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

  // Mock passengers data (same as PassengerDatabase)
  const passengers: Passenger[] = [
    {
      id: 'PAX001',
      firstName: 'Robert',
      lastName: 'Johnson',
      email: 'robert.johnson@email.com',
      phone: '+1 (555) 123-4567',
      vipLevel: 'VVIP',
      birthDate: '1975-03-15',
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
      foodPreferences: {
        favoriteCuisines: ['French', 'Italian', 'American Steakhouse'],
        favoriteDishes: ['Wagyu Beef', 'Lobster Thermidor', 'Truffle Pasta', 'Aged Ribeye'],
        preferredMealTimes: {
          breakfast: '7:00 AM',
          lunch: '12:30 PM',
          dinner: '7:30 PM',
          snacks: false
        },
        cookingPreferences: ['Medium-rare steaks', 'Fresh seafood', 'Al dente pasta'],
        spiceLevel: 'Mild',
        foodTemperature: ['Hot entrees', 'Room temperature appetizers'],
        preferredBrands: ['Kobe beef', 'Maine lobster', 'San Pellegrino', 'Valrhona chocolate'],
        avoidedFoods: ['Spicy foods', 'Raw fish', 'Organ meats'],
        cateringStyle: 'Formal',
        presentationStyle: ['Fine dining plating', 'Crystal glassware', 'Linen napkins'],
        culturalDietary: [],
        specialOccasionFoods: 'Dom Pérignon and caviar for business celebrations',
        chefNotes: 'Prefers traditional preparations. Values quality over creativity. Always serves bread course.'
      },
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
      foodPreferences: {
        favoriteCuisines: ['Japanese', 'Mediterranean', 'Plant-based', 'Thai'],
        favoriteDishes: ['Vegetable sushi', 'Quinoa bowls', 'Mediterranean salads', 'Fresh fruit'],
        preferredMealTimes: {
          breakfast: '6:30 AM',
          lunch: '1:00 PM',
          dinner: '6:00 PM',
          snacks: true
        },
        cookingPreferences: ['Light preparations', 'Fresh ingredients', 'Minimal oil', 'Steamed vegetables'],
        spiceLevel: 'Medium',
        foodTemperature: ['Warm but not hot', 'Fresh and crisp salads'],
        preferredBrands: ['Organic produce', 'Fair trade items', 'Local sourcing when possible'],
        avoidedFoods: ['All meat', 'Heavy sauces', 'Fried foods', 'Processed foods'],
        cateringStyle: 'Casual',
        presentationStyle: ['Simple elegant plating', 'Natural materials', 'Eco-friendly packaging'],
        culturalDietary: ['Vegetarian'],
        specialOccasionFoods: 'Raw vegan desserts, ceremonial matcha',
        chefNotes: 'Focus on freshness and clean flavors. Appreciates artistic vegetable preparations. Prefers smaller portions.'
      },
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
      seatPreferences: ['Window seat'],
      allergies: [
        { 
          allergen: 'Peanuts', 
          severity: 'Critical', 
          reaction: 'Severe breathing difficulty', 
          medication: 'EpiPen required immediately' 
        }
      ],
      foodPreferences: {
        favoriteCuisines: ['Mexican', 'BBQ', 'American', 'Tex-Mex'],
        favoriteDishes: ['Grilled meats', 'Cheese platters', 'Avocado dishes', 'Bacon'],
        preferredMealTimes: {
          breakfast: '8:00 AM',
          lunch: '2:00 PM',
          dinner: '8:00 PM',
          snacks: true
        },
        cookingPreferences: ['Grilled', 'High protein', 'Low carb', 'Rich flavors'],
        spiceLevel: 'Hot',
        foodTemperature: ['Hot and fresh', 'Room temperature cheeses'],
        preferredBrands: ['Grass-fed beef', 'Artisanal cheeses', 'Craft spirits'],
        avoidedFoods: ['Bread', 'Rice', 'Pasta', 'Sugar', 'Peanuts (ALLERGY)'],
        cateringStyle: 'Casual',
        presentationStyle: ['Rustic presentation', 'Generous portions', 'Comfort food style'],
        culturalDietary: [],
        specialOccasionFoods: 'Premium aged steaks, craft cocktails',
        chefNotes: 'Enjoys bold flavors and spice. Strict keto adherence. Appreciates meat quality and preparation.'
      },
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
      foodPreferences: {
        favoriteCuisines: ['Nordic', 'Scandinavian', 'Modern European', 'Fusion'],
        favoriteDishes: ['Seafood', 'Root vegetables', 'Artisanal breads', 'Modern presentations'],
        preferredMealTimes: {
          breakfast: '7:30 AM',
          lunch: '1:30 PM',
          dinner: '7:00 PM',
          snacks: false
        },
        cookingPreferences: ['Clean flavors', 'Seasonal ingredients', 'Minimal dairy', 'Creative presentations'],
        spiceLevel: 'Medium',
        foodTemperature: ['Properly heated', 'Fresh and crisp'],
        preferredBrands: ['Sustainable seafood', 'Organic dairy alternatives', 'Local sourcing'],
        avoidedFoods: ['Dairy products', 'Heavy cream sauces', 'Overly sweet desserts'],
        cateringStyle: 'Formal',
        presentationStyle: ['Modern plating', 'Minimalist design', 'Natural elements'],
        culturalDietary: ['Lactose-free'],
        specialOccasionFoods: 'Champagne and dairy-free desserts',
        chefNotes: 'Appreciates innovation and artistic presentation. Ensure all items are dairy-free. Prefers quality over quantity.'
      },
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

  // Filter flights based on search and filters
  const filteredFlightLegs = upcomingFlightLegs.filter(leg => {
    const matchesSearch = 
      leg.flightNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      leg.departureAirport.toLowerCase().includes(searchTerm.toLowerCase()) ||
      leg.arrivalAirport.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesAirport = airportFilter === 'all' || 
      leg.departureAirport === airportFilter || 
      leg.arrivalAirport === airportFilter;
    
    const matchesStatus = statusFilter === 'all' || leg.status === statusFilter;
    
    return matchesSearch && matchesAirport && matchesStatus;
  });

  // Get unique airports for filter
  const airports = Array.from(new Set([
    ...upcomingFlightLegs.map(leg => leg.departureAirport),
    ...upcomingFlightLegs.map(leg => leg.arrivalAirport)
  ])).sort();

  // Function to get passengers for a specific flight leg
  const getFlightPassengers = (leg: FlightLeg) => {
    return passengers.filter(passenger => leg.passengerIds.includes(passenger.id));
  };

  // Function to check if birthday occurs during flight period
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

  const getSpiceLevelColor = (level: string) => {
    switch (level) {
      case 'None': return 'bg-gray-100 text-gray-800';
      case 'Mild': return 'bg-green-100 text-green-800';
      case 'Medium': return 'bg-yellow-100 text-yellow-800';
      case 'Hot': return 'bg-orange-100 text-orange-800';
      case 'Very Hot': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const hasAllergies = (passenger: Passenger) => passenger.allergies.length > 0;
  const hasCriticalAllergies = (passenger: Passenger) => 
    passenger.allergies.some(allergy => allergy.severity === 'Critical');

  return (
    <div className="p-4 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2">
            <Plane className="w-6 h-6 text-blue-500" />
            Upcoming Flights
          </h1>
          <p className="text-muted-foreground">
            Your flight assignments with passenger manifests and safety information
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by flight number or airport code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={airportFilter} onValueChange={setAirportFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by airport" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Airports</SelectItem>
                {airports.map(airport => (
                  <SelectItem key={airport} value={airport}>{airport}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Scheduled">Scheduled</SelectItem>
                <SelectItem value="Boarding">Boarding</SelectItem>
                <SelectItem value="Departed">Departed</SelectItem>
                <SelectItem value="Delayed">Delayed</SelectItem>
                <SelectItem value="Cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Plane className="w-4 h-4 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Flight Legs</p>
                <p className="text-2xl font-bold">{filteredFlightLegs.length}</p>
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
                <p className="text-2xl font-bold">
                  {filteredFlightLegs.reduce((sum, leg) => sum + leg.passengerIds.length, 0)}
                </p>
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
                <p className="text-2xl font-bold text-red-700">
                  {filteredFlightLegs.reduce((count, leg) => {
                    const legPassengers = getFlightPassengers(leg);
                    return count + legPassengers.filter(p => hasCriticalAllergies(p)).length;
                  }, 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-purple-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Cake className="w-4 h-4 text-purple-600" />
              <div>
                <p className="text-sm text-purple-700 font-medium">Birthdays</p>
                <p className="text-2xl font-bold text-purple-700">
                  {filteredFlightLegs.reduce((count, leg) => {
                    const legPassengers = getFlightPassengers(leg);
                    return count + legPassengers.filter(p => 
                      p.birthDate && isBirthdayDuringTrip(p.birthDate, leg.date)
                    ).length;
                  }, 0)}
                </p>
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
                    <Separator className="mb-6" />
                    
                    {/* Crew Information */}
                    {leg.crewAssignment && (
                      <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <h4 className="font-medium mb-3 text-blue-700">Crew Assignment</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="font-medium">Captain:</span> {leg.crewAssignment.captain}
                          </div>
                          <div>
                            <span className="font-medium">First Officer:</span> {leg.crewAssignment.firstOfficer}
                          </div>
                          <div>
                            <span className="font-medium">Flight Attendants:</span> {leg.crewAssignment.flightAttendants.join(', ')}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Passenger Manifest */}
                    <div className="space-y-4">
                      <h4 className="font-medium">Passenger Manifest</h4>
                      {legPassengers.map((passenger) => {
                        const hasBirthday = passenger.birthDate && isBirthdayDuringTrip(passenger.birthDate, leg.date);
                        
                        return (
                          <Card 
                            key={passenger.id}
                            className={`p-4 ${
                              hasBirthday 
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
                                      {hasBirthday && (
                                        <div className="flex items-center gap-1 text-purple-600">
                                          <Cake className="w-4 h-4" />
                                          <span className="text-xs font-bold">BIRTHDAY!</span>
                                        </div>
                                      )}
                                      {hasCriticalAllergies(passenger) && (
                                        <div className="flex items-center gap-1 text-red-600">
                                          <ShieldAlert className="w-4 h-4" />
                                          <span className="text-xs font-bold">CRITICAL ALLERGY</span>
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                      <span>{passenger.email}</span>
                                      <span>{passenger.phone}</span>
                                    </div>
                                  </div>
                                  <Badge className={getVipColor(passenger.vipLevel)}>
                                    {passenger.vipLevel}
                                  </Badge>
                                </div>

                                {/* Birthday Alert */}
                                {hasBirthday && (
                                  <div className="mb-3 p-2 rounded-lg bg-purple-100 border border-purple-300">
                                    <div className="flex items-center gap-2 mb-1">
                                      <Gift className="w-4 h-4 text-purple-600" />
                                      <span className="text-sm font-semibold text-purple-700">🎉 BIRTHDAY CELEBRATION</span>
                                    </div>
                                    <p className="text-xs text-purple-700">
                                      Birthday on {new Date(passenger.birthDate!).toLocaleDateString()} - Consider special arrangements!
                                    </p>
                                  </div>
                                )}

                                {/* Critical Safety Alerts */}
                                {hasAllergies(passenger) && (
                                  <div className="mb-3 p-3 rounded-lg bg-white border-2 border-red-200">
                                    <div className="flex items-center gap-2 mb-2">
                                      <AlertTriangle className="w-4 h-4 text-red-600" />
                                      <span className="text-sm font-semibold text-red-700">⚠️ ALLERGY ALERT - SAFETY CRITICAL</span>
                                    </div>
                                    <div className="flex flex-wrap gap-1 mb-2">
                                      {passenger.allergies.map((allergy, i) => (
                                        <Badge 
                                          key={i} 
                                          className={`${getAllergySeverityColor(allergy.severity)} text-xs font-semibold`}
                                        >
                                          <span className="flex items-center gap-1">
                                            {getAllergySeverityIcon(allergy.severity)}
                                            {allergy.allergen} - {allergy.severity}
                                          </span>
                                        </Badge>
                                      ))}
                                    </div>
                                    {hasCriticalAllergies(passenger) && (
                                      <div className="p-2 bg-red-100 rounded border border-red-300">
                                        <div className="text-xs text-red-700 font-bold">
                                          🚨 EMERGENCY PROTOCOL: {passenger.allergies.find(a => a.severity === 'Critical')?.medication}
                                        </div>
                                        <div className="text-xs text-red-700 mt-1">
                                          Reaction: {passenger.allergies.find(a => a.severity === 'Critical')?.reaction}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Food Preferences Summary */}
                                <div className="mb-3 p-2 rounded-lg bg-green-50 border border-green-200">
                                  <div className="flex items-center gap-2 mb-2">
                                    <ChefHat className="w-4 h-4 text-green-600" />
                                    <span className="text-sm font-semibold text-green-700">CULINARY PREFERENCES</span>
                                  </div>
                                  <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div>
                                      <span className="font-medium">Cuisines:</span> {passenger.foodPreferences.favoriteCuisines.slice(0, 2).join(', ')}
                                      {passenger.foodPreferences.favoriteCuisines.length > 2 && '...'}
                                    </div>
                                    <div>
                                      <span className="font-medium">Style:</span> {passenger.foodPreferences.cateringStyle}
                                    </div>
                                    <div>
                                      <span className="font-medium">Spice:</span> 
                                      <Badge className={`ml-1 ${getSpiceLevelColor(passenger.foodPreferences.spiceLevel)} text-xs`}>
                                        {passenger.foodPreferences.spiceLevel}
                                      </Badge>
                                    </div>
                                    <div>
                                      <span className="font-medium">Dietary:</span> {passenger.dietaryRestrictions.join(', ') || 'None'}
                                    </div>
                                  </div>
                                  {passenger.foodPreferences.chefNotes && (
                                    <div className="mt-2 text-xs italic text-green-700">
                                      Chef Notes: {passenger.foodPreferences.chefNotes}
                                    </div>
                                  )}
                                </div>

                                {/* Service Preferences */}
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                  <div>
                                    <span className="font-medium">Temperature:</span> {passenger.preferences.temperature}
                                  </div>
                                  <div>
                                    <span className="font-medium">Music:</span> {passenger.preferences.music || 'No preference'}
                                  </div>
                                </div>
                              </div>

                              <div className="flex gap-2">
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      onClick={() => setSelectedPassenger(passenger)}
                                    >
                                      <Eye className="w-4 h-4" />
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                                    <DialogHeader>
                                      <DialogTitle className="flex items-center gap-2">
                                        <User className="w-5 h-5" />
                                        {passenger.firstName} {passenger.lastName}
                                        {hasCriticalAllergies(passenger) && (
                                          <ShieldAlert className="w-5 h-5 text-red-600" />
                                        )}
                                      </DialogTitle>
                                      <DialogDescription>
                                        Complete passenger profile for in-flight service
                                      </DialogDescription>
                                    </DialogHeader>
                                    
                                    {/* Detailed passenger information would go here */}
                                    <Tabs defaultValue="service" className="w-full">
                                      <TabsList className="grid w-full grid-cols-2">
                                        <TabsTrigger value="service">Service Info</TabsTrigger>
                                        <TabsTrigger value="safety">Safety & Contact</TabsTrigger>
                                      </TabsList>
                                      
                                      <TabsContent value="service" className="space-y-4">
                                        {/* Critical Allergy Warning */}
                                        {hasCriticalAllergies(passenger) && (
                                          <div className="p-3 bg-red-100 border border-red-300 rounded-lg">
                                            <div className="flex items-center gap-2 mb-2">
                                              <ShieldAlert className="w-5 h-5 text-red-600" />
                                              <span className="font-bold text-red-700">🚨 CRITICAL ALLERGY ALERT</span>
                                            </div>
                                            {passenger.allergies
                                              .filter(a => a.severity === 'Critical')
                                              .map((allergy, i) => (
                                                <div key={i} className="text-sm text-red-700">
                                                  <div className="font-semibold">{allergy.allergen}</div>
                                                  <div>Reaction: {allergy.reaction}</div>
                                                  <div className="font-semibold">Emergency: {allergy.medication}</div>
                                                </div>
                                              ))}
                                          </div>
                                        )}

                                        {/* Food preferences detailed view */}
                                        <div className="space-y-3">
                                          <div>
                                            <Label className="text-xs">Favorite Dishes</Label>
                                            <div className="text-sm space-y-1">
                                              {passenger.foodPreferences.favoriteDishes.slice(0, 5).map((dish, i) => (
                                                <div key={i}>• {dish}</div>
                                              ))}
                                            </div>
                                          </div>
                                          
                                          <div>
                                            <Label className="text-xs">Beverages</Label>
                                            <div className="flex flex-wrap gap-1 mt-1">
                                              {passenger.beveragePreferences.map((bev, i) => (
                                                <Badge key={i} variant="outline" className="text-xs">{bev}</Badge>
                                              ))}
                                            </div>
                                          </div>

                                          {passenger.preferences.specialRequests && (
                                            <div>
                                              <Label className="text-xs">Special Requests</Label>
                                              <p className="text-sm bg-muted p-2 rounded mt-1">
                                                {passenger.preferences.specialRequests}
                                              </p>
                                            </div>
                                          )}
                                        </div>
                                      </TabsContent>

                                      <TabsContent value="safety" className="space-y-4">
                                        {/* Contact info and emergency contacts */}
                                        <div>
                                          <Label className="text-xs">Contact Information</Label>
                                          <div className="text-sm space-y-2 mt-2">
                                            <div className="flex items-center gap-2">
                                              <Mail className="w-3 h-3" />
                                              {passenger.email}
                                            </div>
                                            <div className="flex items-center gap-2">
                                              <Phone className="w-3 h-3" />
                                              {passenger.phone}
                                            </div>
                                            {passenger.emergencyContact && (
                                              <div className="mt-3 p-2 bg-muted rounded">
                                                <Label className="text-xs">Emergency Contact</Label>
                                                <div className="text-sm">
                                                  <div>{passenger.emergencyContact.name} ({passenger.emergencyContact.relationship})</div>
                                                  <div className="flex items-center gap-2">
                                                    <Phone className="w-3 h-3" />
                                                    {passenger.emergencyContact.phone}
                                                  </div>
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        </div>

                                        {/* All allergies detail */}
                                        {hasAllergies(passenger) && (
                                          <div>
                                            <Label className="text-xs text-red-600 font-semibold">⚠️ ALLERGIES - SAFETY CRITICAL</Label>
                                            <div className="space-y-2 mt-2">
                                              {passenger.allergies.map((allergy, i) => (
                                                <div 
                                                  key={i} 
                                                  className={`p-3 rounded border ${
                                                    allergy.severity === 'Critical' 
                                                      ? 'bg-red-100 border-red-300' 
                                                      : allergy.severity === 'Moderate'
                                                        ? 'bg-orange-100 border-orange-300'
                                                        : 'bg-yellow-100 border-yellow-300'
                                                  }`}
                                                >
                                                  <div className="flex items-center gap-2 mb-2">
                                                    <Badge className={getAllergySeverityColor(allergy.severity)}>
                                                      <span className="flex items-center gap-1">
                                                        {getAllergySeverityIcon(allergy.severity)}
                                                        {allergy.severity}
                                                      </span>
                                                    </Badge>
                                                    <span className="font-semibold">{allergy.allergen}</span>
                                                  </div>
                                                  {allergy.reaction && (
                                                    <div className="text-sm mb-1">Reaction: {allergy.reaction}</div>
                                                  )}
                                                  {allergy.medication && (
                                                    <div className="text-sm font-semibold">Treatment: {allergy.medication}</div>
                                                  )}
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                      </TabsContent>
                                    </Tabs>
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

      {filteredFlightLegs.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <Plane className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No flights match the current filters.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}