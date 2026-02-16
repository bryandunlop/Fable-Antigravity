import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Progress } from './ui/progress';
import { Separator } from './ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { ScrollArea } from './ui/scroll-area';
import { 
  Plane, 
  Users, 
  AlertTriangle, 
  Wrench, 
  Cloud, 
  UtensilsCrossed,
  Clock,
  MapPin,
  Fuel,
  CheckCircle,
  XCircle,
  AlertCircle,
  Coffee,
  Utensils,
  Heart,
  Shield,
  Calendar,
  User,
  Thermometer,
  Wind
} from 'lucide-react';

interface FlightData {
  id: string;
  flightNumber: string;
  aircraft: {
    registration: string;
    model: string;
    status: 'ready' | 'maintenance' | 'aog';
    location: string;
    fuelLevel: number;
    lastMaintenance: string;
    nextMaintenance: string;
    squawks: Array<{
      id: string;
      description: string;
      severity: 'low' | 'medium' | 'high';
      status: 'open' | 'deferred' | 'closed';
    }>;
  };
  route: {
    departure: { code: string; name: string; time: string; };
    arrival: { code: string; name: string; time: string; };
  };
  crew: Array<{
    id: string;
    name: string;
    role: 'captain' | 'first-officer' | 'flight-attendant';
    currency: {
      current: boolean;
      expires: string;
      warnings: string[];
    };
    fatigue: {
      score: number;
      risk: 'low' | 'medium' | 'high';
    };
    qualifications: string[];
  }>;
  passengers: Array<{
    id: string;
    name: string;
    vip: boolean;
    allergies: Array<{
      type: string;
      severity: 'mild' | 'moderate' | 'severe' | 'life-threatening';
    }>;
    preferences: {
      dietary: string[];
      seating: string;
      services: string[];
    };
    specialRequests: string[];
  }>;
  weather: {
    departure: {
      conditions: string;
      visibility: number;
      ceiling: number;
      winds: string;
      impact: 'none' | 'low' | 'medium' | 'high';
    };
    arrival: {
      conditions: string;
      visibility: number;
      ceiling: number;
      winds: string;
      impact: 'none' | 'low' | 'medium' | 'high';
    };
  };
  catering: {
    status: 'ordered' | 'confirmed' | 'delivered' | 'loaded';
    orders: Array<{
      passenger: string;
      items: string[];
      allergies: string[];
      specialInstructions: string;
    }>;
    alerts: string[];
  };
  frat: {
    totalScore: number;
    riskLevel: 'low' | 'medium' | 'high';
    autoPopulatedFactors: Array<{
      category: string;
      factor: string;
      score: number;
      source: string;
    }>;
    manualFactors: Array<{
      category: string;
      factor: string;
      score: number;
    }>;
  };
  alerts: Array<{
    id: string;
    type: 'safety' | 'maintenance' | 'weather' | 'crew' | 'passenger' | 'catering';
    severity: 'info' | 'warning' | 'critical';
    message: string;
    source: string;
    timestamp: string;
  }>;
}

