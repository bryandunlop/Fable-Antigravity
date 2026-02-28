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
  Utensils,
  ArrowRight,
  UtensilsCrossed,
  Coffee,
  Sparkles
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
  const [searchTerm, setSearchTerm] = useState('');
  const [airportFilter, setAirportFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedFlight, setSelectedFlight] = useState<FlightLeg | null>(null);
  const [expandedFlight, setExpandedFlight] = useState<string | null>(null);
  const [selectedPassenger, setSelectedPassenger] = useState<Passenger | null>(null);

  // Helper function to create dates relative to today
  const getRelativeDate = (daysOffset: number) => {
    const date = new Date();
    date.setDate(date.getDate() + daysOffset);
    return date.toISOString().split('T')[0];
  };

  // Mock upcoming flight legs data
  const upcomingFlightLegs: FlightLeg[] = [
    {
      id: 'LEG001',
      flightNumber: 'FO001',
      legNumber: 1,
      date: getRelativeDate(2),
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
      date: getRelativeDate(2),
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
      date: getRelativeDate(3),
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
      date: getRelativeDate(4),
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
      },
      emergencyContact: {
        name: 'David Chen',
        relationship: 'Brother',
        phone: '+1 (555) 987-6544'
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

  // Filter flights based on search, filters, and 14 day window
  const filteredFlightLegs = upcomingFlightLegs.filter(leg => {
    const flightDate = new Date(leg.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const future14 = new Date(today);
    future14.setDate(future14.getDate() + 14);

    const within14Days = flightDate >= today && flightDate <= future14;

    const matchesSearch =
      leg.flightNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      leg.departureAirport.toLowerCase().includes(searchTerm.toLowerCase()) ||
      leg.arrivalAirport.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesAirport = airportFilter === 'all' ||
      leg.departureAirport === airportFilter ||
      leg.arrivalAirport === airportFilter;

    const matchesStatus = statusFilter === 'all' || leg.status === statusFilter;

    return within14Days && matchesSearch && matchesAirport && matchesStatus;
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
            Your flight assignments with passenger manifests and safety information (Next 14 Days)
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
            <Card key={leg.id} className="overflow-hidden border-2 transition-all duration-200">
              <div
                className="cursor-pointer bg-card hover:bg-muted/30 p-6 flex flex-col md:flex-row md:items-center justify-between gap-6"
                onClick={() => setExpandedFlight(isExpanded ? null : leg.id)}
              >
                <div className="flex items-start md:items-center gap-6">
                  <div className="p-4 bg-primary/10 rounded-2xl shrink-0">
                    <Plane className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-3 mb-2">
                      <h3 className="text-2xl font-bold tracking-tight">
                        {leg.flightNumber} <span className="text-muted-foreground font-normal">| Leg {leg.legNumber}</span>
                      </h3>
                      <Badge className={`${getFlightStatusColor(leg.status)} px-3 py-1 text-sm font-semibold`}>
                        {leg.status}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground font-medium">
                      <span className="flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-lg text-foreground">
                        <Calendar className="w-4 h-4 text-primary" />
                        {new Date(leg.date).toLocaleDateString(undefined, { weekday: 'short', month: 'long', day: 'numeric' })}
                      </span>
                      <span className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        <span className="font-semibold text-foreground">{leg.departureAirport}</span>
                        <ArrowRight className="w-3 h-3 mx-1" />
                        <span className="font-semibold text-foreground">{leg.arrivalAirport}</span>
                      </span>
                      <span className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        {leg.departureTime} - {leg.arrivalTime}
                      </span>
                      <span className="flex items-center gap-2">
                        <Plane className="w-4 h-4" />
                        Tail: {leg.aircraft}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-6 md:pl-6 md:border-l border-border/50">
                  <div className="text-right flex flex-col items-end gap-2">
                    <div className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-muted-foreground" />
                      <span className="text-lg font-bold">{legPassengers.length} <span className="text-sm font-medium text-muted-foreground">PAX</span></span>
                    </div>
                    {(legPassengers.some(p => hasAllergies(p)) || legPassengers.some(p => p.birthDate && isBirthdayDuringTrip(p.birthDate, leg.date))) && (
                      <div className="flex items-center gap-2">
                        {legPassengers.some(p => hasAllergies(p)) && (
                          <Badge variant="destructive" className="animate-pulse shadow-sm">
                            <ShieldAlert className="w-3 h-3 mr-1" />
                            Medical Alert
                          </Badge>
                        )}
                        {legPassengers.some(p => p.birthDate && isBirthdayDuringTrip(p.birthDate, leg.date)) && (
                          <Badge className="bg-fuchsia-600 shadow-sm border-fuchsia-400 text-white">
                            <Cake className="w-3 h-3 mr-1" />
                            Birthday
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                  <Button variant="ghost" size="icon" className="shrink-0 group-hover:bg-background">
                    {isExpanded ? (
                      <ChevronDown className="w-6 h-6 text-primary" />
                    ) : (
                      <ChevronRight className="w-6 h-6 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>

              {isExpanded && (
                <div className="bg-muted/10 p-6 md:p-8 border-t border-border/50">

                  {/* Crew Information Box */}
                  {leg.crewAssignment && (
                    <div className="mb-8 p-5 bg-background rounded-xl border-l-4 border-l-blue-500 shadow-sm flex flex-col md:flex-row gap-6">
                      <div className="shrink-0 flex items-center gap-2 text-blue-600 font-bold">
                        <Users className="w-5 h-5" />
                        Crew
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 text-sm">
                        <div>
                          <span className="text-muted-foreground block text-xs uppercase tracking-widest mb-1">Captain</span>
                          <span className="font-semibold">{leg.crewAssignment.captain}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-xs uppercase tracking-widest mb-1">First Officer</span>
                          <span className="font-semibold">{leg.crewAssignment.firstOfficer}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-xs uppercase tracking-widest mb-1">Flight Attendants</span>
                          <span className="font-semibold">{leg.crewAssignment.flightAttendants.join(', ')}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* OVERALL TRIP ALERTS (The Flag) */}
                  {(() => {
                    const allAllergies = legPassengers.flatMap(p => p.allergies.map(a => ({ ...a, passengerName: `${p.firstName} ${p.lastName}` })));
                    const birthdays = legPassengers.filter(p => p.birthDate && isBirthdayDuringTrip(p.birthDate, leg.date));

                    if (allAllergies.length === 0 && birthdays.length === 0) return null;

                    return (
                      <div className="space-y-4 mb-8">
                        {allAllergies.length > 0 && (
                          <Card className="border-red-500 bg-red-50/50 shadow-sm">
                            <CardContent className="p-4 flex flex-col md:flex-row items-start gap-4">
                              <div className="p-3 bg-red-100 rounded-lg shrink-0">
                                <ShieldAlert className="w-6 h-6 text-red-600" />
                              </div>
                              <div className="flex-1 w-full">
                                <h3 className="font-bold text-red-700 text-lg mb-2">MEDICAL ALERTS FOR THIS LEG</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {allAllergies.map((a, i) => (
                                    <div key={i} className="flex flex-col bg-white/60 p-3 rounded-md border border-red-200">
                                      <div className="flex items-center gap-2 mb-1">
                                        <Badge className={getAllergySeverityColor(a.severity)}>{a.severity.toUpperCase()}</Badge>
                                        <span className="font-semibold text-red-900">{a.passengerName}</span>
                                      </div>
                                      <span className="text-sm font-medium text-red-800">{a.allergen}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        )}
                        {birthdays.length > 0 && (
                          <Card className="border-fuchsia-400 bg-fuchsia-50/50 shadow-sm">
                            <CardContent className="p-4 flex items-start gap-4">
                              <div className="p-3 bg-fuchsia-100 rounded-lg shrink-0">
                                <Cake className="w-6 h-6 text-fuchsia-600" />
                              </div>
                              <div>
                                <h3 className="font-bold text-fuchsia-700 text-lg mb-2">BIRTHDAY TRIPS</h3>
                                <div className="flex flex-wrap gap-2">
                                  {birthdays.map((p, i) => (
                                    <Badge key={i} className="bg-fuchsia-600 text-white border-fuchsia-400 px-3 py-1 shadow-sm">
                                      {p.firstName} {p.lastName}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    );
                  })()}

                  {/* Passenger Manifest Layout (matching the popup design) */}
                  <div className="space-y-6">
                    <h4 className="flex items-center gap-2 font-bold text-xl mb-4">
                      <Users className="w-5 h-5 text-primary" />
                      Passenger Manifest & Service Details
                    </h4>
                    <div className="flex flex-col gap-6">
                      {legPassengers.map((passenger) => (
                        <Card key={passenger.id} className={`w-full bg-background shadow-sm hover:shadow-md transition-shadow overflow-hidden ${hasCriticalAllergies(passenger) ? 'border-red-500 border-2' : ''}`}>
                          <CardContent className="p-0 flex flex-col md:flex-row bg-gradient-to-r from-background to-muted/10">

                            {/* Left Column: Core Info & Actions */}
                            <div className="p-6 md:w-1/3 border-b md:border-b-0 md:border-r border-border/50 flex flex-col justify-between bg-muted/20">
                              <div>
                                <div className="flex items-start gap-4 mb-5">
                                  <div className="p-3 bg-accent/10 rounded-xl shrink-0">
                                    <User className="w-6 h-6 text-accent" />
                                  </div>
                                  <div className="space-y-1.5 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <h3 className="font-semibold text-xl">{passenger.firstName} {passenger.lastName}</h3>
                                      <Badge className={getVipColor(passenger.vipLevel)}>
                                        {passenger.vipLevel}
                                      </Badge>
                                    </div>
                                    {passenger.birthDate && isBirthdayDuringTrip(passenger.birthDate, leg.date) && (
                                      <Badge className="bg-fuchsia-600 text-white animate-pulse shadow-md border-fuchsia-400 mt-1">
                                        <Cake className="w-4 h-4 mr-1.5" />
                                        BIRTHDAY TRIP!
                                      </Badge>
                                    )}
                                  </div>
                                </div>

                                <div className="space-y-3 mb-6">
                                  <div className="bg-background/80 p-3 rounded-lg border border-border/50">
                                    <span className="text-muted-foreground block text-[10px] font-bold uppercase tracking-widest mb-1">Contact</span>
                                    <span className="font-medium text-sm">{passenger.phone}</span>
                                  </div>
                                  <div className="bg-background/80 p-3 rounded-lg border border-border/50">
                                    <span className="text-muted-foreground block text-[10px] font-bold uppercase tracking-widest mb-1">Cabin Temp</span>
                                    <span className="font-medium text-sm">{passenger.preferences.temperature}</span>
                                  </div>
                                </div>
                              </div>

                              <Button
                                className="w-full bg-primary/5 hover:bg-primary/10 text-primary border border-primary/20 shadow-none font-medium mt-auto"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedPassenger(passenger);
                                }}
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                View Full VIP Profile
                              </Button>
                            </div>

                            {/* Right Column: Service Details */}
                            <div className="p-6 md:w-2/3 grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

                              {/* Service Column 1 */}
                              <div className="space-y-6">

                                {/* Allergies - Critical Section */}
                                {passenger.allergies.length > 0 && (
                                  <div className="space-y-3">
                                    <h4 className="font-bold text-red-600 flex items-center gap-2 bg-red-100 p-2 rounded-t-md animate-pulse text-sm">
                                      <ShieldAlert className="w-4 h-4" />
                                      MEDICAL ALERT
                                    </h4>
                                    <div className="space-y-3 mt-0 p-2 border-x-2 border-b-2 border-red-200 rounded-b-md">
                                      {passenger.allergies.map((allergy, index) => (
                                        <div key={index} className={`p-3 rounded-md border-2 shadow-sm ${allergy.severity === 'Critical' ? 'bg-red-50 border-red-500' :
                                          allergy.severity === 'Moderate' ? 'bg-orange-50 border-orange-400' :
                                            'bg-yellow-50 border-yellow-400'
                                          }`}>
                                          <div className="flex items-center gap-2 mb-2">
                                            <Badge className={getAllergySeverityColor(allergy.severity)}>
                                              {getAllergySeverityIcon(allergy.severity)}
                                              {allergy.severity.toUpperCase()}
                                            </Badge>
                                            <span className="font-medium text-sm">{allergy.allergen}</span>
                                          </div>
                                          {allergy.reaction && (
                                            <p className="text-sm text-red-700 font-medium mb-1">
                                              Reaction: {allergy.reaction}
                                            </p>
                                          )}
                                          {allergy.medication && (
                                            <p className="text-sm text-red-700 font-medium bg-red-100/50 p-1.5 rounded">
                                              Emergency Action: {allergy.medication}
                                            </p>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Food Preferences */}
                                <div className="space-y-3">
                                  <h4 className="font-bold text-lg flex items-center gap-2">
                                    <UtensilsCrossed className="w-5 h-5 text-muted-foreground" />
                                    Food Preferences
                                  </h4>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="bg-background/80 p-3 rounded-lg border border-border/50">
                                      <span className="text-muted-foreground block text-[10px] font-bold uppercase tracking-widest mb-1">Favorite Dishes</span>
                                      <span className="font-medium text-sm">{passenger.foodPreferences.favoriteDishes.join(', ')}</span>
                                    </div>
                                    <div className="bg-background/80 p-3 rounded-lg border border-border/50">
                                      <span className="text-muted-foreground block text-[10px] font-bold uppercase tracking-widest mb-1">Disliked Foods</span>
                                      <span className="font-medium text-sm">{passenger.foodPreferences.avoidedFoods.join(', ')}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Service Column 2 */}
                              <div className="space-y-6">
                                {/* Beverage Preferences */}
                                <div className="space-y-3">
                                  <h4 className="font-bold text-lg flex items-center gap-2">
                                    <Coffee className="w-5 h-5 text-muted-foreground" />
                                    Beverage Preferences
                                  </h4>
                                  <div className="bg-background/80 p-3 rounded-lg border border-border/50">
                                    <span className="text-muted-foreground block text-[10px] font-bold uppercase tracking-widest mb-1">Preferred Beverages</span>
                                    <span className="font-medium text-sm">{passenger.beveragePreferences.join(', ')}</span>
                                  </div>
                                </div>

                                {/* Special Requests */}
                                {passenger.preferences.specialRequests && (
                                  <div className="space-y-3">
                                    <h4 className="font-bold text-lg flex items-center gap-2">
                                      <Sparkles className="w-5 h-5 text-muted-foreground" />
                                      Special Requests
                                    </h4>
                                    <div className="bg-background/80 p-3 rounded-lg border border-border/50">
                                      <span className="font-medium text-sm">{passenger.preferences.specialRequests}</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                </div>
              )}
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