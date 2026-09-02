// Watches — "tell me when a big cabin frees up that week" (D107, LG-328).
//
// A watch reserves nothing. It names a cabin and a date window; when the free count for that
// cabin rises above zero on any day in the window, it fires once and offers a pre-filled request.
// Watches expire when their window passes. Pure: the caller supplies free-by-cabin-by-day.

import { CORE_FLEET, cabinFor } from '../../../fleet/registry';
import type { FleetAvailability } from '../../../availability/types';

export type WatchCabin = 'big' | 'standard' | 'any';

export interface Watch {
  id: string;
  cabin: WatchCabin;
  fromDate: string;
  toDate: string;
  forName: string;
  seats: number;
  createdBy: string;
  createdAtUtc: string;
  status: 'watching' | 'fired' | 'expired' | 'dismissed';
  firedAtUtc?: string;
  /** The first open day the watch found. */
  firedForDate?: string;
  /** A declined trip this watch came from, if any. */
  fromTripId?: string;
}

export interface FreeByCabin { [dateUtc: string]: { big: number; standard: number; any: number } }

/** Free core tails per cabin per day, from a fleet grid. Reserved and held are not free. */
export function freeByCabin(fleet: FleetAvailability): FreeByCabin {
  const core = new Set(CORE_FLEET.map(a => a.tail));
  const out: FreeByCabin = {};
  for (const day of fleet.days) out[day.dateUtc] = { big: 0, standard: 0, any: 0 };
  for (const row of fleet.rows) {
    if (!core.has(row.tail)) continue;
    const cabin = cabinFor(row.tail);
    for (const c of row.cells) {
      if (c.state !== 'available') continue;
      const d = out[c.dateUtc]; if (!d) continue;
      d.any += 1;
      if (cabin === 'big') d.big += 1; else if (cabin === 'standard') d.standard += 1;
    }
  }
  return out;
}

let seq = 0;
export function newWatch(input: Omit<Watch, 'id' | 'status' | 'createdAtUtc'>, nowUtc: string): Watch {
  return { ...input, id: `w-${Date.now().toString(36)}-${(seq += 1).toString(36)}`, status: 'watching', createdAtUtc: nowUtc };
}

const DAY = 86_400_000;
function days(from: string, to: string): string[] {
  const out: string[] = [];
  for (let ms = Date.parse(`${from}T00:00:00.000Z`); ms <= Date.parse(`${to}T00:00:00.000Z`); ms += DAY) out.push(new Date(ms).toISOString().slice(0, 10));
  return out;
}

/** Run every watch against today's picture. Fires at most once; expires when the window has passed. */
export function evaluateWatches(watches: Watch[], free: FreeByCabin, nowUtc: string): Watch[] {
  const today = nowUtc.slice(0, 10);
  return watches.map(w => {
    if (w.status !== 'watching') return w;
    if (w.toDate < today) return { ...w, status: 'expired' };
    const hit = days(w.fromDate, w.toDate).find(d => d >= today && (free[d]?.[w.cabin] ?? 0) > 0);
    return hit ? { ...w, status: 'fired', firedAtUtc: nowUtc, firedForDate: hit } : w;
  });
}

export const dismissWatch = (watches: Watch[], id: string): Watch[] => watches.map(w => (w.id === id ? { ...w, status: 'dismissed' } : w));
