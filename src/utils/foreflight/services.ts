// ==================== FOREFLIGHT INTEGRATION SERVICES ====================

import { ForeFlightAPIClient } from './client';
import {
  ForeFlightFlightPlan,
  ForeFlightLogbookEntry,
  ForeFlightSquawk,
  ForeFlightWeightBalance,
  ForeFlightFile,
  AirportEvaluation
} from './types';

// ==================== FRAT AUTO-POPULATION ====================

export interface FRATFormData {
  route: string;
  departure: string;
  destination: string;
  alternate?: string;
  departureTime: string;
  arrivalTime: string;
  
  // Weather scores
  departureWeatherScore: number;
  destinationWeatherScore: number;
  enrouteWeatherScore: number;
  
  // Calculated risk factors
  crosswindComponent: number;
  visibilityScore: number;
  ceilingScore: number;
  icingRisk: number;
  turbulenceRisk: number;
  convectionRisk: number;
  
  // Auto-filled from flight plan
  tailNumber: string;
  passengers: number;
  fuelPlanned: number;
  
  // NOTAMs/TFRs
  criticalNotams: string[];
  activeTFRs: string[];
}

export async function autoPopulateFRAT(
  client: ForeFlightAPIClient,
  flightPlanId: string
): Promise<FRATFormData> {
  const response = await client.getFlightPlan(flightPlanId);
  
  if (!response.success || !response.data) {
    throw new Error('Failed to fetch flight plan');
  }
  
  const flightPlan = response.data;
  const wb = flightPlan.weatherBriefing;
  
  // Calculate weather scores (0-100, higher = more risk)
  const departureWeatherScore = calculateWeatherRisk(wb?.departure);
  const destinationWeatherScore = calculateWeatherRisk(wb?.destination);
  const enrouteWeatherScore = calculateEnrouteRisk(wb?.enroute);
  
  // Calculate crosswind component
  const crosswindComponent = wb?.departure ? 
    calculateCrosswind(wb.departure.windSpeed || 0, wb.departure.windDirection || 0, 90) : 0; // Assuming runway 09
  
  // Extract critical NOTAMs
  const criticalNotams = (flightPlan.notams || [])
    .filter(n => n.critical)
    .map(n => n.text);
  
  // Extract active TFRs
  const activeTFRs = (flightPlan.tfrs || [])
    .map(t => `${t.type} - ${t.reason}`);
  
  return {
    route: flightPlan.route,
    departure: flightPlan.departure,
    destination: flightPlan.destination,
    alternate: flightPlan.alternate,
    departureTime: flightPlan.plannedDepartureTime,
    arrivalTime: flightPlan.plannedArrivalTime,
    
    departureWeatherScore,
    destinationWeatherScore,
    enrouteWeatherScore,
    
    crosswindComponent,
    visibilityScore: calculateVisibilityScore(wb?.departure.visibility),
    ceilingScore: calculateCeilingScore(wb?.departure.ceiling),
    icingRisk: calculateIcingRisk(wb?.enroute.icing),
    turbulenceRisk: calculateTurbulenceRisk(wb?.enroute.turbulence),
    convectionRisk: calculateConvectionRisk(wb?.enroute.convection),
    
    tailNumber: flightPlan.tailNumber,
    passengers: flightPlan.passengers,
    fuelPlanned: flightPlan.fuelTotal,
    
    criticalNotams,
    activeTFRs
  };
}

// ==================== FLIGHT TIME SYNC ====================

export interface PostFlightData {
  tailNumber: string;
  blockOut: string;
  blockIn: string;
  blockTime: number;
  flightTime: number;
  hobbs?: number;
  tach?: number;
  fuelBurn: number;
  fuelRemaining?: number;
  departure: string;
  destination: string;
  route?: string;
  pic: string;
  sic?: string;
  landings: number;
  remarks?: string;
}

export async function syncFlightTimes(
  client: ForeFlightAPIClient,
  logbookEntryId: string
): Promise<PostFlightData> {
  const response = await client.getLogbookEntry(logbookEntryId);
  
  if (!response.success || !response.data) {
    throw new Error('Failed to fetch logbook entry');
  }
  
  const entry = response.data;
  
  return {
    tailNumber: entry.tailNumber,
    blockOut: entry.blockOut,
    blockIn: entry.blockIn,
    blockTime: entry.blockTime,
    flightTime: entry.flightTime,
    hobbs: entry.hobbs,
    tach: entry.tach,
    fuelBurn: entry.fuelBurn,
    fuelRemaining: entry.fuelRemaining,
    departure: entry.departure,
    destination: entry.destination,
    route: entry.route,
    pic: entry.pic,
    sic: entry.sic,
    landings: entry.dayLandings + entry.nightLandings,
    remarks: entry.remarks
  };
}

