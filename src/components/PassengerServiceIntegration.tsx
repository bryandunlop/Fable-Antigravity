import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Progress } from './ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { 
  Users, 
  Heart, 
  UtensilsCrossed,
  AlertTriangle,
  CheckCircle,
  Clock,
  MapPin,
  Plane,
  Star,
  Shield,
  Phone,
  Mail,
  Calendar,
  Coffee,
  Utensils,
  User,
  Bell,
  Eye,
  Activity,
  TrendingUp,
  Info
} from 'lucide-react';

interface PassengerAlert {
  id: string;
  type: 'allergy' | 'preference' | 'vip' | 'medical' | 'service';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  actionRequired: boolean;
  systemSource: string;
}

interface ServiceHistory {
  date: string;
  flightNumber: string;
  route: string;
  rating: number;
  feedback: string;
  crew: string[];
  preferences: string[];
  issues: string[];
}

interface IntegratedPassengerData {
  id: string;
  name: string;
  vip: boolean;
  vipLevel: 'standard' | 'gold' | 'platinum' | 'diamond';
  avatar?: string;
  contact: {
    email: string;
    phone: string;
    emergencyContact: string;
  };
  allergies: Array<{
    type: string;
    severity: 'mild' | 'moderate' | 'severe' | 'life-threatening';
    notes: string;
    verifiedDate: string;
  }>;
  medicalInfo: {
    conditions: string[];
    medications: string[];
    emergencyProtocol: string;
  };
  preferences: {
    dietary: string[];
    beverage: string[];
    seating: string;
    temperature: string;
    services: string[];
    entertainment: string[];
  };
  serviceHistory: ServiceHistory[];
  upcomingFlights: Array<{
    date: string;
    flightNumber: string;
    route: string;
    aircraft: string;
    crew: string[];
  }>;
  alerts: PassengerAlert[];
  cateringOrders: Array<{
    flightDate: string;
    status: 'pending' | 'confirmed' | 'delivered';
    items: string[];
    specialInstructions: string;
    allergyPrecautions: string[];
  }>;
  crewNotes: Array<{
    date: string;
    crew: string;
    note: string;
    category: 'preference' | 'issue' | 'compliment' | 'concern';
  }>;
}

