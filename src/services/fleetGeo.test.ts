import { describe, it, expect } from 'vitest';
import { lookupAirport } from './airportCoords';
import {
  resolveAircraftPoint,
  projectToBox,
  boundsForPoints,
  declutterPoints,
  type BoundingBox,
} from './fleetGeo';

describe('lookupAirport', () => {
  it('resolves an ICAO code', () => {
    const a = lookupAirport('KLUK');
    expect(a?.icao).toBe('KLUK');
  });

  it('resolves an IATA code, because the satcom feed reports IATA', () => {
    // useSatcomDirect's positions carry departureAirport: 'LAX' / arrivalAirport: 'JFK',
    // while the fleet roster carries homeBase: 'KLUK'. Both must resolve.
    expect(lookupAirport('LAX')?.icao).toBe('KLAX');
    expect(lookupAirport('JFK')?.icao).toBe('KJFK');
  });

  it('is case- and whitespace-insensitive', () => {
    expect(lookupAirport(' kluk ')?.icao).toBe('KLUK');
  });

  it('returns undefined for an unknown code', () => {
    expect(lookupAirport('ZZZZ')).toBeUndefined();
    expect(lookupAirport('')).toBeUndefined();
  });
});

describe('resolveAircraftPoint', () => {
  it('prefers a live satcom position over any airport fallback', () => {
    const r = resolveAircraftPoint({
      tailNumber: 'N1PG',
      position: { latitude: 40.7589, longitude: -73.7004 },
      fallbackAirports: ['KLUK'],
    });
    expect(r.source).toBe('satcom');
    expect(r.point).toEqual({ lat: 40.7589, lon: -73.7004 });
    expect(r.viaAirport).toBeUndefined();
  });

  it('falls back to the first resolvable airport when there is no position', () => {
    // N3PG has no satcom position at all — it must still land on the map at its base.
    const r = resolveAircraftPoint({
      tailNumber: 'N3PG',
      position: undefined,
      fallbackAirports: ['KLUK'],
    });
    expect(r.source).toBe('airport');
    expect(r.viaAirport).toBe('KLUK');
    expect(r.point?.lat).toBeCloseTo(39.1033, 3);
  });

  it('skips unresolvable codes and uses the next fallback in priority order', () => {
    const r = resolveAircraftPoint({
      tailNumber: 'N9XX',
      fallbackAirports: [undefined, 'ZZZZ', 'MIA', 'KLUK'],
    });
    expect(r.viaAirport).toBe('MIA');
    expect(r.source).toBe('airport');
  });

  it('reports unknown when nothing resolves, rather than inventing a point', () => {
    const r = resolveAircraftPoint({ tailNumber: 'N9XX', fallbackAirports: ['ZZZZ'] });
    expect(r.source).toBe('unknown');
    expect(r.point).toBeUndefined();
  });

  it('rejects a malformed satcom position and falls back instead of plotting NaN', () => {
    const r = resolveAircraftPoint({
      tailNumber: 'N1PG',
      position: { latitude: Number.NaN, longitude: -73.7 },
      fallbackAirports: ['KLUK'],
    });
    expect(r.source).toBe('airport');
  });

  it('rejects an out-of-range satcom position', () => {
    const r = resolveAircraftPoint({
      tailNumber: 'N1PG',
      position: { latitude: 91, longitude: -73.7 },
      fallbackAirports: ['KLUK'],
    });
    expect(r.source).toBe('airport');
  });

  it('treats 0,0 as a real coordinate, not as missing data', () => {
    const r = resolveAircraftPoint({
      tailNumber: 'N1PG',
      position: { latitude: 0, longitude: 0 },
      fallbackAirports: ['KLUK'],
    });
    expect(r.source).toBe('satcom');
  });
});

