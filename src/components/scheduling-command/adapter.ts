import type { TripRecord, TripLegRecord } from '../../scheduling/store/types';
import type { TaskInstance, TaskStatus, AckState, OwnerRole } from '../../scheduling/engine';
import { deriveSchedulingReadiness } from '../../scheduling/engine';

// Pure projection of the production scheduling store (TripRecord + TaskInstance) into the
// view-model the command-center boards render. Readiness/blockers are DERIVED from real task
// state via the engine — never stored, never faked.

const DAY_MS = 86400000;

export interface BoardTask {
  id: string; // TaskInstance id — the applyAction key
  title: string;
  category: string;
  order: number;
  status: TaskStatus;
  ownerRole: OwnerRole;
  dueAtUtc: string;
  requiresAck: boolean;
  ackState: AckState;
  notes?: string;
}

export interface BoardTrip {
  id: string;
  tripNumber: string;
  client: string; // derived label until the myairops client field arrives (Phase 2)
  aircraft: string; // tail
  aircraftType: string;
  route: string;
  departureDate: string; // earliest leg departure (fallback: startDate)
  /** The last leg's arrival (fallback: endDate). The board packs and draws by this, not by whole days — a 21:00 departure does not occupy tomorrow. */
  arrivalDate?: string;
  durationDays: number;
  readinessScore: number; // engine completion × 100
  criticalBlocker?: string; // blocked task title (+ note)
  isInternational: boolean;
  tripType: TripRecord['tripType'];
  priority: TripRecord['priority'];
  tripStatus: TripRecord['status'];
  /** The crew row under the tail (D110 slice 3); undefined on records that never carried one. */
  crew?: TripRecord['crew'];
  /** Card line 1 (LG-396): the lead's name and how many are aboard at most. */
  lead?: string;
  aboard?: number;
  tasks: BoardTask[];
}

export function routeOf(legs: TripLegRecord[]): string {
  const sorted = [...legs].sort((a, b) => a.sequence - b.sequence);
  const stops: string[] = [];
  for (const l of sorted) {
    if (stops[stops.length - 1] !== l.departureIcao) stops.push(l.departureIcao);
    stops.push(l.arrivalIcao);
  }
  return stops.join(' → ');
}

export function clientLabelOf(trip: Pick<TripRecord, 'tripType' | 'priority'>): string {
  const type = trip.tripType === 'dca_dassp' ? 'DCA / DASSP'
    : trip.tripType.charAt(0).toUpperCase() + trip.tripType.slice(1);
  return trip.priority === 'vip' ? `VIP · ${type}` : type;
}

export function toBoardTask(x: TaskInstance): BoardTask {
  return {
    id: x.id, title: x.title, category: x.category, order: x.order,
    status: x.status, ownerRole: x.ownerRole, dueAtUtc: x.dueAtUtc,
    requiresAck: x.requiresAck, ackState: x.ackState, notes: x.notes,
  };
}

/** When the aircraft is back on the ground for good: the latest arrival across the legs, else the record's end. */
export function arrivalOf(trip: Pick<TripRecord, 'legs' | 'endDate'>): string {
  let latest = 0;
  for (const l of trip.legs) {
    const t = Date.parse(l.arrivalTimeUtc ?? l.departureTimeUtc);
    if (t > latest) latest = t;
  }
  return latest ? new Date(latest).toISOString() : trip.endDate;
}

export function boardTripOf(trip: TripRecord, instances: TaskInstance[]): BoardTrip {
  const readiness = deriveSchedulingReadiness(instances);
  const blocked = readiness.blocker ? instances.find(i => i.id === readiness.blocker) : undefined;
  const departureDate = trip.legs.length
    ? [...trip.legs].sort((a, b) => a.departureTimeUtc.localeCompare(b.departureTimeUtc))[0].departureTimeUtc
    : trip.startDate;
  const durationDays = Math.max(
    1,
    Math.ceil((new Date(trip.endDate).getTime() - new Date(trip.startDate).getTime()) / DAY_MS),
  );
  return {
    id: trip.id,
    tripNumber: trip.tripNumber,
    client: clientLabelOf(trip),
    aircraft: trip.tail,
    aircraftType: trip.aircraftType,
    route: routeOf(trip.legs),
    lead: trip.lead,
    aboard: trip.legs.reduce((m, l) => Math.max(m, l.paxCount), 0),
    departureDate,
    durationDays,
    arrivalDate: arrivalOf(trip),
    readinessScore: Math.round(readiness.completion * 100),
    criticalBlocker: blocked ? (blocked.notes ? `${blocked.title} — ${blocked.notes}` : blocked.title) : undefined,
    isInternational: trip.tripType === 'international',
    tripType: trip.tripType,
    priority: trip.priority,
    tripStatus: trip.status,
    tasks: instances.map(toBoardTask).sort((a, b) => a.order - b.order),
  };
}
