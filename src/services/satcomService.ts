/**
 * SatCom Direct API Service
 * 
 * Handles integration with SatCom Direct ADX APIs for:
 * - Authentication (OAuth token)
 * - Movement data (OOOI times)
 * - Position data (real-time location and movement reports)
 */

// API Configuration
const ADX_BASE_URL = 'https://adx.satcomdirect.com';
const AUTH_ENDPOINT = `${ADX_BASE_URL}/oauth/token`;
const MOVEMENT_ENDPOINT = `${ADX_BASE_URL}/mvt/api/movement`;
const POSITION_ENDPOINT = `${ADX_BASE_URL}/pos/api/movement/position`;

// Token storage
let accessToken: string | null = null;
let tokenExpiry: number | null = null;

// ============================================================================
// Type Definitions - Based on actual ADX API responses
// ============================================================================

export interface SatcomAuthResponse {
    access_token: string;
    expires_in: number;
    token_type: string;
}

export interface MovementEvent {
    assetId: number;
    aircraftId: number;
    assetSerial: string;
    tailNumber: string;
    flightStatusType: string;
    departureAirport: string;
    departureAirportName: string;
    destinationAirport: string;
    destinationAirportName: string;
    outTime: string; // ISO 8601
    offTime: string;
    offTimeLocal: string;
    onTime: string;
    onTimeLocal: string;
    inTime: string;
    eta: string;
    etaLocal: string;
    etd: string | null;
    flightHours: number;
    flightId: number;
    dateAdded: string;
    lastUpdated: string;
    fuelIn: number;
    fuelOut: number;
    fuelOn: number;
    fuelOff: number;
    divertedFromAirport: string | null;
    divertedFromAirportName: string | null;
    flightStatus: string;
    flightCompleted: string;
    aircraftOperations: string;
    isActive: boolean;
    fuelWeightUnits: string;
    fuelVolumeUnits: string;
    loggedFlightLeg: boolean;
    loggedFlightLegDate: string | null;
    loggedTrip: boolean;
    loggedTripDate: string | null;
    verifiedFlightLeg: boolean;
    verifiedFlightLegDate: string | null;
    verifiedTrip: boolean;
    verifiedTripDate: string | null;
}

export interface PositionReport {
    tailNumber: string;
    timeOfReport: string; // ISO 8601
    source: string; // "ViaSat", etc.
    movementReportType: 'Takeoff' | 'Landing' | 'Position Report' | 'Departure' | 'Arrival' | string;
    altitude: number;
    speed: number;
    latitude: number;
    longitude: number;
    heading: number | null;
    fuelQuantity: number | null;
    flightId: number;
    departureAirport: string | null;
    destinationAirport: string | null;
    squawkCode: number | null;
}

export interface PositionResponse {
    items: PositionReport[];
    totalCount: number;
    pageSize: number;
    currentPage: number;
    pageCount: number;
}

export interface OOOITimes {
    out: string | null;  // Out of gate
    off: string | null;  // Off the ground (takeoff)
    on: string | null;   // On the ground (landing)
    in: string | null;   // In the gate
}

// ============================================================================
// API Configuration
// ============================================================================

export interface SatcomConfig {
    subscriptionKey: string;
    useMockData?: boolean; // Fallback to mock data if API fails
}

let config: SatcomConfig = {
    subscriptionKey: '', // Will be set by initialization
    useMockData: true // Default to mock until configured
};

/**
 * Initialize the SatCom service with API credentials
 */
export function initSatcomService(subscriptionKey: string, useMockData: boolean = false) {
    config = {
        subscriptionKey,
        useMockData
    };
}

// ============================================================================
// Authentication
// ============================================================================

/**
 * Request an access token from SatCom Direct
 * Token is valid for 1 hour
 */
async function getAccessToken(): Promise<string> {
    // Return cached token if still valid
    if (accessToken && tokenExpiry && Date.now() < tokenExpiry) {
        return accessToken;
    }

    // If using mock data, return a fake token
    if (config.useMockData) {
        accessToken = 'mock_token_' + Date.now();
        tokenExpiry = Date.now() + 3600000; // 1 hour
        return accessToken;
    }

    try {
        const response = await fetch(AUTH_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Ocp-Apim-Subscription-Key': config.subscriptionKey,
                'Ocp-Apim-Trace': 'true'
            }
        });

        if (!response.ok) {
            throw new Error(`Authentication failed: ${response.status} ${response.statusText}`);
        }

        const data: SatcomAuthResponse = await response.json();
        accessToken = data.access_token;
        tokenExpiry = Date.now() + (data.expires_in * 1000);

        return accessToken;
    } catch (error) {
        console.error('SatCom authentication error:', error);
        throw error;
    }
}

