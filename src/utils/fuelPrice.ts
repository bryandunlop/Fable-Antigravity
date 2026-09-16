import { useSyncExternalStore } from 'react';
import { operatorTodayIso } from '../lib/operatorDate';

/**
 * The posted Lunken (KLUK) jet-A price, as keyed by scheduling.
 *
 * This is a **copy**. The price of record lives in FuelerLinx, and scheduling
 * already carries a recurring Monday task to update it there
 * (`fuel-luk` in src/scheduling/store/seed.ts). A copy with no date on it is
 * worse than no copy at all — a pilot making a tankering call cannot tell a
 * price set this morning from one set in August. So the date it took effect and
 * the person who keyed it travel with the number, and the tile says so when the
 * copy has gone stale rather than showing a confident-looking stale figure.
 */
export interface FuelPrice {
  /** USD per gallon. */
  pricePerGallon: number;
  /** Calendar day the price took effect (YYYY-MM-DD), operator zone — D24. */
  effectiveDate: string;
  /** Display name of whoever keyed it. */
  setBy: string;
  /** Instant it was keyed, UTC. */
  setAt: string;
}

export const FUEL_PRICE_KEY = 'lunken-fuel-price';

/** Past this many calendar days the copy is treated as stale. Matches the weekly Monday task. */
export const STALE_AFTER_DAYS = 7;

/**
 * Sanity bounds. A misplaced decimal ("594" for "5.94") is the realistic keying
 * error and it would silently drive every tankering call made off this number,
 * so it is rejected at entry rather than displayed.
 */
export const MIN_PRICE = 0.01;
export const MAX_PRICE = 99.99;

export const DEFAULT_FUEL_PRICE: FuelPrice = {
  pricePerGallon: 5.94,
  effectiveDate: '2026-09-14',
  setBy: 'Scheduling',
  setAt: '2026-09-14T12:00:00.000Z',
};

const EDIT_ROLES = ['scheduling', 'admin'] as const;

type Listener = () => void;
const listeners = new Set<Listener>();

// Cached so useSyncExternalStore gets a stable reference between saves; any
// save invalidates it.
let snapshot: FuelPrice | null = null;

function storage(): Storage | null {
  return typeof localStorage === 'undefined' ? null : localStorage;
}

function parseStored(raw: string | null): FuelPrice | null {
  if (raw === null) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const p = parsed as Partial<FuelPrice>;
    if (typeof p.pricePerGallon !== 'number' || !Number.isFinite(p.pricePerGallon)) return null;
    if (typeof p.effectiveDate !== 'string') return null;
    if (typeof p.setBy !== 'string') return null;
    if (typeof p.setAt !== 'string') return null;
    return {
      pricePerGallon: p.pricePerGallon,
      effectiveDate: p.effectiveDate,
      setBy: p.setBy,
      setAt: p.setAt,
    };
  } catch {
    return null;
  }
}

export function loadFuelPrice(): FuelPrice {
  return parseStored(storage()?.getItem(FUEL_PRICE_KEY) ?? null) ?? DEFAULT_FUEL_PRICE;
}

function emit(): void {
  snapshot = null;
  listeners.forEach(l => l());
}

export function saveFuelPrice(price: FuelPrice): void {
  storage()?.setItem(FUEL_PRICE_KEY, JSON.stringify(price));
  emit();
}

export function subscribeFuelPrice(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

// Another tab (or another device syncing into the same browser) can move this
// value; `storage` only fires in the OTHER tabs, so the in-process emit above
// still covers the tab that did the writing.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', e => {
    if (e.key === null || e.key === FUEL_PRICE_KEY) emit();
  });
}

function getSnapshot(): FuelPrice {
  if (!snapshot) snapshot = loadFuelPrice();
  return snapshot;
}

export function useFuelPrice(): FuelPrice {
  return useSyncExternalStore(subscribeFuelPrice, getSnapshot);
}

/**
 * Whole calendar days between the effective date and today, both taken in the
 * operator reference zone (D24). Parsing both sides as UTC midnight makes the
 * subtraction exact across DST — the zone is applied when deriving the day, not
 * when doing the arithmetic. Returns NaN if the stored date is malformed.
 */
export function daysSinceEffective(price: FuelPrice, now: Date = new Date()): number {
  const from = isoToUtcMidnight(price.effectiveDate);
  const to = isoToUtcMidnight(operatorTodayIso(now));
  if (from === null || to === null) return NaN;
  return Math.round((to - from) / 86_400_000);
}

function isoToUtcMidnight(iso: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  const [, y, mo, d] = m.map(Number);
  return Date.UTC(y, mo - 1, d);
}

/**
 * A malformed date reads as stale, never as fresh: the failure has to be
 * visible, because the alternative is a confident number nobody can date. A
 * future effective date is not stale — it has simply not started ageing.
 */
export function isStale(price: FuelPrice, now: Date = new Date()): boolean {
  const days = daysSinceEffective(price, now);
  if (Number.isNaN(days)) return true;
  return days > STALE_AFTER_DAYS;
}

export function canEditFuelPrice(userRole: string, additionalRoles: string[] = []): boolean {
  const roles = [userRole, ...additionalRoles];
  return roles.some(r => (EDIT_ROLES as readonly string[]).includes(r));
}

/** Parse keyed input to a price, or null if it is not one we will accept. */
export function parsePriceInput(raw: string): number | null {
  const trimmed = raw.trim().replace(/^\$/, '').trim();
  if (!trimmed) return null;
  if (!/^\d*\.?\d+$/.test(trimmed)) return null;
  const value = Number(trimmed);
  if (!Number.isFinite(value)) return null;
  const rounded = Math.round(value * 100) / 100;
  if (rounded < MIN_PRICE || rounded > MAX_PRICE) return null;
  return rounded;
}
