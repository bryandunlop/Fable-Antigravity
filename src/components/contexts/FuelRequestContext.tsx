import React, { createContext, useContext, useState, ReactNode } from 'react';
import { toast } from 'sonner';
import { differenceInHours, parseISO } from 'date-fns';

// ==================== TYPES ====================

export interface FuelRequest {
    id: string;
    tripId: string;
    legId: string;
    flightNumber: string;
    tailNumber: string;
    departure: string;
    departureICAO: string;
    arrival: string;
    arrivalICAO: string;
    departureTime: string; // ISO 8601

    // Fuel details (pilots work in pounds)
    fuelRequestedPounds: number; // requested in pounds
    fuelRequestedGallonsEstimate: number; // auto-calculated estimate
    priority: 'normal' | 'urgent' | 'critical';
    pilotNotes: string;

    // Status tracking
    status: 'pending' | 'acknowledged' | 'sent-to-fuel-farm' | 'fueling' | 'completed' | 'cancelled';
    isLocked: boolean; // true if <4 hours to departure
    isLateChange: boolean; // true if edited <24 hours to departure

    // Pilot info
    requestedBy: string;
    requestedAt: string; // ISO 8601
    lastEditedAt?: string; // ISO 8601
    editCount: number;

    // Maintenance info
    acknowledgedBy?: string;
    acknowledgedAt?: string; // ISO 8601
    maintenanceNotes?: string;
    sentToFuelFarmBy?: string;
    sentToFuelFarmAt?: string; // ISO 8601

    // Fuel farm info (fuel farm works in gallons from meter)
    fuelFarmRecordId?: string; // links to FuelingRecord
    actualGallonsDispensed?: number; // from fuel farm meter
    actualPoundsCalculated?: number; // calculated from gallons
    fueledBy?: string; // fuel farm technician
    fueledAt?: string; // ISO 8601

    completedBy?: string;
    completedAt?: string; // ISO 8601

    // Notifications
    pilotNotified: boolean;
    maintenanceNotified: boolean;
    fuelFarmNotified: boolean;
}

interface FuelRequestContextType {
    fuelRequests: FuelRequest[];
    createFuelRequest: (request: Omit<FuelRequest, 'id' | 'requestedAt' | 'status' | 'isLocked' | 'isLateChange' | 'editCount' | 'pilotNotified' | 'maintenanceNotified' | 'fuelFarmNotified' | 'fuelRequestedGallonsEstimate'>) => void;
    updateFuelRequest: (id: string, updates: Partial<FuelRequest>) => boolean;
    acknowledgeFuelRequest: (id: string, acknowledgedBy: string, notes?: string) => void;
    sendToFuelFarm: (id: string, sentBy: string) => void;
    completeFuelRequest: (id: string, actualGallons: number, fueledBy: string, fuelFarmRecordId: string) => void;
    getFuelRequestsForTrip: (tripId: string) => FuelRequest[];
    getFuelRequestsForLeg: (legId: string) => FuelRequest | undefined;
    getFuelRequestsForMaintenance: () => FuelRequest[];
    getFuelRequestsForFuelFarm: () => FuelRequest[];
    canEditRequest: (request: FuelRequest) => { canEdit: boolean; reason?: string };
    getHoursUntilDeparture: (departureTime: string) => number;
}

// ==================== CONVERSION UTILITIES ====================

// Jet A-1 fuel density: ~6.7 lbs/gallon (varies with temperature)
const FUEL_DENSITY_LBS_PER_GALLON = 6.7;

export function poundsToGallons(pounds: number): number {
    return Math.round(pounds / FUEL_DENSITY_LBS_PER_GALLON);
}

export function gallonsToPounds(gallons: number): number {
    return Math.round(gallons * FUEL_DENSITY_LBS_PER_GALLON);
}

// ==================== CONTEXT ====================

const FuelRequestContext = createContext<FuelRequestContextType | undefined>(undefined);