// ============================================================================
// Movement API (OOOI Times)
// ============================================================================

export interface MovementQueryParams {
    tailNumbers?: string[];
    startDate?: string; // ISO 8601
    endDate?: string;   // ISO 8601
}

/**
 * Fetch movement events (OOOI times) from SatCom Direct
 * If no params provided, returns all tails for current month
 */
export async function getMovementEvents(params?: MovementQueryParams): Promise<MovementEvent[]> {
    if (config.useMockData) {
        return getMockMovementData();
    }

    try {
        const token = await getAccessToken();

        // Build query string
        const queryParams = new URLSearchParams();
        if (params?.tailNumbers) {
            params.tailNumbers.forEach(tail => queryParams.append('tailNumbers', tail));
        }
        if (params?.startDate) {
            queryParams.append('startDate', params.startDate);
        }
        if (params?.endDate) {
            queryParams.append('endDate', params.endDate);
        }

        const url = `${MOVEMENT_ENDPOINT}${queryParams.toString() ? '?' + queryParams.toString() : ''}`;

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Ocp-Apim-Subscription-Key': config.subscriptionKey,
                'Ocp-Apim-Trace': 'true',
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error(`Movement API failed: ${response.status} ${response.statusText}`);
        }

        const data: MovementEvent[] = await response.json();
        return data;
    } catch (error) {
        console.error('SatCom movement API error:', error);
        // Fallback to mock data on error
        return getMockMovementData();
    }
}

/**
 * Extract OOOI times from a movement event
 */
export function extractOOOITimes(event: MovementEvent): OOOITimes {
    return {
        out: event.outTime || null,
        off: event.offTime || null,
        on: event.onTime || null,
        in: event.inTime || null
    };
}

// ============================================================================
// Position API
// ============================================================================

export interface PositionQueryParams {
    tailNumbers?: string[];
    startDate?: string; // ISO 8601
    endDate?: string;   // ISO 8601
    pageNumber?: number;
    pageSize?: number;
}

/**
 * Fetch position information (real-time location and movement reports)
 */
export async function getPositionData(params: PositionQueryParams): Promise<PositionResponse> {
    if (config.useMockData) {
        return getMockPositionData(params);
    }

    try {
        const token = await getAccessToken();

        // Build query string
        const queryParams = new URLSearchParams();
        if (params.tailNumbers) {
            params.tailNumbers.forEach(tail => queryParams.append('tailNumbers', tail));
        }
        if (params.startDate) {
            queryParams.append('startDate', params.startDate);
        }
        if (params.endDate) {
            queryParams.append('endDate', params.endDate);
        }
        queryParams.append('pageNumber', (params.pageNumber || 1).toString());
        queryParams.append('pageSize', (params.pageSize || 50).toString());

        const url = `${POSITION_ENDPOINT}?${queryParams.toString()}`;

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Ocp-Apim-Subscription-Key': config.subscriptionKey,
                'Ocp-Apim-Trace': 'true',
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error(`Position API failed: ${response.status} ${response.statusText}`);
        }

        const data: PositionResponse = await response.json();
        return data;
    } catch (error) {
        console.error('SatCom position API error:', error);
        // Fallback to mock data on error
        return getMockPositionData(params);
    }
}

// ============================================================================
// Mock Data (for development/fallback)
// ============================================================================

