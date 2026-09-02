import { describe, it, expect } from 'vitest';
import {
  SEED_PEOPLE, personById, personByName, principalOf, renamePerson,
  resolvePassengers, briefingPrefFor, recipientNames, upsertPerson, documentsExpiringBefore,
  type Person,
} from './people';

const people = SEED_PEOPLE;

describe('the seed', () => {
  it('carries the names the trips already use, so nothing is orphaned on day one', () => {
    for (const n of ['A. Reyes', 'M. Osei', 'J. Lindqvist', 'S. Reyes', 'K. Tanaka']) {
      expect(personByName(people, n), n).toBeTruthy();
    }
  });

  it('has exactly one principal — the reserve is for one person (D107)', () => {
    expect(people.filter(p => p.principal)).toHaveLength(1);
    expect(principalOf(people)?.name).toBe('A. Reyes');
  });
});

describe('resolvePassengers', () => {
  it('turns names into ids without inventing anyone who already exists', () => {
    const r = resolvePassengers(people, ['A. Reyes', 'K. Tanaka'], '2026-09-02T00:00:00.000Z');
    expect(r.created).toHaveLength(0);
    expect(r.ids).toEqual([personByName(people, 'A. Reyes')!.id, personByName(people, 'K. Tanaka')!.id]);
  });

  it('creates a guest record for a name nobody knows, and flags it unverified', () => {
    const r = resolvePassengers(people, ['A. Reyes', 'Q. Newcomer'], '2026-09-02T00:00:00.000Z');
    expect(r.created).toHaveLength(1);
    const made = r.created[0];
    expect(made.name).toBe('Q. Newcomer');
    expect(made.kind).toBe('guest');
    expect(made.unverified).toBe(true);
    expect(made.principal).toBe(false);
    // The created person is in the returned register, so a caller stores one list.
    expect(personById(r.people, made.id)).toBeTruthy();
    expect(r.ids).toContain(made.id);
  });

  it('matches a name regardless of surrounding whitespace or case', () => {
    const r = resolvePassengers(people, ['  a. reyes '], '2026-09-02T00:00:00.000Z');
    expect(r.created).toHaveLength(0);
    expect(r.ids).toEqual([personByName(people, 'A. Reyes')!.id]);
  });
});

describe('renaming a person', () => {
  const renamed = renamePerson(people, personByName(people, 'A. Reyes')!.id, 'Alexandra Reyes');

  it('keeps the same id, so every reference still resolves', () => {
    expect(personById(renamed, personByName(people, 'A. Reyes')!.id)?.name).toBe('Alexandra Reyes');
  });

  it('does not break the principal reserve — it was never keyed by the name', () => {
    expect(principalOf(renamed)?.id).toBe(principalOf(people)?.id);
    expect(principalOf(renamed)?.name).toBe('Alexandra Reyes');
  });

  it('does not break the briefing preference', () => {
    const id = personByName(people, 'A. Reyes')!.id;
    expect(briefingPrefFor(renamed, id)).toBe(briefingPrefFor(people, id));
  });

  it('refuses a blank name rather than creating an unnameable record', () => {
    expect(renamePerson(people, personByName(people, 'A. Reyes')!.id, '   ')).toBe(people);
  });
});

describe('who gets the email', () => {
  const ids = (names: string[]) => resolvePassengers(people, names, '2026-09-02T00:00:00.000Z').ids;

  it("skips a 'never', includes an 'every'", () => {
    const out = recipientNames(people, ids(['A. Reyes', 'S. Reyes']));
    expect(out).not.toContain('A. Reyes');   // never
    expect(out).toContain('S. Reyes');       // every
  });

  it("sends to a 'first' only while they have not flown", () => {
    const tanaka = personByName(people, 'K. Tanaka')!;   // first, has flown
    const lind = personByName(people, 'J. Lindqvist')!;  // first, has flown
    expect(recipientNames(people, [tanaka.id, lind.id])).toEqual([]);
    const fresh = upsertPerson(people, { ...tanaka, hasFlown: false });
    expect(recipientNames(fresh, [tanaka.id])).toEqual(['K. Tanaka']);
  });

  it('reads the person, so a rename changes the printed name and nothing else', () => {
    const s = personByName(people, 'S. Reyes')!;
    const after = renamePerson(people, s.id, 'Sam Reyes');
    expect(recipientNames(after, [s.id])).toEqual(['Sam Reyes']);
  });

  it('an unknown id is skipped, never rendered as a blank recipient', () => {
    expect(recipientNames(people, ['nobody'])).toEqual([]);
  });
});

describe('document expiry', () => {
  it('finds documents that lapse before a date', () => {
    const withDoc: Person = {
      ...personByName(people, 'S. Reyes')!,
      documents: [
        { id: 'x1', kind: 'passport', label: 'Passport — USA', country: 'USA', numberMasked: '••• 1', expiresOn: '2026-10-12' },
        { id: 'x2', kind: 'passport', label: 'Passport — GBR', country: 'GBR', numberMasked: '••• 2', expiresOn: '2030-01-01' },
      ],
    };
    const found = documentsExpiringBefore(upsertPerson(people, withDoc), [withDoc.id], '2026-10-16');
    expect(found.map(f => f.document.id)).toEqual(['x1']);
    expect(found[0].personId).toBe(withDoc.id);
  });

  it('says nothing about a person with no documents — absence is not expiry', () => {
    const bare = personByName(people, 'S. Reyes')!;
    expect(documentsExpiringBefore(people, [bare.id], '2030-01-01')).toEqual([]);
  });
});
