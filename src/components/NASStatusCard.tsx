import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  Plane, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  MapPin,
  RefreshCw,
  ExternalLink,
  CloudLightning,
  Wind,
  Thermometer,
  Eye,
  Zap,
  Navigation,
  Activity,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertCircle,
  Info,
  Globe,
  Timer,
  Building2,
  Route
} from 'lucide-react';

interface NASData {
  groundStops: GroundStop[];
  groundDelays: GroundDelay[];
  airspaceFlowPrograms: AirspaceFlowProgram[];
  facilityOutages: FacilityOutage[];
  lastUpdated: string;
  systemStatus: 'Normal' | 'Limited' | 'Significant Delays' | 'Critical';
}

interface GroundStop {
  airport: string;
  reason: string;
  startTime: string;
  endTime?: string;
  affectedFlights: number;
  severity: 'High' | 'Medium' | 'Low';
}

interface GroundDelay {
  airport: string;
  averageDelay: number;
  reason: string;
  trend: 'Increasing' | 'Decreasing' | 'Stable';
  affectedFlights: number;
}

interface AirspaceFlowProgram {
  name: string;
  type: 'Ground Delay Program' | 'Airspace Flow Program' | 'Ground Stop';
  affectedAirports: string[];
  reason: string;
  startTime: string;
  estimatedEndTime?: string;
  impact: 'High' | 'Medium' | 'Low';
}

interface FacilityOutage {
  facility: string;
  type: 'Radar' | 'Communication' | 'Navigation' | 'Weather';
  status: 'Out of Service' | 'Limited' | 'Restored';
  impact: string;
  startTime: string;
}

