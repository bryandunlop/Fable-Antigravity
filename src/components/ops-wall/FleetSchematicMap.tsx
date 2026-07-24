import React, { useMemo } from 'react';
import { Plane } from 'lucide-react';
import type { UnifiedFleetAircraft } from '../hooks/useUnifiedFleetStatus';
import { HOME_STATION } from '../../config/station';
import { lookupAirport } from '../../services/airportCoords';
import {
  boundsForPoints,
  declutterPoints,
  projectToBox,
  resolveAircraftPoint,
  type GeoPoint,
} from '../../services/fleetGeo';
import { RAG_DOT } from './ragColors';

interface FleetSchematicMapProps {
  fleet: UnifiedFleetAircraft[];
  homeBase?: string;
  className?: string;
}

interface PlottedAircraft {
  tail: string;
  status: string;
  xPct: number;
  yPct: number;
  inFlight: boolean;
  headingDeg: number;
  /** Destination end of the leg, when the aircraft is airborne and it resolves. */
  legTo?: { xPct: number; yPct: number };
}

/**
 * Interim fleet picture: real coordinates, deliberately no basemap.
 *
 * This is the reserved home for the live map. It plots the same lat/lon the
 * Leaflet view consumes, so replacing this component with the real map is a swap,
 * not a rewrite — nothing here encodes screen-space positions.
 */
export default function FleetSchematicMap({
  fleet,
  homeBase = HOME_STATION,
  className = '',
}: FleetSchematicMapProps) {
  const { plotted, unplotted, homeTick } = useMemo(() => {
    const resolved = fleet.map(ac => ({
      ac,
      point: resolveAircraftPoint({
        tailNumber: ac.tailNumber,
        position: ac.position
          ? { latitude: ac.position.latitude, longitude: ac.position.longitude }
          : undefined,
        // Most-recent destination, then origin, then the tail's base.
        fallbackAirports: [ac.position?.arrivalAirport, ac.position?.departureAirport, homeBase],
      }),
    }));

    // Frame the aircraft plus the base, so home is always in view even when the
    // whole fleet is away.
    const home = lookupAirport(homeBase);
    const frameable: GeoPoint[] = resolved
      .map(r => r.point.point)
      .filter((p): p is GeoPoint => Boolean(p));
    if (home) frameable.push({ lat: home.lat, lon: home.lon });

    const bounds = boundsForPoints(frameable);

    const plottedList: PlottedAircraft[] = [];
    const missing: string[] = [];

    for (const { ac, point } of resolved) {
      if (!point.point) {
        missing.push(ac.tailNumber);
        continue;
      }
      const { xPct, yPct } = projectToBox(point.point, bounds);
      const inFlight = ac.flightStatus === 'in-flight';

      let legTo: { xPct: number; yPct: number } | undefined;
      if (inFlight) {
        const dest = lookupAirport(ac.position?.arrivalAirport);
        if (dest) legTo = projectToBox({ lat: dest.lat, lon: dest.lon }, bounds);
      }

      plottedList.push({
        tail: ac.tailNumber,
        status: ac.airworthiness.status,
        xPct,
        yPct,
        inFlight,
        headingDeg: ac.position?.heading ?? 0,
        legTo,
      });
    }

    // Fan out aircraft that resolved to the same point (e.g. two tails on one
    // ramp) so a grounded tail can't hide under a serviceable one.
    const spread = declutterPoints(plottedList.map(p => ({ xPct: p.xPct, yPct: p.yPct })));
    plottedList.forEach((p, i) => {
      p.xPct = spread[i].xPct;
      p.yPct = spread[i].yPct;
    });

    return {
      plotted: plottedList,
      unplotted: missing,
      homeTick: home ? projectToBox({ lat: home.lat, lon: home.lon }, bounds) : undefined,
    };
  }, [fleet, homeBase]);

  // Draw RED last so a grounded aircraft always sits on top of any overlap.
  const RENDER_ORDER: Record<string, number> = { GREEN: 0, AMBER: 1, RED: 2 };
  const drawOrder = [...plotted].sort(
    (a, b) => (RENDER_ORDER[a.status] ?? 0) - (RENDER_ORDER[b.status] ?? 0)
  );

  return (
    <div
      className={`relative overflow-hidden rounded-lg border border-border bg-muted/30 ${className}`}
      role="img"
      aria-label={`Fleet position schematic showing ${plotted.length} aircraft`}
    >
      {/* Graticule — orientation only, not a basemap. */}
      <div className="pointer-events-none absolute inset-x-0 top-1/2 h-px bg-border/70" />
      <div className="pointer-events-none absolute inset-y-0 left-1/2 w-px bg-border/70" />

      {/* Legs drawn under the dots. preserveAspectRatio=none lets 0-100 units map
          straight onto the box in both axes. */}
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {plotted
          .filter(p => p.legTo)
          .map(p => (
            <line
              key={`leg-${p.tail}`}
              x1={p.xPct}
              y1={p.yPct}
              x2={p.legTo!.xPct}
              y2={p.legTo!.yPct}
              stroke="currentColor"
              className="text-primary/60"
              strokeWidth={1.5}
              strokeDasharray="3 3"
              vectorEffect="non-scaling-stroke"
            />
          ))}
      </svg>

      <span className="absolute left-3 top-2.5 text-xs text-muted-foreground">
        Live fleet · interim schematic
      </span>

      {homeTick && (
        <span
          className="absolute -translate-x-1/2 translate-y-1 text-[11px] text-muted-foreground/80"
          style={{ left: `${homeTick.xPct}%`, top: `${homeTick.yPct}%` }}
        >
          {homeBase}
        </span>
      )}

      {drawOrder.map(p => (
        <div
          key={p.tail}
          className="absolute flex -translate-x-1/2 -translate-y-1/2 items-center gap-1"
          style={{ left: `${p.xPct}%`, top: `${p.yPct}%` }}
          title={`${p.tail} — ${p.status}${p.inFlight ? ' — in flight' : ''}`}
        >
          {p.inFlight ? (
            <Plane
              className="h-4 w-4"
              style={{
                color: RAG_DOT[p.status] ?? 'var(--gfo-info, #0096FC)',
                transform: `rotate(${p.headingDeg - 45}deg)`,
              }}
            />
          ) : (
            <span
              className="h-2.5 w-2.5 rounded-full ring-2 ring-background"
              style={{ background: RAG_DOT[p.status] ?? 'var(--muted-foreground)' }}
            />
          )}
          <span className="whitespace-nowrap font-mono text-[11px] text-muted-foreground">
            {p.tail}
          </span>
        </div>
      ))}

      <span className="absolute bottom-2 right-3 text-[11px] text-muted-foreground/80">
        {unplotted.length > 0
          ? `${unplotted.length} not locatable · schematic`
          : 'schematic · real map drops in here'}
      </span>
    </div>
  );
}
