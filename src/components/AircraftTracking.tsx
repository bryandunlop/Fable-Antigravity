import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Alert, AlertDescription } from './ui/alert';
import { useSatcomDirect } from './hooks/useSatcomDirect';
import InteractiveFleetMap from './InteractiveFleetMap';
import { 
  Plane, 
  MapPin, 
  Gauge, 
  Navigation, 
  Clock, 
  Fuel, 
  AlertTriangle, 
  CheckCircle,
  RefreshCw,
  Loader2,
  Zap,
  Wifi,
  WifiOff,
  TrendingUp,
  TrendingDown,
  Minus,
  Radio,
  Settings,
  Activity,
  Eye,
  Bell,
  ExternalLink,
  Map,
  Compass,
  Timer,
  Thermometer
} from 'lucide-react';

export default function AircraftTracking() {
  const { 
    aircraftPositions, 
    aircraftStatuses, 
    fleetSummary, 
    loading, 
    error, 
    lastUpdate,
    refetch,
    acknowledgeAlert,
    getActiveFlights,
    getSystemAlerts
  } = useSatcomDirect();

  const [selectedAircraft, setSelectedAircraft] = useState<string | null>(null);

  const getFlightPhaseColor = (phase: string) => {
    switch (phase) {
      case 'Cruise': return 'bg-green-100 text-green-800';
      case 'Climb': case 'Takeoff': return 'bg-blue-100 text-blue-800';
      case 'Descent': case 'Approach': case 'Landing': return 'bg-orange-100 text-orange-800';
      case 'Parked': return 'bg-gray-100 text-gray-800';
      case 'Taxiing': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSatcomStatusColor = (status: string) => {
    switch (status) {
      case 'Connected': return 'bg-green-100 text-green-800';
      case 'Limited': return 'bg-yellow-100 text-yellow-800';
      case 'Disconnected': return 'bg-red-100 text-red-800';
      case 'Maintenance': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSystemHealthColor = (health: string) => {
    switch (health) {
      case 'Normal': return 'text-green-600';
      case 'Caution': return 'text-yellow-600';
      case 'Warning': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Emergency': return 'bg-red-100 text-red-800 border-red-300';
      case 'Warning': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'Caution': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'Info': return 'bg-blue-100 text-blue-800 border-blue-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const formatCoordinate = (coord: number, isLongitude = false) => {
    const direction = isLongitude ? (coord >= 0 ? 'E' : 'W') : (coord >= 0 ? 'N' : 'S');
    const absolute = Math.abs(coord);
    const degrees = Math.floor(absolute);
    const minutes = ((absolute - degrees) * 60).toFixed(3);
    return `${degrees}°${minutes}'${direction}`;
  };

  const formatAltitude = (altitude: number) => {
    return altitude.toLocaleString() + ' ft';
  };

  const formatSpeed = (speed: number) => {
    return speed + ' kts';
  };

  const formatFuel = (fuel: number) => {
    return fuel.toLocaleString() + ' lbs';
  };

  const getTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  if (loading && aircraftPositions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-blue-500" />
            Aircraft Tracking
          </CardTitle>
          <CardDescription>Real-time Satcom Direct data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Connecting to Satcom Direct...
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert className="border-red-200 bg-red-50">
        <AlertTriangle className="w-4 h-4 text-red-500" />
        <AlertDescription className="text-red-800">
          Failed to connect to Satcom Direct: {error}
          <Button variant="link" className="p-0 h-auto text-red-800 ml-2" onClick={refetch}>
            Retry Connection
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  const activeFlights = getActiveFlights();
  const systemAlerts = getSystemAlerts();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Radio className="w-5 h-5 text-blue-500" />
              Aircraft Tracking
              <Badge className="bg-blue-100 text-blue-800">
                Satcom Direct
              </Badge>
            </CardTitle>
            <CardDescription>Real-time aircraft positions and status</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              Last update: {lastUpdate.toLocaleTimeString()}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={refetch}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Fleet Summary */}
        {fleetSummary && (
          <div className="grid grid-cols-3 lg:grid-cols-6 gap-4 mt-4">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Plane className="w-4 h-4 text-blue-500" />
                <span className="text-2xl font-bold text-blue-600">{fleetSummary.activeFlights}</span>
              </div>
              <p className="text-xs text-blue-700">Active Flights</p>
            </div>
            
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Wifi className="w-4 h-4 text-green-500" />
                <span className="text-2xl font-bold text-green-600">{fleetSummary.onlineAircraft}</span>
              </div>
              <p className="text-xs text-green-700">Online</p>
            </div>
            
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-center gap-1 mb-1">
                <MapPin className="w-4 h-4 text-gray-500" />
                <span className="text-2xl font-bold text-gray-600">{fleetSummary.parkedAircraft}</span>
              </div>
              <p className="text-xs text-gray-700">Parked</p>
            </div>
            
            <div className="text-center p-3 bg-orange-50 rounded-lg">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Settings className="w-4 h-4 text-orange-500" />
                <span className="text-2xl font-bold text-orange-600">{fleetSummary.maintenanceAircraft}</span>
              </div>
              <p className="text-xs text-orange-700">Maintenance</p>
            </div>
            
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <div className="flex items-center justify-center gap-1 mb-1">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <span className="text-2xl font-bold text-red-600">{fleetSummary.systemAlerts}</span>
              </div>
              <p className="text-xs text-red-700">Alerts</p>
            </div>
            
            <div className="text-center p-3 bg-yellow-50 rounded-lg">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Fuel className="w-4 h-4 text-yellow-500" />
                <span className="text-2xl font-bold text-yellow-600">{fleetSummary.avgFuelLevel}%</span>
              </div>
              <p className="text-xs text-yellow-700">Avg Fuel</p>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="map" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="map" className="text-xs">
              Fleet Map
            </TabsTrigger>
            <TabsTrigger value="positions" className="text-xs">
              Positions ({aircraftPositions.length})
            </TabsTrigger>
            <TabsTrigger value="status" className="text-xs">
              System Status
            </TabsTrigger>
            <TabsTrigger value="alerts" className="text-xs">
              Alerts ({systemAlerts.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="map" className="space-y-3">
            <InteractiveFleetMap />
          </TabsContent>

          <TabsContent value="positions" className="space-y-3">
            <ScrollArea className="h-96">
              <div className="space-y-3">
                {aircraftPositions.map((aircraft) => {
                  const status = aircraftStatuses.find(s => s.tailNumber === aircraft.tailNumber);
                  
                  return (
                    <div key={aircraft.tailNumber} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <Plane className="w-5 h-5 text-blue-500" />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{aircraft.tailNumber}</span>
                              {aircraft.callSign && (
                                <Badge variant="outline" className="text-xs">
                                  {aircraft.callSign}
                                </Badge>
                              )}
                              <Badge className={getFlightPhaseColor(aircraft.flightPhase)}>
                                {aircraft.flightPhase}
                              </Badge>
                            </div>
                            {aircraft.departureAirport && aircraft.arrivalAirport && (
                              <p className="text-sm text-muted-foreground">
                                {aircraft.departureAirport} → {aircraft.arrivalAirport}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {status?.isOnline ? (
                            <Badge className="bg-green-100 text-green-800">
                              <Wifi className="w-3 h-3 mr-1" />
                              Online
                            </Badge>
                          ) : (
                            <Badge className="bg-red-100 text-red-800">
                              <WifiOff className="w-3 h-3 mr-1" />
                              Offline
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium">Position</p>
                            <p className="text-muted-foreground">
                              {formatCoordinate(aircraft.latitude)}<br/>
                              {formatCoordinate(aircraft.longitude, true)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Gauge className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium">Altitude / Speed</p>
                            <p className="text-muted-foreground">
                              {formatAltitude(aircraft.altitude)}<br/>
                              {formatSpeed(aircraft.groundSpeed)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Navigation className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium">Heading / V/S</p>
                            <p className="text-muted-foreground">
                              {aircraft.heading}°<br/>
                              {aircraft.verticalSpeed > 0 ? '+' : ''}{aircraft.verticalSpeed} fpm
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Fuel className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium">Fuel / Time</p>
                            <p className="text-muted-foreground">
                              {aircraft.fuelRemaining ? formatFuel(aircraft.fuelRemaining) : 'N/A'}<br/>
                              {aircraft.flightTime ? `${aircraft.flightTime} min` : 'N/A'}
                            </p>
                          </div>
                        </div>
                      </div>

                      {aircraft.estimatedArrival && (
                        <div className="mt-3 pt-3 border-t">
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            <span>ETA: {new Date(aircraft.estimatedArrival).toLocaleTimeString()}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="status" className="space-y-3">
            <ScrollArea className="h-96">
              <div className="space-y-3">
                {aircraftStatuses.map((status) => (
                  <div key={status.tailNumber} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Radio className="w-5 h-5 text-blue-500" />
                        <div>
                          <span className="font-medium">{status.tailNumber}</span>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className={getSatcomStatusColor(status.satcomStatus)}>
                              {status.satcomStatus}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              Last contact: {getTimeAgo(status.lastContact)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="font-medium mb-1">Engine</p>
                        <div className="flex items-center gap-1">
                          <Activity className={`w-3 h-3 ${getSystemHealthColor(status.systemHealth.engine)}`} />
                          <span className={getSystemHealthColor(status.systemHealth.engine)}>
                            {status.systemHealth.engine}
                          </span>
                        </div>
                      </div>

                      <div>
                        <p className="font-medium mb-1">Hydraulics</p>
                        <div className="flex items-center gap-1">
                          <Activity className={`w-3 h-3 ${getSystemHealthColor(status.systemHealth.hydraulics)}`} />
                          <span className={getSystemHealthColor(status.systemHealth.hydraulics)}>
                            {status.systemHealth.hydraulics}
                          </span>
                        </div>
                      </div>

                      <div>
                        <p className="font-medium mb-1">Electrical</p>
                        <div className="flex items-center gap-1">
                          <Zap className={`w-3 h-3 ${getSystemHealthColor(status.systemHealth.electrical)}`} />
                          <span className={getSystemHealthColor(status.systemHealth.electrical)}>
                            {status.systemHealth.electrical}
                          </span>
                        </div>
                      </div>

                      <div>
                        <p className="font-medium mb-1">Avionics</p>
                        <div className="flex items-center gap-1">
                          <Radio className={`w-3 h-3 ${getSystemHealthColor(status.systemHealth.avionics)}`} />
                          <span className={getSystemHealthColor(status.systemHealth.avionics)}>
                            {status.systemHealth.avionics}
                          </span>
                        </div>
                      </div>
                    </div>

                    {status.alerts.length > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="font-medium text-sm mb-2">Active Alerts ({status.alerts.length})</p>
                        <div className="space-y-1">
                          {status.alerts.map((alert) => (
                            <div key={alert.id} className={`p-2 rounded border text-xs ${getSeverityColor(alert.severity)}`}>
                              <div className="flex items-center justify-between">
                                <span>{alert.message}</span>
                                {!alert.acknowledged && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-6 text-xs"
                                    onClick={() => acknowledgeAlert(status.tailNumber, alert.id)}
                                  >
                                    ACK
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="alerts" className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">System Alerts</h4>
              <Badge variant="outline" className="text-xs">
                {systemAlerts.length} unacknowledged
              </Badge>
            </div>
            
            <ScrollArea className="h-96">
              {systemAlerts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
                  <p>No active alerts</p>
                  <p className="text-xs mt-1">All systems operating normally</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {systemAlerts.map((alert) => {
                    const aircraft = aircraftStatuses.find(s => s.alerts.some(a => a.id === alert.id));
                    return (
                      <div key={alert.id} className={`p-3 rounded-lg border ${getSeverityColor(alert.severity)}`}>
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Bell className="w-4 h-4" />
                            <span className="font-medium">{aircraft?.tailNumber}</span>
                            <Badge variant="outline" className="text-xs">
                              {alert.type}
                            </Badge>
                          </div>
                          <span className="text-xs">{getTimeAgo(alert.timestamp)}</span>
                        </div>
                        <p className="text-sm mb-2">{alert.message}</p>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs"
                          onClick={() => aircraft && acknowledgeAlert(aircraft.tailNumber, alert.id)}
                        >
                          Acknowledge Alert
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}