// What kind of flying this is — which is what decides how many people fit.
//
// TWO different questions used to be answered by one regex, `!/^K[A-Z]{3}$/`:
//
//   1. Does this need customs and APIS? (drives the manifest lockout: 24 h vs 72 h)
//   2. Is this an ocean crossing where people sleep? (drives capacity — beds, not seats)
//
// Conflating them is wrong in both directions. KLAX → PHNL is DOMESTIC (Hawaii is a US
// state, no customs) but is five hours over the Pacific with people asleep, so the old
// test read a Pacific crossing as international-and-not-ocean at once — the sleeping rule
// would never have fired on the trip it exists for.
//
// The system SUGGESTS and never decides. What makes a crossing "overnight" — departure
// time, arrival time, or hours in the air — is an open question with Bryan (EA Booking
// Hub build plan, 2026-09-01), so every suggestion carries the rule that fired and she
// can override it.

import type { MissionProfile } from '../../../fleet/capacity';
import { lookupAirport } from '../../../services/airportCoords';

export type { MissionProfile };

/**
 * US customs territory for the purposes of "do we need APIS". K = contiguous, PA = Alaska,
 * PH = Hawaii.
 *
 * Puerto Rico (TJ), the US Virgin Islands (TI) and Guam (PG) are US soil but have their
 * own agricultural/customs handling and are DELIBERATELY not listed: guessing them would
 * put a manifest on the wrong lockout. Flag, don't assume — see `needsCustoms`.
 */
const US_PREFIXES = ['K', 'PA', 'PH'];
/** US soil, but whether a given flight there clears customs is not ours to assume. */
const US_TERRITORY_PREFIXES = ['TJ', 'TI', 'PG'];

const startsWithAny = (icao: string, prefixes: string[]): boolean =>
  prefixes.some(p => icao.toUpperCase().startsWith(p));

export const isUsPoint = (icao: string): boolean => startsWithAny(icao, US_PREFIXES);
export const isUsTerritoryPoint = (icao: string): boolean => startsWithAny(icao, US_TERRITORY_PREFIXES);

export interface CustomsVerdict {
  needsCustoms: boolean;
  /** True when a US territory is involved and the answer is a question, not a fact. */
  uncertain: boolean;
}

/** Does any leg cross a customs border? Uncertain when a US territory is involved. */
export function needsCustoms(legs: { from: string; to: string }[]): CustomsVerdict {
  let uncertain = false;
  let needs = false;
  for (const leg of legs) {
    for (const point of [leg.from, leg.to]) {
      if (isUsTerritoryPoint(point)) uncertain = true;
      else if (!isUsPoint(point)) needs = true;
    }
  }
  return { needsCustoms: needs, uncertain };
}

const R_NM = 3440.065;
const rad = (d: number) => (d * Math.PI) / 180;

/** Great-circle distance in nautical miles. Null when either airport is unknown to us. */
export function distanceNm(from: string, to: string): number | null {
  const a = lookupAirport(from);
  const b = lookupAirport(to);
  if (!a || !b) return null;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R_NM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Landmass groups, by ICAO prefix. A leg between two groups crosses water; a leg inside
 * one does not. This is the honest version of "is it an ocean crossing" — KMIA → SBGR is
 * long but not a water crossing, KLAX → PHNL is short-ish and entirely water.
 */
const GROUPS: { group: string; prefixes: string[] }[] = [
  { group: 'north-america', prefixes: ['K', 'C', 'M', 'PA'] },
  { group: 'pacific', prefixes: ['PH', 'PG', 'PK', 'PT', 'NZ', 'NF', 'YB', 'YM', 'YP', 'YS', 'Y'] },
  { group: 'caribbean', prefixes: ['T', 'MY', 'MU'] },
  { group: 'south-america', prefixes: ['S'] },
  { group: 'europe', prefixes: ['E', 'L', 'B', 'U'] },
  { group: 'africa', prefixes: ['F', 'H', 'D', 'G'] },
  { group: 'asia', prefixes: ['R', 'V', 'Z', 'W', 'O'] },
];

export function landmassGroup(icao: string): string | null {
  const up = icao.toUpperCase();
  // Longest prefix wins, so PA (Alaska, North America) beats P (Pacific).
  const hit = GROUPS.flatMap(g => g.prefixes.map(p => ({ group: g.group, p })))
    .filter(x => up.startsWith(x.p))
    .sort((a, b) => b.p.length - a.p.length)[0];
  return hit?.group ?? null;
}

/** True when a leg's two ends sit on different landmasses — i.e. it is flown over water. */
export function isWaterCrossing(from: string, to: string): boolean {
  const a = landmassGroup(from);
  const b = landmassGroup(to);
  if (!a || !b) return false;
  if (a === b) return false;
  // North America ↔ South America is continuous land; nobody sleeps in a berth to reach it.
  const pair = [a, b].sort().join('|');
  return pair !== 'north-america|south-america';
}

/** Beyond this the aeroplane is over water long enough that beds are the constraint. */
export const OCEAN_MIN_NM = 1800;
/** A departure at or after this local hour suggests people intend to sleep on board. */
export const EVENING_HOUR = 18;

export interface ProfileSuggestion {
  profile: MissionProfile;
  /** The rule that fired, so the suggestion can be argued with rather than obeyed. */
  why: string;
  /**
   * False when the "overnight" half rests on the departure-hour rule, which is still an
   * open question. The UI must let her change it, and should say the system is guessing.
   */
  settled: boolean;
}

export interface ProfileLeg {
  from: string;
  to: string;
  departLocal?: string;
}

/**
 * Suggest a mission profile from the route and the departure time. Never authoritative:
 * `settled` is false whenever the overnight call came from the clock.
 */
export function suggestProfile(legs: ProfileLeg[]): ProfileSuggestion {
  if (legs.length === 0) return { profile: 'domestic', why: 'No legs yet', settled: true };

  const oceanLeg = legs.find(l => {
    if (isWaterCrossing(l.from, l.to)) return true;
    const nm = distanceNm(l.from, l.to);
    return nm !== null && nm >= OCEAN_MIN_NM;
  });

  if (!oceanLeg) {
    return { profile: 'domestic', why: 'Every leg stays on one landmass', settled: true };
  }

  const hour = Number((oceanLeg.departLocal ?? '').slice(0, 2));
  const evening = Number.isFinite(hour) && hour >= EVENING_HOUR;

  return evening
    ? {
        profile: 'ocean-overnight',
        why: `Ocean crossing departing ${oceanLeg.departLocal} — people will sleep on board`,
        // The clock decided this, and what makes a crossing "overnight" is not settled.
        settled: false,
      }
    : {
        profile: 'ocean-day',
        why: `Ocean crossing departing ${oceanLeg.departLocal ?? 'in the day'}`,
        settled: false,
      };
}
