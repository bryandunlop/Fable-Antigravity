// Pure helpers behind the flight-attendant trip roster. No React / no storage.
//
// The screen is a BRIEFING, not a workspace: it answers "who is on this trip and what
// can they not eat". Everything here serves that and nothing else — there is no menu
// building and no ordering, because GFO has no such capability.
import type { Passenger } from '../passengers/passengerData';
import { resolveTripGuests, dietaryState } from '../passengers/engine/flights';
import type { TripGuest, DietaryState } from '../passengers/engine/flights';
import type { FaLeg, FaTrip } from './faTrips';

/** A guest as the roster shows them: the resolved record (or its absence), plus which
 * legs of THIS trip they fly. Legs are metadata on one roster, not a reason to render
 * the same person several times — one row per person is what makes "tap to edit"
 * unambiguous. */
export interface RosterGuest extends TripGuest {
  /** Leg numbers this guest is booked on, ascending. */
  legNumbers: number[];
  /** The name to print. Falls back to the raw manifest id when there is no record —
   *  never blank, because a nameless row is how a guest gets forgotten. */
  displayName: string;
  state: DietaryState;
}

/** Everyone on the trip, de-duplicated across legs, in first-appearance order.
 * `legFilter` of null means the whole trip; a leg number narrows to that leg. */
export function rosterFor(trip: FaTrip, passengers: Passenger[], legFilter: number | null): RosterGuest[] {
  const legsOf = new Map<string, number[]>();
  const order: string[] = [];

  for (const leg of trip.legs) {
    for (const id of leg.passengerIds) {
      if (!legsOf.has(id)) { legsOf.set(id, []); order.push(id); }
      const legs = legsOf.get(id)!;
      if (!legs.includes(leg.legNumber)) legs.push(leg.legNumber);
    }
  }

  const kept = legFilter === null ? order : order.filter((id) => legsOf.get(id)!.includes(legFilter));

  return resolveTripGuests(kept, passengers).map((g) => ({
    ...g,
    legNumbers: [...legsOf.get(g.id)!].sort((a, b) => a - b),
    displayName: g.passenger?.name ?? `Unnamed guest · ${g.id}`,
    state: dietaryState(g),
  }));
}

export interface RosterSummary {
  /** Distinct allergens named across the set, first-seen order. No severity: nothing
   *  upstream records one, so nothing here may imply one. */
  allergens: string[];
  /** Guests carrying an allergy we cannot name — a bare booking flag. */
  flaggedNoDetail: number;
  /** Guests we simply know nothing about. Neutral, never an alarm — but counted, so
   *  the roster can state how much of itself it does not cover. */
  noInfo: number;
  confirmedNone: number;
  total: number;
}

export function summarise(guests: RosterGuest[]): RosterSummary {
  const allergens: string[] = [];
  let flaggedNoDetail = 0, noInfo = 0, confirmedNone = 0;

  for (const g of guests) {
    switch (g.state) {
      case 'ALLERGIES':
        for (const a of g.passenger!.allergies) if (!allergens.includes(a.allergen)) allergens.push(a.allergen);
        break;
      case 'FLAGGED_NO_DETAIL': flaggedNoDetail++; break;
      case 'CONFIRMED_NONE': confirmedNone++; break;
      case 'NONE_ON_FILE': noInfo++; break;
    }
  }
  return { allergens, flaggedNoDetail, noInfo, confirmedNone, total: guests.length };
}

/** Allergens a galley has to cook around. Bee stings and latex are real allergies and
 * belong on the person, but putting them in a food roll-up dilutes the list that keeps
 * someone alive — so they are named separately rather than dropped. */
const NON_FOOD_ALLERGENS = ['bee stings', 'bee sting', 'wasp stings', 'latex', 'pollen', 'dust', 'penicillin', 'insect stings'];

export function isFoodAllergen(allergen: string): boolean {
  return !NON_FOOD_ALLERGENS.includes(allergen.trim().toLowerCase());
}

export function splitAllergens(allergens: string[]): { food: string[]; nonFood: string[] } {
  return {
    food: allergens.filter(isFoodAllergen),
    nonFood: allergens.filter((a) => !isFoodAllergen(a)),
  };
}

/** The leg a filter refers to, or undefined for the whole trip. */
export function legByNumber(trip: FaTrip, legNumber: number | null): FaLeg | undefined {
  return legNumber === null ? undefined : trip.legs.find((l) => l.legNumber === legNumber);
}