// ==================== SQUAWK IMPORT ====================

export interface ImportedSquawk {
  tailNumber: string;
  description: string;
  reportedBy: string;
  reportedAt: string;
  category: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  flightNumber?: string;
  attachments?: string[];
}

export async function importSquawks(
  client: ForeFlightAPIClient,
  tailNumber?: string
): Promise<ImportedSquawk[]> {
  const response = await client.getSquawks({ tailNumber, status: 'OPEN' });
  
  if (!response.success || !response.data) {
    throw new Error('Failed to fetch squawks');
  }
  
  return response.data.items.map(squawk => ({
    tailNumber: squawk.tailNumber,
    description: squawk.description,
    reportedBy: squawk.reportedBy,
    reportedAt: squawk.reportedAt,
    category: mapSquawkCategory(squawk.category),
    priority: mapSquawkPriority(squawk.priority),
    flightNumber: squawk.flightNumber,
    attachments: squawk.attachments?.map(a => a.downloadUrl || '') || []
  }));
}

// ==================== FUEL REQUEST AUTO-GENERATION ====================

export interface FuelRequest {
  tailNumber: string;
  flightNumber?: string;
  departureAirport: string;
  fuelRequired: number; // gallons
  fuelType: 'Jet-A' | '100LL';
  requestedBy: string;
  requestedAt: string;
  notes?: string;
}

export async function generateFuelRequest(
  client: ForeFlightAPIClient,
  flightPlanId: string
): Promise<FuelRequest> {
  const response = await client.getFlightPlan(flightPlanId);
  
  if (!response.success || !response.data) {
    throw new Error('Failed to fetch flight plan');
  }
  
  const flightPlan = response.data;
  
  // For Gulfstream G650, use Jet-A
  return {
    tailNumber: flightPlan.tailNumber,
    departureAirport: flightPlan.departure,
    fuelRequired: flightPlan.fuelTotal,
    fuelType: 'Jet-A',
    requestedBy: 'ForeFlight Auto-Sync',
    requestedAt: new Date().toISOString(),
    notes: `Auto-generated from flight plan ${flightPlanId}. Planned fuel: ${flightPlan.fuelPlanned}gal + Reserve: ${flightPlan.fuelReserve}gal + Alternate: ${flightPlan.fuelAlternate}gal`
  };
}

// ==================== AIRPORT EVALUATION PDF AUTO-UPLOAD ====================

export async function uploadAirportEvaluation(
  client: ForeFlightAPIClient,
  flightPlanId: string,
  evaluationPdf: File,
  airportIcao: string,
  type: 'departure' | 'destination'
): Promise<ForeFlightFile> {
  const response = await client.uploadFile(evaluationPdf, {
    flightObjectId: flightPlanId,
    category: 'Airport',
    displayName: `${airportIcao} Airport Evaluation - ${type.toUpperCase()}`
  });
  
  if (!response.success || !response.data) {
    throw new Error('Failed to upload airport evaluation');
  }
  
  return response.data;
}

export async function autoUploadAirportEvaluations(
  client: ForeFlightAPIClient,
  flightPlanId: string,
  departureEvalPdf?: File,
  destinationEvalPdf?: File
): Promise<{ departure?: ForeFlightFile; destination?: ForeFlightFile }> {
  const result: { departure?: ForeFlightFile; destination?: ForeFlightFile } = {};
  
  // Get flight plan to know airports
  const fpResponse = await client.getFlightPlan(flightPlanId);
  if (!fpResponse.success || !fpResponse.data) {
    throw new Error('Failed to fetch flight plan');
  }
  
  const flightPlan = fpResponse.data;
  
  // Upload departure evaluation
  if (departureEvalPdf) {
    result.departure = await uploadAirportEvaluation(
      client,
      flightPlanId,
      departureEvalPdf,
      flightPlan.departure,
      'departure'
    );
  }
  
  // Upload destination evaluation
  if (destinationEvalPdf) {
    result.destination = await uploadAirportEvaluation(
      client,
      flightPlanId,
      destinationEvalPdf,
      flightPlan.destination,
      'destination'
    );
  }
  
  return result;
}

// ==================== WEIGHT & BALANCE SYNC ====================

export interface PassengerData {
  name: string;
  weight: number;
  station: string;
  baggageWeight?: number;
}

