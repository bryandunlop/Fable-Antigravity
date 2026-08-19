import { describe, it, expect } from 'vitest';
import { solarTimesFor } from './solarTimes';

// KLUK (Cincinnati Lunken) — the home station.
const KLUK = { lat: 39.1033, lon: -84.4186 };

/** Render a UTC instant in Eastern, 24h, for readable assertions. */
function inEastern(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/New_York',
  });
}

/** Published times drift a minute or two by algorithm; assert within tolerance. */
function expectWithinMinutes(actualIso: string, expectedHhmm: string, tolerance = 3) {
  const [ah, am] = inEastern(actualIso).split(':').map(Number);
  const [eh, em] = expectedHhmm.split(':').map(Number);
  expect(Math.abs(ah * 60 + am - (eh * 60 + em))).toBeLessThanOrEqual(tolerance);
}

describe('solarTimesFor (NOAA solar position)', () => {
  it('summer solstice at KLUK: ~06:14 / ~21:09 EDT', () => {
    const t = solarTimesFor(KLUK.lat, KLUK.lon, new Date('2026-06-21T12:00:00Z'));
    expectWithinMinutes(t.sunriseUtc!, '06:14');
    expectWithinMinutes(t.sunsetUtc!, '21:09');
  });

  it('winter solstice at KLUK: ~07:56 / ~17:19 EST', () => {
    const t = solarTimesFor(KLUK.lat, KLUK.lon, new Date('2026-12-21T12:00:00Z'));
    expectWithinMinutes(t.sunriseUtc!, '07:56');
    expectWithinMinutes(t.sunsetUtc!, '17:19');
  });

  it('sunrise precedes sunset, and both land on the requested LOCAL day', () => {
    const t = solarTimesFor(KLUK.lat, KLUK.lon, new Date('2026-08-19T12:00:00Z'));
    expect(Date.parse(t.sunriseUtc!)).toBeLessThan(Date.parse(t.sunsetUtc!));
    // An Eastern-evening sunset is the NEXT UTC date (20:30 EDT = 00:30Z), so the
    // day claim only means anything through the station's own zone.
    const localDay = (iso: string) =>
      new Date(iso).toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
    expect(localDay(t.sunriseUtc!)).toBe('2026-08-19');
    expect(localDay(t.sunsetUtc!)).toBe('2026-08-19');
  });

  it('polar day returns nulls rather than NaN timestamps (Svalbard, June)', () => {
    const t = solarTimesFor(78.22, 15.65, new Date('2026-06-21T12:00:00Z'));
    expect(t.sunriseUtc).toBeNull();
    expect(t.sunsetUtc).toBeNull();
    expect(t.alwaysUp).toBe(true);
  });

  it('polar night returns nulls (Svalbard, December)', () => {
    const t = solarTimesFor(78.22, 15.65, new Date('2026-12-21T12:00:00Z'));
    expect(t.sunriseUtc).toBeNull();
    expect(t.sunsetUtc).toBeNull();
    expect(t.alwaysDown).toBe(true);
  });
});
