import { describe, expect, it } from 'vitest';
import { manifestState, consequencesOfSilence, upcomingReminders } from './manifest';
import type { Passenger, RequestLeg, TripRequest } from '../types';

const NOW = Date.parse('2026-08-29T12:00:00');
const HOUR = 3_600_000;

function leg(over: Partial<RequestLeg> = {}): RequestLeg {
  return {
    id: 'L1',
    from: 'KCVG',
    to: 'KTEB',
    date: '2026-09-05',
    departLocal: '08:00',
    flexHours: 0,
    estMinutes: 120,
    estNm: 500,
    passengers: [],
    ...over,
  };
}

function request(over: Partial<TripRequest> = {}): TripRequest {
  return {
    id: 'R-1',
    status: 'confirmed',
    tier: 1,
    principalId: 'P1',
    requestedBy: 'Dana (EA)',
    createdAt: '2026-08-01T09:00:00Z',
    legs: [leg()],
    extras: [],
    messages: [],
    ...over,
  };
}

function pax(over: Partial<Passenger> = {}): Passenger {
  return { id: 'P1', name: 'A. Reyes', kind: 'principal', docs: [], hasFlown: true, ...over };
}

describe('manifestState — seats held vs names known', () => {
  it('counts unnamed seats from the seats the EA asked to hold', () => {
    const r = request({
      seatsHeld: 4,
      legs: [leg({ passengers: [{ passengerId: 'P1', lead: true, purpose: 'business' }] })],
    });
    const s = manifestState(r, [pax()], NOW);
    expect(s.seatsHeld).toBe(4);
    expect(s.named).toHaveLength(1);
    expect(s.unnamedSeats).toBe(3);
    expect(s.named[0].lead).toBe(true);
  });

  it('never goes negative when more people are named than seats estimated', () => {
    const r = request({
      seatsHeld: 1,
      legs: [leg({ passengers: [
        { passengerId: 'P1', lead: true, purpose: 'business' },
        { passengerId: 'P2', purpose: 'business' },
      ] })],
    });
    const s = manifestState(r, [pax(), pax({ id: 'P2', name: 'M. Osei' })], NOW);
    expect(s.unnamedSeats).toBe(0);
  });

  it('treats a request with no seatsHeld as fully named', () => {
    const r = request({ legs: [leg({ passengers: [{ passengerId: 'P1', purpose: 'business' }] })] });
    expect(manifestState(r, [pax()], NOW).unnamedSeats).toBe(0);
  });

  it('counts a person on two legs once, and remembers both legs', () => {
    const r = request({
      seatsHeld: 2,
      legs: [
        leg({ id: 'L1', passengers: [{ passengerId: 'P1', lead: true, purpose: 'business' }] }),
        leg({ id: 'L2', from: 'KTEB', to: 'KCVG', date: '2026-09-07', passengers: [{ passengerId: 'P1', purpose: 'business' }] }),
      ],
    });
    const s = manifestState(r, [pax()], NOW);
    expect(s.named).toHaveLength(1);
    expect(s.named[0].legIds).toEqual(['L1', 'L2']);
    expect(s.named[0].lead).toBe(true);
  });
});

describe('manifestState — the lock clock', () => {
  it('locks 24 h before a domestic departure', () => {
    const s = manifestState(request({ seatsHeld: 1 }), [pax()], NOW);
    expect(s.international).toBe(false);
    expect(s.lockHours).toBe(24);
    expect(s.lockAtMs).toBe(Date.parse('2026-09-04T08:00:00'));
    expect(Math.round(s.hoursToLock)).toBe(Math.round((Date.parse('2026-09-04T08:00:00') - NOW) / HOUR));
    expect(s.locked).toBe(false);
  });

  it('locks 72 h out once any leg touches a non-K airport', () => {
    const r = request({ legs: [leg({ to: 'LSGG' })] });
    const s = manifestState(r, [pax()], NOW);
    expect(s.international).toBe(true);
    expect(s.lockHours).toBe(72);
  });

  it('reads as locked once the boundary has passed', () => {
    const r = request({ legs: [leg({ date: '2026-08-29', departLocal: '18:00' })] });
    expect(manifestState(r, [pax()], NOW).locked).toBe(true);
  });
});

