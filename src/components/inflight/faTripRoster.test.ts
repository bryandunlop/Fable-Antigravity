import { describe, it, expect } from 'vitest';
import { rosterFor, summarise, splitAllergens, isFoodAllergen, legByNumber, bandKind, hasProfileContent, allergenRollup } from './faTripRoster';
import type { DietaryState as RosterGuestState } from '../passengers/engine/flights';
import type { Passenger } from '../passengers/passengerData';
import type { FaTrip } from './faTrips';

function pax(id: string, name: string, extra: Partial<Passenger> = {}): Passenger {
  return {
    id, name, info: {}, role: 'Guest', allergies: [], birthday: '',
    beverage: [], food: [], passengerComfort: {}, additionalNotes: '', ...extra,
  };
}

const ROBERT = pax('P1', 'Robert', { allergies: [{ allergen: 'Shellfish', severity: 'Critical' }] });
const HELEN = pax('P2', 'Helen', { allergyFlagged: true });
const PATRICIA = pax('P3', 'Patricia', { dietaryConfirmedAtUtc: '2026-08-12T00:00:00Z' });
const DB = [ROBERT, HELEN, PATRICIA];

const TRIP: FaTrip = {
  id: 'T1', tripNumber: 'TRP-1', tripName: 'Test', tail: 'N1PG', aircraftType: 'G650ER', cabinCrew: ['You'],
  legs: [
    { id: 'L1', legNumber: 1, flightNumber: 'PG1', origin: 'KTEB', destination: 'KLAX',
      departureUtc: '2026-08-21T09:00:00Z', arrivalUtc: '2026-08-21T15:00:00Z',
      passengerIds: ['P1', 'P2', 'GHOST'] },
    { id: 'L2', legNumber: 2, flightNumber: 'PG2', origin: 'KLAX', destination: 'KTEB',
      departureUtc: '2026-08-23T09:00:00Z', arrivalUtc: '2026-08-23T15:00:00Z',
      passengerIds: ['P1', 'P3'] },
  ],
};

describe('rosterFor', () => {
  it('lists each person once across the whole trip, with the legs they fly', () => {
    const r = rosterFor(TRIP, DB, null);
    expect(r.map((g) => g.id)).toEqual(['P1', 'P2', 'GHOST', 'P3']);
    expect(r.find((g) => g.id === 'P1')!.legNumbers).toEqual([1, 2]);
    expect(r.find((g) => g.id === 'P3')!.legNumbers).toEqual([2]);
  });

  it('narrows to one leg without losing anybody on it', () => {
    expect(rosterFor(TRIP, DB, 1).map((g) => g.id)).toEqual(['P1', 'P2', 'GHOST']);
    expect(rosterFor(TRIP, DB, 2).map((g) => g.id)).toEqual(['P1', 'P3']);
  });

  it('keeps a manifest id with no record, and still gives it a name to print', () => {
    const ghost = rosterFor(TRIP, DB, 1).find((g) => g.id === 'GHOST')!;
    expect(ghost.passenger).toBeNull();
    expect(ghost.state).toBe('NONE_ON_FILE');
    expect(ghost.displayName).toContain('GHOST');
    expect(ghost.displayName.trim()).not.toBe('');
  });

  it('does not double-count someone booked on the same leg twice', () => {
    const dup = { ...TRIP, legs: [{ ...TRIP.legs[0], passengerIds: ['P1', 'P1'] }] };
    const r = rosterFor(dup, DB, null);
    expect(r).toHaveLength(1);
    expect(r[0].legNumbers).toEqual([1]);
  });
});

describe('summarise', () => {
  it('counts each dietary state and names the allergens once', () => {
    const s = summarise(rosterFor(TRIP, DB, null));
    expect(s.allergens).toEqual(['Shellfish']);
    expect(s.flaggedNoDetail).toBe(1);
    expect(s.noInfo).toBe(1);
    expect(s.confirmedNone).toBe(1);
    expect(s.total).toBe(4);
  });

  it('totals every guest, so the roster can say what it does not cover', () => {
    const s = summarise(rosterFor(TRIP, DB, 1));
    expect(s.total).toBe(3);
    expect(s.flaggedNoDetail + s.noInfo).toBe(2);
  });
});

describe('splitAllergens', () => {
  it('keeps non-food allergens out of the food list without discarding them', () => {
    const { food, nonFood } = splitAllergens(['Shellfish', 'Bee stings', 'Latex', 'Peanuts']);
    expect(food).toEqual(['Shellfish', 'Peanuts']);
    expect(nonFood).toEqual(['Bee stings', 'Latex']);
  });
  it('matches case- and space-insensitively', () => {
    expect(isFoodAllergen('  LATEX ')).toBe(false);
    expect(isFoodAllergen('Gluten')).toBe(true);
  });
});

describe('legByNumber', () => {
  it('resolves a leg, and returns undefined for the whole-trip filter', () => {
    expect(legByNumber(TRIP, 2)?.flightNumber).toBe('PG2');
    expect(legByNumber(TRIP, null)).toBeUndefined();
  });
});

