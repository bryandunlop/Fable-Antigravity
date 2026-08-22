// Pure edit model for a passenger profile. No React / no storage — unit-tested.
//
// The trip screen is the only moment the crew is with the passenger, so it is where
// the profile should get written. That is the whole reason this exists: the Passenger
// Database is a separate destination nobody opens after a flight, which is why most
// guests never get a profile at all.
//
// ALLERGENS ARE EDITABLE HERE, and that reverses an earlier decision. They were locked
// on the reasoning that "myairops owns them". It does not: the CRM schema gives
// `hasAllergy: boolean` plus a free-text `DietaryAllergens` note, so the upstream record
// is PROSE. Turning that prose into allergens is a judgement only a person can make, and
// per Bryan (2026-08-22) the flight attendants make it — myGFO is the source of truth for
// the mapping, and eventually for the profile outright. Locking the field blocked the
// actual work.
//
// What stays read-only is the SOURCE TEXT. We keep the exact words a mapping was made
// from so that when the booking desk edits them, the mapping can be re-flagged instead
// of quietly standing while reality has moved.
import type { Passenger, PassengerComfort } from '../passengerData';

export interface ProfileDraft {
  /** Allergen names only — no severity, because nothing records one. */
  allergens: string[];
  food: string[];
  beverage: string[];
  dislikes: string[];
  passengerComfort: PassengerComfort;
  additionalNotes: string;
  flightAttendantNotes: string;
  /** Set when someone asks the passenger and records the answer. The ONLY thing that
   *  earns the green "no allergies" state — an empty allergy list never does. */
  dietaryConfirmedAtUtc?: string;
}

export function draftFrom(p: Passenger | null): ProfileDraft {
  return {
    allergens: (p?.allergies ?? []).map((a) => a.allergen),
    food: [...(p?.food ?? [])],
    beverage: [...(p?.beverage ?? [])],
    dislikes: [...(p?.dislikes ?? [])],
    passengerComfort: { ...(p?.passengerComfort ?? {}) },
    additionalNotes: p?.additionalNotes ?? '',
    flightAttendantNotes: p?.flightAttendantNotes ?? '',
    dietaryConfirmedAtUtc: p?.dietaryConfirmedAtUtc,
  };
}

/** Append a value, trimmed. Blank input is a no-op and a case-insensitive repeat keeps
 *  the entry already there — "Espresso" and "espresso" are one preference, and a list
 *  that quietly grows duplicates is one nobody maintains. */
export function addItem(list: string[], value: string): string[] {
  const v = value.trim();
  if (!v) return list;
  if (list.some((x) => x.trim().toLowerCase() === v.toLowerCase())) return list;
  return [...list, v];
}

export function removeItem(list: string[], value: string): string[] {
  return list.filter((x) => x !== value);
}

/** Foods that ARE a given allergen but share no substring with its name. Without this,
 * a substring check reads "lobster thermidor".includes("shellfish") === false and waves
 * through the exact contradiction in our own seed data — a critical shellfish allergy
 * next to Lobster Thermidor as a favourite.
 *
 * This is a SAFETY NET, not a source of truth: it is a short hand-written list, it will
 * never be exhaustive, and a miss here must never be the only thing between a passenger
 * and the wrong meal. It exists to catch the obvious contradictions a person would spot
 * instantly, so they get fixed rather than sitting in the record for years. */
const ALLERGEN_FOODS: Record<string, string[]> = {
  shellfish: ['lobster', 'shrimp', 'prawn', 'crab', 'crayfish', 'langoustine', 'scallop', 'oyster', 'mussel', 'clam', 'calamari', 'squid'],
  'tree nuts': ['almond', 'walnut', 'pecan', 'cashew', 'pistachio', 'hazelnut', 'macadamia', 'praline', 'marzipan', 'nutella', 'pesto'],
  peanuts: ['peanut', 'groundnut', 'satay'],
  gluten: ['wheat', 'bread', 'pasta', 'rigatoni', 'couscous', 'barley', 'rye', 'pastry', 'croissant', 'brioche'],
  dairy: ['milk', 'butter', 'cheese', 'cream', 'yoghurt', 'yogurt', 'gelato'],
  eggs: ['egg', 'mayonnaise', 'meringue', 'aioli', 'frittata', 'omelette'],
  soy: ['soy', 'tofu', 'edamame', 'miso'],
  fish: ['salmon', 'tuna', 'cod', 'anchovy', 'halibut', 'sardine', 'niçoise', 'nicoise'],
  sesame: ['sesame', 'tahini', 'hummus'],
};

