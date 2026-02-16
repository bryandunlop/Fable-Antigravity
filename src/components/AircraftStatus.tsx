import React, { useMemo } from 'react';
import FleetStatusWidget from './FleetStatusWidget';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Link } from 'react-router-dom';
import { useSatcomDirect } from './hooks/useSatcomDirect';
import {
  Plane,
  Wrench,
  Sparkles,
  FileText,
  Settings,
  Loader2,
  AlertTriangle
} from 'lucide-react';

export default function AircraftStatus() {
  const { aircraftPositions, aircraftStatuses, loading, isRefreshing, error } = useSatcomDirect();

  // Filter flights by status (currently showing all)
  const [filter, setFilter] = React.useState('all');

  // Transform API data to display format
  const aircraftData = useMemo(() => {
    return aircraftPositions.map((position) => {
      const status = aircraftStatuses.find(s => s.tailNumber === position.tailNumber);

      return {
        id: position.tailNumber,
        type: 'Gulfstream G650', // Could be extended in API
        status: position.flightPhase === 'Parked' ? 'Ground' :
          position.flightPhase === 'Cruise' || position.flightPhase === 'Climb' || position.flightPhase === 'Descent' ? 'In Flight' :
            status?.satcomStatus === 'Maintenance' ? 'Maintenance' : 'Available',
        location: position.flightPhase === 'Parked'
          ? `${position.departureAirport || 'Unknown'} Ramp`
          : position.departureAirport && position.arrivalAirport
            ? `En Route ${position.departureAirport}-${position.arrivalAirport}`
            : 'In Flight',
        altitude: `${position.altitude.toLocaleString()} ft`,
        speed: `${position.groundSpeed} kts`,
        eta: position.estimatedArrival
          ? new Date(position.estimatedArrival).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : 'N/A',
        fuel: position.fuelRemaining ? `${Math.round((position.fuelRemaining / 25000) * 100)}%` : 'N/A',
        passengers: '0/180', // Would come from separate system
        crew: '6',
        issues: status?.alerts.filter(a => !a.acknowledged) || [],
        nextMaintenance: '2025-02-15', // Would come from maintenance system
        flightNumber: position.callSign || null
      };
    });
  }, [aircraftPositions, aircraftStatuses]);

  const filteredAircraft = aircraftData;  // Can add filtering logic later

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'in flight': return 'bg-green-100 text-green-800 border-green-200';
      case 'ground': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'maintenance': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'available': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'in flight': return <Plane className="w-4 h-4" />;
      case 'ground': return <Plane className="w-4 h-4" />;
      case 'maintenance': return <Settings className="w-4 h-4" />;
      case 'available': return <Plane className="w-4 h-4" />;
      default: return <Plane className="w-4 h-4" />;
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="p-4 max-w-7xl mx-auto space-y-6">
        <Card>
          <CardContent className="p-8 flex items-center justify-center">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading aircraft status...
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-4 max-w-7xl mx-auto space-y-6">
        <Card className="border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm">Unable to load aircraft data: {error}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="flex items-center gap-3">
            <Plane className="w-8 h-8 text-blue-600" />
            Aircraft Status
            {isRefreshing && <Loader2 className="w-5 h-5 animate-spin text-muted-foreground ml-2" />}
          </h1>
          <p className="text-muted-foreground mt-2">
            Comprehensive fleet monitoring with flight, service, and cleaning status
          </p>
        </div>
      </div>

      {/* Main Fleet Status Widget */}
      <FleetStatusWidget compact={false} showDetailsLink={false} />

      {/* Quick Access Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="w-5 h-5 text-purple-600" />
              Cleaning Management
            </CardTitle>
            <CardDescription>Track and manage aircraft cleaning status</CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/aircraft-cleaning">
              <Button className="w-full">
                Go to Cleaning Tracker
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Wrench className="w-5 h-5 text-blue-600" />
              Maintenance Hub
            </CardTitle>
            <CardDescription>View work orders and maintenance status</CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/maintenance-hub">
              <Button className="w-full">
                Go to Maintenance
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="w-5 h-5 text-green-600" />
              Tech Log
            </CardTitle>
            <CardDescription>Report squawks and discrepancies</CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/tech-log">
              <Button className="w-full">
                Go to Tech Log
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}