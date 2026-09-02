import { describe, it, expect } from 'vitest';
import { referenceDayKey, referenceToday } from './referenceDay';

describe('referenceDayKey', () => {
  it('is the Eastern calendar day, not the UTC one, after 20:00 ET', () => {
    // 2026-09-02T01:30Z is 2026-09-01 21:30 EDT. The operator's day is still the 1st.
    expect(referenceDayKey('2026-09-02T01:30:00.000Z')).toBe('2026-09-01');
  });

  it('agrees with UTC during the working day', () => {
    expect(referenceDayKey('2026-09-01T15:00:00.000Z')).toBe('2026-09-01');
  });

  it('is DST-aware — the same wall hour in January is a different offset', () => {
    // 2026-01-02T04:30Z is 2026-01-01 23:30 EST (UTC-5): still the 1st.
    expect(referenceDayKey('2026-01-02T04:30:00.000Z')).toBe('2026-01-01');
    // 04:30Z in July is 00:30 EDT (UTC-4): already the 2nd.
    expect(referenceDayKey('2026-07-02T04:30:00.000Z')).toBe('2026-07-02');
  });
});

describe('referenceToday', () => {
  it('returns a Date whose calendar parts are the Eastern day, for a calendar grid', () => {
    const d = referenceToday('2026-09-02T01:30:00.000Z');
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(8); // September
    expect(d.getDate()).toBe(1);
  });
});
