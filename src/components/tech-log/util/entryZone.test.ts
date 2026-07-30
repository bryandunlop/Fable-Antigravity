import { describe, it, expect } from 'vitest';
import { ENTRY_ZONE_OPTIONS, entryZone, utcFromWallTime, wallTimeFromUtc } from './entryZone';

/**
 * D56 rider: an occurrence time may be entered as UTC, Eastern, or device-local, and is converted to
 * a UTC ISO instant for storage. Storage is always UTC — the mode is only how the typed wall-clock
 * digits are *interpreted*.
 *
 * The offset must come from the zone's real DST rules, never a fixed number: Eastern is UTC-5 in
 * January and UTC-4 in July, and a hand-rolled offset gets one of those wrong for half the year.
 */

const ET = 'America/New_York';

describe('entryZone (mode -> IANA zone)', () => {
  it('maps the three offered modes', () => {
    expect(entryZone('UTC', 'Asia/Tokyo')).toBe('UTC');
    expect(entryZone('EASTERN', 'Asia/Tokyo')).toBe(ET);
    expect(entryZone('LOCAL', 'Asia/Tokyo')).toBe('Asia/Tokyo');
  });

  it('offers exactly the three modes the product owner asked for', () => {
    expect(ENTRY_ZONE_OPTIONS.map(o => o.mode)).toEqual(['UTC', 'EASTERN', 'LOCAL']);
  });
});

describe('utcFromWallTime (typed wall clock -> stored UTC instant)', () => {
  it('treats a UTC entry as already-UTC', () => {
    expect(utcFromWallTime('2026-07-15T23:30', 'UTC')).toBe('2026-07-15T23:30:00.000Z');
  });

  it('applies the standard-time offset for an Eastern entry in winter (EST, UTC-5)', () => {
    expect(utcFromWallTime('2026-01-15T23:30', ET)).toBe('2026-01-16T04:30:00.000Z');
  });

  it('applies the daylight offset for an Eastern entry in summer (EDT, UTC-4)', () => {
    expect(utcFromWallTime('2026-07-15T23:30', ET)).toBe('2026-07-16T03:30:00.000Z');
  });

  it('crosses the Eastern spring-forward boundary (2026-03-08) without drifting', () => {
    // 01:30 is still EST (UTC-5); 03:30 is already EDT (UTC-4). Two wall-clock hours apart but only
    // ONE hour apart in real time — the exact case a fixed-offset conversion gets wrong.
    const before = utcFromWallTime('2026-03-08T01:30', ET)!;
    const after = utcFromWallTime('2026-03-08T03:30', ET)!;
    expect(before).toBe('2026-03-08T06:30:00.000Z');
    expect(after).toBe('2026-03-08T07:30:00.000Z');
    expect(new Date(after).getTime() - new Date(before).getTime()).toBe(3600000);
  });

  it('crosses the Eastern fall-back boundary (2026-11-01) without drifting', () => {
    // 00:30 is EDT (UTC-4); 02:30 is EST (UTC-5). Two wall-clock hours apart, THREE real hours apart.
    const before = utcFromWallTime('2026-11-01T00:30', ET)!;
    const after = utcFromWallTime('2026-11-01T02:30', ET)!;
    expect(before).toBe('2026-11-01T04:30:00.000Z');
    expect(after).toBe('2026-11-01T07:30:00.000Z');
    expect(new Date(after).getTime() - new Date(before).getTime()).toBe(3 * 3600000);
  });

  it('converts a device-local entry through that device zone', () => {
    expect(utcFromWallTime('2026-07-16T08:30', 'Asia/Tokyo')).toBe('2026-07-15T23:30:00.000Z');
  });

  it('accepts the optional seconds some browsers emit', () => {
    expect(utcFromWallTime('2026-07-15T23:30:45', 'UTC')).toBe('2026-07-15T23:30:45.000Z');
  });

  it('returns null for an incomplete or unparseable entry rather than a bogus instant', () => {
    expect(utcFromWallTime('', 'UTC')).toBeNull();
    expect(utcFromWallTime('2026-07-15', 'UTC')).toBeNull();
    expect(utcFromWallTime('not a date', ET)).toBeNull();
  });
});

describe('wallTimeFromUtc (stored UTC instant -> datetime-local value)', () => {
  it('renders the instant as wall-clock digits in the chosen zone', () => {
    expect(wallTimeFromUtc('2026-07-16T03:30:00.000Z', 'UTC')).toBe('2026-07-16T03:30');
    expect(wallTimeFromUtc('2026-07-16T03:30:00.000Z', ET)).toBe('2026-07-15T23:30');
    expect(wallTimeFromUtc('2026-07-15T23:30:00.000Z', 'Asia/Tokyo')).toBe('2026-07-16T08:30');
  });

  it('zero-pads every component so the value is a valid datetime-local', () => {
    expect(wallTimeFromUtc('2026-03-08T07:30:00.000Z', ET)).toBe('2026-03-08T03:30');
    expect(wallTimeFromUtc('2026-01-02T04:05:00.000Z', 'UTC')).toBe('2026-01-02T04:05');
  });

  it('round-trips through both DST regimes', () => {
    for (const iso of ['2026-01-16T04:30:00.000Z', '2026-07-16T03:30:00.000Z', '2026-11-01T04:30:00.000Z']) {
      expect(utcFromWallTime(wallTimeFromUtc(iso, ET), ET)).toBe(iso);
    }
  });

  it('returns an empty value for an unusable instant rather than "NaN-NaN-NaN"', () => {
    expect(wallTimeFromUtc('not an instant', ET)).toBe('');
  });
});