export async function syncWeightBalance(
  client: ForeFlightAPIClient,
  flightPlanId: string
): Promise<{ passengers: PassengerData[]; withinLimits: boolean; warnings: string[] }> {
  const response = await client.getWeightBalance(flightPlanId);
  
  if (!response.success || !response.data) {
    throw new Error('Failed to fetch weight & balance');
  }
  
  const wb = response.data;
  
  const passengers: PassengerData[] = wb.passengers.map(p => ({
    name: p.name || 'Unknown Passenger',
    weight: p.weight,
    station: p.station,
    baggageWeight: wb.baggage.find(b => b.description.includes(p.name || ''))?.weight
  }));
  
  return {
    passengers,
    withinLimits: wb.withinLimits,
    warnings: wb.warnings || []
  };
}

// ==================== HELPER FUNCTIONS ====================

function calculateWeatherRisk(weather: any): number {
  if (!weather) return 0;
  
  let risk = 0;
  
  // Flight category risk
  switch (weather.flightCategory) {
    case 'LIFR': risk += 40; break;
    case 'IFR': risk += 25; break;
    case 'MVFR': risk += 10; break;
    case 'VFR': risk += 0; break;
  }
  
  // Wind risk
  if (weather.windSpeed > 25) risk += 20;
  else if (weather.windSpeed > 15) risk += 10;
  
  // Visibility risk
  if (weather.visibility < 1) risk += 20;
  else if (weather.visibility < 3) risk += 10;
  
  // Ceiling risk
  if (weather.ceiling && weather.ceiling < 500) risk += 20;
  else if (weather.ceiling && weather.ceiling < 1000) risk += 10;
  
  return Math.min(risk, 100);
}

function calculateEnrouteRisk(enroute: any): number {
  if (!enroute) return 0;
  
  let risk = 0;
  
  // Icing
  if (enroute.icing?.some((i: any) => i.severity === 'SEVERE')) risk += 30;
  else if (enroute.icing?.some((i: any) => i.severity === 'MODERATE')) risk += 15;
  
  // Turbulence
  if (enroute.turbulence?.some((t: any) => t.severity === 'SEVERE')) risk += 30;
  else if (enroute.turbulence?.some((t: any) => t.severity === 'MODERATE')) risk += 15;
  
  // Convection
  if (enroute.convection?.length > 0) risk += 20;
  
  return Math.min(risk, 100);
}

function calculateCrosswind(windSpeed: number, windDirection: number, runwayHeading: number): number {
  const angleDiff = Math.abs(windDirection - runwayHeading);
  return Math.round(windSpeed * Math.sin(angleDiff * Math.PI / 180));
}

function calculateVisibilityScore(visibility?: number): number {
  if (!visibility) return 0;
  if (visibility >= 10) return 0;
  if (visibility >= 5) return 20;
  if (visibility >= 3) return 40;
  if (visibility >= 1) return 60;
  return 80;
}

function calculateCeilingScore(ceiling?: number): number {
  if (!ceiling || ceiling >= 3000) return 0;
  if (ceiling >= 1000) return 20;
  if (ceiling >= 500) return 40;
  if (ceiling >= 200) return 60;
  return 80;
}

function calculateIcingRisk(icing: any[]): number {
  if (!icing || icing.length === 0) return 0;
  const maxSeverity = Math.max(...icing.map(i => {
    switch (i.severity) {
      case 'SEVERE': return 80;
      case 'MODERATE': return 50;
      case 'LIGHT': return 20;
      default: return 0;
    }
  }));
  return maxSeverity;
}

function calculateTurbulenceRisk(turbulence: any[]): number {
  if (!turbulence || turbulence.length === 0) return 0;
  const maxSeverity = Math.max(...turbulence.map(t => {
    switch (t.severity) {
      case 'EXTREME': return 100;
      case 'SEVERE': return 80;
      case 'MODERATE': return 50;
      case 'LIGHT': return 20;
      default: return 0;
    }
  }));
  return maxSeverity;
}

function calculateConvectionRisk(convection: any[]): number {
  if (!convection || convection.length === 0) return 0;
  return convection.length > 0 ? 50 : 0;
}

function mapSquawkCategory(category?: string): string {
  const mapping: Record<string, string> = {
    'MECHANICAL': 'mechanical',
    'ELECTRICAL': 'electrical',
    'AVIONICS': 'avionics',
    'CABIN': 'cabin',
    'EXTERIOR': 'exterior',
    'DOCUMENTATION': 'documentation'
  };
  return mapping[category || ''] || 'mechanical';
}

function mapSquawkPriority(priority?: string): 'critical' | 'high' | 'medium' | 'low' {
  const mapping: Record<string, 'critical' | 'high' | 'medium' | 'low'> = {
    'CRITICAL': 'critical',
    'HIGH': 'high',
    'MEDIUM': 'medium',
    'LOW': 'low'
  };
  return mapping[priority || ''] || 'medium';
}
