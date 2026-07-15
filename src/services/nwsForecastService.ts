/**
 * NWS Forecast Service
 * Fetches the 7-day outlook from the National Weather Service public API.
 * API docs: https://www.weather.gov/documentation/services-web-api
 *
 * NOT AN AVIATION WEATHER PRODUCT. The Aviation Weather Center (the source of
 * our METAR/TAF) publishes nothing beyond ~30h, so a 7-day outlook necessarily
 * comes from the NWS *public* forecast. It is planning information only — see
 * vault note Q14 (DOM ruling pending) and D30.
 *
 * NWS requires a User-Agent header, which browser `fetch` cannot set (it is a
 * forbidden header name). So — unlike the AWC proxy, which exists for CORS —
 * this one exists because the call is physically impossible client-side.
 */

const PROXY_URL = '/api/weather/forecast';

/** NWS reports °F and mph; the rest of the weather UI is °C and knots. */
const MPH_TO_KNOTS = 0.868976;

/** One daytime period — a single column in the 7-day strip. */
export interface ForecastPeriod {
  number: number;
  name: string;
  startTime: string;
  /**
   * Normalized from NWS °F at the parse boundary. Null when NWS omits a
   * temperature — same reasoning as windKt: a fabricated 0°F would render as
   * -18°C and read as a real forecast of hard freeze.
   */
  tempC: number | null;
  /** Normalized from NWS mph at the parse boundary. Null when NWS gives no parseable speed. */
  windKt: number | null;
  windDirection: string;
  shortForecast: string;
  detailedForecast: string;
  /** Percent 0-100. */
  precipProbability: number;
  icon: string;
}

export interface ForecastResult {
  periods: ForecastPeriod[];
  fetchedAt: string;
  error?: string;
}

/** Converts °F to whole °C for display. */
export function fahrenheitToCelsius(f: number): number {
  return Math.round(((f - 32) * 5) / 9);
}

/**
 * Converts an NWS windSpeed display string to whole knots.
 *
 * NWS returns human strings, not numbers — "10 mph" or "5 to 15 mph". For a
 * range we take the UPPER bound: in aviation you plan against the worst case,
 * and understating wind is the dangerous direction to be wrong in.
 *
 * Returns null (not 0) when nothing parses — "calm", "", undefined. A zero
 * would render as a real observation of no wind.
 */
export function parseWindSpeedToKnots(speed: string | null | undefined): number | null {
  if (!speed) return null;
  const values = speed.match(/\d+(\.\d+)?/g);
  if (!values || values.length === 0) return null;
  const mph = Math.max(...values.map(Number));
  return Math.round(mph * MPH_TO_KNOTS);
}

/**
 * Normalizes a period's temperature to whole °C, respecting temperatureUnit.
 *
 * Returns null (not 0) when NWS omits the value — a missing temperature
 * coerced to 0°F renders as -18°C, which looks like a real forecast of a
 * hard freeze. Same principle as parseWindSpeedToKnots.
 */
function parseTempC(period: any): number | null {
  const raw = period?.temperature;
  if (raw === null || raw === undefined || raw === '') return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  return String(period.temperatureUnit).toUpperCase() === 'C'
    ? Math.round(n)
    : fahrenheitToCelsius(n);
}

/**
 * Parses an NWS /forecast payload into up to 7 daytime periods.
 *
 * NWS returns ~14 periods (day/night pairs) over 7 days; we keep the daytime
 * half so the strip reads as one column per day. Never throws — malformed
 * payloads yield [], matching the weather module's degrade-don't-explode
 * convention.
 */
export function parseForecast(raw: any): ForecastPeriod[] {
  const periods = raw?.properties?.periods;
  if (!Array.isArray(periods)) return [];

  return periods
    .filter((p: any) => p?.isDaytime === true)
    .slice(0, 7)
    .map((p: any) => {
      return {
        number: Number(p.number ?? 0),
        name: String(p.name ?? ''),
        startTime: String(p.startTime ?? ''),
        tempC: parseTempC(p),
        windKt: parseWindSpeedToKnots(p.windSpeed),
        windDirection: String(p.windDirection ?? ''),
        shortForecast: String(p.shortForecast ?? ''),
        detailedForecast: String(p.detailedForecast ?? ''),
        precipProbability: Number(p.probabilityOfPrecipitation?.value ?? 0),
        icon: String(p.icon ?? ''),
      };
    });
}

/**
 * Fetches the outlook via our proxy. Never throws — returns an error field,
 * matching fetchWeather() in aviationWeatherService.
 */
export async function fetchForecast(icaoId: string): Promise<ForecastResult> {
  const fetchedAt = new Date().toISOString();
  try {
    const res = await fetch(`${PROXY_URL}?ids=${encodeURIComponent(icaoId)}`);
    if (!res.ok) {
      return { periods: [], fetchedAt, error: `Forecast unavailable (${res.status})` };
    }
    const body = await res.json();
    return { periods: parseForecast(body), fetchedAt };
  } catch (err) {
    return {
      periods: [],
      fetchedAt,
      error: err instanceof Error ? err.message : 'Forecast unavailable',
    };
  }
}
