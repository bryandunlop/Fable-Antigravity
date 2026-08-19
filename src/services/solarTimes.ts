/**
 * Sunrise / sunset for a station, from the NOAA solar-position equations.
 *
 * Written rather than pulled in as a dependency: it is ~50 lines of arithmetic
 * with no network and no data file, and the app already refuses third-party
 * requests on the dashboard path (see WeatherForecast's icon note).
 *
 * DISPLAY ONLY. Nothing regulatory hangs on these — they are the flight-ops
 * courtesy line ("when does it get dark"), not a legal night definition. Civil
 * twilight, night currency (§61.57(b)) and the 14 CFR 1.1 definition of night
 * are all DIFFERENT boundaries; do not reuse this to decide any of them without
 * a ruling. Times returned are the standard −0.833° geometric horizon
 * (refraction + solar radius), which is what "sunrise" means colloquially.
 */

export interface SolarTimes {
  /** UTC ISO instant, or null in polar day/night. */
  sunriseUtc: string | null;
  sunsetUtc: string | null;
  /** True when the sun never sets on the requested day (polar day). */
  alwaysUp: boolean;
  /** True when the sun never rises (polar night). */
  alwaysDown: boolean;
}

const RAD = Math.PI / 180;
const HORIZON_DEG = -0.833; // refraction + solar semidiameter
const J1970 = 2440588;
const J2000 = 2451545;

const toJulian = (date: Date) => date.valueOf() / 86_400_000 - 0.5 + J1970;
const fromJulian = (j: number) => new Date((j + 0.5 - J1970) * 86_400_000);

/** Solar mean anomaly for days since J2000. */
const solarMeanAnomaly = (d: number) => RAD * (357.5291 + 0.98560028 * d);

/** Ecliptic longitude, including the equation of centre and perihelion. */
function eclipticLongitude(M: number): number {
  const C = RAD * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M));
  const P = RAD * 102.9372;
  return M + C + P + Math.PI;
}

const declination = (L: number) => Math.asin(Math.sin(RAD * 23.4397) * Math.sin(L));

/**
 * Sunrise and sunset for the calendar day the given instant falls in, at the
 * given station. `on` is interpreted in UTC — pass a midday instant so the
 * result lands on the day you meant.
 */
export function solarTimesFor(lat: number, lon: number, on: Date): SolarTimes {
  const lw = RAD * -lon;
  const phi = RAD * lat;

  // Days since J2000 for solar noon at this longitude.
  const d = Math.round(toJulian(on) - J2000 - 0.0009 - lw / (2 * Math.PI));
  const n = d + 0.0009 + lw / (2 * Math.PI);

  const M = solarMeanAnomaly(n);
  const L = eclipticLongitude(M);
  const dec = declination(L);

  // Solar transit (local noon) as a Julian day.
  const jTransit = J2000 + n + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * L);

  // Hour angle at the horizon. |cos| > 1 means the sun never crosses it.
  const cosH =
    (Math.sin(RAD * HORIZON_DEG) - Math.sin(phi) * Math.sin(dec)) / (Math.cos(phi) * Math.cos(dec));

  if (cosH > 1) {
    return { sunriseUtc: null, sunsetUtc: null, alwaysUp: false, alwaysDown: true };
  }
  if (cosH < -1) {
    return { sunriseUtc: null, sunsetUtc: null, alwaysUp: true, alwaysDown: false };
  }

  const H = Math.acos(cosH) / (2 * Math.PI);
  const jSet = J2000 + (n + H) + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * L);
  const jRise = jTransit - (jSet - jTransit);

  return {
    sunriseUtc: fromJulian(jRise).toISOString(),
    sunsetUtc: fromJulian(jSet).toISOString(),
    alwaysUp: false,
    alwaysDown: false,
  };
}
