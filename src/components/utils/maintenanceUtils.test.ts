import { describe, it, expect } from 'vitest';
import type { Deferral } from '../contexts/MaintenanceContext';
import { getDeferralDaysRemaining, isDeferralExpired } from './maintenanceUtils';

const HOUR = 60 * 60 * 1000;

function makeDeferral(expiresAt: string): Deferral {
  return {
    id: 'DEF-TEST',
    squawkId: 'SQ-TEST',
    melItemId: 'MEL 34-11-01',
    category: 'B',
    deferredAt: new Date('2026-07-01T00:00:00Z').toISOString(),
    expiresAt,
    deferredBy: 'Test Inspector',
    status: 'active',
  };
}

describe('getDeferralDaysRemaining', () => {
  const now = new Date('2026-07-12T12:00:00Z');

  it('returns whole days remaining until expiresAt, rounding partial days up', () => {
    const twoDaysOut = makeDeferral(new Date(now.getTime() + 48 * HOUR).toISOString());
    expect(getDeferralDaysRemaining(twoDaysOut, now)).toBe(2);

    const twelveHoursOut = makeDeferral(new Date(now.getTime() + 12 * HOUR).toISOString());
    expect(getDeferralDaysRemaining(twelveHoursOut, now)).toBe(1);
  });

  it('returns a negative count once the deferral is more than a day past expiry', () => {
    const thirtySixHoursAgo = makeDeferral(new Date(now.getTime() - 36 * HOUR).toISOString());
    expect(getDeferralDaysRemaining(thirtySixHoursAgo, now)).toBe(-1);
  });

  it('computes from the Deferral expiresAt field as seeded by MaintenanceContext', () => {
    // Regression: MaintenanceHub/ProactiveAlerts previously read a nonexistent
    // `expiryDate` field, so every count came out NaN and no alert ever fired.
    const seeded = makeDeferral(new Date(now.getTime() + 5 * 24 * HOUR).toISOString());
    expect(Number.isNaN(getDeferralDaysRemaining(seeded, now))).toBe(false);
    expect(getDeferralDaysRemaining(seeded, now)).toBe(5);
  });
});

describe('isDeferralExpired', () => {
  const now = new Date('2026-07-12T12:00:00Z');

  it('is true when expiresAt is in the past', () => {
    const expired = makeDeferral(new Date(now.getTime() - 12 * HOUR).toISOString());
    expect(isDeferralExpired(expired, now)).toBe(true);
  });

  it('is false when expiresAt is in the future', () => {
    const active = makeDeferral(new Date(now.getTime() + 12 * HOUR).toISOString());
    expect(isDeferralExpired(active, now)).toBe(false);
  });
});