describe('manifestState — who owes what', () => {
  const travelling = { passengerId: 'P2', purpose: 'business' as const };

  it('flags a first-time guest whose travel form has not come back', () => {
    const r = request({ seatsHeld: 2, legs: [leg({ passengers: [travelling] })] });
    const s = manifestState(r, [pax({ id: 'P2', name: 'S. Reyes', kind: 'guest', hasFlown: false })], NOW);
    expect(s.outstanding).toHaveLength(1);
    expect(s.outstanding[0]).toMatchObject({ name: 'S. Reyes', kind: 'form' });
  });

  it('does not chase a first-timer whose form is already approved', () => {
    const r = request({ legs: [leg({ passengers: [travelling] })] });
    const s = manifestState(r, [pax({ id: 'P2', hasFlown: false, formStatus: 'approved' })], NOW);
    expect(s.outstanding).toHaveLength(0);
  });

  it('carries scheduling’s own words when a form must be resubmitted', () => {
    const r = request({ legs: [leg({ passengers: [travelling] })] });
    const s = manifestState(
      r,
      [pax({ id: 'P2', formStatus: 'resubmit', formNote: 'Address did not match her ID' })],
      NOW,
    );
    expect(s.outstanding[0].detail).toBe('Address did not match her ID');
  });

  it('blocks the legs a lapsing document actually affects, not the whole trip', () => {
    const r = request({
      seatsHeld: 2,
      legs: [
        leg({ id: 'L1', date: '2026-09-05', passengers: [travelling] }),
        leg({ id: 'L2', from: 'LSGG', to: 'KCVG', date: '2026-10-20', passengers: [travelling] }),
      ],
    });
    const s = manifestState(
      r,
      [pax({ id: 'P2', name: 'K. Tanaka', kind: 'staff', docs: [{ id: 'D1', label: 'Passport — USA', numberMasked: '•••4821', expires: '2026-10-12' }] })],
      NOW,
    );
    const doc = s.outstanding.find((o) => o.kind === 'document');
    expect(doc).toBeDefined();
    expect(doc!.blockedLegIds).toEqual(['L2']);
    expect(doc!.detail).toContain('Passport — USA');
  });

  it('reports one document problem per person, not one per document', () => {
    const r = request({ legs: [leg({ date: '2026-10-20', passengers: [travelling] })] });
    const s = manifestState(
      r,
      [pax({ id: 'P2', docs: [
        { id: 'D1', label: 'Passport', numberMasked: '•••1', expires: '2026-09-01' },
        { id: 'D2', label: 'Visa', numberMasked: '•••2', expires: '2026-09-02' },
      ] })],
      NOW,
    );
    expect(s.outstanding.filter((o) => o.kind === 'document')).toHaveLength(1);
  });

  it('says nothing about people who are not on the trip', () => {
    const r = request({ legs: [leg({ passengers: [{ passengerId: 'P1', purpose: 'business' }] })] });
    const s = manifestState(r, [pax(), pax({ id: 'P9', hasFlown: false })], NOW);
    expect(s.outstanding).toHaveLength(0);
  });
});

describe('consequencesOfSilence', () => {
  it('states seat release and per-leg removal in plain words', () => {
    const r = request({
      seatsHeld: 4,
      legs: [
        leg({ id: 'L1', date: '2026-09-05', passengers: [{ passengerId: 'P1', lead: true, purpose: 'business' }, { passengerId: 'P2', purpose: 'business' }] }),
        leg({ id: 'L2', from: 'KTEB', to: 'KCVG', date: '2026-10-20', passengers: [{ passengerId: 'P2', purpose: 'business' }] }),
      ],
    });
    const s = manifestState(
      r,
      [pax(), pax({ id: 'P2', name: 'K. Tanaka', docs: [{ id: 'D1', label: 'Passport', numberMasked: '•••1', expires: '2026-10-12' }] })],
      NOW,
    );
    const lines = consequencesOfSilence(s);
    expect(lines.some((l) => l.includes('unnamed seats are released'))).toBe(true);
    expect(lines.some((l) => l.startsWith('K. Tanaka comes off'))).toBe(true);
  });

  it('says so when there is nothing left to do', () => {
    const r = request({ seatsHeld: 1, legs: [leg({ passengers: [{ passengerId: 'P1', purpose: 'business' }] })] });
    expect(consequencesOfSilence(manifestState(r, [pax()], NOW))).toEqual(['Nothing — this manifest is complete.']);
  });

  it('stops promising anything once the manifest has locked', () => {
    const r = request({ seatsHeld: 4, legs: [leg({ date: '2026-08-29', departLocal: '18:00' })] });
    expect(consequencesOfSilence(manifestState(r, [pax()], NOW))).toEqual([
      'The manifest is locked — changes now go through scheduling.',
    ]);
  });
});

describe('upcomingReminders', () => {
  it('offers the reminders still ahead, soonest first', () => {
    // Lock is 2026-09-04 08:00, so 5/3/1 days out are all still in the future.
    const s = manifestState(request({ legs: [leg({ date: '2026-09-05' })] }), [pax()], NOW);
    const rem = upcomingReminders(s, NOW);
    expect(rem).toHaveLength(3);
    expect(rem[0]).toBeLessThan(rem[1]);
    expect(rem.every((ms) => ms > NOW)).toBe(true);
  });

  it('drops the reminders whose moment has already passed', () => {
    // Lock is 2026-08-31 08:00 — the 5-day and 3-day reminders are behind us.
    const s = manifestState(request({ legs: [leg({ date: '2026-09-01' })] }), [pax()], NOW);
    expect(upcomingReminders(s, NOW)).toHaveLength(1);
  });

  it('returns nothing when the departure cannot be parsed', () => {
    const s = manifestState(request({ legs: [leg({ date: 'not-a-date' })] }), [pax()], NOW);
    expect(upcomingReminders(s, NOW)).toEqual([]);
  });
});
