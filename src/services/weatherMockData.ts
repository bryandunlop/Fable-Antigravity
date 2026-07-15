/**
 * Demo weather seed.
 *
 * This is the design/demo build, and today the weather panel renders an error in
 * every environment we can actually show it in: local dev serves no /api at all
 * (Vite has no proxy; the SPA fallback returns index.html with a 200, so the
 * JSON parse throws — gap TL-15), and production 500s because a wildcard
 * middleware injects the DB into DB-free routes with DATABASE_URL unset
 * (TL-18). This seed is what the panel falls back to.
 *
 * TWO RULES GOVERN THIS FILE.
 *
 * 1. It must never be mistaken for an observation. Fabricated weather that
 *    reads as real is the one genuinely dangerous thing in an otherwise
 *    cosmetic feature — a demo METAR saying VFR while the real field is IFR is
 *    exactly the confusion this product exists to prevent. Every surface that
 *    renders it carries a DEMO marker, and `isDemo` rides on the result object
 *    so no caller can render it without having been told. Do not add a code
 *    path that returns this data with isDemo unset.
 *
 * 2. It emits raw NWS/AWC shapes, not condition tokens. The icon still comes
 *    out of conditionFromMetar/conditionFromForecastPeriod exactly as it does
 *    for live data, so the demo exercises the real mapping rather than routing
 *    around it. If the mapper breaks, the demo breaks — which is the point.
 *
 * Everything is derived from `referenceNowMs` so the observation always reads
 * fresh and the outlook always starts today, matching the getSeedState pattern
 * in src/components/fir/mockData.ts.
 */

import type { MetarData, TafData } from './aviationWeatherService';
import type { ForecastPeriod } from './nwsForecastService';

/** KLUK — Cincinnati Municipal / Lunken Field, the home station. */
const DEMO_STATION = {
  name: 'Cincinnati Muni/Lunken Fld',
  lat: 39.1033,
  lon: -84.4186,
};

/**
 * The most recent routine observation time at or before `nowMs`.
 * METARs are issued a few minutes before the hour (:53 is the usual slot), so
 * the demo obs sits where a real one would rather than exactly on the hour.
 */
function lastObservationMs(nowMs: number): number {
  const d = new Date(nowMs);
  d.setUTCMinutes(53, 0, 0);
  return d.getTime() > nowMs ? d.getTime() - 3_600_000 : d.getTime();
}

