import { describe, it, expect } from 'vitest';
import { GOVERNING_ZONE_OPTIONS, isOverride, validateGoverningOverride } from './governingZone';

// D24: a deferral's governing zone defaults to Eastern; overriding to another operating-local zone
// is allowed but MUST record a reason (stored in governingTimezoneOverrideReason at signing).

describe('governing zone override', () => {
  it('the curated options lead with the Eastern default and are all valid IANA zones', () => {
    expect(GOVERNING_ZONE_OPTIONS[0].zone).toBe('America/New_York');
    for (const o of GOVERNING_ZONE_OPTIONS) {
      // constructing a formatter with the zone throws if the IANA id is invalid
      expect(() => new Intl.DateTimeFormat('en-US', { timeZone: o.zone })).not.toThrow();
      expect(o.label.length).toBeGreaterThan(0);
    }
  });

  it('isOverride is false for Eastern, true for any other zone', () => {
    expect(isOverride('America/New_York')).toBe(false);
    expect(isOverride('America/Los_Angeles')).toBe(true);
    expect(isOverride('UTC')).toBe(true);
  });

  it('no reason needed when the governing zone is the Eastern default', () => {
    expect(validateGoverningOverride('America/New_York', '')).toEqual({ ok: true });
  });

  it('an override to a non-default zone requires a non-empty reason', () => {
    const empty = validateGoverningOverride('America/Los_Angeles', '   ');
    expect(empty.ok).toBe(false);
    expect(empty.error).toMatch(/reason/i);
    expect(validateGoverningOverride('America/Los_Angeles', 'On deployment to KLAX; DOM directs local-day clock.')).toEqual({ ok: true });
  });
});
