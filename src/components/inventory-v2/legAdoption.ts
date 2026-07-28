// Turns a resolved myairops leg into an inventory v2 trip (D53, option B).
//
// The result is a MIRROR, not an original: it carries sourceSystem / sourceTripRef /
// sourceLegRef so a second tap finds the existing trip instead of creating a twin, and
// so a later merge onto one trip spine has its join key. Pull-only — nothing here
// builds anything headed back toward myairops.
//
// ICAO codes pass through unchanged. Truncating KLUK -> LUK to match the older mock
// legs happens to work for US K-prefixed idents and produces nonsense for EGGW, so the
// cosmetic inconsistency is accepted over a wrong transform.

import type { ResolvedLeg, LegResolutionKind } from '../../integration/myairops/legResolver';
import type { TripRecord } from '../../scheduling/store/types';
import type { Trip, TripLeg, LegPhase } from './types';

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;

/** How the active leg sits when we adopt it. Just-landed stays open so reconciliation can run. */
const PHASE_BY_KIND: Record<LegResolutionKind, LegPhase> = {
  in_flight: 'in_flight',
  just_landed: 'on_ground',
  next_departure: 'pre_flight',
};

/** The reference adoption is idempotent on. */
function tripRef(record: TripRecord): string {
  return record.sourceTripRef ?? record.tripNumber;
}

/** An already-adopted trip for this myairops record, if one exists. */
export function findAdoptedTrip(trips: Trip[], record: TripRecord): Trip | undefined {
  const ref = tripRef(record);
  return trips.find(t => t.sourceSystem === 'myairops' && t.sourceTripRef === ref);
}

export interface AdoptOptions {
  /** From our own fleet reference data, keyed by tail — NOT from the myairops record. */
  aircraftType: 'G650' | 'G500';
  createdBy: string;
  nowIso: string;
}

/** Mirrors the whole myairops trip, with the resolved leg made active. */
export function adoptMyairopsTrip(resolved: ResolvedLeg, opts: AdoptOptions): Trip {
  const { trip: record, leg: resolvedLeg, kind } = resolved;
  const tripId = record.id;

  // The resolved leg always comes from this record, so -1 is unreachable; falling back to
  // the first leg keeps a bad caller off a crash path rather than throwing inside a render.
  const activeIndex = Math.max(0, record.legs.findIndex(l => l.id === resolvedLeg.id));

  const legs: TripLeg[] = record.legs.map((l, i) => ({
    id: l.id,
    tripId,
    legNumber: l.sequence,
    origin: l.departureIcao,
    destination: l.arrivalIcao,
    date: l.departureTimeUtc.slice(0, 10),
    paxCount: l.paxCount,
    sourceLegRef: l.id,
    status: i === activeIndex ? 'active' : i < activeIndex ? 'completed' : 'upcoming',
    phase: i === activeIndex ? PHASE_BY_KIND[kind] : i < activeIndex ? 'complete' : 'pre_flight',
    usageLog: [],
    notes: [],
  }));

  return {
    id: tripId,
    tailNumber: record.tail,
    aircraftType: opts.aircraftType,
    tripName: record.tripNumber,
    tripNumber: record.tripNumber,
    sourceSystem: 'myairops',
    sourceTripRef: tripRef(record),
    status: 'active',
    startDate: record.startDate.slice(0, 10),
    legs,
    notes: [],
    loadItems: [],
    returnItems: [],
    createdBy: opts.createdBy,
    createdAt: opts.nowIso,
  };
}

function formatOffset(ms: number): string {
  const minutes = Math.round(ms / MINUTE_MS);
  return minutes < 60 ? `${minutes}m` : `${Math.round(ms / HOUR_MS)}h`;
}

/** Zulu, straight off the ISO string — no locale, no invented airport timezone. */
function zulu(iso: string): string {
  return `${iso.slice(11, 16)}Z`;
}

export function formatLegRoute(resolved: ResolvedLeg): string {
  return `${resolved.leg.departureIcao} → ${resolved.leg.arrivalIcao}`;
}

/**
 * How the resolution reads on screen. The relative age is the point: this is a
 * SCHEDULED time, so the user has to be able to see at a glance when it is stale
 * (D53 hinge assumption).
 */
export function formatLegTiming(resolved: ResolvedLeg): string {
  const { kind, leg, offsetMs } = resolved;
  if (kind === 'in_flight') return 'in flight';
  if (kind === 'just_landed') {
    return `landed ${zulu(leg.arrivalTimeUtc ?? leg.departureTimeUtc)} · ${formatOffset(offsetMs)} ago`;
  }
  return `departs ${zulu(leg.departureTimeUtc)} · in ${formatOffset(offsetMs)}`;
}

/** Route + timing, the form an inspection snapshots into `legLabel`. */
export function describeResolvedLeg(resolved: ResolvedLeg): string {
  return `${formatLegRoute(resolved)} · ${formatLegTiming(resolved)}`;
}
