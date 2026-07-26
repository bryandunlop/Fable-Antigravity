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

import { getDemoForecast } from './weatherMockData';
import {
  conditionFromGridpoint,
  type GridpointWeatherEntry,
  type WeatherCondition,
} from './weatherConditions';

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
  /**
   * Composed from the gridpoint `weather` / `skyCover` enums when the proxy
   * returned them (TL-23) — the only contracted condition input NWS publishes.
   * Undefined when the gridpoint fetch failed or for the demo seed, in which case
   * conditionFromForecastPeriod falls back to the free text and the deprecated
   * icon slug. Never guessed here.
   */
  condition?: WeatherCondition;
}

export interface ForecastResult {
  periods: ForecastPeriod[];
  fetchedAt: string;
  error?: string;
  /** True when periods came from the demo seed. Must be disclosed wherever rendered. */
  isDemo?: boolean;
  /** Why the live fetch failed, when isDemo is true. See WeatherResult.demoReason. */
  demoReason?: string;
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

/* ────────────────────────────────────────────────────────────────────────────
   Gridpoint composition (TL-23)

   /forecast hands us named 12-hour periods with one condition already chosen for
   us — off a deprecated field. The gridpoint layers are contracted but raw: each
   value is stamped with an ISO 8601 interval (`<start>/<duration>`) of arbitrary
   length, and `weather` carries an ARRAY per interval. Composing those into the
   same day columns is the work /forecast was doing for us, and is the entire
   reason TL-23 was deferred out of D35.
   ──────────────────────────────────────────────────────────────────────────── */

/** One `properties.<layer>.values[]` entry. `value` is a number for skyCover, an array for weather. */
interface GridpointValue<T> {
  validTime: string;
  value: T;
}

export interface GridpointLayers {
  weather?: { values?: GridpointValue<GridpointWeatherEntry[]>[] } | null;
  skyCover?: { values?: GridpointValue<number | null>[] } | null;
}

/**
 * Milliseconds for an ISO 8601 duration, restricted to what NWS emits: weeks,
 * days, hours, minutes, seconds (observed `PT1H`, `PT7H`, `P1DT1H`).
 *
 * Years and months are deliberately unsupported rather than approximated — they
 * are not fixed-length, NWS does not use them on these layers, and a guessed
 * 30-day month would silently smear a value across a week of columns. Returns
 * null, and the caller drops the interval.
 */
export function parseIso8601DurationMs(duration: string): number | null {
  const m = /^P(?!$)(?:(\d+)W)?(?:(\d+)D)?(?:T(?!$)(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/.exec(duration);
  if (!m) return null;
  const [, w, d, h, min, s] = m;
  return (
    Number(w ?? 0) * 604800000 +
    Number(d ?? 0) * 86400000 +
    Number(h ?? 0) * 3600000 +
    Number(min ?? 0) * 60000 +
    Number(s ?? 0) * 1000
  );
}

/** `<ISO instant>/<ISO duration>` → [startMs, endMs). Null on anything malformed. */
function parseValidTime(validTime: string): [number, number] | null {
  const slash = validTime.lastIndexOf('/');
  if (slash === -1) return null;
  const startMs = Date.parse(validTime.slice(0, slash));
  const durationMs = parseIso8601DurationMs(validTime.slice(slash + 1));
  if (!Number.isFinite(startMs) || durationMs === null) return null;
  return [startMs, startMs + durationMs];
}

/** Half-open overlap, in ms, between an interval and a period. 0 when disjoint. */
function overlapMs(interval: [number, number], from: number, to: number): number {
  return Math.max(0, Math.min(interval[1], to) - Math.max(interval[0], from));
}

/**
 * Composes the gridpoint layers over one period's window into a single condition.
 *
 * `weather` entries are unioned across every overlapping interval and handed to
 * conditionFromGridpoint, which takes the worst — a period containing four clear
 * hours and one thunderstorm hour is a thunderstorm day, the same call the
 * dual-segment icon path already made.
 *
 * `skyCover` is averaged by OVERLAP DURATION, not maxed. Sky cover is not a
 * hazard: taking the max would render an overcast glyph for a single cloudy hour
 * of an otherwise clear day, which is simply wrong rather than conservatively
 * wrong. The weighting matters because gridpoint intervals are unequal — a 7-hour
 * value and a 1-hour value are not two equal votes.
 *
 * Returns undefined when nothing overlaps, so the caller can fall back rather
 * than render a composed-from-nothing glyph.
 */
export function composeGridpointCondition(
  layers: GridpointLayers | null | undefined,
  period: { startMs: number; endMs: number; windKt: number | null },
): WeatherCondition | undefined {
  if (!layers) return undefined;

  const weather: GridpointWeatherEntry[] = [];
  for (const v of layers.weather?.values ?? []) {
    const interval = parseValidTime(v?.validTime ?? '');
    if (!interval || overlapMs(interval, period.startMs, period.endMs) <= 0) continue;
    if (Array.isArray(v.value)) weather.push(...v.value);
  }

  let coverWeightedSum = 0;
  let coverWeight = 0;
  for (const v of layers.skyCover?.values ?? []) {
    const interval = parseValidTime(v?.validTime ?? '');
    if (!interval) continue;
    const weight = overlapMs(interval, period.startMs, period.endMs);
    if (weight <= 0 || typeof v.value !== 'number' || !Number.isFinite(v.value)) continue;
    coverWeightedSum += v.value * weight;
    coverWeight += weight;
  }

  return (
    conditionFromGridpoint({
      weather,
      skyCoverPercent: coverWeight > 0 ? coverWeightedSum / coverWeight : null,
      windKt: period.windKt,
    }) ?? undefined
  );
}

/**
 * Parses an NWS /forecast payload into up to 7 daytime periods.
 *
 * NWS returns ~14 periods (day/night pairs) over 7 days; we keep the daytime
 * half so the strip reads as one column per day. Never throws — malformed
 * payloads yield [], matching the weather module's degrade-don't-explode
 * convention.
 *
 * Accepts either the proxy's envelope (`{ forecast, gridpoint }`, since TL-23) or
 * a bare NWS /forecast payload. Two shapes rather than one because the gridpoint
 * half is genuinely optional: it is a second upstream call that can fail on its
 * own, and when it does the outlook must still render off /forecast alone.
 */
export function parseForecast(raw: any): ForecastPeriod[] {
  const forecast = raw?.forecast ?? raw;
  const gridpoint: GridpointLayers | null = raw?.gridpoint ?? null;

  const periods = forecast?.properties?.periods;
  if (!Array.isArray(periods)) return [];

  return periods
    .filter((p: any) => p?.isDaytime === true)
    .slice(0, 7)
    .map((p: any) => {
      const windKt = parseWindSpeedToKnots(p.windSpeed);
      const startMs = Date.parse(String(p.startTime ?? ''));
      const endMs = Date.parse(String(p.endTime ?? ''));
      const condition =
        Number.isFinite(startMs) && Number.isFinite(endMs) && endMs > startMs
          ? composeGridpointCondition(gridpoint, { startMs, endMs, windKt })
          : undefined;

      return {
        number: Number(p.number ?? 0),
        name: String(p.name ?? ''),
        startTime: String(p.startTime ?? ''),
        tempC: parseTempC(p),
        windKt,
        windDirection: String(p.windDirection ?? ''),
        shortForecast: String(p.shortForecast ?? ''),
        detailedForecast: String(p.detailedForecast ?? ''),
        precipProbability: Number(p.probabilityOfPrecipitation?.value ?? 0),
        icon: String(p.icon ?? ''),
        condition,
      };
    });
}

/**
 * Fetches the outlook via our proxy. Never throws.
 *
 * Degrades to the demo seed on failure, flagged isDemo — same contract and same
 * reasoning as fetchWeather(). Unlike fetchWeather, a non-ok status falls back
 * too: an outlook is planning colour, and there is no equivalent of "this
 * airport does not exist" to protect here (a bad ICAO already failed at the
 * METAR before this ever runs).
 */
export async function fetchForecast(icaoId: string): Promise<ForecastResult> {
  const fetchedAt = new Date().toISOString();
  const demo = (reason: string): ForecastResult => ({
    periods: getDemoForecast(),
    fetchedAt,
    isDemo: true,
    demoReason: reason,
  });

  try {
    const res = await fetch(`${PROXY_URL}?ids=${encodeURIComponent(icaoId)}`);
    if (!res.ok) {
      return demo(`Forecast unavailable (${res.status})`);
    }
    const body = await res.json();
    const periods = parseForecast(body);
    // A 200 that parses to nothing is a broken upstream, not an empty forecast.
    return periods.length ? { periods, fetchedAt } : demo('Forecast returned no periods');
  } catch (err) {
    return demo(err instanceof Error ? err.message : 'Forecast unavailable');
  }
}