const mockPassengerData: IntegratedPassengerData = {
  id: 'P001',
  name: 'Robert Anderson',
  vip: true,
  vipLevel: 'platinum',
  contact: {
    email: 'r.anderson@company.com',
    phone: '+1 (555) 123-4567',
    emergencyContact: '+1 (555) 987-6543'
  },
  allergies: [
    {
      type: 'Shellfish',
      severity: 'life-threatening',
      notes: 'Anaphylactic reaction - requires EpiPen immediately. NO CROSS-CONTAMINATION.',
      verifiedDate: '2024-01-15'
    },
    {
      type: 'Tree nuts',
      severity: 'severe',
      notes: 'Swelling and difficulty breathing. Avoid all nuts including traces.',
      verifiedDate: '2024-01-15'
    }
  ],
  medicalInfo: {
    conditions: ['Severe allergies', 'Mild hypertension'],
    medications: ['EpiPen (2 units)', 'Lisinopril 10mg daily'],
    emergencyProtocol: 'Immediately administer EpiPen for any allergic reaction. Contact emergency medical services. Keep patient calm and monitor breathing.'
  },
  preferences: {
    dietary: ['Gluten-free', 'Low sodium', 'Organic when possible'],
    beverage: ['Sparkling water', 'Decaf coffee', 'Red wine (Cabernet)'],
    seating: 'Forward facing, left side window',
    temperature: 'Slightly cool (68-70°F)',
    services: ['WiFi priority', 'Business materials setup', 'Privacy screen'],
    entertainment: ['Business news', 'Classical music', 'Technology magazines']
  },
  serviceHistory: [
    {
      date: '2024-01-10',
      flightNumber: 'G650-003',
      route: 'KTEB → EGLL',
      rating: 5,
      feedback: 'Excellent service. Crew very attentive to allergy concerns.',
      crew: ['Captain Johnson', 'FA Williams'],
      preferences: ['Extra pillows provided', 'Business setup completed'],
      issues: []
    },
    {
      date: '2023-12-15',
      flightNumber: 'G650-001',
      route: 'KLAX → KJFK',
      rating: 4,
      feedback: 'Good flight overall. Minor delay in meal service.',
      crew: ['Captain Smith', 'FA Davis'],
      preferences: ['Preferred seating', 'WiFi priority'],
      issues: ['Meal service delay']
    }
  ],
  upcomingFlights: [
    {
      date: '2024-01-20',
      flightNumber: 'G650-001',
      route: 'KTEB → KMIA',
      aircraft: 'N123GS',
      crew: ['Captain Johnson', 'FO Chen', 'FA Williams']
    }
  ],
  alerts: [
    {
      id: 'A001',
      type: 'allergy',
      severity: 'critical',
      message: 'LIFE-THREATENING SHELLFISH ALLERGY - EpiPen required onboard',
      actionRequired: true,
      systemSource: 'Medical Alert System'
    },
    {
      id: 'A002',
      type: 'vip',
      severity: 'info',
      message: 'Platinum VIP - Enhanced service protocol required',
      actionRequired: false,
      systemSource: 'VIP Management System'
    },
    {
      id: 'A003',
      type: 'preference',
      severity: 'warning',
      message: 'Strict gluten-free requirements - kitchen cross-contamination risk',
      actionRequired: true,
      systemSource: 'Catering Integration'
    }
  ],
  cateringOrders: [
    {
      flightDate: '2024-01-20',
      status: 'confirmed',
      items: ['Gluten-free grilled salmon', 'Sparkling water', 'Fresh fruit selection'],
      specialInstructions: 'CRITICAL: NO SHELLFISH OR NUTS - Use separate preparation area and utensils',
      allergyPrecautions: ['Shellfish - LIFE THREATENING', 'Tree nuts - SEVERE']
    }
  ],
  crewNotes: [
    {
      date: '2024-01-10',
      crew: 'FA Williams',
      note: 'Very polite and understanding about allergy protocols. Appreciates detailed explanations.',
      category: 'preference'
    },
    {
      date: '2023-12-15',
      crew: 'Captain Smith',
      note: 'Prefers updates on flight progress. Enjoys discussing aviation technology.',
      category: 'preference'
    }
  ]
};