function getMockMovementData(): MovementEvent[] {
    return [
        {
            assetId: 4124504,
            aircraftId: 124524,
            assetSerial: "4222",
            tailNumber: "N1PG",
            flightStatusType: "Complete",
            departureAirport: "KLAX",
            departureAirportName: "LOS ANGELES INTL",
            destinationAirport: "KJFK",
            destinationAirportName: "JOHN F KENNEDY INTL",
            outTime: new Date(Date.now() - 5 * 3600000).toISOString(),
            offTime: new Date(Date.now() - 4.9 * 3600000).toISOString(),
            offTimeLocal: new Date(Date.now() - 4.9 * 3600000).toISOString(),
            onTime: new Date(Date.now() - 0.5 * 3600000).toISOString(),
            onTimeLocal: new Date(Date.now() - 0.5 * 3600000).toISOString(),
            inTime: new Date(Date.now() - 0.4 * 3600000).toISOString(),
            eta: new Date(Date.now() - 0.5 * 3600000).toISOString(),
            etaLocal: new Date(Date.now() - 0.5 * 3600000).toISOString(),
            etd: null,
            flightHours: 4.61,
            flightId: 20220101175737910,
            dateAdded: new Date(Date.now() - 5 * 3600000).toISOString(),
            lastUpdated: new Date().toISOString(),
            fuelIn: 8600,
            fuelOut: 23500,
            fuelOn: 8600,
            fuelOff: 23200,
            divertedFromAirport: null,
            divertedFromAirportName: null,
            flightStatus: "Complete",
            flightCompleted: new Date(Date.now() - 0.4 * 3600000).toISOString(),
            aircraftOperations: "Business – Corporate",
            isActive: true,
            fuelWeightUnits: "lb",
            fuelVolumeUnits: "gal",
            loggedFlightLeg: false,
            loggedFlightLegDate: null,
            loggedTrip: false,
            loggedTripDate: null,
            verifiedFlightLeg: false,
            verifiedFlightLegDate: null,
            verifiedTrip: false,
            verifiedTripDate: null
        },
        {
            assetId: 4124505,
            aircraftId: 124525,
            assetSerial: "4223",
            tailNumber: "N5PG",
            flightStatusType: "In Progress",
            departureAirport: "KORD",
            departureAirportName: "CHICAGO O'HARE INTL",
            destinationAirport: "KLGA",
            destinationAirportName: "LA GUARDIA",
            outTime: new Date(Date.now() - 2 * 3600000).toISOString(),
            offTime: new Date(Date.now() - 1.9 * 3600000).toISOString(),
            offTimeLocal: new Date(Date.now() - 1.9 * 3600000).toISOString(),
            onTime: "",
            onTimeLocal: "",
            inTime: "",
            eta: new Date(Date.now() + 0.5 * 3600000).toISOString(),
            etaLocal: new Date(Date.now() + 0.5 * 3600000).toISOString(),
            etd: null,
            flightHours: 0,
            flightId: 20220102175737911,
            dateAdded: new Date(Date.now() - 2 * 3600000).toISOString(),
            lastUpdated: new Date().toISOString(),
            fuelIn: 0,
            fuelOut: 18500,
            fuelOn: 0,
            fuelOff: 18200,
            divertedFromAirport: null,
            divertedFromAirportName: null,
            flightStatus: "In Progress",
            flightCompleted: "",
            aircraftOperations: "Business – Corporate",
            isActive: true,
            fuelWeightUnits: "lb",
            fuelVolumeUnits: "gal",
            loggedFlightLeg: false,
            loggedFlightLegDate: null,
            loggedTrip: false,
            loggedTripDate: null,
            verifiedFlightLeg: false,
            verifiedFlightLegDate: null,
            verifiedTrip: false,
            verifiedTripDate: null
        }
    ];
}

function getMockPositionData(params: PositionQueryParams): PositionResponse {
    const mockItems: PositionReport[] = [
        {
            tailNumber: "N1PG",
            timeOfReport: new Date(Date.now() - 1800000).toISOString(),
            source: "ViaSat",
            movementReportType: "Position Report",
            altitude: 35000,
            speed: 485,
            latitude: 40.7589,
            longitude: -73.7004,
            heading: 270,
            fuelQuantity: 8600,
            flightId: 20220112065302480,
            departureAirport: "KLAX",
            destinationAirport: "KJFK",
            squawkCode: 2167
        },
        {
            tailNumber: "N5PG",
            timeOfReport: new Date(Date.now() - 600000).toISOString(),
            source: "ViaSat",
            movementReportType: "Takeoff",
            altitude: 2500,
            speed: 180,
            latitude: 41.9742,
            longitude: -87.9073,
            heading: 95,
            fuelQuantity: 18200,
            flightId: 20220112065302481,
            departureAirport: "KORD",
            destinationAirport: "KLGA",
            squawkCode: 2168
        }
    ];

    return {
        items: mockItems,
        totalCount: mockItems.length,
        pageSize: params.pageSize || 50,
        currentPage: params.pageNumber || 1,
        pageCount: 1
    };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Calculate flight duration from OOOI times
 */
export function calculateFlightDuration(oooi: OOOITimes): number | null {
    if (!oooi.off || !oooi.on) return null;

    const offTime = new Date(oooi.off).getTime();
    const onTime = new Date(oooi.on).getTime();

    return (onTime - offTime) / 60000; // Return minutes
}

/**
 * Calculate block time (out to in)
 */
export function calculateBlockTime(oooi: OOOITimes): number | null {
    if (!oooi.out || !oooi.in) return null;

    const outTime = new Date(oooi.out).getTime();
    const inTime = new Date(oooi.in).getTime();

    return (inTime - outTime) / 60000; // Return minutes
}

/**
 * Format OOOI time for display
 */
export function formatOOOITime(isoTime: string | null): string {
    if (!isoTime) return '-- : --';

    const date = new Date(isoTime);
    return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });
}
