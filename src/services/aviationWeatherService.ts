/**
 * Aviation Weather Service
 * Fetches live METARs and TAFs from the FAA/NWS Aviation Weather Center.
 * API docs: https://aviationweather.gov/api/docs
 *
 * aviationweather.gov no longer sends CORS headers, so the browser can't call
 * it directly — we go through our own `/api/weather` proxy (Hono on Vercel Edge),
 * which fetches AWC server-side and returns the raw { metar, taf } JSON arrays.
 */

const PROXY_URL = '/api/weather';

/** Converts an AWC obsTime (Unix seconds OR ISO string) to an ISO 8601 string. */
function toIso(obsTime: unknown): string {
  if (typeof obsTime === 'number') return new Date(obsTime * 1000).toISOString();
  if (typeof obsTime === 'string' && obsTime) {
    // Numeric-looking string → treat as Unix seconds
    const n = Number(obsTime);
    if (!Number.isNaN(n) && obsTime.trim() !== '' && !obsTime.includes('-')) {
      return new Date(n * 1000).toISOString();
    }
    return obsTime;
  }
  return new Date().toISOString();
}

/** AWC now reports altimeter in hectopascals; convert to inHg for display. */
function toInHg(altim: unknown): number {
  const n = Number(altim ?? 0);
  if (!n) return 0;
  // Values > 100 are hPa (e.g. 1015.7); values ~28–31 are already inHg.
  return n > 100 ? n / 33.8639 : n;
}

/**
 * Returns true if the sun is above the horizon at the given coordinates/time.
 * Uses a low-precision NOAA solar-position approximation (good to ~1 min),
 * which is far more than enough to pick a sun vs. moon icon. Accounts for
 * atmospheric refraction + the sun's radius via the standard −0.833° horizon.
 */
export function isDaytime(lat: number, lon: number, date: Date = new Date()): boolean {
  const rad = Math.PI / 180;
  const n = date.getTime() / 86400000 + 2440587.5 - 2451545.0; // days since J2000
  const g = (357.529 + 0.98560028 * n) * rad;                  // mean anomaly
  const q = 280.459 + 0.98564736 * n;                          // mean longitude
  const L = (q + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g)) * rad; // ecliptic longitude
  const e = (23.439 - 0.00000036 * n) * rad;                   // obliquity
  const dec = Math.asin(Math.sin(e) * Math.sin(L));            // declination
  const ra = Math.atan2(Math.cos(e) * Math.sin(L), Math.cos(L)) / rad; // right ascension (deg)
  const gmst = 280.46061837 + 360.98564736629 * n;             // Greenwich sidereal time
  let H = ((gmst + lon - ra) % 360 + 540) % 360 - 180;         // hour angle (deg), −180..180
  H *= rad;
  const alt = Math.asin(
    Math.sin(lat * rad) * Math.sin(dec) +
    Math.cos(lat * rad) * Math.cos(dec) * Math.cos(H),
  ) / rad;
  return alt > -0.833;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type FlightCategory = 'VFR' | 'MVFR' | 'IFR' | 'LIFR' | 'UNKN';

export interface MetarData {
  /** Raw METAR string, e.g. "KLUK 241453Z 31010KT 10SM CLR 05/M02 A3012" */
  rawOb: string;
  /** ICAO airport identifier */
  icaoId: string;
  /** Airport name */
  name: string;
  /** Observation time as ISO 8601 string */
  obsTime: string;
  /** Wind direction in degrees (0–360), or 0 for calm/variable */
  wdir: number | 'VRB';
  /** Wind speed in knots */
  wspd: number;
  /** Wind gust in knots, undefined if no gust */
  wgst?: number;
  /** Visibility in statute miles */
  visib: number | string;
  /** Temperature in °C */
  temp: number;
  /** Dewpoint in °C */
  dewp: number;
  /** Altimeter setting in inHg */
  altim: number;
  /** Flight category */
  fltcat: FlightCategory;
  /** Cloud layers, e.g. [{ cover: 'BKN', base: 2500 }] */
  clouds?: Array<{ cover: string; base: number }>;
  /** Weather phenomena, e.g. ["-RA", "BR"] */
  wxString?: string;
  /** Airport latitude in decimal degrees */
  lat?: number;
  /** Airport longitude in decimal degrees */
  lon?: number;
}

