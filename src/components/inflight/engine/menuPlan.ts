// Pure helpers for the flight-attendant trip view. No React / no storage — unit-tested.
//
// The menu plan is the "everything I need to order food for this leg" roll-up: every
// allergy on board in one list (not scattered per-passenger badge), plus the dislike /
// food / beverage tallies an FA would otherwise assemble by opening each profile.
import type { AllergySeverity, Passenger, PassengerAllergy } from '../../passengers/passengerData';
import type { FaLeg, FaTrip } from '../faTrips';

const SEVERITY_RANK: Record<AllergySeverity, number> = { Critical: 0, Moderate: 1, Mild: 2 };
/** Unrecorded severity sorts last rather than crashing the lookup — and never
 *  pretends to be Mild, which would be a downgrade nobody authored. */
const rank = (s?: AllergySeverity): number => (s ? SEVERITY_RANK[s] : 3);

/** One passenger's stake in an allergen — kept per-carrier so the reaction and the
 * medication stay attached to the person who needs them, not merged away. */
export interface AllergenCarrier {
  name: string;
  severity: PassengerAllergy['severity'];
  reaction?: string;
  medication?: string;
}

export interface LegAllergen {
  allergen: string;
  /** Worst severity across everyone carrying it — drives the banner colour. */
  severity: PassengerAllergy['severity'];
  carriers: AllergenCarrier[];
}

/** A preference and everyone on the leg who holds it. */
export interface PreferenceTally {
  item: string;
  passengers: string[];
}

export interface LegMenuPlan {
  allergens: LegAllergen[];
  dislikes: PreferenceTally[];
  food: PreferenceTally[];
  beverage: PreferenceTally[];
  /** Distinct allergens rated Critical by at least one passenger. */
  criticalCount: number;
}

function tally(entries: Array<{ item: string; name: string }>): PreferenceTally[] {
  const byItem = new Map<string, PreferenceTally>();
  for (const { item, name } of entries) {
    const existing = byItem.get(item);
    if (existing) {
      if (!existing.passengers.includes(name)) existing.passengers.push(name);
    } else {
      byItem.set(item, { item, passengers: [name] });
    }
  }
  // Most-wanted first, then alphabetical so the order is stable across renders.
  return [...byItem.values()].sort(
    (a, b) => b.passengers.length - a.passengers.length || a.item.localeCompare(b.item),
  );
}

/** Everything the galley needs to plan one leg's service, rolled up across its
 * passengers. Allergens sort most-severe first; ties keep first-seen order. */
export function legMenuPlan(passengers: Passenger[]): LegMenuPlan {
  const byAllergen = new Map<string, LegAllergen>();
  for (const p of passengers) {
    for (const a of p.allergies) {
      const carrier: AllergenCarrier = {
        name: p.name, severity: a.severity, reaction: a.reaction, medication: a.medication,
      };
      const existing = byAllergen.get(a.allergen);
      if (!existing) {
        byAllergen.set(a.allergen, { allergen: a.allergen, severity: a.severity, carriers: [carrier] });
      } else {
        existing.carriers.push(carrier);
        if (rank(a.severity) < rank(existing.severity)) existing.severity = a.severity;
      }
    }
  }
  const allergens = [...byAllergen.values()].sort(
    (x, y) => rank(x.severity) - rank(y.severity),
  );

  return {
    allergens,
    criticalCount: allergens.filter((a) => a.severity === 'Critical').length,
    dislikes: tally(passengers.flatMap((p) => (p.dislikes ?? []).map((item) => ({ item, name: p.name })))),
    food: tally(passengers.flatMap((p) => p.food.map((item) => ({ item, name: p.name })))),
    beverage: tally(passengers.flatMap((p) => p.beverage.map((item) => ({ item, name: p.name })))),
  };
}

/** First departure to last arrival. Null for a legless trip — callers render a dash
 * rather than an Invalid Date. */
export function tripWindow(trip: FaTrip): { startUtc: string; endUtc: string } | null {
  if (trip.legs.length === 0) return null;
  const sorted = [...trip.legs].sort((a, b) => a.departureUtc.localeCompare(b.departureUtc));
  const lastArrival = sorted.reduce((m, l) => (l.arrivalUtc > m ? l.arrivalUtc : m), sorted[0].arrivalUtc);
  return { startUtc: sorted[0].departureUtc, endUtc: lastArrival };
}

/** Minutes on the ground between one leg's arrival and the next leg's departure.
 * Clamped at 0 — a negative gap means the legs are out of order, not time travel. */
export function groundMinutes(prev: FaLeg, next: FaLeg): number {
  const gap = (new Date(next.departureUtc).getTime() - new Date(prev.arrivalUtc).getTime()) / 60000;
  return gap > 0 ? Math.round(gap) : 0;
}

export function formatGround(minutes: number): string {
  if (minutes <= 0) return 'turn';
  if (minutes >= 24 * 60) return `${Math.round(minutes / (24 * 60))} d`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} m`;
  return m === 0 ? `${h} h` : `${h} h ${m} m`;
}
