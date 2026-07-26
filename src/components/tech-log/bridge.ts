// Scheduling -> tech-log preflight bridge.
//
// One-way projection: a scheduling trip is projected into tech-log's state so the
// crew's existing per-leg FRAT/airport/fuel preflight flow runs on it. The coupling
// to tech-log's state shape lives ONLY in this module.

import type { Aircraft, AircraftType, Serviceability, Trip, TripLeg, TechLogState } from './types';
import { getDefaultState } from './mockData/scenarios';
import { deriveServiceability } from './engine/serviceability';
import { deriveTripServiceabilityAlerts, type TripForAlerts, type TripServiceabilityAlert, type TripAlertKind } from './engine/tripAlerts';
import { STORAGE_KEY, VERSION_KEY, DATA_VERSION } from './TechLogContext';
import { HOME_STATION } from '../../config/station';

export interface PreflightTripInput {
  tripNumber: string;
  name: string;
  tail: string;
  aircraftType: string;
  createdByOid: string;
  nowUtc: string;
  legs: {
    sequence: number;
    departureIcao: string;
    arrivalIcao: string;
    departureTimeUtc: string;
    arrivalTimeUtc?: string;
  }[];
}

export interface PreflightLegStatus {
  sequence: number;
  departureIcao: string;
  arrivalIcao: string;
  fratStatus: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
  fratScore?: number;
  airportReviewed: boolean;
  fuelSubmitted: boolean;
}

export interface PreflightSummary {
  techLogTripId: string;
  overall: 'READY' | 'NOT_READY';
  legs: PreflightLegStatus[];
}

const AIRCRAFT_TYPES: AircraftType[] = ['G650ER', 'G500', 'G800'];

/** PURE — testable without localStorage. */
export function projectTripIntoTechLogState(
  state: TechLogState,
  input: PreflightTripInput,
  newId: (p: string) => string
): { state: TechLogState; techLogTripId: string; createdAircraft: boolean } {
  const existing = state.trips.find(t => t.tripNumber === input.tripNumber);
  if (existing) {
    return { state, techLogTripId: existing.id, createdAircraft: false };
  }

  let aircraft = state.aircraft.find(a => a.tailNumber === input.tail);
  let createdAircraft = false;
  let nextAircraft = state.aircraft;
  if (!aircraft) {
    const type: AircraftType = AIRCRAFT_TYPES.includes(input.aircraftType as AircraftType)
      ? (input.aircraftType as AircraftType)
      : 'G650ER';
    aircraft = {
      id: newId('ac'),
      tailNumber: input.tail,
      type,
      serialNumber: 'UNSPEC-' + input.tail,
      status: 'ACTIVE',
      isProvisional: false,
      homeBase: input.legs[0]?.departureIcao ?? HOME_STATION,
      airframeTotalHours: 0,
      airframeTotalCycles: 0,
    };
    nextAircraft = [...state.aircraft, aircraft];
    createdAircraft = true;
  }

  const legs: TripLeg[] = input.legs.map(leg => ({
    id: newId('leg'),
    sequence: leg.sequence,
    departureIcao: leg.departureIcao,
    arrivalIcao: leg.arrivalIcao,
    departureTimeUtc: leg.departureTimeUtc,
    arrivalTimeUtc: leg.arrivalTimeUtc ?? leg.departureTimeUtc,
    fratStatus: 'NOT_STARTED',
    airportReviewed: false,
  }));

  const trip: Trip = {
    id: newId('trip'),
    tripNumber: input.tripNumber,
    aircraftId: aircraft.id,
    name: input.name,
    status: 'OPEN',
    flightLogIds: [],
    legs,
    createdByOid: input.createdByOid,
    createdAtUtc: input.nowUtc,
  };

  const nextState: TechLogState = {
    ...state,
    aircraft: nextAircraft,
    trips: [...state.trips, trip],
  };

  return { state: nextState, techLogTripId: trip.id, createdAircraft };
}

/** PURE — testable without localStorage. */
export function summarizePreflight(state: TechLogState, tripNumber: string): PreflightSummary | null {
  const trip = state.trips.find(t => t.tripNumber === tripNumber);
  if (!trip) return null;

  const legs: PreflightLegStatus[] = (trip.legs ?? []).map(leg => ({
    sequence: leg.sequence,
    departureIcao: leg.departureIcao,
    arrivalIcao: leg.arrivalIcao,
    fratStatus: leg.fratStatus,
    fratScore: leg.fratScore,
    airportReviewed: leg.airportReviewed,
    fuelSubmitted: !!leg.fuelRequestId,
  }));

  const overall: 'READY' | 'NOT_READY' = legs.every(
    leg => leg.fratStatus === 'COMPLETED' && leg.airportReviewed
  )
    ? 'READY'
    : 'NOT_READY';

  return { techLogTripId: trip.id, overall, legs };
}