export interface TafData {
  /** Raw TAF string */
  rawTAF: string;
  /** ICAO airport identifier */
  icaoId: string;
  /** Issue time as ISO 8601 string */
  issueTime: string;
  /** Valid period start as ISO 8601 string */
  validTimeFrom: string;
  /** Valid period end as ISO 8601 string */
  validTimeTo: string;
}

export interface WeatherResult {
  metar: MetarData | null;
  taf: TafData | null;
  fetchedAt: Date;
  error?: string;
}

// ─── Flight category helpers ──────────────────────────────────────────────────

/** Returns a Tailwind colour class for the given flight category. */
export function flightCategoryColor(cat: FlightCategory): string {
  switch (cat) {
    case 'VFR':  return 'text-green-600 dark:text-green-400';
    case 'MVFR': return 'text-blue-600 dark:text-blue-400';
    case 'IFR':  return 'text-red-600 dark:text-red-400';
    case 'LIFR': return 'text-purple-600 dark:text-purple-400';
    default:     return 'text-muted-foreground';
  }
}

/** Returns a Tailwind badge variant colour for the given flight category. */
export function flightCategoryBadgeClass(cat: FlightCategory): string {
  switch (cat) {
    case 'VFR':  return 'border-green-300 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400';
    case 'MVFR': return 'border-blue-300 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400';
    case 'IFR':  return 'border-red-300 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400';
    case 'LIFR': return 'border-purple-300 bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400';
    default:     return 'border-border bg-muted text-muted-foreground';
  }
}

/** Determines flight category from visibility (SM) and ceiling (ft). */
export function deriveFlightCategory(visibSm: number, ceilingFt?: number): FlightCategory {
  const hasCeiling = ceilingFt !== undefined;
  if (visibSm < 1 || (hasCeiling && ceilingFt! < 500))   return 'LIFR';
  if (visibSm < 3 || (hasCeiling && ceilingFt! < 1000))  return 'IFR';
  if (visibSm <= 5 || (hasCeiling && ceilingFt! <= 3000)) return 'MVFR';
  return 'VFR';
}

// ─── Formatters ───────────────────────────────────────────────────────────────

/** Formats wind for display, e.g. "310° @ 10 kts", "Calm", "VRB 5 kts G18" */
export function formatWind(metar: MetarData): string {
  if (metar.wspd === 0) return 'Calm';
  const dir = metar.wdir === 'VRB' ? 'VRB' : `${String(metar.wdir).padStart(3, '0')}°`;
  const spd = `${metar.wspd} kts`;
  const gust = metar.wgst ? ` G${metar.wgst} kts` : '';
  return `${dir} @ ${spd}${gust}`;
}

/** Formats temperature/dewpoint for display, e.g. "5°C / -2°C" */
export function formatTempDew(metar: MetarData): string {
  return `${metar.temp}°C / ${metar.dewp}°C`;
}

/** Formats altimeter for display, e.g. "30.12 inHg" */
export function formatAltimeter(metar: MetarData): string {
  return `${metar.altim.toFixed(2)} inHg`;
}

/** Formats visibility for display, e.g. "10 SM", ">10 SM" */
export function formatVisibility(visib: number | string): string {
  if (typeof visib === 'string') return visib;
  return visib >= 10 ? '>10 SM' : `${visib} SM`;
}

/** Returns a short human-readable time since observation, e.g. "4 min ago" */
export function obsTimeLabel(isoTime: string): string {
  const diff = Math.floor((Date.now() - new Date(isoTime).getTime()) / 60000);
  if (diff < 1) return 'Just now';
  if (diff === 1) return '1 min ago';
  return `${diff} min ago`;
}