export default function NASStatusCard() {
  const [nasData, setNasData] = useState<NASData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Mock data generation for demonstration
  const generateMockNASData = (): NASData => {
    return {
      groundStops: [
        {
          airport: 'LGA',
          reason: 'Thunderstorms in area',
          startTime: '14:30',
          endTime: '16:45',
          affectedFlights: 47,
          severity: 'High'
        },
        {
          airport: 'EWR',
          reason: 'ATC staffing shortage',
          startTime: '13:15',
          affectedFlights: 23,
          severity: 'Medium'
        }
      ],
      groundDelays: [
        {
          airport: 'JFK',
          averageDelay: 45,
          reason: 'Volume/Weather',
          trend: 'Decreasing',
          affectedFlights: 156
        },
        {
          airport: 'LAX',
          averageDelay: 22,
          reason: 'Volume',
          trend: 'Stable',
          affectedFlights: 89
        },
        {
          airport: 'ORD',
          averageDelay: 67,
          reason: 'Weather/Wind',
          trend: 'Increasing',
          affectedFlights: 203
        },
        {
          airport: 'ATL',
          averageDelay: 18,
          reason: 'Volume',
          trend: 'Stable',
          affectedFlights: 124
        }
      ],
      airspaceFlowPrograms: [
        {
          name: 'East Coast GDP',
          type: 'Ground Delay Program',
          affectedAirports: ['JFK', 'LGA', 'EWR', 'PHL', 'DCA'],
          reason: 'Thunderstorm activity in NY/NJ area',
          startTime: '13:00',
          estimatedEndTime: '18:00',
          impact: 'High'
        },
        {
          name: 'SoCal AFP',
          type: 'Airspace Flow Program',
          affectedAirports: ['LAX', 'SAN', 'BUR', 'LGB'],
          reason: 'High volume and marine layer',
          startTime: '11:30',
          estimatedEndTime: '15:30',
          impact: 'Medium'
        }
      ],
      facilityOutages: [
        {
          facility: 'ZNY ARTCC Sector 12',
          type: 'Radar',
          status: 'Limited',
          impact: 'Reduced capacity in NY approach airspace',
          startTime: '12:45'
        },
        {
          facility: 'MIA ATCT',
          type: 'Communication',
          status: 'Restored',
          impact: 'Backup systems operational',
          startTime: '10:30'
        }
      ],
      lastUpdated: new Date().toISOString(),
      systemStatus: 'Limited'
    };
  };

  const fetchNASData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // In a real implementation, this would be an API call to FAA's system
      // const response = await fetch('https://nasstatus.faa.gov/api/data');
      // const data = await response.json();
      
      const mockData = generateMockNASData();
      setNasData(mockData);
      setLastRefresh(new Date());
    } catch (err) {
      setError('Failed to fetch NAS data');
      console.error('NAS data fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNASData();
    
    // Set up auto-refresh every 5 minutes
    const interval = setInterval(fetchNASData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const getSystemStatusColor = (status: string) => {
    switch (status) {
      case 'Normal': return 'bg-green-100 text-green-800';
      case 'Limited': return 'bg-yellow-100 text-yellow-800';
      case 'Significant Delays': return 'bg-orange-100 text-orange-800';
      case 'Critical': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'High': return 'bg-red-100 text-red-800';
      case 'Medium': return 'bg-yellow-100 text-yellow-800';
      case 'Low': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'Increasing': return <TrendingUp className="w-3 h-3 text-red-500" />;
      case 'Decreasing': return <TrendingDown className="w-3 h-3 text-green-500" />;
      case 'Stable': return <Minus className="w-3 h-3 text-blue-500" />;
      default: return <Minus className="w-3 h-3 text-gray-500" />;
    }
  };

  const getDelayColor = (delay: number) => {
    if (delay >= 60) return 'text-red-600';
    if (delay >= 30) return 'text-orange-600';
    if (delay >= 15) return 'text-yellow-600';
    return 'text-green-600';
  };

  if (loading && !nasData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            National Airspace System Status
          </CardTitle>
          <CardDescription>Real-time NAS conditions and delays</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="flex items-center gap-2 text-muted-foreground">
              <RefreshCw className="w-4 h-4 animate-spin" />
              Loading NAS data...
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            National Airspace System Status
          </CardTitle>
          <CardDescription>Real-time NAS conditions and delays</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground mb-2">{error}</p>
              <Button variant="outline" size="sm" onClick={fetchNASData}>
                <RefreshCw className="w-3 h-3 mr-1" />
                Retry
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!nasData) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5" />
              National Airspace System Status
            </CardTitle>
            <CardDescription>
              Real-time NAS conditions and delays
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={getSystemStatusColor(nasData.systemStatus)}>
              {nasData.systemStatus}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchNASData}
              disabled={loading}
              className="text-xs"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
        
        {/* Quick Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          <div className="text-center p-2 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-center gap-1 mb-1">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <span className="text-2xl font-bold text-red-600">{nasData.groundStops.length}</span>
            </div>
            <p className="text-xs text-muted-foreground">Ground Stops</p>
          </div>
          
          <div className="text-center p-2 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Clock className="w-4 h-4 text-orange-500" />
              <span className="text-2xl font-bold text-orange-600">{nasData.groundDelays.length}</span>
            </div>
            <p className="text-xs text-muted-foreground">Delayed Airports</p>
          </div>
          
          <div className="text-center p-2 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Route className="w-4 h-4 text-blue-500" />
              <span className="text-2xl font-bold text-blue-600">{nasData.airspaceFlowPrograms.length}</span>
            </div>
            <p className="text-xs text-muted-foreground">Flow Programs</p>
          </div>
          
          <div className="text-center p-2 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Building2 className="w-4 h-4 text-purple-500" />
              <span className="text-2xl font-bold text-purple-600">{nasData.facilityOutages.length}</span>
            </div>
            <p className="text-xs text-muted-foreground">Facility Issues</p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <Tabs defaultValue="delays" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="delays" className="text-xs">Delays</TabsTrigger>
            <TabsTrigger value="stops" className="text-xs">Ground Stops</TabsTrigger>
            <TabsTrigger value="programs" className="text-xs">Flow Programs</TabsTrigger>
            <TabsTrigger value="facilities" className="text-xs">Facilities</TabsTrigger>
          </TabsList>
          
          <TabsContent value="delays" className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Ground Delays</h4>
              <Badge variant="outline" className="text-xs">
                {nasData.groundDelays.reduce((sum, delay) => sum + delay.affectedFlights, 0)} flights affected
              </Badge>
            </div>
            <ScrollArea className="h-48">
              <div className="space-y-3">
                {nasData.groundDelays.map((delay, index) => (
                  <div key={index} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">{delay.airport}</span>
                        <Badge variant="outline" className="text-xs">
                          {delay.affectedFlights} flights
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        {getTrendIcon(delay.trend)}
                        <span className={`font-bold ${getDelayColor(delay.averageDelay)}`}>
                          {delay.averageDelay} min
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">{delay.reason}</p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="stops" className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Ground Stops</h4>
              <Badge variant="outline" className="text-xs">
                {nasData.groundStops.reduce((sum, stop) => sum + stop.affectedFlights, 0)} flights affected
              </Badge>
            </div>
            <ScrollArea className="h-48">
              <div className="space-y-3">
                {nasData.groundStops.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
                    <p>No ground stops currently active</p>
                  </div>
                ) : (
                  nasData.groundStops.map((stop, index) => (
                    <div key={index} className="p-3 border rounded-lg border-l-4 border-l-red-500">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-red-500" />
                          <span className="font-medium">{stop.airport}</span>
                          <Badge className={getSeverityColor(stop.severity)}>
                            {stop.severity}
                          </Badge>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {stop.affectedFlights} flights
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">{stop.reason}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>Started: {stop.startTime}</span>
                        {stop.endTime && <span>Est. End: {stop.endTime}</span>}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="programs" className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Traffic Management Programs</h4>
              <Badge variant="outline" className="text-xs">
                {nasData.airspaceFlowPrograms.length} active
              </Badge>
            </div>
            <ScrollArea className="h-48">
              <div className="space-y-3">
                {nasData.airspaceFlowPrograms.map((program, index) => (
                  <div key={index} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Route className="w-4 h-4 text-blue-500" />
                        <span className="font-medium">{program.name}</span>
                        <Badge className={getSeverityColor(program.impact)}>
                          {program.impact} Impact
                        </Badge>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {program.type}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{program.reason}</p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Airports: {program.affectedAirports.join(', ')}</span>
                      <span>{program.startTime} - {program.estimatedEndTime || 'TBD'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="facilities" className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Facility Status</h4>
              <Badge variant="outline" className="text-xs">
                {nasData.facilityOutages.length} issues
              </Badge>
            </div>
            <ScrollArea className="h-48">
              <div className="space-y-3">
                {nasData.facilityOutages.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
                    <p>All facilities operating normally</p>
                  </div>
                ) : (
                  nasData.facilityOutages.map((outage, index) => (
                    <div key={index} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-purple-500" />
                          <span className="font-medium">{outage.facility}</span>
                          <Badge variant="outline" className="text-xs">
                            {outage.type}
                          </Badge>
                        </div>
                        <Badge className={
                          outage.status === 'Restored' ? 'bg-green-100 text-green-800' :
                          outage.status === 'Limited' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }>
                          {outage.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">{outage.impact}</p>
                      <p className="text-xs text-muted-foreground">Since: {outage.startTime}</p>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
        
        <Separator className="my-4" />
        
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Timer className="w-3 h-3" />
            <span>Last updated: {lastRefresh.toLocaleTimeString()}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs"
            onClick={() => window.open('https://nasstatus.faa.gov/', '_blank')}
          >
            <ExternalLink className="w-3 h-3 mr-1" />
            View Full NAS Status
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}