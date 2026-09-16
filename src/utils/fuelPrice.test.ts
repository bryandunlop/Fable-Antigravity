import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  FUEL_PRICE_KEY,
  DEFAULT_FUEL_PRICE,
  STALE_AFTER_DAYS,
  loadFuelPrice,
  saveFuelPrice,
  subscribeFuelPrice,
  daysSinceEffective,
  isStale,
  canEditFuelPrice,
  parsePriceInput,
} from './fuelPrice';
import { installMemoryStorage } from '../test/memoryStorage';

let restoreStorage: () => void;

beforeEach(() => {
  restoreStorage = installMemoryStorage();
});

afterEach(() => {
  restoreStorage();
});

describe('fuel price store', () => {
  it('seeds from the default when nothing is stored', () => {
    expect(loadFuelPrice()).toEqual(DEFAULT_FUEL_PRICE);
  });

  it('round-trips a saved price', () => {
    const next = {
      pricePerGallon: 6.12,
      effectiveDate: '2026-09-14',
      setBy: 'J. Harris',
      setAt: '2026-09-14T13:05:00.000Z',
    };
    saveFuelPrice(next);
    expect(loadFuelPrice()).toEqual(next);
  });

  it('falls back to the default when the stored value is malformed', () => {
    localStorage.setItem(FUEL_PRICE_KEY, '{"pricePerGallon":"not a number"}');
    expect(loadFuelPrice()).toEqual(DEFAULT_FUEL_PRICE);
  });

  it('falls back to the default when the stored value is not JSON', () => {
    localStorage.setItem(FUEL_PRICE_KEY, 'wat');
    expect(loadFuelPrice()).toEqual(DEFAULT_FUEL_PRICE);
  });

  it('notifies subscribers on save', () => {
    const fn = vi.fn();
    const unsubscribe = subscribeFuelPrice(fn);
    saveFuelPrice({ ...DEFAULT_FUEL_PRICE, pricePerGallon: 7 });
    expect(fn).toHaveBeenCalledTimes(1);
    unsubscribe();
    saveFuelPrice({ ...DEFAULT_FUEL_PRICE, pricePerGallon: 8 });
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe('staleness', () => {
  const priceOn = (effectiveDate: string) => ({ ...DEFAULT_FUEL_PRICE, effectiveDate });

  it('counts calendar days in the operator zone, not UTC', () => {
    // 02:00Z on the 15th is still the 14th in Eastern — the day must not roll early.
    expect(daysSinceEffective(priceOn('2026-09-08'), new Date('2026-09-15T02:00:00Z'))).toBe(6);
    expect(daysSinceEffective(priceOn('2026-09-08'), new Date('2026-09-15T12:00:00Z'))).toBe(7);
  });

  it('counts zero on the day it was set', () => {
    expect(daysSinceEffective(priceOn('2026-09-15'), new Date('2026-09-15T12:00:00Z'))).toBe(0);
  });

  it('spans a DST boundary without drifting a day', () => {
    // US DST ends 2026-11-01; a week either side of it is still seven days.
    expect(daysSinceEffective(priceOn('2026-10-28'), new Date('2026-11-04T16:00:00Z'))).toBe(7);
  });

  it('is not stale up to and including the boundary, and stale after it', () => {
    const now = new Date('2026-09-15T12:00:00Z');
    expect(daysSinceEffective(priceOn('2026-09-08'), now)).toBe(STALE_AFTER_DAYS);
    expect(isStale(priceOn('2026-09-08'), now)).toBe(false);
    expect(isStale(priceOn('2026-09-07'), now)).toBe(true);
  });

  it('treats a malformed effective date as stale rather than fresh', () => {
    expect(isStale(priceOn('not-a-date'), new Date('2026-09-15T12:00:00Z'))).toBe(true);
  });

  it('is not stale when the effective date is in the future', () => {
    const now = new Date('2026-09-15T12:00:00Z');
    expect(daysSinceEffective(priceOn('2026-09-20'), now)).toBe(-5);
    expect(isStale(priceOn('2026-09-20'), now)).toBe(false);
  });
});

describe('who may edit', () => {
  it('lets scheduling and admin edit', () => {
    expect(canEditFuelPrice('scheduling')).toBe(true);
    expect(canEditFuelPrice('admin')).toBe(true);
  });

  it('does not let anyone else edit', () => {
    expect(canEditFuelPrice('pilot')).toBe(false);
    expect(canEditFuelPrice('maintenance')).toBe(false);
    expect(canEditFuelPrice('')).toBe(false);
  });

  it('honours an additional role', () => {
    expect(canEditFuelPrice('pilot', ['scheduling'])).toBe(true);
    expect(canEditFuelPrice('pilot', ['chief-pilot'])).toBe(false);
  });
});

describe('parsing what someone types', () => {
  it('accepts a plain number', () => {
    expect(parsePriceInput('5.94')).toBe(5.94);
  });

  it('accepts a leading dollar sign and surrounding space', () => {
    expect(parsePriceInput('  $6.10 ')).toBe(6.1);
  });

  it('rounds to cents', () => {
    expect(parsePriceInput('5.9449')).toBe(5.94);
  });

  it('rejects empty, non-numeric, zero and negative input', () => {
    expect(parsePriceInput('')).toBeNull();
    expect(parsePriceInput('   ')).toBeNull();
    expect(parsePriceInput('cheap')).toBeNull();
    expect(parsePriceInput('0')).toBeNull();
    expect(parsePriceInput('-3')).toBeNull();
  });

  it('rejects a fat-fingered value far outside any real jet-A price', () => {
    // A misplaced decimal is the realistic error, and it would silently drive
    // every tankering call made off this number.
    expect(parsePriceInput('594')).toBeNull();
  });
});
