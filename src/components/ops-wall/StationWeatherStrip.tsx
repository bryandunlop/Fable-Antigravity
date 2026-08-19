import React, { useCallback, useEffect, useState } from 'react';
import { Home, PlaneLanding } from 'lucide-react';
import {
  fetchWeather,
  formatWind,
  formatVisibility,
  type WeatherResult,
} from '../../services/aviationWeatherService';
import { conditionFromMetar } from '../../services/weatherConditions';
import { WeatherIcon } from '../ui/WeatherIcons';
import SunTimesChip from './SunTimesChip';

/** METARs update roughly hourly; match WeatherWidget's cadence. */
const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

interface StationWeatherStripProps {
  /** Home station first, then the stations today's flights actually touch. */
  stations: string[];
  className?: string;
}

/**
 * Weather for the stations in play, not just the home field.
 *
 * Flight category is rendered as plain text rather than the conventional
 * green/blue/red: this wall already spends green/amber/red on RAG airworthiness,
 * and one screen cannot have two meanings for green. `flightCategoryBadgeClass`
 * stays available if that call is ever reversed.
 */
export default function StationWeatherStrip({
  stations,
  className = '',
}: StationWeatherStripProps) {
  const [results, setResults] = useState<Record<string, WeatherResult>>({});
  const [loading, setLoading] = useState(true);

  const key = stations.join(',');

  const load = useCallback(async () => {
    const list = key ? key.split(',') : [];
    const settled = await Promise.all(
      list.map(async station => [station, await fetchWeather(station)] as const)
    );
    setResults(Object.fromEntries(settled));
    setLoading(false);
  }, [key]);

  useEffect(() => {
    load();
    const interval = setInterval(load, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [load]);

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Weather</span>

      {loading && stations.length > 0 && (
        <span className="text-[11px] text-muted-foreground">loading…</span>
      )}

      {stations.map((station, index) => {
        const result = results[station];
        const metar = result?.metar;
        const Icon = index === 0 ? Home : PlaneLanding;

        return (
          <span
            key={station}
            className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-2.5 py-1 text-[11px]"
          >
            <Icon className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
            <span className="font-mono text-foreground/90">{station}</span>

            {metar ? (
              <>
                {/* Same glyph vocabulary as the outlook below, so one row of
                    weather does not speak two visual languages. Decorative:
                    every value it sits beside is still written out. */}
                <WeatherIcon condition={conditionFromMetar(metar)} size={16} title={metar.wxString} />
                <span className="text-muted-foreground">{formatWind(metar)}</span>
                <span className="text-muted-foreground">{formatVisibility(metar.visib)}</span>
                <span className="text-muted-foreground/80">{metar.fltcat}</span>
              </>
            ) : (
              !loading && <span className="text-muted-foreground/70">no report</span>
            )}

            {/* Demo data must never render as if it were a live observation. */}
            {result?.isDemo && (
              <span
                className="rounded bg-muted px-1 text-[10px] uppercase text-muted-foreground"
                title={result.demoReason ?? 'Seeded demo weather, not a live observation'}
              >
                demo
              </span>
            )}
          </span>
        );
      })}

      {stations[0] && <SunTimesChip station={stations[0]} />}
    </div>
  );
}