export interface TripLifecycleSummary {
  aircraftTail: string;
  tripStatus: 'OPEN' | 'CLOSED';
  flown: boolean;
  openSquawks: number;
  groundingSquawks: number;
  postflightDone: boolean;
}

/** PURE — testable without localStorage. */
export function summarizeTripLifecycle(state: TechLogState, tripNumber: string): TripLifecycleSummary | null {
  const trip = state.trips.find(t => t.tripNumber === tripNumber);
  if (!trip) return null;

  const aircraft = state.aircraft.find(a => a.id === trip.aircraftId);
  const aircraftTail = aircraft ? aircraft.tailNumber : trip.aircraftId;

  const openDefects = state.defects.filter(d => d.aircraftId === trip.aircraftId && d.status === 'OPEN');
  const openSquawks = openDefects.length;
  const groundingSquawks = openDefects.filter(d => d.airworthinessAffecting !== false).length;

  const postflightDone = state.postflights.some(
    p => p.aircraftId === trip.aircraftId && p.performedAtUtc >= trip.createdAtUtc
  );

  return {
    aircraftTail,
    tripStatus: trip.status,
    flown: trip.flightLogIds.length > 0,
    openSquawks,
    groundingSquawks,
    postflightDone,
  };
}

/** tail → derived GREEN/AMBER/RED for every aircraft in the tech-log fleet. */
export type FleetServiceability = Record<string, Serviceability>;

/** PURE — testable without localStorage. The §14.2 projection, never a stored flag. */
export function summarizeFleetServiceability(state: TechLogState, asOfUtc: string): FleetServiceability {
  const out: FleetServiceability = {};
  for (const ac of state.aircraft) {
    out[ac.tailNumber] = deriveServiceability(ac.id, state, asOfUtc).status;
  }
  return out;
}

/** THIN localStorage wrapper — the only untested seam. */
export function readFleetServiceability(asOfUtc: string): FleetServiceability {
  return summarizeFleetServiceability(loadState(), asOfUtc);
}

/** Per-tail airworthiness detail for fleet surfaces outside tech-log (widget, /aircraft). */
export interface FleetAirworthinessEntry {
  tailNumber: string;
  type: AircraftType;
  isProvisional: boolean;
  status: Serviceability;
  openAffectingDefects: number;
  activeDeferrals: number;
}

/** PURE — testable without localStorage. Same §14.2 derivation as summarizeFleetServiceability. */
export function summarizeFleetAirworthiness(state: TechLogState, asOfUtc: string): FleetAirworthinessEntry[] {
  return state.aircraft.map(ac => {
    const r = deriveServiceability(ac.id, state, asOfUtc);
    return {
      tailNumber: ac.tailNumber,
      type: ac.type,
      isProvisional: ac.isProvisional,
      status: r.status,
      openAffectingDefects: r.openAffectingDefects,
      activeDeferrals: r.activeDeferrals,
    };
  });
}

/** THIN localStorage wrapper — the only untested seam. */
export function readFleetAirworthiness(asOfUtc: string): FleetAirworthinessEntry[] {
  return summarizeFleetAirworthiness(loadState(), asOfUtc);
}

export type { TripForAlerts, TripServiceabilityAlert, TripAlertKind };

/** THIN localStorage wrapper over engine/tripAlerts (pure logic + tests live there). */
export function readTripServiceabilityAlerts(trips: TripForAlerts[], nowUtc: string): TripServiceabilityAlert[] {
  return deriveTripServiceabilityAlerts(loadState(), trips, nowUtc);
}

const newLocalId = (p: string) => `${p}-${Math.random().toString(36).slice(2, 10)}`;

function loadState(): TechLogState {
  if (typeof localStorage === 'undefined') return getDefaultState();
  try {
    if (localStorage.getItem(VERSION_KEY) !== DATA_VERSION) {
      return getDefaultState();
    }
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...getDefaultState(), ...JSON.parse(raw) } : getDefaultState();
  } catch {
    return getDefaultState();
  }
}

function saveState(state: TechLogState): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  localStorage.setItem(VERSION_KEY, DATA_VERSION);
}

/** THIN localStorage wrapper — the only untested seam. */
export function releaseSchedulingTripToPreflight(
  input: PreflightTripInput
): { techLogTripId: string; createdAircraft: boolean } {
  const state = loadState();
  const result = projectTripIntoTechLogState(state, input, newLocalId);
  saveState(result.state);
  return { techLogTripId: result.techLogTripId, createdAircraft: result.createdAircraft };
}

/** THIN localStorage wrapper — the only untested seam. */
export function readPreflightSummary(tripNumber: string): PreflightSummary | null {
  const state = loadState();
  return summarizePreflight(state, tripNumber);
}

/** THIN localStorage wrapper — the only untested seam. */
export function readTripLifecycleSummary(tripNumber: string): TripLifecycleSummary | null {
  const state = loadState();
  return summarizeTripLifecycle(state, tripNumber);
}
