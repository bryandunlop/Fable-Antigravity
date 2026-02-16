// ==================== FOREFLIGHT API TYPES ====================

export interface ForeFlightConfig {
  apiKey: string;
  accountUuid: string;
  syncEnabled: boolean;
  integrations: {
    autoPopulateFRAT: boolean;
    syncFlightTimes: boolean;
    importSquawks: boolean;
    trackAircraftPosition: boolean;
    syncNOTAMs: boolean;
    syncLogbook: boolean;
    syncWeightBalance: boolean;
    weatherDeviationAlerts: boolean;
    autoFuelRequest: boolean;
    autoAirportEvaluation: boolean;
  };
}

// ==================== FLIGHT PLAN ====================

export interface ForeFlightFlightPlan {
  objectId: string;
  accountUuid: string;
  dateCreated: string;
  dateUpdated?: string;
  route: string;
  departure: string;
  destination: string;
  alternate?: string;
  cruiseAltitude: number;
  cruiseSpeed: number;
  estimatedTimeEnroute: number; // minutes
  plannedDepartureTime: string;
  plannedArrivalTime: string;
  aircraftId: string;
  tailNumber: string;
  fuelPlanned: number; // gallons
  fuelReserve: number; // gallons
  fuelAlternate: number; // gallons
  fuelTotal: number; // gallons
  passengers: number;
  remarks?: string;
  filedWith?: string; // "FSS", "DUATS", etc.
  weatherBriefing?: WeatherBriefing;
  notams?: NOTAM[];
  tfrs?: TFR[];
}

export interface WeatherBriefing {
  departure: WeatherData;
  destination: WeatherData;
  enroute: EnrouteWeather;
  briefingTime: string;
}

export interface WeatherData {
  icao: string;
  metar: string;
  taf?: string;
  ceiling?: number; // feet
  visibility?: number; // statute miles
  windSpeed?: number; // knots
  windDirection?: number; // degrees
  temperature?: number; // celsius
  dewpoint?: number; // celsius
  altimeter?: number; // inHg
  flightCategory: 'VFR' | 'MVFR' | 'IFR' | 'LIFR';
  conditions: string[];
}

export interface EnrouteWeather {
  windsAloft: WindsAloft[];
  icing: IcingForecast[];
  turbulence: TurbulenceForecast[];
  convection: ConvectionForecast[];
}

export interface WindsAloft {
  altitude: number;
  direction: number;
  speed: number;
  temperature: number;
}

export interface IcingForecast {
  severity: 'TRACE' | 'LIGHT' | 'MODERATE' | 'SEVERE';
  topAltitude: number;
  baseAltitude: number;
  probability: number; // 0-100
}

export interface TurbulenceForecast {
  severity: 'LIGHT' | 'MODERATE' | 'SEVERE' | 'EXTREME';
  topAltitude: number;
  baseAltitude: number;
  probability: number;
}

export interface ConvectionForecast {
  type: 'TSTM' | 'EMBD_TSTM' | 'SQUALL';
  coverage: 'ISOL' | 'SCT' | 'BKN' | 'OVC';
  tops: number;
}

export interface NOTAM {
  id: string;
  icao: string;
  type: 'Airport' | 'Airspace' | 'Navigation' | 'Other';
  text: string;
  effectiveStart: string;
  effectiveEnd?: string;
  critical: boolean;
}

export interface TFR {
  id: string;
  type: string;
  center: { latitude: number; longitude: number };
  radius: number; // nautical miles
  topAltitude: number;
  bottomAltitude: number;
  effectiveStart: string;
  effectiveEnd: string;
  reason: string;
}

// ==================== LOGBOOK ====================

export interface ForeFlightLogbookEntry {
  objectId: string;
  accountUuid: string;
  dateCreated: string;
  flightDate: string;
  tailNumber: string;
  departure: string;
  destination: string;
  route?: string;
  
  // Times (all in decimal hours)
  blockOut: string;
  blockIn: string;
  blockTime: number;
  flightTime: number;
  hobbs?: number;
  tach?: number;
  
  // Fuel
  fuelBurn: number; // gallons
  fuelRemaining?: number;
  
  // Crew
  pic: string;
  sic?: string;
  
  // Flight characteristics
  dayLandings: number;
  nightLandings: number;
  instrumentApproaches: number;
  holds: number;
  
  // Conditions
  dayTime: number;
  nightTime: number;
  actualInstrument: number;
  simulatedInstrument: number;
  crossCountry: number;
  
  // Remarks
  remarks?: string;
}

// ==================== AIRCRAFT TRACKING ====================