const mockFlightData: FlightData = {
  id: 'FL001',
  flightNumber: 'G650-001',
  aircraft: {
    registration: 'N123GS',
    model: 'Gulfstream G650',
    status: 'ready',
    location: 'KTEB - Teterboro Airport',
    fuelLevel: 85,
    lastMaintenance: '2024-01-15',
    nextMaintenance: '2024-02-15',
    squawks: [
      {
        id: 'SQ001',
        description: 'Left main landing gear tire wear indicator amber',
        severity: 'medium',
        status: 'deferred'
      }
    ]
  },
  route: {
    departure: { code: 'KTEB', name: 'Teterboro Airport', time: '14:30' },
    arrival: { code: 'KMIA', name: 'Miami International', time: '17:45' }
  },
  crew: [
    {
      id: 'C001',
      name: 'Captain Sarah Johnson',
      role: 'captain',
      currency: {
        current: true,
        expires: '2024-03-15',
        warnings: []
      },
      fatigue: { score: 15, risk: 'low' },
      qualifications: ['G650', 'International', 'Instructor']
    },
    {
      id: 'C002',
      name: 'FO Michael Chen',
      role: 'first-officer',
      currency: {
        current: true,
        expires: '2024-02-28',
        warnings: ['Currency expires in 14 days']
      },
      fatigue: { score: 25, risk: 'medium' },
      qualifications: ['G650', 'Glass Cockpit']
    },
    {
      id: 'C003',
      name: 'FA Emma Williams',
      role: 'flight-attendant',
      currency: {
        current: true,
        expires: '2024-04-01',
        warnings: []
      },
      fatigue: { score: 10, risk: 'low' },
      qualifications: ['Emergency Medical', 'Culinary Service', 'Security']
    }
  ],
  passengers: [
    {
      id: 'P001',
      name: 'Robert Anderson',
      vip: true,
      allergies: [
        { type: 'Shellfish', severity: 'life-threatening' },
        { type: 'Tree nuts', severity: 'severe' }
      ],
      preferences: {
        dietary: ['Gluten-free', 'Low sodium'],
        seating: 'Forward facing, left side',
        services: ['WiFi priority', 'Business materials']
      },
      specialRequests: ['Vegetarian meal', 'Extra pillows', 'Privacy screen']
    },
    {
      id: 'P002',
      name: 'Jennifer Martinez',
      vip: false,
      allergies: [
        { type: 'Dairy', severity: 'moderate' }
      ],
      preferences: {
        dietary: ['Vegan'],
        seating: 'Window seat',
        services: ['Entertainment system']
      },
      specialRequests: ['Vegan meal', 'Extra blanket']
    }
  ],
  weather: {
    departure: {
      conditions: 'Partly Cloudy',
      visibility: 10,
      ceiling: 5000,
      winds: '240°/12kt',
      impact: 'none'
    },
    arrival: {
      conditions: 'Thunderstorms',
      visibility: 3,
      ceiling: 1200,
      winds: '180°/25kt G35',
      impact: 'high'
    }
  },
  catering: {
    status: 'confirmed',
    orders: [
      {
        passenger: 'Robert Anderson',
        items: ['Gluten-free grilled salmon', 'Sparkling water', 'Fresh fruit'],
        allergies: ['Shellfish - LIFE THREATENING', 'Tree nuts - SEVERE'],
        specialInstructions: 'NO CROSS-CONTAMINATION - Use separate preparation area'
      },
      {
        passenger: 'Jennifer Martinez',
        items: ['Vegan quinoa bowl', 'Almond milk latte', 'Dark chocolate'],
        allergies: ['Dairy - MODERATE'],
        specialInstructions: 'Ensure all items are certified vegan'
      }
    ],
    alerts: [
      'CRITICAL: Life-threatening shellfish allergy for passenger Anderson',
      'Vegan meal confirmed for passenger Martinez'
    ]
  },
  frat: {
    totalScore: 45,
    riskLevel: 'medium',
    autoPopulatedFactors: [
      {
        category: 'Weather',
        factor: 'Destination thunderstorms',
        score: 15,
        source: 'NAS Status System'
      },
      {
        category: 'Aircraft',
        factor: 'Deferred maintenance item',
        score: 8,
        source: 'Tech Log System'
      },
      {
        category: 'Crew',
        factor: 'First Officer fatigue level',
        score: 12,
        source: 'Crew Management System'
      }
    ],
    manualFactors: [
      {
        category: 'Mission',
        factor: 'VIP passenger with critical allergies',
        score: 10
      }
    ]
  },
  alerts: [
    {
      id: 'A001',
      type: 'safety',
      severity: 'critical',
      message: 'LIFE-THREATENING ALLERGY: Passenger Anderson has severe shellfish allergy',
      source: 'Passenger Database',
      timestamp: '2024-01-20T10:30:00Z'
    },
    {
      id: 'A002',
      type: 'weather',
      severity: 'warning',
      message: 'Thunderstorms forecast at destination KMIA',
      source: 'Weather System',
      timestamp: '2024-01-20T11:15:00Z'
    },
    {
      id: 'A003',
      type: 'crew',
      severity: 'warning',
      message: 'FO Chen currency expires in 14 days',
      source: 'Crew Management',
      timestamp: '2024-01-20T09:00:00Z'
    }
  ]
};

