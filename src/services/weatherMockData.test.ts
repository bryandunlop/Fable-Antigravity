import { describe, it, expect } from 'vitest';
import { getDemoMetar, getDemoTaf, getDemoForecast } from './weatherMockData';
import { conditionFromMetar, conditionFromForecastPeriod } from './weatherConditions';

// A fixed instant so nothing here depends on when the suite runs.
// 2026-07-15T18:20:00Z — a Wednesday afternoon, mid-week, mid-summer.
const REF = Date.parse('2026-07-15T18:20:00Z');

describe('getDemoMetar', () => {
  it('stamps the requested station, not a hardcoded one', () => {
    expect(getDemoMetar('KLUK', REF).icaoId).toBe('KLUK');
    expect(getDemoMetar('KTEB', REF).rawOb.startsWith('KTEB ')).toBe(true);
  });

  it('keeps the raw METAR time group consistent with obsTime', () => {
    // The raw string is what a pilot actually reads. If DDHHMMZ disagreed with
    // the parsed obsTime the demo would be self-contradicting on its face.
    const m = getDemoMetar('KLUK', REF);
    const group = m.rawOb.split(' ')[1];        // e.g. "151753Z"
    const d = new Date(m.obsTime);
    const p = (n: number) => String(n).padStart(2, '0');
    expect(group).toBe(`${p(d.getUTCDate())}${p(d.getUTCHours())}${p(d.getUTCMinutes())}Z`);
  });

  it('produces an observation in the recent past, never the future', () => {
    const m = getDemoMetar('KLUK', REF);
    const age = REF - new Date(m.obsTime).getTime();
    expect(age).toBeGreaterThanOrEqual(0);
    expect(age).toBeLessThan(3_600_000); // within the last hour — reads as fresh
  });

  it('lands on :53 past the hour, where a routine observation sits', () => {
    expect(new Date(getDemoMetar('KLUK', REF).obsTime).getUTCMinutes()).toBe(53);
    // Before :53, the most recent obs is the PREVIOUS hour's.
    const early = Date.parse('2026-07-15T18:10:00Z');
    expect(new Date(getDemoMetar('KLUK', early).obsTime).getUTCHours()).toBe(17);
  });

  it('is internally consistent — the raw text matches the parsed fields', () => {
    const m = getDemoMetar('KLUK', REF);
    expect(m.rawOb).toContain('24008KT');   // wdir 240 / wspd 8
    expect(m.wdir).toBe(240);
    expect(m.wspd).toBe(8);
    expect(m.rawOb).toContain('29/19');     // temp / dewpoint
    expect(m.temp).toBe(29);
    expect(m.dewp).toBe(19);
    expect(m.rawOb).toContain('A3005');     // altimeter
    expect(m.altim).toBeCloseTo(30.05, 2);
    expect(m.rawOb).toContain('FEW045 SCT070');
    expect(m.clouds).toEqual([
      { cover: 'FEW', base: 4500 },
      { cover: 'SCT', base: 7000 },
    ]);
  });

  it('is VFR, and honestly so — 10SM with no ceiling', () => {
    const m = getDemoMetar('KLUK', REF);
    expect(m.fltcat).toBe('VFR');
    // No BKN/OVC layer means no ceiling, so nothing contradicts the category.
    expect((m.clouds ?? []).some(c => c.cover === 'BKN' || c.cover === 'OVC')).toBe(false);
    expect(m.visib).toBe(10);
  });

  it('flows through the real mapper to a sky that matches its own text', () => {
    // The seed does not hand the icon a token — it goes through the same
    // derivation live data does. FEW + SCT reads as partly cloudy, which agrees
    // with the outlook's "Mostly Sunny" first column.
    expect(conditionFromMetar(getDemoMetar('KLUK', REF))).toBe('partly');
  });
});

describe('getDemoTaf', () => {
  it('is issued before it is valid, and covers 24h', () => {
    const t = getDemoTaf('KLUK', REF);
    const from = Date.parse(t.validTimeFrom);
    const to = Date.parse(t.validTimeTo);
    expect(Date.parse(t.issueTime)).toBeLessThanOrEqual(from);
    expect(to - from).toBe(24 * 3_600_000);
    expect(t.rawTAF.startsWith('KLUK ')).toBe(true);
  });
});

describe('getDemoForecast', () => {
  it('returns exactly seven daytime periods starting today', () => {
    const f = getDemoForecast(REF);
    expect(f).toHaveLength(7);
    expect(f[0].name).toBe('Today');
    expect(f.map(p => p.number)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('advances one calendar day per column', () => {
    const f = getDemoForecast(REF);
    for (let i = 1; i < f.length; i++) {
      const prev = new Date(f[i - 1].startTime);
      const cur = new Date(f[i].startTime);
      const days = Math.round((cur.getTime() - prev.getTime()) / 86_400_000);
      expect(days).toBe(1);
    }
  });

  it('never emits an NWS icon URL', () => {
    // We stopped hotlinking api.weather.gov/icons; the seed has no business
    // inventing a URL that resolves to a real image on someone else's server.
    for (const p of getDemoForecast(REF)) {
      expect(p.icon).toBe('');
    }
  });

  it('reads as a plausible week through the real mapper', () => {
    const got = getDemoForecast(REF).map(conditionFromForecastPeriod);
    expect(got).toEqual(['partly', 'partly', 'storm', 'rain', 'cloudy', 'clear', 'wind']);
  });

  it('keeps wind in knots and temperature in °C, like the METAR beside it', () => {
    // NWS serves °F and mph; the seed must already be in the units the UI
    // renders, or it would silently re-introduce the conversion bug the real
    // parser exists to prevent.
    for (const p of getDemoForecast(REF)) {
      expect(p.tempC).not.toBeNull();
      expect(p.tempC!).toBeGreaterThan(-40);
      expect(p.tempC!).toBeLessThan(50);      // °C, not °F
      expect(p.windKt).not.toBeNull();
      expect(p.windKt!).toBeLessThan(60);     // knots, not mph
      expect(p.precipProbability).toBeGreaterThanOrEqual(0);
      expect(p.precipProbability).toBeLessThanOrEqual(100);
    }
  });
});
