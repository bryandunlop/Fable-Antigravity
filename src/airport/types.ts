/**
 * The shape of the static airport reference bundle (D45, D48).
 *
 * Shared by the build-time generator (scripts/build-airport-bundle.ts) and the
 * app, so the two can never drift. Deliberately mirrors what an API route would
 * return: switching the reference layer from a bundled asset to a served
 * endpoint later should be a transport change, not a model change.
 */

import type { RunwayPavement } from './nasr/pavement';
import type { DeclaredDistances } from './nasr/runway';

export interface RunwayEndRecord {
  endId: string;
  trueAlignmentDeg: number | null;
  elevationFt: number | null;
  displacedThresholdFt: number | null;
  gradientPct: number | null;
  approachLightingCode: string | null;
  ilsType: string | null;
  markingTypeCode: string | null;
  /** Null when the FAA did not publish them — never derived from runway length. */
  declaredDistances: DeclaredDistances | null;
}

export interface RunwayRecord {
  runwayId: string;
  lengthFt: number | null;
  widthFt: number | null;
  surfaceTypeCode: string | null;
  condition: string | null;
  treatmentCode: string | null;
  lightingCode: string | null;
  pavement: RunwayPavement;
  ends: RunwayEndRecord[];
}

export interface AirportContact {
  title: string | null;
  name: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
}

export interface AirportAttendance {
  month: string;
  day: string;
  hour: string;
}

export interface AirportRecord {
  /** FAA location identifier — the key, because 16% of the set has no ICAO id. */
  id: string;
  icaoId: string | null;
  siteNo: string;
  siteTypeCode: string;
  name: string;
  city: string | null;
  stateCode: string | null;
  countyName: string | null;
  countryCode: string | null;
  latitude: number | null;
  longitude: number | null;
  elevationFt: number | null;
  magneticVariation: string | null;
  trafficPatternAltitudeFt: number | null;
  status: string | null;
  ownershipTypeCode: string | null;
  facilityUseCode: string | null;
  towerTypeCode: string | null;
  artccId: string | null;
  notamId: string | null;
  notamDFlag: boolean;
  customsAvailable: boolean;
  landingRightsAvailable: boolean;
  landingFee: boolean;
  far139TypeCode: string | null;
  fuelTypes: string[];
  otherServices: string[];
  contractFuelAvailable: string | null;
  airportLightingSchedule: string | null;
  beaconLightingSchedule: string | null;
  lastInspection: string | null;
  runways: RunwayRecord[];
  attendance: AirportAttendance[];
  contacts: AirportContact[];
  /** The NASR cycle this record came from — the honest answer to "how current is this". */
  effectiveDate: string;
}

export interface AirportIndexEntry {
  id: string;
  icaoId: string | null;
  name: string;
  city: string | null;
  stateCode: string | null;
  latitude: number | null;
  longitude: number | null;
  longestRunwayFt: number;
}

export interface AirportIndex {
  effectiveDate: string;
  count: number;
  airports: AirportIndexEntry[];
}

/** Where a displayed fact came from. Every value on the page carries one. */
export type FieldSource = 'reference' | 'myairops' | 'company';

export const SOURCE_LABEL: Record<FieldSource, string> = {
  reference: 'FAA NASR',
  myairops: 'myairops',
  company: 'Company',
};
