// THIN localStorage wrapper for watches (D107).
import type { Watch } from '../engine/watches';
const KEY = 'trip-watches-state';
export function loadWatches(): Watch[] {
  if (typeof localStorage === 'undefined') return [];
  try { const raw = localStorage.getItem(KEY); return raw ? (JSON.parse(raw) as Watch[]) : []; } catch { return []; }
}
export function saveWatches(w: Watch[]): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(KEY, JSON.stringify(w));
}
