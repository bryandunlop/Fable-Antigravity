import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchWeather } from './aviationWeatherService';
import { fetchForecast } from './nwsForecastService';

/**
 * The demo fallback contract.
 *
 * The headline case is the third test: local dev has no /api at all, so Vite's
 * SPA fallback answers /api/weather with index.html and a **200**. res.ok is
 * true, the status guard passes, and it is res.json() that throws on "<!doctype".
 * Any fallback keyed on res.ok would sail straight past the real bug.
 */

const okJson = (body: unknown) =>
  ({ ok: true, status: 200, statusText: 'OK', json: async () => body }) as unknown as Response;

afterEach(() => vi.unstubAllGlobals());

describe('fetchWeather demo fallback', () => {
  it('uses live data when the proxy answers properly, and does not flag demo', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => okJson({
      metar: [{ rawOb: 'KLUK 151453Z 09004KT 10SM CLR 22/12 A3011', icaoId: 'KLUK', name: 'LUNKEN', obsTime: 1784310780, wdir: 90, wspd: 4, visib: 10, temp: 22, dewp: 12, altim: 1019.3, fltCat: 'VFR' }],
      taf: [],
    })));

    const r = await fetchWeather('KLUK');
    expect(r.isDemo).toBeFalsy();
    expect(r.metar?.rawOb).toContain('09004KT');
    expect(r.error).toBeUndefined();
  });

  it('falls back to demo when the network throws', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('Failed to fetch'); }));

    const r = await fetchWeather('KLUK');
    expect(r.isDemo).toBe(true);
    expect(r.metar).not.toBeNull();
    expect(r.metar?.icaoId).toBe('KLUK');
    expect(r.demoReason).toContain('Failed to fetch');
    // Not the error state — we have something to show, so the panel renders.
    expect(r.error).toBeUndefined();
  });

  it('falls back when the dev server returns index.html with a 200', async () => {
    // THE regression test. This is what "the weather isn't working" actually was.
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => { throw new SyntaxError("Unexpected token '<', \"<!doctype \"... is not valid JSON"); },
    }) as unknown as Response));

    const r = await fetchWeather('KLUK');
    expect(r.isDemo).toBe(true);
    expect(r.metar).not.toBeNull();
    expect(r.demoReason).toContain('Unexpected token');
  });

  it('falls back on a 500 — the production DATABASE_URL failure', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: false, status: 500, statusText: 'Internal Server Error', json: async () => ({}),
    }) as unknown as Response));

    const r = await fetchWeather('KLUK');
    expect(r.isDemo).toBe(true);
    expect(r.demoReason).toContain('500');
  });

  it('does NOT invent weather for an airport the upstream simply has no data for', async () => {
    // A clean 200 with an empty array is a real answer: AWC has nothing here.
    // Fabricating an observation for an airport that may not exist is a
    // different and worse thing than covering for a dead proxy.
    vi.stubGlobal('fetch', vi.fn(async () => okJson({ metar: [], taf: [] })));

    const r = await fetchWeather('ZZZZ');
    expect(r.isDemo).toBeFalsy();
    expect(r.metar).toBeNull();
  });

  it('never returns demo data without flagging it', async () => {
    // The invariant the whole disclosure rests on: no caller can render seeded
    // weather without having been told it is seeded.
    for (const stub of [
      async () => { throw new Error('boom'); },
      async () => ({ ok: false, status: 503, statusText: 'x', json: async () => ({}) }) as unknown as Response,
      async () => ({ ok: true, status: 200, statusText: 'OK', json: async () => { throw new SyntaxError('bad'); } }) as unknown as Response,
    ]) {
      vi.stubGlobal('fetch', vi.fn(stub));
      const r = await fetchWeather('KLUK');
      if (r.metar !== null) {
        expect(r.isDemo, 'returned a METAR without isDemo').toBe(true);
      }
    }
  });
});

describe('fetchForecast demo fallback', () => {
  const nwsBody = (shortForecast: string) => ({
    properties: {
      periods: [{
        number: 1, name: 'Today', startTime: '2026-07-15T06:00:00-04:00', isDaytime: true,
        temperature: 84, temperatureUnit: 'F', windSpeed: '10 mph', windDirection: 'SW',
        shortForecast, detailedForecast: shortForecast,
        probabilityOfPrecipitation: { value: 20 },
        icon: 'https://api.weather.gov/icons/land/day/sct?size=medium',
      }],
    },
  });

  it('uses live periods when the proxy answers, and does not flag demo', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => okJson(nwsBody('Partly Cloudy'))));

    const r = await fetchForecast('KLUK');
    expect(r.isDemo).toBeFalsy();
    expect(r.periods).toHaveLength(1);
    expect(r.periods[0].tempC).toBe(29); // 84°F converted at the boundary
  });

  it('falls back to the seeded week when the fetch throws', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('Failed to fetch'); }));

    const r = await fetchForecast('KLUK');
    expect(r.isDemo).toBe(true);
    expect(r.periods).toHaveLength(7);
    expect(r.demoReason).toContain('Failed to fetch');
    expect(r.error).toBeUndefined();
  });

  it('falls back when the dev server returns index.html with a 200', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true, status: 200, statusText: 'OK',
      json: async () => { throw new SyntaxError("Unexpected token '<'"); },
    }) as unknown as Response));

    const r = await fetchForecast('KLUK');
    expect(r.isDemo).toBe(true);
    expect(r.periods).toHaveLength(7);
  });

  it('treats a 200 that parses to zero periods as a broken upstream', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => okJson({ properties: { periods: [] } })));

    const r = await fetchForecast('KLUK');
    expect(r.isDemo).toBe(true);
    expect(r.periods).toHaveLength(7);
    expect(r.demoReason).toContain('no periods');
  });

  it('falls back on a 403 — the NWS_USER_AGENT placeholder failure (TL-12)', async () => {
    // NWS rejects a request whose User-Agent has no real contact. The server
    // route's fallback UA is an admitted placeholder, so this is a live risk in
    // production, not a hypothetical.
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: false, status: 403, statusText: 'Forbidden', json: async () => ({}),
    }) as unknown as Response));

    const r = await fetchForecast('KLUK');
    expect(r.isDemo).toBe(true);
    expect(r.demoReason).toContain('403');
  });
});
