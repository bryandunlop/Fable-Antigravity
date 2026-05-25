// ─── Inventory V2 — Configurable Compartment Definitions ────────────────────

import type { AircraftCompartmentConfig, CompartmentDefinition } from './types';

// ─── Default G650 Compartments (8 sections) ─────────────────────────────────

const G650_COMPARTMENTS: CompartmentDefinition[] = [
  { id: 'fwd-lav', label: 'Forward Lavatory', icon: 'Droplets', color: 'text-cyan-400', sortOrder: 1 },
  { id: 'fwd-galley', label: 'Forward Galley', icon: 'Coffee', color: 'text-amber-400', sortOrder: 2 },
  { id: 'main-cabin', label: 'Main Cabin', icon: 'Armchair', color: 'text-blue-400', sortOrder: 3 },
  { id: 'aft-galley', label: 'Aft Galley', icon: 'UtensilsCrossed', color: 'text-orange-400', sortOrder: 4 },
  { id: 'aft-lav', label: 'Aft Lavatory', icon: 'Droplets', color: 'text-purple-400', sortOrder: 5 },
  { id: 'credenza', label: 'Credenza', icon: 'Package', color: 'text-emerald-400', sortOrder: 6 },
  { id: 'chiller', label: 'Chiller', icon: 'Snowflake', color: 'text-sky-400', sortOrder: 7 },
  { id: 'baggage', label: 'Baggage Compartment', icon: 'Luggage', color: 'text-indigo-400', sortOrder: 8 },
];

// ─── Default G500 Compartments (6 sections) ─────────────────────────────────

const G500_COMPARTMENTS: CompartmentDefinition[] = [
  { id: 'fwd-lav', label: 'Forward Lavatory', icon: 'Droplets', color: 'text-cyan-400', sortOrder: 1 },
  { id: 'fwd-galley', label: 'Galley', icon: 'Coffee', color: 'text-amber-400', sortOrder: 2 },
  { id: 'aft-galley', label: 'Aft Galley', icon: 'UtensilsCrossed', color: 'text-orange-400', sortOrder: 3 },
  { id: 'credenza', label: 'Credenza', icon: 'Package', color: 'text-emerald-400', sortOrder: 4 },
  { id: 'baggage', label: 'Baggage Compartment', icon: 'Luggage', color: 'text-indigo-400', sortOrder: 5 },
];

// ─── Default Configs ────────────────────────────────────────────────────────

export const DEFAULT_COMPARTMENT_CONFIGS: AircraftCompartmentConfig[] = [
  { aircraftType: 'G650', compartments: G650_COMPARTMENTS },
  { aircraftType: 'G500', compartments: G500_COMPARTMENTS },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

export function getCompartmentsForAircraft(
  configs: AircraftCompartmentConfig[],
  aircraftType: 'G650' | 'G500'
): CompartmentDefinition[] {
  const config = configs.find(c => c.aircraftType === aircraftType);
  return config
    ? [...config.compartments].sort((a, b) => a.sortOrder - b.sortOrder)
    : [];
}

export function getCompartmentLabel(
  configs: AircraftCompartmentConfig[],
  aircraftType: 'G650' | 'G500',
  compartmentId: string
): string {
  const compartments = getCompartmentsForAircraft(configs, aircraftType);
  return compartments.find(c => c.id === compartmentId)?.label ?? compartmentId;
}

// ─── localStorage persistence ───────────────────────────────────────────────

const STORAGE_KEY = 'inv-v2-compartment-configs';

export function loadCompartmentConfigs(): AircraftCompartmentConfig[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {
    // fall through to defaults
  }
  return DEFAULT_COMPARTMENT_CONFIGS;
}

export function saveCompartmentConfigs(configs: AircraftCompartmentConfig[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(configs));
}