/** METAR day-hour-minute group, e.g. 151453Z. */
function metarTimeGroup(ms: number): string {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getUTCDate())}${p(d.getUTCHours())}${p(d.getUTCMinutes())}Z`;
}

/** Local midnight-anchored day offset, so "Today" is today at the viewer. */
function dayStart(ms: number, offsetDays: number): Date {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offsetDays);
  return d;
}

/**
 * A plausible mid-continent summer week, not a sampler of the icon set.
 *
 * The temptation is to parade one of every glyph; that would make the demo look
 * like a component gallery instead of a dashboard. This is what a real week at
 * KLUK looks like — a front arriving midweek — and it happens to exercise
 * partly / storm / rain / cloudy / clear / wind honestly.
 *
 * Text is phrased the way NWS phrases it, because conditionFromShortForecast
 * has to read it for real.
 */
const DEMO_WEEK: Array<Omit<ForecastPeriod, 'number' | 'name' | 'startTime' | 'icon'>> = [
  { tempC: 29, windKt: 8,  windDirection: 'SW', shortForecast: 'Mostly Sunny',                      detailedForecast: 'Mostly sunny, with a high near 29°C. Southwest wind around 8 knots.', precipProbability: 5 },
  { tempC: 31, windKt: 10, windDirection: 'SW', shortForecast: 'Partly Cloudy',                     detailedForecast: 'Partly cloudy, with a high near 31°C. Southwest wind around 10 knots.', precipProbability: 15 },
  { tempC: 30, windKt: 14, windDirection: 'S',  shortForecast: 'Chance Showers And Thunderstorms',  detailedForecast: 'A chance of showers and thunderstorms after 2pm. Partly sunny, with a high near 30°C. South wind around 14 knots, with gusts as high as 22 knots.', precipProbability: 55 },
  { tempC: 26, windKt: 12, windDirection: 'W',  shortForecast: 'Showers Likely',                    detailedForecast: 'Showers likely, mainly before 2pm. Mostly cloudy, with a high near 26°C. West wind around 12 knots.', precipProbability: 70 },
  { tempC: 27, windKt: 9,  windDirection: 'NW', shortForecast: 'Mostly Cloudy',                     detailedForecast: 'Mostly cloudy, with a high near 27°C. Northwest wind around 9 knots.', precipProbability: 20 },
  { tempC: 30, windKt: 7,  windDirection: 'N',  shortForecast: 'Sunny',                             detailedForecast: 'Sunny, with a high near 30°C. North wind around 7 knots.', precipProbability: 5 },
  { tempC: 32, windKt: 22, windDirection: 'SW', shortForecast: 'Sunny and Breezy',                  detailedForecast: 'Sunny and breezy, with a high near 32°C. Southwest wind 18 to 22 knots.', precipProbability: 0 },
];

/**
 * Demo observation. FEW045/SCT070 with 10SM and no ceiling → VFR, and
 * conditionFromMetar reads the SCT layer as `partly`, agreeing with the
 * "Mostly Sunny" text on the outlook's first column.
 */
export function getDemoMetar(icaoId: string, referenceNowMs: number = Date.now()): MetarData {
  const obsMs = lastObservationMs(referenceNowMs);
  return {
    rawOb: `${icaoId} ${metarTimeGroup(obsMs)} 24008KT 10SM FEW045 SCT070 29/19 A3005`,
    icaoId,
    name: DEMO_STATION.name,
    obsTime: new Date(obsMs).toISOString(),
    wdir: 240,
    wspd: 8,
    visib: 10,
    temp: 29,
    dewp: 19,
    altim: 30.05,
    fltcat: 'VFR',
    clouds: [
      { cover: 'FEW', base: 4500 },
      { cover: 'SCT', base: 7000 },
    ],
    lat: DEMO_STATION.lat,
    lon: DEMO_STATION.lon,
  };
}

export function getDemoTaf(icaoId: string, referenceNowMs: number = Date.now()): TafData {
  const issue = lastObservationMs(referenceNowMs) - 1_800_000;
  const from = new Date(issue);
  const to = new Date(issue + 24 * 3_600_000);
  const p = (n: number) => String(n).padStart(2, '0');
  const grp = (d: Date) => `${p(d.getUTCDate())}${p(d.getUTCHours())}`;
  return {
    rawTAF:
      `${icaoId} ${metarTimeGroup(issue)} ${grp(from)}/${grp(to)} 24008KT P6SM FEW045 SCT070 ` +
      `FM${grp(new Date(issue + 6 * 3_600_000))}00 26012G18KT P6SM SCT050 BKN090`,
    icaoId,
    issueTime: from.toISOString(),
    validTimeFrom: from.toISOString(),
    validTimeTo: to.toISOString(),
  };
}

/**
 * Demo outlook. `icon` is deliberately empty — we no longer hotlink NWS's
 * deprecated icon endpoint, and the seed has no business inventing a URL that
 * would resolve to a real image on someone else's server.
 */
export function getDemoForecast(referenceNowMs: number = Date.now()): ForecastPeriod[] {
  return DEMO_WEEK.map((day, i) => {
    const start = dayStart(referenceNowMs, i);
    return {
      ...day,
      number: i + 1,
      name: i === 0 ? 'Today' : start.toLocaleDateString('en-US', { weekday: 'long' }),
      startTime: start.toISOString(),
      icon: '',
    };
  });
}
