import { describe, it, expect } from 'vitest';
import { etMinutesOfDay, formatUntilEt, minutesUntilEt } from './etClock';

describe('etClock', () => {
  it('reads minutes-of-day in Eastern, DST-aware', () => {
    // 14:05Z in August is 10:05 EDT (UTC-4).
    expect(etMinutesOfDay(new Date('2026-08-19T14:05:00Z'))).toBe(10 * 60 + 5);
    // 14:05Z in January is 09:05 EST (UTC-5).
    expect(etMinutesOfDay(new Date('2026-01-19T14:05:00Z'))).toBe(9 * 60 + 5);
  });

  it('counts minutes until an HH:MM ET time later today', () => {
    const now = new Date('2026-08-19T14:05:00Z'); // 10:05 ET
    expect(minutesUntilEt('13:15', now)).toBe(190);
    expect(minutesUntilEt('10:05', now)).toBe(0);
  });

  it('returns a negative count for a time already past (never wraps to tomorrow)', () => {
    const now = new Date('2026-08-19T14:05:00Z'); // 10:05 ET
    expect(minutesUntilEt('08:40', now)).toBe(-85);
  });

  it('formats a countdown the way the day-of pane does', () => {
    const now = new Date('2026-08-19T14:05:00Z'); // 10:05 ET
    expect(formatUntilEt('13:15', now)).toBe('in 3h 10m');
    expect(formatUntilEt('10:45', now)).toBe('in 40m');
    expect(formatUntilEt('11:05', now)).toBe('in 1h');
  });

  it('says nothing for a time already past — a stale countdown is worse than none', () => {
    const now = new Date('2026-08-19T14:05:00Z');
    expect(formatUntilEt('08:40', now)).toBeUndefined();
  });

  it('ignores malformed input rather than rendering NaN', () => {
    const now = new Date('2026-08-19T14:05:00Z');
    expect(formatUntilEt('', now)).toBeUndefined();
    expect(formatUntilEt('not-a-time', now)).toBeUndefined();
  });
});
