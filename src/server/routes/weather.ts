// Weather proxy for the Aviation Weather Center (FAA/NWS).
// aviationweather.gov no longer returns CORS headers, so the browser can't
// call it directly — we proxy server-side (Edge) where CORS doesn't apply.
// Returns the raw AWC JSON arrays; parsing/normalisation happens client-side.

import { Hono } from 'hono';
import { HOME_STATION } from '../../config/station';

const AWC_BASE = 'https://aviationweather.gov/api/data';
const NWS_BASE = 'https://api.weather.gov';

/**
 * NWS requires a User-Agent identifying the application, with a contact.
 * Set NWS_USER_AGENT to something real before production — the fallback is a
 * deliberate placeholder, not a working contact.
 * Format per docs: "(myweatherapp.com, contact@myweatherapp.com)"
 */
const NWS_USER_AGENT =
  process.env.NWS_USER_AGENT ?? '(myGFO eTechLog, contact-unset)';

/**
 * station → NWS forecast URL. The /points → grid mapping is static enough that
 * the NWS docs explicitly bless caching it; they ask that you re-check
 * periodically in case an office/grid remapping happens. This removes two
 * upstream hops (METAR-for-coords, then /points) from the hot path.
 *
 * NOTE: deliberately NOT used for METAR/TAF. Caching official aviation weather
 * would risk rendering a stale observation as current — that is a safety
 * decision, not a performance one. Only the grid mapping is cached here.
 */
const gridCache = new Map<string, { forecastUrl: string; at: number }>();
const GRID_TTL_MS = 24 * 60 * 60 * 1000;

export const weatherRoute = new Hono();

// GET /api/weather?ids=KLUK  → { metar: [...], taf: [...] }
weatherRoute.get('/', async (c) => {
  const ids = (c.req.query('ids') || HOME_STATION).toUpperCase();

  try {
    const [metarRes, tafRes] = await Promise.all([
      fetch(`${AWC_BASE}/metar?ids=${encodeURIComponent(ids)}&format=json&hours=2`),
      fetch(`${AWC_BASE}/taf?ids=${encodeURIComponent(ids)}&format=json`),
    ]);

    const metar = metarRes.ok ? await metarRes.json() : [];
    const taf = tafRes.ok ? await tafRes.json() : [];

    return c.json({ metar, taf });
  } catch (err) {
    return c.json(
      { error: err instanceof Error ? err.message : 'Weather fetch failed' },
      502,
    );
  }
});

/**
 * Resolves a station's NWS forecast URL, caching the grid mapping.
 *
 * Coordinates are NOT hardcoded — they come from the AWC METAR, which is the
 * authoritative source we already integrate. NWS is lat/lon-based and our
 * AirportInfo records carry no lat/lon, so this is the honest provenance
 * (see D30, "Coordinate provenance"). The cost — a coords lookup — lands on
 * cache misses only.
 */
async function resolveForecastUrl(station: string): Promise<string> {
  const hit = gridCache.get(station);
  if (hit && Date.now() - hit.at < GRID_TTL_MS) return hit.forecastUrl;

  const metarRes = await fetch(
    `${AWC_BASE}/metar?ids=${encodeURIComponent(station)}&format=json&hours=2`,
  );
  if (!metarRes.ok) throw new Error(`Could not resolve coordinates for ${station}`);
  const metar = await metarRes.json();
  const { lat, lon } = Array.isArray(metar) && metar[0] ? metar[0] : ({} as any);
  if (typeof lat !== 'number' || typeof lon !== 'number') {
    throw new Error(`No coordinates available for ${station}`);
  }

  const pointsRes = await fetch(`${NWS_BASE}/points/${lat},${lon}`, {
    headers: { 'User-Agent': NWS_USER_AGENT, Accept: 'application/geo+json' },
  });
  if (!pointsRes.ok) throw new Error(`NWS points lookup failed (${pointsRes.status})`);
  const points = await pointsRes.json();
  const forecastUrl = points?.properties?.forecast;
  if (typeof forecastUrl !== 'string') {
    throw new Error(`NWS returned no forecast URL for ${station}`);
  }

  gridCache.set(station, { forecastUrl, at: Date.now() });
  return forecastUrl;
}

// GET /api/weather/forecast?ids=KLUK  → raw NWS forecast JSON
// Parsing/normalisation happens client-side, matching the METAR/TAF route.
weatherRoute.get('/forecast', async (c) => {
  const station = (c.req.query('ids') || HOME_STATION).toUpperCase();

  try {
    const forecastUrl = await resolveForecastUrl(station);
    const res = await fetch(forecastUrl, {
      headers: { 'User-Agent': NWS_USER_AGENT, Accept: 'application/geo+json' },
    });
    if (!res.ok) {
      return c.json({ error: `NWS forecast failed (${res.status})` }, 502);
    }

    // Advisory outlook, not an observation — safe to let the edge hold it
    // briefly. Contrast with METAR/TAF above, which are never cached.
    c.header('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=300');
    return c.json(await res.json());
  } catch (err) {
    return c.json(
      { error: err instanceof Error ? err.message : 'Forecast fetch failed' },
      502,
    );
  }
});
