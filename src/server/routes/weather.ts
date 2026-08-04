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
 * station → NWS forecast + gridpoint URLs. The /points → grid mapping is static
 * enough that the NWS docs explicitly bless caching it; they ask that you re-check
 * periodically in case an office/grid remapping happens. This removes two
 * upstream hops (METAR-for-coords, then /points) from the hot path.
 *
 * Both URLs come from the same /points response (`properties.forecast` and
 * `properties.forecastGridData`), so caching the gridpoint one alongside costs
 * nothing (TL-23).
 *
 * NOTE: deliberately NOT used for METAR/TAF. Caching official aviation weather
 * would risk rendering a stale observation as current — that is a safety
 * decision, not a performance one. Only the grid mapping is cached here.
 */
const gridCache = new Map<string, { forecastUrl: string; gridpointUrl: string | null; at: number }>();
const GRID_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Bounded. The key comes from a query param, and module state survives across
 * warm invocations — an unbounded Map would grow for the instance's lifetime
 * on varying input. We only ever serve a handful of stations; the cap is a
 * backstop, not a tuning knob.
 */
const GRID_CACHE_MAX = 32;

/** Deadline for the optional gridpoint leg of /forecast. See its call site. */
const GRIDPOINT_TIMEOUT_MS = 4000;

/** ICAO identifiers are exactly four alphanumerics. Reject anything else
 *  before it reaches an upstream fetch or becomes a cache key. */
const ICAO_RE = /^[A-Z0-9]{4}$/;

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
async function resolveForecastUrl(station: string): Promise<{ forecastUrl: string; gridpointUrl: string | null }> {
  const hit = gridCache.get(station);
  if (hit && Date.now() - hit.at < GRID_TTL_MS) {
    return { forecastUrl: hit.forecastUrl, gridpointUrl: hit.gridpointUrl };
  }

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
  // Not required — a missing gridpoint URL costs the contracted condition enums
  // and nothing else, so it degrades rather than failing the whole outlook.
  const gridpointUrl =
    typeof points?.properties?.forecastGridData === 'string'
      ? points.properties.forecastGridData
      : null;

  // Evict the oldest insertion once at the cap. Map preserves insertion order,
  // so the first key is the oldest.
  if (gridCache.size >= GRID_CACHE_MAX) {
    const oldest = gridCache.keys().next().value;
    if (oldest !== undefined) gridCache.delete(oldest);
  }
  gridCache.set(station, { forecastUrl, gridpointUrl, at: Date.now() });
  return { forecastUrl, gridpointUrl };
}

// GET /api/weather/forecast?ids=KLUK
//   → { forecast: <raw NWS /forecast JSON>, gridpoint: { weather, skyCover } | null }
// Parsing/normalisation happens client-side, matching the METAR/TAF route.
//
// Two upstream reads, not one (TL-23). /forecast supplies the named 12-hour day
// columns, temperatures and winds; the gridpoint supplies the only CONTRACTED
// condition fields NWS publishes (`weather` is a closed enum with no deprecation
// flag, unlike `icon`). Only those two layers are forwarded — the full gridpoint
// payload is ~40 layers and hundreds of KB, almost all of it unused.
//
// The gridpoint is fetched in parallel and is strictly optional: if it fails,
// `gridpoint` is null and the client falls back to the legacy text/icon path. A
// deprecated-but-working field beats no outlook.
//
// Mounted at the SINGLE-SEGMENT path /api/forecast (see app.ts), not at
// /api/weather/forecast. Nested /api/** paths never reached the Vercel function
// at all — the platform router 404'd them before any handler existed (TL-18
// fault 2). The catch-all filename is fixed separately; this flat path is the
// belt to that braces, so the outlook cannot be taken out again by a routing
// quirk. weatherRoute re-mounts it at the old nested path below for clients
// holding a cached bundle.
export const forecastRoute = new Hono();

forecastRoute.get('/', async (c) => {
  const station = (c.req.query('ids') || HOME_STATION).toUpperCase();
  if (!ICAO_RE.test(station)) {
    return c.json({ error: 'Invalid station identifier' }, 400);
  }

  try {
    const { forecastUrl, gridpointUrl } = await resolveForecastUrl(station);
    const nwsHeaders = { 'User-Agent': NWS_USER_AGENT, Accept: 'application/geo+json' };

    const [res, gridRes] = await Promise.all([
      fetch(forecastUrl, { headers: nwsHeaders }),
      gridpointUrl
        ? fetch(gridpointUrl, {
            headers: nwsHeaders,
            // The gridpoint is the optional half, so it does not get to hold the
            // outlook hostage. .catch() covers a REJECTED fetch; only a deadline
            // covers one that simply never answers, and Promise.all waits for
            // both. Budget is generous — this is a cache-warming path, not a
            // keystroke.
            signal: AbortSignal.timeout(GRIDPOINT_TIMEOUT_MS),
          }).catch(() => null)
        : Promise.resolve(null),
    ]);
    if (!res.ok) {
      // Release the gridpoint body we are about to abandon.
      gridRes?.body?.cancel().catch(() => {});
      return c.json({ error: `NWS forecast failed (${res.status})` }, 502);
    }

    let gridpoint: { weather: unknown; skyCover: unknown } | null = null;
    if (gridRes?.ok) {
      // .catch here, not just on the fetch: a 200 with a truncated or non-JSON
      // body rejects at parse time, and letting that reach the outer catch would
      // turn the OPTIONAL half into a 502 for the whole outlook — the exact
      // opposite of the degradation this route promises.
      const props = (await gridRes.json().catch(() => null))?.properties;
      if (props) gridpoint = { weather: props.weather ?? null, skyCover: props.skyCover ?? null };
    }

    // Advisory outlook, not an observation — safe to let the edge hold it
    // briefly. Contrast with METAR/TAF above, which are never cached.
    c.header('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=300');
    return c.json({ forecast: await res.json(), gridpoint });
  } catch (err) {
    return c.json(
      { error: err instanceof Error ? err.message : 'Forecast fetch failed' },
      502,
    );
  }
});

// Legacy nested path. Kept only so an already-installed PWA shell holding the
// old bundle keeps working after this ships; /api/forecast is the real path.
// Safe to delete once no client requests it.
weatherRoute.route('/forecast', forecastRoute);
