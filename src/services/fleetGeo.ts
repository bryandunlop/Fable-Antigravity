/**
 * Turning fleet data into plottable points.
 *
 * The satcom feed only covers some tails (N3PG has no position at all), so a map
 * driven purely by satcom silently drops aircraft. Resolution is therefore
 * layered: a live position when one is reporting, otherwise the aircraft's
 * airport/base, otherwise nothing plotted at all.
 *
 * The output is lat/lon, not screen coordinates — the schematic projects it into
 * a box today, and the Leaflet map can consume the same points unchanged.
 */
import { lookupAirport, normalizeAirportCode } from './airportCoords';

export interface GeoPoint {
  lat: number;
  lon: number;
}

export interface BoundingBox {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
}

export type PositionSource = 'satcom' | 'airport' | 'unknown';

export interface ResolvedAircraftPoint {
  tailNumber: string;
  point?: GeoPoint;
  source: PositionSource;
  /** The airport code the fallback resolved from, when source === 'airport'. */
  viaAirport?: string;
}

export interface ResolveAircraftPointInput {
  tailNumber: string;
  position?: { latitude: number; longitude: number };
  /** Airport codes to try, in priority order. Undefined entries are skipped. */
  fallbackAirports?: (string | undefined)[];
}

/** Guards against NaN and out-of-range values reaching the projection as a dot. */
function isPlottable(lat: number, lon: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180
  );
}

export function resolveAircraftPoint(input: ResolveAircraftPointInput): ResolvedAircraftPoint {
  const { tailNumber, position, fallbackAirports = [] } = input;

  if (position && isPlottable(position.latitude, position.longitude)) {
    return {
      tailNumber,
      point: { lat: position.latitude, lon: position.longitude },
      source: 'satcom',
    };
  }

  for (const code of fallbackAirports) {
    const airport = lookupAirport(code);
    if (airport) {
      return {
        tailNumber,
        point: { lat: airport.lat, lon: airport.lon },
        source: 'airport',
        viaAirport: normalizeAirportCode(code),
      };
    }
  }

  return { tailNumber, source: 'unknown' };
}

function clamp(value: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, value));
}

/**
 * Equirectangular projection into a percentage box. Latitude is inverted so north
 * renders at the top. Percentages suit CSS positioning and stay correct as the
 * container resizes.
 */
export function projectToBox(point: GeoPoint, box: BoundingBox): { xPct: number; yPct: number } {
  const lonSpan = box.maxLon - box.minLon;
  const latSpan = box.maxLat - box.minLat;

  const xPct = lonSpan === 0 ? 50 : ((point.lon - box.minLon) / lonSpan) * 100;
  const yPct = latSpan === 0 ? 50 : ((box.maxLat - point.lat) / latSpan) * 100;

  return { xPct: clamp(xPct, 0, 100), yPct: clamp(yPct, 0, 100) };
}

/** Continental-US extent, used when there is nothing to frame. */
const DEFAULT_BOUNDS: BoundingBox = { minLat: 22, maxLat: 52, minLon: -128, maxLon: -64 };

/** Smallest span a box may have, so a single point cannot collapse the projection. */
const MIN_SPAN_DEG = 1;

export function boundsForPoints(points: GeoPoint[], padDeg = 4): BoundingBox {
  if (points.length === 0) return { ...DEFAULT_BOUNDS };

  let minLat = Number.POSITIVE_INFINITY;
  let maxLat = Number.NEGATIVE_INFINITY;
  let minLon = Number.POSITIVE_INFINITY;
  let maxLon = Number.NEGATIVE_INFINITY;

  for (const p of points) {
    if (p.lat < minLat) minLat = p.lat;
    if (p.lat > maxLat) maxLat = p.lat;
    if (p.lon < minLon) minLon = p.lon;
    if (p.lon > maxLon) maxLon = p.lon;
  }

  return widen({
    minLat: minLat - padDeg,
    maxLat: maxLat + padDeg,
    minLon: minLon - padDeg,
    maxLon: maxLon + padDeg,
  });
}

function widen(box: BoundingBox): BoundingBox {
  const out = { ...box };

  if (out.maxLat - out.minLat < MIN_SPAN_DEG) {
    const mid = (out.maxLat + out.minLat) / 2;
    out.minLat = mid - MIN_SPAN_DEG / 2;
    out.maxLat = mid + MIN_SPAN_DEG / 2;
  }
  if (out.maxLon - out.minLon < MIN_SPAN_DEG) {
    const mid = (out.maxLon + out.minLon) / 2;
    out.minLon = mid - MIN_SPAN_DEG / 2;
    out.maxLon = mid + MIN_SPAN_DEG / 2;
  }

  return out;
}
