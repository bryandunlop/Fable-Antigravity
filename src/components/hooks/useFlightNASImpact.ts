import { useState, useEffect, useCallback } from 'react';
import { TODAY_LEGS } from '../../services/todaysOpsMock';

interface Flight {
  id: string;
  departure: string;
  arrival: string;
  route: string;
  status: string;
  aircraft: string;
  departureAirport: string;
  arrivalAirport: string;
  scheduledDeparture: Date;
  scheduledArrival: Date;
  pilots?: string[]; // NEW: Array of assigned pilot names
}

interface NASImpact {
  flightId: string;
  impactType: 'ground_stop' | 'ground_delay' | 'flow_program' | 'facility_outage';
  affectedAirport: string;
  severity: 'High' | 'Medium' | 'Low';
  reason: string;
  estimatedDelay?: number;
  details: string;
  actionRequired: boolean;
  recommendation: string;
}

export interface NASData {
  groundStops: {
    airport: string;
    reason: string;
    startTime: string;
    endTime?: string;
    affectedFlights: number;
    severity: 'High' | 'Medium' | 'Low';
  }[];
  groundDelays: {
    airport: string;
    averageDelay: number;
    reason: string;
    trend: 'Decreasing' | 'Stable' | 'Increasing';
    affectedFlights: number;
  }[];
  airspaceFlowPrograms: {
    name: string;
    type: 'Ground Delay Program' | 'Airspace Flow Program';
    affectedAirports: string[];
    reason: string;
    startTime: string;
    estimatedEndTime: string;
    impact: 'High' | 'Medium' | 'Low';
  }[];
  facilityOutages: {
    facility: string;
    type: 'Radar' | 'Comms' | 'Nav';
    status: 'Limited' | 'Out of Service';
    impact: string;
    startTime: string;
    affectedAirports: string[];
  }[];
}

interface FlightImpactData {
  impactedFlights: (Flight & { impacts: NASImpact[] })[];
  totalImpacted: number;
  highSeverityCount: number;
  estimatedTotalDelay: number;
  nasData?: NASData; // Added field
}