describe('projectToBox', () => {
  const box: BoundingBox = { minLat: 0, maxLat: 100, minLon: 0, maxLon: 200 };

  it('puts the north-west corner at the top-left', () => {
    expect(projectToBox({ lat: 100, lon: 0 }, box)).toEqual({ xPct: 0, yPct: 0 });
  });

  it('puts the south-east corner at the bottom-right', () => {
    expect(projectToBox({ lat: 0, lon: 200 }, box)).toEqual({ xPct: 100, yPct: 100 });
  });

  it('inverts latitude so north is up', () => {
    const north = projectToBox({ lat: 75, lon: 100 }, box);
    const south = projectToBox({ lat: 25, lon: 100 }, box);
    expect(north.yPct).toBeLessThan(south.yPct);
  });

  it('clamps points outside the box to its edges', () => {
    const p = projectToBox({ lat: 500, lon: -500 }, box);
    expect(p.xPct).toBe(0);
    expect(p.yPct).toBe(0);
  });

  it('does not divide by zero on a degenerate box', () => {
    const degenerate: BoundingBox = { minLat: 5, maxLat: 5, minLon: 5, maxLon: 5 };
    const p = projectToBox({ lat: 5, lon: 5 }, degenerate);
    expect(Number.isFinite(p.xPct)).toBe(true);
    expect(Number.isFinite(p.yPct)).toBe(true);
  });
});

describe('boundsForPoints', () => {
  it('pads the extent so dots never sit on the frame edge', () => {
    const b = boundsForPoints([{ lat: 40, lon: -80 }, { lat: 30, lon: -70 }], 5);
    expect(b.minLat).toBe(25);
    expect(b.maxLat).toBe(45);
    expect(b.minLon).toBe(-85);
    expect(b.maxLon).toBe(-65);
  });

  it('never returns a zero-size box for a single point', () => {
    const b = boundsForPoints([{ lat: 39.1, lon: -84.4 }]);
    expect(b.maxLat).toBeGreaterThan(b.minLat);
    expect(b.maxLon).toBeGreaterThan(b.minLon);
  });

  it('falls back to a sane default extent when given no points', () => {
    const b = boundsForPoints([]);
    expect(b.maxLat).toBeGreaterThan(b.minLat);
    expect(b.maxLon).toBeGreaterThan(b.minLon);
  });
});

describe('declutterPoints', () => {
  const dist = (a: { xPct: number; yPct: number }, b: { xPct: number; yPct: number }) =>
    Math.hypot(a.xPct - b.xPct, a.yPct - b.yPct);

  it('leaves a lone point untouched', () => {
    const out = declutterPoints([{ xPct: 50, yPct: 50 }]);
    expect(out).toEqual([{ xPct: 50, yPct: 50 }]);
  });

  it('leaves well-separated points untouched', () => {
    const input = [
      { xPct: 10, yPct: 10 },
      { xPct: 80, yPct: 70 },
    ];
    expect(declutterPoints(input)).toEqual(input);
  });

  it('separates two co-located aircraft so neither hides the other', () => {
    // N2PG (RED) and N5PG (GREEN) both parked at MIA — the live bug.
    const out = declutterPoints([
      { xPct: 52.3, yPct: 83.4 },
      { xPct: 52.3, yPct: 83.4 },
    ]);
    expect(dist(out[0], out[1])).toBeGreaterThan(3);
    for (const p of out) {
      expect(p.xPct).toBeGreaterThanOrEqual(0);
      expect(p.xPct).toBeLessThanOrEqual(100);
      expect(p.yPct).toBeGreaterThanOrEqual(0);
      expect(p.yPct).toBeLessThanOrEqual(100);
    }
  });

  it('spreads three co-located aircraft to three distinct spots', () => {
    const out = declutterPoints([
      { xPct: 40, yPct: 40 },
      { xPct: 40, yPct: 40 },
      { xPct: 40, yPct: 40 },
    ]);
    expect(dist(out[0], out[1])).toBeGreaterThan(3);
    expect(dist(out[0], out[2])).toBeGreaterThan(3);
    expect(dist(out[1], out[2])).toBeGreaterThan(3);
  });

  it('is deterministic across calls', () => {
    const input = [
      { xPct: 30, yPct: 30 },
      { xPct: 30, yPct: 30 },
    ];
    expect(declutterPoints(input)).toEqual(declutterPoints(input));
  });

  it('does not mutate the input array', () => {
    const input = [
      { xPct: 30, yPct: 30 },
      { xPct: 30, yPct: 30 },
    ];
    declutterPoints(input);
    expect(input).toEqual([
      { xPct: 30, yPct: 30 },
      { xPct: 30, yPct: 30 },
    ]);
  });
});
