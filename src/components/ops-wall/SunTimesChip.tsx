import React from 'react';
import { Sunrise, Sunset } from 'lucide-react';
import { solarTimesFor } from '../../services/solarTimes';
import { lookupAirport } from '../../services/airportCoords';
import { zoneForAirport } from '../../services/airportZone';

/**
 * Sunrise / sunset for a station, in that station's own local time.
 *
 * Local-to-the-field is the only reading that means anything here — "dark at
 * KPBI" is a fact about Florida, not about the operator's Eastern reference
 * zone. That makes this deliberately DIFFERENT from the D24 regulatory clock
 * beside it, which is anchored to one zone on purpose; the zone abbreviation is
 * printed so the two can never be confused.
 *
 * Courtesy information, not a legal boundary: 14 CFR 1.1 night, §61.57(b)
 * currency and civil twilight are all different lines. See solarTimes.ts.
 */

function inZone(iso: string, zone: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', hour12: false, timeZone: zone,
  });
}

function zoneAbbrev(iso: string, zone: string): string {
  return (
    new Intl.DateTimeFormat('en-US', { timeZone: zone, timeZoneName: 'short' })
      .formatToParts(new Date(iso))
      .find(p => p.type === 'timeZoneName')?.value ?? ''
  );
}

export default function SunTimesChip({
  station,
  now = new Date(),
  className = '',
}: {
  station: string;
  now?: Date;
  className?: string;
}) {
  const field = lookupAirport(station);
  const zone = zoneForAirport(station);
  if (!field || !zone) return null;

  // Midday at the field, so the day the sun times describe is the field's day.
  const noonish = new Date(now);
  noonish.setUTCHours(17, 0, 0, 0);
  const sun = solarTimesFor(field.lat, field.lon, noonish);
  if (!sun.sunriseUtc || !sun.sunsetUtc) return null;

  const label = zoneAbbrev(sun.sunsetUtc, zone);

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-md border border-border bg-card px-2.5 py-1 text-[11px] ${className}`}
      title={`Sunrise and sunset at ${field.name}, local field time`}
    >
      <Sunrise className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
      <span className="font-mono text-foreground/90">{inZone(sun.sunriseUtc, zone)}</span>
      <Sunset className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
      <span className="font-mono text-foreground/90">{inZone(sun.sunsetUtc, zone)}</span>
      <span className="text-muted-foreground/80">{label}</span>
    </span>
  );
}