export default function PassengerServiceIntegration() {
  const [selectedPassenger, setSelectedPassenger] = useState<IntegratedPassengerData>(mockPassengerData);
  const [selectedTab, setSelectedTab] = useState('overview');

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'border-red-500 bg-red-50 text-red-800';
      case 'warning': return 'border-yellow-500 bg-yellow-50 text-yellow-800';
      case 'info': return 'border-blue-500 bg-blue-50 text-blue-800';
      default: return 'border-gray-300 bg-gray-50 text-gray-800';
    }
  };

  const getAllergyColor = (severity: string) => {
    switch (severity) {
      case 'life-threatening': return 'border-red-600 bg-red-100 text-red-900 border-2';
      case 'severe': return 'border-orange-500 bg-orange-50 text-orange-800';
      case 'moderate': return 'border-yellow-500 bg-yellow-50 text-yellow-800';
      case 'mild': return 'border-green-500 bg-green-50 text-green-800';
      default: return 'border-gray-300 bg-gray-50 text-gray-800';
    }
  };

  const getVIPBadgeColor = (level: string) => {
    switch (level) {
      case 'diamond': return 'bg-purple-600 text-white';
      case 'platinum': return 'bg-gray-600 text-white';
      case 'gold': return 'bg-yellow-600 text-white';
      default: return 'bg-blue-600 text-white';
    }
  };

  const getServiceRating = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
      />
    ));
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            Passenger Service Integration
          </h1>
          <p className="text-muted-foreground">
            Comprehensive passenger management with cross-system integration
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge className={`${getVIPBadgeColor(selectedPassenger.vipLevel)} text-lg px-3 py-1`}>
            {selectedPassenger.vipLevel.toUpperCase()} VIP
          </Badge>
        </div>
      </div>

      {/* Critical Alerts */}
      {selectedPassenger.alerts.filter(alert => alert.severity === 'critical').length > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <div className="space-y-2">
              <div className="font-medium">CRITICAL PASSENGER ALERTS</div>
              {selectedPassenger.alerts
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

      {/* Passenger Profile Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={selectedPassenger.avatar} />
                <AvatarFallback className="text-lg">
                  {selectedPassenger.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-xl">{selectedPassenger.name}</CardTitle>
                <div className="flex items-center gap-2 mt-1">
                  {selectedPassenger.vip && (
                    <Badge className={getVIPBadgeColor(selectedPassenger.vipLevel)}>
                      {selectedPassenger.vipLevel.toUpperCase()}
                    </Badge>
                  )}
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Activity className="h-3 w-3" />
                    {selectedPassenger.serviceHistory.length} Flights
                  </Badge>
                </div>
              </div>
            </div>
            <div className="text-right space-y-2">
              <Button variant="outline" size="sm" className="flex items-center gap-1">
                <Phone className="h-3 w-3" />
                Contact
              </Button>
              <Button variant="outline" size="sm" className="flex items-center gap-1">
                <Bell className="h-3 w-3" />
                Notify Crew
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Main Content Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="medical">Medical & Allergies</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
          <TabsTrigger value="catering">Catering Integration</TabsTrigger>
          <TabsTrigger value="history">Service History</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming Flights</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* System Alerts */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-2xl font-bold text-red-600">
                    {selectedPassenger.alerts.filter(a => a.severity === 'critical').length}
                  </div>
                  <div className="text-xs text-muted-foreground">Critical alerts active</div>
                  <div className="space-y-1">
                    {selectedPassenger.alerts.slice(0, 2).map(alert => (
                      <Badge key={alert.id} className={`${getSeverityColor(alert.severity)} text-xs block`}>
                        {alert.type.toUpperCase()}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Service Rating */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Service Rating</CardTitle>
                <Star className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center gap-1">
                    {getServiceRating(Math.round(
                      selectedPassenger.serviceHistory.reduce((sum, h) => sum + h.rating, 0) / 
                      selectedPassenger.serviceHistory.length
                    ))}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Average from {selectedPassenger.serviceHistory.length} flights
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Upcoming Flight */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Next Flight</CardTitle>
                <Plane className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {selectedPassenger.upcomingFlights[0] && (
                    <>
                      <div className="font-medium">
                        {selectedPassenger.upcomingFlights[0].flightNumber}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {selectedPassenger.upcomingFlights[0].route}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(selectedPassenger.upcomingFlights[0].date).toLocaleDateString()}
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* System Integration Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Cross-System Integration Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="flex items-center justify-between p-3 border rounded-md">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Passenger Database</span>
                  </div>
                  <Badge variant="outline" className="text-xs">Connected</Badge>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-md">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Catering System</span>
                  </div>
                  <Badge variant="outline" className="text-xs">Integrated</Badge>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-md">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Crew Notifications</span>
                  </div>
                  <Badge variant="outline" className="text-xs">Active</Badge>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-md">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Medical Alerts</span>
                  </div>
                  <Badge variant="outline" className="text-xs">Monitoring</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Medical & Allergies Tab */}
        <TabsContent value="medical" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <Heart className="h-5 w-5" />
                Critical Medical Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Allergies */}
                <div>
                  <h3 className="font-medium mb-3">Allergies</h3>
                  <div className="space-y-3">
                    {selectedPassenger.allergies.map((allergy, index) => (
                      <Card key={index} className={`${getAllergyColor(allergy.severity)}`}>
                        <CardContent className="pt-4">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium">{allergy.type}</h4>
                              <Badge variant="destructive">
                                {allergy.severity.toUpperCase()}
                              </Badge>
                            </div>
                            <p className="text-sm">{allergy.notes}</p>
                            <div className="text-xs text-muted-foreground">
                              Verified: {new Date(allergy.verifiedDate).toLocaleDateString()}
                            </div>
                            {allergy.severity === 'life-threatening' && (
                              <Alert className="mt-2 border-red-300 bg-red-100">
                                <Shield className="h-4 w-4 text-red-600" />
                                <AlertDescription className="text-red-800 text-sm">
                                  <strong>EMERGENCY PROTOCOL:</strong> Immediately administer EpiPen. 
                                  Contact emergency medical services. Monitor breathing continuously.
                                </AlertDescription>
                              </Alert>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Medical Conditions & Medications */}
                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <h3 className="font-medium mb-3">Medical Conditions</h3>
                    <div className="space-y-2">
                      {selectedPassenger.medicalInfo.conditions.map((condition, index) => (
                        <Badge key={index} variant="outline" className="block w-fit">
                          {condition}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="font-medium mb-3">Medications</h3>
                    <div className="space-y-2">
                      {selectedPassenger.medicalInfo.medications.map((medication, index) => (
                        <Badge key={index} variant="outline" className="block w-fit">
                          {medication}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Emergency Protocol */}
                <Card className="border-red-200 bg-red-50">
                  <CardHeader>
                    <CardTitle className="text-red-800 flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      Emergency Protocol
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-red-800 text-sm leading-relaxed">
                      {selectedPassenger.medicalInfo.emergencyProtocol}
                    </p>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preferences Tab */}
        <TabsContent value="preferences" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Utensils className="h-5 w-5" />
                  Dining Preferences
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Dietary Requirements</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedPassenger.preferences.dietary.map((diet, index) => (
                        <Badge key={index} className="bg-green-100 text-green-800">
                          {diet}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Preferred Beverages</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedPassenger.preferences.beverage.map((drink, index) => (
                        <Badge key={index} variant="outline">
                          {drink}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Service Preferences
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Seating</h4>
                    <Badge variant="outline">{selectedPassenger.preferences.seating}</Badge>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Temperature</h4>
                    <Badge variant="outline">{selectedPassenger.preferences.temperature}</Badge>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Special Services</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedPassenger.preferences.services.map((service, index) => (
                        <Badge key={index} className="bg-blue-100 text-blue-800">
                          {service}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Catering Integration Tab */}
        <TabsContent value="catering" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UtensilsCrossed className="h-5 w-5" />
                Integrated Catering Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {selectedPassenger.cateringOrders.map((order, index) => (
                  <Card key={index} className="border-2 border-green-200">
                    <CardContent className="pt-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">
                            Flight: {new Date(order.flightDate).toLocaleDateString()}
                          </h4>
                          <Badge className={`${
                            order.status === 'confirmed' ? 'bg-green-500' :
                            order.status === 'delivered' ? 'bg-blue-500' :
                            'bg-yellow-500'
                          } text-white`}>
                            {order.status.toUpperCase()}
                          </Badge>
                        </div>
                        
                        <div>
                          <h5 className="text-sm font-medium mb-1">Ordered Items</h5>
                          <div className="space-y-1">
                            {order.items.map((item, itemIndex) => (
                              <Badge key={itemIndex} variant="outline" className="mr-2 mb-1">
                                {item}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                          <h5 className="text-sm font-medium text-red-800 mb-1">
                            ALLERGY PRECAUTIONS
                          </h5>
                          <div className="space-y-1">
                            {order.allergyPrecautions.map((precaution, precIndex) => (
                              <Badge key={precIndex} variant="destructive" className="mr-2 mb-1">
                                {precaution}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                          <h5 className="text-sm font-medium text-blue-800 mb-1">
                            Special Instructions
                          </h5>
                          <p className="text-sm text-blue-700">{order.specialInstructions}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Service History Tab */}
        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Service History & Crew Notes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {selectedPassenger.serviceHistory.map((flight, index) => (
                  <Card key={index} className="border-l-4 border-l-blue-500">
                    <CardContent className="pt-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">{flight.flightNumber}</h4>
                            <p className="text-sm text-muted-foreground">
                              {flight.route} • {new Date(flight.date).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            {getServiceRating(flight.rating)}
                          </div>
                        </div>
                        
                        <p className="text-sm">{flight.feedback}</p>
                        
                        <div className="grid gap-3 md:grid-cols-2">
                          <div>
                            <h5 className="text-sm font-medium mb-1">Crew</h5>
                            <div className="space-y-1">
                              {flight.crew.map((crew, crewIndex) => (
                                <Badge key={crewIndex} variant="outline" className="mr-1">
                                  {crew}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <div>
                            <h5 className="text-sm font-medium mb-1">Preferences Honored</h5>
                            <div className="space-y-1">
                              {flight.preferences.map((pref, prefIndex) => (
                                <Badge key={prefIndex} className="bg-green-100 text-green-800 mr-1">
                                  {pref}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                <Separator />

                <div>
                  <h3 className="font-medium mb-3">Crew Notes</h3>
                  <div className="space-y-3">
                    {selectedPassenger.crewNotes.map((note, index) => (
                      <Card key={index}>
                        <CardContent className="pt-4">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{note.crew}</Badge>
                              <Badge className={`${
                                note.category === 'compliment' ? 'bg-green-100 text-green-800' :
                                note.category === 'concern' ? 'bg-red-100 text-red-800' :
                                'bg-blue-100 text-blue-800'
                              }`}>
                                {note.category}
                              </Badge>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {new Date(note.date).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-sm">{note.note}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Upcoming Flights Tab */}
        <TabsContent value="upcoming" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Upcoming Flights & Crew Preparation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {selectedPassenger.upcomingFlights.map((flight, index) => (
                  <Card key={index} className="border-2 border-primary/20">
                    <CardContent className="pt-4">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">{flight.flightNumber}</h4>
                            <p className="text-sm text-muted-foreground">
                              {flight.route} • {new Date(flight.date).toLocaleDateString()}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Aircraft: {flight.aircraft}
                            </p>
                          </div>
                          <Button size="sm" className="btn-aviation-primary">
                            Crew Brief
                          </Button>
                        </div>

                        <div>
                          <h5 className="text-sm font-medium mb-2">Assigned Crew</h5>
                          <div className="grid gap-2 md:grid-cols-3">
                            {flight.crew.map((crew, crewIndex) => (
                              <Card key={crewIndex} className="p-3">
                                <div className="flex items-center gap-2">
                                  <Avatar className="h-8 w-8">
                                    <AvatarFallback className="text-xs">
                                      {crew.split(' ').map(n => n[0]).join('')}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className="text-sm font-medium">{crew}</p>
                                    <Badge variant="outline" className="text-xs">
                                      Notified
                                    </Badge>
                                  </div>
                                </div>
                              </Card>
                            ))}
                          </div>
                        </div>

                        <Alert className="border-blue-200 bg-blue-50">
                          <Info className="h-4 w-4 text-blue-600" />
                          <AlertDescription className="text-blue-800">
                            <div className="space-y-1">
                              <div className="font-medium">Crew Preparation Items:</div>
                              <ul className="text-sm space-y-1 ml-4">
                                <li>• EpiPen confirmed onboard for shellfish allergy</li>
                                <li>• Gluten-free meal preparation verified</li>
                                <li>• VIP service protocol briefing completed</li>
                                <li>• Emergency medical equipment check completed</li>
                              </ul>
                            </div>
                          </AlertDescription>
                        </Alert>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}