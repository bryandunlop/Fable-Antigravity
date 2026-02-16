import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Alert, AlertDescription } from './ui/alert';
import { Progress } from './ui/progress';
import { Calendar, Clock, AlertTriangle, Users, CheckCircle, XCircle, Plane, User, Bell } from 'lucide-react';
import { toast } from 'sonner';

interface CrewMember {
  id: string;
  name: string;
  role: 'captain' | 'first-officer' | 'flight-attendant';
  currentDutyHours: number;
  maxDutyHours: number;
  restHours: number;
  minRestHours: number;
  medicalExpiry: string;
  trainingExpiry: string;
  checkRideExpiry: string;
  fatigueLevelStart: number;
  fatigueLevelCurrent: number;
  status: 'available' | 'on-duty' | 'rest' | 'unavailable';
  currentLocation: string;
  nextDutyStart?: string;
}

interface FlightAssignment {
  id: string;
  flightNumber: string;
  aircraft: string;
  departure: string;
  arrival: string;
  departureTime: string;
  arrivalTime: string;
  duration: number;
  captain: string;
  firstOfficer: string;
  flightAttendants: string[];
  status: 'scheduled' | 'active' | 'completed' | 'cancelled';
}

interface DutyAlert {
  id: string;
  crewId: string;
  crewName: string;
  type: 'duty-limit' | 'rest-violation' | 'currency-expiry' | 'fatigue-risk';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  expiryDate?: string;
  acknowledged: boolean;
}