export const useFlightNASImpact = () => {
  const [impactData, setImpactData] = useState<FlightImpactData>({
    impactedFlights: [],
    totalImpacted: 0,
    highSeverityCount: 0,
    estimatedTotalDelay: 0
  });
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Our real flights today, from todaysOpsMock. Airport codes are IATA (LUK/MIA/TEB)
  // to match the NAS event codes below.
  const getScheduledFlights = (): Flight[] => {
    return TODAY_LEGS.map(leg => ({
      id: leg.id,
      departure: leg.schedDep,
      arrival: leg.schedArr,
      route: `${leg.depIata} → ${leg.arrIata}`,
      status: leg.status,
      aircraft: leg.tail,
      departureAirport: leg.depIata,
      arrivalAirport: leg.arrIata,
      scheduledDeparture: new Date(),
      scheduledArrival: new Date(),
    }));
  };

  // Mock NAS data - this would normally come from the NAS Status service. Airports
  // are chosen so some events touch our own flights (TEB via N6PG, MIA via N5PG/N3PG)
  // and the rest are national noise (JFK/ORD/LGA/EWR), making "affect you" real.
  const getNASData = () => {
    return {
      groundStops: [
        {
          airport: 'TEB',
          reason: 'Thunderstorms in area',
          startTime: '10:30',
          endTime: '12:15',
          affectedFlights: 31,
          severity: 'High' as const
        },
        {
          airport: 'EWR',
          reason: 'ATC staffing shortage',
          startTime: '09:15',
          affectedFlights: 23,
          severity: 'Medium' as const
        }
      ],
      groundDelays: [
        {
          airport: 'MIA',
          averageDelay: 40,
          reason: 'Volume/Weather',
          trend: 'Increasing' as const,
          affectedFlights: 62
        },
        {
          airport: 'JFK',
          averageDelay: 45,
          reason: 'Volume/Weather',
          trend: 'Decreasing' as const,
          affectedFlights: 156
        },
        {
          airport: 'ORD',
          averageDelay: 67,
          reason: 'Weather/Wind',
          trend: 'Increasing' as const,
          affectedFlights: 203
        },
        {
          airport: 'LGA',
          averageDelay: 28,
          reason: 'Volume',
          trend: 'Stable' as const,
          affectedFlights: 88
        }
      ],
      airspaceFlowPrograms: [
        {
          name: 'East Coast GDP',
          type: 'Ground Delay Program' as const,
          affectedAirports: ['JFK', 'LGA', 'EWR', 'PHL', 'DCA'],
          reason: 'Thunderstorm activity in NY/NJ area',
          startTime: '13:00',
          estimatedEndTime: '18:00',
          impact: 'High' as const
        },
        {
          name: 'Midwest AFP',
          type: 'Airspace Flow Program' as const,
          affectedAirports: ['ORD', 'MDW', 'MKE'],
          reason: 'Convective activity across the Great Lakes',
          startTime: '11:30',
          estimatedEndTime: '15:30',
          impact: 'Medium' as const
        }
      ],
      facilityOutages: [
        {
          facility: 'ZNY ARTCC Sector 12',
          type: 'Radar' as const,
          status: 'Limited' as 'Limited' | 'Out of Service',
          impact: 'Reduced capacity in NY approach airspace',
          startTime: '12:45',
          affectedAirports: ['JFK', 'LGA', 'EWR']
        }
      ]
    };
  };

  const analyzeFlightImpacts = useCallback(() => {
    const flights = getScheduledFlights();
    const nasData = getNASData();
    const impactedFlights: (Flight & { impacts: NASImpact[] })[] = [];

    flights.forEach(flight => {
      const impacts: NASImpact[] = [];

      // Check ground stops
      nasData.groundStops.forEach(stop => {
        if (flight.departureAirport === stop.airport || flight.arrivalAirport === stop.airport) {
          impacts.push({
            flightId: flight.id,
            impactType: 'ground_stop',
            affectedAirport: stop.airport,
            severity: stop.severity,
            reason: stop.reason,
            details: `Ground stop at ${stop.airport} from ${stop.startTime}${stop.endTime ? ` to ${stop.endTime}` : ''}`,
            actionRequired: true,
            recommendation: `Contact passengers immediately. Consider alternate airports or delay departure.`
          });
        }
      });

      // Check ground delays
      nasData.groundDelays.forEach(delay => {
        if (flight.departureAirport === delay.airport || flight.arrivalAirport === delay.airport) {
          const severity = delay.averageDelay >= 60 ? 'High' : delay.averageDelay >= 30 ? 'Medium' : 'Low';
          impacts.push({
            flightId: flight.id,
            impactType: 'ground_delay',
            affectedAirport: delay.airport,
            severity,
            reason: delay.reason,
            estimatedDelay: delay.averageDelay,
            details: `Average delay of ${delay.averageDelay} minutes at ${delay.airport}`,
            actionRequired: delay.averageDelay >= 30,
            recommendation: delay.averageDelay >= 60
              ? `Significant delays expected. Consider passenger notifications and catering adjustments.`
              : `Monitor delays and update passengers as needed.`
          });
        }
      });

      // Check flow programs
      nasData.airspaceFlowPrograms.forEach(program => {
        if (program.affectedAirports.includes(flight.departureAirport) ||
          program.affectedAirports.includes(flight.arrivalAirport)) {
          impacts.push({
            flightId: flight.id,
            impactType: 'flow_program',
            affectedAirport: program.affectedAirports.includes(flight.departureAirport)
              ? flight.departureAirport
              : flight.arrivalAirport,
            severity: program.impact,
            reason: program.reason,
            details: `${program.name}: ${program.reason}`,
            actionRequired: program.impact === 'High',
            recommendation: program.impact === 'High'
              ? `High impact flow program active. Expect significant delays and coordinate with dispatch.`
              : `Flow program active. Monitor for potential delays.`
          });
        }
      });

      // Check facility outages
      nasData.facilityOutages.forEach(outage => {
        if (outage.affectedAirports?.includes(flight.departureAirport) ||
          outage.affectedAirports?.includes(flight.arrivalAirport)) {
          impacts.push({
            flightId: flight.id,
            impactType: 'facility_outage',
            affectedAirport: outage.affectedAirports.includes(flight.departureAirport)
              ? flight.departureAirport
              : flight.arrivalAirport,
            severity: outage.status === 'Out of Service' ? 'High' : 'Medium',
            reason: `${outage.type} system ${outage.status.toLowerCase()}`,
            details: `${outage.facility}: ${outage.impact}`,
            actionRequired: outage.status === 'Out of Service',
            recommendation: outage.status === 'Out of Service'
              ? `Critical system outage. Coordinate with ATC and consider alternate routing.`
              : `Limited system capability. Monitor for potential impacts.`
          });
        }
      });

      if (impacts.length > 0) {
        impactedFlights.push({ ...flight, impacts });
      }
    });

    // Calculate summary statistics
    const totalImpacted = impactedFlights.length;
    const highSeverityCount = impactedFlights.filter(flight =>
      flight.impacts.some(impact => impact.severity === 'High')
    ).length;
    const estimatedTotalDelay = impactedFlights.reduce((total, flight) => {
      const maxDelay = Math.max(...flight.impacts
        .filter(impact => impact.estimatedDelay)
        .map(impact => impact.estimatedDelay || 0));
      return total + (maxDelay || 0);
    }, 0);

    return {
      impactedFlights,
      totalImpacted,
      highSeverityCount,
      estimatedTotalDelay,
      nasData // Return raw data
    };
  }, []);

  const fetchFlightImpacts = useCallback(async (isInitial = false) => {
    try {
      if (isInitial) {
        setLoading(true);
      } else {
        setIsRefreshing(true);
      }
      setError(null);

      // Simulate API call delay - reduced
      await new Promise(resolve => setTimeout(resolve, 500));

      const impacts = analyzeFlightImpacts();
      setImpactData(impacts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze flight impacts');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [analyzeFlightImpacts]);

  useEffect(() => {
    fetchFlightImpacts(true);

    // Refresh every 5 minutes
    const interval = setInterval(() => fetchFlightImpacts(false), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchFlightImpacts]);

  return {
    impactData,
    loading,
    isRefreshing,
    error,
    refetch: () => fetchFlightImpacts(false)
  };
};

/**
 * Helper function to get impacted flights for a specific pilot
 */
export function getImpactedFlightsForPilot(
  impactData: ReturnType<typeof useFlightNASImpact>['impactData'],
  pilotName: string
) {
  return impactData.impactedFlights.filter(flight =>
    flight.pilots?.includes(pilotName)
  );
}