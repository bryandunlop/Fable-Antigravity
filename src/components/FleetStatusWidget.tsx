import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Link } from 'react-router-dom';
import { useSatcomDirect } from './hooks/useSatcomDirect';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import {
  Plane,
  MapPin,
  Wrench,
  CheckCircle,
  AlertTriangle,
  Clock,
  Sparkles,
  ChevronRight,
  Activity,
  Settings,
  XCircle,
  TrendingUp,
  Loader2,
  Fuel,
  Edit2
} from 'lucide-react';

interface AircraftStatus {
  id: string;
  tailNumber: string;
  model: string;
  flightStatus: 'in-flight' | 'on-ground' | 'taxi' | 'parked';
  serviceStatus: 'in-service' | 'out-of-service' | 'in-maintenance' | 'aog';
  fuelRemaining?: number; // Added fuel
  cleaningStatus: {
    status: 'clean' | 'needs-cleaning' | 'cleaning-in-progress' | 'verified';
    lastCleaned?: string;
    nextDue?: string;
    cleanedBy?: string;
  };
  location?: string;
  currentFlight?: string;
  nextMaintenance?: string;
  issues?: number;
  hobbsTime?: string;
  utilization?: number;
}

interface FleetStatusWidgetProps {
  compact?: boolean;
  showDetailsLink?: boolean;
  className?: string; // Add className prop
  transparent?: boolean; // Add transparent prop
}

// Local mock storage for manual overrides (simulating backend persistence)
// In a real app, this would be a context or API call
const useAircraftOverrides = () => {
  const [overrides, setOverrides] = useState<Record<string, { serviceStatus?: string, fuel?: number }>>({});

  const updateStatus = (tailNumber: string, status: string) => {
    setOverrides(prev => ({
      ...prev,
      [tailNumber]: { ...prev[tailNumber], serviceStatus: status }
    }));
  };

  const updateFuel = (tailNumber: string, fuel: number) => {
    setOverrides(prev => ({
      ...prev,
      [tailNumber]: { ...prev[tailNumber], fuel }
    }));
  };

  return { overrides, updateStatus, updateFuel };
};

