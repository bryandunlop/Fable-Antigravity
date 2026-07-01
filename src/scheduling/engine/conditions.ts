import type { Condition, TripContext } from './types';
import { countryForIcao } from './geo';

export function evaluateCondition(cond: Condition, trip: TripContext): boolean {
  switch (cond.kind) {
    case 'always': return true;
    case 'tripType': return trip.tripType === cond.equals;
    case 'paxCountAtLeast': return trip.maxPaxCount >= cond.value;
    case 'tailEquals': return trip.tail === cond.value;
    case 'aircraftTypeEquals': return trip.aircraftType === cond.value;
    case 'isWeekendDeparture': return trip.isWeekendDeparture;
    case 'routeTouchesCountry': return trip.routeIcaos.some((i) => countryForIcao(i) === cond.country);
    case 'routeTouchesIcaoPrefix': return trip.routeIcaos.some((i) => i.toUpperCase().startsWith(cond.prefix));
    case 'allOf': return cond.conditions.every((c) => evaluateCondition(c, trip));
    case 'anyOf': return cond.conditions.some((c) => evaluateCondition(c, trip));
    case 'not': return !evaluateCondition(cond.condition, trip);
    default: {
      const _exhaustive: never = cond;
      throw new Error(`Unknown condition kind: ${String((cond as { kind?: unknown }).kind)}`);
    }
  }
}
