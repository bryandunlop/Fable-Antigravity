import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { UnifiedFleetAircraft } from '../hooks/useUnifiedFleetStatus';
import { HOME_STATION } from '../../config/station';
import { lookupAirport } from '../../services/airportCoords';
import { resolveAircraftPoint, type GeoPoint } from '../../services/fleetGeo';

const RAG_HEX: Record<string, string> = { GREEN: '#00B140', AMBER: '#F1B434', RED: '#EF3340' };

// CARTO basemaps — no key, light/dark variants so the map follows the app theme.
const TILES = {
  light: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
  dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
};
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

interface FleetLiveMapProps {
  fleet: UnifiedFleetAircraft[];
  homeBase?: string;
  className?: string;
  /** 'dark' pins the basemap dark regardless of app theme — for the fixed-palette TV walls (D88). */
  theme?: 'auto' | 'dark';
}

interface Plotted {
  tail: string;
  status: string;
  point: GeoPoint;
  inFlight: boolean;
  heading: number;
  location?: string;
  dest?: GeoPoint;
}

const isDark = () => document.documentElement.classList.contains('dark');
const STATUS_RANK: Record<string, number> = { GREEN: 0, AMBER: 1, RED: 2 };

/** Group aircraft that resolve to the same coordinate (e.g. tails parked at one base). */
function groupColocated(points: Plotted[]): Plotted[][] {
  const groups = new Map<string, Plotted[]>();
  for (const p of points) {
    const key = `${p.point.lat.toFixed(3)}:${p.point.lon.toFixed(3)}`;
    const g = groups.get(key);
    if (g) g.push(p);
    else groups.set(key, [p]);
  }
  return [...groups.values()];
}

/** Fan a co-located group out around its shared point so each is separately visible. */
function fanGroup(members: Plotted[]): Plotted[] {
  if (members.length < 2) return members;
  const radius = 0.5; // degrees
  return members.map((p, k) => {
    const angle = -Math.PI / 2 + (k / members.length) * 2 * Math.PI;
    return {
      ...p,
      point: {
        lat: p.point.lat + radius * Math.sin(angle),
        lon: p.point.lon + radius * Math.cos(angle),
      },
    };
  });
}

/** The most severe RAG status in a group (RED > AMBER > GREEN). */
function worstStatus(members: Plotted[]): string {
  return members.reduce(
    (worst, p) => ((STATUS_RANK[p.status] ?? 0) > (STATUS_RANK[worst] ?? 0) ? p.status : worst),
    'GREEN'
  );
}

/** A cluster badge: count, ringed by the worst RAG so a grounded tail can't hide inside. */
function clusterHtml(members: Plotted[]): string {
  const color = RAG_HEX[worstStatus(members)] ?? '#7c7c7c';
  const hint = (members[0].location ?? '').split(/[\s-]/)[0] || '';
  const label = hint
    ? `<span style="background:var(--background,#fff);color:var(--foreground,#111);border:1px solid var(--border,#ddd);border-radius:4px;padding:0 4px;font:500 10px ui-monospace,monospace;white-space:nowrap;">${hint}</span>`
    : '';
  return (
    `<div style="display:flex;align-items:center;gap:4px;cursor:pointer">` +
    `<span style="display:flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:50%;background:var(--background,#fff);border:2px solid ${color};color:var(--foreground,#111);font:600 11px ui-sans-serif,system-ui;box-shadow:0 0 0 1px rgba(0,0,0,.12)">${members.length}</span>` +
    label +
    `</div>`
  );
}

