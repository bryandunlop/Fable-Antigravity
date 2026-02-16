import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Alert, AlertDescription } from './ui/alert';
import {
  Fuel,
  Plane,
  Calendar,
  Clock,
  MapPin,
  Send,
  CheckCircle,
  AlertTriangle,
  Info,
  Plus,
  Edit,
  Trash2
} from 'lucide-react';

interface Flight {
  id: string;
  date: string;
  time: string;
  departure: string;
  arrival: string;
  aircraft: string;
  tailNumber: string;
  flightNumber: string;
  estimatedFlightTime: string;
  pax: number;
}

interface FuelLoadRequest {
  id: string;
  flightId: string;
  flightInfo: Flight;
  fuelRequested: number; // in thousands of pounds
  priority: 'normal' | 'urgent' | 'critical';
  requestedBy: string;
  requestDate: string;
  requestTime: string;
  notes: string;
  status: 'pending' | 'acknowledged' | 'in-progress' | 'completed' | 'cancelled';
  acknowledgedBy?: string;
  acknowledgedDate?: string;
  completedBy?: string;
  completedDate?: string;
  actualFuelLoaded?: number;
  maintenanceNotes?: string;
}

export default function FuelLoadRequest() {
  const [activeTab, setActiveTab] = useState('request');
  const [selectedFlight, setSelectedFlight] = useState<Flight | null>(null);
  const [fuelAmount, setFuelAmount] = useState('');
  const [priority, setPriority] = useState('normal');
  const [notes, setNotes] = useState('');

  // Mock upcoming flights data
  const upcomingFlights: Flight[] = [
    {
      id: 'FL001',
      date: '2024-01-20',
      time: '08:00',
      departure: 'KTEB',
      arrival: 'KPBI',
      aircraft: 'Gulfstream G650',
      tailNumber: 'N1PG',
      flightNumber: 'FLT001',
      estimatedFlightTime: '2h 15m',
      pax: 8
    },
    {
      id: 'FL002',
      date: '2024-01-20',
      time: '14:30',
      departure: 'KPBI',
      arrival: 'KIAH',
      aircraft: 'Gulfstream G650',
      tailNumber: 'N2PG',
      flightNumber: 'FLT002',
      estimatedFlightTime: '2h 45m',
      pax: 12
    },
    {
      id: 'FL003',
      date: '2024-01-21',
      time: '09:15',
      departure: 'KIAH',
      arrival: 'KBOS',
      aircraft: 'Gulfstream G500',
      tailNumber: 'N5PG',
      flightNumber: 'FLT003',
      estimatedFlightTime: '3h 20m',
      pax: 6
    },
    {
      id: 'FL004',
      date: '2024-01-22',
      time: '16:00',
      departure: 'KBOS',
      arrival: 'KTEB',
      aircraft: 'Gulfstream G500',
      tailNumber: 'N6PG',
      flightNumber: 'FLT004',
      estimatedFlightTime: '1h 45m',
      pax: 10
    }
  ];

  // Mock fuel load requests
  const fuelLoadRequests: FuelLoadRequest[] = [
    {
      id: 'FLR001',
      flightId: 'FL001',
      flightInfo: upcomingFlights[0],
      fuelRequested: 4.2, // thousands of pounds
      priority: 'normal',
      requestedBy: 'Captain Rodriguez',
      requestDate: '2024-01-19',
      requestTime: '15:30',
      notes: 'Standard fuel load for route. Weather looks good.',
      status: 'acknowledged',
      acknowledgedBy: 'Maintenance Team Alpha',
      acknowledgedDate: '2024-01-19'
    },
    {
      id: 'FLR002',
      flightId: 'FL002',
      flightInfo: upcomingFlights[1],
      fuelRequested: 8.5, // thousands of pounds
      priority: 'urgent',
      requestedBy: 'Captain Smith',
      requestDate: '2024-01-19',
      requestTime: '18:45',
      notes: 'Need extra fuel due to possible headwinds and weather delays.',
      status: 'in-progress',
      acknowledgedBy: 'Maintenance Team Beta',
      acknowledgedDate: '2024-01-19'
    },
    {
      id: 'FLR003',
      flightId: 'FL003',
      flightInfo: upcomingFlights[2],
      fuelRequested: 6.8, // thousands of pounds
      priority: 'critical',
      requestedBy: 'Captain Johnson',
      requestDate: '2024-01-20',
      requestTime: '09:00',
      notes: 'Last minute passenger change - need full fuel load for extended range.',
      status: 'pending',
    }
  ];

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return dateString;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'destructive';
      case 'urgent': return 'default';
      case 'normal': return 'secondary';
      default: return 'secondary';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600';
      case 'in-progress': return 'text-blue-600';
      case 'acknowledged': return 'text-yellow-600';
      case 'pending': return 'text-orange-600';
      case 'cancelled': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'in-progress': return <Clock className="w-4 h-4" />;
      case 'acknowledged': return <Info className="w-4 h-4" />;
      case 'pending': return <AlertTriangle className="w-4 h-4" />;
      case 'cancelled': return <Trash2 className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const handleSubmit = () => {
    if (!selectedFlight || !fuelAmount) {
      return;
    }

    // Here you would submit the fuel request
    console.log({
      flightId: selectedFlight.id,
      fuelRequested: parseFloat(fuelAmount),
      priority,
      notes
    });

    // Reset form
    setSelectedFlight(null);
    setFuelAmount('');
    setPriority('normal');
    setNotes('');
    setActiveTab('upcoming');
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="flex items-center gap-2">
          <Fuel className="w-6 h-6" />
          Fuel Load Requests
        </h1>
        <p className="text-muted-foreground">Submit and track fuel load requests for upcoming flights</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="request">New Request</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming Flights</TabsTrigger>
          <TabsTrigger value="history">My Requests</TabsTrigger>
        </TabsList>

        {/* New Request Tab */}
        <TabsContent value="request" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Submit New Fuel Load Request
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Select a flight and specify fuel requirements
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Flight Selection */}
              <div>
                <Label>Select Flight</Label>
                <Select onValueChange={(value: string) => {
                  const flight = upcomingFlights.find(f => f.id === value);
                  setSelectedFlight(flight || null);
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose from your upcoming flights" />
                  </SelectTrigger>
                  <SelectContent>
                    {upcomingFlights.map((flight) => (
                      <SelectItem key={flight.id} value={flight.id}>
                        {flight.flightNumber} - {flight.departure} → {flight.arrival} - {formatDate(flight.date)} {flight.time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedFlight && (
                <Card className="p-4 bg-muted/50">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-sm">Aircraft</Label>
                      <p className="text-sm font-medium">{selectedFlight.aircraft}</p>
                      <p className="text-xs text-muted-foreground">{selectedFlight.tailNumber}</p>
                    </div>
                    <div>
                      <Label className="text-sm">Route</Label>
                      <p className="text-sm font-medium">{selectedFlight.departure} → {selectedFlight.arrival}</p>
                      <p className="text-xs text-muted-foreground">Est. {selectedFlight.estimatedFlightTime}</p>
                    </div>
                    <div>
                      <Label className="text-sm">Passengers</Label>
                      <p className="text-sm font-medium">{selectedFlight.pax} PAX</p>
                      <p className="text-xs text-muted-foreground">{formatDate(selectedFlight.date)} at {selectedFlight.time}</p>
                    </div>
                  </div>
                </Card>
              )}

              {selectedFlight && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label>Fuel Amount (thousands of pounds)</Label>
                      <Input
                        type="number"
                        placeholder="e.g., 4.2"
                        step="0.1"
                        value={fuelAmount}
                        onChange={(e) => setFuelAmount(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Enter fuel amount in thousands of pounds (e.g., 4.2 = 4,200 lbs)
                      </p>
                    </div>
                    <div>
                      <Label>Priority</Label>
                      <Select value={priority} onValueChange={setPriority}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                          <SelectItem value="critical">Critical</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label>Additional Notes</Label>
                    <Textarea
                      placeholder="Any additional information for maintenance team..."
                      rows={4}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      className="flex-1"
                      onClick={handleSubmit}
                      disabled={!fuelAmount}
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Submit Fuel Request
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedFlight(null);
                        setFuelAmount('');
                        setPriority('normal');
                        setNotes('');
                      }}
                    >
                      Clear
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Upcoming Flights Tab */}
        <TabsContent value="upcoming" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Your Upcoming Flights
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                View upcoming flights and submit fuel requests
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {upcomingFlights.map((flight) => {
                  const hasRequest = fuelLoadRequests.some(req => req.flightId === flight.id);
                  const request = fuelLoadRequests.find(req => req.flightId === flight.id);

                  return (
                    <Card key={flight.id} className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{flight.flightNumber}</Badge>
                            <span className="font-medium">
                              {flight.departure} → {flight.arrival}
                            </span>
                            {hasRequest && (
                              <Badge variant={getPriorityColor(request?.priority || 'normal')}>
                                Fuel Requested
                              </Badge>
                            )}
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <Label className="text-xs">Aircraft</Label>
                              <p>{flight.aircraft}</p>
                              <p className="text-muted-foreground">{flight.tailNumber}</p>
                            </div>
                            <div>
                              <Label className="text-xs">Date & Time</Label>
                              <p>{formatDate(flight.date)}</p>
                              <p className="text-muted-foreground">{flight.time}</p>
                            </div>
                            <div>
                              <Label className="text-xs">Flight Time</Label>
                              <p>{flight.estimatedFlightTime}</p>
                              <p className="text-muted-foreground">{flight.pax} passengers</p>
                            </div>
                            <div>
                              <Label className="text-xs">Status</Label>
                              {request && (
                                <div className={`flex items-center gap-1 ${getStatusColor(request.status)}`}>
                                  {getStatusIcon(request.status)}
                                  <span className="capitalize">{request.status}</span>
                                </div>
                              )}
                              {!request && <p className="text-muted-foreground">No fuel request</p>}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {!hasRequest ? (
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedFlight(flight);
                                setActiveTab('request');
                              }}
                            >
                              <Fuel className="w-4 h-4 mr-1" />
                              Request Fuel
                            </Button>
                          ) : (
                            <Button variant="outline" size="sm">
                              <Edit className="w-4 h-4 mr-1" />
                              Edit Request
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Request History Tab */}
        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Fuel Request History
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Track status of your submitted fuel requests
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {fuelLoadRequests.map((request) => (
                  <Card key={request.id} className="p-4">
                    <div className="space-y-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline">{request.flightInfo.flightNumber}</Badge>
                            <span className="font-medium">
                              {request.flightInfo.departure} → {request.flightInfo.arrival}
                            </span>
                            <Badge variant={getPriorityColor(request.priority)}>
                              {request.priority}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <Label className="text-xs">Fuel Requested</Label>
                              <p>{request.fuelRequested}k lbs</p>
                              <p className="text-muted-foreground">({(request.fuelRequested * 1000).toLocaleString()} lbs)</p>
                            </div>
                            <div>
                              <Label className="text-xs">Flight Date</Label>
                              <p>{formatDate(request.flightInfo.date)}</p>
                              <p className="text-muted-foreground">{request.flightInfo.time}</p>
                            </div>
                            <div>
                              <Label className="text-xs">Requested</Label>
                              <p>{formatDate(request.requestDate)}</p>
                              <p className="text-muted-foreground">{request.requestTime}</p>
                            </div>
                            <div>
                              <Label className="text-xs">Status</Label>
                              <div className={`flex items-center gap-1 ${getStatusColor(request.status)}`}>
                                {getStatusIcon(request.status)}
                                <span className="capitalize">{request.status}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {request.notes && (
                        <div>
                          <Label className="text-xs">Notes</Label>
                          <p className="text-sm text-muted-foreground">{request.notes}</p>
                        </div>
                      )}

                      {request.acknowledgedBy && (
                        <Alert>
                          <Info className="h-4 w-4" />
                          <AlertDescription>
                            Acknowledged by {request.acknowledgedBy} on {formatDate(request.acknowledgedDate || '')}
                          </AlertDescription>
                        </Alert>
                      )}

                      {request.status === 'completed' && request.actualFuelLoaded && (
                        <Alert>
                          <CheckCircle className="h-4 w-4" />
                          <AlertDescription>
                            Completed: {request.actualFuelLoaded}k lbs loaded by {request.completedBy} on {formatDate(request.completedDate || '')}
                          </AlertDescription>
                        </Alert>
                      )}

                      {request.maintenanceNotes && (
                        <div className="p-3 bg-muted rounded">
                          <Label className="text-xs">Maintenance Notes</Label>
                          <p className="text-sm">{request.maintenanceNotes}</p>
                        </div>
                      )}
                    </div>
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