// ==================== FOREFLIGHT API CLIENT ====================

import {
  ForeFlightAPIResponse,
  ForeFlightListResponse,
  ForeFlightFlightPlan,
  ForeFlightLogbookEntry,
  ForeFlightAircraftPosition,
  ForeFlightSquawk,
  ForeFlightFile,
  ForeFlightWeightBalance,
  ForeFlightAirport,
  AirportEvaluation
} from './types';
import { RealForeFlightAPIClient } from './realClient';

const FOREFLIGHT_API_BASE = 'https://public-api.foreflight.com';

export class ForeFlightAPIClient {
  private apiKey: string;
  private accountUuid: string;

  constructor(apiKey: string, accountUuid: string) {
    this.apiKey = apiKey;
    this.accountUuid = accountUuid;
  }

  // ==================== GENERIC REQUEST ====================

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ForeFlightAPIResponse<T>> {
    try {
      const response = await fetch(`${FOREFLIGHT_API_BASE}${endpoint}`, {
        ...options,
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      return {
        success: true,
        data,
        metadata: {
          timestamp: new Date().toISOString(),
          requestId: response.headers.get('x-request-id') || 'unknown',
        },
      };
    } catch (error) {
      console.error('ForeFlight API Error:', error);
      return {
        success: false,
        error: {
          code: 'API_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  // ==================== FLIGHT PLANS ====================

  async getFlightPlans(params?: {
    startDate?: string;
    endDate?: string;
    tailNumber?: string;
    limit?: number;
  }): Promise<ForeFlightAPIResponse<ForeFlightListResponse<ForeFlightFlightPlan>>> {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    if (params?.tailNumber) queryParams.append('tailNumber', params.tailNumber);
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    return this.request(`/flights?${queryParams.toString()}`);
  }

  async getFlightPlan(flightId: string): Promise<ForeFlightAPIResponse<ForeFlightFlightPlan>> {
    return this.request(`/flights/${flightId}`);
  }

  async createFlightPlan(flightPlan: Partial<ForeFlightFlightPlan>): Promise<ForeFlightAPIResponse<ForeFlightFlightPlan>> {
    return this.request('/flights', {
      method: 'POST',
      body: JSON.stringify(flightPlan),
    });
  }

  async updateFlightPlan(flightId: string, updates: Partial<ForeFlightFlightPlan>): Promise<ForeFlightAPIResponse<ForeFlightFlightPlan>> {
    return this.request(`/flights/${flightId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  // ==================== LOGBOOK ====================

  async getLogbookEntries(params?: {
    startDate?: string;
    endDate?: string;
    tailNumber?: string;
    pilot?: string;
    limit?: number;
  }): Promise<ForeFlightAPIResponse<ForeFlightListResponse<ForeFlightLogbookEntry>>> {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    if (params?.tailNumber) queryParams.append('tailNumber', params.tailNumber);
    if (params?.pilot) queryParams.append('pilot', params.pilot);
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    return this.request(`/logbook?${queryParams.toString()}`);
  }

  async getLogbookEntry(entryId: string): Promise<ForeFlightAPIResponse<ForeFlightLogbookEntry>> {
    return this.request(`/logbook/${entryId}`);
  }

  async createLogbookEntry(entry: Partial<ForeFlightLogbookEntry>): Promise<ForeFlightAPIResponse<ForeFlightLogbookEntry>> {
    return this.request('/logbook', {
      method: 'POST',
      body: JSON.stringify(entry),
    });
  }

  // ==================== AIRCRAFT TRACKING ====================

  async getAircraftPosition(tailNumber: string): Promise<ForeFlightAPIResponse<ForeFlightAircraftPosition>> {
    return this.request(`/aircraft/${tailNumber}/position`);
  }

  async getFleetPositions(): Promise<ForeFlightAPIResponse<ForeFlightAircraftPosition[]>> {
    return this.request(`/aircraft/positions`);
  }

  // ==================== SQUAWKS ====================

  async getSquawks(params?: {
    tailNumber?: string;
    status?: string;
    limit?: number;
  }): Promise<ForeFlightAPIResponse<ForeFlightListResponse<ForeFlightSquawk>>> {
    const queryParams = new URLSearchParams();
    if (params?.tailNumber) queryParams.append('tailNumber', params.tailNumber);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    return this.request(`/squawks?${queryParams.toString()}`);
  }

  async createSquawk(squawk: Partial<ForeFlightSquawk>): Promise<ForeFlightAPIResponse<ForeFlightSquawk>> {
    return this.request('/squawks', {
      method: 'POST',
      body: JSON.stringify(squawk),
    });
  }

  async updateSquawk(squawkId: string, updates: Partial<ForeFlightSquawk>): Promise<ForeFlightAPIResponse<ForeFlightSquawk>> {
    return this.request(`/squawks/${squawkId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  // ==================== FILES ====================

  async getFiles(params?: {
    flightObjectId?: string;
    category?: string;
    limit?: number;
  }): Promise<ForeFlightAPIResponse<ForeFlightListResponse<ForeFlightFile>>> {
    const queryParams = new URLSearchParams();
    if (params?.flightObjectId) queryParams.append('flightObjectId', params.flightObjectId);
    if (params?.category) queryParams.append('category', params.category);
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    return this.request(`/files?${queryParams.toString()}`);
  }

  async uploadFile(file: File, metadata: {
    flightObjectId?: string;
    category?: string;
    displayName?: string;
  }): Promise<ForeFlightAPIResponse<ForeFlightFile>> {
    const formData = new FormData();
    formData.append('file', file);
    if (metadata.flightObjectId) formData.append('flightObjectId', metadata.flightObjectId);
    if (metadata.category) formData.append('category', metadata.category);
    if (metadata.displayName) formData.append('displayName', metadata.displayName);

    try {
      const response = await fetch(`${FOREFLIGHT_API_BASE}/files`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload Error: ${response.status}`);
      }

      const data = await response.json();

      return {
        success: true,
        data,
        metadata: {
          timestamp: new Date().toISOString(),
          requestId: response.headers.get('x-request-id') || 'unknown',
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'UPLOAD_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  async deleteFile(fileId: string): Promise<ForeFlightAPIResponse<void>> {
    return this.request(`/files/${fileId}`, {
      method: 'DELETE',
    });
  }

  // ==================== WEIGHT & BALANCE ====================

  async getWeightBalance(flightId: string): Promise<ForeFlightAPIResponse<ForeFlightWeightBalance>> {
    return this.request(`/flights/${flightId}/weightbalance`);
  }

  async updateWeightBalance(flightId: string, wb: Partial<ForeFlightWeightBalance>): Promise<ForeFlightAPIResponse<ForeFlightWeightBalance>> {
    return this.request(`/flights/${flightId}/weightbalance`, {
      method: 'POST',
      body: JSON.stringify(wb),
    });
  }

  // ==================== AIRPORT DATA ====================

  async getAirport(icao: string): Promise<ForeFlightAPIResponse<ForeFlightAirport>> {
    return this.request(`/airports/${icao}`);
  }

  async searchAirports(query: string, limit: number = 10): Promise<ForeFlightAPIResponse<ForeFlightAirport[]>> {
    return this.request(`/airports/search?q=${encodeURIComponent(query)}&limit=${limit}`);
  }

  // ==================== WEATHER ====================

  async getWeather(icao: string): Promise<ForeFlightAPIResponse<any>> {
    return this.request(`/weather/report/${icao}`);
  }

  async getNOTAMs(icao: string): Promise<ForeFlightAPIResponse<any>> {
    return this.request(`/weather/notams/${icao}`);
  }

  async getTFRs(coordinates?: { lat: number; lon: number }): Promise<ForeFlightAPIResponse<any>> {
    if (coordinates) {
      return this.request(`/weather/tfrs?lat=${coordinates.lat}&lon=${coordinates.lon}`);
    }
    return this.request('/weather/tfrs');
  }
}

// ==================== MOCK CLIENT FOR DEVELOPMENT ====================

export class MockForeFlightClient extends ForeFlightAPIClient {
  constructor() {
    super('MOCK_API_KEY', 'MOCK_ACCOUNT_UUID');
  }

  async getFlightPlans(): Promise<ForeFlightAPIResponse<ForeFlightListResponse<ForeFlightFlightPlan>>> {
    // Mock implementation with sample data
    const mockFlightPlans: ForeFlightFlightPlan[] = [
      {
        objectId: 'FP-2025-001',
        accountUuid: 'MOCK_ACCOUNT',
        dateCreated: new Date().toISOString(),
        route: 'KTEB DCT HTO DCT ACK DCT KMVY',
        departure: 'KTEB',
        destination: 'KMVY',
        alternate: 'KACK',
        cruiseAltitude: 45000,
        cruiseSpeed: 470,
        estimatedTimeEnroute: 65,
        plannedDepartureTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        plannedArrivalTime: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
        aircraftId: 'AC-001',
        tailNumber: 'N650GS',
        fuelPlanned: 3200,
        fuelReserve: 800,
        fuelAlternate: 400,
        fuelTotal: 4400,
        passengers: 8,
        filedWith: 'FSS',
        weatherBriefing: {
          departure: {
            icao: 'KTEB',
            metar: 'KTEB 251256Z 27008KT 10SM FEW250 08/M06 A3012',
            ceiling: 25000,
            visibility: 10,
            windSpeed: 8,
            windDirection: 270,
            temperature: 8,
            dewpoint: -6,
            altimeter: 30.12,
            flightCategory: 'VFR',
            conditions: ['Clear']
          },
          destination: {
            icao: 'KMVY',
            metar: 'KMVY 251253Z 29012KT 10SM FEW030 BKN250 06/M04 A3015',
            ceiling: 3000,
            visibility: 10,
            windSpeed: 12,
            windDirection: 290,
            temperature: 6,
            dewpoint: -4,
            altimeter: 30.15,
            flightCategory: 'VFR',
            conditions: ['Few Clouds']
          },
          enroute: {
            windsAloft: [
              { altitude: 45000, direction: 270, speed: 85, temperature: -55 }
            ],
            icing: [],
            turbulence: [],
            convection: []
          },
          briefingTime: new Date().toISOString()
        }
      }
    ];

    return {
      success: true,
      data: {
        items: mockFlightPlans,
        totalCount: mockFlightPlans.length,
        pageSize: 10,
        pageNumber: 1,
        hasMore: false
      },
      metadata: {
        timestamp: new Date().toISOString(),
        requestId: 'mock-request-id'
      }
    };
  }

  async getLogbookEntries(): Promise<ForeFlightAPIResponse<ForeFlightListResponse<ForeFlightLogbookEntry>>> {
    const mockEntries: ForeFlightLogbookEntry[] = [
      {
        objectId: 'LOG-2025-001',
        accountUuid: 'MOCK_ACCOUNT',
        dateCreated: new Date().toISOString(),
        flightDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        tailNumber: 'N650GS',
        departure: 'KTEB',
        destination: 'KMIA',
        route: 'KTEB DCT KMIA',
        blockOut: '2025-10-24T10:00:00Z',
        blockIn: '2025-10-24T12:30:00Z',
        blockTime: 2.5,
        flightTime: 2.3,
        hobbs: 1247.5,
        fuelBurn: 2800,
        fuelRemaining: 1200,
        pic: 'Capt. Anderson',
        sic: 'FO Williams',
        dayLandings: 1,
        nightLandings: 0,
        instrumentApproaches: 0,
        holds: 0,
        dayTime: 2.3,
        nightTime: 0,
        actualInstrument: 0,
        simulatedInstrument: 0,
        crossCountry: 2.3
      }
    ];

    return {
      success: true,
      data: {
        items: mockEntries,
        totalCount: mockEntries.length,
        pageSize: 10,
        pageNumber: 1,
        hasMore: false
      },
      metadata: {
        timestamp: new Date().toISOString(),
        requestId: 'mock-request-id'
      }
    };
  }
}

// ==================== CLIENT FACTORY ====================

export function createForeFlightClient(apiKey?: string, accountUuid?: string): ForeFlightAPIClient | RealForeFlightAPIClient {
  if (!apiKey || !accountUuid || apiKey === 'DEMO_MODE') {
    logger.log('[ForeFlight] Using Mock Client for development');
    return new MockForeFlightClient();
  }

  logger.log('[ForeFlight] Using Real API Client with credentials');
  return new RealForeFlightAPIClient(apiKey, accountUuid);
}
