import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import FleetStatusWidget from './FleetStatusWidget';
import { 
  Wrench,
  Plane,
  Clock,
  CheckCircle,
  AlertTriangle,
  User,
  Calendar,
  Package,
  Settings,
  Clipboard,
  Fuel,
  ArrowUp,
  ArrowDown,
  Users,
  Car,
  MapPin,
  Radio,
  Eye,
  Timer,
  AlertCircle,
  Gauge
} from 'lucide-react';

interface Aircraft {
  id: string;
  registration: string;
  model: string;
  status: 'in-service' | 'in-work' | 'aog';
  location: string;
  hoursToNext: number;
  nextFlight?: {
    flightNumber: string;
    departure: string;
    destination: string;
    fuelLoad: number;
    estimatedDeparture: string;
  };
  lastCrew?: {
    captain: string;
    firstOfficer: string;
    flightAttendant?: string;
    lastFlight: string;
  };
}

interface DailyOperation {
  id: string;
  type: 'departure' | 'arrival';
  flightNumber: string;
  aircraft: string;
  time: string;
  estimatedTime?: string;
  adsbTime?: string;
  destination?: string;
  origin?: string;
  status: 'scheduled' | 'departed' | 'arrived' | 'delayed';
}

interface HangarCar {
  id: string;
  owner: string;
  make: string;
  model: string;
  color: string;
  licensePlate: string;
  location: string;
  checkedIn: string;
  flightAssignment?: string;
}