function escapeRe(x: string): string {
  return x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Whole-word containment. Plain substring matching gets this wrong in a way that
 *  matters: "shellfish".includes("fish") is true, so a FISH allergy would silently
 *  inherit the shellfish food list and miss tuna entirely. */
function wordMatch(haystack: string, needle: string): boolean {
  return new RegExp(`(^|[^a-z])${escapeRe(needle)}([^a-z]|$)`, 'i').test(haystack);
}

function foodsFor(allergen: string): string[] {
  const a = allergen.trim().toLowerCase();
  if (ALLERGEN_FOODS[a]) return ALLERGEN_FOODS[a];
  return Object.keys(ALLERGEN_FOODS)
    .filter((k) => wordMatch(a, k) || wordMatch(k, a))
    .flatMap((k) => ALLERGEN_FOODS[k]);
}

/** "Gluten-free options" is not a gluten conflict — it is the opposite, and it is in
 *  our real seed data (Daniel Whitfield is gluten-intolerant and lists exactly that).
 *  A check that cries wolf on the correctly-catered case is one people learn to
 *  dismiss, which costs more than the check ever earns. */
function isExplicitlyFree(item: string, allergen: string): boolean {
  const a = escapeRe(allergen.trim().toLowerCase());
  return new RegExp(`(no|without|free\\s*(of|from))\\s+${a}|${a}[\\s-]*free`, 'i').test(item);
}

/** Preferences that name something the passenger is allergic to. A likes list that
 *  contradicts an allergy list is worse than no likes list — it invites someone to
 *  serve the thing that hurts them.
 *
 *  Matches three ways: substring in either direction (an allergen of "Shellfish"
 *  catches "Shellfish platter"; a food of "Peanuts" catches an allergen of "Peanut"),
 *  and against the known-foods list above — unless the item says it is free of it. */
export function conflictingItems(items: string[], allergens: string[]): string[] {
  const cleaned = allergens.map((x) => x.trim().toLowerCase()).filter(Boolean);
  return items.filter((item) => {
    const f = item.trim().toLowerCase();
    if (!f) return false;
    return cleaned.some((al) => {
      if (isExplicitlyFree(f, al)) return false;
      return f.includes(al) || al.includes(f) || foodsFor(al).some((known) => f.includes(known));
    });
  });
}

function sameList(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((x, i) => x === b[i]);
}

export function isDirty(draft: ProfileDraft, original: ProfileDraft): boolean {
  if (!sameList(draft.allergens, original.allergens)) return true;
  if (!sameList(draft.food, original.food)) return true;
  if (!sameList(draft.beverage, original.beverage)) return true;
  if (!sameList(draft.dislikes, original.dislikes)) return true;
  if (draft.additionalNotes !== original.additionalNotes) return true;
  if (draft.flightAttendantNotes !== original.flightAttendantNotes) return true;
  if (draft.dietaryConfirmedAtUtc !== original.dietaryConfirmedAtUtc) return true;
  const keys: (keyof PassengerComfort)[] = ['temperature', 'seating', 'tvPreference', 'lighting', 'specialRequests'];
  return keys.some((k) => (draft.passengerComfort[k] ?? '') !== (original.passengerComfort[k] ?? ''));
}

/** Fold a draft back onto a record, immutably. Everything not in the draft — id, name,
 *  role, allergies, the booking flag — is carried through untouched. */
/** Fold a draft back onto a record, immutably.
 *
 *  `mappedFromNote` is stamped with the source text the person was looking at while they
 *  mapped — not with "now". That is what makes a later upstream edit detectable at all;
 *  stamping a timestamp alone would tell you when, but never that the words changed. */
export function applyDraft(p: Passenger, draft: ProfileDraft, mappedAtUtc?: string): Passenger {
  const allergensChanged = !sameList(draft.allergens, (p.allergies ?? []).map((a) => a.allergen));
  const sourceText = p.sourceNote?.dietary?.trim();
  return {
    ...p,
    // Existing entries keep their reaction/medication detail; only genuinely new
    // allergens arrive bare, because a mapping from prose has nothing else to give.
    allergies: draft.allergens.map((name) => p.allergies.find((a) => a.allergen === name) ?? { allergen: name }),
    ...(sourceText && (allergensChanged || !p.mappedFromNote)
      ? { mappedFromNote: sourceText, mappedAtUtc: mappedAtUtc ?? p.mappedAtUtc }
      : {}),
    food: [...draft.food],
    beverage: [...draft.beverage],
    dislikes: [...draft.dislikes],
    passengerComfort: { ...draft.passengerComfort },
    additionalNotes: draft.additionalNotes,
    flightAttendantNotes: draft.flightAttendantNotes,
    dietaryConfirmedAtUtc: draft.dietaryConfirmedAtUtc,
  };
}

/** A record for a manifest id the passenger database has never heard of. Starts empty
 *  and, critically, starts with NO allergies and NO confirmation — a profile created
 *  from a trip screen must not manufacture reassurance nobody gave. */
export function newPassengerFrom(id: string, name: string, draft: ProfileDraft): Passenger {
  return applyDraft(
    { id, name, info: {}, role: 'Guest', allergies: [], birthday: '', beverage: [], food: [], passengerComfort: {}, additionalNotes: '' },
    draft,
  );
}
