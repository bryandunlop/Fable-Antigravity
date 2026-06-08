// Weather proxy for the Aviation Weather Center (FAA/NWS).
// aviationweather.gov no longer returns CORS headers, so the browser can't
// call it directly — we proxy server-side (Edge) where CORS doesn't apply.
// Returns the raw AWC JSON arrays; parsing/normalisation happens client-side.

import { Hono } from 'hono';

const AWC_BASE = 'https://aviationweather.gov/api/data';

export const weatherRoute = new Hono();

// GET /api/weather?ids=KLUK  → { metar: [...], taf: [...] }
weatherRoute.get('/', async (c) => {
  const ids = (c.req.query('ids') || 'KLUK').toUpperCase();

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
