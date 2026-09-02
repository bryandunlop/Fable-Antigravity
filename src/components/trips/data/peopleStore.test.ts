import { describe, it, expect } from 'vitest';
import { migrateSettingsOntoPeople, backfillPassengerIds } from './peopleStore';
import { SEED_PEOPLE, personByName, principalOf, upsertPerson } from '../engine/people';
import type { PassengerPref } from '../engine/briefingEmail';

const NOW = '2026-09-02T12:00:00.000Z';

const OLD_PREFS: PassengerPref[] = [
  { name: 'A. Reyes', pref: 'never', hasFlown: true },
  { name: 'S. Reyes', pref: 'every', hasFlown: false },
  { name: 'K. Tanaka', pref: 'first', hasFlown: true },
];

describe('migrating the name-keyed settings onto the records', () => {
  it('moves a briefing preference onto the person it named', () => {
    const blank = SEED_PEOPLE.map(p => ({ ...p, briefingPref: 'first' as const, hasFlown: false }));
    const out = migrateSettingsOntoPeople(blank, OLD_PREFS, undefined);
    expect(personByName(out, 'A. Reyes')?.briefingPref).toBe('never');
    expect(personByName(out, 'S. Reyes')?.briefingPref).toBe('every');
    expect(personByName(out, 'K. Tanaka')?.hasFlown).toBe(true);
  });

  it('moves the principal from a name in settings onto a flag on the record', () => {
    const nobody = SEED_PEOPLE.map(p => ({ ...p, principal: false }));
    expect(principalOf(nobody)).toBeUndefined();
    const out = migrateSettingsOntoPeople(nobody, [], 'M. Osei');
    expect(principalOf(out)?.name).toBe('M. Osei');
    // Exactly one, always — an ambiguous reserve is worse than none.
    expect(out.filter(p => p.principal)).toHaveLength(1);
  });

  it('ignores a stale name that matches nobody, rather than resurrecting them', () => {
    const before = SEED_PEOPLE.length;
    const out = migrateSettingsOntoPeople(
      SEED_PEOPLE,
      [{ name: 'Someone Who Left', pref: 'every', hasFlown: false }],
      'Also Gone',
    );
    expect(out).toHaveLength(before);
    expect(personByName(out, 'Someone Who Left')).toBeUndefined();
    // A principal that cannot be found leaves the existing one alone.
    expect(principalOf(out)?.name).toBe('A. Reyes');
  });

  it('is idempotent — running it every mount must not undo a later edit', () => {
    const once = migrateSettingsOntoPeople(SEED_PEOPLE, OLD_PREFS, 'A. Reyes');
    const twice = migrateSettingsOntoPeople(once, OLD_PREFS, 'A. Reyes');
    expect(twice).toEqual(once);
  });

  it('does not fight an edit made after the old settings were written', () => {
    // Scheduling changes S. Reyes to 'never' on the record. The stale setting still says 'every'.
    // This is the honest limit of a one-way migration: the old setting wins while it exists, which
    // is why nothing writes `passengerPrefs` any more.
    const s = personByName(SEED_PEOPLE, 'S. Reyes')!;
    const edited = upsertPerson(SEED_PEOPLE, { ...s, briefingPref: 'never' });
    expect(personByName(migrateSettingsOntoPeople(edited, OLD_PREFS, undefined), 'S. Reyes')?.briefingPref).toBe('every');
    // With the old settings gone — the state after any fresh save — the edit stands.
    expect(personByName(migrateSettingsOntoPeople(edited, [], undefined), 'S. Reyes')?.briefingPref).toBe('never');
  });
});

describe('backfilling passenger ids onto trips written before records existed', () => {
  const trip = (names: string[]): { passengerNames: string[]; passengerIds?: string[]; id: string } =>
    ({ id: 't1', passengerNames: names });

  it('links a legacy trip to the people it names, so a later rename cannot sever it', () => {
    const { trips } = backfillPassengerIds([trip(['A. Reyes', 'K. Tanaka'])], SEED_PEOPLE, NOW);
    expect(trips[0].passengerIds).toEqual(['P-REYES', 'P-TANAKA']);
  });

  it('leaves a trip that already has ids exactly alone', () => {
    const already = { ...trip(['A. Reyes']), passengerIds: ['P-REYES'] };
    const { trips } = backfillPassengerIds([already], SEED_PEOPLE, NOW);
    expect(trips[0]).toBe(already);
  });

  it('creates an unverified guest for a name aboard a trip that nobody has a record for', () => {
    const { trips, people } = backfillPassengerIds([trip(['A. Reyes', 'Nobody Known'])], SEED_PEOPLE, NOW);
    const made = people.find(p => p.name === 'Nobody Known');
    expect(made?.unverified).toBe(true);
    expect(trips[0].passengerIds).toEqual(['P-REYES', made!.id]);
  });

  it('is idempotent, and returns the same arrays when there is nothing to do', () => {
    const already = [{ ...trip(['A. Reyes']), passengerIds: ['P-REYES'] }];
    const out = backfillPassengerIds(already, SEED_PEOPLE, NOW);
    expect(out.trips).toBe(already);
    expect(out.people).toBe(SEED_PEOPLE);
  });
});
