// Pure passenger/flight helpers. No React / no storage — unit-tested.
import type { Passenger, PassengerAllergy, PassengerPhoto } from '../passengerData';

/** Resolve a flight's passenger-id list to full passenger records (order preserved,
 * unknown ids skipped). */
export function getFlightPassengers(passengerIds: string[], passengers: Passenger[]): Passenger[] {
  const byId = new Map(passengers.map((p) => [p.id, p]));
  return passengerIds.map((id) => byId.get(id)).filter((p): p is Passenger => !!p);
}

const SEVERITY_RANK: Record<PassengerAllergy['severity'], number> = { Critical: 0, Moderate: 1, Mild: 2 };

/** Distinct allergy alerts across a set of passengers, most-severe first, tagged with
 * who has each. Drives the flight-level "medical alerts" summary. */
export interface FlightAllergyAlert {
  allergen: string;
  severity: PassengerAllergy['severity'];
  passengers: string[]; // names
}

export function flightAllergyAlerts(passengers: Passenger[]): FlightAllergyAlert[] {
  const byAllergen = new Map<string, FlightAllergyAlert>();
  for (const p of passengers) {
    for (const a of p.allergies) {
      const existing = byAllergen.get(a.allergen);
      if (!existing) {
        byAllergen.set(a.allergen, { allergen: a.allergen, severity: a.severity, passengers: [p.name] });
      } else {
        if (!existing.passengers.includes(p.name)) existing.passengers.push(p.name);
        // Keep the most severe rating seen for this allergen.
        if (SEVERITY_RANK[a.severity] < SEVERITY_RANK[existing.severity]) existing.severity = a.severity;
      }
    }
  }
  return [...byAllergen.values()].sort((x, y) => SEVERITY_RANK[x.severity] - SEVERITY_RANK[y.severity]);
}

export function countCriticalAllergies(passengers: Passenger[]): number {
  return passengers.reduce((n, p) => n + p.allergies.filter((a) => a.severity === 'Critical').length, 0);
}

/** Immutably append a photo to a passenger. */
export function addPhotoTo(passenger: Passenger, photo: PassengerPhoto): Passenger {
  return { ...passenger, photos: [...(passenger.photos ?? []), photo] };
}

/** Immutably remove a photo from a passenger. */
export function removePhotoFrom(passenger: Passenger, photoId: string): Passenger {
  return { ...passenger, photos: (passenger.photos ?? []).filter((ph) => ph.id !== photoId) };
}
