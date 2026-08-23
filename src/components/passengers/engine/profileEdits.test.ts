import { describe, it, expect } from 'vitest';
import {
  draftFrom, addItem, removeItem, conflictingItems, isDirty, applyDraft, newPassengerFrom,
} from './profileEdits';
import type { Passenger } from '../passengerData';

function pax(extra: Partial<Passenger> = {}): Passenger {
  return {
    id: 'P1', name: 'Robert', info: {}, role: 'Board Chairman',
    allergies: [{ allergen: 'Shellfish', severity: 'Critical' }],
    birthday: '1975-03-15', beverage: ['Espresso'], food: ['Wagyu Beef'],
    passengerComfort: { temperature: '72°F' }, additionalNotes: 'Boards last.', ...extra,
  };
}

describe('addItem', () => {
  it('appends a trimmed value', () => {
    expect(addItem(['Wagyu'], '  Truffle pasta ')).toEqual(['Wagyu', 'Truffle pasta']);
  });
  it('ignores blank input', () => {
    expect(addItem(['Wagyu'], '   ')).toEqual(['Wagyu']);
  });
  it('treats a case-different repeat as the same preference', () => {
    expect(addItem(['Espresso'], 'espresso')).toEqual(['Espresso']);
    expect(addItem(['Espresso'], ' ESPRESSO ')).toEqual(['Espresso']);
  });
});

describe('removeItem', () => {
  it('removes only the exact entry', () => {
    expect(removeItem(['Wagyu', 'Ribeye'], 'Wagyu')).toEqual(['Ribeye']);
    expect(removeItem(['Wagyu'], 'wagyu')).toEqual(['Wagyu']);
  });
});

describe('conflictingItems', () => {
  // The seed data really does contain this: a critical shellfish allergy alongside
  // "Lobster Thermidor" recorded as a favourite.
  it('catches a favourite that IS the allergen but shares no word with it', () => {
    // The case in our own seed data, and the one a plain substring check waves through.
    expect(conflictingItems(['Wagyu Beef', 'Lobster Thermidor'], ['Shellfish'])).toEqual(['Lobster Thermidor']);
    expect(conflictingItems(['Seared tuna niçoise'], ['Fish'])).toEqual(['Seared tuna niçoise']);
  });
  it('catches a favourite that contains the allergen by name', () => {
    expect(conflictingItems(['Shellfish platter', 'Wagyu'], ['Shellfish'])).toEqual(['Shellfish platter']);
  });
  it('does not cry wolf on an explicitly free-from favourite', () => {
    // Real seed data: Daniel Whitfield is gluten-intolerant and lists "Gluten-free options".
    expect(conflictingItems(['Gluten-free options'], ['Gluten'])).toEqual([]);
    expect(conflictingItems(['Dairy-free chocolate'], ['Dairy'])).toEqual([]);
    expect(conflictingItems(['No peanuts please'], ['Peanuts'])).toEqual([]);
  });
  it('does not let a fish allergy inherit the shellfish list', () => {
    expect(conflictingItems(['Lobster Thermidor'], ['Fish'])).toEqual([]);
    expect(conflictingItems(['Seared tuna'], ['Shellfish'])).toEqual([]);
  });
  it('leaves unrelated favourites alone', () => {
    expect(conflictingItems(['Wagyu Beef', 'Truffle Pasta'], ['Shellfish'])).toEqual([]);
    expect(conflictingItems(['Grilled chicken'], ['Peanuts'])).toEqual([]);
  });
  it('catches an allergen that contains the favourite', () => {
    expect(conflictingItems(['Peanuts'], ['Peanut'])).toEqual(['Peanuts']);
  });
  it('is case-insensitive and ignores blank allergens', () => {
    expect(conflictingItems(['LOBSTER roll'], ['shellfish'])).toEqual(['LOBSTER roll']);
    expect(conflictingItems(['Sourdough BREAD'], ['GLUTEN'])).toEqual(['Sourdough BREAD']);
    expect(conflictingItems(['Wagyu'], ['', '  '])).toEqual([]);
  });
});

describe('isDirty', () => {
  const base = draftFrom(pax());
  it('is false for an untouched draft', () => {
    expect(isDirty(draftFrom(pax()), base)).toBe(false);
  });
  it('notices list, note, comfort and confirmation changes', () => {
    expect(isDirty({ ...base, food: ['Wagyu Beef', 'Ribeye'] }, base)).toBe(true);
    expect(isDirty({ ...base, flightAttendantNotes: 'Napkins.' }, base)).toBe(true);
    expect(isDirty({ ...base, passengerComfort: { temperature: '70°F' } }, base)).toBe(true);
    expect(isDirty({ ...base, dietaryConfirmedAtUtc: '2026-08-20T00:00:00Z' }, base)).toBe(true);
  });
  it('notices a reorder, not just a length change', () => {
    const two = draftFrom(pax({ food: ['A', 'B'] }));
    expect(isDirty({ ...two, food: ['B', 'A'] }, two)).toBe(true);
  });
  it('treats an absent comfort key and an empty one as the same', () => {
    expect(isDirty({ ...base, passengerComfort: { temperature: '72°F', seating: '' } }, base)).toBe(false);
  });
});

