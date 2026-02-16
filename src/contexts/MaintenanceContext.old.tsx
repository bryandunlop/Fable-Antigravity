import React, { createContext, useContext, useState, useEffect } from 'react';

// --- Types ---

export type ShiftType = 'AM' | 'PM';
export type AircraftStatus = 'Away' | 'In Service' | 'Not in Service' | string;
export type CleaningStatus = 'Apex' | 'Maintenance' | 'Crew' | 'N/A';

export interface AircraftReport {
    tailNumber: string;
    status: AircraftStatus;
    discrepancies: string;
    cleaned: CleaningStatus;
    fuelOnBoard: string;
    additionalInfo: string;
}

// Previously hardcoded keys now managed dynamically
export interface TurndownReport {
    id: string;
    date: string; // ISO Date String
    shift: ShiftType;
    submittedBy: string; // Name
    submittedAt: string; // ISO Timestamp

    // Dynamic key-value pairs
    facilityChecks: Record<string, boolean>;

    // Aircraft
    aircraftReports: AircraftReport[];

    // Dynamic key-value pairs
    additionalNotes: Record<string, string>;
}

export interface AircraftConfig {
    id: string;
    tailNumber: string;
    isActive: boolean;
}

export interface FacilityCheckConfig {
    id: string;
    label: string;
    isActive: boolean;
}

export interface AircraftStatusConfig {
    id: string;
    value: string; // e.g. "In Service"
    isActive: boolean;
}

export interface AdditionalNoteConfig {
    id: string;
    label: string;
    isActive: boolean;
}

interface MaintenanceContextType {
    reports: TurndownReport[];

    // Configurations
    aircraftConfig: AircraftConfig[];
    facilityCheckConfig: FacilityCheckConfig[];
    aircraftStatusConfig: AircraftStatusConfig[];
    additionalNoteConfig: AdditionalNoteConfig[];

    // Actions
    submitReport: (report: Omit<TurndownReport, 'id' | 'submittedAt'>) => void;
    updateAircraftConfig: (configs: AircraftConfig[]) => void;
    updateFacilityCheckConfig: (configs: FacilityCheckConfig[]) => void;
    updateAircraftStatusConfig: (configs: AircraftStatusConfig[]) => void;
    updateAdditionalNoteConfig: (configs: AdditionalNoteConfig[]) => void;

    getReportById: (id: string) => TurndownReport | undefined;
}

// --- Initial Data ---

const INITIAL_AIRCRAFT_CONFIG: AircraftConfig[] = [
    { id: 'AC-1', tailNumber: 'N1PG', isActive: true },
    { id: 'AC-2', tailNumber: 'N5PG', isActive: true },
    { id: 'AC-3', tailNumber: 'N2PG', isActive: true },
    { id: 'AC-4', tailNumber: 'N6PG', isActive: true },
];

const INITIAL_FACILITY_CHECKS: FacilityCheckConfig[] = [
    { id: 'FC-1', label: 'Commissary Dishwasher Started', isActive: true },
    { id: 'FC-2', label: 'International Garbage on Arrivals', isActive: true },
    { id: 'FC-3', label: 'Hangar Close Up', isActive: true },
    { id: 'FC-4', label: 'Fuel Farm Inspection', isActive: true },
    { id: 'FC-5', label: 'Check Tool Sign Out', isActive: true },
];

const INITIAL_AIRCRAFT_STATUS: AircraftStatusConfig[] = [
    { id: 'AS-1', value: 'In Service', isActive: true },
    { id: 'AS-2', value: 'Away', isActive: true },
    { id: 'AS-3', value: 'Not in Service', isActive: true },
];

const INITIAL_ADDITIONAL_NOTES: AdditionalNoteConfig[] = [
    { id: 'AN-1', label: 'Additional Tasks', isActive: true },
    { id: 'AN-2', label: 'Stockroom', isActive: true },
    { id: 'AN-3', label: 'Additional Facility Information', isActive: true },
    { id: 'AN-4', label: 'Customs and Border Protection', isActive: true },
];

