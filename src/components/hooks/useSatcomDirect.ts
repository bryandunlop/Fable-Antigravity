import { useState, useEffect, useCallback } from 'react';

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

  // Mock data generation for demonstration - in real app this would be API calls
  const generateMockData = useCallback(() => {
    const mockPositions: AircraftPosition[] = [
      {
        tailNumber: 'N1PG',
        callSign: 'FLT001',
        latitude: 40.7589,
        longitude: -73.7004, // Near JFK
        altitude: 35000,
        groundSpeed: 485,
        heading: 270,
        verticalSpeed: 0,
        timestamp: new Date().toISOString(),
        flightPhase: 'Cruise',
        departureAirport: 'LAX',
        arrivalAirport: 'JFK',
        estimatedArrival: '2025-02-05T11:30:00Z',
        fuelRemaining: 2400,
        flightTime: 240
      },
      {
        tailNumber: 'N5PG',
        callSign: 'FLT002',
        latitude: 25.7959,
        longitude: -80.2870, // Near MIA
        altitude: 0,
        groundSpeed: 0,
        heading: 90,
        verticalSpeed: 0,
        timestamp: new Date().toISOString(),
        flightPhase: 'Parked',
        departureAirport: 'JFK',
        arrivalAirport: 'MIA',
        fuelRemaining: 3200,
        flightTime: 0
      },
      {
        tailNumber: 'N2PG',
        callSign: '',
        latitude: 25.7959,
        longitude: -80.2870, // At MIA
        altitude: 0,
        groundSpeed: 0,
        heading: 180,
        verticalSpeed: 0,
        timestamp: new Date().toISOString(),
        flightPhase: 'Parked',
        fuelRemaining: 1800,
        flightTime: 0
      },
      {
        tailNumber: 'N6PG',
        callSign: 'FLT004',
        latitude: 41.9742,
        longitude: -87.9073, // Near ORD
        altitude: 15000,
        groundSpeed: 320,
        heading: 95,
        verticalSpeed: -1200,
        timestamp: new Date().toISOString(),
        flightPhase: 'Descent',
        departureAirport: 'ORD',
        arrivalAirport: 'LGA',
        estimatedArrival: '2025-02-05T15:30:00Z',
        fuelRemaining: 1600,
        flightTime: 180
      }
    ];

    const mockStatuses: AircraftStatus[] = [
      {
        tailNumber: 'N1PG',
        isOnline: true,
        lastContact: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
        satcomStatus: 'Connected',
        systemHealth: {
          engine: 'Normal',
          hydraulics: 'Normal',
          electrical: 'Normal',
          avionics: 'Normal'
        },
        alerts: [],
        currentFlightPlan: 'LAX-JFK'
      },
      {
        tailNumber: 'N5PG',
        isOnline: true,
        lastContact: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        satcomStatus: 'Connected',
        systemHealth: {
          engine: 'Normal',
          hydraulics: 'Caution',
          electrical: 'Normal',
          avionics: 'Normal'
        },
        alerts: [
          {
            id: 'ALERT001',
            type: 'System',
            severity: 'Caution',
            message: 'Hydraulic pressure low - System B',
            timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
            acknowledged: false
          }
        ],
        nextScheduledFlight: 'FLT002 - JFK to MIA at 14:15'
      },
      {
        tailNumber: 'N2PG',
        isOnline: false,
        lastContact: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        satcomStatus: 'Maintenance',
        systemHealth: {
          engine: 'Warning',
          hydraulics: 'Normal',
          electrical: 'Normal',
          avionics: 'Normal'
        },
        alerts: [
          {
            id: 'ALERT002',
            type: 'Maintenance',
            severity: 'Warning',
            message: 'Engine oil temperature high - scheduled maintenance required',
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            acknowledged: true
          }
        ]
      },
      {
        tailNumber: 'N6PG',
        isOnline: true,
        lastContact: new Date(Date.now() - 1 * 60 * 1000).toISOString(),
        satcomStatus: 'Connected',
        systemHealth: {
          engine: 'Normal',
          hydraulics: 'Normal',
          electrical: 'Normal',
          avionics: 'Normal'
        },
        alerts: [],
        currentFlightPlan: 'ORD-LGA'
      }
    ];

    const mockFleetSummary: FleetSummary = {
      totalAircraft: 4,
      activeFlights: 3,
      parkedAircraft: 2,
      maintenanceAircraft: 1,
      systemAlerts: 2,
      avgFuelLevel: 75,
      onlineAircraft: 4
    };

    return {
      positions: mockPositions,
      statuses: mockStatuses,
      summary: mockFleetSummary
    };
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