describe('bandKind', () => {
  const g = (p: Passenger | null, id = 'x') =>
    ({ id, passenger: p, legNumbers: [1], displayName: p?.name ?? id,
       state: p === null ? 'NONE_ON_FILE' as const
            : p.allergies.length ? 'ALLERGIES' as const
            : p.allergyFlagged ? 'FLAGGED_NO_DETAIL' as const
            : p.dietaryConfirmedAtUtc ? 'CONFIRMED_NONE' as const
            : 'NONE_ON_FILE' as const });

  it('is ALLERGY when at least one allergen is food', () => {
    expect(bandKind(g(pax('a', 'A', { allergies: [{ allergen: 'Shellfish', severity: 'Critical' }] })))).toBe('ALLERGY');
  });

  it('is ALLERGY when food and non-food are mixed — the food one still governs', () => {
    expect(bandKind(g(pax('a', 'A', {
      allergies: [{ allergen: 'Latex', severity: 'Mild' }, { allergen: 'Peanuts', severity: 'Critical' }],
    })))).toBe('ALLERGY');
  });

  it('is CABIN_ONLY when every recorded allergen is non-food', () => {
    // Emily Watson's real shape: bee stings and latex. A red food band here is the
    // dilution this screen exists to remove; "no information" would be a lie.
    expect(bandKind(g(pax('a', 'A', {
      allergies: [{ allergen: 'Bee stings', severity: 'Moderate' }, { allergen: 'Latex', severity: 'Mild' }],
    })))).toBe('CABIN_ONLY');
  });

  it('keeps FLAGGED, CONFIRMED_NONE and NO_INFO intact', () => {
    expect(bandKind(g(pax('a', 'A', { allergyFlagged: true })))).toBe('FLAGGED');
    expect(bandKind(g(pax('a', 'A', { dietaryConfirmedAtUtc: '2026-08-12T00:00:00Z' })))).toBe('CONFIRMED_NONE');
    expect(bandKind(g(pax('a', 'A')))).toBe('NO_INFO');
    expect(bandKind(g(null, 'GHOST'))).toBe('NO_INFO');
  });
});

describe('hasProfileContent', () => {
  it('is false for a booking stub — a name and a flag is not a profile', () => {
    expect(hasProfileContent(pax('a', 'Helen', { allergyFlagged: true }))).toBe(false);
  });
  it('is false when there is no record at all', () => {
    expect(hasProfileContent(null)).toBe(false);
  });
  it('is true once anyone has written something a crew member would read', () => {
    expect(hasProfileContent(pax('a', 'A', { food: ['Wagyu'] }))).toBe(true);
    expect(hasProfileContent(pax('a', 'A', { additionalNotes: 'Boards last.' }))).toBe(true);
    expect(hasProfileContent(pax('a', 'A', { passengerComfort: { temperature: '72°F' } }))).toBe(true);
  });
  it('ignores whitespace-only fields', () => {
    expect(hasProfileContent(pax('a', 'A', { additionalNotes: '   ', passengerComfort: { seating: ' ' } }))).toBe(false);
  });
});

describe('allergenRollup', () => {
  const g = (id: string, name: string, p: Passenger | null, state: RosterGuestState) =>
    ({ id, passenger: p, legNumbers: [1], displayName: name, state });

  const robert = pax('P1', 'Robert', { allergies: [{ allergen: 'Shellfish', severity: 'Critical' }, { allergen: 'Tree nuts', severity: 'Moderate' }] });
  const michael = pax('P2', 'Michael', { allergies: [{ allergen: 'Peanuts', severity: 'Critical' }] });
  const helenAlso = pax('P3', 'Helen', { allergies: [{ allergen: 'Shellfish', severity: 'Mild' }] });
  const emily = pax('P4', 'Emily', { allergies: [{ allergen: 'Bee stings', severity: 'Moderate' }] });

  const guests = [
    g('P1', 'Robert', robert, 'ALLERGIES'),
    g('P2', 'Michael', michael, 'ALLERGIES'),
    g('P3', 'Helen', helenAlso, 'ALLERGIES'),
    g('P4', 'Emily', emily, 'ALLERGIES'),
    g('P5', 'Flagged one', pax('P5', 'Flagged one', { allergyFlagged: true }), 'FLAGGED_NO_DETAIL'),
    g('GHOST', 'Unnamed guest · GHOST', null, 'NONE_ON_FILE'),
    g('P7', 'Clear one', pax('P7', 'Clear one', { dietaryConfirmedAtUtc: '2026-08-12T00:00:00Z' }), 'CONFIRMED_NONE'),
  ];

  it('groups by allergen and names everyone who carries it', () => {
    const r = allergenRollup(guests);
    expect(r.food.map((x) => x.allergen)).toEqual(['Shellfish', 'Peanuts', 'Tree nuts']);
    expect(r.food[0].carriers).toEqual(['Robert', 'Helen']);
  });

  it('puts the most-carried allergen first', () => {
    expect(allergenRollup(guests).food[0].allergen).toBe('Shellfish');
  });

  it('keeps non-food allergens out of the cook-around list without losing them', () => {
    const r = allergenRollup(guests);
    expect(r.food.map((x) => x.allergen)).not.toContain('Bee stings');
    expect(r.cabin.map((x) => x.allergen)).toEqual(['Bee stings']);
  });

  it('counts the two kinds of not-knowing separately', () => {
    const r = allergenRollup(guests);
    expect(r.flagged.map((x) => x.displayName)).toEqual(['Flagged one']);
    expect(r.unknown.map((x) => x.displayName)).toEqual(['Unnamed guest · GHOST']);
  });

  it('leaves a confirmed-clear guest out of every bucket', () => {
    const r = allergenRollup(guests);
    const named = [...r.food, ...r.cabin].flatMap((x) => x.carriers);
    expect(named).not.toContain('Clear one');
    expect(r.flagged).toHaveLength(1);
    expect(r.unknown).toHaveLength(1);
  });

  it('is empty all round for a leg with nothing recorded', () => {
    const r = allergenRollup([g('P7', 'Clear one', pax('P7', 'Clear one', { dietaryConfirmedAtUtc: '2026-08-12T00:00:00Z' }), 'CONFIRMED_NONE')]);
    expect(r).toMatchObject({ food: [], cabin: [], flagged: [], unknown: [] });
  });
});

