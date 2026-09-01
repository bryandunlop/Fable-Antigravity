// How many people fit, and on how many aeroplanes.
//
// She says how many people are travelling and whether it is an overnight ocean crossing.
// She never picks a type and never picks a tail — the type appears as a fact after
// scheduling assigns one. This table is the whole of what "seats, not types" means.
//
// Bryan, 2026-09-01:
//
//   | Cabin    | Aircraft                | Domestic | Ocean — day | Ocean — overnight |
//   | Big      | G650ER, and the G800    | 12       | 8           | 4                 |
//   | Standard | G500                    | 10       | 8           | 4                 |
//
// The ocean columns are identical on every aeroplane because out there the limit is
// BEDS, not seats — and the berths are for PASSENGERS, not crew rest (Part 91 imposes
// no crew rest on GFO). The cabin only matters domestically.

import { CORE_FLEET, type Cabin } from './registry';

export type MissionProfile = 'domestic' | 'ocean-day' | 'ocean-overnight';

export const CAPACITY: Record<Cabin, Record<MissionProfile, number>> = {
  big: { domestic: 12, 'ocean-day': 8, 'ocean-overnight': 4 },
  standard: { domestic: 10, 'ocean-day': 8, 'ocean-overnight': 4 },
};

export const seatsFor = (cabin: Cabin, profile: MissionProfile): number => CAPACITY[cabin][profile];

/** The most anyone can carry on ONE aeroplane for this profile, across the whole fleet. */
export const bestSingleAircraftCapacity = (profile: MissionProfile): number =>
  Math.max(...CORE_FLEET.map(a => seatsFor(a.cabin, profile)));

export interface FitOption {
  /** How many aircraft this option uses. */
  aircraft: number;
  profile: MissionProfile;
  seats: number;
  /** Plain English, for her — never a type or a tail. */
  line: string;
}

export interface Fit {
  seats: number;
  profile: MissionProfile;
  fitsOnOne: boolean;
  /** Minimum aircraft needed at this profile, ignoring whether they are free. */
  aircraftNeeded: number;
  /**
   * The consequence worth putting on screen. Six people sleeping does not fit any single
   * aeroplane, so the real trade is "eight in daylight on one, or six sleeping on two" —
   * and an EA who is only told "does not fit" will phone scheduling to be told the same
   * thing more slowly.
   */
  alternatives: FitOption[];
}

const DAY_PROFILE: Record<MissionProfile, MissionProfile> = {
  domestic: 'domestic',
  'ocean-day': 'ocean-day',
  'ocean-overnight': 'ocean-day',
};

/**
 * Greedy fill across the fleet's biggest cabins first — how many aeroplanes this many
 * people actually needs. Deliberately capacity-only: whether those aeroplanes are FREE is
 * the availability engine's question, and answering both here would let one become stale
 * behind the other.
 */
export function aircraftNeeded(seats: number, profile: MissionProfile): number {
  if (seats <= 0) return 0;
  const sizes = CORE_FLEET.map(a => seatsFor(a.cabin, profile)).sort((a, b) => b - a);
  let left = seats;
  let used = 0;
  for (const size of sizes) {
    if (left <= 0) break;
    left -= size;
    used += 1;
  }
  // More people than the whole fleet can carry: say how many aeroplane-loads it would be,
  // rather than silently capping at four and implying it fits.
  if (left > 0) used += Math.ceil(left / sizes[sizes.length - 1]);
  return used;
}

export function fitFor(seats: number, profile: MissionProfile): Fit {
  const needed = aircraftNeeded(seats, profile);
  const alternatives: FitOption[] = [];

  if (needed > 1 && profile === 'ocean-overnight') {
    const dayProfile = DAY_PROFILE[profile];
    const dayCap = bestSingleAircraftCapacity(dayProfile);
    if (seats <= dayCap) {
      alternatives.push({
        aircraft: 1,
        profile: dayProfile,
        seats: dayCap,
        line: `${seats} in daylight on one aircraft (up to ${dayCap})`,
      });
    }
    alternatives.push({
      aircraft: needed,
      profile,
      seats,
      line: `${seats} sleeping across ${needed} aircraft`,
    });
  }

  return {
    seats,
    profile,
    fitsOnOne: needed <= 1,
    aircraftNeeded: needed,
    alternatives,
  };
}

export const profileLabel = (p: MissionProfile): string =>
  p === 'domestic' ? 'Domestic' : p === 'ocean-day' ? 'Ocean crossing — daytime' : 'Ocean crossing — overnight';