export function useFuelRequests() {
    const context = useContext(FuelRequestContext);
    if (!context) {
        throw new Error('useFuelRequests must be used within a FuelRequestProvider');
    }
    return context;
}

interface FuelRequestProviderProps {
    children: ReactNode;
}

export function FuelRequestProvider({ children }: FuelRequestProviderProps) {
    const [fuelRequests, setFuelRequests] = useState<FuelRequest[]>([]);

    // Calculate hours until departure
    const getHoursUntilDeparture = (departureTime: string): number => {
        const now = new Date();
        const departure = parseISO(departureTime);
        return differenceInHours(departure, now);
    };

    // Check if request can be edited
    const canEditRequest = (request: FuelRequest): { canEdit: boolean; reason?: string } => {
        if (request.status === 'completed' || request.status === 'cancelled') {
            return { canEdit: false, reason: 'Request is already completed or cancelled' };
        }

        const hoursUntil = getHoursUntilDeparture(request.departureTime);

        if (hoursUntil <= 4) {
            return { canEdit: false, reason: 'Request is locked - less than 4 hours until departure' };
        }

        if (request.status === 'sent-to-fuel-farm' || request.status === 'fueling') {
            return { canEdit: false, reason: 'Request has been sent to fuel farm and cannot be edited' };
        }

        return { canEdit: true };
    };

    // Create new fuel request
    const createFuelRequest = (request: Omit<FuelRequest, 'id' | 'requestedAt' | 'status' | 'isLocked' | 'isLateChange' | 'editCount' | 'pilotNotified' | 'maintenanceNotified' | 'fuelFarmNotified' | 'fuelRequestedGallonsEstimate'>) => {
        const hoursUntil = getHoursUntilDeparture(request.departureTime);

        if (hoursUntil <= 4) {
            toast.error('Cannot create fuel request - less than 4 hours until departure');
            return;
        }

        const newRequest: FuelRequest = {
            ...request,
            id: `FR-${Date.now()}`,
            requestedAt: new Date().toISOString(),
            status: 'pending',
            isLocked: false,
            isLateChange: hoursUntil <= 24,
            editCount: 0,
            pilotNotified: false,
            maintenanceNotified: true, // Notify maintenance of new request
            fuelFarmNotified: false,
            fuelRequestedGallonsEstimate: poundsToGallons(request.fuelRequestedPounds)
        };

        setFuelRequests(prev => [...prev, newRequest]);
        toast.success(`Fuel request created for ${request.flightNumber}`);

        if (newRequest.isLateChange) {
            toast.warning('Request created within 24 hours of departure - flagged for maintenance review');
        }
    };

    // Update fuel request
    const updateFuelRequest = (id: string, updates: Partial<FuelRequest>): boolean => {
        const request = fuelRequests.find(r => r.id === id);
        if (!request) {
            toast.error('Fuel request not found');
            return false;
        }

        const { canEdit, reason } = canEditRequest(request);
        if (!canEdit) {
            toast.error(reason || 'Cannot edit this request');
            return false;
        }

        const hoursUntil = getHoursUntilDeparture(request.departureTime);
        const isLateChange = hoursUntil <= 24;

        setFuelRequests(prev => prev.map(r => {
            if (r.id === id) {
                const updatedRequest = {
                    ...r,
                    ...updates,
                    lastEditedAt: new Date().toISOString(),
                    editCount: r.editCount + 1,
                    isLateChange: isLateChange || r.isLateChange,
                    maintenanceNotified: true, // Re-notify maintenance of changes
                    fuelRequestedGallonsEstimate: updates.fuelRequestedPounds
                        ? poundsToGallons(updates.fuelRequestedPounds)
                        : r.fuelRequestedGallonsEstimate
                };
                return updatedRequest;
            }
            return r;
        }));

        toast.success('Fuel request updated');

        if (isLateChange && request.editCount === 0) {
            toast.warning('Edit made within 24 hours of departure - flagged for maintenance review');
        }

        return true;
    };

    // Acknowledge fuel request (maintenance)
    const acknowledgeFuelRequest = (id: string, acknowledgedBy: string, notes?: string) => {
        setFuelRequests(prev => prev.map(r => {
            if (r.id === id) {
                return {
                    ...r,
                    status: 'acknowledged' as const,
                    acknowledgedBy,
                    acknowledgedAt: new Date().toISOString(),
                    maintenanceNotes: notes || r.maintenanceNotes,
                    pilotNotified: true // Notify pilot of acknowledgment
                };
            }
            return r;
        }));

        toast.success('Fuel request acknowledged');
    };

    // Send to fuel farm (maintenance)
    const sendToFuelFarm = (id: string, sentBy: string) => {
        setFuelRequests(prev => prev.map(r => {
            if (r.id === id) {
                return {
                    ...r,
                    status: 'sent-to-fuel-farm' as const,
                    sentToFuelFarmBy: sentBy,
                    sentToFuelFarmAt: new Date().toISOString(),
                    fuelFarmNotified: true, // Notify fuel farm
                    pilotNotified: true // Notify pilot
                };
            }
            return r;
        }));

        toast.success('Fuel request sent to fuel farm');
    };

    // Complete fuel request (fuel farm)
    const completeFuelRequest = (id: string, actualGallons: number, fueledBy: string, fuelFarmRecordId: string) => {
        const actualPounds = gallonsToPounds(actualGallons);

        setFuelRequests(prev => prev.map(r => {
            if (r.id === id) {
                return {
                    ...r,
                    status: 'completed' as const,
                    actualGallonsDispensed: actualGallons,
                    actualPoundsCalculated: actualPounds,
                    fueledBy,
                    fueledAt: new Date().toISOString(),
                    fuelFarmRecordId,
                    completedBy: fueledBy,
                    completedAt: new Date().toISOString(),
                    isLocked: true,
                    pilotNotified: true, // Notify pilot of completion
                    maintenanceNotified: true // Notify maintenance of completion
                };
            }
            return r;
        }));

        toast.success(`Fuel request completed - ${actualGallons} gallons (${actualPounds} lbs) loaded`);
    };

    // Get fuel requests for a specific trip
    const getFuelRequestsForTrip = (tripId: string): FuelRequest[] => {
        return fuelRequests.filter(r => r.tripId === tripId);
    };

    // Get fuel request for a specific leg
    const getFuelRequestsForLeg = (legId: string): FuelRequest | undefined => {
        return fuelRequests.find(r => r.legId === legId);
    };

    // Get fuel requests for maintenance (pending and acknowledged)
    const getFuelRequestsForMaintenance = (): FuelRequest[] => {
        return fuelRequests.filter(r =>
            r.status === 'pending' || r.status === 'acknowledged'
        ).sort((a, b) => {
            // Sort by departure time (soonest first)
            return new Date(a.departureTime).getTime() - new Date(b.departureTime).getTime();
        });
    };

    // Get fuel requests for fuel farm (sent-to-fuel-farm and fueling)
    const getFuelRequestsForFuelFarm = (): FuelRequest[] => {
        return fuelRequests.filter(r =>
            r.status === 'sent-to-fuel-farm' || r.status === 'fueling'
        ).sort((a, b) => {
            // Sort by departure time (soonest first)
            return new Date(a.departureTime).getTime() - new Date(b.departureTime).getTime();
        });
    };

    const value: FuelRequestContextType = {
        fuelRequests,
        createFuelRequest,
        updateFuelRequest,
        acknowledgeFuelRequest,
        sendToFuelFarm,
        completeFuelRequest,
        getFuelRequestsForTrip,
        getFuelRequestsForLeg,
        getFuelRequestsForMaintenance,
        getFuelRequestsForFuelFarm,
        canEditRequest,
        getHoursUntilDeparture
    };

    return (
        <FuelRequestContext.Provider value={value}>
            {children}
        </FuelRequestContext.Provider>
    );
}
