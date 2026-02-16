import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
  Utensils,
  Plane,
  Users,
  Search,
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
  Plus,
  Edit,
  Eye,
  CheckCircle,
  XCircle,
  Star
} from 'lucide-react';

interface CateringOrder {
  id: string;
  flightId: string;
  flightNumber: string;
  legNumber: number;
  date: string;
  departureTime: string;
  arrivalTime: string;
  departureAirport: string;
  arrivalAirport: string;
  aircraft: string;
  passengerIds: string[];
  cateringDetails: {
    caterer: string;
    contactPerson: string;
    phone: string;
    email: string;
    orderDeadline: string;
    deliveryTime: string;
    specialInstructions?: string;
    totalCost?: number;
    status: 'Not Ordered' | 'Ordered' | 'Confirmed' | 'Delivered' | 'Issue';
  };
  menuItems: Array<{
    id: string;
    name: string;
    category: string;
    quantity: number;
    specialRequests?: string;
    passengerPreference?: string;
  }>;
  allergyAlerts: Array<{
    passengerId: string;
    passengerName: string;
    allergen: string;
    severity: 'Critical' | 'Moderate' | 'Mild';
    notes?: string;
  }>;
  dietaryRequirements: Array<{
    passengerId: string;
    passengerName: string;
    requirements: string[];
  }>;
}

interface Passenger {
  id: string;
  firstName: string;
  lastName: string;
  vipLevel: 'Standard' | 'VIP' | 'VVIP';
  allergies: Array<{
    allergen: string;
    severity: 'Critical' | 'Moderate' | 'Mild';
    reaction?: string;
    medication?: string;
  }>;
  dietaryRestrictions: string[];
  beveragePreferences: string[];
  foodPreferences: {
    favoriteCuisines: string[];
    favoriteDishes: string[];
    cateringStyle: 'Formal' | 'Casual' | 'Family Style' | 'Buffet' | 'Tasting Menu';
    spiceLevel: 'None' | 'Mild' | 'Medium' | 'Hot' | 'Very Hot';
    chefNotes?: string;
  };
}

