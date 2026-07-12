import { useMemo } from 'react';
import { readFleetAirworthiness } from '../tech-log/bridge';
import type { FleetAirworthinessEntry } from '../tech-log/bridge';
import { useSatcomDirect } from './useSatcomDirect';
import type { AircraftPosition, AircraftStatus as SatcomAircraftStatus } from './useSatcomDirect';

export type FlightStatus = 'in-flight' | 'taxi' | 'on-ground' | 'parked' | 'unknown';

export interface UnifiedFleetAircraft {
  tailNumber: string;
  model: string;
  airworthiness: FleetAirworthinessEntry;
  position?: AircraftPosition;
  satcom?: SatcomAircraftStatus;
  flightStatus: FlightStatus;
  location?: string;
  fuelRemaining?: number;
  unacknowledgedAlerts: number;
}

const MODEL_LABEL: Record<string, string> = {
  G650ER: 'Gulfstream G650ER',
  G500: 'Gulfstream G500',
  G800: 'Gulfstream G800',
};

function toFlightStatus(position?: AircraftPosition): FlightStatus {
  if (!position) return 'unknown';
  switch (position.flightPhase) {
    case 'Cruise':
    case 'Climb':
    case 'Descent':
      return 'in-flight';
    case 'Taxiing':
      return 'taxi';
    case 'Takeoff':
    case 'Approach':
    case 'Landing':
      return 'on-ground';
    default:
      return 'parked';
  }
}

function toLocation(position?: AircraftPosition): string | undefined {
  if (!position) return undefined;
  if (position.flightPhase === 'Parked') return `${position.departureAirport || 'Unknown'} - Ramp`;
  if (position.departureAirport && position.arrivalAirport) {
    return `En Route ${position.departureAirport}-${position.arrivalAirport}`;
  }
  return 'In Flight';
}

/**
 * One airworthiness truth for fleet surfaces: roster + GREEN/AMBER/RED come from the
 * tech-log derived serviceability projection (via bridge), never from satcom
 * connectivity. Satcom only overlays position, flight phase, fuel, and alerts.
 */
export function useUnifiedFleetStatus() {
  const { aircraftPositions, aircraftStatuses, loading, isRefreshing, error, lastUpdate } = useSatcomDirect();

  const airworthiness = useMemo(
    () => readFleetAirworthiness(new Date().toISOString()),
    // Re-derive on each satcom refresh tick so releases/rectifications surface within a cycle.
    [lastUpdate]
  );

  const fleet = useMemo<UnifiedFleetAircraft[]>(() => {
    return airworthiness.map(entry => {
      const position = aircraftPositions.find(p => p.tailNumber === entry.tailNumber);
      const satcom = aircraftStatuses.find(s => s.tailNumber === entry.tailNumber);
      return {
        tailNumber: entry.tailNumber,
        model: MODEL_LABEL[entry.type] ?? entry.type,
        airworthiness: entry,
        position,
        satcom,
        flightStatus: toFlightStatus(position),
        location: toLocation(position),
        fuelRemaining: position?.fuelRemaining,
        unacknowledgedAlerts: satcom?.alerts.filter(a => !a.acknowledged).length ?? 0,
      };
    });
  }, [airworthiness, aircraftPositions, aircraftStatuses]);

  const dispatchable = useMemo(
    () => fleet.filter(a => a.airworthiness.status !== 'RED').length,
    [fleet]
  );
  const inFlight = useMemo(
    () => fleet.filter(a => a.flightStatus === 'in-flight').length,
    [fleet]
  );

  return { fleet, dispatchable, inFlight, satcomLoading: loading, satcomError: error, isRefreshing };
}
