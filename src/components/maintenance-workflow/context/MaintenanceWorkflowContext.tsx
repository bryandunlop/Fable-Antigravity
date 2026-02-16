import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { CampApiService } from '../services/campApi';
import {
    Aircraft,
    Squawk,
    Deferral,
    WorkOrder,
    Technician,
    TimeLog,
    HandoverRecord,
    PredictiveAlert,
    ActivityEvent,
    MELItem,
    ATAChapter,
    SquawkStatus,
    WOStatus,
} from '../data/demoData';

// ============================================================
// CONTEXT TYPES
// ============================================================

interface MaintenanceWorkflowState {
    // Data
    aircraft: Aircraft[];
    squawks: Squawk[];
    deferrals: Deferral[];
    workOrders: WorkOrder[];
    technicians: Technician[];
    timeLogs: TimeLog[];
    handovers: HandoverRecord[];
    predictiveAlerts: PredictiveAlert[];
    activityFeed: ActivityEvent[];
    melLibrary: MELItem[];
    ataChapters: ATAChapter[];
    loading: boolean;

    // Stats
    stats: {
        openSquawks: number;
        activeDeferrals: number;
        inProgressWOs: number;
        aogCount: number;
        techsClockedIn: number;
        pendingHandovers: number;
    };

    // Actions
    submitSquawk: (squawk: Omit<Squawk, 'id' | 'reportedAt' | 'status' | 'attachments'>) => void;
    updateSquawkStatus: (squawkId: string, status: SquawkStatus) => void;
    applyDeferral: (squawkId: string, melItem: MELItem) => void;
    createWorkOrder: (workOrder: Omit<WorkOrder, 'id' | 'woNumber' | 'createdAt' | 'tasks'>) => void;
    updateWorkOrderStatus: (woId: string, status: WOStatus) => void;
    clockOn: (techId: string, taskId: string) => void;
    clockOff: (techId: string, taskId: string) => void;
    submitHandover: (taskId: string, techId: string, note: string) => void;
    acknowledgeHandover: (handoverId: string, techId: string) => void;
}

const MaintenanceWorkflowContext = createContext<MaintenanceWorkflowState | undefined>(undefined);

// ============================================================
// PROVIDER
// ============================================================

