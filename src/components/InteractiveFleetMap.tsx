import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { useSatcomDirect } from './hooks/useSatcomDirect';
import { 
  Plane, 
  MapPin, 
  Gauge, 
  Navigation, 
  Clock, 
  Fuel, 
  RefreshCw,
  Loader2,
  Zap,
  Wifi,
  WifiOff,
  TrendingUp,
  TrendingDown,
  Minus,
  Radio,
  Map,
  Compass,
  Timer,
  Building2,
  Route,
  Crosshair,
  Activity,
  Info,
  Eye,
  Maximize,
  Filter,
  Layers
} from 'lucide-react';

interface AirportPosition {
  code: string;
  name: string;
  x: number; // percentage from left
  y: number; // percentage from top
  region: 'West' | 'Central' | 'East';
}

export default function InteractiveFleetMap() {
  const { aircraftPositions, aircraftStatuses, loading, error, refetch } = useSatcomDirect();
  const [selectedAircraft, setSelectedAircraft] = useState<string | null>(null);
  const [mapView, setMapView] = useState<'overview' | 'regional'>('overview');
  const [showFlightPaths, setShowFlightPaths] = useState(true);
  const [showAirports, setShowAirports] = useState(true);

  // Airport positions for visualization (simplified US map layout)
  const airports: AirportPosition[] = [
    { code: 'LAX', name: 'Los Angeles', x: 15, y: 65, region: 'West' },
    { code: 'SAN', name: 'San Diego', x: 18, y: 75, region: 'West' },
    { code: 'SFO', name: 'San Francisco', x: 12, y: 45, region: 'West' },
    { code: 'LAS', name: 'Las Vegas', x: 20, y: 60, region: 'West' },
    { code: 'PHX', name: 'Phoenix', x: 25, y: 70, region: 'West' },
    { code: 'DEN', name: 'Denver', x: 40, y: 50, region: 'Central' },
    { code: 'ORD', name: 'Chicago O\'Hare', x: 55, y: 35, region: 'Central' },
    { code: 'DFW', name: 'Dallas/Fort Worth', x: 45, y: 70, region: 'Central' },
    { code: 'IAH', name: 'Houston', x: 45, y: 80, region: 'Central' },
    { code: 'MSP', name: 'Minneapolis', x: 50, y: 25, region: 'Central' },
    { code: 'ATL', name: 'Atlanta', x: 65, y: 70, region: 'East' },
    { code: 'MIA', name: 'Miami', x: 75, y: 85, region: 'East' },
    { code: 'JFK', name: 'New York JFK', x: 80, y: 30, region: 'East' },
    { code: 'LGA', name: 'New York LaGuardia', x: 81, y: 29, region: 'East' },
    { code: 'EWR', name: 'Newark', x: 79, y: 31, region: 'East' },
    { code: 'BOS', name: 'Boston', x: 82, y: 25, region: 'East' },
    { code: 'DCA', name: 'Washington DC', x: 78, y: 35, region: 'East' },
    { code: 'PHL', name: 'Philadelphia', x: 79, y: 33, region: 'East' }
  ];

  // Convert lat/lng to map coordinates (simplified projection)
  const convertCoordinates = (lat: number, lng: number) => {
    // Simple conversion for US map visualization
    // This is a simplified version - real apps would use proper map projections
    const x = ((lng + 125) / 55) * 100; // Normalize longitude to 0-100%
    const y = 100 - ((lat - 25) / 25) * 100; // Normalize latitude to 0-100% (inverted for screen coords)
    return { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) };
  };

  // Get aircraft position on map
  const getAircraftMapPosition = (aircraft: any) => {
    return convertCoordinates(aircraft.latitude, aircraft.longitude);
  };

  // Get flight path points
  const getFlightPath = (aircraft: any) => {
    const departure = airports.find(a => a.code === aircraft.departureAirport);
    const arrival = airports.find(a => a.code === aircraft.arrivalAirport);
    const current = getAircraftMapPosition(aircraft);
    
    if (!departure || !arrival) return null;
    
    return {
      departure: { x: departure.x, y: departure.y },
      arrival: { x: arrival.x, y: arrival.y },
      current: current
    };
  };

  const getFlightPhaseColor = (phase: string) => {
    switch (phase) {
      case 'Cruise': return 'text-green-500';
      case 'Climb': case 'Takeoff': return 'text-blue-500';
      case 'Descent': case 'Approach': case 'Landing': return 'text-orange-500';
      case 'Parked': return 'text-gray-500';
      case 'Taxiing': return 'text-yellow-500';
      default: return 'text-gray-500';
    }
  };

  const getAircraftIcon = (phase: string) => {
    switch (phase) {
      case 'Parked': return '✈';
      case 'Taxiing': return '🛫';
      case 'Takeoff': case 'Climb': return '↗';
      case 'Cruise': return '→';
      case 'Descent': case 'Approach': return '↘';
      case 'Landing': return '🛬';
      default: return '✈';
    }
  };

  const selectedAircraftData = aircraftPositions.find(a => a.tailNumber === selectedAircraft);
  const selectedAircraftStatus = aircraftStatuses.find(s => s.tailNumber === selectedAircraft);

  if (loading && aircraftPositions.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading fleet map...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Map Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h4 className="font-medium">Fleet Map</h4>
          <Badge variant="outline" className="text-xs">
            {aircraftPositions.filter(a => a.flightPhase !== 'Parked').length} active flights
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={showAirports ? "default" : "outline"}
            size="sm"
            onClick={() => setShowAirports(!showAirports)}
          >
            <Building2 className="w-3 h-3 mr-1" />
            Airports
          </Button>
          <Button
            variant={showFlightPaths ? "default" : "outline"}
            size="sm"
            onClick={() => setShowFlightPaths(!showFlightPaths)}
          >
            <Route className="w-3 h-3 mr-1" />
            Paths
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={refetch}
            disabled={loading}
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Map Display */}
        <div className="lg:col-span-3">
          <Card>
            <CardContent className="p-4">
              <div 
                className="relative w-full h-96 border rounded-lg overflow-hidden"
                style={{ 
                  background: `
                    linear-gradient(180deg, #f0f9ff 0%, #e0f2fe 50%, #bae6fd 100%),
                    radial-gradient(circle at 25% 25%, rgba(59, 130, 246, 0.1) 0%, transparent 35%),
                    radial-gradient(circle at 75% 75%, rgba(34, 197, 94, 0.08) 0%, transparent 35%)
                  `,
                  backgroundImage: `
                    url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%2364748b' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")
                  `
                }}
              >
                {/* Subtle Geographic Features */}
                <div className="absolute inset-0 opacity-10">
                  {/* Mountain ranges (simplified) */}
                  <div className="absolute left-[15%] top-[30%] w-20 h-16 bg-gradient-to-t from-gray-400 to-gray-200 rounded-full transform -skew-x-12" />
                  <div className="absolute left-[18%] top-[35%] w-16 h-12 bg-gradient-to-t from-gray-400 to-gray-200 rounded-full transform skew-x-6" />
                  
                  {/* Great Lakes region */}
                  <div className="absolute left-[52%] top-[25%] w-8 h-6 bg-blue-300 rounded-full" />
                  <div className="absolute left-[58%] top-[30%] w-6 h-4 bg-blue-300 rounded-full" />
                  
                  {/* Coastlines (subtle) */}
                  <div className="absolute left-0 top-0 w-full h-full border-l-4 border-r-4 border-blue-200 opacity-30" />
                </div>

                {/* Grid lines - more subtle */}
                <div className="absolute inset-0 opacity-15">
                  {[...Array(9)].map((_, i) => (
                    <div key={`v-${i}`} className="absolute h-full w-px bg-gray-400" style={{ left: `${(i + 1) * 10}%` }} />
                  ))}
                  {[...Array(7)].map((_, i) => (
                    <div key={`h-${i}`} className="absolute w-full h-px bg-gray-400" style={{ top: `${(i + 1) * 12.5}%` }} />
                  ))}
                </div>

                {/* US Regions Labels */}
                <div className="absolute top-4 left-4 text-xs text-gray-500 font-medium">West Coast</div>
                <div className="absolute top-4 left-1/2 transform -translate-x-1/2 text-xs text-gray-500 font-medium">Central</div>
                <div className="absolute top-4 right-4 text-xs text-gray-500 font-medium">East Coast</div>

                {/* Airports */}
                {showAirports && airports.map((airport) => (
                  <div
                    key={airport.code}
                    className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
                    style={{ left: `${airport.x}%`, top: `${airport.y}%` }}
                  >
                    <div className="relative">
                      <div className="w-2 h-2 bg-gray-400 rounded-full border border-white shadow-sm group-hover:scale-125 transition-transform" />
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 text-xs text-gray-600 font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                        {airport.code}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Flight Paths */}
                {showFlightPaths && aircraftPositions.map((aircraft) => {
                  const path = getFlightPath(aircraft);
                  if (!path || aircraft.flightPhase === 'Parked') return null;

                  return (
                    <svg
                      key={`path-${aircraft.tailNumber}`}
                      className="absolute inset-0 w-full h-full pointer-events-none"
                      style={{ zIndex: 1 }}
                    >
                      <defs>
                        <linearGradient id={`gradient-${aircraft.tailNumber}`} x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#94a3b8" stopOpacity="0.3" />
                          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.6" />
                        </linearGradient>
                      </defs>
                      <line
                        x1={`${path.departure.x}%`}
                        y1={`${path.departure.y}%`}
                        x2={`${path.arrival.x}%`}
                        y2={`${path.arrival.y}%`}
                        stroke={`url(#gradient-${aircraft.tailNumber})`}
                        strokeWidth="1"
                        strokeDasharray="3,3"
                      />
                    </svg>
                  );
                })}

                {/* Aircraft Positions */}
                {aircraftPositions.map((aircraft) => {
                  const position = getAircraftMapPosition(aircraft);
                  const status = aircraftStatuses.find(s => s.tailNumber === aircraft.tailNumber);
                  const isSelected = selectedAircraft === aircraft.tailNumber;
                  
                  if (aircraft.flightPhase === 'Parked') {
                    // Show parked aircraft at their airport location
                    const airport = airports.find(a => 
                      a.code === aircraft.departureAirport || a.code === aircraft.arrivalAirport
                    );
                    if (!airport) return null;
                    
                    return (
                      <div
                        key={aircraft.tailNumber}
                        className={`absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-200 z-10 ${
                          isSelected ? 'scale-150' : 'hover:scale-125'
                        }`}
                        style={{ left: `${airport.x}%`, top: `${airport.y}%` }}
                        onClick={() => setSelectedAircraft(aircraft.tailNumber)}
                      >
                        <div className={`relative ${isSelected ? 'z-20' : ''}`}>
                          <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs shadow-lg ${
                            isSelected 
                              ? 'bg-blue-500 border-blue-600 text-white' 
                              : 'bg-gray-100 border-gray-300 text-gray-600'
                          }`}>
                            ✈
                          </div>
                          {isSelected && (
                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 bg-black text-white text-xs px-2 py-1 rounded whitespace-nowrap z-30">
                              {aircraft.tailNumber} - Parked
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={aircraft.tailNumber}
                      className={`absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-200 z-10 ${
                        isSelected ? 'scale-150' : 'hover:scale-125'
                      }`}
                      style={{ left: `${position.x}%`, top: `${position.y}%` }}
                      onClick={() => setSelectedAircraft(aircraft.tailNumber)}
                    >
                      <div className={`relative ${isSelected ? 'z-20' : ''}`}>
                        {/* Aircraft Icon */}
                        <div 
                          className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs shadow-lg transform transition-transform ${
                            isSelected 
                              ? 'bg-blue-500 border-blue-600 text-white' 
                              : `bg-white border-blue-400 ${getFlightPhaseColor(aircraft.flightPhase)}`
                          }`}
                          style={{ 
                            transform: `rotate(${aircraft.heading}deg)`,
                          }}
                        >
                          <Plane className="w-4 h-4" />
                        </div>
                        
                        {/* Connection Status Indicator */}
                        <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border border-white ${
                          status?.isOnline ? 'bg-green-500' : 'bg-red-500'
                        }`} />
                        
                        {/* Info Popup on Selection */}
                        {isSelected && (
                          <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 bg-black text-white text-xs px-3 py-2 rounded whitespace-nowrap z-30">
                            <div className="font-medium">{aircraft.tailNumber}</div>
                            <div>{aircraft.callSign}</div>
                            <div>{aircraft.flightPhase} • {aircraft.altitude.toLocaleString()} ft</div>
                            <div>{aircraft.groundSpeed} kts • {aircraft.heading}°</div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Legend */}
                <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm border rounded-lg p-3 text-xs space-y-2">
                  <div className="font-medium">Legend</div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full" />
                    <span>Online</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full" />
                    <span>Offline</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Plane className="w-3 h-3 text-blue-500" />
                    <span>Active Flight</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-gray-400 rounded-full" />
                    <span>Airport</span>
                  </div>
                </div>

                {/* Scale Indicator */}
                <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm border rounded-lg p-2 text-xs">
                  <div className="font-medium mb-1">United States</div>
                  <div className="w-16 h-1 bg-black mb-1" />
                  <div>~1000 mi</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Aircraft Details Panel */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Aircraft Details</CardTitle>
              <CardDescription className="text-xs">
                {selectedAircraft ? 'Selected aircraft information' : 'Click an aircraft to view details'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedAircraftData && selectedAircraftStatus ? (
                <ScrollArea className="h-80">
                  <div className="space-y-4">
                    {/* Basic Info */}
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Plane className="w-4 h-4 text-blue-500" />
                        <span className="font-medium">{selectedAircraftData.tailNumber}</span>
                        {selectedAircraftData.callSign && (
                          <Badge variant="outline" className="text-xs">
                            {selectedAircraftData.callSign}
                          </Badge>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-muted-foreground">Status:</span>
                          <div className={`${getFlightPhaseColor(selectedAircraftData.flightPhase)} font-medium`}>
                            {selectedAircraftData.flightPhase}
                          </div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Connection:</span>
                          <div className={`flex items-center gap-1 ${
                            selectedAircraftStatus.isOnline ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {selectedAircraftStatus.isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                            {selectedAircraftStatus.satcomStatus}
                          </div>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Flight Data */}
                    <div>
                      <h5 className="font-medium text-sm mb-2">Flight Data</h5>
                      <div className="space-y-2 text-xs">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-muted-foreground">Altitude:</span>
                            <div className="font-medium">{selectedAircraftData.altitude.toLocaleString()} ft</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Speed:</span>
                            <div className="font-medium">{selectedAircraftData.groundSpeed} kts</div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-muted-foreground">Heading:</span>
                            <div className="font-medium">{selectedAircraftData.heading}°</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">V/S:</span>
                            <div className="font-medium">
                              {selectedAircraftData.verticalSpeed > 0 ? '+' : ''}
                              {selectedAircraftData.verticalSpeed} fpm
                            </div>
                          </div>
                        </div>
                        {selectedAircraftData.fuelRemaining && (
                          <div>
                            <span className="text-muted-foreground">Fuel:</span>
                            <div className="font-medium">{selectedAircraftData.fuelRemaining.toLocaleString()} lbs</div>
                          </div>
                        )}
                      </div>
                    </div>

                    <Separator />

                    {/* Route Info */}
                    {selectedAircraftData.departureAirport && selectedAircraftData.arrivalAirport && (
                      <div>
                        <h5 className="font-medium text-sm mb-2">Route</h5>
                        <div className="text-xs">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-muted-foreground">From:</span>
                            <span className="font-medium">{selectedAircraftData.departureAirport}</span>
                          </div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-muted-foreground">To:</span>
                            <span className="font-medium">{selectedAircraftData.arrivalAirport}</span>
                          </div>
                          {selectedAircraftData.estimatedArrival && (
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground">ETA:</span>
                              <span className="font-medium">
                                {new Date(selectedAircraftData.estimatedArrival).toLocaleTimeString()}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* System Health */}
                    {selectedAircraftStatus.systemHealth && (
                      <>
                        <Separator />
                        <div>
                          <h5 className="font-medium text-sm mb-2">System Health</h5>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="flex items-center gap-1">
                              <Activity className={`w-3 h-3 ${
                                selectedAircraftStatus.systemHealth.engine === 'Normal' ? 'text-green-600' :
                                selectedAircraftStatus.systemHealth.engine === 'Caution' ? 'text-yellow-600' : 'text-red-600'
                              }`} />
                              <span>Engine: {selectedAircraftStatus.systemHealth.engine}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Activity className={`w-3 h-3 ${
                                selectedAircraftStatus.systemHealth.hydraulics === 'Normal' ? 'text-green-600' :
                                selectedAircraftStatus.systemHealth.hydraulics === 'Caution' ? 'text-yellow-600' : 'text-red-600'
                              }`} />
                              <span>Hydraulics: {selectedAircraftStatus.systemHealth.hydraulics}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Zap className={`w-3 h-3 ${
                                selectedAircraftStatus.systemHealth.electrical === 'Normal' ? 'text-green-600' :
                                selectedAircraftStatus.systemHealth.electrical === 'Caution' ? 'text-yellow-600' : 'text-red-600'
                              }`} />
                              <span>Electrical: {selectedAircraftStatus.systemHealth.electrical}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Radio className={`w-3 h-3 ${
                                selectedAircraftStatus.systemHealth.avionics === 'Normal' ? 'text-green-600' :
                                selectedAircraftStatus.systemHealth.avionics === 'Caution' ? 'text-yellow-600' : 'text-red-600'
                              }`} />
                              <span>Avionics: {selectedAircraftStatus.systemHealth.avionics}</span>
                            </div>
                          </div>
                        </div>
                      </>
                    )}

                    {/* Active Alerts */}
                    {selectedAircraftStatus.alerts.length > 0 && (
                      <>
                        <Separator />
                        <div>
                          <h5 className="font-medium text-sm mb-2">Active Alerts</h5>
                          <div className="space-y-1">
                            {selectedAircraftStatus.alerts.map((alert) => (
                              <div key={alert.id} className={`p-2 rounded text-xs border ${
                                alert.severity === 'Emergency' ? 'bg-red-50 border-red-200 text-red-800' :
                                alert.severity === 'Warning' ? 'bg-orange-50 border-orange-200 text-orange-800' :
                                alert.severity === 'Caution' ? 'bg-yellow-50 border-yellow-200 text-yellow-800' :
                                'bg-blue-50 border-blue-200 text-blue-800'
                              }`}>
                                <div className="font-medium">{alert.type} Alert</div>
                                <div>{alert.message}</div>
                                {alert.acknowledged && (
                                  <div className="text-xs text-muted-foreground mt-1">✓ Acknowledged</div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Map className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Select an aircraft on the map to view detailed information</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}