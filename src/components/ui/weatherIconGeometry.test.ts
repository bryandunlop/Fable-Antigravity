import { describe, it, expect } from 'vitest';
import { sunRayPath } from './WeatherIcons';

/**
 * Geometry tests for the sun glyph.
 *
 * Note this is a .ts test importing a .tsx module — vitest's include pattern is
 * `src/**\/*.test.ts`, so a .tsx test file would silently never run (gap TL-11).
 * Importing across is fine; only the test file's own extension matters.
 *
 * These exist because the rays were previously a hardcoded path centred on
 * (32,32) while the `partly` glyph moved its disc to (41,22) — the two drifted
 * apart and rendered as unrelated objects. A cloud covered enough of it to pass
 * a visual check at 28px. Geometry that can drift needs an assertion, not an eye.
 */

/** Pulls every absolute-move coordinate pair out of a path like "M12 34L56 78 M…". */
function points(d: string): Array<[number, number]> {
  return [...d.matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/g)].map(m => [Number(m[1]), Number(m[2])]);
}

describe('sunRayPath', () => {
  it('draws eight rays', () => {
    // 8 rays × 2 endpoints each.
    expect(points(sunRayPath(32, 32, 12))).toHaveLength(16);
  });

  it('centres the rays on the disc they belong to, wherever it is', () => {
    // The actual bug: a sun at (41,22) with rays around (32,32).
    for (const [cx, cy, r] of [[32, 32, 12], [41, 22, 9], [10, 50, 6]] as const) {
      const pts = points(sunRayPath(cx, cy, r));
      const meanX = pts.reduce((s, p) => s + p[0], 0) / pts.length;
      const meanY = pts.reduce((s, p) => s + p[1], 0) / pts.length;
      // Eight symmetric rays average back to their own centre.
      expect(meanX, `cx=${cx}`).toBeCloseTo(cx, 1);
      expect(meanY, `cy=${cy}`).toBeCloseTo(cy, 1);
    }
  });

  it('keeps every ray in an annulus around the disc — never touching it, never adrift', () => {
    const [cx, cy, r] = [41, 22, 9];
    for (const [x, y] of points(sunRayPath(cx, cy, r))) {
      const dist = Math.hypot(x - cx, y - cy);
      expect(dist).toBeGreaterThan(r);        // a gap, not a starburst glued to the disc
      expect(dist).toBeLessThanOrEqual(r * 2.3 + 0.1);
    }
  });

  it('stays inside the 64×64 viewBox at both sizes the app renders', () => {
    // The partial sun sits up-right at (41,22); rays that overran the viewBox
    // would clip against the edge rather than fail loudly.
    for (const [cx, cy, r] of [[32, 32, 12], [41, 22, 9]] as const) {
      for (const [x, y] of points(sunRayPath(cx, cy, r))) {
        expect(x, `x out of viewBox for r=${r}`).toBeGreaterThanOrEqual(0);
        expect(x, `x out of viewBox for r=${r}`).toBeLessThanOrEqual(64);
        expect(y, `y out of viewBox for r=${r}`).toBeGreaterThanOrEqual(0);
        expect(y, `y out of viewBox for r=${r}`).toBeLessThanOrEqual(64);
      }
    }
  });

  it('reproduces the original hand-drawn geometry at the default size', () => {
    // The old path put rays between 22 and 28 from centre at r=12. Keeping that
    // means swapping to derived geometry changed no pixels on the `clear` glyph.
    const pts = points(sunRayPath(32, 32, 12));
    const dists = pts.map(([x, y]) => Math.hypot(x - 32, y - 32));
    expect(Math.min(...dists)).toBeCloseTo(21.6, 1);
    expect(Math.max(...dists)).toBeCloseTo(27.6, 1);
  });
});
