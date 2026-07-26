import { useState, useEffect, useCallback } from 'react';
import { satcomPositions, satcomStatuses } from '../../services/todaysOpsMock';

export interface AircraftPosition {
  tailNumber: string;
  callSign?: string;
  latitude: number;
  longitude: number;
  altitude: number; // feet
  groundSpeed: number; // knots
  heading: number; // degrees
  verticalSpeed: number; // feet per minute
  timestamp: string;
  flightPhase: 'Parked' | 'Taxiing' | 'Takeoff' | 'Climb' | 'Cruise' | 'Descent' | 'Approach' | 'Landing';
  departureAirport?: string;
  arrivalAirport?: string;
  estimatedArrival?: string;
  fuelRemaining?: number; // pounds
  flightTime?: number; // minutes
}

export interface AircraftStatus {
  tailNumber: string;
  isOnline: boolean;
  lastContact: string;
  satcomStatus: 'Connected' | 'Disconnected' | 'Limited' | 'Maintenance';
  systemHealth: {
    engine: 'Normal' | 'Caution' | 'Warning';
    hydraulics: 'Normal' | 'Caution' | 'Warning';
    electrical: 'Normal' | 'Caution' | 'Warning';
    avionics: 'Normal' | 'Caution' | 'Warning';
  };
  alerts: AircraftAlert[];
  nextScheduledFlight?: string;
  currentFlightPlan?: string;
}

export interface AircraftAlert {
  id: string;
  type: 'System' | 'Maintenance' | 'Weather' | 'ATC' | 'Fuel';
  severity: 'Info' | 'Caution' | 'Warning' | 'Emergency';
  message: string;
  timestamp: string;
  acknowledged: boolean;
}

export interface FleetSummary {
  totalAircraft: number;
  activeFlights: number;
  parkedAircraft: number;
  maintenanceAircraft: number;
  systemAlerts: number;
  avgFuelLevel: number;
  onlineAircraft: number;
}

interface UseSatcomDirectOptions {
  refreshInterval?: number;
  autoRefresh?: boolean;
}

export const useSatcomDirect = ({ refreshInterval = 30000, autoRefresh = true }: UseSatcomDirectOptions = {}) => {
  const [aircraftPositions, setAircraftPositions] = useState<AircraftPosition[]>([]);
  const [aircraftStatuses, setAircraftStatuses] = useState<AircraftStatus[]>([]);
  const [fleetSummary, setFleetSummary] = useState<FleetSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Mock data — in a real app these are API calls. Sourced from todaysOpsMock so
  // positions stay coherent with the flights list and NAS analysis.
  const generateMockData = useCallback(() => {
    const positions = satcomPositions();
    const statuses = satcomStatuses();
    const summary: FleetSummary = {
      totalAircraft: positions.length,
      activeFlights: positions.filter(p => p.flightPhase !== 'Parked').length,
      parkedAircraft: positions.filter(p => p.flightPhase === 'Parked').length,
      maintenanceAircraft: statuses.filter(s => s.satcomStatus === 'Maintenance').length,
      systemAlerts: statuses.reduce((n, s) => n + s.alerts.filter(a => !a.acknowledged).length, 0),
      avgFuelLevel: 75,
      onlineAircraft: statuses.filter(s => s.isOnline).length,
    };
    return { positions, statuses, summary };
  }, []);

  const fetchSatcomData = useCallback(async (isInitial = false) => {
    try {
      if (isInitial) {
        setLoading(true);
      } else {
        setIsRefreshing(true);
      }
      setError(null);

      // Simulate API call delay - reduced for better UX
      await new Promise(resolve => setTimeout(resolve, 500));

      const mockData = generateMockData();

      setAircraftPositions(mockData.positions);
      setAircraftStatuses(mockData.statuses);
      setFleetSummary(mockData.summary);
      setLastUpdate(new Date());

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch Satcom data');
      console.error('Satcom Direct API error:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [generateMockData]);

  const acknowledgeAlert = useCallback(async (tailNumber: string, alertId: string) => {
    try {
      // In real app, make API call to acknowledge alert
      // await fetch(`/api/satcom/alerts/${alertId}/acknowledge`, { method: 'POST' });

      setAircraftStatuses(prev =>
        prev.map(status => {
          if (status.tailNumber === tailNumber) {
            return {
              ...status,
              alerts: status.alerts.map(alert =>
                alert.id === alertId ? { ...alert, acknowledged: true } : alert
              )
            };
          }
          return status;
        })
      );
    } catch (err) {
      console.error('Failed to acknowledge alert:', err);
    }
  }, []);

  const getAircraftByTailNumber = useCallback((tailNumber: string) => {
    const position = aircraftPositions.find(pos => pos.tailNumber === tailNumber);
    const status = aircraftStatuses.find(stat => stat.tailNumber === tailNumber);
    return { position, status };
  }, [aircraftPositions, aircraftStatuses]);

  const getActiveFlights = useCallback(() => {
    return aircraftPositions.filter(aircraft =>
      aircraft.flightPhase !== 'Parked' && aircraft.callSign
    );
  }, [aircraftPositions]);

  const getSystemAlerts = useCallback(() => {
    return aircraftStatuses.flatMap(status =>
      status.alerts.filter(alert => !alert.acknowledged)
    );
  }, [aircraftStatuses]);

  // Initial fetch
  useEffect(() => {
    fetchSatcomData(true);
  }, [fetchSatcomData]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => fetchSatcomData(false), refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchSatcomData]);

  return {
    aircraftPositions,
    aircraftStatuses,
    fleetSummary,
    loading,
    isRefreshing,
    error,
    lastUpdate,
    refetch: () => fetchSatcomData(false),
    acknowledgeAlert,
    getAircraftByTailNumber,
    getActiveFlights,
    getSystemAlerts
  };
};