describe('applyDraft', () => {
  it('never touches allergies, the booking flag, identity or role', () => {
    const p = pax({ allergyFlagged: true });
    const out = applyDraft(p, { ...draftFrom(p), food: ['Only this'] });
    expect(out.allergies).toEqual(p.allergies);
    expect(out.allergyFlagged).toBe(true);
    expect(out.id).toBe('P1');
    expect(out.name).toBe('Robert');
    expect(out.role).toBe('Board Chairman');
    expect(out.food).toEqual(['Only this']);
  });
  it('does not mutate the original record or share list references', () => {
    const p = pax();
    const draft = draftFrom(p);
    const out = applyDraft(p, draft);
    out.food.push('Sneaky');
    expect(p.food).toEqual(['Wagyu Beef']);
    expect(draft.food).toEqual(['Wagyu Beef']);
  });
});

describe('newPassengerFrom', () => {
  it('starts with no allergies and no confirmation — a new profile invents no reassurance', () => {
    const p = newPassengerFrom('PAX-9902', 'Aditya Rao', { ...draftFrom(null), food: ['Sushi'] });
    expect(p.id).toBe('PAX-9902');
    expect(p.name).toBe('Aditya Rao');
    expect(p.allergies).toEqual([]);
    expect(p.allergyFlagged).toBeUndefined();
    expect(p.dietaryConfirmedAtUtc).toBeUndefined();
    expect(p.food).toEqual(['Sushi']);
  });
});

describe('mapping allergens from the booking note', () => {
  const withNote = (note: string, extra: Partial<Passenger> = {}): Passenger => ({
    ...pax({ allergies: [] }),
    sourceNote: { dietary: note, seenAtUtc: '2026-08-20T00:00:00Z' },
    ...extra,
  });

  it('carries the existing allergens into the draft as plain names', () => {
    expect(draftFrom(pax()).allergens).toEqual(['Shellfish']);
  });

  it('writes new allergens with no severity, because none was recorded', () => {
    const p = withNote('severe nut allergy');
    const out = applyDraft(p, { ...draftFrom(p), allergens: ['Tree nuts'] });
    expect(out.allergies).toEqual([{ allergen: 'Tree nuts' }]);
    expect(out.allergies[0].severity).toBeUndefined();
  });

  it('stamps the source text a mapping was made from', () => {
    const p = withNote('no shellfish');
    const out = applyDraft(p, { ...draftFrom(p), allergens: ['Shellfish'] }, '2026-08-22T00:00:00Z');
    expect(out.mappedFromNote).toBe('no shellfish');
    expect(out.mappedAtUtc).toBe('2026-08-22T00:00:00Z');
  });

  it('keeps reaction and medication on an allergen that was already there', () => {
    const rich: Passenger = {
      ...pax({ allergies: [{ allergen: 'Shellfish', severity: 'Critical', reaction: 'Anaphylaxis', medication: 'EpiPen' }] }),
      sourceNote: { dietary: 'shellfish and now dairy', seenAtUtc: '2026-08-20T00:00:00Z' },
    };
    const out = applyDraft(rich, { ...draftFrom(rich), allergens: ['Shellfish', 'Dairy'] });
    expect(out.allergies[0]).toMatchObject({ allergen: 'Shellfish', reaction: 'Anaphylaxis', medication: 'EpiPen' });
    expect(out.allergies[1]).toEqual({ allergen: 'Dairy' });
  });

  it('re-stamps the source text after a re-map, which clears the stale flag', () => {
    const stale = withNote('shellfish and now dairy', {
      allergies: [{ allergen: 'Shellfish' }],
      mappedFromNote: 'shellfish',
    });
    const out = applyDraft(stale, { ...draftFrom(stale), allergens: ['Shellfish', 'Dairy'] });
    expect(out.mappedFromNote).toBe('shellfish and now dairy');
  });

  it('does not invent a mapping stamp for a passenger with no booking note', () => {
    const p = pax({ allergies: [] });
    const out = applyDraft(p, { ...draftFrom(p), allergens: ['Gluten'] });
    expect(out.mappedFromNote).toBeUndefined();
  });

  it('counts an allergen change as dirty', () => {
    const base = draftFrom(pax());
    expect(isDirty({ ...base, allergens: ['Shellfish', 'Peanuts'] }, base)).toBe(true);
    expect(isDirty({ ...base }, base)).toBe(false);
  });
});
