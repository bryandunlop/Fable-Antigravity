import { describe, it, expect } from 'vitest';
import { zoneForAirport, offsetMinutesAt, ZONE_OVERRIDES } from './airportZone';
import { KNOWN_AIRPORTS } from './airportCoords';

/**
 * The table SunTimesChip.tsx carried privately before this module existed. Kept here
 * verbatim as the regression fixture: the coordinate-derived lookup must reproduce every
 * hand-curated entry, or the refactor that deleted the map silently changed a displayed
 * time somewhere. (LG-312)
 */
const LEGACY_STATION_ZONE: Record<string, string> = {
  KLUK: 'America/New_York', KTEB: 'America/New_York', KJFK: 'America/New_York',
  KLGA: 'America/New_York', KEWR: 'America/New_York', KMIA: 'America/New_York',
  KOPF: 'America/New_York', KATL: 'America/New_York', KPHL: 'America/New_York',
  KDCA: 'America/New_York', KORD: 'America/Chicago', KPHX: 'America/Phoenix',
  KLAX: 'America/Los_Angeles', KSFO: 'America/Los_Angeles', KSAN: 'America/Los_Angeles',
  KBUR: 'America/Los_Angeles', KLGB: 'America/Los_Angeles', MYNN: 'America/Nassau',
  EGLL: 'Europe/London', LFPG: 'Europe/Paris', OMDB: 'Asia/Dubai', RJTT: 'Asia/Tokyo',
};

describe('zoneForAirport', () => {
  it('reproduces every hand-curated station zone from coordinates alone', () => {
    for (const [icao, zone] of Object.entries(LEGACY_STATION_ZONE)) {
      expect(zoneForAirport(icao), icao).toBe(zone);
    }
  });

  it('resolves by IATA as well as ICAO', () => {
    expect(zoneForAirport('DXB')).toBe('Asia/Dubai');
    expect(zoneForAirport('luk')).toBe('America/New_York');
  });

  it('returns null for a code with no coordinates rather than guessing a zone', () => {
    expect(zoneForAirport('OTHH')).toBeNull();
    expect(zoneForAirport('')).toBeNull();
    expect(zoneForAirport(undefined)).toBeNull();
  });

  it('covers every airport in the coordinate table', () => {
    for (const a of KNOWN_AIRPORTS) expect(zoneForAirport(a.icao), a.icao).not.toBeNull();
  });

  it('lets a curated override win over the coordinate lookup', () => {
    const [icao] = Object.keys(ZONE_OVERRIDES);
    if (icao) expect(zoneForAirport(icao)).toBe(ZONE_OVERRIDES[icao]);
    else expect(Object.keys(ZONE_OVERRIDES)).toHaveLength(0);
  });
});

describe('offsetMinutesAt', () => {
  it('is DST-aware, not a fixed offset', () => {
    // Eastern is UTC-5 in January and UTC-4 in July.
    expect(offsetMinutesAt('2026-01-15T12:00:00.000Z', 'America/New_York')).toBe(-300);
    expect(offsetMinutesAt('2026-07-15T12:00:00.000Z', 'America/New_York')).toBe(-240);
  });

  it('handles zones that never observe DST', () => {
    expect(offsetMinutesAt('2026-01-15T12:00:00.000Z', 'America/Phoenix')).toBe(-420);
    expect(offsetMinutesAt('2026-07-15T12:00:00.000Z', 'America/Phoenix')).toBe(-420);
    expect(offsetMinutesAt('2026-07-15T12:00:00.000Z', 'Asia/Dubai')).toBe(240);
  });

  it('handles a half-hour zone', () => {
    expect(offsetMinutesAt('2026-07-15T12:00:00.000Z', 'Asia/Kolkata')).toBe(330);
  });

  it('handles the southern-hemisphere DST sense', () => {
    // Sydney is UTC+11 in January (their summer) and UTC+10 in July.
    expect(offsetMinutesAt('2026-01-15T12:00:00.000Z', 'Australia/Sydney')).toBe(660);
    expect(offsetMinutesAt('2026-07-15T12:00:00.000Z', 'Australia/Sydney')).toBe(600);
  });
});