export default function FleetStatusWidget({
  compact = false,
  showDetailsLink = true,
  className = "",
  transparent = false
}: FleetStatusWidgetProps) {
  // ... hook calls remain the same
  const { aircraftPositions, aircraftStatuses, loading, isRefreshing, error } = useSatcomDirect();
  const { overrides, updateStatus, updateFuel } = useAircraftOverrides();

  // ... data transformation logic remains the same (lines 54-184)
  const aircraft = useMemo<AircraftStatus[]>(() => {
    return aircraftPositions.map((position, index) => {
      const status = aircraftStatuses.find(s => s.tailNumber === position.tailNumber);
      const override = overrides[position.tailNumber];

      let flightStatus: 'in-flight' | 'on-ground' | 'taxi' | 'parked' = 'parked';
      if (position.flightPhase === 'Cruise' || position.flightPhase === 'Climb' || position.flightPhase === 'Descent') {
        flightStatus = 'in-flight';
      } else if (position.flightPhase === 'Taxiing') {
        flightStatus = 'taxi';
      } else if (position.flightPhase === 'Takeoff' || position.flightPhase === 'Approach' || position.flightPhase === 'Landing') {
        flightStatus = 'on-ground';
      }

      // Determine raw service status
      let rawServiceStatus: 'in-service' | 'out-of-service' | 'in-maintenance' | 'aog' = 'in-service';
      if (status?.satcomStatus === 'Maintenance') {
        rawServiceStatus = 'in-maintenance';
      } else if (!status?.isOnline) {
        rawServiceStatus = 'out-of-service';
      }

      // Apply override if exists
      const serviceStatus = (override?.serviceStatus as any) || rawServiceStatus;
      const fuelRemaining = override?.fuel !== undefined ? override.fuel : position.fuelRemaining;

      const cleaningStatus = {
        status: (index % 3 === 0 ? 'verified' : index % 3 === 1 ? 'cleaning-in-progress' : 'needs-cleaning') as 'clean' | 'needs-cleaning' | 'cleaning-in-progress' | 'verified',
        lastCleaned: new Date(Date.now() - (index + 1) * 3600000).toISOString()
      };

      return {
        id: position.tailNumber,
        tailNumber: position.tailNumber,
        model: position.tailNumber.includes('PG')
          ? (['N1PG', 'N2PG'].includes(position.tailNumber) ? 'Gulfstream G650' : 'Gulfstream G500')
          : 'Gulfstream G650',
        flightStatus,
        serviceStatus,
        fuelRemaining,
        cleaningStatus,
        location: position.flightPhase === 'Parked'
          ? `${position.departureAirport || 'Unknown'} - Ramp`
          : position.departureAirport && position.arrivalAirport
            ? `En Route ${position.departureAirport}-${position.arrivalAirport}`
            : 'In Flight',
        currentFlight: position.callSign,
        nextMaintenance: '2025-02-15',
        issues: status?.alerts.filter(a => !a.acknowledged).length || 0,
        hobbsTime: `${(4000 + index * 500).toFixed(1)}`,
        utilization: Math.floor(65 + index * 10)
      };
    });
  }, [aircraftPositions, aircraftStatuses, overrides]);

  // ... helper functions remain the same (lines 105-181)
  const getFlightStatusColor = (status: string) => {
    switch (status) {
      case 'in-flight': return 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800/50';
      case 'on-ground': return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800/50';
      case 'taxi': return 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800/50';
      case 'parked': return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/50 dark:text-slate-400 dark:border-slate-700/50';
      default: return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/50 dark:text-slate-400 dark:border-slate-700/50';
    }
  };

  const getServiceStatusColor = (status: string) => {
    switch (status) {
      case 'in-service': return 'bg-green-500/15 text-green-700 border-green-200 dark:bg-green-500/20 dark:text-green-300 dark:border-green-500/30';
      case 'out-of-service': return 'bg-red-500/15 text-red-700 border-red-200 dark:bg-red-500/20 dark:text-red-300 dark:border-red-500/30';
      case 'in-maintenance': return 'bg-yellow-500/15 text-yellow-700 border-yellow-200 dark:bg-yellow-500/20 dark:text-yellow-300 dark:border-yellow-500/30';
      case 'aog': return 'bg-red-600/15 text-red-800 border-red-300 dark:bg-red-600/20 dark:text-red-200 dark:border-red-600/30';
      default: return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/50 dark:text-slate-400';
    }
  };

  const getCleaningStatusColor = (status: string) => {
    switch (status) {
      case 'clean':
      case 'verified': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'needs-cleaning': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'cleaning-in-progress': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      default: return 'bg-slate-100 text-slate-700 dark:bg-slate-800/50 dark:text-slate-400';
    }
  };

  const getFlightStatusIcon = (status: string) => {
    switch (status) {
      case 'in-flight': return <Plane className="w-4 h-4" />;
      case 'on-ground': return <MapPin className="w-4 h-4" />;
      case 'taxi': return <Activity className="w-4 h-4" />;
      case 'parked': return <MapPin className="w-4 h-4" />;
      default: return <Plane className="w-4 h-4" />;
    }
  };

  const getServiceStatusIcon = (status: string) => {
    switch (status) {
      case 'in-service': return <CheckCircle className="w-4 h-4" />;
      case 'out-of-service': return <XCircle className="w-4 h-4" />;
      case 'in-maintenance': return <Wrench className="w-4 h-4" />;
      case 'aog': return <AlertTriangle className="w-4 h-4" />;
      default: return <Settings className="w-4 h-4" />;
    }
  };

  const getCleaningStatusIcon = (status: string) => {
    switch (status) {
      case 'clean':
      case 'verified': return <Sparkles className="w-4 h-4" />;
      case 'needs-cleaning': return <AlertTriangle className="w-4 h-4" />;
      case 'cleaning-in-progress': return <Clock className="w-4 h-4" />;
      default: return <Sparkles className="w-4 h-4" />;
    }
  };

  const formatStatusText = (status: string) => status.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

  const getFleetSummary = () => {
    const inFlight = aircraft.filter(a => a.flightStatus === 'in-flight').length;
    const inService = aircraft.filter(a => a.serviceStatus === 'in-service').length;
    const needsCleaning = aircraft.filter(a => a.cleaningStatus.status === 'needs-cleaning' || a.cleaningStatus.status === 'cleaning-in-progress').length;
    const totalIssues = aircraft.reduce((sum, a) => sum + (a.issues || 0), 0);
    return { inFlight, inService, needsCleaning, totalIssues };
  };

  const summary = getFleetSummary();

  // Loading state
  if (loading) {
    return (
      <Card className={`${transparent ? 'bg-transparent border-none shadow-none' : 'hover:shadow-lg transition-shadow'} ${className}`}>
        <CardContent className="p-8 flex items-center justify-center">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading fleet data...
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`p-4 border border-red-200 rounded-lg bg-red-50 text-red-700 ${className}`}>
        Unable to load fleet data.
      </div>
    );
  }

  // Dashboard Compact View
  if (compact) {
    return (
      <Card className={`${transparent ? 'bg-transparent border-none shadow-none' : 'hover:shadow-lg transition-shadow'} ${className}`}>
        <CardHeader className="px-0 pt-0 pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2 font-semibold">
              <Plane className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              Fleet Status
              {isRefreshing && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
            </CardTitle>
            {showDetailsLink && (
              <Link to="/aircraft">
                <Button variant="ghost" size="sm" className="h-8">
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </Link>
            )}
          </div>
        </CardHeader>
        <CardContent className="px-0 pb-0 space-y-3">
          {/* Fleet Summary */}
          <div className="grid grid-cols-2 gap-3">
            {/* ... summary items ... */}
            <div className="flex items-center gap-2 p-2 bg-green-50/50 dark:bg-green-900/10 rounded-lg border border-green-100 dark:border-green-900/30">
              <Plane className="w-4 h-4 text-green-600 dark:text-green-400" />
              <div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">In Flight</div>
                <div className="font-semibold text-green-700 dark:text-green-400">{summary.inFlight}/{aircraft.length}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 bg-blue-50/50 dark:bg-blue-900/10 rounded-lg border border-blue-100 dark:border-blue-900/30">
              <CheckCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">In Service</div>
                <div className="font-semibold text-blue-700 dark:text-blue-400">{summary.inService}/{aircraft.length}</div>
              </div>
            </div>
          </div>

          {/* Quick Aircraft List */}
          <div className="space-y-2 pt-2">
            {aircraft.slice(0, 3).map(ac => (
              <div key={ac.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors border border-transparent hover:border-border/50 group/item">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${ac.serviceStatus === 'in-service' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]'}`} />
                  <div>
                    <span className="text-sm font-medium text-foreground block leading-none mb-1">{ac.tailNumber}</span>
                    <span className="text-[10px] text-muted-foreground flex flex-col gap-0.5">
                      {ac.flightStatus === 'parked' && (
                        <span className="text-blue-600 dark:text-blue-400 font-medium">
                          Next: KTEB - Tomorrow 08:00
                        </span>
                      )}
                      {ac.fuelRemaining ? (
                        <span className="flex items-center gap-1">
                          <Fuel className="w-3 h-3" />
                          {ac.fuelRemaining.toLocaleString()} lbs
                        </span>
                      ) : (
                        'Fuel data unavailable'
                      )}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Edit Trigger */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover/item:opacity-100 transition-opacity">
                        <Edit2 className="w-3 h-3 text-muted-foreground" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80">
                      <div className="grid gap-4">
                        <div className="space-y-2">
                          <h4 className="font-medium leading-none">Update Status - {ac.tailNumber}</h4>
                          <p className="text-sm text-muted-foreground">Manually override fuel and maintenance status.</p>
                        </div>
                        <div className="grid gap-2">
                          <div className="grid grid-cols-3 items-center gap-4">
                            <Label htmlFor="status">Status</Label>
                            <Select
                              defaultValue={ac.serviceStatus}
                              onValueChange={(val) => updateStatus(ac.tailNumber, val)}
                            >
                              <SelectTrigger className="col-span-2 h-8">
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="in-service">In Service</SelectItem>
                                <SelectItem value="out-of-service">Out of Service</SelectItem>
                                <SelectItem value="in-maintenance">Maintenance</SelectItem>
                                <SelectItem value="aog">AOG</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="grid grid-cols-3 items-center gap-4">
                            <Label htmlFor="fuel">Fuel (lbs)</Label>
                            <Input
                              id="fuel"
                              type="number"
                              defaultValue={ac.fuelRemaining}
                              className="col-span-2 h-8"
                              onChange={(e) => updateFuel(ac.tailNumber, parseInt(e.target.value))}
                            />
                          </div>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>

                  <Badge variant="outline" className={`text-[10px] py-0.5 px-2 border h-6 ${getServiceStatusColor(ac.serviceStatus)}`}>
                    {formatStatusText(ac.serviceStatus)}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Fallback for non-compact mode (simplified)
  return <div>Full view not implemented</div>;
}