// ─── API fetch ────────────────────────────────────────────────────────────────

/** Parses a raw AWC METAR record into our normalised MetarData shape. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseMetar(d: any): MetarData {
  // visib can be a number or a string like "10+" — keep strings, coerce numerics.
  const visibNum = parseFloat(d.visib);
  const visib: number | string =
    typeof d.visib === 'string' && Number.isNaN(visibNum) ? d.visib : (Number.isNaN(visibNum) ? d.visib : visibNum);

  const clouds = Array.isArray(d.clouds)
    ? d.clouds.map((c: { cover: string; base: number }) => ({ cover: c.cover, base: c.base }))
    : undefined;

  // Ceiling = lowest BKN or OVC layer
  const ceiling = clouds
    ?.filter((c: { cover: string; base: number }) => c.cover === 'BKN' || c.cover === 'OVC')
    .sort((a: { base: number }, b: { base: number }) => a.base - b.base)[0]?.base;

  // AWC returns the category as `fltCat` (camelCase); older docs used `fltcat`.
  const rawCat = d.fltCat ?? d.fltcat;
  const fltcat: FlightCategory =
    rawCat && ['VFR', 'MVFR', 'IFR', 'LIFR'].includes(rawCat)
      ? (rawCat as FlightCategory)
      : typeof visib === 'number'
        ? deriveFlightCategory(visib, ceiling)
        : 'UNKN';

  return {
    rawOb: d.rawOb ?? '',
    icaoId: d.icaoId ?? '',
    name: d.name ?? d.icaoId ?? '',
    obsTime: toIso(d.obsTime),
    wdir: d.wdir === 'VRB' ? 'VRB' : Number(d.wdir ?? 0),
    wspd: Number(d.wspd ?? 0),
    wgst: d.wgst != null ? Number(d.wgst) : undefined,
    visib,
    temp: Number(d.temp ?? 0),
    dewp: Number(d.dewp ?? 0),
    altim: toInHg(d.altim),
    fltcat,
    clouds,
    wxString: d.wxString ?? undefined,
    lat: d.lat != null ? Number(d.lat) : undefined,
    lon: d.lon != null ? Number(d.lon) : undefined,
  };
}

/** Parses a raw AWC TAF record into our normalised TafData shape. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseTaf(d: any): TafData {
  return {
    rawTAF: d.rawTAF ?? '',
    icaoId: d.icaoId ?? '',
    issueTime: d.issueTime ?? new Date().toISOString(),
    validTimeFrom: typeof d.validTimeFrom === 'number' ? toIso(d.validTimeFrom) : (d.validTimeFrom ?? new Date().toISOString()),
    validTimeTo: typeof d.validTimeTo === 'number' ? toIso(d.validTimeTo) : (d.validTimeTo ?? new Date().toISOString()),
  };
}

/**
 * Fetches both METAR and TAF for a single airport via our `/api/weather` proxy.
 * Returns nulls on error rather than throwing, suitable for UI use.
 */
export async function fetchWeather(icaoId: string): Promise<WeatherResult> {
  try {
    const res = await fetch(`${PROXY_URL}?ids=${encodeURIComponent(icaoId)}`);
    if (!res.ok) {
      throw new Error(`Weather fetch failed: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    const metars: unknown[] = Array.isArray(data?.metar) ? data.metar : [];
    const tafs: unknown[] = Array.isArray(data?.taf) ? data.taf : [];

    return {
      metar: metars[0] ? parseMetar(metars[0]) : null,
      taf: tafs[0] ? parseTaf(tafs[0]) : null,
      fetchedAt: new Date(),
    };
  } catch (err) {
    return {
      metar: null,
      taf: null,
      fetchedAt: new Date(),
      error: err instanceof Error ? err.message : 'Unknown error fetching weather',
    };
  }
}
