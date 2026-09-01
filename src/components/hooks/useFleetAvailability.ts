// The React seam onto src/availability — one hook, one audience decision.
//
// Deliberately thin: it reads the scheduling store's trips, picks the audience from the viewer's
// roles, and hands both to source.ts. The audience decision lives HERE rather than in each page
// so no surface can accidentally render the operator view to an executive.

import { useEffect, useMemo, useState } from 'react';
import type { TripRecord } from '../../scheduling/store/types';
import type { Audience } from '../../availability/types';
import {
  readDisclosedAvailability,
  readFleetAvailability,
  readReleaseSuggestions,
  type DisclosedAvailability,
} from '../../availability/source';
import { canSeeFullSchedule } from '../booking-portal/BookingPortalContext';
import { useSchedulingWorkspace } from '../scheduling-workspace/SchedulingWorkspaceContext';
import { tailDayStats, firstAvailableSlot } from '../../availability/engine/availability';
import type { FleetAvailability, ReleaseSuggestion } from '../../availability/types';

const OPERATOR_ROLES = ['scheduling', 'admin', 'lead'];

/** An executive with the per-person grant sees the schedule; operators see everything. */
export function audienceFor(userRole?: string, additionalRoles: string[] = []): Audience {
  const roles = [userRole, ...additionalRoles].filter((r): r is string => !!r);
  if (roles.some(r => OPERATOR_ROLES.includes(r))) return 'operator';
  return canSeeFullSchedule(userRole, additionalRoles) ? 'executive-full' : 'executive';
}

function useTrips(): TripRecord[] {
  const { store, ready, tick } = useSchedulingWorkspace();
  const [trips, setTrips] = useState<TripRecord[]>([]);
  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    store.listTrips().then(rows => { if (!cancelled) setTrips(rows); });
    return () => { cancelled = true; };
  }, [store, ready, tick]);
  return trips;
}

export interface UseFleetAvailability {
  availability: DisclosedAvailability;
  audience: Audience;
  stats: { openTailDays: number; totalTailDays: number };
  nextOpen: { tail: string; dateUtc: string } | null;
  nowUtc: string;
  trips: TripRecord[];
}

export function useFleetAvailability(
  userRole?: string,
  additionalRoles: string[] = [],
  days = 14,
): UseFleetAvailability {
  const { nowUtc } = useSchedulingWorkspace();
  const trips = useTrips();
  const now = nowUtc();
  const audience = useMemo(
    () => audienceFor(userRole, additionalRoles),
    [userRole, additionalRoles],
  );

  // The raw fleet drives the summary numbers; only the disclosed view reaches the page, so a
  // component cannot reach past the boundary even by accident.
  const fleet: FleetAvailability = useMemo(
    () => readFleetAvailability({ trips }, now, days),
    [trips, now, days],
  );

  return {
    availability: useMemo(() => readDisclosedAvailability({ trips }, audience, now, days), [trips, audience, now, days]),
    audience,
    stats: useMemo(() => tailDayStats(fleet), [fleet]),
    nextOpen: useMemo(() => firstAvailableSlot(fleet), [fleet]),
    nowUtc: now,
    trips,
  };
}

/** Scheduling's suggestion inbox. Operator surfaces only. */
export function useReleaseSuggestions(days = 14): { suggestions: ReleaseSuggestion[]; nowUtc: string } {
  const { nowUtc } = useSchedulingWorkspace();
  const trips = useTrips();
  const now = nowUtc();
  return {
    suggestions: useMemo(() => readReleaseSuggestions({ trips }, now, days), [trips, now, days]),
    nowUtc: now,
  };
}
