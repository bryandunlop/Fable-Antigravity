import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface SIFLRates {
    effectiveDate: string;
    terminalCharge: number;
    mileageRates: {
        tier1: number; // 0-500
        tier2: number; // 501-1500
        tier3: number; // Over 1500
    };
}

interface TaxContextType {
    currentRates: SIFLRates;
    updateRates: (newRates: SIFLRates) => void;
    profiles: TaxProfile[];
    addProfile: (profile: TaxProfile) => void;
    updateProfile: (id: string, updates: Partial<TaxProfile>) => void;
    deleteProfile: (id: string) => void;
}

export interface TaxProfile {
    id: string;
    name: string;
    tNumber?: string;
    title?: string;
    designation: 'Standard' | 'Band 7' | 'CEO' | 'Board Member';
}

const defaultProfiles: TaxProfile[] = [
    { id: 'tp1', name: 'Executive A', tNumber: 'T-8842', title: 'CEO', designation: 'CEO' },
    { id: 'tp2', name: 'Executive B', tNumber: 'T-1193', title: 'CFO', designation: 'Band 7' },
];

const defaultRates: SIFLRates = {
    effectiveDate: '2025-07-01',
    terminalCharge: 53.62, // 2025 H2
    mileageRates: {
        tier1: 0.2933,
        tier2: 0.2237,
        tier3: 0.2150
    }
};

const TaxContext = createContext<TaxContextType | undefined>(undefined);

export function TaxProvider({ children }: { children: ReactNode }) {
    const [currentRates, setCurrentRates] = useState<SIFLRates>(defaultRates);
    const [profiles, setProfiles] = useState<TaxProfile[]>(defaultProfiles);

    const addProfile = (profile: TaxProfile) => {
        setProfiles(prev => [...prev, profile]);
    };

    const updateProfile = (id: string, updates: Partial<TaxProfile>) => {
        setProfiles(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
    };

    const deleteProfile = (id: string) => {
        setProfiles(prev => prev.filter(p => p.id !== id));
    };

    const updateRates = (newRates: SIFLRates) => {
        setCurrentRates(newRates);
        // In a real app, this would persist to backend
        console.log('Updated SIFL Rates:', newRates);
    };

    return (
        <TaxContext.Provider value={{ currentRates, updateRates, profiles, addProfile, updateProfile, deleteProfile }}>
            {children}
        </TaxContext.Provider>
    );
}

export function useTaxContext() {
    const context = useContext(TaxContext);
    if (context === undefined) {
        throw new Error('useTaxContext must be used within a TaxProvider');
    }
    return context;
}