export default function CateringOrders() {
  const [searchTerm, setSearchTerm] = useState('');
  const [airportFilter, setAirportFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedFlight, setExpandedFlight] = useState<string | null>(null);
  const [selectedPassenger, setSelectedPassenger] = useState<Passenger | null>(null);

  // Mock upcoming catering orders data
  const cateringOrders: CateringOrder[] = [
    {
      id: 'CAT001',
      flightId: 'LEG001',
      flightNumber: 'FO001',
      legNumber: 1,
      date: '2025-02-05',
      departureTime: '08:00',
      arrivalTime: '13:30',
      departureAirport: 'LAX',
      arrivalAirport: 'JFK',
      aircraft: 'N1PG',
      passengerIds: ['PAX001', 'PAX002'],
      cateringDetails: {
        caterer: 'Sky Gourmet',
        contactPerson: 'Maria Rodriguez',
        phone: '+1 (310) 555-0123',
        email: 'maria@skygourmet.com',
        orderDeadline: '2025-02-04 20:00',
        deliveryTime: '2025-02-05 07:00',
        specialInstructions: 'VIP service required for Mr. Johnson. Ensure shellfish-free environment.',
        totalCost: 850,
        status: 'Confirmed'
      },
      menuItems: [
        {
          id: 'ITEM001',
          name: 'Wagyu Beef Tenderloin',
          category: 'Main Course',
          quantity: 1,
          specialRequests: 'Medium-rare, no nuts in sauce',
          passengerPreference: 'Robert Johnson - VVIP'
        },
        {
          id: 'ITEM002',
          name: 'Vegetable Sushi Platter',
          category: 'Main Course',
          quantity: 1,
          specialRequests: 'Fresh wasabi, soy sauce on side',
          passengerPreference: 'Sarah Chen - Vegetarian'
        },
        {
          id: 'ITEM003',
          name: 'Chocolate Mousse (Nut-free)',
          category: 'Dessert',
          quantity: 1,
          specialRequests: 'Confirmed nut-free preparation'
        }
      ],
      allergyAlerts: [
        {
          passengerId: 'PAX001',
          passengerName: 'Robert Johnson',
          allergen: 'Shellfish',
          severity: 'Critical',
          notes: 'EpiPen required - notify caterer of strict shellfish-free prep area'
        },
        {
          passengerId: 'PAX001',
          passengerName: 'Robert Johnson',
          allergen: 'Tree nuts',
          severity: 'Moderate',
          notes: 'Ensure all sauces and desserts are nut-free'
        }
      ],
      dietaryRequirements: [
        {
          passengerId: 'PAX002',
          passengerName: 'Sarah Chen',
          requirements: ['Vegetarian', 'Organic when possible']
        }
      ]
    },
    {
      id: 'CAT002',
      flightId: 'LEG002',
      flightNumber: 'FO001',
      legNumber: 2,
      date: '2025-02-05',
      departureTime: '15:00',
      arrivalTime: '18:30',
      departureAirport: 'JFK',
      arrivalAirport: 'MIA',
      aircraft: 'N1PG',
      passengerIds: ['PAX003'],
      cateringDetails: {
        caterer: 'Metropolitan Catering',
        contactPerson: 'Sarah Williams',
        phone: '+1 (718) 555-0789',
        email: 'sarah@metrocatering.com',
        orderDeadline: '2025-02-05 11:00',
        deliveryTime: '2025-02-05 14:00',
        specialInstructions: 'Keto-friendly options required. Critical peanut allergy.',
        status: 'Not Ordered'
      },
      menuItems: [
        {
          id: 'ITEM004',
          name: 'Grilled Steak with Cheese',
          category: 'Main Course',
          quantity: 1,
          specialRequests: 'No peanut oil, keto preparation',
          passengerPreference: 'Michael Rodriguez - Keto diet'
        }
      ],
      allergyAlerts: [
        {
          passengerId: 'PAX003',
          passengerName: 'Michael Rodriguez',
          allergen: 'Peanuts',
          severity: 'Critical',
          notes: 'Severe breathing difficulty - EpiPen required immediately'
        }
      ],
      dietaryRequirements: [
        {
          passengerId: 'PAX003',
          passengerName: 'Michael Rodriguez',
          requirements: ['Keto diet', 'High protein', 'Low carb']
        }
      ]
    },
    {
      id: 'CAT003',
      flightId: 'LEG003',
      flightNumber: 'FO002',
      legNumber: 1,
      date: '2025-02-06',
      departureTime: '10:30',
      arrivalTime: '16:15',
      departureAirport: 'MIA',
      arrivalAirport: 'LAX',
      aircraft: 'N5PG',
      passengerIds: ['PAX001', 'PAX004'],
      cateringDetails: {
        caterer: 'Elite Catering Solutions',
        contactPerson: 'James Chen',
        phone: '+1 (305) 555-0456',
        email: 'james@elitecatering.com',
        orderDeadline: '2025-02-05 18:00',
        deliveryTime: '2025-02-06 09:30',
        specialInstructions: 'VVIP service for Mr. Johnson. Lactose-free options for Ms. Watson.',
        totalCost: 1200,
        status: 'Ordered'
      },
      menuItems: [
        {
          id: 'ITEM005',
          name: 'Lobster Thermidor (Shellfish-free prep)',
          category: 'Main Course',
          quantity: 1,
          specialRequests: 'Alternative preparation - no actual shellfish',
          passengerPreference: 'Robert Johnson - VVIP (Shellfish allergy)'
        },
        {
          id: 'ITEM006',
          name: 'Nordic Salmon with Dairy-free Sauce',
          category: 'Main Course',
          quantity: 1,
          specialRequests: 'Lactose-free preparation',
          passengerPreference: 'Emily Watson - Lactose intolerant'
        }
      ],
      allergyAlerts: [
        {
          passengerId: 'PAX001',
          passengerName: 'Robert Johnson',
          allergen: 'Shellfish',
          severity: 'Critical',
          notes: 'Critical - avoid all shellfish contact'
        },
        {
          passengerId: 'PAX004',
          passengerName: 'Emily Watson',
          allergen: 'Bee stings',
          severity: 'Moderate',
          notes: 'Ensure no honey-based products'
        }
      ],
      dietaryRequirements: [
        {
          passengerId: 'PAX004',
          passengerName: 'Emily Watson',
          requirements: ['Lactose intolerant', 'Dairy-free options']
        }
      ]
    }
  ];

  // Mock passengers data (same as other components)
  const passengers: Passenger[] = [
    {
      id: 'PAX001',
      firstName: 'Robert',
      lastName: 'Johnson',
      vipLevel: 'VVIP',
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
      dietaryRestrictions: ['Gluten-free', 'No shellfish'],
      beveragePreferences: ['Dom Pérignon', 'Macallan 18', 'Perrier'],
      foodPreferences: {
        favoriteCuisines: ['French', 'Italian', 'American Steakhouse'],
        favoriteDishes: ['Wagyu Beef', 'Lobster Thermidor', 'Truffle Pasta', 'Aged Ribeye'],
        cateringStyle: 'Formal',
        spiceLevel: 'Mild',
        chefNotes: 'Prefers traditional preparations. Values quality over creativity. Always serves bread course.'
      }
    },
    {
      id: 'PAX002',
      firstName: 'Sarah',
      lastName: 'Chen',
      vipLevel: 'VIP',
      allergies: [],
      dietaryRestrictions: ['Vegetarian'],
      beveragePreferences: ['Green tea', 'Kombucha', 'Sparkling water'],
      foodPreferences: {
        favoriteCuisines: ['Japanese', 'Mediterranean', 'Plant-based', 'Thai'],
        favoriteDishes: ['Vegetable sushi', 'Quinoa bowls', 'Mediterranean salads', 'Fresh fruit'],
        cateringStyle: 'Casual',
        spiceLevel: 'Medium',
        chefNotes: 'Focus on freshness and clean flavors. Appreciates artistic vegetable preparations. Prefers smaller portions.'
      }
    },
    {
      id: 'PAX003',
      firstName: 'Michael',
      lastName: 'Rodriguez',
      vipLevel: 'Standard',
      allergies: [
        {
          allergen: 'Peanuts',
          severity: 'Critical',
          reaction: 'Severe breathing difficulty',
          medication: 'EpiPen required immediately'
        }
      ],
      dietaryRestrictions: ['Keto diet'],
      beveragePreferences: ['Coffee (black)', 'Whiskey neat'],
      foodPreferences: {
        favoriteCuisines: ['Mexican', 'BBQ', 'American', 'Tex-Mex'],
        favoriteDishes: ['Grilled meats', 'Cheese platters', 'Avocado dishes', 'Bacon'],
        cateringStyle: 'Casual',
        spiceLevel: 'Hot',
        chefNotes: 'Enjoys bold flavors and spice. Strict keto adherence. Appreciates meat quality and preparation.'
      }
    },
    {
      id: 'PAX004',
      firstName: 'Emily',
      lastName: 'Watson',
      vipLevel: 'VIP',
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
      dietaryRestrictions: ['Lactose intolerant'],
      beveragePreferences: ['Oat milk latte', 'Sparkling water'],
      foodPreferences: {
        favoriteCuisines: ['Nordic', 'Scandinavian', 'Modern European', 'Fusion'],
        favoriteDishes: ['Seafood', 'Root vegetables', 'Artisanal breads', 'Modern presentations'],
        cateringStyle: 'Formal',
        spiceLevel: 'Medium',
        chefNotes: 'Appreciates innovation and artistic presentation. Ensure all items are dairy-free. Prefers quality over quantity.'
      }
    }
  ];

  // Filter orders based on search and filters
  const filteredOrders = cateringOrders.filter(order => {
    const matchesSearch =
      order.flightNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.departureAirport.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.arrivalAirport.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.cateringDetails.caterer.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesAirport = airportFilter === 'all' ||
      order.departureAirport === airportFilter ||
      order.arrivalAirport === airportFilter;

    const matchesStatus = statusFilter === 'all' || order.cateringDetails.status === statusFilter;

    return matchesSearch && matchesAirport && matchesStatus;
  });

  // Get unique airports for filter
  const airports = Array.from(new Set([
    ...cateringOrders.map(order => order.departureAirport),
    ...cateringOrders.map(order => order.arrivalAirport)
  ])).sort();

  // Function to get passengers for a specific flight
  const getFlightPassengers = (order: CateringOrder) => {
    return passengers.filter(passenger => order.passengerIds.includes(passenger.id));
  };

  // Function to get order status color
  const getOrderStatusColor = (status: string) => {
    switch (status) {
      case 'Not Ordered': return 'bg-red-100 text-red-800';
      case 'Ordered': return 'bg-yellow-100 text-yellow-800';
      case 'Confirmed': return 'bg-blue-100 text-blue-800';
      case 'Delivered': return 'bg-green-100 text-green-800';
      case 'Issue': return 'bg-orange-100 text-orange-800';
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

  const hasAllergies = (order: CateringOrder) => order.allergyAlerts.length > 0;
  const hasCriticalAllergies = (order: CateringOrder) =>
    order.allergyAlerts.some(alert => alert.severity === 'Critical');

  return (
    <div className="p-4 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2">
            <Utensils className="w-6 h-6 text-blue-500" />
            Catering Orders
          </h1>
          <p className="text-muted-foreground">
            Manage catering orders for upcoming flights with passenger preferences and allergy alerts
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
                  placeholder="Search by flight number, airport, or caterer..."
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
                <SelectItem value="Not Ordered">Not Ordered</SelectItem>
                <SelectItem value="Ordered">Ordered</SelectItem>
                <SelectItem value="Confirmed">Confirmed</SelectItem>
                <SelectItem value="Delivered">Delivered</SelectItem>
                <SelectItem value="Issue">Issue</SelectItem>
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
              <Utensils className="w-4 h-4 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Total Orders</p>
                <p className="text-2xl font-bold">{filteredOrders.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-600" />
              <div>
                <p className="text-sm text-muted-foreground">Pending Orders</p>
                <p className="text-2xl font-bold">
                  {filteredOrders.filter(order => order.cateringDetails.status === 'Not Ordered').length}
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
                  {filteredOrders.reduce((count, order) => {
                    return count + order.allergyAlerts.filter(alert => alert.severity === 'Critical').length;
                  }, 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Special Diets</p>
                <p className="text-2xl font-bold">
                  {filteredOrders.reduce((count, order) => count + order.dietaryRequirements.length, 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Catering Orders List */}
      <div className="space-y-4">
        {filteredOrders.map((order) => {
          const flightPassengers = getFlightPassengers(order);
          const isExpanded = expandedFlight === order.id;

          return (
            <Card key={order.id} className="overflow-hidden">
              <Collapsible
                open={isExpanded}
                onOpenChange={() => setExpandedFlight(isExpanded ? null : order.id)}
              >
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Utensils className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <CardTitle className="text-lg">
                              {order.flightNumber} - Leg {order.legNumber}
                            </CardTitle>
                            <Badge className={getOrderStatusColor(order.cateringDetails.status)}>
                              {order.cateringDetails.status}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {order.departureAirport} → {order.arrivalAirport}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(order.date).toLocaleDateString()}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {order.departureTime} - {order.arrivalTime}
                            </span>
                            <span>{order.cateringDetails.caterer}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="flex items-center gap-2 mb-1">
                            <Users className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">{flightPassengers.length} passengers</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            {hasCriticalAllergies(order) && (
                              <div className="flex items-center gap-1 text-red-600">
                                <ShieldAlert className="w-4 h-4" />
                                <span>Critical Allergies</span>
                              </div>
                            )}
                            {order.dietaryRequirements.length > 0 && (
                              <div className="flex items-center gap-1 text-blue-600">
                                <ChefHat className="w-4 h-4" />
                                <span>Special Diets</span>
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

                    {/* Catering Details */}
                    <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-blue-700">Catering Information</h4>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">
                            <Edit className="w-4 h-4 mr-2" />
                            Edit Order
                          </Button>
                          <Button size="sm">
                            <Phone className="w-4 h-4 mr-2" />
                            Call Caterer
                          </Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Contact:</span> {order.cateringDetails.contactPerson}
                        </div>
                        <div>
                          <span className="font-medium">Phone:</span> {order.cateringDetails.phone}
                        </div>
                        <div>
                          <span className="font-medium">Order Deadline:</span> {new Date(order.cateringDetails.orderDeadline).toLocaleString()}
                        </div>
                        <div>
                          <span className="font-medium">Delivery:</span> {new Date(order.cateringDetails.deliveryTime).toLocaleString()}
                        </div>
                      </div>
                      {order.cateringDetails.specialInstructions && (
                        <div className="mt-3 p-2 bg-white rounded border">
                          <span className="font-medium text-sm">Special Instructions:</span>
                          <p className="text-sm mt-1">{order.cateringDetails.specialInstructions}</p>
                        </div>
                      )}
                      {order.cateringDetails.totalCost && (
                        <div className="mt-3">
                          <span className="font-medium">Total Cost: </span>
                          <span className="text-lg font-bold text-green-600">${order.cateringDetails.totalCost}</span>
                        </div>
                      )}
                    </div>

                    {/* Critical Allergy Alerts */}
                    {hasAllergies(order) && (
                      <div className="mb-6 p-4 bg-red-50 rounded-lg border-2 border-red-200">
                        <div className="flex items-center gap-2 mb-3">
                          <ShieldAlert className="w-5 h-5 text-red-600" />
                          <h4 className="font-medium text-red-700">🚨 CRITICAL ALLERGY ALERTS - NOTIFY CATERER</h4>
                        </div>
                        <div className="space-y-2">
                          {order.allergyAlerts.map((alert, i) => (
                            <div key={i} className="p-2 bg-white rounded border border-red-300">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge className={getAllergySeverityColor(alert.severity)}>
                                  <span className="flex items-center gap-1">
                                    {getAllergySeverityIcon(alert.severity)}
                                    {alert.severity}
                                  </span>
                                </Badge>
                                <span className="font-semibold">{alert.passengerName}</span>
                                <span className="text-red-600 font-medium">- {alert.allergen}</span>
                              </div>
                              {alert.notes && (
                                <p className="text-sm text-red-700">{alert.notes}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Dietary Requirements */}
                    {order.dietaryRequirements.length > 0 && (
                      <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
                        <div className="flex items-center gap-2 mb-3">
                          <ChefHat className="w-5 h-5 text-green-600" />
                          <h4 className="font-medium text-green-700">Dietary Requirements</h4>
                        </div>
                        <div className="space-y-2">
                          {order.dietaryRequirements.map((req, i) => (
                            <div key={i} className="flex items-center gap-2 text-sm">
                              <span className="font-medium">{req.passengerName}:</span>
                              <div className="flex flex-wrap gap-1">
                                {req.requirements.map((requirement, j) => (
                                  <Badge key={j} variant="outline" className="text-xs">
                                    {requirement}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Menu Items */}
                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium">Menu Items</h4>
                        <Button variant="outline" size="sm">
                          <Plus className="w-4 h-4 mr-2" />
                          Add Item
                        </Button>
                      </div>
                      <div className="space-y-3">
                        {order.menuItems.map((item) => (
                          <Card key={item.id} className="p-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-medium">{item.name}</span>
                                  <Badge variant="outline" className="text-xs">{item.category}</Badge>
                                  <Badge className="text-xs bg-blue-100 text-blue-800">
                                    Qty: {item.quantity}
                                  </Badge>
                                </div>
                                {item.passengerPreference && (
                                  <p className="text-sm text-blue-600 mb-1">
                                    For: {item.passengerPreference}
                                  </p>
                                )}
                                {item.specialRequests && (
                                  <p className="text-sm text-muted-foreground">
                                    Special requests: {item.specialRequests}
                                  </p>
                                )}
                              </div>
                              <Button variant="outline" size="sm">
                                <Edit className="w-3 h-3" />
                              </Button>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>

                    {/* Passenger Details */}
                    <div className="space-y-4">
                      <h4 className="font-medium">Passenger Details</h4>
                      {flightPassengers.map((passenger) => {
                        const passengerAllergies = order.allergyAlerts.filter(alert => alert.passengerId === passenger.id);
                        const passengerDietary = order.dietaryRequirements.find(req => req.passengerId === passenger.id);

                        return (
                          <Card key={passenger.id} className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <h5 className="font-medium">{passenger.firstName} {passenger.lastName}</h5>
                                  <Badge className={getVipColor(passenger.vipLevel)}>
                                    {passenger.vipLevel}
                                  </Badge>
                                  {passengerAllergies.some(a => a.severity === 'Critical') && (
                                    <div className="flex items-center gap-1 text-red-600">
                                      <ShieldAlert className="w-4 h-4" />
                                      <span className="text-xs font-bold">CRITICAL ALLERGY</span>
                                    </div>
                                  )}
                                </div>

                                {/* Food Preferences Summary */}
                                <div className="mb-3 p-2 rounded-lg bg-green-50 border border-green-200">
                                  <div className="flex items-center gap-2 mb-2">
                                    <ChefHat className="w-4 h-4 text-green-600" />
                                    <span className="text-sm font-semibold text-green-700">FOOD PREFERENCES</span>
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
                                      <span className="font-medium">Spice:</span> {passenger.foodPreferences.spiceLevel}
                                    </div>
                                    <div>
                                      <span className="font-medium">Beverages:</span> {passenger.beveragePreferences.slice(0, 2).join(', ')}
                                      {passenger.beveragePreferences.length > 2 && '...'}
                                    </div>
                                  </div>
                                  {passenger.foodPreferences.chefNotes && (
                                    <div className="mt-2 text-xs italic text-green-700">
                                      Chef Notes: {passenger.foodPreferences.chefNotes}
                                    </div>
                                  )}
                                </div>

                                {/* Dietary Requirements */}
                                {passengerDietary && (
                                  <div className="mb-2">
                                    <span className="text-sm font-medium">Dietary Requirements:</span>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {passengerDietary.requirements.map((req, i) => (
                                        <Badge key={i} variant="outline" className="text-xs">
                                          {req}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>

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
                                      {passenger.firstName} {passenger.lastName} - Food Preferences
                                    </DialogTitle>
                                    <DialogDescription>
                                      Complete food and beverage preferences for catering preparation
                                    </DialogDescription>
                                  </DialogHeader>

                                  <div className="space-y-4">
                                    {/* Critical Allergy Warning */}
                                    {passenger.allergies.some(a => a.severity === 'Critical') && (
                                      <div className="p-3 bg-red-100 border border-red-300 rounded-lg">
                                        <div className="flex items-center gap-2 mb-2">
                                          <ShieldAlert className="w-5 h-5 text-red-600" />
                                          <span className="font-bold text-red-700">🚨 CRITICAL ALLERGY - NOTIFY CATERER</span>
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

                                    <Tabs defaultValue="preferences" className="w-full">
                                      <TabsList className="grid w-full grid-cols-2">
                                        <TabsTrigger value="preferences">Food Preferences</TabsTrigger>
                                        <TabsTrigger value="restrictions">Restrictions & Allergies</TabsTrigger>
                                      </TabsList>

                                      <TabsContent value="preferences" className="space-y-4">
                                        <div className="space-y-3">
                                          <div>
                                            <Label className="text-xs">Favorite Cuisines</Label>
                                            <div className="flex flex-wrap gap-1 mt-1">
                                              {passenger.foodPreferences.favoriteCuisines.map((cuisine, i) => (
                                                <Badge key={i} variant="outline" className="text-xs">{cuisine}</Badge>
                                              ))}
                                            </div>
                                          </div>

                                          <div>
                                            <Label className="text-xs">Favorite Dishes</Label>
                                            <div className="text-sm space-y-1">
                                              {passenger.foodPreferences.favoriteDishes.slice(0, 5).map((dish, i) => (
                                                <div key={i}>• {dish}</div>
                                              ))}
                                            </div>
                                          </div>

                                          <div>
                                            <Label className="text-xs">Beverage Preferences</Label>
                                            <div className="flex flex-wrap gap-1 mt-1">
                                              {passenger.beveragePreferences.map((bev, i) => (
                                                <Badge key={i} variant="outline" className="text-xs">{bev}</Badge>
                                              ))}
                                            </div>
                                          </div>

                                          <div className="grid grid-cols-2 gap-4">
                                            <div>
                                              <Label className="text-xs">Service Style</Label>
                                              <Badge variant="outline" className="text-xs mt-1">{passenger.foodPreferences.cateringStyle}</Badge>
                                            </div>
                                            <div>
                                              <Label className="text-xs">Spice Level</Label>
                                              <Badge variant="outline" className="text-xs mt-1">{passenger.foodPreferences.spiceLevel}</Badge>
                                            </div>
                                          </div>

                                          {passenger.foodPreferences.chefNotes && (
                                            <div>
                                              <Label className="text-xs">Chef Notes</Label>
                                              <p className="text-sm bg-muted p-2 rounded mt-1 italic">
                                                {passenger.foodPreferences.chefNotes}
                                              </p>
                                            </div>
                                          )}
                                        </div>
                                      </TabsContent>

                                      <TabsContent value="restrictions" className="space-y-4">
                                        {/* Dietary Restrictions */}
                                        {passenger.dietaryRestrictions.length > 0 && (
                                          <div>
                                            <Label className="text-xs">Dietary Restrictions</Label>
                                            <div className="flex flex-wrap gap-1 mt-1">
                                              {passenger.dietaryRestrictions.map((diet, i) => (
                                                <Badge key={i} variant="outline" className="text-xs">{diet}</Badge>
                                              ))}
                                            </div>
                                          </div>
                                        )}

                                        {/* All allergies detail */}
                                        {passenger.allergies.length > 0 && (
                                          <div>
                                            <Label className="text-xs text-red-600 font-semibold">⚠️ ALLERGIES - CATERING CRITICAL</Label>
                                            <div className="space-y-2 mt-2">
                                              {passenger.allergies.map((allergy, i) => (
                                                <div
                                                  key={i}
                                                  className={`p-3 rounded border ${allergy.severity === 'Critical'
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
                                  </div>
                                </DialogContent>
                              </Dialog>
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

      {filteredOrders.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <Utensils className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No catering orders match the current filters.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}