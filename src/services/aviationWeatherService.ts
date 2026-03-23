/**
 * Aviation Weather Service
 * Fetches live METARs and TAFs from the FAA/NWS Aviation Weather Center.
 * API docs: https://aviationweather.gov/api/docs
 *
 * No API key required. CORS is supported — safe to call directly from the browser.
 */

const BASE_URL = 'https://aviationweather.gov/api/data';

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

/**
 * Fetches the latest METAR for one or more airports.
 * @param icaoIds - One or more ICAO identifiers, e.g. ['KLUK', 'KORD']
 * @param hoursBack - How many hours back to search (default: 2)
 */
export async function fetchMetar(
  icaoIds: string[],
  hoursBack = 2,
): Promise<MetarData[]> {
  const ids = icaoIds.join(',');
  const url = `${BASE_URL}/metar?ids=${ids}&format=json&hours=${hoursBack}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`METAR fetch failed: ${res.status} ${res.statusText}`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any[] = await res.json();
  if (!Array.isArray(data)) return [];

  return data.map((d): MetarData => {
    const visib = parseFloat(d.visib) ?? d.visib;
    const clouds = Array.isArray(d.clouds)
      ? d.clouds.map((c: { cover: string; base: number }) => ({ cover: c.cover, base: c.base }))
      : undefined;

    // Ceiling = lowest BKN or OVC layer
    const ceiling = clouds
      ?.filter((c: { cover: string; base: number }) => c.cover === 'BKN' || c.cover === 'OVC')
      .sort((a: { base: number }, b: { base: number }) => a.base - b.base)[0]?.base;

    const fltcat: FlightCategory =
      d.fltcat && ['VFR', 'MVFR', 'IFR', 'LIFR'].includes(d.fltcat)
        ? (d.fltcat as FlightCategory)
        : typeof visib === 'number'
          ? deriveFlightCategory(visib, ceiling)
          : 'UNKN';

    return {
      rawOb: d.rawOb ?? '',
      icaoId: d.icaoId ?? '',
      name: d.name ?? d.icaoId ?? '',
      obsTime: d.obsTime ?? new Date().toISOString(),
      wdir: d.wdir === 'VRB' ? 'VRB' : Number(d.wdir ?? 0),
      wspd: Number(d.wspd ?? 0),
      wgst: d.wgst != null ? Number(d.wgst) : undefined,
      visib,
      temp: Number(d.temp ?? 0),
      dewp: Number(d.dewp ?? 0),
      altim: Number(d.altim ?? 0),
      fltcat,
      clouds,
      wxString: d.wxString ?? undefined,
    };
  });
}

/**
 * Fetches the latest TAF for one or more airports.
 * @param icaoIds - One or more ICAO identifiers
 */
export async function fetchTaf(icaoIds: string[]): Promise<TafData[]> {
  const ids = icaoIds.join(',');
  const url = `${BASE_URL}/taf?ids=${ids}&format=json`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`TAF fetch failed: ${res.status} ${res.statusText}`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any[] = await res.json();
  if (!Array.isArray(data)) return [];

  return data.map((d): TafData => ({
    rawTAF: d.rawTAF ?? '',
    icaoId: d.icaoId ?? '',
    issueTime: d.issueTime ?? new Date().toISOString(),
    validTimeFrom: d.validTimeFrom ?? new Date().toISOString(),
    validTimeTo: d.validTimeTo ?? new Date().toISOString(),
  }));
}

/**
 * Fetches both METAR and TAF for a single airport in one call.
 * Returns nulls on error rather than throwing, suitable for UI use.
 */
export async function fetchWeather(icaoId: string): Promise<WeatherResult> {
  try {
    const [metars, tafs] = await Promise.all([
      fetchMetar([icaoId]),
      fetchTaf([icaoId]),
    ]);

    return {
      metar: metars[0] ?? null,
      taf: tafs[0] ?? null,
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
