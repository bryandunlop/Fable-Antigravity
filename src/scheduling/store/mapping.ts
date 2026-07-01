import type { TripContext } from '../engine';
import type { TripRecord } from './types';

export function toTripContext(trip: TripRecord): TripContext {
  const legs = trip.legs.slice().sort((a, b) => a.sequence - b.sequence);
  const earliest = legs.reduce<typeof legs[number] | undefined>((min, l) => {
    if (!min) return l;
    return new Date(l.departureTimeUtc).getTime() < new Date(min.departureTimeUtc).getTime() ? l : min;
  }, undefined);
  const etdUtc = earliest ? earliest.departureTimeUtc : trip.startDate;
  const maxPaxCount = legs.reduce((m, l) => Math.max(m, l.paxCount), 0);
  const dow = new Date(etdUtc).getUTCDay(); // 0=Sun..6=Sat (UTC — see spec DST caveat)
  const routeIcaos = Array.from(
    new Set(legs.flatMap((l) => [l.departureIcao, l.arrivalIcao]).map((i) => i.toUpperCase())),
  );
  return {
    tripId: trip.id,
    tripType: trip.tripType,
    tail: trip.tail,
    aircraftType: trip.aircraftType,
    etdUtc,
    maxPaxCount,
    isWeekendDeparture: dow === 0 || dow === 6,
    routeIcaos,
  };
}