export function MaintenanceWorkflowProvider({ children }: { children: ReactNode }) {
    const [aircraft, setAircraft] = useState<Aircraft[]>([]);
    const [squawks, setSquawks] = useState<Squawk[]>([]);
    const [deferrals, setDeferrals] = useState<Deferral[]>([]);
    const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
    const [technicians, setTechnicians] = useState<Technician[]>([]);
    const [timeLogs, setTimeLogs] = useState<TimeLog[]>([]);
    const [handovers, setHandovers] = useState<HandoverRecord[]>([]);
    const [predictiveAlerts, setPredictiveAlerts] = useState<PredictiveAlert[]>([]);
    const [activityFeed, setActivityFeed] = useState<ActivityEvent[]>([]);
    const [melLibrary, setMelLibrary] = useState<MELItem[]>([]);
    const [ataChapters, setAtaChapters] = useState<ATAChapter[]>([]);
    const [loading, setLoading] = useState(true);

    // Load all data on mount
    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            const [ac, sq, def, wo, tech, tl, ho, pa, af, mel, ata] = await Promise.all([
                CampApiService.getFleet(),
                CampApiService.getSquawks(),
                CampApiService.getDeferrals(),
                CampApiService.getWorkOrders(),
                CampApiService.getTechnicians(),
                CampApiService.getTimeLogs(),
                CampApiService.getHandovers(),
                CampApiService.getPredictiveAlerts(),
                CampApiService.getActivityFeed(),
                CampApiService.getMELLibrary(),
                CampApiService.getATAChapters(),
            ]);
            setAircraft(ac);
            setSquawks(sq);
            setDeferrals(def);
            setWorkOrders(wo);
            setTechnicians(tech);
            setTimeLogs(tl);
            setHandovers(ho);
            setPredictiveAlerts(pa);
            setActivityFeed(af);
            setMelLibrary(mel);
            setAtaChapters(ata);
            setLoading(false);
        };
        loadData();
    }, []);

    // Computed stats
    const stats = {
        openSquawks: squawks.filter(s => s.status === 'new' || s.status === 'in-work').length,
        activeDeferrals: deferrals.filter(d => d.status === 'active' || d.status === 'provisional').length,
        inProgressWOs: workOrders.filter(w => w.status === 'in-work' || w.status === 'assigned').length,
        aogCount: workOrders.filter(w => w.priority === 'aog' && w.status !== 'closed').length,
        techsClockedIn: technicians.filter(t => t.clockedIn).length,
        pendingHandovers: handovers.filter(h => !h.acknowledged).length,
    };

    // --- ACTIONS ---

    const submitSquawk = useCallback((data: Omit<Squawk, 'id' | 'reportedAt' | 'status' | 'attachments'>) => {
        const newSquawk: Squawk = {
            ...data,
            id: `SQ-${String(squawks.length + 1).padStart(3, '0')}`,
            reportedAt: new Date(),
            status: 'new',
            attachments: [],
        };
        setSquawks(prev => [newSquawk, ...prev]);
        setActivityFeed(prev => [{
            id: `EV-${Date.now()}`,
            type: 'squawk',
            description: `New squawk reported: ${data.ataTitle} on ${data.aircraftTail}`,
            actor: data.reportedBy,
            aircraftTail: data.aircraftTail,
            timestamp: new Date(),
        }, ...prev]);
    }, [squawks.length]);

    const updateSquawkStatus = useCallback((squawkId: string, status: SquawkStatus) => {
        setSquawks(prev => prev.map(s => s.id === squawkId ? { ...s, status } : s));
    }, []);

    const applyDeferral = useCallback((squawkId: string, melItem: MELItem) => {
        const newDeferral: Deferral = {
            id: `DEF-${String(deferrals.length + 1).padStart(3, '0')}`,
            squawkId,
            melReference: melItem.melId,
            category: melItem.repairCategory,
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + melItem.maxDeferralDays * 24 * 60 * 60 * 1000),
            operationalProcedures: melItem.operationalProcedures,
            maintenanceProcedures: melItem.maintenanceProcedures,
            mProcedureCompleted: false,
            pilotAcknowledged: false,
            status: 'provisional',
            placard: `${melItem.itemTitle} — INOP`,
        };
        setDeferrals(prev => [newDeferral, ...prev]);
        setSquawks(prev => prev.map(s => s.id === squawkId ? { ...s, status: 'deferred', deferralId: newDeferral.id, melReference: melItem.melId } : s));
        setActivityFeed(prev => [{
            id: `EV-${Date.now()}`,
            type: 'deferral',
            description: `MEL deferral applied: ${melItem.itemTitle} (Cat ${melItem.repairCategory})`,
            actor: 'Maint. Control',
            timestamp: new Date(),
        }, ...prev]);
    }, [deferrals.length]);

    const createWorkOrder = useCallback((data: Omit<WorkOrder, 'id' | 'woNumber' | 'createdAt' | 'tasks'>) => {
        const newWO: WorkOrder = {
            ...data,
            id: `WO-2026-${String(workOrders.length + 6).padStart(3, '0')}`,
            woNumber: `WO-2026-${String(workOrders.length + 6).padStart(3, '0')}`,
            createdAt: new Date(),
            tasks: [],
        };
        setWorkOrders(prev => [newWO, ...prev]);
        setActivityFeed(prev => [{
            id: `EV-${Date.now()}`,
            type: 'work-order',
            description: `Work order created: ${data.title}`,
            actor: 'Maint. Control',
            aircraftTail: data.aircraftTail,
            timestamp: new Date(),
        }, ...prev]);
    }, [workOrders.length]);

    const updateWorkOrderStatus = useCallback((woId: string, status: WOStatus) => {
        setWorkOrders(prev => prev.map(w => w.id === woId ? { ...w, status } : w));
    }, []);

    const clockOn = useCallback((techId: string, taskId: string) => {
        const newLog: TimeLog = {
            id: `TL-${Date.now()}`,
            taskId,
            technicianId: techId,
            startTime: new Date(),
            type: 'work',
        };
        setTimeLogs(prev => [newLog, ...prev]);
        setTechnicians(prev => prev.map(t => t.id === techId ? { ...t, clockedIn: true, currentTaskId: taskId } : t));
        const tech = technicians.find(t => t.id === techId);
        setActivityFeed(prev => [{
            id: `EV-${Date.now()}`,
            type: 'clock',
            description: `Clocked ON to task ${taskId}`,
            actor: tech?.name || techId,
            timestamp: new Date(),
        }, ...prev]);
    }, [technicians]);

    const clockOff = useCallback((techId: string, taskId: string) => {
        setTimeLogs(prev => prev.map(tl => {
            if (tl.taskId === taskId && tl.technicianId === techId && !tl.endTime) {
                const duration = Math.round((Date.now() - tl.startTime.getTime()) / 60000);
                return { ...tl, endTime: new Date(), durationMinutes: duration };
            }
            return tl;
        }));
        setTechnicians(prev => prev.map(t => t.id === techId ? { ...t, currentTaskId: undefined } : t));
    }, []);

    const submitHandover = useCallback((taskId: string, techId: string, note: string) => {
        const newHandover: HandoverRecord = {
            id: `HO-${Date.now()}`,
            taskId,
            outgoingTechId: techId,
            statusNote: note,
            createdAt: new Date(),
            acknowledged: false,
        };
        setHandovers(prev => [newHandover, ...prev]);
        const tech = technicians.find(t => t.id === techId);
        setActivityFeed(prev => [{
            id: `EV-${Date.now()}`,
            type: 'handover',
            description: `Shift handover submitted for task ${taskId}`,
            actor: tech?.name || techId,
            timestamp: new Date(),
        }, ...prev]);
    }, [technicians]);

    const acknowledgeHandover = useCallback((handoverId: string, techId: string) => {
        setHandovers(prev => prev.map(h =>
            h.id === handoverId ? { ...h, acknowledged: true, acknowledgedAt: new Date(), incomingTechId: techId } : h
        ));
    }, []);

    return (
        <MaintenanceWorkflowContext.Provider value={{
            aircraft, squawks, deferrals, workOrders, technicians,
            timeLogs, handovers, predictiveAlerts, activityFeed,
            melLibrary, ataChapters, loading, stats,
            submitSquawk, updateSquawkStatus, applyDeferral,
            createWorkOrder, updateWorkOrderStatus,
            clockOn, clockOff, submitHandover, acknowledgeHandover,
        }}>
            {children}
        </MaintenanceWorkflowContext.Provider>
    );
}

// ============================================================
// HOOK
// ============================================================

export function useMaintenanceWorkflow() {
    const context = useContext(MaintenanceWorkflowContext);
    if (!context) {
        throw new Error('useMaintenanceWorkflow must be used within a MaintenanceWorkflowProvider');
    }
    return context;
}
