// Pure passenger/flight helpers. No React / no storage — unit-tested.
import type { AllergySeverity, Passenger, PassengerAllergy, PassengerPhoto } from '../passengerData';

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
export type DietaryState =
  | 'ALLERGIES'
  | 'NEEDS_MAPPING'
  | 'FLAGGED_NO_DETAIL'
  | 'CONFIRMED_NONE'
  | 'NONE_ON_FILE';

/** True when myairops has dietary prose that nobody has turned into allergens yet, or
 *  has CHANGED since somebody did. Both need the same thing: a human to read it. */
export function needsMapping(p: Passenger): boolean {
  const note = p.sourceNote?.dietary?.trim();
  if (!note) return false;
  return note !== (p.mappedFromNote?.trim() ?? '');
}

export function dietaryState(guest: TripGuest): DietaryState {
  const p = guest.passenger;
  if (!p) return 'NONE_ON_FILE';
  // Order is the safety property: anything resembling an allergy outranks any
  // reassurance, so a stale confirmation date can never hide a recorded allergen.
  //
  // NEEDS_MAPPING outranks ALLERGIES on purpose. A guest whose source text has changed
  // since it was mapped has allergens on file that may now be WRONG, and showing them
  // as settled is worse than showing nothing — the crew would cook around a stale list.
  if (needsMapping(p)) return 'NEEDS_MAPPING';
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

const SEVERITY_RANK: Record<AllergySeverity, number> = { Critical: 0, Moderate: 1, Mild: 2 };
/** Unrecorded severity sorts last rather than crashing the lookup — and never
 *  pretends to be Mild, which would be a downgrade nobody authored. */
const rank = (s?: AllergySeverity): number => (s ? SEVERITY_RANK[s] : 3);

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
        if (rank(a.severity) < rank(existing.severity)) existing.severity = a.severity;
      }
    }
  }
  return [...byAllergen.values()].sort((x, y) => rank(x.severity) - rank(y.severity));
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