export default function MaintenanceDashboard() {
  const currentUser = 'Mike Rodriguez';
  const [selectedAircraft, setSelectedAircraft] = useState<Aircraft | null>(null);

  const aircraft: Aircraft[] = [
    {
      id: 'AC001',
      registration: 'N123AB',
      model: 'Gulfstream G650',
      status: 'in-service',
      location: 'Hangar 1',
      hoursToNext: 15.5,
      nextFlight: {
        flightNumber: 'FO045',
        departure: 'KJFK',
        destination: 'KBOS',
        fuelLoad: 12500,
        estimatedDeparture: '14:30'
      },
      lastCrew: {
        captain: 'Captain Sarah Johnson',
        firstOfficer: 'FO Michael Chen',
        flightAttendant: 'FA Jessica Williams',
        lastFlight: 'FO044 - KBOS to KJFK'
      }
    },
    {
      id: 'AC002',
      registration: 'N456CD',
      model: 'Gulfstream G650',
      status: 'in-work',
      location: 'Hangar 2',
      hoursToNext: 8.2,
      nextFlight: {
        flightNumber: 'FO046',
        departure: 'KJFK',
        destination: 'EGLL',
        fuelLoad: 18500,
        estimatedDeparture: '20:15'
      },
      lastCrew: {
        captain: 'Captain James Rodriguez',
        firstOfficer: 'FO Amanda White',
        flightAttendant: 'FA David Martinez',
        lastFlight: 'FO043 - EGLL to KJFK'
      }
    },
    {
      id: 'AC003',
      registration: 'N789EF',
      model: 'Gulfstream G650',
      status: 'aog',
      location: 'Hangar 3',
      hoursToNext: 2.1,
      nextFlight: {
        flightNumber: 'FO047',
        departure: 'KJFK',
        destination: 'KORD',
        fuelLoad: 11000,
        estimatedDeparture: '08:00'
      },
      lastCrew: {
        captain: 'Captain Robert Thompson',
        firstOfficer: 'FO Lisa Davis',
        flightAttendant: 'FA Mark Johnson',
        lastFlight: 'FO042 - KORD to KJFK'
      }
    }
  ];

  const dailyOperations: DailyOperation[] = [
    {
      id: 'OP001',
      type: 'departure',
      flightNumber: 'FO045',
      aircraft: 'N123AB',
      time: '14:30',
      destination: 'KBOS',
      status: 'scheduled'
    },
    {
      id: 'OP002',
      type: 'arrival',
      flightNumber: 'FO044',
      aircraft: 'N456CD',
      time: '16:45',
      estimatedTime: '16:52',
      adsbTime: '16:48',
      origin: 'EGLL',
      status: 'arrived'
    },
    {
      id: 'OP003',
      type: 'departure',
      flightNumber: 'FO046',
      aircraft: 'N456CD',
      time: '20:15',
      destination: 'EGLL',
      status: 'scheduled'
    },
    {
      id: 'OP004',
      type: 'arrival',
      flightNumber: 'FO043',
      aircraft: 'N789EF',
      time: '22:30',
      estimatedTime: '22:45',
      origin: 'KORD',
      status: 'delayed'
    }
  ];

  const hangarCars: HangarCar[] = [
    {
      id: 'CAR001',
      owner: 'Johnson Family',
      make: 'Mercedes-Benz',
      model: 'S-Class',
      color: 'Black',
      licensePlate: 'NY-JET-1',
      location: 'Bay 3',
      checkedIn: '2025-02-01 14:30',
      flightAssignment: 'FO045'
    },
    {
      id: 'CAR002',
      owner: 'Smith Corporate',
      make: 'BMW',
      model: 'X7',
      color: 'White',
      licensePlate: 'CT-EXEC-2',
      location: 'Bay 1',
      checkedIn: '2025-02-01 09:15',
      flightAssignment: 'FO046'
    },
    {
      id: 'CAR003',
      owner: 'Davis Family',
      make: 'Audi',
      model: 'Q8',
      color: 'Silver',
      licensePlate: 'NJ-VIP-3',
      location: 'Bay 5',
      checkedIn: '2025-02-01 11:45'
    },
    {
      id: 'CAR004',
      owner: 'Wilson Trust',
      make: 'Range Rover',
      model: 'Autobiography',
      color: 'Navy Blue',
      licensePlate: 'NY-PRIV-4',
      location: 'Bay 2',
      checkedIn: '2025-02-01 16:20',
      flightAssignment: 'FO047'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in-service': return 'bg-green-500';
      case 'in-work': return 'bg-yellow-500';
      case 'aog': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'in-service': return <Badge className="bg-green-100 text-green-800 border-green-200">In Service</Badge>;
      case 'in-work': return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">In Work</Badge>;
      case 'aog': return <Badge className="bg-red-100 text-red-800 border-red-200">AOG</Badge>;
      default: return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getOperationStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'text-blue-600';
      case 'departed': return 'text-green-600';
      case 'arrived': return 'text-green-600';
      case 'delayed': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6">
        <div>
          <h1>Maintenance Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {currentUser}</p>
        </div>
        
        <div className="flex items-center gap-4 mt-4 lg:mt-0">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4" />
            Saturday, February 2, 2025
          </div>
          <Badge variant="outline" className="flex items-center gap-1">
            <User className="w-3 h-3" />
            Maintenance Technician
          </Badge>
        </div>
      </div>

      {/* Fleet Status Widget */}
      <div className="mb-6">
        <FleetStatusWidget compact={true} showDetailsLink={true} />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clipboard className="w-4 h-4 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Today's Tasks</p>
                <p className="text-2xl font-bold">3</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <div>
                <p className="text-sm text-green-700 font-medium">In Service</p>
                <p className="text-2xl font-bold text-green-700">
                  {aircraft.filter(a => a.status === 'in-service').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Wrench className="w-4 h-4 text-yellow-600" />
              <div>
                <p className="text-sm text-yellow-700 font-medium">In Work</p>
                <p className="text-2xl font-bold text-yellow-700">
                  {aircraft.filter(a => a.status === 'in-work').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <div>
                <p className="text-sm text-red-700 font-medium">AOG</p>
                <p className="text-2xl font-bold text-red-700">
                  {aircraft.filter(a => a.status === 'aog').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Car className="w-4 h-4 text-purple-600" />
              <div>
                <p className="text-sm text-muted-foreground">Cars in Hangar</p>
                <p className="text-2xl font-bold">{hangarCars.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Hours Today</p>
                <p className="text-2xl font-bold">6.5</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="aircraft" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="aircraft">Aircraft Status</TabsTrigger>
          <TabsTrigger value="operations">Daily Operations</TabsTrigger>
          <TabsTrigger value="cars">Hangar Cars</TabsTrigger>
          <TabsTrigger value="workorders">Work Orders</TabsTrigger>
        </TabsList>

        <TabsContent value="aircraft" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>G650 Fleet Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {aircraft.map((plane) => (
                      <Card 
                        key={plane.id} 
                        className={`p-4 cursor-pointer hover:bg-muted/50 transition-colors ${
                          plane.status === 'aog' ? 'border-red-500 border-2 bg-red-50' : 
                          plane.status === 'in-work' ? 'border-yellow-300 border-2 bg-yellow-50' : ''
                        }`}
                        onClick={() => setSelectedAircraft(plane)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${getStatusColor(plane.status)}`}></div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium">{plane.registration}</h4>
                                {getStatusBadge(plane.status)}
                              </div>
                              <p className="text-sm text-muted-foreground">{plane.model}</p>
                              <div className="flex items-center gap-4 mt-2 text-sm">
                                <div className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {plane.location}
                                </div>
                                <div className="flex items-center gap-1">
                                  <Timer className="w-3 h-3" />
                                  {plane.hoursToNext}h to next
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {plane.nextFlight && (
                            <div className="text-right text-sm">
                              <div className="font-medium">{plane.nextFlight.flightNumber}</div>
                              <div className="text-muted-foreground">
                                {plane.nextFlight.departure} → {plane.nextFlight.destination}
                              </div>
                              <div className="flex items-center gap-1 justify-end mt-1">
                                <Fuel className="w-3 h-3" />
                                {plane.nextFlight.fuelLoad.toLocaleString()} lbs
                              </div>
                            </div>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Aircraft Details Panel */}
            <div className="lg:col-span-1">
              {selectedAircraft ? (
                <Card className="sticky top-20">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Plane className="w-5 h-5" />
                      {selectedAircraft.registration}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${getStatusColor(selectedAircraft.status)}`}></div>
                      {getStatusBadge(selectedAircraft.status)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {selectedAircraft.status === 'aog' && (
                      <div className="p-3 bg-red-100 border border-red-300 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertTriangle className="w-5 h-5 text-red-600" />
                          <span className="font-bold text-red-700">AIRCRAFT ON GROUND</span>
                        </div>
                        <div className="text-sm text-red-700">
                          Immediate attention required. Next flight in {selectedAircraft.hoursToNext} hours.
                        </div>
                      </div>
                    )}

                    <div>
                      <h4 className="font-medium mb-2">Aircraft Details</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Model:</span>
                          <span>{selectedAircraft.model}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Location:</span>
                          <span>{selectedAircraft.location}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Hours to Next:</span>
                          <span>{selectedAircraft.hoursToNext}h</span>
                        </div>
                      </div>
                    </div>

                    {selectedAircraft.nextFlight && (
                      <div>
                        <h4 className="font-medium mb-2">Next Flight</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Flight:</span>
                            <span>{selectedAircraft.nextFlight.flightNumber}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Route:</span>
                            <span>{selectedAircraft.nextFlight.departure} → {selectedAircraft.nextFlight.destination}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Departure:</span>
                            <span>{selectedAircraft.nextFlight.estimatedDeparture}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Fuel Load:</span>
                            <span>{selectedAircraft.nextFlight.fuelLoad.toLocaleString()} lbs</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {selectedAircraft.lastCrew && (
                      <div>
                        <h4 className="font-medium mb-2">Previous Crew</h4>
                        <div className="text-sm text-muted-foreground mb-2">
                          {selectedAircraft.lastCrew.lastFlight}
                        </div>
                        <div className="space-y-1 text-sm">
                          <div className="flex items-center gap-2">
                            <User className="w-3 h-3" />
                            {selectedAircraft.lastCrew.captain}
                          </div>
                          <div className="flex items-center gap-2">
                            <User className="w-3 h-3" />
                            {selectedAircraft.lastCrew.firstOfficer}
                          </div>
                          {selectedAircraft.lastCrew.flightAttendant && (
                            <div className="flex items-center gap-2">
                              <User className="w-3 h-3" />
                              {selectedAircraft.lastCrew.flightAttendant}
                            </div>
                          )}
                        </div>
                        <Button variant="outline" size="sm" className="w-full mt-2">
                          <Users className="w-3 h-3 mr-1" />
                          Contact Previous Crew
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Card className="sticky top-20">
                  <CardContent className="p-8 text-center">
                    <Plane className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Select an aircraft to view details</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="operations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Today's Flight Operations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {dailyOperations.map((operation) => (
                  <Card key={operation.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          {operation.type === 'departure' ? (
                            <ArrowUp className="w-4 h-4 text-blue-600" />
                          ) : (
                            <ArrowDown className="w-4 h-4 text-green-600" />
                          )}
                          <div>
                            <div className="font-medium">{operation.flightNumber}</div>
                            <div className="text-sm text-muted-foreground">
                              {operation.aircraft} - {operation.type === 'departure' ? 'TO' : 'FROM'} {operation.destination || operation.origin}
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-sm">
                          <div className="flex items-center gap-2">
                            <Clock className="w-3 h-3" />
                            <span>Scheduled: {operation.time}</span>
                          </div>
                          {operation.estimatedTime && (
                            <div className="flex items-center gap-2 text-blue-600">
                              <Gauge className="w-3 h-3" />
                              <span>ETA: {operation.estimatedTime}</span>
                            </div>
                          )}
                          {operation.adsbTime && (
                            <div className="flex items-center gap-2 text-green-600">
                              <Radio className="w-3 h-3" />
                              <span>ADSB: {operation.adsbTime}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant="outline" 
                          className={getOperationStatusColor(operation.status)}
                        >
                          {operation.status.charAt(0).toUpperCase() + operation.status.slice(1)}
                        </Badge>
                        {operation.status === 'arrived' && (
                          <Button variant="outline" size="sm">
                            <Eye className="w-3 h-3 mr-1" />
                            View Crew
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cars" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Cars Currently in Hangar</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {hangarCars.map((car) => (
                  <Card key={car.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <Car className="w-6 h-6 text-blue-600" />
                        <div>
                          <div className="font-medium">{car.make} {car.model}</div>
                          <div className="text-sm text-muted-foreground">{car.color} • {car.licensePlate}</div>
                          <div className="text-sm text-muted-foreground">Owner: {car.owner}</div>
                        </div>
                      </div>
                      
                      <div className="text-right text-sm">
                        <div className="flex items-center gap-1 justify-end mb-1">
                          <MapPin className="w-3 h-3" />
                          {car.location}
                        </div>
                        <div className="text-muted-foreground">
                          Checked in: {new Date(car.checkedIn).toLocaleString()}
                        </div>
                        {car.flightAssignment && (
                          <Badge variant="outline" className="mt-1">
                            Flight: {car.flightAssignment}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="workorders" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Today's Work Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Card className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium">100-Hour Inspection</h4>
                        <Badge className="bg-orange-500 text-white">High</Badge>
                        <Badge className="bg-blue-100 text-blue-800 border-blue-200">In Progress</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        Routine 100-hour inspection including engine, avionics, and structural checks
                      </p>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Plane className="w-3 h-3" />
                          N123AB (Gulfstream G650)
                        </div>
                        <div className="flex items-center gap-2">
                          <Settings className="w-3 h-3" />
                          Hangar 1
                        </div>
                      </div>
                    </div>
                    <Button size="sm">
                      Continue Work
                    </Button>
                  </div>
                </Card>

                <Card className="p-4 border-red-200 bg-red-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium">Landing Gear Actuator Replacement</h4>
                        <Badge className="bg-red-500 text-white">Critical</Badge>
                        <Badge className="bg-orange-100 text-orange-800 border-orange-200">AOG</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        Replace main landing gear actuator - customer reported intermittent gear warnings
                      </p>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Plane className="w-3 h-3" />
                          N789EF (Gulfstream G650)
                        </div>
                        <div className="flex items-center gap-2">
                          <Settings className="w-3 h-3" />
                          Hangar 3
                        </div>
                      </div>
                      <div className="mt-2 p-2 bg-red-100 rounded">
                        <div className="flex items-center gap-2 text-sm text-red-700">
                          <AlertCircle className="w-3 h-3" />
                          Next flight scheduled in 2.1 hours - URGENT
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button size="sm" variant="destructive">
                        Priority Work
                      </Button>
                      <Button size="sm" variant="outline">
                        Parts Status
                      </Button>
                    </div>
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium">Avionics Software Update</h4>
                        <Badge className="bg-blue-500 text-white">Medium</Badge>
                        <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Scheduled</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        Update flight management system software to latest version
                      </p>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Plane className="w-3 h-3" />
                          N456CD (Gulfstream G650)
                        </div>
                        <div className="flex items-center gap-2">
                          <Settings className="w-3 h-3" />
                          Hangar 2
                        </div>
                      </div>
                    </div>
                    <Button size="sm" variant="outline">
                      Start Work
                    </Button>
                  </div>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}