export interface ForeFlightAircraftPosition {
  tailNumber: string;
  timestamp: string;
  position: {
    latitude: number;
    longitude: number;
    altitude: number; // feet MSL
    altitudeAGL?: number;
  };
  track: number; // degrees true
  groundSpeed: number; // knots
  verticalSpeed: number; // fpm
  heading?: number;
  flightPhase: 'Ground' | 'Taxi' | 'Takeoff' | 'Climb' | 'Cruise' | 'Descent' | 'Approach' | 'Landing';
  origin?: string;
  destination?: string;
  eta?: string;
  distanceRemaining?: number; // nautical miles
}

// ==================== SQUAWKS ====================

export interface ForeFlightSquawk {
  objectId: string;
  accountUuid: string;
  dateCreated: string;
  tailNumber: string;
  flightNumber?: string;
  reportedBy: string;
  description: string;
  category?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
  reportedAt: string;
  location?: string;
  attachments?: ForeFlightFile[];
}

// ==================== FILES ====================

export interface ForeFlightFile {
  accountUuid: string;
  objectId: string;
  dateCreated: string;
  displayName: string;
  mimeType: string;
  flightObjectId?: string;
  category: 'General' | 'Weather' | 'W&B' | 'Performance' | 'Airport' | 'Charts' | 'Other';
  fileSize?: number;
  downloadUrl?: string;
  metadata?: Record<string, any>;
}

// ==================== WEIGHT & BALANCE ====================

export interface ForeFlightWeightBalance {
  objectId: string;
  accountUuid: string;
  dateCreated: string;
  tailNumber: string;
  flightObjectId?: string;
  
  basicEmptyWeight: number; // lbs
  basicEmptyMoment: number;
  
  fuel: {
    weight: number;
    arm: number;
    moment: number;
  };
  
  crew: Array<{
    name: string;
    weight: number;
    station: string;
    arm: number;
    moment: number;
  }>;
  
  passengers: Array<{
    name?: string;
    weight: number;
    station: string;
    arm: number;
    moment: number;
  }>;
  
  baggage: Array<{
    description: string;
    weight: number;
    station: string;
    arm: number;
    moment: number;
  }>;
  
  totals: {
    weight: number;
    moment: number;
    cg: number;
  };
  
  withinLimits: boolean;
  warnings?: string[];
}

// ==================== AIRPORT DATA ====================

export interface ForeFlightAirport {
  icao: string;
  iata?: string;
  name: string;
  city: string;
  state?: string;
  country: string;
  
  coordinates: {
    latitude: number;
    longitude: number;
  };
  
  elevation: number; // feet MSL
  
  runways: Array<{
    name: string;
    length: number; // feet
    width: number; // feet
    surface: string;
    lighting: boolean;
    heading: number;
  }>;
  
  frequencies: Array<{
    type: string;
    frequency: number;
    name?: string;
  }>;
  
  fbos: Array<{
    name: string;
    phone?: string;
    services: string[];
    fuelAvailable: boolean;
    fuelTypes: string[];
    hours?: string;
  }>;
  
  services: {
    customsAvailable: boolean;
    fuel100LL: boolean;
    fuelJetA: boolean;
    maintenance: boolean;
    hangarSpace: boolean;
    tieDowns: boolean;
  };
  
  remarks?: string;
}

// ==================== AIRPORT EVALUATION ====================

export interface AirportEvaluation {
  airportIcao: string;
  evaluationDate: string;
  evaluatedBy: string;
  pdfUrl?: string;
  pdfObjectId?: string;
  
  ratings: {
    runway: number; // 1-5
    services: number;
    facilities: number;
    safety: number;
    overall: number;
  };
  
  notes?: string;
  recommendations?: string[];
  restrictions?: string[];
  preferredFBO?: string;
}

// ==================== API RESPONSES ====================

export interface ForeFlightAPIResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  metadata?: {
    timestamp: string;
    requestId: string;
  };
}

export interface ForeFlightListResponse<T> {
  items: T[];
  totalCount: number;
  pageSize: number;
  pageNumber: number;
  hasMore: boolean;
}

// ==================== SYNC STATUS ====================

export interface ForeFlightSyncStatus {
  lastSync: string;
  syncInProgress: boolean;
  errors: Array<{
    timestamp: string;
    integration: string;
    error: string;
  }>;
  stats: {
    flightPlansSynced: number;
    squawksImported: number;
    logbookEntriesSynced: number;
    positionUpdates: number;
    filesSynced: number;
  };
}

// ==================== INTEGRATION EVENTS ====================

export interface ForeFlightIntegrationEvent {
  id: string;
  timestamp: string;
  type: 'FLIGHT_PLAN_CREATED' | 'FLIGHT_PLAN_UPDATED' | 'SQUAWK_ADDED' | 'LOGBOOK_ENTRY_ADDED' | 'POSITION_UPDATE' | 'FILE_UPLOADED';
  data: any;
  processed: boolean;
  error?: string;
}
