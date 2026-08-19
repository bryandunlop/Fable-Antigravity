import React, { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useUnifiedFleetStatus } from './hooks/useUnifiedFleetStatus';
import { FirLeadershipChip } from './fir/components/FirLeadershipChip';
import DailyFlightsWidget from './DailyFlightsWidget';
import TailStatusCards from './ops-wall/TailStatusCards';
import DutyRosterWidget from './DutyRosterWidget';
import NasImpactTile from './ops-wall/NasImpactTile';
import StationWeatherStrip from './ops-wall/StationWeatherStrip';
import WeatherForecast from './WeatherForecast';
import { HOME_STATION } from '../config/station';
import QuickLinksBar from './ops-wall/QuickLinksBar';
import { lookupAirport } from '../services/airportCoords';
import { TODAY_LEGS } from '../services/todaysOpsMock';

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
 * The fleet ops wall — the everyday landing page (D88).
 *
 * The organising idea is airworthiness first: a per-tail status rail answers
 * "who can fly, and why not" before anything else, with the day's operational
 * context (weather, flights, NAS, duty) supporting it.
 *
 * D88 REVERSED the earlier "map is a first-class region" ruling: the aircraft
 * map is not critical for the everyday user and moved to the maintenance TV
 * wall (/wall/maintenance). Other roles reach it on demand — the fixed Fleet
 * map tile in QuickLinksBar links /fleet-map.
 */
export default function FleetOpsWall({ userRole }: { userRole: string }) {
  const { fleet, dispatchable, inFlight, satcomLoading, isRefreshing, lastUpdate } = useUnifiedFleetStatus();
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
          {(satcomLoading || isRefreshing) && (
            <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" aria-label="Refreshing" />
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs text-muted-foreground">
            {dispatchable} of {fleet.length} dispatchable · {inFlight} in flight
            {grounded > 0 && <span className="font-semibold text-[#EF3340]"> · {grounded} grounded</span>}
          </span>
          {/* Phase 1 serviceability is fresh-on-sync (D14), not pushed — so the page
              must say WHEN this picture was taken. Without it an iPad left open all
              morning looks exactly like one that just refreshed. */}
          <span className="font-mono text-[11px] text-muted-foreground/70">
            Updated {lastUpdate.toLocaleTimeString('en-US', {
              hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/New_York',
            })} ET
          </span>
          <FirLeadershipChip roles={[userRole]} />
        </div>
      </header>

      {/* Per-tail status rail — D88, the page's lead. Cards from sm up; a compact
          status list on phones. Each links to /aircraft. */}
      <TailStatusCards fleet={fleet} legs={TODAY_LEGS} />

      {/* ONE weather panel: the METAR strip and the outlook share a
          container so they read as a single unit. 5 days per D88 (was 7) —
          Bryan 2026-08-19, "could probably actually do 5 days to save space".
          
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
        <WeatherForecast icaoId={HOME_STATION} maxDays={5} />
      </section>

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
