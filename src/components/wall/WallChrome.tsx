import React, { useEffect, useState } from 'react';

/**
 * Shared shell for the hangar TV walls (D88) — /wall/ops and /wall/maintenance.
 *
 * Fixed dark GFO palette regardless of app theme (it's a TV): explicit Midnight
 * hex on the wall's own chrome, plus the `dark` class on the root so embedded
 * token-based components (StationWeatherStrip, the Leaflet map's label chips)
 * resolve their CSS variables dark instead of painting light-on-dark.
 *
 * Read-only by design: no nav, no interactive controls. D87's /scheduling-wall
 * is the sibling display; if a third wall appears, its chrome belongs here too.
 */

export interface WallClockNow {
  zulu: string;
  eastern: string;
  dateLabel: string;
  /** Minutes since midnight in America/New_York — drives the NOW line. */
  etMinutes: number;
}

export function readWallClock(now: Date): WallClockNow {
  const zulu = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
  const eastern = now.toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/New_York',
  });
  const dateLabel = now.toLocaleDateString('en-US', {
    weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/New_York',
  });
  const [h, m] = eastern.split(':').map(Number);
  return { zulu, eastern, dateLabel, etMinutes: h * 60 + m };
}

export function useWallClock(): WallClockNow {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(interval);
  }, []);
  return readWallClock(now);
}

interface WallChromeProps {
  title: string;
  clock: WallClockNow;
  /** Rendered beside the title — e.g. the clear-day chip. */
  headerExtra?: React.ReactNode;
  children: React.ReactNode;
}

export default function WallChrome({ title, clock, headerExtra, children }: WallChromeProps) {
  return (
    <div
      className="dark flex min-h-screen flex-col gap-6 bg-[#0D1F5C] px-10 py-8 text-white"
      style={{ fontFamily: "'Montserrat', 'Segoe UI', system-ui, sans-serif" }}
    >
      <header className="flex items-baseline justify-between">
        <div className="flex flex-wrap items-baseline gap-5">
          <h1 className="text-3xl font-light tracking-wide">{title}</h1>
          <span className="text-sm text-white/55">{clock.dateLabel}</span>
          {headerExtra}
        </div>
        <div className="flex items-baseline gap-5 font-mono tabular-nums">
          <span className="text-4xl font-semibold">
            {clock.zulu}
            <span className="text-lg text-[#7FCCFE]">Z</span>
          </span>
          <span className="text-xl text-white/70">{clock.eastern} ET</span>
        </div>
      </header>
      {children}
    </div>
  );
}
