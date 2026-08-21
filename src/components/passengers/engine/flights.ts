// Pure passenger/flight helpers. No React / no storage — unit-tested.
import type { Passenger, PassengerAllergy, PassengerPhoto } from '../passengerData';

/** One seat on a leg: the id the manifest gave us, and the record behind it — or
 * `null` when the passenger database has never heard of that id. */
export interface TripGuest {
  id: string;
  passenger: Passenger | null;
}

/** Resolve a manifest's passenger ids WITHOUT losing anyone. Order preserved; an id
 * with no record comes back with `passenger: null`.
 *
 * This exists because the obvious implementation is wrong in a way that is invisible.
 * Filtering unresolved ids away makes an unknown guest indistinguishable from a guest
 * who is not on the flight, and quietly shortens every count derived from the list —
 * so a leg reads "2 pax" when 5 are booked. On a screen whose entire job is "who is on
 * board and what can they not eat", a silently shorter manifest is the worst failure
 * available. An unknown guest is information: render the row, say we know nothing. */
export function resolveTripGuests(passengerIds: string[], passengers: Passenger[]): TripGuest[] {
  const byId = new Map(passengers.map((p) => [p.id, p]));
  return passengerIds.map((id) => ({ id, passenger: byId.get(id) ?? null }));
}

/** What the screen may say about a guest's allergies, and therefore what colour it may
 * use. Three colours, no severity and no yellow (Bryan, 2026-08-20): red for an
 * allergy however thin the detail, green ONLY for a dated confirmation, and neutral —
 * no colour at all — for everything else.
 *
 * Neutral rather than amber for the unknown case is deliberate. It is still not green,
 * so absence never reads as safe; and roughly nineteen guests in twenty arrive with no
 * record, so an alarm colour on almost every row is noise that trains the crew to stop
 * seeing the colour that matters. */
export type DietaryState = 'ALLERGIES' | 'FLAGGED_NO_DETAIL' | 'CONFIRMED_NONE' | 'NONE_ON_FILE';

export function dietaryState(guest: TripGuest): DietaryState {
  const p = guest.passenger;
  if (!p) return 'NONE_ON_FILE';
  // Order is the safety property: anything resembling an allergy outranks any
  // reassurance, so a stale confirmation date can never hide a recorded allergen.
  if (p.allergies.length > 0) return 'ALLERGIES';
  if (p.allergyFlagged) return 'FLAGGED_NO_DETAIL';
  if (p.dietaryConfirmedAtUtc) return 'CONFIRMED_NONE';
  return 'NONE_ON_FILE';
}

/** The records we actually hold for a manifest — deliberately lossy, and now derived
 * from `resolveTripGuests` so the loss is visible in one place. Use this only where the
 * question is "which profiles do we have"; anything that renders or counts the manifest
 * must use `resolveTripGuests`. */
export function getFlightPassengers(passengerIds: string[], passengers: Passenger[]): Passenger[] {
  return resolveTripGuests(passengerIds, passengers)
    .map((g) => g.passenger)
    .filter((p): p is Passenger => !!p);
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
