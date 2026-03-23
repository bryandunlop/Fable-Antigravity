import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Clock, AlertCircle, RefreshCw } from 'lucide-react';
import { RadarSpinner } from './ui/LoadingSpinners';
import {
  fetchWeather,
  formatWind,
  formatVisibility,
  formatTempDew,
  formatAltimeter,
  obsTimeLabel,
  flightCategoryBadgeClass,
  type WeatherResult,
} from '../services/aviationWeatherService';

/** How often to auto-refresh weather data, in seconds. METARs update ~hourly. */
const REFRESH_INTERVAL_SEC = 300; // 5 minutes

interface WeatherWidgetProps {
  /** ICAO airport identifier to display weather for. Defaults to KLUK. */
  icaoId?: string;
}

export default function WeatherWidget({ icaoId = 'KLUK' }: WeatherWidgetProps) {
  const [weather, setWeather] = useState<WeatherResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [nextRefreshIn, setNextRefreshIn] = useState(REFRESH_INTERVAL_SEC);

  const load = useCallback(async () => {
    setIsLoading(true);
    const result = await fetchWeather(icaoId);
    setWeather(result);
    setIsLoading(false);
    setNextRefreshIn(REFRESH_INTERVAL_SEC);
  }, [icaoId]);

  // Initial load + reload when icaoId changes
  useEffect(() => {
    load();
  }, [load]);

  // Auto-refresh countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setNextRefreshIn(prev => {
        if (prev <= 1) {
          load();
          return REFRESH_INTERVAL_SEC;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [load]);

  const metar = weather?.metar;
  const taf = weather?.taf;
  const hasError = !!weather?.error;

  // Truncate raw TAF for compact display
  const shortTaf = taf?.rawTAF
    ? taf.rawTAF.replace(/\n/g, ' ').slice(0, 80) + (taf.rawTAF.length > 80 ? '…' : '')
    : null;

  return (
    <Card className="mb-6 border-none shadow-sm bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm relative overflow-hidden">
      <CardContent className="p-4 flex items-center justify-between min-h-[88px]">

        {/* ── Loading ── */}
        {isLoading && (
          <div className="w-full flex items-center justify-center gap-3 text-muted-foreground animate-fade-in">
            <RadarSpinner size={32} />
            <span className="text-sm font-medium">Scanning Weather Systems...</span>
          </div>
        )}

        {/* ── Error ── */}
        {!isLoading && hasError && (
          <div className="w-full flex items-center justify-between animate-fade-in">
            <div className="flex items-center gap-3 text-destructive">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium">Weather Unavailable</p>
                <p className="text-xs text-muted-foreground">{weather?.error}</p>
              </div>
            </div>
            <button
              onClick={load}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Retry
            </button>
          </div>
        )}

        {/* ── Live data ── */}
        {!isLoading && !hasError && metar && (
          <div className="w-full flex items-center justify-between animate-fade-in">

            {/* Left: identity + obs time */}
            <div className="flex items-center gap-4">
              {/* Weather icon (cloud colour reflects flight category) */}
              <div className="relative w-12 h-12 flex-shrink-0 animate-[pulse-subtle_4s_ease-in-out_infinite]">
                <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-md">
                  <circle cx="32" cy="24" r="14" fill="#fbbf24" />
                  <path d="M32 4L32 8M32 40L32 44M52 24L48 24M16 24L12 24M46.1421 9.85786L43.3137 12.6863M20.6863 35.3137L17.8579 38.1421M46.1421 38.1421L43.3137 35.3137M20.6863 12.6863L17.8579 9.85786"
                    stroke="#fbbf24" strokeWidth="3" strokeLinecap="round" />
                  <path d="M44 48H20C15.5817 48 12 44.4183 12 40C12 35.5817 15.5817 32 20 32C20.6548 32 21.2885 32.083 21.8953 32.2384C23.6358 27.536 28.3262 24 34 24C40.6274 24 46 29.3726 46 36C46 36.6342 45.95 37.2568 45.854 37.8633C49.3361 38.4552 52 41.5031 52 45.1429C52 49.4821 48.4183 53 44 53"
                    fill="currentColor" className="text-white dark:text-slate-200 drop-shadow-sm" />
                </svg>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge
                    variant="outline"
                    className={`text-sm py-0.5 px-2 ${flightCategoryBadgeClass(metar.fltcat)}`}
                  >
                    {metar.icaoId}
                  </Badge>
                  <div className="font-semibold text-lg leading-none">{metar.name}</div>
                  <Badge variant="outline" className={`text-xs py-0.5 px-1.5 ${flightCategoryBadgeClass(metar.fltcat)}`}>
                    {metar.fltcat}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-2">
                  <Clock className="w-3 h-3" />
                  <span>{obsTimeLabel(metar.obsTime)}</span>
                  <span className="text-border">·</span>
                  <span>Refreshes in {nextRefreshIn}s</span>
                  <button
                    onClick={load}
                    className="hover:text-foreground transition-colors ml-0.5"
                    aria-label="Refresh weather"
                  >
                    <RefreshCw className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>

            {/* Right: METAR + TAF + key values */}
            <div className="flex flex-col gap-2 text-sm max-w-[55%]">
              {/* Raw METAR */}
              <div className="flex gap-3 items-start">
                <div className="text-muted-foreground font-medium self-center min-w-[44px]">METAR</div>
                <div className="font-mono bg-background/50 p-2 rounded border border-border/50 text-foreground/90 text-xs leading-relaxed">
                  {metar.rawOb}
                </div>
              </div>

              {/* Quick decoded values */}
              <div className="flex gap-4 text-xs text-muted-foreground pl-[56px]">
                <span title="Wind">{formatWind(metar)}</span>
                <span className="text-border">·</span>
                <span title="Visibility">{formatVisibility(metar.visib)}</span>
                <span className="text-border">·</span>
                <span title="Temp / Dewpoint">{formatTempDew(metar)}</span>
                <span className="text-border">·</span>
                <span title="Altimeter">{formatAltimeter(metar)}</span>
              </div>

              {/* Raw TAF (truncated) */}
              {shortTaf && (
                <div className="flex gap-3 items-start">
                  <div className="text-muted-foreground font-medium self-center min-w-[44px]">TAF</div>
                  <div className="font-mono bg-background/50 p-2 rounded border border-border/50 text-foreground/90 text-xs leading-relaxed">
                    {shortTaf}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── No data (valid response but airport not found) ── */}
        {!isLoading && !hasError && !metar && (
          <div className="w-full flex items-center justify-between text-muted-foreground animate-fade-in">
            <span className="text-sm">No weather data for {icaoId}</span>
            <button onClick={load} className="flex items-center gap-1.5 text-xs hover:text-foreground transition-colors">
              <RefreshCw className="w-3.5 h-3.5" />
              Retry
            </button>
          </div>
        )}

      </CardContent>
    </Card>
  );
}