function markerHtml(p: Plotted): string {
  const color = RAG_HEX[p.status] ?? '#7c7c7c';
  const label = `<span style="background:var(--background,#fff);color:var(--foreground,#111);border:1px solid var(--border,#ddd);border-radius:4px;padding:0 4px;font:500 10px ui-monospace,monospace;white-space:nowrap;">${p.tail}</span>`;
  const glyph = p.inFlight
    ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="${color}" style="transform:rotate(${p.heading - 45}deg);filter:drop-shadow(0 0 1px rgba(0,0,0,.4))"><path d="M21 16v-2l-8-5V3.5A1.5 1.5 0 0 0 11.5 2 1.5 1.5 0 0 0 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z"/></svg>`
    : `<span style="display:block;width:12px;height:12px;border-radius:50%;background:${color};box-shadow:0 0 0 2px var(--background,#fff)"></span>`;
  return `<div style="display:flex;align-items:center;gap:4px">${glyph}${label}</div>`;
}

/**
 * The live fleet map. Plots every tail from the shared resolver (satcom position
 * -> airport fallback) on a real basemap, draws in-flight legs, and fits the view
 * to wherever the aircraft actually are — so it scales itself as the fleet moves.
 */
export default function FleetLiveMap({ fleet, homeBase = HOME_STATION, className = '', theme = 'auto' }: FleetLiveMapProps) {
  const dark = () => theme === 'dark' || isDark();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileRef = useRef<L.TileLayer | null>(null);
  const overlayRef = useRef<L.LayerGroup | null>(null);
  const didFitRef = useRef(false);

  // Init once.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      zoomControl: true,
      attributionControl: true,
      worldCopyJump: true,
      // The app's global CSS interferes with Leaflet's tile opacity transition,
      // leaving loaded tiles stuck at opacity 0 (blank map). Disabling the fade
      // makes tiles paint fully opaque on load.
      fadeAnimation: false,
    }).setView([39.1, -84.4], 5);

    const tile = L.tileLayer(dark() ? TILES.dark : TILES.light, {
      attribution: TILE_ATTRIBUTION,
      maxZoom: 12,
    }).addTo(map);

    const overlay = L.layerGroup().addTo(map);

    mapRef.current = map;
    tileRef.current = tile;
    overlayRef.current = overlay;

    // Swap the basemap when the app theme flips.
    const observer = new MutationObserver(() => {
      if (!mapRef.current || !tileRef.current) return;
      tileRef.current.setUrl(dark() ? TILES.dark : TILES.light);
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    // Re-measure (only) on size change so the basemap re-tiles to fill the panel.
    // Deliberately NO re-fit here: fitBounds lives in the fleet effect, and running
    // it at several transient sizes during mount leaves stale tiles at a mismatched
    // zoom. invalidateSize keeps the current view and just repaints the tiles.
    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize({ animate: false });
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      observer.disconnect();
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
      tileRef.current = null;
      overlayRef.current = null;
    };
  }, []);

  // Redraw markers + legs whenever the fleet changes; refit to the aircraft.
  useEffect(() => {
    const map = mapRef.current;
    const overlay = overlayRef.current;
    if (!map || !overlay) return;

    // The fleet populates ~500ms after mount (satcom fetch), by which point the
    // panel has its final size — re-measure so fitBounds tiles the whole width.
    map.invalidateSize({ animate: false });

    const plotted: Plotted[] = [];
    for (const ac of fleet) {
      const resolved = resolveAircraftPoint({
        tailNumber: ac.tailNumber,
        position: ac.position
          ? { latitude: ac.position.latitude, longitude: ac.position.longitude }
          : undefined,
        fallbackAirports: [ac.position?.arrivalAirport, ac.position?.departureAirport, homeBase],
      });
      if (!resolved.point) continue;

      const inFlight = ac.flightStatus === 'in-flight';
      const destAirport = inFlight ? lookupAirport(ac.position?.arrivalAirport) : undefined;

      plotted.push({
        tail: ac.tailNumber,
        status: ac.airworthiness.status,
        point: resolved.point,
        inFlight,
        heading: ac.position?.heading ?? 0,
        location: ac.location,
        dest: destAirport ? { lat: destAirport.lat, lon: destAirport.lon } : undefined,
      });
    }

    const groups = groupColocated(plotted);
    // Below this zoom a co-located group is one badge; at or above it, the
    // group's fan is wide enough to read, so show the individuals.
    const CLUSTER_ZOOM = 7;

    // Redraw for the current zoom. Runs on fleet change and on every zoomend, so
    // clusters collapse when you zoom out and expand when you zoom in.
    const draw = () => {
      overlay.clearLayers();
      const zoom = map.getZoom();
      const individuals: Plotted[] = [];

      for (const group of groups) {
        if (group.length > 1 && zoom < CLUSTER_ZOOM) {
          const center = group[0].point;
          L.marker([center.lat, center.lon], {
            icon: L.divIcon({
              html: clusterHtml(group),
              className: 'fleet-cluster',
              iconSize: [0, 0],
              iconAnchor: [11, 11],
            }),
            keyboard: false,
          })
            .bindTooltip(group.map(p => `${p.tail} · ${p.status}`).join('<br>'), {
              direction: 'top',
              offset: [0, -10],
            })
            .on('click', () => map.setView([center.lat, center.lon], CLUSTER_ZOOM))
            .addTo(overlay);
        } else if (group.length > 1) {
          individuals.push(...fanGroup(group));
        } else {
          individuals.push(group[0]);
        }
      }

      // RED last so a grounded tail sits on top of any residual overlap.
      individuals.sort((a, b) => (STATUS_RANK[a.status] ?? 0) - (STATUS_RANK[b.status] ?? 0));
      for (const p of individuals) {
        const latlng: L.LatLngExpression = [p.point.lat, p.point.lon];
        if (p.inFlight && p.dest) {
          L.polyline([latlng, [p.dest.lat, p.dest.lon]], {
            color: RAG_HEX[p.status] ?? '#888',
            weight: 1.5,
            opacity: 0.5,
            dashArray: '4 4',
          }).addTo(overlay);
        }
        L.marker(latlng, {
          icon: L.divIcon({
            html: markerHtml(p),
            className: 'fleet-marker',
            iconSize: [0, 0],
            iconAnchor: [6, 6],
          }),
          keyboard: false,
        })
          .bindTooltip(`${p.tail} · ${p.status}${p.location ? ` · ${p.location}` : ''}`, {
            direction: 'top',
            offset: [0, -6],
          })
          .addTo(overlay);
      }
    };

    draw();
    map.on('zoomend', draw);

    // Frame the fleet to its TRUE positions ONCE, on first load — then leave the
    // view alone. Position refreshes (~30s) redraw markers but must not re-fit, or
    // they'd yank a zoomed-in user straight back to the overview.
    if (!didFitRef.current) {
      const truePoints = plotted.map(p => [p.point.lat, p.point.lon] as L.LatLngExpression);
      if (truePoints.length > 1) {
        map.fitBounds(L.latLngBounds(truePoints).pad(0.25), { maxZoom: 7 });
        didFitRef.current = true;
      } else if (truePoints.length === 1) {
        map.setView(truePoints[0], 6);
        didFitRef.current = true;
      }
    }

    return () => {
      map.off('zoomend', draw);
    };
  }, [fleet, homeBase]);

  return (
    <div
      ref={containerRef}
      className={`overflow-hidden rounded-lg border border-border ${className}`}
      role="region"
      aria-label="Live fleet map"
    />
  );
}