export default function FlightOperationsCenter() {
  const [selectedFlight, setSelectedFlight] = useState<string>('FL001');
  const [flightData, setFlightData] = useState<FlightData>(mockFlightData);
  const [selectedPassenger, setSelectedPassenger] = useState<string | null>(null);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500';
      case 'warning': return 'bg-yellow-500';
      case 'info': return 'bg-blue-500';
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getAllergyColor = (severity: string) => {
    switch (severity) {
      case 'life-threatening': return 'border-red-600 bg-red-50 text-red-800';
      case 'severe': return 'border-orange-500 bg-orange-50 text-orange-800';
      case 'moderate': return 'border-yellow-500 bg-yellow-50 text-yellow-800';
      case 'mild': return 'border-green-500 bg-green-50 text-green-800';
      default: return 'border-gray-300 bg-gray-50 text-gray-800';
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'high': return 'text-red-600 bg-red-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="max-w-full mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1>Flight Operations Center</h1>
          <p className="text-muted-foreground">
            Integrated flight management for {flightData.flightNumber}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <select 
            value={selectedFlight}
            onChange={(e) => setSelectedFlight(e.target.value)}
            className="px-3 py-2 border rounded-md"
          >
            <option value="FL001">G650-001 (KTEB→KMIA)</option>
            <option value="FL002">G650-002 (KLAX→KJFK)</option>
            <option value="FL003">G650-003 (KORD→EGLL)</option>
          </select>
          <Badge variant="secondary" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Departure: {flightData.route.departure.time}
          </Badge>
        </div>
      </div>

      {/* Critical Alerts */}
      {flightData.alerts.filter(alert => alert.severity === 'critical').length > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <div className="space-y-1">
              {flightData.alerts
                .filter(alert => alert.severity === 'critical')
                .map(alert => (
                  <div key={alert.id} className="flex items-center justify-between">
                    <span>{alert.message}</span>
                    <Badge variant="destructive">{alert.type.toUpperCase()}</Badge>
                  </div>
                ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="passengers">Passengers</TabsTrigger>
          <TabsTrigger value="crew">Crew</TabsTrigger>
          <TabsTrigger value="aircraft">Aircraft</TabsTrigger>
          <TabsTrigger value="weather">Weather</TabsTrigger>
          <TabsTrigger value="frat">FRAT</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Flight Status */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Flight Status</CardTitle>
                <Plane className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>{flightData.route.departure.code}</span>
                    <span>→</span>
                    <span>{flightData.route.arrival.code}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {flightData.route.departure.time} - {flightData.route.arrival.time}
                  </div>
                  <Badge className={`${getSeverityColor(flightData.aircraft.status)} text-white`}>
                    {flightData.aircraft.status.toUpperCase()}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Passenger Summary */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Passenger Summary</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-2xl font-bold">{flightData.passengers.length}</div>
                  <div className="text-xs text-muted-foreground">
                    {flightData.passengers.filter(p => p.vip).length} VIP passengers
                  </div>
                  <div className="space-y-1">
                    {flightData.passengers
                      .filter(p => p.allergies.some(a => a.severity === 'life-threatening'))
                      .map(p => (
                        <Badge key={p.id} variant="destructive" className="text-xs">
                          CRITICAL ALLERGY: {p.name}
                        </Badge>
                      ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Weather Impact */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Weather Impact</CardTitle>
                <Cloud className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs">Departure</span>
                    <Badge className={`${getSeverityColor(flightData.weather.departure.impact)} text-white text-xs`}>
                      {flightData.weather.departure.impact.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs">Arrival</span>
                    <Badge className={`${getSeverityColor(flightData.weather.arrival.impact)} text-white text-xs`}>
                      {flightData.weather.arrival.impact.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {flightData.weather.arrival.conditions}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Crew Status */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Crew Status</CardTitle>
                <User className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-2xl font-bold">{flightData.crew.length}</div>
                  <div className="text-xs text-muted-foreground">crew members</div>
                  <div className="space-y-1">
                    {flightData.crew
                      .filter(c => c.currency.warnings.length > 0)
                      .map(c => (
                        <Badge key={c.id} variant="outline" className="text-xs">
                          {c.name}: Currency Warning
                        </Badge>
                      ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Catering Status */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Catering Status</CardTitle>
                <UtensilsCrossed className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Badge className={`${getSeverityColor(flightData.catering.status)} text-white`}>
                    {flightData.catering.status.toUpperCase()}
                  </Badge>
                  <div className="text-xs text-muted-foreground">
                    {flightData.catering.orders.length} special orders
                  </div>
                  {flightData.catering.alerts.length > 0 && (
                    <div className="space-y-1">
                      {flightData.catering.alerts.map((alert, index) => (
                        <div key={index} className="text-xs text-red-600">
                          {alert}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* FRAT Score */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">FRAT Score</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-2xl font-bold">{flightData.frat.totalScore}</div>
                  <Badge className={`${getRiskColor(flightData.frat.riskLevel)}`}>
                    {flightData.frat.riskLevel.toUpperCase()} RISK
                  </Badge>
                  <div className="text-xs text-muted-foreground">
                    {flightData.frat.autoPopulatedFactors.length} auto-populated factors
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Alerts */}
          <Card>
            <CardHeader>
              <CardTitle>System Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {flightData.alerts.map(alert => (
                  <div key={alert.id} className="flex items-start gap-3 p-3 border rounded-md">
                    <div className={`w-2 h-2 rounded-full mt-2 ${getSeverityColor(alert.severity)}`} />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-xs">
                          {alert.type.toUpperCase()}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(alert.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-sm mt-1">{alert.message}</p>
                      <p className="text-xs text-muted-foreground">Source: {alert.source}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Passengers Tab */}
        <TabsContent value="passengers" className="space-y-6">
          <div className="grid gap-4">
            {flightData.passengers.map(passenger => (
              <Card key={passenger.id} className={`${passenger.allergies.some(a => a.severity === 'life-threatening') ? 'border-red-500 border-2' : ''}`}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback>{passenger.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-lg">{passenger.name}</CardTitle>
                        {passenger.vip && <Badge variant="secondary">VIP</Badge>}
                      </div>
                    </div>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">View Details</Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>{passenger.name} - Passenger Profile</DialogTitle>
                        </DialogHeader>
                        <ScrollArea className="max-h-96">
                          <div className="space-y-4">
                            <div>
                              <h4 className="font-medium mb-2">Allergies & Medical</h4>
                              <div className="space-y-2">
                                {passenger.allergies.map((allergy, index) => (
                                  <div key={index} className={`p-3 border-2 rounded-md ${getAllergyColor(allergy.severity)}`}>
                                    <div className="flex items-center justify-between">
                                      <span className="font-medium">{allergy.type}</span>
                                      <Badge className={getSeverityColor(allergy.severity)}>
                                        {allergy.severity.toUpperCase()}
                                      </Badge>
                                    </div>
                                    {allergy.severity === 'life-threatening' && (
                                      <div className="mt-2 text-sm">
                                        ⚠️ EMERGENCY: Carry EpiPen. Notify medical personnel immediately.
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                            
                            <div>
                              <h4 className="font-medium mb-2">Dietary Preferences</h4>
                              <div className="flex flex-wrap gap-2">
                                {passenger.preferences.dietary.map((diet, index) => (
                                  <Badge key={index} variant="outline">{diet}</Badge>
                                ))}
                              </div>
                            </div>
                            
                            <div>
                              <h4 className="font-medium mb-2">Service Preferences</h4>
                              <div className="space-y-1">
                                <p><strong>Seating:</strong> {passenger.preferences.seating}</p>
                                <p><strong>Services:</strong> {passenger.preferences.services.join(', ')}</p>
                              </div>
                            </div>
                            
                            <div>
                              <h4 className="font-medium mb-2">Special Requests</h4>
                              <ul className="space-y-1">
                                {passenger.specialRequests.map((request, index) => (
                                  <li key={index} className="text-sm">• {request}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </ScrollArea>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {/* Critical Allergies */}
                    {passenger.allergies.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Heart className="h-4 w-4 text-red-500" />
                          <span className="font-medium text-sm">Medical Alerts</span>
                        </div>
                        <div className="space-y-2">
                          {passenger.allergies.map((allergy, index) => (
                            <Badge 
                              key={index} 
                              className={`${getAllergyColor(allergy.severity)} text-xs`}
                            >
                              {allergy.type} - {allergy.severity.toUpperCase()}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Catering Status */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <UtensilsCrossed className="h-4 w-4 text-green-500" />
                        <span className="font-medium text-sm">Catering Order</span>
                      </div>
                      {flightData.catering.orders
                        .filter(order => order.passenger === passenger.name)
                        .map((order, index) => (
                          <div key={index} className="text-sm space-y-1">
                            <div><strong>Items:</strong> {order.items.join(', ')}</div>
                            {order.allergies.length > 0 && (
                              <div className="text-red-600">
                                <strong>ALLERGIES:</strong> {order.allergies.join(', ')}
                              </div>
                            )}
                            {order.specialInstructions && (
                              <div className="text-blue-600">
                                <strong>Instructions:</strong> {order.specialInstructions}
                              </div>
                            )}
                          </div>
                        ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Crew Tab */}
        <TabsContent value="crew" className="space-y-6">
          <div className="grid gap-4">
            {flightData.crew.map(crew => (
              <Card key={crew.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback>{crew.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-lg">{crew.name}</CardTitle>
                        <Badge variant="outline">{crew.role.replace('-', ' ').toUpperCase()}</Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge className={`${getRiskColor(crew.fatigue.risk)} text-xs`}>
                        Fatigue: {crew.fatigue.risk.toUpperCase()}
                      </Badge>
                      <div className="text-xs text-muted-foreground mt-1">
                        Score: {crew.fatigue.score}/100
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Currency Status */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm">Currency Status</span>
                        <Badge variant={crew.currency.current ? "default" : "destructive"}>
                          {crew.currency.current ? "CURRENT" : "EXPIRED"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Expires: {new Date(crew.currency.expires).toLocaleDateString()}
                      </p>
                      {crew.currency.warnings.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {crew.currency.warnings.map((warning, index) => (
                            <Alert key={index} className="py-2">
                              <AlertTriangle className="h-4 w-4" />
                              <AlertDescription className="text-sm">{warning}</AlertDescription>
                            </Alert>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Qualifications */}
                    <div>
                      <span className="font-medium text-sm">Qualifications</span>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {crew.qualifications.map((qual, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {qual}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Fatigue Analysis */}
                    <div>
                      <span className="font-medium text-sm">Fatigue Risk Analysis</span>
                      <div className="mt-2">
                        <Progress value={crew.fatigue.score} className="h-2" />
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                          <span>Low Risk</span>
                          <span>High Risk</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Aircraft Tab */}
        <TabsContent value="aircraft" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plane className="h-5 w-5" />
                {flightData.aircraft.model} - {flightData.aircraft.registration}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <div>
                    <span className="font-medium">Current Status</span>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className={`${getSeverityColor(flightData.aircraft.status)} text-white`}>
                        {flightData.aircraft.status.toUpperCase()}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        at {flightData.aircraft.location}
                      </span>
                    </div>
                  </div>

                  <div>
                    <span className="font-medium">Fuel Level</span>
                    <div className="mt-2">
                      <Progress value={flightData.aircraft.fuelLevel} className="h-3" />
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>0%</span>
                        <span>{flightData.aircraft.fuelLevel}%</span>
                        <span>100%</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <span className="font-medium">Maintenance Schedule</span>
                    <div className="mt-2 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Last Maintenance:</span>
                        <span>{new Date(flightData.aircraft.lastMaintenance).toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Next Due:</span>
                        <span>{new Date(flightData.aircraft.nextMaintenance).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <span className="font-medium">Active Squawks</span>
                    <div className="mt-2 space-y-2">
                      {flightData.aircraft.squawks.map(squawk => (
                        <div key={squawk.id} className="p-3 border rounded-md">
                          <div className="flex items-center justify-between mb-1">
                            <Badge className={`${getSeverityColor(squawk.severity)} text-white text-xs`}>
                              {squawk.severity.toUpperCase()}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {squawk.status.toUpperCase()}
                            </Badge>
                          </div>
                          <p className="text-sm">{squawk.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Weather Tab */}
        <TabsContent value="weather" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Departure - {flightData.route.departure.code}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span>Conditions:</span>
                    <span>{flightData.weather.departure.conditions}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Visibility:</span>
                    <span>{flightData.weather.departure.visibility} SM</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Ceiling:</span>
                    <span>{flightData.weather.departure.ceiling} ft</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Winds:</span>
                    <span>{flightData.weather.departure.winds}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Impact:</span>
                    <Badge className={`${getSeverityColor(flightData.weather.departure.impact)} text-white`}>
                      {flightData.weather.departure.impact.toUpperCase()}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Arrival - {flightData.route.arrival.code}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span>Conditions:</span>
                    <span>{flightData.weather.arrival.conditions}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Visibility:</span>
                    <span>{flightData.weather.arrival.visibility} SM</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Ceiling:</span>
                    <span>{flightData.weather.arrival.ceiling} ft</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Winds:</span>
                    <span>{flightData.weather.arrival.winds}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Impact:</span>
                    <Badge className={`${getSeverityColor(flightData.weather.arrival.impact)} text-white`}>
                      {flightData.weather.arrival.impact.toUpperCase()}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* FRAT Tab */}
        <TabsContent value="frat" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Flight Risk Assessment Tool
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">Total Risk Score</span>
                      <div className="text-right">
                        <div className="text-2xl font-bold">{flightData.frat.totalScore}</div>
                        <Badge className={`${getRiskColor(flightData.frat.riskLevel)}`}>
                          {flightData.frat.riskLevel.toUpperCase()} RISK
                        </Badge>
                      </div>
                    </div>
                    <Progress value={(flightData.frat.totalScore / 100) * 100} className="h-3" />
                  </div>

                  <div>
                    <span className="font-medium">Auto-Populated Risk Factors</span>
                    <div className="mt-2 space-y-2">
                      {flightData.frat.autoPopulatedFactors.map((factor, index) => (
                        <div key={index} className="p-3 border rounded-md bg-blue-50">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-sm">{factor.category}</span>
                            <Badge variant="outline">{factor.score} points</Badge>
                          </div>
                          <p className="text-sm">{factor.factor}</p>
                          <p className="text-xs text-muted-foreground">Source: {factor.source}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <span className="font-medium">Manual Risk Factors</span>
                    <div className="mt-2 space-y-2">
                      {flightData.frat.manualFactors.map((factor, index) => (
                        <div key={index} className="p-3 border rounded-md">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-sm">{factor.category}</span>
                            <Badge variant="outline">{factor.score} points</Badge>
                          </div>
                          <p className="text-sm">{factor.factor}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                    <h4 className="font-medium text-yellow-800 mb-2">Risk Mitigation Required</h4>
                    <ul className="text-sm text-yellow-700 space-y-1">
                      <li>• Brief crew on thunderstorm procedures</li>
                      <li>• Review passenger allergy emergency procedures</li>
                      <li>• Monitor FO fatigue levels during flight</li>
                      <li>• Verify alternate airport fuel requirements</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}