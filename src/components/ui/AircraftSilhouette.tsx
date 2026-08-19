import React from 'react';

/**
 * Side-profile marks for the fleet types.
 *
 * Stylised, not technical drawings — the job is "these are large-cabin
 * Gulfstreams, and that one is the longer one", legible at 40px on a card and
 * across a room on a TV lane. Proportions follow the real fuselage-length
 * order (G500 < G650ER < G800) so the fleet reads as three distinct airframes
 * rather than one repeated glyph.
 *
 * `currentColor` throughout, so a caller sets the colour by text class and the
 * mark inherits RAG or muted treatment without a second prop.
 */

export type FleetType = 'G500' | 'G650ER' | 'G800' | string;

/** viewBox width per type — the length difference IS the identity. */
const GEOMETRY: Record<string, { w: number; nose: number; tail: number; windows: number }> = {
  G500: { w: 108, nose: 10, tail: 92, windows: 6 },
  G650ER: { w: 124, nose: 10, tail: 108, windows: 8 },
  G800: { w: 134, nose: 10, tail: 118, windows: 9 },
};

const DEFAULT = GEOMETRY.G650ER;

export default function AircraftSilhouette({
  type,
  className = '',
  title,
}: {
  type: FleetType;
  className?: string;
  title?: string;
}) {
  const g = GEOMETRY[type] ?? DEFAULT;
  const midY = 26;

  // Cabin windows, evenly spaced between nose and the wing root.
  const windowXs = Array.from({ length: g.windows }, (_, i) => g.nose + 16 + i * 7.5);

  return (
    <svg
      viewBox={`0 0 ${g.w} 46`}
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinejoin="round"
      strokeLinecap="round"
      role={title ? 'img' : 'presentation'}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      {title && <title>{title}</title>}

      {/* Fuselage: pointed nose, straight cabin, upswept tailcone. */}
      <path
        d={`M ${g.nose} ${midY}
            C ${g.nose + 4} ${midY - 7}, ${g.nose + 12} ${midY - 9}, ${g.nose + 22} ${midY - 9}
            L ${g.tail - 18} ${midY - 9}
            C ${g.tail - 6} ${midY - 9}, ${g.tail - 2} ${midY - 7}, ${g.tail} ${midY - 13}
            L ${g.tail} ${midY - 2}
            C ${g.tail - 8} ${midY + 3}, ${g.tail - 20} ${midY + 4}, ${g.tail - 30} ${midY + 4}
            L ${g.nose + 18} ${midY + 4}
            C ${g.nose + 8} ${midY + 4}, ${g.nose + 2} ${midY + 2}, ${g.nose} ${midY} Z`}
      />

      {/* Wing, swept aft. */}
      <path
        d={`M ${g.tail - 44} ${midY + 1}
            L ${g.tail - 58} ${midY + 15}
            L ${g.tail - 40} ${midY + 15}
            L ${g.tail - 30} ${midY + 2} Z`}
      />

      {/* T-tail: fin plus tailplane — the Gulfstream giveaway at small sizes. */}
      <path d={`M ${g.tail - 14} ${midY - 8} L ${g.tail - 6} ${midY - 24} L ${g.tail - 1} ${midY - 24}`} />
      <path d={`M ${g.tail - 12} ${midY - 24} L ${g.tail + 5} ${midY - 24}`} />

      {/* Aft-fuselage engine nacelle. */}
      <ellipse cx={g.tail - 24} cy={midY - 4} rx={8} ry={4.5} />

      {/* Cabin windows — the count differs by type, like the real airframes. */}
      {windowXs.map(x => (
        <circle key={x} cx={x} cy={midY - 3} r={0.9} fill="currentColor" stroke="none" opacity={0.55} />
      ))}
    </svg>
  );
}
