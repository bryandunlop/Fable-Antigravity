// ==================== REAL FOREFLIGHT API CLIENT ====================
// This client makes actual API calls to ForeFlight

import {
  ForeFlightAPIResponse,
  ForeFlightListResponse,
  ForeFlightFlightPlan,
  ForeFlightLogbookEntry,
  ForeFlightAircraftPosition,
  ForeFlightSquawk,
  ForeFlightFile,
  ForeFlightWeightBalance,
  ForeFlightAirport
} from './types';
import { logger } from '../logger';

// ForeFlight API base URL - verify this matches your API documentation
const FOREFLIGHT_API_BASE = 'https://api.foreflight.com/v1';

export class RealForeFlightAPIClient {
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
      logger.log(`[ForeFlight API] Calling: ${endpoint}`);

      const url = `${FOREFLIGHT_API_BASE}${endpoint}`;
      const response = await fetch(url, {
        ...options,
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'X-Account-UUID': this.accountUuid,
          ...options.headers,
        },
      });

      logger.log(`[ForeFlight API] Status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[ForeFlight API] Error: ${errorText}`);
        throw new Error(`API Error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      logger.log(`[ForeFlight API] Success:`, data);

      return {
        success: true,
        data,
        metadata: {
          timestamp: new Date().toISOString(),
          requestId: response.headers.get('x-request-id') || 'unknown',
        },
      };
    } catch (error) {
      console.error('[ForeFlight API] Request failed:', error);
      return {
        success: false,
        error: {
          code: 'API_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  // ==================== CONNECTION TEST ====================

  async testConnection(): Promise<boolean> {
    try {
      // Try to fetch account info or a simple endpoint
      const response = await this.request('/account');
      return response.success;
    } catch {
      return false;
    }
  }

  // ==================== FLIGHT PLANS ====================

  async getFlightPlans(params?: {
    startDate?: string;
    endDate?: string;
    tailNumber?: string;
    limit?: number;
  }): Promise<ForeFlightAPIResponse<ForeFlightListResponse<ForeFlightFlightPlan>>> {
    const queryParams = new URLSearchParams({
      accountUuid: this.accountUuid
    });

    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    if (params?.tailNumber) queryParams.append('tailNumber', params.tailNumber);
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const response = await this.request<any>(`/flights?${queryParams.toString()}`);

    // Transform response to match our expected format
    if (response.success && response.data) {
      return {
        ...response,
        data: {
          items: Array.isArray(response.data) ? response.data : response.data.items || [],
          totalCount: response.data.totalCount || response.data.length || 0,
          pageSize: params?.limit || 50,
          pageNumber: 1,
          hasMore: false
        }
      };
    }

    return response as any;
  }

  async getFlightPlan(flightId: string): Promise<ForeFlightAPIResponse<ForeFlightFlightPlan>> {
    return this.request(`/flights/${flightId}`);
  }

  // ==================== LOGBOOK ====================

  async getLogbookEntries(params?: {
    startDate?: string;
    endDate?: string;
    tailNumber?: string;
    pilot?: string;
    limit?: number;
  }): Promise<ForeFlightAPIResponse<ForeFlightListResponse<ForeFlightLogbookEntry>>> {
    const queryParams = new URLSearchParams({
      accountUuid: this.accountUuid
    });

    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    if (params?.tailNumber) queryParams.append('tailNumber', params.tailNumber);
    if (params?.pilot) queryParams.append('pilot', params.pilot);
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const response = await this.request<any>(`/logbook/entries?${queryParams.toString()}`);

    if (response.success && response.data) {
      return {
        ...response,
        data: {
          items: Array.isArray(response.data) ? response.data : response.data.items || [],
          totalCount: response.data.totalCount || response.data.length || 0,
          pageSize: params?.limit || 50,
          pageNumber: 1,
          hasMore: false
        }
      };
    }

    return response as any;
  }

  async getLogbookEntry(entryId: string): Promise<ForeFlightAPIResponse<ForeFlightLogbookEntry>> {
    return this.request(`/logbook/entries/${entryId}`);
  }

  // ==================== AIRCRAFT TRACKING ====================

  async getAircraftPosition(tailNumber: string): Promise<ForeFlightAPIResponse<ForeFlightAircraftPosition>> {
    return this.request(`/aircraft/${tailNumber}/position?accountUuid=${this.accountUuid}`);
  }

  async getFleetPositions(): Promise<ForeFlightAPIResponse<ForeFlightAircraftPosition[]>> {
    return this.request(`/aircraft/positions?accountUuid=${this.accountUuid}`);
  }

  // ==================== FILES ====================

  async getFiles(params?: {
    flightObjectId?: string;
    category?: string;
    limit?: number;
  }): Promise<ForeFlightAPIResponse<ForeFlightListResponse<ForeFlightFile>>> {
    const queryParams = new URLSearchParams({
      accountUuid: this.accountUuid
    });

    if (params?.flightObjectId) queryParams.append('flightObjectId', params.flightObjectId);
    if (params?.category) queryParams.append('category', params.category);
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const response = await this.request<any>(`/files?${queryParams.toString()}`);

    if (response.success && response.data) {
      return {
        ...response,
        data: {
          items: Array.isArray(response.data) ? response.data : response.data.items || [],
          totalCount: response.data.totalCount || response.data.length || 0,
          pageSize: params?.limit || 50,
          pageNumber: 1,
          hasMore: false
        }
      };
    }

    return response as any;
  }

  async uploadFile(file: File, metadata: {
    flightObjectId?: string;
    category?: string;
    displayName?: string;
  }): Promise<ForeFlightAPIResponse<ForeFlightFile>> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('accountUuid', this.accountUuid);

      if (metadata.flightObjectId) formData.append('flightObjectId', metadata.flightObjectId);
      if (metadata.category) formData.append('category', metadata.category);
      if (metadata.displayName) formData.append('displayName', metadata.displayName);

      logger.log(`[ForeFlight API] Uploading file: ${file.name}`);

      const response = await fetch(`${FOREFLIGHT_API_BASE}/files`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'X-Account-UUID': this.accountUuid,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[ForeFlight API] Upload failed: ${errorText}`);
        throw new Error(`Upload Error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      logger.log(`[ForeFlight API] Upload success:`, data);

      return {
        success: true,
        data,
        metadata: {
          timestamp: new Date().toISOString(),
          requestId: response.headers.get('x-request-id') || 'unknown',
        },
      };
    } catch (error) {
      console.error('[ForeFlight API] Upload failed:', error);
      return {
        success: false,
        error: {
          code: 'UPLOAD_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  // ==================== WEATHER ====================

  async getWeather(icao: string): Promise<ForeFlightAPIResponse<any>> {
    return this.request(`/weather/report/${icao}`);
  }

  async getNOTAMs(icao: string): Promise<ForeFlightAPIResponse<any>> {
    return this.request(`/notams/${icao}`);
  }

  // ==================== AIRPORT DATA ====================

  async getAirport(icao: string): Promise<ForeFlightAPIResponse<ForeFlightAirport>> {
    return this.request(`/airports/${icao}`);
  }

  async searchAirports(query: string, limit: number = 10): Promise<ForeFlightAPIResponse<ForeFlightAirport[]>> {
    return this.request(`/airports/search?q=${encodeURIComponent(query)}&limit=${limit}`);
  }
}

// ==================== CLIENT FACTORY ====================

export function createRealForeFlightClient(apiKey: string, accountUuid: string): RealForeFlightAPIClient {
  return new RealForeFlightAPIClient(apiKey, accountUuid);
}
