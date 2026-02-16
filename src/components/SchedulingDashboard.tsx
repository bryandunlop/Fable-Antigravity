import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import FleetStatusWidget from './FleetStatusWidget';
import NASImpactWidget from './NASImpactWidget';
import FlightImpactAlerts from './FlightImpactAlerts';

import {
  Calendar,
  Users,
  FileText,
  AlertTriangle,
  CheckCircle,
  Clock,
  Plane,
  UserCheck,
  AlertCircle,
  Shield,
  TrendingUp,
  CloudRain
} from 'lucide-react';

export default function SchedulingDashboard() {
  const [activeTab, setActiveTab] = useState('overview');

  // Mock data for demonstration - only flights in next 24 hours
  const upcomingFlights = [
    {
      id: 'FL001',
      date: '2024-01-20',
      time: '08:00',
      aircraft: 'N123AB',
      route: 'KTEB → KPBI',
      pilots: ['John Smith', 'Sarah Davis'],
      status: 'confirmed'
    },
    {
      id: 'FL002',
      date: '2024-01-20',
      time: '14:30',
      aircraft: 'N456CD',
      route: 'KPBI → KIAH',
      pilots: ['Mike Johnson', 'Lisa Wilson'],
      status: 'confirmed'
    },
    {
      id: 'FL003',
      date: '2024-01-20',
      time: '19:45',
      aircraft: 'N789EF',
      route: 'KIAH → KTEB',
      pilots: ['Robert Brown', 'Jennifer White'],
      status: 'pending'
    }
  ];

  const pilotCurrencyAlerts = [
    {
      pilot: 'John Smith',
      type: 'Night Currency',
      expires: '2024-01-25',
      severity: 'high'
    },
    {
      pilot: 'Sarah Davis',
      type: 'Instrument Approach',
      expires: '2024-01-30',
      severity: 'medium'
    }
  ];

  const pendingPassengerForms = [
    {
      id: 'PF001',
      passenger: 'Robert Johnson',
      flight: 'FL001',
      type: 'Pre-Flight Information',
      sent: '2024-01-18',
      status: 'pending'
    },
    {
      id: 'PF002',
      passenger: 'Maria Garcia',
      flight: 'FL002',
      type: 'Dietary Requirements',
      sent: '2024-01-17',
      status: 'completed'
    }
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="flex items-center gap-2">
          <Calendar className="w-6 h-6" />
          Scheduling Dashboard
        </h1>
        <p className="text-muted-foreground">Flight operations scheduling and crew management</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="currency">Pilot Currency</TabsTrigger>
          <TabsTrigger value="forms">Passenger Forms</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Fleet Status Widget */}
          <FleetStatusWidget compact={true} showDetailsLink={true} />

          {/* NAS Impact Alerts - Prominently displayed */}
          <NASImpactWidget compact={false} maxFlights={5} />

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Next 24 Hours</CardTitle>
                <Plane className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">3</div>
                <p className="text-xs text-muted-foreground">
                  Flights scheduled
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Currency Alerts</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">3</div>
                <p className="text-xs text-muted-foreground">
                  Require attention
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Forms</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">5</div>
                <p className="text-xs text-muted-foreground">
                  Awaiting response
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Crews</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">8</div>
                <p className="text-xs text-muted-foreground">
                  Currently available
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <Button variant="outline" className="h-20 flex flex-col gap-2">
                  <FileText className="w-6 h-6" />
                  Send Forms
                </Button>
                <Button variant="outline" className="h-20 flex flex-col gap-2">
                  <UserCheck className="w-6 h-6" />
                  Check Currency
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Next 24 Hours Flights */}
          <Card>
            <CardHeader>
              <CardTitle>Next 24 Hours</CardTitle>
              <p className="text-sm text-muted-foreground">Flights scheduled for today and tomorrow</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {upcomingFlights.map((flight) => (
                  <div key={flight.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{flight.id}</Badge>
                        <span className="font-medium">{flight.route}</span>
                        <Badge variant={flight.status === 'confirmed' ? 'default' : 'secondary'}>
                          {flight.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {flight.time} • {flight.aircraft} • Pilots: {flight.pilots.join(', ')}
                      </p>
                    </div>
                    <Button variant="outline" size="sm">View Details</Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Flight Impact Alerts - Weather & NAS */}
          <FlightImpactAlerts />

          {/* Currency Alerts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Currency Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pilotCurrencyAlerts.map((alert, index) => (
                  <Alert key={index} className={alert.severity === 'high' ? 'border-red-200 bg-red-50' : 'border-yellow-200 bg-yellow-50'}>
                    <AlertCircle className={`h-4 w-4 ${alert.severity === 'high' ? 'text-red-600' : 'text-yellow-600'}`} />
                    <AlertDescription className={alert.severity === 'high' ? 'text-red-800' : 'text-yellow-800'}>
                      <strong>{alert.pilot}</strong> - {alert.type} expires on {alert.expires}
                    </AlertDescription>
                  </Alert>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>



        {/* Pilot Currency Tab */}
        <TabsContent value="currency" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="w-5 h-5" />
                Pilot Currency Tracking
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <TrendingUp className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">
                  Pilot Currency Dashboard component will be loaded here
                </p>
                <Button asChild>
                  <Link to="/pilot-currency">View Currency Dashboard</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Passenger Forms Tab */}
        <TabsContent value="forms" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Passenger Forms Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-medium">Pending Forms</h3>
                  <Button>Send New Form</Button>
                </div>

                <div className="space-y-3">
                  {pendingPassengerForms.map((form) => (
                    <div key={form.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{form.id}</Badge>
                          <span className="font-medium">{form.passenger}</span>
                          <Badge variant={form.status === 'completed' ? 'default' : 'secondary'}>
                            {form.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {form.type} • Flight {form.flight} • Sent {form.sent}
                        </p>
                      </div>
                      <Button variant="outline" size="sm">
                        {form.status === 'completed' ? 'View Response' : 'Resend'}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}