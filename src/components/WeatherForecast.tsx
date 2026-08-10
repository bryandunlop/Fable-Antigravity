import React, { useState, useEffect, useCallback } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { fetchForecast, type ForecastResult } from '../services/nwsForecastService';
import { conditionFromForecastPeriod } from '../services/weatherConditions';
import { WeatherIcon } from './ui/WeatherIcons';
import { WeatherDemoChip } from './WeatherDemoChip';

interface WeatherForecastProps {
  /** ICAO identifier. Pass explicitly — see src/config/station.ts. */
  icaoId: string;
}

/**
 * 7-day planning outlook.
 *
 * NOT AVIATION WEATHER. Sourced from the NWS public forecast because the
 * Aviation Weather Center publishes nothing past ~30h. The advisory label is
 * a deliberate mitigation, not decoration — it sits directly beneath METAR/TAF,
 * which ARE official products, and the two must not be confused. DOM ruling on
 * the adjacency is pending (vault Q14); D30 elected to label and ship.
 *
 * The column glyph used to be <img src={period.icon}> — a hotlink to
 * api.weather.gov/icons, which is a deprecated NWS endpoint and a third-party
 * request on every dashboard load. It now renders locally from a condition
 * token derived off the forecast text, so the glyph and the tooltip can't
 * contradict each other. See weatherConditions.ts.
 */
export default function WeatherForecast({ icaoId }: WeatherForecastProps) {
  const [result, setResult] = useState<ForecastResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    setResult(await fetchForecast(icaoId));
    setIsLoading(false);
  }, [icaoId]);

  useEffect(() => {
    load();
  }, [load]);

  const periods = result?.periods ?? [];
  const hasError = !!result?.error;

  return (
    <div className="border-t border-border/50 pt-3 mt-3">
      <div className="flex items-baseline justify-between mb-2">
        <div className="flex items-baseline gap-2">
          <div className="text-muted-foreground font-medium text-xs">7-DAY OUTLOOK</div>
          {/* Sits BESIDE the Q14 advisory rather than replacing it — they say
              different things ("this isn't aviation weather" vs "this isn't
              real weather") and the outlook can be demo while the METAR above
              is live, or vice versa. */}
          {result?.isDemo && <WeatherDemoChip reason={result.demoReason} />}
        </div>
        {/* The mitigation on file for Q14 — do not remove without a DOM ruling.
            It was 10px, italic, at 70% opacity: the LEAST legible text in a
            component whose whole compliance posture rests on it, and fainter than
            every data value it qualifies. A control cannot mitigate what nobody
            reads. Now 11px, upright, full muted-foreground — still quiet, because
            it is advisory rather than a warning, but actually readable. */}
        <div className="text-[11px] font-medium text-muted-foreground">
          Planning outlook — not for flight planning
        </div>
      </div>

      {isLoading && (
        <div className="text-xs text-muted-foreground py-2 animate-fade-in">
          Loading outlook…
        </div>
      )}

      {!isLoading && hasError && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground py-2 animate-fade-in">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>{result?.error}</span>
          <button
            onClick={load}
            className="flex items-center gap-1 hover:text-foreground transition-colors"
            aria-label="Retry forecast"
          >
            <RefreshCw className="w-3 h-3" />
            Retry
          </button>
        </div>
      )}

      {!isLoading && !hasError && periods.length === 0 && (
        <div className="text-xs text-muted-foreground py-2 animate-fade-in">
          No outlook available for {icaoId}
        </div>
      )}

      {!isLoading && !hasError && periods.length > 0 && (
        <div className="flex gap-1 animate-fade-in">
          {periods.map(p => (
            <div
              key={p.number}
              className="flex-1 min-w-0 flex flex-col items-center gap-0.5 rounded bg-background/50 border border-border/50 p-1.5"
              title={p.detailedForecast || p.shortForecast}
            >
              <div className="text-[10px] text-muted-foreground truncate w-full text-center">
                {p.name}
              </div>
              <WeatherIcon
                condition={conditionFromForecastPeriod(p)}
                size={28}
                title={p.shortForecast}
              />
              {/* Daytime periods only (parseForecast filters isDaytime), so the
                  glyph is always the day variant — isDay defaults true. */}
              <div className="text-xs font-medium text-foreground/90">
                {p.tempC != null ? `${p.tempC}°C` : '—'}
              </div>
              {/* Knots, converted at the parse boundary — never render NWS mph
                  next to the METAR's knots. */}
              <div className="text-[10px] text-muted-foreground">
                {p.windKt != null ? `${p.windKt} kt` : '—'}
              </div>
              <div className="text-[10px] text-muted-foreground/80">
                {p.precipProbability}%
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
