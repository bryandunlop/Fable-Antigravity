import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { Alert, AlertDescription } from './ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { useFlightNASImpact } from './hooks/useFlightNASImpact';
import {
  AlertTriangle,
  Clock,
  Plane,
  MapPin,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Bell,
  Zap,
  Route,
  Building2,
  ExternalLink,
  Eye,
  Phone,
  MessageSquare,
  Calendar,
  Navigation,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react';

export default function FlightImpactAlerts() {
  const { impactData, loading, isRefreshing, error, refetch } = useFlightNASImpact();
  const [expandedFlights, setExpandedFlights] = useState<Set<string>>(new Set());

  const toggleFlightExpanded = (flightId: string) => {
    const newExpanded = new Set(expandedFlights);
    if (newExpanded.has(flightId)) {
      newExpanded.delete(flightId);
    } else {
      newExpanded.add(flightId);
    }
    setExpandedFlights(newExpanded);
  };

  const getImpactIcon = (type: string) => {
    switch (type) {
      case 'ground_stop': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'ground_delay': return <Clock className="w-4 h-4 text-orange-500" />;
      case 'flow_program': return <Route className="w-4 h-4 text-blue-500" />;
      case 'facility_outage': return <Building2 className="w-4 h-4 text-purple-500" />;
      default: return <Bell className="w-4 h-4 text-gray-500" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'High': return 'bg-red-100 text-red-800 border-red-300';
      case 'Medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'Low': return 'bg-blue-100 text-blue-800 border-blue-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getImpactTypeLabel = (type: string) => {
    switch (type) {
      case 'ground_stop': return 'Ground Stop';
      case 'ground_delay': return 'Ground Delay';
      case 'flow_program': return 'Flow Program';
      case 'facility_outage': return 'Facility Issue';
      default: return 'Unknown';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            Flight Impact Alerts
          </CardTitle>
          <CardDescription>NAS impacts on scheduled flights</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="flex items-center gap-2 text-muted-foreground">
              <RefreshCw className="w-4 h-4 animate-spin" />
              Analyzing flight impacts...
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
          Failed to load flight impact data. <Button variant="link" className="p-0 h-auto text-red-800" onClick={refetch}>Try again</Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (impactData.totalImpacted === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-green-500" />
            Flight Impact Alerts
          </CardTitle>
          <CardDescription>NAS impacts on scheduled flights</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <Plane className="w-8 h-8 mx-auto mb-2 text-green-500" />
            <h3 className="font-medium text-green-800 mb-1">All Clear</h3>
            <p className="text-sm text-muted-foreground">No NAS impacts detected for scheduled flights</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-orange-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              Flight Impact Alerts
              <Badge className="bg-orange-100 text-orange-800">
                {impactData.totalImpacted} flights affected
              </Badge>
            </CardTitle>
            <CardDescription>NAS impacts on scheduled flights</CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={refetch}
            disabled={loading || isRefreshing}
          >
            <RefreshCw className={`w-4 h-4 ${loading || isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{impactData.highSeverityCount}</div>
            <p className="text-xs text-red-700">High Severity</p>
          </div>
          <div className="text-center p-3 bg-orange-50 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">{impactData.totalImpacted}</div>
            <p className="text-xs text-orange-700">Total Impacted</p>
          </div>
          <div className="text-center p-3 bg-yellow-50 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">{impactData.estimatedTotalDelay}</div>
            <p className="text-xs text-yellow-700">Est. Total Delay (min)</p>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <ScrollArea className="h-96">
          <div className="space-y-4">
            {impactData.impactedFlights.map((flight, index) => {
              const isExpanded = expandedFlights.has(flight.id);
              const highestSeverity = flight.impacts.reduce((max, impact) => {
                const severityOrder = { 'High': 3, 'Medium': 2, 'Low': 1 };
                const currentSeverity = severityOrder[impact.severity as keyof typeof severityOrder];
                const maxSeverity = severityOrder[max as keyof typeof severityOrder];
                return currentSeverity > maxSeverity ? impact.severity : max;
              }, 'Low');

              return (
                <div key={flight.id} className="border rounded-lg overflow-hidden">
                  <Collapsible
                    open={isExpanded}
                    onOpenChange={() => toggleFlightExpanded(flight.id)}
                  >
                    <CollapsibleTrigger asChild>
                      <Button
                        variant="ghost"
                        className="w-full p-4 hover:bg-accent/50 justify-start"
                      >
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-3">
                            <Plane className="w-5 h-5 text-muted-foreground" />
                            <div className="text-left">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{flight.id}</span>
                                <Badge variant="outline">{flight.aircraft}</Badge>
                                <Badge className={getSeverityColor(highestSeverity)}>
                                  {highestSeverity} Impact
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {flight.route} • {flight.departure} - {flight.arrival}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {flight.impacts.length} impact{flight.impacts.length !== 1 ? 's' : ''}
                            </Badge>
                            {isExpanded ?
                              <ChevronUp className="w-4 h-4" /> :
                              <ChevronDown className="w-4 h-4" />
                            }
                          </div>
                        </div>
                      </Button>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <Separator />
                      <div className="p-4 space-y-4">
                        {flight.impacts.map((impact, impactIndex) => (
                          <div key={impactIndex} className="border rounded-lg p-3 bg-muted/20">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2">
                                {getImpactIcon(impact.impactType)}
                                <span className="font-medium">{getImpactTypeLabel(impact.impactType)}</span>
                                <Badge className={getSeverityColor(impact.severity)}>
                                  {impact.severity}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <MapPin className="w-3 h-3" />
                                {impact.affectedAirport}
                              </div>
                            </div>

                            <p className="text-sm text-muted-foreground mb-2">{impact.details}</p>

                            {impact.estimatedDelay && (
                              <div className="flex items-center gap-1 text-sm mb-2">
                                <Clock className="w-3 h-3 text-orange-500" />
                                <span>Estimated delay: <strong>{impact.estimatedDelay} minutes</strong></span>
                              </div>
                            )}

                            <div className="bg-blue-50 border border-blue-200 rounded p-2 text-sm">
                              <div className="flex items-start gap-2">
                                <Bell className="w-3 h-3 text-blue-600 mt-0.5 flex-shrink-0" />
                                <div>
                                  <strong className="text-blue-800">Recommendation:</strong>
                                  <p className="text-blue-700 mt-1">{impact.recommendation}</p>
                                </div>
                              </div>
                            </div>

                            {impact.actionRequired && (
                              <div className="flex gap-2 mt-3">
                                <Button size="sm" variant="outline" className="text-xs">
                                  <Phone className="w-3 h-3 mr-1" />
                                  Contact Passengers
                                </Button>
                                <Button size="sm" variant="outline" className="text-xs">
                                  <MessageSquare className="w-3 h-3 mr-1" />
                                  Notify Crew
                                </Button>
                                <Button size="sm" variant="outline" className="text-xs">
                                  <Calendar className="w-3 h-3 mr-1" />
                                  Update Schedule
                                </Button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <Separator className="my-4" />

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Last updated: {new Date().toLocaleTimeString()}</span>
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