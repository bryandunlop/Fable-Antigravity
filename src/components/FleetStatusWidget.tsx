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
      <Card className={`relative overflow-hidden ${transparent ? 'bg-transparent border-none shadow-none' : 'hover:shadow-lg transition-shadow'} ${className}`}>
        {/* Subtle SVG World Map Background */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.05] z-0">
          <svg viewBox="0 0 1000 500" className="w-full h-full object-cover">
            <path
              fill="currentColor"
              d="M141.5,123.5 L143.2,125.1 L145.8,124.6 L147.1,126.3 L149.7,126.8 L154.3,126.8 L156.4,129.5 L159.5,130.5 L164.6,134.1 L166.7,137.2 L171.3,142.3 L174.9,145.4 L178,145.4 L179.5,147 L181.1,148.5 L182.1,151.1 L183.1,152.1 L183.6,155.7 L185.7,157.3 L186.2,160.9 L186.2,164 L185.7,165 L185.7,167 L184.7,169.6 L183.1,170.6 L182.6,172.7 L182.1,173.2 L181.6,176.3 L180.6,177.3 L178.5,178.4 L177,180.4 L176.5,185.6 L175.4,188.7 L174.9,190.2 L172.9,191.2 L170.8,193.3 L169.8,195.9 L168.8,198.5 L167.2,199 L165.2,201.6 L164.6,203.1 L160.5,204.7 L157.4,206.2 L154.8,206.7 L151.8,206.7 L147.1,206.7 L143.5,210.3 L140.4,213.4 L138.9,215.5 L138.4,219.1 L139.4,220.6 L141.5,221.7 L143,223.7 L144.1,226.3 L144.1,229.4 L144.6,231 L148.2,233 L149.7,235.1 L150.2,238.2 L150.7,239.8 L153.8,241.8 L157.4,242.4 L159.5,244.4 L161,245.5 L163.6,248.6 L165.2,251.2 L166.7,252.7 L168.2,255.3 L171.3,256.3 L174.4,258.4 L174.9,261 L176.5,262 L178,264.6 L178,266.7 L176.5,268.2 L175.4,271.3 L172.4,272.4 L170.8,272.4 L165.7,272.4 L162.1,273.4 L158,275.5 L156.4,276 L154.3,278L151.3,281.1 L149.7,282.7 L145.6,285.8 L142.5,286.3 L138.9,286.3 L136.9,288.4 L136.4,289.9 L138.4,291.5 L140.4,294.1 L142,296.7 L146.1,299.8 L149.2,301.8 L152.3,303.4 L152.8,306 L150.7,308 L150.2,309.6 L150.2,311.6 L151.8,312.7 L154.3,313.7 L156.4,314.7 L159.5,315.8 L163.6,316.8 L165.7,317.8 L169.8,319.4 L171.3,322.5 L174.4,324 L176.5,325.6 L180.6,327.6 L182.1,328.7 L184.2,330.2 L185.7,331.3 L188.8,333.3 L191.9,336.4 L193.4,339 L196,341 L198,343.1 L199.6,346.2 L200.6,350.3 L201.6,353.4 L204.7,356.5 L206.8,358 L208.3,361L210.9,363.6 L212.4,366.7 L216.5,368.8 L219.6,370.8 L221.7,370.8 L225.8,370.8 L228.3,369.8 L230.9,369.8 L232.4,371.3 L233.5,373.9 L235,373.9 L238.1,373.9 L241.7,372.9 L244.2,371.9 L246.3,369.3 L247.3,368.3 L247.3,365.2 L246.3,362.6 L244.2,359.5 L243.2,358.5 L242.7,357 L243.2,354.4 L244.2,352.3 L246.8,351.3 L249.9,349.8 L253,349.3 L256.6,349.3 L259.6,348.8 L260.7,347.2 L261.2,345.1 L259.6,343.1 L258.1,340.5 L256.6,339 L255,337.4 L255.5,335.4 L258.1,334.3 L260.7,333.3 L262.2,331.8 L262.7,329.7 L261.7,327.1 L262.2,324 L262.2,321.4 L263.8,319.4 L266.9,317.3 L269.4,316.3 L272,315.3 L273.5,313.2 L274.6,310.6 L275.6,307.5 L276.6,305.5 L276.6,303.4 L274.6,301.8 L271.5,300.8 L268.4,300.3 L266.9,298.2 L265.8,295.1 L266.4,293.6 L267.4,291.5 L270,290.5 L272.5,290 L273.5,288 L273.5,285.4 L273.5,282.8 L271.5,281.3 L268.4,281.3 L263.8,283.8 L260.7,285.4 L258.1,286.4 L256.6,284.9 L256.6,282.3 L256.6,279.7 L258.1,278.2 L259.6,275.6 L259.6,273L259.6,270.4 L261.2,269.4 L264.3,269.4 L267.4,269.4 L269.4,268.3 L271,266.3 L271,263.2 L271.5,261.1 L272.5,258.5 L273.5,256.5 L276.1,255.4 L278.7,255.4 L279.7,253.9 L279.7,251.3 L277.7,249.7 L276.1,247.7 L275.6,245.1 L275.6,242 L274.6,240.4 L273.5,238.4 L272.5,236.3 L271,235.3 L268.4,236.3 L266.4,236.8 L263.8,240.4 L262.2,242 L258.6,243.5 L254.5,243.5 L250.9,243.5 L247.3,243L243.2,243 L241.7,242 L239.1,241.4 L237.1,240.4 L237.1,237.8 L238.6,236.3 L240.2,233.2 L239.1,231.1 L236.1,228.6 L233.5,226.5 L229.4,228 L227.4,228 L225.3,225.4 L225.3,222.9 L227.4,220.8 L226.3,218.2 L223.3,217.2 L221.2,216.7 L219.1,214.6 L218.1,211 L216.1,210 L213,210.5 L210.4,213.1 L207.3,215.1 L204.2,215.1 L200.6,213.6 L197.6,212.1 L196.5,209.5 L196.5,206.9 L195,203.8 L191.4,203.3 L189.3,203.8 L188.3,201.8 L187.8,198.7 L185.7,196.6 L185.7,193 L186.8,189.9 L186.8,187.3 L188.8,184.8 L191.9,183.2 L195,182.2 L198.1,180.1 L200.1,177 L200.1,174 L196.5,172.9 L193.4,170.9 L191.9,167.3 L191.9,163.7 L193.4,161.6 L194.5,158.5 L194.5,155.4 L193.4,152.9 L189.3,151.3 L185.7,149.3 L184.7,146.2 L183.1,143.6 L182.1,141.1 L180.1,139 L178,137 L176.5,134.4 L177,131.8 L179.1,128.7 L179.1,125.6 L177,123.6 L174.9,122 L172.4,120.5 L169.3,121.5 L166.2,123.6 L164.1,125.6 L162.1,125.6 L159,124.6 L156.4,122.5 L154.3,121 L151.8,121 L149.2,122.5 L146.1,122.5 L144.1,122.5 L141.5,123.5 Z M268.9,132.3 L271,133.3 L274.6,134.4 L276.1,135.9 L275.6,138 L275.6,141.1 L274.6,143.1 L273.5,145.7 L275.1,146.7 L277.7,145.2 L280.8,143.1 L283.3,141.1 L285.9,141.1 L289,142.1 L290.5,144.1 L290,147.2 L288,148.8 L285.4,149.8 L282.8,149.8 L281.3,151.3 L280.8,154.4 L282.3,156.5 L285.4,158.5 L288,160.1 L291.6,161.1 L295.2,160.6 L298.8,163.7 L301.9,165.7 L302.9,168.3 L301.4,171.4 L301.4,174 L301.4,176 L300.9,178.6 L299.8,181.2 L301.4,183.2 L302.9,183.8 L305,182.7 L307.6,180.7 L308.6,178.6 L310.6,177 L313.2,175.5 L316.3,174.4 L318.9,174.4 L322,174.4 L323.5,172.4 L325.6,170.8 L328.6,169.8 L330.2,167.7 L331.7,165.2 L334.3,165.2 L337.4,166.7 L339.4,168.8 L339.9,171.9 L342,173.4 L344.6,175 L346.6,177.5 L348.7,179.6 L349.7,181.7 L352.3,184.2 L354.3,186.8 L355.4,188.4 L357.9,188.9 L361,189.9 L362.5,191.5 L363.6,193.5 L365.1,195.1 L366.1,198.2 L364.6,200.7 L362,201.8 L359.5,202.8 L357.9,204.9 L358.4,208 L360.5,210 L362.5,212.6 L365.6,215.2 L368.2,217.2 L370.3,219.8 L369.2,222.9 L369.2,225.5 L368.7,228.6 L369.2,231.1 L370.8,233.2 L373.9,233.2 L376.4,233.2 L379,234.2 L381.6,236.3 L384.7,237.3 L386.2,239.9 L388.3,241.9 L390.8,244.5 L391.9,247.1 L393.4,249.7 L394.4,252.8 L395,255.4 L396.5,257.4 L398.6,260L400.6,262.1 L403.7,263.6 L406.8,266.2 L409.4,267.7 L412,269.8 L414.5,271.9 L417.6,273.4 L420.2,274.4 L422.3,277L424.3,280.1 L426.9,282.7 L429.5,283.7 L433.1,283.7 L435.6,283.7 L438.7,284.2 L440.8,284.2 L442.3,282.7 L443.9,280.1 L442.8,277.5 L442.8,274.4 L440.8,271.9 L442.3,269.8 L444.9,268.8 L448,270.4 L450.6,272.4 L451.6,275.5 L453.7,277.5 L456.2,278.6 L458.8,277 L461.9,275 L464,272.9 L465.5,269.8 L465,266.7 L461.4,264.7 L459.3,262.1 L456.2,260.6 L455.2,257.5 L458.3,256 L461.4,258.5 L464.5,259 L467.5,259 L471.1,257L473.2,253.9 L473.2,250.8 L475.2,248.8 L477.8,249.3 L479.9,249.8 L482.4,251.9 L484,254.5 L484,257 L485.5,259.6 L488.1,260.6 L491.2,260.6 L493.8,261.7 L496.3,263.2 L498.4,266.3 L498.9,269.4 L499.9,272.4 L498.9,275 L496.8,276.6 L494.3,278.1 L493.8,280.7 L495.8,282.2 L498.9,280.7 L500.4,278.6 L503,277.6 L506.1,279.7 L509.2,281.2 L511.2,284.3 L513.8,285.3 L516.4,286.9 L519,287.4 L522.1,288.9 L525.6,289.4 L528.7,291.5 L530.8,294.6 L530.3,297.1 L531.3,299.7 L533.9,301.8 L536,303.3 L537.5,304.9 L537.5,307.4 L538,310.5 L540.6,311.6 L543.2,311.6 L545.7,311.6 L547.8,313.1 L548.8,315.7 L550.9,315.7 L552.4,313.1 L550.9,310L549.3,307.4 L548.3,304.9 L546.8,302.3 L547.3,299.7 L546.8,296.6 L545.7,294.1 L543.7,292 L543.7,288.9 L544.7,286.3 L547.3,285.3 L550.4,284.3 L552.4,282.2 L554.5,280.1 L554.5,277 L553,274.4 L550.4,272.4 L548.8,269.8 L549.3,266.7 L552.4,265.7 L555,264.6 L558.1,263.1 L561.2,264.1 L563.8,265.7 L566.9,265.7 L569.4,263.6 L570.5,261 L572.5,258.5 L575.1,260.5 L576.7,262.6 L579.8,263.1 L582.4,263.1 L584.4,261 L584.4,258.5 L582.4,256.4 L580.8,253.8 L580.8,250.7 L582.9,248.6 L585.5,246.6 L588.6,245 L591.2,242.9 L592.7,239.8 L592.7,236.7 L594.3,234.2 L596.3,232.1 L599.4,232.1 L601,234.2 L601.5,237.3 L604.1,238.8 L606.7,239.3 L609.3,237.3 L609.8,234.2 L608.2,231.6 L605.1,229.5 L602.5,228 L599.4,226.4 L596.3,225.4 L594.3,223.3 L595.3,220.2 L596.3,217.1 L598.9,215.1 L601,213 L601.5,209.9 L601.5,206.8 L603,204.2 L605.1,202.1 L608.2,201.1 L611.3,201.1 L614.4,201.1 L616.4,202.6 L619,203.7 L621.6,204.2 L623.7,204.2 L625.2,201.6 L623.7,199.5 L621.6,198 L618.5,197.4 L615.9,195.9 L615.4,192.8 L615.4,189.7 L615.9,186.6 L617.9,184.5 L620.5,185 L622.6,186.6 L625.2,187.6 L626.7,185.5 L629.3,184 L631.9,181.9 L631.4,179.3 L628.8,177.7 L627.2,175.1 L625.2,172 L622.6,170.5 L620.5,168.4 L618.5,169.4 L615.4,169.9 L612.3,171.5 L609.2,171.5 L606.1,171.5 L603,169.9 L600.4,168.4 L596.8,168.4 L593.7,169.4 L590.6,171.5 L587.5,172.5 L583.8,172.5 L580.2,171.5 L577.1,169.9 L574,168.4 L570.9,166.3 L569.4,163.7 L567.8,161.1 L566.2,158L563.1,157 L561.6,155 L559.5,152.9 L556.9,155 L554.8,157.5 L552.3,158.6 L549.7,160.1 L548.1,162.2 L546.6,164.8 L543,165.8 L540.4,167.4 L537.3,166.3 L534.2,165.8 L531.1,165.8 L528.5,164.3 L527,161.7 L525.4,159.1 L522.3,158.6 L520.2,156.5 L518.2,154.4 L515.6,152.9 L513,151.3 L510.9,149.3 L509.4,146.7 L508.3,143.6 L508.3,140.4 L507.8,137.3 L505.7,135.3 L502.6,134.2 L499.5,133.2 L496.4,133.2 L492.8,133.2 L489.7,134.2 L487.6,135.8 L485,137.9 L481.9,138.9 L478.8,137.9 L475.2,137.9 L472.1,139.4 L469,141.5 L465.4,142.5 L462.3,142.5 L459.1,142.5 L456,140.4 L453.4,138.4 L450.3,137.9 L446.7,137.9 L444.1,139.9 L443.1,142.5 L443.6,145.6 L440.5,147.2 L437.4,148.8 L434.3,149.3 L431.1,147.7 L429.1,146.2 L429.6,143.1 L426.5,142.5 L424.4,140.4 L422.3,137.9 L419.7,136.3 L416.6,136.8 L414.5,138.9 L411.9,140.4 L409.8,142.5 L406.2,142.5 L403.6,141 L401.6,138.4 L400.5,135.3 L398.4,133.2 L396.4,131.2 L393.3,130.6 L389.6,130.6 L387.6,128 L385,126.5 L382.4,124.9 L378.8,124.9 L376.7,122.9 L374.1,121.3 L371,119.2 L367.9,119.2 L364.8,121.3 L361.6,121.3 L359.1,118.7 L357.5,116.1 L356.5,113.5 L353.9,112 L350.8,111 L347.7,110.4 L344.6,108.9 L341.5,108.9 L338.4,106.3 L335.8,104.2 L332.6,105.3 L330.1,106.8 L328,107.9 L325.4,106.8 L322.8,105.8 L320.7,103.7 L318.1,102.7 L315,101.6 L311.9,101.6 L309.8,99 L306.7,97.5 L303.6,97.5 L301.5,99.6 L298.4,98.5 L296.3,97 L293.7,98L291.1,99 L288.5,100.6 L286.4,103.2 L285.4,106.3 L285.4,109.4 L283.3,111.5 L280.2,112 L278.1,112.5 L276.1,114.1 L274,116.7 L270.9,117.7 L268.8,119.8 L265.7,121.9 L263.1,123.4 L260,123.4 L256.9,122.9 L253.8,123.9 L250.7,126 L248.6,128.6 L247.1,131.2 L246,133.8 L246.5,136.9 L243.4,136.9 L240.3,135.9 L237.2,135.9 L234.6,136.9 L231.5,136.9 L228.3,136.9 L225.2,135.4 L222.1,133.8 L220.6,130.7 L220.6,127.6 L219.5,124.5 L217.4,122.4 L214.3,121.4 L211.2,120.9 L208.1,120.9 L206,119.4 L204.5,116.8 L203.4,114.2 L201.3,113.1 L198.2,113.1 L196.1,114.2 L193.5,115.7 L190.4,115.7 L187.3,115.7 L184.2,114.7 L181.6,113.1 L178.5,111.6 L175.4,111.6 L172.9,113.1 L169.8,114.2 L166.7,114.2 L163.6,114.2 L160.5,115.2 L158.4,117.8 L154.8,118.8 L151.7,118.8 L149.6,120.4 L145.4,121.4 L142.3,121.4 L141.5,123.5 Z M969.8,409.7 L969.3,412.3 L966.7,414.4 L964.1,415.4 L961.5,416.5 L958.4,417 L955.3,418.5 L952.7,420.6 L949.6,419.6 L946.5,417.5 L944.9,414.9 L942.3,411.8 L940.8,408.7 L938.7,406.6 L941.3,405 L944.4,403.5 L947.5,400.9 L949.1,398.3 L949.1,395.2 L949.6,392.1 L952.7,390.5 L955.8,389.5 L958.9,387.9 L961.5,389 L962.6,391.6 L962.6,394.7 L963.6,397.3 L965.7,398.8 L968.3,400.4 L970.3,403.5 L971.4,406.6 L969.8,409.7 Z M829.4,360 L831.5,362L835.1,363.6 L833.6,366.7 L833.6,369.8 L831.5,372.4 L828.9,375.5 L825.8,377.1 L823.2,375.5 L821.1,373.4 L818.5,371.3 L815.9,369.8 L818.5,367.7 L819.6,364.6 L822.7,363.1 L824.7,361 L826.8,359.4 L829.4,360 Z M932,159.1 L931.5,162.2 L928.9,164.8 L926.3,165.8 L923.7,163.7 L922.7,160.6 L921.6,157.5 L921.6,154.4 L923.2,151.8 L925.8,150.8 L928.4,149.8 L930.5,151.3 L932,153.9 L933.1,156.5 L932,159.1 Z M904,152.9 L903,156 L900.4,159.1 L897.8,159.1 L895.7,156.5 L897.8,153.9 L899.3,151.3 L901.9,150.3 L904.5,150.3 L904,152.9 Z M814.9,112.5 L814.4,115.6 L812.8,118.7 L810.2,120.3 L807.1,119.8 L805,116.7 L805.5,113.6 L807.6,111 L810.7,109.9 L813.9,110.4 L814.9,112.5 Z M983.8,103.7 L981.2,105.3 L977.1,106.8 L974.5,107.3 L971.9,105.8 L969.8,103.2 L968.3,100.6 L968.3,97.5 L969.8,94.9 L973.5,93.4 L975.5,95.5 L977.6,98.1 L980.2,100.1 L982.8,102.2 L983.8,103.7 Z M789.5,88.7 L787.9,91.8 L786.4,94.4 L784.8,97 L782.2,96 L780.2,93.4 L780.2,90.3 L781.2,87.2 L783.3,85.1 L785.4,85.1 L787.9,86.1 L789.5,88.7 Z M319.1,64.8 L320.2,67.4 L318.1,70L315,70L313.4,67.4 L313.4,64.8 L316,63.3 L319.1,64.8 Z"></path>
          </svg>
        </div>

        <CardHeader className="px-0 pt-0 pb-4 relative z-10">
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
