import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Plane } from 'lucide-react';
import { useUnifiedFleetStatus } from './hooks/useUnifiedFleetStatus';
import { FirLeadershipChip } from './fir/components/FirLeadershipChip';
import DailyFlightsWidget from './DailyFlightsWidget';
import DutyRosterWidget from './DutyRosterWidget';
import FleetMapPanel from './ops-wall/FleetMapPanel';
import NasImpactTile from './ops-wall/NasImpactTile';
import StationWeatherStrip from './ops-wall/StationWeatherStrip';
import WeatherForecast from './WeatherForecast';
import { HOME_STATION } from '../config/station';
import QuickLinksBar from './ops-wall/QuickLinksBar';
import { lookupAirport } from '../services/airportCoords';
import { RAG_DOT } from './ops-wall/ragColors';

/** Stations shown alongside home. Kept short so the strip stays one line. */
const MAX_DESTINATION_STATIONS = 3;

function greeting(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/** UTC alongside Eastern — the operator reference zone the MEL clock is anchored to (D24). */
function useOpsClock(): string {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(interval);
  }, []);

  const utc = now.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  });
  const eastern = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'America/New_York',
  });

  return `${utc}Z · ${eastern} ET`;
}

/**
 * The fleet ops wall — the home screen.
 *
 * Replaces the previous 2x2 card grid. The organising idea is a live picture
 * first: where the fleet is and whether it is airworthy, with the day's
 * operational context supporting it rather than competing with it.
 *
 * The map area is deliberately a first-class region. It currently renders an
 * interim schematic; the Leaflet view at /fleet-map is the intended occupant.
 */
export default function FleetOpsWall({ userRole }: { userRole: string }) {
  const { fleet, dispatchable, inFlight, satcomLoading, isRefreshing } = useUnifiedFleetStatus();
  const clock = useOpsClock();

  // Weather follows the aircraft: home field plus wherever the fleet is heading.
  // Satcom reports IATA, so codes are normalised to ICAO before any weather fetch.
  const stations = useMemo(() => {
    const destinations = fleet
      .map(ac => lookupAirport(ac.position?.arrivalAirport)?.icao)
      .filter((icao): icao is string => Boolean(icao) && icao !== HOME_STATION);

    return [HOME_STATION, ...Array.from(new Set(destinations)).slice(0, MAX_DESTINATION_STATIONS)];
  }, [fleet]);

  const grounded = fleet.filter(ac => ac.airworthiness.status === 'RED').length;

  return (
    <div className="mx-auto max-w-[1600px] space-y-4 p-6">
      {/* Utility bar */}
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <h1 className="text-xl font-medium">{greeting(new Date().getHours())}</h1>
          <span className="font-mono text-xs text-muted-foreground">{clock}</span>
        </div>
        <FirLeadershipChip roles={[userRole]} />
      </header>

      {/* ONE weather panel: the METAR strip and the 7-day outlook share a
          container so they read as a single unit.
          
          D30's chosen option was the "unified METAR/TAF/outlook panel", NOT the
          sibling-block option it explicitly rejected — and WeatherForecast opens
          with its own `border-t`, a divider drawn to continue a card. Mounted as
          a bare sibling that divider was orphaned, which was the visible tell
          that the containment was wrong even though the adjacency was right.

          The outlook stays behind WeatherForecast's advisory framing, which is
          the mitigation D30 rests on, NOT decoration — this is NWS *public*
          forecast data next to official aviation products. [[Q14]] (owner: DOM)
          is still OPEN on whether that adjacency is acceptable at all; per D30's
          hinge a ruling against moves this to a planning surface, and provider,
          parser, route and cache all survive. Only the mount point moves. */}
      <section className="rounded-lg border border-border bg-card p-3" aria-label="Weather">
        <StationWeatherStrip stations={stations} />
        <WeatherForecast icaoId={HOME_STATION} />
      </section>

      {/* Fleet rail + map */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(190px,220px)_minmax(0,1fr)]">
        <section
          className="rounded-lg border border-border bg-card p-3"
          aria-label="Fleet status"
        >
          <div className="mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-sm font-medium">
              Fleet
              {(satcomLoading || isRefreshing) && (
                <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
              )}
            </span>
            <Link to="/aircraft" className="text-[11px] text-muted-foreground hover:text-foreground">
              {fleet.length} tails
            </Link>
          </div>

          <ul className="space-y-1.5">
            {fleet.map(ac => (
              <li key={ac.tailNumber} className="flex items-center gap-2 text-xs">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ background: RAG_DOT[ac.airworthiness.status] ?? 'var(--muted-foreground)' }}
                  aria-label={ac.airworthiness.status}
                />
                <span className="font-mono text-foreground/90">{ac.tailNumber}</span>
                <span className="text-muted-foreground">{ac.airworthiness.type}</span>
                <span className="ml-auto truncate text-[11px] text-muted-foreground">
                  {ac.flightStatus === 'in-flight' ? (
                    <Plane className="h-3 w-3 text-primary" aria-label="In flight" />
                  ) : (
                    ac.location ?? '—'
                  )}
                </span>
              </li>
            ))}
          </ul>

          <p className="mt-2 border-t border-border pt-2 text-[11px] text-muted-foreground">
            {dispatchable} dispatchable · {inFlight} in flight
            {grounded > 0 && ` · ${grounded} grounded`}
          </p>
        </section>

        <FleetMapPanel fleet={fleet} homeBase={HOME_STATION} className="min-h-[300px]" />
      </div>

      {/* Dock */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <section className="rounded-lg border border-border bg-card p-3">
          <DailyFlightsWidget />
        </section>
        <NasImpactTile />
        <section className="rounded-lg border border-border bg-card p-3">
          <DutyRosterWidget />
        </section>
      </div>

      <QuickLinksBar userRole={userRole} />
    </div>
  );
}
