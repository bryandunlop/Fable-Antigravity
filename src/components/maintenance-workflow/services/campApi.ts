/**
 * CAMP API Service Layer
 * 
 * Interfaces designed for real CAMP Systems integration.
 * Currently backed by demo data — swap implementations when connecting to CAMP Connect / MTX API.
 * 
 * Real endpoints would be:
 *   GET  /v1/aircraft/{tailNumber}/due-items
 *   GET  /v1/task/{taskId}/details
 *   POST /v1/compliance
 */

import {
    demoAircraft,
    demoSquawks,
    demoDeferrals,
    demoWorkOrders,
    demoTechnicians,
    demoTimeLogs,
    demoHandovers,
    demoPredictiveAlerts,
    demoActivityFeed,
    melLibrary,
    ataChapters,
    Aircraft,
    Squawk,
    Deferral,
    WorkOrder,
    WOTask,
    Technician,
    TimeLog,
    HandoverRecord,
    PredictiveAlert,
    ActivityEvent,
    MELItem,
    ATAChapter,
} from '../data/demoData';

// ============================================================
// CAMP API Service
// ============================================================

export const CampApiService = {
    // --- Aircraft ---
    getFleet: async (): Promise<Aircraft[]> => {
        return [...demoAircraft];
    },

    getAircraft: async (tailNumber: string): Promise<Aircraft | undefined> => {
        return demoAircraft.find(a => a.tailNumber === tailNumber);
    },

    // --- Due List (CAMP equivalent: GET /v1/aircraft/{tail}/due-items) ---
    getDueList: async (tailNumber: string): Promise<WOTask[]> => {
        const wo = demoWorkOrders.filter(w => w.aircraftTail === tailNumber);
        return wo.flatMap(w => w.tasks.filter(t => t.source === 'CAMP'));
    },

    // --- Task Card (CAMP equivalent: GET /v1/task/{taskId}/details) ---
    getTaskCard: async (taskId: string): Promise<WOTask | undefined> => {
        for (const wo of demoWorkOrders) {
            const task = wo.tasks.find(t => t.id === taskId);
            if (task) return task;
        }
        return undefined;
    },

    // --- Compliance (CAMP equivalent: POST /v1/compliance) ---
    postComplianceRecord: async (taskId: string, data: {
        date: string;
        hours: number;
        cycles: number;
        technicianId: string;
    }): Promise<{ success: boolean; campConfirmation?: string }> => {
        // In real integration, this would POST to CAMP and get a confirmation
        console.log(`[CAMP API] Posting compliance for task ${taskId}:`, data);
        return { success: true, campConfirmation: `CAMP-CONF-${Date.now()}` };
    },

    // --- Squawks ---
    getSquawks: async (aircraftTail?: string): Promise<Squawk[]> => {
        if (aircraftTail) {
            return demoSquawks.filter(s => s.aircraftTail === aircraftTail);
        }
        return [...demoSquawks];
    },

    // --- MEL Library ---
    getMELLibrary: async (): Promise<MELItem[]> => {
        return [...melLibrary];
    },

    lookupMEL: async (ataCode: string): Promise<MELItem | undefined> => {
        return melLibrary.find(m => m.ataChapter === ataCode);
    },

    // --- ATA Codes ---
    getATAChapters: async (): Promise<ATAChapter[]> => {
        return [...ataChapters];
    },

    // --- Deferrals ---
    getDeferrals: async (): Promise<Deferral[]> => {
        return [...demoDeferrals];
    },

    // --- Work Orders ---
    getWorkOrders: async (aircraftTail?: string): Promise<WorkOrder[]> => {
        if (aircraftTail) {
            return demoWorkOrders.filter(w => w.aircraftTail === aircraftTail);
        }
        return [...demoWorkOrders];
    },

    // --- Technicians ---
    getTechnicians: async (): Promise<Technician[]> => {
        return [...demoTechnicians];
    },

    // --- Time Logs ---
    getTimeLogs: async (taskId?: string): Promise<TimeLog[]> => {
        if (taskId) {
            return demoTimeLogs.filter(t => t.taskId === taskId);
        }
        return [...demoTimeLogs];
    },

    // --- Handovers ---
    getHandovers: async (): Promise<HandoverRecord[]> => {
        return [...demoHandovers];
    },

    // --- Predictive Alerts ---
    getPredictiveAlerts: async (): Promise<PredictiveAlert[]> => {
        return [...demoPredictiveAlerts];
    },

    // --- Activity Feed ---
    getActivityFeed: async (): Promise<ActivityEvent[]> => {
        return [...demoActivityFeed];
    },
};