export default function CrewResourceManagement() {
  const [activeTab, setActiveTab] = useState('overview');
  const [crewMembers, setCrewMembers] = useState<CrewMember[]>([]);
  const [flightAssignments, setFlightAssignments] = useState<FlightAssignment[]>([]);
  const [dutyAlerts, setDutyAlerts] = useState<DutyAlert[]>([]);
  const [selectedCrew, setSelectedCrew] = useState<CrewMember | null>(null);

  useEffect(() => {
    // Initialize with mock data
    setCrewMembers([
      {
        id: '1',
        name: 'Captain John Smith',
        role: 'captain',
        currentDutyHours: 8.5,
        maxDutyHours: 14,
        restHours: 6,
        minRestHours: 10,
        medicalExpiry: '2025-06-15',
        trainingExpiry: '2025-03-20',
        checkRideExpiry: '2025-08-10',
        fatigueLevelStart: 2,
        fatigueLevelCurrent: 4,
        status: 'on-duty',
        currentLocation: 'KATL',
        nextDutyStart: '2025-01-02T06:00:00'
      },
      {
        id: '2',
        name: 'First Officer Sarah Johnson',
        role: 'first-officer',
        currentDutyHours: 7.2,
        maxDutyHours: 14,
        restHours: 8,
        minRestHours: 10,
        medicalExpiry: '2025-04-30',
        trainingExpiry: '2025-02-15',
        checkRideExpiry: '2025-07-22',
        fatigueLevelStart: 1,
        fatigueLevelCurrent: 3,
        status: 'on-duty',
        currentLocation: 'KATL',
        nextDutyStart: '2025-01-02T06:00:00'
      },
      {
        id: '3',
        name: 'Flight Attendant Maria Rodriguez',
        role: 'flight-attendant',
        currentDutyHours: 6.8,
        maxDutyHours: 12,
        restHours: 9,
        minRestHours: 9,
        medicalExpiry: '2025-05-20',
        trainingExpiry: '2025-01-10',
        checkRideExpiry: '2025-09-05',
        fatigueLevelStart: 1,
        fatigueLevelCurrent: 2,
        status: 'available',
        currentLocation: 'KMIA',
        nextDutyStart: '2025-01-02T14:00:00'
      }
    ]);

    setFlightAssignments([
      {
        id: '1',
        flightNumber: 'GS001',
        aircraft: 'N123GS (G650)',
        departure: 'KATL',
        arrival: 'KJFK',
        departureTime: '2025-01-02T08:00:00',
        arrivalTime: '2025-01-02T10:30:00',
        duration: 2.5,
        captain: 'Captain John Smith',
        firstOfficer: 'First Officer Sarah Johnson',
        flightAttendants: ['Flight Attendant Maria Rodriguez'],
        status: 'scheduled'
      }
    ]);

    setDutyAlerts([
      {
        id: '1',
        crewId: '3',
        crewName: 'Flight Attendant Maria Rodriguez',
        type: 'currency-expiry',
        severity: 'high',
        message: 'Training currency expires in 10 days',
        expiryDate: '2025-01-10',
        acknowledged: false
      },
      {
        id: '2',
        crewId: '1',
        crewName: 'Captain John Smith',
        type: 'fatigue-risk',
        severity: 'medium',
        message: 'Fatigue level elevated - monitor for next duty period',
        acknowledged: false
      }
    ]);
  }, []);

  const getDutyProgress = (current: number, max: number) => {
    return (current / max) * 100;
  };

  const getFatigueLevel = (level: number) => {
    if (level <= 2) return { text: 'Low', color: 'bg-green-500' };
    if (level <= 4) return { text: 'Moderate', color: 'bg-yellow-500' };
    if (level <= 6) return { text: 'High', color: 'bg-orange-500' };
    return { text: 'Critical', color: 'bg-red-500' };
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'available':
        return <Badge className="bg-green-100 text-green-800">Available</Badge>;
      case 'on-duty':
        return <Badge className="bg-blue-100 text-blue-800">On Duty</Badge>;
      case 'rest':
        return <Badge className="bg-yellow-100 text-yellow-800">Rest</Badge>;
      case 'unavailable':
        return <Badge className="bg-red-100 text-red-800">Unavailable</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'low':
        return <Badge className="bg-green-100 text-green-800">Low</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-100 text-yellow-800">Medium</Badge>;
      case 'high':
        return <Badge className="bg-orange-100 text-orange-800">High</Badge>;
      case 'critical':
        return <Badge className="bg-red-100 text-red-800">Critical</Badge>;
      default:
        return <Badge>{severity}</Badge>;
    }
  };

  const acknowledgeAlert = (alertId: string) => {
    setDutyAlerts(prev => 
      prev.map(alert => 
        alert.id === alertId ? { ...alert, acknowledged: true } : alert
      )
    );
    toast.success('Alert acknowledged');
  };

  const formatDuration = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}:${m.toString().padStart(2, '0')}`;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Crew Resource Management</h1>
          <p className="text-muted-foreground">
            Manage crew duty times, compliance, and scheduling for G650 operations
          </p>
        </div>
        <Button>
          <Users className="h-4 w-4 mr-2" />
          Add Crew Member
        </Button>
      </div>

      {/* Alert Summary */}
      {dutyAlerts.filter(alert => !alert.acknowledged).length > 0 && (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {dutyAlerts.filter(alert => !alert.acknowledged).length} active duty alerts require attention
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="duty-times">Duty Times</TabsTrigger>
          <TabsTrigger value="assignments">Flight Assignments</TabsTrigger>
          <TabsTrigger value="currency">Currency Tracking</TabsTrigger>
          <TabsTrigger value="alerts">Duty Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Crew</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{crewMembers.length}</div>
                <p className="text-xs text-muted-foreground">
                  {crewMembers.filter(c => c.status === 'available').length} available
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Flights</CardTitle>
                <Plane className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {flightAssignments.filter(f => f.status === 'active').length}
                </div>
                <p className="text-xs text-muted-foreground">
                  {flightAssignments.filter(f => f.status === 'scheduled').length} scheduled
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Duty Alerts</CardTitle>
                <Bell className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {dutyAlerts.filter(a => !a.acknowledged).length}
                </div>
                <p className="text-xs text-muted-foreground">
                  {dutyAlerts.filter(a => a.severity === 'critical').length} critical
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Compliance</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">98%</div>
                <p className="text-xs text-muted-foreground">
                  All crew current
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm">Captain John Smith assigned to GS001</p>
                    <p className="text-xs text-muted-foreground">2 hours ago</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm">Training expiry alert for Maria Rodriguez</p>
                    <p className="text-xs text-muted-foreground">4 hours ago</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm">Duty period completed for Flight 102</p>
                    <p className="text-xs text-muted-foreground">6 hours ago</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="duty-times" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Current Duty Status</CardTitle>
              <CardDescription>Monitor crew duty times and FAR compliance</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Crew Member</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Current Duty</TableHead>
                    <TableHead>Rest Hours</TableHead>
                    <TableHead>Fatigue Level</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {crewMembers.map((crew) => {
                    const dutyProgress = getDutyProgress(crew.currentDutyHours, crew.maxDutyHours);
                    const fatigue = getFatigueLevel(crew.fatigueLevelCurrent);
                    
                    return (
                      <TableRow key={crew.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{crew.name}</p>
                            <p className="text-sm text-muted-foreground">{crew.currentLocation}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{crew.role}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>{formatDuration(crew.currentDutyHours)}</span>
                              <span>{formatDuration(crew.maxDutyHours)}</span>
                            </div>
                            <Progress 
                              value={dutyProgress} 
                              className={`h-2 ${dutyProgress > 80 ? 'bg-red-100' : dutyProgress > 60 ? 'bg-yellow-100' : 'bg-green-100'}`}
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <span className={crew.restHours < crew.minRestHours ? 'text-red-600' : 'text-green-600'}>
                              {formatDuration(crew.restHours)}
                            </span>
                            <span className="text-muted-foreground"> / {formatDuration(crew.minRestHours)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <div className={`w-3 h-3 rounded-full ${fatigue.color}`}></div>
                            <span className="text-sm">{fatigue.text}</span>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(crew.status)}</TableCell>
                        <TableCell>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm" onClick={() => setSelectedCrew(crew)}>
                                View Details
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>{crew.name} - Duty Details</DialogTitle>
                              </DialogHeader>
                              {selectedCrew && (
                                <div className="space-y-4">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <Label>Current Duty Hours</Label>
                                      <p className="text-lg font-semibold">{formatDuration(selectedCrew.currentDutyHours)}</p>
                                    </div>
                                    <div>
                                      <Label>Maximum Duty Hours</Label>
                                      <p className="text-lg">{formatDuration(selectedCrew.maxDutyHours)}</p>
                                    </div>
                                    <div>
                                      <Label>Rest Hours</Label>
                                      <p className="text-lg">{formatDuration(selectedCrew.restHours)}</p>
                                    </div>
                                    <div>
                                      <Label>Minimum Rest Required</Label>
                                      <p className="text-lg">{formatDuration(selectedCrew.minRestHours)}</p>
                                    </div>
                                  </div>
                                  
                                  <div>
                                    <Label>Fatigue Progression</Label>
                                    <div className="mt-2 space-y-2">
                                      <div className="flex justify-between text-sm">
                                        <span>Start of Duty: {selectedCrew.fatigueLevelStart}/10</span>
                                        <span>Current: {selectedCrew.fatigueLevelCurrent}/10</span>
                                      </div>
                                      <Progress value={selectedCrew.fatigueLevelCurrent * 10} className="h-2" />
                                    </div>
                                  </div>

                                  <div>
                                    <Label>Next Duty Start</Label>
                                    <p className="text-lg">{selectedCrew.nextDutyStart ? new Date(selectedCrew.nextDutyStart).toLocaleString() : 'Not scheduled'}</p>
                                  </div>
                                </div>
                              )}
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assignments" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Flight Assignments</CardTitle>
              <CardDescription>Current and upcoming crew assignments</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Flight</TableHead>
                    <TableHead>Aircraft</TableHead>
                    <TableHead>Route</TableHead>
                    <TableHead>Departure</TableHead>
                    <TableHead>Captain</TableHead>
                    <TableHead>First Officer</TableHead>
                    <TableHead>Flight Attendants</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {flightAssignments.map((flight) => (
                    <TableRow key={flight.id}>
                      <TableCell className="font-medium">{flight.flightNumber}</TableCell>
                      <TableCell>{flight.aircraft}</TableCell>
                      <TableCell>{flight.departure} → {flight.arrival}</TableCell>
                      <TableCell>
                        {new Date(flight.departureTime).toLocaleString()}
                      </TableCell>
                      <TableCell>{flight.captain}</TableCell>
                      <TableCell>{flight.firstOfficer}</TableCell>
                      <TableCell>
                        {flight.flightAttendants.map((fa, index) => (
                          <div key={index} className="text-sm">{fa}</div>
                        ))}
                      </TableCell>
                      <TableCell>
                        <Badge variant={flight.status === 'active' ? 'default' : 'secondary'}>
                          {flight.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="currency" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Currency Tracking</CardTitle>
              <CardDescription>Monitor crew medical, training, and check ride currency</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Crew Member</TableHead>
                    <TableHead>Medical Certificate</TableHead>
                    <TableHead>Training Currency</TableHead>
                    <TableHead>Check Ride</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {crewMembers.map((crew) => {
                    const medicalDays = Math.ceil((new Date(crew.medicalExpiry).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
                    const trainingDays = Math.ceil((new Date(crew.trainingExpiry).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
                    const checkRideDays = Math.ceil((new Date(crew.checkRideExpiry).getTime() - new Date().getTime()) / (1000 * 3600 * 24));

                    const getExpiryBadge = (days: number) => {
                      if (days < 0) return <Badge className="bg-red-100 text-red-800">Expired</Badge>;
                      if (days <= 30) return <Badge className="bg-orange-100 text-orange-800">Expires Soon</Badge>;
                      return <Badge className="bg-green-100 text-green-800">Current</Badge>;
                    };

                    return (
                      <TableRow key={crew.id}>
                        <TableCell className="font-medium">{crew.name}</TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm">{crew.medicalExpiry}</p>
                            {getExpiryBadge(medicalDays)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm">{crew.trainingExpiry}</p>
                            {getExpiryBadge(trainingDays)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm">{crew.checkRideExpiry}</p>
                            {getExpiryBadge(checkRideDays)}
                          </div>
                        </TableCell>
                        <TableCell>
                          {medicalDays > 30 && trainingDays > 30 && checkRideDays > 30 ? (
                            <Badge className="bg-green-100 text-green-800">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Current
                            </Badge>
                          ) : (
                            <Badge className="bg-orange-100 text-orange-800">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Action Required
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Duty Alerts</CardTitle>
              <CardDescription>Critical alerts requiring immediate attention</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {dutyAlerts.map((alert) => (
                  <div 
                    key={alert.id} 
                    className={`p-4 border rounded-lg ${
                      alert.acknowledged ? 'bg-gray-50 border-gray-200' : 'bg-white border-orange-200'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <AlertTriangle className={`h-4 w-4 ${
                            alert.severity === 'critical' ? 'text-red-500' : 
                            alert.severity === 'high' ? 'text-orange-500' : 
                            'text-yellow-500'
                          }`} />
                          <span className="font-medium">{alert.crewName}</span>
                          {getSeverityBadge(alert.severity)}
                        </div>
                        <p className="text-sm text-gray-700 mb-2">{alert.message}</p>
                        {alert.expiryDate && (
                          <p className="text-xs text-muted-foreground">
                            Expires: {new Date(alert.expiryDate).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        {!alert.acknowledged && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => acknowledgeAlert(alert.id)}
                          >
                            Acknowledge
                          </Button>
                        )}
                        {alert.acknowledged && (
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Acknowledged
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}