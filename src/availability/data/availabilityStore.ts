// THIN localStorage wrapper for downtime blocks and scheduler overlays — the only
// untested seam in src/availability. Same load/save idiom as tech-log/bridge.ts.
//
// Its OWN key, deliberately:
//   - not the booking-portal reducer, which is in-memory and resets on unmount, while a hold
//     placed by scheduling has to still be there when an executive loads /executive; and
//   - not TechLogState, because a scheduling-owned ops entity does not belong in the blob whose
//     whole persistence story is signed regulatory records, and coupling the two reset
//     lifecycles would mean wiping holds to reseed defects.
//
// resetAllDemoData() clears storage wholesale, so this reseeds from fixtures on its own.

import { buildAvailabilityFixtures } from './downtimeFixtures';
import type { AvailabilityData, MaintenanceDowntimeBlock, SchedulerOverlay } from '../types';

export const STORAGE_KEY = 'fleet-availability-state';
export const VERSION_KEY = 'fleet-availability-data-version';
export const DATA_VERSION = '1';

export function loadAvailabilityData(nowUtc: string): AvailabilityData {
  const seed = buildAvailabilityFixtures(nowUtc);
  if (typeof localStorage === 'undefined') return seed;
  try {
    if (localStorage.getItem(VERSION_KEY) !== DATA_VERSION) return seed;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seed;
    const parsed = JSON.parse(raw) as Partial<AvailabilityData>;
    return {
      downtimeBlocks: parsed.downtimeBlocks ?? seed.downtimeBlocks,
      overlays: parsed.overlays ?? seed.overlays,
    };
  } catch {
    return seed;
  }
}

function save(data: AvailabilityData): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  localStorage.setItem(VERSION_KEY, DATA_VERSION);
}

/** Insert or replace a block by id. Local blocks are never pushed anywhere — myairops is pull-only. */
export function saveDowntimeBlock(block: MaintenanceDowntimeBlock, nowUtc: string): AvailabilityData {
  const data = loadAvailabilityData(nowUtc);
  const next: AvailabilityData = {
    ...data,
    downtimeBlocks: data.downtimeBlocks.some(b => b.id === block.id)
      ? data.downtimeBlocks.map(b => (b.id === block.id ? block : b))
      : [...data.downtimeBlocks, block],
  };
  save(next);
  return next;
}

/** APPEND-ONLY. A release supersedes a hold by appending a row, never by editing one. */
export function appendOverlay(overlay: SchedulerOverlay, nowUtc: string): AvailabilityData {
  const data = loadAvailabilityData(nowUtc);
  const next: AvailabilityData = { ...data, overlays: [...data.overlays, overlay] };
  save(next);
  return next;
}
