import { describe, expect, it } from 'vitest';
import { submitBlockers, clampSeats, type DraftLeg } from './requestReadiness';
import type { Passenger } from '../types';

function leg(over: Partial<DraftLeg> = {}): DraftLeg {
  return {
    from: 'KCVG',
    to: 'KTEB',
    date: '2026-09-18',
    timing: { kind: 'arrive', arriveByLocal: '09:00' },
    extraPassengerIds: [],
    purposes: {},
    ...over,
  };
}

function pax(over: Partial<Passenger> = {}): Passenger {
  return { id: 'P1', name: 'A. Reyes', kind: 'principal', docs: [], hasFlown: true, ...over };
}

const people = [
  pax(),
  pax({ id: 'P2', name: 'K. Tanaka', kind: 'staff', docs: [{ id: 'D1', label: 'Passport — USA', numberMasked: '•••1', expires: '2026-09-10' }] }),
  pax({ id: 'P3', name: 'S. Reyes', kind: 'guest', hasFlown: false }),
];

describe('submitBlockers', () => {
  it('lets a request through on a lead passenger and one well-formed leg', () => {
    expect(submitBlockers({ legs: [leg()], leadPassengerId: 'P1' }, people)).toEqual([]);
  });

  it('does not treat unnamed seats as a problem — that is the normal case', () => {
    const blockers = submitBlockers({ legs: [leg({ extraPassengerIds: [] })], leadPassengerId: 'P1' }, people);
    expect(blockers).toEqual([]);
  });

  it('asks for a lead passenger when there is none', () => {
    const blockers = submitBlockers({ legs: [leg()], leadPassengerId: '' }, people);
    expect(blockers).toHaveLength(1);
    expect(blockers[0].code).toBe('lead');
  });

  it('names the leg at fault when there is more than one', () => {
    const blockers = submitBlockers(
      { legs: [leg(), leg({ to: '', date: '' })], leadPassengerId: 'P1' },
      people,
    );
    expect(blockers.map((b) => b.code)).toEqual(['route', 'date']);
    expect(blockers[0].message).toContain('Leg 2');
    expect(blockers[0].legIndex).toBe(1);
  });

  it('says "the leg" rather than "Leg 1" on a one-leg request', () => {
    const blockers = submitBlockers({ legs: [leg({ from: '' })], leadPassengerId: 'P1' }, people);
    expect(blockers[0].message.startsWith('The leg')).toBe(true);
  });

  it('catches an incomplete time', () => {
    const blockers = submitBlockers(
      { legs: [leg({ timing: { kind: 'arrive', arriveByLocal: '' } })], leadPassengerId: 'P1' },
      people,
    );
    expect(blockers.map((b) => b.code)).toContain('timing');
  });

  it('accepts a flexible leg with no time at all', () => {
    expect(submitBlockers({ legs: [leg({ timing: { kind: 'flexible' } })], leadPassengerId: 'P1' }, people)).toEqual([]);
  });

  it('blocks a passenger whose document expires inside the trip, and says what to do', () => {
    const blockers = submitBlockers(
      { legs: [leg({ extraPassengerIds: ['P2'] })], leadPassengerId: 'P1' },
      people,
    );
    expect(blockers).toHaveLength(1);
    expect(blockers[0]).toMatchObject({ code: 'document', passengerId: 'P2' });
    expect(blockers[0].message).toContain('K. Tanaka');
    expect(blockers[0].message).toContain('Drop them from the affected leg');
  });

  it('blocks the LEAD passenger on documents too, not just guests', () => {
    const leadWithBadDocs = [pax({ docs: [{ id: 'D9', label: 'Passport', numberMasked: '•••9', expires: '2026-09-01' }] })];
    const blockers = submitBlockers({ legs: [leg()], leadPassengerId: 'P1' }, leadWithBadDocs);
    expect(blockers.map((b) => b.code)).toEqual(['document']);
  });

  it('reports one document blocker per person however many legs they are on', () => {
    const blockers = submitBlockers(
      { legs: [leg({ extraPassengerIds: ['P2'] }), leg({ extraPassengerIds: ['P2'] })], leadPassengerId: 'P1' },
      people,
    );
    expect(blockers.filter((b) => b.code === 'document')).toHaveLength(1);
  });

  it('never blocks on a guest who simply has not flown before', () => {
    const blockers = submitBlockers(
      { legs: [leg({ extraPassengerIds: ['P3'] })], leadPassengerId: 'P1' },
      people,
    );
    expect(blockers).toEqual([]);
  });
});

describe('clampSeats', () => {
  it('never holds fewer seats than the people already named', () => {
    expect(clampSeats(1, 3)).toBe(3);
    expect(clampSeats(6, 3)).toBe(6);
  });

  it('caps at the cabin and rounds a typed fraction', () => {
    expect(clampSeats(40, 1)).toBe(19);
    expect(clampSeats(4.6, 1)).toBe(5);
  });

  it('falls back to the named count when the input is not a number', () => {
    expect(clampSeats(Number.NaN, 2)).toBe(2);
  });
});