/** What the band on a guest actually says — one step past the raw dietary state,
 * because "has allergies" and "has allergies the galley can act on" are different
 * questions and this screen is about food.
 *
 * CABIN_ONLY is the case that bit: a guest whose only recorded allergies are bee
 * stings and latex was getting the same red food band as an anaphylactic shellfish
 * allergy. Red-flagging a menu concern that is not a menu concern is precisely the
 * dilution this screen exists to remove — but downgrading it to "no information"
 * would be a lie, because we have information. So it reads neutral and names them. */
export type BandKind = 'ALLERGY' | 'FLAGGED' | 'CABIN_ONLY' | 'CONFIRMED_NONE' | 'NO_INFO';

export function bandKind(guest: RosterGuest): BandKind {
  if (guest.state === 'FLAGGED_NO_DETAIL') return 'FLAGGED';
  if (guest.state === 'CONFIRMED_NONE') return 'CONFIRMED_NONE';
  if (guest.state === 'NONE_ON_FILE') return 'NO_INFO';
  const { food } = splitAllergens(guest.passenger!.allergies.map((a) => a.allergen));
  return food.length > 0 ? 'ALLERGY' : 'CABIN_ONLY';
}

/** Does this record hold anything a crew member actually wrote, as opposed to the
 * skeleton a booking sync creates? A stub with a name and an allergy flag IS a record,
 * so a bare null-check calls it a profile and offers to "open" an empty screen — which
 * is the ~950 case, i.e. almost every guest. Content is the honest test. */
export function hasProfileContent(p: Passenger | null): boolean {
  if (!p) return false;
  const c = p.passengerComfort ?? {};
  return (
    p.food.length > 0 || p.beverage.length > 0 || (p.dislikes?.length ?? 0) > 0 ||
    Boolean(p.additionalNotes?.trim()) || Boolean(p.flightAttendantNotes?.trim()) ||
    (p.photos?.length ?? 0) > 0 ||
    Object.values(c).some((v) => Boolean(v && String(v).trim()))
  );
}

export interface AllergenRow {
  allergen: string;
  /** Everyone on this leg who carries it. Names, not ids — the row is read aloud. */
  carriers: string[];
}

export interface LegRollup {
  /** Allergens a galley has to cook around, most-carried first. */
  food: AllergenRow[];
  /** Real allergies that are not the galley's problem. Named, never dropped. */
  cabin: AllergenRow[];
  /** Flagged on the booking with no allergen named. */
  flagged: RosterGuest[];
  /** Nothing on file at all — not the same as no allergies. */
  unknown: RosterGuest[];
}

/** The leg's whole dietary picture, rolled up by ALLERGEN rather than by person.
 *
 * This is the reframe the screen is built on: a flight attendant planning a service
 * does not walk a list of passengers looking each one up, she asks "what can never come
 * aboard this leg". Rolling up by person repeated the same allergen across three rows
 * and made the answer something you had to assemble yourself. */
export function allergenRollup(guests: RosterGuest[]): LegRollup {
  const byAllergen = new Map<string, AllergenRow>();
  const flagged: RosterGuest[] = [];
  const unknown: RosterGuest[] = [];

  for (const g of guests) {
    switch (g.state) {
      case 'FLAGGED_NO_DETAIL':
        flagged.push(g);
        break;
      case 'NONE_ON_FILE':
        unknown.push(g);
        break;
      case 'ALLERGIES':
        for (const a of g.passenger!.allergies) {
          const row = byAllergen.get(a.allergen);
          if (row) { if (!row.carriers.includes(g.displayName)) row.carriers.push(g.displayName); }
          else byAllergen.set(a.allergen, { allergen: a.allergen, carriers: [g.displayName] });
        }
        break;
      default:
        break;
    }
  }

  const all = [...byAllergen.values()];
  // Most-carried first, then alphabetical so the order is stable between renders.
  const sort = (rows: AllergenRow[]) =>
    rows.sort((a, b) => b.carriers.length - a.carriers.length || a.allergen.localeCompare(b.allergen));

  return {
    food: sort(all.filter((r) => isFoodAllergen(r.allergen))),
    cabin: sort(all.filter((r) => !isFoodAllergen(r.allergen))),
    flagged,
    unknown,
  };
}