describe('allergenRollup · needs mapping', () => {
  const g = (id: string, name: string, p: Passenger | null, state: RosterGuestState) =>
    ({ id, passenger: p, legNumbers: [1], displayName: name, state });

  it('gives unmapped prose its own bucket instead of dropping the guest', () => {
    // Before NEEDS_MAPPING existed this state fell through the switch and the guest
    // vanished from every bucket — the worst outcome for the most urgent case.
    const unmapped = pax('P9', 'Helen', {
      allergyFlagged: true,
      sourceNote: { dietary: 'severe nut allergy', seenAtUtc: '2026-08-20T00:00:00Z' },
    });
    const r = allergenRollup([g('P9', 'Helen', unmapped, 'NEEDS_MAPPING')]);
    expect(r.needsMapping.map((x) => x.displayName)).toEqual(['Helen']);
    expect(r.food).toEqual([]);
    expect(r.flagged).toEqual([]);
    expect(r.unknown).toEqual([]);
  });

  it('keeps a mapped guest out of the mapping bucket', () => {
    const mapped = pax('P1', 'Robert', {
      allergies: [{ allergen: 'Shellfish', severity: 'Critical' }],
      sourceNote: { dietary: 'no shellfish', seenAtUtc: '2026-08-20T00:00:00Z' },
      mappedFromNote: 'no shellfish',
    });
    const r = allergenRollup([g('P1', 'Robert', mapped, 'ALLERGIES')]);
    expect(r.needsMapping).toEqual([]);
    expect(r.food.map((x) => x.allergen)).toEqual(['Shellfish']);
  });
});

describe('allergenRollup · a stale mapping still contributes', () => {
  const g = (id: string, name: string, p: Passenger | null, state: RosterGuestState) =>
    ({ id, passenger: p, legNumbers: [1], displayName: name, state });

  const stale = pax('P1', 'Robert', {
    allergies: [{ allergen: 'Shellfish' }, { allergen: 'Tree nuts' }],
    sourceNote: { dietary: 'shellfish and tree nuts. Now also dairy-free.', seenAtUtc: '2026-08-21T00:00:00Z' },
    mappedFromNote: 'shellfish and tree nuts.',
  });

  it('keeps the already-mapped allergens named, and flags the guest as well', () => {
    // A stale note means there may be MORE, not that shellfish stopped being true.
    // Dropping it would remove an allergen from the leg because someone typed a sentence.
    const r = allergenRollup([g('P1', 'Robert', stale, 'NEEDS_MAPPING')]);
    expect(r.food.map((x) => x.allergen).sort()).toEqual(['Shellfish', 'Tree nuts']);
    expect(r.food[0].carriers).toEqual(['Robert']);
    expect(r.needsMapping.map((x) => x.displayName)).toEqual(['Robert']);
  });

  it('does not double-name a carrier who also appears via another guest', () => {
    const other = pax('P2', 'Helen', { allergies: [{ allergen: 'Shellfish' }] });
    const r = allergenRollup([
      g('P1', 'Robert', stale, 'NEEDS_MAPPING'),
      g('P2', 'Helen', other, 'ALLERGIES'),
    ]);
    const shellfish = r.food.find((x) => x.allergen === 'Shellfish')!;
    expect(shellfish.carriers).toEqual(['Robert', 'Helen']);
  });

  it('adds nothing to the list for an unmapped guest with no allergens yet', () => {
    const unmapped = pax('P3', 'Aditya', {
      sourceNote: { dietary: 'no idea yet', seenAtUtc: '2026-08-21T00:00:00Z' },
    });
    const r = allergenRollup([g('P3', 'Aditya', unmapped, 'NEEDS_MAPPING')]);
    expect(r.food).toEqual([]);
    expect(r.needsMapping).toHaveLength(1);
  });
});