// --- Context & Provider ---

const MaintenanceContext = createContext<MaintenanceContextType | undefined>(undefined);

export const MaintenanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [reports, setReports] = useState<TurndownReport[]>([]);

    const [aircraftConfig, setAircraftConfig] = useState<AircraftConfig[]>([]);
    const [facilityCheckConfig, setFacilityCheckConfig] = useState<FacilityCheckConfig[]>([]);
    const [aircraftStatusConfig, setAircraftStatusConfig] = useState<AircraftStatusConfig[]>([]);
    const [additionalNoteConfig, setAdditionalNoteConfig] = useState<AdditionalNoteConfig[]>([]);

    // Helper to load/save config
    const usePersistentState = <T,>(key: string, initialValue: T, setter: React.Dispatch<React.SetStateAction<T>>) => {
        useEffect(() => {
            const stored = localStorage.getItem(key);
            if (stored) {
                setter(JSON.parse(stored));
            } else {
                setter(initialValue);
                localStorage.setItem(key, JSON.stringify(initialValue));
            }
        }, []);
    };

    // Load configurations
    usePersistentState('maintenance_aircraft_config', INITIAL_AIRCRAFT_CONFIG, setAircraftConfig);
    usePersistentState('maintenance_facility_check_config', INITIAL_FACILITY_CHECKS, setFacilityCheckConfig);
    usePersistentState('maintenance_aircraft_status_config', INITIAL_AIRCRAFT_STATUS, setAircraftStatusConfig);
    usePersistentState('maintenance_additional_note_config', INITIAL_ADDITIONAL_NOTES, setAdditionalNoteConfig);

    // Load Reports separate from config helpers as it doesn't have a default
    useEffect(() => {
        const storedReports = localStorage.getItem('maintenance_turndown_reports');
        if (storedReports) {
            setReports(JSON.parse(storedReports));
        }
    }, []);

    // Sync helpers
    const saveToStorage = (key: string, data: any) => {
        localStorage.setItem(key, JSON.stringify(data));
    };

    // Actions
    const submitReport = (reportData: Omit<TurndownReport, 'id' | 'submittedAt'>) => {
        const newReport: TurndownReport = {
            ...reportData,
            id: `TR-${Date.now()}`,
            submittedAt: new Date().toISOString(),
        };
        const updatedReports = [newReport, ...reports];
        setReports(updatedReports);
        saveToStorage('maintenance_turndown_reports', updatedReports);
    };

    const updateAircraftConfig = (configs: AircraftConfig[]) => {
        setAircraftConfig(configs);
        saveToStorage('maintenance_aircraft_config', configs);
    };

    const updateFacilityCheckConfig = (configs: FacilityCheckConfig[]) => {
        setFacilityCheckConfig(configs);
        saveToStorage('maintenance_facility_check_config', configs);
    };

    const updateAircraftStatusConfig = (configs: AircraftStatusConfig[]) => {
        setAircraftStatusConfig(configs);
        saveToStorage('maintenance_aircraft_status_config', configs);
    };

    const updateAdditionalNoteConfig = (configs: AdditionalNoteConfig[]) => {
        setAdditionalNoteConfig(configs);
        saveToStorage('maintenance_additional_note_config', configs);
    };

    const getReportById = (id: string) => {
        return reports.find(r => r.id === id);
    };

    return (
        <MaintenanceContext.Provider
            value={{
                reports,

                aircraftConfig,
                facilityCheckConfig,
                aircraftStatusConfig,
                additionalNoteConfig,

                submitReport,
                updateAircraftConfig,
                updateFacilityCheckConfig,
                updateAircraftStatusConfig,
                updateAdditionalNoteConfig,

                getReportById,
            }}
        >
            {children}
        </MaintenanceContext.Provider>
    );
};

export const useMaintenance = () => {
    const context = useContext(MaintenanceContext);
    if (!context) {
        throw new Error('useMaintenance must be used within a MaintenanceProvider');
    }
    return context;
};
